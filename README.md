<p align="center"><img src="docs/logo/icone.png" width="160" alt="Broderie"></p>

# Panneau de broderie pour Inkscape

*[English version](README.en.md)*

Une interface simple pour [Ink/Stitch](https://inkstitch.org), dans [Inkscape](https://inkscape.org).

On **dessine dans Inkscape**, on **règle la broderie dans le panneau**, et **Ink/Stitch calcule les points**. Un seul geste relie les deux : **Cmd+Option+B**.

![Le panneau de broderie](docs/notice/images/objets.png)

## Ce que fait le panneau

- **Objets**
  - Calques et objets : sélection multiple avec réglages communs, « Choisir les semblables », ordre par glisser-déposer (plusieurs objets, entre deux calques), œil pour broder ou non.
  - Types de point en tuiles et réglages essentiels en curseurs ; tous les réglages d'Ink/Stitch rangés par thèmes, chacun avec un conseil (i) et le lien vers la documentation.
  - **Ink/Stitch · Auto · Main** : les réglages qui dépendent du tissu sont calculés d'après le profil du dessin (tissu, stabilisateur, fil) et la forme, ou réglés à la main.
  - Couleurs déjà dans le dessin, copier-coller des réglages, réglages favoris.
  - Départ et fin de l'aiguille placés d'un clic, appliqué en un clic, remplissage en satin.
  - Texte brodé (140 polices) avec aperçu en direct : droit, en arc ou sur une courbe ; réglages lettre par lettre.
- **Simulation**
  - Animation point par point ou rendu réaliste, avec zoom, règle, suivi de l'aiguille.
  - Le cadre de la brodeuse autour du motif, et un **bâti** réglable.
- **Export**
  - Profil de broderie et « Tout le dessin en auto », regrouper les couleurs, couper ou relier les sauts.
  - **Vérifier avant d'exporter** : problèmes traduits, avec Montrer et Corriger.
  - 21 formats de machine, bobines (75 nuanciers), fiche machine en français, ouverture des fichiers machine.
- **Toutes les commandes Ink/Stitch**, en français.

## Installer

Il faut Inkscape 1.4 et Ink/Stitch 3, testés avec Inkscape 1.4.2 et Ink/Stitch 3.3.0 sur macOS.

1. Téléchargez la dernière version (onglet *Releases*) et décompressez-la.
2. Double-cliquez sur `installer.command`. Si macOS refuse : clic droit › Ouvrir › Ouvrir.
3. Quittez puis relancez Inkscape.
4. Appuyez sur **Cmd+Option+B**.

Deux guides en PDF, dans l'archive et ici :
- [Guide rapide](docs/Guide-rapide-Broderie-1.7.1.pdf) (2 pages, à garder sous la main) ;
- [Guide complet](docs/Guide-complet-Broderie-1.7.1.pdf) (toutes les fonctions, illustrées, et les bonnes pratiques).

**Windows (version d'essai)** : double-cliquez sur `Installer sous Windows.bat`, relancez Inkscape, puis **Ctrl+Alt+B**. Guide de test : [TESTER-WINDOWS.md](TESTER-WINDOWS.md).

## Où sont les réglages ?

Dans votre fichier `.svg`, exactement comme Ink/Stitch les enregistre. Le dessin reste utilisable avec les menus Ink/Stitch habituels.

## Versions

Numérotation `MAJEUR.MINEUR.CORRECTIF`, détail dans [CHANGELOG.md](CHANGELOG.md).

## Vos retours

Les testeurs sont les bienvenus : signalez ce qui marche et ce qui ne marche pas dans les [issues](https://github.com/ermeen/broderie-inkscape/issues), avec votre système et vos versions d'Inkscape et d'Ink/Stitch. Une version Windows est en cours d'essai.

## Licence

GPL v3, comme Ink/Stitch, dont le panneau reprend les libellés et la liste des réglages. Ink/Stitch et Inkscape ne sont pas inclus : le panneau utilise ceux qui sont installés.
