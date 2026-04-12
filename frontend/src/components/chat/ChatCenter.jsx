import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, RefreshCw, Send, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../../lib/api";
import { PageHeader } from "../shared";
import LeadChat from "./LeadChat";

export default function ChatCenter() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const { data: conversations = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: async () => {
      const { data } = await api.get('/chat/conversations');
      return data || [];
    },
    refetchInterval: 10_000,
  });

  const load = refetch;

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_crm || 0), 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
      <PageHeader
        title="Messages"
        subtitle={`${conversations.length} conversation${conversations.length > 1 ? 's' : ''}${totalUnread > 0 ? ` · ${totalUnread} non lu${totalUnread > 1 ? 's' : ''}` : ''}`}
        actions={[{ label: 'Actualiser', icon: RefreshCw, onClick: () => refetch(), loading: false }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{height: "calc(100vh - 200px)"}}>
        {/* Liste conversations */}
        <div className="section-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <p className="text-sm font-semibold text-slate-200">{conversations.length} conversations</p>
            <button onClick={load} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-600">
                <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">Aucun message</p>
              </div>
            ) : (
              conversations.map((conv, i) => {
                const lastMsg = conv.messages?.[conv.messages.length - 1];
                const isSelected = selected?.lead_id === conv.lead_id;
                return (
                  <div key={i} onClick={() => setSelected(conv)}
                    className={"flex items-center gap-3 p-4 cursor-pointer transition-all border-b border-white/3 " +
                      (isSelected ? "bg-violet-500/10 border-l-2 border-l-violet-500" : "hover:bg-white/5")}>
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-bold text-sm flex-shrink-0">
                      {(conv.lead_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-200 truncate">{conv.lead_name}</p>
                        {conv.unread_crm > 0 && (
                          <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 ml-2">
                            {conv.unread_crm}
                          </span>
                        )}
                      </div>
                      {lastMsg && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {lastMsg.from_client ? "" : "Vous: "}{lastMsg.content}
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
        <div className="lg:col-span-2 section-card p-5">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-bold text-sm">
                    {(selected.lead_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">{selected.lead_name}</p>
                    <p className="text-xs text-slate-500">{selected.lead_email}</p>
                  </div>
                </div>
                <button onClick={() => navigate("/leads/" + selected.lead_id)}
                  className="text-xs text-violet-400 hover:text-violet-300 font-semibold">
                  Voir la fiche →
                </button>
              </div>
              <LeadChat leadId={selected.lead_id} leadName={selected.lead_name} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm">Selectionnez une conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
