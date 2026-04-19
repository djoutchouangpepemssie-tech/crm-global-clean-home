// SEOAtlas.jsx — « L'atlas ».
// Identité : carte/cartographie du positionnement, KPIs en bandes
// méridiennes, liste de mots-clés façon index géographique. Palette
// bleu navy pour l'ambiance atlas maritime.

import React, { useMemo, useState } from 'react';
import { useSeoStats } from '../../hooks/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Search, Eye, MousePointer, Target, Award, TrendingUp, TrendingDown,
  Globe, Smartphone, Monitor, ArrowUp, ArrowDown, Compass,
} from 'lucide-react';

const tokenStyle = `
  .atl-root {
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
    --navy: oklch(0.35 0.08 240);
    --navy-deep: oklch(0.22 0.08 240);
    --navy-soft: oklch(0.92 0.03 240);
    --emerald: oklch(0.52 0.13 165);
    --emerald-soft: oklch(0.93 0.05 165);
    --gold: oklch(0.72 0.13 85);
    --warm: oklch(0.62 0.14 45);
  }
  .atl-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .atl-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .atl-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .atl-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .atl-italic  { font-style: italic; color: var(--navy); font-weight: 400; }

  .atl-section {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 14px; padding: 24px;
    margin-bottom: 18px;
  }

  /* Rang SEO */
  .atl-rank {
    display: grid; grid-template-columns: 50px 1fr 100px 100px 100px 80px;
    gap: 14px; align-items: center;
    padding: 12px 0;
    border-bottom: 1px dashed var(--line-2);
  }
  .atl-rank:last-child { border-bottom: 0; }

  .atl-rank-num {
    font-family: 'Fraunces', serif; font-size: 22px; font-weight: 400;
    color: var(--ink-3); letter-spacing: -0.02em;
    font-variant-numeric: oldstyle-nums; text-align: right;
  }
  .atl-rank.top .atl-rank-num { color: var(--navy); }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .atl-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .atl-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .atl-header-title { font-size: 36px !important; }
    .atl-body { padding: 0 20px 40px !important; }
    .atl-grid { grid-template-columns: 1fr !important; }
    .atl-rank { grid-template-columns: 36px 1fr 60px 60px !important; gap: 8px !important; }
    .atl-hide-mobile { display: none !important; }
  }
`;

const fmt = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));

const DEVICE_META = {
  desktop: { label: 'Ordinateur', icon: Monitor,    tone: 'var(--navy)' },
  mobile:  { label: 'Mobile',     icon: Smartphone, tone: 'var(--emerald)' },
  tablet:  { label: 'Tablette',   icon: Smartphone, tone: 'var(--gold)' },
};

export default function SEOAtlas() {
  const [days, setDays] = useState(28);
  const { data, isLoading, refetch } = useSeoStats(days);
  const [kwSearch, setKwSearch] = useState('');

  const overview = data?.overview || {};
  const keywords = useMemo(() => {
    const arr = [...((data?.keywords) || [])];
    if (kwSearch.trim()) {
      const q = kwSearch.toLowerCase();
      return arr.filter(k => (k.query || '').toLowerCase().includes(q));
    }
    return arr.slice().sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
  }, [data?.keywords, kwSearch]);

  const daily = useMemo(() => {
    return (data?.daily || []).map(d => ({
      ...d,
      date: d.date || d.day,
    }));
  }, [data?.daily]);

  const deviceTotal = (data?.devices || []).reduce((s, x) => s + (x.clicks || 0), 0) || 1;

  return (
    <div className="atl-root">
      <style>{tokenStyle}</style>

      <div className="atl-header atl-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="atl-label" style={{ marginBottom: 12 }}>SEO · Cartographie</div>
          <h1 className="atl-display atl-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            L'<em className="atl-italic">atlas</em>
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {fmt(overview.clicks || 0)} clics · {fmt(overview.impressions || 0)} impressions · position {(overview.position || 0).toFixed(1)}
          </div>
        </div>

        <div style={{ display: 'inline-flex', padding: 3, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999 }}>
          {[7, 28, 90].map(d => (
            <button key={d}
              onClick={() => setDays(d)}
              style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em',
                textTransform: 'uppercase', border: 0,
                background: days === d ? 'var(--navy-deep)' : 'transparent',
                color: days === d ? 'var(--bg)' : 'var(--ink-3)',
                padding: '8px 16px', borderRadius: 999, cursor: 'pointer', transition: 'all .15s',
              }}
            >{d}j</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="atl-body atl-fade" style={{ padding: '0 48px 18px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
          background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden',
        }}>
          {[
            { label: 'Clics',        value: fmt(overview.clicks || 0),      icon: MousePointer, tone: 'var(--navy)' },
            { label: 'Impressions',  value: fmt(overview.impressions || 0), icon: Eye,          tone: 'var(--emerald)' },
            { label: 'CTR moyen',    value: `${(overview.ctr || 0).toFixed(2)}%`, icon: Target, tone: 'var(--warm)' },
            { label: 'Position',     value: (overview.position || 0).toFixed(1), icon: Award,  tone: 'var(--gold)' },
          ].map((k, i) => (
            <div key={i} style={{ padding: '22px 26px', borderRight: i < 3 ? '1px solid var(--line-2)' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: `color-mix(in oklch, ${k.tone} 14%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <k.icon style={{ width: 13, height: 13, color: k.tone }} />
                </div>
                <span className="atl-label">{k.label}</span>
              </div>
              <div className="atl-display" style={{ fontSize: 30, fontWeight: 500, color: k.tone, lineHeight: 1 }}>
                {k.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Graphique + Devices */}
      <div className="atl-body atl-fade" style={{ padding: '0 48px 18px' }}>
        <div className="atl-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>

          <div className="atl-section">
            <div className="atl-label" style={{ marginBottom: 4 }}>Relevé journalier</div>
            <h3 className="atl-display" style={{ fontSize: 20, fontWeight: 400, margin: '0 0 16px' }}>
              Flux de <em style={{ color: 'var(--navy)' }}>clics</em> sur {days} jours
            </h3>
            {daily.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif', fontStyle: 'italic' }}>
                Pas encore de relevé cartographique.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={daily}>
                  <defs>
                    <linearGradient id="atlGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--navy)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--navy)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--line-2)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--ink-3)" style={{ fontSize: 9 }} tickLine={false} axisLine={false}
                    tickFormatter={v => v?.slice(5)} />
                  <YAxis stroke="var(--ink-3)" style={{ fontSize: 9 }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)', border: '1px solid var(--line)',
                      borderRadius: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    }}
                  />
                  <Area type="monotone" dataKey="clicks" stroke="var(--navy)" strokeWidth={2} fill="url(#atlGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="atl-section">
            <div className="atl-label" style={{ marginBottom: 4 }}>Par appareil</div>
            <h3 className="atl-display" style={{ fontSize: 20, fontWeight: 400, margin: '0 0 16px' }}>
              <em style={{ color: 'var(--navy)' }}>Répartition</em>
            </h3>
            {(!data?.devices || data.devices.length === 0) ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif', fontStyle: 'italic' }}>
                Pas de données par appareil.
              </div>
            ) : (
              data.devices.map((d, i) => {
                const meta = DEVICE_META[d.device] || DEVICE_META.desktop;
                const pct = Math.round(((d.clicks || 0) / deviceTotal) * 100);
                return (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)' }}>
                        <meta.icon style={{ width: 14, height: 14, color: meta.tone }} />
                        {meta.label}
                      </span>
                      <span className="atl-mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                        {fmt(d.clicks)} · {pct}%
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: meta.tone, transition: 'width .4s' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Index des mots-clés */}
      <div className="atl-body atl-fade" style={{ padding: '0 48px 40px' }}>
        <div className="atl-section">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="atl-label" style={{ marginBottom: 4 }}>Index des territoires</div>
              <h3 className="atl-display" style={{ fontSize: 22, fontWeight: 400, margin: 0 }}>
                <em style={{ color: 'var(--navy)' }}>Mots-clés</em> cartographiés
              </h3>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999,
              padding: '6px 12px', minWidth: 220,
            }}>
              <Search style={{ width: 13, height: 13, color: 'var(--ink-3)' }} />
              <input
                value={kwSearch} onChange={e => setKwSearch(e.target.value)}
                placeholder="Filtrer un mot-clé…" className="atl-mono"
                style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 11, color: 'var(--ink)' }}
              />
            </div>
          </div>

          {/* En-tête */}
          <div className="atl-rank" style={{ paddingBottom: 8, borderBottom: '2px solid var(--ink)' }}>
            <span className="atl-label" style={{ textAlign: 'right' }}>#</span>
            <span className="atl-label">Requête</span>
            <span className="atl-label atl-hide-mobile" style={{ textAlign: 'right' }}>Clics</span>
            <span className="atl-label atl-hide-mobile" style={{ textAlign: 'right' }}>Impres.</span>
            <span className="atl-label atl-hide-mobile" style={{ textAlign: 'right' }}>CTR</span>
            <span className="atl-label atl-hide-mobile" style={{ textAlign: 'right' }}>Pos.</span>
          </div>

          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
              Relevé topographique en cours…
            </div>
          ) : keywords.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
              Aucun mot-clé cartographié.
            </div>
          ) : (
            keywords.slice(0, 20).map((k, i) => (
              <div key={i} className={`atl-rank ${i < 3 ? 'top' : ''}`}>
                <span className="atl-rank-num">{i + 1}</span>
                <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)', fontWeight: i < 3 ? 500 : 400 }}>
                  {k.query || '—'}
                </span>
                <span className="atl-mono atl-hide-mobile" style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', color: 'var(--ink)' }}>
                  {fmt(k.clicks || 0)}
                </span>
                <span className="atl-mono atl-hide-mobile" style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink-2)' }}>
                  {fmt(k.impressions || 0)}
                </span>
                <span className="atl-mono atl-hide-mobile" style={{ fontSize: 12, textAlign: 'right', color: 'var(--ink-2)' }}>
                  {((k.ctr || 0) * (k.ctr > 1 ? 1 : 100)).toFixed(1)}%
                </span>
                <span className="atl-mono atl-hide-mobile" style={{ fontSize: 12, textAlign: 'right', color: (k.position || 99) <= 10 ? 'var(--emerald)' : 'var(--ink-2)', fontWeight: 600 }}>
                  {(k.position || 0).toFixed(1)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
