# Tester le panneau de broderie sous Windows (version d'essai)

Le panneau a été écrit pour Windows mais n'y a pas encore été essayé. Merci de noter ce qui marche et ce qui ne marche pas.

## Avant

- **Inkscape 1.4** installé (https://inkscape.org).
- **Ink/Stitch 3** installé (https://inkstitch.org), et qui fonctionne dans Inkscape : le menu Extensions › Ink/Stitch existe.

## Installer

1. Téléchargez le projet : sur https://github.com/ermeen/broderie-inkscape, bouton vert **Code › Download ZIP**. Décompressez-le (clic droit › Extraire tout).
2. Double-cliquez sur **Installer sous Windows.bat**. Si Windows affiche « Windows a protégé votre ordinateur » : *Informations complémentaires › Exécuter quand même*.
3. Une fenêtre noire indique où le panneau est installé. Appuyez sur une touche pour la fermer.
4. Quittez Inkscape s'il est ouvert, puis relancez-le.

## Essayer, dans l'ordre

| # | Geste | Ce qui devrait se passer |
|---|---|---|
| 1 | Dessinez un rectangle rempli, puis **Ctrl+Alt+B** | Une fenêtre étroite « Broderie » s'ouvre (Edge), avec le rectangle dans la liste |
| 2 | Si Ctrl+Alt+B ne fait rien : menu **Extensions › Broderie › Panneau de broderie** | Même résultat |
| 3 | Attendez quelques secondes | L'aperçu des points s'affiche en haut |
| 4 | Changez le type de point (tuile Contour), puis **Ctrl+Alt+B** dans Inkscape | Le bouton Synchroniser passe au vert, le réglage est dans le dessin (Ctrl+Z l'annule) |
| 5 | Onglet **Simulation**, puis cochez **Bâti** | La simulation se joue dans le cadre, le bâti apparaît autour du motif |
| 6 | **＋ Texte**, tapez un mot, arc vers le haut | L'aperçu du texte s'affiche, puis « Ajouter au dessin » |
| 7 | Onglet **Export**, format .pes ou .dst, **Exporter** | Le fichier arrive dans Téléchargements |
| 8 | Onglet Export, carte **Bobines** | La liste des fils avec une marque (Madeira…) |
| 9 | Export › **Toutes les commandes Ink/Stitch…**, une commande avec un fichier (« Choisir… ») | Une fenêtre Windows de choix de fichier s'ouvre |

## Si quelque chose ne marche pas

Notez le numéro du geste et ce que vous voyez (une capture d'écran aide beaucoup), et joignez ce fichier : tapez `%TEMP%` dans la barre d'adresse de l'Explorateur, puis ouvrez **broderie-panneau.log**.

Pour retirer le panneau : **Desinstaller sous Windows.bat**.
