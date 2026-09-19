import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';
import { 
  Package, 
  Bell, 
  CreditCard, 
  History, 
  LogOut, 
  Store, 
  AlertTriangle,
  CheckCircle,
  Users,
  UserCheck,
  TrendingUp,
  MessageSquare,
  Building2,
  Clock
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout, isSubscribed, isGerant, isEmploye, notificationCount, unreadMessagesCount } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/connexion');
  };

  return (
    <>
      {/* HEADER DESKTOP */}
      <header className="desktop-nav">
        <div className="nav-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <NavLink to="/" className="brand-logo">
              <div style={{
                background: 'linear-gradient(135deg, #0f5441, #108e6c)',
                color: '#fff',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Store size={22} />
              </div>
              <span>BoutiqueStock</span>
              <span className="brand-badge">Togo</span>
            </NavLink>

            {user?.boutique && (
              <span style={{ 
                fontSize: '0.85rem', 
                color: 'var(--text-muted)',
                background: '#f1f5f9',
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: '500'
              }}>
                🏪 {user.boutique.nom || user.boutique_detail?.nom}
              </span>
            )}
          </div>

          <nav className="nav-links">
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
              <Package size={18} />
              <span>Stock & Produits</span>
            </NavLink>

            <NavLink to="/notifications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Bell size={18} />
              <span>Alertes</span>
              {notificationCount > 0 && (
                <span className="nav-counter">{notificationCount}</span>
              )}
            </NavLink>

            <NavLink to="/historique" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <History size={18} />
              <span>Mouvements</span>
            </NavLink>

            {/* Onglet Messagerie Interne (Gérant ↔ Employés) */}
            <NavLink to="/messages" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <MessageSquare size={18} />
              <span>Messages</span>
              {unreadMessagesCount > 0 && (
                <span className="nav-counter" style={{ background: '#059669' }}>{unreadMessagesCount}</span>
              )}
            </NavLink>

            {/* Onglet Finances (Réservé au Gérant) */}
            {isGerant && (
              <NavLink to="/finances" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <TrendingUp size={18} />
                <span>Finances</span>
              </NavLink>
            )}

            {/* Onglet Équipe (Réservé au Gérant) */}
            {isGerant && (
              <NavLink to="/employes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Users size={18} />
                <span>Équipe</span>
              </NavLink>
            )}

            {/* Onglet Statut Boutique (Réservé au Gérant) */}
            {isGerant && (
              <NavLink to="/abonnement" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Building2 size={18} />
                <span>Statut Boutique</span>
                {isSubscribed ? (
                  <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CheckCircle size={10} /> Active
                  </span>
                ) : (
                  <span className="badge" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.65rem', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={10} /> En attente
                  </span>
                )}
              </NavLink>
            )}
            {/* Onglet Mon Compte */}
            <NavLink to="/mon-compte" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <UserCheck size={18} />
              <span>Mon compte</span>
            </NavLink>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <NavLink 
              to="/mon-compte" 
              style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
              title="Accéder à mon compte"
            >
              <UserAvatar user={user} size={36} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--primary-900)', lineHeight: 1.2 }}>
                  {user?.nom_complet || user?.username}
                </div>
                <div style={{ fontSize: '0.73rem', color: isGerant ? 'var(--gold-600)' : 'var(--primary-700)', fontWeight: '600' }}>
                  {user?.role === 'gerant' ? '★ Gérant' : '🛒 Employé'}
                </div>
              </div>
            </NavLink>

            <button 
              onClick={handleLogout}
              className="btn btn-outline btn-sm"
              title="Déconnexion"
              style={{ padding: '8px' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* HEADER MOBILE (TOP BAR) */}
      <div className="mobile-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0f5441, #108e6c)',
            color: '#fff',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex'
          }}>
            <Store size={18} />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--primary-900)', lineHeight: 1.1 }}>
              BoutiqueStock
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {user?.boutique?.nom || user?.boutique_detail?.nom || 'Togo'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isGerant && (
            <NavLink to="/abonnement">
              {isSubscribed ? (
                <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '3px 7px' }}>
                  Active
                </span>
              ) : (
                <span className="badge" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.68rem', padding: '3px 7px' }}>
                  En attente
                </span>
              )}
            </NavLink>
          )}

          <NavLink to="/mon-compte" title="Mon compte" style={{ display: 'flex', alignItems: 'center' }}>
            <UserAvatar user={user} size={30} />
          </NavLink>

          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary-800)', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px' }}>
            {isGerant ? '👑 Gérant' : '👤 Employé'}
          </span>
          <button onClick={handleLogout} className="btn-icon" title="Déconnexion" style={{ padding: '6px' }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* BARRE MOBILE DU BAS (THUMB NAVIGATION) */}
      <nav className="mobile-bottom-nav">
        <NavLink to="/" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`} end>
          <Package size={20} />
          <span>Stock</span>
        </NavLink>

        <NavLink to="/notifications" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <Bell size={20} />
          <span>Alertes</span>
          {notificationCount > 0 && (
            <span className="nav-counter">{notificationCount}</span>
          )}
        </NavLink>

        <NavLink to="/historique" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <History size={20} />
          <span>Journal</span>
        </NavLink>

        <NavLink to="/messages" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <MessageSquare size={20} />
          <span>Messages</span>
          {unreadMessagesCount > 0 && (
            <span className="nav-counter" style={{ background: '#059669' }}>{unreadMessagesCount}</span>
          )}
        </NavLink>

        {isGerant && (
          <NavLink to="/finances" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
            <TrendingUp size={20} />
            <span>Finances</span>
          </NavLink>
        )}

        {isGerant && (
          <NavLink to="/employes" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
            <Users size={20} />
            <span>Équipe</span>
          </NavLink>
        )}

        {isGerant && (
          <NavLink to="/abonnement" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
            <Building2 size={20} />
            <span>Statut</span>
          </NavLink>
        )}
      </nav>
    </>
  );
};
