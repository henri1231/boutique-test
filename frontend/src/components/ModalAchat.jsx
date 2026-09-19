import React, { useState } from 'react';
import { api } from '../services/api';
import { X, PlusCircle, Truck } from 'lucide-react';

export const ModalAchat = ({ produit, onClose, onSuccess }) => {
  const [quantite, setQuantite] = useState(5);
  const [prixUnitaire, setPrixUnitaire] = useState(produit?.prix_achat || 0);
  const [fournisseur, setFournisseur] = useState('');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  if (!produit) return null;

  const total = Number(quantite || 0) * Number(prixUnitaire || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantite || Number(quantite) <= 0) {
      setErreur("Veuillez saisir une quantité supérieure à zéro.");
      return;
    }

    setLoading(true);
    setErreur('');

    try {
      const res = await api.produits.achat(produit.id, {
        quantite: Number(quantite),
        prix_unitaire: Number(prixUnitaire),
        fournisseur: fournisseur.trim() || 'Fournisseur Comptoir',
      });
      onSuccess(res);
      onClose();
    } catch (err) {
      setErreur(err.message || "Erreur lors de l'enregistrement de l'achat.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <PlusCircle size={22} style={{ color: 'var(--primary-600)' }} />
            <span>Réapprovisionnement (+ Stock)</span>
          </div>
          <button onClick={onClose} className="modal-close"><X size={18} /></button>
        </div>

        <div style={{
          background: 'var(--primary-50)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '18px',
          border: '1px solid rgba(15, 84, 65, 0.15)'
        }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Produit sélectionné :</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary-900)' }}>
            {produit.nom}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--primary-700)', marginTop: '2px' }}>
            Stock actuel : <strong>{produit.quantite_stock} unité(s)</strong>
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

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Quantité reçue / achetée</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                min="1"
                className="form-input"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                required
                autoFocus
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                {[5, 10, 20, 50].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantite(q)}
                    className="btn btn-outline btn-sm"
                    style={{ minWidth: '38px', padding: '6px 8px' }}
                  >
                    +{q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Prix unitaire d'achat (FCFA)</label>
            <input
              type="number"
              min="0"
              step="10"
              className="form-input"
              value={prixUnitaire}
              onChange={(e) => setPrixUnitaire(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fournisseur (Optionnel)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Ex: Grossiste Déckon Lomé, Brasserie du Bénin..."
                className="form-input"
                value={fournisseur}
                onChange={(e) => setFournisseur(e.target.value)}
              />
            </div>
          </div>

          {/* RÉCAPITULATIF FINANCIER */}
          <div style={{
            background: '#f8fafc',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--surface-border)',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Coût total approvisionnement</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '2px' }}>
                Nouveau stock estimé : <strong>{Number(produit.quantite_stock) + Number(quantite || 0)}</strong>
              </div>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--primary-800)', fontFamily: 'var(--font-display)' }}>
              {total.toLocaleString('fr-FR')} FCFA
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>
              Annuler
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ flex: 2 }}
            >
              {loading ? "Enregistrement..." : "Confirmer l'achat (+ Stock)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
