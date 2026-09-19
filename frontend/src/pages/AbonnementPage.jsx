import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Clock, 
  Store, 
  User, 
  MapPin, 
  Phone, 
  RefreshCw, 
  AlertOctagon,
  CheckCircle2,
  Info,
  Building2,
  Shield
} from 'lucide-react';

export const AbonnementPage = () => {
  const { isSubscribed, refreshSubscription, refreshUser, user, isEmploye } = useAuth();
  const [statutData, setStatutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const chargerStatut = useCallback(async () => {
    if (isEmploye) return;
    try {
      const data = await api.abonnement.getStatut();
      setStatutData(data);
      await refreshSubscription();
      await refreshUser();
    } catch (err) {
      console.error("Erreur statut boutique:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshSubscription, refreshUser, isEmploye]);

  useEffect(() => {
    chargerStatut();
  }, [chargerStatut]);

  const handleRefresh = () => {
    setRefreshing(true);
    chargerStatut();
  };

  if (isEmploye) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <AlertOctagon size={48} style={{ color: 'var(--danger-500)', margin: '0 auto 12px auto' }} />
        <h2 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>Accès réservé au Gérant</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '450px', margin: '0 auto' }}>
          La consultation du statut administratif de la boutique est strictement réservée au gérant.
        </p>
      </div>
    );
  }

  const boutique = user?.boutique_detail || user?.boutique || {};
  const compteActif = statutData?.compte_actif ?? (boutique?.compte_actif ?? isSubscribed);

  return (
    <div className="app-container" style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px' }}>
      {/* EN-TÊTE DE PAGE */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary-900)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={28} style={{ color: 'var(--gold-500)' }} />
            <span>Statut de la Boutique</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Validation et statut d'activation par l'administrateur de la plateforme
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="btn btn-outline btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? "Actualisation..." : "Actualiser"}</span>
        </button>
      </div>

      {/* CARTE HERO DE STATUT */}
      <div style={{
        background: compteActif 
          ? 'linear-gradient(135deg, #064e3b 0%, #0d5f47 60%, #047857 100%)'
          : 'linear-gradient(135deg, #78350f 0%, #92400e 60%, #b45309 100%)',
        color: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 24px',
        boxShadow: 'var(--shadow-lg)',
        marginBottom: '28px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: compteActif ? 'rgba(34, 197, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)',
            border: `2px solid ${compteActif ? '#34d399' : '#fde68a'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {compteActif ? (
              <ShieldCheck size={36} style={{ color: '#34d399' }} />
            ) : (
              <Clock size={36} style={{ color: '#fde68a' }} />
            )}
          </div>

          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{
                background: compteActif ? '#22c55e' : '#f59e0b',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: '800',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                {compteActif ? "Boutique Active" : "En attente d'activation"}
              </span>

              <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                {boutique.nom || "Votre boutique"}
              </span>
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '8px', color: '#ffffff' }}>
              {compteActif 
                ? "Accès complet activé et approuvé" 
                : "Validation en cours par un administrateur"}
            </h2>

            <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.5, maxWidth: '640px' }}>
              {compteActif
                ? "Votre boutique a été formellement validée par l'administrateur de la plateforme. Vous pouvez gérer vos stocks, enregistrer des ventes, imprimer des reçus et communiquer avec vos employés sans aucune restriction."
                : "Votre boutique est actuellement examinée par l'administrateur de la plateforme. Dès que l'administrateur valide votre compte, l'ensemble des modules sera immédiatement débloqué. Aucun paiement mobile n'est requis."}
            </p>
          </div>
        </div>
      </div>

      {/* GRILLE D'INFORMATIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* CARTE 1 : COORDONNÉES BOUTIQUE */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary-900)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Store size={18} style={{ color: 'var(--primary-700)' }} />
            <span>Coordonnées de la boutique</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Nom :</span>
              <strong style={{ color: 'var(--text-main)' }}>{boutique.nom || "Non renseigné"}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Téléphone :</span>
              <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={14} style={{ color: 'var(--text-light)' }} />
                {boutique.telephone || "Non renseigné"}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Adresse :</span>
              <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} style={{ color: 'var(--text-light)' }} />
                {boutique.adresse || "Lomé, Togo"}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Validation :</span>
              <span style={{
                color: compteActif ? 'var(--success-700)' : '#b45309',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {compteActif ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                {compteActif ? "Approuvée" : "En cours d'examen"}
              </span>
            </div>
          </div>
        </div>

        {/* CARTE 2 : COMPTE GÉRANT */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary-900)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} style={{ color: 'var(--primary-700)' }} />
            <span>Compte du Gérant</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Identifiant :</span>
              <strong style={{ color: 'var(--text-main)' }}>{user?.username}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Nom complet :</span>
              <span style={{ color: 'var(--text-main)' }}>{user?.nom_complet || user?.username}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Rôle :</span>
              <span style={{
                background: '#f0fdf4',
                color: '#166534',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700'
              }}>
                Gérant Propriétaire
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Mode d'accès :</span>
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Permanent (Sans frais)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BLOC INFORMATIF SUR LE PROCESSUS D'ACTIVATION */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px'
      }}>
        <Info size={22} style={{ color: 'var(--primary-700)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
          <h4 style={{ fontWeight: '700', color: 'var(--primary-900)', marginBottom: '4px' }}>
            Comment fonctionne l'activation des boutiques ?
          </h4>
          <p style={{ margin: '0 0 8px 0' }}>
            Pour garantir un environnement commercial fiable et sécurisé, chaque boutique enregistrée est vérifiée par les administrateurs de la plateforme avant sa mise en service.
          </p>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Une fois activée, votre boutique le reste de manière permanente, sans aucun abonnement payant TMoney ou Flooz. En cas de besoin ou de question urgente, vous pouvez contacter l'administration de la plateforme.
          </p>
        </div>
      </div>
    </div>
  );
};
