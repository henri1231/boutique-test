import React, { useState } from 'react';

/**
 * Composant Avatar utilisateur réutilisable.
 * Affiche la photo de profil si présente, ou bascule de façon infaillible
 * sur un badge circulaire aux initiales de l'utilisateur (jamais d'image cassée).
 */
export const UserAvatar = ({ user, size = 38, style = {}, className = '', onClick }) => {
  const [imageError, setImageError] = useState(false);

  // Extraire les initiales intelligemment
  const obtenirInitiales = (u) => {
    if (!u) return '?';
    const nom = (u.nom_complet || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '').trim();
    if (!nom) return '?';

    const parts = nom.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nom.substring(0, 2).toUpperCase();
  };

  const initiales = obtenirInitiales(user);
  const aUnePhoto = Boolean(user?.photo_profil_url) && !imageError;

  return (
    <div
      onClick={onClick}
      className={`user-avatar-wrapper ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 2px 5px rgba(0,0,0,0.12)',
        border: '2px solid rgba(255,255,255,0.85)',
        background: 'linear-gradient(135deg, #0f5441, #108e6c)',
        color: '#ffffff',
        fontWeight: '700',
        fontSize: `${Math.max(11, Math.round(size * 0.38))}px`,
        letterSpacing: '-0.02em',
        userSelect: 'none',
        flexShrink: 0,
        position: 'relative',
        ...style
      }}
      title={user?.nom_complet || user?.username || 'Utilisateur'}
    >
      {aUnePhoto ? (
        <img
          src={user.photo_profil_url}
          alt={user?.nom_complet || user?.username || 'Avatar'}
          onError={() => setImageError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
        />
      ) : (
        <span style={{ lineHeight: 1 }}>{initiales}</span>
      )}
    </div>
  );
};
