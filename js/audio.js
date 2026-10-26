/* audio.js — efek suara sederhana lewat Web Audio (tanpa file eksternal). */
(function (GA) {
  'use strict';
  let ctx = null, master = null, enabled = true;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.45; master.connect(ctx.destination); } catch (e) { ctx = null; return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** Nada dengan envelope: f0 -> f1 selama dur detik. */
  function tone(f0, f1, dur, type, vol, delay) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  function noise(dur, vol, delay, freq) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + (delay || 0), n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1800;
    const g = c.createGain(); g.gain.value = vol || 0.3;
    s.connect(f); f.connect(g); g.connect(master); s.start(t0);
  }

  const SOUNDS = {
    click: function () { tone(660, 880, 0.07, 'triangle', 0.2); },
    swap: function () { tone(500, 760, 0.08, 'triangle', 0.2); },
    shoot: function () { tone(520, 180, 0.13, 'square', 0.12); noise(0.05, 0.08, 0, 3000); },
    correct: function (n) { // naik nada sesuai kombo
      const b = 523 * Math.pow(1.0595, Math.min(n || 0, 8) * 2);
      tone(b, b, 0.1, 'triangle', 0.28); tone(b * 1.25, b * 1.25, 0.1, 'triangle', 0.28, 0.08); tone(b * 1.5, b * 1.5, 0.18, 'triangle', 0.28, 0.16);
      noise(0.12, 0.18, 0, 2500);
    },
    wrong: function () { tone(220, 110, 0.28, 'sawtooth', 0.22); tone(180, 90, 0.28, 'square', 0.1, 0.05); },
    rock: function () { noise(0.14, 0.3, 0, 900); tone(160, 70, 0.14, 'square', 0.15); },
    bomb: function () { noise(0.45, 0.45, 0, 700); tone(120, 40, 0.4, 'sawtooth', 0.25); },
    ice: function () { tone(1400, 900, 0.25, 'sine', 0.2); tone(1800, 1200, 0.25, 'sine', 0.14, 0.05); },
    bolt: function () { tone(300, 1200, 0.18, 'sawtooth', 0.2); tone(1200, 300, 0.18, 'sawtooth', 0.14, 0.1); },
    life: function () { tone(660, 660, 0.1, 'triangle', 0.25); tone(880, 880, 0.1, 'triangle', 0.25, 0.1); tone(1320, 1320, 0.25, 'triangle', 0.25, 0.2); },
    hole: function () { tone(300, 60, 0.6, 'sawtooth', 0.28); noise(0.4, 0.2, 0.05, 500); },
    tick: function () { tone(880, 880, 0.12, 'square', 0.14); },
    go: function () { tone(1175, 1175, 0.28, 'square', 0.16); tone(1568, 1568, 0.3, 'square', 0.14, 0.05); },
    bossHit: function () { noise(0.2, 0.35, 0, 1200); tone(200, 60, 0.3, 'sawtooth', 0.25); tone(500, 800, 0.15, 'triangle', 0.2, 0.1); },
    bossAttack: function () { tone(110, 70, 0.5, 'sawtooth', 0.3); noise(0.3, 0.3, 0, 600); },
    phase: function () { tone(392, 392, 0.12, 'square', 0.15); tone(523, 523, 0.12, 'square', 0.15, 0.12); tone(784, 784, 0.3, 'square', 0.15, 0.24); },
    win: function () {
      [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone(f, f, 0.2, 'triangle', 0.28, i * 0.13); });
      tone(1047, 1047, 0.6, 'triangle', 0.2, 0.95);
    },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, f * 0.96, 0.32, 'sawtooth', 0.2, i * 0.26); }); },
    // semburan api naga: desis + gemuruh singkat
    fire: function () { noise(0.22, 0.22, 0, 2600); tone(300, 120, 0.2, 'sawtooth', 0.1); tone(620, 240, 0.12, 'square', 0.07); },
    thorn: function () { noise(0.16, 0.28, 0, 1400); tone(210, 90, 0.14, 'square', 0.14); },
    curse: function () { noise(0.4, 0.4, 0, 600); tone(140, 45, 0.45, 'sawtooth', 0.26); tone(90, 40, 0.4, 'square', 0.12, 0.05); },
    frost: function () { tone(1500, 950, 0.25, 'sine', 0.2); tone(2000, 1300, 0.25, 'sine', 0.13, 0.05); },
    crystal: function () { tone(1320, 1760, 0.12, 'triangle', 0.2); tone(1760, 2200, 0.1, 'sine', 0.12, 0.05); },
    spell: function () { tone(220, 660, 0.35, 'sawtooth', 0.14); tone(330, 990, 0.35, 'triangle', 0.12, 0.08); noise(0.25, 0.14, 0, 2000); },
    steal: function () { tone(500, 200, 0.4, 'triangle', 0.22); tone(420, 160, 0.4, 'triangle', 0.16, 0.1); },
    egg: function () { tone(784, 784, 0.09, 'triangle', 0.22); tone(1047, 1047, 0.09, 'triangle', 0.22, 0.09); tone(1568, 1568, 0.25, 'triangle', 0.22, 0.18); }
  };

  /* ---------- musik latar sederhana (arpeggio berulang dari osilator; tanpa berkas) ---------- */
  const SONGS = {
    menu:   { bpm: 84,  wave: 'triangle', chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]] },
    forest: { bpm: 96,  wave: 'triangle', chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]] },
    volcano:{ bpm: 112, wave: 'sawtooth', chords: [[57, 60, 64], [56, 59, 63], [53, 56, 60], [52, 56, 59]] },
    tower:  { bpm: 120, wave: 'square',   chords: [[57, 60, 64], [55, 58, 62], [53, 56, 60], [56, 59, 63]] }
  };
  let musicOn = true, song = null, musicGain = null, step = 0, nextT = 0, timer = 0, songId = '';
  const mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

  function musicTick() {
    const c = ctx; if (!c || !song || !musicOn || !enabled) return;
    const spb = 60 / song.bpm / 2;                       // satu langkah = not kedelapan
    while (nextT < c.currentTime + 0.35) {
      if (nextT < c.currentTime) nextT = c.currentTime + 0.02;
      const chord = song.chords[Math.floor(step / 8) % song.chords.length], pat = [0, 1, 2, 1, 0, 2, 1, 2];
      const m = chord[pat[step % 8]] + (step % 8 === 0 ? -12 : 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = song.wave; o.frequency.value = mtof(m + 12);
      g.gain.setValueAtTime(0.0001, nextT); g.gain.exponentialRampToValueAtTime(step % 8 === 0 ? 0.5 : 0.3, nextT + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, nextT + spb * 1.6);
      o.connect(g); g.connect(musicGain); o.start(nextT); o.stop(nextT + spb * 1.7);
      nextT += spb; step++;
    }
  }

  function startMusic(id) {
    songId = id; song = SONGS[id] || SONGS.menu; step = 0;
    const c = ensure(); if (!c) return;
    if (!musicGain) { musicGain = c.createGain(); musicGain.gain.value = 0.1; musicGain.connect(master); }
    nextT = c.currentTime + 0.05;
    clearInterval(timer); timer = setInterval(musicTick, 120);
  }

  GA.Audio = {
    unlock: function () { ensure(); if (song && !timer) startMusic(songId); },
    /** Tahan semua suara (jeda) / lanjutkan. */
    suspend: function () { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume: function () { if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setEnabled: function (v) { enabled = !!v; },
    isEnabled: function () { return enabled; },
    setMusic: function (v) { musicOn = !!v; if (musicOn && song && ctx) { nextT = ctx.currentTime + 0.05; } },
    isMusic: function () { return musicOn; },
    /** Mulai musik untuk suasana: menu | forest | volcano | tower (mengganti lagu bila beda). */
    music: function (id) { if (id === songId && timer) return; startMusic(id); },
    stopMusic: function () { clearInterval(timer); timer = 0; song = null; songId = ''; },
    play: function (name, arg) {
      if (!enabled) return;
      const f = SOUNDS[name];
      if (f) { try { f(arg); } catch (e) { /* abaikan */ } }
    }
  };
})(window.GA = window.GA || {});
