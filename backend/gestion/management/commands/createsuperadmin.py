import sys
import getpass
from django.core.management.base import BaseCommand, CommandError
from gestion.models import Utilisateur


class Command(BaseCommand):
    help = "Crée un compte Super-Administrateur de la plateforme (rôle super_admin, sans boutique)."

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help="Nom d'utilisateur du super-admin")
        parser.add_argument('--email', type=str, help="Adresse email du super-admin")
        parser.add_argument('--password', type=str, help="Mot de passe du super-admin")
        parser.add_argument(
            '--noinput', '--no-input',
            action='store_true',
            help="Ne demande pas de saisie interactive en ligne de commande"
        )

    def handle(self, *args, **options):
        username = options.get('username')
        email = options.get('email')
        password = options.get('password')
        noinput = options.get('noinput')

        if not noinput:
            self.stdout.write(self.style.MIGRATE_HEADING("=== Création du Super-Administrateur Plateforme ==="))
            
            if not email:
                email = input("Adresse email du super-admin : ").strip()
            
            if not username:
                default_username = email.split('@')[0] if email and '@' in email else 'superadmin'
                raw_username = input(f"Nom d'utilisateur [{default_username}] : ").strip()
                username = raw_username if raw_username else default_username

            if not password:
                while True:
                    p1 = getpass.getpass("Mot de passe : ")
                    p2 = getpass.getpass("Confirmation du mot de passe : ")
                    if p1 != p2:
                        self.stdout.write(self.style.ERROR("Les mots de passe ne correspondent pas. Réessayez."))
                    elif len(p1) < 6:
                        self.stdout.write(self.style.ERROR("Le mot de passe doit comporter au moins 6 caractères."))
                    else:
                        password = p1
                        break
        else:
            if not email:
                email = "henritolake228@gmail.com"
            if not username:
                username = "henritolake228@gmail.com"
            if not password:
                password = "Imenes73"

        if not email or not username or not password:
            raise CommandError("L'email, le nom d'utilisateur et le mot de passe sont obligatoires.")

        # Vérifier si l'utilisateur existe déjà
        user = Utilisateur.objects.filter(username=username).first() or Utilisateur.objects.filter(email=email).first()

        if user:
            user.username = username
            user.email = email
            user.set_password(password)
            user.role = 'super_admin'
            user.boutique = None
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.SUCCESS(
                f"Compte super-admin existant mis à jour avec succès : '{username}' ({email}) [Rôle: super_admin]"
            ))
        else:
            user = Utilisateur.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                role='super_admin',
                boutique=None,
                first_name="Super",
                last_name="Admin"
            )
            self.stdout.write(self.style.SUCCESS(
                f"Nouveau Super-Administrateur créé avec succès : '{username}' ({email}) [Rôle: super_admin]"
            ))
