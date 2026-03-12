import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Webhook, Calendar, MessageCircle, Code, Plus, Trash2, ToggleLeft, ToggleRight, Copy, ExternalLink, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '../../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// ============= Webhooks Tab =============
const WebhooksTab = () => {
  const [webhooks, setWebhooks] = useState([]);
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', events: [] });
  const [selectedWh, setSelectedWh] = useState(null);
  const [logs, setLogs] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [whRes, evRes] = await Promise.all([
        axios.get(`${API_URL}/webhooks`, { withCredentials: true }),
        axios.get(`${API_URL}/webhooks/events`, { withCredentials: true }),
      ]);
      setWebhooks(whRes.data);
      setEvents(evRes.data.events);
    } catch { toast.error('Erreur de chargement'); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchLogs = async (whId) => {
    try {
      const res = await axios.get(`${API_URL}/webhooks/${whId}/logs`, { withCredentials: true });
      setLogs(res.data);
      setSelectedWh(whId);
    } catch { toast.error('Erreur'); }
  };

  const createWebhook = async (e) => {
    e.preventDefault();
    if (!form.name || !form.url || form.events.length === 0) {
      toast.error('Remplissez tous les champs'); return;
    }
    try {
      await axios.post(`${API_URL}/webhooks`, form, { withCredentials: true });
      toast.success('Webhook créé'); setShowForm(false);
      setForm({ name: '', url: '', events: [] }); fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  const toggleWebhook = async (wh) => {
    try {
      await axios.patch(`${API_URL}/webhooks/${wh.webhook_id}`, { active: !wh.active }, { withCredentials: true });
      fetchData();
    } catch { toast.error('Erreur'); }
  };

  const deleteWebhook = async (whId) => {
    if (!window.confirm('Supprimer ce webhook ?')) return;
    try {
      await axios.delete(`${API_URL}/webhooks/${whId}`, { withCredentials: true });
      toast.success('Webhook supprimé'); fetchData();
    } catch { toast.error('Erreur'); }
  };

  const toggleEvent = (ev) => {
    setForm(p => ({
      ...p,
      events: p.events.includes(ev) ? p.events.filter(e => e !== ev) : [...p.events, ev],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Webhooks (Zapier / Make)</h2>
          <p className="text-sm text-slate-500">Envoyez des données automatiquement vers vos outils</p>
        </div>
        <button data-testid="add-webhook-btn" onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> Nouveau webhook
        </button>
      </div>

      {/* Webhook list */}
      {webhooks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Webhook className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun webhook configuré</p>
        </div>
      ) : webhooks.map(wh => (
        <div key={wh.webhook_id} data-testid={`webhook-${wh.webhook_id}`}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">{wh.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${wh.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                  {wh.active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <p className="text-sm text-slate-500 font-mono mt-1 break-all">{wh.url}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleWebhook(wh)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                {wh.active ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
              </button>
              <button onClick={() => deleteWebhook(wh.webhook_id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {wh.events.map(ev => (
              <span key={ev} className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded text-xs font-medium">{ev}</span>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Déclenché {wh.trigger_count || 0} fois</span>
            {wh.last_triggered && <span>Dernier: {formatDateTime(wh.last_triggered)}</span>}
            <button onClick={() => fetchLogs(wh.webhook_id)} className="text-violet-600 hover:underline">Voir les logs</button>
          </div>
        </div>
      ))}

      {/* Logs modal */}
      {selectedWh && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedWh(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Logs de livraison</h3>
            {logs.length === 0 ? <p className="text-slate-400 text-center py-4">Aucun log</p> : (
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.log_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {log.status === 'delivered' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                      <div>
                        <p className="text-sm font-medium text-slate-900">{log.event_type}</p>
                        <p className="text-xs text-slate-400">{formatDateTime(log.timestamp)}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      log.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>{log.response_code || log.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Nouveau webhook</h3>
            <form onSubmit={createWebhook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                <input data-testid="webhook-name" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
                  placeholder="Mon webhook Zapier" required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL du webhook</label>
                <input data-testid="webhook-url" value={form.url} onChange={e => setForm(p => ({...p, url: e.target.value}))}
                  placeholder="https://hooks.zapier.com/..." required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Événements</label>
                <div className="flex flex-wrap gap-2">
                  {events.map(ev => (
                    <button key={ev} type="button" onClick={() => toggleEvent(ev)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        form.events.includes(ev) ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>{ev}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg">Annuler</button>
                <button type="submit" data-testid="submit-webhook" className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============= Calendar Sync Tab =============
const CalendarTab = () => {
  const [snippet, setSnippet] = useState(null);

  const fetchSnippet = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/widget/snippet`, { withCredentials: true });
      setSnippet(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchSnippet(); }, [fetchSnippet]);

  const calendarUrl = `${process.env.REACT_APP_BACKEND_URL}/api/calendar/ical`;

  const copyUrl = () => {
    navigator.clipboard.writeText(calendarUrl);
    toast.success('URL copiée !');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Google Calendar</h2>
        <p className="text-sm text-slate-500">Synchronisez vos interventions avec Google Calendar</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-violet-600" />
          Lien d'abonnement iCal
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Ajoutez ce lien dans Google Calendar pour synchroniser automatiquement les interventions.
        </p>
        <div className="flex gap-2">
          <input
            data-testid="ical-url"
            value={calendarUrl}
            readOnly
            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono"
          />
          <button
            data-testid="copy-ical-url"
            onClick={copyUrl}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium"
          >
            <Copy className="w-4 h-4" /> Copier
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 text-sm mb-2">Comment synchroniser ?</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
            <li>Ouvrez Google Calendar</li>
            <li>Cliquez sur "+" à côté de "Autres agendas"</li>
            <li>Sélectionnez "À partir d'une URL"</li>
            <li>Collez l'URL ci-dessus et validez</li>
          </ol>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-violet-600" />
          Télécharger le fichier .ics
        </h3>
        <a
          href={calendarUrl}
          data-testid="download-ics"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
        >
          <Calendar className="w-4 h-4" /> Télécharger (.ics)
        </a>
      </div>
    </div>
  );
};

// ============= WhatsApp Tab =============
const WhatsAppTab = () => {
  const [templates, setTemplates] = useState({});

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/whatsapp/templates`, { withCredentials: true });
      setTemplates(res.data.templates || {});
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">WhatsApp Business</h2>
        <p className="text-sm text-slate-500">Templates de messages et envoi direct via WhatsApp</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-medium text-slate-900 mb-4">Templates disponibles</h3>
        <div className="space-y-3">
          {Object.entries(templates).map(([key, text]) => (
            <div key={key} data-testid={`wa-template-${key}`} className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-violet-700">{key}</span>
              </div>
              <p className="text-sm text-slate-700">{text}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-4">
          Pour envoyer un message WhatsApp, ouvrez la fiche d'un lead et utilisez le bouton WhatsApp.
        </p>
      </div>
    </div>
  );
};

// ============= Tracking Widget Tab =============
const TrackingTab = () => {
  const [snippet, setSnippet] = useState(null);

  const fetchSnippet = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/widget/snippet`, { withCredentials: true });
      setSnippet(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchSnippet(); }, [fetchSnippet]);

  const copySnippet = () => {
    if (snippet?.snippet) {
      navigator.clipboard.writeText(snippet.snippet);
      toast.success('Code copié !');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Widget de Tracking</h2>
        <p className="text-sm text-slate-500">Installez le tracking sur votre site web</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
          <Code className="w-5 h-5 text-violet-600" />
          Code d'installation
        </h3>
        <p className="text-sm text-slate-500 mb-4">{snippet?.description}</p>

        <div className="relative">
          <pre className="bg-slate-900 text-green-400 rounded-lg p-4 text-sm overflow-x-auto font-mono">
            {snippet?.snippet || 'Chargement...'}
          </pre>
          <button
            data-testid="copy-tracking-snippet"
            onClick={copySnippet}
            className="absolute top-3 right-3 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-900 text-sm mb-2">Ce qui est tracké</h4>
          <ul className="text-sm text-green-800 space-y-1 list-disc pl-4">
            <li>Pages visitées et temps passé</li>
            <li>Clics sur boutons et liens</li>
            <li>Soumissions de formulaires</li>
            <li>Profondeur de scroll</li>
            <li>Paramètres UTM (source, campagne...)</li>
            <li>Informations appareil</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ============= Main Integrations Page =============
const Integrations = () => {
  const [activeTab, setActiveTab] = useState('webhooks');

  const tabs = [
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'calendar', label: 'Google Calendar', icon: Calendar },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'tracking', label: 'Widget Tracking', icon: Code },
  ];

  return (
    <div className="p-8" data-testid="integrations-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Intégrations
        </h1>
        <p className="text-slate-600 mt-1">Connectez votre CRM à vos outils externes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8" data-testid="integration-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'webhooks' && <WebhooksTab />}
      {activeTab === 'calendar' && <CalendarTab />}
      {activeTab === 'whatsapp' && <WhatsAppTab />}
      {activeTab === 'tracking' && <TrackingTab />}
    </div>
  );
};

export default Integrations;
