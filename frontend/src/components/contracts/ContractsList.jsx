import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Plus, Search, FileText, Play, Pause, X, Edit2, Calendar,
  Euro, Users, Clock, RefreshCw, ChevronDown, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const FREQUENCY_LABELS = {
  hebdomadaire: { label: 'Hebdo', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  bi_hebdomadaire: { label: 'Bi-hebdo', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  mensuel: { label: 'Mensuel', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
};

const STATUS_CONFIG = {
  active: { label: 'Actif', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)' },
  paused: { label: 'Pausé', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  cancelled: { label: 'Annulé', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.25)' },
  expired: { label: 'Expiré', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)' },
};

const SERVICES = ['Ménage régulier', 'Grand ménage', 'Repassage', 'Vitres', 'Bureau', 'Airbnb'];
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const defaultForm = {
  client_name: '', client_email: '', client_phone: '',
  service: '', frequency: 'hebdomadaire', day_of_week: 'Lundi',
  time: '09:00', price_per_intervention: '', start_date: '',
  end_date: '', auto_renew: false, intervenant_id: '', notes: ''
};

const ContractsList = () => {
  const [contracts, setContracts] = useState([]);
  const [stats, setStats] = useState({ active: 0, paused: 0, monthly_revenue: 0, avg_duration: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchContracts(); }, [statusFilter]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const res = await axios.get(`${API_URL}/contracts?${params}`, { withCredentials: true });
      const data = Array.isArray(res.data) ? res.data : res.data.contracts || [];
      setContracts(data);
      // Compute stats
      const active = data.filter(c => c.status === 'active').length;
      const paused = data.filter(c => c.status === 'paused').length;
      const monthly_revenue = data
        .filter(c => c.status === 'active')
        .reduce((sum, c) => sum + (parseFloat(c.price_per_intervention) || 0) * getMonthlyFactor(c.frequency), 0);
      setStats({ active, paused, monthly_revenue: Math.round(monthly_revenue), avg_duration: 0 });
    } catch (e) {
      toast.error('Erreur chargement contrats');
    } finally {
      setLoading(false);
    }
  };

  const getMonthlyFactor = (freq) => {
    if (freq === 'hebdomadaire') return 4;
    if (freq === 'bi_hebdomadaire') return 8;
    return 1;
  };

  const openCreate = () => { setEditingId(null); setForm(defaultForm); setShowModal(true); };
  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({ ...defaultForm, ...c });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await axios.put(`${API_URL}/contracts/${editingId}`, form, { withCredentials: true });
        toast.success('Contrat mis à jour');
      } else {
        await axios.post(`${API_URL}/contracts`, form, { withCredentials: true });
        toast.success('Contrat créé');
      }
      setShowModal(false);
      fetchContracts();
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleAction = async (id, action) => {
    try {
      await axios.post(`${API_URL}/contracts/${id}/${action}`, {}, { withCredentials: true });
      toast.success(`Contrat ${action === 'pause' ? 'mis en pause' : action === 'resume' ? 'repris' : 'annulé'}`);
      fetchContracts();
    } catch {
      toast.error('Erreur lors de l\'action');
    }
  };

  const handleGenerateInterventions = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${API_URL}/contracts/generate-interventions`, {}, { withCredentials: true });
      const count = res.data?.count || res.data?.generated || 0;
      toast.success(`✅ ${count} interventions générées avec succès`);
    } catch {
      toast.error('Erreur génération des interventions');
    } finally {
      setGenerating(false);
    }
  };

  const filtered = contracts.filter(c =>
    (c.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.service || '').toLowerCase().includes(search.toLowerCase())
  );

  const StatusChip = ({ status, active }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
    return (
      <button
        onClick={() => setStatusFilter(active ? '' : status)}
        style={{
          color: cfg.color,
          background: active ? cfg.bg : 'transparent',
          border: `1px solid ${active ? cfg.border : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', transition: 'all 0.2s'
        }}
      >
        {cfg.label}
      </button>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 26, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
            Contrats Récurrents
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Gérez vos contrats de ménage régulier</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleGenerateInterventions}
            disabled={generating}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
              color: '#a78bfa', borderRadius: 10, padding: '9px 18px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}
          >
            <RefreshCw className="w-4 h-4" style={{ animation: generating ? 'spin 1s linear infinite' : 'none' }} />
            Générer interventions
          </button>
          <button
            onClick={openCreate}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)',
              border: 'none', color: '#fff', borderRadius: 10,
              padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}
          >
            <Plus className="w-4 h-4" /> Nouveau contrat
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Contrats actifs', value: stats.active, icon: CheckCircle, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
          { label: 'En pause', value: stats.paused, icon: Pause, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { label: 'CA mensuel total', value: `${stats.monthly_revenue}€`, icon: Euro, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
          { label: 'Durée moy. contrat', value: stats.avg_duration ? `${stats.avg_duration}m` : '—', icon: Clock, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
        ].map((s, i) => (
          <div key={i} className="metric-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon style={{ width: 18, height: 18, color: s.color }} />
              </div>
            </div>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', fontFamily: 'Manrope,sans-serif' }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="section-card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', width: 15, height: 15 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher client, service..."
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '8px 12px 8px 36px', color: '#f1f5f9', fontSize: 13, outline: 'none'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.keys(STATUS_CONFIG).map(s => (
              <StatusChip key={s} status={s} active={statusFilter === s} />
            ))}
            {statusFilter && (
              <button onClick={() => setStatusFilter('')} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="section-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
            <RefreshCw style={{ width: 24, height: 24, margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p>Chargement...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
            <FileText style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }} />
            <p>Aucun contrat trouvé</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Client', 'Service', 'Fréquence', 'Prochaine inter.', 'Prix/inter.', 'Statut', 'Intervenant', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const freq = FREQUENCY_LABELS[c.frequency] || { label: c.frequency, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
                  const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.active;
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{c.client_name}</p>
                        <p style={{ fontSize: 11, color: '#64748b' }}>{c.client_email}</p>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#cbd5e1' }}>{c.service}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: freq.bg, color: freq.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{freq.label}</span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8' }}>
                        {c.next_intervention ? new Date(c.next_intervention).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#a78bfa' }}>
                        {c.price_per_intervention ? `${c.price_per_intervention}€` : '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                          {status.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8' }}>{c.intervenant_name || '—'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(c)} title="Éditer" style={{ background: 'rgba(139,92,246,0.12)', border: 'none', color: '#a78bfa', borderRadius: 7, padding: '6px 8px', cursor: 'pointer' }}>
                            <Edit2 style={{ width: 13, height: 13 }} />
                          </button>
                          {c.status === 'active' && (
                            <button onClick={() => handleAction(c.id, 'pause')} title="Pause" style={{ background: 'rgba(245,158,11,0.12)', border: 'none', color: '#f59e0b', borderRadius: 7, padding: '6px 8px', cursor: 'pointer' }}>
                              <Pause style={{ width: 13, height: 13 }} />
                            </button>
                          )}
                          {c.status === 'paused' && (
                            <button onClick={() => handleAction(c.id, 'resume')} title="Reprendre" style={{ background: 'rgba(52,211,153,0.12)', border: 'none', color: '#34d399', borderRadius: 7, padding: '6px 8px', cursor: 'pointer' }}>
                              <Play style={{ width: 13, height: 13 }} />
                            </button>
                          )}
                          {c.status !== 'cancelled' && (
                            <button onClick={() => handleAction(c.id, 'cancel')} title="Annuler" style={{ background: 'rgba(244,63,94,0.12)', border: 'none', color: '#f43f5e', borderRadius: 7, padding: '6px 8px', cursor: 'pointer' }}>
                              <X style={{ width: 13, height: 13 }} />
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

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'hsl(224,71%,6%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Manrope,sans-serif', fontSize: 18, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                {editingId ? 'Modifier le contrat' : 'Nouveau contrat'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Nom client', key: 'client_name', type: 'text', full: true },
                { label: 'Email', key: 'client_email', type: 'email' },
                { label: 'Téléphone', key: 'client_phone', type: 'tel' },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.full ? '1/-1' : 'auto' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key] || ''}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              {/* Service */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service</label>
                <select value={form.service} onChange={e => setForm(p => ({ ...p, service: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(215,28%,10%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none' }}>
                  <option value="">Choisir...</option>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fréquence</label>
                <select value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(215,28%,10%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none' }}>
                  <option value="hebdomadaire">Hebdomadaire</option>
                  <option value="bi_hebdomadaire">Bi-hebdomadaire</option>
                  <option value="mensuel">Mensuel</option>
                </select>
              </div>

              {/* Day */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jour</label>
                <select value={form.day_of_week} onChange={e => setForm(p => ({ ...p, day_of_week: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(215,28%,10%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none' }}>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Time */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Heure</label>
                <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Price */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prix / intervention (€)</label>
                <input type="number" value={form.price_per_intervention} onChange={e => setForm(p => ({ ...p, price_per_intervention: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Dates */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date début</label>
                <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date fin</label>
                <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Auto-renew */}
              <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="auto_renew" checked={!!form.auto_renew} onChange={e => setForm(p => ({ ...p, auto_renew: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: '#8b5cf6' }} />
                <label htmlFor="auto_renew" style={{ fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>Renouvellement automatique</label>
              </div>

              {/* Notes */}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={handleSave} style={{ background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {editingId ? 'Enregistrer' : 'Créer le contrat'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ContractsList;
