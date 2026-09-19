import datetime
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed


class CustomJWTAuthentication(JWTAuthentication):
    """
    Authentification JWT avec vérification d'invalidation de token.
    Si le mot de passe d'un utilisateur a été modifié (date_modification_mdp),
    tous les tokens JWT émis avant cette date sont automatiquement invalidés (401).
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        # Vérification si le mot de passe a été modifié après l'émission du token
        date_modif = getattr(user, 'date_modification_mdp', None)
        if date_modif:
            iat = validated_token.get('iat')
            if iat:
                token_issued_at = datetime.datetime.fromtimestamp(iat, tz=datetime.timezone.utc)
                # Tolérance de 2 secondes pour éviter les micro-décalages d'horloge à l'émission
                if token_issued_at < date_modif - datetime.timedelta(seconds=2):
                    raise AuthenticationFailed("Votre mot de passe a été modifié. Veuillez vous reconnecter.")

        return user
