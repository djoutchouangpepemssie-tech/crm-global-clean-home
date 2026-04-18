import React from 'react';

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
      bg-brand-600 hover:bg-brand-700
      text-white
      shadow-sm hover:shadow-brand
      border border-brand-700/10
    `,
    secondary: `
      bg-white hover:bg-neutral-50
      text-neutral-700 hover:text-neutral-900
      border border-neutral-200 hover:border-neutral-300
      shadow-card
    `,
    danger: `
      bg-terracotta-600 hover:bg-terracotta-700
      text-white
      shadow-sm hover:shadow-accent
      border border-terracotta-700/10
    `,
    outline: `
      bg-transparent hover:bg-neutral-50
      text-neutral-700 hover:text-neutral-900
      border border-neutral-300 hover:border-neutral-400
    `,
    ghost: `
      bg-transparent hover:bg-neutral-100
      text-neutral-600 hover:text-neutral-900
      border-0
    `,
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-semibold rounded-md gap-1.5',
    md: 'px-4 py-2.5 text-sm font-semibold rounded-lg gap-2',
    lg: 'px-6 py-3 text-base font-semibold rounded-xl gap-2',
  };

  const baseClasses = `
    inline-flex items-center justify-center
    transition-all duration-200 ease-out
    active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white
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
          {typeof children === 'string' ? `${children}…` : children}
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

export const ButtonGroup = ({ children, className = '' }) => (
  <div className={`flex gap-2 flex-wrap ${className}`}>{children}</div>
);

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
        p-2 rounded-md
        transition-all duration-200
        ${variant === 'ghost'
          ? 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900'
          : 'bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 shadow-card'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50
      `}
      {...props}
    >
      <Icon className="w-5 h-5" />
    </button>
    {tooltip && (
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                      hidden group-hover:flex
                      bg-neutral-900 rounded-md px-2 py-1
                      text-xs text-neutral-50 whitespace-nowrap
                      z-50 pointer-events-none shadow-card-lg">
        {tooltip}
      </div>
    )}
  </div>
);

export const FAB = ({
  icon: Icon,
  label = '',
  onClick = null,
  variant = 'primary',
  className = '',
}) => (
  <button
    onClick={onClick}
    className={`
      fixed bottom-8 right-8
      p-4 rounded-full
      ${variant === 'primary'
        ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand'
        : 'bg-white text-neutral-700 shadow-card-lg border border-neutral-200'
      }
      hover:-translate-y-0.5 transition-all duration-200
      flex items-center gap-2
      z-40
      ${className}
    `}
    title={label}
  >
    <Icon className="w-6 h-6" />
    {label && <span className="text-sm font-semibold hidden sm:inline">{label}</span>}
  </button>
);
