// blocks.jsx — Catalogue des blocs du Dashboard dynamique.
// Chaque bloc : composant React autonome + metadata (titre, icône, tailles
// autorisées). Le BLOCK_REGISTRY est consommé par DynamicDashboard pour
// instancier les blocs depuis le layout JSON persistant.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

/* ───────────────── Helpers partagés ─────────────────────────────── */
const fmtMoney = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));
const fmtPct   = (v) => `${(v || 0).toFixed(1)}%`;
const relTime  = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 7 * 86400) return `il y a ${Math.floor(diff / 86400)} j`;
  return d.toLocaleDateString('fr-FR');
};

/* ───────────────── Style partagé entre blocs ────────────────────── */
const cardCss = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 14,
  padding: 24,
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
};
const labelCss = {
  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em',
  textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500,
  marginBottom: 10,
};
const displayCss = { fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' };

/* ───────────────── Bloc : Cover (en-tête personnalisé) ──────────── */
function CoverBlock({ data }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const firstName = user.firstName || user.first_name || (user.name || '').split(' ')[0] || '';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const newLeads = data?.new_leads || 0;
  const pendingQuotes = data?.sent_quotes || 0;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'flex-end',
      paddingBottom: 20, borderBottom: '1px solid var(--line)',
    }}>
      <div>
        <div style={{ ...labelCss, marginBottom: 12 }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <h1 style={{ ...displayCss, fontWeight: 300, fontSize: 56, lineHeight: 1, margin: '0 0 8px', color: 'var(--ink)' }}>
          {greeting}{firstName && <>, <em style={{ fontStyle: 'italic', color: 'var(--accent)' }}>{firstName}</em></>}.
        </h1>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
          {newLeads || pendingQuotes
            ? `${newLeads} nouveau${newLeads > 1 ? 'x' : ''} lead${newLeads > 1 ? 's' : ''}${pendingQuotes ? ` · ${pendingQuotes} devis envoyés` : ''}`
            : 'Journée calme. Parfait moment pour anticiper.'}
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Bloc : Quick actions (4 CTA rapides) ─────────── */
function QuickActionsBlock() {
  const cta = [
    { k: 'new-lead',  label: 'Nouveau lead',  to: '/leads/new',   hint: 'N' },
    { k: 'new-quote', label: 'Créer un devis', to: '/quotes/new',  hint: 'D' },
    { k: 'planning',  label: 'Planning',       to: '/planning',    hint: 'P' },
    { k: 'map',       label: 'Carte',          to: '/map',         hint: 'M' },
  ];
  return (
    <div style={{ ...cardCss, padding: 0, border: 'none', background: 'transparent' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {cta.map(c => (
          <Link key={c.k} to={c.to} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderRadius: 12, border: '1px solid var(--line)',
            background: 'var(--surface)', color: 'var(--ink)', textDecoration: 'none',
            transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--surface)'; }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{c.label}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-3)', border: '1px solid var(--line)', padding: '2px 6px', borderRadius: 4 }}>{c.hint}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ───────────────── Bloc : Hero Revenue (gros chiffre + spark) ───── */
function HeroRevenueBlock({ data }) {
  const fin = data?.financial || {};
  const revenue  = fin.total_revenue || 0;
  const pending  = fin.total_pending || 0;
  const overdue  = fin.total_overdue || 0;
  const sparkData = (fin.revenue_by_day || []).map(p => p.revenue || 0);

  // Mini sparkline SVG
  const max = Math.max(...sparkData, 1);
  const pts = sparkData.map((v, i) => `${(i / Math.max(sparkData.length - 1, 1)) * 100},${100 - (v / max) * 100}`).join(' ');

  return (
    <div style={cardCss}>
      <div style={labelCss}>Chiffre d'affaires · période</div>
      <div style={{ ...displayCss, fontWeight: 300, fontSize: 64, lineHeight: 0.95, color: 'var(--ink)', marginBottom: 4 }}>
        {fmtMoney(revenue)} <span style={{ fontSize: 22, color: 'var(--ink-3)', fontStyle: 'italic', fontWeight: 400 }}>€</span>
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)', marginBottom: 20 }}>
        encaissé sur {(fin.paid_count || 0)} factures
      </div>

      {sparkData.length > 1 && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 60, marginBottom: 12 }}>
          <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 14, borderTop: '1px solid var(--line-2)' }}>
        <div>
          <div style={labelCss}>En attente</div>
          <div style={{ ...displayCss, fontSize: 22, fontWeight: 500 }}>{fmtMoney(pending)} €</div>
        </div>
        <div>
          <div style={labelCss}>En retard</div>
          <div style={{ ...displayCss, fontSize: 22, fontWeight: 500, color: overdue > 0 ? 'var(--warm)' : 'var(--ink)' }}>
            {fmtMoney(overdue)} €
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Bloc : KPI Leads (nouveaux / objectif) ───────── */
function LeadsKpiBlock({ data }) {
  const newLeads = data?.new_leads || 0;
  const leadsGoal = 20;
  const pct = Math.min(100, (newLeads / leadsGoal) * 100);

  return (
    <div style={cardCss}>
      <div style={labelCss}>Nouveaux leads</div>
      <div style={{ ...displayCss, fontSize: 56, fontWeight: 300, lineHeight: 1, color: 'var(--accent)' }}>
        {newLeads}
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)', marginTop: 4, marginBottom: 16 }}>
        / {leadsGoal} objectif mensuel
      </div>
      <div style={{ height: 6, background: 'var(--line-2)', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', transition: 'width .4s' }} />
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-3)' }}>{Math.round(pct)}% atteint</div>
    </div>
  );
}

/* ───────────────── Bloc : Pipeline commercial ───────────────────── */
function PipelineBlock({ data }) {
  const stages = [
    { name: 'Nouveau',  count: data?.new_leads       || 0, key: 'nouveau' },
    { name: 'Contacté', count: data?.contacted_leads || 0, key: 'contacté' },
    { name: 'Devis',    count: data?.total_quotes    || 0, key: 'devis' },
    { name: 'Envoyé',   count: data?.sent_quotes     || 0, key: 'envoyé' },
    { name: 'Accepté',  count: data?.accepted_quotes || 0, key: 'accepté' },
    { name: 'Gagné',    count: data?.won_leads       || 0, key: 'gagné' },
  ];
  const max = Math.max(...stages.map(s => s.count), 1);
  const conversion = data?.conversion_lead_to_quote || 0;

  return (
    <div style={cardCss}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
        <div>
          <div style={labelCss}>Pipeline commercial</div>
          <div style={{ ...displayCss, fontSize: 24, fontWeight: 500 }}>
            {stages.reduce((s, x) => s + x.count, 0)} opportunités · conversion {fmtPct(conversion)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, 1fr)`, gap: 10 }}>
        {stages.map((s, i) => {
          const h = Math.max(24, (s.count / max) * 120);
          return (
            <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ height: 120, display: 'flex', alignItems: 'flex-end' }}>
                <div style={{
                  width: '100%', height: h, background: i === stages.length - 1 ? 'var(--accent)' : 'var(--ink)',
                  opacity: i === stages.length - 1 ? 1 : 0.2 + (i / stages.length) * 0.6,
                  borderRadius: '6px 6px 0 0', transition: 'height .4s',
                }} />
              </div>
              <div style={{ ...displayCss, fontSize: 22, fontWeight: 500, marginTop: 8, textAlign: 'center' }}>{s.count}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>{s.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────── Bloc : Activity Feed (temps réel) ────────────── */
function ActivityFeedBlock() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () => {
      api.get('/activity/live', { params: { limit: 15 } })
        .then(r => { if (alive) setItems(r.data?.items || []); })
        .catch(() => { if (alive) setItems([]); })
        .finally(() => { if (alive) setLoading(false); });
    };
    load();
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 20000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div style={cardCss}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: 999, animation: 'pulse 2s infinite' }} />
        <div style={labelCss}>Activité en direct</div>
      </div>
      {loading ? (
        <div style={{ color: 'var(--ink-3)', fontStyle: 'italic', fontSize: 13 }}>Chargement…</div>
      ) : items.length === 0 ? (
        <div style={{ color: 'var(--ink-3)', fontStyle: 'italic', fontSize: 13 }}>Aucune activité récente.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto' }}>
          {items.map(ev => (
            <Link key={ev.id} to={ev.link || '#'} style={{
              display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 10, alignItems: 'center',
              padding: '10px 12px', borderRadius: 9, background: 'var(--surface-2)',
              textDecoration: 'none', color: 'var(--ink)', transition: 'background .1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-soft)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}>
              <span style={{ fontSize: 18 }}>{ev.icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.label}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>{ev.sub}</div>
              </div>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{relTime(ev.at)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────── Bloc : AI Insights (recommandations) ─────────── */
function AIInsightsBlock({ data }) {
  const insights = data?.insights?.length ? data.insights : [
    { type: 'info', title: 'Bienvenue sur votre atelier.', description: 'Les recommandations IA apparaîtront dès que les premières données seront consolidées.', tag: 'Info' },
  ];
  return (
    <div style={cardCss}>
      <div style={labelCss}>Recommandations IA</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        {insights.slice(0, 4).map((ins, i) => (
          <div key={i} style={{
            padding: 14, borderRadius: 10, background: 'var(--accent-soft)',
            borderLeft: '3px solid var(--accent)',
          }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
              {ins.tag || ins.type || 'Insight'}
            </div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{ins.title}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>{ins.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────── Bloc : Leads récents (liste cliquable) ───────── */
function RecentLeadsBlock() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get('/leads', { params: { page_size: 8, period: 'all' } })
      .then(r => { if (alive) setLeads(r.data?.items || []); })
      .catch(() => { if (alive) setLeads([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <div style={cardCss}>
      <div style={{ ...labelCss, marginBottom: 14 }}>Leads récents</div>
      {loading ? (
        <div style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>Chargement…</div>
      ) : leads.length === 0 ? (
        <div style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>Aucun lead pour l'instant.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leads.slice(0, 8).map(l => (
            <Link key={l.lead_id} to={`/leads/${l.lead_id}`} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)',
              textDecoration: 'none', color: 'var(--ink)',
            }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{l.name || '—'}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                  {l.service_type || '—'} · {l.status || 'nouveau'}
                </div>
              </div>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-3)' }}>{relTime(l.created_at)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────── BLOCK REGISTRY ──────────────────────────────── */
export const BLOCK_REGISTRY = {
  'cover': {
    component: CoverBlock,
    title: 'Cover · accueil personnalisé',
    description: 'Salutation contextuelle + synthèse du jour.',
    icon: '👋',
    defaultWidth: 12,
  },
  'quick-actions': {
    component: QuickActionsBlock,
    title: 'Actions rapides',
    description: '4 raccourcis : nouveau lead, devis, planning, carte.',
    icon: '⚡',
    defaultWidth: 12,
  },
  'hero-revenue': {
    component: HeroRevenueBlock,
    title: 'Chiffre d\'affaires',
    description: 'CA encaissé, en attente, en retard + sparkline.',
    icon: '💰',
    defaultWidth: 8,
  },
  'kpi-leads': {
    component: LeadsKpiBlock,
    title: 'Nouveaux leads',
    description: 'Compteur + progression vers l\'objectif mensuel.',
    icon: '🎯',
    defaultWidth: 4,
  },
  'pipeline': {
    component: PipelineBlock,
    title: 'Pipeline commercial',
    description: 'Entonnoir des étapes (Nouveau → Gagné) avec compteurs.',
    icon: '📊',
    defaultWidth: 12,
  },
  'activity-feed': {
    component: ActivityFeedBlock,
    title: 'Activité en direct',
    description: 'Flux temps réel des derniers événements du CRM.',
    icon: '🔴',
    defaultWidth: 6,
  },
  'ai-insights': {
    component: AIInsightsBlock,
    title: 'Recommandations IA',
    description: 'Suggestions d\'actions basées sur les données.',
    icon: '✦',
    defaultWidth: 6,
  },
  'recent-leads': {
    component: RecentLeadsBlock,
    title: 'Leads récents',
    description: 'Liste cliquable des 8 derniers leads.',
    icon: '🧑',
    defaultWidth: 6,
  },
};

export const DEFAULT_BLOCKS = [
  { id: 'cover',     type: 'cover',         w: 12 },
  { id: 'quickact',  type: 'quick-actions', w: 12 },
  { id: 'hero-rev',  type: 'hero-revenue',  w: 8  },
  { id: 'kpi-leads', type: 'kpi-leads',     w: 4  },
  { id: 'pipeline',  type: 'pipeline',      w: 12 },
  { id: 'activity',  type: 'activity-feed', w: 6  },
  { id: 'insights',  type: 'ai-insights',   w: 6  },
];
