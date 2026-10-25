#!/bin/bash
# Fabrique l'archive de diffusion : dist/broderie-inkscape-<version>.zip
set -e
ICI="$(cd "$(dirname "$0")" && pwd)"
V="$(cat "$ICI/VERSION")"
NOM="broderie-inkscape-$V"
rm -rf "$ICI/dist/$NOM" && mkdir -p "$ICI/dist/$NOM"
cp -R "$ICI/broderie" "$ICI/dist/$NOM/"
cp "$ICI"/{broderie_panneau.py,broderie_panneau.inx,broderie_serveur.py,installer.command,desinstaller.command,installer-windows.ps1,desinstaller-windows.ps1,VERSION,LICENSE,README.md,README.en.md,LISEZMOI.md,CHANGELOG.md} "$ICI/dist/$NOM/"
cp "$ICI/Installer sous Windows.bat" "$ICI/Desinstaller sous Windows.bat" "$ICI/dist/$NOM/"
cp "$ICI/docs/Notice-Broderie-$V.pdf" "$ICI/dist/$NOM/"
find "$ICI/dist/$NOM" -name __pycache__ -prune -exec rm -rf {} + ; find "$ICI/dist/$NOM" -name .DS_Store -delete
chmod +x "$ICI/dist/$NOM"/*.command
(cd "$ICI/dist" && rm -f "$NOM.zip" && /usr/bin/zip -qr "$NOM.zip" "$NOM")
echo "$ICI/dist/$NOM.zip"
