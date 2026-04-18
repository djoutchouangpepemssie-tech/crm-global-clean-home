import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import {
  ChevronRight, ChevronDown, ChevronUp, Plus, Trash2, Sparkles,
  MapPin, Check, AlertTriangle, Save, Send,
  X, ArrowLeft, Loader,
} from 'lucide-react';

/**
 * QuoteForm — Wizard 4 étapes artisanal atelier.
 *
 * Étapes : 1 Client · 2 Prestations · 3 Conditions · 4 Récapitulatif
 * Générateur IA dashed émeraude (description → postes)
 * Alerte IA oublis (bandeau or)
 * Postes groupés expandables avec inputs inline
 * Sidebar sticky : Totaux · Probabilité signature 87% · Client · Similaires
 * Footbar ink avec sauvegarde auto
 *
 * API : POST /api/quotes · GET /api/leads · GET /api/quotes (similaires)
 * Fallbacks inline complets.
 */

/* ─── CSS tokens ───────────────────────────────────────────────── */
const tokenStyle = `
  .qf-root {
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
  .qf-root {
    background: var(--bg);
    min-height: 100vh;
    color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    font-feature-settings: "ss01", "cv11";
    -webkit-font-smoothing: antialiased;
    padding-bottom: 80px;
  }
  .qf-display { font-family: 'Fraunces', serif; font-weight: 400; letter-spacing: -0.02em; }
  .qf-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .qf-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); font-weight: 500; }

  .qf-step-dot {
    width: 32px; height: 32px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700;
    transition: all .2s;
    flex-shrink: 0;
  }
  .qf-step-dot-done    { background: var(--accent); color: white; }
  .qf-step-dot-active  { background: var(--ink); color: var(--bg); }
  .qf-step-dot-pending { background: var(--surface-2); color: var(--ink-4); border: 1.5px solid var(--line); }

  .qf-field {
    background: var(--surface);
    border: 1.5px solid var(--line);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 14px;
    color: var(--ink);
    outline: none;
    transition: border .15s, box-shadow .15s;
    width: 100%;
    font-family: inherit;
  }
  .qf-field:focus { border-color: var(--accent); box-shadow: 0 0 0 3px oklch(0.52 0.13 165 / 0.1); }
  .qf-field::placeholder { color: var(--ink-4); }
  select.qf-field { cursor: pointer; }

  .qf-ai-panel {
    border: 2px dashed var(--accent);
    border-radius: 14px;
    background: var(--accent-soft);
    padding: 20px;
  }

  .qf-gold-alert {
    background: var(--gold-soft);
    border: 1.5px solid var(--gold);
    border-radius: 10px;
    padding: 12px 16px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .qf-poste-row {
    display: grid;
    grid-template-columns: 1fr 80px 80px 90px 32px;
    gap: 8px;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--line-2);
  }
  .qf-poste-row:last-child { border-bottom: none; }

  .qf-sidebar {
    position: sticky;
    top: 24px;
    width: 300px;
    flex-shrink: 0;
  }
  .qf-sidebar-card {
    background: var(--surface);
    border: 1.5px solid var(--line);
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 16px;
  }

  .qf-proba-bar {
    height: 8px;
    border-radius: 9999px;
    background: var(--surface-2);
    overflow: hidden;
    margin: 8px 0 4px;
  }
  .qf-proba-fill {
    height: 100%;
    border-radius: 9999px;
    background: linear-gradient(90deg, var(--accent), oklch(0.62 0.15 165));
    transition: width .6s cubic-bezier(.16, 1, .3, 1);
  }

  .qf-footbar {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: var(--ink);
    color: var(--bg);
    padding: 14px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    z-index: 100;
    box-shadow: 0 -4px 24px oklch(0.165 0.012 60 / 0.2);
  }
  .qf-footbar-btn {
    padding: 9px 20px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all .15s;
    display: flex;
    align-items: center;
    gap: 6px;
    border: none;
  }
  .qf-footbar-btn-ghost {
    background: transparent;
    color: oklch(0.72 0.008 70);
    border: 1.5px solid oklch(0.35 0.012 60);
  }
  .qf-footbar-btn-ghost:hover { background: oklch(0.25 0.012 60); color: var(--bg); }
  .qf-footbar-btn-primary { background: var(--accent); color: white; }
  .qf-footbar-btn-primary:hover { opacity: 0.9; }
  .qf-footbar-btn-secondary {
    background: oklch(0.28 0.012 60);
    color: var(--bg);
    border: 1.5px solid oklch(0.35 0.012 60);
  }
  .qf-footbar-btn-secondary:hover { background: oklch(0.35 0.012 60); }

  .qf-group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: var(--surface-2);
    border-radius: 8px;
    cursor: pointer;
    transition: background .1s;
    margin-bottom: 2px;
  }
  .qf-group-header:hover { background: var(--line); }

  .qf-btn-sm {
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: 1.5px solid var(--line);
    background: var(--surface);
    color: var(--ink-2);
    display: flex; align-items: center; gap: 5px;
    transition: all .15s;
  }
  .qf-btn-sm:hover { border-color: var(--ink-3); color: var(--ink); }
  .qf-btn-accent { background: var(--accent); color: white; border-color: var(--accent); }
  .qf-btn-accent:hover { opacity: 0.85; }

  .qf-section {
    background: var(--surface);
    border: 1.5px solid var(--line);
    border-radius: 14px;
    padding: 24px;
    margin-bottom: 20px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .qf-fadein { animation: fadeIn .25s ease; }
`;

/* ─── Demo data ────────────────────────────────────────────────── */
const DEMO_LEADS = [
  { id: 1, full_name: 'Marie Dupont',   city: 'Paris 11e',         email: 'marie.dupont@email.com',   phone: '06 12 34 56 78' },
  { id: 2, full_name: 'Thomas Martin',  city: 'Paris 7e',          email: 'thomas.martin@email.com',  phone: '06 23 45 67 89' },
  { id: 3, full_name: 'Sophie Bernard', city: 'Neuilly-sur-Seine', email: 'sophie.bernard@email.com', phone: '06 34 56 78 90' },
  { id: 4, full_name: 'Antoine Leroy',  city: 'Vincennes',         email: 'antoine.leroy@email.com',  phone: '06 45 67 89 01' },
  { id: 5, full_name: 'Camille Petit',  city: 'Paris 16e',         email: 'camille.petit@email.com',  phone: '06 56 78 90 12' },
];

const DEMO_SIMILAR = [
  { id: 101, number: 'D-2024-008', client: 'Paul Lambert',   amount: 9200, status: 'accepté' },
  { id: 102, number: 'D-2024-002', client: 'Thomas Martin',  amount: 840,  status: 'accepté' },
];

const SERVICE_SUGGESTIONS = [
  { label: 'Ménage régulier (2h/semaine)',        unit: 'mois',    price: 320 },
  { label: 'Nettoyage après travaux',             unit: 'forfait', price: 1200 },
  { label: 'Grand ménage annuel',                 unit: 'forfait', price: 480 },
];

const OUBLIS_IA = [
  'TVA non renseignée — précisez 20% ou micro-prestataire',
  'Frais de déplacement non inclus',
  'Délai de paiement non spécifié (30j recommandé)',
];

/* ─── Helpers ──────────────────────────────────────────────────── */
function fmtEur(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n || 0);
}
function newPoste(label = '') {
  return { id: Date.now() + Math.random(), label, qty: 1, unit: 'forfait', price: 0 };
}
function newGroup(name = 'Nouveau groupe') {
  return { id: Date.now(), name, expanded: true, postes: [newPoste()] };
}

/* ─── Stepper ──────────────────────────────────────────────────── */
const STEPS = [
  { n: 1, label: 'Client',        sub: 'Sélection du prospect' },
  { n: 2, label: 'Prestations',   sub: 'Détail des postes' },
  { n: 3, label: 'Conditions',    sub: 'Délais · paiement' },
  { n: 4, label: 'Récapitulatif', sub: 'Vérification finale' },
];

function Stepper({ current }) {
  return (
    <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: '20px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', maxWidth: 700 }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s.n}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className={`qf-step-dot ${s.n < current ? 'qf-step-dot-done' : s.n === current ? 'qf-step-dot-active' : 'qf-step-dot-pending'}`}>
                {s.n < current ? <Check style={{ width: 14, height: 14 }} /> : s.n}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: s.n === current ? 'var(--ink)' : s.n < current ? 'var(--accent)' : 'var(--ink-4)' }}>{s.label}</div>
                <div className="qf-mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>{s.sub}</div>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1.5, background: i < current - 1 ? 'var(--accent)' : 'var(--line)', margin: '0 12px', minWidth: 24 }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ─── Step 1 : Client ──────────────────────────────────────────── */
function Step1Client({ data, setData, leads }) {
  const selected = leads.find(l => l.id === data.lead_id);
  return (
    <div className="qf-section qf-fadein">
      <h2 className="qf-display" style={{ fontSize: 22, marginBottom: 20, fontStyle: 'italic' }}>Sélectionner le client</h2>
      <div style={{ marginBottom: 16 }}>
        <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Prospect *</label>
        <select className="qf-field" value={data.lead_id || ''} onChange={e => setData(d => ({ ...d, lead_id: e.target.value || null }))}>
          <option value="">— Choisir un prospect —</option>
          {leads.map(l => <option key={l.id} value={l.id}>{l.full_name} · {l.city || ''}</option>)}
        </select>
      </div>
      {selected && (
        <div className="qf-fadein" style={{ background: 'var(--accent-soft)', border: '1.5px solid oklch(0.75 0.08 165)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontFamily: "'Fraunces', serif", fontWeight: 700, flexShrink: 0 }}>
            {(selected.full_name || '?').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.full_name}</div>
            <div className="qf-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
              <MapPin style={{ width: 10, height: 10, display: 'inline', marginRight: 3 }} />{selected.city || '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>{selected.email} · {selected.phone}</div>
          </div>
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Titre du devis *</label>
        <input className="qf-field" placeholder="Ex: Ménage régulier 2h/semaine" value={data.title || ''} onChange={e => setData(d => ({ ...d, title: e.target.value }))} />
      </div>
      <div>
        <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Description courte</label>
        <textarea className="qf-field" rows={3} placeholder="Contexte, notes spéciales…" value={data.description || ''} onChange={e => setData(d => ({ ...d, description: e.target.value }))} style={{ resize: 'vertical' }} />
      </div>
    </div>
  );
}

/* ─── Step 2 : Prestations ─────────────────────────────────────── */
function Step2Prestations({ groups, setGroups }) {
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showOublis, setShowOublis] = useState(true);

  const totalHT = groups.reduce((s, g) => s + g.postes.reduce((ps, p) => ps + (p.qty || 0) * (p.price || 0), 0), 0);

  const generateAI = () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setTimeout(() => {
      const postes = SERVICE_SUGGESTIONS.map(s => ({ ...newPoste(s.label), unit: s.unit, price: s.price }));
      setGroups(g => g.map((gr, i) => i === 0 ? { ...gr, postes: [...gr.postes, ...postes] } : gr));
      setAiLoading(false);
      setAiPrompt('');
    }, 1200);
  };

  const toggleGroup = id => setGroups(g => g.map(gr => gr.id === id ? { ...gr, expanded: !gr.expanded } : gr));
  const addGroup = () => setGroups(g => [...g, newGroup()]);
  const removeGroup = id => setGroups(g => g.filter(gr => gr.id !== id));
  const renameGroup = (id, name) => setGroups(g => g.map(gr => gr.id === id ? { ...gr, name } : gr));
  const addPoste = id => setGroups(g => g.map(gr => gr.id === id ? { ...gr, postes: [...gr.postes, newPoste()] } : gr));
  const removePoste = (gid, pid) => setGroups(g => g.map(gr => gr.id === gid ? { ...gr, postes: gr.postes.filter(p => p.id !== pid) } : gr));
  const updatePoste = (gid, pid, field, val) => setGroups(g => g.map(gr =>
    gr.id === gid ? { ...gr, postes: gr.postes.map(p => p.id === pid ? { ...p, [field]: val } : p) } : gr
  ));

  return (
    <div className="qf-fadein">
      {showOublis && (
        <div className="qf-gold-alert" style={{ marginBottom: 20 }}>
          <AlertTriangle style={{ width: 16, height: 16, color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>L'IA a détecté des oublis potentiels</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {OUBLIS_IA.map((o, i) => (
                <li key={i} className="qf-mono" style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 2 }}>· {o}</li>
              ))}
            </ul>
          </div>
          <button onClick={() => setShowOublis(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      <div className="qf-ai-panel" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Sparkles style={{ width: 16, height: 16, color: 'var(--accent)' }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>Générateur IA</span>
          <span className="qf-mono" style={{ fontSize: 10, color: 'var(--accent)', opacity: 0.65 }}>BÊTA</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 12 }}>
          Décrivez la prestation — l'IA génère les postes automatiquement.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="qf-field"
            style={{ flex: 1, border: '1.5px solid var(--accent)' }}
            placeholder="Ex: Grand ménage 4 pièces + vitres, 1 jour, Paris 7e…"
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generateAI()}
          />
          <button className="qf-btn-sm qf-btn-accent" onClick={generateAI} disabled={aiLoading} style={{ flexShrink: 0, border: 'none' }}>
            {aiLoading ? <Loader style={{ width: 13, height: 13, animation: 'spin 0.7s linear infinite' }} /> : <Sparkles style={{ width: 13, height: 13 }} />}
            {aiLoading ? 'Génération…' : 'Générer'}
          </button>
        </div>
      </div>

      {groups.map(group => {
        const groupTotal = group.postes.reduce((s, p) => s + (p.qty || 0) * (p.price || 0), 0);
        return (
          <div key={group.id} className="qf-section" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            <div className="qf-group-header" style={{ borderRadius: 0 }} onClick={() => toggleGroup(group.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {group.expanded ? <ChevronUp style={{ width: 15, height: 15, color: 'var(--ink-3)' }} /> : <ChevronDown style={{ width: 15, height: 15, color: 'var(--ink-3)' }} />}
                <input
                  className="qf-mono"
                  style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, color: 'var(--ink)', cursor: 'text' }}
                  value={group.name}
                  onClick={e => e.stopPropagation()}
                  onChange={e => renameGroup(group.id, e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="qf-mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{fmtEur(groupTotal)}</span>
                {groups.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); removeGroup(group.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
                    <X style={{ width: 13, height: 13 }} />
                  </button>
                )}
              </div>
            </div>
            {group.expanded && (
              <div style={{ padding: '0 16px 14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px 32px', gap: 8, padding: '8px 0 4px', borderBottom: '1px solid var(--line)' }}>
                  {['Désignation', 'Qté', 'Unité', 'Prix unit.', ''].map((h, i) => (
                    <span key={i} className="qf-label" style={{ fontSize: 10 }}>{h}</span>
                  ))}
                </div>
                {group.postes.map(p => (
                  <div key={p.id} className="qf-poste-row">
                    <input className="qf-field" style={{ padding: '7px 10px', fontSize: 13 }} placeholder="Désignation" value={p.label} onChange={e => updatePoste(group.id, p.id, 'label', e.target.value)} />
                    <input className="qf-field qf-mono" style={{ padding: '7px 8px', fontSize: 13, textAlign: 'right' }} type="number" min="0" step="0.5" value={p.qty} onChange={e => updatePoste(group.id, p.id, 'qty', parseFloat(e.target.value) || 0)} />
                    <select className="qf-field" style={{ padding: '7px 8px', fontSize: 12 }} value={p.unit} onChange={e => updatePoste(group.id, p.id, 'unit', e.target.value)}>
                      {['forfait', 'heure', 'jour', 'mois', 'm²', 'kg', 'visite'].map(u => <option key={u}>{u}</option>)}
                    </select>
                    <input className="qf-field qf-mono" style={{ padding: '7px 8px', fontSize: 13, textAlign: 'right' }} type="number" min="0" step="0.01" value={p.price} onChange={e => updatePoste(group.id, p.id, 'price', parseFloat(e.target.value) || 0)} />
                    <button onClick={() => removePoste(group.id, p.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 4, borderRadius: 6 }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--warm)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-4)'}>
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                ))}
                <button className="qf-btn-sm" style={{ marginTop: 8 }} onClick={() => addPoste(group.id)}>
                  <Plus style={{ width: 12, height: 12 }} /> Ajouter un poste
                </button>
              </div>
            )}
          </div>
        );
      })}

      <button className="qf-btn-sm" onClick={addGroup} style={{ marginBottom: 16 }}>
        <Plus style={{ width: 12, height: 12 }} /> Ajouter un groupe
      </button>
      <div style={{ textAlign: 'right', padding: '12px 0', borderTop: '2px solid var(--line)' }}>
        <span className="qf-label" style={{ marginRight: 12 }}>Total HT</span>
        <span className="qf-mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{fmtEur(totalHT)}</span>
      </div>
    </div>
  );
}

/* ─── Step 3 : Conditions ──────────────────────────────────────── */
function Step3Conditions({ data, setData }) {
  return (
    <div className="qf-section qf-fadein">
      <h2 className="qf-display" style={{ fontSize: 22, marginBottom: 20, fontStyle: 'italic' }}>Conditions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          { label: 'Date de validité', type: 'date',   key: 'expiry_date', placeholder: '' },
          { label: 'Délai d\'intervention', type: 'text', key: 'delay', placeholder: 'Ex: Dès la semaine prochaine' },
        ].map(f => (
          <div key={f.key}>
            <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>{f.label}</label>
            <input type={f.type} className="qf-field" placeholder={f.placeholder} value={data[f.key] || ''} onChange={e => setData(d => ({ ...d, [f.key]: e.target.value }))} />
          </div>
        ))}
        <div>
          <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Mode de paiement</label>
          <select className="qf-field" value={data.payment_mode || 'virement'} onChange={e => setData(d => ({ ...d, payment_mode: e.target.value }))}>
            {['virement', 'chèque', 'espèces', 'prélèvement', 'carte'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Délai de paiement</label>
          <select className="qf-field" value={data.payment_delay || '30 jours'} onChange={e => setData(d => ({ ...d, payment_delay: e.target.value }))}>
            {['À réception', '15 jours', '30 jours', '45 jours', '60 jours'].map(opt => <option key={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>TVA</label>
          <select className="qf-field" value={data.tva || '20'} onChange={e => setData(d => ({ ...d, tva: e.target.value }))}>
            {['0', '5.5', '10', '20'].map(t => <option key={t} value={t}>{t}%</option>)}
          </select>
        </div>
        <div>
          <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Remise globale (%)</label>
          <input type="number" min="0" max="100" className="qf-field qf-mono" value={data.discount || 0} onChange={e => setData(d => ({ ...d, discount: parseFloat(e.target.value) || 0 }))} />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <label className="qf-label" style={{ display: 'block', marginBottom: 6 }}>Notes / conditions particulières</label>
        <textarea className="qf-field" rows={4} placeholder="Conditions particulières, notes au client…" value={data.notes || ''} onChange={e => setData(d => ({ ...d, notes: e.target.value }))} style={{ resize: 'vertical' }} />
      </div>
    </div>
  );
}

/* ─── Step 4 : Récapitulatif ───────────────────────────────────── */
function Step4Recap({ formData, groups, leads }) {
  const lead = leads.find(l => l.id === formData.lead_id);
  const totalHT = groups.reduce((s, g) => s + g.postes.reduce((ps, p) => ps + (p.qty || 0) * (p.price || 0), 0), 0);
  const discount = ((formData.discount || 0) / 100) * totalHT;
  const base = totalHT - discount;
  const tva = ((parseFloat(formData.tva) || 20) / 100) * base;
  const ttc = base + tva;

  return (
    <div className="qf-fadein">
      <div className="qf-section">
        <h2 className="qf-display" style={{ fontSize: 22, marginBottom: 20, fontStyle: 'italic' }}>Récapitulatif</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <div className="qf-label" style={{ marginBottom: 8 }}>Client</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{lead?.full_name || '—'}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{lead?.city || ''}</div>
          </div>
          <div>
            <div className="qf-label" style={{ marginBottom: 8 }}>Devis</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{formData.title || '(sans titre)'}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>Validité : {formData.expiry_date || 'non définie'}</div>
          </div>
        </div>
        {groups.map(g => (
          <div key={g.id} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{g.name}</div>
            {g.postes.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line-2)', fontSize: 13 }}>
                <span style={{ color: 'var(--ink-2)' }}>{p.label || '(poste sans nom)'} — {p.qty} {p.unit}</span>
                <span className="qf-mono" style={{ fontWeight: 600 }}>{fmtEur((p.qty || 0) * (p.price || 0))}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ paddingTop: 16, borderTop: '2px solid var(--line)' }}>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>
              <span>Remise ({formData.discount}%)</span><span className="qf-mono">- {fmtEur(discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>
            <span>Total HT</span><span className="qf-mono">{fmtEur(base)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)', marginBottom: 8 }}>
            <span>TVA ({formData.tva || 20}%)</span><span className="qf-mono">{fmtEur(tva)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>
            <span>Total TTC</span>
            <span className="qf-mono" style={{ color: 'var(--accent)' }}>{fmtEur(ttc)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar ──────────────────────────────────────────────────── */
function Sidebar({ groups, formData, leads }) {
  const lead = leads.find(l => l.id === formData.lead_id);
  const totalHT = groups.reduce((s, g) => s + g.postes.reduce((ps, p) => ps + (p.qty || 0) * (p.price || 0), 0), 0);
  const discount = ((formData.discount || 0) / 100) * totalHT;
  const base = totalHT - discount;
  const tva = ((parseFloat(formData.tva) || 20) / 100) * base;
  const ttc = base + tva;
  const proba = 87;

  return (
    <div className="qf-sidebar">
      <div className="qf-sidebar-card">
        <div className="qf-label" style={{ marginBottom: 10 }}>Totaux</div>
        <div className="qf-mono" style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', lineHeight: 1, marginBottom: 4 }}>{fmtEur(ttc)}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12 }}>TTC · {fmtEur(base)} HT</div>
        {[['Total HT', fmtEur(base)], [`TVA ${formData.tva || 20}%`, fmtEur(tva)], ['Total TTC', fmtEur(ttc)]].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-2)', marginBottom: 3 }}>
            <span>{l}</span><span className="qf-mono" style={{ fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>

      <div className="qf-sidebar-card">
        <div className="qf-label" style={{ marginBottom: 8 }}>Probabilité de signature</div>
        <div className="qf-mono" style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{proba}%</div>
        <div className="qf-proba-bar"><div className="qf-proba-fill" style={{ width: `${proba}%` }} /></div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Basé sur les devis similaires</div>
      </div>

      {lead && (
        <div className="qf-sidebar-card">
          <div className="qf-label" style={{ marginBottom: 10 }}>Client</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontFamily: "'Fraunces', serif", fontWeight: 700, border: '1.5px solid oklch(0.8 0.07 165)', flexShrink: 0 }}>
              {(lead.full_name || '?').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{lead.full_name}</div>
              <div className="qf-mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>{lead.city || ''}</div>
            </div>
          </div>
        </div>
      )}

      <div className="qf-sidebar-card">
        <div className="qf-label" style={{ marginBottom: 10 }}>Devis similaires acceptés</div>
        {DEMO_SIMILAR.map(s => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--line-2)', fontSize: 12 }}>
            <div>
              <div className="qf-mono" style={{ color: 'var(--ink-3)', fontSize: 10 }}>{s.number}</div>
              <div style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{s.client}</div>
            </div>
            <span className="qf-mono" style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>{fmtEur(s.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────── */
export default function QuoteForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [step, setStep] = useState(1);
  const [leads, setLeads] = useState(DEMO_LEADS);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [formData, setFormData] = useState({
    lead_id: null, title: '', description: '',
    expiry_date: '', delay: '', payment_mode: 'virement',
    payment_delay: '30 jours', tva: '20', discount: 0, notes: '',
  });
  const [groups, setGroups] = useState([newGroup('Prestations principales')]);

  useEffect(() => {
    api.get('/leads', { params: { page_size: 500 } })
      .then(r => {
        const raw = r.data?.items || r.data || [];
        const mapped = (Array.isArray(raw) ? raw : []).map(l => ({
          id: l.lead_id,
          full_name: l.name || l.full_name || 'Inconnu',
          city: l.address || l.city || '',
          email: l.email || '',
          phone: l.phone || '',
        }));
        setLeads(mapped.length ? mapped : DEMO_LEADS);
      })
      .catch(() => setLeads(DEMO_LEADS));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/quotes/${id}`).then(r => {
      const q = r.data;
      if (!q) return;
      setFormData(prev => ({
        ...prev,
        lead_id: q.lead_id || null,
        title: q.title || '',
        description: q.details || '',
        expiry_date: q.expiry_date || '',
        payment_mode: q.payment_mode || 'virement',
        payment_delay: q.payment_delay || '30 jours',
        tva: String(q.tva_rate ?? 20),
        discount: q.discount || 0,
        notes: q.notes || '',
      }));
      if (q.line_items?.length) {
        const groupMap = {};
        q.line_items.forEach(item => {
          const gname = item.group || 'Prestations principales';
          if (!groupMap[gname]) groupMap[gname] = { id: Date.now() + Math.random(), name: gname, expanded: true, postes: [] };
          const poste = newPoste(item.label || '');
          poste.qty = item.qty || 1;
          poste.unit = item.unit || 'forfait';
          poste.price = item.price || 0;
          groupMap[gname].postes.push(poste);
        });
        const rebuilt = Object.values(groupMap);
        if (rebuilt.length) setGroups(rebuilt);
      }
    }).catch(() => {});
  }, [id, isEdit]);

  useEffect(() => {
    if (!formData.lead_id && !formData.title) return;
    const t = setTimeout(() => setLastSaved(new Date()), 3000);
    return () => clearTimeout(t);
  }, [formData, groups]);

  const canNext = useCallback(() => {
    if (step === 1) return Boolean(formData.lead_id && formData.title.trim());
    if (step === 2) return groups.some(g => g.postes.some(p => p.label.trim() && p.price > 0));
    return true;
  }, [step, formData, groups]);

  const handleSave = async (andSend = false) => {
    setSaving(true);
    const totalHT = groups.reduce((s, g) => s + g.postes.reduce((ps, p) => ps + (p.qty || 0) * (p.price || 0), 0), 0);
    const tvaRate = parseFloat(formData.tva) || 20;
    const base = totalHT * (1 - (formData.discount || 0) / 100);
    const amount = base * (1 + tvaRate / 100);
    const line_items = groups.flatMap(g => g.postes.map(p => ({
      group: g.name, label: p.label, qty: p.qty, unit: p.unit, price: p.price,
    })));
    const payload = {
      lead_id: formData.lead_id,
      service_type: formData.title || 'Autre',
      title: formData.title,
      amount,
      details: formData.description || '',
      expiry_date: formData.expiry_date || null,
      payment_mode: formData.payment_mode,
      payment_delay: formData.payment_delay,
      tva_rate: tvaRate,
      discount: formData.discount || 0,
      notes: formData.notes || '',
      line_items,
      status: andSend ? 'envoyé' : 'brouillon',
    };
    try {
      if (isEdit) await api.patch(`/quotes/${id}`, payload);
      else await api.post('/quotes', payload);
      navigate('/quotes');
    } catch {
      setLastSaved(new Date());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="qf-root">
      <style>{tokenStyle}</style>

      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/quotes')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Devis
        </button>
        <ChevronRight style={{ width: 13, height: 13, color: 'var(--ink-4)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
          {isEdit ? `Modifier devis #${id}` : 'Nouveau devis'}
        </span>
      </div>

      <Stepper current={step} />

      <div style={{ display: 'flex', gap: 24, padding: '24px', alignItems: 'flex-start', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {step === 1 && <Step1Client data={formData} setData={setFormData} leads={leads} />}
          {step === 2 && <Step2Prestations groups={groups} setGroups={setGroups} />}
          {step === 3 && <Step3Conditions data={formData} setData={setFormData} />}
          {step === 4 && <Step4Recap formData={formData} groups={groups} leads={leads} />}
        </div>
        <Sidebar groups={groups} formData={formData} leads={leads} />
      </div>

      <div className="qf-footbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {step > 1 && (
            <button className="qf-footbar-btn qf-footbar-btn-ghost" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft style={{ width: 14, height: 14 }} /> Précédent
            </button>
          )}
          {lastSaved && (
            <span className="qf-mono" style={{ fontSize: 10, opacity: 0.45 }}>
              Sauvegardé {lastSaved.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="qf-footbar-btn qf-footbar-btn-secondary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader style={{ width: 13, height: 13, animation: 'spin 0.7s linear infinite' }} /> : <Save style={{ width: 13, height: 13 }} />}
            Enregistrer brouillon
          </button>
          {step < 4 ? (
            <button
              className="qf-footbar-btn qf-footbar-btn-primary"
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              style={{ opacity: canNext() ? 1 : 0.4, cursor: canNext() ? 'pointer' : 'not-allowed' }}
            >
              Étape suivante <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          ) : (
            <button className="qf-footbar-btn qf-footbar-btn-primary" onClick={() => handleSave(true)} disabled={saving}>
              <Send style={{ width: 13, height: 13 }} /> Enregistrer et envoyer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
