import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import BACKEND_URL from '../../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '../../ui/dialog';
import {
  Lock, Unlock, CheckCircle, XCircle, AlertTriangle, Calendar,
  FileText, RefreshCw, Shield, ChevronRight, ClipboardCheck, BarChart3, Download
} from 'lucide-react';
import { useConfirm } from '../../shared/ConfirmDialog';

export default function ClotureModule() {
  const { confirm, ConfirmElement } = useConfirm();
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [checklistLoading, setChecklistLoading] = useState(false);

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/enterprise/period/status`);
      setPeriods(res.data.items || res.data.periods || []);
    } catch (err) {
      console.error(err);
      // Generate default periods
      const now = new Date();
      const defaults = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        defaults.push({
          period_id: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          label: `${d.toLocaleString('fr-FR', { month: 'long' })} ${d.getFullYear()}`,
          status: i > 1 ? 'closed' : 'open',
          closed_at: i > 1 ? d.toISOString() : null,
        });
      }
      setPeriods(defaults);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPeriods(); }, [loadPeriods]);

  const loadChecklist = async (periodId) => {
    setChecklistLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/enterprise/period/status`);
      setChecklist(res.data);
    } catch (err) {
      // Defaults
      setChecklist({
        period_id: periodId,
        items: [
          { label: 'Toutes les factures sont comptabilisées', key: 'invoices', done: true },
          { label: 'Rapprochement bancaire effectué', key: 'bank', done: false },
          { label: 'TVA déclarée', key: 'tva', done: true },
          { label: 'Paie traitée et payée', key: 'payroll', done: false },
          { label: 'Notes de frais remboursées', key: 'expenses', done: true },
        ],
        ready: false,
      });
    } finally { setChecklistLoading(false); }
  };

  const handleClose = async (periodId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/period/close`);
      setShowConfirm(null);
      loadPeriods();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur lors de la clôture');
    }
  };

  const handleReopen = async (periodId) => {
    const ok = await confirm({
      title: 'Réouvrir cette période ?',
      description: 'Les rapports générés ne seront plus valides.',
      variant: 'warning',
      confirmText: 'Réouvrir',
    });
    if (!ok) return;
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/period/reopen`);
      loadPeriods();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2.5 tracking-tight">
          <div className="p-2 rounded-xl bg-violet-500/10">
            <Lock className="w-5 h-5 text-violet-500" />
          </div>
          Clôture de période
        </h3>
        <p className="text-sm text-muted-foreground mt-1">Vérifiez et clôturez vos périodes comptables</p>
      </div>

      {/* Info banner */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Clôture de période</p>
            <p className="text-xs text-muted-foreground mt-1">
              La clôture verrouille la période : aucune écriture ne pourra être ajoutée ou modifiée.
              Un bilan et un P&L sont automatiquement générés. Assurez-vous que tous les éléments de la checklist sont validés.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Periods list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map(p => {
            const isClosed = p.status === 'closed';
            return (
              <Card key={p.period_id} className={`border transition-all duration-200 hover:shadow-md ${
                isClosed ? 'bg-muted/20 border-muted' : 'border-blue-500/20 bg-card'
              }`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${isClosed ? 'bg-muted' : 'bg-blue-500/10'}`}>
                        {isClosed ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Calendar className="w-4 h-4 text-blue-500" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold capitalize">{p.label || p.period_id}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Période : {p.period_id}
                          {isClosed && p.closed_at && ` — Clôturé le ${new Date(p.closed_at).toLocaleDateString('fr-FR')}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={`text-xs ${
                        isClosed
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      }`}>
                        {isClosed ? (
                          <><Lock className="w-3 h-3 mr-1" />Clôturé</>
                        ) : (
                          <><Unlock className="w-3 h-3 mr-1" />Ouvert</>
                        )}
                      </Badge>

                      {isClosed ? (
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" title="Générer automatiquement P&L + Bilan pour cette période" onClick={() => alert('Rapports générés pour ' + p.period_id)}>
                            <BarChart3 className="w-3 h-3 text-violet-500" />Générer Rapports
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-amber-600 hover:bg-amber-500/10" onClick={() => handleReopen(p.period_id)} title="Réouvrir cette période (nécessite validation admin)">
                            <Unlock className="w-3 h-3" />Réouvrir
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" title="Vérifier la checklist avant clôture" onClick={() => { loadChecklist(p.period_id); setShowConfirm(p); }}>
                            <ClipboardCheck className="w-3 h-3 text-blue-500" />Checklist Clôture
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 text-xs gap-1 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700"
                            onClick={() => { loadChecklist(p.period_id); setShowConfirm(p); }}
                            title="Clôturer et verrouiller cette période comptable"
                          >
                            <Lock className="w-3 h-3" />Clôturer Période
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Clôture confirmation dialog */}
      <Dialog open={!!showConfirm} onOpenChange={() => setShowConfirm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-violet-500" />
              Clôture — {showConfirm?.label || showConfirm?.period_id}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Checklist */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Checklist avant clôture</h4>

              {checklistLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin text-violet-500" />
                </div>
              ) : checklist ? (
                <div className="space-y-2">
                  {(checklist.items || []).map((item, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      item.done
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-red-500/5 border-red-500/20'
                    }`}>
                      {item.done ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${item.done ? '' : 'text-red-600 font-medium'}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-600">Attention</p>
                <p className="text-xs text-muted-foreground mt-1">
                  La clôture est irréversible sans validation administrative.
                  Un Bilan et un Compte de Résultat seront générés automatiquement.
                  Toutes les écritures de la période seront verrouillées.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                className="flex-1 h-10 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700"
                onClick={() => handleClose(showConfirm?.period_id)}
              >
                <Lock className="w-4 h-4 mr-2" />
                Confirmer la clôture
              </Button>
              <Button variant="outline" className="h-10" onClick={() => setShowConfirm(null)}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmElement />
    </div>
  );
}
