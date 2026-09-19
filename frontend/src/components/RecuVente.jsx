import React from 'react';
import { Printer, X, CheckCircle, Store, Calendar, User, Tag } from 'lucide-react';

export const RecuVente = ({ recu, onClose }) => {
  if (!recu) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCFA = (val) => {
    return Number(val || 0).toLocaleString('fr-FR') + ' FCFA';
  };

  const boutiqueNom = typeof recu.boutique === 'object' ? (recu.boutique?.nom || 'Boutique') : (recu.boutique || 'Boutique');
  const boutiqueAdresse = typeof recu.boutique === 'object' ? (recu.boutique?.adresse || recu.boutique_adresse) : recu.boutique_adresse;
  const boutiqueTelephone = typeof recu.boutique === 'object' ? (recu.boutique?.telephone || recu.boutique_telephone) : recu.boutique_telephone;

  return (
    <div className="modal-backdrop recu-modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content recu-modal-wrapper animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête modal écran (masqué à l'impression) */}
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="badge badge-success" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
              <CheckCircle size={15} /> Vente validée
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Reçu de caisse</h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} title="Fermer">
            <X size={20} />
          </button>
        </div>

        {/* CONTENU DU REÇU IMPRIMABLE */}
        <div className="recu-container">
          <div className="recu-ticket" id="recu-a-imprimer">
            {/* Header Boutique */}
            <div className="recu-header">
              <div className="recu-store-logo">
                <Store size={26} />
              </div>
              <h2 className="recu-store-name">{boutiqueNom}</h2>
              {boutiqueAdresse && (
                <p className="recu-store-address">{boutiqueAdresse}</p>
              )}
              {boutiqueTelephone && (
                <p className="recu-store-phone">Tél : {boutiqueTelephone}</p>
              )}
              <div className="recu-dashed-divider" />
            </div>

            {/* Infos Vente & Vendeur */}
            <div className="recu-meta">
              <div className="recu-meta-row">
                <span>N° Reçu :</span>
                <strong>{recu.numero_recu || `REC-${String(recu.id).padStart(6, '0')}`}</strong>
              </div>
              <div className="recu-meta-row">
                <span>Date :</span>
                <span>{recu.date_formatee || (recu.date ? new Date(recu.date).toLocaleString('fr-FR') : '')}</span>
              </div>
              <div className="recu-meta-row">
                <span>Vendeur :</span>
                <span>{recu.vendeur_nom || 'Caissier'}</span>
              </div>
              <div className="recu-dashed-divider" />
            </div>

            {/* Détails du produit vendu */}
            <div className="recu-items">
              <div className="recu-table-head">
                <span className="col-article">Article</span>
                <span className="col-qty">Qté</span>
                <span className="col-pu">P.U</span>
                <span className="col-total">Total</span>
              </div>
              <div className="recu-table-row">
                <span className="col-article">
                  <strong>{recu.produit_nom}</strong>
                  {recu.produit_reference && (
                    <small className="recu-ref"> (Ref: {recu.produit_reference})</small>
                  )}
                </span>
                <span className="col-qty">{recu.quantite}</span>
                <span className="col-pu">{Number(recu.prix_unitaire).toLocaleString('fr-FR')}</span>
                <span className="col-total">{Number(recu.total).toLocaleString('fr-FR')}</span>
              </div>
              <div className="recu-dashed-divider" />
            </div>

            {/* Total */}
            <div className="recu-total-box">
              <div className="recu-total-row">
                <span className="recu-total-label">TOTAL PAYÉ</span>
                <span className="recu-total-valeur">{formatCFA(recu.total)}</span>
              </div>
              <div className="recu-dashed-divider" />
            </div>

            {/* Footer / Remerciement */}
            <div className="recu-footer">
              <p className="recu-merci">*** MERCI DE VOTRE CONFIANCE ! ***</p>
              <p className="recu-condition">Les marchandises vendues ne sont ni reprises ni échangées.</p>
              <p className="recu-signature">Système BoutiqueStock Togo</p>
            </div>
          </div>
        </div>

        {/* Actions modal écran (masquées à l'impression) */}
        <div className="modal-actions no-print" style={{ justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Printer size={18} />
            Imprimer le reçu
          </button>
        </div>
      </div>
    </div>
  );
};
