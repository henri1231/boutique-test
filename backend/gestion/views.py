from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from django.db import transaction
from django.db.models import Sum, F, Q
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from .models import Boutique, Utilisateur, Produit, Achat, Vente, Abonnement, Notification, JournalActionSuperAdmin, MessageBoutique
from .serializers import (
    BoutiqueSerializer, UtilisateurSerializer, InscriptionSerializer,
    ProduitSerializer, AchatSerializer, VenteSerializer,
    AbonnementSerializer, NotificationSerializer,
    RecuVenteSerializer, EmployeSerializer, EmployeCreateSerializer,
    AdminBoutiqueListSerializer, AdminBoutiqueDetailSerializer,
    AdminBoutiqueUpdateSerializer, AdminUtilisateurEditSerializer,
    AdminUtilisateurListSerializer, JournalActionSuperAdminSerializer,
    AdministrateurListSerializer, AdministrateurCreateUpdateSerializer,
    AdminBoutiqueResumeSerializer, MessageBoutiqueSerializer, MessageBoutiqueCreateSerializer
)
from .permissions import (
    EstAbonnementActif, EstGerant, EstGerantPourModificationProduit,
    EstSuperAdmin, EstSuperAdminOuAdministrateur
)
from rest_framework.exceptions import PermissionDenied
from .tmoney import initier_paiement_tmoney, confirmer_paiement_tmoney
from .flooz import initier_paiement_flooz, confirmer_paiement_flooz


# ==============================================================================
# AUTHENTIFICATION & COMPTE
# ==============================================================================

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Personnalise la réponse du token JWT pour inclure l'utilisateur et sa boutique.
    Bloque immédiatement la connexion si la boutique a été suspendue par le super-admin.
    """
    def validate(self, attrs):
        username = attrs.get(self.username_field)
        if username:
            user_found = Utilisateur.objects.filter(
                Q(username__iexact=username) | Q(email__iexact=username)
            ).first()
            if user_found:
                attrs[self.username_field] = user_found.username

        data = super().validate(attrs)
        utilisateur = self.user

        # VÉRIFICATION DU STATUT DU COMPTE / ACTIVATION PAR L'ADMINISTRATEUR
        if utilisateur.role not in ['super_admin', 'administrateur'] and utilisateur.boutique:
            if not utilisateur.boutique.compte_actif:
                from rest_framework.exceptions import AuthenticationFailed
                raise AuthenticationFailed("Votre boutique est actuellement en attente d'activation par l'administrateur de la plateforme.")

        photo_url = None
        if utilisateur.photo_profil:
            request = self.context.get('request')
            photo_url = request.build_absolute_uri(utilisateur.photo_profil.url) if request else utilisateur.photo_profil.url

        data['utilisateur'] = {
            'id': utilisateur.id,
            'username': utilisateur.username,
            'role': utilisateur.role,
            'nom_complet': utilisateur.get_full_name() or utilisateur.username,
            'photo_profil_url': photo_url,
            'boutique': BoutiqueSerializer(utilisateur.boutique).data if utilisateur.boutique else None,
            'est_super_admin': utilisateur.role == 'super_admin',
            'est_administrateur': utilisateur.role == 'administrateur',
            'est_gerant': utilisateur.role == 'gerant',
        }
        return data


class ConnexionView(TokenObtainPairView):
    """
    POST /api/auth/connexion/
    Authentifie l'utilisateur et renvoie les tokens JWT (access, refresh) ainsi que les infos de boutique.
    """
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class InscriptionView(generics.CreateAPIView):
    """
    POST /api/auth/inscription/
    Crée une nouvelle boutique, son gérant initial et configure l'abonnement initial.
    """
    permission_classes = [AllowAny]
    serializer_class = InscriptionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        utilisateur = serializer.save()

        return Response({
            'message': f"Boutique '{utilisateur.boutique.nom}' enregistrée avec succès ! Votre boutique est actuellement en attente d'activation par un administrateur.",
            'en_attente_activation': True,
            'boutique_nom': utilisateur.boutique.nom,
            'utilisateur': {
                'id': utilisateur.id,
                'username': utilisateur.username,
                'role': utilisateur.role,
                'nom_complet': utilisateur.get_full_name() or utilisateur.username,
                'boutique': BoutiqueSerializer(utilisateur.boutique).data,
            }
        }, status=status.HTTP_201_CREATED)


class ProfilView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/auth/profil/ -> Retourne les informations du compte connecté et le statut d'abonnement.
    PUT/PATCH /api/auth/profil/ -> Met à jour les coordonnées et/ou la photo de profil (multipart/form-data).
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UtilisateurSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        response = super().update(request, *args, **kwargs)
        # Si le mot de passe a été modifié, générer de nouveaux jetons JWT
        nouveau_mdp = request.data.get('nouveau_mot_de_passe')
        ancien_mdp = request.data.get('ancien_mot_de_passe')
        if nouveau_mdp and ancien_mdp:
            refresh = RefreshToken.for_user(self.request.user)
            response.data['tokens'] = {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
            response.data['mot_de_passe_modifie'] = True
            response.data['message'] = "Mot de passe et coordonnées mis à jour avec succès !"
        return response

    def perform_update(self, serializer):
        # Option de suppression explicite de la photo de profil
        if self.request.data.get('supprimer_photo') in ['true', True, '1']:
            if serializer.instance.photo_profil:
                serializer.instance.photo_profil.delete(save=False)
            serializer.save(photo_profil=None)
        else:
            serializer.save()


# ==============================================================================
# GESTION DES PRODUITS & STOCK (PROTÉGÉ PAR ACTIVATION BOUTIQUE ET RÔLES HTTP 403)
# ==============================================================================

class ProduitViewSet(viewsets.ModelViewSet):
    """
    CRUD complet sur les produits de la boutique.
    Toutes les opérations de stock sont soumises à la validation et activation de la boutique (EstAbonnementActif / EstBoutiqueActive).
    Les employés peuvent consulter la liste et effectuer achats/ventes.
    Seul le gérant est autorisé à créer, modifier ou supprimer un produit (EstGerantPourModificationProduit).
    """
    serializer_class = ProduitSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsAuthenticated, EstAbonnementActif, EstGerantPourModificationProduit]

    def get_queryset(self):
        user = self.request.user
        if not user.boutique:
            return Produit.objects.none()
        
        queryset = Produit.objects.filter(boutique=user.boutique)

        # Filtres optionnels
        categorie = self.request.query_params.get('categorie')
        recherche = self.request.query_params.get('q')
        filtre_rupture = self.request.query_params.get('rupture')

        if categorie:
            queryset = queryset.filter(categorie__iexact=categorie)
        if recherche:
            queryset = queryset.filter(
                Q(nom__icontains=recherche) | Q(categorie__icontains=recherche)
            )
        if filtre_rupture == 'true':
            queryset = queryset.filter(quantite_stock__lte=F('seuil_alerte'))

        return queryset

    def perform_create(self, serializer):
        serializer.save(boutique=self.request.user.boutique)

    @action(detail=True, methods=['post'], url_path='achat')
    def achat(self, request, pk=None):
        """
        POST /api/produits/{id}/achat/
        Enregistre un approvisionnement (entrée en stock) et incrémente la quantité.
        Accessible aux gérants et employés.
        """
        produit = self.get_object()
        
        try:
            quantite = int(request.data.get('quantite', 0))
            if quantite <= 0:
                return Response({'erreur': "La quantité achetée doit être supérieure à 0."}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'erreur': "Quantité invalide."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            prix_unitaire = Decimal(str(request.data.get('prix_unitaire', produit.prix_achat)))
        except (ValueError, TypeError, Exception):
            prix_unitaire = produit.prix_achat

        fournisseur = request.data.get('fournisseur', '')

        with transaction.atomic():
            produit.quantite_stock += quantite
            produit.prix_achat = prix_unitaire
            produit.save()

            achat = Achat.objects.create(
                produit=produit,
                quantite=quantite,
                prix_unitaire=prix_unitaire,
                fournisseur=fournisseur
            )

        return Response({
            'message': f"Achat enregistré : +{quantite} unités ajoutées à '{produit.nom}'. Nouveau stock: {produit.quantite_stock}.",
            'produit': ProduitSerializer(produit, context={'request': request}).data,
            'achat': AchatSerializer(achat).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='vente')
    def vente(self, request, pk=None):
        """
        POST /api/produits/{id}/vente/
        Enregistre une sortie de stock (vente au client).
        - Vérifie la disponibilité du stock
        - Décrémente le stock
        - Déclenche automatiquement une Notification si quantite_stock <= seuil_alerte
        - Génère les données du reçu client imprimable
        Accessible aux gérants et employés.
        """
        produit = self.get_object()

        try:
            quantite = int(request.data.get('quantite', 0))
            if quantite <= 0:
                return Response({'erreur': "La quantité vendue doit être supérieure à 0."}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'erreur': "Quantité invalide."}, status=status.HTTP_400_BAD_REQUEST)

        # Vérification du stock disponible
        if produit.quantite_stock < quantite:
            return Response({
                'erreur': f"Stock insuffisant pour '{produit.nom}'. Disponible: {produit.quantite_stock}, demandé: {quantite}."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            prix_unitaire = Decimal(str(request.data.get('prix_unitaire', produit.prix_vente)))
        except (ValueError, TypeError, Exception):
            prix_unitaire = produit.prix_vente

        notification_alerte = None

        with transaction.atomic():
            produit.quantite_stock -= quantite
            produit.save()

            vente = Vente.objects.create(
                produit=produit,
                quantite=quantite,
                prix_unitaire=prix_unitaire,
                prix_achat_unitaire=produit.prix_achat,
                utilisateur=request.user
            )

            # RÈGLE MÉTIER : Déclenchement automatique de l'alerte de rupture proche
            if produit.quantite_stock <= produit.seuil_alerte:
                msg = (
                    f"⚠️ Alerte Rupture Proche : Le stock de '{produit.nom}' "
                    f"est tombé à {produit.quantite_stock} unité(s) "
                    f"(seuil d'alerte configuré à {produit.seuil_alerte}). "
                    f"Pensez à passer commande auprès de votre fournisseur."
                )
                notification_alerte = Notification.objects.create(
                    boutique=produit.boutique,
                    produit=produit,
                    type='rupture_stock',
                    message=msg
                )

        reponse_data = {
            'message': f"Vente enregistrée : -{quantite} '{produit.nom}'. Stock restant: {produit.quantite_stock}.",
            'produit': ProduitSerializer(produit, context={'request': request}).data,
            'vente': VenteSerializer(vente).data,
            'recu': RecuVenteSerializer(vente).data,
            'alerte_rupture': bool(notification_alerte),
        }

        if notification_alerte:
            reponse_data['notification'] = NotificationSerializer(notification_alerte).data

        return Response(reponse_data, status=status.HTTP_201_CREATED)



# ==============================================================================
# NOTIFICATIONS & ALERTES DE RUPTURE
# ==============================================================================

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/notifications/
    Liste des alertes et notifications pour la boutique connectée.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.boutique:
            return Notification.objects.none()
        
        qs = Notification.objects.filter(boutique=user.boutique)
        non_lus_seulement = self.request.query_params.get('non_lus')
        if non_lus_seulement == 'true':
            qs = qs.filter(lu=False)
        return qs

    @action(detail=True, methods=['put'], url_path='lu')
    def marquer_comme_lu(self, request, pk=None):
        """
        PUT /api/notifications/{id}/lu/
        Marque une notification comme lue.
        """
        notification = self.get_object()
        notification.lu = True
        notification.save()
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['put'], url_path='tout-marquer-lu')
    def tout_marquer_lu(self, request):
        """
        PUT /api/notifications/tout-marquer-lu/
        Marque toutes les notifications de la boutique comme lues.
        """
        user = self.request.user
        if user.boutique:
            Notification.objects.filter(boutique=user.boutique, lu=False).update(lu=True)
        return Response({'message': "Toutes les notifications ont été marquées comme lues."})


# ==============================================================================
# ABONNEMENT TMONEY (5000 FCFA / 3 MOIS)
# ==============================================================================

# ==============================================================================
# STATUT D'ACTIVATION DE LA BOUTIQUE (ADMINISTRATION)
# ==============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated, EstGerant])
def abonnement_statut(request):
    """
    GET /api/abonnement/statut/
    Retourne l'état d'activation de la boutique par l'administrateur.
    Réservé au gérant de la boutique.
    """
    boutique = getattr(request.user, 'boutique', None)
    if not boutique:
        return Response({'erreur': "Aucune boutique rattachée."}, status=status.HTTP_400_BAD_REQUEST)

    statut_detail = boutique.statut_abonnement_detail()

    return Response({
        'boutique_nom': boutique.nom,
        'compte_actif': boutique.compte_actif,
        'abonnement': statut_detail,
        'statut': 'actif' if boutique.compte_actif else 'en_attente_activation',
        'historique': [],
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, EstGerant])
def abonnement_payer(request):
    return Response({
        'message': "Les paiements mobiles TMoney/Flooz ne sont plus requis. L'activation des boutiques s'effectue directement par un administrateur."
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated, EstGerant])
def abonnement_payer_flooz(request):
    return Response({
        'message': "Les paiements mobiles Flooz ne sont plus requis. L'activation des boutiques s'effectue directement par un administrateur."
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated, EstGerant])
def abonnement_payer_tmoney(request):
    return Response({
        'message': "Les paiements mobiles TMoney ne sont plus requis. L'activation des boutiques s'effectue directement par un administrateur."
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated, EstGerant])
def abonnement_confirmer(request):
    return Response({
        'message': "L'activation des boutiques s'effectue directement par un administrateur."
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated, EstGerant])
def abonnement_simuler_expiration(request):
    return Response({
        'message': "Fonctionnalité désactivée. Les boutiques sont activées directement par l'administrateur."
    }, status=status.HTTP_200_OK)


# ==============================================================================
# REÇUS DE VENTE & GESTION DES EMPLOYÉS
# ==============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recu_vente(request, pk):
    """
    GET /api/ventes/{id}/recu/
    Retourne les informations du reçu pour une vente donnée (format ticket de caisse).
    Accessible au gérant et à l'employé.
    """
    boutique = getattr(request.user, 'boutique', None)
    if not boutique:
        return Response({'erreur': "Aucune boutique rattachée."}, status=status.HTTP_400_BAD_REQUEST)

    vente = Vente.objects.filter(id=pk, produit__boutique=boutique).first()
    if not vente:
        return Response({'erreur': "Vente introuvable."}, status=status.HTTP_404_NOT_FOUND)

    return Response(RecuVenteSerializer(vente).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, EstGerant])
def employes_view(request):
    """
    GET  /api/auth/employes/ -> liste les comptes employés de la boutique
    POST /api/auth/employes/ -> crée un compte employé rattaché à la boutique
    Réservé au gérant (403 Forbidden pour les employés).
    """
    boutique = getattr(request.user, 'boutique', None)
    if not boutique:
        return Response({'erreur': "Aucune boutique rattachée."}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'GET':
        employes = Utilisateur.objects.filter(
            boutique=boutique,
            role__in=['employe', 'vendeur']
        ).order_by('-date_joined')
        return Response(EmployeSerializer(employes, many=True).data)

    elif request.method == 'POST':
        serializer = EmployeCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        employe = serializer.save()
        return Response({
            'message': f"Compte employé '{employe.username}' créé avec succès pour votre boutique !",
            'employe': EmployeSerializer(employe).data
        }, status=status.HTTP_201_CREATED)



# ==============================================================================
# HISTORIQUE DES MOUVEMENTS & STATISTIQUES
# ==============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated, EstAbonnementActif])
def historique_mouvements(request):
    """
    GET /api/historique/
    Retourne les récents achats et ventes de la boutique pour le journal d'activité.
    """
    user = request.user
    boutique = user.boutique

    achats = Achat.objects.filter(produit__boutique=boutique).order_by('-date')[:30]
    ventes = Vente.objects.filter(produit__boutique=boutique).order_by('-date')[:30]

    return Response({
        'achats': AchatSerializer(achats, many=True).data,
        'ventes': VenteSerializer(ventes, many=True).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def statistiques_boutique(request):
    """
    GET /api/statistiques/
    Retourne les indicateurs de pilotage de la boutique (KPIs).
    """
    user = request.user
    boutique = user.boutique
    if not boutique:
        return Response({'erreur': "Aucune boutique rattachée."}, status=status.HTTP_400_BAD_REQUEST)

    produits = Produit.objects.filter(boutique=boutique)
    total_produits = produits.count()
    produits_en_alerte = produits.filter(quantite_stock__lte=F('seuil_alerte')).count()
    
    valeur_stock_total = sum(p.quantite_stock * p.prix_achat for p in produits)

    # Statistiques du jour
    aujourdhui = timezone.now().date()
    ventes_du_jour = Vente.objects.filter(
        produit__boutique=boutique,
        date__date=aujourdhui
    )
    total_ventes_jour = sum(v.total for v in ventes_du_jour)
    nombre_ventes_jour = ventes_du_jour.count()

    notifications_non_lues = Notification.objects.filter(boutique=boutique, lu=False).count()

    return Response({
        'total_produits': total_produits,
        'produits_en_alerte': produits_en_alerte,
        'valeur_stock_total': valeur_stock_total,
        'total_ventes_jour': total_ventes_jour,
        'nombre_ventes_jour': nombre_ventes_jour,
        'notifications_non_lues': notifications_non_lues,
        'abonnement_actif': boutique.est_abonnement_actif(),
    })


# ==============================================================================
# TABLEAU DE BORD FINANCIER POUR LE GÉRANT DE BOUTIQUE
# ==============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated, EstAbonnementActif, EstGerant])
def resume_financier(request):
    """
    GET /api/finances/resume/?periode=...
    Tableau de bord financier réservé au gérant de boutique.
    Renvoie les 4 métriques clés :
    a) valeur_stock_achat: somme (quantité_stock × prix_achat) pour tout le stock actuel
    b) cout_marchandises_vendues: somme (quantité vendue × prix_achat au moment de la vente)
    c) chiffre_affaires: somme (quantité vendue × prix_vente)
    d) benefice: chiffre_affaires - cout_marchandises_vendues (vert si positif, rouge si négatif)
    
    Paramètres :
    - periode : 'aujourd_hui' | 'cette_semaine' | 'ce_mois' | 'tout' (défaut: 'ce_mois')
    - date_debut : 'YYYY-MM-DD'
    - date_fin : 'YYYY-MM-DD'
    """
    from datetime import datetime
    boutique = getattr(request.user, 'boutique', None)
    if not boutique:
        return Response({'erreur': "Aucune boutique rattachée."}, status=status.HTTP_400_BAD_REQUEST)

    # a) VALEUR D'ACHAT TOTALE DU STOCK ACTUEL
    produits = Produit.objects.filter(boutique=boutique)
    valeur_stock_achat = sum(p.quantite_stock * p.prix_achat for p in produits)
    total_articles_en_stock = sum(p.quantite_stock for p in produits)

    # b & c & d) FILTRAGE TEMPOREL DES VENTES
    now = timezone.now()
    periode = request.query_params.get('periode', 'ce_mois').lower().strip()
    date_debut_str = request.query_params.get('date_debut')
    date_fin_str = request.query_params.get('date_fin')

    ventes_qs = Vente.objects.filter(produit__boutique=boutique)
    periode_libelle = "Ce mois-ci"

    if date_debut_str and date_fin_str:
        try:
            d_start = datetime.strptime(date_debut_str, '%Y-%m-%d').date()
            d_end = datetime.strptime(date_fin_str, '%Y-%m-%d').date()
            ventes_qs = ventes_qs.filter(date__date__gte=d_start, date__date__lte=d_end)
            periode_libelle = f"Du {d_start.strftime('%d/%m/%Y')} au {d_end.strftime('%d/%m/%Y')}"
            periode = 'personnalise'
        except (ValueError, TypeError):
            pass
    elif periode in ('aujourd_hui', 'aujourdhui', 'jour'):
        today = now.date()
        ventes_qs = ventes_qs.filter(date__date=today)
        periode_libelle = "Aujourd'hui"
    elif periode in ('cette_semaine', 'semaine'):
        start_of_week = now.date() - timedelta(days=now.date().weekday())
        ventes_qs = ventes_qs.filter(date__date__gte=start_of_week)
        periode_libelle = "Cette semaine"
    elif periode in ('tout', 'tous', 'all'):
        periode_libelle = "Tout l'historique"
    else:
        # Par défaut: ce mois
        start_of_month = now.date().replace(day=1)
        ventes_qs = ventes_qs.filter(date__date__gte=start_of_month)
        periode_libelle = "Ce mois-ci"
        periode = 'ce_mois'

    ventes = list(ventes_qs.select_related('produit', 'utilisateur').order_by('-date'))

    cout_marchandises_vendues = Decimal('0.00')
    chiffre_affaires = Decimal('0.00')
    articles_vendus_total = 0

    stats_produits = {}

    for v in ventes:
        qte = v.quantite
        articles_vendus_total += qte
        prix_v = Decimal(str(v.prix_unitaire))
        prix_a = Decimal(str(v.prix_achat_unitaire if (v.prix_achat_unitaire and v.prix_achat_unitaire > 0) else v.produit.prix_achat))

        ca_v = qte * prix_v
        cout_v = qte * prix_a
        ben_v = ca_v - cout_v

        chiffre_affaires += ca_v
        cout_marchandises_vendues += cout_v

        p_id = v.produit_id
        if p_id not in stats_produits:
            stats_produits[p_id] = {
                'produit_id': p_id,
                'produit_nom': v.produit.nom,
                'quantite_vendue': 0,
                'chiffre_affaires': Decimal('0.00'),
                'cout_achat': Decimal('0.00'),
                'benefice': Decimal('0.00'),
            }
        stats_produits[p_id]['quantite_vendue'] += qte
        stats_produits[p_id]['chiffre_affaires'] += ca_v
        stats_produits[p_id]['cout_achat'] += cout_v
        stats_produits[p_id]['benefice'] += ben_v

    benefice = chiffre_affaires - cout_marchandises_vendues

    # Calcul de la marge nette en pourcentage
    if chiffre_affaires > 0:
        marge_pourcentage = round(float((benefice / chiffre_affaires) * 100), 1)
    else:
        marge_pourcentage = 0.0

    # Produits ordonnés par rentabilité
    produits_rentables = sorted(
        stats_produits.values(),
        key=lambda x: x['benefice'],
        reverse=True
    )[:10]

    # Sérialiser les montants des produits rentables pour le JSON
    for pr in produits_rentables:
        pr['chiffre_affaires'] = float(pr['chiffre_affaires'])
        pr['cout_achat'] = float(pr['cout_achat'])
        pr['benefice'] = float(pr['benefice'])
        pr['marge_pourcentage'] = round((pr['benefice'] / pr['chiffre_affaires'] * 100), 1) if pr['chiffre_affaires'] > 0 else 0.0

    return Response({
        'valeur_stock_achat': float(valeur_stock_achat),
        'cout_marchandises_vendues': float(cout_marchandises_vendues),
        'chiffre_affaires': float(chiffre_affaires),
        'benefice': float(benefice),
        'est_beneficiaire': benefice >= 0,
        'marge_pourcentage': marge_pourcentage,
        'nb_ventes': len(ventes),
        'articles_vendus_total': articles_vendus_total,
        'total_articles_en_stock': total_articles_en_stock,
        'total_produits_catalogue': produits.count(),
        'periode': periode,
        'periode_libelle': periode_libelle,
        'produits_rentables': produits_rentables,
        'ventes_recentes': VenteSerializer(ventes[:15], many=True).data,
    })


# ==============================================================================
# PORTAIL SUPER-ADMINISTRATEUR (SUPERVISION DE TOUTES LES BOUTIQUES)
# ==============================================================================

class AdminConnexionView(generics.GenericAPIView):
    """
    POST /api/admin-plateforme/connexion/
    Connexion dédiée au Super-Administrateur et aux Administrateurs de la plateforme.
    Rejette toute tentative de connexion de comptes gérant ou employé.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username_or_email = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username_or_email or not password:
            return Response({'erreur': "Veuillez fournir l'identifiant et le mot de passe."}, status=status.HTTP_400_BAD_REQUEST)

        # Recherche par username ou email (insensible à la casse)
        user = Utilisateur.objects.filter(Q(username__iexact=username_or_email) | Q(email__iexact=username_or_email)).first()
        if not user or not user.check_password(password):
            return Response({'erreur': "Identifiants administrateur invalides."}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'erreur': "Ce compte administrateur a été désactivé."}, status=status.HTTP_403_FORBIDDEN)

        if user.role not in ['super_admin', 'administrateur']:
            return Response({
                'erreur': "Accès refusé : Ce portail est strictement réservé aux administrateurs de la plateforme."
            }, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        photo_url = request.build_absolute_uri(user.photo_profil.url) if user.photo_profil else None

        return Response({
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'role': user.role,
            'est_super_admin': user.role == 'super_admin',
            'est_administrateur': user.role == 'administrateur',
            'utilisateur': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'nom_complet': user.get_full_name() or user.username,
                'role': user.role,
                'photo_profil_url': photo_url,
                'est_super_admin': user.role == 'super_admin',
                'est_administrateur': user.role == 'administrateur',
            }
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated, EstSuperAdminOuAdministrateur])
def admin_statistiques_globales(request):
    """
    GET /api/admin-plateforme/statistiques/
    Compteurs pour le tableau de bord Super-Admin et Administrateur (toutes les boutiques).
    """
    boutiques = Boutique.objects.all()

    total_boutiques = boutiques.count()
    boutiques_actives = boutiques.filter(compte_actif=True).count()
    boutiques_en_attente = boutiques.filter(compte_actif=False).count()

    total_utilisateurs = Utilisateur.objects.filter(
        boutique__in=boutiques,
        role__in=['gerant', 'employe', 'vendeur']
    ).count()

    return Response({
        'total_boutiques': total_boutiques,
        'boutiques_actives': boutiques_actives,
        'boutiques_en_attente': boutiques_en_attente,
        'boutiques_suspendues': boutiques_en_attente,
        'abonnements_actifs': boutiques_actives,
        'abonnements_expires': boutiques_en_attente,
        'total_utilisateurs': total_utilisateurs,
    })


class AdminBoutiqueViewSet(viewsets.ModelViewSet):
    """
    Gestion de toutes les boutiques par le Super-Administrateur ou par un Administrateur.
    GET /api/admin-plateforme/boutiques/ : Liste avec recherche et filtres
    GET /api/admin-plateforme/boutiques/{id}/ : Fiche détaillée
    PUT /api/admin-plateforme/boutiques/{id}/ : Mise à jour nom/adresse/téléphone
    POST /api/admin-plateforme/boutiques/{id}/toggle-statut/ : Activer / Désactiver la boutique
    """
    permission_classes = [IsAuthenticated, EstSuperAdminOuAdministrateur]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AdminBoutiqueDetailSerializer
        elif self.action in ['update', 'partial_update']:
            return AdminBoutiqueUpdateSerializer
        return AdminBoutiqueListSerializer

    def get_queryset(self):
        qs = Boutique.objects.all().order_by('-date_creation')

        recherche = self.request.query_params.get('recherche', '').strip()
        statut_abo = self.request.query_params.get('statut_abo', '').strip() # 'actif', 'expire'
        statut_compte = self.request.query_params.get('statut_compte', '').strip() # 'actif', 'suspendu', 'en_attente'

        if recherche:
            qs = qs.filter(Q(nom__icontains=recherche) | Q(adresse__icontains=recherche) | Q(telephone__icontains=recherche))

        if statut_compte == 'actif':
            qs = qs.filter(compte_actif=True)
        elif statut_compte in ['suspendu', 'en_attente']:
            qs = qs.filter(compte_actif=False)

        if statut_abo in ['actif', 'expire']:
            boutique_ids = [b.id for b in qs if (b.est_abonnement_actif() if statut_abo == 'actif' else not b.est_abonnement_actif())]
            qs = qs.filter(id__in=boutique_ids)

        return qs

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)
        boutique = generics.get_object_or_404(Boutique, pk=pk)
        self.check_object_permissions(self.request, boutique)
        return boutique

    def update(self, request, *args, **kwargs):
        boutique = self.get_object()
        ancien_nom = boutique.nom
        serializer = self.get_serializer(boutique, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        boutique = serializer.save()

        # Audit log différencié : Auteur Super-Admin vs Administrateur
        ip = request.META.get('REMOTE_ADDR')
        auteur_role = "Super-Administrateur" if request.user.role == 'super_admin' else "Administrateur"
        JournalActionSuperAdmin.objects.create(
            utilisateur=request.user,
            action="modification_boutique",
            description=f"[{auteur_role}: {request.user.username}] Mise à jour des coordonnées de la boutique '{ancien_nom}' (Nouvelles valeurs : Nom={boutique.nom}, Tél={boutique.telephone}).",
            boutique_cible=boutique,
            ip_adresse=ip
        )

        return Response(AdminBoutiqueDetailSerializer(boutique).data)

    @action(detail=True, methods=['post'], url_path='toggle-statut')
    def toggle_statut(self, request, pk=None):
        # Action autorisée au Super-Administrateur et aux Administrateurs (pour leurs boutiques attribuées)
        boutique = self.get_object()
        motif = request.data.get('motif', '').strip()
        nouvel_etat = not boutique.compte_actif
        boutique.compte_actif = nouvel_etat
        boutique.save()

        action_type = "reactivation_boutique" if nouvel_etat else "desactivation_boutique"
        role_label = "l'administrateur" if request.user.role == 'administrateur' else "le super-administrateur"
        tag = f"[Administrateur: {request.user.username}] " if request.user.role == 'administrateur' else ""
        desc = f"{tag}La boutique '{boutique.nom}' a été {'activée' if nouvel_etat else 'désactivée/suspendue'} par {role_label}."
        if motif:
            desc += f" Motif : {motif}"

        ip = request.META.get('REMOTE_ADDR')
        JournalActionSuperAdmin.objects.create(
            utilisateur=request.user,
            action=action_type,
            description=desc,
            boutique_cible=boutique,
            ip_adresse=ip
        )

        return Response({
            'message': f"Boutique '{boutique.nom}' {'activée' if nouvel_etat else 'désactivée'} avec succès.",
            'compte_actif': boutique.compte_actif,
            'boutique': AdminBoutiqueDetailSerializer(boutique).data
        })


@api_view(['PUT'])
@permission_classes([IsAuthenticated, EstSuperAdminOuAdministrateur])
def admin_modifier_utilisateur(request, pk):
    """
    PUT /api/admin-plateforme/utilisateurs/{pk}/
    Modification d'un compte utilisateur rattaché à une boutique (nom, email, rôle, mot de passe).
    Autorisé au Super-Admin pour toutes les boutiques, et à l'Administrateur pour SES boutiques attribuées uniquement.
    """
    user = generics.get_object_or_404(Utilisateur, pk=pk)

    # Vérification des droits pour l'administrateur : ne peut pas modifier d'autres administrateurs ou le super-admin
    if request.user.role == 'administrateur':
        if user.role in ['super_admin', 'administrateur']:
            raise PermissionDenied("Action interdite : Vous ne pouvez pas modifier un compte administrateur.")

    nouveau_pwd = request.data.get('nouveau_mot_de_passe', '')

    serializer = AdminUtilisateurEditSerializer(user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()

    auteur_role = "Super-Administrateur" if request.user.role == 'super_admin' else "Administrateur"
    desc = f"[{auteur_role}: {request.user.username}] Modification du compte '{user.username}' (Rôle: {user.role}, Email: {user.email})."
    if nouveau_pwd and len(nouveau_pwd.strip()) >= 6:
        desc += f" Mot de passe réinitialisé par {auteur_role.lower()}."

    ip = request.META.get('REMOTE_ADDR')
    JournalActionSuperAdmin.objects.create(
        utilisateur=request.user,
        action="modification_utilisateur",
        description=desc,
        boutique_cible=user.boutique,
        ip_adresse=ip
    )

    return Response({
        'message': f"Utilisateur '{user.username}' mis à jour avec succès.",
        'utilisateur': AdminUtilisateurListSerializer(user, context={'request': request}).data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, EstSuperAdminOuAdministrateur])
def admin_journal_actions(request):
    """
    GET /api/admin-plateforme/journal/
    Liste des actions sensibles journalisées pour audit.
    """
    boutique_id = request.query_params.get('boutique')
    qs = JournalActionSuperAdmin.objects.all().order_by('-date_action')

    if boutique_id:
        qs = qs.filter(boutique_cible_id=boutique_id)
    qs = qs[:100]
    return Response(JournalActionSuperAdminSerializer(qs, many=True).data)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated, EstSuperAdminOuAdministrateur])
def superadmin_mon_compte(request):
    """
    GET /api/superadmin/mon-compte/
    Consulter les informations du super-administrateur ou de l'administrateur connecté.

    PUT /api/superadmin/mon-compte/
    Modifier le nom d'utilisateur (username) et/ou le mot de passe du compte connecté.
    Exige la vérification stricte de l'ancien mot de passe et l'invalidation des tokens JWT antérieurs.
    """
    user = request.user

    # Vérification des rôles autorisés (super_admin ou administrateur)
    if user.role not in ['super_admin', 'administrateur']:
        return Response({
            'erreur': "Accès refusé : Seuls les administrateurs et super-administrateurs peuvent accéder à cette ressource."
        }, status=status.HTTP_403_FORBIDDEN)

    photo_url = request.build_absolute_uri(user.photo_profil.url) if user.photo_profil else None

    if request.method == 'GET':
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'nom_complet': user.get_full_name() or user.username,
            'role': user.role,
            'photo_profil_url': photo_url,
            'est_super_admin': user.role == 'super_admin',
            'est_administrateur': user.role == 'administrateur',
            'date_creation': user.date_joined,
            'date_modification_mdp': user.date_modification_mdp
        })

    # PUT
    data = request.data
    nouveau_username = data.get('username', '').strip()
    ancien_mot_de_passe = data.get('ancien_mot_de_passe', '')
    nouveau_mot_de_passe = data.get('nouveau_mot_de_passe', '')
    confirmer_mot_de_passe = data.get('confirmer_mot_de_passe', '')

    username_modifie = False
    mot_de_passe_modifie = False

    # 1. Modification du username (si fourni et différent)
    if nouveau_username and nouveau_username != user.username:
        if len(nouveau_username) < 3:
            return Response({
                'erreur': "Le nom d'utilisateur doit comporter au moins 3 caractères."
            }, status=status.HTTP_400_BAD_REQUEST)

        if Utilisateur.objects.filter(username__iexact=nouveau_username).exclude(pk=user.pk).exists():
            return Response({
                'erreur': "Ce nom d'utilisateur est déjà utilisé par un autre compte."
            }, status=status.HTTP_400_BAD_REQUEST)

        user.username = nouveau_username
        username_modifie = True

    # 2. Modification du mot de passe (si l'un des champs de mot de passe est renseigné)
    if ancien_mot_de_passe or nouveau_mot_de_passe or confirmer_mot_de_passe:
        if not ancien_mot_de_passe:
            return Response({
                'erreur': "Veuillez saisir votre mot de passe actuel pour valider la modification."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(ancien_mot_de_passe):
            return Response({
                'erreur': "L'ancien mot de passe est incorrect."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not nouveau_mot_de_passe:
            return Response({
                'erreur': "Veuillez renseigner le nouveau mot de passe."
            }, status=status.HTTP_400_BAD_REQUEST)

        if nouveau_mot_de_passe != confirmer_mot_de_passe:
            return Response({
                'erreur': "La confirmation ne correspond pas au nouveau mot de passe."
            }, status=status.HTTP_400_BAD_REQUEST)

        if len(nouveau_mot_de_passe) < 8:
            return Response({
                'erreur': "Le nouveau mot de passe doit comporter au moins 8 caractères."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validation avec les validateurs Django configurés dans AUTH_PASSWORD_VALIDATORS
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(nouveau_mot_de_passe, user=user)
        except ValidationError as e:
            return Response({
                'erreur': "Le nouveau mot de passe est trop faible : " + "; ".join(e.messages)
            }, status=status.HTTP_400_BAD_REQUEST)

        # Hachage et enregistrement de l'horodatage pour invalidation des anciens tokens
        user.set_password(nouveau_mot_de_passe)
        user.date_modification_mdp = timezone.now()
        mot_de_passe_modifie = True

    if not username_modifie and not mot_de_passe_modifie:
        return Response({
            'message': "Aucune modification détectée.",
            'username': user.username,
            'mot_de_passe_modifie': False,
            'utilisateur': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'nom_complet': user.get_full_name() or user.username,
                'role': user.role,
                'photo_profil_url': photo_url,
                'est_super_admin': user.role == 'super_admin',
                'est_administrateur': user.role == 'administrateur',
            }
        })

    user.save()

    # Enregistrement dans JournalActionSuperAdmin
    actions = []
    if username_modifie:
        actions.append("nom d'utilisateur")
    if mot_de_passe_modifie:
        actions.append("mot de passe")
    auteur_role = "Super-Administrateur" if user.role == 'super_admin' else "Administrateur"
    description_audit = f"[{auteur_role}: {user.username}] Modification du {' et/ou du '.join(actions) if actions else 'profil'}."
    ip = request.META.get('REMOTE_ADDR')
    JournalActionSuperAdmin.objects.create(
        utilisateur=user,
        action="modification_mon_compte",
        description=description_audit,
        ip_adresse=ip
    )

    msg = "Mot de passe modifié avec succès. Veuillez vous reconnecter." if mot_de_passe_modifie else "Nom d'utilisateur mis à jour avec succès."

    return Response({
        'message': msg,
        'username': user.username,
        'mot_de_passe_modifie': mot_de_passe_modifie,
        'utilisateur': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'nom_complet': user.get_full_name() or user.username,
            'role': user.role,
            'photo_profil_url': photo_url,
            'est_super_admin': user.role == 'super_admin',
            'est_administrateur': user.role == 'administrateur',
        }
    })


# ==============================================================================
# GESTION DES ADMINISTRATEURS (SUPER-ADMINISTRATEUR EXCLUSIF)
# ==============================================================================

class AdminAdministrateurViewSet(viewsets.ModelViewSet):
    """
    CRUD complet des comptes Administrateurs par le Super-Administrateur.
    GET /api/admin-plateforme/administrateurs/ : Liste des administrateurs
    POST /api/admin-plateforme/administrateurs/ : Création d'un administrateur
    GET /api/admin-plateforme/administrateurs/{id}/ : Détail
    PUT/PATCH /api/admin-plateforme/administrateurs/{id}/ : Modification
    DELETE /api/admin-plateforme/administrateurs/{id}/ : Suppression
    """
    permission_classes = [IsAuthenticated, EstSuperAdmin]
    queryset = Utilisateur.objects.filter(role='administrateur').order_by('-date_joined')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AdministrateurCreateUpdateSerializer
        return AdministrateurListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        read_serializer = AdministrateurListSerializer(serializer.instance, context=self.get_serializer_context())
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        read_serializer = AdministrateurListSerializer(instance, context=self.get_serializer_context())
        return Response(read_serializer.data, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        admin_user = serializer.save()
        ip = self.request.META.get('REMOTE_ADDR')
        nb_b = admin_user.boutiques_gerees.count()
        JournalActionSuperAdmin.objects.create(
            utilisateur=self.request.user,
            action="creation_administrateur",
            description=f"Création du compte administrateur '{admin_user.username}' ({admin_user.email}) avec {nb_b} boutique(s) attribuée(s).",
            ip_adresse=ip
        )

    def perform_update(self, serializer):
        admin_user = serializer.save()
        ip = self.request.META.get('REMOTE_ADDR')
        nb_b = admin_user.boutiques_gerees.count()
        JournalActionSuperAdmin.objects.create(
            utilisateur=self.request.user,
            action="modification_administrateur",
            description=f"Mise à jour du compte administrateur '{admin_user.username}' (Actif: {admin_user.is_active}, Boutiques: {nb_b}).",
            ip_adresse=ip
        )

    def perform_destroy(self, instance):
        username = instance.username
        email = instance.email
        ip = self.request.META.get('REMOTE_ADDR')
        instance.delete()
        JournalActionSuperAdmin.objects.create(
            utilisateur=self.request.user,
            action="suppression_administrateur",
            description=f"Suppression définitive du compte administrateur '{username}' ({email}).",
            ip_adresse=ip
        )


# ==============================================================================
# COMMUNICATION INTERNE BOUTIQUE (GÉRANT ↔ EMPLOYÉS)
# ==============================================================================

class MessageBoutiqueViewSet(viewsets.ModelViewSet):
    """
    CRUD et gestion de la messagerie interne de la boutique.
    Permet au gérant d'envoyer des consignes à toute l'équipe ou des messages privés,
    et aux employés d'échanger avec leur gérant.
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.boutique:
            return MessageBoutique.objects.none()

        qs = MessageBoutique.objects.filter(boutique=user.boutique)

        canal = self.request.query_params.get('canal')
        employe_id = self.request.query_params.get('employe_id')

        if canal == 'equipe':
            qs = qs.filter(destine_a_tous=True)
        elif canal == 'direct' and employe_id:
            qs = qs.filter(
                Q(expediteur=user, destinataire_id=employe_id) |
                Q(expediteur_id=employe_id, destinataire=user)
            )

        return qs.order_by('date_envoi')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return MessageBoutiqueCreateSerializer
        return MessageBoutiqueSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        read_serializer = MessageBoutiqueSerializer(serializer.instance, context=self.get_serializer_context())
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        user = self.request.user
        boutique = user.boutique
        if not boutique:
            raise PermissionDenied("Vous devez être rattaché à une boutique pour envoyer des messages.")

        destinataire = serializer.validated_data.get('destinataire')
        if destinataire and destinataire.boutique_id != boutique.id:
            raise PermissionDenied("Le destinataire n'appartient pas à votre boutique.")

        msg = serializer.save(boutique=boutique, expediteur=user)
        msg.lu_par.add(user)

    def perform_destroy(self, instance):
        user = self.request.user
        if instance.expediteur != user and user.role != 'gerant':
            raise PermissionDenied("Seul l'auteur ou le gérant peut supprimer ce message.")
        instance.delete()

    @action(detail=True, methods=['post'], url_path='marquer-lu')
    def marquer_lu(self, request, pk=None):
        msg = self.get_object()
        msg.lu_par.add(request.user)
        return Response({'status': 'ok', 'message_id': msg.id, 'est_lu': True})

    @action(detail=False, methods=['post'], url_path='tout-marquer-lu')
    def tout_marquer_lu(self, request):
        user = request.user
        boutique = user.boutique
        if not boutique:
            return Response({'nb_marques': 0})

        messages = MessageBoutique.objects.filter(
            boutique=boutique
        ).filter(
            Q(destine_a_tous=True) | Q(destinataire=user)
        ).exclude(lu_par=user)

        count = 0
        for m in messages:
            m.lu_par.add(user)
            count += 1

        return Response({'nb_marques': count})

    @action(detail=False, methods=['get'], url_path='non-lus')
    def non_lus(self, request):
        user = request.user
        boutique = user.boutique
        if not boutique:
            return Response({'non_lus': 0})

        nb = MessageBoutique.objects.filter(
            boutique=boutique
        ).filter(
            Q(destine_a_tous=True) | Q(destinataire=user)
        ).exclude(
            expediteur=user
        ).exclude(
            lu_par=user
        ).count()

        return Response({'non_lus': nb})


