import React from 'react';
import { Calendar } from 'lucide-react';
import NotificationCenter from '../notifications/NotificationCenter';

/**
 * Header — ATELIER direction
 * Utilise les tokens CSS existants (--bg-card, --text-primary, etc.)
 * Ajustements : hiérarchie typo plus forte, datepill en crème mate.
 */
const Header = ({ title, subtitle, actions }) => {
  return (
    <div style={{
      background: 'rgba(251, 250, 246, 0.72)',
      borderBottom: '1px solid var(--border-default, #E5E0D6)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 4px 20px rgba(38,36,31,0.04)',
      padding: '0 24px',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      gap: '16px',
    }}>

      {/* Left — Title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
        <h1 style={{
          fontFamily: 'var(--font-display, "Fraunces", serif)',
          fontSize: '18px',
          fontWeight: 600,
          letterSpacing: '-0.015em',
          color: 'var(--text-primary, #1C1915)',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: '11px',
            color: 'var(--text-muted, #78716C)',
            margin: 0,
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            letterSpacing: '0.02em',
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right — Actions + Date + Notifications */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {actions}

        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px',
          background: 'var(--bg-muted, #F5EFE3)',
          border: '1px solid var(--border-default, #E5E0D6)',
          borderRadius: 'var(--radius-md, 6px)',
          fontSize: '11px',
          color: 'var(--text-muted, #78716C)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          letterSpacing: '0.02em',
        }}>
          <Calendar size={12} />
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>

        <NotificationCenter />
      </div>
    </div>
  );
};

export default Header;
