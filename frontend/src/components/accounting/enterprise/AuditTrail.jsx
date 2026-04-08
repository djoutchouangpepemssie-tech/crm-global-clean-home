import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import BACKEND_URL from '../../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '../../ui/dialog';
import { Shield, Search, RefreshCw, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Eye } from 'lucide-react';

const ACTION_COLORS = {
  create: 'bg-emerald-500/10 text-emerald-500',
  update: 'bg-blue-500/10 text-blue-500',
  delete: 'bg-red-500/10 text-red-500',
  validate: 'bg-violet-500/10 text-violet-500',
  reverse: 'bg-amber-500/10 text-amber-500',
  lettrage: 'bg-cyan-500/10 text-cyan-500',
  close_period: 'bg-purple-500/10 text-purple-500',
  bank_match: 'bg-blue-500/10 text-blue-500',
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-500" />
            Journal d'Audit
          </h3>
          <p className="text-xs text-muted-foreground">{total} entrée(s) — Logs immuables, non modifiables</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-violet-500/5 border-violet-500/20">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground">Total entrées</div>
              <div className="text-xl font-bold">{stats.total_entries}</div>
            </CardContent>
          </Card>
          {(stats.stats || []).slice(0, 3).map((s, i) => (
            <Card key={i} className="bg-muted/20">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-muted-foreground">{s.entity_type} / {s.action}</div>
                <div className="text-xl font-bold">{s.count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={entityFilter} onValueChange={v => { setEntityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Type entité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes entités</SelectItem>
            {entityTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes actions</SelectItem>
            {actionTypes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin" /></div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Aucune entrée d'audit</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Horodatage</th>
                    <th className="text-left p-3">Utilisateur</th>
                    <th className="text-center p-3">Action</th>
                    <th className="text-left p-3">Entité</th>
                    <th className="text-left p-3">ID Entité</th>
                    <th className="text-right p-3">Intégrité</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.audit_id} className="border-t hover:bg-muted/20">
                      <td className="p-3 text-muted-foreground">{e.timestamp?.replace('T', ' ').slice(0, 19)}</td>
                      <td className="p-3">{e.user_id}</td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] ${ACTION_COLORS[e.action] || 'bg-muted'}`}>{e.action}</Badge>
                      </td>
                      <td className="p-3">{e.entity_type}</td>
                      <td className="p-3 font-mono text-[10px] max-w-[150px] truncate">{e.entity_id}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowDetail(e)} title="Détail">
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => verifyEntry(e.audit_id)} title="Vérifier intégrité">
                            <Shield className="w-3 h-3 text-violet-500" />
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

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-xs text-muted-foreground">Page {page}/{pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Détail audit</DialogTitle></DialogHeader>
          {showDetail && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">ID:</span> <span className="font-mono">{showDetail.audit_id}</span></div>
                <div><span className="text-muted-foreground">Date:</span> {showDetail.timestamp}</div>
                <div><span className="text-muted-foreground">Utilisateur:</span> {showDetail.user_id}</div>
                <div><span className="text-muted-foreground">Action:</span> <Badge className={ACTION_COLORS[showDetail.action]}>{showDetail.action}</Badge></div>
                <div><span className="text-muted-foreground">Entité:</span> {showDetail.entity_type}</div>
                <div><span className="text-muted-foreground">ID Entité:</span> <span className="font-mono">{showDetail.entity_id}</span></div>
              </div>
              {showDetail.before && (
                <div>
                  <span className="text-muted-foreground font-medium">Avant:</span>
                  <pre className="mt-1 p-2 rounded bg-muted/30 overflow-auto text-[10px]">{JSON.stringify(showDetail.before, null, 2)}</pre>
                </div>
              )}
              {showDetail.after && (
                <div>
                  <span className="text-muted-foreground font-medium">Après:</span>
                  <pre className="mt-1 p-2 rounded bg-muted/30 overflow-auto text-[10px]">{JSON.stringify(showDetail.after, null, 2)}</pre>
                </div>
              )}
              <div className="text-[10px] text-muted-foreground font-mono">
                Checksum: {showDetail.checksum}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verify Result */}
      <Dialog open={!!verifyResult} onOpenChange={() => setVerifyResult(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vérification d'intégrité</DialogTitle></DialogHeader>
          {verifyResult && (
            <div className="text-center space-y-3">
              {verifyResult.is_valid ? (
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
              ) : (
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
              )}
              <p className="text-lg font-bold">{verifyResult.message}</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Checksum stocké: <span className="font-mono">{verifyResult.stored_checksum?.slice(0, 20)}...</span></div>
                <div>Checksum calculé: <span className="font-mono">{verifyResult.computed_checksum?.slice(0, 20)}...</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
