/**
 * Point d'entrée unique pour les composants partagés.
 *
 * Usage :
 *   import { PageHeader, EmptyState, ConfirmDialog, useConfirm, StatusBadge } from '@/components/shared';
 */
export { default as PageHeader } from './PageHeader';
export { default as EmptyState } from './EmptyState';
export { default as ConfirmDialog, useConfirm } from './ConfirmDialog';
export { default as StatusBadge, getStatusConfig } from './StatusBadge';
export { default as MagazineShell } from './MagazineShell';
