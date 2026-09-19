import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { UserAvatar } from './UserAvatar';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  Store, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Edit, 
  Trash2, 
  X, 
  Save, 
  RefreshCw,
  Key,
  Mail,
  Phone,
  Building
} from 'lucide-react';

export const AdminAdministrateursTab = ({ toutesBoutiques = [] }) => {
  const [administrateurs, setAdministrateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [toast, setToast] = useState(null);

  // Modale Création
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createNomComplet, setCreateNomComplet] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createTelephone, setCreateTelephone] = useState('');
  const [createBoutiquesIds, setCreateBoutiquesIds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Modale Attribution Boutiques
  const [adminPourBoutiques, setAdminPourBoutiques] = useState(null);
  const [selectedBoutiquesIds, setSelectedBoutiquesIds] = useState([]);
  const [savingBoutiques, setSavingBoutiques] = useState(false);

  // Modale Confirmation Suppression
  const [adminPourSuppression, setAdminPourSuppression] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const afficherToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const chargerAdministrateurs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.superAdmin.administrateurs.list();
      setAdministrateurs(Array.isArray(res) ? res : (res.results || []));
    } catch (err) {
      afficherToast(err.message || "Erreur lors du chargement des administrateurs.", 'danger');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    chargerAdministrateurs();
  }, [chargerAdministrateurs]);

  // Filtrage
  const adminsFiltres = useMemo(() => {
    return administrateurs.filter((adm) => {
      if (!recherche.trim()) return true;
      const q = recherche.toLowerCase();
      const matchText = 
        (adm.username && adm.username.toLowerCase().includes(q)) ||
        (adm.nom_complet && adm.nom_complet.toLowerCase().includes(q)) ||
        (adm.email && adm.email.toLowerCase().includes(q));
      
      const matchBoutique = adm.boutiques_gerees?.some(b => b.nom.toLowerCase().includes(q));
      return matchText || matchBoutique;
    });
  }, [administrateurs, recherche]);

  // Ouvrir modal création
  const ouvrirCreation = () => {
    setCreateNomComplet('');
    setCreateUsername('');
    setCreateEmail('');
    setCreatePassword('');
    setCreateTelephone('');
    setCreateBoutiquesIds([]);
    setCreateError('');
    setShowCreateModal(true);
  };

  // Soumission création
  const handleCreerAdmin = async (e) => {
    e.preventDefault();
    if (!createUsername.trim() || !createEmail.trim() || !createPassword.trim()) {
      setCreateError("Veuillez remplir tous les champs obligatoires (nom d'utilisateur, email, mot de passe).");
      return;
    }
    if (createPassword.length < 6) {
      setCreateError("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const payload = {
        username: createUsername.trim(),
        email: createEmail.trim(),
        password: createPassword,
        nom_complet: createNomComplet.trim(),
        telephone: createTelephone.trim(),
        boutiques_gerees: createBoutiquesIds,
        is_active: true
      };

      await api.superAdmin.administrateurs.create(payload);
      setShowCreateModal(false);
      afficherToast(`Compte administrateur '${createUsername}' créé avec succès !`);
      chargerAdministrateurs();
    } catch (err) {
      setCreateError(err.message || "Erreur lors de la création de l'administrateur.");
    } finally {
      setCreating(false);
    }
  };

  // Basculer la sélection d'une boutique en création
  const toggleBoutiqueSelectionCreation = (bId) => {
    setCreateBoutiquesIds(prev => 
      prev.includes(bId) ? prev.filter(id => id !== bId) : [...prev, bId]
    );
  };

  // Ouvrir modale gestion boutiques
  const ouvrirGestionBoutiques = (adm) => {
    setAdminPourBoutiques(adm);
    const ids = adm.boutiques_gerees ? adm.boutiques_gerees.map(b => b.id) : [];
    setSelectedBoutiquesIds(ids);
  };

  // Basculer boutique pour admin existant
  const toggleBoutiqueSelectionEdition = (bId) => {
    setSelectedBoutiquesIds(prev => 
      prev.includes(bId) ? prev.filter(id => id !== bId) : [...prev, bId]
    );
  };

  // Sauvegarder attribution boutiques
  const handleSauvegarderAttribution = async () => {
    if (!adminPourBoutiques) return;
    setSavingBoutiques(true);

    try {
      await api.superAdmin.administrateurs.update(adminPourBoutiques.id, {
        boutiques_gerees: selectedBoutiquesIds
      });
      afficherToast(`Boutiques attribuées à '${adminPourBoutiques.username}' mises à jour !`);
      setAdminPourBoutiques(null);
      chargerAdministrateurs();
    } catch (err) {
      afficherToast(err.message || "Erreur lors de l'attribution des boutiques.", 'danger');
    } finally {
      setSavingBoutiques(false);
    }
  };

  // Basculer actif / inactif
  const handleToggleStatut = async (adm) => {
    const nouvelEtat = !adm.is_active;
    try {
      await api.superAdmin.administrateurs.update(adm.id, { is_active: nouvelEtat });
      afficherToast(`Compte '${adm.username}' ${nouvelEtat ? 'réactivé' : 'désactivé'}.`);
      chargerAdministrateurs();
    } catch (err) {
      afficherToast(err.message || "Erreur lors du changement de statut.", 'danger');
    }
  };

  // Supprimer admin
  const handleConfirmerSuppression = async () => {
    if (!adminPourSuppression) return;
    setDeleting(true);

    try {
      await api.superAdmin.administrateurs.delete(adminPourSuppression.id);
      afficherToast(`Compte administrateur '${adminPourSuppression.username}' supprimé définitivement.`);
      setAdminPourSuppression(null);
      chargerAdministrateurs();
    } catch (err) {
      afficherToast(err.message || "Erreur lors de la suppression.", 'danger');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* TOAST FLOTTANT */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1050,
          background: toast.type === 'danger' ? '#dc2626' : '#059669',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '600',
          fontSize: '0.9rem'
        }}>
          {toast.type === 'danger' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* EN-TÊTE DE SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
              Gestion des Administrateurs
            </h1>
            <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
              Rôle Intermédiaire
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px', margin: 0 }}>
            Créez des comptes administrateur et confiez-leur la gestion de boutiques spécifiques de la plateforme.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={chargerAdministrateurs} 
            className="btn btn-outline btn-sm"
            style={{ borderColor: '#475569', color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Actualiser la liste"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Actualiser</span>
          </button>

          <button
            onClick={ouvrirCreation}
            className="btn btn-primary btn-sm"
            style={{
              background: 'linear-gradient(135deg, #059669, #047857)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '700',
              padding: '8px 16px',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)'
            }}
          >
            <UserPlus size={16} />
            <span>Créer un Administrateur</span>
          </button>
        </div>
      </div>

      {/* RÈGLE MÉTIER / ENCADRÉ EXPLICATIF */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        fontSize: '0.84rem',
        color: '#93c5fd'
      }}>
        <ShieldCheck size={20} style={{ color: '#60a5fa', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: '#ffffff' }}>Privilèges du rôle Administrateur :</strong>
          <ul style={{ margin: '4px 0 0 18px', padding: 0, color: '#cbd5e1' }}>
            <li>Un administrateur ne peut consulter et modifier <strong>que les boutiques qui lui sont attribuées</strong> ci-dessous.</li>
            <li>Il a accès aux informations de la boutique, à la gestion de ses employés et à l'historique de ses paiements.</li>
            <li>Il <strong>ne peut pas</strong> créer d'autres administrateurs, ni suspendre/activer un compte boutique (privilège Super-Admin exclusif).</li>
          </ul>
        </div>
      </div>

      {/* BARRE DE RECHERCHE */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.7)',
        padding: '16px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '20px'
      }}>
        <div style={{ position: 'relative', maxWidth: '460px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Rechercher par nom, email, identifiant ou boutique gérée..."
            className="form-input"
            style={{
              paddingLeft: '38px',
              background: '#0f172a',
              borderColor: '#334155',
              color: '#ffffff'
            }}
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>
      </div>

      {/* TABLEAU DES ADMINISTRATEURS */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)'
      }}>
        {loading && administrateurs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <RefreshCw size={32} className="spin" style={{ margin: '0 auto 12px auto', color: '#60a5fa' }} />
            <p>Chargement des comptes administrateur...</p>
          </div>
        ) : adminsFiltres.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <Users size={48} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
            <h3 style={{ color: '#e2e8f0', fontSize: '1.1rem', marginBottom: '6px' }}>
              Aucun compte administrateur trouvé
            </h3>
            <p style={{ fontSize: '0.88rem', maxWidth: '460px', margin: '0 auto 16px auto' }}>
              {recherche ? "Aucun administrateur ne correspond à votre recherche." : "Vous n'avez pas encore créé de compte administrateur intermédiaire."}
            </p>
            {!recherche && (
              <button
                onClick={ouvrirCreation}
                className="btn btn-primary btn-sm"
                style={{ background: '#059669', color: '#ffffff' }}
              >
                Créer un premier compte Administrateur
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Administrateur</th>
                  <th>Contact</th>
                  <th>Boutiques Attribuées ({toutesBoutiques.length} dispos)</th>
                  <th>Statut Compte</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminsFiltres.map((adm) => {
                  const nbB = adm.nb_boutiques || (adm.boutiques_gerees ? adm.boutiques_gerees.length : 0);
                  const isActif = adm.is_active;

                  return (
                    <tr key={adm.id} style={{ opacity: isActif ? 1 : 0.65 }}>
                      {/* Identité */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <UserAvatar user={adm} size={40} />
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '0.98rem', color: '#ffffff' }}>
                              {adm.nom_complet || adm.username}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                              @{adm.username} • Inscrit le {new Date(adm.date_joined).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td>
                        <div style={{ fontSize: '0.85rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Mail size={13} style={{ color: '#94a3b8' }} />
                          <span>{adm.email || 'Email non renseigné'}</span>
                        </div>
                        {adm.telephone && (
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                            <Phone size={13} />
                            <span>{adm.telephone}</span>
                          </div>
                        )}
                      </td>

                      {/* Boutiques Attribuées */}
                      <td>
                        {nbB === 0 ? (
                          <span style={{ fontSize: '0.8rem', color: '#f87171', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={13} /> Aucune boutique attribuée
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '380px' }}>
                            {adm.boutiques_gerees.map(b => (
                              <span 
                                key={b.id} 
                                style={{
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  color: '#34d399',
                                  fontSize: '0.75rem',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Store size={11} />
                                <span>{b.nom}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => ouvrirGestionBoutiques(adm)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#38bdf8',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            marginTop: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: 0
                          }}
                        >
                          <Edit size={12} />
                          <span>{nbB > 0 ? "Modifier l'attribution" : "Attribuer des boutiques"}</span>
                        </button>
                      </td>

                      {/* Statut Compte */}
                      <td>
                        {isActif ? (
                          <span className="badge badge-success" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                            <CheckCircle size={12} /> Compte Actif
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                            <XCircle size={12} /> Compte Désactivé
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => ouvrirGestionBoutiques(adm)}
                            className="btn btn-outline btn-sm"
                            title="Attribuer ou retirer des boutiques"
                            style={{
                              borderColor: '#38bdf8',
                              color: '#38bdf8',
                              background: 'rgba(56, 189, 248, 0.08)',
                              padding: '6px 10px',
                              fontSize: '0.78rem'
                            }}
                          >
                            <Store size={13} />
                            <span>Boutiques</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatut(adm)}
                            className="btn btn-outline btn-sm"
                            title={isActif ? "Désactiver ce compte" : "Réactiver ce compte"}
                            style={{
                              borderColor: isActif ? '#f59e0b' : '#10b981',
                              color: isActif ? '#fbbf24' : '#34d399',
                              background: 'rgba(255,255,255,0.04)',
                              padding: '6px 10px',
                              fontSize: '0.78rem'
                            }}
                          >
                            {isActif ? "Désactiver" : "Activer"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setAdminPourSuppression(adm)}
                            className="btn btn-outline btn-sm"
                            title="Supprimer définitivement"
                            style={{
                              borderColor: 'rgba(239, 68, 68, 0.4)',
                              color: '#f87171',
                              background: 'rgba(239, 68, 68, 0.08)',
                              padding: '6px 8px'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALE 1 : CRÉATION D'UN ADMINISTRATEUR */}
      {showCreateModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '560px', width: '90%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '24px', color: '#f8fafc', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(5, 150, 105, 0.2)', color: '#34d399', padding: '8px', borderRadius: '8px' }}>
                  <UserPlus size={20} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                  Créer un Compte Administrateur
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {createError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#fca5a5', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreerAdmin}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                    Nom Complet
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
                    value={createNomComplet}
                    onChange={(e) => setCreateNomComplet(e.target.value)}
                    placeholder="Ex: Paul Amegan"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                    Nom d'utilisateur <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
                    value={createUsername}
                    onChange={(e) => setCreateUsername(e.target.value)}
                    placeholder="Ex: admin_lome"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                    Adresse Email <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    style={{ background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="admin@boutique.tg"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                    Téléphone
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
                    value={createTelephone}
                    onChange={(e) => setCreateTelephone(e.target.value)}
                    placeholder="+228 90 00 00 00"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                  Mot de passe initial <span style={{ color: '#f87171' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Key size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '38px', background: '#0f172a', borderColor: '#334155', color: '#ffffff' }}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    required
                  />
                </div>
              </div>

              {/* SÉLECTION DES BOUTIQUES À ATTRIBUER */}
              <div style={{ marginBottom: '22px' }}>
                <label className="form-label" style={{ color: '#cbd5e1', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Attribuer des boutiques initiales</span>
                  <span style={{ color: '#38bdf8', fontSize: '0.78rem' }}>
                    {createBoutiquesIds.length} sélectionnée(s)
                  </span>
                </label>

                {toutesBoutiques.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', padding: '10px', background: '#0f172a', borderRadius: '8px' }}>
                    Aucune boutique enregistrée sur la plateforme.
                  </div>
                ) : (
                  <div style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px'
                  }}>
                    {toutesBoutiques.map(b => {
                      const isChecked = createBoutiquesIds.includes(b.id);
                      return (
                        <label 
                          key={b.id} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            background: isChecked ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background 0.15s'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleBoutiqueSelectionCreation(b.id)}
                            style={{ accentColor: '#10b981', cursor: 'pointer' }}
                          />
                          <Building size={14} style={{ color: isChecked ? '#34d399' : '#94a3b8' }} />
                          <span style={{ fontSize: '0.85rem', color: isChecked ? '#ffffff' : '#cbd5e1', fontWeight: isChecked ? '700' : '500' }}>
                            {b.nom}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <small style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  Vous pourrez ajouter ou retirer des boutiques à tout moment ultérieurement.
                </small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: '#475569', color: '#cbd5e1' }}
                  disabled={creating}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={creating}
                  style={{ background: '#059669', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={16} />
                  <span>{creating ? "Création..." : "Créer l'administrateur"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE 2 : ATTRIBUTION DE BOUTIQUES POUR UN ADMIN EXISTANT */}
      {adminPourBoutiques && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '520px', width: '90%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '24px', color: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                  Attribution des Boutiques
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
                  Administrateur : <strong>{adminPourBoutiques.nom_complet || adminPourBoutiques.username}</strong> (@{adminPourBoutiques.username})
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setAdminPourBoutiques(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '12px' }}>
              Cochez les boutiques que cet administrateur est autorisé à voir et gérer :
            </p>

            <div style={{
              maxHeight: '260px',
              overflowY: 'auto',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px',
              marginBottom: '20px'
            }}>
              {toutesBoutiques.map(b => {
                const isChecked = selectedBoutiquesIds.includes(b.id);
                return (
                  <label 
                    key={b.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      background: isChecked ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleBoutiqueSelectionEdition(b.id)}
                      style={{ accentColor: '#10b981', cursor: 'pointer' }}
                    />
                    <Building size={16} style={{ color: isChecked ? '#34d399' : '#94a3b8' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', color: isChecked ? '#ffffff' : '#cbd5e1', fontWeight: isChecked ? '700' : '500' }}>
                        {b.nom}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {b.telephone || 'Sans numéro'} • {b.adresse || 'Lomé, Togo'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {selectedBoutiquesIds.length} boutique(s) sélectionnée(s)
              </span>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAdminPourBoutiques(null)}
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: '#475569', color: '#cbd5e1' }}
                  disabled={savingBoutiques}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSauvegarderAttribution}
                  className="btn btn-primary btn-sm"
                  disabled={savingBoutiques}
                  style={{ background: '#059669', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={16} />
                  <span>{savingBoutiques ? "Enregistrement..." : "Valider l'attribution"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE 3 : CONFIRMATION SUPPRESSION ADMINISTRATEUR */}
      {adminPourSuppression && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '440px', width: '90%', background: '#1e293b', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '16px', padding: '24px', color: '#f8fafc', textAlign: 'center' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Trash2 size={26} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', marginBottom: '8px' }}>
              Supprimer cet administrateur ?
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '20px' }}>
              Voulez-vous vraiment supprimer le compte administrateur de <strong>{adminPourSuppression.username}</strong> ({adminPourSuppression.email}) ?
              <br />
              Cette action est irréversible. Les boutiques attribuées ne seront pas supprimées.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setAdminPourSuppression(null)}
                className="btn btn-outline btn-sm"
                style={{ borderColor: '#475569', color: '#cbd5e1' }}
                disabled={deleting}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmerSuppression}
                className="btn btn-danger btn-sm"
                disabled={deleting}
                style={{ background: '#dc2626', color: '#ffffff' }}
              >
                {deleting ? "Suppression en cours..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
