// DocumentsBibliotheque.jsx — « La bibliothèque ».
// Identité : étagères de livres rangés par type, couvertures colorées par
// catégorie, tranches visibles. Palette sépia + émeraude.

import React, { useMemo, useState } from 'react';
import { useDocumentsList, useDeleteDocument } from '../../hooks/api';
import {
  Search, Upload, FileText, Image as ImgIcon, File, Download, Trash2,
  Filter, BookOpen, FolderOpen, Calendar,
} from 'lucide-react';
import api from '../../lib/api';

const tokenStyle = `
  .bib-root {
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
    --sepia: oklch(0.55 0.08 65);
    --sepia-soft: oklch(0.92 0.04 65);
    --gold: oklch(0.72 0.13 85);
    --warm: oklch(0.62 0.14 45);
    --cool: oklch(0.55 0.08 220);
    --cool-soft: oklch(0.93 0.04 220);
  }
  .bib-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .bib-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .bib-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; }
  .bib-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                 text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .bib-italic  { font-style: italic; color: var(--sepia); font-weight: 400; }

  /* Étagère */
  .bib-shelf {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 14px; padding: 24px; margin-bottom: 20px;
  }
  .bib-shelf-title {
    display: flex; align-items: baseline; gap: 10px;
    padding-bottom: 14px; margin-bottom: 16px;
    border-bottom: 2px solid var(--sepia);
  }

  /* Livre (doc) */
  .bib-book {
    position: relative; height: 160px; border-radius: 6px 3px 3px 6px;
    padding: 16px 14px 12px;
    background: linear-gradient(135deg, var(--tint-2) 0%, var(--tint-1) 100%);
    border: 1px solid var(--tint-border);
    box-shadow: inset -3px 0 0 rgba(0,0,0,0.08), 2px 2px 6px rgba(0,0,0,0.08);
    cursor: pointer; transition: transform .2s;
    display: flex; flex-direction: column; justify-content: space-between;
    overflow: hidden;
  }
  .bib-book:hover { transform: translateY(-4px) rotateZ(-0.5deg); }
  .bib-book-actions {
    position: absolute; top: 8px; right: 8px;
    display: flex; gap: 3px; opacity: 0; transition: opacity .15s;
  }
  .bib-book:hover .bib-book-actions { opacity: 1; }
  .bib-book-btn {
    width: 24px; height: 24px; border-radius: 5px;
    background: rgba(255,255,255,0.9); color: var(--ink-2);
    display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--line); cursor: pointer; transition: all .15s;
  }
  .bib-book-btn:hover { background: white; color: var(--ink); }
  .bib-book-btn.danger:hover { color: oklch(0.55 0.18 25); }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .bib-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .bib-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .bib-header-title { font-size: 36px !important; }
    .bib-body { padding: 0 20px 40px !important; }
  }
`;

const TYPE_META = {
  pdf:    { label: 'PDF',        tint1: 'oklch(0.94 0.08 25)',  tint2: 'oklch(0.98 0.04 25)',  border: 'oklch(0.65 0.14 25)',  icon: FileText, ink: 'oklch(0.35 0.15 25)' },
  image:  { label: 'Photo',      tint1: 'var(--emerald-soft)',   tint2: 'oklch(0.98 0.02 165)', border: 'var(--emerald)',       icon: ImgIcon,  ink: 'oklch(0.3 0.12 165)' },
  doc:    { label: 'Document',   tint1: 'var(--cool-soft)',      tint2: 'oklch(0.98 0.02 220)', border: 'var(--cool)',          icon: FileText, ink: 'oklch(0.3 0.1 220)' },
  sheet:  { label: 'Tableur',    tint1: 'oklch(0.94 0.06 145)',  tint2: 'oklch(0.98 0.03 145)', border: 'oklch(0.55 0.13 145)', icon: FileText, ink: 'oklch(0.3 0.13 145)' },
  other:  { label: 'Autre',      tint1: 'var(--sepia-soft)',     tint2: 'oklch(0.98 0.02 65)',  border: 'var(--sepia)',         icon: File,     ink: 'oklch(0.28 0.08 65)' },
};

function inferType(doc) {
  const name = (doc.filename || doc.name || doc.original_filename || '').toLowerCase();
  const mime = (doc.mime_type || doc.content_type || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(name)) return 'image';
  if (/\.(xlsx?|csv|ods)$/i.test(name) || mime.includes('spreadsheet')) return 'sheet';
  if (/\.(docx?|odt|rtf|txt)$/i.test(name) || mime.includes('word') || mime.includes('text')) return 'doc';
  return 'other';
}

const fmtSize = (b) => {
  if (!b) return '';
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`;
  return `${(b / (1024 * 1024)).toFixed(1)} Mo`;
};
const fmtDate = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return ''; }
};

export default function DocumentsBibliotheque() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const { data: docs = [], isLoading, refetch } = useDocumentsList({});
  const deleteDoc = useDeleteDocument();

  const filtered = useMemo(() => {
    let arr = Array.isArray(docs) ? [...docs] : [];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(d =>
        (d.filename || d.name || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q)
      );
    }
    if (filter !== 'all') arr = arr.filter(d => inferType(d) === filter);
    arr.sort((a, b) => new Date(b.created_at || b.uploaded_at || 0) - new Date(a.created_at || a.uploaded_at || 0));
    return arr;
  }, [docs, search, filter]);

  /* Grouper par type */
  const grouped = useMemo(() => {
    const g = { pdf: [], image: [], doc: [], sheet: [], other: [] };
    for (const d of filtered) g[inferType(d)].push(d);
    return Object.entries(g).filter(([, arr]) => arr.length > 0);
  }, [filtered]);

  const handleDelete = async (doc) => {
    if (!window.confirm(`Supprimer le document "${doc.filename || doc.name}" ?`)) return;
    try {
      await deleteDoc.mutateAsync(doc.id || doc._id || doc.document_id);
      refetch();
    } catch { /* noop */ }
  };

  const handleDownload = (doc) => {
    const url = doc.url || doc.file_url || doc.download_url;
    if (url) window.open(url, '_blank');
  };

  return (
    <div className="bib-root">
      <style>{tokenStyle}</style>

      <div className="bib-header bib-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="bib-label" style={{ marginBottom: 12 }}>Documents · Archives</div>
          <h1 className="bib-display bib-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            La <em className="bib-italic">bibliothèque</em>
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {(docs || []).length} pièce{(docs || []).length > 1 ? 's' : ''} rangée{(docs || []).length > 1 ? 's' : ''} sur les étagères · {grouped.length} rayon{grouped.length > 1 ? 's' : ''}
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
              placeholder="Titre, catégorie…" className="bib-mono"
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12, color: 'var(--ink)' }}
            />
          </div>

          <label style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
            background: 'var(--ink)', color: 'var(--bg)', borderRadius: 999,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500,
            letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
          }}>
            <Upload style={{ width: 12, height: 12 }} /> Téléverser
            <input
              type="file"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const fd = new FormData(); fd.append('file', f);
                try { await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); refetch(); }
                catch { alert('Upload impossible'); }
              }}
            />
          </label>
        </div>
      </div>

      {/* Filtres rayon */}
      <div className="bib-body bib-fade" style={{ padding: '0 48px 20px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="bib-label"><Filter style={{ width: 11, height: 11, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} /> Rayon :</span>
          {[['all','Tout']].concat(Object.entries(TYPE_META).map(([k, m]) => [k, m.label])).map(([k, l]) => (
            <button key={k}
              onClick={() => setFilter(k)}
              style={{
                padding: '6px 14px', borderRadius: 999,
                border: `1px solid ${filter === k ? 'var(--ink)' : 'var(--line)'}`,
                background: filter === k ? 'var(--ink)' : 'var(--surface)',
                color: filter === k ? 'var(--bg)' : 'var(--ink-3)',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em',
                textTransform: 'uppercase', fontWeight: 500, cursor: 'pointer',
              }}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* Étagères */}
      <div className="bib-body bib-fade" style={{ padding: '0 48px 40px' }}>
        {isLoading ? (
          <div style={{ padding: 80, textAlign: 'center', fontStyle: 'italic', color: 'var(--ink-3)', fontFamily: 'Fraunces, serif' }}>
            Ouverture de la bibliothèque…
          </div>
        ) : grouped.length === 0 ? (
          <div style={{
            padding: 60, textAlign: 'center',
            background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 14,
            fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)',
          }}>
            Les étagères sont vides — téléverse ta première pièce.
          </div>
        ) : (
          grouped.map(([type, items]) => {
            const meta = TYPE_META[type];
            return (
              <div key={type} className="bib-shelf">
                <div className="bib-shelf-title">
                  <meta.icon style={{ width: 18, height: 18, color: meta.border }} />
                  <span className="bib-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)' }}>
                    Rayon <em style={{ color: meta.border }}>{meta.label}</em>
                  </span>
                  <span className="bib-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 'auto', letterSpacing: '0.06em' }}>
                    {items.length} pièce{items.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14,
                }}>
                  {items.map((d, i) => {
                    const style = {
                      '--tint-1': meta.tint1,
                      '--tint-2': meta.tint2,
                      '--tint-border': meta.border,
                    };
                    return (
                      <div key={d.id || d._id || i} className="bib-book" style={style}>
                        <div className="bib-book-actions">
                          <button className="bib-book-btn" title="Télécharger" onClick={() => handleDownload(d)}>
                            <Download style={{ width: 11, height: 11 }} />
                          </button>
                          <button className="bib-book-btn danger" title="Supprimer" onClick={() => handleDelete(d)}>
                            <Trash2 style={{ width: 11, height: 11 }} />
                          </button>
                        </div>
                        <div>
                          <meta.icon style={{ width: 22, height: 22, color: meta.ink, marginBottom: 10 }} />
                          <div className="bib-display" style={{
                            fontSize: 14, fontWeight: 500, color: meta.ink,
                            lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {d.filename || d.name || 'Sans titre'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="bib-mono" style={{ fontSize: 9, color: meta.ink, opacity: 0.75, letterSpacing: '0.04em' }}>
                            {fmtSize(d.size || d.file_size)}
                          </span>
                          {d.created_at && (
                            <span className="bib-mono" style={{ fontSize: 9, color: meta.ink, opacity: 0.6 }}>
                              {fmtDate(d.created_at || d.uploaded_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
