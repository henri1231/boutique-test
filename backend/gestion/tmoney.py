"""
Module d'intégration du paiement mobile TMoney (Togocom - Togo).

Ce module gère :
1. Le mode SIMULATION (par défaut pour le développement et la démonstration)
2. Le mode PRODUCTION (prévu pour être branché sur l'API officielle TMoney Marchand
   dès que la convention et les identifiants sont délivrés par Togocom).

Informations d'intégration officielle Togocom TMoney :
------------------------------------------------------
- Pour obtenir des identifiants marchands officiels, l'entreprise doit souscrire
  auprès de Togocom (Direction Entreprises & B2B) un contrat marchand TMoney.
- Togocom fournit ensuite :
    * Un identifiant marchand (Merchant ID / ShortCode, ex: 90XXXXXX)
    * Une clé d'API / Secret Token pour la signature des requêtes
    * L'URL de la passerelle de paiement (Sandbox et Production)
    * Une URL de Callback (Webhook) pour les notifications asynchrones de paiement.
"""

import uuid
import re
from datetime import datetime
from django.conf import settings
from django.utils import timezone


def formater_numero_togo(telephone):
    """
    Normalise et nettoie le numéro de téléphone au format togolais (8 chiffres ou avec indicatif +228).
    Exemples acceptés : "90 12 34 56", "+22890123456", "0022890123456", "90123456"
    """
    if not telephone:
        return ""
    # Supprimer espaces, tirets, parenthèses
    nettoye = re.sub(r'[\s\-\(\)]', '', str(telephone))
    if nettoye.startswith('+228'):
        nettoye = nettoye[4:]
    elif nettoye.startswith('00228'):
        nettoye = nettoye[5:]
    return nettoye


def est_numero_tmoney_valide(telephone):
    """
    Vérifie si le numéro correspond à la plage d'attribution Togocom TMoney au Togo.
    Numéros Togocom : 8 chiffres commençant généralement par 90, 91, 92, 93, 70, 71, 79.
    """
    numero = formater_numero_togo(telephone)
    if not re.match(r'^\d{8}$', numero):
        return False, "Le numéro doit comporter 8 chiffres (hors indicatif +228)."
    
    prefixes_togocom = ('90', '91', '92', '93', '70', '71', '79')
    if not any(numero.startswith(prefix) for prefix in prefixes_togocom):
        return True, "Note : Ce préfixe n'est pas un préfixe Togocom habituel (90, 91, 92, 93, 70, 71, 79), mais il sera accepté pour le test."
    
    return True, "Numéro Togocom TMoney valide."


def initier_paiement_tmoney(boutique, telephone, montant=5000):
    """
    Initie une demande de paiement TMoney de 5000 FCFA.
    
    En mode SIMULATION :
    - Génère une référence de transaction unique
    - Simule l'envoi d'un push USSD vers le téléphone du client
    
    En mode PRODUCTION :
    - Fait un appel HTTP POST vers l'endpoint officiel de l'API Togocom TMoney
    """
    numero_propre = formater_numero_togo(telephone)
    est_valide, message_validation = est_numero_tmoney_valide(numero_propre)
    
    if not est_valide:
        return {
            'succes': False,
            'erreur': message_validation,
            'reference': None
        }

    # Générer une référence unique pour le suivi
    timestamp_str = datetime.now().strftime('%Y%m%d%H%M%S')
    random_code = uuid.uuid4().hex[:6].upper()
    reference = f"TM-{timestamp_str}-{random_code}"

    mode = getattr(settings, 'TMONEY_ENV', 'simulation')

    if mode == 'production':
        # =====================================================================
        # ÉTAPE PRODUCTION : INTÉGRATION API TOGOCOM TMONEY
        # =====================================================================
        # Lorsque les identifiants Togocom sont disponibles :
        # 1. Préparer les en-têtes d'authentification (ex: Authorization: Bearer <token>)
        # 2. Envoyer le payload JSON :
        #    payload = {
        #        "merchant_id": settings.TMONEY_MERCHANT_NUMBER,
        #        "client_phone": f"+228{numero_propre}",
        #        "amount": montant,
        #        "currency": "XOF",
        #        "reference": reference,
        #        "description": f"Abonnement 3 mois BoutiqueStock - {boutique.nom}",
        #        "callback_url": "https://votre-domaine.com/api/abonnement/webhook-tmoney/"
        #    }
        # 3. Effectuer la requête :
        #    response = requests.post(settings.TMONEY_API_URL, json=payload, headers=headers, timeout=30)
        #    data = response.json()
        # 4. Traiter la réponse (Statut PENDING / WAITING_FOR_USER_PIN)
        # =====================================================================
        return {
            'succes': False,
            'erreur': "Mode production configuré mais les identifiants marchands Togocom TMoney sont en attente de validation contractuelle.",
            'reference': reference
        }
    else:
        # Mode SIMULATION réaliste
        message_ussd = (
            f"[SIMULATION TMONEY] Un message Push USSD a été simulé vers le +228 {numero_propre}. "
            f"Montant : {montant} FCFA. "
            f"Le client valide sur son téléphone via son code PIN secret TMoney."
        )
        return {
            'succes': True,
            'mode': 'simulation',
            'reference': reference,
            'telephone': f"+228 {numero_propre}",
            'montant': montant,
            'message': message_ussd,
            'instructions': "Cliquez sur 'Confirmer le paiement' pour simuler la validation instantanée par le gérant."
        }


def confirmer_paiement_tmoney(reference, code_otp=None):
    """
    Confirme la transaction TMoney et valide le débit de 5000 FCFA.
    
    En mode SIMULATION :
    - Valide immédiatement le paiement sans exiger de vrai débit bancaire
    
    En mode PRODUCTION :
    - Interroge l'API Togocom pour vérifier le statut de la transaction (SUCCESS / FAILED)
    """
    mode = getattr(settings, 'TMONEY_ENV', 'simulation')

    if mode == 'production':
        # En production, vérifier auprès de l'API de réconciliation Togocom :
        # response = requests.get(f"{settings.TMONEY_API_URL}/status/{reference}", headers=headers)
        # if response.json().get('status') == 'SUCCESS': ...
        return {
            'succes': False,
            'erreur': "Vérification production non disponible sans passerelle marchande Togocom."
        }
    else:
        # Simulation réussie
        return {
            'succes': True,
            'mode': 'simulation',
            'reference': reference,
            'statut': 'PAYE',
            'date_paiement': timezone.now().isoformat(),
            'message': "Paiement TMoney validé avec succès (5 000 FCFA). Abonnement actif pour 3 mois (90 jours)."
        }
