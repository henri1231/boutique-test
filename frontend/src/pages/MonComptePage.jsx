import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { UserAvatar } from '../components/UserAvatar';
import { 
  User, 
  Camera, 
  UploadCloud, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  Store, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Save, 
  RefreshCw,
  Lock,
  Key,
  Eye,
  EyeOff,
  MapPin,
  Building
} from 'lucide-react';

export const MonComptePage = () => {
  const { user, refreshUser, isGerant } = useAuth();

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  // Coordonnées personnelles
  const [username, setUsername] = useState(user?.username || '');
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [telephone, setTelephone] = useState(user?.telephone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [updatingInfo, setUpdatingInfo] = useState(false);

  // Informations de la boutique (pour le gérant)
  const [boutiqueNom, setBoutiqueNom] = useState(user?.boutique?.nom || user?.boutique_detail?.nom || '');
  const [boutiqueTelephone, setBoutiqueTelephone] = useState(user?.boutique?.telephone || user?.boutique_detail?.telephone || '');
  const [boutiqueAdresse, setBoutiqueAdresse] = useState(user?.boutique?.adresse || user?.boutique_detail?.adresse || '');
  const [updatingBoutique, setUpdatingBoutique] = useState(false);

  // Changement de mot de passe
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmerMdp, setConfirmerMdp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingMdp, setUpdatingMdp] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setTelephone(user.telephone || '');
      setEmail(user.email || '');
      const b = user.boutique || user.boutique_detail;
      if (b) {
        setBoutiqueNom(b.nom || '');
        setBoutiqueTelephone(b.telephone || '');
        setBoutiqueAdresse(b.adresse || '');
      }
    }
  }, [user]);

  // Gestion de la sélection du fichier image
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErreur("Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErreur("L'image est trop volumineuse (maximum 5 Mo).");
      return;
    }

    setErreur('');
    setSucces('');
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Envoi de la photo de profil via FormData
  const handleUploadPhoto = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setErreur('');
    setSucces('');

    try {
      const formData = new FormData();
      formData.append('photo_profil', selectedFile);

      await api.auth.updateProfil(formData);
      await refreshUser();

      setSucces("Photo de profil mise à jour avec succès !");
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setErreur(err.message || "Erreur lors de l'enregistrement de la photo.");
    } finally {
      setUploading(false);
    }
  };

  // Suppression de la photo de profil existante
  const handleSupprimerPhoto = async () => {
    if (!window.confirm("Voulez-vous vraiment retirer votre photo de profil ?")) {
      return;
    }

    setUploading(true);
    setErreur('');
    setSucces('');

    try {
      const formData = new FormData();
      formData.append('supprimer_photo', 'true');

      await api.auth.updateProfil(formData);
      await refreshUser();

      setSelectedFile(null);
      setPreviewUrl(null);
      setSucces("Photo de profil retirée. Vos initiales sont désormais affichées.");
    } catch (err) {
      setErreur(err.message || "Erreur lors du retrait de la photo.");
    } finally {
      setUploading(false);
    }
  };

  // 1. Enregistrement des coordonnées personnelles (nom, identifiant, téléphone, email)
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setUpdatingInfo(true);
    setErreur('');
    setSucces('');

    try {
      const payload = {
        username: username.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        telephone: telephone.trim(),
        email: email.trim(),
      };
      await api.auth.updateProfil(payload);
      await refreshUser();
      setSucces("Vos coordonnées personnelles ont été mises à jour avec succès !");
    } catch (err) {
      setErreur(err.message || "Erreur lors de la mise à jour des coordonnées.");
    } finally {
      setUpdatingInfo(false);
    }
  };

  // 2. Enregistrement des informations de la boutique (Gérant)
  const handleSaveBoutique = async (e) => {
    e.preventDefault();
    setUpdatingBoutique(true);
    setErreur('');
    setSucces('');

    try {
      const payload = {
        boutique_nom: boutiqueNom.trim(),
        boutique_telephone: boutiqueTelephone.trim(),
        boutique_adresse: boutiqueAdresse.trim(),
      };
      await api.auth.updateProfil(payload);
      await refreshUser();
      setSucces("Les coordonnées de votre boutique ont été enregistrées avec succès !");
    } catch (err) {
      setErreur(err.message || "Erreur lors de la mise à jour de la boutique.");
    } finally {
      setUpdatingBoutique(false);
    }
  };

  // 3. Changement sécurisé du mot de passe
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!ancienMdp) {
      setErreur("Veuillez saisir votre mot de passe actuel.");
      return;
    }
    if (!nouveauMdp || nouveauMdp.length < 6) {
      setErreur("Le nouveau mot de passe doit comporter au moins 6 caractères.");
      return;
    }
    if (nouveauMdp !== confirmerMdp) {
      setErreur("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }

    setUpdatingMdp(true);
    setErreur('');
    setSucces('');

    try {
      const res = await api.auth.updateProfil({
        ancien_mot_de_passe: ancienMdp,
        nouveau_mot_de_passe: nouveauMdp,
        confirmer_mot_de_passe: confirmerMdp,
      });

      // Renouveler les jetons JWT si fournis pour maintenir la session active
      if (res?.tokens?.access) {
        localStorage.setItem('boutique_access_token', res.tokens.access);
        if (res?.tokens?.refresh) {
          localStorage.setItem('boutique_refresh_token', res.tokens.refresh);
        }
      }

      setAncienMdp('');
      setNouveauMdp('');
      setConfirmerMdp('');
      setSucces(res?.message || "Votre mot de passe a été modifié avec succès !");
      await refreshUser();
    } catch (err) {
      setErreur(err.message || "Erreur lors du changement de mot de passe.");
    } finally {
      setUpdatingMdp(false);
    }
  };

  const dummyUserWithPreview = previewUrl
    ? { ...user, photo_profil_url: previewUrl }
    : user;

  return (
    <div className="container" style={{ maxWidth: '820px', padding: '32px 16px 80px 16px' }}>
      {/* EN-TÊTE DE PAGE */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary-900)', letterSpacing: '-0.02em', margin: 0 }}>
            Mon Compte & Paramètres
          </h1>
          <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
            {isGerant ? '★ Gérant' : '🛒 Employé'}
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '4px' }}>
          Modifiez vos informations personnelles, votre numéro, votre mot de passe et les coordonnées de votre boutique.
        </p>
      </div>

      {/* MESSAGES D'ALERTE */}
      {erreur && (
        <div style={{
          background: 'var(--danger-50)',
          color: 'var(--danger-700)',
          border: '1px solid var(--danger-100)',
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontWeight: '600'
        }}>
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <span>{erreur}</span>
        </div>
      )}

      {succes && (
        <div style={{
          background: 'var(--success-50)',
          color: 'var(--success-700)',
          border: '1px solid var(--success-100)',
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontWeight: '700'
        }}>
          <CheckCircle size={20} style={{ flexShrink: 0 }} />
          <span>{succes}</span>
        </div>
      )}

      {/* SECTION 1 : PHOTO DE PROFIL */}
      <div className="card" style={{ padding: '28px', marginBottom: '24px', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{
            background: 'var(--primary-50)',
            color: 'var(--primary-700)',
            padding: '8px',
            borderRadius: '10px'
          }}>
            <Camera size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--primary-900)', margin: 0 }}>
              Photo de Profil
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
              Cette photo s'affiche en avatar dans la barre de navigation et sur vos échanges avec l'équipe.
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          background: 'var(--bg-app)',
          padding: '20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--surface-border)'
        }}>
          {/* APERÇU AVATAR DYNAMIQUE */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <UserAvatar
              user={dummyUserWithPreview}
              size={96}
              style={{
                border: '3px solid #ffffff',
                boxShadow: '0 8px 20px rgba(15, 84, 65, 0.25)',
                fontSize: '28px'
              }}
            />
            {previewUrl && (
              <span style={{
                position: 'absolute',
                bottom: '-6px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--gold-500)',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '999px',
                whiteSpace: 'nowrap'
              }}>
                Aperçu
              </span>
            )}
          </div>

          {/* ACTIONS D'UPLOAD */}
          <div style={{ flex: '1 1 260px' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                disabled={uploading}
              >
                <UploadCloud size={16} />
                <span>{selectedFile ? "Changer le fichier" : "Choisir une photo..."}</span>
              </button>

              {selectedFile && (
                <button
                  type="button"
                  onClick={handleUploadPhoto}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  disabled={uploading}
                >
                  <Save size={16} />
                  <span>{uploading ? "Envoi en cours..." : "Enregistrer la photo"}</span>
                </button>
              )}

              {user?.photo_profil_url && !selectedFile && (
                <button
                  type="button"
                  onClick={handleSupprimerPhoto}
                  className="btn btn-outline btn-sm"
                  style={{ color: 'var(--danger-600)', borderColor: 'var(--danger-200)', display: 'flex', alignItems: 'center', gap: '6px' }}
                  disabled={uploading}
                  title="Retirer la photo actuelle"
                >
                  <Trash2 size={15} />
                  <span>Retirer la photo</span>
                </button>
              )}
            </div>

            <div style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {selectedFile ? (
                <span style={{ color: 'var(--primary-700)', fontWeight: '600' }}>
                  Fichier sélectionné : {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} Ko)
                </span>
              ) : (
                "Formats acceptés : JPG, PNG, WebP. Taille max : 5 Mo. Si aucune photo n'est choisie, vos initiales seront affichées."
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2 : COORDONNÉES PERSONNELLES DU GÉRANT */}
      <div className="card" style={{ padding: '28px', marginBottom: '24px', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{
            background: 'var(--primary-50)',
            color: 'var(--primary-700)',
            padding: '8px',
            borderRadius: '10px'
          }}>
            <User size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--primary-900)', margin: 0 }}>
              Mes Informations Personnelles
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
              Identifiant de connexion, nom, prénom, numéro de téléphone et adresse email.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveInfo}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '700' }}>Nom d'utilisateur (Identifiant)</label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: gerant_lome"
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                Sert d'identifiant pour vous connecter à la boutique.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '700' }}>Numéro de téléphone personnel</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="+228 90 12 34 56"
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label">Prénom</label>
              <input
                type="text"
                className="form-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ex: Koffi"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nom de famille</label>
              <input
                type="text"
                className="form-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ex: Mensah"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Adresse email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '36px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="gerant@boutique.tg"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={updatingInfo}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}
            >
              <Save size={18} />
              <span>{updatingInfo ? "Enregistrement..." : "Enregistrer mes coordonnées"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 3 : COORDONNÉES DE LA BOUTIQUE (ACCESSIBLE AU GÉRANT) */}
      {isGerant && (
        <div className="card" style={{ padding: '28px', marginBottom: '24px', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--primary-700)',
              padding: '8px',
              borderRadius: '10px'
            }}>
              <Store size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--primary-900)', margin: 0 }}>
                Coordonnées de la Boutique
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                Ces informations apparaissent en en-tête de vos reçus de caisse remis aux clients.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveBoutique}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700' }}>Nom commercial de la boutique</label>
                <div style={{ position: 'relative' }}>
                  <Building size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '36px' }}
                    value={boutiqueNom}
                    onChange={(e) => setBoutiqueNom(e.target.value)}
                    placeholder="Ex: Boutique Élégance Togo"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700' }}>Numéro de téléphone de la boutique</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '36px' }}
                    value={boutiqueTelephone}
                    onChange={(e) => setBoutiqueTelephone(e.target.value)}
                    placeholder="+228 90 00 11 22"
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ fontWeight: '700' }}>Adresse physique & Localisation</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  value={boutiqueAdresse}
                  onChange={(e) => setBoutiqueAdresse(e.target.value)}
                  placeholder="Ex: Grand Marché de Lomé, Rue du Commerce"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-outline"
                disabled={updatingBoutique}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}
              >
                <Save size={18} />
                <span>{updatingBoutique ? "Enregistrement..." : "Mettre à jour la boutique"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION 4 : SÉCURITÉ & CHANGEMENT DE MOT DE PASSE */}
      <div className="card" style={{ padding: '28px', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--danger-600)',
            padding: '8px',
            borderRadius: '10px'
          }}>
            <Lock size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--primary-900)', margin: 0 }}>
              Sécurité & Mot de Passe
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
              Modifiez votre mot de passe d'accès pour sécuriser la gestion de votre boutique.
            </p>
          </div>
        </div>

        <form onSubmit={handleSavePassword}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: '700' }}>Mot de passe actuel</label>
            <div style={{ position: 'relative' }}>
              <Key size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                type={showPassword ? "text" : "password"}
                className="form-input"
                style={{ paddingLeft: '36px', paddingRight: '40px' }}
                value={ancienMdp}
                onChange={(e) => setAncienMdp(e.target.value)}
                placeholder="Saisissez votre mot de passe actuel"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-light)',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '700' }}>Nouveau mot de passe</label>
              <input
                type={showPassword ? "text" : "password"}
                className="form-input"
                value={nouveauMdp}
                onChange={(e) => setNouveauMdp(e.target.value)}
                placeholder="Au moins 6 caractères"
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '700' }}>Confirmer le nouveau mot de passe</label>
              <input
                type={showPassword ? "text" : "password"}
                className="form-input"
                value={confirmerMdp}
                onChange={(e) => setConfirmerMdp(e.target.value)}
                placeholder="Répétez le mot de passe"
                required
                minLength={6}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={updatingMdp}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}
            >
              <Key size={18} />
              <span>{updatingMdp ? "Modification en cours..." : "Modifier mon mot de passe"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
