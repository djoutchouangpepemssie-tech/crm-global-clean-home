import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Ticket, Plus, RefreshCw, AlertTriangle, Clock, CheckCircle, MessageSquare, User, Tag, ChevronDown, Send, Lock, Star } from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const PRIORITY = {
  urgent: { label: 'Urgent', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', emoji: '🔴' },
  high: { label: 'Haute', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', emoji: '🟠' },
  normal: { label: 'Normale', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', emoji: '🔵' },
  low: { label: 'Basse', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', emoji: '⚪' },
};

const STATUS = {
  open: { label: 'Ouvert', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  in_progress: { label: 'En cours', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  waiting_client: { label: 'Attente client', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  resolved: { label: 'Résolu', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  closed: { label: 'Fermé', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
};

const CATEGORIES = [
  { id: 'general', label: 'Général', emoji: '📋' },
  { id: 'reclamation', label: 'Réclamation', emoji: '⚠️' },
  { id: 'question', label: 'Question', emoji: '❓' },
  { id: 'intervention', label: 'Intervention', emoji: '🧹' },
  { id: 'facturation', label: 'Facturation', emoji: '💰' },
];

const NewTicketModal = ({ leads, onClose, onSave }) => {
  const [form, setForm] = useState({ subject: '', description: '', priority: 'normal', category: 'general', lead_id: '', client_name: '', client_email: '' });
  const [saving, setSaving] = useState(false);

  const handleLeadChange = (leadId) => {
    const lead = leads.find(l => l.lead_id === leadId);
    setForm(p => ({ ...p, lead_id: leadId, client_name: lead ? lead.name : '', client_email: lead ? lead.email : '' }));
  };

  const handleSave = async () => {
    if (!form.subject || !form.description) { toast.error('Remplissez les champs requis'); return; }
    setSaving(true);
    try {
      await axios.post(API_URL + '/tickets/', form, { withCredentials: true });
      toast.success('Ticket créé !'); onSave();
    } catch { toast.error('Erreur'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="section-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-100 mb-5">Nouveau ticket</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Client (optionnel)</label>
            <select value={form.lead_id} onChange={e => handleLeadChange(e.target.value)} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm">
              <option value="" className="bg-slate-800">Client sans fiche lead</option>
              {leads.map(l => <option key={l.lead_id} value={l.lead_id} className="bg-slate-800">{l.name} — {l.email}</option>)}
            </select>
          </div>
          {!form.lead_id && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Nom client</label>
                <input value={form.client_name} onChange={e => setForm(p => ({...p, client_name: e.target.value}))} placeholder="Jean Dupont" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Email client</label>
                <input value={form.client_email} onChange={e => setForm(p => ({...p, client_email: e.target.value}))} placeholder="email@exemple.com" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Objet *</label>
            <input value={form.subject} onChange={e => setForm(p => ({...p, subject: e.target.value}))} placeholder="Ex: Canapé pas bien nettoyé" className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Description *</label>
            <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={4} placeholder="Décrivez le problème..." className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Priorité</label>
              <select value={form.priority} onChange={e => setForm(p => ({...p, priority: e.target.value}))} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm">
                {Object.entries(PRIORITY).map(([k,v]) => <option key={k} value={k} className="bg-slate-800">{v.emoji} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Catégorie</label>
              <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm">
                {CATEGORIES.map(c => <option key={c.id} value={c.id} className="bg-slate-800">{c.emoji} {c.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-sm">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-sm disabled:opacity-60">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Créer le ticket'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TicketDetail = ({ ticket, onClose, onUpdate }) => {
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolution, setResolution] = useState('');

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await axios.post(API_URL + '/tickets/' + ticket.ticket_id + '/reply', { message: reply, is_internal: isInternal }, { withCredentials: true });
      toast.success('Réponse envoyée !');
      setReply('');
      onUpdate();
    } catch { toast.error('Erreur'); } finally { setSending(false); }
  };

  const handleStatus = async (status) => {
    try {
      await axios.patch(API_URL + '/tickets/' + ticket.ticket_id, { status, resolution: resolution || undefined }, { withCredentials: true });
      toast.success('Statut mis à jour !');
      onUpdate();
    } catch { toast.error('Erreur'); }
  };

  const prio = PRIORITY[ticket.priority] || PRIORITY.normal;
  const stat = STATUS[ticket.status] || STATUS.open;
  const cat = CATEGORIES.find(c => c.id === ticket.category) || CATEGORIES[0];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="section-card w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-slate-500">#{ticket.ticket_number}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:stat.bg,color:stat.color}}>{stat.label}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:prio.bg,color:prio.color}}>{prio.emoji} {prio.label}</span>
            </div>
            <h3 className="font-bold text-slate-100">{ticket.subject}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{ticket.client_name} · {cat.emoji} {cat.label}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl font-bold ml-4">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="p-4 rounded-xl bg-white/3 border border-white/5">
            <p className="text-xs font-semibold text-slate-500 mb-2">DESCRIPTION</p>
            <p className="text-sm text-slate-300 leading-relaxed">{ticket.description}</p>
          </div>

          {(ticket.replies || []).map((rep, i) => (
            <div key={i} className={"p-4 rounded-xl " + (rep.is_internal ? "bg-amber-500/5 border border-amber-500/15" : "bg-blue-500/5 border border-blue-500/15")}>
              <div className="flex items-center gap-2 mb-2">
                {rep.is_internal ? <Lock className="w-3 h-3 text-amber-400" /> : <MessageSquare className="w-3 h-3 text-blue-400" />}
                <span className="text-[10px] font-semibold" style={{color: rep.is_internal ? '#f59e0b' : '#60a5fa'}}>
                  {rep.is_internal ? 'Note interne' : 'Réponse envoyée au client'}
                </span>
                <span className="text-[10px] text-slate-600 ml-auto">{new Date(rep.created_at).toLocaleDateString('fr-FR', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
              </div>
              <p className="text-sm text-slate-300">{rep.message}</p>
            </div>
          ))}

          {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setIsInternal(false)} className={"px-3 py-1.5 rounded-lg text-xs font-semibold transition-all " + (!isInternal ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-white/5 text-slate-500")}>
                  <Send className="w-3 h-3 inline mr-1" /> Email client
                </button>
                <button onClick={() => setIsInternal(true)} className={"px-3 py-1.5 rounded-lg text-xs font-semibold transition-all " + (isInternal ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-white/5 text-slate-500")}>
                  <Lock className="w-3 h-3 inline mr-1" /> Note interne
                </button>
              </div>
              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} placeholder={isInternal ? "Note visible uniquement par l'équipe..." : "Réponse envoyée au client par email..."}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-violet-500" />
              <div className="flex gap-2 mt-2">
                <input value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Résolution (optionnel)" className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs" />
                <button onClick={handleReply} disabled={sending || !reply.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs disabled:opacity-60">
                  {sending ? <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/5 flex gap-2 flex-wrap">
          {Object.entries(STATUS).filter(([k]) => k !== ticket.status).map(([k,v]) => (
            <button key={k} onClick={() => handleStatus(k)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
              style={{background:v.bg,color:v.color}}>
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const TicketsList = () => {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({ status: '', priority: '', category: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.priority) params.append('priority', filter.priority);

      const [tRes, sRes, lRes] = await Promise.all([
        axios.get(API_URL + '/tickets/?' + params.toString(), { withCredentials: true }),
        axios.get(API_URL + '/tickets/stats', { withCredentials: true }),
        axios.get(API_URL + '/leads?limit=50', { withCredentials: true }),
      ]);
      setTickets(tRes.data || []);
      setStats(sRes.data);
      setLeads(Array.isArray(lRes.data) ? lRes.data : []);
    } catch { toast.error('Erreur'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [filter.status, filter.priority]);

  const fetchTicketDetail = async (t) => {
    try {
      const res = await axios.get(API_URL + '/tickets/' + t.ticket_id, { withCredentials: true });
      setSelected(res.data);
    } catch { setSelected(t); }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Service Client</h1>
          </div>
          <p className="text-slate-500 text-sm">Gestion des tickets, réclamations et demandes clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm">
            <Plus className="w-4 h-4" /> Nouveau ticket
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {label:'Ouverts',value:stats.open||0,icon:Ticket,color:'#60a5fa'},
            {label:'En cours',value:stats.in_progress||0,icon:Clock,color:'#f59e0b'},
            {label:'Résolus',value:stats.resolved||0,icon:CheckCircle,color:'#34d399'},
            {label:'SLA dépassés',value:stats.sla_breaches||0,icon:AlertTriangle,color:stats.sla_breaches>0?'#f43f5e':'#94a3b8'},
          ].map((m,i) => (
            <div key={i} className="metric-card">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{background:m.color+'15',border:'1px solid '+m.color+'30'}}>
                <m.icon className="w-4 h-4" style={{color:m.color}} />
              </div>
              <p className="text-2xl font-bold text-slate-100">{m.value}</p>
              <p className="text-xs text-slate-500 mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <select value={filter.status} onChange={e => setFilter(p => ({...p, status: e.target.value}))}
          className="px-3 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs">
          <option value="" className="bg-slate-800">Tous les statuts</option>
          {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k} className="bg-slate-800">{v.label}</option>)}
        </select>
        <select value={filter.priority} onChange={e => setFilter(p => ({...p, priority: e.target.value}))}
          className="px-3 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs">
          <option value="" className="bg-slate-800">Toutes priorités</option>
          {Object.entries(PRIORITY).map(([k,v]) => <option key={k} value={k} className="bg-slate-800">{v.emoji} {v.label}</option>)}
        </select>
        <button onClick={fetchAll} className="px-3 py-2 bg-violet-600/20 text-violet-300 border border-violet-500/20 rounded-xl text-xs font-semibold">Filtrer</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : tickets.length > 0 ? (
        <div className="space-y-2">
          {tickets.map(t => {
            const prio = PRIORITY[t.priority] || PRIORITY.normal;
            const stat = STATUS[t.status] || STATUS.open;
            const cat = CATEGORIES.find(c => c.id === t.category) || CATEGORIES[0];
            return (
              <div key={t.ticket_id} onClick={() => fetchTicketDetail(t)}
                className={"flex items-center gap-4 p-4 section-card hover:border-violet-500/30 cursor-pointer transition-all " + (t.sla_breached ? "border-rose-500/20" : "")}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                  style={{background:prio.bg,border:'1px solid '+prio.color+'30'}}>
                  {cat.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[10px] text-slate-600">#{t.ticket_number}</span>
                    {t.sla_breached && <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full border border-rose-500/20">⚠️ SLA dépassé</span>}
                  </div>
                  <p className="text-sm font-semibold text-slate-200 truncate">{t.subject}</p>
                  <p className="text-xs text-slate-500">{t.client_name || 'Client inconnu'} · {cat.label}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:stat.bg,color:stat.color}}>{stat.label}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:prio.bg,color:prio.color}}>{prio.emoji} {prio.label}</span>
                  {t.sla_remaining_hours !== undefined && t.sla_remaining_hours > 0 && (
                    <span className="text-[10px] text-slate-600">{t.sla_remaining_hours}h restantes</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="section-card p-12 text-center">
          <Ticket className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500">Aucun ticket pour le moment</p>
          <p className="text-xs text-slate-600 mt-1">Créez votre premier ticket de support</p>
        </div>
      )}

      {showNew && <NewTicketModal leads={leads} onClose={() => setShowNew(false)} onSave={() => { setShowNew(false); fetchAll(); }} />}
      {selected && <TicketDetail ticket={selected} onClose={() => setSelected(null)} onUpdate={() => { fetchAll(); fetchTicketDetail(selected); }} />}
    </div>
  );
};

export default TicketsList;
