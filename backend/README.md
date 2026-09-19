# Backend Django — BoutiqueStock Togo

Application backend Django REST Framework pour la gestion de stock d'une boutique au Togo (Afrique de l'Ouest).

## Fonctionnalités Principales
- **Authentification JWT** : `/api/auth/inscription/`, `/api/auth/connexion/`, `/api/auth/profil/`
- **Multi-boutique** : Données isolées par boutique avec rôles Gérant et Vendeur
- **Gestion de Stock & Alertes** :
  - CRUD Produits sur `/api/produits/`
  - Approvisionnement : `POST /api/produits/{id}/achat/`
  - Vente : `POST /api/produits/{id}/vente/` (décrémentation, contrôle stock disponible, création automatique d'une Notification si le stock restant $\le$ seuil d'alerte configuré, 2 par défaut)
- **Abonnement TMoney (5 000 FCFA / 3 mois)** :
  - Statut : `GET /api/abonnement/statut/`
  - Demande de paiement mobile TMoney Togo : `POST /api/abonnement/payer/`
  - Confirmation du paiement : `POST /api/abonnement/confirmer/`
  - Simulation expiration pour tests : `POST /api/abonnement/simuler-expiration/`
  - **Blocage HTTP 402** : Permission DRF `EstAbonnementActif` bloquant les opérations de stock si l'abonnement est inactif ou expiré
- **Notifications de rupture** : `/api/notifications/` et `/api/notifications/{id}/lu/`
- **Tâche planifiée / Cron** : `python manage.py verifier_alertes_stock` pour relancer les rappels chaque matin
- **Données de démonstration** : `python manage.py creer_donnees_demo`

---

## Installation et Démarrage Local

### 1. Activer l'environnement virtuel Python
```bash
# À la racine du projet
source venv/bin/activate
```

### 2. Installer les dépendances
```bash
pip install -r backend/requirements.txt
```

### 3. Appliquer les migrations
```bash
python backend/manage.py migrate
```

### 4. Charger les données de test (optionnel mais recommandé)
```bash
python backend/manage.py creer_donnees_demo
```
*Identifiants créés par défaut :*
- Gérant : `gerant` / `passer123`
- Vendeur : `vendeur` / `passer123`

### 5. Lancer le serveur Django
```bash
python backend/manage.py runserver 8000
```
L'API sera accessible sur `http://localhost:8000/api/` et l'administration Django sur `http://localhost:8000/admin/`.

---

## Exécution des Tests Automatisés
```bash
python backend/manage.py test gestion
```

## Tâche Cron Quotidienne (Vérification matinale des stocks)
Ajoutez cette ligne dans votre crontab (`crontab -e`) pour lancer la vérification chaque matin à 07h00 :
```cron
0 7 * * * /chemin/vers/venv/bin/python /chemin/vers/backend/manage.py verifier_alertes_stock
```
