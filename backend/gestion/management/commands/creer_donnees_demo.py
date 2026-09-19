"""
Commande pour initialiser la base de données avec des données de démonstration réalistes
pour une boutique togolaise (Lomé).
Usage : python manage.py creer_donnees_demo
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from gestion.models import Boutique, Utilisateur, Produit, Achat, Vente, Abonnement, Notification


class Command(BaseCommand):
    help = "Initialise des données de test réalistes pour la boutique (Lomé, Togo)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("🌱 Création des données de démonstration..."))

        # 1. Créer la Boutique
        boutique, _ = Boutique.objects.get_or_create(
            nom="Boutique Le Progrès Lomé",
            defaults={
                'adresse': "Avenue de la Libération, Quartier Déckon, Lomé, Togo",
                'telephone': "+228 90 12 34 56"
            }
        )

        # 2. Créer l'Utilisateur Gérant
        gerant, created_gerant = Utilisateur.objects.get_or_create(
            username="gerant",
            defaults={
                'first_name': "Koffi",
                'last_name': "Mensah",
                'email': "koffi.mensah@boutique.tg",
                'boutique': boutique,
                'role': 'gerant',
                'telephone': "+228 90 12 34 56",
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created_gerant:
            gerant.set_password("passer123")
            gerant.save()

        # Créer l'Utilisateur Employé
        employe, created_employe = Utilisateur.objects.get_or_create(
            username="employe",
            defaults={
                'first_name': "Afi",
                'last_name': "Dossou",
                'email': "afi.dossou@boutique.tg",
                'boutique': boutique,
                'role': 'employe',
                'telephone': "+228 91 78 90 12"
            }
        )
        if created_employe:
            employe.set_password("passer123")
            employe.save()
        else:
            employe.role = 'employe'
            employe.save()

        # Conserver vendeur pour compatibilité
        vendeur, _ = Utilisateur.objects.get_or_create(
            username="vendeur",
            defaults={
                'first_name': "Afi",
                'last_name': "Dossou",
                'email': "afi.dossou@boutique.tg",
                'boutique': boutique,
                'role': 'employe',
                'telephone': "+228 91 78 90 12"
            }
        )
        vendeur.set_password("passer123")
        vendeur.role = 'employe'
        vendeur.save()


        # 3. Créer un Abonnement TMoney Actif (90 jours)
        maintenant = timezone.now()
        Abonnement.objects.get_or_create(
            boutique=boutique,
            reference_paiement="TM-DEMO-2026-OK",
            defaults={
                'montant': Decimal('5000.00'),
                'methode': "TMoney",
                'telephone_paiement': "+228 90 12 34 56",
                'date_debut': maintenant - timedelta(days=10),
                'date_fin': maintenant + timedelta(days=80),
                'statut': 'actif'
            }
        )

        # 4. Créer les Produits
        produits_data = [
            {
                'nom': "Riz Parfumé Jasmin 5kg",
                'categorie': "Alimentation",
                'prix_achat': Decimal('3200'),
                'prix_vente': Decimal('4000'),
                'quantite_stock': 15,
                'seuil_alerte': 3
            },
            {
                'nom': "Huile Raffinée Mayor 1L",
                'categorie': "Alimentation",
                'prix_achat': Decimal('1100'),
                'prix_vente': Decimal('1400'),
                'quantite_stock': 18,
                'seuil_alerte': 4
            },
            {
                'nom': "Lait Concentré Sucré Bonnet Rouge 397g",
                'categorie': "Alimentation",
                'prix_achat': Decimal('550'),
                'prix_vente': Decimal('750'),
                'quantite_stock': 8,
                'seuil_alerte': 2
            },
            {
                'nom': "Savon Traditionnel Noir Togo",
                'categorie': "Hygiène & Soins",
                'prix_achat': Decimal('400'),
                'prix_vente': Decimal('600'),
                'quantite_stock': 2,  # <= seuil -> Rupture proche !
                'seuil_alerte': 2
            },
            {
                'nom': "Sucre en morceaux Béghin Say 1kg",
                'categorie': "Alimentation",
                'prix_achat': Decimal('850'),
                'prix_vente': Decimal('1100'),
                'quantite_stock': 1,  # <= seuil -> Rupture proche !
                'seuil_alerte': 2
            },
            {
                'nom': "Piles Alcalines AA Energizer (Paquet de 4)",
                'categorie': "Quincaillerie & Divers",
                'prix_achat': Decimal('1200'),
                'prix_vente': Decimal('1800'),
                'quantite_stock': 10,
                'seuil_alerte': 3
            },
            {
                'nom': "Tomate Concentrée Gino 70g (Carton 50 sachets)",
                'categorie': "Alimentation",
                'prix_achat': Decimal('4500'),
                'prix_vente': Decimal('5500'),
                'quantite_stock': 4,
                'seuil_alerte': 2
            }
        ]

        for p_info in produits_data:
            produit, created = Produit.objects.get_or_create(
                boutique=boutique,
                nom=p_info['nom'],
                defaults=p_info
            )

            # Si stock <= seuil, générer une notification d'alerte si pas déjà présente
            if produit.quantite_stock <= produit.seuil_alerte:
                if not Notification.objects.filter(boutique=boutique, produit=produit, type='rupture_stock').exists():
                    Notification.objects.create(
                        boutique=boutique,
                        produit=produit,
                        type='rupture_stock',
                        message=f"⚠️ Alerte Rupture Proche : Le produit '{produit.nom}' n'a plus que {produit.quantite_stock} unité(s) en stock (seuil: {produit.seuil_alerte}).",
                        lu=False
                    )


        # 5. Créer quelques achats et ventes pour l'historique
        p_riz = Produit.objects.filter(boutique=boutique, nom__startswith="Riz").first()
        if p_riz and not Achat.objects.filter(produit=p_riz).exists():
            Achat.objects.create(
                produit=p_riz,
                quantite=20,
                prix_unitaire=Decimal('3200'),
                fournisseur="Grossiste Grand Marché Lomé",
            )
            Vente.objects.create(
                produit=p_riz,
                quantite=5,
                prix_unitaire=Decimal('4000'),
                utilisateur=vendeur
            )

        self.stdout.write(self.style.SUCCESS("✅ Données de démonstration générées avec succès !"))
        self.stdout.write(self.style.SUCCESS("👉 Compte gérant : username='gerant' / password='passer123'"))
        self.stdout.write(self.style.SUCCESS("👉 Compte employé : username='employe' / password='passer123'"))
        self.stdout.write(self.style.SUCCESS("👉 Boutique : 'Boutique Le Progrès Lomé'"))

