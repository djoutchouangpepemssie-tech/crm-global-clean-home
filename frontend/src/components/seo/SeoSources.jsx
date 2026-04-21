// SeoSources.jsx — /seo/sources
// Canaux d'acquisition, UTM, Ads ROI, comparaison performance.

import React from 'react';
import {
  BarChart3, Euro, Facebook, Globe, MousePointerClick, PiggyBank,
  Search, Share2, Target, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, ErrorState, EmptyState,
  fmt, fmtPct, useSeoFilter,
} from './SeoShared';
import {
  useGa4Analytics, useTrackerFunnel, useAdsSummary,
} from '../../hooks/api';

const CHANNEL_COLORS = {
  'Organic Search': 'oklch(0.52 0.13 165)',
  'Google': 'oklch(0.52 0.13 165)',
  'Google Ads': 'oklch(0.72 0.13 85)',
  'Direct': 'oklch(0.35 0.08 240)',
  'Referral': 'oklch(0.55 0.08 220)',
  'Social': 'oklch(0.62 0.14 45)',
  'Facebook': 'oklch(0.62 0.14 45)',
  'Meta Ads': 'oklch(0.55 0.18 25)',
  'Instagram': 'oklch(0.62 0.14 45)',
  'Email': 'oklch(0.72 0.13 85)',
  'Bing': 'oklch(0.38 0.14 160)',
};

function channelColor(name) {
  return CHANNEL_COLORS[name] || 'oklch(0.55 0.08 220)';
}

export default function SeoSources() {
  const { days } = useSeoFilter();
  const period = days <= 7 ? '7d' : days >= 90 ? '90d' : '30d';
  const { data: ga4, isLoading } = useGa4Analytics(days);
  const { data: funnel } = useTrackerFunnel(period);
  const { data: ads } = useAdsSummary();

  if (isLoading && !ga4) return <LoadingState message="Analyse des sources…" />;

  const ga4Sources = ga4?.sources || [];
  const channels = funnel?.channels || [];

  const totalSessions = ga4Sources.reduce((a, c) => a + (c.sessions || 0), 0);
  const totalConversions = ga4Sources.reduce((a, c) => a + (c.conversions || 0), 0);
  const totalLeads = channels.reduce((a, c) => a + (c.leads || 0), 0);
  const totalRevenue = channels.reduce((a, c) => a + (c.revenue || 0), 0);

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Sources"
        title={<>Canaux <em>d'acquisition</em></>}
        subtitle={`GA4 + attribution CRM + Ads ROI — ${days} jours.`}
      />

      {/* KPIs consolidés */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile label="Sessions" value={fmt(totalSessions)} tone="var(--navy)" icon={Globe} />
        <KpiTile label="Conversions GA4" value={fmt(totalConversions)} tone="var(--emerald)" icon={Target} />
        <KpiTile label="Leads attribués" value={fmt(totalLeads)} tone="var(--warm)" icon={TrendingUp} />
        <KpiTile label="Revenue total" value={`${fmt(totalRevenue)} €`} tone="var(--emerald-deep)" icon={Euro} />
      </div>

      {/* Mix GA4 : sessions par canal */}
      <SectionHeader eyebrow="GA4 — Trafic" title="Mix de sessions par canal"
        subtitle="Channel grouping par défaut de Google Analytics 4." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div className="seo-card" style={{ padding: 22 }}>
          <div className="seo-label" style={{ marginBottom: 12 }}>Répartition visuelle</div>
          {ga4Sources.length === 0 ? (
            <EmptyState icon={Globe} title="Pas encore de données GA4" />
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ga4Sources} dataKey="sessions" nameKey="channel" outerRadius={90}
                       label={(d) => `${d.channel}: ${fmt(d.sessions)}`}>
                    {ga4Sources.map((s, i) => (
                      <Cell key={i} fill={channelColor(s.channel)} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="seo-card" style={{ padding: 0, overflow: 'hidden' }}>
          {ga4Sources.length === 0 ? (
            <div style={{ padding: 24 }}>
              <EmptyState icon={Share2} title="Sessions par canal" message="Les données arriveront avec GA4." />
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <th style={th}>Canal</th>
                  <th style={thRight}>Sessions</th>
                  <th style={thRight}>Conversions</th>
                  <th style={thRight}>Conv. rate</th>
                </tr>
              </thead>
              <tbody>
                {ga4Sources.map((s, i) => {
                  const cr = s.sessions > 0 ? (s.conversions / s.sessions) * 100 : 0;
                  return (
                    <tr key={i} style={{ borderTop: '1px solid var(--line-2)' }}>
                      <td style={td}>
                        <span style={{
                          display: 'inline-block', width: 8, height: 8, borderRadius: 999,
                          background: channelColor(s.channel), marginRight: 8, verticalAlign: 'middle',
                        }} />
                        {s.channel}
                      </td>
                      <td style={tdRight}>{fmt(s.sessions)}</td>
                      <td style={tdRight}>{fmt(s.conversions)}</td>
                      <td style={{ ...tdRight, color: cr > 3 ? 'var(--emerald)' : cr > 1 ? 'var(--gold)' : 'var(--rouge)' }}>
                        {fmtPct(cr, 2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Attribution CRM par canal */}
      <SectionHeader eyebrow="Attribution CRM" title="Leads & revenue par canal"
        subtitle="Attribution UTM consolidée. Le revenue est celui des factures payées." />
      <div className="seo-card" style={{ padding: 22, marginBottom: 28 }}>
        {channels.length === 0 ? (
          <EmptyState icon={Target} title="Pas encore d'attribution CRM"
            message="Ajoutez des UTM aux liens de vos campagnes pour voir qui convertit." />
        ) : (
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channels} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.010 78)" />
                <XAxis dataKey="channel" stroke="oklch(0.52 0.010 60)" style={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                <YAxis yAxisId="l" stroke="oklch(0.52 0.010 60)" style={{ fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" stroke="oklch(0.52 0.010 60)" style={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="leads" fill="oklch(0.35 0.08 240)" radius={[4, 4, 0, 0]} name="Leads" />
                <Bar yAxisId="l" dataKey="won" fill="oklch(0.72 0.13 85)" radius={[4, 4, 0, 0]} name="Gagnés" />
                <Bar yAxisId="r" dataKey="revenue" fill="oklch(0.52 0.13 165)" radius={[4, 4, 0, 0]} name="Revenue (€)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Ads ROI si dispo */}
      {ads && (
        <>
          <SectionHeader eyebrow="Campagnes payantes" title="Performance des campagnes Ads"
            subtitle="ROI, CPL, CPA consolidés sur l'ensemble des plateformes Google/Meta." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
            <KpiTile label="Dépense Ads" value={`${fmt(ads.total_spend || 0)} €`} tone="var(--rouge)" icon={PiggyBank} />
            <KpiTile label="Leads Ads" value={fmt(ads.total_leads || 0)} tone="var(--warm)" icon={TrendingUp}
              sub={ads.cpl ? `${ads.cpl} € CPL` : '—'} />
            <KpiTile label="Conversions" value={fmt(ads.total_conversions || 0)} tone="var(--gold)" icon={Target}
              sub={ads.cpa ? `${ads.cpa} € CPA` : '—'} />
            <KpiTile
              label="ROAS" value={ads.roas ? `${ads.roas}x` : '—'}
              tone={ads.roas >= 3 ? 'var(--emerald)' : ads.roas >= 1 ? 'var(--gold)' : 'var(--rouge)'}
              icon={Euro} sub={ads.roi !== undefined ? `ROI ${ads.roi}%` : '—'} />
          </div>
        </>
      )}
    </div>
  );
}

const th = { padding: '12px 14px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace',
             fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 };
const thRight = { ...th, textAlign: 'right' };
const td = { padding: '11px 14px', fontSize: 13, color: 'var(--ink)' };
const tdRight = { ...td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 };
