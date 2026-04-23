// SeoJourneys.jsx — /seo/journeys
// Liste des parcours visiteurs avec filtres + tri.
// Temps réel : refetch 20s. Click sur une ligne → détail timeline.

import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ChevronRight, Clock, Eye, Filter, Flag, Gauge, Globe,
  MapPin, MessageSquare, MousePointerClick, Phone, Search, Smartphone,
  TrendingUp, User, UserCheck, Users, Zap,
} from 'lucide-react';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, EmptyState,
  fmt, useSeoFilter,
} from './SeoShared';
import { useJourneys, useJourneyOverview, useJourneyRealtime } from '../../hooks/api';

function fmtTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const diffMin = (Date.now() - d.getTime()) / 60000;
    if (diffMin < 1) return 'à l\'instant';
    if (diffMin < 60) return `il y a ${Math.round(diffMin)} min`;
    if (diffMin < 60 * 24) return `il y a ${Math.round(diffMin / 60)}h`;
    return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function fmtDuration(sec) {
  if (!sec) return '—';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}min`;
  return `${Math.floor(sec / 3600)}h${String(Math.round((sec % 3600) / 60)).padStart(2, '0')}`;
}

function StatusBadge({ visitor }) {
  if (visitor.lead_id) {
    return (
      <span className="seo-pill" style={{
        color: 'var(--emerald)', background: 'var(--emerald-soft)', borderColor: 'var(--emerald)',
      }}>
        <UserCheck style={{ width: 11, height: 11 }} /> Converti
      </span>
    );
  }
  if (visitor.identified) {
    return (
      <span className="seo-pill" style={{
        color: 'var(--navy)', background: 'var(--navy-soft)', borderColor: 'var(--navy)',
      }}>
        <User style={{ width: 11, height: 11 }} /> Identifié
      </span>
    );
  }
  return (
    <span className="seo-pill" style={{
      color: 'var(--ink-3)', background: 'var(--surface-2)', borderColor: 'var(--line)',
    }}>
      Anonyme
    </span>
  );
}

function VisitorCard({ v, onOpen }) {
  const locationLabel = v.location
    ? `${v.location.city || '—'}, ${v.location.country || '—'}`
    : '—';
  const isHot = v.cta_clicks > 0 || v.form_submits > 0;
  return (
    <div
      onClick={onOpen}
      className="seo-card seo-card-hover"
      style={{
        padding: 18, cursor: 'pointer', display: 'grid',
        gridTemplateColumns: '48px 1fr auto auto auto auto',
        gap: 16, alignItems: 'center',
        borderLeft: v.lead_id ? '3px solid var(--emerald)' : (isHot ? '3px solid var(--warm)' : '3px solid transparent'),
      }}
    >
      {/* Avatar / Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 999,
        background: v.lead_id ? 'var(--emerald)' : 'var(--surface-2)',
        color: v.lead_id ? 'white' : 'var(--ink-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600, flexShrink: 0,
      }}>
        {v.lead_name
          ? v.lead_name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')
          : <User style={{ width: 20, height: 20 }} />}
      </div>

      {/* Nom / visitor_id */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: 'var(--ink)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {v.lead_name || `Visiteur ${(v.visitor_id || '').slice(0, 10)}`}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {v.lead_email && <span>{v.lead_email}</span>}
          {v.lead_phone && <span>{v.lead_phone}</span>}
          {v.first_utm_source && <span>via <b>{v.first_utm_source}</b></span>}
        </div>
      </div>

      {/* Localisation */}
      <div style={{ textAlign: 'right', minWidth: 140 }}>
        <div className="seo-label" style={{ fontSize: 9 }}>Localisation</div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <MapPin style={{ width: 11, height: 11, color: 'var(--ink-3)' }} />
          {locationLabel}
        </div>
      </div>

      {/* Pages + sessions */}
      <div style={{ textAlign: 'right', minWidth: 100 }}>
        <div className="seo-label" style={{ fontSize: 9 }}>Activité</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--ink)', marginTop: 2, fontWeight: 600 }}>
          {fmt(v.pageviews)} pages · {v.sessions_count || 0} session{v.sessions_count > 1 ? 's' : ''}
        </div>
      </div>

      {/* CTA / conversion */}
      <div style={{ textAlign: 'right', minWidth: 100 }}>
        {v.form_submits > 0 ? (
          <div style={{ color: 'var(--emerald)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
            ✓ FORMULAIRE
          </div>
        ) : v.phone_clicks > 0 ? (
          <div style={{ color: 'var(--warm)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
            📞 APPEL
          </div>
        ) : v.cta_clicks > 0 ? (
          <div style={{ color: 'var(--gold)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
            CTA CLIC
          </div>
        ) : (
          <div style={{ color: 'var(--ink-4)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
            —
          </div>
        )}
        <div className="seo-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
          {fmtTime(v.last_seen)}
        </div>
      </div>

      <ChevronRight style={{ width: 16, height: 16, color: 'var(--ink-3)' }} />
    </div>
  );
}

const SORTS = [
  { value: 'last_seen', label: 'Activité récente' },
  { value: 'pageviews', label: 'Nb pages' },
  { value: 'sessions', label: 'Nb sessions' },
  { value: 'events', label: 'Nb events' },
];

const SEGMENTS = [
  { value: '', label: 'Tous', icon: Users },
  { value: 'converted', label: 'Convertis', icon: UserCheck },
  { value: 'hot', label: 'À contacter', icon: Zap },
  { value: 'returning', label: 'Visiteurs récurrents', icon: TrendingUp },
];

export default function SeoJourneys() {
  const navigate = useNavigate();
  const { days } = useSeoFilter();
  const [segment, setSegment] = useState('');
  const [sort, setSort] = useState('last_seen');
  const [minPages, setMinPages] = useState(0);
  const [search, setSearch] = useState('');

  const filters = useMemo(() => {
    const base = { days, sort, limit: 200 };
    if (segment === 'converted') base.converted = true;
    if (segment === 'hot') base.min_sessions = 1;
    if (segment === 'returning') base.min_sessions = 2;
    if (minPages > 0) base.min_pages = minPages;
    return base;
  }, [days, sort, segment, minPages]);

  const { data, isLoading, error, refetch } = useJourneys(filters);
  const { data: overview } = useJourneyOverview(days);
  const { data: realtime } = useJourneyRealtime();

  const filtered = useMemo(() => {
    let list = data?.visitors || [];
    if (segment === 'hot') {
      list = list.filter((v) => v.cta_clicks > 0 && !v.lead_id);
    }
    if (segment === 'returning') {
      list = list.filter((v) => (v.sessions_count || 0) >= 2);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((v) =>
        (v.lead_name || '').toLowerCase().includes(q) ||
        (v.lead_email || '').toLowerCase().includes(q) ||
        (v.lead_phone || '').includes(q) ||
        (v.visitor_id || '').toLowerCase().includes(q) ||
        (v.location?.city || '').toLowerCase().includes(q) ||
        (v.location?.country || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, segment, search]);

  const stats = data?.stats || {};

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Audience · Parcours"
        title={<>Parcours <em>visiteurs</em></>}
        subtitle={`${fmt(data?.total || 0)} visiteurs sur ${days} jours · ${fmt(stats.identified || 0)} identifiés · ${fmt(stats.converted || 0)} convertis.`}
        actions={
          <button onClick={() => refetch()} className="seo-chip">
            <Zap style={{ width: 12, height: 12 }} /> Actualiser
          </button>
        }
      />

      {/* KPIs — branchés sur stats/overview + realtime */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiTile label="Visiteurs uniques" value={fmt(overview?.unique_visitors || data?.total || 0)} tone="var(--navy)" icon={Users}
          sub={overview?.unique_visitors_delta ? `${overview.unique_visitors_delta > 0 ? '+' : ''}${overview.unique_visitors_delta} vs période préc.` : `${days}j`} />
        <KpiTile label="Taux de conversion" value={`${overview?.conversion_rate || 0}%`} tone="var(--emerald)" icon={TrendingUp}
          sub={overview?.conversion_rate_delta ? `${overview.conversion_rate_delta > 0 ? '+' : ''}${overview.conversion_rate_delta}% vs préc.` : `${fmt(overview?.converted_count || stats.converted || 0)} convertis`} />
        <KpiTile label="Visites avant conversion" value={fmt(overview?.avg_visits_before_conversion || 0)} tone="var(--gold)" icon={Gauge}
          sub={`${fmt(overview?.avg_pages_before_conversion || 0)} pages en moy.`} />
        <KpiTile label="Pages vues" value={fmt(overview?.total_pageviews || 0)} tone="var(--ink-2)" icon={Eye}
          sub={`${days}j`} />
        <KpiTile
          label={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: (realtime?.active_visitors || 0) > 0 ? '#10b981' : '#94a3b8',
                          animation: (realtime?.active_visitors || 0) > 0 ? 'pulse 1.6s ease-in-out infinite' : 'none', display: 'inline-block' }} />
            En direct
          </span>}
          value={fmt(realtime?.active_visitors || 0)}
          tone={(realtime?.active_visitors || 0) > 0 ? 'var(--emerald)' : 'var(--ink-4)'}
          icon={Zap}
          sub={realtime?.active_pages?.[0] ? `${realtime.active_pages[0].path} (${realtime.active_pages[0].count})` : 'Aucun actif'}
        />
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }`}</style>

      {/* Segments */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {SEGMENTS.map((s) => {
          const active = segment === s.value;
          return (
            <button key={s.value} onClick={() => setSegment(s.value)}
              className={active ? 'seo-chip active' : 'seo-chip'}
              style={active ? { background: 'var(--ink)', color: 'var(--bg)', borderColor: 'var(--ink)' } : {}}
            >
              <s.icon style={{ width: 12, height: 12 }} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Search + tri */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10,
        }}>
          <Search style={{ width: 14, height: 14, color: 'var(--ink-3)' }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, email, téléphone, ville, pays…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, fontFamily: 'Inter, sans-serif', color: 'var(--ink)',
            }}
          />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10,
        }}>
          <Filter style={{ width: 12, height: 12, color: 'var(--ink-3)' }} />
          <span className="seo-label">Trier</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-2)',
            }}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10,
        }}>
          <span className="seo-label">Min pages</span>
          <select value={minPages} onChange={(e) => setMinPages(Number(e.target.value))}
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-2)',
            }}>
            {[0, 2, 3, 5, 10].map((n) => (
              <option key={n} value={n}>{n === 0 ? 'Aucun' : `≥ ${n}`}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste */}
      {isLoading && !data ? (
        <LoadingState message="Chargement des parcours…" />
      ) : error ? (
        <div className="seo-card" style={{ padding: 40, textAlign: 'center', color: 'var(--rouge)' }}>
          Erreur de chargement : {error.message}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun visiteur dans ce filtre"
          message={segment ? "Essayez un autre segment ou réinitialisez les filtres."
                           : "Attendez qu'un visiteur arrive sur le site pour voir apparaître son parcours ici."}
        />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map((v) => (
            <VisitorCard
              key={v.visitor_id}
              v={v}
              onOpen={() => navigate(`/seo/journeys/${v.visitor_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
