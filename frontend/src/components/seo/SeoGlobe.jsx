// SeoGlobe.jsx — /seo/globe
// Carte mondiale premium — heatmap pays, dots taille variable, connexions
// animées vers Paris, hover pays détaillé, flux live, filtres avancés.
// Niveau Plausible/Vercel Analytics/Cloudflare Radar.

import React, { useMemo, useState, useCallback, memo } from 'react';
import {
  ComposableMap, Geographies, Geography, Marker, ZoomableGroup, Line,
} from 'react-simple-maps';
import ReactCountryFlag from 'react-country-flag';
import {
  Clock, ExternalLink, Eye, Globe as GlobeIcon, Filter,
  Mail, MapPin, Monitor, Phone, Smartphone, User,
  Users, Zap, X, TrendingUp, Activity,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, EmptyState,
  fmt, useSeoFilter,
} from './SeoShared';
import {
  useGa4Analytics, useSeoAnalytics as useSeoStats, useRealtime, useVisitors,
  useJourneyOverview, useJourneyRealtime,
} from '../../hooks/api';

const WORLD_TOPO = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const PARIS = [2.35, 48.85]; // Siège Global Clean Home
const VISITOR_COLOR = '#10b981';
const HOT_COLOR = '#f59e0b';
const IDENTIFIED_COLOR = '#3b82f6';

// Villes connues
const CITY_COORDS = {
  'Paris': [2.35, 48.85], 'Marseille': [5.37, 43.30], 'Lyon': [4.83, 45.76],
  'Toulouse': [1.44, 43.60], 'Nice': [7.27, 43.70], 'Nantes': [-1.55, 47.22],
  'Strasbourg': [7.75, 48.58], 'Montpellier': [3.88, 43.61],
  'Bordeaux': [-0.58, 44.84], 'Lille': [3.06, 50.63],
  'Rennes': [-1.68, 48.11], 'Grenoble': [5.72, 45.17],
  'London': [-0.12, 51.51], 'Brussels': [4.35, 50.85],
  'Berlin': [13.41, 52.52], 'Madrid': [-3.70, 40.42],
  'Rome': [12.50, 41.90], 'Amsterdam': [4.90, 52.37],
  'Casablanca': [-7.59, 33.59], 'Dakar': [-17.47, 14.69],
  'Abidjan': [-4.03, 5.36], 'Douala': [9.77, 4.06],
  'Antananarivo': [47.52, -18.87], 'Tunis': [10.17, 36.80],
};

// ISO3 → ISO2 mapping pour les pays du topojson
const ISO3_TO_2 = {
  FRA:'FR', USA:'US', GBR:'GB', DEU:'DE', ESP:'ES', ITA:'IT', BEL:'BE', CHE:'CH',
  NLD:'NL', PRT:'PT', MAR:'MA', SEN:'SN', CIV:'CI', CMR:'CM', TUN:'TN', DZA:'DZ',
  MDG:'MG', CAN:'CA', BRA:'BR', JPN:'JP', CHN:'CN', IND:'IN', AUS:'AU', RUS:'RU',
  NGA:'NGA', COD:'CD', GAB:'GA', MLI:'ML', BFA:'BF', GIN:'GN', TGO:'TG', BEN:'BJ',
};

// Dispersion : décale les points qui ont des coordonnées trop proches
// pour éviter qu'ils se chevauchent sur la carte
var _usedCoords = {};
function disperseCoords(lon, lat, id) {
  var key = Math.round(lon * 10) + '_' + Math.round(lat * 10);
  if (!_usedCoords[key]) { _usedCoords[key] = 0; }
  var n = _usedCoords[key]++;
  if (n === 0) return [lon, lat];
  // Spirale pour disperser les points superposés
  var angle = n * 2.4; // angle d'or en radians
  var radius = 0.3 + n * 0.15; // rayon croissant
  return [lon + Math.cos(angle) * radius, lat + Math.sin(angle) * radius];
}

function coordsFor(visitor) {
  var lon, lat;
  if (visitor.location?.lat && visitor.location?.lon) {
    lon = Number(visitor.location.lon);
    lat = Number(visitor.location.lat);
  } else {
    var city = visitor.location?.city;
    if (city && CITY_COORDS[city]) {
      lon = CITY_COORDS[city][0];
      lat = CITY_COORDS[city][1];
    } else {
      return null;
    }
  }
  return disperseCoords(lon, lat, visitor.visitor_id);
}

function dotSize(visitor) {
  var events = visitor.event_count || visitor.events_total || 1;
  if (events > 50) return 10;
  if (events > 20) return 8;
  if (events > 5) return 6;
  return 5;
}

function dotColor(visitor) {
  if (visitor.identified || visitor.lead) return IDENTIFIED_COLOR;
  if ((visitor.event_count || 0) > 10 || visitor.cta_clicks > 0) return HOT_COLOR;
  return VISITOR_COLOR;
}

// ── VisitorDot — taille variable + couleur selon statut ─────────
var VisitorDot = memo(function VisitorDot({ visitor, onHover, onLeave }) {
  var coords = coordsFor(visitor);
  if (!coords) return null;
  var r = dotSize(visitor);
  var color = dotColor(visitor);
  var identified = visitor.identified;
  return (
    <Marker coordinates={coords}>
      <g style={{ cursor: 'pointer' }}
        onMouseEnter={function () { onHover(visitor); }}
        onMouseLeave={onLeave}>
        {/* Zone de hover invisible mais grande (facile à cibler avec la souris) */}
        <circle r={Math.max(r * 4, 18)} fill="transparent" />
        {/* Halo extérieur */}
        <circle r={r * 3} fill={color} opacity="0.06" />
        {/* Pulse animé */}
        <circle r={r * 2} fill={color} opacity="0.2">
          <animate attributeName="r" from={r * 1.5} to={r * 3} dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.3" to="0.03" dur="2.5s" repeatCount="indefinite" />
        </circle>
        {/* Point principal */}
        <circle r={r} fill={color} stroke="white" strokeWidth="2" />
        {identified && <circle r={r - 2} fill="white" opacity="0.9" />}
      </g>
    </Marker>
  );
}, function (a, b) { return a.visitor.visitor_id === b.visitor.visitor_id; });

// ── Connexion animée visiteur → Paris ───────────────────────────
function ConnectionLine({ from }) {
  if (!from) return null;
  return (
    <Line
      from={from}
      to={PARIS}
      stroke={VISITOR_COLOR}
      strokeWidth={0.8}
      strokeLinecap="round"
      strokeDasharray="4 4"
      strokeOpacity={0.3}
    />
  );
}

// ── Tooltip enrichi ─────────────────────────────────────────────
function VisitorTooltip({ visitor, x, y }) {
  if (!visitor) return null;
  var city = visitor.location?.city || '—';
  var country = visitor.location?.country || '—';
  var cc = (visitor.location?.country_code || '').toUpperCase();
  var name = visitor.lead?.name || visitor.lead_name;
  var events = visitor.event_count || visitor.events_total || 0;
  var color = dotColor(visitor);

  return (
    <div style={{
      position: 'absolute', left: Math.min(x + 16, 500), top: Math.max(y - 20, 10),
      background: 'white', borderRadius: 14, padding: '14px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)', fontSize: 12, minWidth: 220, maxWidth: 300,
      pointerEvents: 'none', zIndex: 50, border: '1px solid #e2e8f0',
      borderLeft: '4px solid ' + color,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {cc && <ReactCountryFlag countryCode={cc} svg style={{ width: 20, height: 15, borderRadius: 2 }} />}
        <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, color: 'var(--ink)' }}>
          {name || 'Visiteur ' + (visitor.visitor_id || '').slice(0, 8)}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: 'var(--ink-3)' }}>
        <span><MapPin style={{ width: 11, height: 11, verticalAlign: 'middle' }} /> {city}, {country}</span>
        <span>{visitor.device === 'mobile' || visitor.device_type === 'mobile' ? '📱' : '💻'} {visitor.device || visitor.device_type || '—'}</span>
        <span><Activity style={{ width: 11, height: 11, verticalAlign: 'middle' }} /> {events} événements</span>
        {visitor.last_page && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>📄 {visitor.last_page}</span>}
        {visitor.utm_source && <span>🔗 {visitor.utm_source}</span>}
      </div>
      {name && <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #f1f5f9', fontSize: 11, color: 'var(--emerald)', fontWeight: 600 }}>✓ Lead identifié</div>}
    </div>
  );
}

// ── Flux live latéral ───────────────────────────────────────────
function LiveFeed({ visitors, liveCount }) {
  var recent = useMemo(function () {
    return (visitors || []).slice(0, 8).map(function (v) {
      var city = v.location?.city || '—';
      var cc = (v.location?.country_code || '').toUpperCase();
      return { ...v, city: city, cc: cc };
    });
  }, [visitors]);

  return (
    <div style={{
      position: 'absolute', top: 16, right: 16, width: 280,
      background: 'white', borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0',
      fontSize: 12, maxHeight: 500,
    }}>
      {/* Header live */}
      <div style={{
        padding: '10px 14px', background: liveCount > 0 ? 'var(--emerald-soft, #ecfdf5)' : 'var(--surface-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #f1f5f9',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: liveCount > 0 ? 'var(--emerald)' : 'var(--ink-4)' }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: liveCount > 0 ? '#10b981' : '#94a3b8',
            animation: liveCount > 0 ? 'livepulse 1.6s ease-in-out infinite' : 'none', display: 'inline-block' }} />
          {liveCount} en direct
        </div>
        <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>Refresh 20s</span>
      </div>

      {/* Liste des visiteurs récents */}
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {recent.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-4)', fontSize: 11 }}>Aucun visiteur récent</div>
        ) : recent.map(function (v, i) {
          var isHot = (v.event_count || 0) > 10 || v.cta_clicks > 0;
          return (
            <div key={v.visitor_id || i} style={{
              padding: '8px 14px', borderBottom: '1px solid #f8fafc',
              display: 'flex', alignItems: 'center', gap: 10,
              borderLeft: v.identified ? '3px solid ' + IDENTIFIED_COLOR : (isHot ? '3px solid ' + HOT_COLOR : '3px solid transparent'),
            }}>
              <div style={{ flexShrink: 0, width: 24, textAlign: 'center' }}>
                {v.cc ? <ReactCountryFlag countryCode={v.cc} svg style={{ width: 16, height: 12 }} /> : <GlobeIcon style={{ width: 14, height: 14, color: 'var(--ink-4)' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.lead_name || v.city}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>
                  {v.event_count || 0} events · {v.device || v.device_type || '—'}
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>
                {v.last_seen ? new Date(v.last_seen).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Légende ─────────────────────────────────────────────────────
function Legend() {
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16,
      background: 'white', padding: '10px 14px', borderRadius: 10,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)', fontSize: 11,
      display: 'flex', flexDirection: 'column', gap: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: VISITOR_COLOR, display: 'inline-block' }} />
        <span style={{ color: '#334155' }}>Visiteur anonyme</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: HOT_COLOR, display: 'inline-block' }} />
        <span style={{ color: '#334155' }}>Visiteur chaud (CTA)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: IDENTIFIED_COLOR, display: 'inline-block' }} />
        <span style={{ color: '#334155' }}>Lead identifié</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, paddingTop: 5, borderTop: '1px solid #f1f5f9' }}>
        <span style={{ fontSize: 9, color: '#64748b' }}>Taille = nb d'événements</span>
      </div>
    </div>
  );
}

// ── Filtres ──────────────────────────────────────────────────────
var PERIOD_OPTIONS = [
  { value: 1, label: '1 heure' }, { value: 6, label: '6 heures' },
  { value: 24, label: '24 heures' }, { value: 48, label: '48 heures' },
  { value: 168, label: '7 jours' },
];

function FilterBar({ visitors, filters, setFilters, visitorHours, setVisitorHours }) {
  var countryOptions = useMemo(function () {
    var map = {};
    visitors.forEach(function (v) {
      var cc = v.location?.country_code, cn = v.location?.country;
      if (cc && cn) map[cc] = cn;
    });
    return Object.entries(map).sort(function (a, b) { return a[1].localeCompare(b[1]); });
  }, [visitors]);

  var hasFilters = filters.country || filters.device || filters.identified;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>
        <Filter style={{ width: 14, height: 14 }} /> Filtrer :
      </div>
      <select value={visitorHours} onChange={function (e) { setVisitorHours(Number(e.target.value)); }}
        style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 12, background: 'white', cursor: 'pointer', fontWeight: 600 }}>
        {PERIOD_OPTIONS.map(function (p) { return <option key={p.value} value={p.value}>{p.label}</option>; })}
      </select>
      <select value={filters.country} onChange={function (e) { setFilters(function (f) { return { ...f, country: e.target.value }; }); }}
        style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 12, background: 'white', cursor: 'pointer' }}>
        <option value="">Tous les pays</option>
        {countryOptions.map(function (c) { return <option key={c[0]} value={c[0]}>{c[1]}</option>; })}
      </select>
      <select value={filters.device} onChange={function (e) { setFilters(function (f) { return { ...f, device: e.target.value }; }); }}
        style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 12, background: 'white', cursor: 'pointer' }}>
        <option value="">Tous devices</option>
        <option value="mobile">📱 Mobile</option>
        <option value="desktop">💻 Desktop</option>
      </select>
      <select value={filters.identified} onChange={function (e) { setFilters(function (f) { return { ...f, identified: e.target.value }; }); }}
        style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 12, background: 'white', cursor: 'pointer' }}>
        <option value="">Tous</option>
        <option value="true">✅ Identifiés</option>
        <option value="false">👤 Anonymes</option>
      </select>
      {hasFilters && (
        <button onClick={function () { setFilters({ country: '', device: '', identified: '' }); }}
          style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 11, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-3)' }}>
          <X style={{ width: 12, height: 12 }} /> Reset
        </button>
      )}
    </div>
  );
}

// ── Composant principal ─────────────────────────────────────────
export default function SeoGlobe() {
  var { days } = useSeoFilter();
  var { data: ga4 } = useGa4Analytics(days);
  var { data: seo } = useSeoStats(days);
  var { data: realtime } = useRealtime();
  var { data: overview } = useJourneyOverview(days);
  var { data: liveData } = useJourneyRealtime();

  var [visitorHours, setVisitorHours] = useState(24);
  var { data: visitors, isLoading } = useVisitors(visitorHours, 200);
  var [tooltip, setTooltip] = useState(null);
  var [filters, setFilters] = useState({ country: '', device: '', identified: '' });
  var [hoveredCountry, setHoveredCountry] = useState(null);
  var [zoom, setZoom] = useState(1.2);
  var [center, setCenter] = useState([10, 30]);
  var mapRef = React.useRef(null);
  var [mouse, setMouse] = useState({ x: 0, y: 0 });

  var onDotHover = useCallback(function (visitor) { setTooltip(visitor); }, []);
  var onDotLeave = useCallback(function () { setTooltip(null); }, []);

  var lastMoveRef = React.useRef(0);
  var onMapMouseMove = useCallback(function (e) {
    var now = Date.now();
    if (now - lastMoveRef.current < 50) return;
    lastMoveRef.current = now;
    if (!mapRef.current) return;
    var rect = mapRef.current.getBoundingClientRect();
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  var allVisitors = visitors?.visitors || [];

  // Reset la dispersion quand les visiteurs changent
  useMemo(function () { _usedCoords = {}; }, [allVisitors]);

  // Filtrage
  var v = useMemo(function () {
    var list = allVisitors;
    if (filters.country) list = list.filter(function (x) { return x.location?.country_code === filters.country; });
    if (filters.device) list = list.filter(function (x) { return (x.device || x.device_type) === filters.device; });
    if (filters.identified === 'true') list = list.filter(function (x) { return x.identified; });
    if (filters.identified === 'false') list = list.filter(function (x) { return !x.identified; });
    return list;
  }, [allVisitors, filters]);

  // Compteurs par pays (pour heatmap)
  var countryVisitorCounts = useMemo(function () {
    var map = {};
    allVisitors.forEach(function (vis) {
      var cc = vis.location?.country_code;
      if (cc) map[cc] = (map[cc] || 0) + 1;
    });
    return map;
  }, [allVisitors]);

  var maxCountryCount = useMemo(function () {
    return Math.max(1, ...Object.values(countryVisitorCounts));
  }, [countryVisitorCounts]);

  // Top pays pour les stats
  var countries = useMemo(function () {
    var map = {};
    allVisitors.forEach(function (vis) {
      var cc = vis.location?.country_code;
      var cn = vis.location?.country;
      if (cc && cn) {
        if (!map[cc]) map[cc] = { code: cc, name: cn, count: 0 };
        map[cc].count++;
      }
    });
    return Object.values(map).sort(function (a, b) { return b.count - a.count; });
  }, [allVisitors]);

  var liveCount = liveData?.active_visitors || realtime?.active_users || 0;

  if (isLoading && !visitors) return <LoadingState message="Chargement des visiteurs…" />;

  return (
    <div className="seo-fade">
      <style>{'@keyframes livepulse{0%,100%{opacity:.6}50%{opacity:1}}'}</style>

      <PageHeader
        eyebrow="Globe · Audience"
        title={<>Carte <em>mondiale des visiteurs</em></>}
        subtitle={fmt(v.length) + ' visiteurs sur ' + (visitorHours <= 24 ? visitorHours + 'h' : Math.round(visitorHours / 24) + 'j') + ' · ' + fmt(visitors?.identified || 0) + ' identifiés · ' + countries.length + ' pays'}
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 16 }}>
        <KpiTile label="En direct" value={fmt(liveCount)}
          tone={liveCount > 0 ? 'var(--emerald)' : 'var(--ink-4)'} icon={Zap}
          sub={liveData?.active_pages?.[0] ? liveData.active_pages[0].path : '—'} />
        <KpiTile label={'Total ' + (visitorHours <= 24 ? visitorHours + 'h' : Math.round(visitorHours / 24) + 'j')}
          value={fmt(allVisitors.length)} tone="var(--navy)" icon={Users} />
        <KpiTile label="Identifiés" value={fmt(visitors?.identified || 0)} tone="var(--emerald)" icon={User}
          sub={(visitors?.identified_pct || 0) + '% du total'} />
        <KpiTile label="Pays touchés" value={fmt(countries.length)} tone="var(--gold)" icon={GlobeIcon} />
        <KpiTile label="Taux conversion" value={(overview?.conversion_rate || 0) + '%'} tone="var(--emerald)" icon={TrendingUp}
          sub={fmt(overview?.converted_count || 0) + ' convertis'} />
      </div>

      {/* Filtres */}
      <FilterBar visitors={allVisitors} filters={filters} setFilters={setFilters}
        visitorHours={visitorHours} setVisitorHours={setVisitorHours} />

      {/* Carte du monde */}
      <div ref={mapRef} onMouseMove={onMapMouseMove} style={{
        position: 'relative', background: '#f8fafb',
        border: '1px solid var(--line)', borderRadius: 20, overflow: 'hidden',
        marginBottom: 24, height: 560,
      }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 140 }}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup
            zoom={zoom}
            center={center}
            onMoveEnd={function (e) { setZoom(e.zoom); setCenter(e.coordinates); }}
            minZoom={0.8}
            maxZoom={8}
          >
            {/* Pays avec heatmap */}
            <Geographies geography={WORLD_TOPO}>
              {function ({ geographies }) {
                return geographies.map(function (geo) {
                  var iso3 = geo.properties?.ISO_A3 || geo.id;
                  var iso2 = ISO3_TO_2[iso3] || iso3?.slice(0, 2);
                  var count = countryVisitorCounts[iso2] || 0;
                  var intensity = count > 0 ? 0.15 + 0.65 * (count / maxCountryCount) : 0;
                  var fill = count > 0
                    ? 'rgba(16, 185, 129, ' + intensity + ')'
                    : '#e9edf0';

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={hoveredCountry === iso2 ? '#c6f0e0' : fill}
                      stroke="#d1d5db"
                      strokeWidth={0.4}
                      onMouseEnter={function () { if (count > 0) setHoveredCountry(iso2); }}
                      onMouseLeave={function () { setHoveredCountry(null); }}
                      style={{
                        default: { outline: 'none', transition: 'fill 0.2s' },
                        hover: { outline: 'none', cursor: count > 0 ? 'pointer' : 'default' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  );
                });
              }}
            </Geographies>

            {/* Connexions animées vers Paris */}
            {v.filter(function (vis) { return coordsFor(vis); }).slice(0, 30).map(function (vis) {
              var coords = coordsFor(vis);
              if (!coords || (Math.abs(coords[0] - PARIS[0]) < 0.5 && Math.abs(coords[1] - PARIS[1]) < 0.5)) return null;
              return <ConnectionLine key={'line-' + vis.visitor_id} from={coords} />;
            })}

            {/* Point Paris (siège) */}
            <Marker coordinates={PARIS}>
              <circle r={8} fill="#6366f1" stroke="white" strokeWidth="2" opacity="0.8" />
              <circle r={4} fill="white" />
            </Marker>

            {/* Points visiteurs */}
            {v.map(function (visitor) {
              return <VisitorDot key={visitor.visitor_id} visitor={visitor}
                onHover={onDotHover} onLeave={onDotLeave} />;
            })}
          </ZoomableGroup>
        </ComposableMap>

        <Legend />

        {/* Contrôles de zoom */}
        <div style={{
          position: 'absolute', bottom: 16, right: 16,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <button onClick={function () { setZoom(function (z) { return Math.min(8, z * 1.5); }); }}
            style={{
              width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0',
              background: 'white', cursor: 'pointer', fontSize: 18, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: 'var(--ink)',
            }}>+</button>
          <button onClick={function () { setZoom(function (z) { return Math.max(0.8, z / 1.5); }); }}
            style={{
              width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0',
              background: 'white', cursor: 'pointer', fontSize: 18, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: 'var(--ink)',
            }}>−</button>
          <button onClick={function () { setZoom(1.2); setCenter([10, 30]); }}
            title="Réinitialiser le zoom"
            style={{
              width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0',
              background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: 'var(--ink-3)',
            }}>⟲</button>
          {/* Boutons zoom rapide sur zones */}
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button onClick={function () { setZoom(3.5); setCenter([2.5, 46.5]); }}
              style={{
                padding: '4px 8px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: 'white', cursor: 'pointer', fontSize: 10, fontWeight: 600,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: 'var(--ink-2)',
              }}>🇫🇷 France</button>
            <button onClick={function () { setZoom(2); setCenter([15, 50]); }}
              style={{
                padding: '4px 8px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: 'white', cursor: 'pointer', fontSize: 10, fontWeight: 600,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: 'var(--ink-2)',
              }}>🇪🇺 Europe</button>
            <button onClick={function () { setZoom(1.8); setCenter([15, 5]); }}
              style={{
                padding: '4px 8px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: 'white', cursor: 'pointer', fontSize: 10, fontWeight: 600,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)', color: 'var(--ink-2)',
              }}>🌍 Afrique</button>
          </div>
        </div>

        {tooltip && <VisitorTooltip visitor={tooltip} x={mouse.x} y={mouse.y} />}

        <LiveFeed visitors={v} liveCount={liveCount} />

        {/* Hover pays info */}
        {hoveredCountry && countryVisitorCounts[hoveredCountry] && (
          <div style={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
            background: 'white', padding: '8px 16px', borderRadius: 10,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)', fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)',
          }}>
            <ReactCountryFlag countryCode={hoveredCountry} svg style={{ width: 20, height: 15 }} />
            {countryVisitorCounts[hoveredCountry]} visiteur{countryVisitorCounts[hoveredCountry] > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Stats pays */}
      {countries.length > 0 && (
        <>
          <SectionHeader eyebrow="Répartition" title={'Top pays (' + countries.length + ')'}
            subtitle="Nombre de visiteurs par pays sur la période sélectionnée." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 28 }}>
            {countries.slice(0, 12).map(function (c) {
              var pct = Math.round((c.count / Math.max(allVisitors.length, 1)) * 100);
              return (
                <div key={c.code} className="seo-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ReactCountryFlag countryCode={c.code} svg style={{ width: 28, height: 20, borderRadius: 3 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{c.count} visiteur{c.count > 1 ? 's' : ''} · {pct}%</div>
                  </div>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 800,
                    background: 'var(--emerald-soft, #ecfdf5)', color: 'var(--emerald, #10b981)',
                  }}>
                    {c.count}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* RGPD */}
      <div className="seo-card" style={{ padding: 16, marginBottom: 24, background: 'var(--navy-soft)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Eye style={{ width: 16, height: 16, color: 'var(--navy)', marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            <b>Respect du RGPD</b> — Les coordonnées ne s'affichent que pour les visiteurs qui ont rempli un formulaire.
            Les visiteurs anonymes sont géolocalisés à la ville via leur IP (approximation).
          </div>
        </div>
      </div>

      {/* Visiteurs identifiés */}
      <SectionHeader eyebrow="Leads" title="Visiteurs identifiés"
        subtitle="Coordonnées saisies dans un formulaire, reliées à leur parcours sur le site." />
      {(v.filter(function (x) { return x.identified; }).length === 0) ? (
        <div className="seo-card" style={{ padding: 40, marginBottom: 24 }}>
          <EmptyState icon={User} title="Pas encore de visiteur identifié"
            message="Dès qu'un visiteur soumet un formulaire (contact, devis), il apparaîtra ici." />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, marginBottom: 28 }}>
          {v.filter(function (x) { return x.identified; }).map(function (vis, i) {
            return (
              <div key={i} className="seo-card seo-card-hover" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', background: 'var(--emerald)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600,
                  }}>
                    {((vis.lead?.name || vis.lead_name || '?').charAt(0)).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
                      {vis.lead?.name || vis.lead_name || 'Sans nom'}
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 4, fontSize: 11, color: 'var(--ink-3)', flexWrap: 'wrap' }}>
                      {(vis.lead?.email || vis.lead_email) && <span><Mail style={{ width: 11, height: 11, verticalAlign: 'middle' }} /> {vis.lead?.email || vis.lead_email}</span>}
                      {(vis.lead?.phone || vis.lead_phone) && <span><Phone style={{ width: 11, height: 11, verticalAlign: 'middle' }} /> {vis.lead?.phone || vis.lead_phone}</span>}
                      {vis.location && <span>📍 {vis.location.city || '—'}, {vis.location.country || '—'}</span>}
                    </div>
                  </div>
                  {vis.lead?.lead_id && (
                    <Link to={'/leads/' + vis.lead.lead_id} className="seo-chip">
                      Dossier <ExternalLink style={{ width: 11, height: 11 }} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visiteurs anonymes */}
      <SectionHeader eyebrow="Audience" title={'Visiteurs anonymes (' + fmt(v.filter(function (x) { return !x.identified; }).length) + ')'}
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
                <th style={thR}>Events</th>
                <th style={thR}>Vu</th>
              </tr>
            </thead>
            <tbody>
              {v.filter(function (x) { return !x.identified; }).slice(0, 100).map(function (vis, i) {
                return (
                  <tr key={i} style={{ borderTop: '1px solid var(--line-2)' }}>
                    <td style={td}><span className="seo-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{(vis.visitor_id || '').slice(0, 12)}</span></td>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {vis.location?.country_code && <ReactCountryFlag countryCode={vis.location.country_code.toUpperCase()} svg style={{ width: 16, height: 12 }} />}
                        {vis.location?.city ? vis.location.city + ', ' + (vis.location.country || '') : vis.location?.country || '—'}
                      </div>
                    </td>
                    <td style={td}>{(vis.device || vis.device_type) === 'mobile' ? '📱' : '💻'} {vis.device || vis.device_type || '—'}</td>
                    <td style={td}><code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{vis.last_page || '—'}</code></td>
                    <td style={td}>{vis.utm_source || 'Direct'}</td>
                    <td style={tdR}>{fmt(vis.event_count || vis.events_total || 0)}</td>
                    <td style={{ ...tdR, fontSize: 11 }}>
                      {vis.last_seen ? new Date(vis.last_seen).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

var th = { padding: '10px 14px', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 600 };
var thR = { ...th, textAlign: 'right' };
var td = { padding: '10px 14px', fontSize: 12, color: 'var(--ink)' };
var tdR = { ...td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' };
