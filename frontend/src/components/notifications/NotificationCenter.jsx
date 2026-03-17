import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Bell, X, Check, CheckCheck, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BACKEND_URL from "../../config.js";

const API = BACKEND_URL + "/api";

const NOTIF_CONFIG = {
  new_lead: {icon:"🎯", color:"#a78bfa", bg:"rgba(167,139,250,0.1)"},
  hot_lead: {icon:"🔥", color:"#f43f5e", bg:"rgba(244,63,94,0.1)"},
  quote_opened: {icon:"👁️", color:"#60a5fa", bg:"rgba(96,165,250,0.1)"},
  quote_accepted: {icon:"✅", color:"#34d399", bg:"rgba(52,211,153,0.1)"},
  quote_rejected: {icon:"❌", color:"#f43f5e", bg:"rgba(244,63,94,0.1)"},
  payment_received: {icon:"💰", color:"#34d399", bg:"rgba(52,211,153,0.1)"},
  ticket_created: {icon:"🎫", color:"#f59e0b", bg:"rgba(245,158,11,0.1)"},
  ticket_sla_breach: {icon:"⚠️", color:"#f43f5e", bg:"rgba(244,63,94,0.1)"},
  workflow_executed: {icon:"⚡", color:"#a78bfa", bg:"rgba(167,139,250,0.1)"},
  task_due: {icon:"📋", color:"#f59e0b", bg:"rgba(245,158,11,0.1)"},
  lead_score_high: {icon:"⭐", color:"#f59e0b", bg:"rgba(245,158,11,0.1)"},
  system: {icon:"🔔", color:"#94a3b8", bg:"rgba(148,163,184,0.1)"},
};

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "A l instant";
  if (diff < 3600) return Math.floor(diff/60) + " min";
  if (diff < 86400) return Math.floor(diff/3600) + "h";
  return Math.floor(diff/86400) + "j";
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await axios.get(API + "/notifications/unread-count", {withCredentials:true});
      const newCount = res.data.count || 0;
      if (newCount > unread && unread > 0) {
        playNotificationSound();
      }
      setUnread(newCount);
    } catch(e) {}
  }, [unread]);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API + "/notifications/?limit=30", {withCredentials:true});
      setNotifs(res.data || []);
      setUnread((res.data || []).filter(n => !n.read).length);
    } catch(e) {} finally { setLoading(false); }
  };

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch(e) {}
  };

  useEffect(() => {
    fetchUnread();
    intervalRef.current = setInterval(fetchUnread, 15000);
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (open) fetchNotifs();
  }, [open]);

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const markRead = async (id) => {
    try {
      await axios.post(API + "/notifications/mark-read/" + id, {}, {withCredentials:true});
      setNotifs(prev => prev.map(n => n.notification_id === id ? {...n, read:true} : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch(e) {}
  };

  const markAllRead = async () => {
    try {
      await axios.post(API + "/notifications/mark-all-read", {}, {withCredentials:true});
      setNotifs(prev => prev.map(n => ({...n, read:true})));
      setUnread(0);
      toast.success("Toutes les notifications lues");
    } catch(e) {}
  };

  const deleteNotif = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(API + "/notifications/" + id, {withCredentials:true});
      setNotifs(prev => prev.filter(n => n.notification_id !== id));
    } catch(e) {}
  };

  const handleClick = (notif) => {
    markRead(notif.notification_id);
    if (notif.action_url) {
      navigate(notif.action_url);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setOpen(!open)}
        className={"relative p-2 rounded-xl transition-all " + (open ? "bg-violet-500/20 text-violet-300" : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200")}>
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-96 z-50 section-card overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-violet-400" />
              <span className="font-bold text-slate-100 text-sm">Notifications</span>
              {unread > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {unread} nouvelles
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button onClick={markAllRead} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-all" title="Tout marquer lu">
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => { fetchNotifs(); }} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-all">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto" style={{maxHeight:"480px"}}>
            {loading ? (
              <div className="space-y-2 p-3">
                {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
              </div>
            ) : notifs.length > 0 ? (
              <div>
                {notifs.map(n => {
                  const cfg = NOTIF_CONFIG[n.type] || NOTIF_CONFIG.system;
                  return (
                    <div key={n.notification_id}
                      onClick={() => handleClick(n)}
                      className={"flex items-start gap-3 px-4 py-3 cursor-pointer transition-all border-b border-white/3 hover:bg-white/5 " + (!n.read ? "bg-violet-500/5" : "")}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 mt-0.5"
                        style={{background:cfg.bg, border:"1px solid "+cfg.color+"30"}}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={"text-xs font-semibold truncate " + (!n.read ? "text-slate-100" : "text-slate-300")}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[10px] text-slate-600">{timeAgo(n.created_at)}</span>
                            <button onClick={e => deleteNotif(n.notification_id, e)}
                              className="p-0.5 rounded hover:bg-white/10 text-slate-700 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-all">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                        {!n.read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                <Bell className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Aucune notification</p>
                <p className="text-xs mt-1 text-slate-700">Les alertes apparaitront ici</p>
              </div>
            )}
          </div>

          {notifs.length > 0 && (
            <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-slate-600">{notifs.length} notifications</span>
              <button onClick={markAllRead} className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold">
                Tout marquer comme lu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API + "/notifications/?limit=100", {withCredentials:true});
      setNotifs(res.data || []);
    } catch(e) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    try {
      await axios.post(API + "/notifications/mark-all-read", {}, {withCredentials:true});
      setNotifs(prev => prev.map(n => ({...n, read:true})));
      toast.success("Toutes les notifications lues");
    } catch(e) {}
  };

  const filtered = filter === "unread" ? notifs.filter(n => !n.read) :
                   filter === "read" ? notifs.filter(n => n.read) : notifs;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100">Notifications</h1>
          </div>
          <p className="text-slate-500 text-sm">Historique de toutes vos alertes en temps reel</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/20 rounded-xl text-sm font-semibold">
            <CheckCheck className="w-4 h-4" /> Tout marquer lu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {label:"Total",value:notifs.length,color:"#a78bfa"},
          {label:"Non lues",value:notifs.filter(n=>!n.read).length,color:"#f43f5e"},
          {label:"Leads chauds",value:notifs.filter(n=>n.type==="hot_lead").length,color:"#f43f5e"},
          {label:"Aujourd hui",value:notifs.filter(n=>new Date(n.created_at).toDateString()===new Date().toDateString()).length,color:"#34d399"},
        ].map((m,i) => (
          <div key={i} className="metric-card">
            <p className="text-2xl font-bold text-slate-100">{m.value}</p>
            <p className="text-xs text-slate-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {[["all","Toutes"],["unread","Non lues"],["read","Lues"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={"px-3 py-2 rounded-xl text-xs font-semibold transition-all " + (filter===v?"bg-violet-600 text-white":"bg-white/5 text-slate-400 hover:bg-white/10")}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(n => {
            const cfg = NOTIF_CONFIG[n.type] || NOTIF_CONFIG.system;
            return (
              <div key={n.notification_id} onClick={() => n.action_url && navigate(n.action_url)}
                className={"flex items-start gap-4 p-4 section-card transition-all " + (n.action_url?"cursor-pointer hover:border-violet-500/20":"") + (!n.read?" bg-violet-500/3":"")}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{background:cfg.bg,border:"1px solid "+cfg.color+"30"}}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={"text-sm font-semibold " + (!n.read?"text-slate-100":"text-slate-300")}>{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500">{n.message}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-slate-600">{new Date(n.created_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
                  {n.action_url && <ExternalLink className="w-3.5 h-3.5 text-slate-600" />}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="section-card p-12 text-center">
          <Bell className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Aucune notification</p>
        </div>
      )}
    </div>
  );
}
