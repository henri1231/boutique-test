import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AdminNavbar } from '../components/AdminNavbar';
import { AdminMonCompteTab } from '../components/AdminMonCompteTab';
import { AdminAdministrateursTab } from '../components/AdminAdministrateursTab';
import { 
  Store, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Users, 
  Calendar, 
  ArrowRight, 
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  Building,
  Package,
  UserCheck,
  Clock
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const { isSuperAdmin, isAdministrateur } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get('tab');
  let activeTab = 'boutiques';
  if (rawTab === 'mon_compte') {
    activeTab = 'mon_compte';
  } else if (rawTab === 'administrateurs' && isSuperAdmin) {
    activeTab = 'administrateurs';
  }

  const setActiveTab = (tab) => {
    if (tab === 'boutiques') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('tab');
      setSearchParams(nextParams);
    } else {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', tab);
      setSearchParams(nextParams);
    }
  };

  const [boutiques, setBoutiques] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtreAbo, setFiltreAbo] = useState('tous'); // 'tous', 'actif', 'expire', 'suspendu'

  const chargerDonnees = useCallback(async () => {
    setLoading(true);
    try {
      const [resBoutiques, resStats] = await Promise.all([
        api.superAdmin.boutiques(),
        api.superAdmin.statistiques().catch(() => null)
      ]);
      setBoutiques(Array.isArray(resBoutiques) ? resBoutiques : (resBoutiques.results || []));
      if (resStats) setStats(resStats);
    } catch (err) {
      console.error("Erreur chargement console admin:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    chargerDonnees();
  }, [chargerDonnees]);

  // Filtrage local en temps réel
  const boutiquesFiltrees = useMemo(() => {
    return boutiques.filter((b) => {
      const matchRecherche = 
        !recherche ||
        b.nom.toLowerCase().includes(recherche.toLowerCase()) ||
        (b.adresse && b.adresse.toLowerCase().includes(recherche.toLowerCase())) ||
        (b.telephone && b.telephone.includes(recherche));

      if (!matchRecherche) return false;

      if (filtreAbo === 'actif') return b.compte_actif === true;
      if (filtreAbo === 'en_attente' || filtreAbo === 'expire' || filtreAbo === 'suspendu') return b.compte_actif === false;

      return true;
    });
  }, [boutiques, recherche, filtreAbo]);

  const nbActifs = useMemo(() => boutiques.filter(b => b.compte_actif === true).length, [boutiques]);
  const nbEnAttente = useMemo(() => boutiques.filter(b => b.compte_actif === false).length, [boutiques]);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      <AdminNavbar activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="admin-container">
        {/* BARRE D'ONGLETS ADMIN */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '14px',
          marginBottom: '28px',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('boutiques')}
            style={{
              background: activeTab === 'boutiques' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: activeTab === 'boutiques' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
              color: activeTab === 'boutiques' ? '#34d399' : '#94a3b8',
              padding: '9px 18px',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <Store size={18} />
            <span>{isAdministrateur ? 'Mes Boutiques' : 'Boutiques'} ({boutiques.length})</span>
          </button>

          {/* Onglet Administrateurs : Super-Admin uniquement */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('administrateurs')}
              style={{
                background: activeTab === 'administrateurs' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: activeTab === 'administrateurs' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                color: activeTab === 'administrateurs' ? '#34d399' : '#94a3b8',
                padding: '9px 18px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Users size={18} />
              <span>Administrateurs</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('mon_compte')}
            style={{
              background: activeTab === 'mon_compte' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: activeTab === 'mon_compte' ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)',
              color: activeTab === 'mon_compte' ? '#fbbf24' : '#94a3b8',
              padding: '9px 18px',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <UserCheck size={18} />
            <span>Mon compte</span>
          </button>
        </div>

        {activeTab === 'mon_compte' ? (
          <AdminMonCompteTab />
        ) : activeTab === 'administrateurs' && isSuperAdmin ? (
          <AdminAdministrateursTab toutesBoutiques={boutiques} />
        ) : (
          <>
        {/* EN-TÊTE DASHBOARD BOUTIQUES */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
                {isAdministrateur ? "Mes Boutiques Attribuées" : "Supervision des Boutiques"}
              </h1>
              <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
                {isAdministrateur ? "Accès Délégué" : "Plateforme Togo"}
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px', margin: 0 }}>
              {isAdministrateur 
                ? "Consultez, activez et gérez les boutiques qui vous ont été confiées" 
                : "Contrôle des accès marchands, validation des boutiques et gestion des comptes"}
            </p>
          </div>

          <button 
            onClick={chargerDonnees} 
            className="btn btn-outline btn-sm"
            style={{ borderColor: '#475569', color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Actualiser la liste"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Actualiser</span>
          </button>
        </div>

        {/* 4 COMPTEURS GLOBAUX (KPIS) */}
        <div className="admin-kpis-grid">
          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span>Total Boutiques Inscrites</span>
              <div className="admin-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                <Store size={20} />
              </div>
            </div>
            <div className="admin-kpi-value">{stats?.total_boutiques ?? boutiques.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
              Réseau national commerçant
            </div>
          </div>

          <div className="admin-kpi-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            <div className="admin-kpi-header">
              <span style={{ color: '#34d399' }}>Boutiques Actives & Validées</span>
              <div className="admin-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                <CheckCircle size={20} />
              </div>
            </div>
            <div className="admin-kpi-value" style={{ color: '#34d399' }}>
              {stats?.boutiques_actives ?? nbActifs}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
              Accès illimité aux stocks et ventes
            </div>
          </div>

          <div className="admin-kpi-card" style={{ borderColor: nbEnAttente > 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.1)' }}>
            <div className="admin-kpi-header">
              <span style={{ color: nbEnAttente > 0 ? '#fbbf24' : '#94a3b8' }}>En Attente d'Activation</span>
              <div className="admin-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                <Clock size={20} />
              </div>
            </div>
            <div className="admin-kpi-value" style={{ color: nbEnAttente > 0 ? '#fbbf24' : '#cbd5e1' }}>
              {stats?.boutiques_en_attente ?? (stats?.boutiques_suspendues ?? nbEnAttente)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
              À examiner et valider par l'admin
            </div>
          </div>

          <div className="admin-kpi-card" style={{ borderColor: 'rgba(56, 189, 248, 0.3)' }}>
            <div className="admin-kpi-header">
              <span style={{ color: '#38bdf8' }}>Comptes Utilisateurs</span>
              <div className="admin-kpi-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                <Users size={20} />
              </div>
            </div>
            <div className="admin-kpi-value" style={{ color: '#38bdf8' }}>
              {stats?.total_utilisateurs ?? boutiques.reduce((acc, b) => acc + (b.nb_employes || 0), 0)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
              Gérants et employés rattachés
            </div>
          </div>
        </div>

        {/* BARRE D'ACTION & RECHERCHE */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          padding: '16px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Champ de recherche */}
            <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '450px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Rechercher par nom de boutique, adresse, téléphone..."
                className="form-input"
                style={{
                  paddingLeft: '38px',
                  background: '#0f172a',
                  borderColor: '#334155',
                  color: '#ffffff'
                }}
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </div>

            {/* Filtres par statut */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setFiltreAbo('tous')}
                className={`btn btn-sm ${filtreAbo === 'tous' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                Toutes ({boutiques.length})
              </button>
              <button
                onClick={() => setFiltreAbo('actif')}
                className={`btn btn-sm ${filtreAbo === 'actif' ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.8rem', padding: '6px 12px', borderColor: '#10b981', color: filtreAbo === 'actif' ? '#ffffff' : '#34d399' }}
              >
                🟢 Boutiques Actives ({nbActifs})
              </button>
              <button
                onClick={() => setFiltreAbo('en_attente')}
                className={`btn btn-sm ${filtreAbo === 'en_attente' ? 'btn-gold' : 'btn-outline'}`}
                style={{ fontSize: '0.8rem', padding: '6px 12px', borderColor: '#f59e0b', color: filtreAbo === 'en_attente' ? '#ffffff' : '#fbbf24' }}
              >
                ⏳ En Attente ({nbEnAttente})
              </button>
            </div>
          </div>
        </div>

        {/* TABLEAU DES BOUTIQUES */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)'
        }}>
          {loading && boutiques.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <RefreshCw size={32} className="spin" style={{ margin: '0 auto 12px auto', color: '#60a5fa' }} />
              <p>Chargement des boutiques de la plateforme...</p>
            </div>
          ) : boutiquesFiltrees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <Store size={48} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <h3 style={{ color: '#e2e8f0', fontSize: '1.1rem', marginBottom: '6px' }}>Aucune boutique trouvée</h3>
              <p style={{ fontSize: '0.88rem' }}>
                {recherche ? "Aucune boutique ne correspond à votre recherche." : "Aucune boutique n'est inscrite pour le moment."}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Boutique</th>
                    <th>Adresse & Contact</th>
                    <th>Équipe</th>
                    <th>Articles</th>
                    <th>Statut d'Activation</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {boutiquesFiltrees.map((b) => {
                    const isActif = b.compte_actif === true;

                    return (
                      <tr key={b.id} style={{ opacity: isActif ? 1 : 0.85 }}>
                        {/* Nom Boutique */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              background: isActif ? 'rgba(5, 150, 105, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: isActif ? '#34d399' : '#fbbf24',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Building size={18} />
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '0.98rem', color: '#ffffff' }}>
                                {b.nom}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                                Inscrite le {new Date(b.date_creation).toLocaleDateString('fr-FR')}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Adresse & Contact */}
                        <td>
                          <div style={{ fontSize: '0.86rem', color: '#e2e8f0' }}>
                            {b.adresse || 'Lomé, Togo'}
                          </div>
                          {b.telephone && (
                            <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                              📞 {b.telephone}
                            </div>
                          )}
                        </td>

                        {/* Nombre employés */}
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.82rem' }}>
                            <Users size={14} style={{ color: '#93c5fd' }} />
                            <span>{b.nb_employes} membre(s)</span>
                          </div>
                        </td>

                        {/* Nombre produits */}
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <Package size={14} style={{ color: '#fbbf24' }} />
                            <span>{b.nb_produits || 0} articles</span>
                          </div>
                        </td>

                        {/* Statut Activation */}
                        <td>
                          {isActif ? (
                            <span className="badge badge-success" style={{ fontSize: '0.76rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <CheckCircle size={13} />
                              <span>Active & Validée</span>
                            </span>
                          ) : (
                            <span className="badge" style={{
                              background: 'rgba(245, 158, 11, 0.2)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              fontSize: '0.76rem',
                              padding: '5px 10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              <Clock size={13} />
                              <span>En attente d'activation</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => navigate(`/admin-plateforme/boutiques/${b.id}`)}
                            className="btn btn-outline btn-sm"
                            style={{
                              borderColor: isActif ? '#38bdf8' : '#fbbf24',
                              color: isActif ? '#38bdf8' : '#fbbf24',
                              background: isActif ? 'rgba(56, 189, 248, 0.08)' : 'rgba(245, 158, 11, 0.12)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.82rem',
                              fontWeight: isActif ? '500' : '700'
                            }}
                          >
                            <span>{isActif ? "Gérer" : "Examiner & Activer"}</span>
                            <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
        )}
      </main>
    </div>
  );
};
