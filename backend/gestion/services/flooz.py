"""
Module d'intégration du paiement mobile Flooz (Moov Africa - Togo).

Ce module gère :
1. Le mode SIMULATION (par défaut pour le développement et la démonstration)
2. Le mode PRODUCTION (prévu pour être branché sur l'API officielle Moov Africa Flooz
   dès que la convention et les identifiants marchands sont délivrés par Moov Africa Togo).

Informations d'intégration officielle Moov Africa Flooz :
---------------------------------------------------------
- Pour obtenir des identifiants marchands officiels, l'entreprise doit souscrire
  auprès de Moov Africa Togo (Direction Commerciale Entreprises & B2B) un contrat marchand Flooz.
- Moov Africa fournit ensuite :
    * Un identifiant marchand (Merchant ID, ex: 99XXXXXX ou code marchand à 6 chiffres)
    * Une clé API / Secret Key pour l'authentification et le hachage HMAC-SHA256
    * L'URL de la passerelle de paiement Flooz (Push USSD *155#)
    * L'URL de notification asynchrone (Callback / Webhook IPN)
"""

import uuid
import re
from datetime import datetime
from django.conf import settings
from django.utils import timezone


def formater_numero_togo(telephone):
    """
    Normalise et nettoie le numéro de téléphone au format togolais (8 chiffres ou avec indicatif +228).
    Exemples acceptés : "99 12 34 56", "+22899123456", "0022899123456", "99123456"
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


def est_numero_flooz_valide(telephone):
    """
    Vérifie si le numéro correspond à la plage d'attribution Moov Africa Togo (Flooz).
    Numéros Moov Africa : 8 chiffres commençant généralement par 94, 95, 96, 97, 98, 99.
    """
    numero = formater_numero_togo(telephone)
    if not re.match(r'^\d{8}$', numero):
        return False, "Le numéro doit comporter 8 chiffres (hors indicatif +228)."

    prefixes_moov = ('94', '95', '96', '97', '98', '99')
    if not any(numero.startswith(prefix) for prefix in prefixes_moov):
        return True, "Note : Ce préfixe n'est pas un préfixe Moov Africa habituel (94, 95, 96, 97, 98, 99), mais il sera accepté pour le test."

    return True, "Numéro Moov Africa Flooz valide."


def initier_paiement_flooz(boutique, telephone, montant=5000):
    """
    Initie une demande de paiement Flooz de 5000 FCFA.

    En mode SIMULATION :
    - Génère une référence de transaction unique préfixée FL-
    - Simule l'envoi d'un push USSD (*155#) vers le téléphone Moov Africa du client

    En mode PRODUCTION :
    - Fait un appel HTTP POST vers l'endpoint officiel de la passerelle Moov Africa Flooz
    """
    numero_propre = formater_numero_togo(telephone)
    est_valide, message_validation = est_numero_flooz_valide(numero_propre)

    if not est_valide:
        return {
            'succes': False,
            'erreur': message_validation,
            'reference': None
        }

    # Générer une référence unique Flooz pour le suivi
    timestamp_str = datetime.now().strftime('%Y%m%d%H%M%S')
    random_code = uuid.uuid4().hex[:6].upper()
    reference = f"FL-{timestamp_str}-{random_code}"

    mode = getattr(settings, 'FLOOZ_ENV', 'simulation')

    if mode == 'production':
        # =====================================================================
        # ÉTAPE PRODUCTION : INTÉGRATION API MOOV AFRICA TOGO (FLOOZ)
        # =====================================================================
        # Lorsque la convention marchande Moov Africa Togo est conclue :
        # 1. Préparer les en-têtes d'authentification et signature HMAC :
        #    headers = {
        #        "Content-Type": "application/json",
        #        "Authorization": f"Bearer {settings.FLOOZ_API_KEY}",
        #        "X-Merchant-Code": settings.FLOOZ_MERCHANT_CODE
        #    }
        # 2. Préparer la charge utile (Push USSD *155#) :
        #    payload = {
        #        "merchant_id": settings.FLOOZ_MERCHANT_ID,
        #        "msisdn": f"228{numero_propre}",
        #        "amount": montant,
        #        "currency": "XOF",
        #        "reference": reference,
        #        "description": f"Abonnement BoutiqueStock - {boutique.nom}",
        #        "return_url": "https://votre-domaine.com/api/abonnement/webhook-flooz/"
        #    }
        # 3. Effectuer la requête vers la passerelle sécurisée Moov Africa :
        #    response = requests.post(settings.FLOOZ_API_URL, json=payload, headers=headers, timeout=30)
        #    data = response.json()
        # 4. Vérifier la réponse de l'API Moov (PENDING_CUSTOMER_APPROVAL)
        # =====================================================================
        return {
            'succes': False,
            'erreur': "Mode production configuré mais les identifiants marchands Moov Africa Flooz sont en attente de convention contractuelle.",
            'reference': reference
        }
    else:
        # Mode SIMULATION réaliste
        message_ussd = (
            f"[SIMULATION FLOOZ - MOOV AFRICA] Un message Push USSD (*155#) a été envoyé au +228 {numero_propre}. "
            f"Montant : {montant} FCFA. "
            f"Le client valide sur son téléphone en saisissant son code PIN secret Flooz."
        )
        return {
            'succes': True,
            'mode': 'simulation',
            'methode': 'Flooz',
            'reference': reference,
            'telephone': f"+228 {numero_propre}",
            'montant': montant,
            'message': message_ussd,
            'instructions': "Cliquez sur 'Confirmer le paiement' pour simuler la validation instantanée par le gérant via le menu Flooz."
        }


def confirmer_paiement_flooz(reference, code_otp=None):
    """
    Confirme la transaction Flooz et valide le débit de 5000 FCFA.

    En mode SIMULATION :
    - Valide immédiatement le paiement sans débit réel
    
    En mode PRODUCTION :
    - Interroge l'API Moov Africa Flooz pour vérifier la validation du push USSD (SUCCESS / FAILED)
    """
    mode = getattr(settings, 'FLOOZ_ENV', 'simulation')

    if mode == 'production':
        # En production, vérifier auprès de l'API de réconciliation Moov Africa :
        # response = requests.get(f"{settings.FLOOZ_API_URL}/status/{reference}", headers=headers)
        # if response.json().get('status') == 'SUCCESS': ...
        return {
            'succes': False,
            'erreur': "Vérification production non disponible sans passerelle marchande Moov Africa Flooz."
        }
    else:
        # Simulation réussie
        return {
            'succes': True,
            'mode': 'simulation',
            'methode': 'Flooz',
            'reference': reference,
            'statut': 'PAYE',
            'date_paiement': timezone.now().isoformat(),
            'message': "Paiement Flooz validé avec succès (5 000 FCFA). Abonnement actif pour 3 mois (90 jours)."
        }
