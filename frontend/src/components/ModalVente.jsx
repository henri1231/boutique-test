import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, MinusCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const ModalVente = ({ produit, onClose, onSuccess }) => {
  const { setNotificationCount } = useAuth();
  const [quantite, setQuantite] = useState(1);
  const [prixUnitaire, setPrixUnitaire] = useState(produit?.prix_vente || 0);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  if (!produit) return null;

  const stockDisponible = Number(produit.quantite_stock || 0);
  const quantiteNum = Number(quantite || 0);
  const stockRestant = stockDisponible - quantiteNum;
  const isStockInsuffisant = quantiteNum > stockDisponible;
  const declencheraAlerte = stockRestant <= Number(produit.seuil_alerte || 2) && !isStockInsuffisant;
  const total = quantiteNum * Number(prixUnitaire || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (quantiteNum <= 0) {
      setErreur("Veuillez saisir une quantité supérieure à zéro.");
      return;
    }

    if (isStockInsuffisant) {
      setErreur(`Stock insuffisant. Seules ${stockDisponible} unité(s) sont disponibles.`);
      return;
    }

    setLoading(true);
    setErreur('');

    try {
      const res = await api.produits.vente(produit.id, {
        quantite: quantiteNum,
        prix_unitaire: Number(prixUnitaire),
      });

      // Si alerte de rupture déclenchée, actualiser le compteur de notifications
      if (res.alerte_rupture) {
        setNotificationCount((prev) => prev + 1);
      }

      onSuccess(res);
      onClose();
    } catch (err) {
      setErreur(err.message || "Erreur lors de l'enregistrement de la vente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <MinusCircle size={22} style={{ color: 'var(--gold-600)' }} />
            <span>Vente Comptoir (− Sortie Stock)</span>
          </div>
          <button onClick={onClose} className="modal-close"><X size={18} /></button>
        </div>

        <div style={{
          background: stockDisponible <= produit.seuil_alerte ? '#fee2e2' : '#f8fafc',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '18px',
          border: `1px solid ${stockDisponible <= produit.seuil_alerte ? '#fca5a5' : 'var(--surface-border)'}`
        }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Article à encaisser :</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary-900)' }}>
            {produit.nom}
          </div>
          <div style={{
            fontSize: '0.88rem',
            fontWeight: '700',
            color: stockDisponible <= produit.seuil_alerte ? 'var(--danger-700)' : 'var(--primary-700)',
            marginTop: '2px'
          }}>
            Stock disponible : {stockDisponible} unité(s)
            {stockDisponible <= produit.seuil_alerte && " (Déjà en seuil critique !)"}
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
            <label className="form-label">Quantité vendue</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                min="1"
                max={stockDisponible}
                className="form-input"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                required
                autoFocus
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3, 5].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantite(q)}
                    disabled={q > stockDisponible}
                    className="btn btn-outline btn-sm"
                    style={{ minWidth: '36px', padding: '6px 8px' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Prix de vente unitaire (FCFA)</label>
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

          {/* ALERTE VISUELLE SI RUPTURE IMMINENTE */}
          {declencheraAlerte && (
            <div style={{
              background: '#fef2f2',
              color: '#991b1b',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #fecaca',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.84rem'
            }}>
              <AlertTriangle size={20} style={{ flexShrink: 0, color: '#dc2626' }} />
              <div>
                <strong>Alerte automatique déclenchée :</strong> Le stock restant ({stockRestant} unité(s))
                atteindra le seuil d'alerte ({produit.seuil_alerte}). Une notification sera créée en base.
              </div>
            </div>
          )}

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
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Montant total à encaisser</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '2px' }}>
                Stock restant après vente : <strong>{Math.max(0, stockRestant)} unité(s)</strong>
              </div>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--gold-600)', fontFamily: 'var(--font-display)' }}>
              {total.toLocaleString('fr-FR')} FCFA
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>
              Annuler
            </button>
            <button 
              type="submit" 
              className="btn btn-gold" 
              disabled={loading || isStockInsuffisant || quantiteNum <= 0}
              style={{ flex: 2, fontWeight: '700' }}
            >
              {loading ? "Enregistrement..." : "Valider la vente (− Stock)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
