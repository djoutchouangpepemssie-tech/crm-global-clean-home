// SeoConversion.jsx — /seo/conversion
// Funnel complet visite -> facture + attribution par canal + revenue.

import React from 'react';
import {
  BarChart3, Coins, DollarSign, Euro, Funnel, MousePointerClick,
  Send, Target, TrendingUp, Users,
} from 'lucide-react';
import {
  FunnelChart, Funnel as ReFunnel, LabelList, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, ErrorState, EmptyState,
  fmt, fmtPct, useSeoFilter,
} from './SeoShared';
import { useTrackerFunnel, useGa4Analytics, useCrmAnalytics } from '../../hooks/api';

const STEP_COLORS = [
  'oklch(0.55 0.08 220)', // cool
  'oklch(0.55 0.08 220)',
  'oklch(0.35 0.08 240)', // navy
  'oklch(0.72 0.13 85)',  // gold
  'oklch(0.62 0.14 45)',  // warm
  'oklch(0.62 0.14 45)',
  'oklch(0.52 0.13 165)', // emerald
  'oklch(0.52 0.13 165)',
  'oklch(0.38 0.14 160)', // emerald deep
];

export default function SeoConversion() {
  const { days } = useSeoFilter();
  const period = days <= 7 ? '7d' : days >= 90 ? '90d' : '30d';
  const { data: funnel, isLoading, error } = useTrackerFunnel(period);
  const { data: ga4 } = useGa4Analytics(days);
  const { data: crm } = useCrmAnalytics();

  if (isLoading && !funnel) return <LoadingState message="Calcul du funnel complet…" />;
  if (error) return <ErrorState message="Impossible de charger le funnel." />;

  const steps = funnel?.funnel || [];
  const rates = funnel?.rates || {};
  const channels = funnel?.channels || [];
  const revenue = funnel?.revenue || 0;
  const pipeline = funnel?.pipeline || 0;

  // Data pour le FunnelChart Recharts
  const funnelData = steps.map((s, i) => ({
    name: s.step,
    value: Math.max(s.value, 1), // éviter 0 pour le visuel
    fill: STEP_COLORS[i] || 'oklch(0.35 0.08 240)',
  }));

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Conversion"
        title={<>Funnel <em>visite → facture</em></>}
        subtitle={`Suivi bout-en-bout sur ${period}, attribution UTM par canal, revenue consolidé.`}
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile label="Visiteurs uniques" value={fmt(steps[0]?.value || 0)} tone="var(--cool)" icon={Users} />
        <KpiTile label="Leads générés" value={fmt(steps.find(s => s.step.includes('Leads CRM'))?.value || 0)}
          tone="var(--warm)" icon={Send} sub={`${fmtPct(rates.visit_to_lead, 2)} taux global`} />
        <KpiTile label="Devis envoyés" value={fmt(steps.find(s => s.step.includes('Devis'))?.value || 0)}
          tone="var(--gold)" icon={BarChart3} sub={`${fmtPct(rates.lead_to_quote, 1)} des leads`} />
        <KpiTile label="Revenue attribué" value={`${fmt(revenue)} €`} tone="var(--emerald)" icon={Coins}
          sub={pipeline ? `${fmt(pipeline)} € pipeline` : '—'} />
      </div>

      {/* Funnel chart principal */}
      <SectionHeader eyebrow="Pipeline" title="Les 9 étapes"
        subtitle="Chaque étape mesure le passage d'un visiteur vers une action plus engageante." />
      <div className="seo-card" style={{ padding: 22, marginBottom: 28 }}>
        <div style={{ height: 420 }}>
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <ReFunnel dataKey="value" data={funnelData} isAnimationActive>
                <LabelList position="right" fill="var(--ink)" stroke="none"
                  fontSize={13} fontFamily="Fraunces, serif" dataKey="name" />
                <LabelList position="center" fill="oklch(0.97 0.01 80)" stroke="none"
                  fontSize={13} fontWeight={700} dataKey="value" formatter={(v) => fmt(v)} />
              </ReFunnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Taux inter-étapes */}
      <SectionHeader eyebrow="Conversion rates" title="Taux de passage étape par étape" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Visite → CTA', key: 'visit_to_cta', tone: 'var(--cool)' },
          { label: 'CTA → Formulaire', key: 'cta_to_form', tone: 'var(--navy)' },
          { label: 'Formulaire → Lead', key: 'form_to_lead', tone: 'var(--gold)' },
          { label: 'Lead → Devis', key: 'lead_to_quote', tone: 'var(--warm)' },
          { label: 'Devis → Gagné', key: 'quote_to_won', tone: 'var(--emerald)' },
          { label: 'Gagné → Payé', key: 'won_to_paid', tone: 'var(--emerald-deep)' },
          { label: 'Visite → Lead', key: 'visit_to_lead', tone: 'var(--navy)' },
          { label: 'Visite → Payé', key: 'visit_to_paid', tone: 'var(--emerald)' },
        ].map((x) => (
          <div key={x.key} className="seo-card" style={{ padding: 16 }}>
            <div className="seo-label" style={{ fontSize: 9 }}>{x.label}</div>
            <div className="seo-mono" style={{ fontSize: 22, fontWeight: 700, color: x.tone, marginTop: 4 }}>
              {fmtPct(rates[x.key] || 0, 2)}
            </div>
          </div>
        ))}
      </div>

      {/* Canaux */}
      <SectionHeader eyebrow="Attribution" title="Leads & revenue par canal"
        subtitle="Attribution UTM avec fallback sur le referrer." />
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 28 }}>
        <div className="seo-card" style={{ padding: 0, overflow: 'hidden' }}>
          {channels.length === 0 ? (
            <div style={{ padding: 24 }}>
              <EmptyState icon={Target} title="Pas encore d'attribution"
                message="Installez le tracker sur toutes les pages avec UTM dans vos liens." />
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <th style={th}>Canal</th>
                  <th style={thRight}>Leads</th>
                  <th style={thRight}>Gagnés</th>
                  <th style={thRight}>Taux</th>
                  <th style={thRight}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--line-2)' }}>
                    <td style={td}>
                      <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}>{c.channel}</span>
                    </td>
                    <td style={tdRight}>{fmt(c.leads)}</td>
                    <td style={tdRight}>{fmt(c.won)}</td>
                    <td style={tdRight}>{c.leads > 0 ? fmtPct((c.won / c.leads) * 100, 1) : '—'}</td>
                    <td style={{ ...tdRight, color: c.revenue > 0 ? 'var(--emerald-deep)' : 'var(--ink-3)', fontWeight: 700 }}>
                      {fmt(c.revenue)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="seo-card" style={{ padding: 22 }}>
          <div className="seo-label" style={{ color: 'var(--emerald)' }}>Revenue par canal</div>
          <div className="seo-display" style={{ fontSize: 18, marginTop: 4, marginBottom: 14 }}>
            <Euro style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 6, color: 'var(--emerald)' }} />
            Classement chiffré
          </div>
          {channels.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Pas encore de revenue attribué.</div>
          ) : (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channels.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.010 78)" />
                  <XAxis dataKey="channel" stroke="oklch(0.52 0.010 60)" style={{ fontSize: 10 }} />
                  <YAxis stroke="oklch(0.52 0.010 60)" style={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="oklch(0.38 0.14 160)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* CA & pipeline CRM */}
      {crm?.funnel && (
        <>
          <SectionHeader eyebrow="CRM" title="Vue pipeline financier"
            subtitle="Réconciliation entre leads, devis, factures et paiements." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
            <KpiTile label="Leads cumulés" value={fmt(crm.funnel.leads || 0)} tone="var(--navy)" icon={Users} />
            <KpiTile label="Devis cumulés" value={fmt(crm.funnel.quotes || 0)} tone="var(--gold)" icon={Send} />
            <KpiTile label="Factures cumulées" value={fmt(crm.funnel.invoices || 0)} tone="var(--warm)" icon={BarChart3} />
            <KpiTile label="Factures payées" value={fmt(crm.funnel.paid || 0)} tone="var(--emerald)" icon={Coins} />
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
