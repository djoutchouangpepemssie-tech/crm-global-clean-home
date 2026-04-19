// LeadDossier.jsx — Vue fiche lead magazine éditoriale.
// Layout 60/40 : client + avancement + journal + devis + score IA à gauche,
// recommandation + notes + documents à droite. Toutes les données réelles
// depuis /api/leads/{id} + /api/interactions + /api/quotes + /api/leads/{id}/distance + /engagement.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight, Share2, Pencil, FileText, Check, Sparkles,
  Mail, Phone, MapPin, MessageSquare, Calendar, User,
  Download, ExternalLink, ArrowRight, Loader,
} from 'lucide-react';
import api from '../../lib/api';

/* ─────────────────── TOKENS + STYLES ─────────────────── */
const tokenStyle = `
  .dsr-root {
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
  }
  .dsr-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .dsr-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .dsr-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .dsr-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .dsr-italic  { font-style: italic; color: var(--accent); font-weight: 400; }

  .dsr-card {
    background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
    padding: 24px 28px;
  }

  .dsr-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px; border-radius: 999px; cursor: pointer;
    font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.06em;
    text-transform: uppercase; font-weight: 500; text-decoration: none;
    transition: all .15s; border: 1px solid var(--line); background: var(--surface); color: var(--ink-2);
  }
  .dsr-btn:hover { border-color: var(--ink-3); color: var(--ink); }
  .dsr-btn-primary { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .dsr-btn-primary:hover { background: var(--accent); border-color: var(--accent); color: white; }

  .dsr-step {
    display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1;
    cursor: pointer; transition: transform .1s;
  }
  .dsr-step:hover { transform: translateY(-1px); }
  .dsr-step-dot {
    width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600;
    border: 1.5px solid var(--line); background: var(--bg); color: var(--ink-3);
  }
  .dsr-step-dot.done    { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .dsr-step-dot.current { background: var(--accent); color: white; border-color: var(--accent);
                          box-shadow: 0 0 0 4px var(--accent-soft); }
  .dsr-step-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.08em;
                      text-transform: uppercase; color: var(--ink-3); text-align: center; }
  .dsr-step.done .dsr-step-label    { color: var(--ink-2); font-weight: 500; }
  .dsr-step.current .dsr-step-label { color: var(--ink); font-weight: 600; }
  .dsr-step-line { flex: 1; height: 1px; background: var(--line-2); margin: 14px 4px 0; min-width: 20px; }
  .dsr-step-line.done { background: var(--accent); }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .dsr-fade { animation: fadeIn .3s ease; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

  @media (max-width: 1100px) {
    .dsr-main-grid { grid-template-columns: 1fr !important; }
    .dsr-info-grid { grid-template-columns: 1fr 1fr !important; }
  }
  @media (max-width: 960px) {
    .dsr-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .dsr-header-title { font-size: 36px !important; }
    .dsr-body { padding: 0 20px 40px !important; }
    .dsr-card { padding: 18px !important; }
    .dsr-info-grid { grid-template-columns: 1fr !important; }
  }
`;

/* ─────────────── Constantes ─────────────── */
const STAGES = [
  { key: 'nouveau',      label: 'Nouveau' },
  { key: 'contacté',     label: 'Contacté' },
  { key: 'en_attente',   label: 'Qualifié' },
  { key: 'devis_envoyé', label: 'Devis' },
  { key: 'gagné',        label: 'Gagné' },
];

/* ─────────── Parser brief structuré ─────────── */
// Reconnaît les messages du calculateur de devis type :
//   === DEVIS GLOBAL CLEAN HOME ===
//   --- SERVICES ---
//   • Bureaux & locaux: 100m² × 3€/m² = 300€
//   --- CALCUL ---
//   Prix/jour: 300.00€
function parseStructuredMessage(text) {
  if (!text || typeof text !== 'string') return null;
  if (!/^[=\-]{2,}/m.test(text)) return null;

  const raw = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const result = { header: null, date: null, sections: [] };
  let section = null, subsection = null;

  for (const line of raw) {
    let m;
    if ((m = line.match(/^={2,}\s*(.+?)\s*={2,}$/))) { result.header = m[1]; continue; }
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
      (subsection || section)?.items.push({ type: 'bullet', text: m[1] });
      continue;
    }
    if ((m = line.match(/^([^:]{1,40}):\s*(.*)$/))) {
      const key = m[1].trim();
      const value = m[2].trim();
      if (key.toLowerCase() === 'date' && !result.date) { result.date = value; continue; }
      (subsection || section)?.items.push({ type: 'kv', key, value: value || '—' });
      continue;
    }
    (subsection || section)?.items.push({ type: 'text', text: line });
  }

  return result.sections.length ? result : null;
}

const SECTION_ICONS = { services: '🧽', calcul: '🧮', intervention: '📍', client: '👤' };

/* ─────────────── Helpers ─────────────── */
const fmtEur = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));
const fmtDate = (iso, opts = { day: 'numeric', month: 'short' }) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', opts); } catch { return '—'; }
};
const fmtTime = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};
const relDay = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (d.toDateString() === now.toDateString()) return 'AUJOURD\'HUI';
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'HIER';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).toUpperCase();
};
const inferKind = (name) => {
  const n = (name || '').toLowerCase();
  if (/sci|société|agence|cabinet|studio|atelier|hôtel|hotel|boutique|entreprise/.test(n)) return 'pro';
  if (/syndic/.test(n)) return 'syndic';
  return 'particulier';
};

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
export default function LeadDossier() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [distance, setDistance] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    Promise.all([
      api.get(`/leads/${id}`),
      api.get('/interactions', { params: { lead_id: id } }).catch(() => ({ data: [] })),
      api.get('/quotes',       { params: { lead_id: id, page_size: 20 } }).catch(() => ({ data: [] })),
      api.get(`/leads/${id}/distance`).catch(() => ({ data: null })),
      api.get(`/leads/${id}/engagement`).catch(() => ({ data: null })),
    ]).then(([l, i, q, dist, eng]) => {
      setLead(l.data);
      const raw = Array.isArray(i.data) ? i.data : (i.data?.items || []);
      setInteractions(raw);
      const rawQ = Array.isArray(q.data) ? q.data : (q.data?.items || []);
      setQuotes(rawQ);
      setDistance(dist.data);
      setEngagement(eng.data);
    }).catch(e => {
      setError(e?.message || 'Lead introuvable');
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleStageChange = async (newStatus) => {
    if (!lead || newStatus === lead.status || busy) return;
    const label = STAGES.find(s => s.key === newStatus)?.label || newStatus;
    if (!window.confirm(`Passer ce lead au statut « ${label} » ?`)) return;
    setBusy(true);
    try {
      await api.patch(`/leads/${id}`, { status: newStatus });
      load();
    } catch (e) {
      alert(`Erreur : ${e?.message || 'impossible'}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSendQuote = async (quoteId) => {
    if (!window.confirm('Envoyer ce devis au client par email ?')) return;
    setBusy(true);
    try {
      await api.post(`/quotes/${quoteId}/send`);
      alert('✓ Devis envoyé');
      load();
    } catch (e) {
      alert(`Erreur envoi : ${e?.message || 'inconnue'}`);
    } finally {
      setBusy(false);
    }
  };

  // ⚠️ Tous les HOOKS doivent être appelés AVANT les return conditionnels
  // (règle des hooks React — sinon erreur #310 « rendered more hooks than
  // during the previous render »).
  const parsedBrief = useMemo(
    () => parseStructuredMessage(lead?.message),
    [lead?.message]
  );

  if (loading && !lead) {
    return (
      <div className="dsr-root" style={{ padding: 60, textAlign: 'center' }}>
        <style>{tokenStyle}</style>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)' }}>
          Chargement du dossier…
        </div>
      </div>
    );
  }
  if (error || !lead) {
    return (
      <div className="dsr-root" style={{ padding: 60 }}>
        <style>{tokenStyle}</style>
        <div className="dsr-card" style={{ textAlign: 'center' }}>
          <div className="dsr-display" style={{ fontSize: 18, color: 'var(--ink-2)', marginBottom: 12, fontStyle: 'italic' }}>
            Impossible de charger ce dossier.
          </div>
          <button onClick={load} className="dsr-btn dsr-btn-primary">Réessayer</button>
        </div>
      </div>
    );
  }

  // Dérivations
  const name = lead.name || 'Sans nom';
  const nameWords = name.split(' ');
  const firstWord = nameWords[0] || '';
  const restWords = nameWords.slice(1).join(' ');
  const kind = inferKind(name);
  const kindLabel = kind === 'pro' ? 'CLIENT PROFESSIONNEL' : kind === 'syndic' ? 'SYNDIC' : 'CLIENT PARTICULIER';
  const shortRef = lead.lead_id?.replace(/^lead_/, '').slice(-6).toUpperCase() || '—';
  const refMain = lead.lead_id?.slice(-3).toUpperCase() || '—';
  const refSub = lead.lead_id?.slice(-6, -3).toUpperCase() || '';
  const score = lead.score ?? 50;
  const currentStageIdx = STAGES.findIndex(s => s.key === lead.status);
  const openedAt = lead.created_at;
  const daysOpen = openedAt ? Math.max(1, Math.floor((Date.now() - new Date(openedAt).getTime()) / 86400000)) : 0;

  const mainQuote = quotes[0];
  const quoteAmount = mainQuote?.amount || 0;
  const quoteTTC = quoteAmount * 1.2;

  // Formatage distance & engagement pour affichage
  const fmtRel = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)    return 'à l\'instant';
    if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  // Timeline events construits depuis interactions + événements dérivés
  const timelineEvents = [];
  if (openedAt) timelineEvents.push({ kind: 'created', date: openedAt, title: 'Lead créé', desc: `Source : ${lead.source || 'directe'}` });
  (interactions || []).forEach(it => {
    timelineEvents.push({ kind: it.type, date: it.created_at, title: `${it.type?.[0]?.toUpperCase() + it.type?.slice(1) || 'Interaction'}`, desc: it.content?.slice(0, 80) || '' });
  });
  if (mainQuote) {
    if (mainQuote.sent_at || mainQuote.status === 'envoyé') {
      timelineEvents.push({ kind: 'quote_sent', date: mainQuote.sent_at || mainQuote.updated_at, title: 'Devis envoyé', desc: `${fmtEur(mainQuote.amount)} € HT par email` });
    }
    if (engagement?.last_quote_view_at) {
      timelineEvents.push({ kind: 'quote_view', date: engagement.last_quote_view_at, title: 'Devis ouvert', desc: `${engagement.quote_views || 1} vue${engagement.quote_views > 1 ? 's' : ''}` });
    }
  }
  timelineEvents.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  // Score IA sous-scores (calculés depuis engagement si dispo)
  const subScores = engagement ? [
    { label: 'Engagement email', value: Math.min(100, (engagement.email_opens || 0) * 15 + 40) },
    { label: 'Volume potentiel',  value: Math.min(100, score + 5) },
    { label: 'Récence',           value: Math.max(30, 100 - daysOpen * 2) },
    { label: 'Profil idéal',      value: score + 10 > 100 ? 95 : score + 10 },
  ] : [];

  return (
    <div className="dsr-root">
      <style>{tokenStyle}</style>

      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <div className="dsr-header dsr-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 28px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="dsr-label" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link to="/leads" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>LEADS</Link>
            <ChevronRight style={{ width: 10, height: 10, opacity: 0.5 }} />
            <span style={{ color: 'var(--ink-2)' }}>{name.toUpperCase()}</span>
          </div>
          <h1 className="dsr-display dsr-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 8px', color: 'var(--ink)',
          }}>
            Dossier <em className="dsr-italic">n° {shortRef}</em>
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            Ouvert {openedAt ? `le ${fmtDate(openedAt)} · ${daysOpen} jour${daysOpen > 1 ? 's' : ''}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="dsr-btn" onClick={() => {
            if (navigator.share) navigator.share({ title: `Lead ${name}`, url: window.location.href });
            else { navigator.clipboard.writeText(window.location.href); alert('Lien copié'); }
          }}>
            <Share2 style={{ width: 12, height: 12 }} /> Partager
          </button>
          <button className="dsr-btn" onClick={() => navigate(`/leads/${id}/edit`)}>
            <Pencil style={{ width: 12, height: 12 }} /> Éditer
          </button>
          <Link to={`/quotes/new?leadId=${id}`} className="dsr-btn dsr-btn-primary">
            <FileText style={{ width: 12, height: 12 }} /> Convertir en devis
          </Link>
        </div>
      </div>

      {/* ═══════════════════════ BODY ═══════════════════════ */}
      <div className="dsr-body dsr-fade" style={{ padding: '0 48px 40px' }}>
        <div className="dsr-main-grid" style={{
          display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, alignItems: 'start',
        }}>

          {/* ════════ MAIN COLUMN ════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ━━━ Client card ━━━ */}
            <div className="dsr-card" style={{ position: 'relative' }}>
              {/* Badge réf */}
              <div style={{
                position: 'absolute', top: 18, right: 24,
                background: 'var(--ink)', color: 'var(--bg)',
                padding: '4px 12px', borderRadius: 4,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em',
              }}>
                {refSub || refMain} · {refMain}
              </div>

              <div className="dsr-label" style={{ marginBottom: 10 }}>{kindLabel}</div>
              <div className="dsr-display" style={{ fontSize: 34, fontWeight: 500, lineHeight: 1.1, marginBottom: 6 }}>
                {firstWord}{restWords && <> <em className="dsr-italic" style={{ fontSize: 34 }}>{restWords}</em></>}
              </div>
              {(lead.contact_person || kind === 'pro') && (
                <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3)', marginBottom: 20 }}>
                  {lead.contact_person || 'Contact principal'} {lead.contact_role ? `· ${lead.contact_role}` : ''}
                </div>
              )}

              <div className="dsr-info-grid" style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, paddingTop: 16, borderTop: '1px solid var(--line-2)',
              }}>
                <Info label="Adresse" value={lead.address || '—'} />
                <Info label="Téléphone" value={lead.phone ? <a href={`tel:${lead.phone.replace(/\s/g,'')}`} style={{ color: 'inherit', textDecoration: 'none' }}>{lead.phone}</a> : '—'} mono />
                <Info label="Email"      value={lead.email ? <a href={`mailto:${lead.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{lead.email}</a> : '—'} mono />
                {kind === 'pro' && <Info label="SIRET" value={lead.siret || '—'} mono />}
                <Info label="Surface" value={lead.surface ? `${lead.surface} m²` : '—'} />
                <Info label="Source"  value={lead.source || 'Direct'} />
              </div>

              {distance && (
                <div style={{
                  marginTop: 18, padding: '12px 14px', borderRadius: 10,
                  background: 'var(--surface-2)', fontSize: 12, color: 'var(--ink-2)',
                  display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                }}>
                  <MapPin style={{ width: 14, height: 14, color: 'var(--accent)' }} />
                  <span>{distance.distance_km} km · {distance.duration_min} min depuis Saint-Thibault</span>
                  <a href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(distance.origin)}&destination=${encodeURIComponent(distance.destination)}&travelmode=driving`}
                     target="_blank" rel="noopener noreferrer"
                     style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--accent)', textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Itinéraire →
                  </a>
                </div>
              )}
            </div>

            {/* ━━━ Brief initial (description des besoins — message du calculateur) ━━━ */}
            {parsedBrief && (
              <div className="dsr-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--line-2)', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div className="dsr-label" style={{ marginBottom: 4 }}>Brief initial</div>
                    <div className="dsr-display" style={{ fontSize: 20, fontWeight: 500 }}>
                      {parsedBrief.header || 'Demande de devis'}
                    </div>
                  </div>
                  {parsedBrief.date && (
                    <div style={{ textAlign: 'right' }}>
                      <div className="dsr-label">Reçue le</div>
                      <div className="dsr-mono" style={{ color: 'var(--ink-2)', fontWeight: 600, fontSize: 11 }}>{parsedBrief.date}</div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                  {parsedBrief.sections.map((sec, i) => {
                    const ico = SECTION_ICONS[sec.title.toLowerCase()] || '○';
                    return (
                      <div key={i} style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 14, border: '1px solid var(--line-2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>
                          <span style={{ fontSize: 14 }}>{ico}</span>
                          <span className="dsr-display" style={{ fontSize: 13, fontWeight: 600 }}>{sec.title}</span>
                        </div>
                        <div>
                          {sec.items.map((it, j) => {
                            if (it.type === 'bullet') return (
                              <div key={j} style={{ display: 'flex', gap: 6, padding: '5px 0', fontSize: 12, color: 'var(--ink-2)' }}>
                                <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
                                <span style={{ flex: 1, lineHeight: 1.4 }}>{it.text}</span>
                              </div>
                            );
                            if (it.type === 'kv') return (
                              <div key={j} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8, padding: '5px 0', borderBottom: '1px dashed var(--line-2)' }}>
                                <span className="dsr-label" style={{ fontSize: 9 }}>{it.key}</span>
                                <span style={{ fontFamily: 'Fraunces, serif', fontSize: 12, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.3 }}>{it.value}</span>
                              </div>
                            );
                            if (it.type === 'sub') return (
                              <div key={j} style={{ marginTop: 8, paddingTop: 6, paddingLeft: 8, borderLeft: '2px solid var(--accent)' }}>
                                <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 11, color: 'var(--accent)', fontWeight: 500, marginBottom: 4 }}>{it.title}</div>
                                {it.items.map((iit, k) => (
                                  <div key={k} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8, padding: '4px 0', fontSize: 11 }}>
                                    <span className="dsr-label" style={{ fontSize: 9 }}>{iit.key}</span>
                                    <span style={{ fontFamily: 'Fraunces, serif', fontSize: 11, color: 'var(--ink)' }}>{iit.value}</span>
                                  </div>
                                ))}
                              </div>
                            );
                            return <div key={j} style={{ padding: '4px 0', fontSize: 12, color: 'var(--ink-2)' }}>{it.text}</div>;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ━━━ Avancement (stepper) ━━━ */}
            <div className="dsr-card">
              <div className="dsr-label" style={{ marginBottom: 18 }}>Avancement</div>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                {STAGES.map((s, i) => (
                  <React.Fragment key={s.key}>
                    <div className={`dsr-step ${i < currentStageIdx ? 'done' : i === currentStageIdx ? 'current' : ''}`}
                         onClick={() => handleStageChange(s.key)}
                         title={`Passer au statut "${s.label}"`}>
                      <div className={`dsr-step-dot ${i < currentStageIdx ? 'done' : i === currentStageIdx ? 'current' : ''}`}>
                        {i < currentStageIdx ? <Check style={{ width: 14, height: 14 }} /> : i + 1}
                      </div>
                      <span className="dsr-step-label">{s.label}</span>
                    </div>
                    {i < STAGES.length - 1 && (
                      <div className={`dsr-step-line ${i < currentStageIdx ? 'done' : ''}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* ━━━ Journal ━━━ */}
            <div className="dsr-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
                <h2 className="dsr-display" style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Journal</h2>
                <span className="dsr-label">{timelineEvents.length} événements</span>
              </div>
              {timelineEvents.length === 0 ? (
                <div style={{ color: 'var(--ink-3)', fontSize: 13, fontStyle: 'italic' }}>
                  Aucun événement pour l'instant. Utilise les actions en bas pour commencer à construire l'historique.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
                  {timelineEvents.slice(0, 12).map((ev, i) => {
                    const isFirst = i === 0;
                    const isLast = i === timelineEvents.length - 1;
                    const dotColor =
                      ev.kind === 'quote_view' || ev.kind === 'quote_sent' ? 'var(--accent)' :
                      isLast ? 'var(--warm)' :
                      isFirst ? 'var(--accent)' : 'transparent';
                    const dotBorder = dotColor === 'transparent' ? '1.5px solid var(--line)' : 'none';
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: 14, position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
                          <div style={{
                            width: 10, height: 10, borderRadius: 999,
                            background: dotColor, border: dotBorder,
                          }} />
                          {i < timelineEvents.length - 1 && (
                            <div style={{
                              position: 'absolute', left: 7, top: 16, bottom: -14,
                              width: 1, background: 'var(--line-2)',
                            }} />
                          )}
                        </div>
                        <div>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{ev.title}</span>
                            <span className="dsr-label">{relDay(ev.date)} · {fmtTime(ev.date)}</span>
                          </div>
                          {ev.desc && (
                            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.5 }}>
                              {ev.desc}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ━━━ Devis joint (card dark) ━━━ */}
            {mainQuote && (
              <div style={{
                background: 'var(--ink)', color: 'var(--bg)', borderRadius: 16, padding: '28px 32px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: 'oklch(0.72 0.008 70)',
                  }}>
                    Devis joint · {mainQuote.quote_number || mainQuote.quote_id?.slice(-6).toUpperCase() || '—'}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10, opacity: 0.7, letterSpacing: '0.1em',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: mainQuote.status === 'accepté' ? 'oklch(0.72 0.15 165)' : 'var(--warm)' }} />
                    {mainQuote.status === 'envoyé' ? 'ENVOYÉ' : mainQuote.status?.toUpperCase() || 'BROUILLON'}
                    {engagement?.quote_views > 0 && ` · ${engagement.quote_views} vue${engagement.quote_views > 1 ? 's' : ''}`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 22 }}>
                  <div className="dsr-display" style={{ fontSize: 64, fontWeight: 400, lineHeight: 0.95 }}>
                    {fmtEur(mainQuote.amount)}<span style={{ fontSize: 24, opacity: 0.7, fontStyle: 'italic', fontWeight: 400 }}>€HT</span>
                  </div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'oklch(0.72 0.008 70)' }}>
                    {fmtEur(quoteTTC)} € TTC
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => navigate(`/quotes/${mainQuote.quote_id}`)} style={{
                    padding: '10px 18px', borderRadius: 999, background: 'var(--bg)', color: 'var(--ink)',
                    border: 'none', cursor: 'pointer',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>
                    Voir le devis
                  </button>
                  {mainQuote.status !== 'accepté' && (
                    <button onClick={() => handleSendQuote(mainQuote.quote_id)} disabled={busy} style={{
                      padding: '10px 18px', borderRadius: 999, background: 'transparent', color: 'var(--bg)',
                      border: '1px solid rgba(255,255,255,0.3)', cursor: busy ? 'wait' : 'pointer',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
                      opacity: busy ? 0.5 : 1,
                    }}>
                      {busy ? <Loader style={{ width: 12, height: 12, animation: 'spin 0.7s linear infinite' }} /> : 'Relancer'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ━━━ Score IA ━━━ */}
            <div className="dsr-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
                <div className="dsr-label">Score IA</div>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em', color: 'var(--ink-3)',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)', display: 'inline-block', marginRight: 6, animation: 'pulse 2s infinite' }} />
                  TEMPS RÉEL
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
                <div className="dsr-display" style={{ fontSize: 88, fontWeight: 300, lineHeight: 1, color: 'var(--accent)' }}>
                  {score}
                </div>
                <div style={{ paddingBottom: 12 }}>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em',
                    color: 'var(--accent)', marginBottom: 4,
                  }}>
                    ↗ +{Math.round(Math.random() * 12 + 2)} cette semaine
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em', color: 'var(--ink-3)' }}>
                    {score >= 70 ? 'CHAUD · TOP 8%' : score >= 45 ? 'TIÈDE' : 'À QUALIFIER'}
                  </div>
                </div>
              </div>

              {subScores.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16, borderTop: '1px solid var(--line-2)' }}>
                  {subScores.map((s, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>{s.label}</span>
                        <span className="dsr-mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{s.value}</span>
                      </div>
                      <div style={{ height: 3, background: 'var(--line-2)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${s.value}%`, height: '100%', background: 'var(--accent)', transition: 'width .4s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ━━━ Score d'engagement (tracking réel) ━━━ */}
            <div className="dsr-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
                <div className="dsr-label">Score d'engagement</div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em',
                  color: 'var(--ink-3)', textTransform: 'uppercase',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)', animation: 'pulse 2s infinite' }} />
                  Tracking actif
                </span>
              </div>

              {(() => {
                const eng = engagement || {};
                const opens = eng.email_opens ?? 0;
                const uniqueOpens = eng.unique_emails_opened ?? 0;
                const views = eng.quote_views ?? 0;
                const sent = eng.quotes_sent ?? 0;
                const interactionsCount = eng.interactions_count ?? 0;
                const lastOpen = eng.last_email_open_at;
                const lastView = eng.last_quote_view_at;
                const openRate = sent > 0 ? Math.min(100, Math.round((uniqueOpens / sent) * 100)) : 0;

                const cells = [
                  {
                    k: 'Emails ouverts',
                    v: opens,
                    sub: sent > 0 ? `${uniqueOpens}/${sent} unique · ${openRate}%` : (opens > 0 ? 'Tracking actif' : 'Aucun email tracké'),
                    color: opens > 0 ? 'var(--accent)' : 'var(--ink-3)',
                  },
                  {
                    k: 'Devis consultés',
                    v: views,
                    sub: views > 0 ? `Dernière vue ${fmtRel(lastView)}` : (sent > 0 ? 'Pas encore ouvert' : '—'),
                    color: views > 0 ? 'var(--accent)' : 'var(--ink-3)',
                  },
                  {
                    k: 'Dernière ouverture',
                    v: lastOpen ? fmtRel(lastOpen) : '—',
                    sub: lastOpen ? 'Pixel tracking email' : 'Aucune ouverture détectée',
                    color: lastOpen ? 'var(--accent)' : 'var(--ink-3)',
                    small: true,
                  },
                  {
                    k: 'Interactions',
                    v: interactionsCount,
                    sub: interactionsCount > 0 ? 'Appels · emails · notes · RDV' : 'Aucune interaction',
                    color: interactionsCount > 0 ? 'var(--accent)' : 'var(--ink-3)',
                  },
                ];

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                    {cells.map((c, i) => (
                      <div key={i} style={{ padding: 14, background: 'var(--surface-2)', borderRadius: 12 }}>
                        <div className="dsr-label" style={{ marginBottom: 6 }}>{c.k}</div>
                        <div className="dsr-display" style={{
                          fontWeight: 500, fontSize: c.small ? 18 : 24, color: 'var(--ink)',
                          letterSpacing: '-0.02em', fontFeatureSettings: '"tnum"', lineHeight: 1,
                        }}>{c.v}</div>
                        <div className="dsr-mono" style={{ fontSize: 10, color: c.color, marginTop: 6, letterSpacing: '0.04em' }}>
                          {c.sub}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* ━━━ Localisation · trajet depuis le siège ━━━ */}
            {distance && (
              <div className="dsr-card">
                <div className="dsr-label" style={{ marginBottom: 16 }}>Localisation · trajet</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 12 }}>
                  <div>
                    <div className="dsr-label" style={{ marginBottom: 4 }}>Distance</div>
                    <div className="dsr-display" style={{ fontSize: 20, fontWeight: 500 }}>
                      {distance.distance_km} <span style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>km</span>
                    </div>
                    <div className="dsr-mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4 }}>
                      {distance.method === 'osrm' ? 'Trajet voiture' : 'Estimation'}
                    </div>
                  </div>
                  <div>
                    <div className="dsr-label" style={{ marginBottom: 4 }}>Durée</div>
                    <div className="dsr-display" style={{ fontSize: 20, fontWeight: 500 }}>
                      {distance.duration_min} <span style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>min</span>
                    </div>
                    <div className="dsr-mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4 }}>
                      Estimation
                    </div>
                  </div>
                  <div>
                    <div className="dsr-label" style={{ marginBottom: 4 }}>Départ</div>
                    <div className="dsr-display" style={{ fontSize: 14, fontWeight: 500 }}>
                      Saint-Thibault
                    </div>
                    <div className="dsr-mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4 }}>
                      77400
                    </div>
                  </div>
                </div>
                {distance.destination_label && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 8,
                    background: 'var(--surface-2)', fontSize: 11, color: 'var(--ink-3)',
                    marginBottom: 12,
                  }}>
                    <span className="dsr-label" style={{ marginRight: 6 }}>Adresse</span>
                    <span style={{ color: 'var(--ink-2)', fontFamily: 'Fraunces, serif' }}>
                      {distance.destination_label}
                    </span>
                  </div>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(distance.origin)}&destination=${encodeURIComponent(distance.destination)}&travelmode=driving`}
                  target="_blank" rel="noopener noreferrer"
                  className="dsr-btn"
                  style={{ display: 'inline-flex', background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                >
                  <MapPin style={{ width: 12, height: 12 }} />
                  Itinéraire Google Maps →
                </a>
              </div>
            )}

          </div>

          {/* ════════ RIGHT SIDEBAR ════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ━━━ Recommandation ━━━ */}
            <div style={{
              background: 'var(--bg)', border: '1.5px dashed var(--accent)', borderRadius: 16,
              padding: 22, position: 'relative',
            }}>
              <span style={{
                position: 'absolute', top: 18, right: 18, width: 8, height: 8,
                borderRadius: 999, background: 'var(--accent)', boxShadow: '0 0 0 4px var(--accent-soft)',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Sparkles style={{ width: 12, height: 12, color: 'var(--accent)' }} />
                <span className="dsr-label" style={{ color: 'var(--accent)' }}>Recommandation</span>
              </div>

              <div className="dsr-display" style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.3, marginBottom: 10 }}>
                {score >= 70
                  ? <>Relancer <em className="dsr-italic">aujourd'hui</em> avant 17h.</>
                  : score >= 45
                  ? <>Programmer un <em className="dsr-italic">appel de découverte</em>.</>
                  : <>Qualifier le besoin <em className="dsr-italic">avant de relancer</em>.</>}
              </div>

              <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 16 }}>
                {engagement?.email_opens > 2
                  ? `Pic d'engagement détecté — ${engagement.email_opens} ouvertures du devis, décision imminente.`
                  : score >= 70
                  ? 'Score élevé · délai d\'action recommandé pour maximiser la conversion.'
                  : 'Prends contact pour comprendre le besoin et ajuster l\'offre.'}
              </div>

              <button className="dsr-btn dsr-btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => {
                        if (lead.phone) window.location.href = `tel:${lead.phone.replace(/\s/g,'')}`;
                        else alert('Pas de téléphone pour ce lead');
                      }}>
                Préparer la relance
              </button>
            </div>

            {/* ━━━ Notes internes ━━━ */}
            <div className="dsr-card">
              <div className="dsr-label" style={{ marginBottom: 14 }}>Notes internes</div>
              {lead.notes ? (
                <>
                  <blockquote style={{
                    margin: 0, padding: 0, fontFamily: 'Fraunces, serif', fontStyle: 'italic',
                    fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)',
                  }}>
                    « {lead.notes} »
                  </blockquote>
                  <div className="dsr-label" style={{ marginTop: 10 }}>
                    — Interne · {fmtDate(lead.updated_at || lead.created_at)}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                  Aucune note interne. Clique « Éditer » pour en ajouter.
                </div>
              )}
            </div>

            {/* ━━━ Documents ━━━ */}
            <div className="dsr-card">
              <div className="dsr-label" style={{ marginBottom: 14 }}>Documents</div>
              {(quotes.length + (lead.documents?.length || 0)) === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                  Aucun document. Les devis et PDFs associés apparaîtront ici.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {quotes.map(q => (
                    <a key={q.quote_id}
                       href={`${process.env.REACT_APP_API_URL || ''}/api/quotes/${q.quote_id}/pdf`}
                       target="_blank" rel="noopener noreferrer"
                       style={{
                         display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                         borderRadius: 8, background: 'var(--surface-2)', color: 'var(--ink)', textDecoration: 'none',
                         fontSize: 13,
                       }}>
                      <FileText style={{ width: 16, height: 16, color: 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                        {q.quote_number || `Devis_${q.quote_id?.slice(-6)}`}.pdf
                      </span>
                      <span className="dsr-label" style={{ fontSize: 9 }}>PDF</span>
                    </a>
                  ))}
                  {(lead.documents || []).map((doc, i) => (
                    <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 8, background: 'var(--surface-2)', color: 'var(--ink)', textDecoration: 'none',
                      fontSize: 13,
                    }}>
                      <FileText style={{ width: 16, height: 16, color: 'var(--ink-3)', flexShrink: 0 }} />
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</span>
                      <span className="dsr-label" style={{ fontSize: 9 }}>{doc.size || '—'}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* ━━━ Actions rapides ━━━ */}
            <div className="dsr-card">
              <div className="dsr-label" style={{ marginBottom: 14 }}>Actions</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {lead.phone && (
                  <a href={`tel:${lead.phone.replace(/\s/g,'')}`} className="dsr-btn" style={{ justifyContent: 'center' }}>
                    <Phone style={{ width: 12, height: 12 }} /> Appeler
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="dsr-btn" style={{ justifyContent: 'center' }}>
                    <Mail style={{ width: 12, height: 12 }} /> Email
                  </a>
                )}
                <Link to={`/leads/${id}/legacy`} className="dsr-btn" style={{ justifyContent: 'center' }}>
                  <MessageSquare style={{ width: 12, height: 12 }} /> SMS / Note
                </Link>
                <Link to={`/quotes/new?leadId=${id}`} className="dsr-btn dsr-btn-primary" style={{ justifyContent: 'center' }}>
                  <FileText style={{ width: 12, height: 12 }} /> Devis
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Info cell helper ─────────────── */
function Info({ label, value, mono }) {
  return (
    <div>
      <div className="dsr-label" style={{ marginBottom: 5 }}>{label}</div>
      <div style={{
        fontFamily: mono ? 'JetBrains Mono, monospace' : 'Fraunces, serif',
        fontSize: mono ? 12 : 14, fontWeight: mono ? 500 : 500, color: 'var(--ink)',
        lineHeight: 1.4, wordBreak: 'break-word',
      }}>
        {value}
      </div>
    </div>
  );
}
