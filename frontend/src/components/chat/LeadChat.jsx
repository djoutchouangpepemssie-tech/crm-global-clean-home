import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { MessageSquare, Send, RefreshCw, User } from "lucide-react";
import { toast } from "sonner";
import BACKEND_URL from "../../config.js";

const API = BACKEND_URL + "/api/chat";

export default function LeadChat({ leadId, leadName }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const load = async () => {
    try {
      const res = await axios.get(API + "/conversations/" + leadId, { withCredentials: true });
      setMessages(res.data.messages || []);
      // Marquer comme lu
      await axios.post(API + "/conversations/" + leadId + "/mark-read", {}, { withCredentials: true });
    } catch(e) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [leadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const res = await axios.post(API + "/conversations/" + leadId + "/reply", {
        content: newMessage,
        from_client: false
      }, { withCredentials: true });
      setMessages(prev => [...prev, res.data.message]);
      setNewMessage("");
    } catch { toast.error("Erreur envoi"); }
    finally { setSending(false); }
  };

  return (
    <div className="flex flex-col" style={{height: "400px"}}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-violet-400" />
          <p className="text-sm font-semibold text-slate-200">Chat avec {leadName}</p>
        </div>
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-white/3 rounded-xl border border-white/5 mb-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm">Aucun message</p>
            <p className="text-xs mt-1">Le client peut vous ecrire depuis son portail</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={"flex " + (msg.from_client ? "justify-start" : "justify-end")}>
              <div className={"max-w-xs " + (msg.from_client ? "" : "")}>
                <p className={"text-[10px] font-semibold mb-1 " + (msg.from_client ? "text-slate-500" : "text-violet-400 text-right")}>
                  {msg.from_client ? (msg.sender_name || leadName) : (msg.sender_name || "Vous")}
                </p>
                <div className={"px-4 py-2.5 rounded-2xl text-sm " + (msg.from_client
                  ? "bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm"
                  : "bg-violet-600 text-white rounded-tr-sm")}>
                  {msg.content}
                </div>
                <p className={"text-[10px] text-slate-600 mt-1 " + (msg.from_client ? "" : "text-right")}>
                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString("fr-FR", {hour:"2-digit",minute:"2-digit"}) : ""}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => { if(e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
          placeholder="Repondre au client..."
          className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-500" />
        <button onClick={handleSend} disabled={sending || !newMessage.trim()}
          className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl disabled:opacity-50 transition-all">
          {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
