from rest_framework import permissions, exceptions, status


class AbonnementRequisException(exceptions.APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Votre boutique est actuellement en attente d'activation par l'administrateur de la plateforme."
    default_code = "boutique_en_attente_activation"


class EstSuperAdmin(permissions.BasePermission):
    """
    Vérifie que l'utilisateur est authentifié et possède le rôle 'super_admin'.
    Renvoie une erreur HTTP 403 Forbidden sinon.
    """
    message = "Accès réservé au Super-Administrateur de la plateforme."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role != 'super_admin':
            raise exceptions.PermissionDenied("Action interdite : seuls les super-administrateurs ont accès à cet espace.")
        return True


class EstAbonnementActif(permissions.BasePermission):
    """
    Vérifie que l'utilisateur est authentifié et que sa boutique est active (compte_actif == True).
    Les boutiques créées sont actives par défaut et gratuites.
    """
    message = "Boutique temporairement suspendue par l'administrateur."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Le super-administrateur et les administrateurs accèdent selon leurs droits
        if request.user.role in ['super_admin', 'administrateur']:
            return True

        boutique = getattr(request.user, 'boutique', None)
        if not boutique:
            raise exceptions.PermissionDenied("Aucune boutique n'est associée à ce compte utilisateur.")

        # VÉRIFICATION DU STATUT DE LA BOUTIQUE
        if not boutique.compte_actif:
            raise exceptions.PermissionDenied(
                "Votre boutique a été temporairement suspendue ou désactivée par l'administrateur de la plateforme."
            )

        return True


class EstGerant(permissions.BasePermission):
    """
    Vérifie que l'utilisateur a le rôle de gérant.
    Renvoie une erreur HTTP 403 Forbidden si l'utilisateur est un employé.
    """
    message = "Action réservée au gérant de la boutique."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role != 'gerant':
            raise exceptions.PermissionDenied("Action interdite : seuls les gérants ont accès à cette fonctionnalité.")
        return True


class EstGerantPourModificationProduit(permissions.BasePermission):
    """
    Autorise les employés à :
    - Consulter la liste et le détail des produits (GET / SAFE_METHODS)
    - Enregistrer un achat (+ stock) ou une vente (− stock)
    
    Exige le rôle 'gerant' pour :
    - Créer un produit (POST /api/produits/)
    - Modifier un produit / ses prix / son seuil (PUT, PATCH)
    - Supprimer un produit (DELETE)
    Renvoie une erreur HTTP 403 Forbidden sinon.
    """
    message = "Seul le gérant est autorisé à créer, modifier ou supprimer des produits."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        action = getattr(view, 'action', None)

        # Lecture ou actions autorisées pour les employés
        if request.method in permissions.SAFE_METHODS or action in ['achat', 'vente']:
            return True

        # Toute action d'écriture structurelle (création, modification prix/nom/seuil, suppression)
        if request.user.role != 'gerant':
            raise exceptions.PermissionDenied(
                "Action interdite aux employés : seuls les gérants peuvent ajouter, modifier ou supprimer des produits."
            )

        return True


class EstSuperAdminOuAdministrateur(permissions.BasePermission):
    """
    Vérifie que l'utilisateur est authentifié et possède le rôle 'super_admin' ou 'administrateur'.
    Renvoie une erreur HTTP 403 Forbidden sinon.
    """
    message = "Accès réservé aux administrateurs de la plateforme."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role not in ['super_admin', 'administrateur']:
            raise exceptions.PermissionDenied("Action interdite : seuls les administrateurs et super-administrateurs ont accès à cet espace.")
        return True

