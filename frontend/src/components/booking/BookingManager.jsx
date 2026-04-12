import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, Plus, RefreshCw, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const STATUS_CONFIG = {
  confirmed:  { label: 'Confirmé',   color: '#34d399', bg: 'rgba(52,211,153,0.1)',  icon: CheckCircle },
  pending:    { label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: Clock },
  cancelled:  { label: 'Annulé',    color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',   icon: XCircle },
  completed:  { label: 'Terminé',   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  icon: CheckCircle },
};

const fmt = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v || 0);

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const BookingManager = () => {
  const [filter, setFilter] = useState('');

  const { data: bookings = [], isLoading: loading, refetch: fetchBookings } = useQuery({
    queryKey: ['bookings', 'list'],
    queryFn: async () => {
      // Try several possible endpoints
      try {
        const res = await api.get('/bookings');
        const raw = res.data;
        return Array.isArray(raw) ? raw : (raw?.items || raw?.bookings || []);
      } catch {
        try {
          const res = await api.get('/planning/bookings');
          const raw = res.data;
          return Array.isArray(raw) ? raw : (raw?.items || raw?.bookings || []);
        } catch {
          // no endpoint yet — stay empty
          return [];
        }
      }
    },
    onError: () => {
      toast.error('Erreur lors du chargement des réservations');
    },
  });

  const filtered = filter ? bookings.filter(b => b.status === filter) : bookings;

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{ fontFamily: 'Manrope,sans-serif' }}>Réservations</h1>
          </div>
          <p className="text-slate-500 text-sm">
            <span className="text-violet-400 font-semibold">{bookings.length}</span> réservation(s)
          </p>
        </div>
        <button onClick={fetchBookings}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all border border-white/5">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: '#a78bfa', icon: BookOpen },
          { label: 'Confirmés', value: stats.confirmed, color: '#34d399', icon: CheckCircle },
          { label: 'En attente', value: stats.pending, color: '#f59e0b', icon: Clock },
          { label: 'Annulés', value: stats.cancelled, color: '#f43f5e', icon: XCircle },
        ].map((s, i) => (
          <div key={i} className="metric-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: 'Manrope,sans-serif' }}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: '', label: 'Tous' },
          { value: 'confirmed', label: 'Confirmés' },
          { value: 'pending', label: 'En attente' },
          { value: 'cancelled', label: 'Annulés' },
          { value: 'completed', label: 'Terminés' },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f.value
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="section-card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">
              {bookings.length === 0 ? 'Aucune réservation' : 'Aucune réservation pour ce filtre'}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Les réservations clients apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((booking, idx) => {
              const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG['pending'];
              const Icon = cfg.icon;
              return (
                <div key={booking.id || booking.booking_id || idx} className="p-4 hover:bg-white/2 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.color}25` }}>
                        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-200">
                          {booking.client_name || booking.lead_name || booking.name || `Réservation #${String(booking.id || idx + 1).slice(-6)}`}
                        </p>
                        {booking.service_type && (
                          <p className="text-xs text-slate-500 mt-0.5">{booking.service_type}</p>
                        )}
                        {booking.address && (
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 text-slate-600 flex-shrink-0" />
                            <p className="text-xs text-slate-600 truncate">{booking.address}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ color: cfg.color, background: cfg.bg }}>
                        {cfg.label}
                      </span>
                      {booking.amount && (
                        <span className="text-sm font-bold text-violet-400">{fmt(booking.amount)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pl-12">
                    {booking.scheduled_at && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(booking.scheduled_at)}
                      </div>
                    )}
                    {booking.duration_min && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {booking.duration_min} min
                      </div>
                    )}
                    {booking.assigned_to && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <User className="w-3 h-3" />
                        {booking.assigned_to}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingManager;
