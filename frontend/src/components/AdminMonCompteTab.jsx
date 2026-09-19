import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  CheckCircle, 
  AlertTriangle, 
  Save, 
  KeyRound,
  Crown
} from 'lucide-react';

export const AdminMonCompteTab = () => {
  const { user, logout, isSuperAdmin, isAdministrateur } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState(user?.username || '');
  const [ancienMotDePasse, setAncienMotDePasse] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmerMotDePasse, setConfirmerMotDePasse] = useState('');

  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  // Charger les données de l'administrateur au montage
  useEffect(() => {
    let isMounted = true;
    const chargerProfil = async () => {
      try {
        const profil = await api.superAdmin.monCompte();
        if (isMounted && profil?.username) {
          setUsername(profil.username);
        }
      } catch (err) {
        console.error("Erreur chargement profil admin:", err);
      }
    };
    chargerProfil();
    return () => { isMounted = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    setSucces('');

    if (!username.trim()) {
      setErreur("Le nom d'utilisateur ne peut pas être vide.");
      return;
    }

    // Si l'un des champs de mot de passe est saisi, vérifier les règles côté client
    const changeMdp = Boolean(ancienMotDePasse || nouveauMotDePasse || confirmerMotDePasse);

    if (changeMdp) {
      if (!ancienMotDePasse) {
        setErreur("Veuillez saisir votre mot de passe actuel.");
        return;
      }
      if (!nouveauMotDePasse) {
        setErreur("Veuillez saisir le nouveau mot de passe.");
        return;
      }
      if (nouveauMotDePasse.length < 8) {
        setErreur("Le nouveau mot de passe doit contenir au moins 8 caractères.");
        return;
      }
      if (nouveauMotDePasse !== confirmerMotDePasse) {
        setErreur("La confirmation ne correspond pas au nouveau mot de passe.");
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        username: username.trim(),
      };

      if (changeMdp) {
        payload.ancien_mot_de_passe = ancienMotDePasse;
        payload.nouveau_mot_de_passe = nouveauMotDePasse;
        payload.confirmer_mot_de_passe = confirmerMotDePasse;
      }

      const res = await api.superAdmin.updateMonCompte(payload);

      // Si le mot de passe a été modifié, déconnecter et rediriger vers la page de connexion
      if (res.mot_de_passe_modifie) {
        setSucces("Mot de passe modifié avec succès. Invalidation de session et redirection...");
        setTimeout(() => {
          logout();
          navigate('/admin-plateforme/connexion', {
            state: { message: "Mot de passe modifié avec succès. Veuillez vous reconnecter." }
          });
        }, 1200);
      } else {
        // Seul le nom d'utilisateur a été changé
        setSucces(res.message || "Nom d'utilisateur mis à jour avec succès.");
        // Mettre à jour l'utilisateur stocké localement
        const storedUser = localStorage.getItem('boutique_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.username = res.username || username.trim();
            localStorage.setItem('boutique_user', JSON.stringify(parsed));
          } catch (e) {
            // ignore
          }
        }
        // Réinitialiser les champs de mot de passe
        setAncienMotDePasse('');
        setNouveauMotDePasse('');
        setConfirmerMotDePasse('');
      }
    } catch (err) {
      setErreur(err.message || "Une erreur est survenue lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      {/* CARTE D'EN-TÊTE MON COMPTE */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
        borderRadius: '16px',
        padding: '24px 28px',
        border: isSuperAdmin ? '1px solid rgba(251, 191, 36, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #059669, #047857)',
            color: isSuperAdmin ? '#fbbf24' : '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
          }}>
            {isSuperAdmin ? <Crown size={30} /> : <ShieldCheck size={30} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                {user?.nom_complet || username || (isSuperAdmin ? 'Super-Administrateur' : 'Administrateur')}
              </h2>
              <span className={`badge ${isSuperAdmin ? 'badge-gold' : 'badge-success'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                {isSuperAdmin ? 'SUPER-ADMIN' : 'ADMINISTRATEUR'}
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.84rem', margin: '4px 0 0 0' }}>
              {isSuperAdmin
                ? "Compte principal avec droits suprêmes sur l'ensemble de la plateforme"
                : "Gestionnaire délégué pour vos boutiques assignées"}
            </p>
          </div>
        </div>

        <div style={{
          fontSize: '0.78rem',
          color: '#cbd5e1',
          background: 'rgba(255, 255, 255, 0.06)',
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          Rôle : <strong>{isSuperAdmin ? 'Super Administrateur' : 'Administrateur'}</strong>
        </div>
      </div>

      {/* FORMULAIRE PRINCIPAL */}
      <div style={{
        background: '#1e293b',
        borderRadius: '16px',
        padding: '28px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)'
      }}>
        <form onSubmit={handleSubmit}>
          {/* SECTION IDENTITÉ */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: isSuperAdmin ? '#fbbf24' : '#34d399',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 0 16px 0'
            }}>
              <User size={18} />
              <span>Identité du compte {isSuperAdmin ? 'Super-Administrateur' : 'Administrateur'}</span>
            </h3>

            <div className="form-group">
              <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.88rem' }}>
                Nom d'utilisateur (Username) <span style={{ color: '#f87171' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{
                    paddingLeft: '38px',
                    background: '#0f172a',
                    borderColor: '#334155',
                    color: '#ffffff',
                    fontSize: '0.92rem'
                  }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: superadmin"
                  required
                />
              </div>
              <small style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '5px', display: 'block' }}>
                Cet identifiant sert à vous connecter sur le portail d'administration de la plateforme.
              </small>
            </div>
          </div>

          <hr style={{ borderColor: 'rgba(255, 255, 255, 0.08)', margin: '24px 0' }} />

          {/* SECTION MOT DE PASSE */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '700',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: 0
              }}>
                <KeyRound size={18} />
                <span>Changer le mot de passe</span>
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
                Laissez ces trois champs vides si vous souhaitez uniquement modifier votre nom d'utilisateur.
              </p>
            </div>

            {/* 1. Mot de passe actuel */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.88rem' }}>
                Mot de passe actuel
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type={showOldPwd ? 'text' : 'password'}
                  className="form-input"
                  style={{
                    paddingLeft: '38px',
                    paddingRight: '40px',
                    background: '#0f172a',
                    borderColor: '#334155',
                    color: '#ffffff',
                    fontSize: '0.92rem'
                  }}
                  value={ancienMotDePasse}
                  onChange={(e) => setAncienMotDePasse(e.target.value)}
                  placeholder="Saisir votre mot de passe actuel"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPwd(!showOldPwd)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  tabIndex={-1}
                >
                  {showOldPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* 2. Nouveau mot de passe */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.88rem' }}>
                Nouveau mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  className="form-input"
                  style={{
                    paddingLeft: '38px',
                    paddingRight: '40px',
                    background: '#0f172a',
                    borderColor: '#334155',
                    color: '#ffffff',
                    fontSize: '0.92rem'
                  }}
                  value={nouveauMotDePasse}
                  onChange={(e) => setNouveauMotDePasse(e.target.value)}
                  placeholder="Minimum 8 caractères (chiffres, lettres, symboles)"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  tabIndex={-1}
                >
                  {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* 3. Confirmer le nouveau mot de passe */}
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.88rem' }}>
                Confirmer le nouveau mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  className="form-input"
                  style={{
                    paddingLeft: '38px',
                    paddingRight: '40px',
                    background: '#0f172a',
                    borderColor: '#334155',
                    color: '#ffffff',
                    fontSize: '0.92rem'
                  }}
                  value={confirmerMotDePasse}
                  onChange={(e) => setConfirmerMotDePasse(e.target.value)}
                  placeholder="Répéter le nouveau mot de passe"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  tabIndex={-1}
                >
                  {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#94a3b8',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldCheck size={16} style={{ color: '#34d399', flexShrink: 0 }} />
              <span>
                Pour votre sécurité, un changement de mot de passe invalidera automatiquement tous vos anciens tokens de connexion sur vos autres sessions.
              </span>
            </div>
          </div>

          {/* MESSAGES DE RETOUR DIRECTEMENT SOUS LE FORMULAIRE */}
          {erreur && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#fca5a5',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '0.88rem',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'fadeIn 0.2s ease'
            }}>
              <AlertTriangle size={18} style={{ color: '#f87171', flexShrink: 0 }} />
              <span>{erreur}</span>
            </div>
          )}

          {succes && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#6ee7b7',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '0.88rem',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'fadeIn 0.2s ease'
            }}>
              <CheckCircle size={18} style={{ color: '#34d399', flexShrink: 0 }} />
              <span>{succes}</span>
            </div>
          )}

          {/* BOUTON ENREGISTRER */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: '#ffffff',
                border: '1px solid #10b981',
                padding: '12px 24px',
                fontSize: '0.95rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.4)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              <Save size={18} />
              <span>{loading ? 'Enregistrement en cours...' : 'Enregistrer les modifications'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
