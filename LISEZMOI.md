# Panneau de broderie pour Inkscape (prototype)

Une interface simple pour Ink/Stitch, dans Inkscape. On dessine dans Inkscape, on règle la broderie dans le panneau, et Ink/Stitch (déjà installé) calcule les points.

## Installer (une seule fois)

1. Double-cliquez sur `installer.command`. Si macOS refuse d'ouvrir le fichier : clic droit › Ouvrir › Ouvrir.
2. Quittez Inkscape, puis relancez-le.

Le panneau est copié dans son propre dossier. Ink/Stitch et vos réglages ne sont pas modifiés. Pour le retirer : `desinstaller.command`.

## Utiliser

Inkscape n'est jamais bloqué : le panneau reste ouvert dans le navigateur pendant que vous dessinez.

1. Dessinez dans Inkscape et sélectionnez des objets. Sans sélection, le panneau montre tout le dessin.
2. Menu **Extensions › Broderie › Panneau de broderie**. Le panneau s'ouvre dans le navigateur et reçoit le dessin. La première fois, cela prend environ une seconde.
3. Dans le panneau :
   - **à gauche**, les objets dans l'ordre de couture (▲▼) et les couleurs ;
   - **à droite**, les réglages de l'objet choisi. **Mode avancé** montre tous les réglages d'Ink/Stitch, et ↺ remet un réglage à sa valeur par défaut ;
   - **au centre**, l'aperçu des points calculé par Ink/Stitch, recalculé à chaque changement. Molette : zoom net ; glisser : déplacer ; double-clic : tout voir ;
   - **en haut**, Simulateur, Lettrage, Exporter (le fichier arrive dans Téléchargements) et **Toutes les commandes…**.
4. Pour envoyer vos réglages dans le dessin : dans Inkscape, refaites **Extensions › Broderie › Panneau de broderie**. Le bas du panneau indique combien de modifications attendent.
   - Le même menu envoie aussi au panneau ce que vous avez dessiné ou sélectionné entre-temps.
   - Cmd+Z dans Inkscape annule l'envoi.
   - Astuce : Inkscape propose « Extensions › Extension précédente » pour relancer la dernière extension utilisée ; vous pouvez lui donner un raccourci clavier dans les Préférences.
5. **Abandonner les modifications** oublie ce qui n'a pas encore été envoyé.

Les réglages sont enregistrés exactement comme Ink/Stitch les enregistre. Le dessin reste donc utilisable avec les menus Ink/Stitch habituels.

## Message « Unversioned Ink/Stitch SVG file detected »

- Avec un **ancien dessin** fait avec une ancienne version d'Ink/Stitch : cliquez **Update**.
- Avec un dessin récent : le panneau évite ce message tout seul.

## Limites connues du prototype

- Le panneau s'ouvre dans le navigateur et non dans une fenêtre ancrée d'Inkscape : les extensions Inkscape 1.4 ne le permettent pas (voir `docs/ETUDE_TECHNIQUE.md`).
- Les changements ne passent pas tout seuls d'Inkscape au panneau, ni l'inverse : il faut relancer le menu Panneau de broderie. Inkscape ne permet pas à une extension de suivre le dessin en direct.
- Une commande Ink/Stitch lancée depuis le panneau (« Toutes les commandes… ») est perdue si vous avez modifié le dessin dans Inkscape avant de l'envoyer. Le panneau le signale.
- Le panneau s'arrête seul après une heure sans utilisation. Le menu le relance.
- Ce qui a été réellement testé est indiqué dans `docs/MATRICE_FONCTIONS.md`.
