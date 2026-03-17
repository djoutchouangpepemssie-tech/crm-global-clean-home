import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Ticket, Plus, RefreshCw, AlertTriangle, Clock, CheckCircle, Send, Lock } from 'lucide-react';
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

function NewTicketModal({ leads, onClose, onSave }) {
  const [form, setForm] = useState({
    subject: '', description: '', priority: 'normal',
    category: 'general', lead_id: '', client_name: '', client_email: ''
  });
  const [saving, setSaving] = useState(false);

  function handleLeadChange(leadId) {
    const lead = leads.find(function(l) { return l.lead_id === leadId; });
    setForm(function(p) {
      return { ...p, lead_id: leadId, client_name: lead ? lead.name : '', client_email: lead ? lead.email : '' };
    });
  }

  async function handleSave() {
    if (!form.subject || !form.description) { toast.error('Remplissez les champs requis'); return; }
    setSaving(true);
    try {
      await axios.post(API_URL + '/tickets/', form, { withCredentials: true });
      toast.success('Ticket cree !'); onSave();
    } catch(e) { toast.error('Erreur creation'); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="section-card w-full max-w-lg p-6 max-h-screen overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-100 mb-5">Nouveau ticket</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Client</label>
            <select value={form.lead_id} onChange={function(e) { handleLeadChange(e.target.value); }}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm">
              <option value="" className="bg-slate-800">Sans fiche lead</option>
              {leads.map(function(l) {
                return <option key={l.lead_id} value={l.lead_id} className="bg-slate-800">{l.name}</option>;
              })}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Objet *</label>
            <input value={form.subject} onChange={function(e) { setForm(function(p) { return {...p, subject: e.target.value}; }); }}
              placeholder="Ex: Probleme apres intervention"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Description *</label>
            <textarea value={form.description} onChange={function(e) { setForm(function(p) { return {...p, description: e.target.value}; }); }}
              rows={4} placeholder="Decrivez le probleme..."
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Priorite</label>
              <select value={form.priority} onChange={function(e) { setForm(function(p) { return {...p, priority: e.target.value}; }); }}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm">
                <option value="urgent" className="bg-slate-800">🔴 Urgent</option>
                <option value="high" className="bg-slate-800">🟠 Haute</option>
                <option value="normal" className="bg-slate-800">🔵 Normale</option>
                <option value="low" className="bg-slate-800">⚪ Basse</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Categorie</label>
              <select value={form.category} onChange={function(e) { setForm(function(p) { return {...p, category: e.target.value}; }); }}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm">
                {CATEGORIES.map(function(c) {
                  return <option key={c.id} value={c.id} className="bg-slate-800">{c.emoji} {c.label}</option>;
                })}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-sm">Annuler</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-sm disabled:opacity-60">
            {saving ? 'Creation...' : 'Creer le ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TicketRow({ t, onClick }) {
  var prio = PRIORITY[t.priority] || PRIORITY.normal;
  var stat = STATUS[t.status] || STATUS.open;
  var cat = CATEGORIES.find(function(c) { return c.id === t.category; }) || CATEGORIES[0];
  return (
    <div onClick={function() { onClick(t); }}
      className="flex items-center gap-4 p-4 section-card hover:border-violet-500/30 cursor-pointer transition-all">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
        style={{background: prio.bg, border: '1px solid ' + prio.color + '30'}}>
        {cat.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-[10px] text-slate-600">#{t.ticket_number}</span>
          {t.sla_breached && (
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full border border-rose-500/20">SLA depasse</span>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-200 truncate">{t.subject}</p>
        <p className="text-xs text-slate-500">{t.client_name || 'Client inconnu'} · {cat.label}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{background: stat.bg, color: stat.color}}>{stat.label}</span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{background: prio.bg, color: prio.color}}>{prio.emoji} {prio.label}</span>
      </div>
    </div>
  );
}

function TicketDetail({ ticket, onClose, onUpdate }) {
  var [reply, setReply] = useState('');
  var [isInternal, setIsInternal] = useState(false);
  var [sending, setSending] = useState(false);
  var prio = PRIORITY[ticket.priority] || PRIORITY.normal;
  var stat = STATUS[ticket.status] || STATUS.open;

  async function handleReply() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await axios.post(API_URL + '/tickets/' + ticket.ticket_id + '/reply',
        { message: reply, is_internal: isInternal }, { withCredentials: true });
      toast.success('Reponse envoyee !');
      setReply('');
      onUpdate();
    } catch(e) { toast.error('Erreur'); } finally { setSending(false); }
  }

  async function handleStatus(status) {
    try {
      await axios.patch(API_URL + '/tickets/' + ticket.ticket_id, { status: status }, { withCredentials: true });
      toast.success('Statut mis a jour !');
      onUpdate();
    } catch(e) { toast.error('Erreur'); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="section-card w-full max-w-2xl max-h-screen flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] text-slate-500">#{ticket.ticket_number}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{background: stat.bg, color: stat.color}}>{stat.label}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{background: prio.bg, color: prio.color}}>{prio.emoji} {prio.label}</span>
            </div>
            <h3 className="font-bold text-slate-100">{ticket.subject}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{ticket.client_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-2xl font-bold ml-4">x</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="p-4 rounded-xl bg-white/3 border border-white/5">
            <p className="text-xs font-semibold text-slate-500 mb-2">DESCRIPTION</p>
            <p className="text-sm text-slate-300 leading-relaxed">{ticket.description}</p>
          </div>

          {(ticket.replies || []).map(function(rep, i) {
            return (
              <div key={i} className={"p-4 rounded-xl " + (rep.is_internal ? "bg-amber-500/5 border border-amber-500/15" : "bg-blue-500/5 border border-blue-500/15")}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold" style={{color: rep.is_internal ? '#f59e0b' : '#60a5fa'}}>
                    {rep.is_internal ? 'Note interne' : 'Reponse client'}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{rep.message}</p>
              </div>
            );
          })}

          <div>
            <div className="flex gap-2 mb-2">
              <button onClick={function() { setIsInternal(false); }}
                className={"px-3 py-1.5 rounded-lg text-xs font-semibold " + (!isInternal ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-white/5 text-slate-500")}>
                Email client
              </button>
              <button onClick={function() { setIsInternal(true); }}
                className={"px-3 py-1.5 rounded-lg text-xs font-semibold " + (isInternal ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-white/5 text-slate-500")}>
                Note interne
              </button>
            </div>
            <textarea value={reply} onChange={function(e) { setReply(e.target.value); }} rows={3}
              placeholder={isInternal ? "Note interne..." : "Reponse au client..."}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-violet-500" />
            <button onClick={handleReply} disabled={sending || !reply.trim()}
              className="mt-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs disabled:opacity-60 flex items-center gap-2">
              <Send className="w-3.5 h-3.5" /> Envoyer
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 flex gap-2 flex-wrap">
          {Object.entries(STATUS).filter(function(entry) { return entry[0] !== ticket.status; }).map(function(entry) {
            return (
              <button key={entry[0]} onClick={function() { handleStatus(entry[0]); }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{background: entry[1].bg, color: entry[1].color}}>
                {entry[1].label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TicketsList() {
  var [tickets, setTickets] = useState([]);
  var [stats, setStats] = useState(null);
  var [leads, setLeads] = useState([]);
  var [loading, setLoading] = useState(true);
  var [showNew, setShowNew] = useState(false);
  var [selected, setSelected] = useState(null);
  var [filterStatus, setFilterStatus] = useState('');

  async function fetchAll() {
    setLoading(true);
    try {
      var params = filterStatus ? '?status=' + filterStatus : '';
      var results = await Promise.all([
        axios.get(API_URL + '/tickets/' + params, { withCredentials: true }),
        axios.get(API_URL + '/tickets/stats', { withCredentials: true }),
        axios.get(API_URL + '/leads?limit=50', { withCredentials: true }),
      ]);
      setTickets(results[0].data || []);
      setStats(results[1].data);
      setLeads(Array.isArray(results[2].data) ? results[2].data : []);
    } catch(e) {
      console.error('Tickets error:', e);
      toast.error('Erreur chargement');
    } finally { setLoading(false); }
  }

  useEffect(function() { fetchAll(); }, [filterStatus]);

  async function openTicket(t) {
    try {
      var res = await axios.get(API_URL + '/tickets/' + t.ticket_id, { withCredentials: true });
      setSelected(res.data);
    } catch(e) { setSelected(t); }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Service Client</h1>
          </div>
          <p className="text-slate-500 text-sm">Gestion des tickets et demandes clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={function() { setShowNew(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm">
            <Plus className="w-4 h-4" /> Nouveau ticket
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {label:'Ouverts', value: stats.open || 0, icon: Ticket, color:'#60a5fa'},
            {label:'En cours', value: stats.in_progress || 0, icon: Clock, color:'#f59e0b'},
            {label:'Resolus', value: stats.resolved || 0, icon: CheckCircle, color:'#34d399'},
            {label:'SLA depasses', value: stats.sla_breaches || 0, icon: AlertTriangle, color: stats.sla_breaches > 0 ? '#f43f5e' : '#94a3b8'},
          ].map(function(m, i) {
            return (
              <div key={i} className="metric-card">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{background: m.color + '15', border: '1px solid ' + m.color + '30'}}>
                  <m.icon className="w-4 h-4" style={{color: m.color}} />
                </div>
                <p className="text-2xl font-bold text-slate-100">{m.value}</p>
                <p className="text-xs text-slate-500 mt-1">{m.label}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {['', 'open', 'in_progress', 'resolved', 'closed'].map(function(s) {
          var label = s === '' ? 'Tous' : (STATUS[s] ? STATUS[s].label : s);
          return (
            <button key={s} onClick={function() { setFilterStatus(s); }}
              className={"px-3 py-2 rounded-xl text-xs font-semibold transition-all " + (filterStatus === s ? "bg-violet-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}>
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(function(i) { return <div key={i} className="skeleton h-20 rounded-xl" />; })}
        </div>
      ) : tickets.length > 0 ? (
        <div className="space-y-2">
          {tickets.map(function(t) {
            return <TicketRow key={t.ticket_id} t={t} onClick={openTicket} />;
          })}
        </div>
      ) : (
        <div className="section-card p-12 text-center">
          <Ticket className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Aucun ticket pour le moment</p>
          <p className="text-xs text-slate-600 mt-1">Creez votre premier ticket de support</p>
          <button onClick={function() { setShowNew(true); }}
            className="mt-4 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl">
            + Nouveau ticket
          </button>
        </div>
      )}

      {showNew && (
        <NewTicketModal
          leads={leads}
          onClose={function() { setShowNew(false); }}
          onSave={function() { setShowNew(false); fetchAll(); }}
        />
      )}

      {selected && (
        <TicketDetail
          ticket={selected}
          onClose={function() { setSelected(null); }}
          onUpdate={function() { fetchAll(); openTicket(selected); }}
        />
      )}
    </div>
  );
}

export default TicketsList;
