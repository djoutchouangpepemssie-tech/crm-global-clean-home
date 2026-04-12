import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PageHeader } from '../shared';
import axios from "axios";
import {
  useTicketsList,
  useTicketStats,
  useCreateTicket,
  useReplyTicket,
  useUpdateTicketStatus,
} from "../../hooks/api";
import { useLeadsList } from "../../hooks/api";
import {
  Ticket, Plus, RefreshCw, AlertTriangle, Clock, CheckCircle, Send,
  Search, Filter, X, ChevronDown, MessageSquare, Calendar, User,
  Tag, Zap, Shield, ArrowRight, Inbox, Sparkles, AlertCircle,
  ExternalLink, MoreHorizontal, Eye, Trash2, Archive
} from "lucide-react";
import { toast } from "sonner";
import BACKEND_URL from "../../config.js";

const API = BACKEND_URL + "/api";

/* ─── Constants ─── */
const PRIO = {
  urgent: { label: "Urgent", color: "#f43f5e", bg: "rgba(244,63,94,0.08)", ring: "rgba(244,63,94,0.3)", emoji: "🔴", glow: "0 0 20px rgba(244,63,94,0.15)" },
  high: { label: "Haute", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", ring: "rgba(245,158,11,0.3)", emoji: "🟠", glow: "0 0 20px rgba(245,158,11,0.15)" },
  normal: { label: "Normale", color: "#60a5fa", bg: "rgba(96,165,250,0.08)", ring: "rgba(96,165,250,0.3)", emoji: "🔵", glow: "0 0 20px rgba(96,165,250,0.15)" },
  low: { label: "Basse", color: "#94a3b8", bg: "rgba(148,163,184,0.08)", ring: "rgba(148,163,184,0.3)", emoji: "⚪", glow: "0 0 20px rgba(148,163,184,0.1)" },
};

const STAT = {
  open: { label: "Ouvert", color: "#60a5fa", bg: "rgba(96,165,250,0.1)", icon: Inbox },
  in_progress: { label: "En cours", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: Clock },
  waiting_client: { label: "Attente client", color: "#a78bfa", bg: "rgba(167,139,250,0.1)", icon: User },
  resolved: { label: "Résolu", color: "#34d399", bg: "rgba(52,211,153,0.1)", icon: CheckCircle },
  closed: { label: "Fermé", color: "#94a3b8", bg: "rgba(148,163,184,0.1)", icon: Archive },
};

const CATEGORIES = {
  general: { label: "Général", emoji: "📋" },
  reclamation: { label: "Réclamation", emoji: "⚠️" },
  question: { label: "Question", emoji: "❓" },
  intervention: { label: "Intervention", emoji: "🧹" },
  facturation: { label: "Facturation", emoji: "💰" },
};

/* ─── Inline Styles (CSS-in-JS for animations) ─── */
const cssAnimations = `
  @keyframes ticketSlideIn {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes ticketCardHover {
    from { transform: translateY(0); }
    to { transform: translateY(-2px); }
  }
  @keyframes modalSlideUp {
    from { opacity: 0; transform: translateY(40px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes modalBackdropIn {
    from { opacity: 0; backdrop-filter: blur(0px); }
    to { opacity: 1; backdrop-filter: blur(12px); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes pulseGlow {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  @keyframes slaFlash {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(244,63,94,0); }
    50% { opacity: 0.85; box-shadow: 0 0 16px 4px rgba(244,63,94,0.2); }
  }
  @keyframes slideDown {
    from { opacity: 0; max-height: 0; transform: translateY(-8px); }
    to { opacity: 1; max-height: 500px; transform: translateY(0); }
  }
  @keyframes badgePop {
    0% { transform: scale(0.5); opacity: 0; }
    60% { transform: scale(1.15); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes floatUp {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes spinSlow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes countUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes progressBar {
    from { width: 0%; }
    to { width: 100%; }
  }
  @keyframes ripple {
    0% { transform: scale(0); opacity: 0.6; }
    100% { transform: scale(2.5); opacity: 0; }
  }
  @keyframes confirmSlide {
    from { opacity: 0; transform: translateX(10px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .ticket-card-enter { animation: ticketSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
  .modal-enter { animation: modalSlideUp 0.35s cubic-bezier(0.16,1,0.3,1) both; }
  .modal-backdrop { animation: modalBackdropIn 0.25s ease-out both; }
  .skeleton-premium {
    background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.8s ease-in-out infinite;
    border-radius: 16px;
  }
  .sla-breach { animation: slaFlash 2s ease-in-out infinite; }
  .badge-pop { animation: badgePop 0.3s cubic-bezier(0.16,1,0.3,1) both; }
  .float-animation { animation: floatUp 3s ease-in-out infinite; }
  .confirm-slide { animation: confirmSlide 0.25s ease-out both; }
`;

/* ─── Premium Skeleton ─── */
function SkeletonCard({ index }) {
  return (
    <div
      className="ticket-card-enter"
      style={{
        animationDelay: `${index * 80}ms`,
        padding: "20px",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div className="skeleton-premium" style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="skeleton-premium" style={{ height: 10, width: "30%", borderRadius: 6 }} />
          <div className="skeleton-premium" style={{ height: 14, width: "70%", borderRadius: 8 }} />
          <div className="skeleton-premium" style={{ height: 10, width: "40%", borderRadius: 6 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div className="skeleton-premium" style={{ width: 72, height: 22, borderRadius: 12 }} />
          <div className="skeleton-premium" style={{ width: 64, height: 22, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ onCreateNew, filterActive }) {
  return (
    <div
      className="ticket-card-enter"
      style={{
        textAlign: "center",
        padding: "60px 24px",
        borderRadius: 20,
        background: "linear-gradient(135deg, rgba(139,92,246,0.03) 0%, rgba(59,130,246,0.03) 100%)",
        border: "1px dashed rgba(139,92,246,0.2)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(139,92,246,0.04)" }} />
      <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(59,130,246,0.04)" }} />

      <div className="float-animation" style={{ display: "inline-flex", width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1))", alignItems: "center", justifyContent: "center", marginBottom: 20, border: "1px solid rgba(139,92,246,0.15)" }}>
        {filterActive ? (
          <Filter style={{ width: 36, height: 36, color: "rgba(139,92,246,0.4)" }} />
        ) : (
          <Inbox style={{ width: 36, height: 36, color: "rgba(139,92,246,0.4)" }} />
        )}
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
        {filterActive ? "Aucun ticket trouvé" : "Boîte de réception vide"}
      </h3>
      <p style={{ color: "#64748b", fontSize: 14, maxWidth: 340, margin: "0 auto 24px", lineHeight: 1.6 }}>
        {filterActive
          ? "Essayez de modifier vos filtres ou créez un nouveau ticket."
          : "Vous êtes à jour ! Créez votre premier ticket pour commencer à suivre les demandes clients."
        }
      </p>

      <button
        onClick={onCreateNew}
        style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "14px 28px",
          background: "linear-gradient(135deg, #7c3aed, #6366f1)",
          color: "#fff", fontWeight: 700, fontSize: 14,
          borderRadius: 14, border: "none", cursor: "pointer",
          boxShadow: "0 4px 24px rgba(124,58,237,0.3)",
          transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(124,58,237,0.4)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(124,58,237,0.3)"; }}
      >
        <Plus style={{ width: 18, height: 18 }} />
        {filterActive ? "Créer un ticket" : "Créer mon premier ticket"}
        <Sparkles style={{ width: 14, height: 14, opacity: 0.7 }} />
      </button>
    </div>
  );
}

/* ─── Confirmation Dialog ─── */
function ConfirmDialog({ message, onConfirm, onCancel, color = "#7c3aed" }) {
  return (
    <div className="confirm-slide" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <AlertCircle style={{ width: 16, height: 16, color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: "#cbd5e1", flex: 1 }}>{message}</span>
      <button onClick={onConfirm} style={{ padding: "5px 12px", borderRadius: 8, background: color, color: "#fff", fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer" }}>Oui</button>
      <button onClick={onCancel} style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)", color: "#94a3b8", fontSize: 11, fontWeight: 700, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>Non</button>
    </div>
  );
}

/* ─── SLA Indicator ─── */
function SLAIndicator({ ticket }) {
  const isBreach = ticket.sla_breached || ticket.sla_status === "breached";
  const isWarning = ticket.sla_status === "warning" || (!isBreach && ticket.sla_remaining_hours != null && ticket.sla_remaining_hours < 2);

  if (!isBreach && !isWarning) return null;

  return (
    <div
      className={isBreach ? "sla-breach" : ""}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 8px", borderRadius: 8,
        background: isBreach ? "rgba(244,63,94,0.12)" : "rgba(245,158,11,0.12)",
        border: `1px solid ${isBreach ? "rgba(244,63,94,0.25)" : "rgba(245,158,11,0.25)"}`,
        fontSize: 10, fontWeight: 700,
        color: isBreach ? "#f43f5e" : "#f59e0b",
      }}
    >
      <AlertTriangle style={{ width: 10, height: 10 }} />
      {isBreach ? "SLA dépassé" : "SLA critique"}
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ label, value, icon: Icon, color, index, isAlert }) {
  return (
    <div
      className="ticket-card-enter"
      style={{
        animationDelay: `${index * 60}ms`,
        padding: "20px",
        borderRadius: 16,
        background: isAlert && value > 0
          ? "linear-gradient(135deg, rgba(244,63,94,0.06), rgba(244,63,94,0.02))"
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${isAlert && value > 0 ? "rgba(244,63,94,0.15)" : "rgba(255,255,255,0.05)"}`,
        transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = color + "40"; e.currentTarget.style.boxShadow = `0 8px 32px ${color}10`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = isAlert && value > 0 ? "rgba(244,63,94,0.15)" : "rgba(255,255,255,0.05)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Subtle glow */}
      <div style={{ position: "absolute", top: -20, right: -20, width: 60, height: 60, borderRadius: "50%", background: color + "08", filter: "blur(20px)" }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: color + "12", border: `1px solid ${color}25` }}>
          <Icon style={{ width: 18, height: 18, color }} />
        </div>
        {isAlert && value > 0 && (
          <div className="badge-pop" style={{ width: 8, height: 8, borderRadius: "50%", background: color, animation: "pulseGlow 2s ease-in-out infinite" }} />
        )}
      </div>

      <p style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", lineHeight: 1, animation: "countUp 0.4s ease-out both", animationDelay: `${index * 100 + 200}ms` }}>
        {value}
      </p>
      <p style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontWeight: 500 }}>{label}</p>
    </div>
  );
}

/* ─── Ticket Card ─── */
function TicketCard({ ticket, index, onClick }) {
  const p = PRIO[ticket.priority] || PRIO.normal;
  const s = STAT[ticket.status] || STAT.open;
  const StatusIcon = s.icon;
  const isBreach = ticket.sla_breached || ticket.sla_status === "breached";
  const replyCount = ticket.reply_count || ticket.replies?.length || 0;
  const createdAt = ticket.created_at ? new Date(ticket.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : null;

  return (
    <div
      className="ticket-card-enter"
      style={{
        animationDelay: `${index * 50}ms`,
        padding: "0",
        borderRadius: 16,
        background: isBreach
          ? "linear-gradient(135deg, rgba(244,63,94,0.04), rgba(255,255,255,0.015))"
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${isBreach ? "rgba(244,63,94,0.15)" : "rgba(255,255,255,0.05)"}`,
        cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
        overflow: "hidden",
        position: "relative",
      }}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = p.ring;
        e.currentTarget.style.boxShadow = p.glow;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = isBreach ? "rgba(244,63,94,0.15)" : "rgba(255,255,255,0.05)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Priority strip */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${p.color}, ${p.color}60)`, borderRadius: "16px 0 0 16px" }} />

      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px 16px 24px" }}>
        {/* Priority icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: p.bg, border: `1px solid ${p.ring}`,
          fontSize: 20, flexShrink: 0,
          transition: "all 0.3s ease",
        }}>
          {p.emoji}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace", fontWeight: 600 }}>#{ticket.ticket_number}</span>
            {ticket.category && CATEGORIES[ticket.category] && (
              <span style={{ fontSize: 10, color: "#64748b", background: "rgba(255,255,255,0.04)", padding: "2px 6px", borderRadius: 6 }}>
                {CATEGORIES[ticket.category].emoji} {CATEGORIES[ticket.category].label}
              </span>
            )}
            <SLAIndicator ticket={ticket} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 650, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4 }}>
            {ticket.subject}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b" }}>
              <User style={{ width: 11, height: 11 }} /> {ticket.client_name || "Client inconnu"}
            </span>
            {createdAt && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#475569" }}>
                <Calendar style={{ width: 11, height: 11 }} /> {createdAt}
              </span>
            )}
            {replyCount > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#475569" }}>
                <MessageSquare style={{ width: 11, height: 11 }} /> {replyCount}
              </span>
            )}
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 10,
            background: s.bg, border: `1px solid ${s.color}25`,
            fontSize: 11, fontWeight: 700, color: s.color,
          }}>
            <StatusIcon style={{ width: 12, height: 12 }} />
            {s.label}
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 8px", borderRadius: 8,
            background: p.bg,
            fontSize: 10, fontWeight: 700, color: p.color,
          }}>
            {p.label}
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight style={{ width: 16, height: 16, color: "#334155", flexShrink: 0, transition: "all 0.3s ease" }} />
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function TicketsList() {
  // ── Vague 6 : React Query ────────────────────────────────────
  const queryStr = useMemo(() => {
    const params = [];
    if (filterStatus) params.push("status=" + filterStatus);
    return params.length ? "?" + params.join("&") : "";
  }, [filterStatus]);
  const { data: tickets = [], isLoading: ticketsLoading, isRefetching: refreshing, refetch } = useTicketsList(queryStr);
  const { data: stats = { open: 0, in_progress: 0, resolved: 0, sla_breaches: 0 } } = useTicketStats();
  const { data: leads = [] } = useLeadsList({ limit: 50 });
  const createTicketMut = useCreateTicket();
  const replyTicketMut = useReplyTicket();
  const updateStatusMut = useUpdateTicketStatus();

  const loading = ticketsLoading;
  const load = useCallback(async () => { await refetch(); }, [refetch]);

  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", priority: "normal", category: "general", lead_id: "", client_name: "", client_email: "" });
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [modalClosing, setModalClosing] = useState(false);
  const searchRef = useRef(null);

  /* Filter tickets client-side for priority & search */
  const filteredTickets = tickets.filter(t => {
    if (filterPriority && t.priority !== filterPriority) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (t.subject || "").toLowerCase().includes(q) ||
        (t.client_name || "").toLowerCase().includes(q) ||
        (t.ticket_number || "").toString().includes(q)
      );
    }
    return true;
  });

  const createTicket = async () => {
    if (!form.subject || !form.description) { toast.error("Remplissez l'objet et la description"); return; }
    setSaving(true);
    try {
      await createTicketMut.mutateAsync(form);
      closeModal("new");
      setForm({ subject: "", description: "", priority: "normal", category: "general", lead_id: "", client_name: "", client_email: "" });
    } catch {}
    finally { setSaving(false); }
  };

  const openTicket = async (t) => {
    try {
      const res = await axios.get(API + "/tickets/" + t.ticket_id, { withCredentials: true });
      setSelected(res.data);
    } catch { setSelected(t); }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await replyTicketMut.mutateAsync({ ticketId: selected.ticket_id, message: reply, is_internal: isInternal });
      setReply("");
      const res = await axios.get(API + "/tickets/" + selected.ticket_id, { withCredentials: true });
      setSelected(res.data);
    } catch {}
    finally { setSending(false); }
  };

  const changeStatus = async (status) => {
    if (!selected) return;
    setConfirmAction(null);
    try {
      await updateStatusMut.mutateAsync({ ticketId: selected.ticket_id, status });
      const res = await axios.get(API + "/tickets/" + selected.ticket_id, { withCredentials: true });
      setSelected(res.data);
    } catch {}
  };

  const closeModal = (type) => {
    setModalClosing(true);
    setTimeout(() => {
      if (type === "detail") setSelected(null);
      if (type === "new") setShowNew(false);
      setModalClosing(false);
    }, 200);
  };

  const handleBackdropClick = (e, type) => {
    if (e.target === e.currentTarget) closeModal(type);
  };

  return (
    <>
      <style>{cssAnimations}</style>
      <div className="crm-p-mobile" style={{ padding: "16px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ─── Header ─── */}
        <div className="ticket-card-enter crm-page-header" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.15))", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(139,92,246,0.2)" }}>
                <Ticket style={{ width: 18, height: 18, color: "#a78bfa" }} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>Service Client</h1>
            </div>
            <p style={{ color: "#64748b", fontSize: 13, marginLeft: 46 }}>Gestion des tickets et demandes clients</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => load(true)}
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.2s",
                color: "#94a3b8",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
            >
              <RefreshCw style={{ width: 16, height: 16, animation: refreshing ? "spinSlow 1s linear infinite" : "none" }} />
            </button>
            <button
              onClick={() => setShowNew(true)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px",
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                color: "#fff", fontWeight: 700, fontSize: 13,
                borderRadius: 12, border: "none", cursor: "pointer",
                boxShadow: "0 4px 20px rgba(124,58,237,0.25)",
                transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(124,58,237,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,58,237,0.25)"; }}
            >
              <Plus style={{ width: 16, height: 16 }} /> Nouveau ticket
            </button>
          </div>
        </div>

        {/* ─── Stats ─── */}
        <div className="crm-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Ouverts", value: stats.open || 0, icon: Inbox, color: "#60a5fa" },
            { label: "En cours", value: stats.in_progress || 0, icon: Clock, color: "#f59e0b" },
            { label: "Résolus", value: stats.resolved || 0, icon: CheckCircle, color: "#34d399" },
            { label: "SLA dépassés", value: stats.sla_breaches || 0, icon: AlertTriangle, color: stats.sla_breaches > 0 ? "#f43f5e" : "#94a3b8", isAlert: true },
          ].map((m, i) => (
            <StatCard key={i} {...m} index={i} />
          ))}
        </div>

        {/* ─── Search & Filters ─── */}
        <div className="ticket-card-enter" style={{ animationDelay: "200ms", display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* Search bar */}
            <div style={{
              flex: "1 1 220px", display: "flex", alignItems: "center", gap: 8,
              padding: "0 14px", height: 42, borderRadius: 12,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              transition: "all 0.2s",
            }}>
              <Search style={{ width: 15, height: 15, color: "#64748b", flexShrink: 0 }} />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un ticket..."
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: "#e2e8f0", fontSize: 13,
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <X style={{ width: 14, height: 14, color: "#64748b" }} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "0 14px", height: 42, borderRadius: 12,
                background: showFilters ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${showFilters ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.06)"}`,
                color: showFilters ? "#a78bfa" : "#94a3b8",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <Filter style={{ width: 14, height: 14 }} />
              Filtres
              {(filterStatus || filterPriority) && (
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#7c3aed", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {(filterStatus ? 1 : 0) + (filterPriority ? 1 : 0)}
                </span>
              )}
              <ChevronDown style={{ width: 14, height: 14, transition: "transform 0.2s", transform: showFilters ? "rotate(180deg)" : "rotate(0)" }} />
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div style={{ animation: "slideDown 0.3s ease-out both", display: "flex", flexDirection: "column", gap: 12, padding: "16px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Statut</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[["", "Tous"], ...Object.entries(STAT).map(([k, v]) => [k, v.label])].map(([v, l]) => {
                    const isActive = filterStatus === v;
                    const statObj = STAT[v];
                    return (
                      <button
                        key={v}
                        onClick={() => setFilterStatus(v)}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "6px 14px", borderRadius: 10,
                          background: isActive ? (statObj ? statObj.bg : "rgba(139,92,246,0.12)") : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isActive ? (statObj ? statObj.color + "30" : "rgba(139,92,246,0.3)") : "rgba(255,255,255,0.06)"}`,
                          color: isActive ? (statObj ? statObj.color : "#a78bfa") : "#94a3b8",
                          fontSize: 12, fontWeight: 650, cursor: "pointer",
                          transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
                        }}
                      >
                        {statObj && <statObj.icon style={{ width: 12, height: 12 }} />}
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Priorité</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[["", "Toutes"], ...Object.entries(PRIO).map(([k, v]) => [k, v.emoji + " " + v.label])].map(([v, l]) => {
                    const isActive = filterPriority === v;
                    const prioObj = PRIO[v];
                    return (
                      <button
                        key={v}
                        onClick={() => setFilterPriority(v)}
                        style={{
                          padding: "6px 14px", borderRadius: 10,
                          background: isActive ? (prioObj ? prioObj.bg : "rgba(139,92,246,0.12)") : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isActive ? (prioObj ? prioObj.ring : "rgba(139,92,246,0.3)") : "rgba(255,255,255,0.06)"}`,
                          color: isActive ? (prioObj ? prioObj.color : "#a78bfa") : "#94a3b8",
                          fontSize: 12, fontWeight: 650, cursor: "pointer",
                          transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
                        }}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(filterStatus || filterPriority) && (
                <button
                  onClick={() => { setFilterStatus(""); setFilterPriority(""); }}
                  style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 10, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", color: "#f43f5e", fontSize: 12, fontWeight: 650, cursor: "pointer" }}
                >
                  <X style={{ width: 12, height: 12 }} /> Effacer les filtres
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── Ticket List ─── */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[0, 1, 2, 3, 4].map(i => <SkeletonCard key={i} index={i} />)}
          </div>
        ) : filteredTickets.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Results count */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, padding: "0 4px" }}>
              <p style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                {filteredTickets.length} ticket{filteredTickets.length > 1 ? "s" : ""}
                {(searchQuery || filterPriority) ? " trouvé" + (filteredTickets.length > 1 ? "s" : "") : ""}
              </p>
            </div>
            {filteredTickets.map((t, i) => (
              <TicketCard key={t.ticket_id} ticket={t} index={i} onClick={() => openTicket(t)} />
            ))}
          </div>
        ) : (
          <EmptyState onCreateNew={() => setShowNew(true)} filterActive={!!(filterStatus || filterPriority || searchQuery)} />
        )}

        {/* ─── New Ticket Modal ─── */}
        {showNew && (
          <div
            className="modal-backdrop"
            onClick={e => handleBackdropClick(e, "new")}
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 16,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(12px)",
              opacity: modalClosing ? 0 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <div
              className={modalClosing ? "" : "modal-enter"}
              style={{
                width: "100%", maxWidth: 520,
                borderRadius: 20, padding: 0,
                background: "linear-gradient(180deg, rgba(30,27,46,0.98), rgba(15,23,42,0.99))",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset",
                transform: modalClosing ? "translateY(20px) scale(0.97)" : undefined,
                opacity: modalClosing ? 0 : undefined,
                transition: modalClosing ? "all 0.2s ease-in" : undefined,
                maxHeight: "90vh", overflow: "auto",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 24px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.15))", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <Plus style={{ width: 20, height: 20, color: "#a78bfa" }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 750, color: "#f1f5f9" }}>Nouveau ticket</h3>
                    <p style={{ fontSize: 12, color: "#64748b" }}>Créer une demande de support</p>
                  </div>
                </div>
                <button onClick={() => closeModal("new")} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#e2e8f0"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#64748b"; }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>

              {/* Form */}
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Lead selection */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 650, color: "#94a3b8", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <User style={{ width: 12, height: 12 }} /> Client (optionnel)
                  </label>
                  <select value={form.lead_id} onChange={e => { const ld = leads.find(x => x.lead_id === e.target.value); setForm(p => ({ ...p, lead_id: e.target.value, client_name: ld ? ld.name : "", client_email: ld ? ld.email : "" })); }}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: 13, outline: "none", cursor: "pointer", transition: "border-color 0.2s" }}>
                    <option value="" style={{ background: "#1e1b2e" }}>Sans fiche lead</option>
                    {leads.map(ld => <option key={ld.lead_id} value={ld.lead_id} style={{ background: "#1e1b2e" }}>{ld.name}</option>)}
                  </select>
                </div>

                {!form.lead_id && (
                  <div className="crm-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, animation: "slideDown 0.25s ease-out both" }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 650, color: "#94a3b8", marginBottom: 6, display: "block" }}>Nom</label>
                      <input value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} placeholder="Jean Dupont"
                        style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: 13, outline: "none", transition: "border-color 0.2s", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 650, color: "#94a3b8", marginBottom: 6, display: "block" }}>Email</label>
                      <input value={form.client_email} onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))} placeholder="email@ex.com"
                        style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: 13, outline: "none", transition: "border-color 0.2s", boxSizing: "border-box" }} />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 12, fontWeight: 650, color: "#94a3b8", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <Tag style={{ width: 12, height: 12 }} /> Objet <span style={{ color: "#f43f5e" }}>*</span>
                  </label>
                  <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Ex: Problème après intervention"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: 13, outline: "none", transition: "border-color 0.2s", boxSizing: "border-box" }} />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 650, color: "#94a3b8", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <MessageSquare style={{ width: 12, height: 12 }} /> Description <span style={{ color: "#f43f5e" }}>*</span>
                  </label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4} placeholder="Décrivez le problème en détail..."
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: 13, outline: "none", resize: "none", lineHeight: 1.6, transition: "border-color 0.2s", boxSizing: "border-box" }} />
                </div>

                <div className="crm-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 650, color: "#94a3b8", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <Zap style={{ width: 12, height: 12 }} /> Priorité
                    </label>
                    <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: 13, outline: "none", cursor: "pointer" }}>
                      <option value="urgent" style={{ background: "#1e1b2e" }}>🔴 Urgent</option>
                      <option value="high" style={{ background: "#1e1b2e" }}>🟠 Haute</option>
                      <option value="normal" style={{ background: "#1e1b2e" }}>🔵 Normale</option>
                      <option value="low" style={{ background: "#1e1b2e" }}>⚪ Basse</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 650, color: "#94a3b8", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <Shield style={{ width: 12, height: 12 }} /> Catégorie
                    </label>
                    <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: 13, outline: "none", cursor: "pointer" }}>
                      {Object.entries(CATEGORIES).map(([k, v]) => (
                        <option key={k} value={k} style={{ background: "#1e1b2e" }}>{v.emoji} {v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, padding: "0 24px 24px" }}>
                <button onClick={() => closeModal("new")}
                  style={{ flex: 1, padding: "12px 0", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: 13, fontWeight: 650, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                >Annuler</button>
                <button onClick={createTicket} disabled={saving}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 12,
                    background: saving ? "rgba(139,92,246,0.3)" : "linear-gradient(135deg, #7c3aed, #6366f1)",
                    border: "none", color: "#fff", fontSize: 13, fontWeight: 750,
                    cursor: saving ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 20px rgba(124,58,237,0.25)",
                    transition: "all 0.3s",
                    opacity: saving ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(124,58,237,0.35)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,58,237,0.25)"; }}
                >
                  {saving ? "Création..." : "✨ Créer le ticket"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Detail Modal ─── */}
        {selected && (
          <div
            className="modal-backdrop"
            onClick={e => handleBackdropClick(e, "detail")}
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 16,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(12px)",
              opacity: modalClosing ? 0 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <div
              className={modalClosing ? "" : "modal-enter"}
              style={{
                width: "100%", maxWidth: 680,
                borderRadius: 20,
                background: "linear-gradient(180deg, rgba(30,27,46,0.98), rgba(15,23,42,0.99))",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset",
                display: "flex", flexDirection: "column",
                maxHeight: "90vh",
                transform: modalClosing ? "translateY(20px) scale(0.97)" : undefined,
                opacity: modalClosing ? 0 : undefined,
                transition: modalClosing ? "all 0.2s ease-in" : undefined,
              }}
            >
              {/* Header */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#475569", fontWeight: 600 }}>#{selected.ticket_number}</span>
                      <span className="badge-pop" style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 10px", borderRadius: 8,
                        background: (STAT[selected.status] || STAT.open).bg,
                        border: `1px solid ${(STAT[selected.status] || STAT.open).color}25`,
                        fontSize: 11, fontWeight: 700, color: (STAT[selected.status] || STAT.open).color,
                      }}>
                        {React.createElement((STAT[selected.status] || STAT.open).icon, { style: { width: 11, height: 11 } })}
                        {(STAT[selected.status] || STAT.open).label}
                      </span>
                      <span style={{
                        padding: "3px 8px", borderRadius: 8,
                        background: (PRIO[selected.priority] || PRIO.normal).bg,
                        fontSize: 10, fontWeight: 700, color: (PRIO[selected.priority] || PRIO.normal).color,
                      }}>
                        {(PRIO[selected.priority] || PRIO.normal).emoji} {(PRIO[selected.priority] || PRIO.normal).label}
                      </span>
                      <SLAIndicator ticket={selected} />
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 750, color: "#f1f5f9", lineHeight: 1.3, marginBottom: 4 }}>{selected.subject}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b" }}>
                        <User style={{ width: 12, height: 12 }} /> {selected.client_name || "Client inconnu"}
                      </span>
                      {selected.created_at && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#475569" }}>
                          <Calendar style={{ width: 12, height: 12 }} />
                          {new Date(selected.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => closeModal("detail")}
                    style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", flexShrink: 0, marginLeft: 12, transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#e2e8f0"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#64748b"; }}
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Description */}
                <div style={{ padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <MessageSquare style={{ width: 13, height: 13, color: "#64748b" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</span>
                  </div>
                  <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.7 }}>{selected.description}</p>
                </div>

                {/* Replies */}
                {(selected.replies || []).map((r, i) => (
                  <div
                    key={i}
                    className="ticket-card-enter"
                    style={{
                      animationDelay: `${i * 60}ms`,
                      padding: 14, borderRadius: 14,
                      background: r.is_internal ? "rgba(245,158,11,0.04)" : "rgba(96,165,250,0.04)",
                      border: `1px solid ${r.is_internal ? "rgba(245,158,11,0.12)" : "rgba(96,165,250,0.12)"}`,
                      borderLeft: `3px solid ${r.is_internal ? "#f59e0b" : "#60a5fa"}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 8, background: r.is_internal ? "rgba(245,158,11,0.12)" : "rgba(96,165,250,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {r.is_internal
                            ? <Eye style={{ width: 11, height: 11, color: "#f59e0b" }} />
                            : <Send style={{ width: 11, height: 11, color: "#60a5fa" }} />
                          }
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: r.is_internal ? "#f59e0b" : "#60a5fa" }}>
                          {r.is_internal ? "Note interne" : "Réponse client"}
                        </span>
                      </div>
                      {r.created_at && (
                        <span style={{ fontSize: 10, color: "#475569" }}>
                          {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>{r.message}</p>
                  </div>
                ))}

                {/* Reply form */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setIsInternal(false)}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "6px 14px", borderRadius: 10,
                        background: !isInternal ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${!isInternal ? "rgba(96,165,250,0.25)" : "rgba(255,255,255,0.06)"}`,
                        color: !isInternal ? "#60a5fa" : "#64748b",
                        fontSize: 12, fontWeight: 650, cursor: "pointer",
                        transition: "all 0.25s",
                      }}>
                      <Send style={{ width: 12, height: 12 }} /> Email client
                    </button>
                    <button onClick={() => setIsInternal(true)}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "6px 14px", borderRadius: 10,
                        background: isInternal ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isInternal ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.06)"}`,
                        color: isInternal ? "#f59e0b" : "#64748b",
                        fontSize: 12, fontWeight: 650, cursor: "pointer",
                        transition: "all 0.25s",
                      }}>
                      <Eye style={{ width: 12, height: 12 }} /> Note interne
                    </button>
                  </div>
                  <textarea
                    value={reply} onChange={e => setReply(e.target.value)}
                    rows={3} placeholder={isInternal ? "Ajouter une note interne..." : "Répondre au client..."}
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${isInternal ? "rgba(245,158,11,0.12)" : "rgba(96,165,250,0.12)"}`,
                      color: "#e2e8f0", fontSize: 13, outline: "none", resize: "none", lineHeight: 1.6,
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = isInternal ? "rgba(245,158,11,0.3)" : "rgba(96,165,250,0.3)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = isInternal ? "rgba(245,158,11,0.12)" : "rgba(96,165,250,0.12)"; }}
                  />
                  <button
                    onClick={sendReply} disabled={sending || !reply.trim()}
                    style={{
                      alignSelf: "flex-end",
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "10px 20px", borderRadius: 10,
                      background: (sending || !reply.trim()) ? "rgba(96,165,250,0.15)" : "linear-gradient(135deg, #3b82f6, #6366f1)",
                      border: "none", color: "#fff", fontSize: 12, fontWeight: 700,
                      cursor: (sending || !reply.trim()) ? "not-allowed" : "pointer",
                      opacity: (sending || !reply.trim()) ? 0.5 : 1,
                      boxShadow: (sending || !reply.trim()) ? "none" : "0 4px 16px rgba(59,130,246,0.25)",
                      transition: "all 0.3s",
                    }}
                    onMouseEnter={e => { if (!sending && reply.trim()) { e.currentTarget.style.transform = "translateY(-1px)"; } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <Send style={{ width: 13, height: 13 }} /> {sending ? "Envoi..." : "Envoyer"}
                  </button>
                </div>
              </div>

              {/* Status actions */}
              <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                {confirmAction ? (
                  <ConfirmDialog
                    message={`Changer le statut en "${confirmAction.label}" ?`}
                    color={confirmAction.color}
                    onConfirm={() => changeStatus(confirmAction.status)}
                    onCancel={() => setConfirmAction(null)}
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Changer le statut</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {Object.entries(STAT).filter(([k]) => k !== selected.status).map(([k, v]) => (
                        <button
                          key={k}
                          onClick={() => setConfirmAction({ type: "status", status: k, label: v.label, color: v.color })}
                          style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "7px 14px", borderRadius: 10,
                            background: v.bg, border: `1px solid ${v.color}20`,
                            fontSize: 12, fontWeight: 650, color: v.color,
                            cursor: "pointer", transition: "all 0.25s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = v.color + "50"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = v.color + "20"; e.currentTarget.style.transform = "translateY(0)"; }}
                        >
                          {React.createElement(v.icon, { style: { width: 12, height: 12 } })}
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
