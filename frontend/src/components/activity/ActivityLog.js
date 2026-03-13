import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity as ActivityIcon } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/activity?limit=100`, { withCredentials: true });
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast.error('Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      'create_lead': 'Lead créé',
      'update_lead': 'Lead mis à jour',
      'create_quote': 'Devis créé',
      'send_quote': 'Devis envoyé',
      'create_interaction': 'Interaction ajoutée',
      'create_task': 'Tâche créée',
      'complete_task': 'Tâche complétée'
    };
    return labels[action] || action;
  };

  const getActionColor = (action) => {
    if (action.includes('create')) return 'bg-blue-100 text-blue-800';
    if (action.includes('update')) return 'bg-yellow-100 text-yellow-800';
    if (action.includes('send')) return 'bg-purple-100 text-purple-800';
    if (action.includes('complete')) return 'bg-green-100 text-green-800';
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="p-4 md:p-6 lg:p-8" data-testid="activity-page">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Journal d'activite</h1>
        <p className="text-slate-600 mt-1 text-sm">Suivi de toutes les actions dans le CRM</p>
      </div>

      {/* Activity list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm" data-testid="activity-list">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-pulse bg-slate-200 rounded h-6 w-32 mx-auto"></div>
              <p className="mt-4 text-slate-600">Chargement...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <ActivityIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aucune activite enregistree</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {logs.map((log) => (
              <div
                key={log.log_id}
                data-testid={`activity-log-${log.log_id}`}
                className="p-4 md:p-6 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <ActivityIcon className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                        <p className="text-sm text-slate-600 mt-2">
                          <span className="font-medium text-slate-900">{log.entity_type}</span>
                          {' '}
                          <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                            {log.entity_id}
                          </span>
                        </p>
                      </div>
                      <span className="text-sm text-slate-500">{formatDateTime(log.created_at)}</span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs font-medium text-slate-600 mb-1">Détails:</p>
                        <pre className="text-xs text-slate-700 font-mono overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
