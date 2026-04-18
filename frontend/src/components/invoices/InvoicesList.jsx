import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

/**
 * InvoicesList — Registre des factures, niveau atelier.
 * Cover éditoriale + barre actions primaires + hero 4 chiffres + alerte impayés
 * + ruban annotations + tableau dense avec pastilles type BTP, TVA, relances, statut.
 * API : GET /api/invoices → { invoices[], stats }
 */

const STATUS = {
  draft:     { label: 'Brouillon', bg: 'bg-neutral-200',     fg: 'text-neutral-500' },
  emitted:   { label: 'Émise',     bg: 'bg-[#dbeafe]',       fg: 'text-[#1e40af]' },
  paid:      { label: 'Payée',     bg: 'bg-brand-100',       fg: 'text-brand-700' },
  overdue:   { label: 'Retard',    bg: 'bg-[#fecdd3]',       fg: 'text-[#881337]' },
  cancelled: { label: 'Annulée',   bg: 'bg-neutral-100',     fg: 'text-neutral-400 line-through' },
};

const TYPE_PILL = {
  acompte:   { label: 'Acompte',    cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  situation: { label: 'Situation',  cls: 'bg-[#dbeafe] text-[#1e40af] border-[#60a5fa]' },
  finale:    { label: 'Finale',     cls: 'bg-brand-100 text-brand-700 border-brand-600' },
  retenue:   { label: 'Retenue 5%', cls: 'bg-[#f3e8ff] text-[#6b21a8] border-[#c084fc]' },
  avoir:     { label: 'Avoir',      cls: 'bg-[#fce7f3] text-[#9d174d] border-[#f472b6]' },
};

const fmtMoney = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));
const fmtK = (v) => (Math.round((v || 0) / 100) / 10).toLocaleString('fr-FR', { minimumFractionDigits: 1 });
const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
  catch { return '—'; }
};
const daysSince = (d) => {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
};

const initials = (n) => (n || '').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();

const InvoicesList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    let alive = true;
    api.get('/invoices').then(r => { if (alive) setData(r.data); })
      .catch(() => { if (alive) setData(FALLBACK); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const d = data || FALLBACK;
  const stats = d.stats || FALLBACK.stats;
  const invoices = d.invoices || [];

  const filtered = useMemo(() => {
    let arr = invoices;
    if (tab !== 'all') arr = arr.filter(q => q.status === tab);
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter(q =>
        q.ref?.toLowerCase().includes(s) ||
        q.clientName?.toLowerCase().includes(s) ||
        q.title?.toLowerCase().includes(s)
      );
    }
    return arr;
  }, [invoices, tab, search]);

  const counts = useMemo(() => {
    const c = { all: invoices.length };
    invoices.forEach(q => { c[q.status] = (c[q.status] || 0) + 1; });
    return c;
  }, [invoices]);

  const overdueList = useMemo(() => invoices.filter(i => i.status === 'overdue'), [invoices]);
  const overdueAmount = useMemo(() => overdueList.reduce((s, i) => s + (i.amountHT || 0), 0), [overdueList]);
  const oldestOverdue = useMemo(() => {
    return overdueList.reduce((max, i) => {
      const ds = daysSince(i.dueDate);
      return (!max || ds > max.d) ? { invoice: i, d: ds } : max;
    }, null);
  }, [overdueList]);

  const toggle = (id) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  const tabs = [
    { k: 'all',       l: 'Toutes' },
    { k: 'draft',     l: 'Brouillon' },
    { k: 'emitted',   l: 'Émise' },
    { k: 'paid',      l: 'Payée' },
    { k: 'overdue',   l: 'En retard', danger: true },
    { k: 'cancelled', l: 'Annulée' },
  ];

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <div className="px-14 pt-10 pb-32 max-w-[1640px] mx-auto">

        {/* COVER */}
        <div className="grid grid-cols-[1fr_auto] gap-12 items-end pb-8 border-b border-neutral-300 mb-10">
          <div>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-4 flex items-center gap-6">
              <span>Atelier · ERP</span>
              <span className="w-8 h-px bg-neutral-300" />
              <span>Chapitre IV</span>
              <span className="w-8 h-px bg-neutral-300" />
              <span>Édition {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
            </div>
            <h1 className="font-display font-light text-[84px] leading-[0.92] tracking-[-0.02em] m-0 mb-4 text-neutral-900">
              Le registre<br/>des <em className="italic font-normal text-terracotta-800">factures</em>
            </h1>
            <p className="font-display italic text-[22px] text-neutral-700 font-light max-w-[640px]">
              Journal comptable des chantiers — acomptes, situations, finales et retenues consignés au fil des encaissements.
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-[11px] tracking-[0.15em] text-neutral-500 uppercase">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* BARRE ACTIONS PRIMAIRES */}
        <div className="flex items-center gap-4 py-5 px-6 bg-[#f5ede0] border border-neutral-300 border-l-[3px] border-l-neutral-900 mb-10">
          <button onClick={() => navigate('/invoices/new')}
            className="inline-flex items-center gap-3 px-6 py-4 bg-neutral-900 text-[#faf7f2] border-0 cursor-pointer font-mono text-[13px] tracking-[0.12em] uppercase font-medium rounded-sm hover:bg-brand-900 transition-colors">
            <span className="font-display text-lg leading-none">+</span>
            <span>Nouvelle facture</span>
            <span className="ml-1 px-2 py-0.5 bg-white/15 border border-white/20 text-[10px] rounded-sm">N</span>
          </button>
          {overdueList.length > 0 && (
            <button className="inline-flex items-center gap-3 px-[22px] py-[14px] bg-terracotta-800 text-[#faf7f2] border-0 cursor-pointer font-mono text-[12px] tracking-[0.12em] uppercase font-medium rounded-sm hover:bg-[#881337] transition-colors relative">
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#881337] rounded-full border-2 border-[#f5ede0] animate-pulse" />
              <span className="font-semibold">↯</span>
              <span>Relancer {overdueList.length} impayés</span>
              <span className="px-2 py-0.5 bg-white/12 font-display italic font-medium text-[12px] tracking-normal normal-case rounded-sm tabular-nums">
                {fmtMoney(overdueAmount)} €
              </span>
            </button>
          )}
          <button className="inline-flex items-center gap-3 px-[22px] py-[14px] bg-transparent text-neutral-900 border border-neutral-500 cursor-pointer font-mono text-[12px] tracking-[0.12em] uppercase font-medium rounded-sm hover:bg-neutral-100 hover:border-neutral-900 transition-colors">
            <span className="font-semibold">↓</span>
            <span>Export · Historique</span>
          </button>
          <div className="flex-1" />
          <div className="flex flex-col gap-1 pl-6 border-l border-dashed border-neutral-300 text-right">
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-500">Tréso · mois en cours</span>
            <span className="font-display text-[22px] font-medium text-brand-700 tabular-nums flex items-baseline gap-1 justify-end">
              +{fmtMoney(stats.cashFlow)}<em className="text-xs text-neutral-500 italic font-normal">k€</em>
            </span>
          </div>
        </div>

        {/* HERO 4 CHIFFRES */}
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] border-t border-b border-neutral-300 mb-10">
          <div className="px-7 py-8 border-r border-neutral-300">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-4 flex items-center gap-2">
              <span className="font-display italic text-[13px] text-terracotta-800 font-medium normal-case tracking-normal">i.</span>
              <span>CA facturé · {new Date().toLocaleDateString('fr-FR', { month: 'long' })}</span>
            </div>
            <div className="font-display font-light text-[84px] leading-[0.95] tracking-[-0.02em] text-neutral-900 tabular-nums">
              {fmtK(stats.caBilled)}<span className="text-[22px] text-neutral-500 font-normal italic ml-1">k€</span>
            </div>
            <div className="mt-4 font-mono text-[11px] text-neutral-500 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-100 text-brand-700 rounded-sm text-[10px] font-medium">↑ {stats.caDelta}%</span>
              <span>vs mois précédent · {fmtK(stats.caPrev)} k€</span>
            </div>
          </div>

          <div className="px-7 py-8 border-r border-neutral-300 relative">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-4 flex items-center gap-2">
              <span className="font-display italic text-[13px] text-terracotta-800 font-medium normal-case tracking-normal">ii.</span>
              <span>CA encaissé</span>
            </div>
            <div className="font-display font-light text-[64px] leading-[0.95] tracking-[-0.02em] text-neutral-900 tabular-nums">
              {fmtK(stats.caPaid)}<span className="text-[22px] text-neutral-500 font-normal italic ml-1">k€</span>
            </div>
            <svg className="absolute right-5 top-7 w-20 h-6 opacity-60" viewBox="0 0 80 24" preserveAspectRatio="none">
              <defs>
                <linearGradient id="invSpark" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#047857" /><stop offset="1" stopColor="#047857" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline points="0,20 8,18 16,15 24,16 32,12 40,10 48,11 56,8 64,6 72,4 80,2" fill="none" stroke="#047857" strokeWidth="1.5" />
              <polyline points="0,20 8,18 16,15 24,16 32,12 40,10 48,11 56,8 64,6 72,4 80,2 80,24 0,24" fill="url(#invSpark)" opacity=".3" />
            </svg>
            <div className="mt-4 font-mono text-[11px] text-neutral-500 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-100 text-brand-700 rounded-sm text-[10px] font-medium">↑ {stats.paidDelta}%</span>
              <span>{stats.paidRatio}% du facturé · 30j</span>
            </div>
          </div>

          <div className="px-7 py-8 border-r border-neutral-300">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-4 flex items-center gap-2">
              <span className="font-display italic text-[13px] text-terracotta-800 font-medium normal-case tracking-normal">iii.</span>
              <span>À encaisser</span>
            </div>
            <div className="font-display font-light text-[64px] leading-[0.95] tracking-[-0.02em] text-neutral-900 tabular-nums">
              {fmtK(stats.caPending)}<span className="text-[22px] text-neutral-500 font-normal italic ml-1">k€</span>
            </div>
            <div className="mt-4 font-mono text-[11px] text-neutral-500">
              {stats.pendingCount} factures en cours
            </div>
          </div>

          <div className="px-7 py-8">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-4 flex items-center gap-2">
              <span className="font-display italic text-[13px] text-terracotta-800 font-medium normal-case tracking-normal">iv.</span>
              <span>En retard</span>
            </div>
            <div className="font-display font-light text-[64px] leading-[0.95] tracking-[-0.02em] text-[#881337] tabular-nums">
              {fmtK(stats.caOverdue)}<span className="text-[22px] text-neutral-500 font-normal italic ml-1">k€</span>
            </div>
            <div className="mt-4 font-mono text-[11px] text-neutral-500 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#fecdd3] text-[#881337] rounded-sm text-[10px] font-medium">↯ {overdueList.length} factures</span>
              <span>&gt; 30 jours</span>
            </div>
          </div>
        </div>

        {/* BANDEAU ALERTE KRAFT (si impayés) */}
        {oldestOverdue && (
          <div className="relative bg-gradient-to-b from-terracotta-100/40 to-terracotta-100/80 border border-terracotta-600 border-l-[4px] border-l-terracotta-600 p-7 grid grid-cols-[auto_1fr_auto] gap-6 items-center mb-12">
            <div className="absolute top-2.5 left-2.5 right-2.5 bottom-2.5 border border-dashed border-terracotta-600/20 pointer-events-none" />
            <div className="w-14 h-14 border border-terracotta-600 flex items-center justify-center font-display text-[32px] text-terracotta-800 bg-white/40 relative z-10">!</div>
            <div className="relative z-10">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-terracotta-800 mb-1.5">Alerte impayés · Action requise</div>
              <div className="font-display text-xl font-medium text-neutral-900 mb-1">
                {overdueList.length} facture{overdueList.length > 1 ? 's' : ''} en retard pour un montant total de {fmtMoney(overdueAmount)} € HT
              </div>
              <div className="font-display italic text-sm text-neutral-700">
                La plus ancienne attend <b className="text-[#881337] font-medium">{oldestOverdue.d} jours</b> — <i>{oldestOverdue.invoice.clientName}, {oldestOverdue.invoice.clientCity}, facture {oldestOverdue.invoice.ref}</i>.
              </div>
            </div>
            <button className="relative z-10 px-5 py-3 bg-terracotta-800 text-[#faf7f2] border-0 cursor-pointer font-mono text-[11px] tracking-[0.15em] uppercase rounded-sm hover:bg-[#881337] transition-colors">
              Relancer les {overdueList.length} →
            </button>
          </div>
        )}

        {/* RUBAN ANNOTATIONS */}
        <div className="grid grid-cols-4 py-5 border-t border-b border-neutral-300 mb-10">
          <div className="px-7 border-r border-dashed border-neutral-300 flex flex-col gap-1.5">
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-500">Taux de recouvrement</span>
            <span className="font-display text-[22px] font-medium text-neutral-900 tabular-nums flex items-baseline gap-1.5">{stats.recoveryRate}<em className="text-xs text-neutral-500 italic font-normal">%</em></span>
          </div>
          <div className="px-7 border-r border-dashed border-neutral-300 flex flex-col gap-1.5">
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-500">DSO moyen</span>
            <span className="font-display text-[22px] font-medium text-neutral-900 tabular-nums flex items-baseline gap-1.5">{stats.dso}<em className="text-xs text-neutral-500 italic font-normal">jours</em></span>
          </div>
          <div className="px-7 border-r border-dashed border-neutral-300 flex flex-col gap-1.5">
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-500">Relances envoyées · mois</span>
            <span className="font-display text-[22px] font-medium text-neutral-900 tabular-nums">{stats.remindersSent}</span>
          </div>
          <div className="px-7 flex flex-col gap-1.5">
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-500">Prochaine échéance</span>
            <span className="font-display text-[22px] font-medium text-neutral-900">{stats.nextDue}</span>
          </div>
        </div>

        {/* SECTION REGISTRE */}
        <div className="flex items-baseline justify-between pb-5 border-b border-neutral-300 mb-0">
          <div className="flex items-baseline gap-5">
            <span className="font-display italic text-lg text-terracotta-800 font-normal">§ I</span>
            <h2 className="font-display font-normal text-[32px] m-0 text-neutral-900 tracking-[-0.01em]">Registre des factures</h2>
          </div>
          <div className="font-display italic text-neutral-500 text-sm">
            {invoices.length} pièces comptables · {new Set(invoices.map(i => i.clientName)).size} clients distincts
          </div>
        </div>

        {/* FILTRES TABS */}
        <div className="flex items-center justify-between gap-6 py-4 border-b border-neutral-300">
          <div className="flex gap-1">
            {tabs.map(t => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`px-4 py-2 border border-transparent font-mono text-[11px] tracking-[0.1em] uppercase cursor-pointer flex items-center gap-2 rounded-sm transition-colors
                  ${tab === t.k
                    ? (t.danger ? 'bg-[#881337] text-[#faf7f2]' : 'bg-neutral-900 text-[#faf7f2]')
                    : `bg-transparent ${t.danger ? 'text-[#881337]' : 'text-neutral-500'} hover:bg-[#efe6d5] hover:text-neutral-900`}`}>
                {t.l} <span className="text-[10px] opacity-70 font-medium">{counts[t.k] || 0}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="N° facture, client, chantier…"
              className="px-3.5 py-2 border border-neutral-300 bg-[#faf7f2] font-mono text-[11px] w-60 text-neutral-900 outline-none focus:border-neutral-900" />
            <button className="p-2 border border-neutral-300 bg-[#faf7f2] cursor-pointer text-neutral-500 hover:text-neutral-900 hover:border-neutral-900">↓</button>
            <button className="p-2 border border-neutral-300 bg-[#faf7f2] cursor-pointer text-neutral-500 hover:text-neutral-900 hover:border-neutral-900">↺</button>
          </div>
        </div>

        {/* TABLE */}
        <table className="w-full border-collapse mt-0">
          <thead>
            <tr>
              <th className="w-8 py-4 px-3" />
              <th className="py-4 px-3 text-left font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-500 font-medium border-b border-neutral-300 whitespace-nowrap">N° · Type</th>
              <th className="py-4 px-3 text-left font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-500 font-medium border-b border-neutral-300">Client · chantier</th>
              <th className="py-4 px-3 text-left font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-500 font-medium border-b border-neutral-300">Nature</th>
              <th className="py-4 px-3 text-center font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-500 font-medium border-b border-neutral-300">TVA</th>
              <th className="py-4 px-3 text-right font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-500 font-medium border-b border-neutral-300 whitespace-nowrap">Montant TTC</th>
              <th className="py-4 px-3 text-left font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-500 font-medium border-b border-neutral-300">Émise</th>
              <th className="py-4 px-3 text-left font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-500 font-medium border-b border-neutral-300">Échéance</th>
              <th className="py-4 px-3 text-left font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-500 font-medium border-b border-neutral-300">Relances</th>
              <th className="py-4 px-3 text-left font-mono text-[10px] tracking-[0.15em] uppercase text-neutral-500 font-medium border-b border-neutral-300">Statut</th>
              <th className="w-24 border-b border-neutral-300" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => {
              const st = STATUS[inv.status] || STATUS.draft;
              const isOverdue = inv.status === 'overdue';
              const sel = selected.has(inv.id);
              const type = TYPE_PILL[inv.type] || TYPE_PILL.finale;
              const sinceEmit = daysSince(inv.emittedDate);
              const sinceDue = daysSince(inv.dueDate);
              return (
                <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)}
                  className={`border-b border-neutral-200 cursor-pointer transition-colors group
                    ${isOverdue ? 'bg-[#fecdd3]/10 hover:bg-[#fecdd3]/20' : 'hover:bg-[#f5ede0]'}`}>
                  <td className="py-4 px-3" onClick={e => { e.stopPropagation(); toggle(inv.id); }}>
                    <span className={`w-4 h-4 border rounded-sm inline-block cursor-pointer relative align-top ${sel ? 'bg-neutral-900 border-neutral-900' : 'bg-[#faf7f2] border-neutral-400'}`}>
                      {sel && <span className="absolute left-1 top-px w-1 h-2 border-[#faf7f2] border-solid border-r-[1.5px] border-b-[1.5px] rotate-45" />}
                    </span>
                  </td>
                  <td className="py-4 px-3 align-top">
                    <div className="font-mono text-[12px] font-medium text-neutral-900 tracking-[0.03em]">{inv.ref}</div>
                    <div className="font-mono text-[10px] text-neutral-500 mt-0.5 uppercase tracking-[0.05em] font-normal">
                      {inv.type === 'acompte' ? 'Acompte 30%' : inv.type === 'situation' ? `Situation n°${inv.situationNum || 1}` : type.label}
                    </div>
                  </td>
                  <td className="py-4 px-3 align-top">
                    <div className="flex items-start gap-3">
                      <div className="w-[38px] h-[38px] flex-shrink-0 bg-[#efe6d5] border border-neutral-300 flex items-center justify-center font-display font-medium text-sm text-neutral-700 rounded-sm">{initials(inv.clientName)}</div>
                      <div>
                        <div className="font-display font-medium text-[15px] text-neutral-900 leading-tight">{inv.clientName}</div>
                        <div className="font-mono text-[10px] text-neutral-500 tracking-wider uppercase mt-0.5">{inv.clientCity} · {inv.project}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-3 align-top">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] tracking-[0.1em] uppercase font-medium rounded-sm border ${type.cls}`}>{type.label}</span>
                    {inv.retenue && (
                      <div className="mt-1"><span className={`inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] tracking-[0.1em] uppercase font-medium rounded-sm border ${TYPE_PILL.retenue.cls}`}>Retenue 5%</span></div>
                    )}
                  </td>
                  <td className="py-4 px-3 text-center align-top">
                    <span className={`inline-flex px-1.5 py-0.5 font-mono text-[9px] font-medium border rounded-sm ${inv.tvaMulti ? 'text-terracotta-800 border-terracotta-200 bg-[#fff7ed]' : 'text-neutral-500 border-neutral-300 bg-[#faf7f2]'}`}>{inv.tvaLabel || '10%'}</span>
                  </td>
                  <td className="py-4 px-3 text-right align-top whitespace-nowrap">
                    <div className="font-display font-medium text-base text-neutral-900 tabular-nums leading-[1.2]">{fmtMoney(inv.amountTTC)} €</div>
                    <div className="font-mono text-[10px] text-neutral-500 mt-0.5 tracking-[0.03em]">HT · {fmtMoney(inv.amountHT)} €</div>
                  </td>
                  <td className="py-4 px-3 align-top">
                    {inv.emittedDate ? (
                      <div className="font-mono text-[11px] text-neutral-700">{fmtDate(inv.emittedDate)}<div className="text-[9px] text-neutral-500 mt-0.5 uppercase tracking-[0.1em]">Il y a {sinceEmit}j</div></div>
                    ) : <div className="font-mono text-[11px] text-neutral-500">—<div className="text-[9px] mt-0.5 uppercase tracking-[0.1em]">Non émise</div></div>}
                  </td>
                  <td className="py-4 px-3 align-top">
                    {inv.dueDate ? (
                      <div className={`font-mono text-[11px] ${isOverdue ? 'text-[#881337]' : 'text-neutral-700'}`}>
                        {fmtDate(inv.dueDate)}
                        <div className={`text-[9px] mt-0.5 uppercase tracking-[0.1em] ${isOverdue ? 'text-[#881337] font-medium' : 'text-neutral-500'}`}>
                          {isOverdue ? `↯ ${sinceDue}j de retard` : inv.status === 'paid' ? `Payée J+${inv.paidIn || 0}` : sinceDue < 0 ? `Dans ${Math.abs(sinceDue)}j` : sinceDue === 0 ? "Aujourd'hui" : `Il y a ${sinceDue}j`}
                        </div>
                      </div>
                    ) : <div className="font-mono text-[11px] text-neutral-500">—</div>}
                  </td>
                  <td className="py-4 px-3 align-top">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map(n => {
                        const done = (inv.remindersDone || 0) >= n;
                        const isNext = (inv.remindersDone || 0) === n - 1 && isOverdue;
                        const isOver = isOverdue && n === 3 && (inv.remindersDone || 0) >= 3;
                        return (
                          <div key={n} title={`J+${n * 7 + (n - 1) * 7}`}
                            className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center font-mono text-[8px] font-semibold
                              ${isOver ? 'bg-[#881337] text-[#faf7f2] border-[#881337]' :
                                done ? 'bg-brand-600 text-[#faf7f2] border-brand-600' :
                                isNext ? 'bg-amber-200 text-amber-900 border-amber-600 animate-pulse' :
                                'bg-[#faf7f2] text-neutral-500 border-neutral-300'}`}>
                            {done ? '✓' : isOver ? '!' : isNext ? '!' : n}
                          </div>
                        );
                      })}
                      <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-[0.1em] ml-1">
                        {inv.status === 'paid' ? 'Payée' : inv.status === 'draft' ? '—' : `${inv.remindersDone || 0}/3`}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-3 align-top">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] uppercase font-medium rounded-sm ${st.bg} ${st.fg}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {st.label}
                    </span>
                  </td>
                  <td className="py-4 px-3 align-top opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1.5 justify-end">
                      <span className="w-7 h-7 flex items-center justify-center border border-neutral-300 bg-[#faf7f2] cursor-pointer text-neutral-500 rounded-sm hover:text-neutral-900 hover:border-neutral-900">↗</span>
                      <span className="w-7 h-7 flex items-center justify-center border border-neutral-300 bg-[#faf7f2] cursor-pointer text-neutral-500 rounded-sm hover:text-neutral-900 hover:border-neutral-900">⋯</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* FOOTER NOTE */}
        <div className="mt-12 pt-6 border-t border-dashed border-neutral-300 flex justify-between font-mono text-[10px] tracking-[0.1em] uppercase text-neutral-500">
          <div>Affichage · {filtered.length} pièces sur {invoices.length}</div>
          <div>Dernière synchro comptable · {new Date().toLocaleDateString('fr-FR')} · {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>

      </div>

      {/* BULK BAR */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-[#faf7f2] px-5 py-3.5 flex items-center gap-5 rounded-sm shadow-[0_20px_40px_rgba(28,25,23,.3)] z-50 min-w-[520px]">
          <span className="font-mono text-[11px] tracking-[0.15em] uppercase">
            {selected.size} facture{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}
          </span>
          <span className="w-px h-6 bg-white/20" />
          <button className="px-3 py-1.5 bg-brand-600 border border-brand-600 text-[#faf7f2] font-mono text-[10px] tracking-[0.1em] uppercase cursor-pointer rounded-sm hover:opacity-90">↯ Relancer</button>
          <button className="px-3 py-1.5 bg-transparent border border-white/30 text-[#faf7f2] font-mono text-[10px] tracking-[0.1em] uppercase cursor-pointer rounded-sm hover:bg-white/10">✓ Marquer payée</button>
          <button className="px-3 py-1.5 bg-transparent border border-white/30 text-[#faf7f2] font-mono text-[10px] tracking-[0.1em] uppercase cursor-pointer rounded-sm hover:bg-white/10">↓ Exporter PDF</button>
          <button className="px-3 py-1.5 bg-[#881337] border border-[#881337] text-[#faf7f2] font-mono text-[10px] tracking-[0.1em] uppercase cursor-pointer rounded-sm hover:opacity-90">× Annuler</button>
          <span className="ml-2 cursor-pointer text-[18px] opacity-70 hover:opacity-100" onClick={() => setSelected(new Set())}>×</span>
        </div>
      )}
    </div>
  );
};

// ---- FALLBACK -----------------------------------
const FALLBACK = {
  stats: {
    caBilled: 284600, caPrev: 240300, caDelta: 18.4,
    caPaid: 198000, paidDelta: 12, paidRatio: 69.7,
    caPending: 62400, pendingCount: 14,
    caOverdue: 24200,
    recoveryRate: 94.2, dso: 32, remindersSent: 47, nextDue: 'lundi 17 fév.',
    cashFlow: 173,
  },
  invoices: [
    { id: 1, ref: 'FAC-2024-1287', type: 'situation', situationNum: 3, clientName: 'Famille Leclerc',    clientCity: 'Paris 15e',         project: 'rénovation complète',   tvaLabel: '10%',       amountHT: 11400, amountTTC: 12540, emittedDate: '2024-12-04', dueDate: '2025-01-04', remindersDone: 3, status: 'overdue' },
    { id: 2, ref: 'FAC-2025-0042', type: 'finale',    clientName: 'SCI Duranton',        clientCity: 'Neuilly-sur-Seine',  project: 'extension',             tvaLabel: '5,5/10', tvaMulti: true, amountHT: 7530,  amountTTC: 8240,  emittedDate: '2025-01-02', dueDate: '2025-02-02', remindersDone: 2, status: 'overdue' },
    { id: 3, ref: 'FAC-2025-0031', type: 'acompte',   clientName: 'M. & Mme Martinet',   clientCity: 'Versailles',         project: 'cuisine + SdB',         tvaLabel: '20%',       amountHT: 2833,  amountTTC: 3400,  emittedDate: '2025-01-20', dueDate: '2025-02-05', remindersDone: 1, status: 'overdue' },
    { id: 4, ref: 'FAC-2025-0058', type: 'situation', situationNum: 2, clientName: 'Maison Bertrand',    clientCity: 'Paris 7e',          project: 'hôtel particulier',    tvaLabel: '10%',       amountHT: 26000, amountTTC: 28600, emittedDate: '2025-02-08', dueDate: '2025-03-10', remindersDone: 0, status: 'emitted' },
    { id: 5, ref: 'FAC-2025-0057', type: 'finale',    retenue: true,   clientName: 'Famille Roussel',    clientCity: 'Boulogne',          project: 'rénovation intégrale', tvaLabel: '10%',       amountHT: 16755, amountTTC: 18430, emittedDate: '2025-02-07', dueDate: '2025-03-09', remindersDone: 0, status: 'emitted' },
    { id: 6, ref: 'FAC-2025-0051', type: 'situation', situationNum: 1, clientName: 'M. Valentin Moreau', clientCity: 'Paris 16e',         project: 'SdB + cuisine',        tvaLabel: '10%',       amountHT: 8909,  amountTTC: 9800,  emittedDate: '2025-01-15', dueDate: '2025-02-14', paidIn: 0,  status: 'paid' },
    { id: 7, ref: 'FAC-2025-0048', type: 'acompte',   clientName: 'Famille Kerviel',     clientCity: 'Saint-Cloud',        project: 'maison 180m²',          tvaLabel: '20%',       amountHT: 12000, amountTTC: 14400, emittedDate: '2025-01-10', dueDate: '2025-01-15', paidIn: 2,  status: 'paid' },
    { id: 8, ref: 'FAC-2025-0062', type: 'acompte',   clientName: 'M. Dubois',           clientCity: 'Paris 11e',          project: 'loft 95m²',             tvaLabel: '20%',       amountHT: 8250,  amountTTC: 9900,  emittedDate: null,          dueDate: null,         remindersDone: 0, status: 'draft' },
    { id: 9, ref: 'FAC-2025-0029', type: 'finale',    clientName: 'Mme Chastel',         clientCity: 'Paris 8e',          project: 'appartement haussmannien', tvaLabel: '5,5/10/20', tvaMulti: true, amountHT: 38009, amountTTC: 42800, emittedDate: '2025-01-04', dueDate: '2025-02-04', paidIn: 28, status: 'paid' },
  ],
};

export default InvoicesList;
