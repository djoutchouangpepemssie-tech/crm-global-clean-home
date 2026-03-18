import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, FileText, MessageSquare, Plus, Send, ArrowUpRight, ArrowDownLeft, User, Tag, TrendingUp, Clock, CheckCircle, XCircle, Zap, Star, Brain, Activity, Target, AlertTriangle, Sparkles } from 'lucide-react';
import { formatDateTime, formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const STATUS_CONFIG = {
  'nouveau': { label: 'Nouveau', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
  'contacté': { label: 'Contacté', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
  'contacte': { label: 'Contacté', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
  'en_attente': { label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  'devis_envoyé': { label: 'Devis envoyé', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  'gagné': { label: 'Gagné', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
  'gagne': { label: 'Gagné', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
  'perdu': { label: 'Perdu', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.2)' },
};

const INTERACTION_ICONS = {
  'note': '📝',
  'appel': '📞',
  'email': '📧',
  'relance': '🔔',
  'email_sent': '📤',
  'email_received': '📩',
  'auto_followup': '🤖',
};

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newInteraction, setNewInteraction] = useState({ type: 'note', content: '' });
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(null);
  const [activeTab, setActiveTab] = useState('interactions');
  const [tasks, setTasks] = useState([]);
  const [aiScore, setAiScore] = useState(null);
  const [scoringLoading, setScoringLoading] = useState(false);

  const fetchLeadData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadRes, interactionsRes, quotesRes, emailsRes, tasksRes] = await Promise.all([
        axios.get(`${API_URL}/leads/${id}`, { withCredentials: true }),
        axios.get(`${API_URL}/interactions?lead_id=${id}`, { withCredentials: true }),
        axios.get(`${API_URL}/quotes?lead_id=${id}`, { withCredentials: true }),
        axios.get(`${API_URL}/emails/lead/${id}`, { withCredentials: true }).catch(() => ({ data: { emails: [] } })),
        axios.get(`${API_URL}/tasks?lead_id=${id}`, { withCredentials: true }).catch(() => ({ data: [] })),
      ]);
      setLead(leadRes.data);
      setInteractions(interactionsRes.data);
      setQuotes(quotesRes.data);
      setEmails(emailsRes.data.emails || []);
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data.filter(t => t.lead_id === id) : []);
    } catch {
      toast.error('Erreur lors du chargement du lead');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchLeadData(); }, [fetchLeadData]);

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await axios.patch(`${API_URL}/leads/${id}`, { status: newStatus }, { withCredentials: true });
      setLead({ ...lead, status: newStatus });
      toast.success('Statut mis à jour');
    } catch { toast.error('Erreur lors de la mise à jour'); } 
    finally { setUpdatingStatus(false); }
  };

  const handleAddInteraction = async (e) => {
    e.preventDefault();
    if (!newInteraction.content.trim()) return;
    try {
      await axios.post(`${API_URL}/interactions`, { lead_id: id, ...newInteraction }, { withCredentials: true });
      toast.success('Interaction ajoutée');
      setNewInteraction({ type: 'note', content: '' });
      fetchLeadData();
    } catch { toast.error('Erreur lors de l\'ajout'); }
  };

  const handleSendQuote = async (quoteId) => {
    setSendingQuote(quoteId);
    try {
      const res = await axios.post(`${API_URL}/quotes/${quoteId}/send`, {}, { withCredentials: true });
      toast.success(res.data.email_sent ? 'Devis envoyé par email ✓' : 'Devis marqué comme envoyé');
      fetchLeadData();
    } catch { toast.error('Erreur lors de l\'envoi'); }
    finally { setSendingQuote(null); }
  };

  if (loading) {
    return (
      <div className="p-6 animate-fade-in">
        <div className="skeleton h-8 w-32 mb-6 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="skeleton h-48 rounded-xl" />
            <div className="skeleton h-64 rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="skeleton h-48 rounded-xl" />
            <div className="skeleton h-32 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!lead) return (
    <div className="p-8 text-center text-slate-500">
      <p>Lead introuvable</p>
      <button onClick={() => navigate('/leads')} className="mt-4 text-violet-400 hover:text-violet-300 text-sm">← Retour aux leads</button>
    </div>
  );

  const statusStyle = STATUS_CONFIG[lead.status] || STATUS_CONFIG['nouveau'];
  const statusOptions = ['nouveau','contacté','en_attente','devis_envoyé','gagné','perdu'];

  return (
    <div className="p-4 md:p-6 lg:p-8 pb-24 md:pb-8 animate-fade-in" data-testid="lead-detail-page">
      
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/leads')} data-testid="back-button"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 mb-4 transition-colors text-sm group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Retour aux leads
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-xl flex-shrink-0"
              style={{boxShadow:'0 0 20px rgba(139,92,246,0.15)'}}>
              {(lead.name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>{lead.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-500">{lead.service_type}</span>
                <span className="text-slate-700">·</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{color: statusStyle.color, background: statusStyle.bg, border: `1px solid ${statusStyle.border}`}}>
                  {statusStyle.label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status selector */}
            <select value={lead.status} onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus} data-testid="status-select"
              className="px-3 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer">
              {statusOptions.map(s => (
                <option key={s} value={s} className="bg-slate-800">{STATUS_CONFIG[s]?.label || s}</option>
              ))}
            </select>

            <button onClick={async () => {
              try {
                const res = await axios.post(`${API_URL}/whatsapp/send`, {
                  lead_id: lead.lead_id,
                  message: `Bonjour ${lead.name}, merci pour votre demande. Notre équipe vous contactera rapidement. - Global Clean Home`,
                }, { withCredentials: true });
                window.open(res.data.whatsapp_link, '_blank');
                toast.success('WhatsApp ouvert');
              } catch { toast.error('Erreur WhatsApp'); }
            }}
              data-testid="whatsapp-button"
              className="flex items-center gap-1.5 px-3 py-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-400 rounded-lg transition-all text-sm font-medium">
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </button>

            <button onClick={() => navigate('/quotes/new', { state: { lead } })}
              data-testid="create-quote-button"
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-all text-sm font-medium"
              style={{boxShadow:'0 0 15px rgba(139,92,246,0.25)'}}>
              <FileText className="w-4 h-4" />
              Créer un devis
            </button>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-slate-500">Score</span>
          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-xs">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${lead.score || 50}%`,
                background: lead.score >= 70 ? '#34d399' : lead.score >= 40 ? '#f59e0b' : '#f43f5e'
              }} />
          </div>
          <span className="text-xs font-semibold" style={{color: lead.score >= 70 ? '#34d399' : lead.score >= 40 ? '#f59e0b' : '#f43f5e'}}>
            {lead.score || 50}/100
          </span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs text-slate-500">{lead.probability || 50}% probabilité</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left - Main content */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Contact info */}
          <div className="section-card p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-violet-400" /> Informations de contact
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Mail, label: 'Email', value: lead.email, href: `mailto:${lead.email}` },
                { icon: Phone, label: 'Téléphone', value: lead.phone, href: `tel:${lead.phone}` },
                lead.address && { icon: MapPin, label: 'Adresse', value: lead.address },
                { icon: Calendar, label: 'Créé le', value: formatDateTime(lead.created_at) },
              ].filter(Boolean).map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/3 hover:bg-white/5 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} className="text-sm text-violet-400 hover:text-violet-300 truncate block transition-colors">{item.value}</a>
                    ) : (
                      <p className="text-sm text-slate-300 truncate">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {lead.message && (
              <div className="mt-4 p-4 bg-white/3 rounded-lg border border-white/5">
                <p className="text-xs text-slate-500 mb-2 font-medium">💬 Message / Détails</p>
                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{lead.message}</p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="section-card">
            <div className="flex border-b border-white/5">
              {[
                { key: 'interactions', label: 'Interactions', count: interactions.length },
                { key: 'quotes', label: 'Devis', count: quotes.length },
                { key: 'emails', label: 'Emails', count: emails.length },
                { key: 'tasks', label: 'Taches', count: tasks.length },
                { key: 'timeline', label: 'Timeline', count: interactions.length + quotes.length },
                { key: 'ai', label: 'IA', count: null },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? 'text-violet-300 border-violet-500'
                      : 'text-slate-500 border-transparent hover:text-slate-300'
                  }`}>
                  {tab.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-violet-500/20 text-violet-400' : 'bg-white/5 text-slate-500'
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>

            <div className="p-4">
              {/* Interactions tab */}
              {activeTab === 'interactions' && (
                <div>
                  <form onSubmit={handleAddInteraction} className="mb-4">
                    <div className="flex gap-2">
                      <select value={newInteraction.type} onChange={(e) => setNewInteraction({...newInteraction, type: e.target.value})}
                        data-testid="interaction-type-select"
                        className="px-3 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 flex-shrink-0">
                        <option value="note" className="bg-slate-800">📝 Note</option>
                        <option value="appel" className="bg-slate-800">📞 Appel</option>
                        <option value="email" className="bg-slate-800">📧 Email</option>
                        <option value="relance" className="bg-slate-800">🔔 Relance</option>
                      </select>
                      <input type="text" placeholder="Ajouter une note ou interaction..."
                        value={newInteraction.content} data-testid="interaction-content-input"
                        onChange={(e) => setNewInteraction({...newInteraction, content: e.target.value})}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500" />
                      <button type="submit" data-testid="add-interaction-button"
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all flex-shrink-0">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                  <div className="space-y-3">
                    {interactions.length === 0 ? (
                      <div className="text-center py-8 text-slate-600">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Aucune interaction</p>
                      </div>
                    ) : interactions.map((interaction) => (
                      <div key={interaction.interaction_id || Math.random()} className="flex gap-3 p-3 rounded-lg bg-white/3 hover:bg-white/5 transition-all">
                        <span className="text-lg flex-shrink-0">{INTERACTION_ICONS[interaction.type] || '💬'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-300 capitalize">{interaction.type}</span>
                            <span className="text-xs text-slate-600">{formatDateTime(interaction.created_at)}</span>
                          </div>
                          <p className="text-sm text-slate-400 break-words">{interaction.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quotes tab */}
              {activeTab === 'quotes' && (
                <div data-testid="quotes-section">
                  {quotes.length === 0 ? (
                    <div className="text-center py-8 text-slate-600">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm mb-3">Aucun devis créé</p>
                      <button onClick={() => navigate('/quotes/new', { state: { lead } })}
                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all">
                        + Créer un devis
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {quotes.map((quote) => (
                        <div key={quote.quote_id} data-testid={`quote-item-${quote.quote_id}`}
                          className="p-4 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition-all">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div>
                              <p className="font-semibold text-slate-200 text-sm">{quote.service_type}</p>
                              <p className="text-xs text-slate-500">{formatDateTime(quote.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-violet-400 text-lg">{formatCurrency(quote.amount)}</p>
                              <span className="text-xs text-slate-500">{quote.status}</span>
                            </div>
                          </div>
                          {quote.status === 'brouillon' && (
                            <button disabled={sendingQuote === quote.quote_id}
                              onClick={() => handleSendQuote(quote.quote_id)}
                              data-testid={`send-quote-lead-${quote.quote_id}`}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/20 text-violet-300 rounded-lg text-sm font-medium transition-all disabled:opacity-50">
                              <Send className="w-3.5 h-3.5" />
                              {sendingQuote === quote.quote_id ? 'Envoi...' : 'Envoyer par email'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Emails tab */}
              {activeTab === 'emails' && (
                <div data-testid="emails-section" className="space-y-3">
                  {emails.length === 0 ? (
                    <div className="text-center py-8 text-slate-600">
                      <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Aucun email échangé</p>
                    </div>
                  ) : emails.map((email) => (
                    <div key={email.email_id}
                      className={`rounded-xl p-4 border transition-all ${
                        email.direction === 'received'
                          ? 'bg-blue-500/5 border-blue-500/15'
                          : 'bg-white/3 border-white/5'
                      }`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          email.direction === 'sent' ? 'bg-violet-500/15' : 'bg-blue-500/15'
                        }`}>
                          {email.direction === 'sent'
                            ? <ArrowUpRight className="w-4 h-4 text-violet-400" />
                            : <ArrowDownLeft className="w-4 h-4 text-blue-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold text-slate-200 truncate">{email.subject}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${
                              email.direction === 'received' ? 'bg-blue-500/15 text-blue-400'
                              : email.type === 'quote' ? 'bg-violet-500/15 text-violet-400'
                              : email.type === 'followup' ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-white/10 text-slate-400'
                            }`}>
                              {email.direction === 'received' ? '📩 Réponse' 
                                : email.type === 'quote' ? '📄 Devis'
                                : email.type === 'followup' ? '🔔 Relance'
                                : email.type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {email.direction === 'sent' ? `→ ${email.to_email}` : `← ${email.from_email}`}
                            {' · '}{formatDateTime(email.sent_at || email.received_at || email.created_at)}
                          </p>
                          {email.direction === 'received' && (email.body || email.snippet) && (
                            <div className="mt-2 p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                              <p className="text-xs font-semibold text-blue-400 mb-1">Message :</p>
                              <p className="text-sm text-slate-300 whitespace-pre-wrap">{email.body || email.snippet}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Tasks tab */}
              {activeTab === 'tasks' && (
                <div className="space-y-3 p-4">
                  {tasks.length > 0 ? tasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                      <div className={"w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 " + (task.status === "completed" ? "bg-emerald-500/15" : "bg-amber-500/15")}>
                        <CheckCircle className={"w-4 h-4 " + (task.status === "completed" ? "text-emerald-400" : "text-amber-400")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{task.title}</p>
                        <p className="text-xs text-slate-500">{task.due_date ? new Date(task.due_date).toLocaleDateString("fr-FR") : "Sans date"}</p>
                      </div>
                      <span className={"px-2 py-0.5 rounded-full text-[10px] font-bold " + (task.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>
                        {task.status === "completed" ? "Termine" : "En attente"}
                      </span>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-slate-600 text-sm">Aucune tache pour ce lead</div>
                  )}
                </div>
              )}
              {/* Timeline tab */}
              {activeTab === 'timeline' && (
                <div className="p-4">
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-white/5" />
                    <div className="space-y-4">
                      {[...interactions.map(i => ({...i, _type: "interaction", _date: i.created_at})),
                        ...quotes.map(q => ({...q, _type: "quote", _date: q.created_at})),
                        ...emails.map(e => ({...e, _type: "email", _date: e.date}))
                      ].sort((a,b) => new Date(b._date) - new Date(a._date)).map((item, i) => (
                        <div key={i} className="flex gap-4 pl-2">
                          <div className={"w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs " + 
                            (item._type === "quote" ? "bg-amber-500/20 text-amber-400" : 
                             item._type === "email" ? "bg-blue-500/20 text-blue-400" : 
                             "bg-violet-500/20 text-violet-400")}>
                            {item._type === "quote" ? "📄" : item._type === "email" ? "📧" : 
                             (INTERACTION_ICONS[item.type] || "📝")}
                          </div>
                          <div className="flex-1 pb-4 border-b border-white/3">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold text-slate-300">
                                {item._type === "quote" ? "Devis " + (item.quote_number || "") : 
                                 item._type === "email" ? "Email: " + (item.subject || "") :
                                 item.type || "Interaction"}
                              </p>
                              <span className="text-[10px] text-slate-600">
                                {item._date ? new Date(item._date).toLocaleDateString("fr-FR", {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : ""}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">
                              {item.content || item.message || item.subject || ""}
                            </p>
                          </div>
                        </div>
                      ))}
                      {interactions.length + quotes.length + emails.length === 0 && (
                        <div className="text-center py-8 text-slate-600 text-sm pl-8">Aucun evenement</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* AI Scoring tab */}
              {activeTab === 'ai' && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      <h4 className="text-sm font-semibold text-slate-200">Analyse IA du lead</h4>
                    </div>
                    <button onClick={async () => {
                      setScoringLoading(true);
                      try {
                        const res = await axios.post(`${API_URL}/ai/score/${id}`, {}, {withCredentials: true});
                        setAiScore(res.data);
                      } catch(e) {}
                      finally { setScoringLoading(false); }
                    }} disabled={scoringLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/20 rounded-xl text-xs font-semibold">
                      {scoringLoading ? <div className="w-3 h-3 border border-violet-400/30 border-t-violet-400 rounded-full animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                      Analyser
                    </button>
                  </div>

                  {lead && (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {label:"Score actuel", value:(lead.score||0)+"/100", color: lead.score>=75?"#f43f5e":lead.score>=55?"#f59e0b":"#60a5fa"},
                        {label:"Segment", value: lead.score>=75?"🔥 Chaud":lead.score>=55?"♨️ Tiede":"❄️ Froid", color:"#a78bfa"},
                        {label:"Source", value: lead.utm_source||lead.source||"Direct", color:"#60a5fa"},
                        {label:"Probabilite", value: Math.round((lead.score||0)*0.8)+"%", color:"#34d399"},
                      ].map((m,i) => (
                        <div key={i} className="p-3 rounded-xl bg-white/3 border border-white/5">
                          <p className="text-xs text-slate-500 mb-1">{m.label}</p>
                          <p className="text-sm font-black" style={{color:m.color}}>{m.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {aiScore && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/15">
                        <p className="text-xs font-semibold text-violet-300 mb-2">Recommandation IA</p>
                        <p className="text-sm text-slate-300 leading-relaxed">{aiScore.recommendation}</p>
                      </div>
                      {(aiScore.top_factors||[]).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Facteurs de score</p>
                          <div className="space-y-2">
                            {aiScore.top_factors.map((f,i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className={"text-xs font-bold " + (f.impact==="+"?"text-emerald-400":"text-rose-400")}>
                                  {f.impact}{f.points}pts
                                </span>
                                <span className="text-xs text-slate-400">{f.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!aiScore && !scoringLoading && (
                    <div className="text-center py-6 text-slate-600">
                      <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Cliquez sur Analyser pour obtenir une analyse IA complete</p>
                    </div>
                  )}
                </div>
              )}
              )}
            </div>
          </div>
        </div>

        {/* Right - Details */}
        <div className="space-y-4">
          
          {/* Service details */}
          <div className="section-card p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" /> Détails du service
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Service', value: lead.service_type },
                lead.surface && { label: 'Surface', value: `${lead.surface} m²` },
                { label: 'Probabilité', value: null, isBar: true },
              ].filter(Boolean).map((item, i) => (
                <div key={i}>
                  <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                  {item.isBar ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{width:`${lead.probability}%`, background:'linear-gradient(90deg, #7c3aed, #a78bfa)'}} />
                      </div>
                      <span className="text-xs font-bold text-violet-400">{lead.probability}%</span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-300 font-medium">{item.value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tracking */}
          <div className="section-card p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-400" /> Tracking
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Source', value: lead.source || 'Direct' },
                lead.utm_source && { label: 'UTM Source', value: lead.utm_source },
                lead.utm_medium && { label: 'UTM Medium', value: lead.utm_medium },
                lead.utm_campaign && { label: 'Campagne', value: lead.utm_campaign },
                lead.page_origine && { label: 'Page origine', value: lead.page_origine },
              ].filter(Boolean).map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="text-xs font-medium text-slate-300 truncate max-w-[60%] text-right">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="section-card p-5">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Actions rapides</h2>
            <div className="space-y-2">
              <a href={`tel:${lead.phone}`}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-white/3 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-lg transition-all text-sm text-slate-300 hover:text-slate-100">
                <Phone className="w-4 h-4 text-green-400" /> Appeler {lead.phone}
              </a>
              <a href={`mailto:${lead.email}`}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-white/3 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-lg transition-all text-sm text-slate-300 hover:text-slate-100">
                <Mail className="w-4 h-4 text-blue-400" /> Envoyer un email
              </a>
              <button onClick={() => navigate('/quotes/new', { state: { lead } })}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/15 hover:border-violet-500/30 rounded-lg transition-all text-sm text-violet-300 hover:text-violet-200">
                <FileText className="w-4 h-4" /> Créer un devis
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile actions */}
      <div className="fixed bottom-14 left-0 right-0 z-30 border-t border-white/5 p-3 flex gap-2 sm:hidden"
        style={{background:'hsl(224,71%,5%)'}} data-testid="mobile-lead-actions">
        <a href={`tel:${lead.phone}`} data-testid="mobile-call-btn"
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-sm font-medium transition-all">
          <Phone className="w-4 h-4" /> Appeler
        </a>
        <button data-testid="mobile-whatsapp-btn"
          onClick={async () => {
            try {
              const res = await axios.post(`${API_URL}/whatsapp/send`, { lead_id: lead.lead_id, message: `Bonjour ${lead.name}, merci pour votre demande. - Global Clean Home` }, { withCredentials: true });
              window.open(res.data.whatsapp_link, '_blank');
            } catch { toast.error('Erreur WhatsApp'); }
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500/15 border border-green-500/20 text-green-400 rounded-xl text-sm font-medium transition-all">
          <MessageSquare className="w-4 h-4" /> WhatsApp
        </button>
        <button data-testid="mobile-quote-btn" onClick={() => navigate('/quotes/new', { state: { lead } })}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 text-white rounded-xl text-sm font-medium transition-all">
          <FileText className="w-4 h-4" /> Devis
        </button>
      </div>
    </div>
  );
};

export default LeadDetail;
