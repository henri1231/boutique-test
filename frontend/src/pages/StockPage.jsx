import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ModalAchat } from '../components/ModalAchat';
import { ModalVente } from '../components/ModalVente';
import { ModalProduit } from '../components/ModalProduit';
import { RecuVente } from '../components/RecuVente';
import { AbonnementBanner } from '../components/AbonnementBanner';
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  Search, 
  TrendingUp, 
  DollarSign, 
  Minus, 
  ShoppingCart, 
  Edit2, 
  Trash2, 
  Filter,
  Check,
  RefreshCw,
  UserCheck
} from 'lucide-react';

export const StockPage = () => {
  const { user, isGerant, isEmploye } = useAuth();
  const [produits, setProduits] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [categorieFiltre, setCategorieFiltre] = useState('toutes');
  const [filtreRuptureSeulement, setFiltreRuptureSeulement] = useState(false);

  // Modales
  const [produitPourAchat, setProduitPourAchat] = useState(null);
  const [produitPourVente, setProduitPourVente] = useState(null);
  const [produitPourEdition, setProduitPourEdition] = useState(null);
  const [modalNouveauProduit, setModalNouveauProduit] = useState(false);
  const [recuVente, setRecuVente] = useState(null);

  // Notification toast
  const [toast, setToast] = useState(null);

  const chargerDonnees = useCallback(async () => {
    setLoading(true);
    try {
      const [dataProduits, dataStats] = await Promise.all([
        api.produits.list(),
        api.statistiques.get().catch(() => null),
      ]);
      setProduits(Array.isArray(dataProduits) ? dataProduits : (dataProduits.results || []));
      if (dataStats) setStats(dataStats);
    } catch (err) {
      console.error("Erreur chargement stock:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    chargerDonnees();
  }, [chargerDonnees]);

  const afficherToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSuccesAchat = (res) => {
    afficherToast(res.message || "Approvisionnement enregistré avec succès !");
    chargerDonnees();
  };

  const handleSuccesVente = (res) => {
    if (res.alerte_rupture) {
      afficherToast(
        `Vente enregistrée ! ⚠️ ATTENTION : Le stock est tombé sous le seuil d'alerte.`,
        'danger'
      );
    } else {
      afficherToast(res.message || "Vente enregistrée avec succès !");
    }
    if (res.recu) {
      setRecuVente(res.recu);
    }
    chargerDonnees();
  };

  const handleSuccesProduit = (res) => {
    afficherToast("Produit enregistré avec succès !");
    chargerDonnees();
  };

  const handleSupprimerProduit = async (id, nom) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le produit '${nom}' ?`)) {
      return;
    }
    try {
      await api.produits.delete(id);
      afficherToast(`Produit '${nom}' supprimé.`);
      chargerDonnees();
    } catch (err) {
      afficherToast(err.message || "Erreur lors de la suppression.", 'danger');
    }
  };

  // Liste unique des catégories
  const categories = useMemo(() => {
    const setCat = new Set(produits.map((p) => p.categorie).filter(Boolean));
    return ['toutes', ...Array.from(setCat)];
  }, [produits]);

  // Filtrage
  const produitsFiltres = useMemo(() => {
    return produits.filter((p) => {
      const correspondRecherche =
        !recherche ||
        p.nom.toLowerCase().includes(recherche.toLowerCase()) ||
        p.categorie.toLowerCase().includes(recherche.toLowerCase());

      const correspondCategorie =
        categorieFiltre === 'toutes' || p.categorie.toLowerCase() === categorieFiltre.toLowerCase();

      const correspondRupture = !filtreRuptureSeulement || p.est_en_rupture_proche;

      return correspondRecherche && correspondCategorie && correspondRupture;
    });
  }, [produits, recherche, categorieFiltre, filtreRuptureSeulement]);

  // Compteurs
  const nbRuptures = useMemo(() => {
    return produits.filter((p) => p.est_en_rupture_proche).length;
  }, [produits]);

  const valeurTotale = useMemo(() => {
    return produits.reduce((acc, p) => acc + (Number(p.quantite_stock || 0) * Number(p.prix_achat || 0)), 0);
  }, [produits]);

  return (
    <div className="app-container">
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          left: '20px',
          maxWidth: '450px',
          margin: '0 auto',
          zIndex: 1000,
          background: toast.type === 'danger' ? '#b91c1c' : '#0f5441',
          color: '#ffffff',
          padding: '14px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.92rem',
          fontWeight: '600',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toast.type === 'danger' ? <AlertTriangle size={20} /> : <Check size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* BANDEAU ABONNEMENT SI EXPIRÉ */}
      <AbonnementBanner />

      {/* EN-TÊTE DE PAGE */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">
            <Package size={28} style={{ color: 'var(--primary-700)' }} />
            <span>Gestion du Stock</span>
          </h1>
          <p className="page-subtitle">
            Boutique : <strong>{user?.boutique?.nom || user?.boutique_detail?.nom || 'Ma Boutique'}</strong> — Togo
          </p>
        </div>

        <button 
          onClick={() => !isEmploye && setModalNouveauProduit(true)}
          className="btn btn-primary"
          disabled={isEmploye}
          title={isEmploye ? "Action réservée au Gérant" : "Ajouter un nouveau produit"}
          style={isEmploye ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          <Plus size={18} />
          <span>Nouveau Produit</span>
        </button>
      </div>

      {/* BANDEAU MODE EMPLOYÉ SI CONNECTÉ COMME EMPLOYÉ */}
      {isEmploye && (
        <div style={{
          background: 'var(--primary-50)',
          border: '1px solid var(--primary-200)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.86rem',
          color: 'var(--primary-900)'
        }}>
          <UserCheck size={18} style={{ color: 'var(--primary-700)', flexShrink: 0 }} />
          <span>
            <strong>Session Employé active :</strong> Vous avez accès au catalogue, à l'enregistrement des ventes (−) et des réapprovisionnements (+). La modification et suppression des produits sont réservées au gérant.
          </span>
        </div>
      )}

      {/* CARTES STATISTIQUES (KPIS) */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span>Articles en Catalogue</span>
            <div className="stat-icon" style={{ background: '#e6f6f1', color: 'var(--primary-700)' }}>
              <Package size={18} />
            </div>
          </div>
          <div className="stat-value">{produits.length}</div>
        </div>

        <div 
          className="stat-card" 
          onClick={() => setFiltreRuptureSeulement(!filtreRuptureSeulement)}
          style={{ 
            cursor: 'pointer',
            borderColor: nbRuptures > 0 ? '#fca5a5' : 'var(--surface-border)',
            background: nbRuptures > 0 ? '#fffafa' : '#fff'
          }}
        >
          <div className="stat-card-header">
            <span style={{ color: nbRuptures > 0 ? '#b91c1c' : 'var(--text-muted)' }}>
              Ruptures Proches (≤ Seuil)
            </span>
            <div className="stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: nbRuptures > 0 ? '#dc2626' : 'inherit' }}>
            {nbRuptures}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>Valeur Stock (Achat)</span>
            <div className="stat-icon" style={{ background: '#fef3c7', color: 'var(--gold-600)' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {valeurTotale.toLocaleString('fr-FR')} <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>FCFA</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span>Ventes du Jour</span>
            <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem', color: '#0284c7' }}>
            {(stats?.total_ventes_jour || 0).toLocaleString('fr-FR')} <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>FCFA</span>
          </div>
        </div>
      </div>

      {/* BARRE D'ACTION & RECHERCHE */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input
              type="text"
              placeholder="Rechercher un produit ou une catégorie..."
              className="form-input"
              style={{ paddingLeft: '38px' }}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Filtre Rupture Proche */}
            <button
              onClick={() => setFiltreRuptureSeulement(!filtreRuptureSeulement)}
              className={`btn btn-sm ${filtreRuptureSeulement ? 'btn-danger' : 'btn-outline'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <AlertTriangle size={14} />
              <span>Ruptures proches ({nbRuptures})</span>
            </button>

            <button 
              onClick={chargerDonnees}
              className="btn btn-outline btn-sm"
              title="Actualiser"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Tags de catégories */}
        {categories.length > 2 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--surface-border)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={12} /> Rayon :
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategorieFiltre(cat)}
                className={`btn btn-sm ${categorieFiltre === cat ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px' }}
              >
                {cat === 'toutes' ? 'Tous les rayons' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* LISTE DES PRODUITS */}
      {loading && produits.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="spin" style={{ margin: '0 auto 12px auto' }} />
          <p>Chargement de vos produits...</p>
        </div>
      ) : produitsFiltres.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <Package size={48} style={{ color: 'var(--text-light)', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '6px' }}>
            Aucun produit trouvé
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
            {recherche || filtreRuptureSeulement
              ? "Aucun article ne correspond à vos filtres actuels."
              : "Votre stock est vide pour le moment. Enregistrez votre premier article !"}
          </p>
          {!isEmploye && (
            <button onClick={() => setModalNouveauProduit(true)} className="btn btn-primary btn-sm">
              <Plus size={16} /> Ajouter un produit
            </button>
          )}
        </div>
      ) : (
        <div className="products-grid">
          {produitsFiltres.map((p) => {
            const isAlert = p.est_en_rupture_proche;
            const marge = Number(p.prix_vente) - Number(p.prix_achat);
            const imageSource = p.image_url 
              ? (p.image_url.startsWith('http') ? p.image_url : `http://localhost:8000${p.image_url}`)
              : null;

            return (
              <div key={p.id} className={`product-card ${isAlert ? 'has-alert' : ''}`}>
                <div>
                  {/* Top Bar Produit : Catégorie & Badge Alerte */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                      {p.categorie || 'Général'}
                    </span>

                    {/* ÉTIQUETTE ROUGE RUPTURE PROCHE SI STOCK <= SEUIL */}
                    {isAlert ? (
                      <span className="badge badge-rupture">
                        <AlertTriangle size={12} />
                        Rupture proche
                      </span>
                    ) : (
                      <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                        En stock
                      </span>
                    )}
                  </div>

                  {/* Section Miniature Photo + Infos Produit (Nom, Stock) */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
                    <div className="product-thumb-container">
                      {imageSource ? (
                        <img 
                          src={imageSource} 
                          alt={p.nom} 
                          className="product-thumb" 
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const placeholder = e.currentTarget.parentElement?.querySelector('.thumb-placeholder');
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="thumb-placeholder" 
                        style={{ display: imageSource ? 'none' : 'flex' }}
                      >
                        <Package size={22} style={{ color: 'var(--text-light)' }} />
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 
                        style={{ 
                          fontSize: '1.05rem', 
                          fontWeight: '700', 
                          color: 'var(--primary-900)', 
                          margin: '0 0 4px 0', 
                          lineHeight: 1.25,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }} 
                        title={p.nom}
                      >
                        {p.nom}
                      </h3>

                      {/* Affichage Quantité en Stock */}
                      <div className="product-stock-display" style={{ margin: 0 }}>
                        <span className={`stock-number ${isAlert ? 'alert' : 'normal'}`} style={{ fontSize: '1.2rem' }}>
                          {p.quantite_stock}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                          en rayon (seuil: {p.seuil_alerte})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tarification FCFA */}
                  <div style={{
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.84rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '8px'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Prix vente</span>
                      <strong style={{ color: 'var(--primary-800)', fontSize: '0.95rem' }}>
                        {Number(p.prix_vente).toLocaleString('fr-FR')} F
                      </strong>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>Achat / Marge</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {Number(p.prix_achat).toLocaleString('fr-FR')} F (+{marge.toLocaleString('fr-FR')} F)
                      </span>
                    </div>
                  </div>
                </div>

                {/* BOUTONS D'ACTIONS RAPIDES : ACHAT (+) ET VENTE (−) */}
                <div>
                  <div className="product-actions">
                    <button
                      onClick={() => setProduitPourAchat(p)}
                      className="btn btn-primary btn-sm"
                      title="Approvisionner le stock (+)"
                      style={{ padding: '8px 10px' }}
                    >
                      <Plus size={16} />
                      <span>Achat (+)</span>
                    </button>

                    <button
                      onClick={() => setProduitPourVente(p)}
                      className="btn btn-gold btn-sm"
                      disabled={p.quantite_stock <= 0}
                      title={p.quantite_stock <= 0 ? "Stock épuisé" : "Encaisser une vente (−)"}
                      style={{ padding: '8px 10px' }}
                    >
                      <Minus size={16} />
                      <span>Vente (−)</span>
                    </button>
                  </div>

                  {/* Actions secondaires : Modifier / Supprimer (désactivées visuellement si Employé) */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '8px' }}>
                    <button
                      onClick={() => !isEmploye && setProduitPourEdition(p)}
                      disabled={isEmploye}
                      className="btn-icon btn-outline"
                      title={isEmploye ? "Modification réservée au Gérant" : "Modifier les détails du produit"}
                      style={{ 
                        padding: '4px 6px', 
                        fontSize: '0.75rem', 
                        color: 'var(--text-muted)',
                        opacity: isEmploye ? 0.35 : 1,
                        cursor: isEmploye ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => !isEmploye && handleSupprimerProduit(p.id, p.nom)}
                      disabled={isEmploye}
                      className="btn-icon btn-outline"
                      title={isEmploye ? "Suppression réservée au Gérant" : "Supprimer le produit"}
                      style={{ 
                        padding: '4px 6px', 
                        fontSize: '0.75rem', 
                        color: 'var(--danger-500)',
                        opacity: isEmploye ? 0.35 : 1,
                        cursor: isEmploye ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALES D'ACTIONS */}
      {produitPourAchat && (
        <ModalAchat
          produit={produitPourAchat}
          onClose={() => setProduitPourAchat(null)}
          onSuccess={handleSuccesAchat}
        />
      )}

      {produitPourVente && (
        <ModalVente
          produit={produitPourVente}
          onClose={() => setProduitPourVente(null)}
          onSuccess={handleSuccesVente}
        />
      )}

      {modalNouveauProduit && (
        <ModalProduit
          onClose={() => setModalNouveauProduit(false)}
          onSuccess={handleSuccesProduit}
        />
      )}

      {produitPourEdition && (
        <ModalProduit
          produit={produitPourEdition}
          onClose={() => setProduitPourEdition(null)}
          onSuccess={handleSuccesProduit}
        />
      )}

      {/* MODALE DU REÇU IMPRIMABLE (AFFICHÉE IMMÉDIATEMENT APRÈS LA VENTE) */}
      {recuVente && (
        <RecuVente
          recu={recuVente}
          onClose={() => setRecuVente(null)}
        />
      )}
    </div>
  );
};
