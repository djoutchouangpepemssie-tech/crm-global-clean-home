/**
 * EmptyState — composant unifié pour les listes vides.
 *
 * Remplace les dizaines de `<p>Aucune donnée</p>` éparpillés dans le CRM
 * par une expérience cohérente et actionnable.
 *
 * Usage :
 *   <EmptyState
 *     icon={Inbox}
 *     title="Aucun lead trouvé"
 *     description="Créez votre premier lead pour démarrer."
 *     action={{ label: 'Nouveau lead', onClick: () => navigate('/leads/new') }}
 *   />
 */
import React from 'react';
import { Button } from '../ui/button';

export function EmptyState({
  icon: Icon,
  title = 'Rien à afficher',
  description,
  action,
  secondaryAction,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 dark:from-violet-900/30 dark:to-pink-900/30 flex items-center justify-center mb-5 ring-1 ring-violet-200/50 dark:ring-violet-800/50">
          <Icon className="w-8 h-8 text-violet-600 dark:text-violet-400" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-2">
          {secondaryAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
            >
              {secondaryAction.icon && <secondaryAction.icon className="w-4 h-4 mr-2" />}
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled}
              className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white shadow-sm"
            >
              {action.icon && <action.icon className="w-4 h-4 mr-2" />}
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
