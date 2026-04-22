// SeoGlobe.jsx — /seo/globe
// Carte du monde avec dots de visiteurs (style Taap.it/Plausible).
// - Map topojson via react-simple-maps
// - Dots colorés selon device/source
// - Popup flottant "Pages / Referrers / Countries" avec live users
// - Liste des visiteurs identifiés (matchés avec un lead CRM)
// - FILTRES : période, pays, page, device

import React, { useMemo, useState, useCallback, memo } from 'react';
import {
  ComposableMap, Geographies, Geography, Marker, ZoomableGroup,
} from 'react-simple-maps';
import {
  ArrowRight, Circle, Clock, ExternalLink, Eye, Globe as GlobeIcon, Link2,
  Mail, MapPin, Monitor, Phone, Settings, Share2, Smartphone, User,
  Users, Zap, Filter, ChevronDown, X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, EmptyState,
  fmt, useSeoFilter,
} from './SeoShared';
import {
  useGa4Analytics, useSeoAnalytics as useSeoStats, useRealtime, useVisitors,
} from '../../hooks/api';

const WORLD_TOPO = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Coordonnées approximatives des principales villes
const CITY_COORDS = {
  'Paris': [2.35, 48.85], 'Marseille': [5.37, 43.30], 'Lyon': [4.83, 45.76],
  'Toulouse': [1.44, 43.60], 'Nice': [7.27, 43.70], 'Nantes': [-1.55, 47.22],
  'Strasbourg': [7.75, 48.58], 'Montpellier': [3.88, 43.61],
  'Bordeaux': [-0.58, 44.84], 'Lille': [3.06, 50.63],
  'Rennes': [-1.68, 48.11], 'Reims': [4.03, 49.26],
  'Le Havre': [0.11, 49.49], 'Grenoble': [5.72, 45.17],
  'Toulon': [5.93, 43.12], 'Dijon': [5.04, 47.32],
  'Clermont-Ferrand': [3.08, 45.78], 'Orléans': [1.91, 47.90],
  'Cannes': [7.02, 43.55], 'Versailles': [2.12, 48.80],
  'London': [-0.12, 51.51], 'Brussels': [4.35, 50.85],
  'Berlin': [13.41, 52.52], 'Madrid': [-3.70, 40.42],
  'Rome': [12.50, 41.90], 'Geneva': [6.14, 46.20],
  'Zurich': [8.54, 47.38], 'Amsterdam': [4.90, 52.37],
  'New York': [-74.0, 40.71], 'Los Angeles': [-118.24, 34.05],
  'Montreal': [-73.57, 45.50], 'Dubai': [55.27, 25.20],
  'Tokyo': [139.69, 35.69], 'Sydney': [151.21, -33.87],
  'São Paulo': [-46.63, -23.55], 'Lagos': [3.39, 6.45],
  'Casablanca': [-7.59, 33.59], 'Dakar': [-17.47, 14.69],
  'Abidjan': [-4.03, 5.36], 'Tunis': [10.17, 36.80],
  'Alger': [3.04, 36.77], 'Douala': [9.77, 4.06],
};

const VISITOR_COLOR = '#10b981';

function coordsFor(visitor) {
  if (visitor.location?.lat && visitor.location?.lon)
    return [Number(visitor.location.lon), Number(visitor.location.lat)];
  const city = visitor.location?.city || visitor.lead?.city;
  if (city && CITY_COORDS[city]) return CITY_COORDS[city];
  return null;
}

// ── VisitorDot — memoized pour éviter 80+ re-renders ────────────
const VisitorDot = memo(function VisitorDot({ visitor, onHover, onLeave }) {
  const coords = coordsFor(visitor);
  if (!coords) return null;
  const r = 6;
  const identified = visitor.identified;
  return (
    <Marker coordinates={coords}>
      <g style={{ cursor: 'pointer' }}
        onMouseEnter={() => onHover(visitor, coords)}
        onMouseLeave={onLeave}>
        <circle r={r * 4} fill={VISITOR_COLOR} opacity="0.08" />
        <circle r={r * 2.5} fill={VISITOR_COLOR} opacity="0.25">
          <animate attributeName="r" from={r * 1.5} to={r * 3.5}
            dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.35" to="0.05"
            dur="2s" repeatCount="indefinite" />
        </circle>
        <circle r={r} fill={VISITOR_COLOR} stroke="white" strokeWidth="1.5" />
        {identified && <circle r={r - 2.5} fill="white" opacity="0.95" />}
      </g>
    </Marker>
  );
}, (prev, next) => prev.visitor.visitor_id === next.visitor.visitor_id);

// ── Tooltip ─────────────────────────────────────────────────────
function VisitorTooltip({ visitor: vis, x, y }) {
  if (!vis) return null;
  const city = vis.location?.city || '—';
  const country = vis.location?.country || '—';
  const name = vis.lead?.name;
  return (
    <div style={{
      position: 'absolute', left: x + 16, top: y - 40,
      background: 'white', borderRadius: 12, padding: '12px 16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12, minWidth: 200,
      pointerEvents: 'none', zIndex: 50, border: '1px solid #e2e8f0',
    }}>
      <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }}>
        {name || `Visiteur ${(vis.visitor_id || '').slice(0, 8)}`}
      </div>
      <div style={{ display: 'flex', gap: 10, color: 'var(--ink-3)' }}>
        <span><MapPin style={{ width: 11, height: 11, verticalAlign: 'middle' }} /> {city}, {country}</span>
        <span>{vis.device === 'mobile' ? '📱' : '💻'} {vis.device || '—'}</span>
      </div>
      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #f1f5f9', fontSize: 11, color: 'var(--ink-3)' }}>
        Page : <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>{vis.last_page || '/'}</code>
      </div>
    </div>
  );
}

// ── LivePopup ───────────────────────────────────────────────────
function LivePopup({ pages, referrers, countries, liveCount }) {
  if (!pages.length && !referrers.length && !countries.length) return null;
  return (
    <div style={{
      position: 'absolute', top: 16, right: 16, width: 260,
      background: 'white', borderRadius: 14,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden',
      border: '1px solid #e2e8f0', fontSize: 12,
    }}>
      {[
        { title: 'Pages les plus vues', items: pages.slice(0, 5).map(p => ({ label: p.path, value: fmt(p.views) })) },
        { title: 'Sources de trafic', items: referrers.slice(0, 4).map(r => ({ label: r.name, value: fmt(r.value) })) },
        { title: 'Pays', items: countries.slice(0, 5).map(c => ({ label: c.name, value: fmt(c.value) })) },
      ].map((section, si) => (
        <div key={si} style={{ padding: '10px 14px', borderTop: si ? '1px solid #f1f5f9' : 'none' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 6 }}>{section.title}</div>
          {section.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: 'var(--ink-2)' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>{item.label}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{item.value}</span>
            </div>
          ))}
        </div>
      ))}
      <div style={{
        padding: '8px 14px', background: 'var(--emerald-soft, #ecfdf5)',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--emerald)',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 999, background: 'white',
          animation: 'pulse 1.6s ease-in-out infinite',
        }} />
        {liveCount} en direct
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }`}</style>
    </div>
  );
}

// ── Barre de filtres ────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { value: 1, label: '1 heure' },
  { value: 6, label: '6 heures' },
  { value: 24, label: '24 heures' },
  { value: 48, label: '48 heures' },
  { value: 168, label: '7 jours' },
];

function FilterBar({ visitors, filters, setFilters, visitorHours, setVisitorHours }) {
  // Extraire les options disponibles depuis les données
  const countryOptions = useMemo(() => {
    const map = {};
    visitors.forEach(v => {
      const cc = v.location?.country_code;
      const cn = v.location?.country;
      if (cc && cn) map[cc] = cn;
    });
    return Object.entries(map).sort((a, b) => a[1].localeCompare(b[1]));
  }, [visitors]);

  const pageOptions = useMemo(() => {
    const set = new Set();
    visitors.forEach(v => { if (v.last_page) set.add(v.last_page); });
    return Array.from(set).sort();
  }, [visitors]);

  const hasFilters = filters.country || filters.page || filters.device;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>
        <Filter style={{ width: 14, height: 14 }} /> Filtrer :
      </div>

      {/* Période */}
      <select
        value={visitorHours}
        onChange={e => setVisitorHours(Number(e.target.value))}
        style={{
          padding: '5px 10px', borderRadius: 8, border: '1px solid var(--line)',
          fontSize: 12, background: 'white', color: 'var(--ink)',
          cursor: 'pointer', fontWeight: 600,
        }}
      >
        {PERIOD_OPTIONS.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      {/* Pays */}
      <select
        value={filters.country}
        onChange={e => setFilters(f => ({ ...f, country: e.target.value }))}
        style={{
          padding: '5px 10px', borderRadius: 8, border: '1px solid var(--line)',
          fontSize: 12, background: 'white', color: 'var(--ink)',
          cursor: 'pointer', minWidth: 120,
        }}
      >
        <option value="">Tous les pays</option>
        {countryOptions.map(([cc, cn]) => (
          <option key={cc} value={cc}>{cn}</option>
        ))}
      </select>

      {/* Page */}
      <select
        value={filters.page}
        onChange={e => setFilters(f => ({ ...f, page: e.target.value }))}
        style={{
          padding: '5px 10px', borderRadius: 8, border: '1px solid var(--line)',
          fontSize: 12, background: 'white', color: 'var(--ink)',
          cursor: 'pointer', minWidth: 120,
        }}
      >
        <option value="">Toutes les pages</option>
        {pageOptions.map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      {/* Device */}
      <select
        value={filters.device}
        onChange={e => setFilters(f => ({ ...f, device: e.target.value }))}
        style={{
          padding: '5px 10px', borderRadius: 8, border: '1px solid var(--line)',
          fontSize: 12, background: 'white', color: 'var(--ink)',
          cursor: 'pointer',
        }}
      >
        <option value="">Tous les devices</option>
        <option value="mobile">📱 Mobile</option>
        <option value="desktop">💻 Desktop</option>
      </select>

      {/* Identifié/anonyme */}
      <select
        value={filters.identified}
        onChange={e => setFilters(f => ({ ...f, identified: e.target.value }))}
        style={{
          padding: '5px 10px', borderRadius: 8, border: '1px solid var(--line)',
          fontSize: 12, background: 'white', color: 'var(--ink)',
          cursor: 'pointer',
        }}
      >
        <option value="">Tous</option>
        <option value="true">✅ Identifiés</option>
        <option value="false">👤 Anonymes</option>
      </select>

      {hasFilters && (
        <button
          onClick={() => setFilters({ country: '', page: '', device: '', identified: '' })}
          style={{
            padding: '5px 10px', borderRadius: 8, border: '1px solid var(--line)',
            fontSize: 11, background: 'white', color: 'var(--ink-3)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <X style={{ width: 12, height: 12 }} /> Réinitialiser
        </button>
      )}
    </div>
  );
}

// ── Composant principal ─────────────────────────────────────────
export default function SeoGlobe() {
  const { days } = useSeoFilter();
  const { data: ga4 } = useGa4Analytics(days);
  const { data: seo } = useSeoStats(days);
  const { data: realtime } = useRealtime();

  // Visiteurs : toujours les dernières 24h par défaut pour le globe.
  // L'utilisateur peut changer via le sélecteur de période du contexte SEO.
  const [visitorHours, setVisitorHours] = useState(24);
  const { data: visitors, isLoading } = useVisitors(visitorHours, 200);

  const [tooltip, setTooltip] = useState(null);
  const [filters, setFilters] = useState({ country: '', page: '', device: '', identified: '' });
  const mapRef = React.useRef(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const onDotHover = useCallback((visitor) => setTooltip(visitor), []);
  const onDotLeave = useCallback(() => setTooltip(null), []);

  // Throttled mouse move (max 20fps au lieu de 60)
  const lastMoveRef = React.useRef(0);
  const onMapMouseMove = useCallback((e) => {
    const now = Date.now();
    if (now - lastMoveRef.current < 50) return;
    lastMoveRef.current = now;
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const allVisitors = visitors?.visitors || [];

  // Appliquer les filtres
  const v = useMemo(() => {
    let list = allVisitors;
    if (filters.country) list = list.filter(x => x.location?.country_code === filters.country);
    if (filters.page) list = list.filter(x => x.last_page === filters.page);
    if (filters.device) list = list.filter(x => x.device === filters.device);
    if (filters.identified === 'true') list = list.filter(x => x.identified);
    if (filters.identified === 'false') list = list.filter(x => !x.identified);
    return list;
  }, [allVisitors, filters]);

  const identified = useMemo(() => v.filter((x) => x.identified), [v]);

  // Build pages / referrers / countries pour le popup
  const pages = useMemo(() => {
    const map = {};
    (ga4?.pages || []).forEach((p) => { map[p.path] = (map[p.path] || 0) + (p.views || 0); });
    return Object.entries(map).map(([path, views]) => ({ path, views })).sort((a, b) => b.views - a.views);
  }, [ga4]);

  const referrers = useMemo(() => {
    const map = {};
    (ga4?.sources || []).forEach((s) => { map[s.channel] = (map[s.channel] || 0) + (s.sessions || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [ga4]);

  const countries = useMemo(() => {
    const map = {};
    (seo?.countries || []).forEach((c) => {
      const code = (c.country || '').toUpperCase();
      map[code] = (map[code] || 0) + (c.clicks || 0);
    });
    return Object.entries(map).map(([code, value]) => ({
      code, value,
      name: new Intl.DisplayNames(['fr'], { type: 'region' }).of(code.length === 2 ? code : code.slice(0, 2)) || code,
    })).sort((a, b) => b.value - a.value);
  }, [seo]);

  if (isLoading && !visitors) return <LoadingState message="Chargement des visiteurs…" />;

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Globe · Audience"
        title={<>Carte <em>mondiale des visiteurs</em></>}
        subtitle={`${fmt(v.length)} visiteurs sur ${visitorHours <= 24 ? `${visitorHours}h` : `${Math.round(visitorHours / 24)}j`}, ${fmt(visitors?.identified || 0)} identifiés (${visitors?.identified_pct || 0}%).`}
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        <KpiTile label="En direct" value={fmt(realtime?.active_users || 0)}
          tone={(realtime?.active_users || 0) > 0 ? 'var(--emerald)' : 'var(--ink-4)'}
          icon={Zap} sub="GA4 realtime" />
        <KpiTile label={`Total ${days <= 1 ? '24h' : `${days}j`}`} value={fmt(allVisitors.length)} tone="var(--navy)" icon={Users} />
        <KpiTile label="Identifiés" value={fmt(visitors?.identified || 0)} tone="var(--emerald)" icon={User}
          sub={`${visitors?.identified_pct || 0}% du total`} />
        <KpiTile label="Pays touchés" value={fmt(countries.length)} tone="var(--gold)" icon={GlobeIcon} />
      </div>

      {/* Filtres */}
      <FilterBar visitors={allVisitors} filters={filters} setFilters={setFilters}
        visitorHours={visitorHours} setVisitorHours={setVisitorHours} />

      {/* Carte du monde */}
      <div ref={mapRef} onMouseMove={onMapMouseMove} style={{
        position: 'relative', background: '#fafbfc',
        border: '1px solid var(--line)', borderRadius: 20, overflow: 'hidden',
        marginBottom: 24, height: 560,
      }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 140 }}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup zoom={1.1} center={[0, 30]}>
            <Geographies geography={WORLD_TOPO}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#e9edf0"
                    stroke="#d1d5db"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { fill: '#d8dde3', outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>
            {v.map((visitor) => (
              <VisitorDot key={visitor.visitor_id} visitor={visitor}
                          onHover={onDotHover} onLeave={onDotLeave} />
            ))}
          </ZoomableGroup>
        </ComposableMap>

        {/* Légende */}
        <div style={{
          position: 'absolute', top: 16, left: 16,
          background: 'white', padding: '10px 14px', borderRadius: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)', fontSize: 11,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: VISITOR_COLOR,
                           boxShadow: `0 0 0 3px ${VISITOR_COLOR}33`, display: 'inline-block' }} />
            <span style={{ color: '#334155', fontWeight: 500 }}>Visiteur anonyme</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: VISITOR_COLOR,
                           border: '2px solid white', boxShadow: `0 0 0 2px ${VISITOR_COLOR}`, display: 'inline-block' }} />
            <span style={{ color: '#334155', fontWeight: 500 }}>Visiteur identifié</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
            <span style={{ width: 14, height: 14, borderRadius: 999,
                           background: `${VISITOR_COLOR}14`, border: `1px dashed ${VISITOR_COLOR}88`, display: 'inline-block' }} />
            <span style={{ color: '#64748b', fontSize: 10 }}>Zone approximative (géoloc IP)</span>
          </div>
        </div>

        {tooltip && <VisitorTooltip visitor={tooltip} x={mouse.x} y={mouse.y} />}

        <LivePopup
          pages={pages}
          referrers={referrers}
          countries={countries}
          liveCount={realtime?.active_users || 0}
        />
      </div>

      {/* Explication RGPD */}
      <div className="seo-card" style={{ padding: 16, marginBottom: 24, background: 'var(--navy-soft)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Eye style={{ width: 16, height: 16, color: 'var(--navy)', marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            <b>Respect du RGPD</b> — Les coordonnées (nom, email, téléphone, adresse) ne s'affichent
            que pour les visiteurs qui ont rempli un formulaire sur ton site. Les visiteurs anonymes
            sont géolocalisés à la ville via leur IP (approximation), sans identification personnelle.
          </div>
        </div>
      </div>

      {/* Visiteurs identifiés */}
      <SectionHeader eyebrow="Leads" title="Visiteurs identifiés"
        subtitle="Coordonnées saisies dans un formulaire, reliées à leur parcours sur le site via le tracker." />
      {identified.length === 0 ? (
        <div className="seo-card" style={{ padding: 40, marginBottom: 24 }}>
          <EmptyState icon={User} title="Pas encore de visiteur identifié"
            message="Dès qu'un visiteur soumet un formulaire (contact, devis), il apparaîtra ici avec ses coordonnées et son parcours." />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, marginBottom: 28 }}>
          {identified.map((vis, i) => (
            <div key={i} className="seo-card seo-card-hover" style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'center' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 14, alignItems: 'center' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'var(--emerald)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600,
                  }}>
                    {(vis.lead.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
                      {vis.lead.name || 'Sans nom'}
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 4, fontSize: 11, color: 'var(--ink-3)' }}>
                      {vis.lead.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail style={{ width: 11, height: 11 }} /> {vis.lead.email}</span>}
                      {vis.lead.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone style={{ width: 11, height: 11 }} /> {vis.lead.phone}</span>}
                      {vis.lead.address && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin style={{ width: 11, height: 11 }} /> {vis.lead.address}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="seo-label" style={{ fontSize: 9 }}>Service</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{vis.lead.service_type || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="seo-label" style={{ fontSize: 9 }}>Status</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)', textTransform: 'capitalize' }}>{vis.lead.status || '—'}</div>
                  </div>
                </div>
                <Link to={`/leads/${vis.lead.lead_id}`} className="seo-chip">
                  Dossier <ExternalLink style={{ width: 11, height: 11 }} />
                </Link>
              </div>
              <div style={{
                marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-2)',
                display: 'flex', gap: 16, fontSize: 11, color: 'var(--ink-3)', flexWrap: 'wrap',
              }}>
                <span><Clock style={{ width: 10, height: 10, verticalAlign: 'middle', marginRight: 4 }} />
                  Dernière visite : {new Date(vis.last_seen).toLocaleString('fr-FR')}</span>
                <span>{vis.device === 'mobile' ? <Smartphone style={{ width: 10, height: 10, verticalAlign: 'middle', marginRight: 4 }} /> : <Monitor style={{ width: 10, height: 10, verticalAlign: 'middle', marginRight: 4 }} />}{vis.device || 'unknown'}</span>
                {vis.utm_source && <span>Source : <b>{vis.utm_source}</b></span>}
                {vis.location && <span>📍 {vis.location.city || '—'}, {vis.location.country || '—'}</span>}
                <span>Page : <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>{vis.last_page}</code></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visiteurs anonymes (geoloc IP) */}
      <SectionHeader eyebrow="Audience" title={`Visiteurs anonymes (${fmt(v.length - identified.length)})`}
        subtitle="Géolocalisation approximative via IP. Pas de coordonnées sans consentement (RGPD)." />
      <div className="seo-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--surface-2)' }}>
              <tr>
                <th style={th}>Visiteur</th>
                <th style={th}>Ville / Pays</th>
                <th style={th}>Device</th>
                <th style={th}>Page</th>
                <th style={th}>Source</th>
                <th style={thRight}>Events</th>
                <th style={thRight}>Vu</th>
              </tr>
            </thead>
            <tbody>
              {v.filter((x) => !x.identified).slice(0, 100).map((vis, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--line-2)' }}>
                  <td style={td}>
                    <span className="seo-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                      {(vis.visitor_id || '').slice(0, 12)}
                    </span>
                  </td>
                  <td style={td}>
                    {vis.location?.city ? `${vis.location.city}, ${vis.location.country || '—'}` :
                     vis.location?.country || '—'}
                  </td>
                  <td style={td}>{vis.device === 'mobile' ? '📱' : '💻'} {vis.device || '—'}</td>
                  <td style={td}><code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{vis.last_page || '—'}</code></td>
                  <td style={td}>{vis.utm_source || (vis.referrer ? (() => { try { return new URL(vis.referrer).hostname; } catch { return 'Direct'; } })() : 'Direct')}</td>
                  <td style={tdRight}>{fmt(vis.event_count)}</td>
                  <td style={{ ...tdRight, fontSize: 11 }}>
                    {new Date(vis.last_seen).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const th = { padding: '10px 14px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace',
             fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 };
const thRight = { ...th, textAlign: 'right' };
const td = { padding: '10px 14px', fontSize: 12, color: 'var(--ink)' };
const tdRight = { ...td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' };
