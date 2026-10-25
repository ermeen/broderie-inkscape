# Retire le « Panneau de broderie » d'Inkscape sous Windows (Ink/Stitch n'est pas touché).
$profil = Join-Path $env:APPDATA 'inkscape'
$dest = Join-Path $profil 'extensions\broderie-panneau'
try { Invoke-RestMethod -Uri 'http://127.0.0.1:47811/api/quitter' -Method Post -Body '{}' -TimeoutSec 2 | Out-Null } catch {}
if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
$keys = Join-Path $profil 'keys\default.xml'
if (Test-Path $keys) {
    $s = [IO.File]::ReadAllLines($keys) | Where-Object { $_ -notmatch 'org\.pointlibre\.broderie\.panneau' }
    [IO.File]::WriteAllLines($keys, $s, (New-Object System.Text.UTF8Encoding $false))
}
Write-Host "Panneau de broderie retiré. Vos cadres et réglages restent dans $env:APPDATA\broderie-panneau (à supprimer si vous le souhaitez)."
