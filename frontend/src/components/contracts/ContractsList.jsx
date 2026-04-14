import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import {
  useContractsList,
  useCreateContract,
  useContractAction,
  useGenerateInterventions,
} from '../../hooks/api';
import {
  Plus, Search, FileText, Play, Pause, X, Edit2, Calendar,
  Euro, Users, Clock, RefreshCw, ChevronDown, CheckCircle,
  TrendingUp, ArrowUpRight, ArrowDownRight, Sparkles, Shield,
  Zap, RotateCcw, AlertTriangle, Loader2, Filter, MoreHorizontal,
  ChevronRight, Star, Target, Activity, DollarSign, Hash, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../shared';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

/* ═══════════════════════════════════════════
   CSS-in-JS Keyframes (injected once)
═══════════════════════════════════════════ */
const INJECTED = { current: false };
function injectStyles() {
  if (INJECTED.current) return;
  INJECTED.current = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ct-slide-up {
      from { opacity: 0; transform: translateY(24px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes ct-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes ct-scale-in {
      from { opacity: 0; transform: scale(0.92); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes ct-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes ct-pulse-ring {
      0%   { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    @keyframes ct-count-up {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes ct-glow-pulse {
      0%, 100% { box-shadow: 0 0 8px rgba(139,92,246,0.2); }
      50%      { box-shadow: 0 0 20px rgba(139,92,246,0.45); }
    }
    @keyframes ct-border-glow {
      0%, 100% { border-color: rgba(139,92,246,0.15); }
      50%      { border-color: rgba(139,92,246,0.4); }
    }
    @keyframes ct-float {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-6px); }
    }
    @keyframes ct-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes ct-progress-fill {
      from { width: 0%; }
      to   { width: var(--target-width, 100%); }
    }
    @keyframes ct-card-enter {
      from { opacity: 0; transform: translateY(16px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes ct-modal-overlay {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes ct-modal-content {
      from { opacity: 0; transform: scale(0.9) translateY(20px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes ct-ripple {
      0%   { transform: scale(0); opacity: 0.5; }
      100% { transform: scale(4); opacity: 0; }
    }
    @keyframes ct-status-pulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.5; }
    }
    @keyframes ct-revenue-glow {
      0%, 100% { text-shadow: 0 0 8px rgba(139,92,246,0.3); }
      50%      { text-shadow: 0 0 20px rgba(139,92,246,0.6); }
    }
    .ct-metric-card {
      background: linear-gradient(135deg, rgba(15,23,42,0.8), rgba(15,23,42,0.4));
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 20px;
      position: relative;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: default;
    }
    .ct-metric-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent);
      opacity: 0;
      transition: opacity 0.4s;
    }
    .ct-metric-card:hover {
      border-color: rgba(139,92,246,0.2);
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 24px rgba(139,92,246,0.08);
    }
    .ct-metric-card:hover::before { opacity: 1; }

    .ct-contract-card {
      background: linear-gradient(135deg, rgba(15,23,42,0.6), rgba(15,23,42,0.3));
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 20px;
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    .ct-contract-card::after {
      content: '';
      position: absolute;
      top: 0; left: 0;
      width: 3px; height: 100%;
      border-radius: 3px 0 0 3px;
      transition: width 0.3s;
    }
    .ct-contract-card:hover {
      border-color: rgba(139,92,246,0.2);
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.25), 0 0 20px rgba(139,92,246,0.06);
    }
    .ct-contract-card:hover::after { width: 4px; }

    .ct-status-active::after { background: linear-gradient(180deg, #34d399, #059669); }
    .ct-status-paused::after { background: linear-gradient(180deg, #f59e0b, #d97706); }
    .ct-status-cancelled::after { background: linear-gradient(180deg, #f43f5e, #e11d48); }
    .ct-status-expired::after { background: linear-gradient(180deg, #94a3b8, #64748b); }

    .ct-action-btn {
      position: relative;
      overflow: hidden;
      border: none;
      border-radius: 10px;
      padding: 8px 10px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ct-action-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .ct-action-btn:active { transform: scale(0.95); }

    .ct-filter-chip {
      position: relative;
      overflow: hidden;
      border-radius: 24px;
      padding: 6px 16px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1.5px solid;
      white-space: nowrap;
    }
    .ct-filter-chip:hover { transform: translateY(-1px); }
    .ct-filter-chip:active { transform: scale(0.96); }

    .ct-search-input {
      width: 100%;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 10px 14px 10px 40px;
      color: #f1f5f9;
      font-size: 13px;
      outline: none;
      transition: all 0.3s;
    }
    .ct-search-input:focus {
      border-color: rgba(139,92,246,0.4);
      box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
      background: rgba(255,255,255,0.06);
    }
    .ct-search-input::placeholder { color: #475569; }

    .ct-modal-input {
      width: 100%;
      background: rgba(255,255,255,0.04);
      border: 1.5px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      padding: 10px 14px;
      color: #f1f5f9;
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
      transition: all 0.3s;
    }
    .ct-modal-input:focus {
      border-color: rgba(139,92,246,0.5);
      box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
      background: rgba(255,255,255,0.06);
    }
    .ct-modal-select {
      width: 100%;
      background: var(--bg-muted);
      border: 1.5px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      padding: 10px 14px;
      color: #f1f5f9;
      font-size: 13px;
      outline: none;
      transition: all 0.3s;
      cursor: pointer;
    }
    .ct-modal-select:focus {
      border-color: rgba(139,92,246,0.5);
      box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
    }

    .ct-premium-btn {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      gap: 8px;
      border: none;
      border-radius: 12px;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ct-premium-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }
    .ct-premium-btn:active { transform: translateY(0) scale(0.98); }

    .ct-skeleton-line {
      background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
      background-size: 200% 100%;
      animation: ct-shimmer 1.8s ease-in-out infinite;
      border-radius: 8px;
    }

    @media (max-width: 768px) {
      .ct-contracts-grid { grid-template-columns: 1fr !important; }
      .ct-metrics-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .ct-header-row { flex-direction: column; align-items: stretch !important; gap: 12px; }
      .ct-header-actions { width: 100%; justify-content: stretch; }
      .ct-header-actions > button { flex: 1; justify-content: center; }
      .ct-filters-row { flex-direction: column; }
      .ct-filter-chips { overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
    }
    @media (max-width: 480px) {
      .ct-metrics-grid { grid-template-columns: 1fr !important; }
    }
  `;
  document.head.appendChild(style);
}

/* ═══════════════════════════════════════════
   Config Constants
═══════════════════════════════════════════ */
const FREQUENCY_LABELS = {
  hebdomadaire: { label: 'Hebdo', short: 'H', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', factor: 4 },
  bi_hebdomadaire: { label: 'Bi-hebdo', short: 'BH', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', factor: 8 },
  mensuel: { label: 'Mensuel', short: 'M', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', factor: 1 },
};

const STATUS_CONFIG = {
  active: { label: 'Actif', icon: CheckCircle, color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', glow: 'rgba(52,211,153,0.15)' },
  paused: { label: 'Pausé', icon: Pause, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', glow: 'rgba(245,158,11,0.15)' },
  cancelled: { label: 'Annulé', icon: X, color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.25)', glow: 'rgba(244,63,94,0.15)' },
  expired: { label: 'Expiré', icon: Clock, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)', glow: 'rgba(148,163,184,0.15)' },
};

const SERVICES = ['Ménage régulier', 'Grand ménage', 'Repassage', 'Vitres', 'Bureau', 'Airbnb'];
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const defaultForm = {
  client_name: '', client_email: '', client_phone: '',
  service: '', frequency: 'hebdomadaire', day_of_week: 'Lundi',
  time: '09:00', price_per_intervention: '', start_date: '',
  end_date: '', auto_renew: false, intervenant_id: '', notes: ''
};

/* ═══════════════════════════════════════════
   Animated Counter Component
═══════════════════════════════════════════ */
function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const numVal = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = numVal;
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => ref.current && cancelAnimationFrame(ref.current);
  }, [numVal, duration]);

  return <>{prefix}{display.toLocaleString('fr-FR')}{suffix}</>;
}

/* ═══════════════════════════════════════════
   Premium Skeleton Loader
═══════════════════════════════════════════ */
function PremiumSkeleton({ rows = 4 }) {
  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Metric skeletons */}
      <div className="ct-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="ct-skeleton-line" style={{
            height: 100, borderRadius: 16,
            animationDelay: `${i * 0.15}s`
          }} />
        ))}
      </div>
      {/* Card skeletons */}
      <div className="ct-contracts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
        {[...Array(rows)].map((_, i) => (
          <div key={i} style={{
            borderRadius: 16, overflow: 'hidden',
            animation: `ct-fade-in 0.5s ease-out ${0.6 + i * 0.1}s both`
          }}>
            <div className="ct-skeleton-line" style={{ height: 180, animationDelay: `${i * 0.2}s` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Empty State Component
═══════════════════════════════════════════ */
function EmptyState({ search, filter, onReset, onCreate }) {
  const hasFilters = search || filter;
  return (
    <div style={{
      textAlign: 'center', padding: '60px 24px',
      animation: 'ct-scale-in 0.5s ease-out',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
        animation: 'ct-float 3s ease-in-out infinite',
      }}>
        <FileText style={{ width: 36, height: 36, color: '#8b5cf6', opacity: 0.7 }} />
      </div>
      <h3 style={{
        fontFamily: 'Manrope, sans-serif', fontSize: 18, fontWeight: 700,
        color: '#e2e8f0', margin: '0 0 8px'
      }}>
        {hasFilters ? 'Aucun contrat trouvé' : 'Pas encore de contrats'}
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.6 }}>
        {hasFilters
          ? 'Essayez de modifier vos filtres ou votre recherche pour trouver ce que vous cherchez.'
          : 'Créez votre premier contrat récurrent pour commencer à gérer vos prestations automatiquement.'}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {hasFilters && (
          <button
            onClick={onReset}
            className="ct-premium-btn"
            style={{ background: 'var(--border-default)', color: '#94a3b8' }}
          >
            <RotateCcw style={{ width: 14, height: 14 }} />
            Réinitialiser
          </button>
        )}
        <button
          onClick={onCreate}
          className="ct-premium-btn"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          {hasFilters ? 'Nouveau contrat' : 'Créer un contrat'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Confirm Modal Component
═══════════════════════════════════════════ */
function ConfirmModal({ isOpen, onConfirm, onCancel, title, desc, confirmLabel, icon: Icon, color }) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1100, padding: 20,
      animation: 'ct-modal-overlay 0.25s ease-out',
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'linear-gradient(145deg, var(--bg-card), var(--bg-card))',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, padding: 28, width: '100%', maxWidth: 400,
        animation: 'ct-modal-content 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          {Icon && <Icon style={{ width: 24, height: 24, color }} />}
        </div>
        <h3 style={{
          fontFamily: 'Manrope, sans-serif', fontSize: 17, fontWeight: 700,
          color: 'var(--text-primary)', margin: '0 0 8px', textAlign: 'center'
        }}>{title}</h3>
        <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', margin: '0 0 24px', lineHeight: 1.5 }}>{desc}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} className="ct-premium-btn" style={{
            flex: 1, justifyContent: 'center',
            background: 'var(--border-default)', color: '#94a3b8',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>Annuler</button>
          <button onClick={onConfirm} className="ct-premium-btn" style={{
            flex: 1, justifyContent: 'center',
            background: `linear-gradient(135deg, ${color}, ${color}dd)`,
            color: '#fff',
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Contract Card Component (Premium)
═══════════════════════════════════════════ */
function ContractCard({ contract, index, onEdit, onAction, onConfirmAction }) {
  const c = contract;
  const freq = FREQUENCY_LABELS[c.frequency] || { label: c.frequency, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', factor: 1 };
  const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.active;
  const StatusIcon = status.icon;
  const monthlyValue = (parseFloat(c.price_per_intervention) || 0) * (freq.factor || 1);
  const annualValue = monthlyValue * 12;

  return (
    <div
      className={`ct-contract-card ct-status-${c.status}`}
      style={{ animation: `ct-card-enter 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.06}s both` }}
    >
      {/* Header: Client + Status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: `linear-gradient(135deg, ${status.color}25, ${status.color}10)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Users style={{ width: 15, height: 15, color: status.color }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
                fontFamily: 'Manrope, sans-serif',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0
              }}>{c.client_name}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.client_email || c.client_phone || '—'}
              </p>
            </div>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: status.bg,
          border: `1px solid ${status.border}`,
          borderRadius: 20, padding: '4px 12px',
          flexShrink: 0,
        }}>
          <StatusIcon style={{ width: 11, height: 11, color: status.color }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: status.color }}>{status.label}</span>
          {c.status === 'active' && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: status.color,
              animation: 'ct-status-pulse 2s ease-in-out infinite',
            }} />
          )}
        </div>
      </div>

      {/* Service + Frequency */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{
          background: 'rgba(139,92,246,0.1)', color: '#a78bfa',
          padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
        }}>
          {c.service || '—'}
        </span>
        <span style={{
          background: freq.bg, color: freq.color,
          padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
        }}>
          {freq.label}
        </span>
        {c.day_of_week && (
          <span style={{
            background: 'rgba(255,255,255,0.04)', color: '#94a3b8',
            padding: '4px 8px', borderRadius: 8, fontSize: 11,
          }}>
            {c.day_of_week} {c.time || ''}
          </span>
        )}
        {c.auto_renew && (
          <span style={{
            background: 'rgba(52,211,153,0.1)', color: '#34d399',
            padding: '3px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
          }}>
            ♻ Auto
          </span>
        )}
      </div>

      {/* Revenue Indicators */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
        background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 12, marginBottom: 14,
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#a78bfa', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
            {c.price_per_intervention ? `${c.price_per_intervention}€` : '—'}
          </p>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>/ inter.</p>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#8b5cf6', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
            {monthlyValue ? `${Math.round(monthlyValue)}€` : '—'}
          </p>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>MRR</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#7c3aed', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
            {annualValue ? `${Math.round(annualValue).toLocaleString('fr-FR')}€` : '—'}
          </p>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Annuel</p>
        </div>
      </div>

      {/* Next intervention + Dates */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, fontSize: 12, color: '#94a3b8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Calendar style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />
          <span>Prochaine : {c.next_intervention ? new Date(c.next_intervention).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}</span>
        </div>
        {c.intervenant_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Users style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />
            <span>{c.intervenant_name}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', gap: 8,
        paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        <button
          onClick={() => onEdit(c)}
          className="ct-action-btn"
          title="Éditer"
          style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa' }}
        >
          <Edit2 style={{ width: 14, height: 14 }} />
        </button>
        {c.status === 'active' && (
          <button
            onClick={() => onConfirmAction(c, 'pause')}
            className="ct-action-btn"
            title="Mettre en pause"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
          >
            <Pause style={{ width: 14, height: 14 }} />
          </button>
        )}
        {c.status === 'paused' && (
          <button
            onClick={() => onConfirmAction(c, 'resume')}
            className="ct-action-btn"
            title="Reprendre"
            style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}
          >
            <Play style={{ width: 14, height: 14 }} />
          </button>
        )}
        {c.status !== 'cancelled' && (
          <button
            onClick={() => onConfirmAction(c, 'cancel')}
            className="ct-action-btn"
            title="Annuler"
            style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e' }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => onEdit(c)}
          className="ct-action-btn"
          title="Détails"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}
        >
          <Eye style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Premium Modal Form
═══════════════════════════════════════════ */
function ContractModal({ isOpen, editingId, form, setForm, onSave, onClose }) {
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave();
    setSaving(false);
  };

  const inputStyle = 'ct-modal-input';
  const selectStyle = 'ct-modal-select';
  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
        animation: 'ct-modal-overlay 0.3s ease-out',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, var(--bg-card), var(--bg-card))',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, padding: 0,
          width: '100%', maxWidth: 640, maxHeight: '90vh',
          overflow: 'hidden',
          animation: 'ct-modal-content 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(139,92,246,0.08)',
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.06), transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText style={{ width: 18, height: 18, color: '#a78bfa' }} />
            </div>
            <div>
              <h2 style={{
                fontFamily: 'Manrope, sans-serif', fontSize: 17, fontWeight: 800,
                color: 'var(--text-primary)', margin: 0
              }}>
                {editingId ? 'Modifier le contrat' : 'Nouveau contrat'}
              </h2>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                {editingId ? 'Mettez à jour les informations' : 'Configurez un nouveau contrat récurrent'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="ct-action-btn" style={{
            background: 'var(--border-default)', color: 'var(--text-muted)'
          }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 24, overflowY: 'auto', maxHeight: 'calc(90vh - 150px)' }}>
          {/* Section: Client Info */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
              color: '#8b5cf6', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <Users style={{ width: 14, height: 14 }} />
              Informations client
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Nom client *</label>
                <input className={inputStyle} type="text" placeholder="Jean Dupont"
                  value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input className={inputStyle} type="email" placeholder="jean@email.com"
                  value={form.client_email} onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Téléphone</label>
                <input className={inputStyle} type="tel" placeholder="06 12 34 56 78"
                  value={form.client_phone} onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Section: Prestation */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
              color: '#06b6d4', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <Sparkles style={{ width: 14, height: 14 }} />
              Prestation
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Service *</label>
                <select className={selectStyle} value={form.service}
                  onChange={e => setForm(p => ({ ...p, service: e.target.value }))}>
                  <option value="">Choisir...</option>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fréquence</label>
                <select className={selectStyle} value={form.frequency}
                  onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}>
                  <option value="hebdomadaire">Hebdomadaire</option>
                  <option value="bi_hebdomadaire">Bi-hebdomadaire</option>
                  <option value="mensuel">Mensuel</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Jour</label>
                <select className={selectStyle} value={form.day_of_week}
                  onChange={e => setForm(p => ({ ...p, day_of_week: e.target.value }))}>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Heure</label>
                <input className={inputStyle} type="time" value={form.time}
                  onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Section: Financier */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
              color: '#34d399', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <Euro style={{ width: 14, height: 14 }} />
              Tarification & Dates
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Prix / intervention (€)</label>
                <input className={inputStyle} type="number" placeholder="45.00"
                  value={form.price_per_intervention}
                  onChange={e => setForm(p => ({ ...p, price_per_intervention: e.target.value }))} />
              </div>
              <div /> {/* spacer */}
              <div>
                <label style={labelStyle}>Date début</label>
                <input className={inputStyle} type="date" value={form.start_date}
                  onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Date fin</label>
                <input className={inputStyle} type="date" value={form.end_date}
                  onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Auto-renew */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
            padding: '12px 16px', borderRadius: 12,
            background: form.auto_renew ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${form.auto_renew ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)'}`,
            transition: 'all 0.3s',
            cursor: 'pointer',
          }} onClick={() => setForm(p => ({ ...p, auto_renew: !p.auto_renew }))}>
            <div style={{
              width: 40, height: 22, borderRadius: 11,
              background: form.auto_renew ? 'linear-gradient(135deg, #34d399, #059669)' : 'rgba(255,255,255,0.1)',
              position: 'relative', transition: 'all 0.3s',
              flexShrink: 0,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2,
                left: form.auto_renew ? 20 : 2,
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Renouvellement automatique</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                {form.auto_renew ? 'Le contrat se renouvellera automatiquement' : 'Le contrat expirera à la date de fin'}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ ...labelStyle, color: '#94a3b8' }}>Notes</label>
            <textarea className={inputStyle} rows={3} placeholder="Instructions spéciales, accès, codes..."
              value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              style={{ resize: 'vertical' }} />
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: 10, justifyContent: 'flex-end',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <button onClick={onClose} className="ct-premium-btn" style={{
            background: 'var(--border-default)', color: '#94a3b8',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving} className="ct-premium-btn" style={{
            background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? (
              <Loader2 style={{ width: 14, height: 14, animation: 'ct-spin 1s linear infinite' }} />
            ) : (
              <CheckCircle style={{ width: 14, height: 14 }} />
            )}
            {editingId ? 'Enregistrer' : 'Créer le contrat'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
const ContractsList = () => {
  injectStyles();

  // ── Vague 6 : React Query ────────────────────────────────────
  const { data: contracts = [], isLoading: loading, refetch: fetchContracts } = useContractsList({});
  const createContractMut = useCreateContract();
  const contractActionMut = useContractAction();
  const generateIntMut = useGenerateInterventions();

  const stats = useMemo(() => {
    const active = contracts.filter(c => c.status === 'active').length;
    const paused = contracts.filter(c => c.status === 'paused').length;
    const cancelled = contracts.filter(c => c.status === 'cancelled').length;
    const monthly_revenue = contracts
      .filter(c => c.status === 'active')
      .reduce((sum, c) => {
        const freq = FREQUENCY_LABELS[c.frequency] || { factor: 1 };
        return sum + (parseFloat(c.price_per_intervention) || 0) * freq.factor;
      }, 0);
    return {
      active, paused, cancelled,
      monthly_revenue: Math.round(monthly_revenue),
      annual_revenue: Math.round(monthly_revenue * 12),
    };
  }, [contracts]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const filters = useMemo(() => ({ status: statusFilter || undefined }), [statusFilter]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [generating, setGenerating] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, contract: null, action: null });
  const [viewMode, setViewMode] = useState('cards');

  const openCreate = () => { setEditingId(null); setForm(defaultForm); setShowModal(true); };
  const openEdit = (c) => { setEditingId(c.id); setForm({ ...defaultForm, ...c }); setShowModal(true); };

  const handleSave = async () => {
    try {
      if (editingId) {
        await axios.put(`${API_URL}/contracts/${editingId}`, form, { withCredentials: true });
        toast.success('✅ Contrat mis à jour avec succès');
        fetchContracts();
      } else {
        await createContractMut.mutateAsync(form);
      }
      setShowModal(false);
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleConfirmAction = (contract, action) => {
    setConfirmModal({ open: true, contract, action });
  };

  const executeAction = async () => {
    const { contract, action } = confirmModal;
    if (!contract || !action) return;
    try {
      await contractActionMut.mutateAsync({ contractId: contract.id, action });
      setConfirmModal({ open: false, contract: null, action: null });
    } catch {}
  };

  const handleGenerateInterventions = async () => {
    setGenerating(true);
    try {
      await generateIntMut.mutateAsync();
    } catch {}
    finally { setGenerating(false); }
  };

  const filtered = useMemo(() => {
    return contracts.filter(c =>
      (c.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.service || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.client_email || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [contracts, search]);

  const confirmConfig = {
    pause: { title: 'Mettre en pause ?', desc: 'Le contrat sera suspendu. Les prochaines interventions ne seront pas générées tant qu\'il est en pause.', label: 'Mettre en pause', icon: Pause, color: '#f59e0b' },
    resume: { title: 'Reprendre le contrat ?', desc: 'Le contrat sera réactivé et les interventions reprendront selon la fréquence définie.', label: 'Reprendre', icon: Play, color: '#34d399' },
    cancel: { title: 'Annuler le contrat ?', desc: 'Cette action est définitive. Le contrat sera marqué comme annulé et ne pourra plus générer d\'interventions.', label: 'Annuler le contrat', icon: AlertTriangle, color: '#f43f5e' },
  };
  const cc = confirmConfig[confirmModal.action] || {};

  return (
    <div className="crm-p-mobile" style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', animation: 'ct-fade-in 0.4s ease-out' }}>
      <PageHeader title="Contrats" subtitle="Gestion des contrats récurrents" />

      {/* ═══ Header Actions ═══ */}
      <div className="ct-header-row" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 28, marginTop: -16,
        animation: 'ct-slide-up 0.5s ease-out',
      }}>
        <div className="ct-header-actions" style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleGenerateInterventions}
            disabled={generating}
            className="ct-premium-btn"
            style={{
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.25)',
              color: '#a78bfa',
            }}
          >
            <RefreshCw style={{
              width: 14, height: 14,
              animation: generating ? 'ct-spin 1s linear infinite' : 'none'
            }} />
            Générer
          </button>
          <button
            onClick={openCreate}
            className="ct-premium-btn"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(124,58,237,0.25)',
            }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Nouveau contrat
          </button>
        </div>
      </div>

      {/* ═══ Revenue Metrics ═══ */}
      <div className="ct-metrics-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24,
      }}>
        {[
          {
            label: 'Contrats actifs', value: stats.active, icon: CheckCircle,
            color: '#34d399', bg: 'rgba(52,211,153,0.1)',
            trend: stats.active > 0 ? `${stats.active} en cours` : null,
            trendUp: true,
          },
          {
            label: 'En pause', value: stats.paused, icon: Pause,
            color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',
            trend: stats.paused > 0 ? `${stats.paused} suspendus` : null,
            trendUp: false,
          },
          {
            label: 'MRR (Revenu Mensuel)', value: stats.monthly_revenue, icon: TrendingUp,
            color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',
            suffix: '€', isRevenue: true,
            trend: stats.monthly_revenue > 0 ? `${Math.round(stats.monthly_revenue / Math.max(stats.active, 1))}€ moy/contrat` : null,
            trendUp: true,
          },
          {
            label: 'Valeur Annuelle', value: stats.annual_revenue, icon: Target,
            color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',
            suffix: '€', isRevenue: true,
            trend: stats.annual_revenue > 0 ? 'Projection 12 mois' : null,
            trendUp: true,
          },
        ].map((m, i) => (
          <div key={i} className="ct-metric-card" style={{
            animation: `ct-slide-up 0.5s ease-out ${0.1 + i * 0.08}s both`,
          }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: `${m.color}08` }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: m.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <m.icon style={{ width: 18, height: 18, color: m.color }} />
              </div>
              {m.trend && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 10, fontWeight: 600,
                  color: m.trendUp ? '#34d399' : '#f59e0b',
                  background: m.trendUp ? 'rgba(52,211,153,0.1)' : 'rgba(245,158,11,0.1)',
                  padding: '3px 8px', borderRadius: 8,
                }}>
                  {m.trendUp ? <ArrowUpRight style={{ width: 10, height: 10 }} /> : <ArrowDownRight style={{ width: 10, height: 10 }} />}
                  {m.trend}
                </div>
              )}
            </div>
            <p style={{
              fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0,
              fontFamily: 'Manrope, sans-serif', position: 'relative',
              animation: m.isRevenue ? 'ct-count-up 0.6s ease-out' : undefined,
            }}>
              <AnimatedCounter value={m.value} suffix={m.suffix || ''} />
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, position: 'relative' }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* ═══ Filters Bar ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15,23,42,0.6), rgba(15,23,42,0.3))',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16, padding: '14px 20px', marginBottom: 20,
        animation: 'ct-slide-up 0.5s ease-out 0.3s both',
      }}>
        <div className="ct-filters-row" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', width: 15, height: 15, pointerEvents: 'none'
            }} />
            <input
              className="ct-search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher client, service, email..."
            />
          </div>
          <div className="ct-filter-chips" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="ct-filter-chip"
              onClick={() => setStatusFilter('')}
              style={{
                color: !statusFilter ? 'var(--text-primary)' : 'var(--text-muted)',
                background: !statusFilter ? 'var(--bg-muted)' : 'transparent',
                borderColor: !statusFilter ? 'var(--border-strong)' : 'var(--border-default)',
              }}
            >
              Tous ({contracts.length})
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = contracts.filter(c => c.status === key).length;
              const isActive = statusFilter === key;
              return (
                <button
                  key={key}
                  className="ct-filter-chip"
                  onClick={() => setStatusFilter(isActive ? '' : key)}
                  style={{
                    color: isActive ? cfg.color : 'var(--text-muted)',
                    background: isActive ? cfg.bg : 'transparent',
                    borderColor: isActive ? cfg.border : 'var(--border-default)',
                    boxShadow: isActive ? `0 0 12px ${cfg.glow}` : 'none',
                  }}
                >
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ Content ═══ */}
      {loading ? (
        <PremiumSkeleton rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          search={search}
          filter={statusFilter}
          onReset={() => { setSearch(''); setStatusFilter(''); }}
          onCreate={openCreate}
        />
      ) : (
        <div className="ct-contracts-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: 16,
          animation: 'ct-fade-in 0.4s ease-out',
        }}>
          {filtered.map((c, i) => (
            <ContractCard
              key={c.id}
              contract={c}
              index={i}
              onEdit={openEdit}
              onAction={(id, action) => {}}
              onConfirmAction={handleConfirmAction}
            />
          ))}
        </div>
      )}

      {/* ═══ Contract Modal ═══ */}
      <ContractModal
        isOpen={showModal}
        editingId={editingId}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        onClose={() => setShowModal(false)}
      />

      {/* ═══ Confirm Modal ═══ */}
      <ConfirmModal
        isOpen={confirmModal.open}
        title={cc.title}
        desc={cc.desc}
        confirmLabel={cc.label}
        icon={cc.icon}
        color={cc.color}
        onConfirm={executeAction}
        onCancel={() => setConfirmModal({ open: false, contract: null, action: null })}
      />
    </div>
  );
};

export default ContractsList;
