from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from datetime import timedelta
from .models import Boutique, Utilisateur, Produit, Achat, Vente, Abonnement, Notification, JournalActionSuperAdmin, MessageBoutique


class BoutiqueSerializer(serializers.ModelSerializer):
    statut_abonnement = serializers.SerializerMethodField()

    class Meta:
        model = Boutique
        fields = ['id', 'nom', 'adresse', 'telephone', 'compte_actif', 'date_creation', 'statut_abonnement']

    def get_statut_abonnement(self, obj):
        return obj.statut_abonnement_detail()


class UtilisateurSerializer(serializers.ModelSerializer):
    boutique_detail = BoutiqueSerializer(source='boutique', read_only=True)
    nom_complet = serializers.SerializerMethodField()
    photo_profil_url = serializers.SerializerMethodField()

    # Champs pour la modification du mot de passe
    ancien_mot_de_passe = serializers.CharField(write_only=True, required=False, allow_blank=True)
    nouveau_mot_de_passe = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=6)
    confirmer_mot_de_passe = serializers.CharField(write_only=True, required=False, allow_blank=True)

    # Champs pour la modification des informations de la boutique (pour le gérant)
    boutique_nom = serializers.CharField(write_only=True, required=False, allow_blank=True)
    boutique_adresse = serializers.CharField(write_only=True, required=False, allow_blank=True)
    boutique_telephone = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'nom_complet',
            'role', 'telephone', 'photo_profil', 'photo_profil_url',
            'boutique', 'boutique_detail',
            'ancien_mot_de_passe', 'nouveau_mot_de_passe', 'confirmer_mot_de_passe',
            'boutique_nom', 'boutique_adresse', 'boutique_telephone'
        ]
        read_only_fields = ['id', 'boutique', 'role']
        extra_kwargs = {
            'photo_profil': {'write_only': True, 'required': False}
        }

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username

    def get_photo_profil_url(self, obj):
        if not obj.photo_profil:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.photo_profil.url)
        return obj.photo_profil.url

    def validate_username(self, value):
        if value is not None:
            clean_val = str(value).strip()
            if not clean_val:
                raise serializers.ValidationError("Le nom d'utilisateur ne peut pas être vide.")
            if len(clean_val) < 3:
                raise serializers.ValidationError("Le nom d'utilisateur doit comporter au moins 3 caractères.")
            instance = getattr(self, 'instance', None)
            qs = Utilisateur.objects.filter(username__iexact=clean_val)
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError("Ce nom d'utilisateur est déjà utilisé par un autre compte.")
            return clean_val
        return value

    def update(self, instance, validated_data):
        # 1. Gestion du nom complet (ou first_name / last_name)
        nom_complet = self.initial_data.get('nom_complet')
        if nom_complet is not None:
            parts = str(nom_complet).strip().split(' ', 1)
            instance.first_name = parts[0]
            instance.last_name = parts[1] if len(parts) > 1 else ''

        # 2. Gestion du nom d'utilisateur (username)
        nouveau_username = validated_data.pop('username', None)
        if nouveau_username and nouveau_username.strip() != instance.username:
            clean_username = nouveau_username.strip()
            if Utilisateur.objects.filter(username__iexact=clean_username).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError({'username': "Ce nom d'utilisateur est déjà utilisé par un autre compte."})
            instance.username = clean_username

        # 3. Modification sécurisée du mot de passe
        ancien_mdp = validated_data.pop('ancien_mot_de_passe', None)
        nouveau_mdp = validated_data.pop('nouveau_mot_de_passe', None)
        confirmer_mdp = validated_data.pop('confirmer_mot_de_passe', None)

        if nouveau_mdp or ancien_mdp or confirmer_mdp:
            if not ancien_mdp:
                raise serializers.ValidationError({
                    'ancien_mot_de_passe': "Veuillez saisir votre mot de passe actuel pour valider la modification."
                })
            if not instance.check_password(ancien_mdp):
                raise serializers.ValidationError({
                    'ancien_mot_de_passe': "Le mot de passe actuel est incorrect."
                })
            if not nouveau_mdp or len(nouveau_mdp) < 6:
                raise serializers.ValidationError({
                    'nouveau_mot_de_passe': "Le nouveau mot de passe doit comporter au moins 6 caractères."
                })
            if nouveau_mdp != confirmer_mdp:
                raise serializers.ValidationError({
                    'confirmer_mot_de_passe': "La confirmation ne correspond pas au nouveau mot de passe."
                })
            instance.set_password(nouveau_mdp)
            instance.date_modification_mdp = timezone.now()

        # 4. Modification des informations de la boutique (si gérant)
        boutique_nom = validated_data.pop('boutique_nom', None)
        boutique_adresse = validated_data.pop('boutique_adresse', None)
        boutique_telephone = validated_data.pop('boutique_telephone', None)

        if instance.boutique and (instance.role == 'gerant' or instance.is_superuser):
            b = instance.boutique
            b_updated = False
            if boutique_nom and boutique_nom.strip():
                b.nom = boutique_nom.strip()
                b_updated = True
            if boutique_adresse is not None:
                b.adresse = boutique_adresse.strip()
                b_updated = True
            if boutique_telephone is not None:
                b.telephone = boutique_telephone.strip()
                b_updated = True
            if b_updated:
                b.save()

        # 5. Application des autres champs standards (email, telephone, first_name, last_name, photo_profil)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class InscriptionSerializer(serializers.Serializer):
    # Champs Boutique
    nom_boutique = serializers.CharField(max_length=200)
    adresse_boutique = serializers.CharField(max_length=300, required=False, allow_blank=True, default='')
    telephone_boutique = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    
    # Champs Utilisateur
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=6)
    telephone_utilisateur = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    nom_complet = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    role = serializers.ChoiceField(choices=[('gerant', 'Gérant'), ('vendeur', 'Vendeur')], default='gerant')

    def validate_username(self, value):
        if Utilisateur.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà utilisé.")
        return value

    def create(self, validated_data):
        # 1. Créer la boutique avec compte_actif=False (en attente d'activation par l'administrateur)
        boutique = Boutique.objects.create(
            nom=validated_data['nom_boutique'],
            adresse=validated_data.get('adresse_boutique', ''),
            telephone=validated_data.get('telephone_boutique', ''),
            compte_actif=False
        )

        # 2. Créer l'utilisateur rattaché
        nom_complet = validated_data.get('nom_complet', '')
        first_name = nom_complet.split(' ')[0] if nom_complet else ''
        last_name = ' '.join(nom_complet.split(' ')[1:]) if ' ' in nom_complet else ''

        utilisateur = Utilisateur.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            boutique=boutique,
            role=validated_data.get('role', 'gerant'),
            telephone=validated_data.get('telephone_utilisateur', ''),
            first_name=first_name,
            last_name=last_name
        )

        return utilisateur


class ProduitSerializer(serializers.ModelSerializer):
    est_en_rupture_proche = serializers.BooleanField(read_only=True)
    valeur_stock = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Produit
        fields = [
            'id', 'boutique', 'nom', 'image', 'image_url', 'categorie', 'prix_achat',
            'prix_vente', 'quantite_stock', 'seuil_alerte',
            'est_en_rupture_proche', 'valeur_stock',
            'date_creation', 'date_modification'
        ]
        read_only_fields = ['id', 'boutique', 'date_creation', 'date_modification']

    def get_valeur_stock(self, obj):
        return obj.quantite_stock * obj.prix_achat

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class AchatSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)
    total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Achat
        fields = ['id', 'produit', 'produit_nom', 'quantite', 'prix_unitaire', 'fournisseur', 'total', 'date']
        read_only_fields = ['id', 'total', 'date']


class VenteSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)
    vendeur_nom = serializers.CharField(source='utilisateur.username', read_only=True)
    total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    prix_achat_unitaire = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    cout_achat_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    benefice = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Vente
        fields = [
            'id', 'produit', 'produit_nom', 'quantite', 'prix_unitaire',
            'prix_achat_unitaire', 'cout_achat_total', 'benefice',
            'utilisateur', 'vendeur_nom', 'total', 'date'
        ]
        read_only_fields = ['id', 'prix_achat_unitaire', 'cout_achat_total', 'benefice', 'utilisateur', 'vendeur_nom', 'total', 'date']


class RecuVenteSerializer(serializers.ModelSerializer):
    """
    Format standardisé pour l'affichage et l'impression de ticket de caisse / reçu client.
    """
    numero_recu = serializers.SerializerMethodField()
    boutique = serializers.SerializerMethodField()
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)
    vendeur_nom = serializers.SerializerMethodField()
    date_formatee = serializers.SerializerMethodField()
    total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Vente
        fields = [
            'id', 'numero_recu', 'date', 'date_formatee', 'boutique',
            'produit', 'produit_nom', 'quantite', 'prix_unitaire', 'total',
            'utilisateur', 'vendeur_nom'
        ]

    def get_numero_recu(self, obj):
        date_str = obj.date.strftime('%Y%m%d') if obj.date else '00000000'
        return f"REC-{date_str}-{obj.id:04d}"

    def get_boutique(self, obj):
        b = obj.produit.boutique
        return {
            'nom': b.nom,
            'adresse': b.adresse or 'Lomé, Togo',
            'telephone': b.telephone or ''
        }

    def get_vendeur_nom(self, obj):
        if obj.utilisateur:
            return obj.utilisateur.get_full_name() or obj.utilisateur.username
        return "Vendeur Comptoir"

    def get_date_formatee(self, obj):
        if not obj.date:
            return ''
        return obj.date.strftime('%d/%m/%Y à %H:%M')


class AbonnementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Abonnement
        fields = [
            'id', 'boutique', 'montant', 'methode', 'methode_paiement', 'reference_paiement',
            'telephone_paiement', 'date_debut', 'date_fin', 'statut', 'date_creation'
        ]
        read_only_fields = ['id', 'boutique', 'date_creation']


class NotificationSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)
    produit_stock = serializers.IntegerField(source='produit.quantite_stock', read_only=True)
    produit_seuil = serializers.IntegerField(source='produit.seuil_alerte', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'boutique', 'produit', 'produit_nom', 'produit_stock', 'produit_seuil', 'type', 'message', 'lu', 'date']
        read_only_fields = ['id', 'boutique', 'date']


class EmployeSerializer(serializers.ModelSerializer):
    """
    Lecture des comptes employés rattachés à la boutique.
    """
    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'nom_complet', 'role', 'telephone', 'date_joined']

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username


class EmployeCreateSerializer(serializers.Serializer):
    """
    Création d'un compte employé par le gérant de la boutique.
    """
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=6)
    nom_complet = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    telephone = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')

    def validate_username(self, value):
        if Utilisateur.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        boutique = request.user.boutique

        nom_complet = validated_data.get('nom_complet', '')
        first_name = nom_complet.split(' ')[0] if nom_complet else ''
        last_name = ' '.join(nom_complet.split(' ')[1:]) if ' ' in nom_complet else ''

        employe = Utilisateur.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name,
            telephone=validated_data.get('telephone', ''),
            boutique=boutique,
            role='employe'
        )
        return employe


class AdminUtilisateurListSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()
    photo_profil_url = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'nom_complet',
            'role', 'telephone', 'photo_profil_url', 'is_active', 'date_joined'
        ]

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username

    def get_photo_profil_url(self, obj):
        if not obj.photo_profil:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.photo_profil.url)
        return obj.photo_profil.url


class AdminBoutiqueListSerializer(serializers.ModelSerializer):
    """
    Sérialiseur de la liste des boutiques pour le tableau de bord Super-Admin.
    """
    nb_employes = serializers.SerializerMethodField()
    statut_abonnement = serializers.SerializerMethodField()
    nb_produits = serializers.SerializerMethodField()
    gerant_compte = serializers.SerializerMethodField()

    class Meta:
        model = Boutique
        fields = [
            'id', 'nom', 'adresse', 'telephone', 'compte_actif',
            'date_creation', 'nb_employes', 'statut_abonnement', 'nb_produits',
            'gerant_compte'
        ]

    def get_nb_employes(self, obj):
        return obj.utilisateurs.count()

    def get_statut_abonnement(self, obj):
        return obj.statut_abonnement_detail()

    def get_nb_produits(self, obj):
        return obj.produits.count()

    def get_gerant_compte(self, obj):
        gerant = obj.utilisateurs.filter(role='gerant').first() or obj.utilisateurs.first()
        if not gerant:
            return None
        return {
            'id': gerant.id,
            'username': gerant.username,
            'nom_complet': gerant.get_full_name() or gerant.username,
            'email': gerant.email,
            'telephone': gerant.telephone,
            'role': gerant.role,
            'date_joined': gerant.date_joined,
        }


class AdminBoutiqueDetailSerializer(serializers.ModelSerializer):
    """
    Sérialiseur détaillé d'une boutique pour le Super-Admin et l'Administrateur.
    Inclut les utilisateurs/employés, l'historique des abonnements, et les statistiques d'activité.
    """
    employes = serializers.SerializerMethodField()
    abonnements = serializers.SerializerMethodField()
    activite_resume = serializers.SerializerMethodField()
    statut_abonnement = serializers.SerializerMethodField()
    gerant_compte = serializers.SerializerMethodField()

    class Meta:
        model = Boutique
        fields = [
            'id', 'nom', 'adresse', 'telephone', 'compte_actif', 'date_creation',
            'statut_abonnement', 'employes', 'abonnements', 'activite_resume',
            'gerant_compte'
        ]

    def get_statut_abonnement(self, obj):
        return obj.statut_abonnement_detail()

    def get_gerant_compte(self, obj):
        gerant = obj.utilisateurs.filter(role='gerant').first() or obj.utilisateurs.first()
        if not gerant:
            return None
        return {
            'id': gerant.id,
            'username': gerant.username,
            'nom_complet': gerant.get_full_name() or gerant.username,
            'email': gerant.email,
            'telephone': gerant.telephone,
            'role': gerant.role,
            'date_joined': gerant.date_joined,
        }

    def get_employes(self, obj):
        utilisateurs = obj.utilisateurs.all().order_by('-date_joined')
        return AdminUtilisateurListSerializer(utilisateurs, many=True).data

    def get_abonnements(self, obj):
        abonnements = obj.abonnements.all().order_by('-date_creation')
        return AbonnementSerializer(abonnements, many=True).data

    def get_activite_resume(self, obj):
        maintenant = timezone.now()
        debut_mois = maintenant.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        ventes_mois = Vente.objects.filter(produit__boutique=obj, date__gte=debut_mois)
        total_ventes_mois = sum(v.total for v in ventes_mois)

        return {
            'nb_produits': obj.produits.count(),
            'ventes_mois_count': ventes_mois.count(),
            'ventes_mois_total': float(total_ventes_mois),
        }


class AdminBoutiqueUpdateSerializer(serializers.ModelSerializer):
    """
    Modification des informations de base d'une boutique par le Super-Admin.
    """
    class Meta:
        model = Boutique
        fields = ['nom', 'adresse', 'telephone', 'compte_actif']


class AdminUtilisateurEditSerializer(serializers.ModelSerializer):
    """
    Modification d'un utilisateur / employé par le Super-Admin (nom, email, rôle, mot de passe).
    """
    nouveau_mot_de_passe = serializers.CharField(required=False, allow_blank=True, write_only=True)
    nom_complet = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Utilisateur
        fields = ['username', 'email', 'first_name', 'last_name', 'nom_complet', 'role', 'telephone', 'is_active', 'nouveau_mot_de_passe']

    def update(self, instance, validated_data):
        nouveau_pwd = validated_data.pop('nouveau_mot_de_passe', None)
        nom_complet = validated_data.pop('nom_complet', None)
        if nom_complet is not None:
            parts = nom_complet.strip().split(' ', 1)
            instance.first_name = parts[0]
            instance.last_name = parts[1] if len(parts) > 1 else ''

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if nouveau_pwd and len(nouveau_pwd.strip()) >= 6:
            instance.set_password(nouveau_pwd.strip())
        instance.save()
        return instance


class JournalActionSuperAdminSerializer(serializers.ModelSerializer):
    utilisateur_nom = serializers.SerializerMethodField()
    boutique_nom = serializers.CharField(source='boutique_cible.nom', read_only=True, default='')

    class Meta:
        model = JournalActionSuperAdmin
        fields = [
            'id', 'utilisateur', 'utilisateur_nom', 'action',
            'description', 'boutique_cible', 'boutique_nom', 'date_action', 'ip_adresse'
        ]

    def get_utilisateur_nom(self, obj):
        return obj.utilisateur.get_full_name() or obj.utilisateur.username if obj.utilisateur else "Système"


class AdminBoutiqueResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Boutique
        fields = ['id', 'nom', 'telephone', 'compte_actif']


class AdministrateurListSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()
    photo_profil_url = serializers.SerializerMethodField()
    boutiques_gerees = AdminBoutiqueResumeSerializer(many=True, read_only=True)
    nb_boutiques = serializers.SerializerMethodField()

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'nom_complet',
            'role', 'telephone', 'photo_profil_url', 'is_active', 'date_joined',
            'boutiques_gerees', 'nb_boutiques'
        ]

    def get_nom_complet(self, obj):
        return obj.get_full_name() or obj.username

    def get_photo_profil_url(self, obj):
        if not obj.photo_profil:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.photo_profil.url)
        return obj.photo_profil.url

    def get_nb_boutiques(self, obj):
        return obj.boutiques_gerees.count()


class AdministrateurCreateUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    nom_complet = serializers.CharField(write_only=True, required=False, allow_blank=True)
    boutiques_gerees = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Boutique.objects.all(),
        required=False
    )

    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'email', 'password', 'first_name', 'last_name',
            'nom_complet', 'telephone', 'is_active', 'boutiques_gerees'
        ]
        read_only_fields = ['id']

    def to_internal_value(self, data):
        # Accepte aussi bien 'boutiques_gerees' que l'alias 'boutiques_ids', y compris dans un QueryDict
        if hasattr(data, 'getlist'):
            plain_data = {}
            for k in data.keys():
                plain_data[k] = data.get(k)
            if 'boutiques_ids' in data:
                plain_data['boutiques_gerees'] = data.getlist('boutiques_ids')
            elif 'boutiques_gerees' in data:
                plain_data['boutiques_gerees'] = data.getlist('boutiques_gerees')
            data = plain_data
        elif hasattr(data, 'copy'):
            data = data.copy()
            if 'boutiques_ids' in data and 'boutiques_gerees' not in data:
                data['boutiques_gerees'] = data.get('boutiques_ids')
        elif isinstance(data, dict):
            data = dict(data)
            if 'boutiques_ids' in data and 'boutiques_gerees' not in data:
                data['boutiques_gerees'] = data.get('boutiques_ids')

        if 'boutiques_gerees' in data and not isinstance(data['boutiques_gerees'], (list, tuple)):
            data['boutiques_gerees'] = [data['boutiques_gerees']]

        return super().to_internal_value(data)

    def validate_username(self, value):
        instance = getattr(self, 'instance', None)
        qs = Utilisateur.objects.filter(username__iexact=value)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà utilisé.")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': "Le mot de passe initial est requis."})
        nom_complet = validated_data.pop('nom_complet', '')
        if nom_complet:
            parts = nom_complet.strip().split(' ', 1)
            validated_data['first_name'] = parts[0]
            validated_data['last_name'] = parts[1] if len(parts) > 1 else ''

        boutiques = validated_data.pop('boutiques_gerees', [])
        validated_data['role'] = 'administrateur'
        validated_data['boutique'] = None

        user = Utilisateur.objects.create_user(password=password, **validated_data)
        if boutiques:
            user.boutiques_gerees.set(boutiques)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        nom_complet = validated_data.pop('nom_complet', None)
        if nom_complet is not None:
            parts = nom_complet.strip().split(' ', 1)
            instance.first_name = parts[0]
            instance.last_name = parts[1] if len(parts) > 1 else ''

        boutiques = validated_data.pop('boutiques_gerees', None)
        if boutiques is not None:
            instance.boutiques_gerees.set(boutiques)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password and len(password.strip()) >= 6:
            instance.set_password(password.strip())
            instance.date_modification_mdp = timezone.now()

        instance.save()
        return instance


class MessageBoutiqueSerializer(serializers.ModelSerializer):
    expediteur_detail = serializers.SerializerMethodField()
    destinataire_detail = serializers.SerializerMethodField()
    est_lu = serializers.SerializerMethodField()
    nb_lecteurs = serializers.SerializerMethodField()
    date_formatee = serializers.SerializerMethodField()

    class Meta:
        model = MessageBoutique
        fields = [
            'id', 'boutique', 'expediteur', 'expediteur_detail',
            'destinataire', 'destinataire_detail', 'destine_a_tous',
            'type_message', 'titre', 'contenu', 'est_lu', 'nb_lecteurs',
            'date_envoi', 'date_formatee'
        ]
        read_only_fields = ['id', 'boutique', 'expediteur', 'date_envoi']

    def get_expediteur_detail(self, obj):
        exp = obj.expediteur
        request = self.context.get('request')
        photo_url = None
        if exp.photo_profil:
            photo_url = request.build_absolute_uri(exp.photo_profil.url) if request else exp.photo_profil.url
        return {
            'id': exp.id,
            'username': exp.username,
            'nom_complet': exp.get_full_name() or exp.username,
            'role': exp.role,
            'photo_profil_url': photo_url,
        }

    def get_destinataire_detail(self, obj):
        if not obj.destinataire:
            return None
        dest = obj.destinataire
        return {
            'id': dest.id,
            'username': dest.username,
            'nom_complet': dest.get_full_name() or dest.username,
            'role': dest.role,
        }

    def get_est_lu(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if obj.expediteur_id == request.user.id:
            return True
        return obj.lu_par.filter(pk=request.user.pk).exists()

    def get_nb_lecteurs(self, obj):
        return obj.lu_par.count()

    def get_date_formatee(self, obj):
        return obj.date_envoi.strftime('%d/%m/%Y à %H:%M')


class MessageBoutiqueCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageBoutique
        fields = [
            'destinataire', 'destine_a_tous', 'type_message', 'titre', 'contenu'
        ]

    def validate(self, attrs):
        destine_a_tous = attrs.get('destine_a_tous', False)
        destinataire = attrs.get('destinataire')
        if not destine_a_tous and not destinataire:
            attrs['destine_a_tous'] = True
        return attrs



