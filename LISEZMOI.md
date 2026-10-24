# Panneau de broderie pour Inkscape (prototype)

Une interface simple pour Ink/Stitch, dans Inkscape. On dessine dans Inkscape, on règle la broderie dans le panneau, et Ink/Stitch (déjà installé) calcule les points.

## Installer (une seule fois)

1. Double-cliquez sur `installer.command`. Si macOS refuse d'ouvrir le fichier : clic droit › Ouvrir › Ouvrir.
2. Quittez Inkscape, puis relancez-le.

Le panneau est copié dans son propre dossier. Ink/Stitch et vos réglages ne sont pas modifiés. Pour le retirer : `desinstaller.command`.

## Utiliser

1. Ouvrez votre dessin dans Inkscape.
2. Sélectionnez les objets à régler. Sans sélection, le panneau montre tout le dessin.
3. Menu **Extensions › Broderie › Panneau de broderie**. Le panneau s'ouvre dans votre navigateur. Inkscape attend pendant ce temps : c'est normal.
4. Dans le panneau :
   - **à gauche**, les objets dans l'ordre de couture (▲▼ pour changer l'ordre) et les couleurs ;
   - **à droite**, les propriétés de l'objet choisi. Elles s'adaptent : remplissage, satin, contour… Cochez **Mode avancé** pour voir tous les réglages d'Ink/Stitch. Le ↺ remet un réglage à sa valeur par défaut ;
   - **en haut**, Aperçu des points (calculé par Ink/Stitch ; molette = zoom), Simulateur, Lettrage, Exporter (le fichier arrive dans Téléchargements) et **Toutes les commandes…**, qui donne accès à toutes les commandes d'Ink/Stitch.
5. **Appliquer dans Inkscape** enregistre les réglages dans le dessin. Cmd+Z les annule dans Inkscape. **Annuler** ne change rien.
6. Fermez l'onglet du navigateur et revenez à Inkscape.

Les réglages sont enregistrés exactement comme Ink/Stitch les enregistre. Le dessin reste donc utilisable avec les menus Ink/Stitch habituels.

## Message « Unversioned Ink/Stitch SVG file detected »

- Avec un **ancien dessin** fait avec une ancienne version d'Ink/Stitch : cliquez **Update**.
- Avec un dessin récent : le panneau évite ce message tout seul.

## Limites connues du prototype

- Le panneau s'ouvre dans le navigateur et non dans une fenêtre ancrée d'Inkscape. Les extensions Inkscape 1.4 ne peuvent pas créer de panneau ancré (voir `docs/ETUDE_TECHNIQUE.md`).
- Inkscape est bloqué tant que le panneau est ouvert : cliquez Appliquer ou Annuler (en bas à droite du panneau) pour le libérer. Si vous fermez l'onglet du navigateur, Inkscape est libéré automatiquement au bout de 45 secondes, sans modification.
- Le panneau ne montre que les objets déjà dessinés : dessinez d'abord dans Inkscape, puis ouvrez le panneau.
- Ce qui a été réellement testé est indiqué dans `docs/MATRICE_FONCTIONS.md`.
