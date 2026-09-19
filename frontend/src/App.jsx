import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { StockPage } from './pages/StockPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AbonnementPage } from './pages/AbonnementPage';
import { HistoriquePage } from './pages/HistoriquePage';
import { EmployesPage } from './pages/EmployesPage';
import { FinancesPage } from './pages/FinancesPage';
import { AuthPage } from './pages/AuthPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminBoutiqueDetailPage } from './pages/AdminBoutiqueDetailPage';
import { MonComptePage } from './pages/MonComptePage';
import { MessagesPage } from './pages/MessagesPage';

// Composant pour protéger les routes privées des boutiques
const ProtectedRoute = ({ children }) => {
  const { user, loading, isSuperAdmin, isAdministrateur } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        color: 'var(--primary-800)',
        fontSize: '1.1rem',
        fontWeight: '700'
      }}>
        Chargement de BoutiqueStock Togo...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/connexion" replace />;
  }

  // Si c'est le super-admin ou un administrateur, on le redirige vers sa console d'administration
  if (isSuperAdmin || isAdministrateur) {
    return <Navigate to="/admin-plateforme" replace />;
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
};

// Composant pour protéger les routes du Super-Administrateur
const AdminProtectedRoute = ({ children }) => {
  const { user, loading, isSuperAdmin, isAdministrateur } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B132B',
        color: '#E0E7FF',
        fontSize: '1.1rem',
        fontWeight: '700'
      }}>
        Chargement de la Console Administration...
      </div>
    );
  }

  // Non authentifié -> écran de connexion dédié admin
  if (!user) {
    return <Navigate to="/admin-plateforme/connexion" replace />;
  }

  // Authentifié mais ni super-admin ni administrateur -> Erreur 403 avec explication claire
  if (!isSuperAdmin && !isAdministrateur) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B132B',
        color: '#FFFFFF',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '1.25rem',
          padding: '2.5rem',
          maxWidth: '520px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🛑</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.75rem', color: '#F87171' }}>
            Erreur 403 - Accès Refusé
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            Cet espace de supervision est strictement réservé aux <strong>Administrateurs</strong> et au <strong>Super-Administrateur</strong> de la plateforme. Votre compte actuel (<strong>{user.username}</strong>) n'a pas les privilèges requis.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              background: '#0D9488',
              color: '#FFFFFF',
              fontWeight: '700',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              transition: 'background 0.2s'
            }}
          >
            Retourner à ma boutique
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ==================== PORTAIL BOUTIQUE ==================== */}
          {/* Routes Publiques Boutique */}
          <Route path="/connexion" element={<AuthPage initialTab="connexion" />} />
          <Route path="/inscription" element={<AuthPage initialTab="inscription" />} />

          {/* Routes Privées Boutique */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <StockPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/abonnement"
            element={
              <ProtectedRoute>
                <AbonnementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/historique"
            element={
              <ProtectedRoute>
                <HistoriquePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finances"
            element={
              <ProtectedRoute>
                <FinancesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employes"
            element={
              <ProtectedRoute>
                <EmployesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mon-compte"
            element={
              <ProtectedRoute>
                <MonComptePage />
              </ProtectedRoute>
            }
          />

          {/* ==================== PORTAIL SUPER-ADMIN ==================== */}
          {/* Connexion dédiée Super-Admin */}
          <Route path="/admin-plateforme/connexion" element={<AdminLoginPage />} />

          {/* Console Super-Admin protégée */}
          <Route
            path="/admin-plateforme"
            element={
              <AdminProtectedRoute>
                <AdminDashboardPage />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin-plateforme/boutiques/:id"
            element={
              <AdminProtectedRoute>
                <AdminBoutiqueDetailPage />
              </AdminProtectedRoute>
            }
          />

          {/* Redirection fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
