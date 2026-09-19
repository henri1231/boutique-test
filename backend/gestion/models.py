from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta


class Boutique(models.Model):
    nom = models.CharField(max_length=200, verbose_name="Nom de la boutique")
    adresse = models.TextField(blank=True, default='', verbose_name="Adresse")
    telephone = models.CharField(max_length=50, blank=True, default='', verbose_name="Téléphone")
    compte_actif = models.BooleanField(default=False, verbose_name="Compte actif")
    date_creation = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")

    class Meta:
        verbose_name = "Boutique"
        verbose_name_plural = "Boutiques"
        ordering = ['-date_creation']

    def __str__(self):
        return self.nom

    def est_abonnement_actif(self):
        """
        L'accès aux opérations de la boutique est conditionné par l'activation
        du compte par l'administrateur de la plateforme (compte_actif == True).
        """
        return self.compte_actif

    def dernier_abonnement(self):
        return self.abonnements.order_by('-date_creation').first()

    def statut_abonnement_detail(self):
        return {
            'actif': self.compte_actif,
            'statut': 'actif' if self.compte_actif else 'en_attente_activation',
            'compte_actif': self.compte_actif,
            'message': "Boutique validée et active" if self.compte_actif else "En attente d'activation par l'administrateur"
        }


class Utilisateur(AbstractUser):
    ROLE_CHOICES = [
        ('super_admin', 'Super Administrateur'),
        ('administrateur', 'Administrateur'),
        ('gerant', 'Gérant'),
        ('employe', 'Employé'),
        ('vendeur', 'Employé'), # Compatibilité avec les comptes existants
    ]

    boutique = models.ForeignKey(
        Boutique,
        on_delete=models.CASCADE,
        related_name='utilisateurs',
        null=True,
        blank=True,
        verbose_name="Boutique"
    )
    boutiques_gerees = models.ManyToManyField(
        Boutique,
        blank=True,
        related_name='administrateurs',
        verbose_name="Boutiques gérées"
    )
    photo_profil = models.ImageField(
        upload_to='profils/',
        null=True,
        blank=True,
        verbose_name="Photo de profil"
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='gerant',
        verbose_name="Rôle"
    )
    telephone = models.CharField(max_length=50, blank=True, default='', verbose_name="Numéro de téléphone")
    date_modification_mdp = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de dernière modification du mot de passe"
    )

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"

    def __str__(self):
        if self.boutique:
            ctx = self.boutique.nom
        elif self.role == 'administrateur':
            ctx = "Administrateur"
        elif self.role == 'super_admin':
            ctx = "Super Admin"
        else:
            ctx = self.get_role_display()
        return f"{self.username} ({self.get_role_display()}) - {ctx}"

    @property
    def est_super_admin(self):
        return self.role == 'super_admin'

    @property
    def est_administrateur(self):
        return self.role == 'administrateur'

    @property
    def est_gerant(self):
        return self.role == 'gerant'

    @property
    def est_employe(self):
        return self.role in ['employe', 'vendeur']


class Produit(models.Model):
    boutique = models.ForeignKey(
        Boutique,
        on_delete=models.CASCADE,
        related_name='produits',
        verbose_name="Boutique"
    )
    nom = models.CharField(max_length=200, verbose_name="Nom du produit")
    image = models.ImageField(upload_to='produits/', null=True, blank=True, verbose_name="Photo du produit")
    categorie = models.CharField(max_length=100, blank=True, default='Général', verbose_name="Catégorie")
    prix_achat = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Prix d'achat (FCFA)")
    prix_vente = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Prix de vente (FCFA)")
    quantite_stock = models.IntegerField(default=0, verbose_name="Quantité en stock")
    seuil_alerte = models.IntegerField(default=2, verbose_name="Seuil d'alerte de rupture")
    date_creation = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    date_modification = models.DateTimeField(auto_now=True, verbose_name="Dernière modification")

    class Meta:
        verbose_name = "Produit"
        verbose_name_plural = "Produits"
        ordering = ['nom']
        unique_together = ['boutique', 'nom']

    def __str__(self):
        return f"{self.nom} ({self.quantite_stock} en stock)"

    @property
    def est_en_rupture_proche(self):
        return self.quantite_stock <= self.seuil_alerte


class Achat(models.Model):
    """
    Entrée de stock (approvisionnement auprès des fournisseurs).
    """
    produit = models.ForeignKey(
        Produit,
        on_delete=models.CASCADE,
        related_name='achats',
        verbose_name="Produit"
    )
    quantite = models.PositiveIntegerField(verbose_name="Quantité achetée")
    prix_unitaire = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Prix unitaire d'achat (FCFA)")
    fournisseur = models.CharField(max_length=200, blank=True, default='', verbose_name="Fournisseur")
    date = models.DateTimeField(auto_now_add=True, verbose_name="Date d'achat")

    class Meta:
        verbose_name = "Achat"
        verbose_name_plural = "Achats"
        ordering = ['-date']

    def __str__(self):
        return f"+{self.quantite} {self.produit.nom} ({self.date.strftime('%d/%m/%Y')})"

    @property
    def total(self):
        from decimal import Decimal
        return Decimal(str(self.prix_unitaire)) * self.quantite



class Vente(models.Model):
    """
    Sortie de stock (vente au comptoir aux clients).
    """
    produit = models.ForeignKey(
        Produit,
        on_delete=models.CASCADE,
        related_name='ventes',
        verbose_name="Produit"
    )
    quantite = models.PositiveIntegerField(verbose_name="Quantité vendue")
    prix_unitaire = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Prix unitaire de vente (FCFA)")
    prix_achat_unitaire = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Prix d'achat unitaire au moment de la vente (FCFA)")
    utilisateur = models.ForeignKey(
        Utilisateur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ventes',
        verbose_name="Vendeur / Enregistré par"
    )
    date = models.DateTimeField(auto_now_add=True, verbose_name="Date de vente")

    class Meta:
        verbose_name = "Vente"
        verbose_name_plural = "Ventes"
        ordering = ['-date']

    def __str__(self):
        return f"-{self.quantite} {self.produit.nom} ({self.date.strftime('%d/%m/%Y')})"

    def save(self, *args, **kwargs):
        # Figer le prix d'achat au moment précis de la vente si non spécifié
        if (not self.prix_achat_unitaire or self.prix_achat_unitaire == 0) and self.produit:
            self.prix_achat_unitaire = self.produit.prix_achat
        super().save(*args, **kwargs)

    @property
    def total(self):
        from decimal import Decimal
        return Decimal(str(self.prix_unitaire)) * self.quantite

    @property
    def cout_achat_total(self):
        from decimal import Decimal
        prix_achat = self.prix_achat_unitaire if (self.prix_achat_unitaire and self.prix_achat_unitaire > 0) else self.produit.prix_achat
        return Decimal(str(prix_achat)) * self.quantite

    @property
    def benefice(self):
        return self.total - self.cout_achat_total



class Abonnement(models.Model):
    """
    Abonnement trimestriel (5000 FCFA tous les 3 mois) pour l'accès aux fonctionnalités de stock.
    Payable via TMoney (Togocom) ou Flooz (Moov Africa).
    """
    STATUT_CHOICES = [
        ('actif', 'Actif'),
        ('expire', 'Expiré'),
        ('en_attente', 'En attente'),
    ]

    METHODE_CHOICES = [
        ('TMoney', 'TMoney (Togocom)'),
        ('Flooz', 'Moov Flooz'),
    ]

    boutique = models.ForeignKey(
        Boutique,
        on_delete=models.CASCADE,
        related_name='abonnements',
        verbose_name="Boutique"
    )
    montant = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=5000,
        verbose_name="Montant (FCFA)"
    )
    methode = models.CharField(
        max_length=50,
        default='TMoney',
        verbose_name="Méthode de paiement"
    )
    methode_paiement = models.CharField(
        max_length=20,
        choices=METHODE_CHOICES,
        default='TMoney',
        verbose_name="Moyen de paiement mobile"
    )
    reference_paiement = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name="Référence TMoney / Flooz"
    )
    telephone_paiement = models.CharField(
        max_length=50,
        blank=True,
        default='',
        verbose_name="Numéro de paiement utilisé"
    )
    date_debut = models.DateTimeField(null=True, blank=True, verbose_name="Date de début")
    date_fin = models.DateTimeField(null=True, blank=True, verbose_name="Date de fin")
    statut = models.CharField(
        max_length=20,
        choices=STATUT_CHOICES,
        default='en_attente',
        verbose_name="Statut"
    )
    date_creation = models.DateTimeField(auto_now_add=True, verbose_name="Date d'enregistrement")

    class Meta:
        verbose_name = "Abonnement"
        verbose_name_plural = "Abonnements"
        ordering = ['-date_creation']

    def save(self, *args, **kwargs):
        # Synchronisation bidirectionnelle methode <-> methode_paiement
        if not self.methode_paiement and self.methode:
            self.methode_paiement = 'Flooz' if 'flooz' in self.methode.lower() else 'TMoney'
        if self.methode_paiement and (not self.methode or self.methode in ('TMoney', 'Flooz')):
            self.methode = self.methode_paiement
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.boutique.nom} - {self.get_statut_display()} ({self.montant} FCFA)"

    def activer(self, duree_jours=90):
        maintenant = timezone.now()
        # Si un abonnement actuel est encore actif, prolonger à partir de la date_fin
        if self.boutique.est_abonnement_actif():
            dernier_actif = self.boutique.abonnements.filter(statut='actif').order_by('-date_fin').first()
            if dernier_actif and dernier_actif.date_fin and dernier_actif.date_fin > maintenant:
                self.date_debut = dernier_actif.date_fin
                self.date_fin = dernier_actif.date_fin + timedelta(days=duree_jours)
            else:
                self.date_debut = maintenant
                self.date_fin = maintenant + timedelta(days=duree_jours)
        else:
            self.date_debut = maintenant
            self.date_fin = maintenant + timedelta(days=duree_jours)
            
        self.statut = 'actif'
        self.save()


class Notification(models.Model):
    """
    Alerte automatique générée pour la boutique (ex: alerte rupture de stock).
    """
    TYPE_CHOICES = [
        ('rupture_stock', 'Rupture de stock proche'),
        ('abonnement', 'Abonnement'),
        ('info', 'Information'),
    ]

    boutique = models.ForeignKey(
        Boutique,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Boutique"
    )
    produit = models.ForeignKey(
        Produit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name="Produit concerné"
    )
    type = models.CharField(
        max_length=50,
        choices=TYPE_CHOICES,
        default='rupture_stock',
        verbose_name="Type de notification"
    )
    message = models.TextField(verbose_name="Message")
    lu = models.BooleanField(default=False, verbose_name="Lu")
    date = models.DateTimeField(auto_now_add=True, verbose_name="Date")

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-date']

    def __str__(self):
        return f"[{self.boutique.nom}] {self.get_type_display()} : {self.message[:40]}"


class JournalActionSuperAdmin(models.Model):
    """
    Journalisation des actions sensibles effectuées par le super-administrateur
    (ex: désactivation de boutique, modification d'un compte employé, réinitialisation de mot de passe).
    """
    utilisateur = models.ForeignKey(
        Utilisateur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='actions_super_admin',
        verbose_name="Super-Administrateur"
    )
    action = models.CharField(max_length=100, verbose_name="Action effectuée")
    description = models.TextField(verbose_name="Description détaillée")
    boutique_cible = models.ForeignKey(
        Boutique,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='actions_super_admin',
        verbose_name="Boutique cible"
    )
    date_action = models.DateTimeField(auto_now_add=True, verbose_name="Date et heure de l'action")
    ip_adresse = models.GenericIPAddressField(null=True, blank=True, verbose_name="Adresse IP")

    class Meta:
        verbose_name = "Journal Action Super-Admin"
        verbose_name_plural = "Journal Actions Super-Admin"
        ordering = ['-date_action']

    def __str__(self):
        auteur = self.utilisateur.username if self.utilisateur else "Système"
        return f"[{self.date_action.strftime('%d/%m/%Y %H:%M')}] {auteur} -> {self.action}"


class MessageBoutique(models.Model):
    """
    Messages et consignes internes échangés entre le gérant et les employés d'une même boutique.
    Permet la diffusion de consignes générales à toute l'équipe ou d'échanges directs privés.
    """
    TYPE_CHOICES = [
        ('normal', 'Message standard'),
        ('consigne', 'Consigne d\'équipe'),
        ('urgent', 'Important / Urgent'),
    ]

    boutique = models.ForeignKey(
        Boutique,
        on_delete=models.CASCADE,
        related_name='messages_internes',
        verbose_name="Boutique"
    )
    expediteur = models.ForeignKey(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name='messages_envoyes',
        verbose_name="Expéditeur"
    )
    destinataire = models.ForeignKey(
        Utilisateur,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='messages_recus',
        verbose_name="Destinataire (vide si toute l'équipe)",
        help_text="Laisser vide si le message est destiné à tous les employés de la boutique"
    )
    destine_a_tous = models.BooleanField(
        default=True,
        verbose_name="Destiné à toute l'équipe"
    )
    type_message = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default='normal',
        verbose_name="Type de message"
    )
    titre = models.CharField(
        max_length=200,
        blank=True,
        default='',
        verbose_name="Titre ou Sujet"
    )
    contenu = models.TextField(verbose_name="Contenu du message")
    lu_par = models.ManyToManyField(
        Utilisateur,
        blank=True,
        related_name='messages_lus',
        verbose_name="Lu par"
    )
    date_envoi = models.DateTimeField(auto_now_add=True, verbose_name="Date d'envoi")

    class Meta:
        verbose_name = "Message Interne Boutique"
        verbose_name_plural = "Messages Internes Boutique"
        ordering = ['-date_envoi']

    def __str__(self):
        dest = "Équipe" if self.destine_a_tous else (self.destinataire.username if self.destinataire else "?")
        return f"[{self.boutique.nom}] {self.expediteur.username} -> {dest} : {self.contenu[:35]}"


