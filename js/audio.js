/* audio.js — seluruh suara dibuat dari kode lewat Web Audio (tanpa berkas): efek, ambient per zona, dan musik per zona.
 *
 * Rantai: sumber → (pan) → bus (sfx / ambient) → master → kompresor → keluaran; sebagian suara dikirim juga ke gema (reverb sintetis).
 * Efek: GA.Audio.play(nama, arg, pan, wet). Rintangan zona: GA.Audio.hazard(jenis, 'warn'|'on', x 0..1).
 * Ambient: GA.Audio.ambient(zona) = lapisan angin/gemuruh + kejadian acak (burung, katak, retakan lahar, lonceng, dsb).
 * Musik: GA.Audio.music(zona) dan GA.Audio.intensity(0..2) (boss makin cepat dan padat tiap fase).
 * Mengganti dengan berkas suara sendiri: lihat docs/ASSET_GUIDE.md (bagian Audio).
 */
(function (GA) {
  'use strict';
  let ctx = null, master = null, sfxBus = null, ambBus = null, musBus = null, revSend = null, noiseBuf = null, enabled = true, active = 0;
  let curPan = 0, curWet = 0, curBus = null;           // diatur sementara oleh play()/ambient saat satu suara dibunyikan
  const errs = [], lastAt = {};
  const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  const rnd = function (a, b) { return a + Math.random() * (b - a); };

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = GA.preCtx || new AC(); GA.preCtx = null;      // AudioContext yang sudah dibuat saat ketukan "Mulai Main" (js/boot.js) dipakai dulu
        master = ctx.createGain(); master.gain.value = 0.5;
        if (ctx.createDynamicsCompressor) {
          const cp = ctx.createDynamicsCompressor(); cp.threshold.value = -18; cp.knee.value = 14; cp.ratio.value = 4; cp.attack.value = 0.004; cp.release.value = 0.2;
          master.connect(cp); cp.connect(ctx.destination);
        } else master.connect(ctx.destination);
        sfxBus = ctx.createGain(); sfxBus.connect(master);
        ambBus = ctx.createGain(); ambBus.gain.value = enabled ? 1 : 0; ambBus.connect(master);
        musBus = ctx.createGain(); musBus.gain.value = 0.1; musBus.connect(master);
        curBus = sfxBus;
        // gema: impuls sintetis (noise yang meluruh) → ruang batu
        const len = Math.floor(ctx.sampleRate * 1.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
        const cv = ctx.createConvolver(); cv.buffer = ir; revSend = ctx.createGain(); revSend.connect(cv);
        const rg = ctx.createGain(); rg.gain.value = 0.5; cv.connect(rg); rg.connect(master);
        const nl = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, nl, ctx.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
      } catch (e) { ctx = null; return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** Sambungkan node ke bus: pan (−1..1) dan kirim gema (wet). */
  function out(node, o) {
    let n = node; const pan = o && o.pan != null ? o.pan : curPan, wet = o && o.wet != null ? o.wet : curWet;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); n.connect(p); n = p; }
    n.connect((o && o.bus) || curBus || sfxBus);
    if (wet > 0 && revSend) { const w = ctx.createGain(); w.gain.value = wet; n.connect(w); w.connect(revSend); }
  }
  function track(src) { active++; src.onended = function () { active--; }; }

  /** Nada: f0 → f1 selama dur detik. o: att (naik), lp (lowpass), vib [Hz, kedalaman Hz], wet, pan. */
  function tone(f0, f1, dur, type, vol, delay, o) {
    const c = ensure(); if (!c || active > 60) return;
    o = o || {};
    const t0 = c.currentTime + (delay || 0), osc = c.createOscillator(), g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + (o.att || 0.012));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let n = osc;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; n.connect(f); n = f; }
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + dur + 0.05); }
    n.connect(g); out(g, o);
    osc.start(t0); osc.stop(t0 + dur + 0.03); track(osc);
  }

  /** Desis/ledakan: noise tersaring. o: type (lowpass|bandpass|highpass), q, f1 (sapuan frekuensi), att, wet, pan. */
  function noise(dur, vol, delay, freq, o) {
    const c = ensure(); if (!c || !noiseBuf || active > 60) return;
    o = o || {};
    const t0 = c.currentTime + (delay || 0), s = c.createBufferSource(); s.buffer = noiseBuf;
    const f = c.createBiquadFilter(); f.type = o.type || 'lowpass'; f.Q.value = o.q || 0.7; f.frequency.setValueAtTime(freq || 1800, t0);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.f1), t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + (o.att || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); out(g, o);
    s.start(t0, Math.random() * 1.2, dur + 0.05); track(s);
  }

  const SOUNDS = {
    /* ---- antarmuka ---- */
    click: function () { tone(520, 300, 0.06, 'triangle', 0.22); noise(0.03, 0.12, 0, 2400); },
    select: function () { tone(880, 1180, 0.07, 'sine', 0.2); tone(1320, 1320, 0.05, 'sine', 0.1, 0.04); },
    back: function () { tone(420, 280, 0.1, 'triangle', 0.2); },
    confirm: function () { tone(523, 523, 0.08, 'triangle', 0.22); tone(784, 784, 0.12, 'triangle', 0.22, 0.07); noise(0.05, 0.1, 0, 3000); },
    tick: function () { tone(880, 880, 0.12, 'square', 0.14); },
    go: function () { tone(1175, 1175, 0.28, 'square', 0.16); tone(1568, 1568, 0.3, 'square', 0.14, 0.05); },
    /* ---- naga & tembakan ---- */
    swap: function () { tone(500, 760, 0.08, 'triangle', 0.2); },
    swapWarn: function (dur) {      // peringatan penukaran selama `dur` dtk (≥ 2,5): 3 bip peringatan (0,8 dtk), lalu denyut yang makin rapat dan NAIK nada sampai saat menukar
      dur = dur || 2.5; const w = Math.min(0.8, dur * 0.5);
      for (let i = 0; i < 3; i++) tone(i % 2 ? 660 : 880, i % 2 ? 620 : 840, 0.14, 'square', 0.1, i * w / 3, { wet: 0.25 });
      const N = 11, L = dur - w - 0.1;
      for (let i = 0; i < N; i++) { const u = i / (N - 1), at = w + L * (1 - Math.pow(1 - u, 1.5)); tone(480 + 1100 * u, 520 + 1150 * u, 0.1, 'triangle', 0.1 + 0.07 * u, at, { wet: 0.3 }); }
      tone(1500, 2200, 0.3, 'sine', 0.08, dur - 0.3, { wet: 0.4 });
    },
    swapGo: function () { noise(0.4, 0.2, 0, 3200, { type: 'bandpass', q: 1.5, f1: 700, att: 0.06, wet: 0.3 }); tone(420, 880, 0.3, 'sine', 0.16, 0, { wet: 0.3 }); [1200, 1700, 2300].forEach(function (f, i) { tone(f, f, 0.1, 'sine', 0.07, 0.12 + i * 0.07, { wet: 0.5 }); }); },
    fizzle: function () { noise(0.25, 0.13, 0, 1800, { type: 'lowpass', f1: 600 }); tone(500, 150, 0.25, 'triangle', 0.12, 0, { wet: 0.2 }); },
    shoot: function () { tone(520, 180, 0.13, 'square', 0.12); noise(0.05, 0.08, 0, 3000); },
    fire: function () {      // semburan: desis menyapu naik + gemuruh rendah
      noise(0.45, 0.26, 0, 700, { type: 'bandpass', q: 0.9, f1: 3400, att: 0.03, wet: 0.12 }); noise(0.25, 0.14, 0, 3200, { type: 'highpass' });
      tone(190, 70, 0.34, 'sawtooth', 0.09, 0, { lp: 900 });
    },
    flap: function () { noise(0.16, 0.13, 0, 650); tone(95, 55, 0.13, 'sine', 0.13); },
    /* ---- jawaban ---- */
    correct: function (n) {      // naik nada sesuai kombo
      const b = 523 * Math.pow(1.0595, Math.min(n || 0, 8) * 2);
      tone(b, b, 0.1, 'triangle', 0.28, 0, { wet: 0.12 }); tone(b * 1.25, b * 1.25, 0.1, 'triangle', 0.28, 0.08, { wet: 0.12 }); tone(b * 1.5, b * 1.5, 0.18, 'triangle', 0.28, 0.16, { wet: 0.2 });
      noise(0.12, 0.18, 0, 2500);
    },
    shatter: function () {       // bola sihir pecah seperti kaca
      for (let i = 0; i < 4; i++) { const f = rnd(2200, 4200); tone(f, f * 0.8, 0.12, 'triangle', 0.07, i * 0.025, { wet: 0.3 }); }
      noise(0.14, 0.16, 0, 5000, { type: 'highpass' });
    },
    wrong: function () { tone(220, 110, 0.28, 'sawtooth', 0.22); tone(180, 90, 0.28, 'square', 0.1, 0.05); },
    /* ---- sarang & telur ---- */
    egg: function () { tone(784, 784, 0.09, 'triangle', 0.22, 0, { wet: 0.2 }); tone(1047, 1047, 0.09, 'triangle', 0.22, 0.09, { wet: 0.2 }); tone(1568, 1568, 0.25, 'triangle', 0.22, 0.18, { wet: 0.3 }); },
    life: function () { tone(660, 660, 0.1, 'triangle', 0.25); tone(880, 880, 0.1, 'triangle', 0.25, 0.1); tone(1320, 1320, 0.25, 'triangle', 0.25, 0.2); },
    eggBreak: function () {      // retakan cangkang + denting + gedebuk
      for (let i = 0; i < 3; i++) noise(0.05, 0.3, i * 0.045, 5200, { type: 'highpass' });
      tone(1900, 900, 0.09, 'triangle', 0.13, 0.02, { wet: 0.2 }); tone(150, 55, 0.22, 'sine', 0.3, 0.03);
    },
    heart: function () { tone(62, 44, 0.14, 'sine', 0.34); tone(58, 42, 0.16, 'sine', 0.28, 0.2); },
    alarm: function () { tone(740, 740, 0.1, 'square', 0.1, 0, { lp: 2200 }); tone(988, 988, 0.1, 'square', 0.1, 0.14, { lp: 2200 }); },
    hole: function () { tone(300, 60, 0.6, 'sawtooth', 0.28); noise(0.4, 0.2, 0.05, 500); },
    steal: function () { tone(500, 200, 0.4, 'triangle', 0.22); tone(420, 160, 0.4, 'triangle', 0.16, 0.1); },
    /* ---- portal ---- */
    portal: function () {
      noise(1.0, 0.2, 0, 300, { type: 'bandpass', q: 2, f1: 1800, att: 0.5, wet: 0.4 }); tone(150, 620, 0.9, 'sine', 0.14, 0, { att: 0.4, wet: 0.4 });
      tone(1250, 1250, 0.5, 'sine', 0.05, 0.5, { wet: 0.5 }); tone(1670, 1670, 0.5, 'sine', 0.04, 0.6, { wet: 0.5 });
    },
    emerge: function () { noise(0.18, 0.09, 0, 800, { type: 'bandpass', q: 1.4, f1: 1700 }); tone(300, 520, 0.12, 'sine', 0.07, 0, { wet: 0.3 }); },
    /* ---- rintangan statis & kutukan ---- */
    rock: function () { noise(0.14, 0.3, 0, 900); tone(160, 70, 0.14, 'square', 0.15); },
    bomb: function () { noise(0.45, 0.45, 0, 700); tone(120, 40, 0.4, 'sawtooth', 0.25); },
    ice: function () { tone(1400, 900, 0.25, 'sine', 0.2); tone(1800, 1200, 0.25, 'sine', 0.14, 0.05); },
    bolt: function () { tone(300, 1200, 0.18, 'sawtooth', 0.2); tone(1200, 300, 0.18, 'sawtooth', 0.14, 0.1); },
    thorn: function () { noise(0.16, 0.28, 0, 1400); tone(210, 90, 0.14, 'square', 0.14); },
    frost: function () { tone(1500, 950, 0.25, 'sine', 0.2, 0, { wet: 0.25 }); tone(2000, 1300, 0.25, 'sine', 0.13, 0.05, { wet: 0.25 }); },
    shield: function () { tone(1800, 2700, 0.22, 'triangle', 0.12, 0, { wet: 0.4 }); noise(0.18, 0.13, 0, 6000, { type: 'highpass' }); tone(300, 200, 0.2, 'sine', 0.14); },
    crystal: function () { tone(1320, 1760, 0.12, 'triangle', 0.2, 0, { wet: 0.3 }); tone(1760, 2200, 0.1, 'sine', 0.12, 0.05, { wet: 0.3 }); },
    warn: function () { tone(1000, 1000, 0.07, 'square', 0.1); tone(1000, 1000, 0.07, 'square', 0.1, 0.12); },
    /* ---- boss ---- */
    spell: function () { tone(220, 660, 0.35, 'sawtooth', 0.14, 0, { lp: 2600, wet: 0.2 }); tone(330, 990, 0.35, 'triangle', 0.12, 0.08, { wet: 0.2 }); noise(0.25, 0.14, 0, 2000); },
    bossHit: function () { noise(0.2, 0.35, 0, 1200); tone(200, 60, 0.3, 'sawtooth', 0.25); tone(500, 800, 0.15, 'triangle', 0.2, 0.1); },
    bossAttack: function () { tone(110, 70, 0.5, 'sawtooth', 0.3); noise(0.3, 0.3, 0, 600); },
    laugh: function () {         // "ha-ha-ha-haaa": tawa jahat menurun dengan getar
      for (let i = 0; i < 4; i++) { const t = i * 0.17, last = i === 3; tone(270 - i * 22, 200 - i * 22, last ? 0.45 : 0.13, 'sawtooth', 0.15, t, { lp: 1100, vib: [last ? 7 : 18, last ? 10 : 14], wet: 0.25 }); noise(0.08, 0.05, t, 1500, { type: 'bandpass', q: 1.5 }); }
    },
    phase: function () { tone(392, 392, 0.12, 'square', 0.15); tone(523, 523, 0.12, 'square', 0.15, 0.12); tone(784, 784, 0.3, 'square', 0.15, 0.24); },
    wrath: function () {         // geraman naik + badai kecil
      tone(70, 170, 1.2, 'sawtooth', 0.2, 0, { lp: 520, att: 0.4, wet: 0.25 }); noise(1.2, 0.22, 0, 300, { type: 'bandpass', q: 1, f1: 1500, att: 0.8, wet: 0.3 }); tone(110, 340, 1.0, 'square', 0.06, 0.2, { lp: 900 });
    },
    cine: function () { noise(0.7, 0.2, 0, 500, { type: 'bandpass', q: 0.8, f1: 2600, att: 0.3, wet: 0.3 }); tone(210, 100, 0.5, 'sine', 0.15); },
    dissolve: function () {      // hancur jadi abu: desis menurun + kerlip energi
      noise(2.0, 0.2, 0, 3200, { type: 'bandpass', q: 1.2, f1: 280, att: 0.1, wet: 0.4 });
      for (let i = 0; i < 10; i++) { const f = rnd(1500, 4000); tone(f, f, 0.15, 'sine', 0.06, i * 0.17 + rnd(0, 0.1), { wet: 0.5 }); }
      tone(140, 50, 1.6, 'sine', 0.16, 0.2, { wet: 0.3 });
    },
    win: function () {
      [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone(f, f, 0.2, 'triangle', 0.28, i * 0.13, { wet: 0.2 }); });
      tone(1047, 1047, 0.6, 'triangle', 0.2, 0.95, { wet: 0.3 });
    },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, f * 0.96, 0.32, 'sawtooth', 0.2, i * 0.26, { lp: 1600 }); }); },

    /* ---- rintangan zona: peringatan (per mekanik) dan aktif (per jenis) ---- */
    hzw_strike: function () { tone(450, 950, 0.5, 'sine', 0.07, 0, { att: 0.2, wet: 0.2 }); tone(1000, 1000, 0.05, 'square', 0.06); },
    hzw_slow: function () { tone(330, 330, 0.12, 'triangle', 0.08, 0, { wet: 0.2 }); },
    hzw_reflect: function () { tone(1100, 1500, 0.1, 'sine', 0.08, 0, { wet: 0.3 }); },
    hzw_deflect: function () { noise(0.3, 0.07, 0, 600, { type: 'bandpass', q: 1, f1: 1100, att: 0.12 }); },
    hzw_veil: function () { tone(120, 100, 0.6, 'sine', 0.1, 0, { att: 0.25, wet: 0.2 }); },
    hzw_blind: function () { noise(0.6, 0.08, 0, 1800, { type: 'bandpass', q: 2.5, f1: 900, att: 0.3, wet: 0.4 }); },
    hz_thorn: function () { noise(0.25, 0.14, 0, 3000, { type: 'bandpass', q: 1.2, f1: 1500 }); tone(160, 110, 0.15, 'triangle', 0.1); },
    hz_wave: function () { noise(0.7, 0.22, 0, 1400, { type: 'lowpass', f1: 400, att: 0.08, wet: 0.2 }); for (let i = 0; i < 3; i++) tone(rnd(500, 900), rnd(900, 1400), 0.07, 'sine', 0.05, 0.2 + i * 0.09); },
    hz_lily: function () { tone(500, 920, 0.1, 'sine', 0.14, 0, { wet: 0.2 }); },
    hz_crystal: function () { tone(1320, 1760, 0.2, 'triangle', 0.14, 0, { wet: 0.5 }); tone(1980, 1980, 0.3, 'sine', 0.08, 0.06, { wet: 0.5 }); },
    hz_geyser: function () { noise(1.4, 0.3, 0, 500, { type: 'bandpass', q: 0.8, f1: 1700, att: 0.15, wet: 0.15 }); tone(90, 50, 0.4, 'sine', 0.3); },
    hz_hotrock: function () { tone(1500, 300, 0.45, 'sine', 0.1); tone(140, 55, 0.25, 'sine', 0.32, 0.42); noise(0.2, 0.3, 0.42, 800); },
    hz_stalactite: function () { noise(0.04, 0.28, 0, 6000, { type: 'highpass' }); tone(1900, 420, 0.22, 'triangle', 0.12, 0.02, { wet: 0.3 }); tone(900, 500, 0.12, 'sine', 0.1, 0.3, { wet: 0.4 }); },
    hz_rune: function () { tone(2200, 180, 0.16, 'sawtooth', 0.14, 0, { lp: 4000 }); noise(0.1, 0.22, 0, 5000, { type: 'highpass', wet: 0.2 }); },
    hz_spore: function () { noise(0.4, 0.18, 0, 700, { type: 'lowpass', att: 0.04 }); tone(220, 180, 0.3, 'sine', 0.08, 0, { wet: 0.2 }); },
    hz_hands: function () { tone(120, 85, 1.4, 'sine', 0.14, 0, { att: 0.4, vib: [5, 6], wet: 0.4 }); noise(1.0, 0.07, 0.1, 1600, { type: 'bandpass', q: 3, f1: 800, att: 0.4, wet: 0.5 }); },

    /* ---- ambient: kejadian acak per zona (dibunyikan lewat bus ambient) ---- */
    amb_bird: function () { const b = rnd(2400, 3600), n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) tone(b * rnd(0.95, 1.1), b * rnd(1.15, 1.45), 0.07, 'sine', 0.07, i * 0.09, { wet: 0.25 }); },
    amb_cricket: function () { for (let i = 0; i < 6; i++) tone(4200, 4200, 0.03, 'square', 0.015, i * 0.055, { lp: 5000 }); },
    amb_crackle: function () { for (let i = 0; i < 5; i++) noise(0.03, rnd(0.05, 0.14), rnd(0, 0.5), 3500, { type: 'highpass' }); },
    amb_boom: function () { noise(1.6, 0.18, 0, 160, { type: 'lowpass', att: 0.4, wet: 0.4 }); tone(48, 36, 1.4, 'sine', 0.2, 0, { att: 0.3 }); },
    amb_chime: function () { const s = [880, 1047, 1319, 1568, 1760, 2093], f = s[Math.floor(Math.random() * s.length)]; tone(f, f, 1.4, 'sine', 0.05, 0, { wet: 0.7 }); tone(f * 2.01, f * 2.01, 0.8, 'sine', 0.02, 0, { wet: 0.7 }); },
    amb_drip: function () { const f = rnd(900, 1500); tone(f * 1.6, f, 0.08, 'sine', 0.06, 0, { wet: 0.6 }); },
    amb_wind: function () { noise(3.0, 0.1, 0, 250, { type: 'bandpass', q: 3, f1: 700, att: 1.2, wet: 0.3 }); },
    amb_thunder: function () { noise(2.6, 0.2, 0, 220, { type: 'lowpass', att: 0.5, wet: 0.5 }); tone(55, 38, 2.2, 'sine', 0.14, 0.1, { att: 0.5 }); },
    amb_whisper: function () { noise(1.6, 0.05, 0, 2200, { type: 'bandpass', q: 4, f1: 1500, att: 0.6, wet: 0.7 }); },
    amb_bell: function () { tone(196, 196, 3.0, 'sine', 0.06, 0, { wet: 0.7 }); tone(392 * 1.01, 392 * 1.01, 2.4, 'sine', 0.025, 0, { wet: 0.7 }); }
  };

  /** Jenis rintangan → bunyi aktif (kunci hz_*), mekanik → bunyi peringatan (hzw_*). */
  const MIN_GAP = { emerge: 0.09, alarm: 0.65, flap: 0.08, shatter: 0.03, heart: 0.5 };

  /* ---------- ambient per zona: lapisan dasar (noise tersaring + LFO) + kejadian acak [bunyi, jeda min, jeda maks (detik)] ---------- */
  const AMB = {
    menu:    { bed: { type: 'bandpass', f: 600, q: 0.5, g: 0.035, lfo: 0.08 }, ev: [['amb_chime', 6, 12]] },
    forest:  { bed: { type: 'bandpass', f: 800, q: 0.4, g: 0.05, lfo: 0.12 }, ev: [['amb_bird', 3, 8], ['amb_cricket', 6, 12]] },
    volcano: { bed: { type: 'lowpass', f: 170, q: 0.7, g: 0.12, lfo: 0.05 }, ev: [['amb_crackle', 1.6, 4], ['amb_boom', 9, 16]] },
    crystal: { bed: { type: 'bandpass', f: 1800, q: 2.5, g: 0.03, lfo: 0.08 }, ev: [['amb_chime', 3, 7], ['amb_drip', 2, 5]] },
    tower:   { bed: { type: 'bandpass', f: 320, q: 0.8, g: 0.08, lfo: 0.06 }, ev: [['amb_wind', 6, 12], ['amb_thunder', 12, 22], ['amb_whisper', 8, 16], ['amb_bell', 20, 35]] }
  };
  let ambId = '', bed = null, ambTimer = 0, ambNext = [];

  function stopBed() {
    if (!bed) return;
    const b = bed; bed = null;
    try { b.g.gain.cancelScheduledValues(ctx.currentTime); b.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4); b.src.stop(ctx.currentTime + 1.6); b.lfo.stop(ctx.currentTime + 1.6); } catch (e) { /* abaikan */ }
  }
  function startAmbient(id) {
    ambId = id; stopBed(); clearInterval(ambTimer); ambTimer = 0;
    const c = ensure(); if (!c) return;
    const a = AMB[id] || AMB.menu, src = c.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = a.bed.type; f.frequency.value = a.bed.f; f.Q.value = a.bed.q;
    const g = c.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(a.bed.g, c.currentTime, 0.8);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = a.bed.lfo; lg.gain.value = a.bed.g * 0.6; lfo.connect(lg); lg.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(ambBus); src.start(); lfo.start();
    bed = { src: src, lfo: lfo, g: g };
    ambNext = a.ev.map(function (e) { return performance.now() / 1000 + rnd(e[1] * 0.3, e[2]); });
    ambTimer = setInterval(function () {
      if (!ctx || ctx.state !== 'running' || !enabled) return;
      const now = performance.now() / 1000;
      a.ev.forEach(function (e, i) {
        if (now < ambNext[i]) return;
        ambNext[i] = now + rnd(e[1], e[2]);
        const fn = SOUNDS[e[0]]; if (!fn) return;
        curBus = ambBus; curPan = rnd(-0.8, 0.8); curWet = 0;
        try { fn(); } catch (er) { errs.push(e[0] + ': ' + er.message); }
        curBus = sfxBus; curPan = 0;
      });
    }, 500);
  }

  /* ---------- musik latar per zona: arpeggio + bass + pad (+ perkusi di zona keras); makin padat tiap tingkat intensitas ---------- */
  const SONGS = {
    menu:    { bpm: 84,  wave: 'triangle', bass: 'sine',     perc: 0, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]] },
    forest:  { bpm: 100, wave: 'triangle', bass: 'sine',     perc: 0, chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]] },
    volcano: { bpm: 116, wave: 'sawtooth', bass: 'square',   perc: 1, chords: [[57, 60, 64], [56, 59, 63], [53, 56, 60], [52, 56, 59]] },
    crystal: { bpm: 92,  wave: 'sine',     bass: 'sine',     perc: 0, chords: [[62, 65, 69], [60, 64, 67], [58, 62, 65], [57, 60, 64]] },
    tower:   { bpm: 120, wave: 'square',   bass: 'sawtooth', perc: 1, chords: [[57, 60, 64], [55, 58, 62], [53, 56, 60], [56, 59, 63]] }
  };
  let musicOn = true, song = null, step = 0, nextT = 0, timer = 0, songId = '', inten = 0;
  const mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

  function note(type, m, t, dur, vol, lp) {
    const c = ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = mtof(m);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = o; if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); n = f; }
    n.connect(g); g.connect(musBus); o.start(t); o.stop(t + dur + 0.05);
  }

  function musicTick() {
    const c = ctx; if (!c || !song || !musicOn || !enabled || c.state !== 'running') return;
    const spb = 60 / (song.bpm * (1 + 0.07 * inten)) / 2;      // satu langkah = not kedelapan
    while (nextT < c.currentTime + 0.35) {
      if (nextT < c.currentTime) nextT = c.currentTime + 0.02;
      const bar = Math.floor(step / 8), chord = song.chords[bar % song.chords.length], s8 = step % 8, pat = [0, 1, 2, 1, 0, 2, 1, 2];
      const m = chord[pat[s8]] + (s8 === 0 ? -12 : 0);
      note(song.wave, m + 12, nextT, spb * 1.6, s8 === 0 ? 0.5 : 0.3);
      if (inten >= 2 && s8 % 2 === 1) note(song.wave, m + 24, nextT, spb * 0.9, 0.12);                  // lapisan arpeggio atas
      if (s8 === 0 || s8 === 4) note(song.bass, chord[0] - 24, nextT, spb * 3, 0.5, 500);              // bass
      if (s8 === 0) chord.forEach(function (cm) { note('triangle', cm, nextT, spb * 8, 0.1, 900); });    // pad
      if (song.perc || inten >= 1) {
        if (s8 % 4 === 0) { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(130, nextT); o.frequency.exponentialRampToValueAtTime(42, nextT + 0.12); g.gain.setValueAtTime(0.7, nextT); g.gain.exponentialRampToValueAtTime(0.0001, nextT + 0.14); o.connect(g); g.connect(musBus); o.start(nextT); o.stop(nextT + 0.16); }
        if (s8 % 4 === 2 && noiseBuf) { const s = c.createBufferSource(); s.buffer = noiseBuf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500; const g = c.createGain(); g.gain.setValueAtTime(0.18, nextT); g.gain.exponentialRampToValueAtTime(0.0001, nextT + 0.05); s.connect(f); f.connect(g); g.connect(musBus); s.start(nextT, Math.random(), 0.06); }
      }
      nextT += spb; step++;
    }
  }

  function startMusic(id) {
    songId = id; song = SONGS[id] || SONGS.menu; step = 0;
    const c = ensure(); if (!c) return;
    nextT = c.currentTime + 0.05;
    clearInterval(timer); timer = setInterval(musicTick, 120);
  }

  GA.Audio = {
    unlock: function () { ensure(); if (song && !timer) startMusic(songId); if (ambId && !bed) startAmbient(ambId); },
    /** Tahan semua suara (jeda) / lanjutkan. */
    suspend: function () { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume: function () { if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setEnabled: function (v) { enabled = !!v; if (ambBus) ambBus.gain.value = enabled ? 1 : 0; },
    isEnabled: function () { return enabled; },
    setMusic: function (v) { musicOn = !!v; if (musicOn && song && ctx) { nextT = ctx.currentTime + 0.05; } },
    isMusic: function () { return musicOn; },
    /** Mulai musik untuk zona: menu | forest | volcano | crystal | tower (mengganti lagu bila beda). */
    music: function (id) { if (id === songId && timer) return; startMusic(id); },
    stopMusic: function () { clearInterval(timer); timer = 0; song = null; songId = ''; },
    /** Intensitas musik 0..2 (boss: fase 1..3). */
    intensity: function (n) { inten = clamp(n | 0, 0, 2); },
    /** Lapisan ambient + kejadian acak untuk zona. */
    ambient: function (id) { if (id === ambId && bed) return; startAmbient(id); },
    stopAmbient: function () { clearInterval(ambTimer); ambTimer = 0; ambId = ''; stopBed(); },
    /** Bongkar audio saat kembali ke halaman awal: hentikan musik + ambient, tutup AudioContext (dibuat lagi saat main berikutnya). */
    shutdown: function () {
      GA.Audio.stopMusic(); GA.Audio.stopAmbient(); const c = ctx;
      ctx = master = sfxBus = ambBus = musBus = revSend = noiseBuf = curBus = null; bed = null; active = 0;
      if (c && c.close) { try { c.close(); } catch (e) { /* abaikan */ } }
    },
    isOpen: function () { return !!ctx && ctx.state !== 'closed'; },
    /** Efek: arg diteruskan ke fungsi suara, pan −1..1 (posisi di layar), wet = kirim gema 0..1. */
    play: function (name, arg, pan, wet) {
      if (!enabled) return false;
      const f = SOUNDS[name]; if (!f) { errs.push('tidak ada suara: ' + name); return false; }
      const gap = MIN_GAP[name];
      if (gap && ctx) { const now = ctx.currentTime; if (now - (lastAt[name] || -9) < gap) return false; lastAt[name] = now; }
      curBus = sfxBus; curPan = pan || 0; curWet = wet || 0;
      try { f(arg); } catch (e) { errs.push(name + ': ' + e.message); }
      curPan = 0; curWet = 0;
      return true;
    },
    /** Rintangan zona: ph 'warn' → bunyi per mekanik; 'on' → bunyi per jenis. x = posisi horizontal 0..1 (untuk pan). */
    hazard: function (kind, mech, ph, x) {
      const name = ph === 'warn' ? 'hzw_' + mech : 'hz_' + kind;
      return this.play(name, undefined, clamp(((x == null ? 0.5 : x) * 2 - 1) * 0.7, -0.7, 0.7));
    },
    /** Untuk uji: semua nama suara, kesalahan yang terkumpul, dan daftar zona ambient/musik. */
    names: function () { return Object.keys(SOUNDS); },
    errors: errs, zones: Object.keys(AMB), songs: Object.keys(SONGS)
  };
})(window.GA = window.GA || {});
