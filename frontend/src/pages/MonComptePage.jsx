import React, { useState, useRef } from 'react';
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
  RefreshCw 
} from 'lucide-react';

export const MonComptePage = () => {
  const { user, refreshUser, isGerant } = useAuth();

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  // Champs modifiables du profil
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [telephone, setTelephone] = useState(user?.telephone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [updatingInfo, setUpdatingInfo] = useState(false);

  // Gestion de la sélection du fichier image
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérification du type MIME
    if (!file.type.startsWith('image/')) {
      setErreur("Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).");
      return;
    }

    // Vérification de la taille (max 5 Mo)
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

  // Enregistrement des informations textuelles
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setUpdatingInfo(true);
    setErreur('');
    setSucces('');

    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        telephone: telephone.trim(),
        email: email.trim(),
      };
      await api.auth.updateProfil(payload);
      await refreshUser();
      setSucces("Coordonnées du profil mises à jour avec succès !");
    } catch (err) {
      setErreur(err.message || "Erreur lors de la mise à jour du profil.");
    } finally {
      setUpdatingInfo(false);
    }
  };

  const dummyUserWithPreview = previewUrl
    ? { ...user, photo_profil_url: previewUrl }
    : user;

  return (
    <div className="container" style={{ maxWidth: '780px', padding: '32px 16px 60px 16px' }}>
      {/* EN-TÊTE DE PAGE */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary-900)', letterSpacing: '-0.02em', margin: 0 }}>
            Mon Compte
          </h1>
          <span className="badge badge-gold" style={{ fontSize: '0.75rem' }}>
            {isGerant ? '★ Gérant' : '🛒 Employé'}
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '4px' }}>
          Gérez votre photo de profil et vos coordonnées personnelles pour la boutique{' '}
          <strong>{user?.boutique?.nom || user?.boutique_detail?.nom || 'Boutique'}</strong>
        </p>
      </div>

      {/* MESSAGES D'ALERTE */}
      {erreur && (
        <div style={{
          background: 'var(--danger-50)',
          color: 'var(--danger-700)',
          border: '1px solid var(--danger-100)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{erreur}</span>
        </div>
      )}

      {succes && (
        <div style={{
          background: 'var(--success-50)',
          color: 'var(--success-700)',
          border: '1px solid var(--success-100)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
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
              Cette image apparaît en avatar dans la barre de navigation et sur vos reçus de vente.
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
                "Formats acceptés : JPG, PNG, WebP. Taille maximale recommandée : 5 Mo. Si aucune photo n'est choisie, vos initiales seront affichées élégamment."
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2 : INFORMATIONS PERSONNELLES */}
      <div className="card" style={{ padding: '28px', boxShadow: 'var(--shadow-md)' }}>
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
              Informations du Compte
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
              Coordonnées associées à votre profil utilisateur.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveInfo}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label">Numéro de téléphone</label>
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

            <div className="form-group">
              <label className="form-label">Adresse email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemple@boutique.tg"
                />
              </div>
            </div>
          </div>

          <div style={{
            background: 'var(--primary-50)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '24px',
            border: '1px solid var(--primary-100)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--primary-700)', fontWeight: '700' }}>
                Nom d'utilisateur (Identifiant de connexion)
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: '800', color: 'var(--primary-900)' }}>
                @{user?.username}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--primary-700)', fontWeight: '700' }}>
                Boutique associée
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--primary-900)' }}>
                🏪 {user?.boutique?.nom || user?.boutique_detail?.nom || 'Non rattaché'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--primary-700)', fontWeight: '700' }}>
                Rôle système
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--gold-600)' }}>
                {isGerant ? '👑 Gérant de Boutique' : '👤 Employé'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={updatingInfo}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={18} />
              <span>{updatingInfo ? "Enregistrement..." : "Enregistrer mes coordonnées"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
