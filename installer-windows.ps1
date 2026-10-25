# Installe le « Panneau de broderie » dans Inkscape sous Windows (dossier séparé : Ink/Stitch n'est pas touché).
# Lancé par « Installer sous Windows.bat ». Ensuite : quittez et relancez Inkscape.
$ErrorActionPreference = 'Stop'
$ici = Split-Path -Parent $MyInvocation.MyCommand.Path
$profil = Join-Path $env:APPDATA 'inkscape'
$dest = Join-Path $profil 'extensions\broderie-panneau'

if (-not (Test-Path (Join-Path $profil 'extensions\inkstitch'))) {
    Write-Host "Attention : Ink/Stitch n'a pas été trouvé dans $profil\extensions\inkstitch." -ForegroundColor Yellow
    Write-Host "Installez d'abord Ink/Stitch 3 (https://inkstitch.org), puis relancez cette installation."
}

New-Item -ItemType Directory -Force -Path $dest | Out-Null
if (Test-Path (Join-Path $dest 'broderie')) { Remove-Item -Recurse -Force (Join-Path $dest 'broderie') }
Copy-Item -Recurse (Join-Path $ici 'broderie') $dest
foreach ($f in 'broderie_panneau.py', 'broderie_panneau.inx', 'broderie_serveur.py', 'VERSION') {
    Copy-Item -Force (Join-Path $ici $f) $dest
}
Get-ChildItem $dest -Recurse -Directory -Filter __pycache__ | Remove-Item -Recurse -Force

# arrête l'ancien serveur du panneau s'il tourne (il redémarre avec la nouvelle version)
# … sauf s'il garde des modifications pas encore envoyées à Inkscape
try {
    $r = Invoke-RestMethod -Uri 'http://127.0.0.1:47811/api/present' -Method Post -Body '{}' -TimeoutSec 2
    if ($r.attente -gt 0) {
        Write-Host "Le panneau garde $($r.attente) modification(s) non envoyée(s) : il n'est pas redémarré (Ctrl+Alt+B dans Inkscape)."
    } else {
        try { Invoke-RestMethod -Uri 'http://127.0.0.1:47811/api/quitter' -Method Post -Body '{}' -TimeoutSec 2 | Out-Null } catch {}
    }
} catch {}

# raccourci clavier Ctrl+Alt+B, dans les raccourcis personnels d'Inkscape
# (fichier créé s'il n'existe pas, sinon la ligne est ajoutée sans toucher au reste)
$keys = Join-Path $profil 'keys\default.xml'
$ligne = '  <bind gaction="app.org.pointlibre.broderie.panneau" keys="&lt;primary&gt;&lt;alt&gt;b"/>'
$utf8 = New-Object System.Text.UTF8Encoding $false
New-Item -ItemType Directory -Force -Path (Split-Path $keys) | Out-Null
if (-not (Test-Path $keys)) {
    [IO.File]::WriteAllText($keys, "<?xml version=`"1.0`"?>`n<keys name=`"Raccourcis personnels`">`n$ligne`n</keys>`n", $utf8)
} elseif (-not (Select-String -Path $keys -Pattern 'org.pointlibre.broderie.panneau' -SimpleMatch -Quiet)) {
    Copy-Item -Force $keys "$keys.avant-broderie"
    $s = [IO.File]::ReadAllText($keys)
    $i = $s.LastIndexOf('</keys>')
    [IO.File]::WriteAllText($keys, $s.Substring(0, $i) + $ligne + "`n" + $s.Substring($i), $utf8)
}

$version = (Get-Content (Join-Path $ici 'VERSION')).Trim()
Write-Host ""
Write-Host "Panneau de broderie $version installé dans : $dest" -ForegroundColor Green
Write-Host "Quittez et relancez Inkscape, puis appuyez sur Ctrl+Alt+B (ou Extensions > Broderie > Panneau de broderie)."
