# Historique des versions

Le numéro de version suit le schéma `MAJEUR.MINEUR.CORRECTIF` :
- **MAJEUR** : changement incompatible (format des réglages, installation) ;
- **MINEUR** : nouvelle fonction ;
- **CORRECTIF** : correction sans nouvelle fonction.

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
