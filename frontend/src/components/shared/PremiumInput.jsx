import React, { useState } from 'react';
import { Search, AlertCircle, Check } from 'lucide-react';

export const Input = ({
  label = null,
  icon: Icon = null,
  placeholder = '',
  value = '',
  onChange = null,
  type = 'text',
  error = false,
  errorMessage = '',
  disabled = false,
  required = false,
  className = '',
  ...props
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500 mb-1.5">
          {label}
          {required && <span className="text-terracotta-600 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`
            w-full px-3.5 py-2.5 rounded-lg
            bg-white border text-sm
            text-neutral-900 placeholder-neutral-400
            transition-all duration-150
            focus:outline-none
            ${error
              ? 'border-terracotta-400 focus:ring-2 focus:ring-terracotta-500/20 focus:border-terracotta-500'
              : 'border-neutral-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
            }
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-50
            ${Icon ? 'pl-10' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && errorMessage && (
        <p className="text-xs text-terracotta-700 mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {errorMessage}
        </p>
      )}
    </div>
  );
};

export const Textarea = ({
  label = null,
  placeholder = '',
  value = '',
  onChange = null,
  error = false,
  errorMessage = '',
  disabled = false,
  rows = 4,
  className = '',
  ...props
}) => (
  <div className="w-full">
    {label && (
      <label className="block text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500 mb-1.5">
        {label}
      </label>
    )}
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      rows={rows}
      className={`
        w-full px-3.5 py-2.5 rounded-lg
        bg-white border text-sm
        text-neutral-900 placeholder-neutral-400
        transition-all duration-150
        focus:outline-none
        ${error
          ? 'border-terracotta-400 focus:ring-2 focus:ring-terracotta-500/20 focus:border-terracotta-500'
          : 'border-neutral-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
        }
        disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-50
        resize-y
        ${className}
      `}
      {...props}
    />
    {error && errorMessage && (
      <p className="text-xs text-terracotta-700 mt-1.5 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> {errorMessage}
      </p>
    )}
  </div>
);

export const Select = ({
  label = null,
  options = [],
  value = '',
  onChange = null,
  error = false,
  errorMessage = '',
  disabled = false,
  placeholder = 'Sélectionnez une option…',
  className = '',
  ...props
}) => (
  <div className="w-full">
    {label && (
      <label className="block text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500 mb-1.5">
        {label}
      </label>
    )}
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`
        w-full px-3.5 py-2.5 rounded-lg appearance-none
        bg-white border text-sm
        text-neutral-900
        transition-all duration-150
        focus:outline-none
        ${error
          ? 'border-terracotta-400 focus:ring-2 focus:ring-terracotta-500/20 focus:border-terracotta-500'
          : 'border-neutral-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
        }
        disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-50
        cursor-pointer
        bg-no-repeat bg-right
        pr-10
        ${className}
      `}
      style={{
        backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378716C' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
        backgroundPosition: 'right 0.75rem center',
        backgroundSize: '12px',
      }}
      {...props}
    >
      <option value="">{placeholder}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && errorMessage && (
      <p className="text-xs text-terracotta-700 mt-1.5">{errorMessage}</p>
    )}
  </div>
);

export const Checkbox = ({
  label,
  checked = false,
  onChange = null,
  disabled = false,
  className = '',
}) => (
  <label className={`flex items-center gap-2.5 cursor-pointer select-none ${className}`}>
    <div className="relative">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
      <div className={`
        w-[18px] h-[18px] rounded border transition-all duration-150
        flex items-center justify-center
        ${checked
          ? 'bg-brand-600 border-brand-600'
          : 'bg-white border-neutral-300 hover:border-neutral-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}>
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
    </div>
    {label && <span className="text-sm text-neutral-700">{label}</span>}
  </label>
);

export const RadioGroup = ({
  label,
  options = [],
  value = '',
  onChange = null,
  className = '',
}) => (
  <div className={className}>
    {label && (
      <label className="block text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500 mb-2.5">
        {label}
      </label>
    )}
    <div className="space-y-2">
      {options.map(opt => (
        <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="radio"
            name={label}
            value={opt.value}
            checked={value === opt.value}
            onChange={onChange}
            className="sr-only"
          />
          <div className={`
            w-[18px] h-[18px] rounded-full border-2 transition-all flex items-center justify-center
            ${value === opt.value
              ? 'border-brand-600'
              : 'border-neutral-300 hover:border-neutral-400'
            }
          `}>
            {value === opt.value && <div className="w-2 h-2 rounded-full bg-brand-600" />}
          </div>
          <span className="text-sm text-neutral-700">{opt.label}</span>
        </label>
      ))}
    </div>
  </div>
);

export const SearchInput = ({
  value = '',
  onChange = null,
  onClear = null,
  placeholder = 'Rechercher…',
  className = '',
}) => (
  <div className={`relative ${className}`}>
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-white border border-neutral-200 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-150"
    />
    {value && onClear && (
      <button
        onClick={onClear}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors text-sm"
        aria-label="Effacer"
      >
        ✕
      </button>
    )}
  </div>
);
