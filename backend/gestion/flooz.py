"""
Alias d'import pour le module de paiement Flooz.
Permet d'importer directement depuis `gestion.flooz` ou `gestion.services.flooz`.
"""
from .services.flooz import (
    formater_numero_togo,
    est_numero_flooz_valide,
    initier_paiement_flooz,
    confirmer_paiement_flooz
)

__all__ = [
    'formater_numero_togo',
    'est_numero_flooz_valide',
    'initier_paiement_flooz',
    'confirmer_paiement_flooz'
]
