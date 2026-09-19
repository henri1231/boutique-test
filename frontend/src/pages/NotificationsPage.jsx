import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ModalAchat } from '../components/ModalAchat';
import { 
  Bell, 
  AlertTriangle, 
  CheckCheck, 
  PlusCircle, 
  Clock, 
  ShieldCheck, 
  Info,
  RefreshCw
} from 'lucide-react';

export const NotificationsPage = () => {
  const { setNotificationCount } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtreNonLus, setFiltreNonLus] = useState(false);
  const [produitPourAchat, setProduitPourAchat] = useState(null);

  const chargerNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = filtreNonLus ? { non_lus: 'true' } : {};
      const data = await api.notifications.list(params);
      const list = Array.isArray(data) ? data : (data.results || []);
      setNotifications(list);

      // Mettre à jour le compteur global de non lus
      const nonLus = list.filter((n) => !n.lu).length;
      setNotificationCount(nonLus);
    } catch (err) {
      console.error("Erreur chargement notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [filtreNonLus, setNotificationCount]);

  useEffect(() => {
    chargerNotifications();
  }, [chargerNotifications]);

  const handleMarquerLu = async (id) => {
    try {
      await api.notifications.marquerLu(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lu: true } : n))
      );
      setNotificationCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Erreur marquer lu:", err);
    }
  };

  const handleToutMarquerLu = async () => {
    try {
      await api.notifications.toutMarquerLu();
      setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
      setNotificationCount(0);
    } catch (err) {
      console.error("Erreur tout marquer lu:", err);
    }
  };

  const handleReapprovisionner = async (notif) => {
    if (notif.produit) {
      try {
        const prod = await api.produits.list();
        const found = (Array.isArray(prod) ? prod : prod.results || []).find((p) => p.id === notif.produit);
        if (found) {
          setProduitPourAchat(found);
        }
      } catch (err) {
        console.error("Erreur récupération produit:", err);
      }
    }
  };

  const nbNonLus = notifications.filter((n) => !n.lu).length;

  return (
    <div className="app-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">
            <Bell size={28} style={{ color: 'var(--danger-500)' }} />
            <span>Alertes & Notifications</span>
          </h1>
          <p className="page-subtitle">
            Rappels automatiques de réapprovisionnement et alertes de stock
          </p>
        </div>

        {nbNonLus > 0 && (
          <button onClick={handleToutMarquerLu} className="btn btn-outline btn-sm">
            <CheckCheck size={16} />
            <span>Tout marquer comme lu</span>
          </button>
        )}
      </div>

      {/* Onglets de filtrage */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
        <button
          onClick={() => setFiltreNonLus(false)}
          className={`btn btn-sm ${!filtreNonLus ? 'btn-primary' : 'btn-outline'}`}
        >
          Toutes ({notifications.length})
        </button>
        <button
          onClick={() => setFiltreNonLus(true)}
          className={`btn btn-sm ${filtreNonLus ? 'btn-danger' : 'btn-outline'}`}
        >
          Non lues ({nbNonLus})
        </button>
        <button 
          onClick={chargerNotifications}
          className="btn btn-outline btn-sm"
          style={{ marginLeft: 'auto' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* LISTE DES NOTIFICATIONS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="spin" style={{ margin: '0 auto 12px auto' }} />
          <p>Chargement des alertes...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <ShieldCheck size={48} style={{ color: 'var(--success-500)', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '4px' }}>
            Aucune alerte en attente
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Tous vos produits sont à des niveaux de stock suffisants ou toutes les alertes ont été traitées.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((n) => {
            const isRupture = n.type === 'rupture_stock';
            const isAbonnement = n.type === 'abonnement';

            return (
              <div 
                key={n.id} 
                className="card"
                style={{
                  borderLeft: `4px solid ${
                    !n.lu ? (isRupture ? 'var(--danger-500)' : 'var(--gold-500)') : 'var(--surface-border)'
                  }`,
                  background: !n.lu ? '#fffbfb' : '#ffffff',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: isRupture ? '#fee2e2' : '#fef3c7',
                      color: isRupture ? '#dc2626' : '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {isRupture ? <AlertTriangle size={20} /> : <Info size={20} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span className={`badge ${isRupture ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                          {isRupture ? 'Rupture Proche' : isAbonnement ? 'Abonnement' : 'Information'}
                        </span>
                        {!n.lu && (
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger-500)' }} />
                        )}
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {n.date}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.94rem', color: 'var(--text-main)', lineHeight: 1.4, fontWeight: !n.lu ? '600' : 'normal' }}>
                        {n.message}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {!n.lu && (
                      <button
                        onClick={() => handleMarquerLu(n.id)}
                        className="btn btn-outline btn-sm"
                        title="Marquer comme lu"
                        style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                      >
                        <CheckCheck size={14} />
                        <span>Vu</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* ACTION DIRECTE DE RÉAPPROVISIONNEMENT */}
                {isRupture && n.produit && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    paddingTop: '8px',
                    borderTop: '1px dashed var(--surface-border)'
                  }}>
                    <button
                      onClick={() => handleReapprovisionner(n)}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      <PlusCircle size={14} />
                      <span>Réapprovisionner '{n.produit_nom}'</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal d'approvisionnement rapide */}
      {produitPourAchat && (
        <ModalAchat
          produit={produitPourAchat}
          onClose={() => setProduitPourAchat(null)}
          onSuccess={() => {
            chargerNotifications();
          }}
        />
      )}
    </div>
  );
};
