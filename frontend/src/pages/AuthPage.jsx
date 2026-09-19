import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Store, Lock, User, Phone, MapPin, CheckCircle, ArrowRight, ShieldCheck, Clock, AlertCircle } from 'lucide-react';

export const AuthPage = ({ initialTab = 'connexion' }) => {
  const [tab, setTab] = useState(initialTab);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // État Connexion
  const [loginUsername, setLoginUsername] = useState('gerant');
  const [loginPassword, setLoginPassword] = useState('passer123');

  // État Inscription
  const [nomBoutique, setNomBoutique] = useState('');
  const [adresseBoutique, setAdresseBoutique] = useState('Quartier Déckon, Lomé');
  const [telephoneBoutique, setTelephoneBoutique] = useState('+228 90 00 00 00');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [nomComplet, setNomComplet] = useState('');
  const [role, setRole] = useState('gerant');

  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [inscriptionReussie, setInscriptionReussie] = useState(null);

  const handleConnexion = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErreur('');
    try {
      await login(loginUsername, loginPassword);
      navigate('/');
    } catch (err) {
      setErreur(err.message || "Identifiants invalides.");
    } finally {
      setLoading(false);
    }
  };

  const handleInscription = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErreur('');

    if (!nomBoutique.trim()) {
      setErreur("Veuillez renseigner le nom de la boutique.");
      setLoading(false);
      return;
    }

    try {
      const res = await register({
        nom_boutique: nomBoutique.trim(),
        adresse_boutique: adresseBoutique.trim(),
        telephone_boutique: telephoneBoutique.trim(),
        username: registerUsername.trim(),
        password: registerPassword,
        nom_complet: nomComplet.trim(),
        role,
      });

      if (res?.en_attente_activation || !res?.tokens?.access) {
        setInscriptionReussie({
          nom: nomBoutique.trim(),
          username: registerUsername.trim(),
          message: res?.message || "Votre boutique a été enregistrée avec succès ! Elle est actuellement en attente d'activation par un administrateur."
        });
      } else {
        navigate('/');
      }
    } catch (err) {
      setErreur(err.message || "Erreur lors de la création du compte.");
    } finally {
      setLoading(false);
    }
  };

  const remplirDemoGerant = () => {
    setTab('connexion');
    setLoginUsername('gerant');
    setLoginPassword('passer123');
  };

  const remplirDemoEmploye = () => {
    setTab('connexion');
    setLoginUsername('employe');
    setLoginPassword('passer123');
  };

  const remplirDemoVendeur = () => {
    setTab('connexion');
    setLoginUsername('vendeur');
    setLoginPassword('passer123');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 16px',
      background: 'radial-gradient(circle at 10% 20%, rgba(15, 84, 65, 0.08) 0%, rgba(246, 248, 247, 1) 90%)'
    }}>
      <div style={{ width: '100%', maxWidth: '460px' }}>
        {/* BRANDING HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0f5441, #108e6c)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <Store size={32} />
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary-900)', letterSpacing: '-0.02em' }}>
            BoutiqueStock <span style={{ color: 'var(--gold-500)' }}>Togo</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Application moderne de gestion de stock & commerce au Togo
          </p>
        </div>

        {/* CARTE PRINCIPALE */}
        <div className="card" style={{ padding: '28px', boxShadow: 'var(--shadow-xl)' }}>
          {inscriptionReussie ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
              }}>
                <Clock size={34} />
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                Boutique enregistrée avec succès !
              </h2>

              <div style={{
                display: 'inline-block',
                background: '#fffbeb',
                color: '#b45309',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.82rem',
                fontWeight: '700',
                border: '1px solid #fde68a',
                marginBottom: '16px'
              }}>
                ⏳ En attente d'activation par un administrateur
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                textAlign: 'left',
                marginBottom: '20px',
                fontSize: '0.88rem',
                lineHeight: '1.5'
              }}>
                <p style={{ margin: '0 0 6px 0', color: '#334155' }}>
                  <strong>Boutique :</strong> {inscriptionReussie.nom}
                </p>
                <p style={{ margin: '0 0 10px 0', color: '#334155' }}>
                  <strong>Identifiant gérant :</strong> {inscriptionReussie.username}
                </p>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>
                  Votre boutique a bien été enregistrée. Un administrateur de la plateforme doit examiner et activer votre boutique avant votre première connexion. Vous recevrez l'accès complet dès son approbation.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={() => {
                  setInscriptionReussie(null);
                  setTab('connexion');
                  setLoginUsername(inscriptionReussie.username);
                  setLoginPassword('');
                }}
              >
                Aller à la page de connexion
              </button>
            </div>
          ) : (
            <>
              {/* ONGLETS */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                background: '#f1f5f9',
                padding: '4px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px'
              }}>
                <button
                  type="button"
                  onClick={() => { setTab('connexion'); setErreur(''); }}
                  style={{
                    padding: '10px',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    background: tab === 'connexion' ? '#ffffff' : 'transparent',
                    color: tab === 'connexion' ? 'var(--primary-900)' : 'var(--text-muted)',
                    boxShadow: tab === 'connexion' ? 'var(--shadow-sm)' : 'none',
                    transition: 'var(--transition)'
                  }}
                >
                  Connexion
                </button>

                <button
                  type="button"
                  onClick={() => { setTab('inscription'); setErreur(''); }}
                  style={{
                    padding: '10px',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    background: tab === 'inscription' ? '#ffffff' : 'transparent',
                    color: tab === 'inscription' ? 'var(--primary-900)' : 'var(--text-muted)',
                    boxShadow: tab === 'inscription' ? 'var(--shadow-sm)' : 'none',
                    transition: 'var(--transition)'
                  }}
                >
                  Créer Boutique
                </button>
              </div>

              {erreur && (
                <div style={{
                  background: (erreur.toLowerCase().includes('activation') || erreur.toLowerCase().includes('attente')) ? '#fffbeb' : 'var(--danger-50)',
                  color: (erreur.toLowerCase().includes('activation') || erreur.toLowerCase().includes('attente')) ? '#b45309' : 'var(--danger-700)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '18px',
                  fontSize: '0.88rem',
                  border: `1px solid ${(erreur.toLowerCase().includes('activation') || erreur.toLowerCase().includes('attente')) ? '#fde68a' : 'var(--danger-100)'}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  {(erreur.toLowerCase().includes('activation') || erreur.toLowerCase().includes('attente')) ? (
                    <Clock size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
                  ) : (
                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  )}
                  <div>{erreur}</div>
                </div>
              )}

              {/* FORMULAIRE CONNEXION */}
              {tab === 'connexion' && (
                <form onSubmit={handleConnexion}>
                  <div className="form-group">
                    <label className="form-label">Nom d'utilisateur</label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '38px' }}
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        required
                        placeholder="Ex: gerant"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mot de passe</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                      <input
                        type="password"
                        className="form-input"
                        style={{ paddingLeft: '38px' }}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={loading}
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                    {loading ? "Connexion..." : "Accéder à ma boutique"}
                  </button>

                  {/* BOUTONS COMPTES DÉMO RAPIDES */}
                  <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px dashed var(--surface-border)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center' }}>
                      Comptes de test pré-configurés (Lomé, Togo) :
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={remplirDemoGerant}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.78rem' }}
                      >
                        🔑 Gérant (Démo)
                      </button>
                      <button
                        type="button"
                        onClick={remplirDemoEmploye}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.78rem' }}
                      >
                        🛒 Employé (Démo)
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* FORMULAIRE INSCRIPTION */}
              {tab === 'inscription' && (
                <form onSubmit={handleInscription}>
                  <div className="form-group">
                    <label className="form-label">Nom de la boutique *</label>
                    <div style={{ position: 'relative' }}>
                      <Store size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '38px' }}
                        placeholder="Ex: Épicerie Tokoin Lomé"
                        value={nomBoutique}
                        onChange={(e) => setNomBoutique(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Téléphone Togo</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="+228 90 XX XX XX"
                        value={telephoneBoutique}
                        onChange={(e) => setTelephoneBoutique(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Adresse / Quartier</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Lomé, Déckon, Bè..."
                        value={adresseBoutique}
                        onChange={(e) => setAdresseBoutique(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nom d'utilisateur gérant *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ex: koffi_mensah"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mot de passe *</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Minimum 6 caractères"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={loading}
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                    {loading ? "Enregistrement en cours..." : "Enregistrer ma boutique"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
