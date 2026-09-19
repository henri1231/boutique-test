from io import BytesIO
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.core.management import call_command
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from decimal import Decimal
from rest_framework_simplejwt.tokens import RefreshToken

from gestion.models import Boutique, Utilisateur, Produit, Achat, Vente, Abonnement, Notification, JournalActionSuperAdmin, MessageBoutique


class BoutiqueStockTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Boutique et gérant avec compte actif
        self.boutique = Boutique.objects.create(
            nom="Boutique Test Lomé",
            adresse="Quartier Bè, Lomé",
            telephone="+228 90 00 11 22",
            compte_actif=True
        )
        self.gerant = Utilisateur.objects.create_user(
            username="gerant_test",
            password="secretpassword",
            boutique=self.boutique,
            role="gerant"
        )

        maintenant = timezone.now()
        self.abonnement = Abonnement.objects.create(
            boutique=self.boutique,
            montant=5000,
            methode="TMoney",
            reference_paiement="TM-TEST-001",
            telephone_paiement="+228 90 00 11 22",
            date_debut=maintenant - timedelta(days=1),
            date_fin=maintenant + timedelta(days=89),
            statut="actif"
        )

        # Authentifier le client avec le token JWT
        resp_login = self.client.post('/api/auth/connexion/', {
            'username': 'gerant_test',
            'password': 'secretpassword'
        })
        self.token = resp_login.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

        # Produit de test
        self.produit = Produit.objects.create(
            boutique=self.boutique,
            nom="Savon Citron Test",
            categorie="Hygiène",
            prix_achat=Decimal('300'),
            prix_vente=Decimal('500'),
            quantite_stock=5,
            seuil_alerte=2
        )

    def test_inscription_et_auth(self):
        """Tester l'inscription d'une nouvelle boutique (créée en attente d'activation)"""
        client_anonyme = APIClient()
        data = {
            'nom_boutique': 'Superette Tokoin',
            'adresse_boutique': 'Tokoin Habitat, Lomé',
            'telephone_boutique': '+228 92 34 56 78',
            'username': 'nouveau_gerant',
            'password': 'motdepassefort123',
            'role': 'gerant',
        }
        response = client_anonyme.post('/api/auth/inscription/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('en_attente_activation'))
        boutique_creee = Boutique.objects.get(nom='Superette Tokoin')
        self.assertFalse(boutique_creee.compte_actif)

    def test_liste_produits(self):
        """Tester la récupération des produits de la boutique connectée"""
        response = self.client.get('/api/produits/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Handle paginated or unpaginated response
        results = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['nom'], "Savon Citron Test")

    def test_achat_incremente_stock(self):
        """Tester qu'un achat augmente le stock et crée l'enregistrement Achat"""
        response = self.client.post(f'/api/produits/{self.produit.id}/achat/', {
            'quantite': 10,
            'prix_unitaire': 350,
            'fournisseur': 'Grossiste Lomé'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.produit.refresh_from_db()
        self.assertEqual(self.produit.quantite_stock, 15)  # 5 initial + 10
        self.assertTrue(Achat.objects.filter(produit=self.produit, quantite=10).exists())

    def test_vente_decremente_stock_et_declenche_alerte_rupture(self):
        """
        Tester qu'une vente décrémente le stock et déclenche automatiquement une alerte
        de rupture si le stock restant <= seuil (2).
        Stock initial = 5. Vente de 3 unités -> Stock restant = 2 (seuil = 2) -> Alerte !
        """
        response = self.client.post(f'/api/produits/{self.produit.id}/vente/', {
            'quantite': 3,
            'prix_unitaire': 500
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.produit.refresh_from_db()
        self.assertEqual(self.produit.quantite_stock, 2)
        self.assertTrue(self.produit.est_en_rupture_proche)
        self.assertTrue(response.data.get('alerte_rupture'))

        # Vérifier qu'une notification de type rupture_stock a bien été générée
        notif = Notification.objects.filter(
            boutique=self.boutique,
            produit=self.produit,
            type='rupture_stock'
        ).first()
        self.assertIsNotNone(notif)
        self.assertIn("Alerte Rupture Proche", notif.message)
        self.assertFalse(notif.lu)

    def test_vente_refusee_si_stock_insuffisant(self):
        """Tester qu'une vente supérieure au stock disponible est refusée (HTTP 400)"""
        response = self.client.post(f'/api/produits/{self.produit.id}/vente/', {
            'quantite': 100,  # stock disponible: 5
            'prix_unitaire': 500
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Stock insuffisant", response.data['erreur'])

    def test_blocage_si_boutique_inactive_ou_en_attente(self):
        """
        Tester le respect de la règle d'activation :
        Si compte_actif=False (en attente d'activation ou désactivée),
        l'accès aux opérations de stock est bloqué en 403 PermissionDenied.
        """
        self.boutique.compte_actif = False
        self.boutique.save()

        # Accès aux produits bloqué
        response_produits = self.client.get('/api/produits/')
        self.assertEqual(response_produits.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("attente d'activation", str(response_produits.data.get('detail', '')))

        # Vente bloquée
        response_vente = self.client.post(f'/api/produits/{self.produit.id}/vente/', {'quantite': 1})
        self.assertEqual(response_vente.status_code, status.HTTP_403_FORBIDDEN)

    def test_activation_debloque_acces_sans_paiement(self):
        """
        Tester que dès l'activation par l'administrateur,
        l'accès est directement disponible sans paiement TMoney/Flooz ni erreur 402.
        """
        self.boutique.compte_actif = True
        self.boutique.save()

        resp_produits = self.client.get('/api/produits/')
        self.assertEqual(resp_produits.status_code, status.HTTP_200_OK)

    def test_commande_management_verifier_alertes_stock(self):
        """Tester l'exécution de la commande de management verifier_alertes_stock"""
        # Mettre le produit en dessous du seuil
        self.produit.quantite_stock = 1  # seuil = 2
        self.produit.save()
        Notification.objects.all().delete()

        call_command('verifier_alertes_stock')

        notifs = Notification.objects.filter(produit=self.produit, type='rupture_stock')
        self.assertEqual(notifs.count(), 1)

    def test_employe_permissions_et_restrictions_403(self):
        """
        Tester les restrictions strictes pour le rôle employé :
        - PEUT : consulter le stock, enregistrer achats (+) et ventes (−)
        - NE PEUT PAS : créer, modifier, supprimer un produit (HTTP 403)
        - NE PEUT PAS : accéder aux endpoints de paiement/abonnement (HTTP 403)
        """
        employe = Utilisateur.objects.create_user(
            username="employe_test",
            password="secretpassword",
            boutique=self.boutique,
            role="employe"
        )
        client_employe = APIClient()
        resp_login = client_employe.post('/api/auth/connexion/', {
            'username': 'employe_test',
            'password': 'secretpassword'
        })
        token_employe = resp_login.data['access']
        client_employe.credentials(HTTP_AUTHORIZATION=f'Bearer {token_employe}')

        # 1. PEUT consulter la liste des produits (200)
        res_list = client_employe.get('/api/produits/')
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)

        # 2. PEUT enregistrer un achat (+ stock) (201)
        res_achat = client_employe.post(f'/api/produits/{self.produit.id}/achat/', {
            'quantite': 5,
            'prix_unitaire': 300
        })
        self.assertEqual(res_achat.status_code, status.HTTP_201_CREATED)

        # 3. PEUT enregistrer une vente (− stock) (201)
        res_vente = client_employe.post(f'/api/produits/{self.produit.id}/vente/', {
            'quantite': 2,
            'prix_unitaire': 500
        })
        self.assertEqual(res_vente.status_code, status.HTTP_201_CREATED)
        self.assertIn('recu', res_vente.data)

        # 4. NE PEUT PAS créer de produit (403)
        res_create = client_employe.post('/api/produits/', {
            'nom': 'Nouveau Produit Interdit',
            'prix_achat': 1000,
            'prix_vente': 1500,
            'quantite_stock': 10
        })
        self.assertEqual(res_create.status_code, status.HTTP_403_FORBIDDEN)

        # 5. NE PEUT PAS modifier un produit (403)
        res_update = client_employe.put(f'/api/produits/{self.produit.id}/', {
            'nom': 'Savon Modifié Interdit',
            'prix_achat': 400,
            'prix_vente': 600,
            'quantite_stock': 10
        })
        self.assertEqual(res_update.status_code, status.HTTP_403_FORBIDDEN)

        # 6. NE PEUT PAS supprimer un produit (403)
        res_del = client_employe.delete(f'/api/produits/{self.produit.id}/')
        self.assertEqual(res_del.status_code, status.HTTP_403_FORBIDDEN)

        # 7. NE PEUT PAS accéder à l'abonnement (403)
        res_abo_statut = client_employe.get('/api/abonnement/statut/')
        self.assertEqual(res_abo_statut.status_code, status.HTTP_403_FORBIDDEN)

        res_abo_payer = client_employe.post('/api/abonnement/payer/', {'telephone': '90123456'})
        self.assertEqual(res_abo_payer.status_code, status.HTTP_403_FORBIDDEN)

    def test_gerant_gestion_employes(self):
        """Tester que le gérant peut créer et lister des employés rattachés à sa boutique"""
        # Créer un employé
        resp = self.client.post('/api/auth/employes/', {
            'username': 'caissier_junior',
            'email': 'caissier@boutique.tg',
            'password': 'motdepassefort123',
            'nom_complet': 'Jean Caissier',
            'telephone': '+228 92 00 11 22'
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        
        employe_cree = Utilisateur.objects.filter(username='caissier_junior').first()
        self.assertIsNotNone(employe_cree)
        self.assertEqual(employe_cree.role, 'employe')
        self.assertEqual(employe_cree.boutique, self.boutique)

        # Lister les employés
        resp_list = self.client.get('/api/auth/employes/')
        self.assertEqual(resp_list.status_code, status.HTTP_200_OK)
        self.assertTrue(any(e['username'] == 'caissier_junior' for e in resp_list.data))

    def test_endpoint_recu_vente(self):
        """Tester la récupération d'un reçu formaté pour une vente via /api/ventes/{id}/recu/"""
        # Effectuer une vente
        resp_vente = self.client.post(f'/api/produits/{self.produit.id}/vente/', {
            'quantite': 2,
            'prix_unitaire': 500
        })
        self.assertEqual(resp_vente.status_code, status.HTTP_201_CREATED)
        vente_id = resp_vente.data['vente']['id']

        # Consulter le reçu
        resp_recu = self.client.get(f'/api/ventes/{vente_id}/recu/')
        self.assertEqual(resp_recu.status_code, status.HTTP_200_OK)
        recu = resp_recu.data

        self.assertIn('numero_recu', recu)
        self.assertEqual(recu['produit_nom'], self.produit.nom)
        self.assertEqual(recu['quantite'], 2)
        self.assertEqual(recu['boutique']['nom'], self.boutique.nom)
        self.assertIn('date_formatee', recu)
        self.assertEqual(recu['vendeur_nom'], "gerant_test")


class SuperAdminTests(TestCase):
    def setUp(self):
        from django.core.management import call_command
        from gestion.models import JournalActionSuperAdmin

        # Créer une boutique et un gérant
        self.boutique = Boutique.objects.create(
            nom="Boutique Alpha Lomé",
            adresse="Boulevard Circulaire, Lomé",
            telephone="+228 90 99 88 77",
            compte_actif=True
        )
        self.gerant = Utilisateur.objects.create_user(
            username="gerant_alpha",
            email="gerant@alpha.tg",
            password="passer123gerant",
            boutique=self.boutique,
            role="gerant"
        )
        Abonnement.objects.create(
            boutique=self.boutique,
            montant=5000,
            methode='TMoney',
            reference_paiement='TMONEY-TEST-ALPHA',
            date_debut=timezone.now(),
            date_fin=timezone.now() + timedelta(days=90),
            statut='actif'
        )

        # Créer un super-admin
        self.superadmin = Utilisateur.objects.create_superuser(
            username="super_patron",
            email="patron@plateforme.tg",
            password="superpassword123",
            role="super_admin",
            boutique=None
        )

        self.client_admin = APIClient()
        resp_login = self.client_admin.post('/api/admin-plateforme/connexion/', {
            'username': 'super_patron',
            'password': 'superpassword123'
        })
        self.assertEqual(resp_login.status_code, status.HTTP_200_OK)
        self.token_admin = resp_login.data['access']
        self.client_admin.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_admin}')

    def test_createsuperadmin_command(self):
        """Tester l'exécution de la commande createsuperadmin sans prompt"""
        from django.core.management import call_command
        call_command(
            'createsuperadmin',
            username='nouveau_super',
            email='nouveau@plateforme.tg',
            password='strongpass123',
            noinput=True
        )
        created = Utilisateur.objects.filter(username='nouveau_super').first()
        self.assertIsNotNone(created)
        self.assertEqual(created.role, 'super_admin')
        self.assertIsNone(created.boutique)
        self.assertTrue(created.is_superuser)

    def test_admin_connexion_restriction(self):
        """Tester que seul le rôle super_admin peut se connecter sur /api/admin-plateforme/connexion/"""
        client = APIClient()
        # Un gérant tente de se connecter sur l'espace super-admin
        resp = client.post('/api/admin-plateforme/connexion/', {
            'username': 'gerant_alpha',
            'password': 'passer123gerant'
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Accès refusé", resp.data['erreur'])

    def test_super_admin_dashboard_statistiques_et_liste(self):
        """Tester les endpoints de statistiques globales et la liste des boutiques"""
        # Statistiques
        resp_stats = self.client_admin.get('/api/admin-plateforme/statistiques/')
        self.assertEqual(resp_stats.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(resp_stats.data['total_boutiques'], 1)
        self.assertGreaterEqual(resp_stats.data['abonnements_actifs'], 1)

        # Liste des boutiques
        resp_list = self.client_admin.get('/api/admin-plateforme/boutiques/')
        self.assertEqual(resp_list.status_code, status.HTTP_200_OK)
        self.assertTrue(any(b['nom'] == 'Boutique Alpha Lomé' for b in resp_list.data))

        # Détail d'une boutique
        resp_detail = self.client_admin.get(f'/api/admin-plateforme/boutiques/{self.boutique.id}/')
        self.assertEqual(resp_detail.status_code, status.HTTP_200_OK)
        self.assertIn('employes', resp_detail.data)
        self.assertIn('activite_resume', resp_detail.data)

    def test_desactivation_boutique_et_blocage_strict(self):
        """
        Tester l'activation / désactivation d'une boutique :
        Quand compte_actif = False :
        - Blocage immédiat de la connexion (/api/auth/connexion/) avec message clair
        - Blocage immédiat des requêtes avec jetons existants (HTTP 403)
        """
        from gestion.models import JournalActionSuperAdmin

        # 1. Désactiver la boutique via le endpoint Super-Admin
        resp_toggle = self.client_admin.post(
            f'/api/admin-plateforme/boutiques/{self.boutique.id}/toggle-statut/',
            {'motif': 'Suspicion de fraude documentaire'}
        )
        self.assertEqual(resp_toggle.status_code, status.HTTP_200_OK)
        self.assertFalse(resp_toggle.data['compte_actif'])

        self.boutique.refresh_from_db()
        self.assertFalse(self.boutique.compte_actif)

        # Vérifier l'audit log
        log = JournalActionSuperAdmin.objects.filter(action='desactivation_boutique').first()
        self.assertIsNotNone(log)
        self.assertIn("Suspicion de fraude", log.description)

        # 2. Tenter de se connecter avec le gérant de cette boutique
        client_gerant = APIClient()
        resp_login_fail = client_gerant.post('/api/auth/connexion/', {
            'username': 'gerant_alpha',
            'password': 'passer123gerant'
        })
        self.assertEqual(resp_login_fail.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("attente d'activation", str(resp_login_fail.data))

        # 3. Réactiver la boutique
        resp_reactiver = self.client_admin.post(
            f'/api/admin-plateforme/boutiques/{self.boutique.id}/toggle-statut/',
            {'motif': 'Dossier régularisé'}
        )
        self.assertEqual(resp_reactiver.status_code, status.HTTP_200_OK)
        self.assertTrue(resp_reactiver.data['compte_actif'])

        # 4. Connexion à nouveau autorisée
        resp_login_ok = client_gerant.post('/api/auth/connexion/', {
            'username': 'gerant_alpha',
            'password': 'passer123gerant'
        })
        self.assertEqual(resp_login_ok.status_code, status.HTTP_200_OK)

    def test_super_admin_modifier_utilisateur_et_mot_de_passe(self):
        """Tester la modification d'un utilisateur et la réinitialisation de son mot de passe par le super-admin"""
        from gestion.models import JournalActionSuperAdmin

        resp = self.client_admin.put(f'/api/admin-plateforme/utilisateurs/{self.gerant.id}/', {
            'first_name': 'NouveauPrenom',
            'last_name': 'NouveauNom',
            'email': 'nouveau_gerant@alpha.tg',
            'nouveau_mot_de_passe': 'toutnouveaumdp123'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        self.gerant.refresh_from_db()
        self.assertEqual(self.gerant.first_name, 'NouveauPrenom')
        self.assertEqual(self.gerant.email, 'nouveau_gerant@alpha.tg')
        self.assertTrue(self.gerant.check_password('toutnouveaumdp123'))

        # Vérifier que le journal d'action a bien enregistré la modification
        log = JournalActionSuperAdmin.objects.filter(action='modification_utilisateur').first()
        self.assertIsNotNone(log)
        self.assertIn("Mot de passe réinitialisé", log.description)


class FloozEtFinancesTests(TestCase):
    """
    Tests de validation du paiement mobile Flooz (Moov Africa Togo)
    et du tableau de bord financier gérant (/api/finances/resume/).
    """
    def setUp(self):
        self.boutique = Boutique.objects.create(
            nom="Boutique Financière Lomé",
            adresse="Boulevard Circulaire, Lomé",
            telephone="+228 99 11 22 33",
            compte_actif=True
        )
        self.abonnement = Abonnement.objects.create(
            boutique=self.boutique,
            montant=5000,
            methode='TMoney',
            methode_paiement='TMoney',
            statut='actif',
            date_debut=timezone.now(),
            date_fin=timezone.now() + timedelta(days=90)
        )
        self.gerant = Utilisateur.objects.create_user(
            username="gerant_finance",
            password="passer123finance",
            boutique=self.boutique,
            role="gerant"
        )
        self.employe = Utilisateur.objects.create_user(
            username="employe_finance",
            password="passer123finance",
            boutique=self.boutique,
            role="employe"
        )
        self.client_gerant = APIClient()
        self.client_gerant.force_authenticate(user=self.gerant)

        self.client_employe = APIClient()
        self.client_employe.force_authenticate(user=self.employe)

    def test_module_flooz_fonctions(self):
        """Tester les fonctions unitaires du module Flooz"""
        from gestion.services import flooz

        # 1. Validation de numéros Moov
        valide, _ = flooz.est_numero_flooz_valide("99123456")
        self.assertTrue(valide)
        valide_prefix, _ = flooz.est_numero_flooz_valide("+228 96 55 44 33")
        self.assertTrue(valide_prefix)
        court, _ = flooz.est_numero_flooz_valide("99123")
        self.assertFalse(court)

        # 2. Initiation de paiement simulation
        res_init = flooz.initier_paiement_flooz(self.boutique, "99123456", 5000)
        self.assertTrue(res_init['succes'])
        self.assertTrue(res_init['reference'].startswith('FL-'))
        self.assertEqual(res_init['methode'], 'Flooz')

        # 3. Confirmation simulation
        res_conf = flooz.confirmer_paiement_flooz(res_init['reference'])
        self.assertTrue(res_conf['succes'])
        self.assertEqual(res_conf['statut'], 'PAYE')

    def test_paiement_obsolete_renvoie_message_activation_admin(self):
        """Tester que les anciens endpoints de paiement informent que l'activation est administrative"""
        resp_init = self.client_gerant.post('/api/abonnement/payer/', {
            'telephone': '99123456',
            'methode_paiement': 'Flooz'
        })
        self.assertEqual(resp_init.status_code, status.HTTP_200_OK)
        self.assertIn("administrateur", resp_init.data['message'])

        resp_flooz = self.client_gerant.post('/api/abonnement/payer/flooz/', {
            'telephone': '99556677'
        })
        self.assertEqual(resp_flooz.status_code, status.HTTP_200_OK)
        self.assertIn("administrateur", resp_flooz.data['message'])

    def test_finances_resume_permissions(self):
        """Tester les droits d'accès : réservé au gérant, refusé à l'employé"""
        # Employé -> 403 Forbidden
        resp_emp = self.client_employe.get('/api/finances/resume/')
        self.assertEqual(resp_emp.status_code, status.HTTP_403_FORBIDDEN)

        # Gérant -> 200 OK
        resp_ger = self.client_gerant.get('/api/finances/resume/')
        self.assertEqual(resp_ger.status_code, status.HTTP_200_OK)
        self.assertIn('valeur_stock_achat', resp_ger.data)
        self.assertIn('cout_marchandises_vendues', resp_ger.data)
        self.assertIn('chiffre_affaires', resp_ger.data)
        self.assertIn('benefice', resp_ger.data)

    def test_finances_resume_calculs_mathematiques(self):
        """
        Tester l'exactitude des calculs financiers :
        - valeur_stock_achat
        - chiffre_affaires
        - cout_marchandises_vendues
        - benefice
        """
        # Créer 2 produits
        p1 = Produit.objects.create(
            boutique=self.boutique,
            nom="Huile Végétale 1L",
            prix_achat=Decimal('1000.00'),
            prix_vente=Decimal('1500.00'),
            quantite_stock=10
        )
        p2 = Produit.objects.create(
            boutique=self.boutique,
            nom="Riz Parfumé 5kg",
            prix_achat=Decimal('2000.00'),
            prix_vente=Decimal('3000.00'),
            quantite_stock=5
        )
        # Valeur d'achat stock actuel = (10 * 1000) + (5 * 2000) = 10000 + 10000 = 20000 FCFA

        # Enregistrer des ventes
        # Vente 1: 2 unités de p1 à 1500 FCFA (coût d'achat: 1000 FCFA)
        # CA = 3000 FCFA, Coût = 2000 FCFA, Bénéfice = 1000 FCFA
        Vente.objects.create(
            produit=p1,
            quantite=2,
            prix_unitaire=Decimal('1500.00'),
            prix_achat_unitaire=Decimal('1000.00'),
            utilisateur=self.gerant
        )
        # Vente 2: 1 unité de p2 à 3000 FCFA (coût d'achat: 2000 FCFA)
        # CA = 3000 FCFA, Coût = 2000 FCFA, Bénéfice = 1000 FCFA
        Vente.objects.create(
            produit=p2,
            quantite=1,
            prix_unitaire=Decimal('3000.00'),
            prix_achat_unitaire=Decimal('2000.00'),
            utilisateur=self.gerant
        )
        # Totaux ventes :
        # Chiffre d'affaires = 3000 + 3000 = 6000 FCFA
        # Coût marchandises vendues = 2000 + 2000 = 4000 FCFA
        # Bénéfice = 6000 - 4000 = 2000 FCFA (positif / vert)
        # Taux de marge = (2000 / 6000) * 100 = 33.3%

        resp = self.client_gerant.get('/api/finances/resume/?periode=tout')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data

        self.assertEqual(data['valeur_stock_achat'], 20000.0)
        self.assertEqual(data['chiffre_affaires'], 6000.0)
        self.assertEqual(data['cout_marchandises_vendues'], 4000.0)
        self.assertEqual(data['benefice'], 2000.0)
        self.assertTrue(data['est_beneficiaire'])
        self.assertEqual(data['marge_pourcentage'], 33.3)
        self.assertEqual(data['nb_ventes'], 2)
        self.assertEqual(data['articles_vendus_total'], 3)


class SuperAdminMonCompteTests(APITestCase):
    """Tests pour l'écran Mon Compte du Super-Administrateur"""

    def setUp(self):
        # Créer un super-administrateur
        self.superadmin = Utilisateur.objects.create_user(
            username='superadmin_test',
            email='admin@test.tg',
            password='OldPassword123!',
            role='super_admin'
        )
        refresh_sa = RefreshToken.for_user(self.superadmin)
        self.token_sa = str(refresh_sa.access_token)
        self.client_sa = APIClient()
        self.client_sa.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_sa}')

        # Créer un autre utilisateur pour tester les conflits d'username
        self.autre_user = Utilisateur.objects.create_user(
            username='autre_utilisateur',
            email='autre@test.tg',
            password='Password123!',
            role='gerant'
        )

        # Créer un gérant pour tester les restrictions de permission
        self.client_gerant = APIClient()
        refresh_g = RefreshToken.for_user(self.autre_user)
        self.client_gerant.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh_g.access_token)}')

    def test_acces_interdit_pour_non_superadmin(self):
        """Un utilisateur non-superadmin (ex: gérant) ne peut pas accéder à l'endpoint"""
        resp = self.client_gerant.put('/api/superadmin/mon-compte/', {
            'username': 'nouveau_username'
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_modification_username_succes(self):
        """Le super-administrateur peut modifier son username"""
        resp = self.client_sa.put('/api/superadmin/mon-compte/', {
            'username': 'superadmin_renomme'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.superadmin.refresh_from_db()
        self.assertEqual(self.superadmin.username, 'superadmin_renomme')

        # Vérifier le journal d'audit
        self.assertTrue(JournalActionSuperAdmin.objects.filter(
            utilisateur=self.superadmin,
            action="modification_mon_compte"
        ).exists())

    def test_modification_username_deja_pris(self):
        """Erreur si le username demandé est déjà utilisé par un autre compte"""
        resp = self.client_sa.put('/api/superadmin/mon-compte/', {
            'username': 'autre_utilisateur'
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("déjà utilisé", resp.data.get('erreur', ''))

    def test_changement_mot_de_passe_ancien_incorrect(self):
        """Erreur si l'ancien mot de passe est faux"""
        resp = self.client_sa.put('/api/superadmin/mon-compte/', {
            'ancien_mot_de_passe': 'MauvaisMotDePasse!',
            'nouveau_mot_de_passe': 'NouveauPassword123!',
            'confirmer_mot_de_passe': 'NouveauPassword123!'
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("L'ancien mot de passe est incorrect", resp.data.get('erreur', ''))

    def test_changement_mot_de_passe_confirmation_differente(self):
        """Erreur si la confirmation ne correspond pas au nouveau mot de passe"""
        resp = self.client_sa.put('/api/superadmin/mon-compte/', {
            'ancien_mot_de_passe': 'OldPassword123!',
            'nouveau_mot_de_passe': 'NouveauPassword123!',
            'confirmer_mot_de_passe': 'AutrePassword123!'
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirmation", resp.data.get('erreur', ''))

    def test_changement_mot_de_passe_trop_court(self):
        """Erreur si le nouveau mot de passe est trop court"""
        resp = self.client_sa.put('/api/superadmin/mon-compte/', {
            'ancien_mot_de_passe': 'OldPassword123!',
            'nouveau_mot_de_passe': 'court',
            'confirmer_mot_de_passe': 'court'
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_changement_mot_de_passe_reussi_et_invalidation_anciens_tokens(self):
        """
        Un changement de mot de passe réussi :
        1. Modifie le mot de passe (vérifié avec check_password)
        2. Met à jour date_modification_mdp
        3. Invalide l'ancien token JWT
        4. Permet la connexion avec le nouveau mot de passe
        """
        ancien_token = self.token_sa

        # Effectuer le changement
        resp = self.client_sa.put('/api/superadmin/mon-compte/', {
            'ancien_mot_de_passe': 'OldPassword123!',
            'nouveau_mot_de_passe': 'SuperSecret2026!#',
            'confirmer_mot_de_passe': 'SuperSecret2026!#'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data.get('mot_de_passe_modifie'))

        self.superadmin.refresh_from_db()
        self.assertTrue(self.superadmin.check_password('SuperSecret2026!#'))
        self.assertFalse(self.superadmin.check_password('OldPassword123!'))
        self.assertIsNotNone(self.superadmin.date_modification_mdp)

        # L'ancien token doit maintenant être refusé (401)
        client_ancien_token = APIClient()
        client_ancien_token.credentials(HTTP_AUTHORIZATION=f'Bearer {ancien_token}')
        resp_ancien = client_ancien_token.get('/api/superadmin/mon-compte/')
        self.assertEqual(resp_ancien.status_code, status.HTTP_401_UNAUTHORIZED)

        # Une nouvelle connexion avec le nouveau mot de passe réussit
        resp_login = self.client.post('/api/admin-plateforme/connexion/', {
            'username': self.superadmin.username,
            'password': 'SuperSecret2026!#'
        })
        self.assertEqual(resp_login.status_code, status.HTTP_200_OK)
        nouveau_token = resp_login.data['access']

        # Le nouveau token fonctionne
        client_nouveau = APIClient()
        client_nouveau.credentials(HTTP_AUTHORIZATION=f'Bearer {nouveau_token}')
        resp_nouveau = client_nouveau.get('/api/superadmin/mon-compte/')
        self.assertEqual(resp_nouveau.status_code, status.HTTP_200_OK)


class PhotoProfilTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.boutique = Boutique.objects.create(
            nom="Boutique Photo Lomé",
            adresse="Lomé",
            telephone="+228 90 11 22 33",
            compte_actif=True
        )
        self.gerant = Utilisateur.objects.create_user(
            username="gerant_photo",
            password="password123",
            boutique=self.boutique,
            role="gerant"
        )
        resp = self.client.post('/api/auth/connexion/', {
            'username': 'gerant_photo',
            'password': 'password123'
        })
        self.token = resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def _generer_image(self):
        image = Image.new('RGB', (100, 100), color='green')
        buffer = BytesIO()
        image.save(buffer, format='JPEG')
        buffer.seek(0)
        return SimpleUploadedFile('avatar.jpg', buffer.read(), content_type='image/jpeg')

    def test_upload_photo_profil_et_url(self):
        image = self._generer_image()
        response = self.client.put('/api/auth/profil/', {
            'photo_profil': image,
            'first_name': 'Kossi',
            'last_name': 'Agbé'
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('photo_profil_url', response.data)
        photo_url = response.data['photo_profil_url']
        self.assertIsNotNone(photo_url)
        self.assertIn('avatar', photo_url)
        self.assertIn('/media/profils/', photo_url)

        # Vérifier en base
        self.gerant.refresh_from_db()
        self.assertTrue(bool(self.gerant.photo_profil))
        self.assertEqual(self.gerant.first_name, 'Kossi')

        # Vérifier que la connexion renvoie également la photo
        client_anon = APIClient()
        resp_login = client_anon.post('/api/auth/connexion/', {
            'username': 'gerant_photo',
            'password': 'password123'
        })
        self.assertEqual(resp_login.status_code, status.HTTP_200_OK)
        self.assertIn('photo_profil_url', resp_login.data['utilisateur'])
        self.assertEqual(resp_login.data['utilisateur']['photo_profil_url'], photo_url)

    def test_supprimer_photo_profil(self):
        # Mettre d'abord une photo
        self.gerant.photo_profil = self._generer_image()
        self.gerant.save()
        self.assertTrue(bool(self.gerant.photo_profil))

        # Supprimer la photo via l'API
        response = self.client.put('/api/auth/profil/', {
            'supprimer_photo': 'true'
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data.get('photo_profil_url'))
        self.gerant.refresh_from_db()
        self.assertFalse(bool(self.gerant.photo_profil))


class AdministrateurRoleTests(TestCase):
    def setUp(self):
        self.client_sa = APIClient()
        self.client_admin = APIClient()

        # Deux boutiques
        self.boutique1 = Boutique.objects.create(
            nom="Boutique Tokoin",
            adresse="Tokoin Lomé",
            telephone="+228 90 01 02 03",
            compte_actif=True
        )
        self.boutique2 = Boutique.objects.create(
            nom="Boutique Agoè",
            adresse="Agoè Lomé",
            telephone="+228 90 04 05 06",
            compte_actif=True
        )

        # Super-admin
        self.superadmin = Utilisateur.objects.create_superuser(
            username="super_test",
            password="SuperPassword123!",
            email="super@plateforme.tg",
            role="super_admin"
        )
        resp_sa = self.client_sa.post('/api/admin-plateforme/connexion/', {
            'username': 'super_test',
            'password': 'SuperPassword123!'
        })
        self.token_sa = resp_sa.data['access']
        self.client_sa.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_sa}')

        # Administrateur assigné à boutique1 uniquement
        self.admin_user = Utilisateur.objects.create_user(
            username="admin_koffi",
            password="AdminPassword123!",
            email="admin@plateforme.tg",
            role="administrateur",
            boutique=None
        )
        self.admin_user.boutiques_gerees.set([self.boutique1])

        resp_admin = self.client_admin.post('/api/admin-plateforme/connexion/', {
            'username': 'admin_koffi',
            'password': 'AdminPassword123!'
        })
        self.token_admin = resp_admin.data['access']
        self.client_admin.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_admin}')

    def test_connexion_retourne_attributs_administrateur(self):
        client = APIClient()
        resp = client.post('/api/admin-plateforme/connexion/', {
            'username': 'admin_koffi',
            'password': 'AdminPassword123!'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data.get('est_administrateur'))
        self.assertFalse(resp.data.get('est_super_admin'))
        self.assertEqual(resp.data.get('role'), 'administrateur')

    def test_superadmin_gestion_administrateurs_crud(self):
        # 1. Créer un nouvel administrateur
        resp_create = self.client_sa.post('/api/admin-plateforme/administrateurs/', {
            'username': 'nouvel_admin',
            'password': 'StrongPassword123!',
            'email': 'nouvel@admin.tg',
            'first_name': 'Kokou',
            'last_name': 'Amavi',
            'telephone': '+228 99 88 77 66',
            'boutiques_ids': [self.boutique1.id, self.boutique2.id]
        }, format='json')
        self.assertEqual(resp_create.status_code, status.HTTP_201_CREATED)
        new_admin_id = resp_create.data['id']
        self.assertEqual(resp_create.data['role'], 'administrateur')
        self.assertEqual(len(resp_create.data['boutiques_gerees']), 2)

        # 2. Lister les administrateurs
        resp_list = self.client_sa.get('/api/admin-plateforme/administrateurs/')
        self.assertEqual(resp_list.status_code, status.HTTP_200_OK)
        usernames = [a['username'] for a in resp_list.data]
        self.assertIn('nouvel_admin', usernames)
        self.assertIn('admin_koffi', usernames)

        # 3. Mettre à jour l'assignation des boutiques (seulement boutique2)
        resp_update = self.client_sa.put(f'/api/admin-plateforme/administrateurs/{new_admin_id}/', {
            'username': 'nouvel_admin',
            'first_name': 'Kokou Modifié',
            'boutiques_ids': [self.boutique2.id]
        }, format='json')
        self.assertEqual(resp_update.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_update.data['boutiques_gerees']), 1)
        self.assertEqual(resp_update.data['boutiques_gerees'][0]['id'], self.boutique2.id)

        # 4. Supprimer l'administrateur
        resp_delete = self.client_sa.delete(f'/api/admin-plateforme/administrateurs/{new_admin_id}/')
        self.assertEqual(resp_delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Utilisateur.objects.filter(id=new_admin_id).exists())

    def test_administrateur_ne_peut_pas_acceder_gestion_administrateurs(self):
        # L'administrateur n'a pas accès à /api/admin-plateforme/administrateurs/
        resp_get = self.client_admin.get('/api/admin-plateforme/administrateurs/')
        self.assertEqual(resp_get.status_code, status.HTTP_403_FORBIDDEN)

        resp_post = self.client_admin.post('/api/admin-plateforme/administrateurs/', {
            'username': 'hacker_admin',
            'password': 'Pass12345!'
        })
        self.assertEqual(resp_post.status_code, status.HTTP_403_FORBIDDEN)

    def test_administrateur_ne_voit_que_ses_boutiques_assignees(self):
        resp = self.client_admin.get('/api/admin-plateforme/boutiques/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Handle paginated or unpaginated response
        results = resp.data.get('results', resp.data) if isinstance(resp.data, dict) else resp.data
        ids = [b['id'] for b in results]
        self.assertIn(self.boutique1.id, ids)
        self.assertNotIn(self.boutique2.id, ids)

    def test_administrateur_acces_boutique_non_assignee_renvoie_403(self):
        # Boutique 2 n'est pas assignée à admin_koffi -> 403 Forbidden
        resp_detail = self.client_admin.get(f'/api/admin-plateforme/boutiques/{self.boutique2.id}/')
        self.assertEqual(resp_detail.status_code, status.HTTP_403_FORBIDDEN)

        resp_put = self.client_admin.put(f'/api/admin-plateforme/boutiques/{self.boutique2.id}/', {
            'nom': 'Piratage Nom',
            'adresse': 'Lomé',
            'telephone': '+228 90 00 00 00'
        })
        self.assertEqual(resp_put.status_code, status.HTTP_403_FORBIDDEN)

    def test_administrateur_peut_modifier_boutique_assignee_avec_journal(self):
        # Modification de boutique1 autorisée
        resp_put = self.client_admin.put(f'/api/admin-plateforme/boutiques/{self.boutique1.id}/', {
            'nom': 'Boutique Tokoin Rénovée',
            'adresse': 'Tokoin Nouveau',
            'telephone': '+228 90 01 02 03'
        })
        self.assertEqual(resp_put.status_code, status.HTTP_200_OK)
        self.boutique1.refresh_from_db()
        self.assertEqual(self.boutique1.nom, 'Boutique Tokoin Rénovée')

        # Vérifier l'enregistrement dans le journal avec [Administrateur: admin_koffi]
        journal_entry = JournalActionSuperAdmin.objects.filter(
            utilisateur=self.admin_user,
            action="modification_boutique"
        ).first()
        self.assertIsNotNone(journal_entry)
        self.assertIn("[Administrateur: admin_koffi]", journal_entry.description)

    def test_administrateur_peut_toggle_statut_boutique_assignee(self):
        # L'administrateur peut désactiver/activer sa boutique attribuée
        self.assertTrue(self.boutique1.compte_actif)
        resp = self.client_admin.post(f'/api/admin-plateforme/boutiques/{self.boutique1.id}/toggle-statut/', {
            'motif': 'Suspension temporaire pour inventaire'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.boutique1.refresh_from_db()
        self.assertFalse(self.boutique1.compte_actif)

        # L'administrateur NE peut PAS modifier le statut d'une boutique non attribuée (403)
        resp_unassigned = self.client_admin.post(f'/api/admin-plateforme/boutiques/{self.boutique2.id}/toggle-statut/', {
            'motif': 'Tentative illégale'
        })
        self.assertEqual(resp_unassigned.status_code, status.HTTP_403_FORBIDDEN)

    def test_administrateur_mon_compte_et_invalidation_tokens(self):
        # Consultation de mon compte
        resp = self.client_admin.get('/api/superadmin/mon-compte/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['username'], 'admin_koffi')
        self.assertEqual(resp.data['role'], 'administrateur')

        # Changement de mot de passe
        ancien_token = self.token_admin
        resp_pwd = self.client_admin.put('/api/superadmin/mon-compte/', {
            'ancien_mot_de_passe': 'AdminPassword123!',
            'nouveau_mot_de_passe': 'NouveauAdminPass2026!',
            'confirmer_mot_de_passe': 'NouveauAdminPass2026!'
        })
        self.assertEqual(resp_pwd.status_code, status.HTTP_200_OK)
        self.assertTrue(resp_pwd.data.get('mot_de_passe_modifie'))

        # L'ancien token doit maintenant être 401
        client_ancien = APIClient()
        client_ancien.credentials(HTTP_AUTHORIZATION=f'Bearer {ancien_token}')
        resp_ancien = client_ancien.get('/api/superadmin/mon-compte/')
        self.assertEqual(resp_ancien.status_code, status.HTTP_401_UNAUTHORIZED)

        # Nouvelle connexion avec le nouveau mot de passe réussit
        client_reconnect = APIClient()
        resp_login = client_reconnect.post('/api/admin-plateforme/connexion/', {
            'username': 'admin_koffi',
            'password': 'NouveauAdminPass2026!'
        })
        self.assertEqual(resp_login.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp_login.data)


class MessageBoutiqueCommunicationTests(TestCase):
    def setUp(self):
        # Boutique A
        self.boutique_a = Boutique.objects.create(
            nom="Superette Bè Lomé",
            adresse="Quartier Bè",
            telephone="+228 90 11 22 33",
            compte_actif=True
        )
        self.gerant_a = Utilisateur.objects.create_user(
            username="gerant_a",
            password="Password123!",
            boutique=self.boutique_a,
            role="gerant"
        )
        self.employe_a1 = Utilisateur.objects.create_user(
            username="employe_a1",
            password="Password123!",
            boutique=self.boutique_a,
            role="employe"
        )
        self.employe_a2 = Utilisateur.objects.create_user(
            username="employe_a2",
            password="Password123!",
            boutique=self.boutique_a,
            role="employe"
        )

        # Boutique B
        self.boutique_b = Boutique.objects.create(
            nom="Boutique Hedzranawoe",
            adresse="Lomé",
            telephone="+228 91 22 33 44",
            compte_actif=True
        )
        self.employe_b = Utilisateur.objects.create_user(
            username="employe_b",
            password="Password123!",
            boutique=self.boutique_b,
            role="employe"
        )

        # Clients API
        self.client_gerant_a = APIClient()
        resp_ga = self.client_gerant_a.post('/api/auth/connexion/', {'username': 'gerant_a', 'password': 'Password123!'})
        self.client_gerant_a.credentials(HTTP_AUTHORIZATION=f'Bearer {resp_ga.data["access"]}')

        self.client_employe_a1 = APIClient()
        resp_ea1 = self.client_employe_a1.post('/api/auth/connexion/', {'username': 'employe_a1', 'password': 'Password123!'})
        self.client_employe_a1.credentials(HTTP_AUTHORIZATION=f'Bearer {resp_ea1.data["access"]}')

        self.client_employe_a2 = APIClient()
        resp_ea2 = self.client_employe_a2.post('/api/auth/connexion/', {'username': 'employe_a2', 'password': 'Password123!'})
        self.client_employe_a2.credentials(HTTP_AUTHORIZATION=f'Bearer {resp_ea2.data["access"]}')

        self.client_employe_b = APIClient()
        resp_eb = self.client_employe_b.post('/api/auth/connexion/', {'username': 'employe_b', 'password': 'Password123!'})
        self.client_employe_b.credentials(HTTP_AUTHORIZATION=f'Bearer {resp_eb.data["access"]}')

    def test_gerant_diffuse_consigne_equipe_et_reception(self):
        # Le gérant diffuse une consigne d'équipe
        resp = self.client_gerant_a.post('/api/communication/messages/', {
            'destine_a_tous': True,
            'type_message': 'consigne',
            'titre': 'Arrivage de Stock',
            'contenu': 'Le camion de riz arrive à 14h, veuillez préparer le hangar.'
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        msg_id = resp.data['id']
        self.assertEqual(resp.data['type_message'], 'consigne')
        self.assertEqual(resp.data['titre'], 'Arrivage de Stock')

        # L'employé A1 voit 1 message non lu
        resp_non_lus = self.client_employe_a1.get('/api/communication/messages/non-lus/')
        self.assertEqual(resp_non_lus.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_non_lus.data['non_lus'], 1)

        # L'employé A1 consulte les messages d'équipe
        resp_list = self.client_employe_a1.get('/api/communication/messages/?canal=equipe')
        self.assertEqual(resp_list.status_code, status.HTTP_200_OK)
        results = resp_list.data.get('results', resp_list.data) if isinstance(resp_list.data, dict) else resp_list.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], msg_id)

        # L'employé A1 marque le message comme lu
        resp_lu = self.client_employe_a1.post(f'/api/communication/messages/{msg_id}/marquer-lu/')
        self.assertEqual(resp_lu.status_code, status.HTTP_200_OK)
        self.assertTrue(resp_lu.data['est_lu'])

        # L'employé A1 n'a plus de message non lu
        resp_non_lus2 = self.client_employe_a1.get('/api/communication/messages/non-lus/')
        self.assertEqual(resp_non_lus2.data['non_lus'], 0)

    def test_discussion_directe_privee_gerant_employe(self):
        # L'employé A1 envoie un message privé à son gérant
        resp = self.client_employe_a1.post('/api/communication/messages/', {
            'destine_a_tous': False,
            'destinataire': self.gerant_a.id,
            'contenu': 'Bonjour patron, le client demande une remise sur 10 cartons.'
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        msg_id = resp.data['id']

        # Le gérant consulte son canal direct avec A1
        resp_g = self.client_gerant_a.get(f'/api/communication/messages/?canal=direct&employe_id={self.employe_a1.id}')
        self.assertEqual(resp_g.status_code, status.HTTP_200_OK)
        results_g = resp_g.data.get('results', resp_g.data) if isinstance(resp_g.data, dict) else resp_g.data
        self.assertEqual(len(results_g), 1)
        self.assertEqual(results_g[0]['id'], msg_id)

        # L'employé A2 ne doit PAS voir ce message privé (confidentialité)
        resp_a2 = self.client_employe_a2.get(f'/api/communication/messages/?canal=direct&employe_id={self.employe_a1.id}')
        results_a2 = resp_a2.data.get('results', resp_a2.data) if isinstance(resp_a2.data, dict) else resp_a2.data
        self.assertEqual(len(results_a2), 0)

    def test_cloisonnement_inter_boutiques(self):
        # Message dans la boutique A
        self.client_gerant_a.post('/api/communication/messages/', {
            'destine_a_tous': True,
            'contenu': 'Secret interne boutique A'
        })

        # L'employé B (Boutique B) ne voit aucun message
        resp_b = self.client_employe_b.get('/api/communication/messages/')
        results_b = resp_b.data.get('results', resp_b.data) if isinstance(resp_b.data, dict) else resp_b.data
        self.assertEqual(len(results_b), 0)

        # L'employé B ne peut pas envoyer de message à un employé de la boutique A (403)
        resp_cross = self.client_employe_b.post('/api/communication/messages/', {
            'destinataire': self.employe_a1.id,
            'contenu': 'Message intrusif'
        })
        self.assertEqual(resp_cross.status_code, status.HTTP_403_FORBIDDEN)

    def test_suppression_messages_droits(self):
        # A1 poste un message
        resp = self.client_employe_a1.post('/api/communication/messages/', {
            'destine_a_tous': True,
            'contenu': 'Message de test à supprimer'
        })
        msg_id = resp.data['id']

        # A2 tente de supprimer le message de A1 -> 403
        resp_del_a2 = self.client_employe_a2.delete(f'/api/communication/messages/{msg_id}/')
        self.assertEqual(resp_del_a2.status_code, status.HTTP_403_FORBIDDEN)

        # Le gérant a le droit de supprimer n'importe quel message de sa boutique
        resp_del_g = self.client_gerant_a.delete(f'/api/communication/messages/{msg_id}/')
        self.assertEqual(resp_del_g.status_code, status.HTTP_204_NO_CONTENT)


class ActivationBoutiqueParAdminTests(TestCase):
    """
    Tests de validation du cycle d'activation administrative :
    1. Inscription d'une boutique -> compte_actif=False (en attente d'activation).
    2. Connexion du gérant bloquée tant que la boutique n'est pas activée (AuthenticationFailed).
    3. Activation de la boutique par l'administrateur ou super-administrateur (toggle-statut).
    4. Connexion du gérant débloquée et gestion complète des stocks sans demande de paiement TMoney/Flooz ni 402.
    5. Statut de la boutique (/api/abonnement/statut/) confirme l'activation permanente.
    """
    def setUp(self):
        self.client_anonyme = APIClient()
        self.client_admin = APIClient()
        self.client_gerant = APIClient()

        # Super-administrateur
        self.superadmin = Utilisateur.objects.create_superuser(
            username="super_activation",
            password="SuperPass123!",
            email="super@plateforme.tg",
            role="super_admin"
        )
        resp_sa = self.client_admin.post('/api/admin-plateforme/connexion/', {
            'username': 'super_activation',
            'password': 'SuperPass123!'
        })
        self.admin_token = resp_sa.data['access']
        self.client_admin.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')

    def test_cycle_complet_inscription_attente_et_activation_admin(self):
        # 1. Inscription d'une nouvelle boutique par un futur gérant
        data_inscription = {
            'nom_boutique': "Boutique du Peuple Lomé",
            'adresse_boutique': "Boulevard du 13 Janvier, Lomé",
            'telephone_boutique': "+228 90 88 77 66",
            'username': "gerant_peuple",
            'password': "PassSecurise123!",
            'nom_complet': "Edoh Messan",
            'role': "gerant"
        }
        resp_insc = self.client_anonyme.post('/api/auth/inscription/', data_inscription)
        self.assertEqual(resp_insc.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp_insc.data.get('en_attente_activation'))
        self.assertIn("attente d'activation", resp_insc.data['message'])

        # Vérification en base de données : compte_actif est False
        boutique = Boutique.objects.get(nom="Boutique du Peuple Lomé")
        self.assertFalse(boutique.compte_actif)
        self.assertEqual(boutique.abonnements.count(), 0)

        # 2. Tentative de connexion du gérant avant activation administrative -> Bloquée
        resp_login_avant = self.client_gerant.post('/api/auth/connexion/', {
            'username': "gerant_peuple",
            'password': "PassSecurise123!"
        })
        self.assertEqual(resp_login_avant.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("attente d'activation", str(resp_login_avant.data.get('detail', '')))

        # 3. L'administrateur active la boutique via l'API d'administration
        resp_toggle = self.client_admin.post(f'/api/admin-plateforme/boutiques/{boutique.id}/toggle-statut/', {
            'motif': "Vérification effectuée et validée par l'administrateur"
        })
        self.assertEqual(resp_toggle.status_code, status.HTTP_200_OK)
        self.assertTrue(resp_toggle.data['compte_actif'])

        boutique.refresh_from_db()
        self.assertTrue(boutique.compte_actif)

        # Vérification de l'audit log
        log = JournalActionSuperAdmin.objects.filter(boutique_cible=boutique).first()
        self.assertIsNotNone(log)
        self.assertIn("activée", log.description)

        # 4. Connexion du gérant APRÈS activation -> Succès immédiat
        resp_login_apres = self.client_gerant.post('/api/auth/connexion/', {
            'username': "gerant_peuple",
            'password': "PassSecurise123!"
        })
        self.assertEqual(resp_login_apres.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp_login_apres.data)
        token_gerant = resp_login_apres.data['access']
        self.client_gerant.credentials(HTTP_AUTHORIZATION=f'Bearer {token_gerant}')

        # 5. Création d'un produit et opération de stock sans blocage 402 ni paiement requis
        resp_prod = self.client_gerant.post('/api/produits/', {
            'nom': "Sac de Riz 25kg",
            'categorie': "Alimentation",
            'prix_achat': 12000,
            'prix_vente': 14500,
            'quantite_stock': 10,
            'seuil_alerte': 3
        })
        self.assertEqual(resp_prod.status_code, status.HTTP_201_CREATED)
        produit_id = resp_prod.data['id']

        # Enregistrement d'une vente -> Succès (201 OK)
        resp_vente = self.client_gerant.post(f'/api/produits/{produit_id}/vente/', {
            'quantite': 2,
            'prix_unitaire': 14500
        })
        self.assertEqual(resp_vente.status_code, status.HTTP_201_CREATED)

        # 6. Consultation du statut boutique (/api/abonnement/statut/)
        resp_statut = self.client_gerant.get('/api/abonnement/statut/')
        self.assertEqual(resp_statut.status_code, status.HTTP_200_OK)
        self.assertTrue(resp_statut.data['compte_actif'])
        self.assertEqual(resp_statut.data['statut'], 'actif')







