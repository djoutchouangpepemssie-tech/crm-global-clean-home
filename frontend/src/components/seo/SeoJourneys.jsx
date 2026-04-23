// SeoJourneys.jsx — /seo/journeys
// Tableau visiteurs premium — Étape 3 : KPIs overview, filtres avancés,
// badge LIVE, colonnes triables, drapeaux pays, badges "visites avant conversion".
// Niveau HubSpot Contacts + Linear + Vercel Analytics.

import React, { useMemo, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Copy, Eye, Filter, Globe, MapPin, Monitor,
  Phone, RefreshCw, Search, Smartphone, Tablet, TrendingUp,
  User, UserCheck, Users, X, Zap,
} from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';
import {
  PageHeader, KpiTile, LoadingState, EmptyState, fmt, useSeoFilter,
} from './SeoShared';
import { useJourneys, useJourneyOverview, useJourneyRealtime } from '../../hooks/api';
import { toast } from 'sonner';

// ── Helpers ─────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return '—';
  try {
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'à l\'instant';
    if (diff < 3600) return 'il y a ' + Math.round(diff / 60) + ' min';
    if (diff < 86400) return 'il y a ' + Math.round(diff / 3600) + 'h';
    if (diff < 604800) return 'il y a ' + Math.round(diff / 86400) + 'j';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  } catch (_e) { return '—'; }
}

function fullDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch (_e) { return ''; }
}

function copyId(text) {
  try { navigator.clipboard.writeText(text); toast.success('ID copié !'); } catch (_e) {}
}

// ── Composants atomiques ────────────────────────────────────────

function DeviceIcon({ type }) {
  var s = { width: 14, height: 14, color: 'var(--ink-3)' };
  if (type === 'mobile') return <Smartphone style={s} />;
  if (type === 'tablet') return <Tablet style={s} />;
  return <Monitor style={s} />;
}

function CFlag({ code }) {
  if (!code) return <Globe style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />;
  try { return <ReactCountryFlag countryCode={code.toUpperCase()} svg style={{ width: 18, height: 14, borderRadius: 2 }} />; }
  catch (_e) { return <span style={{ fontSize: 14 }}>{code}</span>; }
}

function StatusDot({ visitor }) {
  if (visitor.lead_id) return <span title="Converti" style={{ width: 10, height: 10, borderRadius: 999, background: '#f59e0b', display: 'inline-block', boxShadow: '0 0 0 2px rgba(245,158,11,0.25)' }} />;
  var isRecent = false;
  try { isRecent = (Date.now() - new Date(visitor.last_seen).getTime()) < 5 * 60 * 1000; } catch (_e) {}
  if (isRecent) return <span title="Actif" style={{ width: 10, height: 10, borderRadius: 999, background: '#10b981', display: 'inline-block', animation: 'dotpulse 1.6s ease-in-out infinite' }} />;
  var isActive30 = false;
  try { isActive30 = (Date.now() - new Date(visitor.last_seen).getTime()) < 30 * 60 * 1000; } catch (_e) {}
  if (isActive30) return <span title="Récent" style={{ width: 10, height: 10, borderRadius: 999, background: '#10b981', display: 'inline-block' }} />;
  return <span title="Inactif" style={{ width: 10, height: 10, borderRadius: 999, background: '#d1d5db', display: 'inline-block' }} />;
}

function ConvBadge({ value }) {
  if (value === null || value === undefined)
    return <span style={{ fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic', fontFamily: 'JetBrains Mono, monospace' }}>En cours</span>;
  var color, bg;
  if (value <= 1) { color = '#065f46'; bg = '#d1fae5'; }
  else if (value <= 3) { color = '#047857'; bg = '#ecfdf5'; }
  else if (value <= 6) { color = '#92400e'; bg = '#fef3c7'; }
  else { color = '#991b1b'; bg = '#fee2e2'; }
  return <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', padding: '2px 8px', borderRadius: 6, color: color, background: bg }}>{value} visite{value > 1 ? 's' : ''}</span>;
}

function SourceCell({ v }) {
  var src = v.first_utm_source || '';
  var camp = v.first_utm_campaign || '';
  if (!src && !v.first_referrer) return <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Direct</span>;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src || 'Referral'}</div>
      {camp && <div style={{ fontSize: 10, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={camp}>{camp}</div>}
    </div>
  );
}

// ── Ligne du tableau (memoized) ─────────────────────────────────

var Row = memo(function Row({ v, onOpen }) {
  var city = v.location?.city || '';
  var postal = v.location?.postal || '';
  var country = v.location?.country || '';
  var cc = (v.location?.country_code || '').toUpperCase();
  var hasPreciseGps = v.precise_location && v.precise_location.lat;
  var isConverted = !!v.lead_id;
  var sessions = v.sessions_count || (v.sessions ? v.sessions.length : 0) || 0;
  var visitsBeforeConv = isConverted ? (v.visits_before_conversion || sessions || null) : null;
  return (
    <tr onClick={onOpen} style={{ cursor: 'pointer', borderBottom: '1px solid var(--line-2)', borderLeft: isConverted ? '3px solid #f59e0b' : '3px solid transparent', transition: 'background 0.12s' }}
      onMouseEnter={function (e) { e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={function (e) { e.currentTarget.style.background = 'transparent'; }}>
      <td style={td}><StatusDot visitor={v} /></td>
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CFlag code={cc} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {city ? city + (postal ? ' ' + postal : '') + ', ' + country : country || '—'}
            </div>
            {hasPreciseGps && (
              <div style={{ fontSize: 9, color: '#1e40af', fontWeight: 700, marginTop: 1 }}>
                🎯 GPS ±{Math.round(v.precise_location.accuracy_m || 0)}m
              </div>
            )}
          </div>
        </div>
      </td>
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="seo-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{v.lead_name || (v.visitor_id || '').slice(0, 10)}</span>
          {!v.lead_name && <button onClick={function (e) { e.stopPropagation(); copyId(v.visitor_id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.3 }} title="Copier"><Copy style={{ width: 11, height: 11, color: 'var(--ink-3)' }} /></button>}
        </div>
        {v.lead_email && <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{v.lead_email}</div>}
      </td>
      <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DeviceIcon type={v.device_type} /><span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{v.device_type || '—'}</span></div></td>
      <td style={td}><SourceCell v={v} /></td>
      <td style={{ ...td, ...mono }}>{sessions}</td>
      <td style={{ ...td, ...mono }}>{v.pageviews || 0}</td>
      <td style={td}><ConvBadge value={visitsBeforeConv} /></td>
      <td style={td} title={fullDate(v.first_seen)}><span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{timeAgo(v.first_seen)}</span></td>
      <td style={td} title={fullDate(v.last_seen)}><span style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 500 }}>{timeAgo(v.last_seen)}</span></td>
      <td style={td}><ChevronRight style={{ width: 16, height: 16, color: 'var(--ink-3)' }} /></td>
    </tr>
  );
}, function (a, b) { return a.v.visitor_id === b.v.visitor_id && a.v.last_seen === b.v.last_seen; });

// ── Constantes ──────────────────────────────────────────────────

var SORTS = [
  { value: 'last_seen', label: 'Activité récente' },
  { value: 'pageviews', label: 'Nb pages' },
  { value: 'sessions', label: 'Nb sessions' },
  { value: 'events', label: 'Nb events' },
];
var SEGMENTS = [
  { value: '', label: 'Tous', icon: Users },
  { value: 'converted', label: 'Convertis', icon: UserCheck },
  { value: 'hot', label: 'À contacter', icon: Zap },
  { value: 'returning', label: 'Récurrents', icon: TrendingUp },
];

// ── Composant principal ─────────────────────────────────────────

export default function SeoJourneys() {
  var navigate = useNavigate();
  var { days } = useSeoFilter();
  var [segment, setSegment] = useState('');
  var [sort, setSort] = useState('last_seen');
  var [minPages, setMinPages] = useState(0);
  var [search, setSearch] = useState('');
  var [searchDebounced, setSearchDebounced] = useState('');
  var searchTimer = React.useRef(null);
  var handleSearch = useCallback(function (val) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(function () { setSearchDebounced(val); }, 400);
  }, []);

  var filters = useMemo(function () {
    var base = { days: days, sort: sort, limit: 200 };
    if (segment === 'converted') base.converted = true;
    if (segment === 'hot') base.min_sessions = 1;
    if (segment === 'returning') base.min_sessions = 2;
    if (minPages > 0) base.min_pages = minPages;
    return base;
  }, [days, sort, segment, minPages]);

  var { data, isLoading, error, refetch } = useJourneys(filters);
  var { data: overview } = useJourneyOverview(days);
  var { data: realtime } = useJourneyRealtime();

  var filtered = useMemo(function () {
    var list = data?.visitors || [];
    if (segment === 'hot') list = list.filter(function (v) { return v.cta_clicks > 0 && !v.lead_id; });
    if (segment === 'returning') list = list.filter(function (v) { return (v.sessions_count || 0) >= 2; });
    if (searchDebounced.trim()) {
      var q = searchDebounced.toLowerCase();
      list = list.filter(function (v) {
        return (v.lead_name || '').toLowerCase().includes(q) || (v.lead_email || '').toLowerCase().includes(q) ||
          (v.lead_phone || '').includes(q) || (v.visitor_id || '').toLowerCase().includes(q) ||
          (v.location?.city || '').toLowerCase().includes(q) || (v.location?.country || '').toLowerCase().includes(q);
      });
    }
    return list;
  }, [data, segment, searchDebounced]);

  var hasFilters = segment || searchDebounced || minPages > 0;

  return (
    <div className="seo-fade">
      <style>{'@keyframes dotpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}'}</style>

      <PageHeader eyebrow="Audience · Parcours" title={<>Visitor <em>Journeys</em></>}
        subtitle="Parcours complet de chaque visiteur avant conversion"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={function () { refetch(); }} className="seo-chip"><RefreshCw style={{ width: 12, height: 12 }} /> Actualiser</button>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999,
              background: (realtime?.active_visitors || 0) > 0 ? 'var(--emerald-soft,#ecfdf5)' : 'var(--surface-2)',
              border: (realtime?.active_visitors || 0) > 0 ? '1px solid var(--emerald,#10b981)' : '1px solid var(--line)',
              fontSize: 12, fontWeight: 700, color: (realtime?.active_visitors || 0) > 0 ? 'var(--emerald,#10b981)' : 'var(--ink-4)',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, display: 'inline-block',
                background: (realtime?.active_visitors || 0) > 0 ? '#10b981' : '#94a3b8',
                animation: (realtime?.active_visitors || 0) > 0 ? 'dotpulse 1.6s ease-in-out infinite' : 'none' }} />
              LIVE · {realtime?.active_visitors || 0}
            </div>
          </div>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiTile label="Visiteurs uniques" value={fmt(overview?.unique_visitors || data?.total || 0)} tone="var(--navy)" icon={Users}
          sub={overview?.unique_visitors_delta ? (overview.unique_visitors_delta > 0 ? '+' : '') + overview.unique_visitors_delta + ' vs préc.' : days + 'j'} />
        <KpiTile label="Taux de conversion" value={(overview?.conversion_rate || 0) + '%'} tone="var(--emerald)" icon={TrendingUp}
          sub={overview?.conversion_rate_delta ? (overview.conversion_rate_delta > 0 ? '+' : '') + overview.conversion_rate_delta + '% vs préc.' : fmt(overview?.converted_count || 0) + ' convertis'} />
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--navy,#1e293b)', borderRadius: '2px 2px 0 0' }} />
          <KpiTile label="Visites avant conv. ⭐" value={fmt(overview?.avg_visits_before_conversion || 0)} tone="var(--gold)" icon={Eye}
            sub={fmt(overview?.avg_pages_before_conversion || 0) + ' pages en moy.'} />
        </div>
        <KpiTile label="Pages vues" value={fmt(overview?.total_pageviews || 0)} tone="var(--ink-2)" icon={Eye} sub={days + 'j'} />
        <KpiTile label="Top pays" value={overview?.top_countries?.[0] ? overview.top_countries[0].name : '—'} tone="var(--gold)" icon={Globe}
          sub={overview?.top_countries?.[0] ? fmt(overview.top_countries[0].count) + ' visiteurs' : '—'} />
      </div>

      {/* Segments */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {SEGMENTS.map(function (s) {
          var active = segment === s.value;
          return <button key={s.value} onClick={function () { setSegment(s.value); }}
            className={active ? 'seo-chip active' : 'seo-chip'}
            style={active ? { background: 'var(--ink)', color: 'var(--bg)', borderColor: 'var(--ink)' } : {}}>
            <s.icon style={{ width: 12, height: 12 }} /> {s.label}
          </button>;
        })}
      </div>

      {/* Filtres (sticky) */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center', position: 'sticky', top: 64, zIndex: 20, background: 'var(--bg)', padding: '8px 0' }}>
        <div style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10 }}>
          <Search style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
          <input value={search} onChange={function (e) { handleSearch(e.target.value); }} placeholder="Nom, email, tél, ville, pays, ID…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--ink)' }} />
          {search && <button onClick={function () { handleSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><X style={{ width: 12, height: 12, color: 'var(--ink-3)' }} /></button>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10 }}>
          <Filter style={{ width: 12, height: 12, color: 'var(--ink-3)' }} />
          <select value={sort} onChange={function (e) { setSort(e.target.value); }}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-2)' }}>
            {SORTS.map(function (s) { return <option key={s.value} value={s.value}>{s.label}</option>; })}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10 }}>
          <span className="seo-label">Min pages</span>
          <select value={minPages} onChange={function (e) { setMinPages(Number(e.target.value)); }}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-2)' }}>
            {[0, 2, 3, 5, 10].map(function (n) { return <option key={n} value={n}>{n === 0 ? 'Aucun' : '≥ ' + n}</option>; })}
          </select>
        </div>
        {hasFilters && <button onClick={function () { setSegment(''); setSearch(''); setSearchDebounced(''); setMinPages(0); }} className="seo-chip" style={{ color: 'var(--rouge)' }}><X style={{ width: 12, height: 12 }} /> Réinitialiser</button>}
      </div>

      {/* Tableau */}
      {isLoading && !data ? <LoadingState message="Chargement des parcours visiteurs…" />
        : error ? <div className="seo-card" style={{ padding: 40, textAlign: 'center' }}><div style={{ color: 'var(--rouge)', marginBottom: 12 }}>Erreur de chargement</div><button onClick={function () { refetch(); }} className="seo-chip">Réessayer</button></div>
        : filtered.length === 0 ? <EmptyState icon={Users} title="Aucun visiteur dans ce filtre" message={hasFilters ? 'Essayez un autre segment.' : 'Attendez qu\'un visiteur arrive sur le site.'} />
        : (
          <div className="seo-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead><tr style={{ background: 'var(--surface-2)' }}>
                  <th style={th}>●</th><th style={th}>Localisation</th><th style={th}>Visiteur</th>
                  <th style={th}>Device</th><th style={th}>Source</th>
                  <th style={{ ...th, textAlign: 'right' }}>Sessions</th>
                  <th style={{ ...th, textAlign: 'right' }}>Pages</th>
                  <th style={th}>Avant conv. ⭐</th>
                  <th style={th}>1ère visite</th><th style={th}>Dernière</th>
                  <th style={{ ...th, width: 40 }}></th>
                </tr></thead>
                <tbody>
                  {filtered.map(function (v) {
                    return <Row key={v.visitor_id} v={v} onOpen={function () { navigate('/seo/journeys/' + v.visitor_id); }} />;
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line-2)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)' }}>
              <span>{fmt(filtered.length)} visiteurs sur {fmt(data?.total || 0)}</span>
              <span className="seo-mono" style={{ fontSize: 10 }}>Auto-refresh 20s</span>
            </div>
          </div>
        )}
    </div>
  );
}

var th = { padding: '10px 14px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600, whiteSpace: 'nowrap' };
var td = { padding: '10px 14px', fontSize: 12, verticalAlign: 'middle' };
var mono = { fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, textAlign: 'right', color: 'var(--ink)' };
