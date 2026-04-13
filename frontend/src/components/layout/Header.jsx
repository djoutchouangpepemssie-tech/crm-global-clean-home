import React from 'react';
import { Calendar, Search, Bell } from 'lucide-react';
import NotificationCenter from '../notifications/NotificationCenter';

const Header = ({ title, subtitle, actions }) => {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-default)',
      padding: '0 24px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      backdropFilter: 'blur(12px)',
      gap: '16px',
    }}>

      {/* Left — Title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '16px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right — Actions + Date + Notifications */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {actions}

        {/* Date */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px',
          background: 'var(--bg-muted)',
          borderRadius: 'var(--radius-md)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          fontWeight: '500',
          whiteSpace: 'nowrap',
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
