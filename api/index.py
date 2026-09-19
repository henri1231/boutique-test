import os
import sys

# Ajoute le dossier backend au chemin Python
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from backend.wsgi import application
app = application
