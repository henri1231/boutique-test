import React, { useState, useRef } from 'react';
import { api } from '../services/api';
import { X, PackagePlus, Edit, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';

export const ModalProduit = ({ produit, onClose, onSuccess }) => {
  const isEditing = !!produit;
  const fileInputRef = useRef(null);

  const [nom, setNom] = useState(produit?.nom || '');
  const [categorie, setCategorie] = useState(produit?.categorie || 'Alimentation');
  const [prixAchat, setPrixAchat] = useState(produit?.prix_achat || '');
  const [prixVente, setPrixVente] = useState(produit?.prix_vente || '');
  const [quantiteStock, setQuantiteStock] = useState(produit?.quantite_stock ?? 10);
  const [seuilAlerte, setSeuilAlerte] = useState(produit?.seuil_alerte ?? 2);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(produit?.image_url || null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  const categoriesSuggestions = [
    'Alimentation',
    'Hygiène & Soins',
    'Boissons',
    'Quincaillerie & Divers',
    'Papeterie',
    'Cosmétique'
  ];

  const handleImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      // Vérification taille (< 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErreur("L'image est trop volumineuse (max 5 Mo).");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setErreur('');
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nom.trim()) {
      setErreur("Le nom du produit est obligatoire.");
      return;
    }

    setLoading(true);
    setErreur('');

    // Utilisation de FormData pour envoyer le fichier image et les champs
    const formData = new FormData();
    formData.append('nom', nom.trim());
    formData.append('categorie', categorie.trim() || 'Général');
    formData.append('prix_achat', String(Number(prixAchat || 0)));
    formData.append('prix_vente', String(Number(prixVente || 0)));
    formData.append('quantite_stock', String(Number(quantiteStock || 0)));
    formData.append('seuil_alerte', String(Number(seuilAlerte || 2)));
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      let res;
      if (isEditing) {
        res = await api.produits.update(produit.id, formData);
      } else {
        res = await api.produits.create(formData);
      }
      onSuccess(res);
      onClose();
    } catch (err) {
      setErreur(err.message || "Erreur lors de l'enregistrement du produit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {isEditing ? <Edit size={22} color="var(--primary-700)" /> : <PackagePlus size={22} color="var(--primary-700)" />}
            <span>{isEditing ? "Modifier le produit" : "Ajouter un nouveau produit"}</span>
          </div>
          <button onClick={onClose} className="modal-close"><X size={18} /></button>
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

        <form onSubmit={handleSubmit}>
          {/* UPLOAD PHOTO DU PRODUIT */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">Photo du produit</label>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              {imagePreview ? (
                <div style={{ position: 'relative', width: '76px', height: '76px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px solid var(--primary-500)', flexShrink: 0 }}>
                  <img
                    src={imagePreview}
                    alt="Aperçu"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    title="Supprimer la photo"
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      background: 'rgba(220, 38, 38, 0.85)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: 'var(--radius-md)',
                    border: '2px dashed var(--surface-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    flexShrink: 0,
                    color: 'var(--text-light)',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary-600)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--surface-border)')}
                >
                  <ImageIcon size={24} />
                  <span style={{ fontSize: '0.65rem', marginTop: '2px' }}>+ Photo</span>
                </div>
              )}

              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  id="produit-image-upload"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
                >
                  <Upload size={14} />
                  <span>{imagePreview ? 'Changer la photo' : 'Choisir une image'}</span>
                </button>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Format JPG, PNG ou WEBP (max 5 Mo)
                </div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nom de l'article / produit *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Riz Parfumé 5kg, Savon Noir, Lait..."
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Catégorie</label>
            <input
              type="text"
              className="form-input"
              placeholder="Sélectionnez ou tapez une catégorie"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {categoriesSuggestions.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategorie(cat)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: '12px' }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Prix d'achat (FCFA)</label>
              <input
                type="number"
                min="0"
                step="10"
                className="form-input"
                placeholder="Ex: 3200"
                value={prixAchat}
                onChange={(e) => setPrixAchat(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Prix de vente (FCFA)</label>
              <input
                type="number"
                min="0"
                step="10"
                className="form-input"
                placeholder="Ex: 4000"
                value={prixVente}
                onChange={(e) => setPrixVente(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Quantité en stock</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={quantiteStock}
                onChange={(e) => setQuantiteStock(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Seuil d'alerte rupture
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 'normal' }}>
                  (Défaut: 2 unités)
                </span>
              </label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={seuilAlerte}
                onChange={(e) => setSeuilAlerte(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2 }}>
              {loading ? "Enregistrement..." : isEditing ? "Sauvegarder" : "Créer le produit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
