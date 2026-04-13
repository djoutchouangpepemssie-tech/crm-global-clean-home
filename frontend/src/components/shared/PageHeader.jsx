import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

function Breadcrumbs({ items = [] }) {
  if (!items.length) return null;
  return (
    <nav style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:'8px' }}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${idx}`}>
            {idx > 0 && <ChevronRight size={12} style={{ color:'var(--text-muted)' }} />}
            {item.to && !isLast ? (
              <Link to={item.to} style={{
                fontSize:'12px', color:'var(--brand)',
                textDecoration:'none', fontWeight:'500',
              }}>
                {item.label}
              </Link>
            ) : (
              <span style={{
                fontSize:'12px',
                color: isLast ? 'var(--text-secondary)' : 'var(--text-muted)',
                fontWeight: isLast ? '500' : '400',
              }}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function PageTabs({ tabs = [], onTabChange }) {
  if (!tabs.length) return null;
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:'2px',
      marginTop:'20px',
      borderBottom: '1px solid var(--border-default)',
      paddingBottom:'-1px',
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange?.(tab.id)}
          disabled={tab.disabled}
          style={{
            position:'relative',
            padding:'8px 16px',
            fontSize:'13px',
            fontWeight: tab.active ? '600' : '500',
            color: tab.active ? 'var(--brand)' : 'var(--text-muted)',
            background:'none', border:'none', cursor: tab.disabled ? 'not-allowed' : 'pointer',
            opacity: tab.disabled ? 0.4 : 1,
            transition:'color 0.15s ease',
            display:'flex', alignItems:'center', gap:'6px',
            whiteSpace:'nowrap',
          }}
        >
          {tab.icon && <tab.icon size={14} />}
          {tab.label}
          {tab.badge !== undefined && tab.badge !== null && (
            <span style={{
              fontSize:'10px', fontWeight:'700',
              padding:'1px 6px',
              background: tab.active ? 'var(--brand)' : 'var(--bg-muted)',
              color: tab.active ? '#fff' : 'var(--text-muted)',
              borderRadius:'20px',
            }}>
              {tab.badge}
            </span>
          )}
          {tab.active && (
            <span style={{
              position:'absolute', bottom:'-1px', left:0, right:0,
              height:'2px',
              background:'var(--brand)',
              borderRadius:'2px 2px 0 0',
            }} />
          )}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, breadcrumbs, actions=[], tabs, onTabChange, children, className='' }) {
  return (
    <div style={{ marginBottom:'24px' }} className={className}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'16px', flexWrap:'wrap' }}>
        <div style={{ minWidth:0, flex:1 }}>
          <h1 style={{
            fontFamily:'var(--font-display)',
            fontSize:'24px', fontWeight:'700',
            color:'var(--text-primary)',
            letterSpacing:'-0.02em', lineHeight:1.2,
            margin:0,
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ marginTop:'4px', fontSize:'13px', color:'var(--text-muted)', margin:'4px 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', flexShrink:0 }}>
            {actions.map((action, idx) => {
              const isPrimary = action.variant === 'primary';
              return (
                <button
                  key={`${action.label}-${idx}`}
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                  style={{
                    display:'inline-flex', alignItems:'center', gap:'6px',
                    padding:'8px 16px',
                    background: isPrimary ? 'var(--brand)' : 'var(--bg-card)',
                    color: isPrimary ? '#fff' : 'var(--text-secondary)',
                    border: isPrimary ? 'none' : '1px solid var(--border-default)',
                    borderRadius:'var(--radius-md)',
                    fontSize:'13px', fontWeight:'600',
                    cursor: action.disabled ? 'not-allowed' : 'pointer',
                    opacity: action.disabled ? 0.6 : 1,
                    boxShadow: isPrimary ? '0 2px 8px rgba(99,102,241,0.25)' : 'var(--shadow-card)',
                    transition:'all 0.2s ease',
                    fontFamily:'var(--font-body)',
                    whiteSpace:'nowrap',
                  }}
                >
                  {action.icon && <action.icon size={15} />}
                  {action.loading ? 'En cours…' : action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {children}
      {tabs && <PageTabs tabs={tabs} onTabChange={onTabChange} />}
    </div>
  );
}

export default PageHeader;
