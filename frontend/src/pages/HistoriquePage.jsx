import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RecuVente } from '../components/RecuVente';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  RefreshCw,
  ShoppingBag,
  Truck,
  Printer,
  FileText
} from 'lucide-react';

export const HistoriquePage = () => {
  const [mouvements, setMouvements] = useState({ achats: [], ventes: [] });
  const [loading, setLoading] = useState(true);
  const [loadingRecuId, setLoadingRecuId] = useState(null);
  const [recuSelectionne, setRecuSelectionne] = useState(null);
  const [onglet, setOnglet] = useState('tous'); // 'tous', 'ventes', 'achats'

  const chargerHistorique = async () => {
    setLoading(true);
    try {
      const data = await api.historique.get();
      setMouvements(data);
    } catch (err) {
      console.error("Erreur historique:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerHistorique();
  }, []);

  const handleVoirRecu = async (venteId) => {
    setLoadingRecuId(venteId);
    try {
      const recu = await api.ventes.getRecu(venteId);
      setRecuSelectionne(recu);
    } catch (err) {
      alert("Erreur lors de la récupération du reçu : " + (err.message || 'Introuvable'));
    } finally {
      setLoadingRecuId(null);
    }
  };

  // Fusionner et trier chronologiquement
  const items = [
    ...(mouvements.achats || []).map((a) => ({ ...a, type_mvt: 'achat' })),
    ...(mouvements.ventes || []).map((v) => ({ ...v, type_mvt: 'vente' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const itemsFiltres = items.filter((item) => {
    if (onglet === 'ventes') return item.type_mvt === 'vente';
    if (onglet === 'achats') return item.type_mvt === 'achat';
    return true;
  });

  return (
    <div className="app-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">
            <History size={28} style={{ color: 'var(--primary-700)' }} />
            <span>Journal des Mouvements</span>
          </h1>
          <p className="page-subtitle">
            Historique complet des approvisionnements (+) et encaissements (−)
          </p>
        </div>

        <button onClick={chargerHistorique} className="btn btn-outline btn-sm">
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
        <button
          onClick={() => setOnglet('tous')}
          className={`btn btn-sm ${onglet === 'tous' ? 'btn-primary' : 'btn-outline'}`}
        >
          Tous les mouvements ({items.length})
        </button>
        <button
          onClick={() => setOnglet('ventes')}
          className={`btn btn-sm ${onglet === 'ventes' ? 'btn-gold' : 'btn-outline'}`}
        >
          Sorties / Ventes (−) ({mouvements.ventes?.length || 0})
        </button>
        <button
          onClick={() => setOnglet('achats')}
          className={`btn btn-sm ${onglet === 'achats' ? 'btn-primary' : 'btn-outline'}`}
        >
          Entrées / Achats (+) ({mouvements.achats?.length || 0})
        </button>
      </div>

      {/* LISTE DES MOUVEMENTS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="spin" style={{ margin: '0 auto 12px auto' }} />
          <p>Chargement des mouvements...</p>
        </div>
      ) : itemsFiltres.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <History size={48} style={{ color: 'var(--text-light)', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '4px' }}>
            Aucun mouvement enregistré
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Les achats et les ventes enregistrés apparaîtront ici chronologiquement.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {itemsFiltres.map((item, idx) => {
            const isVente = item.type_mvt === 'vente';
            return (
              <div 
                key={`${item.type_mvt}-${item.id}-${idx}`}
                className="card"
                style={{
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-md)',
                    background: isVente ? '#fef3c7' : '#e6f6f1',
                    color: isVente ? 'var(--gold-600)' : 'var(--primary-700)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isVente ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>

                  <div>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--primary-900)' }}>
                      {item.produit_nom}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{isVente ? `Vendeur: ${item.vendeur_nom || 'Comptoir'}` : `Fournisseur: ${item.fournisseur || 'Inconnu'}`}</span>
                      <span>•</span>
                      <span>{item.date}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '1.15rem',
                      fontWeight: '800',
                      fontFamily: 'var(--font-display)',
                      color: isVente ? 'var(--gold-600)' : 'var(--primary-800)'
                    }}>
                      {isVente ? '-' : '+'}{item.quantite} unité(s)
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Total : <strong>{Number(item.total).toLocaleString('fr-FR')} FCFA</strong> ({Number(item.prix_unitaire).toLocaleString('fr-FR')} F/u)
                    </div>
                  </div>

                  {/* Bouton Voir / Imprimer le Reçu si c'est une Vente */}
                  {isVente && (
                    <button
                      onClick={() => handleVoirRecu(item.id)}
                      disabled={loadingRecuId === item.id}
                      className="btn btn-outline btn-sm"
                      title="Afficher et réimprimer le reçu de cette vente"
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', fontSize: '0.8rem' }}
                    >
                      <Printer size={14} />
                      <span>{loadingRecuId === item.id ? "..." : "Reçu"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE DU REÇU IMPRIMABLE */}
      {recuSelectionne && (
        <RecuVente
          recu={recuSelectionne}
          onClose={() => setRecuSelectionne(null)}
        />
      )}
    </div>
  );
};
