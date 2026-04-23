// SeoJourneyDetail.jsx — /seo/journeys/:visitor_id
// Page forensique : profil visiteur + timeline chirurgicale session par session.
// Layout 2 colonnes (profil sticky gauche, timeline scrollable droite).
// Étape 4 — niveau Hotjar + Linear + Stripe Customer Detail.

import React, { useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Calendar, ChevronDown, ChevronUp, Clock, Copy, ExternalLink,
  Eye, Globe, Mail, MapPin, Monitor, Phone, Smartphone, Tablet,
  TrendingUp, User, UserCheck, Zap,
} from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';
import {
  PageHeader, LoadingState, ErrorState, KpiTile, EmptyState, fmt,
} from './SeoShared';
import { useVisitorJourney, useDeleteVisitor } from '../../hooks/api';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function fmtDT(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch (_e) { return '—'; }
}
function fmtTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch (_e) { return '—'; }
}
function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch (_e) { return '—'; }
}
function fmtDuration(sec) {
  if (!sec && sec !== 0) return '—';
  if (sec < 60) return sec + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'min ' + (sec % 60) + 's';
  return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'min';
}
function fmtDelta(sec) {
  if (!sec || sec < 1) return '';
  if (sec < 60) return '(' + Math.round(sec) + 's plus tard)';
  if (sec < 3600) return '(' + Math.round(sec / 60) + ' min plus tard)';
  return '(' + Math.floor(sec / 3600) + 'h ' + Math.round((sec % 3600) / 60) + 'min plus tard)';
}
function timeAgo(iso) {
  if (!iso) return '—';
  var diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return 'il y a ' + Math.round(diff / 60) + ' min';
  if (diff < 86400) return 'il y a ' + Math.round(diff / 3600) + 'h';
  return 'il y a ' + Math.round(diff / 86400) + 'j';
}
function copyId(text) {
  try { navigator.clipboard.writeText(text); toast.success('ID copié !'); } catch (_e) {}
}

function avatarGradient(id) {
  var hash = (id || '').split('').reduce(function (a, b) { return a + b.charCodeAt(0); }, 0);
  var h1 = hash % 360, h2 = (h1 + 40) % 360;
  return 'linear-gradient(135deg, hsl(' + h1 + ', 60%, 55%), hsl(' + h2 + ', 60%, 45%))';
}

// ═══════════════════════════════════════════════════════════════
// EVENT CONFIG
// ═══════════════════════════════════════════════════════════════

var EVENT_CFG = {
  session_start:     { icon: '🚀', color: '#8B5CF6', label: 'Début de session' },
  page_view:         { icon: '👁️', color: '#3B82F6', label: 'Page consultée' },
  scroll_deep_75:    { icon: '📜', color: '#06B6D4', label: 'Scroll profond (75%)' },
  scroll_depth:      { icon: '📜', color: '#06B6D4', label: 'Scroll' },
  time_on_page_2min: { icon: '⏱️', color: '#F97316', label: 'Temps d\'attention long' },
  time_on_page:      { icon: '⏱️', color: '#F97316', label: 'Temps sur page' },
  click_phone:       { icon: '📞', color: '#F59E0B', label: 'Clic téléphone', conv: true },
  phone_click:       { icon: '📞', color: '#F59E0B', label: 'Clic téléphone', conv: true },
  click_email:       { icon: '📧', color: '#F59E0B', label: 'Clic email', conv: true },
  email_click:       { icon: '📧', color: '#F59E0B', label: 'Clic email', conv: true },
  click_whatsapp:    { icon: '💬', color: '#10B981', label: 'Clic WhatsApp', conv: true },
  whatsapp_click:    { icon: '💬', color: '#10B981', label: 'Clic WhatsApp', conv: true },
  form_submit:       { icon: '📝', color: '#F59E0B', label: 'Formulaire soumis', conv: true },
  cta_click:         { icon: '🖱️', color: '#8B5CF6', label: 'Clic CTA' },
  session_end:       { icon: '🏁', color: '#6B7280', label: 'Fin de session' },
  page_leave:        { icon: '👋', color: '#94A3B8', label: 'Quitte la page' },
  page_visible:      { icon: '👁️', color: '#94A3B8', label: 'Retour sur la page' },
};

function evCfg(type) { return EVENT_CFG[type] || { icon: '•', color: '#94A3B8', label: type || 'Event' }; }

// ═══════════════════════════════════════════════════════════════
// TIMELINE EVENT
// ═══════════════════════════════════════════════════════════════

function TimelineEvent({ ev, delta, isLast }) {
  var cfg = evCfg(ev.event_type);
  var isConv = cfg.conv;
  var path = ev.page?.path || ev.page_url || '';
  try { if (path && path.startsWith('http')) path = new URL(path).pathname; } catch (_e) {}

  return (
    <div style={{ display: 'flex', gap: 14, position: 'relative' }}>
      {/* Ligne verticale + icône */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 32 }}>
        <div style={{
          width: isConv ? 28 : 24, height: isConv ? 28 : 24, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isConv ? 16 : 14,
          background: isConv ? 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.08))' : 'var(--surface-2)',
          border: isConv ? '2px solid #F59E0B' : '1px solid var(--line)',
          boxShadow: isConv ? '0 0 12px rgba(245,158,11,0.3)' : 'none',
        }}>
          {cfg.icon}
        </div>
        {!isLast && <div style={{ flex: 1, width: 2, background: 'var(--line)', marginTop: 4 }} />}
      </div>

      {/* Contenu */}
      <div style={{
        flex: 1, paddingBottom: isLast ? 0 : 16, minWidth: 0,
        ...(isConv ? {
          background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))',
          borderLeft: '3px solid #F59E0B', padding: '10px 14px', borderRadius: 10, marginBottom: 8,
        } : {}),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{fmtTime(ev.timestamp)}</span>
          {delta > 0 && <span style={{ fontSize: 10, color: 'var(--ink-4)', fontStyle: 'italic' }}>{fmtDelta(delta)}</span>}
          {isConv && <span style={{ fontSize: 9, fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(245,158,11,0.12)', padding: '1px 6px', borderRadius: 4 }}>CONVERSION</span>}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>{cfg.label}</div>
        {path && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>{path}</div>}
        {ev.event_data?.phone && <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>📞 {ev.event_data.phone}</div>}
        {ev.event_data?.cta_label && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Bouton : "{ev.event_data.cta_label}"</div>}
        {ev.event_data?.depth && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{ev.event_data.depth}% de la page</div>}
        {ev.event_data?.seconds && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{ev.event_data.seconds}s sur la page</div>}
        {ev.event_data?.fields_filled && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>Champs : {ev.event_data.fields_filled.join(', ')}</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SESSION GROUP
// ═══════════════════════════════════════════════════════════════

function SessionGroup({ session, events, index, total, defaultOpen }) {
  var [open, setOpen] = useState(defaultOpen);
  var isConvSession = session.converted_in_session;
  var duration = session.duration_seconds || 0;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Bandeau session */}
      <button onClick={function () { setOpen(!open); }} style={{
        width: '100%', textAlign: 'left', cursor: 'pointer', padding: '14px 18px',
        background: isConvSession ? 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02))' : 'var(--paper)',
        border: '1px solid ' + (isConvSession ? 'rgba(245,158,11,0.25)' : 'var(--line)'),
        borderLeft: isConvSession ? '4px solid #F59E0B' : '4px solid var(--line)',
        borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        transition: 'background 0.15s',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              Session #{total - index}
            </span>
            {isConvSession && <span style={{ fontSize: 10, fontWeight: 800, color: '#F59E0B', background: 'rgba(245,158,11,0.12)', padding: '1px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>🎯 CONVERSION</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
            {fmtDate(session.started_at)} · {fmtTime(session.started_at)} → {fmtTime(session.ended_at)} · {fmtDuration(duration)} · {events.length} événements
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>
            Entry: {session.entry_page || '/'} · Exit: {session.exit_page || '—'}
            {session.utm?.source && ' · Source: ' + session.utm.source}
          </div>
        </div>
        {open ? <ChevronUp style={{ width: 16, height: 16, color: 'var(--ink-3)' }} /> : <ChevronDown style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />}
      </button>

      {/* Événements (rendu conditionnel — pas de render si replié) */}
      {open && events.length > 0 && (
        <div style={{ padding: '16px 0 0 20px', borderLeft: '2px solid var(--line)', marginLeft: 18 }}>
          {events.map(function (ev, i) {
            var prev = events[i - 1];
            var delta = prev ? (new Date(ev.timestamp) - new Date(prev.timestamp)) / 1000 : 0;
            return <TimelineEvent key={ev._id || i} ev={ev} delta={delta} isLast={i === events.length - 1} />;
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CARTE PROFIL
// ═══════════════════════════════════════════════════════════════

function InfoCard({ title, children }) {
  return (
    <div className="seo-card" style={{ padding: 18, marginBottom: 12 }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, icon }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: 12 }}>
      <span style={{ color: 'var(--ink-3)' }}>{icon && <span style={{ marginRight: 6 }}>{icon}</span>}{label}</span>
      <span style={{ color: 'var(--ink)', fontWeight: 500, textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════

export default function SeoJourneyDetail() {
  var { visitor_id } = useParams();
  var navigate = useNavigate();
  var deleteVisitor = useDeleteVisitor();
  var { data, isLoading, error } = useVisitorJourney(visitor_id);

  // Merge sessions + events
  var sessionsWithEvents = useMemo(function () {
    var sessions = data?.sessions || [];
    var events = data?.timeline || data?.events || [];
    return sessions.map(function (s) {
      var sEvents = events.filter(function (e) { return e.session_id === s.session_id; })
        .sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
      return { session: s, events: sEvents };
    }).sort(function (a, b) { return new Date(b.session.started_at) - new Date(a.session.started_at); });
  }, [data]);

  if (isLoading && !data) return <LoadingState message="Chargement du parcours…" />;
  if (error) return <ErrorState message={'Erreur : ' + (error.message || 'inconnue')} />;

  var profile = data?.profile || data?.visitor || {};
  var lead = data?.lead || {};
  var loc = data?.location || profile.location || {};
  var stats = data?.stats || {};
  var topPages = data?.top_pages || [];

  if (!profile.visitor_id) {
    return (
      <div className="seo-fade">
        <div style={{ marginBottom: 12 }}><Link to="/seo/journeys" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none' }}><ArrowLeft style={{ width: 14, height: 14 }} /> Retour aux parcours</Link></div>
        <EmptyState icon={User} title="Visiteur introuvable" message="Ce visiteur n'existe pas ou a été supprimé (droit à l'oubli RGPD)." />
      </div>
    );
  }

  var isConverted = !!(profile.lead_id || lead?.lead_id);
  var identity = lead?.name || profile.lead_name || 'Visiteur ' + (profile.visitor_id || '').slice(0, 10);
  var cc = (loc.country_code || '').toUpperCase();
  var sessions = data?.sessions || [];
  var totalSessions = sessions.length || stats.sessions_count || 0;

  return (
    <div className="seo-fade">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Link to="/seo/journeys" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none' }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Retour aux parcours
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          {lead?.lead_id && <Link to={'/leads/' + lead.lead_id} className="seo-cta"><UserCheck style={{ width: 14, height: 14 }} /> Voir le lead</Link>}
          <button onClick={function () { copyId(window.location.href); }} className="seo-chip">🔗 Copier lien</button>
          <button onClick={async function () {
            if (!window.confirm('Supprimer toutes les données de ce visiteur ? (RGPD)')) return;
            await deleteVisitor.mutateAsync(visitor_id);
            navigate('/seo/journeys');
          }} className="seo-chip" style={{ color: 'var(--rouge)' }} disabled={deleteVisitor.isPending}>
            🗑 RGPD
          </button>
        </div>
      </div>

      {/* Bandeau conversion */}
      {isConverted && (
        <div style={{
          padding: 18, marginBottom: 18, borderRadius: 14, borderLeft: '4px solid #F59E0B',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 28 }}>🎯</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
              CONVERTI · {fmtDT(profile.converted_at || lead?.converted_at)}
              {profile.conversion_event && ' · via ' + profile.conversion_event}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
              {totalSessions} visite{totalSessions > 1 ? 's' : ''} · {stats.pageviews || 0} pages · Source : {profile.first_utm_source || 'Direct'}
            </div>
          </div>
          {lead?.lead_id && <Link to={'/leads/' + lead.lead_id} className="seo-cta">Voir lead →</Link>}
        </div>
      )}

      {/* Layout 2 colonnes */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Colonne gauche : profil (sticky) ── */}
        <div style={{ position: 'sticky', top: 80 }}>

          {/* Avatar + identité */}
          <InfoCard title="PROFIL VISITEUR">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, background: avatarGradient(profile.visitor_id),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, letterSpacing: 1, flexShrink: 0,
              }}>
                {(profile.visitor_id || '').slice(0, 6).toUpperCase()}
              </div>
              <div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{identity}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <button onClick={function () { copyId(profile.visitor_id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--ink-4)' }}>
                    <Copy style={{ width: 10, height: 10 }} /> {(profile.visitor_id || '').slice(0, 12)}…
                  </button>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: isConverted ? 'var(--emerald)' : 'var(--ink-3)', fontWeight: 600 }}>
              {isConverted ? '🟡 Converti ✓' : profile.identified ? '🟢 Identifié' : '⚪ Anonyme'} · {timeAgo(profile.last_seen)}
            </div>
          </InfoCard>

          {/* Géolocalisation */}
          <InfoCard title="LOCALISATION">
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              {cc ? <ReactCountryFlag countryCode={cc} svg style={{ width: 48, height: 36, borderRadius: 4 }} /> : <Globe style={{ width: 48, height: 48, color: 'var(--ink-3)' }} />}
            </div>
            <InfoRow label="Ville" value={loc.city || '—'} />
            <InfoRow label="Code postal" value={loc.postal || '—'} />
            <InfoRow label="Pays" value={loc.country || '—'} />
            <InfoRow label="Région" value={loc.region} />
            <InfoRow label="Timezone" value={loc.timezone} />
            {loc.lat && loc.lon && (
              <InfoRow label="Coordonnées IP"
                value={Number(loc.lat).toFixed(4) + ', ' + Number(loc.lon).toFixed(4)} />
            )}
            {profile?.precise_location && profile.precise_location.lat && (
              <div style={{
                marginTop: 10, padding: 10, borderRadius: 8,
                background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                border: '1px solid #93c5fd',
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#1e40af', letterSpacing: '0.1em', marginBottom: 4 }}>
                  🎯 GPS PRÉCIS (navigateur)
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#1e3a8a', fontWeight: 600 }}>
                  {Number(profile.precise_location.lat).toFixed(5)}, {Number(profile.precise_location.lon).toFixed(5)}
                </div>
                <div style={{ fontSize: 10, color: '#3730a3', marginTop: 2 }}>
                  Précision ±{Math.round(profile.precise_location.accuracy_m || 0)}m
                  {profile.precise_location.captured_at && ' · ' + fmtDT(profile.precise_location.captured_at)}
                </div>
                <a
                  href={`https://www.google.com/maps?q=${profile.precise_location.lat},${profile.precise_location.lon}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'inline-block', marginTop: 6, fontSize: 10,
                    color: '#1e40af', fontWeight: 700, textDecoration: 'underline',
                  }}>
                  → Voir sur Google Maps
                </a>
              </div>
            )}
          </InfoCard>

          {/* Device */}
          <InfoCard title="DEVICE">
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              {profile.device_type === 'mobile' ? <Smartphone style={{ width: 32, height: 32, color: 'var(--ink-2)' }} /> : <Monitor style={{ width: 32, height: 32, color: 'var(--ink-2)' }} />}
            </div>
            <InfoRow label="Type" value={profile.device_type || '—'} />
            <InfoRow label="Langue" value={profile.lang || loc.lang} />
            <InfoRow label="Timezone" value={profile.tz || loc.timezone} />
          </InfoCard>

          {/* Attribution */}
          <InfoCard title="ATTRIBUTION">
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', fontWeight: 700, marginBottom: 4 }}>🎯 FIRST-TOUCH</div>
              <InfoRow label="Source" value={profile.first_utm_source || 'Direct'} />
              <InfoRow label="Campagne" value={profile.first_utm_campaign} />
              <InfoRow label="Date" value={fmtDT(profile.first_seen)} />
            </div>
            <div style={{ borderTop: '1px solid var(--line-2)', paddingTop: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', fontWeight: 700, marginBottom: 4 }}>🏁 LAST-TOUCH</div>
              <InfoRow label="Source" value={profile.last_utm_source || profile.first_utm_source || 'Direct'} />
              <InfoRow label="Date" value={fmtDT(profile.last_seen)} />
            </div>
          </InfoCard>

          {/* Statistiques */}
          <InfoCard title="STATISTIQUES">
            <InfoRow label="Sessions totales" value={totalSessions} />
            <InfoRow label="Pages vues" value={stats.pageviews || profile.pageviews || 0} />
            <InfoRow label="Événements" value={stats.events_total || profile.events_total || 0} />
            <InfoRow label="Temps cumulé" value={fmtDuration(stats.total_duration_sec || profile.time_on_site_sec || 0)} />
            {isConverted && (
              <div style={{ borderTop: '1px solid var(--line-2)', marginTop: 8, paddingTop: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, marginBottom: 4 }}>⭐ AVANT CONVERSION</div>
                <InfoRow label="Visites" value={stats.visits_before_conversion || totalSessions} />
                <InfoRow label="Pages" value={stats.pages_before_conversion || stats.pageviews} />
              </div>
            )}
          </InfoCard>

          {/* Top pages */}
          {topPages.length > 0 && (
            <InfoCard title="TOP PAGES">
              {topPages.slice(0, 8).map(function (p, i) {
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 11 }}>
                    <span style={{ color: 'var(--ink-2)', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{p.path || p.page}</span>
                    <span style={{ color: 'var(--ink)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{p.count || p.views}</span>
                  </div>
                );
              })}
            </InfoCard>
          )}
        </div>

        {/* ── Colonne droite : timeline ── */}
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 14 }}>
            📍 Timeline complète · {sessionsWithEvents.reduce(function (s, g) { return s + g.events.length; }, 0)} événements · {sessionsWithEvents.length} sessions
          </div>

          {sessionsWithEvents.length === 0 ? (
            <EmptyState icon={Eye} title="Aucun événement enregistré" message="Ce visiteur n'a aucun événement dans la base." />
          ) : (
            sessionsWithEvents.map(function (group, i) {
              var isConvSession = group.session.converted_in_session;
              var isLast = i === 0; // dernière session = première dans l'ordre desc
              return (
                <SessionGroup
                  key={group.session.session_id || i}
                  session={group.session}
                  events={group.events}
                  index={i}
                  total={sessionsWithEvents.length}
                  defaultOpen={isConvSession || isLast}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
