# Étude technique : Inkscape + Ink/Stitch sur ce Mac

## Ce qui est installé (vérifié le 24/10/2026)

- **Mac** : M1, 8 Go de RAM, macOS 27.
- **Inkscape 1.4.2** (`/Applications/Inkscape.app`). Il fournit son propre Python 3.10, avec la bibliothèque d'extensions `inkex` 1.4.
- **Ink/Stitch v3.3.0** (osx-arm64, 30/07/2026), installé dans les extensions d'Inkscape :
  - c'est une application autonome (Python 3.12 emballé) ;
  - elle compte 146 commandes (`.inx`) : 70 effets, 26 formats d'export et 50 formats d'import ;
  - elle définit 139 réglages de broderie ;
  - une traduction française est fournie.

## Architecture d'Ink/Stitch

- Chaque menu d'Ink/Stitch appelle le même programme : `inkstitch --extension=<commande> [--id=…] [options] fichier.svg`.
- Les réglages sont stockés sur chaque objet sous la forme d'attributs `inkstitch:<nom>`. Le numéro de version du format se trouve dans `<metadata>` (`inkstitch_svg_version`, actuellement 4).
- Les fenêtres d'Ink/Stitch (Paramètres, Simulateur, Lettrage…) sont des fenêtres séparées qui bloquent Inkscape.

## Possibilités pour une interface plus simple

| Solution | Panneau ancré dans Inkscape | Réalisable | Maintenance |
|---|---|---|---|
| Extension classique (`.inx` seul) | non : boîte de dialogue figée, pas de contenu selon l'objet | oui | facile, mais ne répond pas au besoin |
| Extension + fenêtre GTK | non (fenêtre séparée) | GTK n'est pas utilisable depuis le Python d'Inkscape sur macOS (testé : erreur de chargement de GLib) | fragile |
| Extension + panneau web local (**retenue**) | non, mais panneau libre et complet | oui (testé) | simple : Python standard + HTML |
| Modifier Inkscape (C++) ou Ink/Stitch | oui | trop lourd ; contraire à « ne pas modifier l'installation » | très difficile |

Les extensions d'Inkscape 1.4 ne peuvent pas créer de panneau ancré qui reste ouvert pendant qu'on dessine. Aucune solution simple et gratuite ne contourne cette limite.

## Solution retenue

1. L'extension « Panneau de broderie » reçoit le dessin et la sélection d'Inkscape.
2. Elle ouvre un panneau web local, accessible seulement depuis le Mac (127.0.0.1), sans connexion Internet.
3. Le panneau écrit les mêmes attributs qu'Ink/Stitch et appelle le programme Ink/Stitch installé pour l'aperçu, le simulateur, le lettrage, les commandes et l'export.
4. « Appliquer » renvoie le dessin à Inkscape, ce qui le rend annulable avec Cmd+Z.

Aucun algorithme de broderie n'est réécrit. Coût : 0 €. Mémoire : un petit serveur Python, plus Ink/Stitch pendant un calcul.

## Pistes ensuite

- Plus de réglages « courants » bien choisis par type d'objet.
- Aperçu réaliste (`realistic-300`).
- Panneau ouvert dans une fenêtre d'application plutôt qu'un onglet.
