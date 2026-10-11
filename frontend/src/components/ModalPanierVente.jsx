import React, { useState, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  AlertTriangle, 
  Receipt, 
  User, 
  CreditCard,
  CheckCircle2
} from 'lucide-react';

export const ModalPanierVente = ({ 
  produitsCatalogue = [], 
  panierInitial = [], 
  onClose, 
  onSuccess 
}) => {
  const { setNotificationCount } = useAuth();

  // Articles dans le panier : [{ produit, quantite, prixUnitaire }]
  const [lignesPanier, setLignesPanier] = useState(() => {
    if (panierInitial && panierInitial.length > 0) {
      return panierInitial.map(item => ({
        produit: item.produit,
        quantite: item.quantite || 1,
        prixUnitaire: item.prixUnitaire ?? item.produit.prix_vente ?? 0,
      }));
    }
    return [];
  });

  const [rechercheProduit, setRechercheProduit] = useState('');
  const [clientNom, setClientNom] = useState('');
  const [modePaiement, setModePaiement] = useState('Espèces');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  // Normalisation pour recherche sans accent
  const normaliser = (str) =>
    (str || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  // Produits filtrés pour l'ajout rapide
  const produitsSuggestions = useMemo(() => {
    if (!rechercheProduit.trim()) return [];
    const q = normaliser(rechercheProduit);
    return produitsCatalogue
      .filter(p => {
        const nom = normaliser(p.nom);
        const cat = normaliser(p.categorie);
        return nom.includes(q) || cat.includes(q);
      })
      .slice(0, 6);
  }, [produitsCatalogue, rechercheProduit]);

  // Ajouter un produit au panier
  const handleAjouterProduit = (produit) => {
    if (produit.quantite_stock <= 0) {
      setErreur(`L'article '${produit.nom}' est en rupture de stock.`);
      return;
    }

    setErreur('');
    setLignesPanier(prev => {
      const existant = prev.find(l => l.produit.id === produit.id);
      if (existant) {
        if (existant.quantite >= produit.quantite_stock) {
          setErreur(`Quantité maximale atteinte pour '${produit.nom}' (${produit.quantite_stock} en stock).`);
          return prev;
        }
        return prev.map(l =>
          l.produit.id === produit.id
            ? { ...l, quantite: l.quantite + 1 }
            : l
        );
      }
      return [
        ...prev,
        {
          produit,
          quantite: 1,
          prixUnitaire: Number(produit.prix_vente || 0),
        }
      ];
    });

    setRechercheProduit('');
  };

  // Mettre à jour la quantité d'une ligne
  const handleModifierQuantite = (produitId, nouvelleQte) => {
    setErreur('');
    setLignesPanier(prev =>
      prev.map(ligne => {
        if (ligne.produit.id === produitId) {
          const max = Number(ligne.produit.quantite_stock || 0);
          const qteValidee = Math.max(1, Math.min(max, Number(nouvelleQte) || 1));
          return { ...ligne, quantite: qteValidee };
        }
        return ligne;
      })
    );
  };

  // Mettre à jour le prix unitaire d'une ligne
  const handleModifierPrix = (produitId, nouveauPrix) => {
    setLignesPanier(prev =>
      prev.map(ligne => {
        if (ligne.produit.id === produitId) {
          return { ...ligne, prixUnitaire: Math.max(0, Number(nouveauPrix) || 0) };
        }
        return ligne;
      })
    );
  };

  // Supprimer une ligne
  const handleSupprimerLigne = (produitId) => {
    setLignesPanier(prev => prev.filter(l => l.produit.id !== produitId));
  };

  // Totaux
  const totalGeneral = useMemo(() => {
    return lignesPanier.reduce((acc, l) => acc + (l.quantite * l.prixUnitaire), 0);
  }, [lignesPanier]);

  const quantiteTotale = useMemo(() => {
    return lignesPanier.reduce((acc, l) => acc + l.quantite, 0);
  }, [lignesPanier]);

  // Vérifier si un produit risque de passer sous le seuil
  const alertesProches = useMemo(() => {
    return lignesPanier.filter(l => {
      const restant = Number(l.produit.quantite_stock) - l.quantite;
      return restant <= Number(l.produit.seuil_alerte || 2);
    });
  }, [lignesPanier]);

  // Validation et encaissement
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (lignesPanier.length === 0) {
      setErreur("Veuillez ajouter au moins un produit au ticket.");
      return;
    }

    // Validation des stocks
    for (const ligne of lignesPanier) {
      if (ligne.quantite > ligne.produit.quantite_stock) {
        setErreur(`Stock insuffisant pour '${ligne.produit.nom}'. Disponible : ${ligne.produit.quantite_stock}.`);
        return;
      }
    }

    setLoading(true);
    setErreur('');

    try {
      const payload = {
        articles: lignesPanier.map(l => ({
          produit_id: l.produit.id,
          quantite: l.quantite,
          prix_unitaire: l.prixUnitaire,
        })),
        client_nom: clientNom.trim() || 'Client Comptoir',
        mode_paiement: modePaiement,
      };

      const res = await api.ventes.creerPanier(payload);

      if (res.alerte_rupture && res.nb_alertes) {
        setNotificationCount(prev => prev + res.nb_alertes);
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
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1050 }}>
      <div 
        className="modal-dialog" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* EN-TÊTE MODAL */}
        <div className="modal-header" style={{ paddingBottom: '12px' }}>
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0f5441, #108e6c)',
              color: '#fff',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex'
            }}>
              <ShoppingCart size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary-900)' }}>
                Nouvel Encaissement Multi-Articles
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Regroupez plusieurs achats sur un seul et même reçu
              </div>
            </div>
          </div>
          <button onClick={onClose} className="modal-close"><X size={18} /></button>
        </div>

        <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
          {/* BARRE DE RECHERCHE ET AJOUT RAPIDE D'ARTICLES */}
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: '700' }}>
              Ajouter un article au reçu :
            </label>
            <div style={{ position: 'relative' }}>
              <Search 
                size={16} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-light)',
                  pointerEvents: 'none'
                }} 
              />
              <input
                type="text"
                placeholder="Rechercher par nom ou rayon (ex: Huile, Riz, Savon...)"
                className="form-input"
                style={{ paddingLeft: '36px', fontSize: '0.9rem' }}
                value={rechercheProduit}
                onChange={(e) => setRechercheProduit(e.target.value)}
                autoFocus
              />
              {rechercheProduit && (
                <button
                  type="button"
                  onClick={() => setRechercheProduit('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Menu déroulant de suggestions */}
            {produitsSuggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 100,
                background: '#ffffff',
                border: '1px solid var(--surface-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                marginTop: '4px',
                maxHeight: '220px',
                overflowY: 'auto'
              }}>
                {produitsSuggestions.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleAjouterProduit(p)}
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: p.quantite_stock > 0 ? 'pointer' : 'not-allowed',
                      borderBottom: '1px solid #f1f5f9',
                      opacity: p.quantite_stock > 0 ? 1 : 0.5,
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => { if (p.quantite_stock > 0) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--primary-900)' }}>
                        {p.nom}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Rayon : {p.categorie || 'Général'} • Stock : <strong>{p.quantite_stock}</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', color: 'var(--gold-600)', fontSize: '0.92rem' }}>
                        {Number(p.prix_vente).toLocaleString('fr-FR')} F
                      </div>
                      <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                        + Ajouter
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MESSAGE D'ERREUR */}
          {erreur && (
            <div style={{
              background: 'var(--danger-50)',
              color: 'var(--danger-700)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '14px',
              fontSize: '0.86rem',
              border: '1px solid var(--danger-100)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{erreur}</span>
            </div>
          )}

          {/* LISTE DES ARTICLES DU PANIER */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>
                Articles sur ce reçu ({lignesPanier.length}) :
              </span>
              {lignesPanier.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLignesPanier([])}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--danger-500)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Vider le panier
                </button>
              )}
            </div>

            {lignesPanier.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '36px 16px',
                background: '#f8fafc',
                borderRadius: 'var(--radius-md)',
                border: '1.5px dashed var(--surface-border)',
                color: 'var(--text-muted)'
              }}>
                <Receipt size={36} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                <div style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--text-main)' }}>
                  Aucun article sélectionné
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                  Tapez le nom d'un produit dans la barre ci-dessus pour l'ajouter à ce ticket.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lignesPanier.map((ligne) => {
                  const stockDispo = Number(ligne.produit.quantite_stock || 0);
                  const sTotal = ligne.quantite * ligne.prixUnitaire;
                  const isStockLimite = ligne.quantite >= stockDispo;

                  return (
                    <div 
                      key={ligne.produit.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div style={{ flex: '1 1 200px' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--primary-900)' }}>
                          {ligne.produit.nom}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Stock restant : {stockDispo - ligne.quantite} unité(s)
                          {isStockLimite && (
                            <span style={{ color: 'var(--danger-600)', marginLeft: '6px', fontWeight: '600' }}>
                              (Max atteint)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Sélecteur de quantité */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleModifierQuantite(ligne.produit.id, ligne.quantite - 1)}
                          disabled={ligne.quantite <= 1}
                          className="btn-icon btn-outline"
                          style={{ width: '28px', height: '28px', padding: 0 }}
                        >
                          <Minus size={13} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={stockDispo}
                          value={ligne.quantite}
                          onChange={(e) => handleModifierQuantite(ligne.produit.id, e.target.value)}
                          className="form-input"
                          style={{
                            width: '48px',
                            height: '28px',
                            padding: '2px 4px',
                            textAlign: 'center',
                            fontSize: '0.85rem',
                            fontWeight: '700'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleModifierQuantite(ligne.produit.id, ligne.quantite + 1)}
                          disabled={ligne.quantite >= stockDispo}
                          className="btn-icon btn-outline"
                          style={{ width: '28px', height: '28px', padding: 0 }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Prix Unitaire */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={ligne.prixUnitaire}
                          onChange={(e) => handleModifierPrix(ligne.produit.id, e.target.value)}
                          className="form-input"
                          style={{
                            width: '80px',
                            height: '28px',
                            padding: '2px 6px',
                            textAlign: 'right',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                          }}
                          title="Prix unitaire de vente (modifiable)"
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>F</span>
                      </div>

                      {/* Sous-total et suppression */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ minWidth: '75px', textAlign: 'right', fontWeight: '800', color: 'var(--gold-600)', fontSize: '0.95rem' }}>
                          {sTotal.toLocaleString('fr-FR')} F
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSupprimerLigne(ligne.produit.id)}
                          className="btn-icon btn-ghost"
                          style={{ color: 'var(--danger-500)', padding: '4px' }}
                          title="Retirer cet article"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ALERTE RUPTURE IMMINENTE */}
          {alertesProches.length > 0 && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              fontSize: '0.82rem',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
              <div>
                <strong>Alerte seuil de stock :</strong> {alertesProches.map(l => l.produit.nom).join(', ')} atteindront ou passeront sous leur seuil d'alerte après cette vente.
              </div>
            </div>
          )}

          {/* DÉTAILS COMPLÉMENTAIRES (CLIENT ET PAIEMENT) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={13} /> Nom du Client (Optionnel) :
              </label>
              <input
                type="text"
                placeholder="Ex: Client Comptoir, M. Kodjo..."
                className="form-input"
                style={{ padding: '8px 12px', fontSize: '0.86rem' }}
                value={clientNom}
                onChange={(e) => setClientNom(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CreditCard size={13} /> Mode de règlement :
              </label>
              <select
                className="form-select"
                style={{ padding: '8px 12px', fontSize: '0.86rem' }}
                value={modePaiement}
                onChange={(e) => setModePaiement(e.target.value)}
              >
                <option value="Espèces">Espèces (Cash)</option>
                <option value="TMoney">TMoney (Togocom)</option>
                <option value="Flooz">Moov Flooz</option>
                <option value="Carte / Virement">Carte Bancaire / Virement</option>
              </select>
            </div>
          </div>

          {/* RÉCAPITULATIF FINANCIER DU TICKET */}
          <div style={{
            background: 'linear-gradient(135deg, #09372b, #0f5441)',
            color: '#ffffff',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <div>
              <div style={{ fontSize: '0.82rem', opacity: 0.85 }}>TOTAL GÉNÉRAL DU REÇU</div>
              <div style={{ fontSize: '0.85rem', marginTop: '2px', opacity: 0.9 }}>
                {lignesPanier.length} article(s) différent(s) • {quantiteTotale} unité(s)
              </div>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: 'var(--font-display)', color: '#ffd56b' }}>
              {totalGeneral.toLocaleString('fr-FR')} FCFA
            </div>
          </div>
        </div>

        {/* PIED DE MODALE ET BOUTONS */}
        <div className="modal-actions" style={{ padding: '14px 20px', borderTop: '1px solid var(--surface-border)', display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-outline"
            style={{ flex: 1 }}
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || lignesPanier.length === 0}
            className="btn btn-gold"
            style={{ 
              flex: 2, 
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <CheckCircle2 size={18} />
            <span>
              {loading 
                ? "Enregistrement du reçu..." 
                : `Valider & Enregistrer le reçu (${totalGeneral.toLocaleString('fr-FR')} F)`
              }
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
