// Reporting.jsx — /reporting
// Rapport mensuel : KPIs vs N-1, top zones / sources / leads / services.
// Export PDF (jspdf + autotable) + CSV.

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Download, FileText, TrendingDown, TrendingUp, Calendar,
  Users, Receipt, BadgeEuro, MapPin, Share2, Briefcase, RefreshCw,
} from 'lucide-react';
import api from '../../lib/api';

// Helpers
const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function ymToLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES_FR[m - 1]} ${y}`;
}

function fmtEUR(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
}

function fmtInt(n) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
}

function deltaColor(d) {
  if (d == null) return 'var(--ink-3, #6b7280)';
  if (d > 0) return 'var(--emerald, #059669)';
  if (d < 0) return 'var(--rouge, #dc2626)';
  return 'var(--ink-3, #6b7280)';
}

function useReportingMonthly(month) {
  return useQuery({
    queryKey: ['reporting', 'monthly', month],
    queryFn: async () => (await api.get(`/reporting/monthly?month=${month}`)).data,
    staleTime: 5 * 60_000,
  });
}

function KpiCard({ label, value, prev, deltaPct, formatter = fmtInt, icon: Icon, tone }) {
  return (
    <div className="glass" style={{ padding: 20, borderRadius: 'var(--lg-radius, 18px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: `${tone || 'var(--brand,#047857)'}22`, color: tone || 'var(--brand,#047857)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} />
        </div>
        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3, #6b7280)', fontWeight: 600 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 28, fontFamily: 'Fraunces, serif', fontWeight: 500, color: 'var(--ink,#111827)', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {formatter(value)}
      </div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
        {deltaPct != null ? (
          <>
            <span style={{ color: deltaColor(deltaPct), fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              {deltaPct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {deltaPct >= 0 ? '+' : ''}{deltaPct}%
            </span>
            <span style={{ color: 'var(--ink-4,#9ca3af)' }}>vs {formatter(prev)} mois dernier</span>
          </>
        ) : (
          <span style={{ color: 'var(--ink-4,#9ca3af)' }}>—</span>
        )}
      </div>
    </div>
  );
}

function TableSection({ title, rows, columns }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="glass" style={{ padding: 20, borderRadius: 'var(--lg-radius,18px)' }}>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: 'var(--ink,#111827)', margin: '0 0 8px' }}>{title}</h3>
        <p style={{ fontSize: 12, color: 'var(--ink-3,#6b7280)', fontStyle: 'italic' }}>Aucune donnée sur cette période</p>
      </div>
    );
  }
  return (
    <div className="glass" style={{ padding: 20, borderRadius: 'var(--lg-radius,18px)' }}>
      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: 'var(--ink,#111827)', margin: '0 0 12px' }}>{title}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{
                textAlign: c.align || 'left', padding: '6px 4px', fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--ink-3,#6b7280)', fontWeight: 600,
                borderBottom: '1px solid var(--line-2,#e5e7eb)',
              }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} style={{
                  padding: '8px 4px', fontSize: 13, color: 'var(--ink-2,#374151)',
                  textAlign: c.align || 'left',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--line-2,#f3f4f6)' : 0,
                  fontFamily: c.mono ? 'JetBrains Mono, monospace' : 'inherit',
                }}>
                  {c.format ? c.format(r[c.key]) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function generatePDF(report) {
  // Dynamic import : ne charge jspdf qu'au moment du clic (économise du bundle initial)
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const period = report.period.label_fr || report.period.month;
  const kpis = report.kpis || {};

  // ─── Header ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(4, 120, 87); // émeraude
  doc.text('Global Clean Home', 14, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Rapport mensuel — ${period}`, 14, 25);
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 30);

  doc.setDrawColor(220);
  doc.line(14, 33, 196, 33);

  // ─── KPIs ───
  doc.setFontSize(13);
  doc.setTextColor(40);
  doc.setFont('helvetica', 'bold');
  doc.text('Indicateurs clés', 14, 42);

  const kpiRows = [
    ['Leads créés', fmtInt(kpis.leads?.value), kpis.leads?.delta_pct != null ? `${kpis.leads.delta_pct >= 0 ? '+' : ''}${kpis.leads.delta_pct}%` : '—'],
    ['Devis envoyés', fmtInt(kpis.quotes?.value), kpis.quotes?.delta_pct != null ? `${kpis.quotes.delta_pct >= 0 ? '+' : ''}${kpis.quotes.delta_pct}%` : '—'],
    ['Valeur devis', fmtEUR(kpis.quotes_amount?.value), kpis.quotes_amount?.delta_pct != null ? `${kpis.quotes_amount.delta_pct >= 0 ? '+' : ''}${kpis.quotes_amount.delta_pct}%` : '—'],
    ['Factures émises', fmtInt(kpis.invoices?.value), kpis.invoices?.delta_pct != null ? `${kpis.invoices.delta_pct >= 0 ? '+' : ''}${kpis.invoices.delta_pct}%` : '—'],
    ['CA encaissé', fmtEUR(kpis.revenue_collected?.value), kpis.revenue_collected?.delta_pct != null ? `${kpis.revenue_collected.delta_pct >= 0 ? '+' : ''}${kpis.revenue_collected.delta_pct}%` : '—'],
    ['Taux conversion', `${kpis.conversion_rate?.value || 0}%`, kpis.conversion_rate?.prev != null ? `vs ${kpis.conversion_rate.prev}%` : '—'],
  ];

  doc.autoTable({
    startY: 46,
    head: [['Indicateur', 'Valeur', 'vs Mois N-1']],
    body: kpiRows,
    theme: 'grid',
    headStyles: { fillColor: [4, 120, 87], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' }, 2: { halign: 'right', textColor: [4, 120, 87] } },
    margin: { left: 14, right: 14 },
  });

  // ─── Top zones ───
  if (report.top_zones?.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Top zones', 14, doc.lastAutoTable.finalY + 12);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 16,
      head: [['Ville', 'Leads']],
      body: report.top_zones.map((z) => [z.city, fmtInt(z.leads_count)]),
      theme: 'plain',
      headStyles: { fillColor: [243, 244, 246], textColor: 50, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 14, right: 110 },
    });
  }

  // ─── Top sources (à droite si zones existent) ───
  if (report.top_sources?.length) {
    const startY = report.top_zones?.length ? doc.lastAutoTable.finalY - (report.top_zones.length + 1) * 7 - 7 : doc.lastAutoTable.finalY + 12;
    if (!report.top_zones?.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Top sources', 14, startY);
    }
    doc.autoTable({
      startY: report.top_zones?.length ? startY + 4 : startY + 4,
      head: [['Source', 'Leads']],
      body: report.top_sources.map((s) => [s.source, fmtInt(s.leads_count)]),
      theme: 'plain',
      headStyles: { fillColor: [243, 244, 246], textColor: 50, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: report.top_zones?.length ? 110 : 14, right: 14 },
    });
  }

  // ─── Top leads ───
  if (report.top_leads?.length) {
    let nextY = doc.lastAutoTable?.finalY ?? 100;
    if (nextY > 240) { doc.addPage(); nextY = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Top leads par valeur de devis', 14, nextY + 12);
    doc.autoTable({
      startY: nextY + 16,
      head: [['Nom', 'Total devisé']],
      body: report.top_leads.map((l) => [l.name || l.lead_id, fmtEUR(l.total_quoted)]),
      theme: 'striped',
      headStyles: { fillColor: [4, 120, 87], textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
    });
  }

  // ─── Footer ───
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} / ${totalPages}`, 196, 287, { align: 'right' });
    doc.text('Global Clean Home — Atelier CRM', 14, 287);
  }

  const filename = `rapport-${report.period.month}-global-clean-home.pdf`;
  doc.save(filename);
  return filename;
}

function exportCSV(report) {
  const rows = [
    ['Indicateur', 'Valeur', 'Mois N-1', 'Évolution'],
    ['Leads créés', report.kpis.leads?.value, report.kpis.leads?.prev, report.kpis.leads?.delta_pct],
    ['Devis envoyés', report.kpis.quotes?.value, report.kpis.quotes?.prev, report.kpis.quotes?.delta_pct],
    ['Valeur devis (€)', report.kpis.quotes_amount?.value, report.kpis.quotes_amount?.prev, report.kpis.quotes_amount?.delta_pct],
    ['Factures émises', report.kpis.invoices?.value, report.kpis.invoices?.prev, report.kpis.invoices?.delta_pct],
    ['CA encaissé (€)', report.kpis.revenue_collected?.value, report.kpis.revenue_collected?.prev, report.kpis.revenue_collected?.delta_pct],
    ['Taux conversion (%)', report.kpis.conversion_rate?.value, report.kpis.conversion_rate?.prev, ''],
    [],
    ['Top zones', 'Leads'],
    ...(report.top_zones || []).map((z) => [z.city, z.leads_count]),
    [],
    ['Top sources', 'Leads'],
    ...(report.top_sources || []).map((s) => [s.source, s.leads_count]),
    [],
    ['Top leads', 'Total devisé (€)'],
    ...(report.top_leads || []).map((l) => [l.name || l.lead_id, l.total_quoted]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rapport-${report.period.month}-global-clean-home.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reporting() {
  // Mois courant par défaut
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(defaultMonth);

  // Liste des 12 derniers mois pour le picker
  const monthOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      opts.push({ value: ym, label: ymToLabel(ym) });
    }
    return opts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: report, isLoading, error, refetch, isFetching } = useReportingMonthly(month);

  const handleDownloadPDF = async () => {
    if (!report) return;
    try {
      toast.loading('Génération PDF…', { id: 'pdf-gen' });
      const filename = await generatePDF(report);
      toast.success(`PDF téléchargé : ${filename}`, { id: 'pdf-gen' });
    } catch (e) {
      toast.error(`Échec génération PDF : ${e?.message || 'erreur inconnue'}`, { id: 'pdf-gen' });
    }
  };

  const handleDownloadCSV = () => {
    if (!report) return;
    try {
      exportCSV(report);
      toast.success('CSV téléchargé');
    } catch (e) {
      toast.error('Échec export CSV');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3,#6b7280)', fontWeight: 500, marginBottom: 8 }}>
            Reporting · Mensuel
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 36, fontWeight: 300, letterSpacing: '-0.025em', color: 'var(--ink,#111827)', margin: 0, lineHeight: 1 }}>
            Rapport <em style={{ color: 'var(--brand,#047857)', fontWeight: 400 }}>{ymToLabel(month)}</em>
          </h1>
          <p style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-3,#6b7280)', marginTop: 6 }}>
            Synthèse complète exportable PDF & CSV, comparée au mois précédent
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--line,#e5e7eb)', fontSize: 13, fontWeight: 600, background: 'white', cursor: 'pointer' }}>
            {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={() => refetch()} disabled={isFetching}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--line,#e5e7eb)', fontSize: 12, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} /> Actualiser
          </button>
          <button onClick={handleDownloadCSV} disabled={!report}
            style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--line,#e5e7eb)', fontSize: 12, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={12} /> CSV
          </button>
          <button onClick={handleDownloadPDF} disabled={!report}
            style={{ padding: '10px 18px', borderRadius: 10, border: 0, fontSize: 13, fontWeight: 600, background: 'var(--brand,#047857)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> Télécharger PDF
          </button>
        </div>
      </div>

      {/* Loading / Error / Content */}
      {isLoading && !report ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3,#6b7280)' }}>
          Chargement du rapport mensuel…
        </div>
      ) : error ? (
        <div className="glass" style={{ padding: 40, textAlign: 'center', borderRadius: 'var(--lg-radius,18px)' }}>
          <p style={{ color: 'var(--rouge,#dc2626)', marginBottom: 12 }}>Erreur de chargement</p>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 16 }}>
            {String(error?.message || error || '')}
          </p>
          <button onClick={() => refetch()} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'white', cursor: 'pointer' }}>
            Réessayer
          </button>
        </div>
      ) : report && (
        <>
          {/* KPIs grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
            <KpiCard label="Leads créés" value={report.kpis.leads?.value} prev={report.kpis.leads?.prev}
              deltaPct={report.kpis.leads?.delta_pct} icon={Users} tone="#3b82f6" />
            <KpiCard label="Devis envoyés" value={report.kpis.quotes?.value} prev={report.kpis.quotes?.prev}
              deltaPct={report.kpis.quotes?.delta_pct} icon={FileText} tone="#f59e0b" />
            <KpiCard label="Valeur devis" value={report.kpis.quotes_amount?.value} prev={report.kpis.quotes_amount?.prev}
              deltaPct={report.kpis.quotes_amount?.delta_pct} icon={Receipt} formatter={fmtEUR} tone="#10b981" />
            <KpiCard label="Factures émises" value={report.kpis.invoices?.value} prev={report.kpis.invoices?.prev}
              deltaPct={report.kpis.invoices?.delta_pct} icon={Receipt} tone="#8b5cf6" />
            <KpiCard label="CA encaissé" value={report.kpis.revenue_collected?.value} prev={report.kpis.revenue_collected?.prev}
              deltaPct={report.kpis.revenue_collected?.delta_pct} icon={BadgeEuro} formatter={fmtEUR} tone="var(--brand,#047857)" />
            <KpiCard label="Taux conversion" value={report.kpis.conversion_rate?.value}
              prev={report.kpis.conversion_rate?.prev} deltaPct={null}
              icon={TrendingUp} formatter={(v) => `${v || 0}%`} tone="#06b6d4" />
          </div>

          {/* Tables grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 14 }}>
            <TableSection
              title="Top zones (par leads)"
              rows={report.top_zones}
              columns={[
                { key: 'city', label: 'Ville' },
                { key: 'leads_count', label: 'Leads', align: 'right', mono: true, format: fmtInt },
              ]}
            />
            <TableSection
              title="Top sources d'acquisition"
              rows={report.top_sources}
              columns={[
                { key: 'source', label: 'Source' },
                { key: 'leads_count', label: 'Leads', align: 'right', mono: true, format: fmtInt },
              ]}
            />
            <TableSection
              title="Répartition par service"
              rows={report.services_breakdown}
              columns={[
                { key: 'service', label: 'Service' },
                { key: 'count', label: 'Leads', align: 'right', mono: true, format: fmtInt },
              ]}
            />
          </div>

          <TableSection
            title="Top leads par valeur de devis"
            rows={report.top_leads}
            columns={[
              { key: 'name', label: 'Nom' },
              { key: 'total_quoted', label: 'Total devisé', align: 'right', mono: true, format: fmtEUR },
            ]}
          />
        </>
      )}
    </div>
  );
}
