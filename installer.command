#!/bin/bash
# Installe le « Panneau de broderie » dans Inkscape (dossier séparé : Ink/Stitch n'est pas touché).
# Double-cliquez sur ce fichier, puis redémarrez Inkscape.
set -e
ICI="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/Library/Application Support/org.inkscape.Inkscape/config/inkscape/extensions/broderie-panneau"
mkdir -p "$DEST"
rm -rf "$DEST/broderie"
cp -R "$ICI/broderie" "$DEST/"
cp "$ICI/broderie_panneau.py" "$ICI/broderie_panneau.inx" "$DEST/"
find "$DEST" -name __pycache__ -prune -exec rm -rf {} +
echo "Installé dans : $DEST"
echo "Redémarrez Inkscape, puis : Extensions › Broderie › Panneau de broderie"
