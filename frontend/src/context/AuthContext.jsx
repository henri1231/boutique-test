import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('boutique_access_token'));
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Charger le statut d'abonnement / activation
  const refreshSubscription = useCallback(async () => {
    try {
      const data = await api.abonnement.getStatut();
      setSubscription(data.abonnement);
      return data.abonnement;
    } catch (err) {
      console.error("Erreur chargement statut boutique:", err);
      return null;
    }
  }, []);

  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Charger le profil complet, notifications et messages non lus
  const refreshUser = useCallback(async () => {
    try {
      const profil = await api.auth.profil();
      setUser(profil);
      if (profil.boutique_detail) {
        setSubscription(profil.boutique_detail.statut_abonnement);
      }
      // Compter les notifications non lues
      try {
        const notifs = await api.notifications.list({ non_lus: 'true' });
        setNotificationCount(Array.isArray(notifs) ? notifs.length : (notifs.results ? notifs.results.length : 0));
      } catch (e) {
        // ignorer si erreur non bloquante
      }

      // Compter les messages internes non lus
      if (profil.boutique) {
        try {
          const resMsg = await api.communication.getNonLus();
          setUnreadMessagesCount(resMsg?.non_lus || 0);
        } catch (e) {
          // ignorer si erreur non bloquante
        }
      }
    } catch (err) {
      if (err.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }

    const handleLogoutEvent = () => {
      setUser(null);
      setToken(null);
      setSubscription(null);
    };

    window.addEventListener('auth_logout', handleLogoutEvent);
    return () => window.removeEventListener('auth_logout', handleLogoutEvent);
  }, [token, refreshUser]);

  const login = async (username, password) => {
    const res = await api.auth.connexion(username, password);
    localStorage.setItem('boutique_access_token', res.access);
    if (res.refresh) {
      localStorage.setItem('boutique_refresh_token', res.refresh);
    }
    setToken(res.access);
    setUser(res.utilisateur);
    if (res.utilisateur?.boutique?.statut_abonnement) {
      setSubscription(res.utilisateur.boutique.statut_abonnement);
    }
    return res;
  };

  const register = async (data) => {
    const res = await api.auth.inscription(data);
    if (res.tokens?.access) {
      localStorage.setItem('boutique_access_token', res.tokens.access);
      if (res.tokens.refresh) {
        localStorage.setItem('boutique_refresh_token', res.tokens.refresh);
      }
      setToken(res.tokens.access);
      setUser(res.utilisateur);
      if (res.utilisateur?.boutique?.statut_abonnement) {
        setSubscription(res.utilisateur.boutique.statut_abonnement);
      }
    }
    return res;
  };

  const adminLogin = async (username, password) => {
    const res = await api.superAdmin.connexion(username, password);
    localStorage.setItem('boutique_access_token', res.access);
    if (res.refresh) {
      localStorage.setItem('boutique_refresh_token', res.refresh);
    }
    setToken(res.access);
    setUser(res.utilisateur);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('boutique_access_token');
    localStorage.removeItem('boutique_refresh_token');
    setToken(null);
    setUser(null);
    setSubscription(null);
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdministrateur = user?.role === 'administrateur';
  const isGerant = user ? (user.role === 'gerant' || user.est_gerant === true) : false;
  const isEmploye = user ? (user.role === 'employe' || user.role === 'vendeur') : false;

  const value = {
    user,
    token,
    subscription,
    isSubscribed: user?.boutique?.compte_actif === true || user?.boutique_detail?.compte_actif === true || subscription?.actif === true,
    isBoutiqueActive: user?.boutique?.compte_actif === true || user?.boutique_detail?.compte_actif === true || subscription?.actif === true,
    isSuperAdmin,
    isAdministrateur,
    isGerant,
    isEmploye,
    loading,
    showSubscriptionModal,
    setShowSubscriptionModal,
    notificationCount,
    setNotificationCount,
    unreadMessagesCount,
    setUnreadMessagesCount,
    login,
    adminLogin,
    register,
    logout,
    refreshSubscription,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé au sein d'un AuthProvider");
  }
  return context;
};
