// SeoFunnel.jsx — /seo/funnel
// Funnel de conversion : Visiteurs → CTA → Form → Lead → Devis → Facture
// Avec drop-off à chaque étape + filtres UTM (source / medium / campaign).

import React, { useMemo, useState } from 'react';
import {
  Users, MousePointerClick, FileEdit, CheckCircle2,
  UserPlus, Receipt, BadgeEuro, Filter, RefreshCw, X, TrendingDown, TrendingUp,
} from 'lucide-react';
import {
  PageHeader, KpiTile, LoadingState, EmptyState, fmt, useSeoFilter,
} from './SeoShared';
import { useFunnelConversion } from '../../hooks/api';

// Couleurs par étape (gradient cohérent du chaud (visite) au froid (facture))
const STEP_COLORS = [
  '#94a3b8', // visiteurs (neutre)
  '#f59e0b', // CTA (chaud)
  '#fb923c', // form page (orange)
  '#10b981', // form soumis (émeraude)
  '#059669', // lead (émeraude foncé)
  '#3b82f6', // devis (bleu)
  '#1e40af', // facture (bleu profond)
];

const STEP_ICONS = [Users, MousePointerClick, FileEdit, CheckCircle2, UserPlus, Receipt, BadgeEuro];

function FunnelBar({ step, index, maxCount }) {
  const Icon = STEP_ICONS[index] || Users;
  const color = STEP_COLORS[index] || '#94a3b8';
  const widthPct = maxCount > 0 ? Math.max(8, (step.count / maxCount) * 100) : 0;
  const isFirst = index === 0;
  const dropOff = step.drop_off_from_prev || 0;

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Header : icon + label + count + % */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: `${color}22`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="seo-display" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            {step.label}
          </div>
          <div className="seo-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
            {fmt(step.count)} · {step.pct_of_total}% du total
          </div>
        </div>
        {!isFirst && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            color: dropOff >= 50 ? 'var(--rouge,#dc2626)' : dropOff >= 20 ? 'var(--gold,#ca8a04)' : 'var(--emerald,#059669)',
            background: dropOff >= 50 ? 'var(--rouge-soft,#fee2e2)' : dropOff >= 20 ? 'var(--gold-soft,#fef3c7)' : 'var(--emerald-soft,#d1fae5)',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {dropOff >= 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
            {dropOff > 0 ? '-' : '+'}{Math.abs(dropOff)}%
          </div>
        )}
      </div>

      {/* Bar */}
      <div style={{
        height: 28, background: 'var(--surface-2)', borderRadius: 8, overflow: 'hidden',
        position: 'relative', marginLeft: 42,
      }}>
        <div style={{
          height: '100%', width: `${widthPct}%`,
          background: `linear-gradient(90deg, ${color}DD 0%, ${color}AA 100%)`,
          borderRadius: 8,
          transition: 'width 0.6s cubic-bezier(0.22, 0.61, 0.36, 1)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          paddingRight: 12, color: 'white', fontSize: 12, fontWeight: 600,
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {widthPct > 15 && fmt(step.count)}
        </div>
      </div>
    </div>
  );
}

function UtmFilter({ filters, setFilters }) {
  const has = filters.utm_source || filters.utm_medium || filters.utm_campaign;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>
        <Filter style={{ width: 14, height: 14 }} /> UTM :
      </div>
      <input
        type="text" placeholder="source (google, facebook…)" value={filters.utm_source || ''}
        onChange={(e) => setFilters((f) => ({ ...f, utm_source: e.target.value }))}
        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', minWidth: 180 }}
      />
      <input
        type="text" placeholder="medium (cpc, organic…)" value={filters.utm_medium || ''}
        onChange={(e) => setFilters((f) => ({ ...f, utm_medium: e.target.value }))}
        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', minWidth: 160 }}
      />
      <input
        type="text" placeholder="campaign" value={filters.utm_campaign || ''}
        onChange={(e) => setFilters((f) => ({ ...f, utm_campaign: e.target.value }))}
        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', minWidth: 160 }}
      />
      {has && (
        <button
          onClick={() => setFilters({ utm_source: '', utm_medium: '', utm_campaign: '' })}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 11, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <X size={12} /> Reset
        </button>
      )}
    </div>
  );
}

export default function SeoFunnel() {
  const { days } = useSeoFilter();
  const [filters, setFilters] = useState({ utm_source: '', utm_medium: '', utm_campaign: '' });
  const { data, isLoading, error, refetch, isFetching } = useFunnelConversion(days, filters);

  const funnel = data?.funnel || [];
  const totals = data?.totals || {};
  const maxCount = useMemo(() => funnel.reduce((max, s) => Math.max(max, s.count), 0), [funnel]);

  if (isLoading && !data) return <LoadingState message="Calcul du funnel de conversion…" />;

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Audience · Funnel"
        title={<>Funnel de <em>conversion</em></>}
        subtitle={`Visiteurs → CTA → Lead → Devis → Facture · ${days}j`}
        actions={
          <button onClick={() => refetch()} className="seo-chip">
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} /> Actualiser
          </button>
        }
      />

      {/* KPIs résumé */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <KpiTile label="Visiteurs uniques" value={fmt(totals.visitors || 0)} tone="var(--navy)" icon={Users} />
        <KpiTile label="Leads créés" value={fmt(totals.leads || 0)} tone="var(--emerald)" icon={UserPlus}
          sub={`Conversion ${totals.conversion_rate_pct || 0}%`} />
        <KpiTile label="Devis envoyés" value={fmt(totals.quotes || 0)} tone="var(--navy)" icon={Receipt} />
        <KpiTile label="Factures émises" value={fmt(totals.invoices || 0)} tone="var(--gold)" icon={BadgeEuro} />
      </div>

      {/* Filtres UTM */}
      <UtmFilter filters={filters} setFilters={setFilters} />

      {/* Funnel principal */}
      {error ? (
        <div className="seo-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ color: 'var(--rouge,#dc2626)', marginBottom: 8, fontWeight: 600 }}>Erreur de chargement</div>
          <div className="seo-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 16 }}>
            {String(error?.message || error || '')}
          </div>
          <button onClick={() => refetch()} className="seo-chip">Réessayer</button>
        </div>
      ) : funnel.length === 0 || (totals.visitors === 0) ? (
        <EmptyState
          icon={Users}
          title="Aucun visiteur dans la période"
          message="Attends que des visiteurs naviguent sur le site pour voir le funnel se remplir."
        />
      ) : (
        <div className="seo-card" style={{ padding: 28 }}>
          {funnel.map((step, i) => (
            <FunnelBar key={step.label} step={step} index={i} maxCount={maxCount} />
          ))}

          {/* Synthèse interprétation */}
          <div style={{
            marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--line-2)',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
          }}>
            <div>
              <div className="seo-label" style={{ marginBottom: 6 }}>Plus gros drop-off</div>
              <div style={{ fontSize: 14, color: 'var(--ink)', fontFamily: 'Fraunces, serif' }}>
                {(() => {
                  const worst = funnel.slice(1).reduce((w, s) => (s.drop_off_from_prev > w.drop_off_from_prev ? s : w), funnel[1] || { drop_off_from_prev: 0, label: '—' });
                  return `${worst.label} : ${worst.drop_off_from_prev}% perdus`;
                })()}
              </div>
            </div>
            <div>
              <div className="seo-label" style={{ marginBottom: 6 }}>Taux conversion global</div>
              <div className="seo-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--emerald,#059669)' }}>
                {totals.conversion_rate_pct || 0}%
                <span style={{ fontSize: 12, color: 'var(--ink-3)', marginLeft: 8, fontFamily: 'Fraunces, serif', fontStyle: 'italic' }}>
                  visiteur → lead
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
