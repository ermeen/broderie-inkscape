<p align="center"><img src="docs/logo/icone.png" width="160" alt="Broderie"></p>

# Panneau de broderie pour Inkscape

*[English version](README.en.md)*

Une interface simple pour [Ink/Stitch](https://inkstitch.org), dans [Inkscape](https://inkscape.org).

On **dessine dans Inkscape**, on **règle la broderie dans le panneau**, et **Ink/Stitch calcule les points**. Un seul geste relie les deux : **Cmd+Option+B**.

![Le panneau de broderie](docs/notice/images/objets.png)

## Ce que fait le panneau

- **Objets**
  - Calques et objets : sélection multiple avec réglages communs, ordre par glisser-déposer, œil pour broder ou non.
  - Types de point en tuiles et réglages essentiels en curseurs ; tous les réglages d'Ink/Stitch rangés par thèmes.
  - Copier et coller des réglages.
  - Colonnes satin : conversion d'un trait, assemblage des rails et traverses.
  - Texte brodé (140 polices) avec aperçu en direct : droit, en arc (jusqu'au cercle) ou sur une courbe dessinée dans Inkscape.
- **Simulation**
  - Animation point par point (sauts, coupes, changements de couleur) ou rendu réaliste sur tissu, avec zoom.
  - Le cadre de la brodeuse dessiné autour du motif, et un **bâti** réglable (écart, longueur de point, arrondi des angles).
- **Export**
  - 21 formats de machine.
  - Bobines : marque de fil (75 nuanciers), bobine la plus proche pour chaque couleur, couleurs exactes des fils.
  - Durée estimée.
- **Toutes les commandes Ink/Stitch**, en français.

## Installer

Il faut Inkscape 1.4 et Ink/Stitch 3, testés avec Inkscape 1.4.2 et Ink/Stitch 3.3.0 sur macOS.

1. Téléchargez la dernière version (onglet *Releases*) et décompressez-la.
2. Double-cliquez sur `installer.command`. Si macOS refuse : clic droit › Ouvrir › Ouvrir.
3. Quittez puis relancez Inkscape.
4. Appuyez sur **Cmd+Option+B**.

Mode d'emploi complet et astuces de réglages : [docs/Notice-Broderie-1.6.1.pdf](docs/Notice-Broderie-1.6.1.pdf).

**Windows (version d'essai)** : double-cliquez sur `Installer sous Windows.bat`, relancez Inkscape, puis **Ctrl+Alt+B**. Guide de test : [TESTER-WINDOWS.md](TESTER-WINDOWS.md).

## Où sont les réglages ?

Dans votre fichier `.svg`, exactement comme Ink/Stitch les enregistre. Le dessin reste utilisable avec les menus Ink/Stitch habituels.

## Versions

Numérotation `MAJEUR.MINEUR.CORRECTIF`, détail dans [CHANGELOG.md](CHANGELOG.md).

## Vos retours

Les testeurs sont les bienvenus : signalez ce qui marche et ce qui ne marche pas dans les [issues](https://github.com/ermeen/broderie-inkscape/issues), avec votre système et vos versions d'Inkscape et d'Ink/Stitch. Une version Windows est en cours d'essai.

## Licence

GPL v3, comme Ink/Stitch, dont le panneau reprend les libellés et la liste des réglages. Ink/Stitch et Inkscape ne sont pas inclus : le panneau utilise ceux qui sont installés.
