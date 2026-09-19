from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    InscriptionView, ConnexionView, ProfilView,
    ProduitViewSet, NotificationViewSet,
    abonnement_statut, abonnement_payer, abonnement_payer_flooz, abonnement_payer_tmoney,
    abonnement_confirmer, abonnement_simuler_expiration,
    historique_mouvements, statistiques_boutique, resume_financier,
    recu_vente, employes_view,
    AdminConnexionView, admin_statistiques_globales, AdminBoutiqueViewSet,
    admin_modifier_utilisateur, admin_journal_actions, superadmin_mon_compte,
    AdminAdministrateurViewSet, MessageBoutiqueViewSet
)

router = DefaultRouter()
router.register(r'produits', ProduitViewSet, basename='produit')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'communication/messages', MessageBoutiqueViewSet, basename='message_boutique')
router.register(r'admin-plateforme/boutiques', AdminBoutiqueViewSet, basename='admin_boutique')
router.register(r'admin-plateforme/administrateurs', AdminAdministrateurViewSet, basename='admin_administrateur')

urlpatterns = [
    # Authentification & Utilisateur & Gestion Employés
    path('auth/inscription/', InscriptionView.as_view(), name='auth_inscription'),
    path('auth/connexion/', ConnexionView.as_view(), name='auth_connexion'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth_token_refresh'),
    path('auth/profil/', ProfilView.as_view(), name='auth_profil'),
    path('auth/employes/', employes_view, name='auth_employes'),

    # Portail Super-Administrateur Plateforme
    path('admin-plateforme/connexion/', AdminConnexionView.as_view(), name='admin_connexion'),
    path('admin-plateforme/statistiques/', admin_statistiques_globales, name='admin_statistiques'),
    path('admin-plateforme/utilisateurs/<int:pk>/', admin_modifier_utilisateur, name='admin_modifier_utilisateur'),
    path('admin-plateforme/journal/', admin_journal_actions, name='admin_journal_actions'),
    path('superadmin/mon-compte/', superadmin_mon_compte, name='superadmin_mon_compte'),
    path('admin-plateforme/mon-compte/', superadmin_mon_compte, name='admin_plateforme_mon_compte'),

    # Reçu de vente client
    path('ventes/<int:pk>/recu/', recu_vente, name='recu_vente'),

    # Abonnement Mobile Money (TMoney & Flooz - 5000 FCFA / 3 mois)
    path('abonnement/statut/', abonnement_statut, name='abonnement_statut'),
    path('abonnement/payer/', abonnement_payer, name='abonnement_payer'),
    path('abonnement/payer/flooz/', abonnement_payer_flooz, name='abonnement_payer_flooz'),
    path('abonnement/payer/tmoney/', abonnement_payer_tmoney, name='abonnement_payer_tmoney'),
    path('abonnement/confirmer/', abonnement_confirmer, name='abonnement_confirmer'),
    path('abonnement/simuler-expiration/', abonnement_simuler_expiration, name='abonnement_simuler_expiration'),

    # Historique & Statistiques & Finances
    path('historique/', historique_mouvements, name='historique_mouvements'),
    path('statistiques/', statistiques_boutique, name='statistiques_boutique'),
    path('finances/resume/', resume_financier, name='finances_resume'),

    # Routes CRUD Produits, Notifications, Admin Boutiques
    path('', include(router.urls)),
]
