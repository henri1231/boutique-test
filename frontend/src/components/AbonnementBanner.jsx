import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, ArrowRight } from 'lucide-react';

export const AbonnementBanner = () => {
  const { isSubscribed, user } = useAuth();
  const navigate = useNavigate();

  // Si la boutique est active ou utilisateur admin/super-admin, ne rien afficher
  if (isSubscribed || user?.role === 'super_admin' || user?.role === 'administrateur') {
    return null;
  }

  const allerVersStatut = () => {
    navigate('/abonnement');
  };

  return (
    <div className="subscription-banner" style={{
      background: 'linear-gradient(135deg, #78350f, #92400e)',
      borderBottom: '2px solid #f59e0b',
      color: '#ffffff'
    }}>
      <div className="subscription-banner-text">
        <Clock size={26} style={{ flexShrink: 0, marginTop: '2px', color: '#fef3c7' }} />
        <div>
          <h4 style={{ color: '#ffffff' }}>Boutique en attente d'activation par l'administrateur</h4>
          <p style={{ color: '#fef3c7' }}>
            Votre compte boutique est actuellement en attente de validation par l'administrateur de la plateforme.
            Les opérations de gestion de stock seront disponibles dès son activation.
          </p>
        </div>
      </div>
      <button 
        onClick={allerVersStatut}
        className="btn btn-gold btn-sm"
        style={{ fontWeight: '700', padding: '10px 16px' }}
      >
        <span>Consulter le statut</span>
        <ArrowRight size={16} />
      </button>
    </div>
  );
};
