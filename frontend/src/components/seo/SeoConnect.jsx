// SeoConnect.jsx — Page "Connexion & Tracking"
// Mission : prouver que tout est BRANCHE sur globalcleanhome.com.
// - Santé temps réel GA4 / GSC / Tracker / Ads (endpoint /api/tracker/health)
// - Snippet JS à copier pour installer sur le site
// - Feed live des derniers events reçus
// - Funnel bout-en-bout visite -> lead -> facture

import React, { useState } from 'react';
import {
  Activity, AlertCircle, Cable, Check, CheckCircle, ChevronRight, Copy,
  ExternalLink, Eye, Globe, Info, Loader2, MousePointerClick, Phone,
  RefreshCw, Search, Send, Smartphone, Target, TrendingUp, Zap,
} from 'lucide-react';
import {
  PageHeader, SectionHeader, EmptyState, LoadingState, ErrorState,
  KpiTile, fmt, fmtPct,
} from './SeoShared';
import {
  useTrackerHealth, useTrackerSnippet, useTrackerRecent, useTrackerFunnel,
} from '../../hooks/api';
import { useSeoFilter } from './SeoShared';

/* ═══════════════ HELPERS VISUELS ═══════════════ */
function StatusBadge({ status }) {
  const map = {
    ok:           { tone: 'var(--emerald)', bg: 'var(--emerald-soft)', label: 'Connecté', icon: CheckCircle },
    partial:      { tone: 'var(--gold)',    bg: 'var(--gold-soft)',    label: 'Partiel',   icon: AlertCircle },
    stale:        { tone: 'var(--gold)',    bg: 'var(--gold-soft)',    label: 'Inactif',   icon: AlertCircle },
    disconnected: { tone: 'var(--rouge)',   bg: 'var(--rouge-soft)',   label: 'Déconnecté', icon: AlertCircle },
    down:         { tone: 'var(--rouge)',   bg: 'var(--rouge-soft)',   label: 'En panne',   icon: AlertCircle },
    error:        { tone: 'var(--rouge)',   bg: 'var(--rouge-soft)',   label: 'Erreur',     icon: AlertCircle },
  };
  const m = map[status] || { tone: 'var(--ink-4)', bg: 'var(--surface-2)', label: '—', icon: Info };
  const Icon = m.icon;
  return (
    <span className="seo-pill" style={{ color: m.tone, background: m.bg, borderColor: m.tone }}>
      <Icon style={{ width: 11, height: 11 }} />
      {m.label}
    </span>
  );
}

function SourceCard({ name, label, description, sub, status, meta, onOpen }) {
  const tone =
    status === 'ok' ? 'var(--emerald)' :
    (status === 'partial' || status === 'stale') ? 'var(--gold)' :
    'var(--rouge)';
  return (
    <div className="seo-card seo-card-hover" style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `color-mix(in oklch, ${tone} 14%, transparent)`,
            color: tone,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {name === 'ga4' && <TrendingUp style={{ width: 20, height: 20 }} />}
            {name === 'gsc' && <Search style={{ width: 20, height: 20 }} />}
            {name === 'tracker' && <Activity style={{ width: 20, height: 20 }} />}
            {name === 'ads' && <Target style={{ width: 20, height: 20 }} />}
          </div>
          <div>
            <div className="seo-label" style={{ color: 'var(--ink-4)' }}>{label}</div>
            <div className="seo-display" style={{ fontSize: 18, fontWeight: 500, marginTop: 2 }}>{description}</div>
            {sub && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{sub}</div>}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {meta && (
        <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
          {meta.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--ink-3)' }}>{m.k}</span>
              <span className="seo-mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>{m.v}</span>
            </div>
          ))}
        </div>
      )}

      {onOpen && (
        <button onClick={onOpen} className="seo-chip" style={{ marginTop: 16 }}>
          Détail <ChevronRight style={{ width: 12, height: 12 }} />
        </button>
      )}
    </div>
  );
}

/* ═══════════════ SNIPPET BOX ═══════════════ */
function SnippetBox({ snippet }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    try {
      navigator.clipboard.writeText(snippet.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {}
  };

  return (
    <div className="seo-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
        <div>
          <div className="seo-label" style={{ color: 'var(--ink-4)' }}>1 · Installation</div>
          <div className="seo-display" style={{ fontSize: 22, fontWeight: 500, marginTop: 4 }}>
            Snippet à <em style={{ color: 'var(--navy)', fontStyle: 'italic' }}>coller sur le site</em>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
            Placer juste avant <code className="seo-mono">&lt;/head&gt;</code> sur toutes les pages.
            Capture pageview, clics CTA, formulaires, scroll, temps et UTM.
          </div>
        </div>
        <button onClick={onCopy} className="seo-cta" style={{ flexShrink: 0 }}>
          {copied ? <><Check style={{ width: 14, height: 14 }} /> Copié</> : <><Copy style={{ width: 14, height: 14 }} /> Copier</>}
        </button>
      </div>

      <pre style={{
        background: 'oklch(0.18 0.015 60)', color: 'oklch(0.92 0.008 80)',
        padding: '14px 16px', borderRadius: 12,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
        overflowX: 'auto', margin: 0,
        border: '1px solid oklch(0.28 0.02 60)',
      }}>
{snippet.html}
      </pre>

      <div style={{
        marginTop: 14, padding: 14, background: 'var(--navy-soft)',
        borderRadius: 10, border: '1px solid color-mix(in oklch, var(--navy) 30%, transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Zap style={{ width: 14, height: 14, color: 'var(--navy)' }} />
          <span className="seo-label" style={{ color: 'var(--navy)' }}>Bonus : tagger un bouton comme CTA</span>
        </div>
        <code className="seo-mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
          &lt;a href="/devis" data-gch-cta="devis"&gt;Demander un devis&lt;/a&gt;
        </code>
      </div>
    </div>
  );
}

/* ═══════════════ FUNNEL CARDS ═══════════════ */
function FunnelBar({ funnel }) {
  if (!funnel?.length) return null;
  const max = Math.max(...funnel.map((f) => f.value), 1);
  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
      {funnel.map((step, i) => {
        const pct = (step.value / max) * 100;
        const tone =
          i <= 2 ? 'var(--cool)' :
          i <= 4 ? 'var(--gold)' :
          i <= 6 ? 'var(--warm)' : 'var(--emerald)';
        return (
          <div key={step.step}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
              <span style={{ color: 'var(--ink-2)', fontFamily: 'Fraunces, serif' }}>{step.step}</span>
              <span className="seo-mono" style={{ color: 'var(--ink)', fontWeight: 700 }}>{fmt(step.value)}</span>
            </div>
            <div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`, background: tone,
                borderRadius: 999, transition: 'width .6s',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════ EVENT ROW (live feed) ═══════════════ */
function eventIcon(t) {
  if (t === 'page_view') return Eye;
  if (t === 'cta_click' || t === 'phone_click' || t === 'email_click' || t === 'whatsapp_click') return MousePointerClick;
  if (t === 'form_submit') return Send;
  if (t === 'scroll_depth') return Activity;
  if (t === 'time_on_page') return Activity;
  if (t === 'phone_click') return Phone;
  return Globe;
}

function EventRow({ e }) {
  const Icon = eventIcon(e.event_type);
  const time = e.timestamp ? new Date(e.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
  const meta = e.extra || {};
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12,
      padding: '10px 14px', borderBottom: '1px solid var(--line-2)',
      alignItems: 'center',
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8, background: 'var(--surface-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)',
      }}>
        <Icon style={{ width: 13, height: 13 }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span className="seo-mono" style={{ fontSize: 11, color: 'var(--navy)', marginRight: 6 }}>{e.event_type}</span>
          {e.page_title || e.page_url}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', gap: 10, marginTop: 2 }}>
          <span className="seo-mono">{e.visitor_id?.slice(0, 10) || 'anon'}</span>
          {e.utm_source && <span>· via <b>{e.utm_source}</b>{e.utm_campaign ? ` / ${e.utm_campaign}` : ''}</span>}
          {e.device_type && <span>· {e.device_type}</span>}
          {meta.cta_label && <span>· <em>“{meta.cta_label}”</em></span>}
          {meta.depth && <span>· scroll {meta.depth}%</span>}
          {meta.seconds && <span>· {meta.seconds}s</span>}
        </div>
      </div>
      <span className="seo-mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{time}</span>
    </div>
  );
}

/* ═══════════════ PAGE ═══════════════ */
export default function SeoConnect() {
  const { days } = useSeoFilter();
  const { data: health, isLoading: healthLoading, error: healthError, refetch: refetchHealth } = useTrackerHealth();
  const { data: snippet } = useTrackerSnippet();
  const { data: recent, isLoading: recentLoading } = useTrackerRecent(40);
  const period = days <= 7 ? '7d' : days >= 90 ? '90d' : '30d';
  const { data: funnel, isLoading: funnelLoading } = useTrackerFunnel(period);

  if (healthLoading && !health) return <LoadingState message="Vérification des connexions…" />;
  if (healthError) return <ErrorState message="Impossible de charger la santé des connexions." onRetry={refetchHealth} />;

  const src = health?.sources || {};
  const ga4Meta = src.ga4?.status === 'ok' ? [
    { k: 'Property GA4', v: src.ga4.property || '—' },
    { k: 'Sessions 48h', v: fmt(src.ga4.sessions_last_48h || 0) },
  ] : [{ k: 'Détail', v: src.ga4?.detail || '—' }];
  const gscMeta = src.gsc?.status === 'ok' ? [
    { k: 'Site', v: src.gsc.site || '—' },
    { k: 'Clics 7j', v: fmt(src.gsc.clicks_7d || 0) },
    { k: 'Impressions 7j', v: fmt(src.gsc.impressions_7d || 0) },
  ] : [{ k: 'Détail', v: src.gsc?.detail || '—' }];
  const trkMeta = [
    { k: 'Events 24h', v: fmt(src.tracker?.events_24h || 0) },
    { k: 'Visiteurs 24h', v: fmt(src.tracker?.visitors_24h || 0) },
    { k: 'Events 7j', v: fmt(src.tracker?.events_7d || 0) },
    { k: 'Dernier event', v: src.tracker?.last_event_at ? new Date(src.tracker.last_event_at).toLocaleString('fr-FR') : '—' },
  ];
  const adsMeta = src.ads?.status === 'ok' ? [
    { k: 'Campagnes', v: fmt(src.ads.campaigns || 0) },
    { k: 'Entrées dépenses 30j', v: fmt(src.ads.spends_entries_30d || 0) },
  ] : [{ k: 'Détail', v: src.ads?.detail || '—' }];

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Infrastructure"
        title={<>Connexion & <em>Tracking</em></>}
        subtitle={`Tous les signaux du site ${health?.site || 'globalcleanhome.com'} consolidés dans le CRM.`}
        actions={
          <a href={health?.site || '#'} target="_blank" rel="noreferrer" className="seo-chip">
            Ouvrir le site <ExternalLink style={{ width: 12, height: 12 }} />
          </a>
        }
      />

      {/* === SANTE GLOBALE === */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <SourceCard
          name="ga4"
          label="Google Analytics 4"
          description="Trafic & conversions"
          sub={src.ga4?.status === 'ok' ? 'Property live' : src.ga4?.detail}
          status={src.ga4?.status}
          meta={ga4Meta}
        />
        <SourceCard
          name="gsc"
          label="Search Console"
          description="SEO organique Google"
          sub={src.gsc?.status === 'ok' ? 'Indexation active' : src.gsc?.detail}
          status={src.gsc?.status}
          meta={gscMeta}
        />
        <SourceCard
          name="tracker"
          label="Tracker Custom"
          description="Events visite → lead"
          sub={src.tracker?.detail || (src.tracker?.events_24h ? 'Collecte en cours' : '—')}
          status={src.tracker?.status}
          meta={trkMeta}
        />
        <SourceCard
          name="ads"
          label="Google / Meta Ads"
          description="Campagnes payantes"
          sub={src.ads?.status === 'ok' ? 'Attribution active' : src.ads?.detail}
          status={src.ads?.status}
          meta={adsMeta}
        />
      </div>

      {/* === SNIPPET + FUNNEL === */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, marginBottom: 28 }}>
        {snippet && <SnippetBox snippet={snippet} />}

        <div className="seo-card" style={{ padding: 24 }}>
          <div className="seo-label" style={{ color: 'var(--ink-4)' }}>2 · Funnel bout-en-bout</div>
          <div className="seo-display" style={{ fontSize: 22, fontWeight: 500, marginTop: 4 }}>
            Visite → <em style={{ color: 'var(--navy)', fontStyle: 'italic' }}>Facture</em>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
            Suivi réel sur {period}. {funnel?.rates?.visit_to_lead !== undefined && (
              <> Taux visite→lead : <b className="seo-mono">{fmtPct(funnel.rates.visit_to_lead, 2)}</b>.</>
            )}
          </div>
          {funnelLoading && <LoadingState message="Calcul du funnel…" />}
          {funnel?.funnel && <FunnelBar funnel={funnel.funnel} />}
          {funnel?.revenue !== undefined && (
            <div style={{
              marginTop: 16, padding: 14, background: 'var(--emerald-soft)',
              borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'var(--emerald-deep)', fontWeight: 600, letterSpacing: '0.04em' }}>
                REVENUE ATTRIBUE
              </span>
              <span className="seo-mono" style={{ fontSize: 18, color: 'var(--emerald-deep)', fontWeight: 700 }}>
                {fmt(funnel.revenue)} €
              </span>
            </div>
          )}
        </div>
      </div>

      {/* === CANAUX === */}
      {funnel?.channels?.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeader
            eyebrow="3 · Attribution"
            title="Canaux d'acquisition"
            subtitle="Leads et revenue par canal UTM détecté."
          />
          <div className="seo-card" style={{ padding: 0, overflow: 'hidden' }}>
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
                {funnel.channels.map((c, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--line-2)' }}>
                    <td style={td}>
                      <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500 }}>{c.channel}</div>
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
          </div>
        </div>
      )}

      {/* === LIVE FEED === */}
      <div style={{ marginBottom: 28 }}>
        <SectionHeader
          eyebrow="4 · Live"
          title="Derniers événements reçus"
          subtitle="Mise à jour toutes les 20 secondes. Chaque ligne est un pageview, clic ou form reçu du site."
          right={
            <button onClick={() => refetchHealth()} className="seo-chip">
              <RefreshCw style={{ width: 12, height: 12 }} /> Rafraîchir
            </button>
          }
        />
        <div className="seo-card" style={{ padding: 0, overflow: 'hidden' }}>
          {recentLoading && !recent && (
            <div style={{ padding: 40 }}><LoadingState message="Chargement du flux live…" /></div>
          )}
          {!recentLoading && recent?.events?.length === 0 && (
            <div style={{ padding: 24 }}>
              <EmptyState
                icon={Activity}
                title="Aucun event reçu pour le moment"
                message={`Installez le snippet sur ${health?.site || 'le site'} puis visitez une page pour voir apparaître le premier event.`}
              />
            </div>
          )}
          {recent?.events?.map((e, i) => <EventRow key={i} e={e} />)}
        </div>
      </div>
    </div>
  );
}

const th = { padding: '12px 16px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace',
             fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 };
const thRight = { ...th, textAlign: 'right' };
const td = { padding: '14px 16px', fontSize: 13, color: 'var(--ink)' };
const tdRight = { ...td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 };
