import React, { useEffect, useState } from 'react';
import { PageHeader } from '../shared';
import axios from 'axios';
import api from '../../lib/api';
import { Calendar, MapPin, Navigation, CheckCircle, Clock, RefreshCw, ExternalLink, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const STATUS_COLORS = {
  completed: { color: '#047857', bg: 'rgba(4,120,87,0.12)', border: 'rgba(4,120,87,0.25)', label: 'Terminé' },
  in_progress: { color: '#047857', bg: 'rgba(4,120,87,0.12)', border: 'rgba(4,120,87,0.25)', label: 'En cours' },
  scheduled: { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.25)', label: 'Planifié' },
  cancelled: { color: '#c2410c', bg: 'rgba(194,65,12,0.12)', border: 'rgba(194,65,12,0.25)', label: 'Annulé' },
};

const PARIS_ZONES = [
  { id: 'paris-centre', label: 'Paris Centre (1-4e)', arrondissements: '1,2,3,4' },
  { id: 'paris-ouest', label: 'Paris Ouest (8,16,17e)', arrondissements: '8,16,17' },
  { id: 'paris-nord', label: 'Paris Nord (9,10,18,19e)', arrondissements: '9,10,18,19' },
  { id: 'paris-est', label: 'Paris Est (11,12,20e)', arrondissements: '11,12,20' },
  { id: 'paris-sud', label: 'Paris Sud (5,6,13,14,15e)', arrondissements: '5,6,13,14,15' },
  { id: 'hauts-de-seine', label: 'Hauts-de-Seine', arrondissements: '92' },
  { id: 'seine-saint-denis', label: 'Seine-Saint-Denis', arrondissements: '93' },
  { id: 'val-de-marne', label: 'Val-de-Marne', arrondissements: '94' },
];

const InterventionsMap = () => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [interventions, setInterventions] = useState([]);
  const [zonesStats, setZonesStats] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, avg_time: 0 });
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [mapsLink, setMapsLink] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);

  // Vague 16 : migration vers api centralisé
  useEffect(() => { fetchData(); }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mapRes, zonesRes] = await Promise.allSettled([
        api.get(`/geo/interventions-map?date=${selectedDate}`),
        api.get('/geo/zones-stats'),
      ]);

      const mapData = mapRes.status === 'fulfilled' ? (mapRes.value.data?.interventions || mapRes.value.data || []) : [];
      const zonesData = zonesRes.status === 'fulfilled' ? (zonesRes.value.data?.zones || zonesRes.value.data || []) : [];

      setInterventions(Array.isArray(mapData) ? mapData : []);
      setZonesStats(Array.isArray(zonesData) ? zonesData : []);

      const arr = Array.isArray(mapData) ? mapData : [];
      const completed = arr.filter(i => i.status === 'completed').length;
      const durations = arr.filter(i => i.duration_minutes).map(i => i.duration_minutes);
      const avg_time = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
      setStats({ total: arr.length, completed, avg_time });
    } catch {
      toast.error('Erreur chargement carte');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeRoute = async () => {
    setOptimizing(true);
    try {
      const res = await api.post('/geo/optimize-route', { date: selectedDate });
      const link = res.data?.google_maps_url || res.data?.url || res.data?.link;
      if (link) {
        setMapsLink(link);
        toast.success('Route optimisée ! Lien Google Maps disponible.');
      } else {
        toast.success('Route optimisée avec succès');
      }
    } catch {
      toast.error('Erreur optimisation de route');
    } finally {
      setOptimizing(false);
    }
  };

  // Group interventions by zone
  const getZoneInterventions = (zone) => {
    return interventions.filter(i =>
      (i.zone === zone.id) ||
      (i.arrondissement && zone.arrondissements.split(',').includes(String(i.arrondissement)))
    );
  };

  const getZoneStat = (zone) => {
    const zoneInters = getZoneInterventions(zone);
    const stat = zonesStats.find(z => z.zone_id === zone.id || z.zone === zone.id);
    return { count: zoneInters.length, stat };
  };

  const completedPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="crm-p-mobile" style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div className="crm-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
            Carte des Interventions
          </h1>
          <p style={{ color: '#78716c', fontSize: 13, marginTop: 4 }}>Vue géographique par zones — Paris & banlieue</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Date picker */}
          <div style={{ position: 'relative' }}>
            <Calendar style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#78716c', width: 15, height: 15 }} />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 12px 9px 34px', color: '#f1f5f9', fontSize: 13, outline: 'none', cursor: 'pointer' }}
            />
          </div>
          <button
            onClick={handleOptimizeRoute}
            disabled={optimizing}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg,#047857,#047857)',
              border: 'none', color: '#fff', borderRadius: 10,
              padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}
          >
            <Navigation style={{ width: 15, height: 15, animation: optimizing ? 'spin 1s linear infinite' : 'none' }} />
            Optimiser la route
          </button>
        </div>
      </div>

      {/* Google Maps Link */}
      {mapsLink && (
        <div style={{ marginBottom: 20, padding: '14px 18px', background: 'rgba(4,120,87,0.08)', border: '1px solid rgba(4,120,87,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <CheckCircle style={{ width: 18, height: 18, color: '#047857', flexShrink: 0 }} />
          <span style={{ color: '#047857', fontSize: 13, fontWeight: 600 }}>Route optimisée !</span>
          <a href={mapsLink} target="_blank" rel="noopener noreferrer"
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: '#60a5fa', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Ouvrir dans Google Maps <ExternalLink style={{ width: 14, height: 14 }} />
          </a>
        </div>
      )}

      {/* Stats bar */}
      <div className="crm-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Interventions du jour', value: stats.total, icon: MapPin, color: '#047857', bg: 'rgba(4,120,87,0.1)' },
          {
            label: 'Complétées', value: `${completedPct}%`,
            icon: CheckCircle, color: '#047857', bg: 'rgba(4,120,87,0.1)',
            sub: `${stats.completed}/${stats.total}`
          },
          { label: 'Durée moy. / intervention', value: stats.avg_time ? `${stats.avg_time} min` : '—', icon: Clock, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
          { label: 'Zones actives', value: PARIS_ZONES.filter(z => getZoneInterventions(z).length > 0).length, icon: Navigation, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-neutral-200 rounded-xl p-5">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon style={{ width: 18, height: 18, color: s.color }} />
              </div>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#78716c', marginTop: 2 }}>{s.label}</p>
            {s.sub && <p style={{ fontSize: 11, color: '#78716c', marginTop: 2 }}>{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="crm-grid" style={{ display: 'grid', gridTemplateColumns: selectedZone ? '1fr 380px' : '1fr', gap: 20 }}>
        {/* Zone Grid */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#78716c', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Zones Paris & Banlieue
          </h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#78716c' }}>
              <RefreshCw style={{ width: 24, height: 24, margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
              <p>Chargement...</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
              {PARIS_ZONES.map(zone => {
                const zoneInters = getZoneInterventions(zone);
                const zoneCompleted = zoneInters.filter(i => i.status === 'completed').length;
                const hasInters = zoneInters.length > 0;
                const isSelected = selectedZone?.id === zone.id;

                let borderColor = 'rgba(255,255,255,0.06)';
                let bgColor = 'rgba(255,255,255,0.02)';
                if (hasInters) {
                  const pct = zoneCompleted / zoneInters.length;
                  if (pct >= 1) { borderColor = 'rgba(4,120,87,0.3)'; bgColor = 'rgba(4,120,87,0.05)'; }
                  else if (pct > 0) { borderColor = 'rgba(4,120,87,0.3)'; bgColor = 'rgba(4,120,87,0.05)'; }
                  else { borderColor = 'rgba(6,182,212,0.3)'; bgColor = 'rgba(6,182,212,0.05)'; }
                }
                if (isSelected) { borderColor = '#047857'; bgColor = 'rgba(4,120,87,0.1)'; }

                return (
                  <div
                    key={zone.id}
                    onClick={() => setSelectedZone(isSelected ? null : zone)}
                    style={{
                      border: `1px solid ${borderColor}`,
                      background: bgColor,
                      borderRadius: 12, padding: 16, cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MapPin style={{ width: 15, height: 15, color: hasInters ? '#047857' : '#78716c' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: hasInters ? '#f1f5f9' : '#78716c' }}>
                          {zone.label}
                        </span>
                      </div>
                      {hasInters && <ChevronRight style={{ width: 14, height: 14, color: '#78716c' }} />}
                    </div>

                    {hasInters ? (
                      <>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                          {Object.entries(
                            zoneInters.reduce((acc, i) => { acc[i.status || 'scheduled'] = (acc[i.status || 'scheduled'] || 0) + 1; return acc; }, {})
                          ).map(([status, count]) => {
                            const cfg = STATUS_COLORS[status] || STATUS_COLORS.scheduled;
                            return (
                              <span key={status} style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                                {count} {cfg.label}
                              </span>
                            );
                          })}
                        </div>
                        {/* Progress bar */}
                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 4,
                            background: zoneCompleted === zoneInters.length ? '#047857' : '#047857',
                            width: `${zoneInters.length > 0 ? (zoneCompleted / zoneInters.length) * 100 : 0}%`,
                            transition: 'width 0.5s ease'
                          }} />
                        </div>
                        <p style={{ fontSize: 11, color: '#78716c', marginTop: 6 }}>{zoneCompleted}/{zoneInters.length} terminées</p>
                      </>
                    ) : (
                      <p style={{ fontSize: 12, color: '#78716c' }}>Aucune intervention</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Side panel: zone detail */}
        {selectedZone && (
          <div className="bg-white border border-neutral-200 rounded-xl" style={{ height: 'fit-content', position: 'sticky', top: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                {selectedZone.label}
              </h3>
              <button onClick={() => setSelectedZone(null)} style={{ background: 'none', border: 'none', color: '#78716c', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {getZoneInterventions(selectedZone).length === 0 ? (
                <p style={{ color: '#78716c', fontSize: 13, textAlign: 'center', padding: 20 }}>Aucune intervention dans cette zone</p>
              ) : getZoneInterventions(selectedZone).map((inter, i) => {
                const cfg = STATUS_COLORS[inter.status] || STATUS_COLORS.scheduled;
                return (
                  <div key={inter.id || i} style={{ padding: '12px 14px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{inter.client_name || `Client #${i + 1}`}</span>
                      <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{cfg.label}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#78716c', margin: 0 }}>{inter.address || inter.service || '—'}</p>
                    {inter.scheduled_time && <p style={{ fontSize: 11, color: '#78716c', marginTop: 4 }}>⏰ {inter.scheduled_time}</p>}
                    {inter.intervenant_name && <p style={{ fontSize: 11, color: '#78716c', marginTop: 2 }}>👤 {inter.intervenant_name}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default InterventionsMap;
