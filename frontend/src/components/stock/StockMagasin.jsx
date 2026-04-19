// StockMagasin.jsx — « Le magasin ».
// Identité : rayonnages de magasin avec étiquettes, barres de niveau comme
// des tubes de produit, alertes stock faible en rouge. Palette bleue+verte.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Package, AlertTriangle, Search, Plus, Filter, TrendingDown,
  Box, Droplet, Zap, Shirt,
} from 'lucide-react';
import api from '../../lib/api';

const tokenStyle = `
  .mag-root {
    --bg: oklch(0.965 0.012 80);
    --paper: oklch(0.975 0.014 82);
    --surface: oklch(0.985 0.008 85);
    --surface-2: oklch(0.945 0.014 78);
    --ink: oklch(0.165 0.012 60);
    --ink-2: oklch(0.32 0.012 60);
    --ink-3: oklch(0.52 0.010 60);
    --ink-4: oklch(0.72 0.008 70);
    --line: oklch(0.85 0.012 75);
    --line-2: oklch(0.92 0.010 78);
    --emerald: oklch(0.52 0.13 165);
    --emerald-soft: oklch(0.93 0.05 165);
    --cool: oklch(0.55 0.08 220);
    --cool-soft: oklch(0.93 0.03 220);
    --warm: oklch(0.62 0.14 45);
    --warm-soft: oklch(0.94 0.05 45);
    --danger: oklch(0.55 0.18 25);
    --danger-soft: oklch(0.94 0.08 25);
  }
  .mag-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .mag-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .mag-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .mag-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .mag-italic  { font-style: italic; color: var(--cool); font-weight: 400; }

  .mag-item {
    display: grid; grid-template-columns: 40px 1fr 100px 140px 100px;
    gap: 16px; align-items: center;
    padding: 16px 22px;
    background: var(--paper);
    border-bottom: 1px solid var(--line-2);
    transition: background .15s;
  }
  .mag-item:hover { background: var(--cool-soft); }
  .mag-item.alert { background: color-mix(in oklch, var(--danger-soft) 50%, var(--paper)); }

  /* Jauge (tube) */
  .mag-gauge {
    height: 8px; border-radius: 4px; background: var(--surface-2);
    overflow: hidden; position: relative; border: 1px solid var(--line);
  }
  .mag-gauge-fill {
    height: 100%; border-radius: 3px;
    transition: width .4s cubic-bezier(.16,1,.3,1);
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .mag-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .mag-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .mag-header-title { font-size: 36px !important; }
    .mag-body { padding: 0 20px 40px !important; }
    .mag-item { grid-template-columns: 32px 1fr 80px !important; gap: 10px !important; padding: 12px 14px !important; }
    .mag-hide-mobile { display: none !important; }
  }
`;

const CATEGORY_META = {
  produit_nettoyage: { label: 'Produit', icon: Droplet,  tone: 'var(--cool)' },
  materiel:          { label: 'Matériel',  icon: Package,  tone: 'var(--ink)' },
  machine:           { label: 'Machine',   icon: Zap,      tone: 'var(--warm)' },
  linge:             { label: 'Linge',     icon: Shirt,    tone: 'var(--emerald)' },
  consommable:       { label: 'Conso.',    icon: Box,      tone: 'var(--cool)' },
  autre:             { label: 'Autre',     icon: Package,  tone: 'var(--ink-3)' },
};

const fmtEur = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));

export default function StockMagasin() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: 1, page_size: 100 };
      if (search) params.search = search;
      if (category) params.category = category;
      if (lowStockOnly) params.low_stock = true;
      const [itemsRes, sumRes, alertsRes] = await Promise.all([
        api.get('/stock', { params }),
        api.get('/stock/stats/summary').catch(() => ({ data: null })),
        api.get('/stock/alerts/low').catch(() => ({ data: { items: [] } })),
      ]);
      setItems(itemsRes.data?.items || []);
      setSummary(sumRes.data);
      setAlerts(alertsRes.data?.items || []);
    } catch { setItems([]); }
    setLoading(false);
  }, [search, category, lowStockOnly]);

  useEffect(() => { load(); }, [load]);

  const filtered = items;

  return (
    <div className="mag-root">
      <style>{tokenStyle}</style>

      <div className="mag-header mag-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="mag-label" style={{ marginBottom: 12 }}>Logistique · Inventaire</div>
          <h1 className="mag-display mag-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            Le <em className="mag-italic">magasin</em>
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {summary?.total_items || items.length} référence{(summary?.total_items || items.length) > 1 ? 's' : ''} sur les rayons · {alerts.length} en alerte · {fmtEur(summary?.total_value || 0)} € de valeur
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999,
            padding: '8px 14px', minWidth: 220,
          }}>
            <Search style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Produit, SKU, fournisseur…" className="mag-mono"
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12, color: 'var(--ink)' }}
            />
          </div>
        </div>
      </div>

      {/* Bandeau alertes stock faible */}
      {alerts.length > 0 && (
        <div className="mag-body mag-fade" style={{ padding: '0 48px 16px' }}>
          <div style={{
            background: 'var(--danger-soft)', border: '1px solid var(--danger)',
            borderRadius: 12, padding: '16px 22px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <AlertTriangle style={{ width: 20, height: 20, color: 'var(--danger)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="mag-display" style={{ fontSize: 16, fontWeight: 500, color: 'var(--danger)', marginBottom: 2 }}>
                {alerts.length} article{alerts.length > 1 ? 's' : ''} en rupture ou sous le seuil d'alerte
              </div>
              <div className="mag-mono" style={{ fontSize: 11, color: 'oklch(0.35 0.12 25)', letterSpacing: '0.06em' }}>
                Commander rapidement : {alerts.slice(0, 3).map(a => a.name).join(' · ')}{alerts.length > 3 ? ` +${alerts.length - 3}` : ''}
              </div>
            </div>
            <button
              onClick={() => setLowStockOnly(l => !l)}
              style={{
                padding: '8px 14px', borderRadius: 999,
                background: lowStockOnly ? 'var(--danger)' : 'var(--paper)',
                color: lowStockOnly ? 'var(--bg)' : 'var(--danger)',
                border: '1px solid var(--danger)',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em',
                textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {lowStockOnly ? 'Voir tout' : 'Isoler les alertes'}
            </button>
          </div>
        </div>
      )}

      {/* KPIs */}
      {summary && (
        <div className="mag-body mag-fade" style={{ padding: '0 48px 24px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
            background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden',
          }}>
            {[
              { label: 'Articles', value: summary.total_items || 0, sub: 'Sur étagère', tone: 'var(--ink)' },
              { label: 'Valeur totale', value: `${fmtEur(summary.total_value || 0)} €`, sub: 'Stock valorisé', tone: 'var(--emerald)' },
              { label: 'En alerte', value: alerts.length, sub: 'À recommander', tone: 'var(--danger)' },
              { label: 'Catégories', value: Object.keys(summary.by_category || {}).length || Object.keys(CATEGORY_META).length, sub: 'Types de produits', tone: 'var(--cool)' },
            ].map((k, i) => (
              <div key={i} style={{ padding: '22px 26px', borderRight: i < 3 ? '1px solid var(--line-2)' : 0 }}>
                <div className="mag-label" style={{ marginBottom: 8 }}>{k.label}</div>
                <div className="mag-display" style={{ fontSize: 30, fontWeight: 500, color: k.tone, lineHeight: 1 }}>
                  {k.value}
                </div>
                <div className="mag-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6, letterSpacing: '0.06em' }}>
                  {k.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtres catégories */}
      <div className="mag-body mag-fade" style={{ padding: '0 48px 20px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="mag-label"><Filter style={{ width: 11, height: 11, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} /> Rayon :</span>
          <button onClick={() => setCategory('')} style={{
            padding: '6px 14px', borderRadius: 999,
            border: `1px solid ${!category ? 'var(--ink)' : 'var(--line)'}`,
            background: !category ? 'var(--ink)' : 'var(--surface)',
            color: !category ? 'var(--bg)' : 'var(--ink-3)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em',
            textTransform: 'uppercase', fontWeight: 500, cursor: 'pointer',
          }}>Tout</button>
          {Object.entries(CATEGORY_META).map(([k, m]) => (
            <button key={k} onClick={() => setCategory(k)} style={{
              padding: '6px 14px', borderRadius: 999,
              border: `1px solid ${category === k ? m.tone : 'var(--line)'}`,
              background: category === k ? `color-mix(in oklch, ${m.tone} 15%, var(--surface))` : 'var(--surface)',
              color: category === k ? m.tone : 'var(--ink-3)',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em',
              textTransform: 'uppercase', fontWeight: 500, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <m.icon style={{ width: 11, height: 11 }} /> {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste articles */}
      <div className="mag-body mag-fade" style={{ padding: '0 48px 40px' }}>
        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
            Inventaire en cours…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: 60, textAlign: 'center',
            background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 14,
            fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)',
          }}>
            Les rayons sont vides pour ce critère.
          </div>
        ) : (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {filtered.map((it) => {
              const meta = CATEGORY_META[it.category] || CATEGORY_META.autre;
              const alert = (it.quantity || 0) <= (it.alert_threshold || 0);
              const pct = it.alert_threshold ? Math.min(100, ((it.quantity || 0) / (it.alert_threshold * 3)) * 100) : 50;
              return (
                <div key={it.id || it._id || it.sku} className={`mag-item ${alert ? 'alert' : ''}`}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `color-mix(in oklch, ${meta.tone} 12%, transparent)`,
                    color: meta.tone,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <meta.icon style={{ width: 15, height: 15 }} />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}>
                      {it.name}
                    </div>
                    <div className="mag-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                      {it.sku && <>SKU {it.sku} · </>}
                      {meta.label}
                      {it.supplier && <> · {it.supplier}</>}
                    </div>
                  </div>

                  <div className="mag-hide-mobile">
                    <div className="mag-gauge">
                      <div
                        className="mag-gauge-fill"
                        style={{ width: `${pct}%`, background: alert ? 'var(--danger)' : meta.tone }}
                      />
                    </div>
                    <div className="mag-mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.06em' }}>
                      seuil : {it.alert_threshold || 0}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="mag-display" style={{ fontSize: 22, fontWeight: 500, color: alert ? 'var(--danger)' : 'var(--ink)', lineHeight: 1 }}>
                      {it.quantity || 0}
                      <span style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic', marginLeft: 4 }}>{it.unit || 'u'}</span>
                    </div>
                    {alert && (
                      <div className="mag-mono" style={{ fontSize: 9, color: 'var(--danger)', marginTop: 2, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                        <TrendingDown style={{ width: 9, height: 9, display: 'inline-block' }} /> Alerte
                      </div>
                    )}
                  </div>

                  <div className="mag-hide-mobile" style={{ textAlign: 'right' }}>
                    <div className="mag-mono" style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>
                      {fmtEur((it.quantity || 0) * (it.unit_price || 0))} €
                    </div>
                    <div className="mag-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                      {fmtEur(it.unit_price || 0)} € / {it.unit || 'u'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
