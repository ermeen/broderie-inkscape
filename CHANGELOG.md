# Historique des versions

Le numéro de version suit le schéma `MAJEUR.MINEUR.CORRECTIF` :
- **MAJEUR** : changement incompatible (format des réglages, installation) ;
- **MINEUR** : nouvelle fonction ;
- **CORRECTIF** : correction sans nouvelle fonction.

## 1.4.0 — 25 octobre 2026

**Windows (version d'essai)**
- Le panneau fonctionne aussi sous Windows : installation par « Installer sous Windows.bat », raccourci Ctrl+Alt+B, panneau dans une fenêtre étroite d'Edge, boîtes de choix de fichier de Windows, Ink/Stitch lancé sans fenêtre noire.
- Les textes du panneau affichent les touches de Windows (Ctrl+Alt+B, Ctrl-clic, Maj-clic).
- Pas encore essayé sur un vrai PC : guide de test dans TESTER-WINDOWS.md.
- Ce qui dépend du système est regroupé dans un seul fichier (`broderie/systeme.py`). Le Mac fonctionne comme avant (vérifié : aperçu, simulation, texte en arc, densité, export, bobines).

**README en anglais** et appel aux testeurs.

 — 24 octobre 2026

**Bobines (onglet Export)**
- Choix de la marque de fil parmi les nuanciers d'Ink/Stitch : Madeira, Isacord, Brother, Gütermann, Sulky, DMC, Janome, Mettler…, et vos palettes personnelles installées dans Inkscape.
- La marque est reconnue d'elle-même quand le dessin en utilise déjà les couleurs exactes.
- Pour chaque fil, dans l'ordre de couture : la couleur du dessin, la bobine la plus proche (numéro et nom) et un repère d'écart (identique, très proche, approchant, éloigné).
- « Changer » ouvre le nuancier de la marque : recherche par numéro ou par nom, teintes les plus proches en premier.
- « Prendre les couleurs exactes des fils » donne aux objets, textes compris, la couleur exacte des bobines, comme « Appliquer une palette » d'Ink/Stitch. Ink/Stitch reconnaît alors la marque, le numéro et le nom des fils. Vérifié dans sa liste de fils, dans le .vp3 (numéro, nom, marque) et dans le .inf (nom) ; les .pes, .jef et .dst ne gardent que la couleur.
- « Liste des fils (texte) » prépare les bobines avant de broder.
- Légende des statistiques : « Madeira Rayon 1147 Foxy Red » au lieu de « Fil 1 » quand la couleur est celle d'une bobine.

 — 24 octobre 2026

**Icônes**
- Barre de l'aperçu : boutons-icônes à la place des cases à cocher. Grenouille pour les sauts, ciseaux pour les coupes et arrêts, carreaux pour la densité, aiguille pour les pénétrations. Le nom s'affiche au survol.
- Simulation : toutes les icônes redessinées dans le même style, proche d'Apple (traits arrondis, lisibles en clair comme en sombre).

**Logo** : traits épaissis et couleurs renforcées pour rester lisible en petit (bandeau, onglet, menu Inkscape). Il est un peu plus grand dans le bandeau. Le logo d'origine est conservé dans `docs/logo/icone.png`.

**Notice** : à jour avec toutes les fonctions (nouvelles icônes, outils par type d'objet, préférences du simulateur) et avec des captures refaites.

 — 24 octobre 2026

**Texte brodé**
- Aperçu des points en direct : le texte s'affiche quelques secondes après chaque changement, avec sa taille en mm et son nombre de points.
- Avertissements : lettres de moins de 5 mm, texte plus grand que le cadre choisi, taille hors de la plage de la police. Ink/Stitch impose cette plage : la case Taille s'y limite maintenant.
- Arcs prêts à l'emploi : vers le haut, vers le bas, et presque un cercle avec le curseur Courbure (100 %).
- Sur une courbe : le texte suit une courbe libre dessinée dans Inkscape (Bézier, spirale, cercle), au début, au centre ou sur toute la courbe. La courbe guide est ensuite retirée de la broderie (œil fermé).
- Ces formes passent par « Lettrage le long d'un chemin » d'Ink/Stitch : les lettres tournent sans être déformées.
- Modifier un texte courbé retrouve sa forme ; un texte droit modifié reste à sa place.

**Interface**
- Bandeau du haut sur une ligne : logo, onglets avec icônes, bouton d'élargissement.
- Bandeau du bas plus grand. Le bouton Synchroniser est orange quand des modifications attendent, vert quand tout est à jour.
- Onglet Points : la simulation ne peut plus être agrandie au-delà de la fenêtre.
- Aperçu : la vue de départ montre la page et tout le motif, même ce qui dépasse de la page (un texte posé au-dessus restait coupé).

**Corrections**
- Après l'ajout d'un texte, la liste ne montrait plus que ce texte ; elle montre de nouveau tout le dessin.
- Un doublon dans le code du clavier de la simulation annulait la limite de hauteur après un appui sur « O ».

 — 24 octobre 2026

**Liste des calques et objets**
- Glisser-déposer pour changer l'ordre, comme dans Inkscape (l'ordre est l'ordre de couture) : un objet avant ou après un autre, dans un autre calque, ou un calque avant un autre.
- Œil sur chaque objet et chaque calque. Masqué, il n'est pas brodé (Ink/Stitch ignore ce qui est masqué) mais il reste dans la liste pour être réaffiché.
- Pas de cadenas ni d'opacité : ils ne servent qu'au dessin dans Inkscape et n'ont aucun effet sur la broderie.

**Aperçu**
- Clic gauche sur un objet pour le choisir (⌘-clic : plusieurs).
- Glisser, ou bouton du milieu, pour déplacer la vue.

**Sélection multiple** : les outils (agencement automatique des colonnes satin…) s'appliquent à tous les objets choisis.

**Menus Ink/Stitch vérifiés un par un** : les 70 commandes sont dans le panneau.
- **Outils selon le type d'objet** : les principaux en boutons, les autres dans « Plus d'outils ».
  - Satin : agencement automatique, scinder, intervertir les rails, satin en trait, satin multicolore.
  - Trait : trait en satin, agencement automatique des points droits, redwork, ligne zigzag en satin, effet de chemin satin, contour, saut en trait.
  - Remplissage : remplissage en trait, assise de points couchants, briser, remplissage en satin, blocs de dégradés, tartan, assistant point de croix.
  - Tous : dépistage de problèmes, suppression des réglages, transformation, points répétés.
- **Carte de densité** dans l'aperçu (case « Densité ») : rouge = trop dense, jaune = limite, vert = correct.
- **Fiche PDF pour la machine** (Export PDF d'Ink/Stitch) dans l'onglet Export.
- Bandeau « ancien dessin » : indique directement « Mettre à jour le svg d'Inkstitch ».
- Déjà intégrés autrement, donc sans doublon : lettrage, aperçu, simulateur, ordre de broderie, dupliquer les paramètres (copier/coller), couleurs.

## 1.0.0 — 24 octobre 2026

Première version publiée, avec son logo et une notice PDF illustrée (9 pages, astuces de réglages).

**Panneau et liaison avec Inkscape**
- Panneau de broderie dans une fenêtre Safari, placée à droite d'Inkscape. La fenêtre garde la taille choisie.
- Raccourci ⌘⌥B et bouton « Synchroniser avec Inkscape » : envoi du dessin et retour des réglages, annulable par Cmd+Z.
- Inkscape n'est jamais bloqué.
- Modifications en attente sauvegardées et rattachées à leur dessin.
- Mise à jour automatique du panneau, sans perte.

**Onglet Objets**
- Liste par calques, sélection multiple (⌘-clic, ⇧-clic, calque entier) avec réglages communs.
- Types de point en tuiles, réglages essentiels en curseurs, tous les autres réglages d'Ink/Stitch par thèmes.
- Copier et coller des réglages, couleurs, ordre de couture.
- Assemblage des rails et traverses en colonne satin, conversion d'un trait en satin.
- Texte brodé (140 polices) et texte courbé le long d'un tracé.

**Aperçu**
- Points d'aiguille, sauts (grenouille), coupes, arrêts et changements de couleur.
- Rendu réaliste avec tissu tissé et ombre.
- Aperçu redimensionnable, à gauche des réglages quand la fenêtre est large.

**Onglet Points** : simulateur complet, avec les commandes, icônes, raccourcis, informations et préférences du simulateur d'Ink/Stitch.

**Export**
- 21 formats, avec la marque de la machine.
- Cadres de la brodeuse (ajout, suppression), vérification de taille, motif centré dans le cadre, le cadre devenant la page d'Inkscape.
- Durée estimée.

**Commandes et compatibilité**
- Les 70 commandes Ink/Stitch, en français.
- Anciens dessins Ink/Stitch détectés (aucune fenêtre bloquante).
- Contrôle automatique des 139 réglages : 131 changent les points, 6 sans effet démontré dans les essais (voir `docs/MATRICE_FONCTIONS.md`).

Testé avec Inkscape 1.4.2 et Ink/Stitch 3.3.0 sur macOS (Mac M1).
