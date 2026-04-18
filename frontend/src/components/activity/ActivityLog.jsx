import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity as ActivityIcon, RefreshCw, Filter } from 'lucide-react';
import { formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const ACTION_CONFIG = {
  'create_lead': { label: 'Lead créé', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', emoji: '👤' },
  'update_lead': { label: 'Lead mis à jour', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', emoji: '✏️' },
  'create_quote': { label: 'Devis créé', color: '#d97706', bg: 'rgba(167,139,250,0.1)', emoji: '📄' },
  'send_quote': { label: 'Devis envoyé', color: '#c084fc', bg: 'rgba(192,132,252,0.1)', emoji: '📤' },
  'create_interaction': { label: 'Interaction', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', emoji: '💬' },
  'create_task': { label: 'Tâche créée', color: '#047857', bg: 'rgba(4,120,87,0.1)', emoji: '✅' },
  'complete_task': { label: 'Tâche complétée', color: '#047857', bg: 'rgba(4,120,87,0.1)', emoji: '🎉' },
  'create_invoice': { label: 'Facture créée', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', emoji: '🧾' },
  'payment_received': { label: 'Paiement reçu', color: '#047857', bg: 'rgba(4,120,87,0.1)', emoji: '💰' },
};

const getActionConfig = (action) => ACTION_CONFIG[action] || { 
  label: action, color: '#78716c', bg: 'rgba(148,163,184,0.1)', emoji: '📋' 
};

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/activity?limit=100`, { withCredentials: true });
      setLogs(Array.isArray(res.data) ? res.data : res.data.logs || []);
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  const filtered = filter
    ? logs.filter(l => l.action?.includes(filter) || l.entity_type?.includes(filter))
    : logs;

  const actionTypes = [...new Set(logs.map(l => l.action))].filter(Boolean);

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in" data-testid="activity-page">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ActivityIcon className="w-5 h-5 text-brand-400" />
            <h1 className="text-2xl font-bold text-neutral-100" style={{}}>Journal</h1>
          </div>
          <p className="text-neutral-500 text-sm">
            <span className="text-brand-400 font-semibold">{filtered.length}</span> activité(s) enregistrée(s)
          </p>
        </div>
        <button onClick={fetchLogs} className="p-2 rounded-lg bg-white hover:bg-neutral-50 text-neutral-400 hover:text-neutral-200 transition-all border border-neutral-100">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !filter ? 'bg-brand-600 text-white' : 'bg-white border border-neutral-200 text-neutral-400 hover:text-neutral-200'
          }`}>
          Toutes
        </button>
        {actionTypes.slice(0, 6).map(action => {
          const cfg = getActionConfig(action);
          return (
            <button key={action} onClick={() => setFilter(action === filter ? '' : action)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === action ? 'text-white' : 'bg-white border border-neutral-200 text-neutral-400 hover:text-neutral-200'
              }`}
              style={filter === action ? {background:cfg.color} : {}}>
              {cfg.emoji} {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Log list */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden" data-testid="activity-list">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-16 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ActivityIcon className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-500 font-medium">Aucune activité enregistrée</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((log, idx) => {
              const cfg = getActionConfig(log.action);
              return (
                <div key={log.log_id || idx} data-testid={`activity-log-${log.log_id}`}
                  className="flex items-start gap-4 p-4 hover:bg-neutral-100 transition-all group animate-fade-in"
                  style={{animationDelay:`${Math.min(idx * 20, 300)}ms`}}>
                  
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                    style={{background:cfg.bg}}>
                    {cfg.emoji}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          style={{color:cfg.color,background:cfg.bg}}>
                          {cfg.label}
                        </span>
                        {log.entity_type && (
                          <span className="text-xs text-neutral-500 bg-white px-2 py-0.5 rounded font-mono">
                            {log.entity_type}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-600 flex-shrink-0">{formatDateTime(log.created_at)}</span>
                    </div>
                    
                    {log.entity_id && (
                      <p className="text-xs text-neutral-500 font-mono mb-1 truncate">
                        ID: {log.entity_id}
                      </p>
                    )}

                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 p-2.5 bg-black/20 rounded-lg border border-neutral-100">
                        <pre className="text-[10px] text-neutral-400 font-mono overflow-x-auto leading-relaxed">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
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

export default ActivityLog;
