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
import { Shield, RefreshCw, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Eye, Lock } from 'lucide-react';

const ACTION_COLORS = {
  create: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  update: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  delete: 'bg-red-500/10 text-red-500 border-red-500/20',
  validate: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  reverse: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  lettrage: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  close_period: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  bank_match: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
};

export default function AuditTrail() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [showDetail, setShowDetail] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (entityFilter !== 'all') params.entity_type = entityFilter;
      if (actionFilter !== 'all') params.action = actionFilter;

      const [entriesRes, statsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/enterprise/audit-trail`, { params }),
        axios.get(`${BACKEND_URL}/api/enterprise/audit-trail/stats`),
      ]);
      setEntries(entriesRes.data.items || []);
      setTotal(entriesRes.data.total || 0);
      setPages(entriesRes.data.pages || 1);
      setStats(statsRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, entityFilter, actionFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const verifyEntry = async (auditId) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/enterprise/audit-trail/verify/${auditId}`);
      setVerifyResult(res.data);
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const entityTypes = [...new Set((stats?.stats || []).map(s => s.entity_type))];
  const actionTypes = [...new Set((stats?.stats || []).map(s => s.action))];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2.5 tracking-tight">
          <div className="p-2 rounded-xl bg-slate-500/10">
            <Shield className="w-5 h-5 text-slate-500" />
          </div>
          Journal d'Audit
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{total} entrée(s) — Logs immuables, chaînés cryptographiquement</p>
      </div>

      {/* Info banner */}
      <Card className="bg-slate-500/5 border-slate-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Piste d'audit immuable</p>
            <p className="text-xs text-muted-foreground mt-1">
              Chaque action est enregistrée avec un checksum cryptographique.
              Les logs ne peuvent être ni modifiés ni supprimés, garantissant la conformité réglementaire.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-violet-500/5 border-violet-500/20">
            <CardContent className="p-4 text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total entrées</div>
              <div className="text-2xl font-bold">{stats.total_entries}</div>
            </CardContent>
          </Card>
          {(stats.stats || []).slice(0, 3).map((s, i) => (
            <Card key={i} className="bg-muted/20">
              <CardContent className="p-4 text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 truncate">{s.entity_type} / {s.action}</div>
                <div className="text-2xl font-bold">{s.count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={entityFilter} onValueChange={v => { setEntityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48 h-10"><SelectValue placeholder="Type entité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes entités</SelectItem>
            {entityTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44 h-10"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes actions</SelectItem>
            {actionTypes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 rounded-full border-2 border-slate-500/20 border-t-slate-500 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Shield className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucune entrée d'audit</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-3 pl-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Horodatage</th>
                    <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Utilisateur</th>
                    <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                    <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Entité</th>
                    <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">ID Entité</th>
                    <th className="text-right p-3 pr-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Intégrité</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, idx) => (
                    <tr key={e.audit_id} className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="p-3 pl-5 text-sm text-muted-foreground tabular-nums">{e.timestamp?.replace('T', ' ').slice(0, 19)}</td>
                      <td className="p-3 text-sm">{e.user_id}</td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] ${ACTION_COLORS[e.action] || 'bg-muted'}`}>{e.action}</Badge>
                      </td>
                      <td className="p-3 text-sm">{e.entity_type}</td>
                      <td className="p-3 font-mono text-[10px] max-w-[150px] truncate text-muted-foreground">{e.entity_id}</td>
                      <td className="p-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => setShowDetail(e)} title="Détail">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => verifyEntry(e.audit_id)} title="Vérifier intégrité">
                            <Shield className="w-3.5 h-3.5 text-violet-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">Page {page}/{pages}</span>
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Detail */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-500" />Détail audit
            </DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'ID', value: showDetail.audit_id?.slice(-12) },
                  { label: 'Date', value: showDetail.timestamp?.replace('T', ' ').slice(0, 19) },
                  { label: 'Utilisateur', value: showDetail.user_id },
                  { label: 'Action', value: showDetail.action },
                  { label: 'Entité', value: showDetail.entity_type },
                  { label: 'ID Entité', value: showDetail.entity_id?.slice(-12) },
                ].map((f, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</p>
                    <p className="text-sm font-mono">{f.value}</p>
                  </div>
                ))}
              </div>
              {showDetail.before && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">État avant</p>
                  <pre className="p-3 rounded-xl bg-muted/30 overflow-auto text-[10px] font-mono max-h-[150px]">{JSON.stringify(showDetail.before, null, 2)}</pre>
                </div>
              )}
              {showDetail.after && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">État après</p>
                  <pre className="p-3 rounded-xl bg-muted/30 overflow-auto text-[10px] font-mono max-h-[150px]">{JSON.stringify(showDetail.after, null, 2)}</pre>
                </div>
              )}
              <div className="text-[10px] text-muted-foreground font-mono p-2 rounded-lg bg-muted/20 flex items-center gap-2">
                <Lock className="w-3 h-3" />
                Checksum: {showDetail.checksum?.slice(0, 40)}...
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verify Result */}
      <Dialog open={!!verifyResult} onOpenChange={() => setVerifyResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />Vérification d'intégrité
            </DialogTitle>
          </DialogHeader>
          {verifyResult && (
            <div className="text-center space-y-4 py-4">
              {verifyResult.is_valid ? (
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
              )}
              <p className={`text-lg font-bold ${verifyResult.is_valid ? 'text-emerald-500' : 'text-red-500'}`}>
                {verifyResult.message}
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Stocké: <span className="font-mono">{verifyResult.stored_checksum?.slice(0, 24)}...</span></div>
                <div>Calculé: <span className="font-mono">{verifyResult.computed_checksum?.slice(0, 24)}...</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
