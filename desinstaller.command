#!/bin/bash
# Retire le « Panneau de broderie » (n'efface que son propre dossier ; Ink/Stitch reste intact).
DEST="$HOME/Library/Application Support/org.inkscape.Inkscape/config/inkscape/extensions/broderie-panneau"
KEYS="$HOME/Library/Application Support/org.inkscape.Inkscape/config/inkscape/keys/default.xml"
[ -f "$KEYS" ] && /usr/bin/sed -i '' '/org.pointlibre.broderie.panneau/d' "$KEYS"
rm -rf "$DEST" && echo "Panneau de broderie retiré. Redémarrez Inkscape."
