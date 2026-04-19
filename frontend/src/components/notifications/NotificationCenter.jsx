import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../../lib/api";
import { Bell, X, Check, CheckCheck, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const NOTIF_CONFIG = {
  new_lead: {icon:"🎯", color:"#047857", bg:"rgba(4,120,87,0.08)"},
  hot_lead: {icon:"🔥", color:"#c2410c", bg:"rgba(194,65,12,0.08)"},
  quote_opened: {icon:"👁️", color:"#78716c", bg:"rgba(120,113,108,0.08)"},
  quote_accepted: {icon:"✅", color:"#047857", bg:"rgba(4,120,87,0.08)"},
  quote_rejected: {icon:"❌", color:"#c2410c", bg:"rgba(194,65,12,0.08)"},
  payment_received: {icon:"💰", color:"#047857", bg:"rgba(4,120,87,0.08)"},
  ticket_created: {icon:"🎫", color:"#d97706", bg:"rgba(217,119,6,0.08)"},
  ticket_sla_breach: {icon:"⚠️", color:"#c2410c", bg:"rgba(194,65,12,0.08)"},
  workflow_executed: {icon:"⚡", color:"#047857", bg:"rgba(4,120,87,0.08)"},
  task_due: {icon:"📋", color:"#d97706", bg:"rgba(217,119,6,0.08)"},
  lead_score_high: {icon:"⭐", color:"#d97706", bg:"rgba(217,119,6,0.08)"},
  system: {icon:"🔔", color:"#78716c", bg:"rgba(120,113,108,0.08)"},
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
      const res = await api.get("/notifications/unread-count");
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
        className={"relative p-2 rounded-xl transition-all " + (open ? "bg-brand-100 text-brand-700" : "bg-white hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700")}>
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-terracotta-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{position:"fixed",right:"8px",top:"60px",width:"360px",maxWidth:"calc(100vw - 16px)",zIndex:999999,background:"#ffffff",border:"1px solid #e5e0d6",borderRadius:"16px",maxHeight:"75vh",overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.12)"}}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-600" />
              <span className="font-bold text-neutral-900 text-sm">Notifications</span>
              {unread > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-terracotta-50 text-terracotta-600 border border-terracotta-200">
                  {unread} nouvelles
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button onClick={markAllRead} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-all" title="Tout marquer lu">
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => { fetchNotifs(); }} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-all">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div style={{overflowY:"auto",maxHeight:"calc(75vh - 60px)"}}>
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
                      className={"flex items-start gap-3 px-4 py-3 cursor-pointer transition-all border-b border-neutral-100 " + (!n.read ? "bg-brand-50/50 border-l-2 border-l-brand-500" : "hover:bg-neutral-50")}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 mt-0.5"
                        style={{background:cfg.bg, border:"1px solid "+cfg.color+"30"}}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={"text-xs font-semibold truncate " + (!n.read ? "text-neutral-900" : "text-neutral-600")}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[10px] text-neutral-400">{timeAgo(n.created_at)}</span>
                            <button onClick={e => deleteNotif(n.notification_id, e)}
                              className="p-0.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 opacity-0 group-hover:opacity-100 transition-all">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                        {!n.read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                <Bell className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Aucune notification</p>
                <p className="text-xs mt-1 text-neutral-500">Les alertes apparaitront ici</p>
              </div>
            )}
          </div>

          {notifs.length > 0 && (
            <div className="px-4 py-2 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-[10px] text-neutral-500">{notifs.length} notifications</span>
              <button onClick={markAllRead} className="text-[10px] text-brand-600 hover:text-brand-700 font-semibold">
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
      const res = await api.get("/notifications", { params: { limit: 100 } });
      const raw = res.data?.items || res.data || [];
      setNotifs(Array.isArray(raw) ? raw : []);
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
            <Bell className="w-5 h-5 text-brand-600" />
            <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
          </div>
          <p className="text-neutral-500 text-sm">Historique de toutes vos alertes en temps reel</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg bg-white hover:bg-neutral-50 text-neutral-500 border border-neutral-200">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl text-sm font-semibold">
            <CheckCheck className="w-4 h-4" /> Tout marquer lu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {label:"Total",value:notifs.length,color:"#047857"},
          {label:"Non lues",value:notifs.filter(n=>!n.read).length,color:"#c2410c"},
          {label:"Leads chauds",value:notifs.filter(n=>n.type==="hot_lead").length,color:"#c2410c"},
          {label:"Aujourd hui",value:notifs.filter(n=>new Date(n.created_at).toDateString()===new Date().toDateString()).length,color:"#047857"},
        ].map((m,i) => (
          <div key={i} className="bg-white border border-neutral-200 rounded-xl p-4">
            <p className="text-2xl font-bold text-neutral-900 tabular-nums">{m.value}</p>
            <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {[["all","Toutes"],["unread","Non lues"],["read","Lues"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={"px-3 py-2 rounded-xl text-xs font-semibold transition-all " + (filter===v?"bg-brand-600 text-white":"bg-white text-neutral-500 hover:bg-neutral-100 border border-neutral-200")}>
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
                className={"flex items-start gap-4 p-4 bg-white border border-neutral-200 rounded-xl transition-all " + (n.action_url?"cursor-pointer hover:border-brand-200":"") + (!n.read?" bg-brand-50/30":"")}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{background:cfg.bg,border:"1px solid "+cfg.color+"30"}}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={"text-sm font-semibold " + (!n.read?"text-neutral-900":"text-neutral-600")}>{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-neutral-500">{n.message}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-neutral-400">{new Date(n.created_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
                  {n.action_url && <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <Bell className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">Aucune notification</p>
        </div>
      )}
    </div>
  );
}
