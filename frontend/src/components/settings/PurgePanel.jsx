/**
 * PurgePanel — suppression catégorisée de données.
 *
 * Composant autonome extrait de SettingsPage.jsx (Vague 13).
 * Permet de sélectionner des catégories de données à supprimer
 * (leads, devis, factures, tâches, etc.) avec double confirmation.
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Users, FileText, CreditCard, CheckSquare, CalendarDays,
  FolderOpen, AlertTriangle, Zap, Mail, Activity, Database,
  Layers, Trash2, Check, RefreshCw,
} from 'lucide-react';
import { ActionButton } from './shared';
import { useConfirm } from '../shared/ConfirmDialog';

const categoryIcons = {
  leads: Users, quotes: FileText, invoices: CreditCard, tasks: CheckSquare,
  planning: CalendarDays, contracts: FileText, documents: FolderOpen,
  tickets: AlertTriangle, workflows: Zap, communications: Mail,
  interactions: Activity, logs: Database, templates: Layers,
};

export default function PurgePanel({ apiUrl }) {
  const { confirm, ConfirmElement } = useConfirm();
  const [categories, setCategories] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${apiUrl}/data/purge-info`);
        setCategories(res.data?.categories || {});
      } catch { /* ignore */ }
      setLoadingInfo(false);
    })();
  }, [apiUrl]);

  const toggleCategory = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    const allKeys = Object.keys(categories);
    setSelected(prev => prev.size === allKeys.length ? new Set() : new Set(allKeys));
  };

  const totalSelected = [...selected].reduce((sum, key) => sum + (categories[key]?.count || 0), 0);

  const handlePurge = async () => {
    if (selected.size === 0) {
      toast.error('Sélectionnez au moins une catégorie');
      return;
    }

    const ok = await confirm({
      title: `Supprimer ${totalSelected} éléments ?`,
      description: `${selected.size} catégorie${selected.size > 1 ? 's' : ''} sélectionnée${selected.size > 1 ? 's' : ''}. Cette action est IRRÉVERSIBLE.`,
      confirmText: 'Supprimer définitivement',
      variant: 'danger',
    });
    if (!ok) return;

    setPurging(true);
    try {
      const isAll = selected.size === Object.keys(categories).length;
      const payload = {
        confirm: 'SUPPRIMER',
        collections: isAll ? null : Array.from(selected),
      };

      const res = await axios.post(`${apiUrl}/data/purge`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      const deleted = res.data?.total_deleted || res.data?.deleted || 0;
      toast.success(`${deleted} élément${deleted !== 1 ? 's' : ''} supprimé${deleted !== 1 ? 's' : ''}`);

      setCategories(prev => {
        const updated = { ...prev };
        for (const key of selected) {
          if (updated[key]) updated[key] = { ...updated[key], count: 0 };
        }
        return updated;
      });
      setSelected(new Set());
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Erreur lors de la suppression';
      toast.error(msg);
    } finally {
      setPurging(false);
    }
  };

  if (loadingInfo) return <div className="flex justify-center py-6"><RefreshCw className="w-5 h-5 text-slate-500 animate-spin" /></div>;

  const allKeys = Object.keys(categories);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Sélectionnez les données à supprimer. Les comptes et paramètres sont conservés.</p>
        <button onClick={selectAll} className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors">
          {selected.size === allKeys.length ? 'Tout désélectionner' : 'Tout sélectionner'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {allKeys.map(key => {
          const cat = categories[key];
          const isSelected = selected.has(key);
          const IconComp = categoryIcons[key] || Database;
          return (
            <button
              key={key}
              onClick={() => toggleCategory(key)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-red-500/30 bg-red-500/10'
                  : 'border-white/5 bg-white/2 hover:border-white/10'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isSelected ? 'bg-red-500/20' : 'bg-white/5'
              }`}>
                <IconComp className="w-4 h-4" style={{ color: isSelected ? '#ef4444' : '#64748b' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${isSelected ? 'text-red-400' : 'text-slate-300'}`}>{cat.label}</p>
                <p className="text-[10px] text-slate-500">{cat.count} élément{cat.count !== 1 ? 's' : ''}</p>
              </div>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                isSelected ? 'border-red-500 bg-red-500' : 'border-white/20'
              }`}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          );
        })}
      </div>
      {selected.size > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-red-500/20 bg-red-500/5">
          <p className="text-sm font-semibold text-red-400">
            {selected.size} catégorie{selected.size > 1 ? 's' : ''} · {totalSelected} élément{totalSelected !== 1 ? 's' : ''}
          </p>
          <ActionButton variant="danger" size="sm" icon={Trash2} onClick={handlePurge} loading={purging}>
            Supprimer la sélection
          </ActionButton>
        </div>
      )}
      <ConfirmElement />
    </div>
  );
}
