// QuoteView.jsx — visualisation d'un devis créé (lecture seule, style atelier).
// Route : /quotes/:id  (l'ancien QuoteForm reste accessible via /quotes/:id/edit pour modification)
// Actions : éditer · télécharger PDF · envoyer par email · supprimer · dupliquer

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Download, Send, Trash2, Copy, User, Mail, Phone, MapPin,
  CheckCircle, Clock, FileText, AlertTriangle, Calendar,
} from 'lucide-react';
import api from '../../lib/api';

const tokenStyle = `
  .qv-root {
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
  .qv-root {
    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .qv-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .qv-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .qv-label   { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
                text-transform: uppercase; color: var(--ink-3); font-weight: 500; }
  .qv-italic  { font-style: italic; color: var(--emerald); font-weight: 400; }

  .qv-card {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 14px; overflow: hidden;
  }

  .qv-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    letter-spacing: 0.06em; text-transform: uppercase; font-weight: 500;
    cursor: pointer; transition: all .15s;
    border: 1px solid var(--line); background: var(--surface); color: var(--ink-2);
  }
  .qv-btn:hover { border-color: var(--ink-3); color: var(--ink); }
  .qv-btn.primary { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .qv-btn.primary:hover { opacity: 0.88; }
  .qv-btn.emerald { background: var(--emerald); color: white; border-color: var(--emerald); }
  .qv-btn.emerald:hover { opacity: 0.88; }
  .qv-btn.danger { color: var(--rouge); border-color: var(--rouge); background: var(--rouge-soft); }

  .qv-status {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 12px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;
    border: 1px solid;
  }

  .qv-row {
    display: grid; grid-template-columns: 1fr 80px 110px 120px 120px;
    gap: 14px; align-items: center;
    padding: 14px 20px;
    border-bottom: 1px solid var(--line-2);
  }
  .qv-row:last-child { border-bottom: 0; }
  .qv-row.head {
    background: var(--ink); color: var(--bg);
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.12em; text-transform: uppercase; font-weight: 500;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .qv-fade { animation: fadeIn .3s ease; }

  @media (max-width: 760px) {
    .qv-header { padding: 20px 18px 16px !important; flex-wrap: wrap !important; }
    .qv-header-title { font-size: 32px !important; }
    .qv-body { padding: 0 18px 30px !important; }
    .qv-grid { grid-template-columns: 1fr !important; }
    .qv-row { grid-template-columns: 1fr 70px 90px !important; gap: 8px !important; padding: 12px 14px !important; }
    .qv-hide-mobile { display: none !important; }
  }
`;

const STATUS_META = {
  brouillon: { label: 'Brouillon', color: 'var(--ink-3)', bg: 'var(--surface-2)', icon: FileText },
  envoyé:    { label: 'Envoyé',    color: 'var(--sepia)', bg: 'oklch(0.92 0.04 65)', icon: Send },
  accepté:   { label: 'Accepté',   color: 'var(--emerald)', bg: 'var(--emerald-soft)', icon: CheckCircle },
  refusé:    { label: 'Refusé',    color: 'var(--rouge)', bg: 'var(--rouge-soft)', icon: AlertTriangle },
  expiré:    { label: 'Expiré',    color: 'var(--ink-3)', bg: 'var(--surface-2)', icon: Clock },
};

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return '—'; }
};

export default function QuoteView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (m, t = 'ok') => { setToast({ m, t }); setTimeout(() => setToast(null), 2800); };

  const load = () => {
    setLoading(true);
    api.get(`/quotes/${id}`)
      .then(r => { setQuote(r.data); setErr(null); })
      .catch(e => setErr(e?.response?.data?.detail || 'Devis introuvable'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const totals = useMemo(() => {
    if (!quote) return { ht: 0, tva: 0, ttc: 0, discount: 0 };
    const items = Array.isArray(quote.line_items) ? quote.line_items : [];
    const rawHt = items.length > 0
      ? items.reduce((s, it) => s + (Number(it.qty || 1) * Number(it.price || 0)), 0)
      : Number(quote.amount || 0);
    const discount = rawHt * ((quote.discount || 0) / 100);
    const ht = rawHt - discount;
    const tvaRate = Number(quote.tva_rate ?? 20);
    const tva = ht * (tvaRate / 100);
    const ttc = ht + tva;
    return { rawHt, ht, tva, ttc, discount, tvaRate };
  }, [quote]);

  const handleDownloadPdf = async () => {
    try {
      const r = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quote.quote_number || id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      showToast('PDF indisponible', 'err');
    }
  };

  const handleSend = async () => {
    if (!window.confirm('Envoyer ce devis par email au client ?')) return;
    setBusy(true);
    try {
      await api.post(`/quotes/${id}/send`);
      showToast('✓ Devis envoyé par email');
      load();
    } catch (e) {
      showToast(e?.response?.data?.detail || 'Échec envoi', 'err');
    }
    setBusy(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer ce devis ? (Réversible via la corbeille)')) return;
    setBusy(true);
    try {
      await api.delete(`/quotes/${id}`);
      showToast('✓ Devis supprimé');
      setTimeout(() => navigate('/quotes'), 900);
    } catch {
      showToast('Suppression impossible', 'err');
    }
    setBusy(false);
  };

  const handleDuplicate = () => {
    navigate(`/quotes/new?duplicate=${id}`);
  };

  if (loading) {
    return (
      <div className="qv-root">
        <style>{tokenStyle}</style>
        <div style={{ padding: 80, textAlign: 'center', fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)' }}>
          Ouverture du devis…
        </div>
      </div>
    );
  }

  if (err || !quote) {
    return (
      <div className="qv-root">
        <style>{tokenStyle}</style>
        <div style={{ padding: '60px 48px' }}>
          <button className="qv-btn" onClick={() => navigate('/quotes')} style={{ marginBottom: 24 }}>
            <ArrowLeft style={{ width: 13, height: 13 }} /> Retour
          </button>
          <div style={{
            padding: 40, textAlign: 'center', border: '1px dashed var(--line)',
            borderRadius: 14, fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--rouge)',
          }}>
            {err || 'Devis introuvable'}
          </div>
        </div>
      </div>
    );
  }

  const status = STATUS_META[quote.status] || STATUS_META.brouillon;
  const ref = quote.quote_number || id.slice(-8).toUpperCase();

  return (
    <div className="qv-root">
      <style>{tokenStyle}</style>

      {/* ═══════════ HEADER ═══════════ */}
      <div className="qv-header qv-fade" style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '32px 48px 24px', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <button onClick={() => navigate('/quotes')} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.08em',
            textTransform: 'uppercase', padding: 0, marginBottom: 14,
          }}>
            <ArrowLeft style={{ width: 12, height: 12 }} /> Le cahier
          </button>

          <div className="qv-label" style={{ marginBottom: 8 }}>
            Devis · Ref. {ref}
          </div>
          <h1 className="qv-display qv-header-title" style={{
            fontSize: 48, fontWeight: 300, lineHeight: 0.95, margin: '0 0 10px', color: 'var(--ink)',
          }}>
            {quote.title || 'Devis'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="qv-status" style={{ color: status.color, background: status.bg, borderColor: status.color }}>
              <status.icon style={{ width: 11, height: 11 }} />
              {status.label}
            </span>
            <span className="qv-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
              Créé le {fmtDate(quote.created_at)}
            </span>
            {quote.expiry_date && (
              <span className="qv-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                · Valable jusqu'au {fmtDate(quote.expiry_date)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="qv-btn primary" onClick={() => navigate(`/quotes/${id}/edit`)}>
            <Edit3 style={{ width: 13, height: 13 }} /> Éditer
          </button>
          <button className="qv-btn emerald" onClick={handleSend} disabled={busy}>
            <Send style={{ width: 13, height: 13 }} /> Envoyer
          </button>
          <button className="qv-btn" onClick={handleDownloadPdf}>
            <Download style={{ width: 13, height: 13 }} /> PDF
          </button>
          <button className="qv-btn" onClick={handleDuplicate}>
            <Copy style={{ width: 13, height: 13 }} /> Dupliquer
          </button>
          <button className="qv-btn danger" onClick={handleDelete} disabled={busy}>
            <Trash2 style={{ width: 13, height: 13 }} /> Supprimer
          </button>
        </div>
      </div>

      {/* ═══════════ BODY ═══════════ */}
      <div className="qv-body qv-fade" style={{ padding: '0 48px 40px' }}>
        <div className="qv-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18 }}>

          {/* Colonne principale : postes */}
          <div>
            {/* Client */}
            <div className="qv-card" style={{ marginBottom: 18 }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line-2)' }}>
                <div className="qv-label">Client</div>
              </div>
              <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <User style={{ width: 15, height: 15, color: 'var(--ink-3)', flexShrink: 0 }} />
                  <div>
                    <div className="qv-display" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
                      {quote.lead_name || quote.client_name || '—'}
                    </div>
                    {quote.lead_id && (
                      <Link to={`/leads/${quote.lead_id}`} className="qv-mono" style={{
                        fontSize: 10, color: 'var(--emerald)', letterSpacing: '0.06em', textDecoration: 'none',
                      }}>
                        Voir le dossier complet →
                      </Link>
                    )}
                  </div>
                </div>
                {quote.lead_email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Mail style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
                    <a href={`mailto:${quote.lead_email}`} style={{ color: 'var(--ink-2)', textDecoration: 'none', fontSize: 13, fontFamily: 'Fraunces, serif' }}>
                      {quote.lead_email}
                    </a>
                  </div>
                )}
                {quote.lead_phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Phone style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
                    <a href={`tel:${quote.lead_phone}`} style={{ color: 'var(--ink-2)', textDecoration: 'none', fontSize: 13, fontFamily: 'Fraunces, serif' }}>
                      {quote.lead_phone}
                    </a>
                  </div>
                )}
                {quote.lead_address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <MapPin style={{ width: 14, height: 14, color: 'var(--ink-3)', marginTop: 2 }} />
                    <span style={{ color: 'var(--ink-2)', fontSize: 13, fontFamily: 'Fraunces, serif' }}>
                      {quote.lead_address}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Lignes de prestations */}
            <div className="qv-card">
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line-2)' }}>
                <div className="qv-label">Prestations</div>
                <h3 className="qv-display" style={{ fontSize: 20, fontWeight: 400, margin: '4px 0 0', color: 'var(--ink)' }}>
                  Détail des <em className="qv-italic">postes</em>
                </h3>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <div className="qv-row head">
                  <span>Désignation</span>
                  <span style={{ textAlign: 'right' }}>Qté</span>
                  <span className="qv-hide-mobile">Unité</span>
                  <span className="qv-hide-mobile" style={{ textAlign: 'right' }}>PU HT</span>
                  <span style={{ textAlign: 'right' }}>Total HT</span>
                </div>

                {(Array.isArray(quote.line_items) && quote.line_items.length > 0)
                  ? quote.line_items.map((li, i) => (
                    <div key={i} className="qv-row">
                      <div>
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                          {li.label || li.description || '—'}
                        </div>
                        {li.group && (
                          <div className="qv-mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.06em', marginTop: 2 }}>
                            {li.group}
                          </div>
                        )}
                      </div>
                      <span className="qv-mono" style={{ fontSize: 13, textAlign: 'right', color: 'var(--ink)' }}>
                        {li.qty || 1}
                      </span>
                      <span className="qv-hide-mobile qv-mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
                        {li.unit || 'forfait'}
                      </span>
                      <span className="qv-hide-mobile qv-mono" style={{ fontSize: 13, textAlign: 'right', color: 'var(--ink-2)' }}>
                        {fmtEur(li.price || 0)} €
                      </span>
                      <span className="qv-display" style={{ fontSize: 15, fontWeight: 500, textAlign: 'right', color: 'var(--ink)' }}>
                        {fmtEur((li.qty || 1) * (li.price || 0))} €
                      </span>
                    </div>
                  ))
                  : (
                    <div style={{ padding: 22, textAlign: 'center' }}>
                      <div className="qv-display" style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--ink-2)' }}>
                        Prestation globale : <strong>{quote.service_type || '—'}</strong>
                      </div>
                      <div className="qv-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
                        Montant : {fmtEur(quote.amount || 0)} €
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Notes & conditions */}
            {(quote.details || quote.notes) && (
              <div className="qv-card" style={{ marginTop: 18 }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line-2)' }}>
                  <div className="qv-label">Description &amp; notes</div>
                </div>
                <div style={{
                  padding: '18px 22px',
                  fontFamily: 'Fraunces, serif', fontSize: 14, color: 'var(--ink-2)',
                  lineHeight: 1.6, whiteSpace: 'pre-wrap',
                }}>
                  {quote.details || ''}
                  {quote.notes && quote.details && <><br/><br/></>}
                  {quote.notes && <em style={{ color: 'var(--ink-3)' }}>{quote.notes}</em>}
                </div>
              </div>
            )}
          </div>

          {/* Colonne : totaux */}
          <div>
            <div className="qv-card" style={{ position: 'sticky', top: 20 }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line-2)', background: 'var(--ink)', color: 'var(--bg)' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7 }}>
                  Récapitulatif
                </div>
                <div className="qv-display" style={{ fontSize: 36, fontWeight: 500, lineHeight: 1, marginTop: 6, color: 'var(--gold)' }}>
                  {fmtEur(totals.ttc)} <span style={{ fontSize: 16, fontStyle: 'italic', opacity: 0.8 }}>€</span>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em', opacity: 0.75, marginTop: 4 }}>
                  TTC · toutes taxes comprises
                </div>
              </div>
              <div style={{ padding: '18px 22px' }}>
                {[
                  ['Total brut HT', `${fmtEur(totals.rawHt || totals.ht)} €`],
                  ...(totals.discount > 0 ? [[`Remise ${quote.discount}%`, `-${fmtEur(totals.discount)} €`, 'var(--rouge)']] : []),
                  ['Net HT', `${fmtEur(totals.ht)} €`, null, true],
                  [`TVA ${totals.tvaRate}%`, `${fmtEur(totals.tva)} €`],
                  ['Total TTC', `${fmtEur(totals.ttc)} €`, 'var(--emerald)', true],
                ].map(([label, value, color, bold], i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: i < 4 ? '1px dashed var(--line-2)' : 0,
                    fontFamily: 'Fraunces, serif', fontSize: 14,
                    color: color || 'var(--ink-2)',
                    fontWeight: bold ? 600 : 400,
                  }}>
                    <span>{label}</span>
                    <span className="qv-mono" style={{ fontWeight: bold ? 700 : 500 }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line-2)', background: 'var(--surface-2)', fontSize: 11, color: 'var(--ink-3)', fontFamily: 'Fraunces, serif', fontStyle: 'italic' }}>
                {quote.payment_mode && <>Paiement : {quote.payment_mode}<br/></>}
                {quote.payment_delay && <>Délai : {quote.payment_delay}</>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
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
