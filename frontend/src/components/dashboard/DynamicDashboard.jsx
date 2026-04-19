// DynamicDashboard.jsx — Dashboard entièrement personnalisable (Phase 1).
// - Layout persistant par utilisateur via GET/PUT /api/layouts/dashboard
// - Mode édition : drag&drop, redimensionnement (4/6/8/12 col), suppression, ajout
// - Catalogue de blocs via BLOCK_REGISTRY
// - Raccourci clavier : Ctrl+E (Cmd+E) pour toggle le mode édition
// - Polling des données sous-jacentes toutes les 30s

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Pencil, Save, Plus, X, GripVertical, Trash2, Undo2, RotateCcw, RefreshCw, Minus,
} from 'lucide-react';
import api from '../../lib/api';
import { BLOCK_REGISTRY, DEFAULT_BLOCKS } from './blocks';

const API = (typeof process !== 'undefined' && process.env.REACT_APP_API_URL) || '';

/* Tokens CSS (mêmes variables que l'ancien Dashboard) */
const tokenStyle = `
  .dyn-root {
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
  .dyn-root {
    background: var(--bg);
    min-height: 100vh;
    color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dyn-block-edit {
    position: relative;
    border: 2px dashed var(--line);
    border-radius: 14px;
    transition: border-color .15s;
  }
  .dyn-block-edit:hover { border-color: var(--accent); }
  .dyn-block-edit.dragging { opacity: 0.4; }
  .dyn-block-edit.drop-target { border-color: var(--accent); background: var(--accent-soft); }
  .dyn-block-edit-toolbar {
    position: absolute; top: 8px; right: 8px; z-index: 10;
    display: flex; gap: 4px;
    background: var(--ink); color: var(--bg);
    padding: 4px 6px; border-radius: 8px;
    opacity: 0; transition: opacity .15s;
    pointer-events: none;
  }
  .dyn-block-edit:hover .dyn-block-edit-toolbar { opacity: 1; pointer-events: auto; }
  .dyn-tool-btn {
    background: none; border: none; color: var(--bg); opacity: 0.7;
    padding: 4px 6px; cursor: pointer; border-radius: 4px;
    display: flex; align-items: center; gap: 3px;
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
  }
  .dyn-tool-btn:hover { opacity: 1; background: rgba(255,255,255,0.15); }
  .dyn-drag-handle { cursor: grab; }
  .dyn-drag-handle:active { cursor: grabbing; }
`;

/* ───── Chargement des données métier partagées entre blocs ──── */
function useDashboardData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const location = useLocation();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token') || localStorage.getItem('session_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const [dashR, finR, insR] = await Promise.all([
        axios.get(`${API}/api/stats/dashboard`, { params: { period: '30d' }, headers, withCredentials: true }).catch(() => ({ data: {} })),
        axios.get(`${API}/api/stats/financial`, { params: { period: '30d' }, headers, withCredentials: true }).catch(() => ({ data: {} })),
        axios.get(`${API}/api/ai/insights`, { headers, withCredentials: true }).catch(() => ({ data: { insights: [] } })),
      ]);
      setData({ ...dashR.data, financial: finR.data, insights: insR.data.insights || [] });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, location.key, tick]);

  // Polling 30s temps réel
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') setTick(t => t + 1); }, 30000);
    return () => clearInterval(id);
  }, []);
  // Refetch sur focus
  useEffect(() => {
    const onFocus = () => setTick(t => t + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return { data, loading, refresh: () => setTick(t => t + 1) };
}

/* ───── Chargement / sauvegarde du layout ─────────────────────── */
function useLayout(scope = 'dashboard') {
  const [blocks, setBlocks] = useState(null); // null = pas encore chargé
  const [history, setHistory] = useState([]); // pour undo
  const saveTimeout = useRef(null);

  useEffect(() => {
    api.get(`/layouts/${scope}`)
      .then(r => setBlocks(r.data?.blocks || DEFAULT_BLOCKS))
      .catch(() => setBlocks(DEFAULT_BLOCKS));
  }, [scope]);

  // Sauvegarde debouncée à 800ms après chaque modif
  const persist = useCallback((nextBlocks) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      api.put(`/layouts/${scope}`, { blocks: nextBlocks }).catch(() => {});
    }, 800);
  }, [scope]);

  const update = useCallback((updater) => {
    setBlocks(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (prev) setHistory(h => [...h.slice(-20), prev]); // garde 20 snapshots
      persist(next);
      return next;
    });
  }, [persist]);

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setBlocks(prev);
      persist(prev);
      return h.slice(0, -1);
    });
  }, [persist]);

  const reset = useCallback(async () => {
    if (!window.confirm('Réinitialiser la mise en page au défaut ?')) return;
    try {
      const r = await api.delete(`/layouts/${scope}`);
      setBlocks(r.data?.blocks || DEFAULT_BLOCKS);
      setHistory([]);
    } catch { /* ignore */ }
  }, [scope]);

  return { blocks, update, undo, reset, canUndo: history.length > 0 };
}

/* ───── Widget : toolbar au-dessus de chaque bloc (en mode édition) */
function BlockToolbar({ onRemove, onResize, currentWidth, onDragStart }) {
  const widthSteps = [4, 6, 8, 12];
  return (
    <div className="dyn-block-edit-toolbar">
      <button className="dyn-tool-btn dyn-drag-handle" draggable onDragStart={onDragStart} title="Glisser pour déplacer">
        <GripVertical style={{ width: 12, height: 12 }} />
      </button>
      {widthSteps.map(w => (
        <button key={w} className="dyn-tool-btn" onClick={() => onResize(w)}
          style={{ opacity: w === currentWidth ? 1 : 0.5, fontWeight: w === currentWidth ? 700 : 400 }}>
          {w === 12 ? 'Full' : w === 8 ? '2/3' : w === 6 ? '1/2' : '1/3'}
        </button>
      ))}
      <button className="dyn-tool-btn" onClick={onRemove} title="Supprimer" style={{ color: 'oklch(0.75 0.15 25)' }}>
        <Trash2 style={{ width: 12, height: 12 }} />
      </button>
    </div>
  );
}

/* ───── Modal catalogue : ajouter un bloc ─────────────────────── */
function AddBlockModal({ open, onClose, onAdd, existingTypes }) {
  if (!open) return null;
  const items = Object.entries(BLOCK_REGISTRY).map(([type, meta]) => ({ type, ...meta }));
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', borderRadius: 16, padding: 28, maxWidth: 720, width: '100%',
        maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 400, margin: 0 }}>Ajouter un bloc</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {items.map(item => {
            const used = existingTypes.includes(item.type);
            return (
              <button key={item.type} onClick={() => onAdd(item.type)}
                style={{
                  textAlign: 'left', padding: 18, borderRadius: 12, cursor: 'pointer',
                  border: '1.5px solid var(--line)', background: 'var(--surface-2)',
                  display: 'flex', gap: 14, alignItems: 'flex-start', transition: 'all .15s',
                  position: 'relative',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--surface-2)'; }}>
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>{item.description}</div>
                  {used && (
                    <span style={{
                      position: 'absolute', top: 14, right: 14,
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.1em',
                      textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999,
                      background: 'var(--accent)', color: 'white',
                    }}>Déjà placé</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ───── Composant principal ───────────────────────────────────── */
export default function DynamicDashboard() {
  const { data, loading: dataLoading, refresh } = useDashboardData();
  const { blocks, update, undo, reset, canUndo } = useLayout('dashboard');
  const [editMode, setEditMode] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [dragId, setDragId] = useState(null);

  // Raccourci Ctrl/Cmd+E pour toggle le mode édition
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setEditMode(m => !m);
      }
      if (e.key === 'Escape' && editMode) setEditMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editMode]);

  const existingTypes = useMemo(() => (blocks || []).map(b => b.type), [blocks]);

  const handleAdd = (type) => {
    const meta = BLOCK_REGISTRY[type];
    const newBlock = {
      id: `${type}-${Date.now().toString(36)}`,
      type,
      w: meta?.defaultWidth || 12,
    };
    update(prev => [...(prev || []), newBlock]);
    setAddOpen(false);
  };

  const handleRemove = (id) => update(prev => (prev || []).filter(b => b.id !== id));

  const handleResize = (id, w) => update(prev => (prev || []).map(b => b.id === id ? { ...b, w } : b));

  const handleDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;
    update(prev => {
      const arr = [...(prev || [])];
      const from = arr.findIndex(b => b.id === dragId);
      const to = arr.findIndex(b => b.id === targetId);
      if (from < 0 || to < 0) return arr;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
    setDragId(null);
  };

  if (!blocks) {
    return (
      <div className="dyn-root" style={{ padding: 56 }}>
        <style>{tokenStyle}</style>
        <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)' }}>
          Chargement du dashboard…
        </div>
      </div>
    );
  }

  return (
    <div className="dyn-root">
      <style>{tokenStyle}</style>

      {/* Barre d'outils du dashboard */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)', borderBottom: '1px solid var(--line)',
        padding: '14px 40px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, flex: 1 }}>
          {editMode ? (
            <span><em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Mode édition</em> · glissez, redimensionnez, ajoutez vos blocs</span>
          ) : (
            <span>Atelier · votre tableau de bord</span>
          )}
        </div>

        <button onClick={refresh} disabled={dataLoading} title="Rafraîchir les données"
          style={btnGhost(dataLoading)}>
          <RefreshCw style={{ width: 12, height: 12, animation: dataLoading ? 'spin 0.7s linear infinite' : 'none' }} />
          Rafraîchir
        </button>

        {editMode && (
          <>
            <button onClick={undo} disabled={!canUndo} title="Annuler" style={btnGhost(!canUndo)}>
              <Undo2 style={{ width: 12, height: 12 }} />
              Annuler
            </button>
            <button onClick={reset} title="Réinitialiser" style={btnGhost(false)}>
              <RotateCcw style={{ width: 12, height: 12 }} />
              Réinitialiser
            </button>
            <button onClick={() => setAddOpen(true)} style={btnAccent}>
              <Plus style={{ width: 12, height: 12 }} />
              Ajouter un bloc
            </button>
          </>
        )}

        <button onClick={() => setEditMode(m => !m)} style={editMode ? btnDone : btnEdit} title="Ctrl+E">
          {editMode ? <Save style={{ width: 12, height: 12 }} /> : <Pencil style={{ width: 12, height: 12 }} />}
          {editMode ? 'Terminer' : 'Personnaliser'}
        </button>
      </div>

      {/* Grille des blocs */}
      <div style={{ padding: '32px 40px 120px', maxWidth: 1440, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20, alignItems: 'start' }}>
          {blocks.length === 0 && (
            <div style={{
              gridColumn: 'span 12', padding: 60, textAlign: 'center',
              border: '2px dashed var(--line)', borderRadius: 16, color: 'var(--ink-3)',
            }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, marginBottom: 8 }}>Dashboard vide</div>
              <div style={{ fontSize: 13, marginBottom: 16 }}>Activez le mode édition et ajoutez vos premiers blocs.</div>
              <button onClick={() => { setEditMode(true); setAddOpen(true); }} style={btnAccent}>
                <Plus style={{ width: 12, height: 12 }} /> Ajouter un bloc
              </button>
            </div>
          )}

          {blocks.map(block => {
            const meta = BLOCK_REGISTRY[block.type];
            if (!meta) return null;
            const Component = meta.component;
            const w = block.w || meta.defaultWidth || 12;
            return (
              <div key={block.id}
                   className={editMode ? `dyn-block-edit ${dragId === block.id ? 'dragging' : ''}` : ''}
                   onDragOver={editMode ? handleDragOver : undefined}
                   onDrop={editMode ? (e) => handleDrop(e, block.id) : undefined}
                   style={{ gridColumn: `span ${w}`, minWidth: 0 }}>
                {editMode && (
                  <BlockToolbar
                    onRemove={() => handleRemove(block.id)}
                    onResize={(w) => handleResize(block.id, w)}
                    currentWidth={w}
                    onDragStart={(e) => handleDragStart(e, block.id)}
                  />
                )}
                <Component data={data} config={block.config} />
              </div>
            );
          })}
        </div>
      </div>

      <AddBlockModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
        existingTypes={existingTypes}
      />
    </div>
  );
}

/* Styles boutons partagés */
const btnBase = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '7px 14px', borderRadius: 999,
  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em',
  textTransform: 'uppercase', fontWeight: 500, cursor: 'pointer',
  transition: 'all .15s',
};
const btnGhost = (disabled) => ({
  ...btnBase,
  background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink-3)',
  opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
});
const btnEdit = { ...btnBase, background: 'var(--ink)', color: 'var(--bg)', border: '1px solid var(--ink)' };
const btnDone = { ...btnBase, background: 'var(--accent)', color: 'white', border: '1px solid var(--accent)' };
const btnAccent = { ...btnBase, background: 'var(--accent)', color: 'white', border: '1px solid var(--accent)' };
