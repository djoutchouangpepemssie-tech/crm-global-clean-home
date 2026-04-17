import React from 'react';

export function StatCard({ variant = 'default', label, value, delta, icon: Icon, children, className = '', onClick }) {
  const variants = {
    default:   { bg: 'var(--bg-card)',        color: 'var(--text-primary)',    labelColor: 'var(--text-muted)' },
    peach:     { bg: 'var(--surface-peach)',   color: 'var(--text-on-pastel)',  labelColor: 'rgba(26,26,28,0.6)' },
    lavender:  { bg: 'var(--surface-lavender)',color: 'var(--text-on-pastel)',  labelColor: 'rgba(26,26,28,0.6)' },
    mint:      { bg: 'var(--surface-mint)',    color: 'var(--text-on-pastel)',  labelColor: 'rgba(26,26,28,0.6)' },
    butter:    { bg: 'var(--surface-butter)',  color: 'var(--text-on-pastel)',  labelColor: 'rgba(26,26,28,0.6)' },
    elevated:  { bg: 'var(--bg-elevated)',     color: 'var(--text-primary)',    labelColor: 'var(--text-muted)' },
  };
  const v = variants[variant] || variants.default;

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: v.bg,
        borderRadius: '24px',
        padding: '24px',
        boxShadow: 'var(--shadow-card)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all var(--transition-base)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {Icon && (
        <div style={{ marginBottom: '16px' }}>
          <Icon size={20} style={{ color: v.labelColor }} />
        </div>
      )}
      {label && (
        <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: v.labelColor, margin: '0 0 8px' }}>
          {label}
        </p>
      )}
      {value !== undefined && (
        <p style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.03em', color: v.color, margin: 0, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {value}
        </p>
      )}
      {delta !== undefined && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px', padding: '3px 10px', borderRadius: '9999px', background: 'rgba(0,0,0,0.10)', fontSize: '12px', fontWeight: 700, color: v.color }}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
        </div>
      )}
      {children}
    </div>
  );
}

export default StatCard;
