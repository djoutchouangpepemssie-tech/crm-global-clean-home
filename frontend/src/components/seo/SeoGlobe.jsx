// SeoGlobe.jsx — /seo/globe
// Trafic mondial : GA4 cities + GSC countries + realtime active users.
// Visualisation 3D simplifiée sans Three.js : sphère SVG rotative avec dots.

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Globe2, MapPin, Users, Zap } from 'lucide-react';
import {
  PageHeader, SectionHeader, KpiTile, LoadingState, EmptyState,
  fmt, useSeoFilter,
} from './SeoShared';
import {
  useGa4Analytics, useSeoAnalytics as useSeoStats, useRealtime,
} from '../../hooks/api';

// Coordonnées approximatives des grandes villes françaises (+ quelques internationales)
const CITY_COORDS = {
  'Paris': { lat: 48.85, lon: 2.35 },
  'Marseille': { lat: 43.30, lon: 5.37 },
  'Lyon': { lat: 45.76, lon: 4.83 },
  'Toulouse': { lat: 43.60, lon: 1.44 },
  'Nice': { lat: 43.70, lon: 7.27 },
  'Nantes': { lat: 47.22, lon: -1.55 },
  'Strasbourg': { lat: 48.58, lon: 7.75 },
  'Montpellier': { lat: 43.61, lon: 3.88 },
  'Bordeaux': { lat: 44.84, lon: -0.58 },
  'Lille': { lat: 50.63, lon: 3.06 },
  'Rennes': { lat: 48.11, lon: -1.68 },
  'Reims': { lat: 49.26, lon: 4.03 },
  'Le Havre': { lat: 49.49, lon: 0.11 },
  'Saint-Étienne': { lat: 45.44, lon: 4.39 },
  'Toulon': { lat: 43.12, lon: 5.93 },
  'Grenoble': { lat: 45.17, lon: 5.72 },
  'Angers': { lat: 47.47, lon: -0.55 },
  'Dijon': { lat: 47.32, lon: 5.04 },
  'London': { lat: 51.51, lon: -0.13 },
  'New York': { lat: 40.71, lon: -74.01 },
  'Montreal': { lat: 45.50, lon: -73.57 },
  'Dakar': { lat: 14.72, lon: -17.48 },
  'Abidjan': { lat: 5.35, lon: -4.03 },
  'Casablanca': { lat: 33.57, lon: -7.59 },
  'Brussels': { lat: 50.85, lon: 4.35 },
  'Geneva': { lat: 46.20, lon: 6.14 },
};

function latLonToXY(lat, lon, rotation, R) {
  const phi = (lat * Math.PI) / 180;
  const theta = ((lon + rotation) * Math.PI) / 180;
  const x = R * Math.cos(phi) * Math.sin(theta);
  const y = -R * Math.sin(phi);
  const z = R * Math.cos(phi) * Math.cos(theta);
  return { x, y, z, visible: z > -R * 0.1 };
}

function InteractiveGlobe({ cities }) {
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startRot: 0 });
  const autoRef = useRef();

  // Auto-rotation (sauf pendant drag)
  useEffect(() => {
    if (dragging) return;
    autoRef.current = setInterval(() => setRotation((r) => r + 0.2), 60);
    return () => clearInterval(autoRef.current);
  }, [dragging]);

  const onMouseDown = (e) => {
    setDragging(true);
    dragRef.current = { startX: e.clientX, startRot: rotation };
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    setRotation(dragRef.current.startRot + dx * 0.5);
  };
  const onMouseUp = () => setDragging(false);

  const size = 420;
  const R = size / 2 - 20;
  const cx = size / 2;
  const cy = size / 2;
  const max = Math.max(...cities.map((c) => c.value), 1);

  // Lignes de latitude (parallèles)
  const lats = [];
  for (let la = -60; la <= 60; la += 30) {
    const path = [];
    for (let lo = 0; lo <= 360; lo += 10) {
      const { x, y, z } = latLonToXY(la, lo, rotation, R);
      if (z > 0) path.push(`${cx + x},${cy + y}`);
    }
    if (path.length > 1) lats.push(path.join(' '));
  }

  // Lignes de longitude (méridiens)
  const lons = [];
  for (let lo = 0; lo < 360; lo += 30) {
    const path = [];
    for (let la = -90; la <= 90; la += 5) {
      const { x, y, z } = latLonToXY(la, lo, rotation, R);
      if (z > 0) path.push(`${cx + x},${cy + y}`);
    }
    if (path.length > 1) lons.push(path.join(' '));
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}
         onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
      <svg width={size} height={size} style={{ cursor: dragging ? 'grabbing' : 'grab' }}
           onMouseDown={onMouseDown} onMouseMove={onMouseMove}>
        <defs>
          <radialGradient id="globe-bg" cx="30%" cy="30%">
            <stop offset="0%" stopColor="oklch(0.38 0.08 240)" />
            <stop offset="100%" stopColor="oklch(0.18 0.03 240)" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <circle cx={cx} cy={cy} r={R} fill="url(#globe-bg)" />
        {lats.map((path, i) => (
          <polyline key={`lat-${i}`} points={path} fill="none"
            stroke="oklch(0.52 0.13 165 / 0.2)" strokeWidth="0.5" />
        ))}
        {lons.map((path, i) => (
          <polyline key={`lon-${i}`} points={path} fill="none"
            stroke="oklch(0.52 0.13 165 / 0.2)" strokeWidth="0.5" />
        ))}
        {cities.map((c, i) => {
          const coords = CITY_COORDS[c.name];
          if (!coords) return null;
          const { x, y, visible } = latLonToXY(coords.lat, coords.lon, rotation, R);
          if (!visible) return null;
          const ratio = c.value / max;
          const r = 3 + ratio * 10;
          return (
            <g key={i} style={{ transform: `translate(${cx + x}px, ${cy + y}px)` }}>
              <circle r={r * 2} fill="oklch(0.52 0.13 165 / 0.2)" filter="url(#glow)" />
              <circle r={r} fill="oklch(0.72 0.13 145)" />
              <text y={-r - 4} fontSize="10" fill="oklch(0.95 0.01 80)"
                textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                {c.name} · {fmt(c.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function SeoGlobe() {
  const { days } = useSeoFilter();
  const { data: ga4, isLoading } = useGa4Analytics(days);
  const { data: seo } = useSeoStats(days);
  const { data: realtime } = useRealtime();

  if (isLoading && !ga4) return <LoadingState message="Chargement du trafic mondial…" />;

  const cities = (ga4?.cities || []).map((c) => ({ name: c.city, value: c.sessions || 0 }));
  const countries = seo?.countries || [];
  const activeNow = realtime?.active_users || 0;
  const rtDetails = (realtime?.details || []).slice(0, 10);

  const totalCities = cities.length;
  const totalCountries = countries.length;

  return (
    <div className="seo-fade">
      <PageHeader
        eyebrow="Globe"
        title={<>Trafic <em>mondial</em></>}
        subtitle={`${totalCountries} pays, ${totalCities} villes — rotation automatique, glisser-déposer pour explorer.`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <KpiTile label="Utilisateurs en live" value={fmt(activeNow)}
          tone={activeNow > 0 ? 'var(--emerald)' : 'var(--ink-4)'}
          icon={Zap} sub={activeNow > 0 ? 'Actuellement sur le site' : 'Aucun'} />
        <KpiTile label="Villes touchées" value={fmt(totalCities)} tone="var(--navy)" icon={MapPin} />
        <KpiTile label="Pays touchés" value={fmt(totalCountries)} tone="var(--gold)" icon={Globe2} />
        <KpiTile label="Visiteurs totaux" value={fmt(cities.reduce((a, c) => a + c.value, 0))}
          tone="var(--warm)" icon={Users} />
      </div>

      {/* Globe interactif */}
      <div className="seo-card-dark" style={{ padding: 24, marginBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 30, alignItems: 'center' }}>
          <div>
            <div className="seo-label" style={{ color: 'oklch(0.85 0.02 80 / 0.8)' }}>Visualisation 3D</div>
            <div className="seo-display" style={{ fontSize: 28, color: 'oklch(0.97 0.01 80)', fontStyle: 'italic', marginTop: 4 }}>
              Globe terrestre
            </div>
            <div style={{ fontSize: 13, color: 'oklch(0.85 0.02 80 / 0.7)', marginTop: 10, lineHeight: 1.6 }}>
              Chaque point représente une ville où les visiteurs consultent ton site.
              <br />La taille du halo est proportionnelle au volume de sessions.
              <br /><strong style={{ color: 'oklch(0.95 0.01 80)' }}>Glisse avec la souris</strong> pour tourner le globe manuellement.
            </div>
            {cities.length === 0 && (
              <div style={{ marginTop: 16, padding: 12, background: 'oklch(0.22 0.04 240)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'oklch(0.85 0.02 80 / 0.8)' }}>
                  Pas encore de données GA4 — elles apparaîtront ici au fur et à mesure du trafic.
                </div>
              </div>
            )}
          </div>
          <InteractiveGlobe cities={cities} />
        </div>
      </div>

      {/* Liste */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div className="seo-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--line)' }}>
            <div className="seo-label">Top villes (GA4)</div>
          </div>
          {cities.length === 0 ? (
            <div style={{ padding: 24 }}>
              <EmptyState icon={MapPin} title="Pas de ville détectée" />
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {cities.slice(0, 12).map((c, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--line-2)' }}>
                    <td style={td}>
                      <MapPin style={{ width: 12, height: 12, color: 'var(--emerald)', marginRight: 6, verticalAlign: 'middle' }} />
                      {c.name}
                    </td>
                    <td style={tdRight}>{fmt(c.value)} sessions</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="seo-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--line)' }}>
            <div className="seo-label">Top pays (Search Console)</div>
          </div>
          {countries.length === 0 ? (
            <div style={{ padding: 24 }}>
              <EmptyState icon={Globe2} title="Pas de pays détecté" />
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {countries.slice(0, 12).map((c, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--line-2)' }}>
                    <td style={td}>
                      <Globe2 style={{ width: 12, height: 12, color: 'var(--navy)', marginRight: 6, verticalAlign: 'middle' }} />
                      {c.country.toUpperCase()}
                    </td>
                    <td style={tdRight}>{fmt(c.clicks)} clics · {fmt(c.impressions)} imp.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Realtime */}
      {rtDetails.length > 0 && (
        <div className="seo-card" style={{ padding: 22 }}>
          <div className="seo-label" style={{ color: 'var(--emerald)' }}>En temps réel</div>
          <div className="seo-display" style={{ fontSize: 20, marginTop: 4, marginBottom: 14 }}>
            <Zap style={{ width: 16, height: 16, color: 'var(--emerald)', marginRight: 6, verticalAlign: 'middle' }} />
            {activeNow} utilisateur{activeNow > 1 ? 's' : ''} connecté{activeNow > 1 ? 's' : ''} maintenant
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {rtDetails.map((r, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12,
                padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12,
              }}>
                <span style={{ color: 'var(--ink)' }}>{r.city || '—'}</span>
                <span style={{ color: 'var(--ink-3)' }}>{r.device}</span>
                <span style={{ color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace' }}>{r.page || '/'}</span>
                <span className="seo-mono" style={{ color: 'var(--emerald)', fontWeight: 700 }}>
                  {r.users} user{r.users > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const td = { padding: '10px 14px', fontSize: 13, color: 'var(--ink)' };
const tdRight = { ...td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink-3)' };
