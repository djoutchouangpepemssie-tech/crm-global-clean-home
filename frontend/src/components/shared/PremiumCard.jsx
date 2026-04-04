import React from 'react';

/**
 * Premium Card Components
 * Ultra-modern glassmorphism with smooth animations
 */

export const Card = ({
  children,
  className = '',
  hoverable = false,
  gradient = false,
  noBorder = false,
}) => (
  <div
    className={`
      rounded-2xl p-5
      ${gradient 
        ? 'bg-gradient-to-br from-white/5 to-white/3' 
        : 'bg-white/3'
      }
      ${!noBorder ? 'border border-white/10' : ''}
      backdrop-blur-sm
      transition-all duration-300
      ${hoverable ? 'hover:bg-white/5 hover:border-white/20 hover:shadow-lg cursor-pointer hover:scale-[1.02]' : ''}
      ${className}
    `}
  >
    {children}
  </div>
);

/**
 * KPI Card - for metrics and statistics
 */
export const KPICard = ({
  label,
  value,
  unit = '',
  icon: Icon = null,
  trend = null,
  sparkline = null,
  color = '#8b5cf6',
  className = '',
}) => (
  <Card className={`relative overflow-hidden group ${className}`}>
    {/* Background glow */}
    <div 
      className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"
      style={{ background: color }}
    />
    
    <div className="relative z-10">
      {/* Header with icon and trend */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-400 mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <p 
              className="text-3xl font-black" 
              style={{ background: `linear-gradient(135deg, ${color}, #a78bfa)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              {value}
            </p>
            {unit && <span className="text-sm text-slate-500">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div 
            className="p-3 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity"
            style={{ background: `${color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        )}
      </div>

      {/* Trend indicator */}
      {trend && (
        <div className={`text-xs font-bold flex items-center gap-1 ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          <span>{trend > 0 ? '↑' : '↓'}</span>
          {Math.abs(trend)}% vs dernier mois
        </div>
      )}

      {/* Sparkline chart */}
      {sparkline && (
        <div className="mt-3 h-8 opacity-60 group-hover:opacity-100 transition-opacity">
          {sparkline}
        </div>
      )}
    </div>
  </Card>
);

/**
 * Status Card - for items with status
 */
export const StatusCard = ({
  title,
  description,
  status,
  statusColor,
  statusLabel,
  footer = null,
  actions = null,
  hoverable = true,
}) => (
  <Card hoverable={hoverable} className="flex flex-col">
    {/* Header */}
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <h3 className="font-bold text-slate-100 mb-1 line-clamp-2">{title}</h3>
        <p className="text-xs text-slate-500 line-clamp-2">{description}</p>
      </div>
      {status && (
        <div
          className="px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0 ml-2"
          style={{ 
            background: `${statusColor}20`,
            color: statusColor,
            border: `1px solid ${statusColor}40`
          }}
        >
          {statusLabel || status}
        </div>
      )}
    </div>

    {/* Footer */}
    {footer && <div className="text-xs text-slate-600 mt-auto pt-3 border-t border-white/5">{footer}</div>}

    {/* Actions */}
    {actions && (
      <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
        {actions}
      </div>
    )}
  </Card>
);

/**
 * Metric Row - for displaying metrics in a list
 */
export const MetricRow = ({
  label,
  value,
  icon: Icon = null,
  unit = '',
  sparkline = null,
  color = '#60a5fa',
}) => (
  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
    <div className="flex items-center gap-3 flex-1">
      {Icon && <Icon className="w-5 h-5" style={{ color }} />}
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-bold text-slate-200">{value} {unit}</p>
      </div>
    </div>
    {sparkline && <div className="ml-auto">{sparkline}</div>}
  </div>
);

/**
 * Avatar Card - for team members or contacts
 */
export const AvatarCard = ({
  name,
  role,
  avatar,
  status,
  actions = null,
}) => (
  <Card className="flex items-center gap-3">
    <div className="relative flex-shrink-0">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
        {avatar || name.charAt(0)}
      </div>
      {status && (
        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
          status === 'online' ? 'bg-emerald-500' :
          status === 'away' ? 'bg-yellow-500' :
          'bg-slate-500'
        }`} />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-slate-100 text-sm">{name}</p>
      <p className="text-xs text-slate-500">{role}</p>
    </div>
    {actions && <div className="flex gap-1 flex-shrink-0">{actions}</div>}
  </Card>
);

/**
 * Timeline Card - for chronological events
 */
export const TimelineCard = ({
  items,
  active = 0,
}) => (
  <Card>
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="flex gap-4">
          {/* Timeline dot and line */}
          <div className="flex flex-col items-center">
            <div 
              className={`w-3 h-3 rounded-full ${
                i <= active ? 'bg-violet-500' : 'bg-slate-700'
              } ring-2 ring-slate-900`}
            />
            {i < items.length - 1 && (
              <div 
                className={`w-0.5 h-12 ${
                  i < active ? 'bg-violet-500' : 'bg-slate-700'
                }`}
              />
            )}
          </div>
          {/* Content */}
          <div className="pb-4">
            <p className="text-sm font-bold text-slate-200">{item.label}</p>
            {item.description && (
              <p className="text-xs text-slate-500 mt-1">{item.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  </Card>
);
