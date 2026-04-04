import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, GripVertical, Trello, RefreshCw, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import LeadScoreBadge from '../shared/LeadScoreBadge';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const COLUMNS = [
  { id: 'nouveau',      title: 'Nouveau',      color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)' },
  { id: 'contacté',    title: 'Contacté',     color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
  { id: 'en_attente',  title: 'En attente',   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)' },
  { id: 'devis_envoyé',title: 'Devis envoyé', color: '#c084fc', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)' },
  { id: 'gagné',       title: 'Gagné',        color: '#34d399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)' },
  { id: 'perdu',       title: 'Perdu',        color: '#f43f5e', bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.2)' },
];

// ── helpers ───────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);

const daysInStage = (lead) => {
  const d = new Date(lead.updated_at || lead.created_at);
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
};

const initials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
};

// ── Score bar ─────────────────────────────────
function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  const color = pct >= 70 ? '#34d399' : pct >= 40 ? '#f59e0b' : '#f43f5e';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 9, color, fontWeight: 700, minWidth: 20 }}>{pct}</span>
    </div>
  );
}

// ── Avatar ────────────────────────────────────
function Avatar({ name, color }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%',
      background: `${color}25`, border: `1px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 8, fontWeight: 700, color, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

// ── Kanban Card ───────────────────────────────
function KanbanCard({ lead, col, isDragging, onNavigate, onDragStart }) {
  const days = daysInStage(lead);
  const amount = lead.estimated_price || lead.amount || 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      data-testid={`kanban-card-${lead.lead_id}`}
      className="transition-all group"
      style={{
        borderRadius: 12,
        padding: '10px 12px',
        cursor: 'grab',
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${col.color}20`,
        borderLeft: `3px solid ${col.color}`,
        boxShadow: `0 2px 8px rgba(0,0,0,0.2), 0 0 0 0 ${col.color}`,
        opacity: isDragging ? 0.4 : 1,
        transform: isDragging ? 'scale(0.96)' : 'translateY(0)',
        transition: 'opacity 0.2s, transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        if (!isDragging) e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,0.3), 0 0 12px ${col.color}20`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2), 0 0 0 0 transparent';
      }}
    >
      {/* Top: avatar + name + drag handle */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <Avatar name={lead.name} color={col.color} />
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onNavigate(lead.lead_id)}>
          <p style={{
            fontSize: 12, fontWeight: 600, color: '#e2e8f0',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{lead.name}</p>
          <p style={{
            fontSize: 10, color: '#64748b', marginTop: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{lead.service_type || 'N/A'}</p>
        </div>
        <GripVertical style={{ width: 12, height: 12, color: '#334155', flexShrink: 0, marginTop: 2 }} />
      </div>

      {/* Contact */}
      {(lead.email || lead.phone) && (
        <div style={{ marginBottom: 8, paddingLeft: 30 }}>
          {lead.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Mail style={{ width: 9, height: 9, color: '#475569', flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lead.email}
              </span>
            </div>
          )}
          {lead.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone style={{ width: 9, height: 9, color: '#475569', flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: '#64748b' }}>{lead.phone}</span>
            </div>
          )}
        </div>
      )}

      {/* Score bar */}
      <div style={{ marginBottom: 8 }}>
        <ScoreBar score={lead.score || 50} />
      </div>

      {/* Bottom: amount + days in stage */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {amount > 0 ? (
          <span style={{
            fontSize: 11, fontWeight: 700, color: col.color,
            background: `${col.color}12`, border: `1px solid ${col.color}25`,
            borderRadius: 6, padding: '2px 7px',
          }}>
            {fmt(amount)}
          </span>
        ) : lead.surface ? (
          <span style={{
            fontSize: 9, color: '#64748b',
            background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '2px 6px',
          }}>
            {lead.surface} m²
          </span>
        ) : <span />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {days > 0 && (
            <span style={{
              fontSize: 9, color: days > 7 ? '#f59e0b' : '#64748b',
              background: days > 7 ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)',
              borderRadius: 4, padding: '2px 5px',
            }}>
              {days}j
            </span>
          )}
          <LeadScoreBadge score={lead.score || 50} />
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────
const KanbanBoard = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/leads?period=90d`, { withCredentials: true });
      setLeads(Array.isArray(res.data) ? res.data : res.data.leads || []);
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedLead || draggedLead.status === targetColumnId) { setDraggedLead(null); return; }
    const previousLeads = leads;
    const previousStatus = draggedLead.status;
    setLeads(prev => prev.map(l => l.lead_id === draggedLead.lead_id ? { ...l, status: targetColumnId } : l));
    setDraggedLead(null);
    try {
      await axios.patch(`${API_URL}/leads/${draggedLead.lead_id}`, { status: targetColumnId }, { withCredentials: true });
      const col = COLUMNS.find(c => c.id === targetColumnId);
      toast.success(`✅ Déplacé vers "${col?.title}"`, { duration: 2000 });
    } catch {
      toast.error(`❌ Erreur - retour à "${COLUMNS.find(c => c.id === previousStatus)?.title}"`, { duration: 3000 });
      setTimeout(() => setLeads(previousLeads), 300);
    }
  };

  if (loading) return (
    <div className="p-6 animate-fade-in">
      <div className="skeleton h-8 w-48 mb-6 rounded-lg" />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(6)].map((_, i) => <div key={i} className="flex-shrink-0 w-72 skeleton h-96 rounded-xl" />)}
      </div>
    </div>
  );

  // Grand total
  const grandTotal = leads.reduce((s, l) => s + (l.estimated_price || l.amount || 0), 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in" data-testid="kanban-board">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trello className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Pipeline</h1>
          </div>
          <p className="text-slate-500 text-sm">
            <span className="text-violet-400 font-semibold">{leads.length}</span> leads ·{' '}
            <span className="text-violet-400 font-semibold">{fmt(grandTotal)}</span> potentiel ·{' '}
            Glissez-déposez pour changer le statut
          </p>
        </div>
        <button onClick={fetchLeads} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all border border-white/5">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-6 -mx-4 px-4 md:mx-0 md:px-0">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter(l =>
            l.status === col.id ||
            (col.id === 'contacté' && l.status === 'contacte') ||
            (col.id === 'gagné' && l.status === 'gagne')
          );
          const colTotal = colLeads.reduce((s, l) => s + (l.estimated_price || l.amount || 0), 0);
          const isOver = dragOverColumn === col.id;

          return (
            <div key={col.id} className="flex-shrink-0 w-64 md:w-72" data-testid={`kanban-column-${col.id}`}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 10, padding: '8px 10px',
                background: `${col.color}08`, border: `1px solid ${col.color}20`,
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1' }}>{col.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, color: col.color,
                    background: `${col.color}15`, border: `1px solid ${col.color}25`,
                    borderRadius: 20, padding: '1px 8px',
                  }}>
                    {colLeads.length}
                  </span>
                </div>
              </div>

              {/* Column body */}
              <div
                style={{
                  borderRadius: 12, padding: 8, minHeight: 400,
                  background: isOver ? col.bg : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isOver ? col.border : 'rgba(255,255,255,0.05)'}`,
                  boxShadow: isOver ? `0 0 20px ${col.bg}` : 'none',
                  transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column',
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.id); }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {colLeads.length === 0 ? (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', padding: '32px 16px', gap: 8,
                      flex: 1,
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        border: `2px dashed ${col.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ color: col.color, fontSize: 18, lineHeight: 1 }}>+</span>
                      </div>
                      <p style={{ fontSize: 11, color: '#334155', textAlign: 'center' }}>
                        Glissez des leads ici
                      </p>
                    </div>
                  ) : (
                    colLeads.map((lead) => (
                      <KanbanCard
                        key={lead.lead_id}
                        lead={lead}
                        col={col}
                        isDragging={draggedLead?.lead_id === lead.lead_id}
                        onNavigate={(id) => navigate(`/leads/${id}`)}
                        onDragStart={(e) => {
                          setDraggedLead(lead);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                      />
                    ))
                  )}
                </div>

                {/* Column total */}
                {colLeads.length > 0 && colTotal > 0 && (
                  <div style={{
                    marginTop: 8,
                    padding: '6px 8px',
                    background: `${col.color}08`,
                    border: `1px solid ${col.color}20`,
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <TrendingUp style={{ width: 10, height: 10, color: col.color }} />
                      <span style={{ fontSize: 9, color: '#64748b' }}>Total</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: col.color }}>{fmt(colTotal)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;
