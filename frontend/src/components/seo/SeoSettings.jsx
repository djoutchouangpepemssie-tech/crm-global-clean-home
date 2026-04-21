// SeoSettings.jsx — /seo/settings
// Configuration intégrations + snippet + préférences.
// Centralise ce qui doit être configurable par l'user : seuils,
// sources à connecter, snippet à installer, et futurs toggles.

import React, { useState } from 'react';
import {
  Activity, AlertCircle, Bell, Cable, Check, CheckCircle, Copy, Database,
  Globe, Key, Lock, Search, Settings, Shield, Target, Wrench, Zap,
} from 'lucide-react';
import {
  PageHeader, SectionHeader, LoadingState, ErrorState,
  fmt, fmtPct, useSeoFilter,
} from './SeoShared';
import { useTrackerHealth, useTrackerSnippet } from '../../hooks/api';

function StatusBadge({ status }) {
  const map = {
    ok: { tone: 'var(--emerald)', bg: 'var(--emerald-soft)', label: 'Connecté', icon: CheckCircle },
    partial: { tone: 'var(--gold)', bg: 'var(--gold-soft)', label: 'Partiel', icon: AlertCircle },
    stale: { tone: 'var(--gold)', bg: 'var(--gold-soft)', label: 'Inactif', icon: AlertCircle },
    disconnected: { tone: 'var(--rouge)', bg: 'var(--rouge-soft)', label: 'Déconnecté', icon: AlertCircle },
    error: { tone: 'var(--rouge)', bg: 'var(--rouge-soft)', label: 'Erreur', icon: AlertCircle },
  };
  const m = map[status] || map.error;
  const SIcon = m.icon;
  return (
    <span className="seo-pill" style={{ color: m.tone, background: m.bg, borderColor: m.tone }}>
      <SIcon style={{ width: 11, height: 11 }} /> {m.label}
    </span>
  );
}

function IntegrationCard({ icon: Icon, title, subtitle, status, action, children }) {
  return (
    <div className="seo-card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: 'var(--surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)',
          }}>
            <Icon style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="seo-display" style={{ fontSize: 17, fontWeight: 500 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{subtitle}</div>}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
      {children}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

function SnippetInline({ snippet }) {
  const [copied, setCopied] = useState(false);
  if (!snippet) return null;
  const copy = () => {
    navigator.clipboard.writeText(snippet.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div style={{
      background: 'oklch(0.18 0.015 60)', color: 'oklch(0.92 0.008 80)',
      borderRadius: 10, padding: '10px 14px',
      fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
      overflowX: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <code style={{ whiteSpace: 'nowrap' }}>{snippet.html}</code>
      <button onClick={copy} style={{
        padding: '6px 10px', borderRadius: 8, background: 'oklch(0.32 0.02 60)',
        color: 'oklch(0.95 0.01 80)', border: 'none', cursor: 'pointer',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        {copied ? <><Check style={{ width: 11, height: 11 }} /> OK</> : <><Copy style={{ width: 11, height: 11 }} /> Copier</>}
      </button>
    </div>
  );
}

export default function SeoSettings() {
  const { data: health, isLoading } = useTrackerHealth();
  const { data: snippet } = useTrackerSnippet();

  if (isLoading && !health) return <LoadingState message="Chargement de la configuration…" />;

  const src = health?.sources || {};

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Configuration"
        title={<>Paramètres & <em>intégrations</em></>}
        subtitle={`Source de vérité pour les connexions et le tracking — site ${health?.site?.replace(/^https?:\/\//, '') || 'globalcleanhome.com'}.`}
      />

      {/* Intégrations */}
      <SectionHeader eyebrow="Intégrations" title="Sources connectées"
        subtitle="GA4, Search Console, Tracker et Ads pilotent tout le cockpit." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <IntegrationCard
          icon={Activity} title="Google Analytics 4"
          subtitle={src.ga4?.property ? `Property ${src.ga4.property}` : 'Property GA4'}
          status={src.ga4?.status}
        >
          <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-3)' }}>Sessions 48h</span>
              <span className="seo-mono" style={{ fontWeight: 700 }}>{fmt(src.ga4?.sessions_last_48h || 0)}</span>
            </div>
          </div>
        </IntegrationCard>

        <IntegrationCard
          icon={Search} title="Google Search Console"
          subtitle={src.gsc?.site || 'Site indexé'}
          status={src.gsc?.status}
        >
          <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-3)' }}>Clics 7j</span>
              <span className="seo-mono" style={{ fontWeight: 700 }}>{fmt(src.gsc?.clicks_7d || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-3)' }}>Impressions 7j</span>
              <span className="seo-mono" style={{ fontWeight: 700 }}>{fmt(src.gsc?.impressions_7d || 0)}</span>
            </div>
          </div>
        </IntegrationCard>

        <IntegrationCard
          icon={Zap} title="Tracker custom (site)"
          subtitle="Events visite → lead direct dans le CRM"
          status={src.tracker?.status}
        >
          <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-3)' }}>Events 24h</span>
              <span className="seo-mono" style={{ fontWeight: 700 }}>{fmt(src.tracker?.events_24h || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-3)' }}>Visiteurs 24h</span>
              <span className="seo-mono" style={{ fontWeight: 700 }}>{fmt(src.tracker?.visitors_24h || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-3)' }}>Dernier event</span>
              <span className="seo-mono" style={{ fontSize: 11 }}>
                {src.tracker?.last_event_at ? new Date(src.tracker.last_event_at).toLocaleString('fr-FR') : '—'}
              </span>
            </div>
          </div>
        </IntegrationCard>

        <IntegrationCard
          icon={Target} title="Google / Meta Ads"
          subtitle="Attribution des campagnes payantes"
          status={src.ads?.status}
        >
          <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-3)' }}>Campagnes enregistrées</span>
              <span className="seo-mono" style={{ fontWeight: 700 }}>{fmt(src.ads?.campaigns || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-3)' }}>Entrées dépenses 30j</span>
              <span className="seo-mono" style={{ fontWeight: 700 }}>{fmt(src.ads?.spends_entries_30d || 0)}</span>
            </div>
          </div>
        </IntegrationCard>
      </div>

      {/* Snippet */}
      <SectionHeader eyebrow="Installation" title="Snippet de tracking"
        subtitle={`À coller avant </head> sur toutes les pages de ${health?.site || 'ton site'}.`} />
      <div className="seo-card" style={{ padding: 22, marginBottom: 28 }}>
        <SnippetInline snippet={snippet} />
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 10 }}>
          Plus de détails et funnel live dans <a href="/seo/connect" style={{ color: 'var(--navy)', fontWeight: 600 }}>la page Connexion</a>.
        </div>
      </div>

      {/* Seuils d'alerte (placeholder) */}
      <SectionHeader eyebrow="Alertes" title="Seuils de détection"
        subtitle="Valeurs par défaut — la configuration utilisateur arrive en Phase 2." />
      <div className="seo-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th style={th}>Règle</th>
              <th style={thRight}>Seuil</th>
              <th style={thRight}>Sévérité</th>
              <th style={thRight}>État</th>
            </tr>
          </thead>
          <tbody>
            {[
              { r: 'Chute de clics',   s: '-20% vs période précédente', sev: 'critical' },
              { r: 'CTR faible',       s: '< 1.5% moyen', sev: 'warning' },
              { r: 'Position faible',  s: '> 15 moyen', sev: 'warning' },
              { r: 'Taux de rebond',   s: '> 70%', sev: 'warning' },
              { r: 'Connexion source', s: 'status != ok', sev: 'critical' },
              { r: 'Conversion',       s: '< 1% avec >500 sessions', sev: 'critical' },
            ].map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--line-2)' }}>
                <td style={td}>{r.r}</td>
                <td style={tdRight}>{r.s}</td>
                <td style={tdRight}>
                  <span className={`seo-pill seo-sev-${r.sev}`}>{r.sev}</span>
                </td>
                <td style={tdRight}>
                  <span className="seo-mono" style={{ color: 'var(--emerald)', fontWeight: 700 }}>ACTIF</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Préférences (placeholder) */}
      <SectionHeader eyebrow="Préférences" title="Personnalisation (à venir)"
        subtitle="Customisation des seuils, alertes email, exports automatiques." />
      <div className="seo-card" style={{ padding: 22, marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Settings style={{ width: 22, height: 22, color: 'var(--ink-3)' }} />
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500 }}>
              Paramètres utilisateur — Phase 2
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
              Seuils d'alerte personnalisables · Notifications email · Exports planifiés CSV/PDF · API key CRM.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const th = { padding: '12px 14px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace',
             fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 };
const thRight = { ...th, textAlign: 'right' };
const td = { padding: '12px 14px', fontSize: 13, color: 'var(--ink)' };
const tdRight = { ...td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 };
