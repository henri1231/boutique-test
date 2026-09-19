import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { AdminNavbar } from '../components/AdminNavbar';
import { 
  Building, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  ShieldCheck, 
  Save, 
  RefreshCw, 
  User, 
  Users, 
  CreditCard, 
  ShoppingBag, 
  History, 
  Key, 
  Edit3, 
  X,
  Phone,
  Mail,
  Lock,
  Tag,
  Clock
} from 'lucide-react';

export const AdminBoutiqueDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSuperAdmin, isAdministrateur } = useAuth();

  const [boutique, setBoutique] = useState(null);
  const [journal, setJournal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur403, setErreur403] = useState(false);
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false);
  const [toast, setToast] = useState(null);

  // Formulaire boutique
  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [telephone, setTelephone] = useState('');

  // Modale suspension / réactivation
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [motifAction, setMotifAction] = useState('');
  const [toggleEnCours, setToggleEnCours] = useState(false);

  // Modale modification utilisateur
  const [userPourEdition, setUserPourEdition] = useState(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('employe');
  const [editTelephone, setEditTelephone] = useState('');
  const [editNouveauMdp, setEditNouveauMdp] = useState('');
  const [editUserEnCours, setEditUserEnCours] = useState(false);

  const afficherToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const chargerDetails = useCallback(async () => {
    setLoading(true);
    try {
      const [dataBoutique, dataJournal] = await Promise.all([
        api.superAdmin.boutiqueDetail(id),
        api.superAdmin.journalActions({ boutique: id }).catch(() => [])
      ]);
      setBoutique(dataBoutique);
      setNom(dataBoutique.nom || '');
      setAdresse(dataBoutique.adresse || '');
      setTelephone(dataBoutique.telephone || '');
      setJournal(Array.isArray(dataJournal) ? dataJournal : []);
    } catch (err) {
      if (err.status === 403) {
        setErreur403(true);
      } else {
        afficherToast(err.message || "Erreur lors du chargement de la boutique.", 'danger');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    chargerDetails();
  }, [chargerDetails]);

  // Sauvegarder coordonnées boutique
  const handleSauvegarderBoutique = async (e) => {
    e.preventDefault();
    setSauvegardeEnCours(true);
    try {
      const res = await api.superAdmin.updateBoutique(id, {
        nom: nom.trim(),
        adresse: adresse.trim(),
        telephone: telephone.trim()
      });
      setBoutique(res);
      afficherToast("Coordonnées de la boutique mises à jour avec succès !");
      chargerDetails();
    } catch (err) {
      afficherToast(err.message || "Erreur lors de la sauvegarde.", 'danger');
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  // Activer / Désactiver boutique
  const handleConfirmerToggle = async () => {
    setToggleEnCours(true);
    try {
      const res = await api.superAdmin.toggleStatutBoutique(id, motifAction);
      setShowToggleModal(false);
      setMotifAction('');
      afficherToast(res.message || "Statut du compte mis à jour !");
      chargerDetails();
    } catch (err) {
      afficherToast(err.message || "Erreur lors du changement de statut.", 'danger');
    } finally {
      setToggleEnCours(false);
    }
  };

  // Ouvrir modal édition utilisateur
  const ouvrirEditionUser = (u) => {
    setUserPourEdition(u);
    setEditFirstName(u.first_name || '');
    setEditLastName(u.last_name || '');
    setEditEmail(u.email || '');
    setEditRole(u.role || 'employe');
    setEditTelephone(u.telephone || '');
    setEditNouveauMdp('');
  };

  // Sauvegarder modification utilisateur / mot de passe
  const handleSauvegarderUser = async (e) => {
    e.preventDefault();
    if (!userPourEdition) return;

    setEditUserEnCours(true);
    try {
      const payload = {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        email: editEmail.trim(),
        role: editRole,
        telephone: editTelephone.trim(),
      };
      if (editNouveauMdp.trim()) {
        payload.nouveau_mot_de_passe = editNouveauMdp.trim();
      }

      await api.superAdmin.updateUtilisateur(userPourEdition.id, payload);
      afficherToast(`Compte '${userPourEdition.username}' mis à jour avec succès !`);
      setUserPourEdition(null);
      chargerDetails();
    } catch (err) {
      afficherToast(err.message || "Erreur lors de la mise à jour utilisateur.", 'danger');
    } finally {
      setEditUserEnCours(false);
    }
  };

  if (loading && !boutique) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
        <AdminNavbar />
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#94a3b8' }}>
          <RefreshCw size={36} className="spin" style={{ margin: '0 auto 16px auto', color: '#60a5fa' }} />
          <p>Chargement des détails de la boutique...</p>
        </div>
      </div>
    );
  }

  if (erreur403) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
        <AdminNavbar />
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#94a3b8' }}>
          <ShieldAlert size={56} style={{ color: '#ef4444', margin: '0 auto 16px auto' }} />
          <h2 style={{ color: '#f87171', fontSize: '1.5rem', marginBottom: '8px' }}>
            Erreur 403 - Accès Refusé
          </h2>
          <p style={{ maxWidth: '480px', margin: '0 auto 20px auto', fontSize: '0.92rem', color: '#cbd5e1' }}>
            Cette boutique ne vous a pas été attribuée par le super-administrateur. Vous n'avez pas l'autorisation d'accéder à ses données.
          </p>
          <Link to="/admin-plateforme" className="btn btn-primary" style={{ background: '#059669', color: '#ffffff' }}>
            Retour à mes boutiques
          </Link>
        </div>
      </div>
    );
  }

  if (!boutique) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
        <AdminNavbar />
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#94a3b8' }}>
          <AlertTriangle size={48} style={{ color: '#ef4444', margin: '0 auto 16px auto' }} />
          <h2>Boutique introuvable</h2>
          <Link to="/admin-plateforme" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Retour à la supervision
          </Link>
        </div>
      </div>
    );
  }

  const abo = boutique.statut_abonnement || {};
  const isAboActif = abo.actif === true;
  const isSuspendu = boutique.compte_actif === false;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      <AdminNavbar />

      {/* Toast Notif */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          background: toast.type === 'danger' ? '#b91c1c' : '#059669',
          color: '#ffffff',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.9rem',
          fontWeight: '600',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toast.type === 'danger' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      <main className="admin-container">
        {/* RETOUR & HEADER */}
        <div style={{ marginBottom: '20px' }}>
          <Link 
            to="/admin-plateforme" 
            style={{ 
              color: '#93c5fd', 
              fontSize: '0.85rem', 
              textDecoration: 'none', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              marginBottom: '12px'
            }}
          >
            <ArrowLeft size={16} />
            <span>Retour à toutes les boutiques</span>
          </Link>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
                  {boutique.nom}
                </h1>
                {isSuspendu ? (
                  <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', fontSize: '0.78rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} /> En attente d'activation / Inactive
                  </span>
                ) : (
                  <span className="badge badge-success" style={{ fontSize: '0.78rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} /> Boutique Active & Validée
                  </span>
                )}
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.86rem', marginTop: '6px' }}>
                Inscrite sur la plateforme le {new Date(boutique.date_creation).toLocaleDateString('fr-FR')} • ID #{boutique.id}
              </p>
            </div>

            {/* BOUTON D'ACTION : ACTIVER / DÉSACTIVER LA BOUTIQUE */}
            {(isSuperAdmin || isAdministrateur) && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowToggleModal(true)}
                  className={`btn ${isSuspendu ? 'btn-primary' : 'btn-danger'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}
                >
                  {isSuspendu ? (
                    <>
                      <CheckCircle size={18} />
                      <span>Activer cette boutique</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={18} />
                      <span>Désactiver cette boutique (Suspendre)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BANDEAU SI BOUTIQUE EN ATTENTE OU SUSPENDUE */}
        {isSuspendu && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#fef3c7',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.9rem'
          }}>
            <Clock size={24} style={{ color: '#fbbf24', flexShrink: 0 }} />
            <div>
              <strong>Cette boutique est actuellement en attente d'activation par l'administrateur.</strong>
              <div style={{ fontSize: '0.82rem', marginTop: '2px', opacity: 0.9 }}>
                Les connexions gérant et employés sont bloquées avec le message : <em>"Votre boutique est actuellement en attente d'activation par l'administrateur de la plateforme."</em>
              </div>
            </div>
          </div>
        )}

        {/* CARTES RÉSUMÉ D'ACTIVITÉ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span>Articles en Catalogue</span>
              <div className="admin-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                <ShoppingBag size={18} />
              </div>
            </div>
            <div className="admin-kpi-value">{boutique.activite_resume?.nb_produits || 0}</div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>Articles créés</div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span>Ventes du Mois en Cours</span>
              <div className="admin-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                <Tag size={18} />
              </div>
            </div>
            <div className="admin-kpi-value">{boutique.activite_resume?.ventes_mois_count || 0}</div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>Sorties de caisse</div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span>Chiffre d'Affaires Mensuel</span>
              <div className="admin-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                <CreditCard size={18} />
              </div>
            </div>
            <div className="admin-kpi-value" style={{ fontSize: '1.25rem' }}>
              {(boutique.activite_resume?.ventes_mois_total || 0).toLocaleString('fr-FR')} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>FCFA</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>Encaissé ce mois-ci</div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span>Membres de l'Équipe</span>
              <div className="admin-kpi-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                <Users size={18} />
              </div>
            </div>
            <div className="admin-kpi-value">{boutique.employes?.length || 0}</div>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>Gérant & vendeurs</div>
          </div>
        </div>

        {/* SECTION 1 : COORDONNÉES DE LA BOUTIQUE (ÉDITABLE) */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <Building size={20} style={{ color: '#38bdf8' }} />
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff' }}>
              Informations & Coordonnées de la Boutique
            </h3>
          </div>

          <form onSubmit={handleSauvegarderBoutique}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#cbd5e1' }}>Nom commercial de la boutique *</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#cbd5e1' }}>Numéro de téléphone</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="Ex: +228 90 00 00 00"
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ color: '#cbd5e1' }}>Adresse géographique & Quartier</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="Ex: Boulevard Circulaire, Déckon, Lomé"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={sauvegardeEnCours}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Save size={16} />
                <span>{sauvegardeEnCours ? "Enregistrement..." : "Enregistrer les coordonnées"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 2 : ÉQUIPE / UTILISATEURS DE LA BOUTIQUE */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          marginBottom: '24px'
        }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={20} style={{ color: '#38bdf8' }} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff' }}>
                Comptes Utilisateurs & Employés ({boutique.employes?.length || 0})
              </h3>
            </div>
          </div>

          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Nom complet</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Rôle</th>
                  <th>Date création</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(boutique.employes || []).map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: '700', color: '#ffffff' }}>
                        {u.username}
                      </div>
                    </td>
                    <td>{u.nom_complet || '—'}</td>
                    <td>{u.email || '—'}</td>
                    <td>{u.telephone || '—'}</td>
                    <td>
                      {u.role === 'gerant' ? (
                        <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                          ★ Gérant
                        </span>
                      ) : (
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                          🛒 Employé
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                      {new Date(u.date_joined).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => ouvrirEditionUser(u)}
                        className="btn btn-outline btn-sm"
                        style={{
                          borderColor: '#38bdf8',
                          color: '#38bdf8',
                          background: 'rgba(56, 189, 248, 0.08)',
                          fontSize: '0.78rem',
                          padding: '4px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Edit3 size={13} />
                        <span>Modifier / Réinitialiser MDP</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3 : HISTORIQUE DES PAIEMENTS D'ABONNEMENT */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.7)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          marginBottom: '24px'
        }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={20} style={{ color: '#38bdf8' }} />
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff' }}>
              Statut d'Accès & Validation Administrative
            </h3>
          </div>

          {(!boutique.abonnements || boutique.abonnements.length === 0) ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
              Les boutiques fonctionnent sans abonnement payant TMoney/Flooz. L'accès aux fonctionnalités est validé directement par l'administrateur.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date Paiement</th>
                    <th>Montant</th>
                    <th>Méthode</th>
                    <th>Référence Transaction</th>
                    <th>Période d'accès</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {boutique.abonnements.map((ab) => (
                    <tr key={ab.id}>
                      <td style={{ fontSize: '0.84rem' }}>
                        {new Date(ab.date_creation).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{ fontWeight: '700', color: '#fbbf24' }}>
                        {Number(ab.montant).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td>
                        {(ab.methode_paiement === 'Flooz' || (ab.methode && ab.methode.toLowerCase().includes('flooz'))) ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '0.74rem'
                          }}>
                            🔵 Flooz (Moov)
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '0.74rem'
                          }}>
                            🟡 TMoney (Togocom)
                          </span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#38bdf8' }}>
                        {ab.reference_paiement || '—'}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                        {new Date(ab.date_debut).toLocaleDateString('fr-FR')} → {new Date(ab.date_fin).toLocaleDateString('fr-FR')}
                      </td>
                      <td>
                        {ab.statut === 'actif' ? (
                          <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>Actif</span>
                        ) : ab.statut === 'expire' ? (
                          <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>Expiré</span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>{ab.statut}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION 4 : JOURNAL D'AUDIT SUR CETTE BOUTIQUE */}
        {journal.length > 0 && (
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <History size={20} style={{ color: '#fbbf24' }} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff' }}>
                Audit des Actions Administrateur sur cette Boutique ({journal.length})
              </h3>
            </div>
            <div style={{ padding: '16px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {journal.map((log) => (
                  <div key={log.id} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.84rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ color: '#fbbf24' }}>{log.action}</strong>
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{new Date(log.date_action).toLocaleString('fr-FR')}</span>
                    </div>
                    <div style={{ color: '#cbd5e1' }}>{log.description}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                      Par : {log.utilisateur_nom} {log.ip_adresse ? `(IP: ${log.ip_adresse})` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODALE SUSPENSION / RÉACTIVATION */}
      {showToggleModal && (isSuperAdmin || isAdministrateur) && (
        <div className="modal-backdrop" onClick={() => setShowToggleModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div className="modal-header" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="modal-title" style={{ color: isSuspendu ? '#34d399' : '#f87171' }}>
                {isSuspendu ? <CheckCircle size={22} /> : <ShieldAlert size={22} />}
                <span>{isSuspendu ? "Activer la boutique" : "Désactiver / Suspendre la boutique"}</span>
              </div>
              <button onClick={() => setShowToggleModal(false)} className="modal-close" style={{ background: '#334155', color: '#cbd5e1' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              {isSuspendu
                ? `Voulez-vous activer la boutique '${boutique.nom}' ? Le gérant et ses employés pourront se connecter et gérer leur stock normalement.`
                : `Êtes-vous sûr de vouloir suspendre la boutique '${boutique.nom}' ? Tous les utilisateurs (gérants et employés) seront immédiatement bloqués à la connexion.`}
            </p>

            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label" style={{ color: '#cbd5e1' }}>Motif de l'action (enregistré dans le journal d'audit) :</label>
              <textarea
                className="form-input"
                style={{ background: '#0f172a', borderColor: '#334155', color: '#ffffff', minHeight: '80px' }}
                placeholder="Ex: Validation initiale, vérification conformité, litige commercial..."
                value={motifAction}
                onChange={(e) => setMotifAction(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" onClick={() => setShowToggleModal(false)} className="btn btn-outline" style={{ borderColor: '#475569', color: '#e2e8f0' }}>
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmerToggle}
                className={`btn ${isSuspendu ? 'btn-primary' : 'btn-danger'}`}
                disabled={toggleEnCours}
              >
                {toggleEnCours ? "Traitement..." : isSuspendu ? "Confirmer l'activation" : "Confirmer la suspension"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE ÉDITION UTILISATEUR & RÉINITIALISATION MOT DE PASSE */}
      {userPourEdition && (
        <div className="modal-backdrop" onClick={() => setUserPourEdition(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div className="modal-header" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="modal-title" style={{ color: '#ffffff' }}>
                <Edit3 size={20} style={{ color: '#38bdf8' }} />
                <span>Modifier l'utilisateur : {userPourEdition.username}</span>
              </div>
              <button onClick={() => setUserPourEdition(null)} className="modal-close" style={{ background: '#334155', color: '#cbd5e1' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSauvegarderUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1' }}>Prénom</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1' }}>Nom</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#cbd5e1' }}>Adresse email</label>
                <input
                  type="email"
                  className="form-input"
                  style={{ background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1' }}>Rôle</label>
                  <select
                    className="form-select"
                    style={{ background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                  >
                    <option value="gerant">Gérant (Droits complets)</option>
                    <option value="employe">Employé (Caisse / Stock)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1' }}>Téléphone</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
                    value={editTelephone}
                    onChange={(e) => setEditTelephone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.2)', marginTop: '8px' }}>
                <label className="form-label" style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={15} /> Réinitialiser le mot de passe (optionnel)
                </label>
                <input
                  type="password"
                  className="form-input"
                  style={{ background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
                  placeholder="Laisser vide pour ne pas modifier le mot de passe"
                  value={editNouveauMdp}
                  onChange={(e) => setEditNouveauMdp(e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                  Minimum 6 caractères. L'utilisateur devra utiliser ce nouveau mot de passe pour se connecter.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '18px' }}>
                <button type="button" onClick={() => setUserPourEdition(null)} className="btn btn-outline" style={{ borderColor: '#475569', color: '#e2e8f0' }}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={editUserEnCours}>
                  {editUserEnCours ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
