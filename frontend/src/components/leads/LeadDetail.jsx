import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';

/**
 * LeadDetail — Fiche prospect artisanale niveau atelier.html
 *
 * Structure :
 *  - Breadcrumb + header éditorial (nom Fraunces + pastille température)
 *  - Hero 4 chiffres : score IA (hero) · budget · délai · engagement
 *  - Barre d'actions unifiée (8 CTA)
 *  - Panneau synthèse IA + action suggérée
 *  - Composer unifié (Email/SMS/Note/RDV)
 *  - Timeline chronologique multi-canaux
 *  - Colonne droite : Infos · Pipeline · Engagement · Mini-carte · Devis · Fichiers · Tags
 *
 * API attendue : GET /api/leads/:id → { lead, synthesis, timeline, quotes, files, engagement }
 * Fallbacks partout pour ne pas casser le build.
 */

const tokenStyle = `
  .ld-root {
    --bg: oklch(0.965 0.012 80);
    --surface: oklch(0.985 0.008 85);
    --surface-2: oklch(0.945 0.014 78);
    --ink: oklch(0.165 0.012 60);
    --ink-2: oklch(0.32 0.012 60);
    --ink-3: oklch(0.52 0.010 60);
    --ink-4: oklch(0.72 0.008 70);
    --line: oklch(0.85 0.012 75);
    --line-2: oklch(0.92 0.010 78);
    --accent: oklch(0.52 0.13 165);
    --accent-soft: oklch(0.93 0.05 165);
    --warm: oklch(0.62 0.14 45);
    --warm-soft: oklch(0.94 0.05 45);
    --gold: oklch(0.72 0.13 85);
    --gold-soft: oklch(0.95 0.05 85);
    --cool: oklch(0.60 0.10 220);
    --cool-soft: oklch(0.94 0.04 220);
  }
  .ld-root { background: var(--bg); min-height: 100vh; color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    font-feature-settings: "ss01", "cv11"; -webkit-font-smoothing: antialiased; }
  .ld-display { font-family: 'Fraunces', serif; font-weight: 400; letter-spacing: -0.02em; }
  .ld-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .ld-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--ink-3); font-weight: 500; }
  .ld-meta { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px;
    color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.06em; }
  .ld-cta-btn { transition: all .15s; }
  .ld-cta-btn:hover { background: var(--ink) !important; color: var(--bg) !important; border-color: var(--ink) !important; }
  .ld-tl-item { transition: background .1s; }
  .ld-panel-row:hover { background: var(--surface-2); }

  /* Responsive : mobile (≤ 768px) */
  @media (max-width: 768px) {
    .ld-root { font-size: 14px; }
    .ld-container { padding: 16px !important; }
    .ld-main-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
    .ld-hero-kpis { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
    .ld-hero-title { font-size: 32px !important; line-height: 1.05 !important; }
    .ld-cta-row { gap: 6px !important; padding: 10px 0 14px !important; }
    .ld-cta-btn { padding: 8px 12px !important; font-size: 10px !important; }
    .ld-brief-card { padding: 16px !important; }
    .ld-brief-sections { grid-template-columns: 1fr !important; gap: 12px !important; }
    .ld-breadcrumb { margin-bottom: 16px !important; font-size: 9px !important; flex-wrap: wrap !important; }
    .ld-panel { padding: 16px !important; margin-bottom: 14px !important; }
  }
`;

// ─────────────────────────────────────────────────────────────────
// PARSER — transforme les messages structurés du calculateur de devis
// (=== BLOCS ===, --- SECTIONS ---, Key: Value, • bullets) en objet
// hiérarchique pour affichage en cartes propres.
// ─────────────────────────────────────────────────────────────────
function parseStructuredMessage(text) {
  if (!text || typeof text !== 'string') return null;
  // Détection rapide : si pas de marqueur ===/--- on ne tente pas
  if (!/^[=\-]{2,}/m.test(text)) return null;

  const raw = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const result = { header: null, date: null, sections: [] };
  let section = null, subsection = null;

  for (const line of raw) {
    let m;
    if ((m = line.match(/^={2,}\s*(.+?)\s*={2,}$/))) {
      result.header = m[1];
      continue;
    }
    if ((m = line.match(/^-{3,}\s*(.+?)\s*-{3,}$/))) {
      section = { title: m[1], items: [] };
      subsection = null;
      result.sections.push(section);
      continue;
    }
    if ((m = line.match(/^-{2}\s*([^-].*?)\s*-{2}$/))) {
      subsection = { type: 'sub', title: m[1], items: [] };
      if (section) section.items.push(subsection);
      continue;
    }
    if ((m = line.match(/^[•·*]\s+(.+)$/))) {
      const target = subsection || section;
      if (target) target.items.push({ type: 'bullet', text: m[1] });
      continue;
    }
    if ((m = line.match(/^([^:]{1,40}):\s*(.*)$/))) {
      const key = m[1].trim();
      const value = m[2].trim();
      if (key.toLowerCase() === 'date' && !result.date) { result.date = value; continue; }
      const target = subsection || section;
      if (target) { target.items.push({ type: 'kv', key, value: value || '—' }); continue; }
    }
    // ligne texte brut
    const target = subsection || section;
    if (target) target.items.push({ type: 'text', text: line });
  }

  return result.sections.length ? result : null;
}

// Génère un résumé court lisible depuis le parsing (pour la synthèse IA)
function buildBriefSummary(parsed) {
  if (!parsed) return null;
  let total, surface, freq, service, address;
  const walk = (items) => items.forEach(it => {
    if (it.type === 'kv') {
      const k = it.key.toLowerCase();
      if (!total   && /(total|prix estim|prix\/j)/i.test(k)) total   = it.value;
      if (!surface && /surface/i.test(k))                     surface = it.value;
      if (!freq    && /frequence|fréquence/i.test(k))          freq    = it.value;
      if (!address && /adresse/i.test(k))                      address = it.value;
    }
    if (it.type === 'bullet' && !service) service = it.text.split(':')[0].trim();
    if (it.items) walk(it.items);
  });
  parsed.sections.forEach(s => walk(s.items));
  return [service, surface, freq, total ? `total ${total}` : null].filter(Boolean).join(' · ');
}

// Iconographie selon le titre de la section (fallback : point)
const SECTION_ICONS = {
  services:     '🧽',
  calcul:       '🧮',
  intervention: '📍',
  client:       '👤',
};

function StructuredBrief({ parsed }) {
  if (!parsed) return null;

  const renderItem = (it, i) => {
    if (it.type === 'bullet') {
      return (
        <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 13, color: 'var(--ink-2)' }}>
          <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
          <span style={{ flex: 1, lineHeight: 1.5 }}>{it.text}</span>
        </div>
      );
    }
    if (it.type === 'kv') {
      return (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12,
          padding: '6px 0', borderBottom: '1px dashed var(--line-2)', alignItems: 'baseline',
        }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500 }}>
            {it.key}
          </span>
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.4 }}>
            {it.value}
          </span>
        </div>
      );
    }
    if (it.type === 'sub') {
      return (
        <div key={i} style={{
          marginTop: 14, paddingTop: 10, paddingLeft: 12,
          borderLeft: '2px solid var(--accent)', marginLeft: 2,
        }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 13, color: 'var(--accent)', fontWeight: 500, marginBottom: 6 }}>
            {it.title}
          </div>
          <div>{it.items.map(renderItem)}</div>
        </div>
      );
    }
    return (
      <div key={i} style={{ padding: '6px 0', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
        {it.text}
      </div>
    );
  };

  return (
    <div className="ld-brief-card" style={{
      background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16,
      padding: 24, marginBottom: 32,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--line-2)', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500, marginBottom: 4 }}>
            Brief initial
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em', color: 'var(--ink)' }}>
            {parsed.header || 'Demande de devis'}
          </div>
        </div>
        {parsed.date && (
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-3)', textAlign: 'right' }}>
            Reçue le<br/>
            <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{parsed.date}</span>
          </div>
        )}
      </div>

      <div className="ld-brief-sections" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
        {parsed.sections.map((sec, i) => {
          const ico = SECTION_ICONS[sec.title.toLowerCase()] || '○';
          return (
            <div key={i} style={{
              background: 'var(--surface-2)', borderRadius: 12, padding: 16,
              border: '1px solid var(--line-2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: 16 }}>{ico}</span>
                <span style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
                  {sec.title}
                </span>
              </div>
              <div>{sec.items.map(renderItem)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STAGES = [
  { key: 'nouveau',       label: 'Nouveau' },
  { key: 'contacté',      label: 'Contacté' },
  { key: 'en_attente',    label: 'Qualifié' },
  { key: 'devis_envoyé',  label: 'Devis envoyé' },
  { key: 'gagné',         label: 'Gagné' },
];

const TL_TYPES = {
  call:   { tag: 'Appel',  dotColor: 'var(--cool)',   tagBg: 'var(--cool-soft)',   tagFg: 'var(--cool)'   },
  email:  { tag: 'Email',  dotColor: 'var(--accent)',  tagBg: 'var(--accent-soft)', tagFg: 'var(--accent)' },
  sms:    { tag: 'SMS',    dotColor: 'var(--gold)',    tagBg: 'var(--gold-soft)',   tagFg: 'oklch(0.55 0.15 85)' },
  rdv:    { tag: 'RDV',    dotColor: 'var(--warm)',    tagBg: 'var(--warm-soft)',   tagFg: 'var(--warm)'   },
  note:   { tag: 'Note',   dotColor: 'var(--ink-4)',   tagBg: 'var(--surface-2)',   tagFg: 'var(--ink-2)'  },
  quote:  { tag: 'Devis',  dotColor: 'var(--ink-2)',   tagBg: 'var(--ink)',         tagFg: 'var(--bg)'     },
  status: { tag: 'Statut', dotColor: 'var(--accent)',  tagBg: 'var(--accent)',      tagFg: 'var(--bg)'     },
};

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }
  catch { return '—'; }
};

const fmtTime = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
};

const fmtMoney = (v) => {
  if (v == null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
};

// ————————————————————————————————————————————————
// SECTION HEADER
// ————————————————————————————————————————————————
function SectionHeader({ num, title, em, annot }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 16,
      paddingBottom: 12, borderBottom: '1px solid var(--line-2)',
      marginBottom: 20, marginTop: 40
    }}>
      <span className="ld-mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-3)', fontWeight: 600 }}>{num}</span>
      <h2 className="ld-display" style={{ fontWeight: 400, fontSize: 24, lineHeight: 1, letterSpacing: '-0.02em', margin: 0, color: 'var(--ink)' }}>
        {title}{em && <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--ink-3)', fontSize: 18 }}> — {em}</em>}
      </h2>
      {annot && <span className="ld-mono" style={{ marginLeft: 'auto', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{annot}</span>}
    </div>
  );
}

// ————————————————————————————————————————————————
// PANEL
// ————————————————————————————————————————————————
function Panel({ title, em, action, children }) {
  return (
    <div className="ld-panel" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22, padding: 24, marginBottom: 18 }}>
      <h3 className="ld-display" style={{
        fontWeight: 500, fontSize: 17, color: 'var(--ink)', letterSpacing: '-0.015em',
        margin: '0 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <span>{title}{em && <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--ink-3)', fontSize: 14, marginLeft: 4 }}>{em}</em>}</span>
        {action && <span className="ld-mono" style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', cursor: 'pointer' }}>{action}</span>}
      </h3>
      {children}
    </div>
  );
}

// ————————————————————————————————————————————————
// LEAD HEADER
// ————————————————————————————————————————————————
function LeadHeader({ lead }) {
  const temp = lead?.temperature || 'hot';
  const score = lead?.aiScore ?? 94;
  const tempMap = {
    hot:  { bg: 'var(--warm-soft)',  fg: 'var(--warm)',  label: 'Chaud' },
    warm: { bg: 'var(--gold-soft)',  fg: 'oklch(0.55 0.15 85)', label: 'Tiède' },
    cold: { bg: 'var(--cool-soft)',  fg: 'var(--cool)',  label: 'Froid' },
  };
  const t = tempMap[temp] || tempMap.hot;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', paddingBottom: 28, borderBottom: '1px solid var(--line)', marginBottom: 0 }}>
      <div className="ld-mono" style={{
        fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)',
        marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12
      }}>
        <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{lead?.code || 'L-—'}</span>
        <span style={{ width: 4, height: 4, background: 'var(--accent)', borderRadius: 999 }} />
        <span>Créé le {fmtDate(lead?.createdAt)}</span>
        <span style={{ width: 4, height: 4, background: 'var(--accent)', borderRadius: 999 }} />
        <span>Source · {lead?.source || '—'}</span>
      </div>
      <h1 className="ld-display" style={{
        fontWeight: 300, fontSize: 72, lineHeight: 0.92, letterSpacing: '-0.035em',
        margin: '0 0 12px', color: 'var(--ink)', display: 'flex', alignItems: 'baseline', gap: 18, flexWrap: 'wrap'
      }}>
        <span>{lead?.firstName || 'Prospect'}</span>
        <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--accent)' }}>{lead?.lastName || ''}</em>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 600,
          padding: '6px 14px', borderRadius: 999, alignSelf: 'center',
          background: t.bg, color: t.fg
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }} />
          {t.label} · {score}%
        </span>
      </h1>
      <div className="ld-display" style={{ fontStyle: 'italic', fontSize: 17, color: 'var(--ink-3)', lineHeight: 1.5 }}>
        {lead?.summary || 'Dossier en cours — cliquez pour enrichir.'}
      </div>
    </div>
  );
}

// ————————————————————————————————————————————————
// HERO KPIs (4 cellules)
// ————————————————————————————————————————————————
function HeroKPIs({ lead }) {
  const cells = [
    {
      label: 'Score IA de conversion',
      value: <><em style={{ fontStyle: 'normal', color: 'var(--accent)', fontWeight: 400 }}>{lead?.aiScore ?? 94}</em><span style={{ fontSize: 36, color: 'var(--ink-3)' }}>%</span></>,
      size: 88,
      sub: `↑ +${lead?.aiScoreDelta ?? 8}pts · Très forte probabilité`,
      subColor: 'var(--accent)',
      span: true,
    },
    {
      label: 'Budget estimé',
      value: <>{Math.round((lead?.budget ?? 42000) / 1000)}<span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--ink-3)', marginLeft: 4 }}>k€</span></>,
      size: 44,
      sub: lead?.budgetNote || 'Confirmé',
      subColor: 'var(--ink-3)',
    },
    {
      label: 'Délai visé',
      value: <>{'< '}{lead?.deadlineDays ?? 15}<span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--ink-3)', marginLeft: 4 }}>jours</span></>,
      size: 44,
      sub: '▲ Décision imminente',
      subColor: 'var(--warm)',
    },
    {
      label: 'Engagement',
      value: <>{lead?.engagementScore ?? 92}<span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--ink-3)', marginLeft: 4 }}>/100</span></>,
      size: 44,
      sub: 'Réponse ~2h · ouvre 100%',
      subColor: 'var(--accent)',
    },
  ];

  return (
    <div className="ld-hero-kpis" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', borderBottom: '1px solid var(--line)' }}>
      {cells.map((c, i) => (
        <div key={i} style={{ padding: '32px 32px 28px', borderRight: i < 3 ? '1px solid var(--line-2)' : 0 }}>
          <span className="ld-label" style={{ display: 'block', marginBottom: 14 }}>{c.label}</span>
          <div className="ld-display" style={{
            fontWeight: 300, fontSize: c.size, lineHeight: 0.95, letterSpacing: '-0.03em',
            color: 'var(--ink)', fontFeatureSettings: '"tnum"'
          }}>{c.value}</div>
          <div className="ld-mono" style={{ marginTop: 10, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.subColor }}>
            {c.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

// ————————————————————————————————————————————————
// CTA ROW
// ————————————————————————————————————————————————
function CtaRow({ onAction }) {
  const base = {
    fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.1em',
    textTransform: 'uppercase', padding: '10px 18px', borderRadius: 999,
    fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8,
    cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--surface)',
    color: 'var(--ink-2)'
  };
  const primary = { ...base, background: 'var(--ink)', color: 'var(--bg)', borderColor: 'var(--ink)' };
  const ai = { ...base, background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent)' };

  return (
    <div className="ld-cta-row" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '16px 0 18px', borderBottom: '1px solid var(--line-2)', marginBottom: 32, flexWrap: 'wrap' }}>
      <button className="ld-cta-btn" onClick={() => onAction?.('call')} style={primary}>✆ Appeler</button>
      <button className="ld-cta-btn" onClick={() => onAction?.('email')} style={base}>✉ Email</button>
      <button className="ld-cta-btn" onClick={() => onAction?.('sms')} style={base}>💬 SMS</button>
      <button className="ld-cta-btn" onClick={() => onAction?.('rdv')} style={base}>📅 RDV</button>
      <button className="ld-cta-btn" onClick={() => onAction?.('note')} style={base}>📝 Note</button>
      <button className="ld-cta-btn" onClick={() => onAction?.('quote')} style={base}>📄 Convertir en devis</button>
      <button className="ld-cta-btn" onClick={() => onAction?.('ai')} style={ai}>✦ Suggérer action</button>
      <span style={{ flex: 1 }} />
      <button className="ld-cta-btn" onClick={() => onAction?.('transfer')} style={base}>→ Transférer</button>
    </div>
  );
}

// ————————————————————————————————————————————————
// AI SYNTHESIS PANEL
// ————————————————————————————————————————————————
function AISynthesisPanel({ synthesis, onRunAction }) {
  return (
    <div style={{
      background: 'var(--bg)', border: '1px dashed var(--accent)', borderRadius: 22,
      padding: 28, position: 'relative', marginBottom: 32
    }}>
      <span style={{ position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 999, background: 'var(--accent)', boxShadow: '0 0 0 4px var(--accent-soft)' }} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em',
          textTransform: 'uppercase', background: 'var(--accent-soft)', color: 'var(--accent)',
          padding: '3px 10px', borderRadius: 999, fontWeight: 600
        }}>✦ Synthèse IA</span>
        <span className="ld-display" style={{ fontWeight: 500, fontSize: 18, color: 'var(--ink)', letterSpacing: '-0.015em' }}>
          <em style={{ fontStyle: 'italic', color: 'var(--accent)', fontWeight: 400 }}>Lecture</em> rapide du dossier
        </span>
      </div>
      <div
        className="ld-display"
        style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--ink-2)', letterSpacing: '-0.005em' }}
        dangerouslySetInnerHTML={{ __html: synthesis?.summary || 'Synthèse en cours de génération…' }}
      />
      {synthesis?.nextAction && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="ld-mono" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500, whiteSpace: 'nowrap' }}>Prochaine action</span>
          <span className="ld-display" style={{ fontWeight: 500, fontSize: 15, color: 'var(--ink)', letterSpacing: '-0.01em', flex: 1 }}>
            {synthesis.nextAction.text}
          </span>
          <button
            onClick={() => onRunAction?.(synthesis.nextAction)}
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em',
              textTransform: 'uppercase', background: 'var(--ink)', color: 'var(--bg)',
              border: 0, padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontWeight: 500
            }}
          >Lancer →</button>
        </div>
      )}
    </div>
  );
}

// ————————————————————————————————————————————————
// COMPOSER
// ————————————————————————————————————————————————
function Composer({ lead, channel, setChannel, onSend }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const channels = [
    { key: 'email', label: 'Email', icon: '✉' },
    { key: 'sms',   label: 'SMS',   icon: '💬' },
    { key: 'note',  label: 'Note',  icon: '📝' },
    { key: 'rdv',   label: 'RDV',   icon: '📅' },
  ];

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 22, padding: 24, marginBottom: 24 }}>
      <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--surface-2)', borderRadius: 999, marginBottom: 16, width: 'fit-content' }}>
        {channels.map(c => (
          <button key={c.key} onClick={() => setChannel(c.key)} style={{
            border: 0, cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em',
            textTransform: 'uppercase', padding: '7px 14px', borderRadius: 999, fontWeight: 500,
            background: channel === c.key ? 'var(--ink)' : 'transparent',
            color: channel === c.key ? 'var(--bg)' : 'var(--ink-3)',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <span>{c.icon}</span>{c.label}
          </button>
        ))}
      </div>

      {channel !== 'note' && (
        <div className="ld-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 10 }}>
          À : <strong style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{lead?.firstName} {lead?.lastName}</strong>
          {channel === 'email' && lead?.email && <> &lt;{lead.email}&gt;</>}
          {channel === 'sms' && lead?.phone && <> · {lead.phone}</>}
        </div>
      )}

      {channel === 'email' && (
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Objet de l'email…"
          style={{
            width: '100%', border: 0, borderBottom: '1px solid var(--line-2)',
            background: 'transparent', padding: '8px 0', marginBottom: 10,
            fontFamily: 'Fraunces, serif', fontWeight: 500, fontSize: 17,
            color: 'var(--ink)', letterSpacing: '-0.01em', outline: 0
          }}
        />
      )}

      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder={channel === 'note' ? 'Note interne, non visible par le client…' : 'Votre message…'}
        style={{
          width: '100%', minHeight: 120, border: 0, background: 'transparent',
          padding: '8px 0', fontSize: 14, color: 'var(--ink-2)', outline: 0,
          resize: 'vertical', lineHeight: 1.6, fontFamily: 'Inter, sans-serif'
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 14, borderTop: '1px solid var(--line-2)', marginTop: 12 }}>
        <button style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em',
          textTransform: 'uppercase', padding: '6px 12px',
          background: 'var(--accent-soft)', color: 'var(--accent)',
          borderRadius: 999, fontWeight: 600, cursor: 'pointer', border: 0
        }}>✦ Reformuler IA</button>
        <button style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em',
          textTransform: 'uppercase', padding: '6px 12px',
          background: 'var(--accent-soft)', color: 'var(--accent)',
          borderRadius: 999, fontWeight: 600, cursor: 'pointer', border: 0
        }}>✦ Ton pro</button>
        <button
          onClick={() => onSend?.({ channel, subject, body })}
          style={{
            marginLeft: 'auto', background: 'var(--ink)', color: 'var(--bg)', border: 0,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.12em',
            textTransform: 'uppercase', padding: '9px 18px', borderRadius: 999,
            cursor: 'pointer', fontWeight: 500
          }}
        >{channel === 'note' ? 'Enregistrer →' : 'Envoyer →'}</button>
      </div>
    </div>
  );
}

// ————————————————————————————————————————————————
// TIMELINE
// ————————————————————————————————————————————————
function TimelineItem({ item }) {
  const style = TL_TYPES[item.type] || TL_TYPES.note;
  return (
    <div style={{ position: 'relative', paddingLeft: 28, paddingTop: 14, paddingBottom: 14, marginBottom: 4 }}>
      <span style={{
        position: 'absolute', left: -5, top: 20, width: 9, height: 9,
        borderRadius: 999, background: style.dotColor,
        boxShadow: item.type === 'status' ? '0 0 0 3px var(--accent-soft)' : 'none'
      }} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 600, padding: '2px 8px', borderRadius: 3,
          background: style.tagBg, color: style.tagFg
        }}>{style.tag}</span>
        <span className="ld-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{fmtTime(item.at)}</span>
        {item.by && <span className="ld-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 'auto' }}>— {item.by}</span>}
      </div>
      {item.title && (
        <div className="ld-display" style={{ fontWeight: 500, fontSize: 15, color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
          {item.title}
          {item.duration && (
            <span style={{
              display: 'inline-block', padding: '1px 7px', background: 'var(--surface-2)',
              borderRadius: 3, fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
              color: 'var(--ink-3)', marginLeft: 6
            }}>{item.duration}</span>
          )}
        </div>
      )}
      {item.body && (
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginTop: 4 }}
             dangerouslySetInnerHTML={{ __html: item.body }} />
      )}
      {item.attachments?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {item.attachments.map((a, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', background: 'var(--bg)',
              border: '1px solid var(--line-2)', borderRadius: 999,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--ink-2)'
            }}>
              {a.icon || '📄'} {a.name}{a.size && ` · ${a.size}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Timeline({ groups }) {
  return (
    <div style={{ paddingLeft: 8, borderLeft: '1px solid var(--line-2)', marginLeft: 12, position: 'relative' }}>
      {groups.map((grp, i) => (
        <div key={i}>
          <div className="ld-mono" style={{
            fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'var(--ink-3)', fontWeight: 600, margin: '20px 0 14px',
            position: 'relative', paddingLeft: 20
          }}>
            <span style={{
              position: 'absolute', left: -5, top: 3, width: 9, height: 9,
              background: 'var(--bg)', border: '1px solid var(--ink-3)', borderRadius: 999
            }} />
            {grp.label}
          </div>
          {grp.items.map((it, j) => <TimelineItem key={j} item={it} />)}
        </div>
      ))}
    </div>
  );
}

// ————————————————————————————————————————————————
// PIPELINE STEPPER
// ————————————————————————————————————————————————
function Stepper({ currentStage, history = {}, onChange }) {
  const currentIdx = STAGES.findIndex(s => s.key === currentStage);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: 16 }}>
      <span style={{ position: 'absolute', left: 5, top: 12, bottom: 12, width: 1, background: 'var(--line-2)' }} />
      {STAGES.map((s, i) => {
        const done = currentIdx > i;
        const current = s.key === currentStage;
        const date = history[s.key];
        return (
          <div key={s.key} onClick={() => onChange?.(s.key)}
               title={`Passer l'étape à « ${s.label} »`}
               style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '10px 0', position: 'relative', cursor: onChange ? 'pointer' : 'default', borderRadius: 6, transition: 'background 0.1s' }}
               onMouseEnter={e => { if (onChange) e.currentTarget.style.background = 'var(--surface-2)'; }}
               onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <span style={{
              position: 'absolute', left: -18, top: 14, width: 11, height: 11, borderRadius: 999,
              background: done ? 'var(--accent)' : 'var(--bg)',
              border: done ? '1.5px solid var(--accent)' : current ? '2px solid var(--ink)' : '1.5px solid var(--line)',
              boxShadow: current ? '0 0 0 3px var(--accent-soft)' : 'none'
            }} />
            <span className="ld-display" style={{
              fontWeight: current ? 600 : 500, fontSize: 14, letterSpacing: '-0.01em', flex: 1,
              color: done ? 'var(--ink-2)' : current ? 'var(--ink)' : 'var(--ink-3)'
            }}>{s.label}</span>
            <span className="ld-mono" style={{
              fontSize: 10, color: done ? 'var(--accent)' : 'var(--ink-3)', fontWeight: done ? 500 : 400
            }}>
              {done && '✓ '}{date || (current ? 'En cours' : '—')}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ————————————————————————————————————————————————
// MINI MAP
// ————————————————————————————————————————————————
function MiniMap({ lead }) {
  return (
    <div style={{ position: 'relative', height: 180, background: 'var(--surface-2)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
      <svg width="100%" height="100%" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">
        <path d="M20 90 Q80 40 160 50 Q240 60 300 110 Q270 160 180 150 Q90 145 20 90 Z"
              fill="oklch(0.93 0.018 78)" stroke="oklch(0.80 0.012 75)" strokeWidth="1"/>
        <path d="M0 140 Q100 120 200 130 Q280 135 320 120"
              stroke="oklch(0.78 0.06 220)" strokeWidth="4" fill="none" opacity="0.4" strokeLinecap="round"/>
        <g stroke="oklch(0.85 0.010 75)" strokeWidth="0.8" fill="none" opacity="0.7">
          <line x1="60" y1="60" x2="240" y2="110"/>
          <line x1="100" y1="45" x2="160" y2="150"/>
          <line x1="180" y1="55" x2="220" y2="145"/>
        </g>
        <circle cx="100" cy="85" r="4" fill="var(--accent)" opacity="0.5"/>
        <circle cx="220" cy="100" r="4" fill="var(--accent)" opacity="0.5"/>
        <circle cx="180" cy="120" r="4" fill="var(--accent)" opacity="0.5"/>
        <circle cx="150" cy="90" r="18" fill="var(--warm)" opacity="0.15"/>
        <circle cx="150" cy="90" r="11" fill="var(--warm)" opacity="0.5"/>
        <circle cx="150" cy="90" r="6" fill="var(--warm)"/>
        <text x="150" y="70" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="var(--ink)" textAnchor="middle" fontWeight="600">
          {lead?.addressShort || lead?.address || 'Adresse'}
        </text>
      </svg>
    </div>
  );
}

// ————————————————————————————————————————————————
// ENGAGEMENT GRID
// ————————————————————————————————————————————————
function EngagementGrid({ engagement = {} }) {
  const cells = [
    { k: 'Ouvertures email', v: `${engagement.opens ?? 7}/${engagement.opensTotal ?? 7}`, s: '100% · Excellent', sc: 'var(--accent)' },
    { k: 'Temps réponse moy.', v: `${engagement.responseHours ?? 2}h`, s: 'Très réactive', sc: 'var(--accent)' },
    { k: 'Clics devis', v: engagement.clicks ?? 12, s: `Consulté ${engagement.quoteViews ?? 4} fois`, sc: 'var(--accent)' },
    { k: 'RDV respectés', v: `${engagement.meetingsHonored ?? 1}/${engagement.meetingsTotal ?? 1}`, s: 'À l\'heure', sc: 'var(--accent)' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {cells.map((c, i) => (
        <div key={i} style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 12 }}>
          <div className="ld-mono" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500, marginBottom: 6 }}>{c.k}</div>
          <div className="ld-display" style={{ fontWeight: 500, fontSize: 24, color: 'var(--ink)', letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"' }}>{c.v}</div>
          <div className="ld-mono" style={{ fontSize: 10, color: c.sc, marginTop: 3 }}>{c.s}</div>
        </div>
      ))}
    </div>
  );
}

// ————————————————————————————————————————————————
// DISTANCE STATS — calcule le trajet réel (voiture) depuis le siège GCH
function DistanceStats({ leadId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    api.get(`/leads/${leadId}/distance`)
      .then(r => { if (alive) setData(r.data); })
      .catch(e => { if (alive) setError(e?.message || 'Erreur'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [leadId]);

  const Cell = ({ k, v, note }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span className="ld-mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</span>
      <span className="ld-display" style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{v}</span>
      {note && <span className="ld-mono" style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 2 }}>{note}</span>}
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: 14, fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 12 }}>
        Calcul du trajet routier…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
        Trajet indisponible {error ? `(${error})` : ''}. L'adresse du lead est peut-être incomplète.
      </div>
    );
  }

  const { distance_km, duration_min, method, origin, geocoding_method } = data;
  const gmapsHref = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(data.destination || '')}&travelmode=driving`;
  const isApproximate = geocoding_method === 'approximate';

  return (
    <>
      <div style={{ display: 'flex', gap: 14 }}>
        <Cell k="Distance" v={`${distance_km} km`} note={method === 'osrm' ? 'Trajet voiture' : 'Vol d\'oiseau × 1.3'} />
        <Cell k="Durée" v={`${duration_min} min`} note="Estimation" />
        <Cell k="Départ" v="Saint-Thibault" note="77400" />
      </div>
      {isApproximate && (
        <div style={{
          marginTop: 10, padding: '8px 12px', borderRadius: 8,
          background: 'var(--gold-soft, rgba(251, 191, 36, 0.15))', fontSize: 11, color: 'var(--ink-2)',
          border: '1px solid var(--gold, oklch(0.72 0.13 85))',
        }}>
          ⓘ Adresse exacte non trouvée. Distance estimée depuis la ville (code postal).
        </div>
      )}
      <a href={gmapsHref} target="_blank" rel="noopener noreferrer" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        marginTop: 12, padding: '7px 12px', borderRadius: 999,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
        background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent)',
        textDecoration: 'none', fontWeight: 600,
      }}>
        Itinéraire Google Maps →
      </a>
    </>
  );
}

// MAIN COMPONENT
// ————————————————————————————————————————————————
const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [channel, setChannel] = useState('email');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError(false);
    Promise.all([
      api.get(`/leads/${id}`),
      api.get('/interactions', { params: { lead_id: id } }).catch(() => ({ data: [] })),
      api.get('/quotes', { params: { lead_id: id, page_size: 20 } }).catch(() => ({ data: [] })),
    ]).then(([leadR, intR, quotesR]) => {
      if (!alive) return;
      const raw = leadR.data;
      if (!raw || !raw.lead_id) { setLoadError(true); return; }

      const nameParts = (raw.name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const score = raw.score ?? 50;
      const temperature = score >= 75 ? 'hot' : score >= 45 ? 'warm' : 'cold';

      // Parse le message structuré si format reconnu (=== / --- / Key: Value)
      const parsedBrief = parseStructuredMessage(raw.message);
      const briefSummary = buildBriefSummary(parsedBrief);

      const lead = {
        code: raw.lead_id,
        firstName,
        lastName,
        parsedBrief,
        summary: briefSummary || raw.message || `${raw.service_type}${raw.address ? ' — ' + raw.address : ''}`,
        temperature,
        aiScore: score,
        aiScoreDelta: 0,
        budget: null,
        budgetNote: null,
        deadlineDays: null,
        engagementScore: score,
        source: raw.source || '—',
        createdAt: raw.created_at,
        email: raw.email,
        phone: raw.phone,
        address: raw.address || '',
        addressShort: raw.address ? raw.address.split(',').slice(0, 2).join(',').trim() : '',
        currentStage: raw.status || 'nouveau',
        stageHistory: {},
        tags: raw.tags || [],
        service_type: raw.service_type,
      };

      const interactions = Array.isArray(intR.data) ? intR.data : (intR.data?.items || []);
      const groupedByDay = {};
      interactions.forEach(int => {
        const date = new Date(int.created_at);
        const dayKey = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        if (!groupedByDay[dayKey]) groupedByDay[dayKey] = { label: dayKey, items: [] };
        groupedByDay[dayKey].items.push({
          type: int.type || 'note',
          at: int.created_at,
          by: int.created_by || 'Système',
          body: int.content || '',
          title: int.subject || null,
        });
      });
      const timeline = Object.values(groupedByDay);

      const rawQuotes = Array.isArray(quotesR.data) ? quotesR.data : (quotesR.data?.items || []);
      const STATUS_Q = { 'accepté': 'accepted', 'envoyé': 'pending', 'brouillon': 'draft', 'refusé': 'draft' };
      const quotes = rawQuotes.map(q => ({
        ref: q.quote_number || (q.quote_id || '').slice(-8).toUpperCase() || '—',
        date: q.created_at ? new Date(q.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—',
        title: q.title || q.service_type || '—',
        amount: q.amount || 0,
        status: STATUS_Q[q.status] || 'draft',
      }));

      // Synthèse courte et lisible — utilise le brief structuré si dispo,
      // sinon le message brut tronqué, sinon une synthèse générée.
      const synthesisText = briefSummary
        ? `${firstName} ${lastName} — ${briefSummary}. <em>Source ${raw.source || 'inconnue'}</em>. Score IA <strong>${score}/100</strong>.`
        : raw.message
          ? `${firstName} ${lastName} — ${raw.service_type}. ${raw.message.length > 200 ? raw.message.slice(0, 200) + '…' : raw.message}`
          : `${firstName} ${lastName} est un prospect ${raw.service_type} (${raw.source || 'source inconnue'}). Score IA : ${score}/100. Statut : ${raw.status}.`;

      const synthesis = {
        summary: synthesisText,
        nextAction: {
          text: score >= 70
            ? `Relancer ${firstName} pour valider le devis et confirmer le démarrage.`
            : `Qualifier ${firstName} — appel de découverte recommandé.`,
          type: 'call',
        },
      };

      const engagement = {
        opens: interactions.filter(i => i.type === 'email').length,
        opensTotal: interactions.filter(i => i.type === 'email').length || 1,
        responseHours: 24,
        clicks: interactions.length,
        quoteViews: quotes.length,
        meetingsHonored: interactions.filter(i => i.type === 'rdv').length,
        meetingsTotal: Math.max(interactions.filter(i => i.type === 'rdv').length, 1),
      };

      setData({ lead, synthesis, timeline, quotes, engagement });
    }).catch(() => {
      if (alive) setLoadError(true);
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, [id, retryCount]);

  const lead = data?.lead;
  const synthesis = data?.synthesis;
  const timeline = data?.timeline || [];
  const quotes = data?.quotes || [];
  const engagement = data?.engagement || { opens: 0, opensTotal: 1, responseHours: 0, clicks: 0, quoteViews: 0, meetingsHonored: 0, meetingsTotal: 1 };

  const handleAction = (type) => {
    if (['email', 'sms', 'note', 'rdv'].includes(type)) setChannel(type);
    if (type === 'quote') navigate(`/quotes/new?leadId=${id}`);
    if (type === 'call') {
      if (!lead?.phone) {
        window.alert('Aucun téléphone renseigné pour ce lead.');
        return;
      }
      // Déclenche l'appel (mobile) ou le gestionnaire d'appel par défaut (desktop)
      window.location.href = `tel:${lead.phone.replace(/\s/g, '')}`;
      // Log automatique de l'appel comme interaction (trace dans la timeline)
      api.post('/interactions', {
        lead_id: id,
        type: 'appel',
        content: `Appel sortant déclenché vers ${lead.phone}`,
      }).then(() => setRetryCount(c => c + 1)).catch(() => {});
    }
    if (type === 'transfer') {
      const email = window.prompt('Email du collaborateur à qui transférer ce lead :');
      if (!email) return;
      api.patch(`/leads/${id}`, { notes: `Transféré à ${email} le ${new Date().toLocaleDateString('fr-FR')}` })
        .then(() => { setRetryCount(c => c + 1); })
        .catch(e => window.alert(`Erreur : ${e?.message || 'impossible de transférer'}`));
    }
    if (type === 'ai') {
      const score = lead?.aiScore ?? 50;
      const nextStageMap = {
        'nouveau': 'Contacté — premier appel',
        'contacté': 'Qualifié — envoyer un devis',
        'en_attente': 'Devis — relancer pour signature',
        'devis_envoyé': 'Gagné — confirmer le démarrage',
        'gagné': 'Chantier — créer les factures d\'acompte',
      };
      const nextStep = nextStageMap[lead?.currentStage] || 'Continuer la qualification';
      const suggestion = [
        `Score IA : ${score}/100 (${score >= 70 ? 'chaud' : score >= 45 ? 'tiède' : 'froid'})`,
        `Statut actuel : ${lead?.currentStage}`,
        `Prochaine action conseillée : ${nextStep}`,
        score >= 70
          ? `→ Appelez ${lead?.firstName || ''} aujourd\'hui, le score est haut.`
          : `→ Envoyez un email de découverte pour qualifier le besoin.`,
      ].join('\n\n');
      window.alert(suggestion);
    }
  };

  const handleStageChange = (newStage) => {
    if (!newStage || newStage === lead?.currentStage) return;
    const labelMap = STAGES.reduce((m, s) => ({ ...m, [s.key]: s.label }), {});
    if (!window.confirm(`Passer ce lead au statut « ${labelMap[newStage] || newStage} » ?`)) return;
    api.patch(`/leads/${id}`, { status: newStage })
      .then(() => setRetryCount(c => c + 1))
      .catch(e => window.alert(`Erreur : ${e?.message || 'impossible de changer le statut'}`));
  };

  const handleSend = ({ channel: ch, subject, body }) => {
    api.post('/interactions', { lead_id: id, type: ch, content: [subject, body].filter(Boolean).join('\n') })
      .then(() => setRetryCount(c => c + 1))
      .catch(e => console.error(e));
  };

  if (loading && !data) {
    return (
      <div className="ld-root" style={{ padding: '56px 56px 120px', maxWidth: 1520, margin: '0 auto' }}>
        <style>{tokenStyle}</style>
        <div className="ld-display" style={{ fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 17 }}>
          Chargement du dossier…
        </div>
      </div>
    );
  }

  if (loadError || !lead) {
    return (
      <div className="ld-root" style={{ padding: '56px 56px 120px', maxWidth: 1520, margin: '0 auto' }}>
        <style>{tokenStyle}</style>
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 14, padding: 32, textAlign: 'center' }}>
          <div className="ld-display" style={{ fontSize: 18, color: 'var(--ink-2)', marginBottom: 12 }}>
            Impossible de charger ce lead.
          </div>
          <button
            onClick={() => { setData(null); setLoadError(false); setLoading(true); setRetryCount(c => c + 1); }}
            style={{ padding: '9px 22px', borderRadius: 9, background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ld-root">
      <style>{tokenStyle}</style>
      <div className="ld-container" style={{ padding: '40px 56px 120px', maxWidth: 1520, margin: '0 auto' }}>

        {/* BREADCRUMB */}
        <div className="ld-mono ld-breadcrumb" style={{
          fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--ink-3)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10
        }}>
          <Link to="/leads" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Leads</Link>
          <span style={{ opacity: 0.5 }}>/</span>
          <Link to="/leads" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>
            {lead?.address?.split(' ').slice(-2).join(' ') || 'Paris'}
          </Link>
          <span style={{ opacity: 0.5 }}>/</span>
          <span style={{ color: 'var(--ink)' }}>{lead?.firstName} {lead?.lastName}</span>
        </div>

        {/* HEADER */}
        <LeadHeader lead={lead} />

        {/* HERO */}
        <HeroKPIs lead={lead} />

        {/* CTA ROW */}
        <CtaRow onAction={handleAction} />

        {/* GRID */}
        <div className="ld-main-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32 }}>

          {/* LEFT */}
          <div>
            {lead.parsedBrief && <StructuredBrief parsed={lead.parsedBrief} />}
            <AISynthesisPanel synthesis={synthesis} onRunAction={a => handleAction(a?.type || 'call')} />
            <Composer lead={lead} channel={channel} setChannel={setChannel} onSend={handleSend} />
            <SectionHeader num="01" title="Chronologie" em="toutes les interactions"
              annot={`${timeline.reduce((n, g) => n + g.items.length, 0)} événements`} />
            <Timeline groups={timeline} />
          </div>

          {/* RIGHT */}
          <div>
            <Panel title="Informations" em=" contact" action="→ Modifier">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  ['Nom', `${lead.firstName || ''} ${lead.lastName || ''}`],
                  ['Téléphone', lead.phone, true],
                  ['Email', lead.email, true],
                  ['Adresse', lead.address],
                  ['Source', lead.source],
                ].map(([k, v, mono], i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 14, alignItems: 'baseline' }}>
                    <span className="ld-mono" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500 }}>{k}</span>
                    <span style={{
                      fontFamily: mono ? 'JetBrains Mono, monospace' : 'Fraunces, serif',
                      fontWeight: 500, fontSize: mono ? 12 : 14, color: mono ? 'var(--ink-2)' : 'var(--ink)',
                      letterSpacing: mono ? 0 : '-0.01em', lineHeight: 1.3
                    }}>{v}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Pipeline" em=" commercial">
              <Stepper currentStage={lead.currentStage} history={lead.stageHistory} onChange={handleStageChange} />
            </Panel>

            <Panel title="Score" em=" d'engagement">
              <EngagementGrid engagement={engagement} />
            </Panel>

            <Panel title="Localisation" em=" — trajet">
              <MiniMap lead={lead} />
              <DistanceStats leadId={id} />
            </Panel>

            <Panel title="Devis" em=" associés" action="+ Nouveau">
              {quotes.map((q, i) => {
                const stMap = {
                  accepted: { bg: 'var(--accent-soft)', fg: 'var(--accent)', label: 'Accepté' },
                  pending:  { bg: 'var(--gold-soft)',   fg: 'oklch(0.55 0.15 85)', label: 'En attente' },
                  draft:    { bg: 'var(--surface-2)',   fg: 'var(--ink-3)', label: 'Brouillon' },
                };
                const st = stMap[q.status] || stMap.draft;
                return (
                  <div key={i} className="ld-panel-row" style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 0', borderBottom: i < quotes.length - 1 ? '1px solid var(--line-2)' : 0,
                    cursor: 'pointer', borderRadius: 6
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ld-mono" style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 500, letterSpacing: '0.06em' }}>{q.ref} · {q.date}</div>
                      <div className="ld-display" style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink)', letterSpacing: '-0.01em', marginTop: 2 }}>{q.title}</div>
                    </div>
                    <span className="ld-display" style={{ fontWeight: 500, fontSize: 16, color: 'var(--ink)', letterSpacing: '-0.01em', fontFeatureSettings: '"tnum"', whiteSpace: 'nowrap' }}>{fmtMoney(q.amount)}</span>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.12em',
                      textTransform: 'uppercase', padding: '3px 8px', borderRadius: 3,
                      fontWeight: 600, background: st.bg, color: st.fg
                    }}>{st.label}</span>
                  </div>
                );
              })}
            </Panel>

            <Panel title="Tags" em=" & segments" action="+">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(lead.tags || []).map((tag, i) => (
                  <span key={i} style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em',
                    textTransform: 'uppercase', padding: '4px 10px', borderRadius: 999, fontWeight: 500,
                    background: tag === 'VIP' ? 'var(--accent-soft)' : 'var(--surface-2)',
                    color: tag === 'VIP' ? 'var(--accent)' : 'var(--ink-2)',
                    border: `1px solid ${tag === 'VIP' ? 'var(--accent)' : 'var(--line-2)'}`
                  }}>{tag}</span>
                ))}
              </div>
            </Panel>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LeadDetail;
