/**
 * PageHeader — en-tête standardisé pour chaque page du CRM.
 *
 * Pourquoi : aujourd'hui chaque page réinvente son header avec ses propres
 * classes Tailwind. Résultat : incohérence visuelle entre Dashboard, Leads,
 * Devis, etc. Ce composant unifie :
 *   - Le titre (gros, Manrope)
 *   - Le sous-titre optionnel
 *   - Le fil d'ariane (breadcrumbs)
 *   - Les actions principales à droite (boutons)
 *   - Les onglets en dessous (si besoin)
 *
 * Usage simple :
 *   <PageHeader title="Leads" subtitle="Gestion des prospects" />
 *
 * Usage complet :
 *   <PageHeader
 *     title="Devis #DV-2026-042"
 *     subtitle="Global Clean Home → Jean Dupont"
 *     breadcrumbs={[
 *       { label: 'Devis', to: '/quotes' },
 *       { label: 'DV-2026-042' },
 *     ]}
 *     actions={[
 *       { label: 'Envoyer', icon: Send, onClick: handleSend, variant: 'primary' },
 *       { label: 'Télécharger PDF', icon: Download, onClick: handleDownload },
 *     ]}
 *     tabs={[
 *       { id: 'details', label: 'Détails', active: tab === 'details' },
 *       { id: 'history', label: 'Historique', badge: 12 },
 *     ]}
 *     onTabChange={setTab}
 *   />
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

function Breadcrumbs({ items = [] }) {
  if (!items.length) return null;
  return (
    <nav className="flex items-center gap-1 text-xs text-slate-500 mb-2">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${idx}`}>
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-slate-700 dark:text-slate-300 font-medium' : ''}>
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
    <div className="flex items-center gap-1 mt-6 border-b border-slate-200 -mb-px">
      {tabs.map((tab) => {
        const active = tab.active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange?.(tab.id)}
            disabled={tab.disabled}
            className={`
              relative px-4 py-2.5 text-sm font-medium transition-colors
              ${active
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-slate-600 hover:text-slate-900 dark:hover:text-slate-100'}
              ${tab.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="flex items-center gap-2">
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
              {tab.badge !== undefined && tab.badge !== null && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
                  {tab.badge}
                </Badge>
              )}
            </span>
            {active && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-pink-600 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions = [],
  tabs,
  onTabChange,
  children,
  className = '',
}) {
  return (
    <div className={`mb-6 ${className}`}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 font-display">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        {actions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {actions.map((action, idx) => {
              const isPrimary = action.variant === 'primary';
              return (
                <Button
                  key={`${action.label}-${idx}`}
                  size="sm"
                  variant={isPrimary ? 'default' : action.variant || 'outline'}
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                  className={isPrimary
                    ? 'bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white shadow-sm'
                    : ''}
                >
                  {action.icon && <action.icon className="w-4 h-4 mr-1.5" />}
                  {action.loading ? 'En cours…' : action.label}
                </Button>
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
