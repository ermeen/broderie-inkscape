#!/usr/bin/env python3
"""Broderie pour Inkscape : serveur du panneau (lancé en arrière-plan par l'extension)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from broderie import serveur  # noqa: E402

if __name__ == "__main__":
    serveur.principal()
