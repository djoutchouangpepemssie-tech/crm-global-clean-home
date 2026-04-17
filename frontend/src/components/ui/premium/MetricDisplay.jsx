import React from 'react';

export function MetricDisplay({ label, value, delta, deltaLabel, size = 'md', color }) {
  const sizes = { sm: '24px', md: '40px', lg: '56px', hero: '72px' };
  const isPositive = delta >= 0;

  return (
    <div>
      <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 4px' }}>
        {label}
      </p>
      <p style={{ fontSize: sizes[size], fontWeight: 800, letterSpacing: '-0.03em', color: color || 'var(--text-primary)', margin: 0, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {value}
      </p>
      {delta !== undefined && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px', padding: '3px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, background: isPositive ? 'rgba(109,216,176,0.15)' : 'rgba(232,130,111,0.15)', color: isPositive ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
          {isPositive ? '↑' : '↓'} {Math.abs(delta)}% {deltaLabel}
        </div>
      )}
    </div>
  );
}

export default MetricDisplay;
