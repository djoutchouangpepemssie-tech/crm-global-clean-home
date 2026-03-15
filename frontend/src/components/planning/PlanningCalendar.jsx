import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users, CheckCircle, XCircle, Play, CalendarDays, X } from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const STATUS_CONFIG = {
  'planifiée': { label: 'Planifiée', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.3)' },
  'en_cours': { label: 'En cours', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  'terminée': { label: 'Terminée', color: '#34d399', bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)' },
  'annulée': { label: 'Annulée', color: '#f43f5e', bg: 'rgba(244,63,94,0.15)', border: 'rgba(244,63,94,0.3)' },
};

const InputField = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass = "w-full px-3 py-2 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500";

const PlanningCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calendarData, setCalendarData] = useState({ interventions: [], teams: [] });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [teams, setTeams] = useState([]);
  const [selectedIntervention, setSelectedIntervention] = useState(null);
  const [formData, setFormData] = useState({
    lead_id: '', title: '', description: '', address: '',
    scheduled_date: '', scheduled_time: '09:00', duration_hours: 2, team_id: '',
  });

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/calendar?month=${currentMonth}`, { withCredentials: true });
      setCalendarData(res.data);
      setTeams(res.data.teams || []);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }, [currentMonth]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const navigateMonth = (dir) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const getMonthDays = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    const startPad = (firstDay.getDay() + 6) % 7;
    const days = [];
    for (let i = -startPad; i < lastDay.getDate(); i++) {
      const date = new Date(y, m - 1, i + 1);
      days.push({
        date,
        dateStr: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        isCurrentMonth: date.getMonth() === m - 1,
        isToday: date.toDateString() === new Date().toDateString(),
      });
    }
    return days;
  };

  const getInterventionsForDate = (dateStr) =>
    (calendarData?.interventions || []).filter(i => i.scheduled_date === dateStr);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.lead_id || !formData.title || !formData.scheduled_date) {
      toast.error('Remplissez les champs obligatoires');
      return;
    }
    try {
      await axios.post(`${API_URL}/interventions`, formData, { withCredentials: true });
      toast.success('Intervention planifiée ✓');
      setShowForm(false);
      setFormData({ lead_id: '', title: '', description: '', address: '', scheduled_date: '', scheduled_time: '09:00', duration_hours: 2, team_id: '' });
      fetchCalendar();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  const handleCheckInOut = async (interventionId, type) => {
    try {
      await axios.post(`${API_URL}/interventions/${interventionId}/check`, { type }, { withCredentials: true });
      toast.success(type === 'check_in' ? 'Check-in enregistré ✓' : 'Check-out enregistré ✓');
      setSelectedIntervention(null);
      fetchCalendar();
    } catch { toast.error('Erreur'); }
  };

  const handleStatusChange = async (interventionId, status) => {
    try {
      await axios.patch(`${API_URL}/interventions/${interventionId}`, { status }, { withCredentials: true });
      toast.success('Statut mis à jour');
      setSelectedIntervention(null);
      fetchCalendar();
    } catch { toast.error('Erreur'); }
  };

  const days = getMonthDays();
  const [y, m] = currentMonth.split('-').map(Number);
  const totalInterventions = calendarData?.interventions?.length || 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in" data-testid="planning-calendar">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Planning</h1>
          </div>
          <p className="text-slate-500 text-sm">
            <span className="text-violet-400 font-semibold">{totalInterventions}</span> intervention(s) ce mois
          </p>
        </div>
        <button onClick={() => setShowForm(true)} data-testid="add-intervention-btn"
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-all text-sm font-medium"
          style={{boxShadow:'0 0 15px rgba(139,92,246,0.25)'}}>
          <Plus className="w-4 h-4" /> Nouvelle intervention
        </button>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between section-card p-3 mb-4">
        <button onClick={() => navigateMonth(-1)} data-testid="prev-month"
          className="p-2 hover:bg-white/5 rounded-lg transition-all text-slate-400 hover:text-slate-200">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-slate-200" style={{fontFamily:'Manrope,sans-serif'}}>
          {MONTHS_FR[m - 1]} {y}
        </h2>
        <button onClick={() => navigateMonth(1)} data-testid="next-month"
          className="p-2 hover:bg-white/5 rounded-lg transition-all text-slate-400 hover:text-slate-200">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Teams legend */}
      {teams.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {teams.map(t => (
            <span key={t.team_id} className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: t.color}} />
              {t.name}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="section-card p-8 text-center">
          <div className="skeleton h-8 w-32 mx-auto rounded-lg mb-4" />
          <div className="grid grid-cols-7 gap-2">
            {[...Array(35)].map((_, i) => <div key={i} className="skeleton h-20 rounded-lg" />)}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop calendar */}
          <div className="hidden md:block section-card overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-white/5">
              {DAYS_FR.map(d => (
                <div key={d} className="p-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider bg-white/2">
                  {d}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                const interventions = getInterventionsForDate(day.dateStr);
                return (
                  <div key={idx} data-testid={`calendar-day-${day.dateStr}`}
                    className="min-h-[110px] p-2 transition-all"
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      borderRight: '1px solid rgba(255,255,255,0.04)',
                      background: day.isToday ? 'rgba(139,92,246,0.06)' : !day.isCurrentMonth ? 'rgba(0,0,0,0.1)' : 'transparent'
                    }}>
                    <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full mb-1 ${
                      day.isToday ? 'bg-violet-600 text-white' :
                      !day.isCurrentMonth ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {day.date.getDate()}
                    </span>
                    <div className="space-y-0.5">
                      {interventions.slice(0, 2).map(intv => {
                        const sc = STATUS_CONFIG[intv.status] || STATUS_CONFIG['planifiée'];
                        const team = teams.find(t => t.team_id === intv.team_id);
                        return (
                          <div key={intv.intervention_id}
                            data-testid={`intervention-${intv.intervention_id}`}
                            onClick={() => setSelectedIntervention(intv)}
                            className="text-[10px] px-1.5 py-0.5 rounded cursor-pointer truncate font-medium transition-all hover:opacity-80"
                            style={{
                              color: sc.color,
                              background: sc.bg,
                              borderLeft: team ? `2px solid ${team.color}` : `2px solid ${sc.color}`,
                            }}>
                            {intv.scheduled_time} {intv.title}
                          </div>
                        );
                      })}
                      {interventions.length > 2 && (
                        <span className="text-[10px] text-slate-600 pl-1">+{interventions.length - 2}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile list */}
          <div className="md:hidden space-y-3">
            {days.filter(d => d.isCurrentMonth && getInterventionsForDate(d.dateStr).length > 0).length === 0 ? (
              <div className="section-card p-8 text-center text-slate-600 text-sm">
                Aucune intervention ce mois-ci
              </div>
            ) : days.filter(d => d.isCurrentMonth && getInterventionsForDate(d.dateStr).length > 0).map(day => {
              const interventions = getInterventionsForDate(day.dateStr);
              const dayName = DAYS_FR[(day.date.getDay() + 6) % 7];
              return (
                <div key={day.dateStr} className="section-card overflow-hidden">
                  <div className={`px-4 py-2.5 border-b border-white/5 flex items-center gap-2 ${day.isToday ? 'bg-violet-500/10' : 'bg-white/2'}`}>
                    <span className="text-sm font-bold text-slate-200">{dayName} {day.date.getDate()}</span>
                    <span className="text-xs text-slate-500">{MONTHS_FR[day.date.getMonth()]}</span>
                    {day.isToday && <span className="ml-auto text-[10px] font-semibold text-violet-400 bg-violet-500/15 px-2 py-0.5 rounded-full">Aujourd'hui</span>}
                  </div>
                  <div className="divide-y divide-white/5">
                    {interventions.map(intv => {
                      const sc = STATUS_CONFIG[intv.status] || STATUS_CONFIG['planifiée'];
                      return (
                        <div key={intv.intervention_id}
                          data-testid={`intervention-mobile-${intv.intervention_id}`}
                          onClick={() => setSelectedIntervention(intv)}
                          className="px-4 py-3 cursor-pointer hover:bg-white/3 transition-all">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-bold text-slate-400">{intv.scheduled_time}</span>
                              <p className="text-sm font-semibold text-slate-200 truncate">{intv.title}</p>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                              style={{color:sc.color,background:sc.bg}}>
                              {sc.label}
                            </span>
                          </div>
                          {intv.lead_name && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Users className="w-3 h-3" />
                              <span>{intv.lead_name}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Detail modal */}
      {selectedIntervention && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.7)'}}
          onClick={() => setSelectedIntervention(null)}>
          <div className="rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in"
            style={{background:'hsl(224,71%,7%)',border:'1px solid rgba(255,255,255,0.08)',boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}
            onClick={e => e.stopPropagation()} data-testid="intervention-detail-modal">
            
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 mb-1">{selectedIntervention.title}</h3>
                {(() => {
                  const sc = STATUS_CONFIG[selectedIntervention.status] || STATUS_CONFIG['planifiée'];
                  return (
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                      style={{color:sc.color,background:sc.bg,border:`1px solid ${sc.border}`}}>
                      {sc.label}
                    </span>
                  );
                })()}
              </div>
              <button onClick={() => setSelectedIntervention(null)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-3 text-sm text-slate-400 p-3 bg-white/3 rounded-lg">
                <Clock className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <span>{selectedIntervention.scheduled_date} à {selectedIntervention.scheduled_time} ({selectedIntervention.duration_hours}h)</span>
              </div>
              {selectedIntervention.address && (
                <div className="flex items-center gap-3 text-sm text-slate-400 p-3 bg-white/3 rounded-lg">
                  <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>{selectedIntervention.address}</span>
                </div>
              )}
              {selectedIntervention.lead_name && (
                <div className="flex items-center gap-3 text-sm text-slate-400 p-3 bg-white/3 rounded-lg">
                  <Users className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>{selectedIntervention.lead_name} — {selectedIntervention.lead_phone}</span>
                </div>
              )}
              {selectedIntervention.description && (
                <p className="text-sm text-slate-400 p-3 bg-white/3 rounded-lg">{selectedIntervention.description}</p>
              )}
              {selectedIntervention.check_in && (
                <p className="text-xs text-green-400 bg-green-500/10 px-3 py-2 rounded-lg">✓ Check-in: {new Date(selectedIntervention.check_in.time).toLocaleString('fr-FR')}</p>
              )}
              {selectedIntervention.check_out && (
                <p className="text-xs text-blue-400 bg-blue-500/10 px-3 py-2 rounded-lg">✓ Check-out: {new Date(selectedIntervention.check_out.time).toLocaleString('fr-FR')}</p>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              {selectedIntervention.status === 'planifiée' && (
                <button data-testid="check-in-btn"
                  onClick={() => handleCheckInOut(selectedIntervention.intervention_id, 'check_in')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-400 rounded-lg text-sm font-medium transition-all">
                  <Play className="w-4 h-4" /> Check-in
                </button>
              )}
              {selectedIntervention.status === 'en_cours' && (
                <button data-testid="check-out-btn"
                  onClick={() => handleCheckInOut(selectedIntervention.intervention_id, 'check_out')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 text-blue-400 rounded-lg text-sm font-medium transition-all">
                  <CheckCircle className="w-4 h-4" /> Check-out
                </button>
              )}
              {!['annulée','terminée'].includes(selectedIntervention.status) && (
                <button data-testid="cancel-intervention-btn"
                  onClick={() => handleStatusChange(selectedIntervention.intervention_id, 'annulée')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-all">
                  <XCircle className="w-4 h-4" /> Annuler
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.7)'}}
          onClick={() => setShowForm(false)}>
          <div className="rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fade-in"
            style={{background:'hsl(224,71%,7%)',border:'1px solid rgba(255,255,255,0.08)',boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}
            onClick={e => e.stopPropagation()}>
            
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-100">Nouvelle intervention</h3>
              <button onClick={() => setShowForm(false)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <InputField label="ID Lead *">
                <input data-testid="intervention-lead-id" value={formData.lead_id} required
                  onChange={e => setFormData(p => ({...p, lead_id: e.target.value}))}
                  placeholder="lead_xxxxx" className={inputClass} />
              </InputField>

              <InputField label="Titre *">
                <input data-testid="intervention-title" value={formData.title} required
                  onChange={e => setFormData(p => ({...p, title: e.target.value}))}
                  placeholder="Nettoyage complet" className={inputClass} />
              </InputField>

              <div className="grid grid-cols-2 gap-3">
                <InputField label="Date *">
                  <input data-testid="intervention-date" type="date" required
                    value={formData.scheduled_date}
                    onChange={e => setFormData(p => ({...p, scheduled_date: e.target.value}))}
                    className={inputClass} />
                </InputField>
                <InputField label="Heure">
                  <input data-testid="intervention-time" type="time"
                    value={formData.scheduled_time}
                    onChange={e => setFormData(p => ({...p, scheduled_time: e.target.value}))}
                    className={inputClass} />
                </InputField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InputField label="Durée (h)">
                  <input data-testid="intervention-duration" type="number" step="0.5" min="0.5"
                    value={formData.duration_hours}
                    onChange={e => setFormData(p => ({...p, duration_hours: parseFloat(e.target.value)}))}
                    className={inputClass} />
                </InputField>
                {teams.length > 0 && (
                  <InputField label="Équipe">
                    <select data-testid="intervention-team" value={formData.team_id}
                      onChange={e => setFormData(p => ({...p, team_id: e.target.value}))}
                      className={inputClass}>
                      <option value="" className="bg-slate-800">Sans équipe</option>
                      {teams.map(t => <option key={t.team_id} value={t.team_id} className="bg-slate-800">{t.name}</option>)}
                    </select>
                  </InputField>
                )}
              </div>

              <InputField label="Adresse">
                <input data-testid="intervention-address" value={formData.address}
                  onChange={e => setFormData(p => ({...p, address: e.target.value}))}
                  placeholder="10 Rue de la Paix, Paris" className={inputClass} />
              </InputField>

              <InputField label="Description">
                <textarea data-testid="intervention-description" value={formData.description} rows={3}
                  onChange={e => setFormData(p => ({...p, description: e.target.value}))}
                  className={`${inputClass} resize-none`} />
              </InputField>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-lg text-sm font-medium transition-all">
                  Annuler
                </button>
                <button type="submit" data-testid="submit-intervention"
                  className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all"
                  style={{boxShadow:'0 0 15px rgba(139,92,246,0.25)'}}>
                  Planifier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningCalendar;
