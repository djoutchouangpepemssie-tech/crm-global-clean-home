import React from 'react';

export function PillBadge({ children, variant = 'neutral', dot }) {
  const variants = {
    success:  { bg: 'rgba(109,216,176,0.15)', color: 'var(--accent-success)', border: 'none' },
    danger:   { bg: 'rgba(232,130,111,0.15)', color: 'var(--accent-danger)',  border: 'none' },
    warning:  { bg: 'rgba(245,230,168,0.20)', color: 'var(--accent-warning)', border: 'none' },
    info:     { bg: 'rgba(130,184,245,0.15)', color: 'var(--accent-info)',    border: 'none' },
    neutral:  { bg: 'var(--bg-elevated)',     color: 'var(--text-secondary)', border: '1px solid var(--border-default)' },
    active:   { bg: 'var(--brand)',           color: 'var(--text-on-pastel)', border: 'none' },
    peach:    { bg: 'var(--surface-peach)',   color: 'var(--text-on-pastel)', border: 'none' },
    mint:     { bg: 'var(--surface-mint)',    color: 'var(--text-on-pastel)', border: 'none' },
    lavender: { bg: 'var(--surface-lavender)',color: 'var(--text-on-pastel)', border: 'none' },
  };
  const s = variants[variant] || variants.neutral;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600, background: s.bg, color: s.color, border: s.border, letterSpacing: '0.01em' }}>
      {dot && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />}
      {children}
    </span>
  );
}

export default PillBadge;
