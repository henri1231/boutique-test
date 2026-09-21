import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';
import { 
  ShieldCheck, 
  Store, 
  LogOut, 
  Activity, 
  Layers,
  Crown,
  Users
} from 'lucide-react';

export const AdminNavbar = ({ activeTab = 'boutiques', onSelectTab }) => {
  const { user, logout, isSuperAdmin, isAdministrateur } = useAuth();
  const navigate = useNavigate();

  const handleTabClick = (tab) => {
    if (onSelectTab) {
      onSelectTab(tab);
    } else {
      navigate(`/admin-plateforme?tab=${tab}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin-plateforme/connexion');
  };

  return (
    <header className="admin-nav">
      <div className="admin-nav-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            type="button"
            onClick={() => handleTabClick('boutiques')} 
            className="admin-brand-logo"
            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #064e3b, #047857)',
              color: '#fbbf24',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: '800', fontSize: '1.2rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
                  BoutiqueStock
                </span>
                <span className="badge badge-gold" style={{ fontSize: '0.65rem', padding: '2px 6px', fontWeight: '800' }}>
                  {isSuperAdmin ? 'CONSOLE SUPER-ADMIN' : 'CONSOLE ADMIN'}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#93c5fd', marginTop: '1px' }}>
                {isSuperAdmin ? 'Supervision Plateforme Togo' : 'Gestion de mes boutiques confiées'}
              </div>
            </div>
          </button>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
            <button 
              type="button"
              onClick={() => handleTabClick('boutiques')}
              className={`admin-nav-link ${activeTab === 'boutiques' ? 'active' : ''}`}
              style={{ background: activeTab === 'boutiques' ? 'rgba(16, 185, 129, 0.15)' : 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
            >
              <Store size={17} />
              <span>Boutiques</span>
            </button>

            {/* Onglet Administrateurs : STRICTEMENT réservé au Super-Administrateur */}
            {isSuperAdmin && (
              <button 
                type="button"
                onClick={() => handleTabClick('administrateurs')}
                className={`admin-nav-link ${activeTab === 'administrateurs' ? 'active' : ''}`}
                style={{ background: activeTab === 'administrateurs' ? 'rgba(16, 185, 129, 0.15)' : 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
              >
                <Users size={17} />
                <span>Administrateurs</span>
              </button>
            )}

            <button 
              type="button"
              onClick={() => handleTabClick('mon_compte')}
              className={`admin-nav-link ${activeTab === 'mon_compte' ? 'active' : ''}`}
              style={{ background: activeTab === 'mon_compte' ? 'rgba(16, 185, 129, 0.15)' : 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
            >
              <Layers size={17} />
              <span>Mon compte</span>
            </button>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserAvatar 
              user={user} 
              size={36} 
              style={{ border: '2px solid rgba(251, 191, 36, 0.5)' }} 
              onClick={() => handleTabClick('mon_compte')} 
            />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                {isSuperAdmin ? (
                  <Crown size={15} style={{ color: '#fbbf24' }} />
                ) : (
                  <ShieldCheck size={15} style={{ color: '#34d399' }} />
                )}
                <span>{user?.nom_complet || user?.username || 'Admin'}</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: isSuperAdmin ? '#fbbf24' : '#94a3b8' }}>
                {isSuperAdmin ? 'Super-Administrateur' : 'Administrateur'}
              </div>
            </div>
          </div>

          {/* BOUTON DIRECT "MON COMPTE" PRÈS DE DÉCONNEXION */}
          <button 
            type="button"
            onClick={() => handleTabClick('mon_compte')}
            className={`btn btn-sm ${activeTab === 'mon_compte' ? 'btn-gold' : 'btn-outline'}`}
            title="Accéder à Mon Compte"
            style={{ 
              borderColor: activeTab === 'mon_compte' ? '#fbbf24' : '#475569', 
              color: activeTab === 'mon_compte' ? '#09121d' : '#f1f5f9',
              background: activeTab === 'mon_compte' ? '#fbbf24' : 'rgba(255,255,255,0.06)',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={16} />
            <span>Mon compte</span>
          </button>

          <button 
            onClick={handleLogout}
            className="btn btn-outline btn-sm"
            title="Déconnexion"
            style={{ 
              borderColor: '#475569', 
              color: '#f1f5f9',
              background: 'rgba(255,255,255,0.06)',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={16} />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
};

