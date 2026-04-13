import React from 'react';

export function EmptyState({ icon: Icon, title='Rien à afficher', description, action, secondaryAction, className='' }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      padding:'48px 24px', textAlign:'center',
    }} className={className}>
      {Icon && (
        <div style={{
          width:'56px', height:'56px',
          borderRadius:'var(--radius-lg)',
          background:'var(--brand-light)',
          border:'1px solid var(--brand-medium)',
          display:'flex', alignItems:'center', justifyContent:'center',
          marginBottom:'16px',
        }}>
          <Icon size={24} style={{ color:'var(--brand)' }} strokeWidth={1.75} />
        </div>
      )}
      <h3 style={{
        fontFamily:'var(--font-display)',
        fontSize:'15px', fontWeight:'600',
        color:'var(--text-primary)',
        margin:'0 0 8px',
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize:'13px', color:'var(--text-muted)',
          maxWidth:'320px', lineHeight:1.6,
          margin:'0 0 20px',
        }}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
              style={{
                display:'inline-flex', alignItems:'center', gap:'6px',
                padding:'8px 16px',
                background:'var(--bg-card)',
                border:'1px solid var(--border-default)',
                borderRadius:'var(--radius-md)',
                fontSize:'13px', fontWeight:'500',
                color:'var(--text-secondary)',
                cursor:'pointer',
                boxShadow:'var(--shadow-card)',
              }}
            >
              {secondaryAction.icon && <secondaryAction.icon size={14} />}
              {secondaryAction.label}
            </button>
          )}
          {action && (
            <button
              onClick={action.onClick}
              disabled={action.disabled}
              style={{
                display:'inline-flex', alignItems:'center', gap:'6px',
                padding:'8px 16px',
                background:'var(--brand)',
                border:'none',
                borderRadius:'var(--radius-md)',
                fontSize:'13px', fontWeight:'600',
                color:'#fff',
                cursor:'pointer',
                boxShadow:'0 2px 8px rgba(99,102,241,0.25)',
              }}
            >
              {action.icon && <action.icon size={14} />}
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
