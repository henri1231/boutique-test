import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  ShoppingBag, 
  Receipt, 
  Calendar, 
  RefreshCw, 
  AlertOctagon, 
  ArrowUpRight, 
  ArrowDownRight, 
  Percent, 
  ShieldAlert,
  BarChart3,
  Layers,
  ChevronRight,
  Filter
} from 'lucide-react';

export const FinancesPage = () => {
  const { isGerant, isEmploye } = useAuth();

  const [periode, setPeriode] = useState('ce_mois'); // 'aujourd_hui', 'cette_semaine', 'ce_mois', 'tout', 'custom'
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [customFilterActive, setCustomFilterActive] = useState(false);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');

  const formatFCFA = (valeur) => {
    if (valeur === undefined || valeur === null) return '0 FCFA';
    const num = Math.round(Number(valeur));
    return num.toLocaleString('fr-FR') + ' FCFA';
  };

  const chargerFinances = useCallback(async (selectedPeriode, dDebut, dFin) => {
    if (isEmploye) return;
    setLoading(true);
    setErreur('');
    try {
      const params = {};
      if (selectedPeriode === 'custom' && dDebut && dFin) {
        params.date_debut = dDebut;
        params.date_fin = dFin;
      } else {
        params.periode = selectedPeriode;
      }
      const res = await api.finances.getResume(params);
      setData(res);
    } catch (err) {
      console.error("Erreur chargement finances:", err);
      setErreur(err.message || "Erreur lors de la récupération des métriques financières.");
    } finally {
      setLoading(false);
    }
  }, [isEmploye]);

  useEffect(() => {
    chargerFinances(periode, dateDebut, dateFin);
  }, [periode, chargerFinances]);

  const changerPeriode = (nouvellePeriode) => {
    setCustomFilterActive(false);
    setPeriode(nouvellePeriode);
  };

  const appliquerFiltreDates = (e) => {
    e.preventDefault();
    if (!dateDebut || !dateFin) {
      setErreur("Veuillez sélectionner à la fois la date de début et la date de fin.");
      return;
    }
    setCustomFilterActive(true);
    setPeriode('custom');
    chargerFinances('custom', dateDebut, dateFin);
  };

  // Sécurité : Accès restreint au Gérant
  if (isEmploye) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px 24px',
          maxWidth: '520px',
          margin: '0 auto',
          boxShadow: 'var(--shadow-md)'
        }}>
          <AlertOctagon size={48} style={{ color: 'var(--danger-500)', margin: '0 auto 16px auto' }} />
          <h2 style={{ color: 'var(--text-main)', marginBottom: '8px', fontSize: '1.4rem' }}>
            Accès Réservé au Gérant
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Le tableau de bord financier, le calcul des coûts d'achat, du chiffre d'affaires et des marges bénéficiaires de la boutique sont strictement confidentiels et réservés au gérant.
          </p>
        </div>
      </div>
    );
  }

  const beneficeEstPositif = (data?.benefice ?? 0) >= 0;

  return (
    <div className="app-container">
      {/* EN-TÊTE DE PAGE */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="page-title">Tableau de Bord Financier</h1>
            <span className="badge badge-gold" style={{ fontSize: '0.72rem', fontWeight: '800' }}>
              GESTION & RENTABILITÉ
            </span>
          </div>
          <p className="page-subtitle">
            Analyse automatisée de la valeur du stock, des coûts de revient et du bénéfice net réalisé.
          </p>
        </div>

        <button
          onClick={() => chargerFinances(periode, dateDebut, dateFin)}
          disabled={loading}
          className="btn btn-outline btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          title="Actualiser les calculs"
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Actualiser</span>
        </button>
      </div>

      {erreur && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <AlertOctagon size={18} />
          <span>{erreur}</span>
        </div>
      )}

      {/* SÉLECTEUR DE PÉRIODE RAPIDE */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} style={{ color: 'var(--primary-700)' }} />
            <span style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--primary-900)' }}>
              Période d'analyse des ventes :
            </span>
            <span className="badge badge-neutral" style={{ fontSize: '0.75rem', fontWeight: '600' }}>
              {data?.periode_libelle || "Chargement..."}
            </span>
          </div>

          {/* Boutons de sélection rapide */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { key: 'aujourd_hui', label: "Aujourd'hui" },
              { key: 'cette_semaine', label: "Cette semaine" },
              { key: 'ce_mois', label: "Ce mois-ci" },
              { key: 'tout', label: "Tout l'historique" },
            ].map((p) => {
              const estActif = !customFilterActive && periode === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => changerPeriode(p.key)}
                  className={`btn btn-sm ${estActif ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    fontSize: '0.82rem',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: estActif ? '700' : '500'
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtre dates personnalisées pliable */}
        <details style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--surface-border)' }}>
          <summary style={{ fontSize: '0.84rem', color: 'var(--primary-700)', cursor: 'pointer', fontWeight: '600' }}>
            🔍 Filtrer par plage de dates personnalisée (du ... au ...)
          </summary>
          <form onSubmit={appliquerFiltreDates} style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Du :</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '0.85rem', width: 'auto' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Au :</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '0.85rem', width: 'auto' }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-gold btn-sm"
              style={{ fontSize: '0.82rem', padding: '7px 14px' }}
            >
              Appliquer la plage
            </button>
          </form>
        </details>
      </div>

      {/* LES 4 GRANDES CARTES FINANCIÈRES METIER */}
      <div className="finance-kpis-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '18px',
        marginBottom: '28px'
      }}>
        {/* CARTE 1 : VALEUR D'ACHAT DU STOCK ACTUEL */}
        <div className="card finance-card" style={{
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '4px solid #0f5441',
          padding: '22px 20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Valeur Stock Actuel (Achat)
            </span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'var(--primary-50)',
              color: 'var(--primary-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Package size={20} />
            </div>
          </div>
          <div style={{
            fontSize: '1.85rem',
            fontWeight: '800',
            fontFamily: 'var(--font-display)',
            color: 'var(--primary-900)',
            lineHeight: 1.1,
            marginBottom: '6px'
          }}>
            {loading ? '...' : formatFCFA(data?.valeur_stock_achat)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{data?.total_articles_en_stock ?? 0} article(s) physique(s) en rayon</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
            Immobilisation financière totale au prix coûtant
          </div>
        </div>

        {/* CARTE 2 : CHIFFRE D'AFFAIRES DE LA PÉRIODE */}
        <div className="card finance-card" style={{
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '4px solid #2563eb',
          padding: '22px 20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Chiffre d'Affaires
            </span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{
            fontSize: '1.85rem',
            fontWeight: '800',
            fontFamily: 'var(--font-display)',
            color: '#1e3a8a',
            lineHeight: 1.1,
            marginBottom: '6px'
          }}>
            {loading ? '...' : formatFCFA(data?.chiffre_affaires)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>{data?.nb_ventes ?? 0} vente(s) • {data?.articles_vendus_total ?? 0} article(s) vendu(s)</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
            Total encaissé sur la période sélectionnée
          </div>
        </div>

        {/* CARTE 3 : COÛT TOTAL DES MARCHANDISES VENDUES */}
        <div className="card finance-card" style={{
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '4px solid #d97706',
          padding: '22px 20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Coût Marchandises Vendues
            </span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#fffbeb',
              color: '#b45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Receipt size={20} />
            </div>
          </div>
          <div style={{
            fontSize: '1.85rem',
            fontWeight: '800',
            fontFamily: 'var(--font-display)',
            color: '#78350f',
            lineHeight: 1.1,
            marginBottom: '6px'
          }}>
            {loading ? '...' : formatFCFA(data?.cout_marchandises_vendues)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>Prix de revient d'achat des articles vendus</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
            Ce que les produits vendus avaient coûté à l'achat
          </div>
        </div>

        {/* CARTE 4 : BÉNÉFICE TOTAL (MIS EN VALEUR SELON SIGNE) */}
        <div className="card finance-card" style={{
          position: 'relative',
          overflow: 'hidden',
          border: `2px solid ${beneficeEstPositif ? '#3E8E5A' : '#C1443C'}`,
          background: beneficeEstPositif 
            ? 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)' 
            : 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)',
          padding: '22px 20px',
          boxShadow: beneficeEstPositif 
            ? '0 10px 20px -5px rgba(62, 142, 90, 0.2)' 
            : '0 10px 20px -5px rgba(193, 68, 60, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ 
                fontSize: '0.8rem', 
                fontWeight: '800', 
                textTransform: 'uppercase', 
                letterSpacing: '0.04em', 
                color: beneficeEstPositif ? '#3E8E5A' : '#C1443C' 
              }}>
                Bénéfice Net Réalisé
              </span>
              <span className={`badge ${beneficeEstPositif ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                {beneficeEstPositif ? 'GAIN' : 'PERTE'}
              </span>
            </div>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: beneficeEstPositif ? 'rgba(62, 142, 90, 0.15)' : 'rgba(193, 68, 60, 0.15)',
              color: beneficeEstPositif ? '#3E8E5A' : '#C1443C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {beneficeEstPositif ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
            </div>
          </div>

          <div style={{
            fontSize: '2rem',
            fontWeight: '900',
            fontFamily: 'var(--font-display)',
            color: beneficeEstPositif ? '#3E8E5A' : '#C1443C',
            lineHeight: 1.1,
            marginBottom: '6px'
          }}>
            {loading ? '...' : (
              `${beneficeEstPositif ? '+' : ''}${formatFCFA(data?.benefice)}`
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Taux de marge nette :</span>
            <strong style={{ 
              color: beneficeEstPositif ? '#3E8E5A' : '#C1443C',
              fontWeight: '800'
            }}>
              {data?.marge_pourcentage ?? 0}%
            </strong>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '6px' }}>
            Formule : Chiffre d'Affaires − Coût d'Achat des Marchandises
          </div>
        </div>
      </div>

      {/* SECTION RÉPARTITION DE LA RENTABILITÉ PAR PRODUIT */}
      {data?.produits_rentables && data.produits_rentables.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} style={{ color: 'var(--primary-700)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--primary-900)' }}>
                Top des Produits les Plus Rentables ({data.periode_libelle})
              </h3>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Classé par bénéfice net généré
            </span>
          </div>

          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--surface-border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px' }}>Produit</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Quantité Vendue</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Chiffre d'Affaires</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Coût d'Achat</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Bénéfice Net</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Marge</th>
                </tr>
              </thead>
              <tbody>
                {data.produits_rentables.map((item, index) => {
                  const estGain = item.benefice >= 0;
                  return (
                    <tr key={item.produit_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: '700', color: 'var(--primary-900)' }}>
                        <span style={{ color: 'var(--text-muted)', marginRight: '6px', fontSize: '0.8rem' }}>
                          #{index + 1}
                        </span>
                        {item.produit_nom}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span className="badge badge-neutral" style={{ fontWeight: '700' }}>
                          {item.quantite_vendue}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                        {formatFCFA(item.chiffre_affaires)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                        {formatFCFA(item.cout_achat)}
                      </td>
                      <td style={{ 
                        padding: '12px', 
                        textAlign: 'right', 
                        fontWeight: '800',
                        color: estGain ? '#3E8E5A' : '#C1443C'
                      }}>
                        {estGain ? '+' : ''}{formatFCFA(item.benefice)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <span style={{
                          fontWeight: '700',
                          fontSize: '0.8rem',
                          color: estGain ? '#3E8E5A' : '#C1443C',
                          background: estGain ? 'rgba(62, 142, 90, 0.1)' : 'rgba(193, 68, 60, 0.1)',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          {item.marge_pourcentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUCUNE VENTE SUR LA PÉRIODE */}
      {(!data?.produits_rentables || data.produits_rentables.length === 0) && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
          <ShoppingBag size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
          <h4 style={{ color: 'var(--text-main)', marginBottom: '4px' }}>Aucune vente enregistrée pour cette période</h4>
          <p style={{ fontSize: '0.86rem' }}>
            Sélectionnez une période plus large (ex: "Ce mois-ci" ou "Tout l'historique") pour visualiser vos indicateurs de rentabilité.
          </p>
        </div>
      )}
    </div>
  );
};
