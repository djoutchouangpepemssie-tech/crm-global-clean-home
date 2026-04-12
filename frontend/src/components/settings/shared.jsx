/**
 * Composants réutilisables pour les pages Settings.
 *
 * Extraits de SettingsPage.jsx (lignes 26-199) pour être importables
 * par chaque section individuellement.
 */
import React, { useState } from 'react';
import { ChevronDown, RefreshCw, AlertTriangle } from 'lucide-react';

export const SectionCard = ({ title, description, icon: Icon, children, color = '#8b5cf6', badge, collapsible = false, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/8 overflow-hidden transition-all duration-200 hover:border-white/12"
      style={{ background: 'rgba(255,255,255,0.02)' }}>
      <button
        onClick={() => collapsible && setOpen(!open)}
        className={`w-full flex items-center gap-4 p-5 ${collapsible ? 'cursor-pointer hover:bg-white/3' : 'cursor-default'} transition-all`}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-100" style={{ fontFamily: 'Manrope, sans-serif' }}>{title}</h3>
            {badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
                {badge}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>}
        </div>
        {collapsible && (
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {open && <div className="px-5 pb-5 pt-0 space-y-4">{children}</div>}
    </div>
  );
};

export const FieldRow = ({ label, description, children, horizontal = true }) => (
  <div className={`${horizontal ? 'flex items-start justify-between gap-4' : 'space-y-2'} py-3 border-t border-white/5 first:border-t-0 first:pt-0`}>
    <div className="min-w-0 flex-shrink-0" style={{ maxWidth: horizontal ? '55%' : '100%' }}>
      <p className="text-sm font-medium text-slate-300">{label}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </div>
    <div className={`${horizontal ? 'flex-shrink-0' : 'w-full'}`}>{children}</div>
  </div>
);

export const Toggle = ({ checked, onChange, disabled = false, size = 'md' }) => {
  const sizes = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
    md: { track: 'w-10 h-5', thumb: 'w-4 h-4', translate: 'translate-x-5' },
    lg: { track: 'w-12 h-6', thumb: 'w-5 h-5', translate: 'translate-x-6' },
  };
  const s = sizes[size];
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex ${s.track} items-center rounded-full transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ background: checked ? '#8b5cf6' : 'rgba(255,255,255,0.1)' }}
    >
      <span className={`inline-block ${s.thumb} transform rounded-full bg-white shadow-lg transition-transform duration-200 ${checked ? s.translate : 'translate-x-0.5'}`} />
    </button>
  );
};

export const TextInput = ({ value, onChange, placeholder, type = 'text', icon: Icon, disabled = false, className = '' }) => (
  <div className={`relative ${className}`}>
    {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />}
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 rounded-xl text-sm text-slate-200 placeholder-slate-600
                 bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30
                 disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
    />
  </div>
);

export const SelectInput = ({ value, onChange, options, icon: Icon, className = '' }) => (
  <div className={`relative ${className}`}>
    {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none z-10" />}
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-8 py-2.5 rounded-xl text-sm text-slate-200
                 bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/40
                 appearance-none cursor-pointer transition-all`}
      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value} style={{ background: '#1a1a2e', color: '#e2e8f0' }}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export const TextArea = ({ value, onChange, placeholder, rows = 3, className = '' }) => (
  <textarea
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    className={`w-full px-3 py-2.5 rounded-xl text-sm text-slate-200 placeholder-slate-600
               bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30
               resize-none transition-all ${className}`}
  />
);

export const ActionButton = ({ children, variant = 'primary', size = 'md', icon: Icon, onClick, disabled = false, loading = false, className = '' }) => {
  const variants = {
    primary: 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20',
    secondary: 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
    success: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20',
    ghost: 'hover:bg-white/5 text-slate-400',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-sm',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200
                 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

export const ColorPicker = ({ value, onChange, presets }) => (
  <div className="flex items-center gap-2 flex-wrap">
    {presets.map(color => (
      <button
        key={color}
        onClick={() => onChange(color)}
        className={`w-7 h-7 rounded-lg transition-all duration-200 ${value === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-110'}`}
        style={{ background: color }}
      />
    ))}
  </div>
);

export const Badge = ({ children, color = '#8b5cf6' }) => (
  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
    {children}
  </span>
);

export const DangerZone = ({ title, description, buttonText, onConfirm, loading = false }) => {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
      <div>
        <p className="text-sm font-semibold text-red-400">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      {confirming ? (
        <div className="flex items-center gap-2">
          <ActionButton variant="danger" size="sm" loading={loading} onClick={() => { onConfirm(); setConfirming(false); }}>Confirmer</ActionButton>
          <ActionButton variant="ghost" size="sm" onClick={() => setConfirming(false)}>Annuler</ActionButton>
        </div>
      ) : (
        <ActionButton variant="danger" size="sm" icon={AlertTriangle} onClick={() => setConfirming(true)}>{buttonText}</ActionButton>
      )}
    </div>
  );
};

export const settingsTabs = [
  { id: 'profile', label: 'Profil', icon: null, color: '#8b5cf6' },
  { id: 'company', label: 'Entreprise', icon: null, color: '#f97316' },
  { id: 'appearance', label: 'Apparence', icon: null, color: '#ec4899' },
  { id: 'notifications', label: 'Notifications', icon: null, color: '#f59e0b' },
  { id: 'security', label: 'Sécurité', icon: null, color: '#ef4444' },
  { id: 'team', label: 'Équipe', icon: null, color: '#10b981' },
  { id: 'billing', label: 'Facturation', icon: null, color: '#6366f1' },
  { id: 'email', label: 'Email & SMS', icon: null, color: '#06b6d4' },
  { id: 'scheduling', label: 'Planning', icon: null, color: '#84cc16' },
  { id: 'zones', label: 'Zones', icon: null, color: '#f43f5e' },
  { id: 'documents', label: 'Documents', icon: null, color: '#a855f7' },
  { id: 'integrations', label: 'Intégrations', icon: null, color: '#eab308' },
  { id: 'api', label: 'API', icon: null, color: '#64748b' },
  { id: 'data', label: 'Données', icon: null, color: '#0ea5e9' },
  { id: 'advanced', label: 'Avancé', icon: null, color: '#78716c' },
];
