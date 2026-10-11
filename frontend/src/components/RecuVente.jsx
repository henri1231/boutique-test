import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Printer, 
  X, 
  CheckCircle, 
  Store, 
  Download, 
  Copy, 
  Check, 
  Calendar, 
  User, 
  CreditCard,
  Truck,
  FileText
} from 'lucide-react';

export const RecuVente = ({ recu, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [copie, setCopie] = useState(false);

  if (!recu) return null;

  const isAchat = Boolean(recu.fournisseur || recu.type === 'achat' || (recu.numero_recu && recu.numero_recu.startsWith('ACH-')));

  const handlePrint = () => {
    window.print();
  };

  const formatCFA = (val) => {
    return Number(val || 0).toLocaleString('fr-FR') + ' FCFA';
  };

  const boutiqueNom = typeof recu.boutique === 'object' ? (recu.boutique?.nom || 'Boutique') : (recu.boutique || 'Boutique');
  const boutiqueAdresse = typeof recu.boutique === 'object' ? (recu.boutique?.adresse || recu.boutique_adresse) : recu.boutique_adresse;
  const boutiqueTelephone = typeof recu.boutique === 'object' ? (recu.boutique?.telephone || recu.boutique_telephone) : recu.boutique_telephone;

  // Liste normalisée des articles (supporte mono-produit et multi-produits)
  const listeArticles = (recu.articles && Array.isArray(recu.articles) && recu.articles.length > 0)
    ? recu.articles
    : [{
        id: recu.id || 1,
        produit_nom: recu.produit_nom || 'Article',
        produit_reference: recu.produit_reference,
        quantite: recu.quantite || 1,
        prix_unitaire: recu.prix_unitaire || 0,
        total: recu.total || 0,
      }];

  const totalMontant = recu.total || listeArticles.reduce((acc, a) => acc + Number(a.total || 0), 0);
  const quantiteTotale = recu.quantite_totale || listeArticles.reduce((acc, a) => acc + Number(a.quantite || 0), 0);

  // Télécharger le reçu en fichier PDF (Enregistrer le reçu)
  const handleDownloadPdf = async () => {
    const el = document.getElementById('recu-a-imprimer');
    if (!el) return;
    setDownloading(true);

    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const mmWidth = 80;
      const mmHeight = Math.max(105, (canvas.height * mmWidth) / canvas.width);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [mmWidth, mmHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, mmWidth, mmHeight);
      const nomFichier = `${recu.numero_recu || (isAchat ? 'bon-achat' : 'recu-vente')}.pdf`;
      pdf.save(nomFichier);
    } catch (err) {
      console.error("Erreur lors de la génération du PDF :", err);
      // Fallback sur impression navigateur (qui permet d'enregistrer en PDF)
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  // Copier le résumé du reçu dans le presse-papiers (pour envoi WhatsApp/SMS)
  const handleCopyText = () => {
    const typeTitre = isAchat ? "BON D'APPROVISIONNEMENT" : "TICKET DE CAISSE";
    const texte = `
🏪 ${boutiqueNom}
${boutiqueAdresse ? boutiqueAdresse + '\n' : ''}${boutiqueTelephone ? 'Tél : ' + boutiqueTelephone + '\n' : ''}--------------------------------
${typeTitre} : ${recu.numero_recu || ''}
Date : ${recu.date_formatee || (recu.date ? new Date(recu.date).toLocaleString('fr-FR') : '')}
${isAchat ? `Fournisseur : ${recu.fournisseur || 'Comptoir'}` : `Vendeur : ${recu.vendeur_nom || 'Comptoir'}`}
${recu.client_nom ? `Client : ${recu.client_nom}\n` : ''}--------------------------------
ARTICLES :
${listeArticles.map((a, i) => `${i + 1}. ${a.produit_nom} (x${a.quantite}) = ${formatCFA(a.total)}`).join('\n')}
--------------------------------
TOTAL : ${formatCFA(totalMontant)}
${recu.mode_paiement ? `Mode : ${recu.mode_paiement}\n` : ''}${isAchat ? 'Approvisionnement validé' : '*** MERCI DE VOTRE VISITE ! ***'}
    `.trim();

    navigator.clipboard.writeText(texte);
    setCopie(true);
    setTimeout(() => setCopie(false), 2500);
  };

  return (
    <div className="modal-backdrop recu-modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-content recu-modal-wrapper animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', width: '92%' }}
      >
        {/* En-tête modal écran (masqué à l'impression) */}
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className={`badge ${isAchat ? 'badge-primary' : 'badge-success'}`} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
              <CheckCircle size={15} /> {isAchat ? "Achat enregistré" : "Vente validée"}
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
              {isAchat ? "Bon d'achat" : "Reçu de caisse"}
            </h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} title="Fermer">
            <X size={20} />
          </button>
        </div>

        {/* CONTENU DU REÇU IMPRIMABLE / ENREGISTRABLE */}
        <div className="recu-container">
          <div className="recu-ticket" id="recu-a-imprimer" style={{ background: '#ffffff', color: '#1e293b' }}>
            {/* Header Boutique */}
            <div className="recu-header">
              <div className="recu-store-logo">
                {isAchat ? <Truck size={26} /> : <Store size={26} />}
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

            {/* Infos Reçu & Opérateur */}
            <div className="recu-meta">
              <div className="recu-meta-row">
                <span>N° Reçu :</span>
                <strong>{recu.numero_recu || `${isAchat ? 'ACH' : 'REC'}-${String(recu.id).padStart(6, '0')}`}</strong>
              </div>
              <div className="recu-meta-row">
                <span>Date :</span>
                <span>{recu.date_formatee || (recu.date ? new Date(recu.date).toLocaleString('fr-FR') : '')}</span>
              </div>
              {isAchat ? (
                <div className="recu-meta-row">
                  <span>Fournisseur :</span>
                  <strong>{recu.fournisseur || 'Fournisseur Comptoir'}</strong>
                </div>
              ) : (
                <>
                  <div className="recu-meta-row">
                    <span>Vendeur :</span>
                    <span>{recu.vendeur_nom || 'Caissier'}</span>
                  </div>
                  {recu.client_nom && recu.client_nom !== 'Client Comptoir' && (
                    <div className="recu-meta-row">
                      <span>Client :</span>
                      <span>{recu.client_nom}</span>
                    </div>
                  )}
                  {recu.mode_paiement && (
                    <div className="recu-meta-row">
                      <span>Règlement :</span>
                      <span>{recu.mode_paiement}</span>
                    </div>
                  )}
                </>
              )}
              <div className="recu-dashed-divider" />
            </div>

            {/* Détails des articles vendus ou achetés */}
            <div className="recu-items">
              <div className="recu-table-head">
                <span className="col-article">Article</span>
                <span className="col-qty">Qté</span>
                <span className="col-pu">P.U</span>
                <span className="col-total">Total</span>
              </div>

              {listeArticles.map((art, idx) => (
                <div key={art.id || idx} className="recu-table-row">
                  <span className="col-article">
                    <strong>{art.produit_nom}</strong>
                    {art.produit_reference && (
                      <small className="recu-ref"> (Ref: {art.produit_reference})</small>
                    )}
                  </span>
                  <span className="col-qty">{art.quantite}</span>
                  <span className="col-pu">{Number(art.prix_unitaire).toLocaleString('fr-FR')}</span>
                  <span className="col-total">{Number(art.total).toLocaleString('fr-FR')}</span>
                </div>
              ))}

              <div className="recu-dashed-divider" />
            </div>

            {/* Total général */}
            <div className="recu-total-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#64748b', marginBottom: '4px' }}>
                <span>Articles : {listeArticles.length} ({quantiteTotale} unités)</span>
                <span>Devise : FCFA</span>
              </div>
              <div className="recu-total-row">
                <span className="recu-total-label">{isAchat ? "TOTAL ACHAT" : "TOTAL PAYÉ"}</span>
                <span className="recu-total-valeur">{formatCFA(totalMontant)}</span>
              </div>
              <div className="recu-dashed-divider" />
            </div>

            {/* Footer / Remerciement */}
            <div className="recu-footer">
              <p className="recu-merci">
                {isAchat ? "*** ENTRÉE EN STOCK VALIDÉE ***" : "*** MERCI DE VOTRE CONFIANCE ! ***"}
              </p>
              <p className="recu-condition">
                {isAchat ? "Pièce justificative d'approvisionnement." : "Les marchandises vendues ne sont ni reprises ni échangées."}
              </p>
              <p className="recu-signature">Système BoutiqueStock Togo</p>
            </div>
          </div>
        </div>

        {/* Actions modal écran (masquées à l'impression) */}
        <div className="modal-actions no-print" style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px', 
          justifyContent: 'space-between', 
          padding: '1rem 1.25rem',
          background: '#f8fafc',
          borderTop: '1px solid var(--surface-border)'
        }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Fermer
          </button>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Bouton Copier le texte */}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleCopyText}
              title="Copier le texte du ticket pour WhatsApp / SMS"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {copie ? <Check size={15} style={{ color: '#16a34a' }} /> : <Copy size={15} />}
              <span>{copie ? "Copié !" : "Copier"}</span>
            </button>

            {/* Bouton ENREGISTRER LE REÇU (PDF) */}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleDownloadPdf}
              disabled={downloading}
              title="Enregistrer le reçu au format fichier PDF sur votre appareil"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700' }}
            >
              <Download size={15} />
              <span>{downloading ? "Génération..." : "Enregistrer reçu (PDF)"}</span>
            </button>

            {/* Bouton IMPRIMER */}
            <button 
              type="button" 
              className="btn btn-gold btn-sm" 
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700' }}
              title="Lancer l'impression directe"
            >
              <Printer size={15} />
              <span>Imprimer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
