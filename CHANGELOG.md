# Historique des versions

Le numéro de version suit le schéma `MAJEUR.MINEUR.CORRECTIF` :
- **MAJEUR** : changement incompatible (format des réglages, installation) ;
- **MINEUR** : nouvelle fonction ;
- **CORRECTIF** : correction sans nouvelle fonction.

## 1.7.1 — 27 octobre 2026

- **Clic dans l'aperçu** : un objet entouré par un satin (un sourcil dans le contour de la citrouille) se choisit enfin d'un clic. Un satin ne se clique plus que sur sa bande, un trait sur sa ligne ; et quand plusieurs objets sont sous la souris, c'est le plus petit qui est choisi. Vérifié sur la citrouille : sourcils, nez, bouche, contour et tête choisis chacun à sa place.

## 1.7.0 — 26 octobre 2026

**Texte brodé**
- **Réglages des lettres** (texte choisi dans la liste) : densité, sous-couche, compensation… pour tout le texte, par type de forme (satin, remplissage, trait), ou pour **une seule lettre**. Ils sont **gardés quand on modifie le texte** (mot, police, taille, courbure). « Revenir aux réglages de la police » les efface.
- Préréglages **selon le tissu** (coton, tissu fin, jersey, éponge, jean, cuir) et alertes de lisibilité (lettres trop petites, satin trop dense sur des petites lettres, taille hors de la plage de la police).

**Objets**
- **Couleurs déjà dans le dessin** : sous la couleur de l'objet, une pastille par couleur utilisée (tous calques). Un clic donne exactement la même couleur à l'objet, ou à tous les objets choisis. Au survol : les objets qui l'utilisent, et le fil si une bobine est choisie.
- **Profil de broderie** (Export › Préparer la broderie) : tissu, stabilisateur et fil, enregistrés dans le dessin, avec le conseil de stabilisateur et de film soluble. **Tout le dessin en auto** remplace « Adapter au tissu ».
- **Ink/Stitch · Auto · Main** sur les réglages calculés (satin : densité, compensation, découpe, sous-couches ; remplissage : densité, compensation, sous-couche) : valeur d'Ink/Stitch, valeur calculée d'après le profil et la forme (largeur des satins), ou la vôtre. Les valeurs auto sont recalculées quand le profil change ; celles réglées à la main ne bougent pas. Règles documentées (tutoriel sous-couches d'Ink/Stitch, Wilcom, Hatch, guides de numérisation) et décrites dans le code.
- **Glisser plusieurs objets d'un coup** dans la liste : toute la sélection suit, dans son ordre.
- **Glisser entre deux calques** : sur le bord haut de l'en-tête d'un calque, « Nouveau calque ici » ; les objets vont dans un calque à eux (« Citrouille · avant Etoile 3 »), placé entre les deux. Pour broder une partie d'un calque avant ou après un autre sans mélanger les calques.
- Un objet glissé dans un autre calque **garde sa place à l'écran**, même si ce calque est décalé ou tourné (avant, il bougeait).
- **ⓘ sur tous les réglages**, y compris « Plus de réglages » : notre conseil pour les principaux, sinon la description d'Ink/Stitch en français, avec le lien vers sa documentation.
- **Appliqué** : son propre bloc dans la fiche d'une forme remplie (avant, un bouton perdu parmi les outils), avec la largeur de la bordure et un ⓘ qui explique les deux arrêts et renvoie au tutoriel d'Ink/Stitch.
- **Conseils ⓘ** à côté des réglages importants (densité, compensation, découpe, sous-couches, points courts, angle, longueur de point, coupe, arrêt…) : la bonne pratique en deux phrases et le lien vers la page de la documentation d'Ink/Stitch en français.
- **Satin** : compensation en % de la largeur et **Points courts dans les courbes** remontés en haut de la fiche. **Vérifier avant d'exporter** signale un satin de plus de 8 mm de large (« Découper à 7 mm »).
- **Bouton Synchroniser** : plus de « ✓ Synchronisé » vert trompeur (le panneau ne voit pas ce qu'on fait dans Inkscape). Il est orange quand des réglages attendent, discret sinon, et bleu quand on revient d'Inkscape : « De retour d'Inkscape ? Synchronisez pour reprendre vos changements. »
- **Bouton de couleur rond**, comme les pastilles des couleurs du dessin.
- **Choisir les semblables** (à côté des favoris) : tous les objets du même point (ex. tous les points droits triples), ou du même point et des mêmes réglages, choisis d'un coup pour les régler ou les glisser ensemble.
- **Départ et fin de l'aiguille** (remplissages) : « Placer », puis un clic dans l'aperçu ; le repère d'Ink/Stitch y est posé (▶ vert, ■ rouge dans l'aperçu, symbole relié à la forme dans Inkscape) et l'aiguille part ou finit au bord le plus proche. « Automatique » le retire (Ink/Stitch choisit de nouveau). Vérifié : premier et dernier point exactement aux endroits cliqués.
- **Carte de densité** : légende en bas de l'aperçu avec les seuils réglables (nombre de points dans un rayon en mm, pour le rouge et le jaune), retenus d'un dessin à l'autre ; ↺ revient à ceux d'Ink/Stitch.
- **Tout désélectionner** : bouton dans l'en-tête de la liste (visible quand un objet est choisi), aussi avec Échap ou un clic dans le vide de l'aperçu. Avant, le panneau rechoisissait aussitôt le premier objet.
- **Liste limitée à la sélection d'Inkscape** : si des objets étaient sélectionnés dans Inkscape au ⌘⌥B, un bandeau le dit (« Sélection d'Inkscape : 1 objet sur 42 ») avec un bouton **Tout le dessin**. Avant, la liste se réduisait sans explication.
- Les symboles et connecteurs des commandes d'Ink/Stitch (origine, départ, fin…) n'apparaissent plus comme des objets dans la liste.
- **Mes réglages favoris** : enregistrer un jeu de réglages sous un nom, le réappliquer sur n'importe quel dessin.
- **Remplissage en satin** : choisissez une forme remplie et ses traverses (petits traits qui la coupent d'un bord à l'autre, ⌘-clic) ; le bouton apparaît en premier dans les outils, options en français. Sans traverse, le panneau prévient au lieu de laisser Ink/Stitch ouvrir une fenêtre d'erreur en anglais. Une forme à la fois remplie et contourée est acceptée (le contour est ignoré, sans l'avertissement d'Ink/Stitch). Les outils avec options agissent sur les objets choisis dans le panneau, et les formes créées par Ink/Stitch reçoivent un identifiant (réglables aussitôt).
- **Appliqué** (outil d'un remplissage) : placement, fixation et bordure satin, séparés par des arrêts machine.
- **Découpe des longs points** et autres réglages vides : bouton **Activer** (plus de case à cocher) ; une fois activé, la flèche ↺ le désactive.

**Simulation**
- **Bâti dans la couleur de la première forme brodée** : pas de changement de fil entre le bâti et le motif. Il suit si cette couleur ou l'ordre change dans le panneau (orange seulement si le dessin est vide).
- **Point suivant / précédent** : un clic avance ou recule d'un point ; **appui maintenu**, les points défilent en continu (de plus en plus vite) et s'arrêtent au relâchement.
- **Position du motif** dans le cadre : centré (comme la machine le fait) ou selon sa place sur la feuille (origine Ink/Stitch au centre de la feuille).

**Export**
- **Vérifier avant d'exporter** : le dépistage d'Ink/Stitch traduit (satin mal formé, bordure qui se croise…), sauts longs sans coupe, densité excessive, objets minuscules, motif hors du cadre. **Montrer** et **Corriger** pour chaque point.
- **Préparer la broderie** : adapter tout le dessin au tissu ; **regrouper les couleurs** (le gain en changements de fil est affiché avant) ; couper les sauts plus longs qu'un seuil.
- **Relier les sauts courts** (Préparer) : entre deux formes de même couleur, un point droit « Liaison » remplace les sauts de moins de N mm (outil « Saut en trait » d'Ink/Stitch) : moins de coupes et de nœuds ; coupes et arrêts voulus respectés.
- **Fiche machine** en français : aperçu, fils et bobines dans l'ordre, longueur de fil par couleur, cadre, bâti, durée ; à imprimer ou enregistrer en PDF.
- **Ouvrir un fichier machine** (.pes, .dst…) : converti par Ink/Stitch en dessin, enregistré à côté sans rien écraser, ouvert dans Inkscape, avec ses statistiques.

## 1.6.3 — 26 octobre 2026

- **Tout voir** (bouton et double-clic dans l'aperçu) cadre seulement ce qui est brodé et affiché, pas toute la feuille d'Inkscape. Un calque masqué (œil fermé) n'est donc pas pris en compte. Dans la Simulation, le cadre de la brodeuse est compris dans le cadrage quand il est affiché. Vérifié : feuille 120 × 120 mm → cadrage sur le motif (80 × 91) ; calque Cœur masqué → cadrage sur la tige seule.

 — 26 octobre 2026

- **Calques** : un clic n'importe où sur la ligne d'un calque (nom, triangle, espace autour) le **replie ou le déplie**, sans toucher à la sélection en cours. Un clic à côté du triangle n'efface donc plus ce qu'on avait choisi ailleurs.
- **Aperçu des Objets toujours en points** : plus de choix Points / Réaliste au-dessus de l'aperçu. Le rendu réaliste est seulement dans l'onglet Simulation.
- **Simulation : deux modes, Animation et Réaliste.** Le mode Points fixe est retiré : la **vue en points** de l'Animation montre la même chose, avec la lecture en plus. La carte de densité reste dans l'aperçu des Objets.
- Barre de la simulation : **Vue en points · Tout voir · Suivre l'aiguille · Règle**, côte à côte. La **règle** de la simulation mesure en mm d'une piqûre à l'autre, sans déplacer la vue. Vérifié : 2,76 mm, 4,00 mm et 9,01 mm, exactement les valeurs calculées.
- Pour choisir tous les objets d'un calque : le petit bouton **« Tout »**, qui apparaît au survol de sa ligne (⌘-clic : les ajouter à la sélection). Le ⌘-clic et le Maj-clic sur les objets marchent comme avant.

 — 26 octobre 2026

- **Calques repliables** : on peut maintenant replier aussi le calque qui contient la sélection. Replié, son en-tête affiche une pastille bleue « 1 choisi » (ou « 2 choisis »…) à la place du nombre d'objets, et une barre bleue à gauche : on sait où se trouve l'objet en cours de réglage.
- Nombre d'objets au singulier quand il n'y en a qu'un (« 1 objet »).
- **Zoom** : l'aperçu des Objets et la Simulation gardent chacun leur zoom ; passer de l'un à l'autre ne dézoome plus.
- **Simulation (Animation)** : trois boutons en plus. **Vue en points** dessine le fil fin et chaque piqûre de l'aiguille, la lecture restant possible. **Suivre l'aiguille** garde la vue zoomée et centrée sur l'aiguille pendant la lecture. **Tout voir** recentre le dessin.
- **Aperçu des Objets** : bouton **Tout voir** (recentrer le dessin) et **Règle**. On tire un trait entre deux points, la distance s'affiche en mm, et la règle s'accroche à la piqûre d'aiguille la plus proche pour mesurer d'un point à l'autre. Vérifié : 4,00 mm entre deux piqûres d'un remplissage, 9,00 mm pour un point de satin, exactement les valeurs calculées.

 — 26 octobre 2026

**Onglet Objets**
- **Punaise** sur la carte « Calques et objets » : épinglée (par défaut), la colonne a deux zones séparées. La liste reste en place, et seuls les réglages en dessous défilent à la molette, sans rien qui passe derrière la liste. On passe ainsi d'un objet ou d'un calque à l'autre sans remonter. Un clic sur la punaise la libère.
- **Hauteur de la liste réglable** : une poignée sous la liste se tire vers le bas ou le haut (double-clic : hauteur par défaut). La hauteur est retenue.
- **Calques repliables** : un clic sur ▸ / ▾ replie ou déplie un calque. Le calque de l'objet choisi reste déplié, et le choix est retenu.

**Simulation** : troisième mode **Points**, entre Animation et Réaliste. Il montre tous les points d'un coup, comme l'aperçu des Objets (sauts, coupes, densité, pénétrations), dans le cadre, avec le zoom.

**Correction : réglages vides dans Ink/Stitch**
- Certains réglages n'ont pas de valeur par défaut dans Ink/Stitch (vide = désactivé ou automatique). Le panneau affichait pourtant une valeur qu'il n'appliquait pas. Exemple : la découpe des longs points d'une colonne satin affichait 3 mm, alors qu'aucune découpe n'était faite tant qu'on ne bougeait pas le curseur.
- Ces réglages apparaissent maintenant grisés, marqués « non » ou « auto », avec une case **Activer** qui applique vraiment la valeur proposée. Concernés : découpe des longs points (satin et trait), angle d'un clone, écart minimal d'un trait ondulé.
- Pour un satin, le réglage s'appelle désormais « Découpe des longs points (longueur max.) ». Vérifié sur une bordure satin : sans découpe, le plus long point mesure 9 mm ; après « Activer » (3 mm), il mesure 4,1 mm.

 — 25 octobre 2026

**Onglet Simulation** (remplace Points et Aperçu)
- Trois onglets au lieu de quatre : Objets, Simulation, Export. L'aperçu des réglages reste en haut de l'onglet Objets.
- Simulation : **Animation** (le simulateur) ou **Réaliste** (le rendu du fil), sur la page blanche, avec zoom à la molette et déplacement à la souris dans les deux modes.
- Le **cadre** choisi est dessiné en pointillés autour du motif, centré comme la machine le brodera. Bouton pour le masquer dans l'animation.
- À droite : cartes **Cadre** (choix, ajout, vérification, centrage, feuille d'Inkscape), **Bâti** et statistiques. En fenêtre étroite, elles passent sous la simulation.
- L'onglet Export rappelle le cadre choisi et s'il contient le motif.

**Bâti** (nouveau)
- Faufilage autour du motif, brodé en premier : point droit sans points d'arrêt (il s'enlève facilement), couleur à part (la machine s'arrête pour le fil de bâti), coupé à la fin.
- Trois curseurs : écart avec le motif (2 à 40 mm), longueur de point (2 à 10 mm), arrondi des angles (0 à 30 mm).
- Le panneau signale si le bâti sort du cadre. C'est à l'opératrice ou à l'opérateur de vérifier que tout rentre.

**Figer en points** (Objets › Plus d'outils, nouveau)
- Le trajet réel de l'aiguille, calculé par Ink/Stitch (« Prévisualisation du plan de broderie », mode Plan de broderie), devient des tracés en point manuel. Chaque nœud est un point, à retoucher dans Inkscape : dentelle autoportante (FSL), point mal placé…
- Le résultat est placé juste après l'original, au même rang de couture. Les sauts restent des sauts, et les coupes et arrêts de l'original sont gardés.
- L'original est masqué (œil fermé), pas supprimé : rouvrez son œil pour revenir en arrière.
- Vérifié : un remplissage de 534 points donne 534 points identiques (0,01 mm d'écart au plus).

**Correction : couleur d'un objet** (onglet Objets). Faire glisser un curseur du sélecteur de couleur du Mac (luminosité…) pouvait faire planter Safari. Le panneau redessinait la fiche à chaque mouvement et le sélecteur perdait son champ. Maintenant, seule la pastille change pendant le réglage, et la couleur est envoyée une fois, après une courte pause (40 mouvements : 1 seul envoi, vérifié).

**Cadres** : la taille ne s'affiche plus deux fois dans la liste (« 100 × 100 mm » au lieu de « 100 × 100 — 100 × 100 mm »).

 — 25 octobre 2026

- **Cadre → feuille d'Inkscape** : choisir un cadre dans la liste (par exemple 140 × 140) donne sa taille à la feuille d'Inkscape à la prochaine synchronisation, sans déplacer le motif. Le bouton Synchroniser passe à l'orange. Il faut que la case « Montrer le cadre dans Inkscape » soit cochée ; la cocher applique aussi le cadre choisi. « Centrer le motif dans le cadre » reste là pour centrer.

 — 25 octobre 2026

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
