# BoutiqueStock Togo — Application Complète de Gestion de Stock & TMoney

Solution complète de gestion commerciale conçue pour les gérants de boutiques en Afrique de l'Ouest (Togo).
Elle combine un backend **Django REST Framework** robuste et un frontend **React (Vite) PWA** ultra-réactif utilisable sur mobile et ordinateur.

---

## 🌟 Points Forts & Règles Métier Implémentées

1. **Gestion de Stock & Mouvements** :
   - Catalogue multi-rayons (Alimentation, Hygiène, Boissons, Quincaillerie...).
   - Approvisionnement (`+ Achat`) avec suivi du coût fournisseur et incrémentation immédiate du stock.
   - Encaissement comptoir (`− Vente`) avec décrémentation instantanée et blocage si stock insuffisant.
2. **Alerte Automatique de Rupture Proche (Seuil = 2)** :
   - Dès qu'un produit atteint son seuil (réglable par article, **2 unités par défaut**), une étiquette rouge **"Rupture proche"** s'affiche immédiatement.
   - Une notification en base de données est créée automatiquement lors de la vente.
   - Une commande quotidienne (`python manage.py verifier_alertes_stock`) réanalyse les stocks chaque matin (compatible crontab).
3. **Abonnement TMoney (5 000 FCFA / 3 mois) & Blocage HTTP 402** :
   - Modèle économique : 5 000 FCFA pour 90 jours d'accès actif.
   - Module `tmoney.py` : simulation réaliste des flux Push USSD Togocom (*145#) avec documentation claire pour brancher la passerelle marchande Togocom officielle.
   - Permission DRF `EstAbonnementActif` : si l'abonnement expire, toute tentative de modification de stock est **bloquée par le backend avec le code HTTP 402 Payment Required**.
   - Déblocage automatique en un clic dès confirmation du paiement TMoney.
4. **PWA Mobile-First & Desktop** :
   - Application installable sur smartphone (Android / iOS) via `manifest.json` et `sw.js`.
   - Interface commerçante soignée (palette Vert Émeraude, Or chaud et alertes Corail).

---

## 🚀 Démarrage Rapide en Local

### Étape 1 : Lancer le Backend Django

Ouvrez un premier terminal :
```bash
# Se placer à la racine
cd "/home/cygnus/Documents/boutique test"

# Activer l'environnement virtuel
source venv/bin/activate

# Appliquer les migrations de base de données (SQLite)
python backend/manage.py migrate

# Initialiser les données de démonstration de la boutique de Lomé
python backend/manage.py creer_donnees_demo

# Démarrer le serveur API Django
python backend/manage.py runserver 8000
```
> Le backend est accessible sur : `http://localhost:8000/api/`  
> L'administration Django est sur : `http://localhost:8000/admin/`

---

### Étape 2 : Lancer le Frontend React (Vite)

Ouvrez un second terminal :
```bash
cd "/home/cygnus/Documents/boutique test/frontend"

# Lancer le serveur Vite
npm run dev
```
> Le frontend est accessible sur : `http://localhost:5173/`

---

## 🔑 Identifiants de Test (Données de démonstration)

La commande `creer_donnees_demo` configure immédiatement une boutique togolaise avec catalogue complet :

| Rôle | Nom d'utilisateur | Mot de passe | Boutique associée |
| :--- | :--- | :--- | :--- |
| **Gérant** | `gerant` | `passer123` | *Boutique Le Progrès Lomé* |
| **Vendeur** | `vendeur` | `passer123` | *Boutique Le Progrès Lomé* |

*(Un bouton de pré-remplissage en 1 clic est également disponible directement sur la page de connexion).*

---

## 🧪 Scénarios de Test des Règles Métier

### 1. Tester l'alerte automatique de rupture proche ($\le 2$ unités)
1. Connectez-vous avec `gerant` / `passer123`.
2. Sur la page **Stock**, observez les articles déjà au seuil critique (*Savon Noir*, *Sucre en morceaux*) marqués du badge rouge **"Rupture proche"**.
3. Cliquez sur le bouton **"Vente (−)"** d'un produit ayant 3 ou 4 unités (ex: *Tomate Concentrée*).
4. Effectuez une vente pour faire descendre son stock à 2 unités.
5. Observez l'alerte instantanée à l'écran et la nouvelle notification dans l'onglet **Alertes** (icône cloche).

### 2. Tester le blocage HTTP 402 et le renouvellement TMoney
1. Rendez-vous dans l'onglet **Abonnement**.
2. Dans la section *"Zone de Test Métier"*, cliquez sur **"Simuler l'expiration immédiate (Déclencher le blocage 402)"**.
3. Retournez sur la page **Stock** et tentez d'effectuer une vente ou d'ajouter un produit :
   - Le backend renvoie immédiatement une erreur **HTTP 402 Payment Required**.
   - Le bandeau d'avertissement rouge s'affiche invitant à renouveler l'abonnement.
4. Retournez dans **Abonnement**, saisissez votre numéro togolais (ex: `90 12 34 56`), cliquez sur **"Initier le paiement TMoney"**, puis confirmez la transaction dans la fenêtre de simulation.
5. Toutes les fonctionnalités de gestion de stock sont immédiatement réactivées (200 OK) !

### 3. Exécuter la suite de tests automatisés backend
```bash
python backend/manage.py test gestion
```
*8 tests unitaires & d'intégration vérifient l'ensemble de la logique métier (authentification JWT, achats, ventes, alertes de rupture, blocage 402, paiement TMoney et commande quotidienne de vérification).*

### 4. Tester la commande cron quotidienne
```bash
python backend/manage.py verifier_alertes_stock
```
Génère les rappels quotidiens de réapprovisionnement pour tous les articles sous seuil.

---

## 📁 Architecture du Projet

```
boutique test/
├── backend/                  # Projet Django REST Framework
│   ├── backend/              # Configuration (settings, urls, wsgi, asgi)
│   ├── gestion/              # Application métier principale
│   │   ├── models.py         # Modèles : Boutique, Utilisateur, Produit, Achat, Vente, Abonnement, Notification
│   │   ├── tmoney.py         # Module de paiement Mobile Money TMoney Togo (Simulation & Prod)
│   │   ├── permissions.py    # Permission EstAbonnementActif (Code HTTP 402)
│   │   ├── serializers.py    # Sérialiseurs DRF
│   │   ├── views.py          # Endpoints API (Auth, CRUD Stock, TMoney, Stats)
│   │   ├── urls.py           # Routes API (/api/...)
│   │   ├── tests.py          # Tests automatisés
│   │   └── management/       # Commandes Django (creer_donnees_demo, verifier_alertes_stock)
│   ├── requirements.txt      # Dépendances Python
│   └── README.md             # Guide backend détaillé
│
├── frontend/                 # Application React (Vite + PWA)
│   ├── public/
│   │   ├── manifest.json     # Manifest PWA (installable mobile)
│   │   └── sw.js             # Service worker de mise en cache
│   ├── src/
│   │   ├── components/       # Navbar, AbonnementBanner, ModalAchat, ModalVente, ModalProduit
│   │   ├── context/          # AuthContext (session JWT, statut abonnement, intercepteur 402)
│   │   ├── pages/            # StockPage, NotificationsPage, AbonnementPage, HistoriquePage, AuthPage
│   │   ├── services/         # Client API centralisé (fetch avec token Bearer et gestion 402)
│   │   ├── index.css         # Design system commerce ouest-africain (vert émeraude, or chaud)
│   │   ├── App.jsx           # Routes et protection
│   │   └── main.jsx          # Point d'entrée avec PWA
│   ├── package.json          # Dépendances npm
│   └── README.md             # Guide frontend détaillé
│
└── README.md                 # Documentation globale
```
