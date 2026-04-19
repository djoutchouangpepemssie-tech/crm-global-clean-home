// InvoicesGrandLivre.jsx — « Le grand livre comptable ».
// Tableau comptable dense façon registre ancien avec colonnes
// Débit/Crédit, totalisations en pied, numérotation en tête.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, Download, Send, Check, AlertTriangle, CheckSquare, Trash2, X } from 'lucide-react';
import api from '../../lib/api';

/* ─────────────────── TOKENS + STYLES ─────────────────── */
const tokenStyle = `
  .gl-root {
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
  .gl-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .gl-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .gl-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .gl-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .gl-italic  { font-style: italic; color: var(--accent); font-weight: 400; }

  /* Grand livre : table comptable dense */
  .gl-ledger {
    width: 100%; border-collapse: collapse;
    background: var(--surface); border: 1px solid var(--ink-3);
  }
  .gl-ledger thead {
    background: var(--ink); color: var(--bg);
  }
  .gl-ledger thead th {
    padding: 14px 18px; text-align: left;
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.14em; text-transform: uppercase; font-weight: 500;
    border-right: 1px solid rgba(255,255,255,0.1);
  }
  .gl-ledger thead th:last-child { border-right: 0; }
  .gl-ledger thead th.text-right { text-align: right; }

  .gl-ledger tbody tr {
    border-top: 1px solid var(--line);
    transition: background .1s; cursor: pointer;
  }
  .gl-ledger tbody tr:hover { background: var(--accent-soft); }
  .gl-ledger tbody tr.selected { background: var(--accent-soft) !important; }

  .gl-check {
    width: 18px; height: 18px; border-radius: 3px;
    border: 1.5px solid var(--ink-3); background: transparent;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all .15s;
  }
  .gl-check:hover { border-color: var(--accent); }
  .gl-check.checked { background: var(--ink); border-color: var(--ink); color: var(--bg); }

  .gl-row-actions {
    display: flex; gap: 4px; justify-content: flex-end;
    opacity: 0; transition: opacity .15s;
  }
  .gl-ledger tbody tr:hover .gl-row-actions { opacity: 1; }
  .gl-row-btn {
    width: 26px; height: 26px; border-radius: 5px;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--line); background: var(--surface); color: var(--ink-3);
    cursor: pointer; transition: all .15s;
  }
  .gl-row-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
  .gl-row-btn.success:hover { border-color: oklch(0.50 0.15 145); color: oklch(0.50 0.15 145); background: oklch(0.94 0.06 145); }
  .gl-row-btn.danger:hover { border-color: oklch(0.55 0.18 25); color: oklch(0.55 0.18 25); background: oklch(0.94 0.08 25); }

  .gl-ledger td {
    padding: 14px 18px; vertical-align: top;
    border-right: 1px solid var(--line-2); font-size: 13px;
  }
  .gl-ledger td:last-child { border-right: 0; }
  .gl-ledger td.mono { font-family: 'JetBrains Mono', monospace; font-feature-settings: "tnum"; font-size: 12px; }
  .gl-ledger td.num  { text-align: right; font-family: 'Fraunces', serif; font-feature-settings: "tnum"; font-weight: 500; }

  /* Pied total */
  .gl-ledger tfoot { background: var(--surface-2); border-top: 2px solid var(--ink); }
  .gl-ledger tfoot td {
    padding: 16px 18px; font-family: 'JetBrains Mono', monospace;
    font-size: 11px; letter-spacing: 0.08em; font-weight: 600;
    text-transform: uppercase; border-right: 1px solid var(--line);
  }
  .gl-ledger tfoot td:last-child { border-right: 0; }
  .gl-ledger tfoot td.num { font-family: 'Fraunces', serif; text-transform: none; font-size: 18px; letter-spacing: 0; }

  /* Statut pills */
  .gl-status {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 4px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.12em;
    text-transform: uppercase; font-weight: 600; white-space: nowrap;
  }
  .gl-status-dot { width: 5px; height: 5px; border-radius: 999px; }

  /* Pill toggle */
  .gl-pill {
    display: inline-flex; padding: 3px; background: var(--surface);
    border: 1px solid var(--line); border-radius: 999px;
  }
  .gl-pill button {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; border: 0; background: transparent; color: var(--ink-3);
    padding: 6px 14px; border-radius: 999px; cursor: pointer; transition: all .15s;
  }
  .gl-pill button.active { background: var(--ink); color: var(--bg); }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .gl-fade { animation: fadeIn .3s ease; }

  @media (max-width: 960px) {
    .gl-header { padding: 18px 20px !important; flex-wrap: wrap !important; gap: 14px !important; }
    .gl-header-title { font-size: 36px !important; }
    .gl-body { padding: 0 20px 40px !important; }
    .gl-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .gl-ledger { min-width: 900px; }
    .gl-kpis-grid { grid-template-columns: 1fr 1fr !important; }
  }
`;

/* Chiffres romains pour folio */
function toRoman(num) {
  if (!num) return '';
  const map = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let r = '';
  for (const [v, s] of map) { while (num >= v) { r += s; num -= v; } }
  return r;
}

const STATUS_META = {
  'en_attente': { label: 'À régler',   color: 'oklch(0.60 0.14 85)',  dot: 'oklch(0.72 0.13 85)' },
  'payée':      { label: 'Soldée',     color: 'oklch(0.50 0.15 145)', dot: 'oklch(0.50 0.15 145)' },
  'payee':      { label: 'Soldée',     color: 'oklch(0.50 0.15 145)', dot: 'oklch(0.50 0.15 145)' },
  'en_retard':  { label: 'En retard',  color: 'oklch(0.55 0.18 25)',  dot: 'oklch(0.60 0.15 25)' },
  'annulée':    { label: 'Annulée',    color: 'oklch(0.52 0.010 60)', dot: 'oklch(0.52 0.010 60)' },
  'brouillon':  { label: 'Brouillon',  color: 'oklch(0.52 0.010 60)', dot: 'oklch(0.72 0.008 70)' },
};

const fmtEur = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
  catch { return '—'; }
};

export default function InvoicesGrandLivre() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/invoices', { params: { page_size: 200 } })
      .then(r => {
        const raw = r.data?.items || r.data || [];
        setInvoices(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const toggleSelect = (id) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  const downloadPdf = async (inv) => {
    try {
      const r = await api.get(`/invoices/${inv.invoice_id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${inv.invoice_number || inv.invoice_id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { showToast('PDF indisponible'); }
  };

  const sendInvoice = async (inv) => {
    if (!window.confirm(`Envoyer la facture ${inv.invoice_number || ''} par email ?`)) return;
    setBusy(true);
    try {
      await api.post(`/invoices/${inv.invoice_id}/send`);
      showToast('✓ Facture envoyée');
      load();
    } catch { showToast('Échec envoi'); }
    setBusy(false);
  };

  const markPaid = async (inv) => {
    if (!window.confirm(`Marquer la facture ${inv.invoice_number || ''} comme soldée ?`)) return;
    setBusy(true);
    try {
      await api.patch(`/invoices/${inv.invoice_id}`, { status: 'payée' });
      showToast('✓ Marquée soldée');
      load();
    } catch { showToast('Échec'); }
    setBusy(false);
  };

  const deleteInvoice = async (inv) => {
    if (!window.confirm(`Supprimer cette facture ? Réversible via la corbeille.`)) return;
    setBusy(true);
    try {
      await api.delete(`/invoices/${inv.invoice_id}`);
      showToast('✓ Facture supprimée');
      load();
    } catch { showToast('Suppression impossible'); }
    setBusy(false);
  };

  const bulkSend = async () => {
    if (!selected.size || !window.confirm(`Envoyer ${selected.size} facture(s) ?`)) return;
    setBusy(true);
    const r = await Promise.allSettled([...selected].map(id => api.post(`/invoices/${id}/send`)));
    const ok = r.filter(x => x.status === 'fulfilled').length;
    setSelected(new Set());
    showToast(`${ok} facture(s) envoyée(s)`);
    setBusy(false);
    load();
  };

  const bulkPdf = async () => {
    if (!selected.size) return;
    setBusy(true);
    for (const id of [...selected]) {
      const inv = invoices.find(x => x.invoice_id === id);
      if (inv) await downloadPdf(inv);
    }
    setBusy(false);
  };

  const bulkDelete = async () => {
    if (!selected.size || !window.confirm(`Supprimer ${selected.size} facture(s) ?`)) return;
    setBusy(true);
    const r = await Promise.allSettled([...selected].map(id => api.delete(`/invoices/${id}`)));
    const ok = r.filter(x => x.status === 'fulfilled').length;
    setSelected(new Set());
    showToast(`${ok} facture(s) supprimée(s)`);
    setBusy(false);
    load();
  };

  const filtered = useMemo(() => {
    let arr = [...invoices];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(i =>
        (i.invoice_number || '').toLowerCase().includes(q) ||
        (i.lead_name || '').toLowerCase().includes(q) ||
        (i.project || '').toLowerCase().includes(q)
      );
    }
    if (filter !== 'all') {
      arr = arr.filter(i => (i.status === filter) || (filter === 'payée' && i.status === 'payee'));
    }
    arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return arr;
  }, [invoices, search, filter]);

  const totals = useMemo(() => {
    const debit  = invoices.reduce((s, i) => s + (i.amount_ttc || i.amount || 0), 0);
    const credit = invoices.filter(i => ['payée','payee'].includes(i.status))
                           .reduce((s, i) => s + (i.amount_ttc || i.amount || 0), 0);
    const solde = debit - credit;
    const overdue = invoices.filter(i => i.status === 'en_retard')
                            .reduce((s, i) => s + (i.amount_ttc || i.amount || 0), 0);
    return { debit, credit, solde, overdue };
  }, [invoices]);

  return (
    <div className="gl-root">
      <style>{tokenStyle}</style>

      {/* HEADER */}
      <div className="gl-header gl-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '40px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="gl-label" style={{ marginBottom: 12 }}>
            Factures · Grand livre · Folio {toRoman(Math.max(1, filtered.length))}
          </div>
          <h1 className="gl-display gl-header-title" style={{
            fontSize: 56, fontWeight: 300, lineHeight: 0.95, margin: '0 0 6px', color: 'var(--ink)',
          }}>
            Le grand <em className="gl-italic">livre</em> comptable
          </h1>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 15, color: 'var(--ink-3)' }}>
            {invoices.length} écriture{invoices.length > 1 ? 's' : ''} · {fmtEur(totals.credit)} € encaissé · {fmtEur(totals.solde)} € à recouvrer
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
              placeholder="N° · client · chantier…" className="gl-mono"
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12, color: 'var(--ink)' }}
            />
          </div>
          <button onClick={() => api.get('/invoices/export', { responseType: 'blob' })
            .then(r => {
              const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
              const a = document.createElement('a'); a.href = url; a.download = `grand-livre-${new Date().toISOString().slice(0,10)}.csv`;
              document.body.appendChild(a); a.click(); a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }).catch(() => alert('Export impossible'))}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-2)', cursor: 'pointer',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
            <Download style={{ width: 12, height: 12 }} /> Export
          </button>
          <Link to="/invoices/new" style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
            background: 'var(--ink)', color: 'var(--bg)', borderRadius: 999,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500,
            letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none',
          }}>
            <Plus style={{ width: 12, height: 12 }} /> Nouvelle écriture
          </Link>
        </div>
      </div>

      {/* BODY */}
      <div className="gl-body gl-fade" style={{ padding: '0 48px 40px' }}>

        {/* Balance comptable */}
        <div className="gl-kpis-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14,
          overflow: 'hidden', marginBottom: 28,
        }}>
          {[
            { label: 'Débit total',      value: fmtEur(totals.debit),   sub: 'Émis TTC', tone: 'var(--ink)' },
            { label: 'Crédit',           value: fmtEur(totals.credit),  sub: 'Encaissé',  tone: 'oklch(0.50 0.15 145)' },
            { label: 'Solde débiteur',   value: fmtEur(totals.solde),   sub: 'À recouvrer', tone: 'var(--gold)' },
            { label: 'Impayés',          value: fmtEur(totals.overdue), sub: 'En retard', tone: 'oklch(0.55 0.18 25)' },
          ].map((k, i) => (
            <div key={i} style={{ padding: '22px 26px', borderRight: i < 3 ? '1px solid var(--line-2)' : 0 }}>
              <div className="gl-label" style={{ marginBottom: 8 }}>{k.label}</div>
              <div className="gl-display" style={{ fontSize: 28, fontWeight: 500, color: k.tone, lineHeight: 1 }}>
                {k.value} <span style={{ fontSize: 14, color: 'var(--ink-3)', fontStyle: 'italic' }}>€</span>
              </div>
              <div className="gl-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 5, letterSpacing: '0.08em' }}>
                {k.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Filtre statut */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="gl-label">Filtrer :</span>
          <div className="gl-pill">
            {[['all','Toutes'],['en_attente','À régler'],['payée','Soldées'],['en_retard','En retard'],['annulée','Annulées']].map(([k, l]) => (
              <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Grand livre */}
        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-3)', fontStyle: 'italic' }}>
            Ouverture du grand livre…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div className="gl-display" style={{ fontSize: 22, fontStyle: 'italic', color: 'var(--ink-2)' }}>
              Aucune écriture ne correspond à ta recherche.
            </div>
          </div>
        ) : (
          <div className="gl-table-wrap">
            <table className="gl-ledger">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th style={{ width: 50 }}>#</th>
                  <th>Référence</th>
                  <th>Client · Chantier</th>
                  <th style={{ width: 90 }}>Émise</th>
                  <th style={{ width: 90 }}>Échéance</th>
                  <th className="text-right" style={{ width: 110 }}>Débit HT</th>
                  <th className="text-right" style={{ width: 110 }}>Débit TTC</th>
                  <th style={{ width: 110 }}>Statut</th>
                  <th className="text-right" style={{ width: 130 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, idx) => {
                  const st = STATUS_META[inv.status] || STATUS_META.brouillon;
                  const isSelected = selected.has(inv.invoice_id);
                  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
                  const isPaid = ['payée', 'payee'].includes(inv.status);
                  return (
                    <tr
                      key={inv.invoice_id}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => navigate(`/invoices/${inv.invoice_id}`)}
                    >
                      <td onClick={(e) => { stop(e); toggleSelect(inv.invoice_id); }} style={{ cursor: 'pointer' }}>
                        <div className={`gl-check ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <CheckSquare style={{ width: 12, height: 12 }} />}
                        </div>
                      </td>
                      <td className="mono" style={{ color: 'var(--ink-3)' }}>{filtered.length - idx}</td>
                      <td className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        {inv.invoice_number || inv.invoice_id?.slice(-8).toUpperCase() || '—'}
                      </td>
                      <td>
                        <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, fontSize: 14, color: 'var(--ink)' }}>
                          {inv.lead_name || 'Client inconnu'}
                        </div>
                        <div className="gl-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                          {inv.project || inv.type || '—'}{inv.lead_city ? ` · ${inv.lead_city}` : ''}
                        </div>
                      </td>
                      <td className="mono" style={{ color: 'var(--ink-3)' }}>{fmtDate(inv.created_at)}</td>
                      <td className="mono" style={{ color: inv.status === 'en_retard' ? 'oklch(0.55 0.18 25)' : 'var(--ink-3)' }}>
                        {fmtDate(inv.due_date)}
                      </td>
                      <td className="num">{fmtEur(inv.amount || inv.amount_ht)}</td>
                      <td className="num" style={{ fontSize: 16 }}>
                        {fmtEur(inv.amount_ttc || inv.amount)}
                      </td>
                      <td>
                        <span className="gl-status" style={{ color: st.color, background: `color-mix(in oklch, ${st.color} 12%, transparent)`, border: `1px solid ${st.color}` }}>
                          <span className="gl-status-dot" style={{ background: st.dot }} />
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <div className="gl-row-actions">
                          <button
                            className="gl-row-btn"
                            onClick={(e) => { stop(e); sendInvoice(inv); }}
                            disabled={busy}
                            title="Envoyer par email"
                          >
                            <Send style={{ width: 12, height: 12 }} />
                          </button>
                          <button
                            className="gl-row-btn"
                            onClick={(e) => { stop(e); downloadPdf(inv); }}
                            title="Télécharger PDF"
                          >
                            <Download style={{ width: 12, height: 12 }} />
                          </button>
                          {!isPaid && (
                            <button
                              className="gl-row-btn success"
                              onClick={(e) => { stop(e); markPaid(inv); }}
                              disabled={busy}
                              title="Marquer soldée"
                            >
                              <Check style={{ width: 12, height: 12 }} />
                            </button>
                          )}
                          <button
                            className="gl-row-btn danger"
                            onClick={(e) => { stop(e); deleteInvoice(inv); }}
                            disabled={busy}
                            title="Supprimer"
                          >
                            <Trash2 style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="6" style={{ textAlign: 'right' }}>Totaux</td>
                  <td className="num" style={{ textAlign: 'right' }}>{fmtEur(filtered.reduce((s, i) => s + (i.amount || i.amount_ht || 0), 0))} €</td>
                  <td className="num" style={{ textAlign: 'right' }}>{fmtEur(filtered.reduce((s, i) => s + (i.amount_ttc || i.amount || 0), 0))} €</td>
                  <td colSpan="2">{filtered.length} écritures</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════ BARRE D'ACTIONS GROUPÉES ═══════════ */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 18px', borderRadius: 999,
          background: 'var(--ink)', color: 'var(--bg)',
          boxShadow: '0 8px 28px rgba(0,0,0,0.22)', zIndex: 50,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.06em',
        }}>
          <span style={{ textTransform: 'uppercase' }}>
            {selected.size} facture{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}
          </span>
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.25)' }} />
          <button onClick={bulkSend} disabled={busy}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 0, color: 'var(--bg)', cursor: 'pointer', padding: '6px 10px', borderRadius: 999, fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <Send style={{ width: 13, height: 13 }} /> Envoyer
          </button>
          <button onClick={bulkPdf} disabled={busy}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 0, color: 'var(--bg)', cursor: 'pointer', padding: '6px 10px', borderRadius: 999, fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <Download style={{ width: 13, height: 13 }} /> PDF
          </button>
          <button onClick={bulkDelete} disabled={busy}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 0, color: 'oklch(0.85 0.12 25)', cursor: 'pointer', padding: '6px 10px', borderRadius: 999, fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <Trash2 style={{ width: 13, height: 13 }} /> Supprimer
          </button>
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.25)' }} />
          <button onClick={() => setSelected(new Set())}
            style={{ display: 'flex', alignItems: 'center', background: 'transparent', border: 0, color: 'var(--bg)', cursor: 'pointer', padding: 4 }}
            title="Tout désélectionner">
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      {/* ═══════════ TOAST ═══════════ */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          padding: '12px 18px', borderRadius: 10,
          background: 'var(--ink)', color: 'var(--bg)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.2)', zIndex: 51,
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
