// SeoGlobe.jsx — /seo/globe
// Carte du monde avec dots de visiteurs (style Taap.it/Plausible).
// - Map topojson via react-simple-maps
// - Dots colorés selon device/source
// - Popup flottant "Pages / Referrers / Countries" avec live users
// - Liste des visiteurs identifiés (matchés avec un lead CRM)

import React, { useMemo, useState } from 'react';
import {
  ComposableMap, Geographies, Geography, Marker, ZoomableGroup,
} from 'react-simple-maps';
import {
  ArrowRight, Circle, Clock, ExternalLink, Eye, Globe as GlobeIcon, Link2,
  Mail, MapPin, Monitor, Phone, Settings, Share2, Smartphone, User,
  Users, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, EmptyState,
  fmt, useSeoFilter,
} from './SeoShared';
import {
  useGa4Analytics, useSeoAnalytics as useSeoStats, useRealtime, useVisitors,
} from '../../hooks/api';

// Topojson du monde hébergé par la team react-simple-maps (CC0 Natural Earth)
const WORLD_TOPO = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Coordonnées approximatives des principales villes françaises + quelques internationales
const CITY_COORDS = {
  'Paris': [2.35, 48.85], 'Marseille': [5.37, 43.30], 'Lyon': [4.83, 45.76],
  'Toulouse': [1.44, 43.60], 'Nice': [7.27, 43.70], 'Nantes': [-1.55, 47.22],
  'Strasbourg': [7.75, 48.58], 'Montpellier': [3.88, 43.61],
  'Bordeaux': [-0.58, 44.84], 'Lille': [3.06, 50.63],
  'Rennes': [-1.68, 48.11], 'Reims': [4.03, 49.26],
  'Le Havre': [0.11, 49.49], 'Saint-Étienne': [4.39, 45.44],
  'Toulon': [5.93, 43.12], 'Grenoble': [5.72, 45.17],
  'Angers': [-0.55, 47.47], 'Dijon': [5.04, 47.32],
  'Clermont-Ferrand': [3.08, 45.78], 'Orléans': [1.91, 47.90],
  'Versailles': [2.12, 48.80], 'Cannes': [7.02, 43.55],
  'Aix-en-Provence': [5.45, 43.53], 'Nancy': [6.18, 48.69],
  'Tours': [0.69, 47.39], 'Metz': [6.18, 49.12],
  'Londres': [-0.13, 51.51], 'London': [-0.13, 51.51],
  'New York': [-74.01, 40.71], 'Montreal': [-73.57, 45.50],
  'Dakar': [-17.48, 14.72], 'Abidjan': [-4.03, 5.35],
  'Casablanca': [-7.59, 33.57], 'Bruxelles': [4.35, 50.85],
  'Brussels': [4.35, 50.85], 'Genève': [6.14, 46.20],
  'Geneva': [6.14, 46.20], 'Madrid': [-3.70, 40.42],
  'Rome': [12.49, 41.90], 'Berlin': [13.40, 52.52],
};

const DEVICE_COLORS = {
  mobile: '#10b981',    // emerald
  desktop: '#3b82f6',   // blue
  tablet: '#f59e0b',    // amber
  unknown: '#94a3b8',
};

const COUNTRY_FLAGS = {
  'FR': '🇫🇷', 'US': '🇺🇸', 'GB': '🇬🇧', 'DE': '🇩🇪', 'ES': '🇪🇸',
  'IT': '🇮🇹', 'BE': '🇧🇪', 'CH': '🇨🇭', 'CA': '🇨🇦', 'PT': '🇵🇹',
  'NL': '🇳🇱', 'MA': '🇲🇦', 'SN': '🇸🇳', 'CI': '🇨🇮', 'TN': '🇹🇳',
  'DZ': '🇩🇿', 'LU': '🇱🇺', 'MC': '🇲🇨',
};

function coordsFor(visitor) {
  // Priorite 1 : lat/lon de la geoloc IP
  if (visitor.location?.lat && visitor.location?.lon) {
    return [Number(visitor.location.lon), Number(visitor.location.lat)];
  }
  // Priorite 2 : ville connue
  const city = visitor.location?.city || visitor.lead?.city;
  if (city && CITY_COORDS[city]) return CITY_COORDS[city];
  return null;
}

function VisitorDot({ visitor }) {
  const coords = coordsFor(visitor);
  if (!coords) return null;
  const color = DEVICE_COLORS[visitor.device] || DEVICE_COLORS.unknown;
  const identified = visitor.identified;
  const r = identified ? 6 : 5;
  return (
    <Marker coordinates={coords}>
      {/* Halo */}
      <circle r={r * 2.5} fill={color} opacity="0.22">
        <animate attributeName="r" from={r * 1.5} to={r * 3.5} dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle r={r} fill={color} stroke="white" strokeWidth="1.5" />
      {identified && (
        <circle r={r - 2} fill="white" opacity="0.9" />
      )}
    </Marker>
  );
}

function Card({ icon: Icon, label, value, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
    }}>
      <Icon style={{ width: 14, height: 14, color: '#64748b' }} />
      <span style={{ fontSize: 13, color: '#334155', fontWeight: 500, flex: 1 }}>{label}</span>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#1e293b', fontWeight: 600 }}>
        {value}
      </span>
      {right}
    </div>
  );
}

function LivePopup({ pages, referrers, countries, liveCount }) {
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: 28, transform: 'translateX(-50%)',
      width: 420, background: 'white', borderRadius: 16,
      boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
      padding: 16,
      fontFamily: 'Inter, sans-serif', zIndex: 10,
    }}>
      {/* Pages */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Eye style={{ width: 14, height: 14, color: '#64748b' }} />
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pages</span>
        </div>
        {pages.slice(0, 2).map((p, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 4px', borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
              color: '#334155', padding: '2px 8px', borderRadius: 6,
              background: '#f1f5f9', minWidth: 60, textAlign: 'center',
            }}>{p.path || '/'}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#1e293b', fontWeight: 600 }}>
              {fmt(p.views)}
            </span>
            <ArrowRight style={{ width: 12, height: 12, color: '#94a3b8' }} />
          </div>
        ))}
      </div>

      {/* Referrers */}
      <div style={{ marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <Share2 style={{ width: 14, height: 14, color: '#64748b' }} />
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Referrers</span>
        </div>
        {referrers.slice(0, 2).map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 4px', borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}>
            <ArrowRight style={{ width: 12, height: 12, color: '#94a3b8' }} />
            <span style={{ fontSize: 13, color: '#334155', flex: 1 }}>{r.name}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#1e293b', fontWeight: 600 }}>
              {fmt(r.value)}
            </span>
            <ArrowRight style={{ width: 12, height: 12, color: '#94a3b8' }} />
          </div>
        ))}
      </div>

      {/* Countries */}
      <div style={{ marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <GlobeIcon style={{ width: 14, height: 14, color: '#64748b' }} />
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Countries</span>
        </div>
        {countries.slice(0, 2).map((c, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 4px', borderBottom: i === countries.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.06)',
          }}>
            <span style={{ fontSize: 14 }}>{COUNTRY_FLAGS[c.code] || '🌍'}</span>
            <span style={{ fontSize: 13, color: '#334155', flex: 1 }}>{c.name}</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#1e293b', fontWeight: 600 }}>
              {fmt(c.value)}
            </span>
            <ArrowRight style={{ width: 12, height: 12, color: '#94a3b8' }} />
          </div>
        ))}
      </div>

      {/* Footer icons + live count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <Link2 style={{ width: 14, height: 14, color: '#94a3b8' }} />
        <User style={{ width: 14, height: 14, color: '#94a3b8' }} />
        <Share2 style={{ width: 14, height: 14, color: '#94a3b8' }} />
        <Settings style={{ width: 14, height: 14, color: '#94a3b8' }} />
        <Circle style={{ width: 14, height: 14, color: '#94a3b8' }} />
        <span style={{ flex: 1 }} />
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 10px', borderRadius: 999,
          background: '#10b981', color: 'white',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 999, background: 'white',
            animation: 'pulse 1.6s ease-in-out infinite',
          }} />
          {liveCount}
        </span>
      </div>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}

export default function SeoGlobe() {
  const { days } = useSeoFilter();
  const { data: ga4 } = useGa4Analytics(days);
  const { data: seo } = useSeoStats(days);
  const { data: realtime } = useRealtime();
  const { data: visitors, isLoading } = useVisitors(24, 80);

  const v = visitors?.visitors || [];
  const identified = v.filter((x) => x.identified);

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
        subtitle={`${fmt(visitors?.total_visitors || 0)} visiteurs sur 24h, ${fmt(visitors?.identified || 0)} identifiés (${visitors?.identified_pct || 0}%).`}
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile label="En direct" value={fmt(realtime?.active_users || 0)}
          tone={(realtime?.active_users || 0) > 0 ? 'var(--emerald)' : 'var(--ink-4)'}
          icon={Zap} sub="GA4 realtime" />
        <KpiTile label="Total 24h" value={fmt(visitors?.total_visitors || 0)} tone="var(--navy)" icon={Users} />
        <KpiTile label="Identifiés" value={fmt(visitors?.identified || 0)} tone="var(--emerald)" icon={User}
          sub={`${visitors?.identified_pct || 0}% du total`} />
        <KpiTile label="Pays touchés" value={fmt(countries.length)} tone="var(--gold)" icon={GlobeIcon} />
      </div>

      {/* Carte du monde */}
      <div style={{
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
              <VisitorDot key={visitor.visitor_id} visitor={visitor} />
            ))}
          </ZoomableGroup>
        </ComposableMap>

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
            C'est la seule approche légale en Europe.
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
                      {vis.lead.email && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Mail style={{ width: 11, height: 11 }} /> {vis.lead.email}
                        </span>
                      )}
                      {vis.lead.phone && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone style={{ width: 11, height: 11 }} /> {vis.lead.phone}
                        </span>
                      )}
                      {vis.lead.address && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin style={{ width: 11, height: 11 }} /> {vis.lead.address}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="seo-label" style={{ fontSize: 9 }}>Service</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{vis.lead.service_type || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="seo-label" style={{ fontSize: 9 }}>Status</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)', textTransform: 'capitalize' }}>
                      {vis.lead.status || '—'}
                    </div>
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
              {v.filter((x) => !x.identified).slice(0, 50).map((vis, i) => (
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
                  <td style={td}>{vis.device || '—'}</td>
                  <td style={td}><code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{vis.last_page || '—'}</code></td>
                  <td style={td}>{vis.utm_source || vis.referrer ? new URL(vis.referrer).hostname : 'Direct'}</td>
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
