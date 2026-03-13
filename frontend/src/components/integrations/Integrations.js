import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Webhook, Calendar, MessageCircle, Code, Plus, Trash2, ToggleLeft, ToggleRight, Copy, ExternalLink, Clock, CheckCircle, XCircle, Mail, Settings, Link2, RefreshCw, Globe } from 'lucide-react';
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
      toast.success('Webhook cree'); setShowForm(false);
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
      toast.success('Webhook supprime'); fetchData();
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
          <p className="text-sm text-slate-500">Envoyez des donnees automatiquement vers vos outils</p>
        </div>
        <button data-testid="add-webhook-btn" onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> Nouveau webhook
        </button>
      </div>

      {webhooks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Webhook className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun webhook configure</p>
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
            <span>Declenche {wh.trigger_count || 0} fois</span>
            {wh.last_triggered && <span>Dernier: {formatDateTime(wh.last_triggered)}</span>}
            <button onClick={() => fetchLogs(wh.webhook_id)} className="text-violet-600 hover:underline">Voir les logs</button>
          </div>
        </div>
      ))}

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
                <label className="block text-sm font-medium text-slate-700 mb-2">Evenements</label>
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
                <button type="submit" data-testid="submit-webhook" className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">Creer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============= Google Calendar Tab =============
const CalendarTab = () => {
  const [gcalStatus, setGcalStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  const calendarUrl = `${process.env.REACT_APP_BACKEND_URL}/api/calendar/ical`;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/gcal/status`, { withCredentials: true });
      setGcalStatus(res.data);
    } catch {
      setGcalStatus({ connected: false, configured: false });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Handle redirect after OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gcal') === 'connected') {
      toast.success('Google Calendar connecte avec succes !');
      window.history.replaceState({}, '', '/integrations');
      fetchStatus();
    }
  }, [fetchStatus]);

  const connectGCal = async () => {
    try {
      const res = await axios.get(`${API_URL}/gcal/auth/login`, { withCredentials: true });
      window.location.href = res.data.authorization_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur de connexion');
    }
  };

  const disconnectGCal = async () => {
    if (!window.confirm('Deconnecter Google Calendar ?')) return;
    try {
      await axios.post(`${API_URL}/gcal/disconnect`, {}, { withCredentials: true });
      toast.success('Google Calendar deconnecte');
      fetchStatus();
    } catch { toast.error('Erreur'); }
  };

  const syncAll = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`${API_URL}/gcal/sync-all`, {}, { withCredentials: true });
      toast.success(`${res.data.synced} interventions synchronisees`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur de synchronisation');
    }
    setSyncing(false);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(calendarUrl);
    toast.success('URL copiee !');
  };

  if (loading) return <div className="text-center py-8 text-slate-400">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Google Calendar</h2>
        <p className="text-sm text-slate-500">Synchronisez vos interventions avec Google Calendar</p>
      </div>

      {/* OAuth Connection Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm" data-testid="gcal-oauth-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-slate-900 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-violet-600" />
            Connexion Google Calendar (OAuth)
          </h3>
          {gcalStatus?.connected && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5" /> Connecte
            </span>
          )}
        </div>

        {gcalStatus?.connected ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Votre compte Google Calendar est connecte. Les interventions peuvent etre synchronisees automatiquement.
            </p>
            <div className="flex gap-3">
              <button data-testid="gcal-sync-all" onClick={syncAll} disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Synchronisation...' : 'Synchroniser toutes les interventions'}
              </button>
              <button onClick={disconnectGCal}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium">
                Deconnecter
              </button>
            </div>
          </div>
        ) : gcalStatus?.configured ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Connectez votre compte Google pour synchroniser les interventions avec votre calendrier.
            </p>
            <button data-testid="gcal-connect-btn" onClick={connectGCal}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-lg hover:border-violet-400 hover:text-violet-700 transition-all text-sm font-medium">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Connecter Google Calendar
            </button>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Configuration requise :</strong> Les cles API Google (GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET) ne sont pas encore configurees. Contactez l'administrateur.
            </p>
          </div>
        )}
      </div>

      {/* iCal Fallback */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-violet-600" />
          Lien d'abonnement iCal (alternatif)
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Ajoutez ce lien dans n'importe quelle app de calendrier pour un flux en lecture seule.
        </p>
        <div className="flex gap-2">
          <input data-testid="ical-url" value={calendarUrl} readOnly
            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono" />
          <button data-testid="copy-ical-url" onClick={copyUrl}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium">
            <Copy className="w-4 h-4" /> Copier
          </button>
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 text-sm mb-2">Comment synchroniser manuellement ?</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
            <li>Ouvrez Google Calendar</li>
            <li>Cliquez sur "+" a cote de "Autres agendas"</li>
            <li>Selectionnez "A partir d'une URL"</li>
            <li>Collez l'URL ci-dessus et validez</li>
          </ol>
        </div>
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

  const whatsappNumber = '0622665308';
  const directLink = `https://wa.me/33622665308`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">WhatsApp Business</h2>
        <p className="text-sm text-slate-500">Templates de messages et envoi direct via WhatsApp</p>
      </div>

      {/* Direct Contact Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-600" />
          Contact direct WhatsApp
        </h3>
        <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">Numero : {whatsappNumber}</p>
            <p className="text-xs text-green-700 mt-1">Les clients peuvent contacter directement via WhatsApp</p>
          </div>
          <a href={directLink} target="_blank" rel="noopener noreferrer" data-testid="wa-direct-link"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
            <ExternalLink className="w-4 h-4" /> Ouvrir WhatsApp
          </a>
        </div>
      </div>

      {/* Templates */}
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
      toast.success('Code copie !');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Widget de Tracking</h2>
        <p className="text-sm text-slate-500">Installez le tracking sur globalcleanhome.com</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
          <Code className="w-5 h-5 text-violet-600" />
          Code d'installation pour globalcleanhome.com
        </h3>
        <p className="text-sm text-slate-500 mb-4">{snippet?.description}</p>

        <div className="relative">
          <pre className="bg-slate-900 text-green-400 rounded-lg p-4 text-sm overflow-x-auto font-mono">
            {snippet?.snippet || 'Chargement...'}
          </pre>
          <button data-testid="copy-tracking-snippet" onClick={copySnippet}
            className="absolute top-3 right-3 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
            <Copy className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-medium text-amber-900 text-sm mb-2 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Instructions pour globalcleanhome.com
          </h4>
          <ol className="text-sm text-amber-800 space-y-2 list-decimal pl-4">
            <li>Copiez le code ci-dessus</li>
            <li>Connectez-vous a l'administration de votre site web</li>
            <li>Allez dans la section <strong>"En-tete"</strong> ou <strong>"Header Scripts"</strong></li>
            <li>Collez le script juste avant la balise <code className="bg-amber-100 px-1 rounded">&lt;/head&gt;</code></li>
            <li>Enregistrez les modifications</li>
          </ol>
          <p className="text-xs text-amber-700 mt-3">Le script collectera automatiquement les visites, clics, et soumissions de formulaires.</p>
        </div>

        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-900 text-sm mb-2">Ce qui est tracke</h4>
          <ul className="text-sm text-green-800 space-y-1 list-disc pl-4">
            <li>Pages visitees et temps passe</li>
            <li>Clics sur boutons et liens</li>
            <li>Soumissions de formulaires</li>
            <li>Profondeur de scroll</li>
            <li>Parametres UTM (source, campagne...)</li>
            <li>Informations appareil</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ============= Email Tab (Gmail) =============
const EmailTab = () => {
  const [gmailStatus, setGmailStatus] = useState(null);
  const [emailStats, setEmailStats] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/gmail/status`, { withCredentials: true }),
        axios.get(`${API_URL}/emails/stats`, { withCredentials: true }).catch(() => ({ data: {} })),
      ]);
      setGmailStatus(statusRes.data);
      setEmailStats(statsRes.data);
    } catch {
      setGmailStatus({ connected: false });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail') === 'connected') {
      toast.success('Gmail connecte avec succes !');
      window.history.replaceState({}, '', '/integrations');
      fetchStatus();
    }
  }, [fetchStatus]);

  const connectGmail = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/google`, { withCredentials: true });
      window.location.href = res.data.authorization_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur de connexion');
    }
  };

  const disconnectGmail = async () => {
    if (!window.confirm('Deconnecter Gmail ?')) return;
    try {
      await axios.post(`${API_URL}/gmail/disconnect`, {}, { withCredentials: true });
      toast.success('Gmail deconnecte');
      fetchStatus();
    } catch { toast.error('Erreur'); }
  };

  const syncEmails = async () => {
    setSyncing(true);
    try {
      const res = await axios.get(`${API_URL}/gmail/sync`, { withCredentials: true });
      toast.success(`${res.data.synced} email(s) synchronise(s)`);
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur de synchronisation');
    }
    setSyncing(false);
  };

  const checkFollowups = async () => {
    try {
      const res = await axios.get(`${API_URL}/automations/check-followups`, { withCredentials: true });
      toast.success(`${res.data.sent} relance(s) envoyee(s), ${res.data.skipped} ignoree(s)`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };

  if (loading) return <div className="text-center py-8 text-sm text-slate-400">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Gmail</h2>
        <p className="text-sm text-slate-500">Envoi et reception d'emails via votre compte Gmail</p>
      </div>

      {/* Gmail Connection Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm" data-testid="gmail-status-card">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h3 className="font-medium text-slate-900 flex items-center gap-2 min-w-0">
            <Mail className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="truncate">Connexion Gmail</span>
          </h3>
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
            gmailStatus?.connected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {gmailStatus?.connected ? (
              <><CheckCircle className="w-3.5 h-3.5" /> Connecte</>
            ) : (
              <><Clock className="w-3.5 h-3.5" /> Non connecte</>
            )}
          </span>
        </div>

        {gmailStatus?.connected ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                Gmail connecte : <strong className="break-all">{gmailStatus.email}</strong>
              </p>
              <p className="text-xs text-green-600 mt-1">
                Connecte depuis {gmailStatus.since ? new Date(gmailStatus.since).toLocaleDateString('fr-FR') : ''}
              </p>
            </div>

            {/* Stats */}
            {emailStats && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-slate-900">{emailStats.total_sent || 0}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Envoyes</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-slate-900">{emailStats.total_received || 0}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Recus</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-slate-900">{emailStats.total_followups || 0}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Relances</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button data-testid="gmail-sync-btn" onClick={syncEmails} disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Synchronisation...' : 'Synchroniser la boite'}
              </button>
              <button data-testid="gmail-followup-btn" onClick={checkFollowups}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                <Clock className="w-4 h-4" />
                Verifier relances J+2
              </button>
              <button onClick={disconnectGmail}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium">
                Deconnecter
              </button>
            </div>

            {/* Features */}
            <div className="text-sm text-slate-600">
              <p className="font-medium mb-2">Fonctionnalites actives :</p>
              <ul className="space-y-1.5 list-disc pl-4 text-xs">
                <li>Envoi de devis et factures par email</li>
                <li>Reception et matching automatique des reponses aux leads</li>
                <li>Relance automatique J+2 sans reponse</li>
                <li>Historique complet des emails par lead</li>
                <li>Notifications push sur email recu</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Connectez votre compte Gmail pour envoyer et recevoir des emails directement depuis le CRM.
            </p>
            <button data-testid="gmail-connect-btn" onClick={connectGmail}
              className="flex items-center gap-3 px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-lg hover:border-red-300 hover:text-red-600 transition-all text-sm font-medium">
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Connecter Gmail (contact@globalcleanhome.com)
            </button>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 text-sm mb-2">Comment ca marche ?</h4>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal pl-4">
                <li>Cliquez sur "Connecter Gmail"</li>
                <li>Autorisez l'acces a votre compte Google</li>
                <li>Les emails seront envoyes depuis contact@globalcleanhome.com</li>
                <li>Les reponses des clients sont automatiquement synchronisees</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============= Main Integrations Page =============
const Integrations = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: Settings },
    { id: 'email', label: 'Gmail', icon: Mail },
    { id: 'calendar', label: 'Google Calendar', icon: Calendar },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'tracking', label: 'Widget Tracking', icon: Code },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8" data-testid="integrations-page">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Integrations
        </h1>
        <p className="text-slate-600 mt-1 text-sm">Connectez votre CRM a vos outils externes</p>
      </div>

      <div className="flex gap-1.5 sm:gap-2 mb-6 md:mb-8 flex-wrap" data-testid="integration-tabs">
        {tabs.map(tab => (
          <button key={tab.id} data-testid={`tab-${tab.id}`} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab onNavigate={setActiveTab} />}
      {activeTab === 'email' && <EmailTab />}
      {activeTab === 'calendar' && <CalendarTab />}
      {activeTab === 'whatsapp' && <WhatsAppTab />}
      {activeTab === 'webhooks' && <WebhooksTab />}
      {activeTab === 'tracking' && <TrackingTab />}
    </div>
  );
};

// ============= Overview Tab =============
const OverviewTab = ({ onNavigate }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API_URL}/settings/integrations`, { withCredentials: true });
        setStatus(res.data);
      } catch { setStatus(null); }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="text-center py-8 text-slate-400">Chargement...</div>;

  const integrations = [
    {
      id: 'email',
      name: 'Gmail',
      icon: Mail,
      configured: status?.gmail?.connected || status?.gmail?.configured,
      description: 'Envoi et reception d\'emails via votre compte Gmail',
      color: 'red',
    },
    {
      id: 'calendar',
      name: 'Google Calendar',
      icon: Calendar,
      configured: status?.google_calendar?.configured,
      description: 'Synchronisation des interventions avec Google Calendar',
      color: 'red',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      configured: status?.whatsapp?.configured,
      description: `Contact direct WhatsApp (${status?.whatsapp?.number || ''})`,
      color: 'green',
    },
    {
      id: 'webhooks',
      name: 'Zapier / Make',
      icon: Webhook,
      configured: status?.zapier_webhooks?.configured,
      description: 'Webhooks pour automatiser vos workflows',
      color: 'violet',
    },
    {
      id: 'tracking',
      name: 'Widget Tracking',
      icon: Code,
      configured: status?.tracking_widget?.configured,
      description: 'Suivi des visiteurs sur globalcleanhome.com',
      color: 'amber',
    },
  ];

  const stripeMode = status?.stripe?.mode;

  return (
    <div className="space-y-6">
      {/* Stripe Status Banner */}
      <div className={`rounded-xl p-5 border ${stripeMode === 'live' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stripeMode === 'live' ? 'bg-green-100' : 'bg-amber-100'}`}>
            <Settings className={`w-5 h-5 ${stripeMode === 'live' ? 'text-green-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <p className={`font-medium text-sm ${stripeMode === 'live' ? 'text-green-900' : 'text-amber-900'}`}>
              Stripe : mode {stripeMode === 'live' ? 'production' : 'test'}
            </p>
            <p className={`text-xs ${stripeMode === 'live' ? 'text-green-700' : 'text-amber-700'}`}>
              {stripeMode === 'live' ? 'Les paiements reels sont actifs' : 'Les paiements sont en mode test. Fournissez vos cles de production pour activer.'}
            </p>
          </div>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map(intg => (
          <button key={intg.id} data-testid={`overview-${intg.id}`} onClick={() => onNavigate(intg.id)}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm text-left hover:border-violet-300 hover:shadow-md transition-all group">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${intg.color}-100 group-hover:bg-${intg.color}-200 transition-colors`}>
                <intg.icon className={`w-5 h-5 text-${intg.color}-600`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 text-sm">{intg.name}</h3>
                  <span className={`w-2.5 h-2.5 rounded-full ${intg.configured ? 'bg-green-400' : 'bg-amber-400'}`} />
                </div>
                <p className="text-xs text-slate-500 mt-1">{intg.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Integrations;
