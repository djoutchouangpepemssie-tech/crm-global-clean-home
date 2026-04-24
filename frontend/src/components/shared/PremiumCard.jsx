import React from 'react';

export const Card = ({
  children,
  className = '',
  hoverable = false,
  padded = true,
  noBorder = false,
}) => (
  <div
    className={`
      glass ${hoverable ? 'glass-interactive' : ''}
      ${padded ? 'p-5' : ''}
      ${className}
    `}
    style={{ borderRadius: 'var(--lg-radius)' }}
  >
    {children}
  </div>
);

export const KPICard = ({
  label,
  value,
  unit = '',
  icon: Icon = null,
  trend = null,
  sparkline = null,
  tone = 'brand',
  className = '',
}) => {
  const tones = {
    brand:   { bg: 'bg-brand-50',      text: 'text-brand-700',      iconBg: 'bg-brand-100' },
    accent:  { bg: 'bg-terracotta-50', text: 'text-terracotta-700', iconBg: 'bg-terracotta-100' },
    amber:   { bg: 'bg-amber-50',      text: 'text-amber-700',      iconBg: 'bg-amber-100' },
    neutral: { bg: 'bg-neutral-100',   text: 'text-neutral-800',    iconBg: 'bg-neutral-200' },
  }[tone] || { bg: 'bg-brand-50', text: 'text-brand-700', iconBg: 'bg-brand-100' };

  return (
    <Card className={className}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500 mb-2">
            {label}
          </p>
          <div className="flex items-baseline gap-1.5">
            <p className="font-display text-3xl font-semibold text-neutral-900 tabular-nums tracking-tight">
              {value}
            </p>
            {unit && <span className="text-sm text-neutral-500 tabular-nums">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg ${tones.iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${tones.text}`} strokeWidth={1.75} />
          </div>
        )}
      </div>

      {trend !== null && trend !== undefined && (
        <div className={`text-xs font-semibold flex items-center gap-1 ${
          trend > 0 ? 'text-brand-700' : trend < 0 ? 'text-terracotta-700' : 'text-neutral-500'
        }`}>
          <span>{trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}</span>
          <span className="tabular-nums">{Math.abs(trend)}%</span>
          <span className="font-normal text-neutral-500">vs dernier mois</span>
        </div>
      )}

      {sparkline && <div className="mt-3 h-8">{sparkline}</div>}
    </Card>
  );
};

export const StatusCard = ({
  title,
  description,
  status,
  statusTone = 'neutral',
  statusLabel,
  footer = null,
  actions = null,
  hoverable = true,
}) => {
  const toneClasses = {
    brand:   'bg-brand-50 text-brand-700 ring-brand-200',
    accent:  'bg-terracotta-50 text-terracotta-700 ring-terracotta-200',
    amber:   'bg-amber-50 text-amber-700 ring-amber-200',
    neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
  }[statusTone] || 'bg-neutral-100 text-neutral-700 ring-neutral-200';

  return (
    <Card hoverable={hoverable} className="flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-neutral-900 mb-1 line-clamp-2 leading-tight">
            {title}
          </h3>
          <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">{description}</p>
        </div>
        {status && (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset flex-shrink-0 ml-2 ${toneClasses}`}>
            {statusLabel || status}
          </span>
        )}
      </div>
      {footer && <div className="text-xs text-neutral-500 mt-auto pt-3 border-t border-neutral-200">{footer}</div>}
      {actions && <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-200">{actions}</div>}
    </Card>
  );
};

export const MetricRow = ({
  label,
  value,
  icon: Icon = null,
  unit = '',
  sparkline = null,
  tone = 'brand',
}) => {
  const toneColor = {
    brand:   'text-brand-600',
    accent:  'text-terracotta-600',
    amber:   'text-amber-600',
    neutral: 'text-neutral-600',
  }[tone] || 'text-brand-600';

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        {Icon && <Icon className={`w-5 h-5 ${toneColor}`} strokeWidth={1.75} />}
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-neutral-500">{label}</p>
          <p className="text-sm font-semibold text-neutral-900 tabular-nums">{value} {unit}</p>
        </div>
      </div>
      {sparkline && <div className="ml-auto">{sparkline}</div>}
    </div>
  );
};

export const AvatarCard = ({
  name,
  role,
  avatar,
  status,
  actions = null,
}) => (
  <Card className="flex items-center gap-3" padded>
    <div className="relative flex-shrink-0">
      <div className="w-11 h-11 rounded-full bg-brand-600 flex items-center justify-center text-white font-display font-semibold text-sm">
        {avatar || name?.charAt(0)?.toUpperCase()}
      </div>
      {status && (
        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${
          status === 'online' ? 'bg-brand-500' :
          status === 'away'   ? 'bg-amber-500' :
          'bg-neutral-400'
        }`} />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-neutral-900 text-sm truncate">{name}</p>
      <p className="text-xs text-neutral-500 truncate">{role}</p>
    </div>
    {actions && <div className="flex gap-1 flex-shrink-0">{actions}</div>}
  </Card>
);

export const TimelineCard = ({ items = [], active = 0 }) => (
  <Card>
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full ring-2 ring-white ${
              i <= active ? 'bg-brand-600' : 'bg-neutral-300'
            }`} />
            {i < items.length - 1 && (
              <div className={`w-0.5 h-12 ${i < active ? 'bg-brand-600' : 'bg-neutral-200'}`} />
            )}
          </div>
          <div className="pb-4">
            <p className="text-sm font-semibold text-neutral-900">{item.label}</p>
            {item.description && (
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{item.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  </Card>
);
