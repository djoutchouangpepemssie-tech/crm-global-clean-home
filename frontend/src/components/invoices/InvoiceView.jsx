// InvoiceView.jsx — visualisation d'une facture (lecture, style atelier).
// Route : /invoices/:id  (édition via /invoices/:id/edit)

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Download, Send, Trash2, User, Mail, Phone, MapPin,
  CheckCircle, Clock, FileText, AlertTriangle, Banknote,
} from 'lucide-react';
import api from '../../lib/api';

const tokenStyle = `
  .iv-root {
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
    --gold: oklch(0.72 0.13 85);
    --gold-soft: oklch(0.94 0.06 85);
    --rouge: oklch(0.48 0.15 25);
    --rouge-soft: oklch(0.94 0.07 25);
    --sepia: oklch(0.55 0.08 65);
  }
  .iv-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .iv-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .iv-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .iv-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .iv-italic  { font-style: italic; color: var(--emerald); font-weight: 400; }

  .iv-card {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 14px; overflow: hidden;
  }
  .iv-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    letter-spacing: 0.06em; text-transform: uppercase; font-weight: 500;
    cursor: pointer; transition: all .15s;
    border: 1px solid var(--line); background: var(--surface); color: var(--ink-2);
  }
  .iv-btn:hover { border-color: var(--ink-3); color: var(--ink); }
  .iv-btn.primary { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .iv-btn.primary:hover { opacity: 0.88; }
  .iv-btn.emerald { background: var(--emerald); color: white; border-color: var(--emerald); }
  .iv-btn.gold { background: var(--gold); color: var(--ink); border-color: var(--gold); }
  .iv-btn.danger { color: var(--rouge); border-color: var(--rouge); background: var(--rouge-soft); }

  .iv-status {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 12px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;
    border: 1px solid;
  }

  .iv-row {
    display: grid; grid-template-columns: 1fr 80px 110px 120px 120px;
    gap: 14px; align-items: center;
    padding: 14px 20px;
    border-bottom: 1px solid var(--line-2);
  }
  .iv-row:last-child { border-bottom: 0; }
  .iv-row.head {
    background: var(--ink); color: var(--bg);
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.12em; text-transform: uppercase; font-weight: 500;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .iv-fade { animation: fadeIn .3s ease; }

  @media (max-width: 760px) {
    .iv-header { padding: 20px 18px 16px !important; flex-wrap: wrap !important; }
    .iv-header-title { font-size: 32px !important; }
    .iv-body { padding: 0 18px 30px !important; }
    .iv-grid { grid-template-columns: 1fr !important; }
    .iv-row { grid-template-columns: 1fr 70px 90px !important; gap: 8px !important; padding: 12px 14px !important; }
    .iv-hide-mobile { display: none !important; }
  }
`;

const STATUS_META = {
  en_attente: { label: 'À régler',  color: 'var(--gold)',    bg: 'var(--gold-soft)',    icon: Clock },
  payée:      { label: 'Soldée',    color: 'var(--emerald)', bg: 'var(--emerald-soft)', icon: CheckCircle },
  payee:      { label: 'Soldée',    color: 'var(--emerald)', bg: 'var(--emerald-soft)', icon: CheckCircle },
  en_retard:  { label: 'En retard', color: 'var(--rouge)',   bg: 'var(--rouge-soft)',   icon: AlertTriangle },
  annulée:    { label: 'Annulée',   color: 'var(--ink-3)',   bg: 'var(--surface-2)',    icon: FileText },
  brouillon:  { label: 'Brouillon', color: 'var(--ink-3)',   bg: 'var(--surface-2)',    icon: FileText },
};

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return '—'; }
};

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (m, t = 'ok') => { setToast({ m, t }); setTimeout(() => setToast(null), 2800); };

  const load = () => {
    setLoading(true);
    api.get(`/invoices/${id}`)
      .then(r => { setInvoice(r.data); setErr(null); })
      .catch(e => setErr(e?.response?.data?.detail || 'Facture introuvable'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const totals = useMemo(() => {
    if (!invoice) return { ht: 0, tva: 0, ttc: 0 };
    const items = Array.isArray(invoice.line_items) ? invoice.line_items : [];
    const ht = items.length > 0
      ? items.reduce((s, it) => s + (Number(it.quantity || it.qty || 1) * Number(it.unit_price || it.price || 0) * (1 - Number(it.discount_percent || 0) / 100)), 0)
      : Number(invoice.amount || invoice.amount_ht || 0);
    const tvaRate = Number(invoice.tva_rate ?? 0);
    const tva = invoice.tva_amount != null ? Number(invoice.tva_amount) : ht * (tvaRate / 100);
    const ttc = invoice.amount_ttc || invoice.total_ttc || (ht + tva);
    return { ht, tva, ttc, tvaRate };
  }, [invoice]);

  const handleDownloadPdf = async () => {
    try {
      const r = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number || id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      showToast('PDF indisponible', 'err');
    }
  };

  const handleSend = async () => {
    if (!window.confirm('Envoyer cette facture par email ?')) return;
    setBusy(true);
    try {
      await api.post(`/invoices/${id}/send`);
      showToast('✓ Facture envoyée');
      load();
    } catch (e) {
      showToast(e?.response?.data?.detail || 'Échec envoi', 'err');
    }
    setBusy(false);
  };

  const handleMarkPaid = async () => {
    if (!window.confirm('Marquer cette facture comme soldée ?')) return;
    setBusy(true);
    try {
      await api.patch(`/invoices/${id}`, { status: 'payée' });
      showToast('✓ Facture marquée soldée');
      load();
    } catch (e) {
      showToast(e?.response?.data?.detail || 'Échec', 'err');
    }
    setBusy(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette facture ?')) return;
    setBusy(true);
    try {
      await api.delete(`/invoices/${id}`);
      showToast('✓ Facture supprimée');
      setTimeout(() => navigate('/invoices'), 900);
    } catch {
      showToast('Suppression impossible', 'err');
    }
    setBusy(false);
  };

  if (loading) {
    return (
      <div className="iv-root">
        <style>{tokenStyle}</style>
        <div style={{ padding: 80, textAlign: 'center', fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)' }}>
          Ouverture de la facture…
        </div>
      </div>
    );
  }

  if (err || !invoice) {
    return (
      <div className="iv-root">
        <style>{tokenStyle}</style>
        <div style={{ padding: '60px 48px' }}>
          <button className="iv-btn" onClick={() => navigate('/invoices')} style={{ marginBottom: 24 }}>
            <ArrowLeft style={{ width: 13, height: 13 }} /> Retour
          </button>
          <div style={{
            padding: 40, textAlign: 'center', border: '1px dashed var(--line)',
            borderRadius: 14, fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--rouge)',
          }}>
            {err || 'Facture introuvable'}
          </div>
        </div>
      </div>
    );
  }

  const status = STATUS_META[invoice.status] || STATUS_META.en_attente;
  const ref = invoice.invoice_number || id.slice(-8).toUpperCase();
  const isPaid = ['payée', 'payee'].includes(invoice.status);

  return (
    <div className="iv-root">
      <style>{tokenStyle}</style>

      <div className="iv-header iv-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '32px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <button onClick={() => navigate('/invoices')} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.08em',
            textTransform: 'uppercase', padding: 0, marginBottom: 14,
          }}>
            <ArrowLeft style={{ width: 12, height: 12 }} /> Le grand livre
          </button>

          <div className="iv-label" style={{ marginBottom: 8 }}>Facture · Ref. {ref}</div>
          <h1 className="iv-display iv-header-title" style={{
            fontSize: 48, fontWeight: 300, lineHeight: 0.95, margin: '0 0 10px', color: 'var(--ink)',
          }}>
            {invoice.project || invoice.service_type || `Facture ${ref}`}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="iv-status" style={{ color: status.color, background: status.bg, borderColor: status.color }}>
              <status.icon style={{ width: 11, height: 11 }} />
              {status.label}
            </span>
            <span className="iv-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
              Émise le {fmtDate(invoice.created_at || invoice.invoice_date)}
            </span>
            {invoice.due_date && (
              <span className="iv-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                · Échéance {fmtDate(invoice.due_date)}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="iv-btn primary" onClick={() => navigate(`/invoices/${id}/edit`)}>
            <Edit3 style={{ width: 13, height: 13 }} /> Éditer
          </button>
          <button className="iv-btn emerald" onClick={handleSend} disabled={busy}>
            <Send style={{ width: 13, height: 13 }} /> Envoyer
          </button>
          {!isPaid && (
            <button className="iv-btn gold" onClick={handleMarkPaid} disabled={busy}>
              <Banknote style={{ width: 13, height: 13 }} /> Marquer soldée
            </button>
          )}
          <button className="iv-btn" onClick={handleDownloadPdf}>
            <Download style={{ width: 13, height: 13 }} /> PDF
          </button>
          <button className="iv-btn danger" onClick={handleDelete} disabled={busy}>
            <Trash2 style={{ width: 13, height: 13 }} /> Supprimer
          </button>
        </div>
      </div>

      <div className="iv-body iv-fade" style={{ padding: '0 48px 40px' }}>
        <div className="iv-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18 }}>

          <div>
            {/* Client */}
            <div className="iv-card" style={{ marginBottom: 18 }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line-2)' }}>
                <div className="iv-label">Client</div>
              </div>
              <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <User style={{ width: 15, height: 15, color: 'var(--ink-3)' }} />
                  <div>
                    <div className="iv-display" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
                      {invoice.client_name || invoice.lead_name || '—'}
                    </div>
                    {invoice.lead_id && (
                      <Link to={`/leads/${invoice.lead_id}`} className="iv-mono" style={{
                        fontSize: 10, color: 'var(--emerald)', letterSpacing: '0.06em', textDecoration: 'none',
                      }}>
                        Voir le dossier complet →
                      </Link>
                    )}
                  </div>
                </div>
                {(invoice.client_email || invoice.lead_email) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Mail style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
                    <a href={`mailto:${invoice.client_email || invoice.lead_email}`} style={{ color: 'var(--ink-2)', textDecoration: 'none', fontSize: 13, fontFamily: 'Fraunces, serif' }}>
                      {invoice.client_email || invoice.lead_email}
                    </a>
                  </div>
                )}
                {(invoice.client_phone || invoice.lead_phone) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Phone style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
                    <a href={`tel:${invoice.client_phone || invoice.lead_phone}`} style={{ color: 'var(--ink-2)', textDecoration: 'none', fontSize: 13, fontFamily: 'Fraunces, serif' }}>
                      {invoice.client_phone || invoice.lead_phone}
                    </a>
                  </div>
                )}
                {(invoice.client_address || invoice.lead_address) && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <MapPin style={{ width: 14, height: 14, color: 'var(--ink-3)', marginTop: 2 }} />
                    <span style={{ color: 'var(--ink-2)', fontSize: 13, fontFamily: 'Fraunces, serif' }}>
                      {invoice.client_address || invoice.lead_address}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Lignes */}
            <div className="iv-card">
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line-2)' }}>
                <div className="iv-label">Prestations facturées</div>
                <h3 className="iv-display" style={{ fontSize: 20, fontWeight: 400, margin: '4px 0 0', color: 'var(--ink)' }}>
                  Détail des <em className="iv-italic">postes</em>
                </h3>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <div className="iv-row head">
                  <span>Désignation</span>
                  <span style={{ textAlign: 'right' }}>Qté</span>
                  <span className="iv-hide-mobile">Unité</span>
                  <span className="iv-hide-mobile" style={{ textAlign: 'right' }}>PU HT</span>
                  <span style={{ textAlign: 'right' }}>Total HT</span>
                </div>

                {(Array.isArray(invoice.line_items) && invoice.line_items.length > 0)
                  ? invoice.line_items.map((li, i) => {
                      const qty = li.quantity || li.qty || 1;
                      const price = li.unit_price || li.price || 0;
                      return (
                        <div key={i} className="iv-row">
                          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                            {li.description || li.label || '—'}
                          </div>
                          <span className="iv-mono" style={{ fontSize: 13, textAlign: 'right', color: 'var(--ink)' }}>
                            {qty}
                          </span>
                          <span className="iv-hide-mobile iv-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
                            {li.unit || 'u'}
                          </span>
                          <span className="iv-hide-mobile iv-mono" style={{ fontSize: 13, textAlign: 'right', color: 'var(--ink-2)' }}>
                            {fmtEur(price)} €
                          </span>
                          <span className="iv-display" style={{ fontSize: 15, fontWeight: 500, textAlign: 'right', color: 'var(--ink)' }}>
                            {fmtEur(qty * price)} €
                          </span>
                        </div>
                      );
                    })
                  : (
                    <div style={{ padding: 22, textAlign: 'center' }}>
                      <div className="iv-display" style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--ink-2)' }}>
                        Prestation globale : <strong>{invoice.service_type || invoice.project || '—'}</strong>
                      </div>
                      <div className="iv-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
                        Montant : {fmtEur(invoice.amount || invoice.amount_ht || 0)} € HT
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {invoice.notes && (
              <div className="iv-card" style={{ marginTop: 18 }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line-2)' }}>
                  <div className="iv-label">Notes</div>
                </div>
                <div style={{
                  padding: '18px 22px',
                  fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink-2)',
                  lineHeight: 1.6, whiteSpace: 'pre-wrap', fontStyle: 'italic',
                }}>
                  {invoice.notes}
                </div>
              </div>
            )}
          </div>

          {/* Colonne totaux */}
          <div>
            <div className="iv-card" style={{ position: 'sticky', top: 20 }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line-2)', background: 'var(--ink)', color: 'var(--bg)' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7 }}>
                  Montant dû
                </div>
                <div className="iv-display" style={{ fontSize: 36, fontWeight: 500, lineHeight: 1, marginTop: 6, color: 'var(--gold)' }}>
                  {fmtEur(totals.ttc)} <span style={{ fontSize: 16, fontStyle: 'italic', opacity: 0.8 }}>€</span>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em', opacity: 0.75, marginTop: 4 }}>
                  TTC · toutes taxes comprises
                </div>
              </div>
              <div style={{ padding: '18px 22px' }}>
                {[
                  ['Total HT', `${fmtEur(totals.ht)} €`],
                  [`TVA ${totals.tvaRate}%`, `${fmtEur(totals.tva)} €`],
                  ['Total TTC', `${fmtEur(totals.ttc)} €`, 'var(--emerald)', true],
                ].map(([label, value, color, bold], i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: i < 2 ? '1px dashed var(--line-2)' : 0,
                    fontFamily: 'Fraunces, serif', fontSize: 14,
                    color: color || 'var(--ink-2)',
                    fontWeight: bold ? 600 : 400,
                  }}>
                    <span>{label}</span>
                    <span className="iv-mono" style={{ fontWeight: bold ? 700 : 500 }}>{value}</span>
                  </div>
                ))}
              </div>
              {invoice.payment_terms && (
                <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line-2)', background: 'var(--surface-2)', fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Fraunces, serif', fontStyle: 'italic' }}>
                  {invoice.payment_terms}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 100,
          padding: '12px 18px', borderRadius: 10,
          background: toast.t === 'err' ? 'var(--rouge)' : 'var(--ink)',
          color: 'var(--bg)',
          fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        }}>
          {toast.m}
        </div>
      )}
    </div>
  );
}
