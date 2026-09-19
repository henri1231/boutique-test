import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, User, Crown, ArrowRight, Store, CheckCircle } from 'lucide-react';

export const AdminLoginPage = () => {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('passer123');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [messageSucces, setMessageSucces] = useState(
    location.state?.message || new URLSearchParams(location.search).get('message') || ''
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErreur("Veuillez renseigner votre identifiant et mot de passe.");
      return;
    }

    setLoading(true);
    setErreur('');

    try {
      await adminLogin(username.trim(), password);
      navigate('/admin-plateforme');
    } catch (err) {
      setErreur(err.message || "Identifiants invalides ou droits administrateur insuffisants.");
    } finally {
      setLoading(false);
    }
  };

  const remplirDemoAdmin = () => {
    setUsername('superadmin');
    setPassword('passer123');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'radial-gradient(circle at 50% 20%, #064e3b 0%, #0f172a 100%)',
      color: '#f8fafc'
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* BRANDING HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #059669, #022c22)',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px auto',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            border: '1.5px solid rgba(251, 191, 36, 0.4)'
          }}>
            <Crown size={36} />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '800', marginBottom: '8px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
            <ShieldCheck size={14} /> PORTAIL SUPER-ADMINISTRATEUR
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
            Console Plateforme
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '6px' }}>
            Supervision centrale des boutiques BoutiqueStock Togo
          </p>
        </div>

        {/* CARTE CONNEXION */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.85)',
          backdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
        }}>
          {messageSucces && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#6ee7b7',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '18px',
              fontSize: '0.88rem',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle size={18} />
              <span>{messageSucces}</span>
            </div>
          )}

          {erreur && (
            <div style={{
              background: 'rgba(220, 38, 38, 0.2)',
              color: '#fca5a5',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '18px',
              fontSize: '0.88rem',
              border: '1px solid rgba(220, 38, 38, 0.4)'
            }}>
              {erreur}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ color: '#cbd5e1' }}>Identifiant ou Email Super-Admin</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{
                    paddingLeft: '38px',
                    background: '#0f172a',
                    borderColor: '#334155',
                    color: '#ffffff'
                  }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: superadmin"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#cbd5e1' }}>Mot de passe administrateur</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="password"
                  className="form-input"
                  style={{
                    paddingLeft: '38px',
                    background: '#0f172a',
                    borderColor: '#334155',
                    color: '#ffffff'
                  }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-gold btn-lg"
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '800'
              }}
            >
              {loading ? "Vérification des droits..." : (
                <>
                  <span>Accéder à la supervision</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* TEST RAPIDE DEMO */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed rgba(255, 255, 255, 0.15)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '8px' }}>
                Compte Super-Admin plateforme (Togo) :
              </div>
              <button
                type="button"
                onClick={remplirDemoAdmin}
                className="btn btn-outline btn-sm"
                style={{
                  borderColor: '#475569',
                  color: '#e2e8f0',
                  background: 'rgba(255, 255, 255, 0.05)',
                  fontSize: '0.8rem',
                  padding: '6px 14px'
                }}
              >
                👑 Remplir Super-Admin (Démo)
              </button>
            </div>
          </form>
        </div>

        {/* LIEN VERS PORTAIL COMMERÇANT */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link 
            to="/connexion" 
            style={{ 
              color: '#93c5fd', 
              fontSize: '0.85rem', 
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Store size={15} />
            <span>Vous êtes gérant ou vendeur ? Connexion Boutique</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
