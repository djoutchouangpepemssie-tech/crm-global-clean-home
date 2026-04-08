import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import BACKEND_URL from '../../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Textarea } from '../../ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '../../ui/dialog';
import {
  Plus, Search, Filter, CheckCircle, RotateCcw, Trash2, ChevronLeft,
  ChevronRight, BookOpen, RefreshCw, Eye
} from 'lucide-react';

const JOURNAL_TYPES = [
  { value: 'ACH', label: 'Achats' },
  { value: 'VTE', label: 'Ventes' },
  { value: 'BQ', label: 'Banque' },
  { value: 'OD', label: 'Opérations diverses' },
  { value: 'AN', label: 'À nouveau' },
  { value: 'PAI', label: 'Paie' },
];

const STATUS_COLORS = {
  draft: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  validated: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

export default function JournalEntries() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [journalFilter, setJournalFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [accounts, setAccounts] = useState([]);

  // Form state
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    journal_type: 'OD',
    description: '',
    reference: '',
    lines: [
      { account_code: '', label: '', debit: 0, credit: 0 },
      { account_code: '', label: '', debit: 0, credit: 0 },
    ],
  });

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (journalFilter !== 'all') params.journal_type = journalFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const res = await axios.get(`${BACKEND_URL}/api/enterprise/journal/entries`, { params });
      setEntries(res.data.entries || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, journalFilter, statusFilter]);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/enterprise/chart-of-accounts`);
      setAccounts(res.data.accounts || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);
  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const addLine = () => {
    setForm(prev => ({
      ...prev,
      lines: [...prev.lines, { account_code: '', label: '', debit: 0, credit: 0 }],
    }));
  };

  const removeLine = (idx) => {
    if (form.lines.length <= 2) return;
    setForm(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx),
    }));
  };

  const updateLine = (idx, field, value) => {
    setForm(prev => ({
      ...prev,
      lines: prev.lines.map((l, i) => i === idx ? { ...l, [field]: field === 'debit' || field === 'credit' ? parseFloat(value) || 0 : value } : l),
    }));
  };

  const totalDebit = form.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleCreate = async () => {
    if (!isBalanced) return alert("L'écriture doit être équilibrée (débit = crédit)");
    if (!form.description) return alert('Description requise');
    
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/journal/entries`, form);
      setShowCreate(false);
      setForm({
        entry_date: new Date().toISOString().slice(0, 10),
        journal_type: 'OD',
        description: '',
        reference: '',
        lines: [
          { account_code: '', label: '', debit: 0, credit: 0 },
          { account_code: '', label: '', debit: 0, credit: 0 },
        ],
      });
      loadEntries();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  const handleValidate = async (entryId) => {
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/journal/entries/${entryId}/validate`);
      loadEntries();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleReverse = async (entryId) => {
    if (!window.confirm('Contrepasser cette écriture ?')) return;
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/journal/entries/${entryId}/reverse`);
      loadEntries();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Supprimer ce brouillon ?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/enterprise/journal/entries/${entryId}`);
      loadEntries();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-500" />
            Journal comptable
          </h3>
          <p className="text-xs text-muted-foreground">{total} écriture(s)</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="w-3 h-3" />Nouvelle écriture</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle écriture comptable</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Date</label>
                  <Input type="date" value={form.entry_date} onChange={e => setForm(p => ({...p, entry_date: e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Journal</label>
                  <Select value={form.journal_type} onValueChange={v => setForm(p => ({...p, journal_type: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {JOURNAL_TYPES.map(j => <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Référence</label>
                  <Input value={form.reference} onChange={e => setForm(p => ({...p, reference: e.target.value}))} placeholder="REF-001" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Description</label>
                  <Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Libellé" />
                </div>
              </div>

              {/* Lines */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Lignes d'écriture</label>
                  <Button size="sm" variant="outline" onClick={addLine} className="text-xs gap-1">
                    <Plus className="w-3 h-3" />Ligne
                  </Button>
                </div>
                
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2">Compte</th>
                        <th className="text-left p-2">Libellé</th>
                        <th className="text-right p-2">Débit</th>
                        <th className="text-right p-2">Crédit</th>
                        <th className="p-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.lines.map((line, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-1">
                            <Select value={line.account_code} onValueChange={v => updateLine(i, 'account_code', v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Compte" /></SelectTrigger>
                              <SelectContent>
                                {accounts.map(a => (
                                  <SelectItem key={a.code} value={a.code} className="text-xs">
                                    {a.code} - {a.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-1">
                            <Input className="h-8 text-xs" value={line.label} onChange={e => updateLine(i, 'label', e.target.value)} placeholder="Libellé" />
                          </td>
                          <td className="p-1">
                            <Input className="h-8 text-xs text-right" type="number" step="0.01" value={line.debit || ''} onChange={e => updateLine(i, 'debit', e.target.value)} placeholder="0.00" />
                          </td>
                          <td className="p-1">
                            <Input className="h-8 text-xs text-right" type="number" step="0.01" value={line.credit || ''} onChange={e => updateLine(i, 'credit', e.target.value)} placeholder="0.00" />
                          </td>
                          <td className="p-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeLine(i)} disabled={form.lines.length <= 2}>
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 font-medium">
                      <tr>
                        <td colSpan={2} className="p-2 text-right">TOTAUX</td>
                        <td className="p-2 text-right">{fmt(totalDebit)}</td>
                        <td className="p-2 text-right">{fmt(totalCredit)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Balance indicator */}
                <div className={`text-xs px-3 py-2 rounded-lg ${isBalanced ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {isBalanced ? '✅ Écriture équilibrée' : `⚠️ Écart: ${fmt(Math.abs(totalDebit - totalCredit))}`}
                </div>
              </div>

              <Button className="w-full" onClick={handleCreate} disabled={!isBalanced || !form.description}>
                Créer l'écriture
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8 h-9 text-sm" placeholder="Rechercher..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={journalFilter} onValueChange={v => { setJournalFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous journaux</SelectItem>
            {JOURNAL_TYPES.map(j => <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="validated">Validé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 animate-spin text-violet-500" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Aucune écriture trouvée</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Journal</th>
                    <th className="text-left p-3">Description</th>
                    <th className="text-right p-3">Débit</th>
                    <th className="text-right p-3">Crédit</th>
                    <th className="text-center p-3">Statut</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.entry_id} className="border-t hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-mono text-[10px]">{e.entry_id}</td>
                      <td className="p-3">{e.entry_date}</td>
                      <td className="p-3"><Badge variant="outline" className="text-[10px]">{e.journal_type}</Badge></td>
                      <td className="p-3 max-w-[200px] truncate">{e.description}</td>
                      <td className="p-3 text-right font-mono">{fmt(e.total_debit)}</td>
                      <td className="p-3 text-right font-mono">{fmt(e.total_credit)}</td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] ${STATUS_COLORS[e.status] || ''}`}>{e.status === 'validated' ? 'Validé' : 'Brouillon'}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowDetail(e)} title="Détail">
                            <Eye className="w-3 h-3" />
                          </Button>
                          {e.status === 'draft' && (
                            <>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleValidate(e.entry_id)} title="Valider">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(e.entry_id)} title="Supprimer">
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </Button>
                            </>
                          )}
                          {e.status === 'validated' && !e.is_reversed && (
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleReverse(e.entry_id)} title="Contrepasser">
                              <RotateCcw className="w-3 h-3 text-amber-500" />
                            </Button>
                          )}
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
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground">Page {page}/{pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Écriture {showDetail?.entry_id}</DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Date:</span> {showDetail.entry_date}</div>
                <div><span className="text-muted-foreground">Journal:</span> {showDetail.journal_label}</div>
                <div><span className="text-muted-foreground">Référence:</span> {showDetail.reference || '—'}</div>
                <div><span className="text-muted-foreground">Statut:</span> <Badge className={STATUS_COLORS[showDetail.status]}>{showDetail.status}</Badge></div>
              </div>
              <div className="text-sm"><span className="text-muted-foreground">Description:</span> {showDetail.description}</div>
              
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Compte</th>
                      <th className="text-left p-2">Libellé</th>
                      <th className="text-right p-2">Débit</th>
                      <th className="text-right p-2">Crédit</th>
                      <th className="text-center p-2">Lettrage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showDetail.lines || []).map((l, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 font-mono">{l.account_code}</td>
                        <td className="p-2">{l.label}</td>
                        <td className="p-2 text-right font-mono">{l.debit > 0 ? fmt(l.debit) : ''}</td>
                        <td className="p-2 text-right font-mono">{l.credit > 0 ? fmt(l.credit) : ''}</td>
                        <td className="p-2 text-center">{l.lettering_code || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 font-medium">
                    <tr>
                      <td colSpan={2} className="p-2 text-right">TOTAUX</td>
                      <td className="p-2 text-right">{fmt(showDetail.total_debit)}</td>
                      <td className="p-2 text-right">{fmt(showDetail.total_credit)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
