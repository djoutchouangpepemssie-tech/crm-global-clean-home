import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, RefreshCw, Send, Users, UserCheck, Mail, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../../lib/api";
import { PageHeader } from "../shared";
import LeadChat from "./LeadChat";

export default function ChatCenter() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('clients'); // 'clients' | 'intervenants'
  const [selected, setSelected] = useState(null);

  const { data: clientConvs = [], isLoading: loadingClients, refetch: refetchClients } = useQuery({
    queryKey: ['chat', 'conversations', 'clients'],
    queryFn: async () => {
      const { data } = await api.get('/chat/conversations');
      return data || [];
    },
    refetchInterval: 10_000,
  });

  const { data: agentData = { conversations: [] }, isLoading: loadingAgents, refetch: refetchAgents } = useQuery({
    queryKey: ['chat', 'intervenants'],
    queryFn: async () => {
      const { data } = await api.get('/intervenant/conversations-summary');
      return data || { conversations: [] };
    },
    refetchInterval: 10_000,
  });

  const refetchAll = () => { refetchClients(); refetchAgents(); };

  const totalUnreadClients = clientConvs.reduce((s, c) => s + (c.unread_crm || 0), 0);
  const totalUnreadAgents = (agentData.conversations || []).reduce((s, c) => s + (c.unread || 0), 0);
  const loading = filter === 'clients' ? loadingClients : loadingAgents;

  const activeList = filter === 'clients' ? clientConvs : (agentData.conversations || []);

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <PageHeader
        title="Messages"
        subtitle={`${clientConvs.length} client${clientConvs.length > 1 ? 's' : ''} · ${(agentData.conversations || []).length} intervenant${(agentData.conversations || []).length > 1 ? 's' : ''}${(totalUnreadClients + totalUnreadAgents) > 0 ? ` · ${totalUnreadClients + totalUnreadAgents} non lu${(totalUnreadClients + totalUnreadAgents) > 1 ? 's' : ''}` : ''}`}
        actions={[{ label: 'Actualiser', icon: RefreshCw, onClick: refetchAll, loading: false }]}
      />

      {/* Tabs clients/intervenants */}
      <div className="flex gap-2 mb-4">
        {[
          { k: 'clients',      label: 'Clients',      icon: Users,     unread: totalUnreadClients, count: clientConvs.length },
          { k: 'intervenants', label: 'Intervenants', icon: UserCheck, unread: totalUnreadAgents,  count: (agentData.conversations || []).length },
        ].map(tab => {
          const Icon = tab.icon;
          const active = filter === tab.k;
          return (
            <button key={tab.k}
              onClick={() => { setFilter(tab.k); setSelected(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                active ? 'bg-brand-500 text-white shadow-md' : 'bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-900'
              }`}
              style={active ? { background: 'oklch(0.165 0.012 60)', color: 'white', borderColor: 'transparent' } : {}}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              <span className={`ml-1 text-[10px] px-2 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-neutral-100'}`}>
                {tab.count}
              </span>
              {tab.unread > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-terracotta-500 text-white text-[9px] font-black">
                  {tab.unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: "calc(100vh - 240px)" }}>
        {/* Liste conversations */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-neutral-100">
            <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider" style={{ fontSize: 11, letterSpacing: '0.1em' }}>
              {activeList.length} {filter === 'clients' ? 'client' : 'intervenant'}{activeList.length > 1 ? 's' : ''}
            </p>
            <button onClick={refetchAll} className="p-1.5 rounded-lg hover:bg-neutral-50 text-neutral-500">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
              </div>
            ) : activeList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-neutral-600">
                <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">Aucun message</p>
              </div>
            ) : filter === 'clients' ? (
              activeList.map((conv) => {
                const lastMsg = conv.messages?.[conv.messages.length - 1];
                const isSelected = selected?.type === 'client' && selected?.id === conv.lead_id;
                return (
                  <div key={conv.lead_id || conv.conversation_id}
                    onClick={() => setSelected({ type: 'client', id: conv.lead_id, name: conv.lead_name, email: conv.lead_email })}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition-all border-b border-neutral-100 ${
                      isSelected ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : 'hover:bg-neutral-50'
                    }`}>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                      {(conv.lead_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{conv.lead_name}</p>
                        {conv.unread_crm > 0 && (
                          <span className="w-5 h-5 rounded-full bg-terracotta-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 ml-2">
                            {conv.unread_crm}
                          </span>
                        )}
                      </div>
                      {lastMsg && (
                        <p className="text-xs text-neutral-500 truncate mt-0.5">
                          {lastMsg.from_client ? "" : "Vous: "}{lastMsg.content}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              activeList.map((conv) => {
                const isSelected = selected?.type === 'intervenant' && selected?.id === conv.agent_id;
                return (
                  <div key={conv.agent_id}
                    onClick={() => setSelected({ type: 'intervenant', id: conv.agent_id, name: conv.agent_name, email: conv.agent_email })}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition-all border-b border-neutral-100 ${
                      isSelected ? 'bg-orange-50 border-l-2 border-l-orange-500' : 'hover:bg-neutral-50'
                    }`}>
                    <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-700 font-bold text-sm flex-shrink-0">
                      {(conv.agent_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{conv.agent_name}</p>
                        {conv.unread > 0 && (
                          <span className="w-5 h-5 rounded-full bg-terracotta-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 ml-2">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                      {conv.last_message && (
                        <p className="text-xs text-neutral-500 truncate mt-0.5">
                          {conv.last_from_agent ? "" : "Vous: "}{conv.last_message}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Zone de chat */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl p-5">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm">Sélectionne une conversation</p>
            </div>
          ) : selected.type === 'client' ? (
            <>
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 font-bold text-sm">
                    {(selected.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{selected.name}</p>
                    <p className="text-xs text-neutral-500">{selected.email}</p>
                  </div>
                </div>
                <button onClick={() => navigate("/leads/" + selected.id)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">
                  Voir le dossier →
                </button>
              </div>
              <LeadChat leadId={selected.id} leadName={selected.name} />
            </>
          ) : (
            <IntervenantChat agentId={selected.id} agentName={selected.name} agentEmail={selected.email} onRefresh={refetchAgents} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────── Composant chat intervenant ──────────── */
function IntervenantChat({ agentId, agentName, agentEmail, onRefresh }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const loadMessages = async () => {
    try {
      const { data } = await api.get(`/intervenant/messages/${agentId}`);
      setMessages(data?.messages || []);
      // Mark as read
      api.post(`/intervenant/messages/${agentId}/mark-read`).catch(() => {});
    } catch {}
  };

  useEffect(() => {
    loadMessages();
    const t = setInterval(loadMessages, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [agentId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await api.post(`/intervenant/messages/${agentId}`, { content: draft });
      setDraft('');
      await loadMessages();
      onRefresh?.();
    } catch { toast.error('Envoi impossible'); }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-700 font-bold text-sm">
            {(agentName || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-900">{agentName}</p>
            <div className="flex items-center gap-3 mt-0.5">
              {agentEmail && (
                <a href={`mailto:${agentEmail}`} className="text-xs text-neutral-500 hover:text-emerald-600 inline-flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {agentEmail}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-neutral-400">
            <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm">Aucun message pour le moment</p>
          </div>
        ) : messages.map((m, i) => {
          const mine = m.from_admin || m.sender === 'admin';
          return (
            <div key={m.message_id || i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                mine ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-neutral-100 text-neutral-900 rounded-bl-sm'
              }`}>
                {m.content}
                <div className={`text-[10px] mt-1 ${mine ? 'text-emerald-100' : 'text-neutral-500'}`}>
                  {m.created_at ? new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !sending) send(); }}
          placeholder={`Message à ${agentName}…`}
          className="flex-1 px-4 py-2.5 rounded-full border border-neutral-200 bg-neutral-50 text-sm outline-none focus:border-emerald-500"
        />
        <button
          onClick={send}
          disabled={!draft.trim() || sending}
          className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
