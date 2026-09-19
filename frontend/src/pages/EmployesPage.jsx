import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/UserAvatar';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ShieldCheck, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  MessageSquare
} from 'lucide-react';

export const EmployesPage = () => {
  const { user, isGerant } = useAuth();
  const [employes, setEmployes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Champs formulaire
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telephone, setTelephone] = useState('');

  const chargerEmployes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.auth.getEmployes();
      setEmployes(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error("Erreur chargement employés:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isGerant) {
      chargerEmployes();
    }
  }, [isGerant, chargerEmployes]);

  const handleCreerEmploye = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErreur("L'identifiant et le mot de passe sont obligatoires.");
      return;
    }

    setSubmitting(true);
    setErreur('');
    setSucces('');

    try {
      const res = await api.auth.creerEmploye({
        username: username.trim(),
        email: email.trim(),
        password: password,
        telephone: telephone.trim(),
      });

      setSucces(`Compte employé '${res.employe?.username || username}' créé avec succès !`);
      setUsername('');
      setEmail('');
      setPassword('');
      setTelephone('');
      setShowForm(false);
      chargerEmployes();
    } catch (err) {
      setErreur(err.message || "Erreur lors de la création du compte employé.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isGerant) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <AlertTriangle size={48} style={{ color: 'var(--danger-500)', margin: '0 auto 12px auto' }} />
        <h2 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>Accès réservé au Gérant</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Seul le gérant de la boutique a l'autorisation de gérer les comptes de l'équipe.
        </p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* HEADER DE PAGE */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">
            <Users size={28} style={{ color: 'var(--primary-700)' }} />
            <span>Gestion de l'Équipe</span>
          </h1>
          <p className="page-subtitle">
            Comptes employés rattachés à : <strong>{user?.boutique?.nom || user?.boutique_detail?.nom || 'Ma Boutique'}</strong>
          </p>
        </div>

        <button 
          onClick={() => setShowForm(!showForm)} 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <UserPlus size={18} />
          <span>{showForm ? "Fermer le formulaire" : "Créer un compte Employé"}</span>
        </button>
      </div>

      {/* MESSAGES DE SUCCÈS OU D'ERREUR */}
      {succes && (
        <div style={{
          background: 'var(--primary-50)',
          color: 'var(--primary-900)',
          border: '1px solid var(--primary-200)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          fontWeight: '600'
        }}>
          <CheckCircle size={20} style={{ color: 'var(--primary-700)' }} />
          <span>{succes}</span>
        </div>
      )}

      {/* FORMULAIRE D'AJOUT D'EMPLOYÉ */}
      {showForm && (
        <div className="card animate-slide-up" style={{ marginBottom: '24px', padding: '24px', border: '1px solid var(--primary-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{
              background: 'var(--primary-100)',
              color: 'var(--primary-800)',
              padding: '8px',
              borderRadius: '8px'
            }}>
              <UserPlus size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--primary-900)' }}>
                Nouveau compte employé (Vendeur / Caissier)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                L'employé aura accès aux ventes (−), aux entrées de stock (+) et aux alertes de rupture.
              </p>
            </div>
          </div>

          {erreur && (
            <div style={{
              background: 'var(--danger-50)',
              color: 'var(--danger-700)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              fontSize: '0.88rem',
              border: '1px solid var(--danger-100)'
            }}>
              {erreur}
            </div>
          )}

          <form onSubmit={handleCreerEmploye}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  <User size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Identifiant de connexion *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: koffi_vendeur"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Mail size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Adresse email
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Ex: koffi@boutique.tg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Lock size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Mot de passe provisoire *
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Phone size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Téléphone (Togo)
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Ex: 90123456"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                />
              </div>
            </div>

            <div style={{ 
              background: '#f8fafc', 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-sm)', 
              fontSize: '0.82rem', 
              color: 'var(--text-muted)',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldCheck size={16} style={{ color: 'var(--primary-700)', flexShrink: 0 }} />
              <span>
                Le compte sera automatiquement configuré avec le rôle <strong>Employé</strong> et rattaché à votre boutique. Il ne pourra pas modifier les prix, supprimer des articles ou gérer votre abonnement.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="btn btn-outline"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={submitting}
              >
                {submitting ? "Création en cours..." : "Enregistrer l'employé"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LISTE DES EMPLOYÉS DE LA BOUTIQUE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary-900)', margin: 0 }}>
          Membres de l'équipe ({employes.length})
        </h3>
        <button 
          onClick={chargerEmployes} 
          className="btn btn-outline btn-sm"
          title="Actualiser la liste"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {loading && employes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 10px auto' }} />
          <p>Chargement des membres de votre équipe...</p>
        </div>
      ) : employes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <Users size={48} style={{ color: 'var(--text-light)', margin: '0 auto 12px auto' }} />
          <h4 style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '6px' }}>
            Aucun compte employé créé
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '16px', maxWidth: '420px', margin: '0 auto 16px auto' }}>
            Vous êtes actuellement le seul utilisateur de la boutique. Créez un compte employé pour vos vendeurs ou caissiers afin qu'ils puissent enregistrer les ventes au comptoir.
          </p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
            <UserPlus size={16} /> Ajouter un premier employé
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {employes.map((emp) => (
            <div key={emp.id} className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <UserAvatar
                    photoUrl={emp.photo_profil_url}
                    nom={emp.first_name ? `${emp.first_name} ${emp.last_name || ''}` : emp.username}
                    taille={42}
                  />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--primary-900)' }}>
                      {emp.first_name ? `${emp.first_name} ${emp.last_name || ''}`.trim() : emp.username}
                    </h4>
                    <span className="badge badge-neutral" style={{ fontSize: '0.7rem', marginTop: '3px' }}>
                      🛒 Employé / Vendeur
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {emp.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={13} />
                    <span>{emp.email}</span>
                  </div>
                )}
                {emp.telephone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={13} />
                    <span>{emp.telephone}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.76rem', color: 'var(--text-light)' }}>
                  <span>Créé le : {new Date(emp.date_creation).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

              {/* BOUTON ÉCHANGER / CONTACTER */}
              <Link
                to={`/messages?employe_id=${emp.id}`}
                className="btn btn-outline btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  textDecoration: 'none',
                  padding: '6px 12px',
                  marginTop: '4px'
                }}
              >
                <MessageSquare size={14} />
                <span>Envoyer un message</span>
              </Link>

              <div style={{
                borderTop: '1px solid var(--surface-border)',
                paddingTop: '10px',
                marginTop: 'auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.78rem',
                color: 'var(--primary-700)',
                fontWeight: '600'
              }}>
                <span>Droits : Ventes & Réappro</span>
                <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                  Actif
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
