import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Composant FormField réutilisable avec validation inline
 */
const FormField = ({
  label, required, error, success, hint, children, className = ''
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
          {label}
          {required && <span className="text-terracotta-400">*</span>}
        </label>
      )}
      <div className="relative">
        {children}
        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <AlertCircle className="w-4 h-4 text-terracotta-400"/>
          </div>
        )}
        {success && !error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CheckCircle className="w-4 h-4 text-brand-400"/>
          </div>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-terracotta-400">
          <AlertCircle className="w-3 h-3 flex-shrink-0"/>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-[10px] text-neutral-600">{hint}</p>
      )}
    </div>
  );
};

export default FormField;
