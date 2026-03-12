import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle, Clock, Calendar } from 'lucide-react';
import { formatDateTime, getStatusColor, getStatusLabel } from '../../lib/utils';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const TasksList = () => {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const response = await axios.get(`${API_URL}/tasks${params}`, { withCredentials: true });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Erreur lors du chargement des tâches');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId, e) => {
    e.stopPropagation();
    try {
      await axios.patch(`${API_URL}/tasks/${taskId}/complete`, {}, { withCredentials: true });
      toast.success('Tâche complétée');
      fetchTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Erreur lors de la complétion de la tâche');
    }
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="p-8" data-testid="tasks-page">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Tâches</h1>
          <p className="text-slate-600 mt-1">{tasks.length} tâche(s) trouvée(s)</p>
        </div>
        <div className="flex gap-2" data-testid="filter-selector">
          <button
            data-testid="filter-pending"
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-violet-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            En attente
          </button>
          <button
            data-testid="filter-completed"
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-violet-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Complétées
          </button>
          <button
            data-testid="filter-all"
            onClick={() => setFilter('')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === ''
                ? 'bg-violet-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Toutes
          </button>
        </div>
      </div>

      {/* Tasks list */}
      <div className="space-y-4" data-testid="tasks-list">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Chargement...</p>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aucune tâche trouvée</p>
          </div>
        ) : (
          tasks.map((task) => {
            const overdue = task.status === 'pending' && isOverdue(task.due_date);
            
            return (
              <div
                key={task.task_id}
                data-testid={`task-item-${task.task_id}`}
                className={`bg-white rounded-xl border p-6 shadow-sm hover:shadow-md transition-all ${
                  overdue ? 'border-rose-300 bg-rose-50' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    data-testid={`complete-task-button-${task.task_id}`}
                    onClick={(e) => handleCompleteTask(task.task_id, e)}
                    disabled={task.status === 'completed'}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 mt-1 ${
                      task.status === 'completed'
                        ? 'bg-green-500 border-green-500'
                        : 'border-slate-300 hover:border-violet-600'
                    }`}
                  >
                    {task.status === 'completed' && <CheckCircle className="w-4 h-4 text-white" />}
                  </button>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className={`font-semibold text-lg ${
                          task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'
                        }`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.type)}`}>
                        {task.type}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className={`w-4 h-4 ${
                          overdue ? 'text-rose-600' : 'text-slate-400'
                        }`} />
                        <span className={overdue ? 'text-rose-600 font-medium' : 'text-slate-600'}>
                          {overdue ? 'En retard: ' : 'Échéance: '}
                          {formatDateTime(task.due_date)}
                        </span>
                      </div>
                      {task.status === 'completed' && task.completed_at && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-slate-600">
                            Complétée le {formatDateTime(task.completed_at)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TasksList;
