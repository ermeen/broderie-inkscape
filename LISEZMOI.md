# Panneau de broderie pour Inkscape (prototype)

Une interface simple pour Ink/Stitch, dans Inkscape. On dessine dans Inkscape, on règle la broderie dans le panneau, et Ink/Stitch (déjà installé) calcule les points.

## Installer (une seule fois)

1. Double-cliquez sur `installer.command`. Si macOS refuse d'ouvrir le fichier : clic droit › Ouvrir › Ouvrir.
2. Quittez Inkscape, puis relancez-le : c'est nécessaire pour que le raccourci ⌘⌥B fonctionne.

Le panneau est copié dans son propre dossier. Ink/Stitch et vos réglages ne sont pas modifiés. Pour le retirer : `desinstaller.command`.

## Utiliser

Inkscape n'est jamais bloqué : le panneau reste ouvert dans Safari pendant que vous dessinez.

**Un seul geste à retenir : ⌘⌥B dans Inkscape** (ou le menu Extensions › Broderie › Panneau de broderie).

- Vous venez de dessiner ou de sélectionner quelque chose : ⌘⌥B envoie le dessin au panneau et met Safari au premier plan.
- Vous venez de changer des réglages dans le panneau : revenez dans Inkscape et appuyez sur ⌘⌥B. Les réglages sont appliqués au dessin, vous restez dans Inkscape, et Cmd+Z les annule. Le bas du panneau indique combien de modifications attendent.

Dans le panneau :
- **à gauche** : les objets dans l'ordre de couture (▲▼ pour le changer) et les couleurs (cliquez sur une pastille pour la changer) ;
- **à droite** : les réglages de l'objet choisi, adaptés à son type (remplissage, satin, contour, clone, lettrage). **Mode avancé** montre tous les réglages d'Ink/Stitch, et ↺ remet un réglage par défaut. En bas, **Outils** propose les commandes utiles pour cet objet (convertir en satin, couper le satin, remplissage en contour…) ;
- **au centre** : l'aperçu des points calculé par Ink/Stitch, recalculé à chaque changement. Molette : zoom ; glisser : déplacer ; double-clic : tout voir ;
- **en haut** : Simulateur, Lettrage, Paramètres Ink/Stitch (la fenêtre d'origine), Exporter (le fichier arrive dans Téléchargements) et **Toutes les commandes…** (les 70 commandes d'Ink/Stitch, en français, avec recherche).

Certaines commandes ouvrent leur propre fenêtre d'Ink/Stitch (Lettrage, Paramètres, Simulateur…). Elle peut apparaître derrière Safari. Le résultat arrive dans le panneau quand vous la fermez.

Les réglages sont enregistrés exactement comme Ink/Stitch les enregistre. Le dessin reste donc utilisable avec les menus Ink/Stitch habituels.

## Où sont enregistrés les réglages de broderie ?

**Dans le fichier SVG d'Inkscape**, exactement comme Ink/Stitch les enregistre. Il n'y a pas de fichier à part.

1. Les réglages changés dans le panneau sont d'abord **en attente**. Le bas du panneau indique combien.
2. **⌘⌥B** (ou « Synchroniser avec Inkscape ») les met dans le dessin.
3. **⌘S dans Inkscape** les enregistre dans votre fichier `.svg`.

Le fichier reste compatible avec Ink/Stitch seul : on peut le rouvrir avec ses menus habituels, et inversement.

Les modifications en attente ne sont pas perdues :
- si le panneau est fermé ou redémarré, il les garde dans `~/Library/Application Support/broderie-panneau/` ;
- elles sont rattachées à leur dessin. Si vous passez à un autre dessin avant ⌘⌥B, elles sont mises de côté, puis appliquées quand vous revenez au premier dessin.

Pensez donc à faire **⌘⌥B puis ⌘S** avant de fermer Inkscape.

## Message « Unversioned Ink/Stitch SVG file detected »

- Avec un **ancien dessin** fait avec une ancienne version d'Ink/Stitch : cliquez **Update**.
- Avec un dessin récent : le panneau évite ce message tout seul.

## Limites connues du prototype

- Le panneau s'ouvre dans le navigateur et non dans une fenêtre ancrée d'Inkscape : les extensions Inkscape 1.4 ne le permettent pas (voir `docs/ETUDE_TECHNIQUE.md`).
- Les changements ne passent pas tout seuls d'Inkscape au panneau, ni l'inverse : c'est le rôle de ⌘⌥B. Inkscape ne permet pas à une extension de suivre le dessin en direct.
- Une commande Ink/Stitch lancée depuis le panneau (« Toutes les commandes… ») est perdue si vous avez modifié le dessin dans Inkscape avant de l'envoyer. Le panneau le signale.
- Le panneau s'arrête seul après une heure sans utilisation. Le menu le relance.
- Ce qui a été réellement testé est indiqué dans `docs/MATRICE_FONCTIONS.md`.
