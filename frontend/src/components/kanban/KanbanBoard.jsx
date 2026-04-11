import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, Phone, GripVertical, Trello, RefreshCw, TrendingUp, Sparkles, Zap, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import LeadScoreBadge from '../shared/LeadScoreBadge';
import { useLeadsList, useUpdateLead } from '../../hooks/api';
import { queryKeys } from '../../lib/api';

const COLUMNS = [
  { id: 'nouveau',      title: 'Nouveau',      color: '#60a5fa', gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)', icon: '🆕' },
  { id: 'contacté',    title: 'Contacté',     color: '#a78bfa', gradient: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', icon: '📞' },
  { id: 'en_attente',  title: 'En attente',   color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: '⏳' },
  { id: 'devis_envoyé',title: 'Devis envoyé', color: '#c084fc', gradient: 'linear-gradient(135deg, #c084fc, #a855f7)', icon: '📄' },
  { id: 'gagné',       title: 'Gagné',        color: '#34d399', gradient: 'linear-gradient(135deg, #34d399, #10b981)', icon: '🏆' },
  { id: 'perdu',       title: 'Perdu',        color: '#f43f5e', gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)', icon: '❌' },
];

// ── CSS Keyframes (injected once) ─────────────
const STYLE_ID = 'kanban-premium-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes kanban-card-appear {
      0% { opacity: 0; transform: translateY(16px) scale(0.95); }
      60% { transform: translateY(-3px) scale(1.01); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes kanban-card-drop {
      0% { transform: scale(1.08) rotate(1deg); box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
      40% { transform: scale(0.97) rotate(-0.5deg); }
      70% { transform: scale(1.02) rotate(0.2deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
    @keyframes kanban-column-pulse {
      0%, 100% { box-shadow: 0 0 0 0 transparent; }
      50% { box-shadow: 0 0 30px var(--col-glow); }
    }
    @keyframes kanban-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes kanban-badge-pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.25); }
      100% { transform: scale(1); }
    }
    @keyframes kanban-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    @keyframes kanban-glow-ring {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.8; }
    }
    @keyframes kanban-drag-ghost {
      0% { transform: scale(1) rotate(0deg); }
      100% { transform: scale(1.05) rotate(1.5deg); }
    }
    @keyframes kanban-total-bar-shine {
      0% { background-position: -100% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes kanban-empty-float {
      0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
      50% { transform: translateY(-6px) scale(1.05); opacity: 0.7; }
    }
    .kanban-card-enter {
      animation: kanban-card-appear 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    .kanban-card-dropped {
      animation: kanban-card-drop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    .kanban-board-scroll::-webkit-scrollbar { height: 6px; }
    .kanban-board-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 3px; }
    .kanban-board-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
    .kanban-board-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
    .kanban-card-premium {
      position: relative;
      overflow: hidden;
    }
    .kanban-card-premium::before {
      content: '';
      position: absolute;
      top: 0; left: -100%; width: 50%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
      transition: left 0.6s ease;
    }
    .kanban-card-premium:hover::before {
      left: 150%;
    }
    .kanban-col-body {
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .kanban-col-body.drag-over {
      transform: scale(1.01);
    }
    @media (max-width: 768px) {
      .kanban-card-premium { touch-action: none; }
    }
  `;
  document.head.appendChild(style);
}

// ── Helpers ───────────────────────────────────
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

// ── Premium Score Bar ─────────────────────────
function ScoreBar({ score, color }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  const barColor = pct >= 70 ? '#34d399' : pct >= 40 ? '#f59e0b' : '#f43f5e';
  const barGlow = pct >= 70 ? 'rgba(52,211,153,0.3)' : pct >= 40 ? 'rgba(245,158,11,0.3)' : 'rgba(244,63,94,0.3)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1, height: 4, borderRadius: 4,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg, ${barColor}88, ${barColor})`,
          borderRadius: 4,
          transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: `0 0 8px ${barGlow}`,
          position: 'relative',
        }}>
          {/* Shimmer on the bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'kanban-shimmer 2s linear infinite',
          }} />
        </div>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 800, color: barColor,
        minWidth: 24, textAlign: 'right',
        textShadow: `0 0 8px ${barGlow}`,
      }}>{pct}</span>
    </div>
  );
}

// ── Premium Avatar ────────────────────────────
function Avatar({ name, color }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 10,
      background: `linear-gradient(135deg, ${color}30, ${color}10)`,
      border: `1.5px solid ${color}50`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 800, color,
      flexShrink: 0,
      boxShadow: `0 2px 8px ${color}20, inset 0 1px 0 rgba(255,255,255,0.1)`,
      transition: 'all 0.3s ease',
      letterSpacing: '0.5px',
    }}>
      {initials(name)}
    </div>
  );
}

// ── Premium Kanban Card ───────────────────────
function KanbanCard({ lead, col, isDragging, isJustDropped, onNavigate, onDragStart, index }) {
  const [isHovered, setIsHovered] = useState(false);
  const days = daysInStage(lead);
  const amount = lead.estimated_price || lead.amount || 0;

  const cardClasses = [
    'kanban-card-premium',
    'kanban-card-enter',
    isJustDropped ? 'kanban-card-dropped' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      draggable
      onDragStart={onDragStart}
      data-testid={`kanban-card-${lead.lead_id}`}
      className={cardClasses}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={(e) => {
        // Better touch support
        const touch = e.touches[0];
        e.currentTarget.dataset.touchStartY = touch.clientY;
      }}
      style={{
        borderRadius: 14,
        padding: '12px 14px',
        cursor: isDragging ? 'grabbing' : 'grab',
        background: isHovered
          ? `linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03), ${col.color}08)`
          : 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        border: `1px solid ${isHovered ? col.color + '40' : 'rgba(255,255,255,0.06)'}`,
        borderLeft: `3px solid ${col.color}`,
        boxShadow: isDragging
          ? `0 20px 60px rgba(0,0,0,0.4), 0 0 30px ${col.color}30, inset 0 1px 0 rgba(255,255,255,0.08)`
          : isHovered
            ? `0 8px 32px rgba(0,0,0,0.3), 0 0 20px ${col.color}15, inset 0 1px 0 rgba(255,255,255,0.08)`
            : `0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)`,
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging
          ? 'scale(1.05) rotate(2deg)'
          : isHovered
            ? 'translateY(-2px) scale(1.01)'
            : 'translateY(0) scale(1)',
        transition: isDragging
          ? 'none'
          : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        animationDelay: `${index * 0.06}s`,
        position: 'relative',
        zIndex: isDragging ? 100 : isHovered ? 10 : 1,
        willChange: 'transform, box-shadow',
      }}
    >
      {/* Glow accent line at top */}
      <div style={{
        position: 'absolute',
        top: 0, left: 14, right: 14,
        height: 1,
        background: `linear-gradient(90deg, transparent, ${col.color}${isHovered ? '60' : '20'}, transparent)`,
        transition: 'all 0.3s ease',
      }} />

      {/* Top row: avatar + name + grip */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <Avatar name={lead.name} color={col.color} />
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onNavigate(lead.lead_id)}>
          <p style={{
            fontSize: 13, fontWeight: 700, color: '#e2e8f0',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            letterSpacing: '-0.01em',
            transition: 'color 0.2s',
            ...(isHovered ? { color: '#f1f5f9' } : {}),
          }}>{lead.name}</p>
          <p style={{
            fontSize: 10, color: '#64748b', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {lead.service_type || 'N/A'}
            {isHovered && <ChevronRight style={{ width: 10, height: 10, color: col.color, transition: 'all 0.2s' }} />}
          </p>
        </div>
        <GripVertical style={{
          width: 14, height: 14,
          color: isHovered ? col.color + '80' : '#334155',
          flexShrink: 0, marginTop: 2,
          transition: 'color 0.3s, transform 0.3s',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        }} />
      </div>

      {/* Contact info */}
      {(lead.email || lead.phone) && (
        <div style={{
          marginBottom: 10, paddingLeft: 38,
          opacity: isHovered ? 1 : 0.7,
          transition: 'opacity 0.3s',
        }}>
          {lead.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <Mail style={{ width: 10, height: 10, color: col.color + '60', flexShrink: 0 }} />
              <span style={{
                fontSize: 10, color: '#94a3b8',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {lead.email}
              </span>
            </div>
          )}
          {lead.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone style={{ width: 10, height: 10, color: col.color + '60', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#94a3b8' }}>{lead.phone}</span>
            </div>
          )}
        </div>
      )}

      {/* Score bar */}
      <div style={{ marginBottom: 10 }}>
        <ScoreBar score={lead.score || 50} color={col.color} />
      </div>

      {/* Bottom: amount + meta */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 8,
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        {amount > 0 ? (
          <span style={{
            fontSize: 12, fontWeight: 800, color: col.color,
            background: `linear-gradient(135deg, ${col.color}15, ${col.color}08)`,
            border: `1px solid ${col.color}30`,
            borderRadius: 8, padding: '3px 10px',
            boxShadow: `0 2px 8px ${col.color}10`,
            letterSpacing: '-0.01em',
          }}>
            {fmt(amount)}
          </span>
        ) : lead.surface ? (
          <span style={{
            fontSize: 10, color: '#94a3b8',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 6, padding: '3px 8px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {lead.surface} m²
          </span>
        ) : <span />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {days > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              color: days > 14 ? '#f43f5e' : days > 7 ? '#f59e0b' : '#64748b',
              background: days > 14
                ? 'rgba(244,63,94,0.1)'
                : days > 7
                  ? 'rgba(245,158,11,0.08)'
                  : 'rgba(255,255,255,0.04)',
              borderRadius: 6, padding: '2px 6px',
              border: `1px solid ${days > 14 ? 'rgba(244,63,94,0.2)' : days > 7 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)'}`,
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

// ── Premium Column Header ─────────────────────
function ColumnHeader({ col, count, total }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 12, padding: '10px 14px',
      background: `linear-gradient(135deg, ${col.color}10, ${col.color}05)`,
      border: `1px solid ${col.color}25`,
      borderRadius: 14,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background shimmer */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: `linear-gradient(90deg, transparent 0%, ${col.color}08 50%, transparent 100%)`,
        backgroundSize: '200% 100%',
        animation: 'kanban-shimmer 4s linear infinite',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 14 }}>{col.icon}</span>
        <span style={{
          fontSize: 13, fontWeight: 800, color: '#e2e8f0',
          letterSpacing: '-0.01em',
        }}>{col.title}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative', zIndex: 1 }}>
        {total > 0 && (
          <span style={{
            fontSize: 9, fontWeight: 700, color: col.color,
            opacity: 0.7,
          }}>
            {fmt(total)}
          </span>
        )}
        <span style={{
          fontSize: 11, fontWeight: 900, color: '#fff',
          background: col.gradient,
          borderRadius: 20, padding: '2px 10px',
          boxShadow: `0 2px 8px ${col.color}30`,
          minWidth: 22, textAlign: 'center',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          {count}
        </span>
      </div>
    </div>
  );
}

// ── Empty Column State ────────────────────────
function EmptyColumnState({ col }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 20px', gap: 12,
      flex: 1,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        border: `2px dashed ${col.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'kanban-empty-float 3s ease-in-out infinite',
        background: `${col.color}05`,
      }}>
        <span style={{ color: col.color, fontSize: 20, lineHeight: 1, opacity: 0.6 }}>+</span>
      </div>
      <p style={{ fontSize: 11, color: '#475569', textAlign: 'center', lineHeight: 1.4 }}>
        Glissez des leads ici
      </p>
    </div>
  );
}

// ── Premium Total Bar ─────────────────────────
function TotalBar({ leads }) {
  const grandTotal = leads.reduce((s, l) => s + (l.estimated_price || l.amount || 0), 0);
  const wonTotal = leads.filter(l => l.status === 'gagné' || l.status === 'gagne').reduce((s, l) => s + (l.estimated_price || l.amount || 0), 0);
  const pipelineTotal = grandTotal - wonTotal;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 20px',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      marginBottom: 20,
      position: 'relative',
      overflow: 'hidden',
      flexWrap: 'wrap',
    }}>
      {/* Animated shine */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'kanban-total-bar-shine 6s linear infinite',
        pointerEvents: 'none',
      }} />

      {/* Total leads */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
        }}>
          <Zap style={{ width: 16, height: 16, color: '#fff' }} />
        </div>
        <div>
          <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Leads</p>
          <p style={{ fontSize: 18, fontWeight: 900, color: '#e2e8f0', letterSpacing: '-0.02em', lineHeight: 1 }}>{leads.length}</p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

      {/* Pipeline total */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(167,139,250,0.3)',
        }}>
          <TrendingUp style={{ width: 16, height: 16, color: '#fff' }} />
        </div>
        <div>
          <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Pipeline</p>
          <p style={{ fontSize: 18, fontWeight: 900, color: '#a78bfa', letterSpacing: '-0.02em', lineHeight: 1 }}>{fmt(pipelineTotal)}</p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

      {/* Won total */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'linear-gradient(135deg, #34d399, #10b981)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(52,211,153,0.3)',
        }}>
          <Sparkles style={{ width: 16, height: 16, color: '#fff' }} />
        </div>
        <div>
          <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Gagné</p>
          <p style={{ fontSize: 18, fontWeight: 900, color: '#34d399', letterSpacing: '-0.02em', lineHeight: 1 }}>{fmt(wonTotal)}</p>
        </div>
      </div>

      {/* Grand total at the end */}
      <div style={{ marginLeft: 'auto', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'right' }}>Total</p>
        <p style={{
          fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1,
          background: 'linear-gradient(135deg, #c084fc, #60a5fa, #34d399)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>{fmt(grandTotal)}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────
const KanbanBoard = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  // React Query gère le fetching + le cache. L'invalidation depuis d'autres
  // pages (création de lead, update depuis la liste...) met à jour ce kanban
  // automatiquement sans reload.
  const kanbanFilters = { period: '90d', page: 1, page_size: 500 };
  const { data: leads = [], isLoading: loading, isRefetching: isRefreshing, refetch } = useLeadsList(kanbanFilters);
  const updateLead = useUpdateLead();

  const [draggedLead, setDraggedLead] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [justDroppedId, setJustDroppedId] = useState(null);

  const fetchLeads = () => refetch();

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedLead || draggedLead.status === targetColumnId) { setDraggedLead(null); return; }

    const droppedLeadId = draggedLead.lead_id;
    const previousStatus = draggedLead.status;
    const queryKey = queryKeys.leads.list(kanbanFilters);
    // Snapshot pour rollback si le PATCH échoue
    const previousCache = qc.getQueryData(queryKey);

    // Optimistic update directement dans le cache React Query.
    // Le composant re-render automatiquement car il lit le cache.
    qc.setQueryData(queryKey, (old) => {
      const list = Array.isArray(old) ? old : old?.leads || [];
      return list.map((l) =>
        l.lead_id === droppedLeadId ? { ...l, status: targetColumnId } : l
      );
    });
    setDraggedLead(null);

    // Animation drop
    setJustDroppedId(droppedLeadId);
    setTimeout(() => setJustDroppedId(null), 600);

    try {
      // mutate (pas mutateAsync) pour ne pas attendre : l'UI est déjà à jour
      await updateLead.mutateAsync({ leadId: droppedLeadId, payload: { status: targetColumnId } });
      const col = COLUMNS.find(c => c.id === targetColumnId);
      toast.success(`✨ Déplacé vers "${col?.title}"`, {
        duration: 2000,
        style: { background: '#1e293b', border: `1px solid ${col?.color}40`, color: '#e2e8f0' },
      });
    } catch {
      // Rollback : on restaure le snapshot du cache
      toast.error(`❌ Erreur - retour à "${COLUMNS.find(c => c.id === previousStatus)?.title}"`, { duration: 3000 });
      qc.setQueryData(queryKey, previousCache);
    }
  };

  // ── Loading skeleton ──────────────────────────
  if (loading) return (
    <div className="p-6 animate-fade-in">
      {/* Header skeleton */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
      }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.05)', animation: 'kanban-shimmer 1.5s linear infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)' }} />
        <div>
          <div style={{ width: 120, height: 20, borderRadius: 8, background: 'rgba(255,255,255,0.05)', marginBottom: 6, animation: 'kanban-shimmer 1.5s linear infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)' }} />
          <div style={{ width: 200, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.03)', animation: 'kanban-shimmer 1.5s linear infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 100%)' }} />
        </div>
      </div>
      {/* Columns skeleton */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            flexShrink: 0, width: 280, height: 420,
            borderRadius: 16, overflow: 'hidden',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            animation: 'kanban-shimmer 1.5s linear infinite',
            animationDelay: `${i * 0.15}s`,
            backgroundSize: '200% 100%',
            backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%)',
          }}>
            <div style={{ padding: 14 }}>
              <div style={{ width: '60%', height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.04)', marginBottom: 16 }} />
              {[1, 2, 3].map(j => (
                <div key={j} style={{ width: '100%', height: 100, borderRadius: 12, background: 'rgba(255,255,255,0.03)', marginBottom: 10 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in" data-testid="kanban-board">
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
          }}>
            <Trello style={{ width: 20, height: 20, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{
              fontSize: 24, fontWeight: 900, color: '#f1f5f9',
              fontFamily: 'Manrope, sans-serif',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}>Pipeline</h1>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              Glissez-déposez pour changer le statut
            </p>
          </div>
        </div>
        <button
          onClick={fetchLeads}
          style={{
            padding: '10px 16px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.3s ease',
            fontSize: 12, fontWeight: 600,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))';
            e.currentTarget.style.color = '#e2e8f0';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))';
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
        >
          <RefreshCw style={{
            width: 14, height: 14,
            transition: 'transform 0.6s ease',
            transform: isRefreshing ? 'rotate(360deg)' : 'rotate(0deg)',
          }} />
          Actualiser
        </button>
      </div>

      {/* Total bar */}
      <TotalBar leads={leads} />

      {/* Board */}
      <div
        className="kanban-board-scroll crm-kanban-board"
        style={{
          display: 'flex', gap: 14,
          overflowX: 'auto',
          paddingBottom: 24,
          margin: '0 -16px',
          padding: '0 16px 24px',
        }}
      >
        {COLUMNS.map((col) => {
          const colLeads = leads.filter(l =>
            l.status === col.id ||
            (col.id === 'contacté' && l.status === 'contacte') ||
            (col.id === 'gagné' && l.status === 'gagne')
          );
          const colTotal = colLeads.reduce((s, l) => s + (l.estimated_price || l.amount || 0), 0);
          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              style={{
                flexShrink: 0, width: 272,
                transition: 'all 0.3s ease',
              }}
              data-testid={`kanban-column-${col.id}`}
            >
              <ColumnHeader col={col} count={colLeads.length} total={colTotal} />

              {/* Column body */}
              <div
                className={`kanban-col-body ${isOver ? 'drag-over' : ''}`}
                style={{
                  '--col-glow': `${col.color}20`,
                  borderRadius: 16, padding: 10, minHeight: 420,
                  background: isOver
                    ? `linear-gradient(180deg, ${col.color}12, ${col.color}06, rgba(255,255,255,0.02))`
                    : 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                  border: `1.5px solid ${isOver ? col.color + '40' : 'rgba(255,255,255,0.05)'}`,
                  boxShadow: isOver
                    ? `0 0 40px ${col.color}15, inset 0 1px 0 rgba(255,255,255,0.05)`
                    : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                  display: 'flex', flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.id); }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Drop zone indicator */}
                {isOver && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    height: 3,
                    background: col.gradient,
                    borderRadius: '16px 16px 0 0',
                    boxShadow: `0 0 12px ${col.color}40`,
                  }} />
                )}

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {colLeads.length === 0 ? (
                    <EmptyColumnState col={col} />
                  ) : (
                    colLeads.map((lead, idx) => (
                      <KanbanCard
                        key={lead.lead_id}
                        lead={lead}
                        col={col}
                        index={idx}
                        isDragging={draggedLead?.lead_id === lead.lead_id}
                        isJustDropped={justDroppedId === lead.lead_id}
                        onNavigate={(id) => navigate(`/leads/${id}`)}
                        onDragStart={(e) => {
                          setDraggedLead(lead);
                          e.dataTransfer.effectAllowed = 'move';
                          // Create a subtle drag image
                          if (e.target && e.dataTransfer.setDragImage) {
                            e.dataTransfer.setDragImage(e.target, e.target.offsetWidth / 2, 20);
                          }
                        }}
                      />
                    ))
                  )}
                </div>

                {/* Column total */}
                {colLeads.length > 0 && colTotal > 0 && (
                  <div style={{
                    marginTop: 12,
                    padding: '8px 12px',
                    background: `linear-gradient(135deg, ${col.color}10, ${col.color}05)`,
                    border: `1px solid ${col.color}20`,
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      background: `linear-gradient(90deg, transparent, ${col.color}06, transparent)`,
                      backgroundSize: '200% 100%',
                      animation: 'kanban-shimmer 3s linear infinite',
                      pointerEvents: 'none',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative', zIndex: 1 }}>
                      <TrendingUp style={{ width: 12, height: 12, color: col.color, opacity: 0.7 }} />
                      <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Total</span>
                    </div>
                    <span style={{
                      fontSize: 13, fontWeight: 900, color: col.color,
                      position: 'relative', zIndex: 1,
                      textShadow: `0 0 12px ${col.color}30`,
                    }}>{fmt(colTotal)}</span>
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
