import os
from django.core.management.base import BaseCommand
from gestion.models import Utilisateur


class Command(BaseCommand):
    help = "Initialise automatiquement le compte Super-Administrateur via les variables d'environnement au démarrage."

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default=None,
            help="Adresse email du super-admin (prioritaire sur SUPERADMIN_EMAIL)"
        )
        parser.add_argument(
            '--password',
            type=str,
            default=None,
            help="Mot de passe du super-admin (prioritaire sur SUPERADMIN_PASSWORD)"
        )
        parser.add_argument(
            '--username',
            type=str,
            default=None,
            help="Nom d'utilisateur (prioritaire sur SUPERADMIN_USERNAME)"
        )

    def handle(self, *args, **options):
        email = (options.get('email') or os.environ.get('SUPERADMIN_EMAIL') or '').strip()
        password = (options.get('password') or os.environ.get('SUPERADMIN_PASSWORD') or '').strip()
        username = (options.get('username') or os.environ.get('SUPERADMIN_USERNAME') or '').strip()

        # 1. Vérification de la présence des identifiants requis
        if not email or not password:
            self.stdout.write(
                "Variables SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD non définies, création du super-admin ignorée."
            )
            return

        # 2. Vérifier si un compte avec le rôle 'super_admin' et cet email existe déjà
        if Utilisateur.objects.filter(role='super_admin', email__iexact=email).exists():
            self.stdout.write("Super-admin déjà existant, aucune action nécessaire.")
            return

        # 3. Vérifier si un compte existe déjà avec cet email mais avec un rôle antérieur
        existing_user = Utilisateur.objects.filter(email__iexact=email).first()
        if existing_user:
            existing_user.role = 'super_admin'
            existing_user.boutique = None
            existing_user.is_staff = True
            existing_user.is_superuser = True
            existing_user.set_password(password)
            existing_user.save()
            self.stdout.write(self.style.SUCCESS("Compte super-admin créé avec succès."))
            return

        # 4. Déterminer un nom d'utilisateur unique
        if not username:
            username = email.split('@')[0] if '@' in email else 'superadmin'

        base_username = username
        counter = 1
        while Utilisateur.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1

        # 5. Création du super-administrateur avec mot de passe haché (sécurité)
        user = Utilisateur(
            username=username,
            email=email,
            role='super_admin',
            boutique=None,
            is_staff=True,
            is_superuser=True,
            is_active=True,
            first_name="Super",
            last_name="Admin"
        )
        user.set_password(password)
        user.save()

        self.stdout.write(self.style.SUCCESS("Compte super-admin créé avec succès."))
