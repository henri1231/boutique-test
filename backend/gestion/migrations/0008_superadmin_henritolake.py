from django.db import migrations
from django.contrib.auth.hashers import make_password


def create_or_update_superadmin(apps, schema_editor):
    Utilisateur = apps.get_model('gestion', 'Utilisateur')

    email = "henritolake228@gmail.com"
    raw_password = "Imenes73"
    username = "henritolake228@gmail.com"

    # Recherche si l'utilisateur existe déjà par email ou username
    user = Utilisateur.objects.filter(email__iexact=email).first()
    if not user:
        user = Utilisateur.objects.filter(username__iexact="henritolake228").first()
    if not user:
        user = Utilisateur.objects.filter(username__iexact=username).first()

    if user:
        user.username = username
        user.email = email
        user.role = 'super_admin'
        user.boutique = None
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.password = make_password(raw_password)
        user.save()
    else:
        Utilisateur.objects.create(
            username=username,
            email=email,
            password=make_password(raw_password),
            role='super_admin',
            boutique=None,
            is_staff=True,
            is_superuser=True,
            is_active=True,
            first_name="Henri",
            last_name="Tolake"
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('gestion', '0007_messageboutique'),
    ]

    operations = [
        migrations.RunPython(create_or_update_superadmin, noop),
    ]
