# lint-strings.ps1 — menandai string UI di js/strings.js yang lebih dari 5 kata (kunci 'story.*' dikecualikan).
# Jalankan dari folder proyek:  powershell -NoProfile -ExecutionPolicy Bypass -File tools/lint-strings.ps1 [-Max 5]
param([int]$Max = 5)
$file = Join-Path (Split-Path $PSScriptRoot -Parent) 'js\strings.js'
$bad = 0
Select-String -Path $file -Pattern "'([a-z0-9.]+)':\s*'((?:[^'\]|\.)*)'" -AllMatches | ForEach-Object {
  foreach ($m in $_.Matches) {
    $k = $m.Groups[1].Value; $v = $m.Groups[2].Value
    if ($k -like 'story.*') { continue }
    $words = @((($v -replace '\{\w+\}', 'x').Trim() -split '\s+') | Where-Object { $_ -match '[A-Za-z0-9]' })
    if ($words.Count -gt $Max) { Write-Host ("{0} ({1} kata): {2}" -f $k, $words.Count, $v); $bad++ }
  }
}
if ($bad) { Write-Host "$bad string terlalu panjang."; exit 1 } else { Write-Host 'Semua string UI ringkas.' }
