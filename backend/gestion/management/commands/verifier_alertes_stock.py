"""
Commande Django pour la vérification matinale des stocks sous le seuil d'alerte.
Peut être programmée via crontab (ex: chaque matin à 07h00) :
0 7 * * * /chemin/vers/venv/bin/python /chemin/vers/backend/manage.py verifier_alertes_stock
"""

from django.core.management.base import BaseCommand
from django.db.models import F
from django.utils import timezone
from datetime import timedelta
from gestion.models import Produit, Notification


class Command(BaseCommand):
    help = "Vérifie les produits sous le seuil d'alerte et génère des notifications de rappel pour les boutiques."

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Créer une nouvelle notification même si une alerte récente non lue existe déjà.',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        maintenant = timezone.now()
        hier = maintenant - timedelta(hours=24)

        self.stdout.write(self.style.NOTICE("🔍 Démarrage de la vérification quotidienne des stocks sous seuil..."))

        produits_en_rupture = Produit.objects.filter(quantite_stock__lte=F('seuil_alerte')).select_related('boutique')
        total_trouves = produits_en_rupture.count()
        total_crees = 0

        self.stdout.write(f"📊 {total_trouves} produit(s) actuellement sous ou au seuil d'alerte.")

        for produit in produits_en_rupture:
            # Vérifier si une notification pour ce produit a déjà été créée dans les dernières 24h
            if not force:
                deja_notifie = Notification.objects.filter(
                    boutique=produit.boutique,
                    produit=produit,
                    type='rupture_stock',
                    date__gte=hier,
                    lu=False
                ).exists()

                if deja_notifie:
                    continue

            # Créer la notification de rappel
            message = (
                f"🚨 [Rappel Stock] Le produit '{produit.nom}' n'a plus que "
                f"{produit.quantite_stock} unité(s) en stock (seuil d'alerte: {produit.seuil_alerte}). "
                f"Réapprovisionnement recommandé rapidement !"
            )

            Notification.objects.create(
                boutique=produit.boutique,
                produit=produit,
                type='rupture_stock',
                message=message
            )
            total_crees += 1
            self.stdout.write(self.style.WARNING(f"  -> Alerte créée pour '{produit.nom}' ({produit.boutique.nom})"))

        self.stdout.write(self.style.SUCCESS(
            f"✅ Vérification terminée avec succès : {total_crees} nouvelle(s) notification(s) de rappel générée(s)."
        ))
