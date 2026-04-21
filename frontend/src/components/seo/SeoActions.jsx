// SeoActions.jsx — /seo/ai/actions
// Bibliothèque d'actions SEO réutilisables (CRUD complet).
// 4 colonnes kanban : todo → in_progress → done → dropped.
// Permet de seed depuis les opportunités automatiquement.

import React, { useState } from 'react';
import {
  CheckCircle, Circle, Clock, ClipboardList, Loader2, Play, Plus, Sparkles,
  Target, Trash2, X, XCircle, Zap,
} from 'lucide-react';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, ErrorState, EmptyState,
  fmt,
} from './SeoShared';
import {
  useSeoActions, useCreateSeoAction, useUpdateSeoAction, useDeleteSeoAction,
  useSeedActionsFromOpportunities,
} from '../../hooks/api';

const TYPES = [
  { value: 'content',       label: 'Contenu',      tone: 'var(--emerald)' },
  { value: 'technical',     label: 'Technique',    tone: 'var(--navy)' },
  { value: 'ux',            label: 'UX',           tone: 'var(--gold)' },
  { value: 'performance',   label: 'Performance',  tone: 'var(--warm)' },
  { value: 'conversion',    label: 'Conversion',   tone: 'var(--rouge)' },
  { value: 'link_building', label: 'Liens',        tone: 'var(--cool)' },
];
const PRIORITIES = [
  { value: 'low',      label: 'Faible',    tone: 'var(--ink-4)' },
  { value: 'medium',   label: 'Moyenne',   tone: 'var(--navy)' },
  { value: 'high',     label: 'Haute',     tone: 'var(--warm)' },
  { value: 'critical', label: 'Critique',  tone: 'var(--rouge)' },
];

const STATUS_COLS = [
  { key: 'todo',        label: 'À faire',      icon: Circle,       tone: 'var(--ink-4)' },
  { key: 'in_progress', label: 'En cours',     icon: Loader2,      tone: 'var(--gold)' },
  { key: 'done',        label: 'Terminées',    icon: CheckCircle,  tone: 'var(--emerald)' },
  { key: 'dropped',     label: 'Abandonnées',  icon: XCircle,      tone: 'var(--ink-3)' },
];

function TypeBadge({ type }) {
  const t = TYPES.find((x) => x.value === type) || TYPES[0];
  return (
    <span className="seo-pill" style={{ color: t.tone, background: 'var(--surface-2)', borderColor: t.tone }}>
      {t.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const p = PRIORITIES.find((x) => x.value === priority) || PRIORITIES[1];
  return (
    <span className="seo-pill" style={{ color: p.tone, background: 'var(--surface-2)', borderColor: p.tone }}>
      {p.label}
    </span>
  );
}

function ActionCard({ action, onMove, onDelete }) {
  return (
    <div className="seo-card" style={{ padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <TypeBadge type={action.type} />
        <PriorityBadge priority={action.priority} />
      </div>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, marginBottom: 6, lineHeight: 1.3 }}>
        {action.title}
      </div>
      {action.impact_estimate && (
        <div style={{ fontSize: 11, color: 'var(--emerald)', fontWeight: 700, marginBottom: 6 }}>
          {action.impact_estimate}
        </div>
      )}
      {action.url && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>
          {action.url}
        </div>
      )}
      {action.query && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic', marginBottom: 8 }}>
          « {action.query} »
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, borderTop: '1px solid var(--line-2)', paddingTop: 8, marginTop: 6 }}>
        {STATUS_COLS.filter((s) => s.key !== action.status).map((s) => (
          <button key={s.key} onClick={() => onMove(action.action_id, s.key)}
            className="seo-chip" style={{ padding: '4px 8px', fontSize: 9 }}
            title={`Déplacer vers : ${s.label}`}>
            <s.icon style={{ width: 10, height: 10 }} /> {s.label}
          </button>
        ))}
        <button onClick={() => onDelete(action.action_id)}
          className="seo-chip" style={{
            padding: '4px 8px', fontSize: 9, borderColor: 'var(--rouge)', color: 'var(--rouge)',
          }} title="Supprimer">
          <Trash2 style={{ width: 10, height: 10 }} />
        </button>
      </div>
    </div>
  );
}

function NewActionModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '', description: '', type: 'content', priority: 'medium',
    url: '', query: '', impact_estimate: '', status: 'todo', notes: '',
  });
  const submit = (e) => {
    e.preventDefault();
    if (!form.title) return;
    onCreate(form);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'oklch(0.15 0.02 60 / 0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        style={{
          width: 540, maxWidth: '92vw', background: 'var(--paper)',
          borderRadius: 18, padding: 28, border: '1px solid var(--line)',
          boxShadow: '0 20px 80px rgba(0,0,0,0.25)',
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div className="seo-label">Nouvelle action SEO</div>
            <div className="seo-display" style={{ fontSize: 20, marginTop: 4 }}>Ajouter à la bibliothèque</div>
          </div>
          <button type="button" onClick={onClose} className="seo-chip" style={{ padding: 6, borderRadius: 8 }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="seo-label" style={{ display: 'block', marginBottom: 4 }}>Titre *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={inputStyle} placeholder="Ex: Passer page 1 — « ménage paris »" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="seo-label" style={{ display: 'block', marginBottom: 4 }}>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="seo-label" style={{ display: 'block', marginBottom: 4 }}>Priorité</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={inputStyle}>
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="seo-label" style={{ display: 'block', marginBottom: 4 }}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Ce qu'il faut faire concrètement." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="seo-label" style={{ display: 'block', marginBottom: 4 }}>URL concernée</label>
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
                style={inputStyle} placeholder="/menage-paris/" />
            </div>
            <div>
              <label className="seo-label" style={{ display: 'block', marginBottom: 4 }}>Requête cible</label>
              <input value={form.query} onChange={(e) => setForm({ ...form, query: e.target.value })}
                style={inputStyle} placeholder="ménage paris" />
            </div>
          </div>
          <div>
            <label className="seo-label" style={{ display: 'block', marginBottom: 4 }}>Impact estimé</label>
            <input value={form.impact_estimate} onChange={(e) => setForm({ ...form, impact_estimate: e.target.value })}
              style={inputStyle} placeholder="+30 clics/mois" />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} className="seo-chip">Annuler</button>
            <button type="submit" className="seo-cta">
              <Plus style={{ width: 14, height: 14 }} /> Créer l'action
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid var(--line)', background: 'var(--surface)',
  fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none',
};

export default function SeoActions() {
  const [filter, setFilter] = useState({});
  const [modal, setModal] = useState(false);
  const { data, isLoading, error } = useSeoActions(filter);
  const create = useCreateSeoAction();
  const update = useUpdateSeoAction();
  const del = useDeleteSeoAction();
  const seed = useSeedActionsFromOpportunities();

  if (isLoading && !data) return <LoadingState message="Chargement de la bibliothèque d'actions…" />;
  if (error) return <ErrorState message="Impossible de charger les actions." />;

  const actions = data?.actions || [];
  const stats = data?.stats || {};

  const byStatus = {
    todo: actions.filter((a) => a.status === 'todo'),
    in_progress: actions.filter((a) => a.status === 'in_progress'),
    done: actions.filter((a) => a.status === 'done'),
    dropped: actions.filter((a) => a.status === 'dropped'),
  };

  const onMove = async (id, status) => {
    try { await update.mutateAsync({ id, patch: { status } }); }
    catch (e) { console.error(e); }
  };
  const onDelete = async (id) => {
    if (!window.confirm('Supprimer cette action ?')) return;
    try { await del.mutateAsync(id); } catch (e) { console.error(e); }
  };
  const onCreate = async (body) => {
    try { await create.mutateAsync(body); setModal(false); } catch (e) { console.error(e); }
  };
  const onSeed = async () => {
    if (!window.confirm('Générer automatiquement des actions à partir des opportunités détectées ?')) return;
    try { await seed.mutateAsync(28); } catch (e) { console.error(e); }
  };

  const totalImpactClicks = actions
    .filter((a) => a.status !== 'done' && a.status !== 'dropped')
    .reduce((a, x) => a + (x.impact_clicks || 0), 0);

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="IA · Bibliothèque"
        title={<>Actions <em>SEO</em></>}
        subtitle="Centralise toutes les actions à mener. Trie par priorité, suit l'avancement, mesure l'impact."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onSeed} disabled={seed.isPending} className="seo-chip">
              <Sparkles style={{ width: 13, height: 13 }} />
              {seed.isPending ? 'Génération…' : 'Auto-générer'}
            </button>
            <button onClick={() => setModal(true)} className="seo-cta">
              <Plus style={{ width: 14, height: 14 }} /> Nouvelle action
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile label="Total actions" value={fmt(stats.total || 0)} tone="var(--navy)" icon={ClipboardList} />
        <KpiTile label="À faire" value={fmt(stats.todo || 0)} tone="var(--ink-4)" icon={Circle} />
        <KpiTile label="En cours" value={fmt(stats.in_progress || 0)} tone="var(--gold)" icon={Play} />
        <KpiTile label="Impact total pending" value={`+${fmt(totalImpactClicks)}`}
          tone="var(--emerald)" icon={Zap} sub="Clics/mois estimés" />
      </div>

      {/* Filtres rapides */}
      <div className="seo-card" style={{ padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span className="seo-label">Filtres rapides</span>
        <button onClick={() => setFilter({})} className={Object.keys(filter).length === 0 ? 'seo-chip active' : 'seo-chip'}>
          Tout
        </button>
        {PRIORITIES.map((p) => (
          <button key={p.value} onClick={() => setFilter({ priority: p.value })}
            className={filter.priority === p.value ? 'seo-chip active' : 'seo-chip'}
            style={{ color: p.tone }}>
            {p.label}
          </button>
        ))}
        {TYPES.slice(0, 4).map((t) => (
          <button key={t.value} onClick={() => setFilter({ type: t.value })}
            className={filter.type === t.value ? 'seo-chip active' : 'seo-chip'}
            style={{ color: t.tone }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Kanban */}
      {actions.length === 0 ? (
        <div className="seo-card" style={{ padding: 40 }}>
          <EmptyState icon={Target} title="Bibliothèque vide pour le moment"
            message='Clique "Auto-générer" pour importer les opportunités détectées, ou "Nouvelle action" pour en créer une.' />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {STATUS_COLS.map((col) => {
            const items = byStatus[col.key] || [];
            const Icon = col.icon;
            return (
              <div key={col.key}>
                <div style={{
                  padding: '10px 14px', borderRadius: 10, marginBottom: 10,
                  background: 'var(--surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon style={{ width: 14, height: 14, color: col.tone }} />
                    <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500 }}>{col.label}</span>
                  </div>
                  <span className="seo-mono" style={{ fontSize: 11, fontWeight: 700, color: col.tone }}>
                    {items.length}
                  </span>
                </div>
                {items.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', textAlign: 'center', padding: 14 }}>
                    Vide
                  </div>
                ) : (
                  items.map((a) => (
                    <ActionCard key={a.action_id} action={a} onMove={onMove} onDelete={onDelete} />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && <NewActionModal onClose={() => setModal(false)} onCreate={onCreate} />}
    </div>
  );
}
