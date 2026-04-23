// SeoJourneyDetail.jsx — /seo/journeys/:visitor_id
// Timeline complète d'un visiteur : profil, stats, sessions, tous les events.

import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Activity, ArrowLeft, Calendar, Clock, ExternalLink, Eye, FileText,
  Flag, Globe, Hash, Home, Mail, MapPin, MessageSquare, MousePointerClick,
  Phone, Play, Send, Smartphone, TrendingUp, User, UserCheck,
  Users, Zap,
} from 'lucide-react';
import {
  PageHeader, LoadingState, ErrorState, KpiTile, SectionHeader, EmptyState,
  fmt,
} from './SeoShared';
import { useVisitorJourney, useDeleteVisitor } from '../../hooks/api';

function fmtDateTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return '—'; }
}
function fmtDuration(sec) {
  if (!sec && sec !== 0) return '—';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}min`;
  return `${Math.floor(sec / 3600)}h${String(Math.round((sec % 3600) / 60)).padStart(2, '0')}`;
}

function eventIcon(type) {
  switch (type) {
    case 'page_view':       return { Icon: Eye,              tone: 'var(--navy)',  label: 'Page vue' };
    case 'cta_click':       return { Icon: Flag,             tone: 'var(--gold)',  label: 'CTA cliqué' };
    case 'phone_click':     return { Icon: Phone,            tone: 'var(--warm)',  label: 'Appel lancé' };
    case 'email_click':     return { Icon: Mail,             tone: 'var(--warm)',  label: 'Email ouvert' };
    case 'whatsapp_click':  return { Icon: MessageSquare,    tone: 'var(--emerald)', label: 'WhatsApp cliqué' };
    case 'form_submit':     return { Icon: Send,             tone: 'var(--emerald)', label: 'Formulaire envoyé' };
    case 'scroll_depth':    return { Icon: TrendingUp,       tone: 'var(--ink-3)', label: 'Scroll' };
    case 'time_on_page':    return { Icon: Clock,            tone: 'var(--ink-4)', label: 'Temps sur page' };
    case 'page_leave':      return { Icon: Activity,         tone: 'var(--ink-4)', label: 'Page quittée' };
    case 'page_visible':    return { Icon: Eye,              tone: 'var(--ink-4)', label: 'Page visible' };
    default:                return { Icon: Hash,             tone: 'var(--ink-3)', label: type || 'Event' };
  }
}

function TimelineEntry({ e, isFirst, isLast }) {
  const { Icon, tone, label } = eventIcon(e.type);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 36px 1fr', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ textAlign: 'right', paddingTop: 10, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>
        {fmtDateTime(e.timestamp)}
      </div>
      <div style={{ position: 'relative', height: '100%' }}>
        {/* Vertical line */}
        {!isFirst && <div style={{ position: 'absolute', left: 17, top: 0, bottom: '50%', width: 2, background: 'var(--line)' }} />}
        {!isLast && <div style={{ position: 'absolute', left: 17, top: '50%', bottom: 0, width: 2, background: 'var(--line)' }} />}
        {/* Dot */}
        <div style={{
          position: 'relative', width: 36, height: 36, borderRadius: 999,
          background: `color-mix(in oklch, ${tone} 14%, var(--paper))`,
          border: `1.5px solid ${tone}`, color: tone,
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
        }}>
          <Icon style={{ width: 15, height: 15 }} />
        </div>
      </div>
      <div style={{
        background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10,
        padding: '10px 14px', marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
          {e.cta_label && (
            <span className="seo-mono" style={{ fontSize: 10, color: 'var(--ink-3)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 999 }}>
              "{e.cta_label.slice(0, 40)}"
            </span>
          )}
          {e.depth && (
            <span className="seo-mono" style={{ fontSize: 10, color: tone }}>
              {e.depth}%
            </span>
          )}
          {e.seconds && (
            <span className="seo-mono" style={{ fontSize: 10, color: tone }}>
              {e.seconds}s
            </span>
          )}
        </div>
        {(e.path || e.page_title) && (
          <div style={{ fontSize: 12, color: 'var(--ink-2)', display: 'flex', gap: 6, alignItems: 'center' }}>
            {e.path && (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-3)' }}>{e.path}</span>
            )}
            {e.page_title && <span style={{ color: 'var(--ink-3)' }}>·</span>}
            {e.page_title && <span>{e.page_title}</span>}
          </div>
        )}
        {e.lead_data && (
          <div style={{
            marginTop: 6, padding: 8, background: 'var(--emerald-soft)', borderRadius: 6,
            fontSize: 11, color: 'var(--emerald-deep, var(--emerald))',
          }}>
            <b>Données formulaire :</b> {JSON.stringify(e.lead_data).slice(0, 120)}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session, index, total }) {
  return (
    <div className="seo-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="seo-label" style={{ fontSize: 9 }}>
          SESSION {index + 1} / {total}
        </div>
        <span className="seo-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          {fmtDateTime(session.start)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Durée</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700 }}>
            {fmtDuration(session.duration_sec)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Pages</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700 }}>
            {session.pageviews} / {session.unique_pages} uniques
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Events</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700 }}>
            {session.events_count}
          </div>
        </div>
        {session.utm_source && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Source</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>
              {session.utm_source}{session.utm_campaign ? ` / ${session.utm_campaign}` : ''}
            </div>
          </div>
        )}
      </div>
      {session.pages?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {session.pages.map((p) => (
            <span key={p} className="seo-chip" style={{ padding: '3px 10px', fontSize: 10, background: 'var(--surface-2)' }}>
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SeoJourneyDetail() {
  const { visitor_id } = useParams();
  const navigate = useNavigate();
  const deleteVisitor = useDeleteVisitor();
  const { data, isLoading, error } = useVisitorJourney(visitor_id);

  if (isLoading && !data) return <LoadingState message="Chargement du parcours…" />;
  if (error) return <ErrorState message={`Erreur : ${error.message}`} onRetry={() => navigate(0)} />;

  const { profile, lead, location, stats, sessions = [], top_pages = [], timeline = [] } = data || {};
  if (!profile) return <ErrorState message="Visiteur introuvable" />;

  const isConverted = !!profile.lead_id;
  const identity = lead?.name || profile.lead_name || `Visiteur ${(profile.visitor_id || '').slice(0, 10)}`;

  return (
    <div className="seo-fade">
      {/* Breadcrumb */}
      <div style={{ marginBottom: 12 }}>
        <Link to="/seo/journeys" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
          color: 'var(--ink-3)', textDecoration: 'none',
        }}>
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Retour aux parcours
        </Link>
      </div>

      <PageHeader
        eyebrow={isConverted ? 'Lead converti' : (profile.identified ? 'Visiteur identifié' : 'Visiteur anonyme')}
        title={<em style={{ fontStyle: 'italic' }}>{identity}</em>}
        subtitle={
          <span>
            Première visite {fmtDateTime(stats.first_seen)} ·{' '}
            {stats.is_returning ? <b>{sessions.length} sessions</b> : '1 session'} ·{' '}
            {stats.pageviews} pages vues
            {stats.visits_before_conversion != null && (
              <> · <b style={{ color: 'var(--emerald)' }}>
                {stats.visits_before_conversion} visite{stats.visits_before_conversion > 1 ? 's' : ''} avant conversion
              </b></>
            )}
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {lead?.lead_id && (
              <Link to={`/leads/${lead.lead_id}`} className="seo-cta">
                <UserCheck style={{ width: 14, height: 14 }} />
                Voir le dossier lead
              </Link>
            )}
            <button
              onClick={async () => {
                if (!window.confirm('Supprimer toutes les données de ce visiteur ? (RGPD — irréversible)')) return;
                await deleteVisitor.mutateAsync(visitor_id);
                navigate('/seo/journeys');
              }}
              className="seo-chip"
              style={{ color: 'var(--rouge)', borderColor: 'var(--rouge)' }}
              disabled={deleteVisitor.isPending}
            >
              {deleteVisitor.isPending ? 'Suppression…' : '🗑 RGPD · Supprimer'}
            </button>
          </div>
        }
      />

      {/* Coordonnées / Infos converti */}
      {isConverted && lead && (
        <div className="seo-card" style={{ padding: 20, marginBottom: 24,
          background: 'var(--emerald-soft)', borderColor: 'var(--emerald)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 999, background: 'var(--emerald)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600,
            }}>
              {(lead.name || '?').split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')}
            </div>
            <div>
              <div className="seo-label" style={{ color: 'var(--emerald)', fontSize: 9 }}>✓ CONVERTI EN LEAD</div>
              <div className="seo-display" style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', marginTop: 2 }}>
                {lead.name}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--ink-2)', marginTop: 6, flexWrap: 'wrap' }}>
                {lead.email && <span><Mail style={{ width: 12, height: 12, verticalAlign: 'middle', marginRight: 4 }} /> {lead.email}</span>}
                {lead.phone && <span><Phone style={{ width: 12, height: 12, verticalAlign: 'middle', marginRight: 4 }} /> {lead.phone}</span>}
                {lead.service_type && <span><b>{lead.service_type}</b></span>}
                {lead.status && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--emerald-deep, var(--emerald))', fontWeight: 700, textTransform: 'uppercase' }}>{lead.status}</span>}
              </div>
              {lead.message && (
                <div style={{ marginTop: 8, fontStyle: 'italic', fontFamily: 'Fraunces, serif', fontSize: 13, color: 'var(--ink-2)' }}>
                  « {lead.message.slice(0, 200)}{lead.message.length > 200 ? '…' : ''} »
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 24 }}>
        <KpiTile label="Sessions" value={stats.sessions_count} tone="var(--navy)" icon={Users} />
        <KpiTile label="Pages vues" value={stats.pageviews} tone="var(--gold)" icon={Eye}
          sub={`${stats.unique_pages} uniques`} />
        <KpiTile label="Events" value={stats.events_count} tone="var(--ink-2)" icon={Activity} />
        <KpiTile label="CTA cliqués" value={stats.cta_clicks} tone="var(--warm)" icon={Flag} />
        <KpiTile label="Formulaires" value={stats.form_submits}
          tone={stats.form_submits > 0 ? 'var(--emerald)' : 'var(--ink-4)'} icon={Send} />
        <KpiTile label="Durée totale" value={fmtDuration(stats.total_duration_sec)} tone="var(--ink-2)" icon={Clock} />
      </div>

      {/* Infos géo + device + source */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
        <div className="seo-card" style={{ padding: 16 }}>
          <div className="seo-label" style={{ fontSize: 9, marginBottom: 8 }}>
            <MapPin style={{ width: 11, height: 11, verticalAlign: 'middle', marginRight: 4 }} />
            Localisation
          </div>
          {location ? (
            <>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500 }}>
                {location.city || '—'}, {location.country || '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
                {location.region && <>Région {location.region} · </>}
                {location.timezone || '—'}
              </div>
              <div className="seo-mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 6 }}>
                IP : {profile.ip || '—'}
                {location.isp && <> · {location.isp}</>}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--ink-3)', fontSize: 13, fontStyle: 'italic' }}>Localisation non disponible</div>
          )}
        </div>

        <div className="seo-card" style={{ padding: 16 }}>
          <div className="seo-label" style={{ fontSize: 9, marginBottom: 8 }}>
            <Smartphone style={{ width: 11, height: 11, verticalAlign: 'middle', marginRight: 4 }} />
            Device
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, textTransform: 'capitalize' }}>
            {profile.device_type || 'Inconnu'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
            {profile.lang || '—'} · {profile.tz || '—'}
          </div>
          <div className="seo-mono" style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 6, wordBreak: 'break-all' }}>
            {(profile.user_agent || '').slice(0, 80)}
          </div>
        </div>

        <div className="seo-card" style={{ padding: 16 }}>
          <div className="seo-label" style={{ fontSize: 9, marginBottom: 8 }}>
            <Globe style={{ width: 11, height: 11, verticalAlign: 'middle', marginRight: 4 }} />
            Source d'arrivée
          </div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500 }}>
            {profile.first_utm_source || 'Direct'}
          </div>
          {profile.first_utm_campaign && (
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
              Campagne : <b>{profile.first_utm_campaign}</b>
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
            Première page : <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{profile.first_page || '/'}</span>
          </div>
          {profile.first_referrer && (
            <div className="seo-mono" style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 6, wordBreak: 'break-all' }}>
              Referrer : {profile.first_referrer}
            </div>
          )}
        </div>
      </div>

      {/* Top pages */}
      {top_pages.length > 0 && (
        <>
          <SectionHeader eyebrow="Pages" title="Pages les plus consultées" />
          <div className="seo-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
            {top_pages.map((p, i) => (
              <div key={p.path} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 16px', borderTop: i > 0 ? '1px solid var(--line-2)' : 'none',
              }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--ink-2)' }}>{p.path}</span>
                <span className="seo-mono" style={{ fontSize: 11, color: 'var(--ink)', fontWeight: 600 }}>
                  {p.count} vue{p.count > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Sessions */}
      <SectionHeader eyebrow="Sessions" title={`${sessions.length} sessions distinctes`} />
      <div style={{ display: 'grid', gap: 10, marginBottom: 28 }}>
        {sessions.map((s, i) => (
          <SessionCard key={s.session_id} session={s} index={i} total={sessions.length} />
        ))}
      </div>

      {/* Timeline complète */}
      <SectionHeader eyebrow="Parcours complet" title={`Timeline — ${timeline.length} événements`} />
      {timeline.length === 0 ? (
        <EmptyState icon={Activity} title="Aucun événement" message="Ce visiteur n'a pas encore produit d'événements trackés." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 40 }}>
          {timeline.map((e, i) => (
            <TimelineEntry key={i} e={e} isFirst={i === 0} isLast={i === timeline.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}
