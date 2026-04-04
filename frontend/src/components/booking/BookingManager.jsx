import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Calendar, Clock, CheckCircle, XCircle, Euro, Users, RefreshCw,
  MapPin, Phone, Mail, ChevronRight, Settings, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  confirmed: { label: 'Confirmé', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)' },
  cancelled: { label: 'Annulé', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.25)' },
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const formatTime = (t) => t || '—';

// Generate next 7 days
const getNext7Days = () => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      date: d.toISOString().split('T')[0],
      label: i === 0 ? "Aujourd'hui" : i === 1 ? 'Demain' : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    });
  }
  return days;
};

const BookingManager = () => {
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [bookingConfig, setBookingConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('bookings'); // 'bookings' | 'services' | 'calendar'
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, revenue: 0 });

  const next7Days = getNext7Days();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [leadsRes, servicesRes, configRes] = await Promise.allSettled([
        axios.get(`${API_URL}/leads?source=Booking Widget&limit=100`, { withCredentials: true }),
        axios.get(`${API_URL}/booking/services`, { withCredentials: true }),
        axios.get(`${API_URL}/booking/config`, { withCredentials: true }),
      ]);

      const leadsData = leadsRes.status === 'fulfilled'
        ? (Array.isArray(leadsRes.value.data) ? leadsRes.value.data : leadsRes.value.data?.leads || [])
        : [];
      const svcData = servicesRes.status === 'fulfilled'
        ? (Array.isArray(servicesRes.value.data) ? servicesRes.value.data : servicesRes.value.data?.services || [])
        : [];
      const cfgData = configRes.status === 'fulfilled' ? configRes.value.data : null;

      setBookings(leadsData);
      setServices(svcData);
      setBookingConfig(cfgData);

      const pending = leadsData.filter(b => b.booking_status === 'pending' || b.status === 'nouveau').length;
      const confirmed = leadsData.filter(b => b.booking_status === 'confirmed' || b.status === 'gagné').length;
      const revenue = leadsData
        .filter(b => b.booking_status === 'confirmed' || b.status === 'gagné')
        .reduce((sum, b) => sum + (parseFloat(b.estimated_price || b.price || 0)), 0);
      setStats({ total: leadsData.length, pending, confirmed, revenue: Math.round(revenue) });
    } catch {
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (booking) => {
    try {
      await axios.put(`${API_URL}/leads/${booking.id}`, { booking_status: 'confirmed', status: 'gagné' }, { withCredentials: true });
      toast.success('Réservation confirmée');
      fetchAll();
    } catch {
      toast.error('Erreur confirmation');
    }
  };

  const handleCancel = async (booking) => {
    if (!window.confirm('Annuler cette réservation ?')) return;
    try {
      await axios.put(`${API_URL}/leads/${booking.id}`, { booking_status: 'cancelled', status: 'perdu' }, { withCredentials: true });
      toast.success('Réservation annulée');
      fetchAll();
    } catch {
      toast.error('Erreur annulation');
    }
  };

  const getBookingsForDay = (date) => bookings.filter(b => b.booking_date === date || b.preferred_date === date);

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
            Booking Manager
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Gestion des réservations en ligne</p>
        </div>
        <button onClick={fetchAll} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <RefreshCw style={{ width: 14, height: 14 }} /> Actualiser
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total réservations', value: stats.total, icon: Calendar, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
          { label: 'En attente', value: stats.pending, icon: AlertCircle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { label: 'Confirmées', value: stats.confirmed, icon: CheckCircle, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
          { label: 'CA bookings', value: `${stats.revenue}€`, icon: Euro, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
        ].map((s, i) => (
          <div key={i} className="metric-card">
            <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <s.icon style={{ width: 18, height: 18, color: s.color }} />
            </div>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', fontFamily: 'Manrope,sans-serif' }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { id: 'bookings', label: '📋 Réservations' },
          { id: 'services', label: '⚙️ Catalogue services' },
          { id: 'calendar', label: '📅 Disponibilités' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveSection(tab.id)}
            style={{
              background: activeSection === tab.id ? 'rgba(139,92,246,0.2)' : 'transparent',
              border: activeSection === tab.id ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
              color: activeSection === tab.id ? '#a78bfa' : '#64748b',
              borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings table */}
      {activeSection === 'bookings' && (
        <div className="section-card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
              <RefreshCw style={{ width: 24, height: 24, margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
              <p>Chargement...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
              <Calendar style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }} />
              <p>Aucune réservation via booking widget</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Client', 'Service', 'Date', 'Heure', 'Adresse', 'Prix estimé', 'Statut', 'Créé le', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b, i) => {
                    const bookingStatus = b.booking_status || (b.status === 'gagné' ? 'confirmed' : b.status === 'perdu' ? 'cancelled' : 'pending');
                    const statusCfg = STATUS_CONFIG[bookingStatus] || STATUS_CONFIG.pending;
                    return (
                      <tr key={b.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 14px' }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', margin: 0 }}>{b.name || '—'}</p>
                          <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{b.email || b.phone}</p>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#cbd5e1', whiteSpace: 'nowrap' }}>{b.service_type || b.service || '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{formatDate(b.booking_date || b.preferred_date)}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{formatTime(b.booking_time || b.preferred_time)}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8', maxWidth: 160 }}>
                          <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }} title={b.address}>{b.address || '—'}</p>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#a78bfa' }}>
                          {b.estimated_price || b.price ? `${b.estimated_price || b.price}€` : '—'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>{formatDate(b.created_at)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {bookingStatus === 'pending' && (
                              <button onClick={() => handleConfirm(b)}
                                style={{ background: 'rgba(52,211,153,0.12)', border: 'none', color: '#34d399', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                ✓ Confirmer
                              </button>
                            )}
                            {bookingStatus !== 'cancelled' && (
                              <button onClick={() => handleCancel(b)}
                                style={{ background: 'rgba(244,63,94,0.1)', border: 'none', color: '#f43f5e', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                                ✕
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Services catalog */}
      {activeSection === 'services' && (
        <div>
          <h2 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 15, fontWeight: 700, color: '#94a3b8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Catalogue de services
          </h2>
          {services.length === 0 ? (
            <div className="section-card" style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
              <Settings style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }} />
              <p>Aucun service configuré</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Configurez vos services via l'API /api/booking/services</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
              {services.map((svc, i) => (
                <div key={svc.id || i} className="section-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h3 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 14, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>{svc.name || svc.label}</h3>
                    <span style={{ fontSize: 18, fontWeight: 900, color: '#a78bfa', fontFamily: 'Manrope,sans-serif' }}>{svc.price ? `${svc.price}€` : '—'}</span>
                  </div>
                  {svc.description && <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>{svc.description}</p>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {svc.duration && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', borderRadius: 6, padding: '3px 8px', fontSize: 11 }}>
                        <Clock style={{ width: 11, height: 11 }} /> {svc.duration}
                      </span>
                    )}
                    {svc.active !== undefined && (
                      <span style={{
                        background: svc.active ? 'rgba(52,211,153,0.1)' : 'rgba(244,63,94,0.1)',
                        color: svc.active ? '#34d399' : '#f43f5e',
                        borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700
                      }}>
                        {svc.active ? 'Actif' : 'Inactif'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Booking config */}
          {bookingConfig && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Configuration Booking
              </h3>
              <div className="section-card" style={{ padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
                  {Object.entries(bookingConfig).filter(([k, v]) => typeof v !== 'object').map(([key, val]) => (
                    <div key={key}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{key.replace(/_/g, ' ')}</p>
                      <p style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>{String(val)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar preview */}
      {activeSection === 'calendar' && (
        <div>
          <h2 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 15, fontWeight: 700, color: '#94a3b8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Disponibilités — 7 prochains jours
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14 }}>
            {next7Days.map(day => {
              const dayBookings = getBookingsForDay(day.date);
              const confirmed = dayBookings.filter(b => b.booking_status === 'confirmed' || b.status === 'gagné').length;
              const pending = dayBookings.filter(b => b.booking_status === 'pending' || b.status === 'nouveau').length;
              const total = dayBookings.length;
              const maxSlots = 8;
              const available = Math.max(0, maxSlots - total);
              const pct = (total / maxSlots) * 100;
              const dayColor = pct >= 100 ? '#f43f5e' : pct >= 75 ? '#f59e0b' : '#34d399';

              return (
                <div key={day.date} style={{
                  background: 'rgba(255,255,255,0.02)', border: `1px solid ${total > 0 ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 12, padding: 16
                }}>
                  <p style={{ fontFamily: 'Manrope,sans-serif', fontSize: 13, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>{day.label}</p>
                  <p style={{ fontSize: 10, color: '#475569', marginBottom: 12 }}>{day.date}</p>

                  {/* Slots visual */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3, marginBottom: 10 }}>
                    {Array.from({ length: maxSlots }).map((_, i) => (
                      <div key={i} style={{
                        height: 8, borderRadius: 3,
                        background: i < confirmed ? '#34d399' : i < total ? '#f59e0b' : 'rgba(255,255,255,0.08)'
                      }} />
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {confirmed > 0 && <span style={{ fontSize: 10, color: '#34d399' }}>{confirmed} confirmé(s)</span>}
                    {pending > 0 && <span style={{ fontSize: 10, color: '#f59e0b' }}>{pending} en attente</span>}
                    <span style={{ fontSize: 10, color: '#475569', marginLeft: 'auto' }}>{available} libre(s)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default BookingManager;
