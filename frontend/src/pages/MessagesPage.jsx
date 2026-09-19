import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/UserAvatar';
import {
  MessageSquare,
  Send,
  Users,
  User,
  Megaphone,
  AlertCircle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Clock,
  Sparkles,
  Search,
  CheckCheck
} from 'lucide-react';

export const MessagesPage = () => {
  const { user, isGerant } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Canal actif : 'equipe' ou 'direct_<id>'
  const [canalActif, setCanalActif] = useState('equipe');
  const [employeCible, setEmployeCible] = useState(null);

  // Données
  const [employes, setEmployes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // Formulaire d'envoi
  const [nouveauContenu, setNouveauContenu] = useState('');
  const [nouveauTitre, setNouveauTitre] = useState('');
  const [typeMessage, setTypeMessage] = useState('consigne'); // 'consigne', 'urgent', 'normal'

  // Toast / messages d'info
  const [notification, setNotification] = useState('');
  const [rechercheContact, setRechercheContact] = useState('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const afficherNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  // Charger la liste des membres de l'équipe
  const chargerEquipe = useCallback(async () => {
    try {
      const data = await api.auth.getEmployes();
      const liste = Array.isArray(data) ? data : (data.results || []);
      setEmployes(liste);
    } catch (err) {
      console.error("Erreur chargement équipe:", err);
    }
  }, []);

  // Détecter l'employé passé dans les paramètres d'URL (ex: ?employe_id=3)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const empId = params.get('employe_id');
    if (empId) {
      setCanalActif(`direct_${empId}`);
    }
  }, [location.search]);

  // Charger les messages du canal courant
  const chargerMessages = useCallback(async (silencieux = false) => {
    if (!silencieux) setLoading(true);
    else setRefreshing(true);

    try {
      const params = {};
      if (canalActif === 'equipe') {
        params.canal = 'equipe';
      } else if (canalActif.startsWith('direct_')) {
        const empId = canalActif.replace('direct_', '');
        params.canal = 'direct';
        params.employe_id = empId;
      }

      const res = await api.communication.getMessages(params);
      const liste = Array.isArray(res) ? res : (res.results || []);
      setMessages(liste);

      // Marquer automatiquement les messages reçus comme lus
      for (const m of liste) {
        if (!m.est_lu && m.expediteur !== user?.id) {
          api.communication.marquerLu(m.id).catch(() => {});
        }
      }
    } catch (err) {
      console.error("Erreur chargement messages:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canalActif, user?.id]);

  useEffect(() => {
    chargerEquipe();
  }, [chargerEquipe]);

  useEffect(() => {
    chargerMessages();
  }, [chargerMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Polling doux toutes les 12 secondes pour actualiser le chat
  useEffect(() => {
    const interval = setInterval(() => {
      chargerMessages(true);
    }, 12000);
    return () => clearInterval(interval);
  }, [chargerMessages]);

  // Mettre à jour l'employé cible quand on change de canal direct
  useEffect(() => {
    if (canalActif.startsWith('direct_')) {
      const empId = parseInt(canalActif.replace('direct_', ''), 10);
      const trouve = employes.find(e => e.id === empId);
      setEmployeCible(trouve || null);
    } else {
      setEmployeCible(null);
    }
  }, [canalActif, employes]);

  // Envoi d'un message
  const handleEnvoyerMessage = async (e) => {
    if (e) e.preventDefault();
    if (!nouveauContenu.trim() || envoiEnCours) return;

    setEnvoiEnCours(true);
    try {
      const payload = {
        contenu: nouveauContenu.trim(),
        titre: nouveauTitre.trim(),
        type_message: canalActif === 'equipe' ? typeMessage : 'normal',
      };

      if (canalActif === 'equipe') {
        payload.destine_a_tous = true;
      } else if (canalActif.startsWith('direct_')) {
        const empId = parseInt(canalActif.replace('direct_', ''), 10);
        payload.destinataire = empId;
        payload.destine_a_tous = false;
      }

      const res = await api.communication.envoyerMessage(payload);
      setMessages(prev => [...prev, res]);
      setNouveauContenu('');
      setNouveauTitre('');
      scrollToBottom();
      afficherNotification("Message envoyé avec succès !");
    } catch (err) {
      afficherNotification(err.message || "Erreur lors de l'envoi du message.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  // Suppression d'un message
  const handleSupprimerMessage = async (msgId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce message ?")) return;
    try {
      await api.communication.supprimerMessage(msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      afficherNotification("Message supprimé.");
    } catch (err) {
      afficherNotification(err.message || "Erreur lors de la suppression.");
    }
  };

  // Tout marquer comme lu
  const handleToutMarquerLu = async () => {
    try {
      await api.communication.toutMarquerLu();
      setMessages(prev => prev.map(m => ({ ...m, est_lu: true })));
      afficherNotification("Tous les messages ont été marqués comme lus.");
    } catch (err) {
      afficherNotification("Erreur lors de la mise à jour.");
    }
  };

  // Filtrer les employés pour la recherche latérale
  const employesFiltres = employes.filter(e => {
    const q = rechercheContact.toLowerCase();
    return (
      e.username?.toLowerCase().includes(q) ||
      (e.first_name && e.first_name.toLowerCase().includes(q)) ||
      (e.last_name && e.last_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="app-container" style={{ paddingBottom: '32px' }}>
      {/* HEADER DE PAGE */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #059669, #0f5441)',
              color: '#ffffff',
              padding: '10px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
            }}>
              <MessageSquare size={24} />
            </div>
            <div>
              <h1 className="page-title" style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800' }}>
                Communication Interne
              </h1>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Échanges d'équipe, annonces et consignes du quotidien
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => chargerMessages(true)}
            className="btn btn-outline btn-sm"
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Rafraîchir les messages"
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            <span>Actualiser</span>
          </button>

          <button
            onClick={handleToutMarquerLu}
            className="btn btn-outline btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Marquer tous les messages comme lus"
          >
            <CheckCheck size={16} />
            <span>Tout marquer lu</span>
          </button>
        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {notification && (
        <div style={{
          background: 'linear-gradient(135deg, #064e3b, #047857)',
          color: '#ecfdf5',
          padding: '10px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.88rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <CheckCircle2 size={18} style={{ color: '#34d399' }} />
          <span>{notification}</span>
        </div>
      )}

      {/* ZONE CENTRALE SPLIT EN 2 COLONNES */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(260px, 320px) 1fr',
        gap: '20px',
        alignItems: 'start',
        minHeight: '620px'
      }}>
        {/* COLONNE GAUCHE : CANAUX ET DISCUSSIONS */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* HEADER CANAUX */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', background: '#f8fafc' }}>
            <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '0.92rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} style={{ color: 'var(--primary-600)' }} />
              <span>Canaux de discussion</span>
            </div>

            {/* BARRE DE RECHERCHE CONTACT */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Rechercher un membre..."
                className="form-input"
                style={{
                  fontSize: '0.82rem',
                  padding: '6px 10px 6px 30px',
                  borderRadius: '6px',
                  height: '34px'
                }}
                value={rechercheContact}
                onChange={(e) => setRechercheContact(e.target.value)}
              />
            </div>
          </div>

          {/* LISTE DES CANAUX */}
          <div style={{ padding: '8px', maxHeight: '520px', overflowY: 'auto' }}>
            {/* CANAL PRINCIPAL D'ÉQUIPE */}
            <button
              type="button"
              onClick={() => setCanalActif('equipe')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '8px',
                border: 'none',
                textAlign: 'left',
                background: canalActif === 'equipe' ? 'linear-gradient(135deg, rgba(5, 150, 105, 0.12), rgba(16, 185, 129, 0.08))' : 'transparent',
                color: canalActif === 'equipe' ? 'var(--primary-700)' : 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontWeight: canalActif === 'equipe' ? '700' : '500',
                borderLeft: canalActif === 'equipe' ? '3px solid var(--primary-600)' : '3px solid transparent',
                marginBottom: '4px'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: canalActif === 'equipe' ? 'var(--primary-600)' : '#e2e8f0',
                color: canalActif === 'equipe' ? '#ffffff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Megaphone size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Toute l'équipe
                  </span>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Consignes générales & annonces
                </div>
              </div>
            </button>

            {/* SÉPARATEUR */}
            <div style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#94a3b8',
              margin: '12px 8px 6px 8px'
            }}>
              {isGerant ? "Discussions avec les employés" : "Échanges individuels"}
            </div>

            {/* LISTE DES EMPLOYÉS OU GÉRANT */}
            {employesFiltres.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                Aucun membre trouvé.
              </div>
            ) : (
              employesFiltres.map(emp => {
                const estSelectionne = canalActif === `direct_${emp.id}`;
                const nomAffiche = emp.first_name || emp.last_name 
                  ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() 
                  : emp.username;

                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setCanalActif(`direct_${emp.id}`)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      textAlign: 'left',
                      background: estSelectionne ? 'linear-gradient(135deg, rgba(5, 150, 105, 0.12), rgba(16, 185, 129, 0.08))' : 'transparent',
                      color: estSelectionne ? 'var(--primary-700)' : 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontWeight: estSelectionne ? '700' : '500',
                      borderLeft: estSelectionne ? '3px solid var(--primary-600)' : '3px solid transparent',
                      marginBottom: '2px'
                    }}
                  >
                    <UserAvatar
                      photoUrl={emp.photo_profil_url}
                      nom={nomAffiche}
                      taille={38}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {nomAffiche}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          background: emp.role === 'gerant' ? '#fef3c7' : '#e0e7ff',
                          color: emp.role === 'gerant' ? '#92400e' : '#3730a3',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: '600'
                        }}>
                          {emp.role === 'gerant' ? 'Gérant' : 'Employé'}
                        </span>
                        {emp.telephone && (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {emp.telephone}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* COLONNE DROITE : FIL DE DISCUSSION & ZONE DE SAISIE */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          height: '620px',
          overflow: 'hidden'
        }}>
          {/* HEADER DE DISCUSSION */}
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-color)',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {canalActif === 'equipe' ? (
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)'
                }}>
                  <Megaphone size={22} />
                </div>
              ) : (
                <UserAvatar
                  photoUrl={employeCible?.photo_profil_url}
                  nom={employeCible?.get_full_name || employeCible?.username || "Discussion"}
                  taille={42}
                />
              )}

              <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main)' }}>
                  {canalActif === 'equipe'
                    ? "Consignes & Annonces d'Équipe"
                    : (employeCible?.first_name 
                        ? `${employeCible.first_name} ${employeCible.last_name || ''}`.trim()
                        : employeCible?.username || "Discussion Directe")}
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {canalActif === 'equipe'
                    ? "Canal public partagé avec tous les membres de la boutique"
                    : `Échange privé avec ${employeCible?.username || 'cet utilisateur'}`}
                </div>
              </div>
            </div>

            <span style={{
              background: '#ecfdf5',
              color: '#065f46',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: '700',
              border: '1px solid #a7f3d0'
            }}>
              🏪 {user?.boutique?.nom || user?.boutique_detail?.nom || "Boutique"}
            </span>
          </div>

          {/* LISTE DES MESSAGES DU FIL (SCROLLABLE) */}
          <div style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px auto' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Chargement des messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: '#94a3b8',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  color: '#64748b'
                }}>
                  <MessageSquare size={28} />
                </div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: '700' }}>
                  Aucun message pour l'instant
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', maxWidth: '340px' }}>
                  {canalActif === 'equipe'
                    ? "Le gérant peut poster des consignes de travail, des rappels de stock ou des annonces ici."
                    : "Démarrez un échange direct avec ce membre de l'équipe."}
                </p>
              </div>
            ) : (
              messages.map(msg => {
                const estMonMessage = msg.expediteur === user?.id;
                const estConsigne = msg.type_message === 'consigne';
                const estUrgent = msg.type_message === 'urgent';

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: estMonMessage ? 'flex-end' : 'flex-start',
                      width: '100%'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      flexDirection: estMonMessage ? 'row-reverse' : 'row',
                      maxWidth: '85%'
                    }}>
                      {/* AVATAR EXPÉDITEUR */}
                      <UserAvatar
                        photoUrl={msg.expediteur_detail?.photo_profil_url}
                        nom={msg.expediteur_detail?.nom_complet || msg.expediteur_detail?.username || "Auteur"}
                        taille={34}
                      />

                      {/* BULLE DU MESSAGE */}
                      <div style={{
                        background: estMonMessage 
                          ? 'linear-gradient(135deg, #059669, #047857)' 
                          : (estUrgent 
                              ? '#fff1f2' 
                              : (estConsigne ? '#fffbeb' : '#ffffff')),
                        color: estMonMessage 
                          ? '#ffffff' 
                          : (estUrgent ? '#9f1239' : (estConsigne ? '#92400e' : 'var(--text-main)')),
                        border: estMonMessage 
                          ? 'none' 
                          : (estUrgent 
                              ? '1px solid #fecdd3' 
                              : (estConsigne ? '1px solid #fde68a' : '1px solid var(--border-color)')),
                        borderRadius: estMonMessage ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                        padding: '12px 16px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                        position: 'relative'
                      }}>
                        {/* ENTÊTE DE BULLE (SI PAS MON MESSAGE) */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '6px',
                          fontSize: '0.75rem',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{ fontWeight: '700', color: estMonMessage ? '#a7f3d0' : 'inherit' }}>
                            {estMonMessage ? "Moi" : msg.expediteur_detail?.nom_complet || msg.expediteur_detail?.username}
                          </span>

                          <span style={{
                            fontSize: '0.68rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: '700',
                            background: estMonMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
                            color: estMonMessage ? '#ffffff' : 'inherit'
                          }}>
                            {msg.expediteur_detail?.role === 'gerant' ? 'Gérant' : 'Employé'}
                          </span>

                          {estConsigne && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontWeight: '700',
                              color: estMonMessage ? '#fef08a' : '#b45309'
                            }}>
                              <Sparkles size={12} /> Consigne d'équipe
                            </span>
                          )}

                          {estUrgent && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontWeight: '700',
                              color: estMonMessage ? '#fecdd3' : '#e11d48'
                            }}>
                              <AlertCircle size={12} /> Important
                            </span>
                          )}
                        </div>

                        {/* TITRE OPTIONNEL */}
                        {msg.titre && (
                          <div style={{
                            fontWeight: '800',
                            fontSize: '0.92rem',
                            marginBottom: '4px',
                            color: estMonMessage ? '#ffffff' : 'inherit'
                          }}>
                            {msg.titre}
                          </div>
                        )}

                        {/* CORPS DU MESSAGE */}
                        <div style={{
                          fontSize: '0.88rem',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {msg.contenu}
                        </div>

                        {/* BAS DE BULLE : HORODATAGE & ACTIONS */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          marginTop: '8px',
                          paddingTop: '6px',
                          borderTop: estMonMessage ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.05)',
                          fontSize: '0.72rem',
                          color: estMonMessage ? '#d1fae5' : '#94a3b8'
                        }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} />
                            {msg.date_formatee || new Date(msg.date_envoi).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* ACCUSÉ DE LECTURE */}
                            {msg.destine_a_tous ? (
                              <span title={`Lu par ${msg.nb_lecteurs} membre(s)`}>
                                {msg.nb_lecteurs > 0 ? `✓ Lu par ${msg.nb_lecteurs}` : 'Envoyé'}
                              </span>
                            ) : (
                              <span>
                                {msg.est_lu ? '✓✓ Lu' : '✓ Envoyé'}
                              </span>
                            )}

                            {/* BOUTON SUPPRIMER (SI AUTEUR OU GÉRANT) */}
                            {(estMonMessage || isGerant) && (
                              <button
                                type="button"
                                onClick={() => handleSupprimerMessage(msg.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: estMonMessage ? '#fecdd3' : '#f87171',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Supprimer ce message"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ZONE DE SAISIE DU MESSAGE */}
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-color)',
            background: '#ffffff',
            flexShrink: 0
          }}>
            <form onSubmit={handleEnvoyerMessage}>
              {/* OPTIONS SI CANAL D'ÉQUIPE (CHOIX CONSIGNES / TYPE) */}
              {canalActif === 'equipe' && isGerant && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b' }}>Type :</span>

                  <button
                    type="button"
                    onClick={() => setTypeMessage('consigne')}
                    style={{
                      border: 'none',
                      background: typeMessage === 'consigne' ? '#fef3c7' : '#f1f5f9',
                      color: typeMessage === 'consigne' ? '#92400e' : '#64748b',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Sparkles size={12} /> Consigne d'équipe
                  </button>

                  <button
                    type="button"
                    onClick={() => setTypeMessage('urgent')}
                    style={{
                      border: 'none',
                      background: typeMessage === 'urgent' ? '#fee2e2' : '#f1f5f9',
                      color: typeMessage === 'urgent' ? '#991b1b' : '#64748b',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <AlertCircle size={12} /> Important / Urgent
                  </button>

                  <button
                    type="button"
                    onClick={() => setTypeMessage('normal')}
                    style={{
                      border: 'none',
                      background: typeMessage === 'normal' ? '#e2e8f0' : '#f1f5f9',
                      color: typeMessage === 'normal' ? '#1e293b' : '#64748b',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      cursor: 'pointer'
                    }}
                  >
                    Standard
                  </button>
                </div>
              )}

              {/* TITRE OPTIONNEL POUR LES CONSIGNES */}
              {canalActif === 'equipe' && isGerant && (typeMessage === 'consigne' || typeMessage === 'urgent') && (
                <input
                  type="text"
                  placeholder="Objet ou titre de la consigne (ex: Consigne ouverture, Arrivage riz)..."
                  className="form-input"
                  style={{
                    fontSize: '0.85rem',
                    marginBottom: '8px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    borderColor: '#cbd5e1'
                  }}
                  value={nouveauTitre}
                  onChange={(e) => setNouveauTitre(e.target.value)}
                />
              )}

              {/* CHAMP DE TEXTE & BOUTON D'ENVOI */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder={
                    canalActif === 'equipe'
                      ? (isGerant ? "Rédiger une consigne ou une annonce pour toute l'équipe..." : "Répondre ou poser une question à l'équipe...")
                      : `Écrire un message à ${employeCible?.username || 'ce contact'}...`
                  }
                  style={{
                    flex: 1,
                    resize: 'none',
                    fontSize: '0.9rem',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    borderColor: '#cbd5e1',
                    lineHeight: '1.4'
                  }}
                  value={nouveauContenu}
                  onChange={(e) => setNouveauContenu(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleEnvoyerMessage();
                    }
                  }}
                />

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={envoiEnCours || !nouveauContenu.trim()}
                  style={{
                    height: '46px',
                    padding: '0 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: '700',
                    borderRadius: '8px',
                    flexShrink: 0
                  }}
                >
                  <Send size={16} />
                  <span>Envoyer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
