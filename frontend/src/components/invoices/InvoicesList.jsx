import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FileText, CreditCard, Clock, CheckCircle, AlertTriangle, Plus, Download,
  TrendingUp, Send, Filter, Search, ArrowUpRight, ArrowDownRight, Sparkles,
  Receipt, Eye, XCircle, ChevronDown, MoreHorizontal, RefreshCw, Zap,
  Calendar, Mail, DollarSign, Hash, X, Check, Loader2
} from 'lucide-react';
import { formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

/* ═══════════════════════════════════════════
   CSS-in-JS keyframes (injected once)
═══════════════════════════════════════════ */
const INJECTED = { current: false };
function injectStyles() {
  if (INJECTED.current) return;
  INJECTED.current = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes inv-slide-up {
      from { opacity: 0; transform: translateY(24px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes inv-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes inv-scale-in {
      from { opacity: 0; transform: scale(0.92); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes inv-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes inv-pulse-ring {
      0%   { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    @keyframes inv-count-up {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes inv-glow-pulse {
      0%, 100% { box-shadow: 0 0 8px rgba(244,63,94,0.2); }
      50%      { box-shadow: 0 0 20px rgba(244,63,94,0.45); }
    }
    @keyframes inv-border-flow {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes inv-check-bounce {
      0%   { transform: scale(0); }
      50%  { transform: scale(1.3); }
      100% { transform: scale(1); }
    }
    @keyframes inv-skeleton-wave {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes inv-empty-float {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-12px); }
    }
    @keyframes inv-ripple {
      to { transform: scale(4); opacity: 0; }
    }
    @keyframes inv-progress-fill {
      from { width: 0%; }
    }
    @keyframes inv-dot-pulse {
      0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }
    @keyframes inv-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes inv-badge-pop {
      0% { transform: scale(0.5); opacity: 0; }
      60% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
    .inv-row-enter {
      animation: inv-slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .inv-card-enter {
      animation: inv-scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .inv-overdue-glow {
      animation: inv-glow-pulse 2.5s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}

/* ═══════════════════════════════════════════
   Helpers
═══════════════════════════════════════════ */
const fmt = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v || 0);

const fmtCompact = (v) => {
  if (v >= 1000) return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1, style: 'currency', currency: 'EUR' }).format(v);
  return fmt(v);
};

const isOverdue = (inv) => {
  if (['payée', 'payee', 'annulée'].includes(inv.status)) return false;
  if (inv.status === 'en_retard') return true;
  if (inv.due_date) return new Date(inv.due_date) < new Date();
  return new Date(inv.created_at) < new Date(Date.now() - 30 * 86400000);
};

const daysOverdue = (inv) => {
  const ref = inv.due_date ? new Date(inv.due_date) : new Date(new Date(inv.created_at).getTime() + 30 * 86400000);
  return Math.max(0, Math.floor((Date.now() - ref.getTime()) / 86400000));
};

const relativeDate = (d) => {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  if (diff < 7) return `Il y a ${diff}j`;
  if (diff < 30) return `Il y a ${Math.floor(diff / 7)} sem.`;
  return formatDateTime(d);
};

/* ═══════════════════════════════════════════
   Status config
═══════════════════════════════════════════ */
const STATUS_CONFIG = {
  'en_attente': {
    label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)', glow: 'rgba(245,158,11,0.15)',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
    icon: Clock,
  },
  'payée': {
    label: 'Payée', color: '#34d399', bg: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.2)', glow: 'rgba(52,211,153,0.15)',
    gradient: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.05))',
    icon: CheckCircle,
  },
  'payee': {
    label: 'Payée', color: '#34d399', bg: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.2)', glow: 'rgba(52,211,153,0.15)',
    gradient: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(52,211,153,0.05))',
    icon: CheckCircle,
  },
  'en_retard': {
    label: 'En retard', color: '#f43f5e', bg: 'rgba(244,63,94,0.08)',
    border: 'rgba(244,63,94,0.2)', glow: 'rgba(244,63,94,0.15)',
    gradient: 'linear-gradient(135deg, rgba(244,63,94,0.15), rgba(244,63,94,0.05))',
    icon: AlertTriangle,
  },
  'annulée': {
    label: 'Annulée', color: '#94a3b8', bg: 'rgba(148,163,184,0.06)',
    border: 'rgba(148,163,184,0.15)', glow: 'rgba(148,163,184,0.08)',
    gradient: 'linear-gradient(135deg, rgba(148,163,184,0.1), rgba(148,163,184,0.03))',
    icon: XCircle,
  },
};

/* ═══════════════════════════════════════════
   Premium Skeleton Loader
═══════════════════════════════════════════ */
function PremiumSkeleton({ rows = 5 }) {
  return (
    <div style={{ padding: 24 }}>
      {/* Stats skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            borderRadius: 16, padding: 20,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            animation: `inv-fade-in 0.4s ${i * 0.1}s both`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(139,92,246,0.08) 50%, rgba(255,255,255,0.04) 100%)',
                backgroundSize: '200% 100%',
                animation: 'inv-skeleton-wave 1.8s ease infinite',
              }} />
              <div style={{
                width: 60, height: 20, borderRadius: 6,
                background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(139,92,246,0.08) 50%, rgba(255,255,255,0.04) 100%)',
                backgroundSize: '200% 100%',
                animation: 'inv-skeleton-wave 1.8s ease infinite',
              }} />
            </div>
            <div style={{
              width: '70%', height: 28, borderRadius: 6, marginBottom: 8,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(139,92,246,0.08) 50%, rgba(255,255,255,0.04) 100%)',
              backgroundSize: '200% 100%',
              animation: 'inv-skeleton-wave 1.8s ease infinite',
            }} />
            <div style={{
              width: '45%', height: 12, borderRadius: 4,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(139,92,246,0.06) 50%, rgba(255,255,255,0.03) 100%)',
              backgroundSize: '200% 100%',
              animation: 'inv-skeleton-wave 1.8s ease infinite',
            }} />
          </div>
        ))}
      </div>

      {/* Filter skeleton */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[80, 100, 80, 90].map((w, i) => (
          <div key={i} style={{
            width: w, height: 36, borderRadius: 10,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(139,92,246,0.06) 50%, rgba(255,255,255,0.03) 100%)',
            backgroundSize: '200% 100%',
            animation: `inv-skeleton-wave 1.8s ${i * 0.15}s ease infinite`,
          }} />
        ))}
      </div>

      {/* Row skeletons */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          animation: `inv-slide-up 0.4s ${0.3 + i * 0.08}s both`,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(139,92,246,0.07) 50%, rgba(255,255,255,0.03) 100%)',
            backgroundSize: '200% 100%', flexShrink: 0,
            animation: 'inv-skeleton-wave 1.8s ease infinite',
          }} />
          <div style={{ flex: 1 }}>
            <div style={{
              width: `${50 + Math.random() * 30}%`, height: 14, borderRadius: 4, marginBottom: 8,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(139,92,246,0.08) 50%, rgba(255,255,255,0.04) 100%)',
              backgroundSize: '200% 100%',
              animation: 'inv-skeleton-wave 1.8s ease infinite',
            }} />
            <div style={{
              width: `${30 + Math.random() * 20}%`, height: 10, borderRadius: 3,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(139,92,246,0.05) 50%, rgba(255,255,255,0.03) 100%)',
              backgroundSize: '200% 100%',
              animation: 'inv-skeleton-wave 1.8s ease infinite',
            }} />
          </div>
          <div style={{
            width: 80, height: 20, borderRadius: 6,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(139,92,246,0.08) 50%, rgba(255,255,255,0.04) 100%)',
            backgroundSize: '200% 100%',
            animation: 'inv-skeleton-wave 1.8s ease infinite',
          }} />
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Empty State — Premium with illustration
═══════════════════════════════════════════ */
function EmptyState({ filter, onReset, onNavigate }) {
  const messages = {
    '': { title: 'Aucune facture', desc: 'Créez votre première facture depuis un devis accepté', action: 'Voir les devis' },
    'en_attente': { title: 'Aucune facture en attente', desc: 'Toutes vos factures ont été traitées — bravo !', action: 'Voir toutes' },
    'payée': { title: 'Aucune facture payée', desc: 'Les paiements apparaîtront ici une fois reçus', action: 'Voir toutes' },
    'en_retard': { title: 'Aucune facture en retard', desc: 'Excellent ! Tous vos paiements sont à jour', action: 'Voir toutes' },
  };
  const msg = messages[filter] || messages[''];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '64px 24px', textAlign: 'center',
      animation: 'inv-scale-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
    }}>
      {/* Floating illustration */}
      <div style={{
        position: 'relative', width: 120, height: 120, marginBottom: 24,
        animation: 'inv-empty-float 4s ease-in-out infinite',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', inset: -20,
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        {/* Icon container */}
        <div style={{
          width: 120, height: 120, borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(96,165,250,0.08))',
          border: '1px solid rgba(139,92,246,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <Receipt style={{ width: 48, height: 48, color: 'rgba(139,92,246,0.5)' }} />
          {/* Sparkle accents */}
          <Sparkles style={{
            position: 'absolute', top: -8, right: -8, width: 20, height: 20,
            color: '#a78bfa', opacity: 0.7,
          }} />
        </div>
      </div>

      <h3 style={{
        fontSize: 20, fontWeight: 700, color: '#e2e8f0',
        fontFamily: 'Manrope, sans-serif', marginBottom: 8,
      }}>
        {msg.title}
      </h3>
      <p style={{ fontSize: 14, color: '#64748b', maxWidth: 320, lineHeight: 1.6, marginBottom: 24 }}>
        {msg.desc}
      </p>

      <div style={{ display: 'flex', gap: 12 }}>
        {filter && (
          <button onClick={onReset} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 12,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.25s',
          }}
          onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.color = '#e2e8f0'; }}
          onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = '#94a3b8'; }}>
            <X style={{ width: 14, height: 14 }} /> Retirer le filtre
          </button>
        )}
        <button onClick={onNavigate} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 24px', borderRadius: 12,
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          color: '#fff', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', border: 'none',
          boxShadow: '0 0 20px rgba(139,92,246,0.3), 0 4px 12px rgba(0,0,0,0.2)',
          transition: 'all 0.25s',
        }}
        onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 0 30px rgba(139,92,246,0.5), 0 8px 20px rgba(0,0,0,0.3)'; }}
        onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 0 20px rgba(139,92,246,0.3), 0 4px 12px rgba(0,0,0,0.2)'; }}>
          <Plus style={{ width: 16, height: 16 }} /> {msg.action}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Payment Timeline — Enhanced
═══════════════════════════════════════════ */
function PaymentTimeline({ invoice, compact = false }) {
  const isPaid = ['payée', 'payee'].includes(invoice.status);
  const steps = [
    { key: 'created', label: 'Créée', done: true, date: invoice.created_at },
    { key: 'sent',    label: 'Envoyée', done: !!invoice.sent_at || true },
    { key: 'viewed',  label: 'Vue', done: !!invoice.viewed_at },
    { key: 'paid',    label: 'Payée', done: isPaid, date: invoice.paid_at },
  ];

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 6 }}>
        {steps.map((step, i) => (
          <React.Fragment key={step.key}>
            <div style={{
              position: 'relative',
              width: 10, height: 10, borderRadius: '50%',
              background: step.done
                ? (step.key === 'paid' ? '#34d399' : 'rgba(139,92,246,0.6)')
                : 'rgba(255,255,255,0.06)',
              border: step.done
                ? (step.key === 'paid' ? '2px solid rgba(52,211,153,0.4)' : '2px solid rgba(139,92,246,0.3)')
                : '2px solid rgba(255,255,255,0.1)',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              {step.done && step.key === 'paid' && (
                <div style={{
                  position: 'absolute', inset: -4,
                  borderRadius: '50%', border: '1px solid rgba(52,211,153,0.3)',
                  animation: 'inv-pulse-ring 2s ease-out infinite',
                }} />
              )}
            </div>
            {i < steps.length - 1 && (
              <div style={{
                height: 2, flex: 1, minWidth: 8, borderRadius: 1,
                background: steps[i + 1].done
                  ? 'linear-gradient(90deg, rgba(139,92,246,0.5), rgba(52,211,153,0.5))'
                  : 'rgba(255,255,255,0.06)',
                transition: 'all 0.4s',
              }} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 0, marginTop: 8,
      padding: '12px 16px', borderRadius: 12,
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
    }}>
      {steps.map((step, i) => (
        <React.Fragment key={step.key}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
            <div style={{
              position: 'relative',
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: step.done
                ? (step.key === 'paid' ? 'rgba(52,211,153,0.15)' : 'rgba(139,92,246,0.15)')
                : 'rgba(255,255,255,0.04)',
              border: step.done
                ? (step.key === 'paid' ? '2px solid rgba(52,211,153,0.4)' : '2px solid rgba(139,92,246,0.3)')
                : '2px solid rgba(255,255,255,0.08)',
              transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              {step.done ? (
                <Check style={{
                  width: 12, height: 12,
                  color: step.key === 'paid' ? '#34d399' : '#a78bfa',
                  animation: 'inv-check-bounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }} />
              ) : (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
              )}
              {step.done && step.key === 'paid' && (
                <div style={{
                  position: 'absolute', inset: -5,
                  borderRadius: '50%', border: '1.5px solid rgba(52,211,153,0.25)',
                  animation: 'inv-pulse-ring 2.5s ease-out infinite',
                }} />
              )}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.02em',
              color: step.done ? (step.key === 'paid' ? '#34d399' : '#a78bfa') : '#475569',
              transition: 'color 0.3s',
            }}>
              {step.label}
            </span>
            {step.date && (
              <span style={{ fontSize: 9, color: '#475569' }}>{relativeDate(step.date)}</span>
            )}
          </div>
          {i < steps.length - 1 && (
            <div style={{
              height: 2, flex: 1, marginTop: 13, borderRadius: 1,
              background: steps[i + 1].done
                ? 'linear-gradient(90deg, rgba(139,92,246,0.5), rgba(52,211,153,0.5))'
                : 'rgba(255,255,255,0.06)',
              transition: 'background 0.5s',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Confirmation Modal
═══════════════════════════════════════════ */
function ConfirmModal({ isOpen, onConfirm, onCancel, title, desc, confirmLabel, icon: Icon, color }) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      animation: 'inv-fade-in 0.2s ease',
    }} onClick={onCancel}>
      <div style={{
        background: 'hsl(224, 71%, 6%)', borderRadius: 20, padding: 32,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        maxWidth: 400, width: '90%',
        animation: 'inv-scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px',
          background: `${color}15`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {Icon && <Icon style={{ width: 24, height: 24, color }} />}
        </div>
        <h3 style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 8, fontFamily: 'Manrope, sans-serif' }}>
          {title}
        </h3>
        <p style={{ textAlign: 'center', fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 1.6 }}>
          {desc}
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '12px 20px', borderRadius: 12,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; }}>
            Annuler
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '12px 20px', borderRadius: 12,
            background: color, border: 'none',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: `0 0 20px ${color}40`,
            transition: 'all 0.25s',
          }}
          onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = `0 0 30px ${color}60`; }}
          onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = `0 0 20px ${color}40`; }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Stat Card — Premium
═══════════════════════════════════════════ */
function StatCard({ label, value, color, icon: Icon, desc, trend, index }) {
  return (
    <div style={{
      borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden',
      background: 'rgba(255,255,255,0.035)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.08)',
      transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      animation: `inv-slide-up 0.5s ${index * 0.1}s cubic-bezier(0.16, 1, 0.3, 1) both`,
      cursor: 'default',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.055)';
      e.currentTarget.style.borderColor = `${color}50`;
      e.currentTarget.style.boxShadow = `0 0 0 1px ${color}20, 0 8px 32px ${color}15`;
      e.currentTarget.style.transform = 'translateY(-3px)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.035)';
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.transform = 'translateY(0)';
    }}>
      {/* Subtle gradient overlay */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 120, height: 120,
        background: `radial-gradient(circle at top right, ${color}08, transparent)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: `${color}12`, border: `1px solid ${color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s',
        }}>
          <Icon style={{ width: 18, height: 18, color }} />
        </div>
        {trend !== undefined && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 8,
            background: trend >= 0 ? 'rgba(52,211,153,0.1)' : 'rgba(244,63,94,0.1)',
            border: `1px solid ${trend >= 0 ? 'rgba(52,211,153,0.2)' : 'rgba(244,63,94,0.2)'}`,
          }}>
            {trend >= 0 ? (
              <ArrowUpRight style={{ width: 12, height: 12, color: '#34d399' }} />
            ) : (
              <ArrowDownRight style={{ width: 12, height: 12, color: '#f43f5e' }} />
            )}
            <span style={{ fontSize: 11, fontWeight: 700, color: trend >= 0 ? '#34d399' : '#f43f5e' }}>
              {Math.abs(trend)}%
            </span>
          </div>
        )}
      </div>

      <p style={{
        fontSize: 26, fontWeight: 800, color, fontFamily: 'Manrope, sans-serif',
        marginBottom: 4, letterSpacing: '-0.02em',
        animation: `inv-count-up 0.6s ${0.2 + index * 0.1}s both`,
      }}>
        {value}
      </p>
      <p style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 11, color: '#475569' }}>{desc}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Action button with loading / ripple
═══════════════════════════════════════════ */
function ActionButton({ onClick, icon: Icon, label, color, bg, border, loading: isLoading, style: extraStyle, ...rest }) {
  const [loading, setLoading] = useState(false);
  const active = isLoading !== undefined ? isLoading : loading;

  const handleClick = async (e) => {
    if (active) return;
    setLoading(true);
    try { await onClick?.(e); }
    finally { setLoading(false); }
  };

  return (
    <button onClick={handleClick} disabled={active} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '7px 14px', borderRadius: 10,
      background: bg || `${color}12`,
      border: `1px solid ${border || `${color}25`}`,
      color: active ? `${color}80` : color,
      fontSize: 12, fontWeight: 600, cursor: active ? 'wait' : 'pointer',
      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      position: 'relative', overflow: 'hidden',
      ...extraStyle,
    }}
    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = `${color}20`; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
    onMouseLeave={e => { e.currentTarget.style.background = bg || `${color}12`; e.currentTarget.style.transform = 'translateY(0)'; }}
    {...rest}>
      {active ? (
        <Loader2 style={{ width: 13, height: 13, animation: 'inv-spin 0.8s linear infinite' }} />
      ) : (
        Icon && <Icon style={{ width: 13, height: 13 }} />
      )}
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════
   Invoice Card (Mobile Premium)
═══════════════════════════════════════════ */
function InvoiceCard({ inv, index, onSend, onPay, onConfirmAction, cfg, overdue }) {
  const StatusIcon = cfg.icon;

  return (
    <div data-testid={`invoice-card-${inv.invoice_id}`}
      className="inv-card-enter"
      style={{
        padding: 20, position: 'relative', overflow: 'hidden',
        animationDelay: `${index * 0.06}s`,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: overdue ? 'rgba(244,63,94,0.03)' : 'transparent',
        transition: 'all 0.3s',
      }}>
      {/* Overdue left accent */}
      {overdue && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
          background: 'linear-gradient(180deg, #f43f5e, rgba(244,63,94,0.3))',
          borderRadius: '0 2px 2px 0',
        }} />
      )}

      {/* Top row: name + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontFamily: 'monospace', fontSize: 10, color: '#64748b',
              background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6,
            }}>
              #{inv.invoice_id?.slice(-6)}
            </span>
            {overdue && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: '#f43f5e', textTransform: 'uppercase',
                letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 6,
                background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)',
                animation: 'inv-badge-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}>
                {daysOverdue(inv)}j retard
              </span>
            )}
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 2, fontFamily: 'Manrope, sans-serif' }}>
            {inv.lead_name}
          </p>
          <p style={{ fontSize: 12, color: '#64748b' }}>{inv.service_type}</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 20,
          background: cfg.gradient, border: `1px solid ${cfg.border}`,
          animation: 'inv-badge-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          animationDelay: `${index * 0.06 + 0.2}s`,
          animationFillMode: 'both',
        }}>
          <StatusIcon style={{ width: 12, height: 12, color: cfg.color }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
        </div>
      </div>

      {/* Timeline */}
      <PaymentTimeline invoice={inv} compact />

      {/* Bottom row: amount + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <div>
          <span style={{
            fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em',
            fontFamily: 'Manrope, sans-serif',
            color: overdue ? '#f43f5e' : (
              ['payée', 'payee'].includes(inv.status) ? '#34d399' : '#a78bfa'
            ),
          }}>
            {fmt(inv.amount_ttc)}
          </span>
          <p style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
            <Calendar style={{ width: 10, height: 10, display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            {relativeDate(inv.created_at)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {inv.status === 'en_attente' && (
            <ActionButton
              onClick={() => onConfirmAction(inv, 'pay')}
              icon={CreditCard} label="Payer" color="#8b5cf6"
              data-testid={`pay-btn-mobile-${inv.invoice_id}`}
            />
          )}
          <ActionButton
            onClick={() => onConfirmAction(inv, 'send')}
            icon={Send} label="" color="#3b82f6"
            style={{ padding: '7px 10px' }}
          />
          <a href={`${API_URL}/exports/invoice/${inv.invoice_id}/pdf`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '7px 10px', borderRadius: 10,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', fontSize: 12, textDecoration: 'none',
              transition: 'all 0.2s',
            }}>
            <Download style={{ width: 13, height: 13 }} />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
const InvoicesList = () => {
  injectStyles();

  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, invoice: null, action: null });
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => { fetchInvoices(); }, [filter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const res = await axios.get(`${API_URL}/invoices${params}`, { withCredentials: true });
      const raw = res.data;
      setInvoices(Array.isArray(raw) ? raw : (raw?.items || raw?.invoices || []));
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  // Search filter (client-side)
  const filteredInvoices = searchTerm
    ? invoices.filter(inv =>
        (inv.lead_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.lead_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.service_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.invoice_id || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : invoices;

  const handleConfirmAction = (invoice, action) => {
    setConfirmModal({ open: true, invoice, action });
  };

  const executeAction = async () => {
    const { invoice, action } = confirmModal;
    if (!invoice) return;
    setConfirmModal({ open: false, invoice: null, action: null });
    setActionLoading(prev => ({ ...prev, [`${action}-${invoice.invoice_id}`]: true }));

    try {
      if (action === 'send') {
        await axios.post(`${API_URL}/invoices/${invoice.invoice_id}/send-portal`, {}, { withCredentials: true });
        toast.success('✓ Facture envoyée avec lien de paiement', {
          icon: <Send style={{ width: 16, height: 16, color: '#3b82f6' }} />,
        });
      } else if (action === 'pay') {
        const res = await axios.post(`${API_URL}/invoices/${invoice.invoice_id}/checkout`,
          { origin_url: window.location.origin }, { withCredentials: true });
        window.location.href = res.data.url;
      }
    } catch {
      toast.error(`Erreur lors de ${action === 'send' ? "l'envoi" : 'du paiement'}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`${action}-${invoice.invoice_id}`]: false }));
    }
  };

  const handleSendInvoice = async (invoice) => handleConfirmAction(invoice, 'send');
  const handlePay = async (invoice) => handleConfirmAction(invoice, 'pay');

  const totalPaid    = invoices.filter(i => ['payée','payee'].includes(i.status)).reduce((s, i) => s + (i.amount_ttc || 0), 0);
  const totalPending = invoices.filter(i => i.status === 'en_attente').reduce((s, i) => s + (i.amount_ttc || 0), 0);
  const totalLate    = invoices.filter(i => isOverdue(i)).reduce((s, i) => s + (i.amount_ttc || 0), 0);

  // Filter counts
  const counts = {
    all: invoices.length,
    en_attente: invoices.filter(i => i.status === 'en_attente').length,
    payée: invoices.filter(i => ['payée', 'payee'].includes(i.status)).length,
    en_retard: invoices.filter(i => i.status === 'en_retard' || isOverdue(i)).length,
  };

  const filterOptions = [
    { value: '',           label: 'Toutes',     icon: Filter,        count: counts.all },
    { value: 'en_attente', label: 'En attente',  icon: Clock,         count: counts.en_attente, color: '#f59e0b' },
    { value: 'payée',      label: 'Payées',      icon: CheckCircle,   count: counts.payée,      color: '#34d399' },
    { value: 'en_retard',  label: 'En retard',   icon: AlertTriangle, count: counts.en_retard,  color: '#f43f5e' },
  ];

  return (
    <div style={{ padding: '16px', maxWidth: '100%', overflow: 'hidden' }} className="md:p-6 lg:p-8" data-testid="invoices-page">

      {/* ── Confirmation Modal ── */}
      <ConfirmModal
        isOpen={confirmModal.open}
        onConfirm={executeAction}
        onCancel={() => setConfirmModal({ open: false, invoice: null, action: null })}
        title={confirmModal.action === 'send' ? 'Envoyer la facture ?' : 'Procéder au paiement ?'}
        desc={confirmModal.action === 'send'
          ? `La facture de ${fmt(confirmModal.invoice?.amount_ttc)} sera envoyée à ${confirmModal.invoice?.lead_name} avec un lien de paiement sécurisé.`
          : `Vous allez être redirigé vers la page de paiement pour ${fmt(confirmModal.invoice?.amount_ttc)}.`
        }
        confirmLabel={confirmModal.action === 'send' ? 'Envoyer' : 'Payer maintenant'}
        icon={confirmModal.action === 'send' ? Send : CreditCard}
        color={confirmModal.action === 'send' ? '#3b82f6' : '#8b5cf6'}
      />

      {/* ── Header ── */}
      <div className="crm-page-header" style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between',
        alignItems: 'flex-start', gap: 16, marginBottom: 24,
        animation: 'inv-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(96,165,250,0.15))',
              border: '1px solid rgba(139,92,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Receipt style={{ width: 20, height: 20, color: '#a78bfa' }} />
            </div>
            <div>
              <h1 style={{
                fontSize: 24, fontWeight: 800, color: '#f1f5f9',
                fontFamily: 'Manrope, sans-serif', letterSpacing: '-0.02em',
              }}>
                Factures
              </h1>
              <p style={{ fontSize: 13, color: '#64748b' }}>
                <span style={{ color: '#a78bfa', fontWeight: 700 }}>{invoices.length}</span> facture{invoices.length !== 1 ? 's' : ''}
                {totalPaid > 0 && (
                  <span> · <span style={{ color: '#34d399', fontWeight: 600 }}>{fmt(totalPaid)}</span> encaissé</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <a href={`${API_URL}/exports/invoices/csv`} data-testid="export-invoices-csv" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#94a3b8', fontSize: 13, fontWeight: 500, textDecoration: 'none',
            transition: 'all 0.25s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e2e8f0'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}>
            <Download style={{ width: 14, height: 14 }} /> CSV
          </a>
          <a href={`${API_URL}/exports/financial/pdf`} data-testid="export-financial-pdf" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#94a3b8', fontSize: 13, fontWeight: 500, textDecoration: 'none',
            transition: 'all 0.25s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e2e8f0'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}>
            <FileText style={{ width: 14, height: 14 }} /> PDF
          </a>
          <button onClick={() => navigate('/quotes')} data-testid="go-to-quotes-btn" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 10,
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            boxShadow: '0 0 20px rgba(139,92,246,0.3), 0 4px 12px rgba(0,0,0,0.2)',
            transition: 'all 0.25s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(139,92,246,0.5), 0 8px 20px rgba(0,0,0,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(139,92,246,0.3), 0 4px 12px rgba(0,0,0,0.2)'; }}>
            <Plus style={{ width: 15, height: 15 }} /> Depuis un devis
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="crm-stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16, marginBottom: 24,
      }}>
        <StatCard index={0}
          label="Total encaissé" value={fmt(totalPaid)} color="#34d399"
          icon={CheckCircle}
          desc={`${invoices.filter(i => ['payée','payee'].includes(i.status)).length} factures payées`}
        />
        <StatCard index={1}
          label="En attente" value={fmt(totalPending)} color="#f59e0b"
          icon={Clock}
          desc={`${invoices.filter(i => i.status === 'en_attente').length} factures en attente`}
        />
        <StatCard index={2}
          label="En retard" value={fmt(totalLate)} color="#f43f5e"
          icon={AlertTriangle}
          desc={`${invoices.filter(i => isOverdue(i)).length} factures en retard`}
        />
      </div>

      {/* ── Filters + Search ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20,
        alignItems: 'center',
        animation: 'inv-slide-up 0.5s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both',
      }} data-testid="invoice-filters">
        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filterOptions.map(f => {
            const isActive = filter === f.value;
            const FIcon = f.icon;
            return (
              <button key={f.value} data-testid={`filter-${f.value || 'all'}`}
                onClick={() => setFilter(f.value)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 12,
                  background: isActive
                    ? (f.color ? `${f.color}18` : 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.08))')
                    : 'rgba(255,255,255,0.04)',
                  border: isActive
                    ? `1px solid ${f.color || 'rgba(139,92,246,0.4)'}`
                    : '1px solid rgba(255,255,255,0.07)',
                  color: isActive ? (f.color || '#a78bfa') : '#64748b',
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.color = '#64748b';
                  }
                }}>
                <FIcon style={{ width: 13, height: 13 }} />
                {f.label}
                {f.count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    padding: '1px 7px', borderRadius: 8,
                    background: isActive ? `${f.color || '#8b5cf6'}25` : 'rgba(255,255,255,0.06)',
                    color: isActive ? (f.color || '#a78bfa') : '#64748b',
                    transition: 'all 0.3s',
                  }}>
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{
          position: 'relative', flex: '1 1 200px', maxWidth: 320,
          marginLeft: 'auto',
        }}>
          <Search style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            width: 14, height: 14, color: '#475569', pointerEvents: 'none',
          }} />
          <input
            type="text" placeholder="Rechercher..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 36px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#e2e8f0', fontSize: 13, outline: 'none',
              transition: 'all 0.25s',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6,
              padding: 4, cursor: 'pointer', display: 'flex', color: '#94a3b8',
            }}>
              <X style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        background: 'rgba(255,255,255,0.025)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.07)',
        animation: 'inv-slide-up 0.5s 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
      }} data-testid="invoices-table">
        {loading ? (
          <PremiumSkeleton rows={5} />
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            filter={filter}
            onReset={() => { setFilter(''); setSearchTerm(''); }}
            onNavigate={() => navigate('/quotes')}
          />
        ) : (
          <>
            {/* ═══ Desktop Table ═══ */}
            <div className="hidden md:block" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    {[
                      { label: 'Réf.', icon: Hash },
                      { label: 'Client', icon: null },
                      { label: 'Service', icon: null },
                      { label: 'Montant', icon: DollarSign },
                      { label: 'Statut', icon: null },
                      { label: 'Date', icon: Calendar },
                      { label: 'Actions', icon: null },
                    ].map(h => (
                      <th key={h.label} style={{
                        padding: '14px 16px', textAlign: 'left',
                        fontSize: 11, fontWeight: 700, color: '#475569',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {h.icon && <h.icon style={{ width: 11, height: 11, opacity: 0.5 }} />}
                          {h.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv, idx) => {
                    const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG['en_attente'];
                    const StatusIcon = cfg.icon;
                    const overdue = isOverdue(inv);
                    const isPaid = ['payée', 'payee'].includes(inv.status);

                    return (
                      <tr key={inv.invoice_id} data-testid={`invoice-row-${inv.invoice_id}`}
                        className="inv-row-enter"
                        style={{
                          animationDelay: `${0.3 + idx * 0.04}s`,
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          background: overdue ? 'rgba(244,63,94,0.025)' : 'transparent',
                          transition: 'all 0.25s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = overdue ? 'rgba(244,63,94,0.05)' : 'rgba(255,255,255,0.03)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = overdue ? 'rgba(244,63,94,0.025)' : 'transparent';
                        }}>

                        {/* Ref */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontFamily: 'monospace', fontSize: 11, color: '#94a3b8',
                              background: 'rgba(255,255,255,0.05)', padding: '3px 10px',
                              borderRadius: 6, fontWeight: 600,
                            }}>
                              #{inv.invoice_id?.slice(-6)}
                            </span>
                            {overdue && (
                              <span className="inv-overdue-glow" style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                background: 'rgba(244,63,94,0.12)',
                                border: '1px solid rgba(244,63,94,0.25)',
                                color: '#f43f5e', borderRadius: 6,
                                padding: '2px 8px', fontSize: 9, fontWeight: 800,
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                              }}>
                                <AlertTriangle style={{ width: 9, height: 9 }} />
                                {daysOverdue(inv)}j
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Client */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10,
                              background: `linear-gradient(135deg, ${cfg.color}15, ${cfg.color}08)`,
                              border: `1px solid ${cfg.color}20`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 700, color: cfg.color,
                              flexShrink: 0,
                            }}>
                              {(inv.lead_name || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{inv.lead_name}</p>
                              <p style={{ fontSize: 11, color: '#475569' }}>{inv.lead_email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Service */}
                        <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8' }}>
                          {inv.service_type}
                        </td>

                        {/* Amount */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontSize: 15, fontWeight: 800,
                            fontFamily: 'Manrope, sans-serif',
                            letterSpacing: '-0.02em',
                            color: overdue ? '#f43f5e' : (isPaid ? '#34d399' : '#e2e8f0'),
                          }}>
                            {fmt(inv.amount_ttc)}
                          </span>
                        </td>

                        {/* Status + Timeline */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '5px 12px', borderRadius: 20,
                            background: cfg.gradient,
                            border: `1px solid ${cfg.border}`,
                          }}>
                            <StatusIcon style={{ width: 12, height: 12, color: cfg.color }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                          </div>
                          <PaymentTimeline invoice={inv} compact />
                        </td>

                        {/* Date */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 12, color: '#64748b' }}>{relativeDate(inv.created_at)}</span>
                          <p style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                            {formatDateTime(inv.created_at)}
                          </p>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <ActionButton
                              onClick={() => handleConfirmAction(inv, 'send')}
                              icon={Send} label="Envoyer" color="#3b82f6"
                              loading={actionLoading[`send-${inv.invoice_id}`]}
                            />
                            {inv.status === 'en_attente' && (
                              <ActionButton
                                onClick={() => handleConfirmAction(inv, 'pay')}
                                icon={CreditCard} label="Payer" color="#8b5cf6"
                                data-testid={`pay-btn-${inv.invoice_id}`}
                                loading={actionLoading[`pay-${inv.invoice_id}`]}
                              />
                            )}
                            {isPaid && (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '5px 10px', borderRadius: 8,
                                background: 'rgba(52,211,153,0.08)',
                                fontSize: 11, fontWeight: 700, color: '#34d399',
                              }}>
                                <CheckCircle style={{ width: 12, height: 12 }} /> Payée
                              </span>
                            )}
                            <a href={`${API_URL}/exports/invoice/${inv.invoice_id}/pdf`}
                              data-testid={`pdf-btn-${inv.invoice_id}`}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '7px 12px', borderRadius: 10,
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: '#94a3b8', fontSize: 12, fontWeight: 500,
                                textDecoration: 'none', transition: 'all 0.2s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e2e8f0'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}>
                              <Download style={{ width: 12, height: 12 }} /> PDF
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Totals footer */}
                <tfoot>
                  <tr style={{ borderTop: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                    <td colSpan={3} style={{
                      padding: '16px', fontSize: 11, fontWeight: 800,
                      color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      Récapitulatif
                    </td>
                    <td style={{ padding: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[
                          { label: 'Payé', value: fmt(totalPaid), color: '#34d399' },
                          { label: 'En attente', value: fmt(totalPending), color: '#f59e0b' },
                          { label: 'En retard', value: fmt(totalLate), color: '#f43f5e' },
                        ].map(t => (
                          <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%', background: t.color,
                              boxShadow: `0 0 6px ${t.color}50`,
                            }} />
                            <span style={{ fontSize: 11, color: '#64748b', minWidth: 70 }}>{t.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: t.color }}>{t.value}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td colSpan={3} style={{ padding: 16 }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '8px 16px', borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(96,165,250,0.08))',
                        border: '1px solid rgba(139,92,246,0.2)',
                      }}>
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Total global</span>
                        <span style={{
                          fontSize: 18, fontWeight: 800, fontFamily: 'Manrope, sans-serif',
                          background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                          {fmt(totalPaid + totalPending)}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ═══ Mobile Cards ═══ */}
            <div className="md:hidden">
              {filteredInvoices.map((inv, idx) => {
                const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG['en_attente'];
                const overdue = isOverdue(inv);
                return (
                  <InvoiceCard
                    key={inv.invoice_id}
                    inv={inv} index={idx}
                    onSend={handleSendInvoice}
                    onPay={handlePay}
                    onConfirmAction={handleConfirmAction}
                    cfg={cfg} overdue={overdue}
                  />
                );
              })}

              {/* Mobile totals */}
              <div style={{
                padding: 20, background: 'rgba(255,255,255,0.02)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}>
                <p style={{
                  fontSize: 11, fontWeight: 800, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14,
                }}>
                  Récapitulatif
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Payé', value: fmt(totalPaid), color: '#34d399' },
                    { label: 'En attente', value: fmt(totalPending), color: '#f59e0b' },
                    { label: 'En retard', value: fmt(totalLate), color: '#f43f5e' },
                  ].map(t => (
                    <div key={t.label} style={{
                      textAlign: 'center', padding: '12px 8px', borderRadius: 12,
                      background: `${t.color}08`, border: `1px solid ${t.color}15`,
                    }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: t.color, fontFamily: 'Manrope, sans-serif' }}>
                        {fmtCompact(parseFloat(t.value.replace(/[^\d,-]/g, '').replace(',', '.')) || 0)}
                      </p>
                      <p style={{ fontSize: 10, color: '#64748b', marginTop: 3, fontWeight: 500 }}>{t.label}</p>
                    </div>
                  ))}
                </div>
                <div style={{
                  marginTop: 12, padding: '12px 16px', borderRadius: 12, textAlign: 'center',
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(96,165,250,0.06))',
                  border: '1px solid rgba(139,92,246,0.15)',
                }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>Total global </span>
                  <span style={{
                    fontSize: 18, fontWeight: 800, fontFamily: 'Manrope, sans-serif',
                    background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    {fmt(totalPaid + totalPending)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InvoicesList;
