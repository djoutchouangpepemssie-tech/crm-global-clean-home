// SeoHotAlerts.jsx — /seo/hot-alerts
// Historique + config des alertes "visiteur hot" (Telegram).
// Trigger backend : CTA cliqué / form soumis / 5+ min sur le site.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Bell, BellRing, BellOff, CheckCircle2, AlertCircle, ExternalLink,
  RefreshCw, Send, Copy, Phone, Mail, MessageCircle, FileEdit, Clock, MousePointerClick,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PageHeader, KpiTile, LoadingState, EmptyState, fmt,
} from './SeoShared';
import {
  useHotAlerts, useHotAlertsConfig, useTestHotAlert,
} from '../../hooks/api';

const TRIGGER_ICONS = {
  cta_click: MousePointerClick,
  phone_click: Phone,
  email_click: Mail,
  whatsapp_click: MessageCircle,
  form_submit: FileEdit,
  time_on_page: Clock,
  time_on_page_2min: Clock,
};

const TRIGGER_COLORS = {
  cta_click: '#f59e0b',
  phone_click: '#10b981',
  email_click: '#3b82f6',
  whatsapp_click: '#22c55e',
  form_submit: '#8b5cf6',
  time_on_page: '#64748b',
  time_on_page_2min: '#64748b',
};

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.round(diff / 3600)}h`;
  return `il y a ${Math.round(diff / 86400)}j`;
}

function ConfigPanel() {
  const { data: config, isLoading, refetch } = useHotAlertsConfig();
  const test = useTestHotAlert();
  const [showSetup, setShowSetup] = useState(false);
  const isOk = config?.telegram_configured;

  return (
    <div className="seo-card" style={{ padding: 24, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: isOk ? 'var(--emerald-soft,#d1fae5)' : 'var(--gold-soft,#fef3c7)',
          color: isOk ? 'var(--emerald,#059669)' : 'var(--gold,#ca8a04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {isOk ? <BellRing size={22} /> : <BellOff size={22} />}
        </div>
        <div style={{ flex: 1 }}>
          <div className="seo-display" style={{ fontSize: 18, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>
            Notifications Telegram {isOk ? <em style={{ color: 'var(--emerald,#059669)', fontStyle: 'italic', fontWeight: 400 }}>· connectées</em> : <em style={{ color: 'var(--gold,#ca8a04)', fontStyle: 'italic', fontWeight: 400 }}>· non configurées</em>}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 12, fontFamily: 'Fraunces, serif', fontStyle: 'italic' }}>
            Reçois une notif sur ton tel à chaque visiteur "hot" (CTA cliqué, formulaire soumis, ou 5+ min sur le site).
          </div>

          {/* Status grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 8, fontSize: 12 }}>
              <span style={{ color: 'var(--ink-3)' }}>TELEGRAM_BOT_TOKEN : </span>
              <span style={{ color: config?.bot_token_set ? 'var(--emerald)' : 'var(--rouge,#dc2626)', fontWeight: 600 }}>
                {config?.bot_token_set ? '✓ défini' : '✗ manquant'}
              </span>
            </div>
            <div style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 8, fontSize: 12 }}>
              <span style={{ color: 'var(--ink-3)' }}>TELEGRAM_CHAT_ID : </span>
              <span style={{ color: config?.chat_id_set ? 'var(--emerald)' : 'var(--rouge,#dc2626)', fontWeight: 600 }}>
                {config?.chat_id_set ? '✓ défini' : '✗ manquant'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => test.mutate()} disabled={!isOk || test.isPending} className="seo-cta">
              <Send size={12} /> {test.isPending ? 'Envoi…' : 'Envoyer un test'}
            </button>
            <button onClick={() => setShowSetup((s) => !s)} className="seo-chip">
              {showSetup ? '× Cacher' : '? Comment configurer'}
            </button>
            <button onClick={() => refetch()} className="seo-chip">
              <RefreshCw size={12} /> Actualiser
            </button>
          </div>

          {/* Setup guide */}
          {showSetup && (
            <div style={{
              marginTop: 16, padding: 16, background: 'var(--surface-2)', borderRadius: 12,
              fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6,
            }}>
              <div className="seo-display" style={{ fontSize: 14, fontWeight: 500, marginBottom: 10, color: 'var(--ink)' }}>
                Setup Telegram en 3 étapes (≈ 2 min)
              </div>
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                <li style={{ marginBottom: 8 }}>
                  Sur Telegram, parle à <strong>@BotFather</strong> → tape <code style={{ background: 'white', padding: '2px 6px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>/newbot</code>, choisis un nom (ex: "GCH CRM"). Il te donne un <strong>token</strong> du genre <code style={{ background: 'white', padding: '2px 6px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>1234567890:ABC...</code>
                </li>
                <li style={{ marginBottom: 8 }}>
                  Démarre une conversation avec <em>ton bot</em> (clique le lien que BotFather t'envoie, puis "Start"). Ensuite parle à <strong>@userinfobot</strong> → il te donne ton <strong>chat_id</strong> (ex: <code style={{ background: 'white', padding: '2px 6px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>123456789</code>)
                </li>
                <li>
                  Sur <strong>Railway</strong> (dashboard backend) → onglet <em>Variables</em> → ajoute :
                  <div style={{ background: 'white', padding: 8, borderRadius: 6, marginTop: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                    TELEGRAM_BOT_TOKEN=ton_token_ici<br/>
                    TELEGRAM_CHAT_ID=ton_chat_id_ici
                  </div>
                  Le service redéploie auto, et tu peux cliquer "Envoyer un test" ici pour valider.
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertCard({ a, navigate }) {
  const Icon = TRIGGER_ICONS[a.event_type] || Zap;
  const color = TRIGGER_COLORS[a.event_type] || '#f59e0b';
  const isLead = !!a.lead_id;
  return (
    <div
      onClick={() => navigate(`/seo/journeys/${a.visitor_id}`)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: 16, background: 'var(--surface)', borderRadius: 12,
        border: '1px solid var(--line)', borderLeft: `3px solid ${color}`,
        cursor: 'pointer', marginBottom: 8, transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${color}22`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span className="seo-display" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            {a.trigger_label}
          </span>
          {isLead && (
            <span style={{
              fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
              padding: '2px 8px', borderRadius: 999, background: 'var(--emerald-soft,#d1fae5)', color: 'var(--emerald,#059669)', fontWeight: 600,
            }}>LEAD</span>
          )}
          {a.telegram_sent && (
            <span style={{
              fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
              padding: '2px 8px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--ink-3)', fontWeight: 600,
            }}>📨 TELEGRAM</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>
          📄 {a.page || '/'}
          {a.city && <> · 📍 {a.city}{a.postal && ` ${a.postal}`}</>}
        </div>
        <div className="seo-mono" style={{ fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.06em' }}>
          {a.pageviews || 0} pages · {a.events_total || 0} events
          {a.first_utm_source && <> · src={a.first_utm_source}</>}
          {a.lead_name && <> · {a.lead_name}</>}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div className="seo-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{timeAgo(a.created_at)}</div>
        <ExternalLink size={12} style={{ color: 'var(--ink-4)', marginTop: 4 }} />
      </div>
    </div>
  );
}

export default function SeoHotAlerts() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch, isFetching } = useHotAlerts(50);
  const alerts = data?.alerts || [];
  const count24h = data?.count_24h || 0;
  const sent = alerts.filter((a) => a.telegram_sent).length;
  const leads = alerts.filter((a) => a.lead_id).length;

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Audience · Alertes"
        title={<>Visiteurs <em>chauds</em></>}
        subtitle="Notifications déclenchées en temps réel — CTA cliqué, formulaire soumis, 5+ min sur le site"
        actions={
          <button onClick={() => refetch()} className="seo-chip">
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} /> Actualiser
          </button>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <KpiTile label="Alertes 24h" value={fmt(count24h)} tone="var(--rouge,#dc2626)" icon={Zap} />
        <KpiTile label="Total affichées" value={fmt(alerts.length)} tone="var(--navy)" icon={Bell} />
        <KpiTile label="Envoyées Telegram" value={fmt(sent)} tone="var(--emerald)" icon={Send} />
        <KpiTile label="Devenues leads" value={fmt(leads)} tone="var(--gold)" icon={CheckCircle2} />
      </div>

      {/* Config Telegram */}
      <ConfigPanel />

      {/* Liste alertes */}
      {isLoading && !data ? (
        <LoadingState message="Chargement des alertes…" />
      ) : error ? (
        <div className="seo-card" style={{ padding: 40, textAlign: 'center' }}>
          <AlertCircle size={32} style={{ color: 'var(--rouge,#dc2626)', margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--rouge,#dc2626)', marginBottom: 12, fontWeight: 600 }}>Erreur de chargement</div>
          <button onClick={() => refetch()} className="seo-chip">Réessayer</button>
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Aucune alerte pour le moment"
          message="Les alertes apparaîtront ici dès qu'un visiteur clique un CTA, soumet un formulaire, ou passe 5+ minutes sur le site."
        />
      ) : (
        <div>
          <div className="seo-label" style={{ marginBottom: 12 }}>
            Historique · {alerts.length} alertes
          </div>
          {alerts.map((a) => (
            <AlertCard key={a.alert_id} a={a} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}
