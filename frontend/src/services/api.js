/**
 * Client API centralisé pour l'application BoutiqueStock Togo.
 * Gère l'authentification JWT et la communication avec l'API Django REST Framework.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Callback stub conservé pour compatibilité éventuelle
export const setOnSubscriptionRequired = () => {};

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('boutique_access_token');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, config);

    // Gestion du token expiré (401)
    if (response.status === 401 && !endpoint.includes('/auth/connexion/')) {
      localStorage.removeItem('boutique_access_token');
      localStorage.removeItem('boutique_user');
      window.dispatchEvent(new Event('auth_logout'));
      const err = new Error("Session expirée. Veuillez vous reconnecter.");
      err.status = 401;
      throw err;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.erreur || errorData.detail || Object.values(errorData)[0] || `Erreur ${response.status}`;
      const err = new Error(typeof message === 'string' ? message : JSON.stringify(message));
      err.status = response.status;
      err.data = errorData;
      throw err;
    }

    // Si status 204 No Content
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const api = {
  // Auth & Employés
  auth: {
    connexion: (username, password) =>
      request('/auth/connexion/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    inscription: (data) =>
      request('/auth/inscription/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    profil: () => request('/auth/profil/'),
    updateProfil: (data) =>
      request('/auth/profil/', {
        method: 'PATCH',
        body: data instanceof FormData ? data : JSON.stringify(data),
      }),
    getEmployes: () => request('/auth/employes/'),
    creerEmploye: (data) =>
      request('/auth/employes/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Produits & Stock
  produits: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/produits/${query ? `?${query}` : ''}`);
    },
    create: (data) =>
      request('/produits/', {
        method: 'POST',
        body: data instanceof FormData ? data : JSON.stringify(data),
      }),
    update: (id, data) =>
      request(`/produits/${id}/`, {
        method: 'PATCH',
        body: data instanceof FormData ? data : JSON.stringify(data),
      }),
    delete: (id) =>
      request(`/produits/${id}/`, {
        method: 'DELETE',
      }),
    achat: (id, data) =>
      request(`/produits/${id}/achat/`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    vente: (id, data) =>
      request(`/produits/${id}/vente/`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Ventes & Reçus
  ventes: {
    getRecu: (id) => request(`/ventes/${id}/recu/`),
  },

  // Notifications & Alertes Rupture
  notifications: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/notifications/${query ? `?${query}` : ''}`);
    },
    marquerLu: (id) =>
      request(`/notifications/${id}/lu/`, {
        method: 'PUT',
      }),
    toutMarquerLu: () =>
      request('/notifications/tout-marquer-lu/', {
        method: 'PUT',
      }),
  },

  // Statut d'activation de la Boutique
  abonnement: {
    getStatut: () => request('/abonnement/statut/'),
  },

  // Finances & Rentabilité (Gérant)
  finances: {
    getResume: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/finances/resume/${query ? `?${query}` : ''}`);
    },
  },

  // Statistiques & Historique
  statistiques: {
    get: () => request('/statistiques/'),
  },
  historique: {
    get: () => request('/historique/'),
  },

  // Super-Administrateur Plateforme
  superAdmin: {
    connexion: (username, password) =>
      request('/admin-plateforme/connexion/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    statistiques: () => request('/admin-plateforme/statistiques/'),
    boutiques: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/admin-plateforme/boutiques/${query ? `?${query}` : ''}`);
    },
    boutiqueDetail: (id) => request(`/admin-plateforme/boutiques/${id}/`),
    updateBoutique: (id, data) =>
      request(`/admin-plateforme/boutiques/${id}/`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    toggleStatutBoutique: (id, motif = '') =>
      request(`/admin-plateforme/boutiques/${id}/toggle-statut/`, {
        method: 'POST',
        body: JSON.stringify({ motif }),
      }),
    updateUtilisateur: (id, data) =>
      request(`/admin-plateforme/utilisateurs/${id}/`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    journalActions: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/admin-plateforme/journal/${query ? `?${query}` : ''}`);
    },
    monCompte: () => request('/superadmin/mon-compte/'),
    updateMonCompte: (data) =>
      request('/superadmin/mon-compte/', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    administrateurs: {
      list: () => request('/admin-plateforme/administrateurs/'),
      create: (data) =>
        request('/admin-plateforme/administrateurs/', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id, data) =>
        request(`/admin-plateforme/administrateurs/${id}/`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      delete: (id) =>
        request(`/admin-plateforme/administrateurs/${id}/`, {
          method: 'DELETE',
        }),
    },
  },

  // Communication interne boutique (Gérant ↔ Employés)
  communication: {
    getMessages: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/communication/messages/${query ? `?${query}` : ''}`);
    },
    envoyerMessage: (data) =>
      request('/communication/messages/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    marquerLu: (id) =>
      request(`/communication/messages/${id}/marquer-lu/`, {
        method: 'POST',
      }),
    toutMarquerLu: () =>
      request('/communication/messages/tout-marquer-lu/', {
        method: 'POST',
      }),
    getNonLus: () => request('/communication/messages/non-lus/'),
    supprimerMessage: (id) =>
      request(`/communication/messages/${id}/`, {
        method: 'DELETE',
      }),
  },
};
