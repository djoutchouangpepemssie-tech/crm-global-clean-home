/**
 * ConfirmDialog — remplace window.confirm() partout dans l'app.
 *
 * Usage avec le hook (recommandé) :
 *
 *   function MyComponent() {
 *     const { confirm, ConfirmElement } = useConfirm();
 *
 *     async function handleDelete() {
 *       const ok = await confirm({
 *         title: 'Supprimer ce lead ?',
 *         description: 'Cette action est irréversible.',
 *         variant: 'danger',
 *       });
 *       if (ok) deleteLead();
 *     }
 *
 *     return (
 *       <>
 *         <button onClick={handleDelete}>Supprimer</button>
 *         <ConfirmElement />
 *       </>
 *     );
 *   }
 */
import React, { useState, useCallback, useRef } from 'react';
import { AlertTriangle, Trash2, Info, CheckCircle2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

const VARIANTS = {
  info: {
    icon: Info,
    iconClass: 'text-neutral-500 bg-neutral-50',
    actionClass: 'bg-brand-600 hover:bg-brand-700 focus:ring-neutral-500',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500 bg-amber-50',
    actionClass: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
  },
  danger: {
    icon: Trash2,
    iconClass: 'text-terracotta-500 bg-terracotta-50',
    actionClass: 'bg-terracotta-600 hover:bg-terracotta-700 focus:ring-terracotta-500',
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'text-brand-500 bg-brand-50',
    actionClass: 'bg-brand-600 hover:bg-brand-700 focus:ring-brand-500',
  },
};

/**
 * Composant contrôlé — si tu veux gérer l'état toi-même.
 * Pour 99% des cas, utilise plutôt le hook useConfirm ci-dessous.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Confirmer cette action ?',
  description,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'warning',
  onConfirm,
  loading = false,
}) {
  const v = VARIANTS[variant] || VARIANTS.warning;
  const Icon = v.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${v.iconClass}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <AlertDialogTitle className="text-left">{title}</AlertDialogTitle>
              {description && (
                <AlertDialogDescription className="mt-2 text-left">
                  {description}
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={`text-white focus:ring-2 focus:ring-offset-2 ${v.actionClass}`}
          >
            {loading ? 'En cours...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook useConfirm — API promise-based.
 *
 * Retourne :
 *   - confirm(options) : Promise<boolean> qui résout true si OK, false si Annuler
 *   - ConfirmElement : à rendre une fois dans le composant
 */
export function useConfirm() {
  const [state, setState] = useState({
    open: false,
    title: '',
    description: '',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    variant: 'warning',
  });
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        open: true,
        title: options.title || 'Confirmer cette action ?',
        description: options.description || '',
        confirmText: options.confirmText || 'Confirmer',
        cancelText: options.cancelText || 'Annuler',
        variant: options.variant || 'warning',
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolverRef.current?.(true);
    setState((s) => ({ ...s, open: false }));
  }, []);

  const handleOpenChange = useCallback((open) => {
    if (!open) {
      resolverRef.current?.(false);
      setState((s) => ({ ...s, open: false }));
    }
  }, []);

  const ConfirmElement = useCallback(
    () => (
      <ConfirmDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        title={state.title}
        description={state.description}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        variant={state.variant}
        onConfirm={handleConfirm}
      />
    ),
    [state, handleConfirm, handleOpenChange]
  );

  return { confirm, ConfirmElement };
}

export default ConfirmDialog;
