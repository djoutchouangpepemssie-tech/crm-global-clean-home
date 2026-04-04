import React, { useState } from 'react';

/**
 * Premium Input Components
 * Ultra-smooth focus effects and animations
 */

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
        <label className="block text-xs font-bold text-slate-400 mb-2">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
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
            w-full px-4 py-2.5 rounded-xl
            bg-white/5 border border-white/10
            text-slate-200 placeholder-slate-600
            transition-all duration-200
            focus:outline-none
            focus:ring-2 focus:ring-violet-500/50
            focus:bg-white/8 focus:border-violet-500/50
            disabled:opacity-50 disabled:cursor-not-allowed
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-red-500/50 focus:ring-red-500/50' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && errorMessage && (
        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
          <span>⚠️</span> {errorMessage}
        </p>
      )}
    </div>
  );
};

/**
 * Textarea - multi-line input
 */
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
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold text-slate-400 mb-2">{label}</label>
      )}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        rows={rows}
        className={`
          w-full px-4 py-2.5 rounded-xl
          bg-white/5 border border-white/10
          text-slate-200 placeholder-slate-600
          transition-all duration-200
          focus:outline-none
          focus:ring-2 focus:ring-violet-500/50
          focus:bg-white/8 focus:border-violet-500/50
          disabled:opacity-50 disabled:cursor-not-allowed
          resize-none
          ${error ? 'border-red-500/50 focus:ring-red-500/50' : ''}
          ${className}
        `}
        {...props}
      />
      {error && errorMessage && (
        <p className="text-xs text-red-400 mt-1">{errorMessage}</p>
      )}
    </div>
  );
};

/**
 * Select - dropdown input
 */
export const Select = ({
  label = null,
  options = [],
  value = '',
  onChange = null,
  error = false,
  errorMessage = '',
  disabled = false,
  placeholder = 'Sélectionnez une option...',
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold text-slate-400 mb-2">{label}</label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 rounded-xl appearance-none
          bg-white/5 border border-white/10
          text-slate-200
          transition-all duration-200
          focus:outline-none
          focus:ring-2 focus:ring-violet-500/50
          focus:bg-white/8 focus:border-violet-500/50
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
          ${error ? 'border-red-500/50 focus:ring-red-500/50' : ''}
          ${className}
        `}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-slate-900">
            {opt.label}
          </option>
        ))}
      </select>
      {error && errorMessage && (
        <p className="text-xs text-red-400 mt-1">{errorMessage}</p>
      )}
    </div>
  );
};

/**
 * Checkbox - for boolean inputs
 */
export const Checkbox = ({
  label,
  checked = false,
  onChange = null,
  disabled = false,
  className = '',
}) => {
  return (
    <label className={`flex items-center gap-3 cursor-pointer select-none ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
        />
        <div className={`
          w-5 h-5 rounded-lg border-2 transition-all duration-200
          ${checked 
            ? 'bg-violet-600 border-violet-600' 
            : 'border-white/20 hover:border-white/40'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}>
          {checked && (
            <svg className="w-3.5 h-3.5 text-white ml-0.5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
      {label && <span className="text-sm text-slate-300">{label}</span>}
    </label>
  );
};

/**
 * Radio Group - for single selection from multiple options
 */
export const RadioGroup = ({
  label,
  options = [],
  value = '',
  onChange = null,
  className = '',
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-bold text-slate-400 mb-3">{label}</label>
      )}
      <div className="space-y-2">
        {options.map(opt => (
          <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name={label}
              value={opt.value}
              checked={value === opt.value}
              onChange={onChange}
              className="sr-only"
            />
            <div className={`
              w-4 h-4 rounded-full border-2 transition-all
              ${value === opt.value
                ? 'bg-violet-600 border-violet-600'
                : 'border-white/20 hover:border-white/40'
              }
            `} />
            <span className="text-sm text-slate-300">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

/**
 * Search Input - with icon and clear button
 */
export const SearchInput = ({
  value = '',
  onChange = null,
  onClear = null,
  placeholder = 'Rechercher...',
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
      />
      {value && onClear && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
};
