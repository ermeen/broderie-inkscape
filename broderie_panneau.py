#!/usr/bin/env python3
"""Broderie pour Inkscape : point d'entrée de l'extension (Extensions › Broderie › Panneau de broderie).

Inkscape appelle ce script avec le dessin courant et la sélection (--id=…). Le panneau
s'ouvre dans le navigateur ; « Appliquer » renvoie le dessin modifié à Inkscape
(annulable avec Cmd+Z), « Annuler » le laisse intact.
"""
import copy
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import inkex  # noqa: E402

from broderie import serveur  # noqa: E402


class PanneauBroderie(inkex.EffectExtension):
    def add_arguments(self, pars):
        pars.add_argument("--port", default="")

    def effect(self):
        ids = list(self.options.ids or [])
        nom = os.path.splitext(os.path.basename(self.svg.get("sodipodi:docname") or "dessin"))[0] or "dessin"
        # le panneau travaille sur une copie : « Annuler » laisse le dessin d'Inkscape intact
        session = serveur.Session(copy.deepcopy(self.document), ids, nom)
        if not serveur.lancer(session, self.options.port or None):
            return
        self.document = session.document
        self.svg = self.document.getroot()


if __name__ == "__main__":
    PanneauBroderie().run()
