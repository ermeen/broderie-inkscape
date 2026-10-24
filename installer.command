#!/bin/bash
# Installe le « Panneau de broderie » dans Inkscape (dossier séparé : Ink/Stitch n'est pas touché).
# Double-cliquez sur ce fichier, puis redémarrez Inkscape.
set -e
ICI="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/Library/Application Support/org.inkscape.Inkscape/config/inkscape/extensions/broderie-panneau"
mkdir -p "$DEST"
rm -rf "$DEST/broderie"
cp -R "$ICI/broderie" "$DEST/"
cp "$ICI/broderie_panneau.py" "$ICI/broderie_panneau.inx" "$ICI/broderie_serveur.py" "$DEST/"
# arrête l'ancien serveur du panneau s'il tourne (il redémarre avec la nouvelle version)
curl -s -m 2 -X POST http://127.0.0.1:47811/api/quitter -d '{}' >/dev/null 2>&1 || true
find "$DEST" -name __pycache__ -prune -exec rm -rf {} +
# raccourci clavier ⌘⇧B (et ⌘⌥B) pour le panneau, dans les raccourcis personnels d'Inkscape :
# fichier créé s'il n'existe pas, sinon la ligne est ajoutée sans toucher au reste
KEYS="$HOME/Library/Application Support/org.inkscape.Inkscape/config/inkscape/keys/default.xml"
mkdir -p "$(dirname "$KEYS")"
LIGNE='  <bind gaction="app.org.pointlibre.broderie.panneau" keys="&lt;primary&gt;&lt;shift&gt;b,&lt;primary&gt;&lt;alt&gt;b"/>'
if [ ! -f "$KEYS" ]; then
  printf '<?xml version="1.0"?>\n<keys name="Raccourcis personnels">\n%s\n</keys>\n' "$LIGNE" > "$KEYS"
elif ! grep -q "org.pointlibre.broderie.panneau" "$KEYS"; then
  cp "$KEYS" "$KEYS.avant-broderie"
  /usr/bin/python3 - "$KEYS" "$LIGNE" <<'PY'
import sys
f, ligne = sys.argv[1], sys.argv[2]
s = open(f, encoding="utf-8").read()
i = s.rfind("</keys>")
open(f, "w", encoding="utf-8").write(s[:i] + ligne + "\n" + s[i:])
PY
fi
echo "Raccourci : Cmd+Maj+B dans Inkscape"
echo "Installé dans : $DEST"
echo "Quittez et relancez Inkscape, puis appuyez sur Cmd+Maj+B (ou Extensions › Broderie › Panneau de broderie)"
