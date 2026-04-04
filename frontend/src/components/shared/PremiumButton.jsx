import React from 'react';

/**
 * Premium Button Component
 * Variants: primary, secondary, danger, outline, ghost
 * Sizes: sm, md, lg
 * States: default, loading, disabled
 */

export const PremiumButton = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon: Icon = null,
  onClick = null,
  className = '',
  ...props
}) => {
  const variantClasses = {
    primary: `
      bg-gradient-to-r from-violet-600 to-purple-600
      hover:from-violet-700 hover:to-purple-700
      text-white
      shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50
      border border-violet-500/20
    `,
    secondary: `
      bg-white/10 hover:bg-white/15
      text-slate-200 hover:text-white
      border border-white/20 hover:border-white/30
      backdrop-blur
    `,
    danger: `
      bg-red-600/20 hover:bg-red-600/30
      text-red-400 hover:text-red-300
      border border-red-500/30
    `,
    outline: `
      bg-transparent hover:bg-white/5
      text-slate-300 hover:text-white
      border border-slate-500/50 hover:border-slate-400
    `,
    ghost: `
      bg-transparent hover:bg-white/5
      text-slate-400 hover:text-slate-200
      border-0
    `,
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-bold rounded-lg gap-1',
    md: 'px-4 py-2.5 text-sm font-bold rounded-xl gap-2',
    lg: 'px-6 py-3 text-base font-bold rounded-2xl gap-2',
  };

  const baseClasses = `
    inline-flex items-center justify-center
    transition-all duration-200 ease-out
    transform hover:scale-105 active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
    focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-slate-900
    whitespace-nowrap
  `;

  return (
    <button
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {typeof children === 'string' ? `${children}...` : children}
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4" />}
          {children}
        </>
      )}
    </button>
  );
};

/**
 * Button Group - for multiple related buttons
 */
export const ButtonGroup = ({ children, className = '' }) => (
  <div className={`flex gap-2 flex-wrap ${className}`}>
    {children}
  </div>
);

/**
 * Icon Button - square compact button for icons
 */
export const IconButton = ({
  icon: Icon,
  tooltip = '',
  variant = 'ghost',
  disabled = false,
  onClick = null,
  ...props
}) => (
  <div className="relative group">
    <button
      disabled={disabled}
      onClick={onClick}
      className={`
        p-2 rounded-lg
        transition-all duration-200
        ${variant === 'ghost' 
          ? 'hover:bg-white/10 text-slate-400 hover:text-slate-200' 
          : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-violet-500/50
      `}
      {...props}
    >
      <Icon className="w-5 h-5" />
    </button>
    {tooltip && (
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
                      hidden group-hover:flex
                      bg-slate-900 border border-white/10 rounded-lg px-2 py-1
                      text-xs text-slate-300 whitespace-nowrap
                      z-50 pointer-events-none">
        {tooltip}
      </div>
    )}
  </div>
);

/**
 * Floating Action Button
 */
export const FAB = ({
  icon: Icon,
  label = '',
  onClick = null,
  variant = 'primary',
  size = 'lg',
  className = '',
}) => (
  <button
    onClick={onClick}
    className={`
      fixed bottom-8 right-8
      p-4 rounded-full
      ${variant === 'primary'
        ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-2xl hover:shadow-violet-500/50'
        : 'bg-white/10 text-white shadow-lg'
      }
      hover:scale-110 transition-all duration-200
      flex items-center gap-2
      z-40
      ${className}
    `}
    title={label}
  >
    <Icon className="w-6 h-6" />
    {label && <span className="text-sm font-bold hidden sm:inline">{label}</span>}
  </button>
);
