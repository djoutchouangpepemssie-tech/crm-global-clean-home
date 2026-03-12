import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users, CheckCircle, XCircle, Play } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const statusColors = {
  planifiée: 'bg-blue-100 border-blue-300 text-blue-800',
  en_cours: 'bg-amber-100 border-amber-300 text-amber-800',
  terminée: 'bg-green-100 border-green-300 text-green-800',
  annulée: 'bg-red-100 border-red-300 text-red-800',
};

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
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
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
    calendarData.interventions.filter(i => i.scheduled_date === dateStr);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.lead_id || !formData.title || !formData.scheduled_date) {
      toast.error('Remplissez les champs obligatoires');
      return;
    }
    try {
      await axios.post(`${API_URL}/interventions`, formData, { withCredentials: true });
      toast.success('Intervention planifiée');
      setShowForm(false);
      setFormData({ lead_id: '', title: '', description: '', address: '', scheduled_date: '', scheduled_time: '09:00', duration_hours: 2, team_id: '' });
      fetchCalendar();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleCheckInOut = async (interventionId, type) => {
    try {
      await axios.post(`${API_URL}/interventions/${interventionId}/check`, { type }, { withCredentials: true });
      toast.success(type === 'check_in' ? 'Check-in enregistré' : 'Check-out enregistré');
      setSelectedIntervention(null);
      fetchCalendar();
    } catch {
      toast.error('Erreur');
    }
  };

  const handleStatusChange = async (interventionId, status) => {
    try {
      await axios.patch(`${API_URL}/interventions/${interventionId}`, { status }, { withCredentials: true });
      toast.success('Statut mis à jour');
      setSelectedIntervention(null);
      fetchCalendar();
    } catch {
      toast.error('Erreur');
    }
  };

  const days = getMonthDays();
  const [y, m] = currentMonth.split('-').map(Number);

  return (
    <div className="p-8" data-testid="planning-calendar">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Planning
          </h1>
          <p className="text-slate-600 mt-1">Gestion des interventions et planification</p>
        </div>
        <button
          data-testid="add-intervention-btn"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nouvelle intervention
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
        <button onClick={() => navigateMonth(-1)} data-testid="prev-month" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h2 className="text-xl font-bold text-slate-900">
          {MONTHS_FR[m - 1]} {y}
        </h2>
        <button onClick={() => navigateMonth(1)} data-testid="next-month" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Teams legend */}
      {teams.length > 0 && (
        <div className="flex gap-3 mb-4 flex-wrap">
          {teams.map(t => (
            <span key={t.team_id} className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-200 text-sm">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }}></span>
              {t.name}
            </span>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-200">
            {DAYS_FR.map(d => (
              <div key={d} className="p-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">
                {d}
              </div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const interventions = getInterventionsForDate(day.dateStr);
              return (
                <div
                  key={idx}
                  data-testid={`calendar-day-${day.dateStr}`}
                  className={`min-h-[120px] p-2 border-b border-r border-slate-100 ${
                    !day.isCurrentMonth ? 'bg-slate-50/50' : ''
                  } ${day.isToday ? 'bg-violet-50/50' : ''}`}
                >
                  <span className={`text-sm font-medium ${
                    day.isToday ? 'bg-violet-600 text-white px-2 py-0.5 rounded-full' :
                    !day.isCurrentMonth ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    {day.date.getDate()}
                  </span>
                  <div className="mt-1 space-y-1">
                    {interventions.slice(0, 3).map(intv => {
                      const team = teams.find(t => t.team_id === intv.team_id);
                      return (
                        <div
                          key={intv.intervention_id}
                          data-testid={`intervention-${intv.intervention_id}`}
                          onClick={() => setSelectedIntervention(intv)}
                          className={`text-xs px-2 py-1 rounded-md cursor-pointer truncate border ${statusColors[intv.status] || statusColors.planifiée}`}
                          style={team ? { borderLeftColor: team.color, borderLeftWidth: '3px' } : {}}
                        >
                          <span className="font-medium">{intv.scheduled_time}</span> {intv.title}
                        </div>
                      );
                    })}
                    {interventions.length > 3 && (
                      <span className="text-xs text-slate-400">+{interventions.length - 3} autres</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Intervention detail modal */}
      {selectedIntervention && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedIntervention(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()} data-testid="intervention-detail-modal">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-900">{selectedIntervention.title}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[selectedIntervention.status]}`}>
                {selectedIntervention.status}
              </span>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="w-4 h-4" />
                {selectedIntervention.scheduled_date} à {selectedIntervention.scheduled_time} ({selectedIntervention.duration_hours}h)
              </div>
              {selectedIntervention.address && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4" />
                  {selectedIntervention.address}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Users className="w-4 h-4" />
                {selectedIntervention.lead_name} - {selectedIntervention.lead_phone}
              </div>
              {selectedIntervention.description && (
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{selectedIntervention.description}</p>
              )}
              {selectedIntervention.check_in && (
                <p className="text-xs text-green-600">Check-in: {new Date(selectedIntervention.check_in.time).toLocaleString('fr-FR')}</p>
              )}
              {selectedIntervention.check_out && (
                <p className="text-xs text-blue-600">Check-out: {new Date(selectedIntervention.check_out.time).toLocaleString('fr-FR')}</p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {selectedIntervention.status === 'planifiée' && (
                <button
                  data-testid="check-in-btn"
                  onClick={() => handleCheckInOut(selectedIntervention.intervention_id, 'check_in')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Play className="w-4 h-4" /> Check-in
                </button>
              )}
              {selectedIntervention.status === 'en_cours' && (
                <button
                  data-testid="check-out-btn"
                  onClick={() => handleCheckInOut(selectedIntervention.intervention_id, 'check_out')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <CheckCircle className="w-4 h-4" /> Check-out
                </button>
              )}
              {selectedIntervention.status !== 'annulée' && selectedIntervention.status !== 'terminée' && (
                <button
                  data-testid="cancel-intervention-btn"
                  onClick={() => handleStatusChange(selectedIntervention.intervention_id, 'annulée')}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                >
                  <XCircle className="w-4 h-4" /> Annuler
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create intervention modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Nouvelle intervention</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ID Lead *</label>
                <input
                  data-testid="intervention-lead-id"
                  value={formData.lead_id}
                  onChange={e => setFormData(p => ({...p, lead_id: e.target.value}))}
                  placeholder="lead_xxxxx"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titre *</label>
                <input
                  data-testid="intervention-title"
                  value={formData.title}
                  onChange={e => setFormData(p => ({...p, title: e.target.value}))}
                  placeholder="Nettoyage complet"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <input
                    data-testid="intervention-date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={e => setFormData(p => ({...p, scheduled_date: e.target.value}))}
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Heure</label>
                  <input
                    data-testid="intervention-time"
                    type="time"
                    value={formData.scheduled_time}
                    onChange={e => setFormData(p => ({...p, scheduled_time: e.target.value}))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Durée (heures)</label>
                <input
                  data-testid="intervention-duration"
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={formData.duration_hours}
                  onChange={e => setFormData(p => ({...p, duration_hours: parseFloat(e.target.value)}))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
                <input
                  data-testid="intervention-address"
                  value={formData.address}
                  onChange={e => setFormData(p => ({...p, address: e.target.value}))}
                  placeholder="10 Rue de la Paix, Paris"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>
              {teams.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Équipe</label>
                  <select
                    data-testid="intervention-team"
                    value={formData.team_id}
                    onChange={e => setFormData(p => ({...p, team_id: e.target.value}))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  >
                    <option value="">Sans équipe</option>
                    {teams.map(t => (
                      <option key={t.team_id} value={t.team_id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  data-testid="intervention-description"
                  value={formData.description}
                  onChange={e => setFormData(p => ({...p, description: e.target.value}))}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-medium">
                  Annuler
                </button>
                <button type="submit" data-testid="submit-intervention" className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium">
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
