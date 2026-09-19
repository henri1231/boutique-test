from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Boutique, Utilisateur, Produit, Achat, Vente, Abonnement, Notification, JournalActionSuperAdmin, MessageBoutique


@admin.register(Boutique)
class BoutiqueAdmin(admin.ModelAdmin):
    list_display = ['nom', 'telephone', 'adresse', 'compte_actif', 'date_creation']
    search_fields = ['nom', 'telephone']


@admin.register(Utilisateur)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'role', 'boutique', 'telephone', 'is_staff']
    list_filter = ['role', 'is_staff', 'is_superuser']
    fieldsets = UserAdmin.fieldsets + (
        ('Informations Boutique & Rôle', {'fields': ('boutique', 'boutiques_gerees', 'role', 'telephone', 'photo_profil', 'date_modification_mdp')}),
    )


@admin.register(JournalActionSuperAdmin)
class JournalActionSuperAdminAdmin(admin.ModelAdmin):
    list_display = ['date_action', 'utilisateur', 'action', 'boutique_cible', 'ip_adresse']
    list_filter = ['action', 'date_action']
    search_fields = ['description', 'utilisateur__username', 'boutique_cible__nom']


@admin.register(MessageBoutique)
class MessageBoutiqueAdmin(admin.ModelAdmin):
    list_display = ['boutique', 'expediteur', 'destinataire', 'destine_a_tous', 'type_message', 'date_envoi']
    list_filter = ['type_message', 'destine_a_tous', 'date_envoi', 'boutique']
    search_fields = ['contenu', 'titre', 'expediteur__username', 'destinataire__username']


@admin.register(Produit)
class ProduitAdmin(admin.ModelAdmin):
    list_display = ['nom', 'boutique', 'categorie', 'prix_achat', 'prix_vente', 'quantite_stock', 'seuil_alerte', 'est_en_rupture_proche']
    list_filter = ['boutique', 'categorie']
    search_fields = ['nom', 'categorie']


@admin.register(Achat)
class AchatAdmin(admin.ModelAdmin):
    list_display = ['produit', 'quantite', 'prix_unitaire', 'total', 'fournisseur', 'date']
    list_filter = ['date']
    search_fields = ['produit__nom', 'fournisseur']


@admin.register(Vente)
class VenteAdmin(admin.ModelAdmin):
    list_display = ['produit', 'quantite', 'prix_unitaire', 'total', 'utilisateur', 'date']
    list_filter = ['date']
    search_fields = ['produit__nom', 'utilisateur__username']


@admin.register(Abonnement)
class AbonnementAdmin(admin.ModelAdmin):
    list_display = ['boutique', 'montant', 'methode', 'reference_paiement', 'date_debut', 'date_fin', 'statut']
    list_filter = ['statut', 'methode']
    search_fields = ['boutique__nom', 'reference_paiement', 'telephone_paiement']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['boutique', 'type', 'produit', 'message', 'lu', 'date']
    list_filter = ['lu', 'type', 'boutique']
    search_fields = ['message', 'produit__nom']

