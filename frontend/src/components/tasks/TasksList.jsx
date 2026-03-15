import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckSquare, Plus, Clock, CheckCircle, Circle, AlertCircle, Calendar, Trash2 } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const PRIORITY_CONFIG = {
  high: { label: 'Haute', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
  medium: { label: 'Moyenne', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  low: { label: 'Basse', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
};

const TasksList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [newTask, setNewTask] = useState({ title: '', type: 'rappel', due_date: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchTasks(); }, [filter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await axios.get(`${API_URL}/tasks${params}`, { withCredentials: true });
      setTasks(Array.isArray(res.data) ? res.data : res.data.tasks || []);
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  const handleComplete = async (taskId) => {
    try {
      await axios.patch(`${API_URL}/tasks/${taskId}`, { status: 'completed' }, { withCredentials: true });
      toast.success('Tâche complétée ✓');
      fetchTasks();
    } catch { toast.error('Erreur'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    try {
      await axios.post(`${API_URL}/tasks`, newTask, { withCredentials: true });
      toast.success('Tâche créée');
      setNewTask({ title: '', type: 'rappel', due_date: '' });
      setShowForm(false);
      fetchTasks();
    } catch { toast.error('Erreur lors de la création'); }
  };

  const pending = tasks.filter(t => t.status === 'pending').length;
  const completed = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Tâches</h1>
          </div>
          <p className="text-slate-500 text-sm">
            <span className="text-amber-400 font-semibold">{pending}</span> en cours · <span className="text-green-400 font-semibold">{completed}</span> complétées
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-all text-sm font-medium"
          style={{boxShadow:'0 0 15px rgba(139,92,246,0.25)'}}>
          <Plus className="w-4 h-4" /> Nouvelle tâche
        </button>
      </div>

      {/* New task form */}
      {showForm && (
        <div className="section-card p-4 mb-4 animate-fade-in">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Nouvelle tâche</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <input type="text" placeholder="Titre de la tâche..."
              value={newTask.title} onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
            <div className="flex gap-3">
              <select value={newTask.type} onChange={(e) => setNewTask({...newTask, type: e.target.value})}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500">
                <option value="rappel" className="bg-slate-800">📞 Rappel</option>
                <option value="email" className="bg-slate-800">📧 Email</option>
                <option value="visite" className="bg-slate-800">🏠 Visite</option>
                <option value="devis" className="bg-slate-800">📄 Devis</option>
              </select>
              <input type="datetime-local" value={newTask.due_date}
                onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all">
                Créer
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg text-sm transition-all">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: 'pending', label: '⏳ En cours' },
          { value: 'completed', label: '✓ Complétées' },
          { value: 'all', label: 'Toutes' },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f.value ? 'bg-violet-600 text-white' : 'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Tasks list */}
      <div className="section-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <CheckSquare className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucune tâche</p>
            <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all">
              + Créer une tâche
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {tasks.map((task) => (
              <div key={task.task_id} className={`flex items-start gap-4 p-4 hover:bg-white/3 transition-all group ${task.status === 'completed' ? 'opacity-50' : ''}`}>
                <button onClick={() => task.status !== 'completed' && handleComplete(task.task_id)}
                  className="mt-0.5 flex-shrink-0 transition-all hover:scale-110">
                  {task.status === 'completed'
                    ? <CheckCircle className="w-5 h-5 text-green-400" />
                    : <Circle className="w-5 h-5 text-slate-600 hover:text-violet-400" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400">{task.type}</span>
                    </div>
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-500 mt-1 truncate">{task.description}</p>
                  )}
                  {task.due_date && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Calendar className="w-3 h-3 text-slate-600" />
                      <span className="text-xs text-slate-500">{formatDateTime(task.due_date)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksList;
