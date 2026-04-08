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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '../../ui/dialog';
import {
  Plus, Search, CheckCircle, RotateCcw, Trash2, ChevronLeft,
  ChevronRight, BookOpen, RefreshCw, Eye, Download, FileSpreadsheet,
  FileText, ArrowUpDown, Filter, Link2, Unlink
} from 'lucide-react';

const JOURNAL_TYPES = [
  { value: 'ACH', label: 'Achats', color: 'bg-amber-500/10 text-amber-600' },
  { value: 'VTE', label: 'Ventes', color: 'bg-emerald-500/10 text-emerald-600' },
  { value: 'BQ', label: 'Banque', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'OD', label: 'Opérations diverses', color: 'bg-violet-500/10 text-violet-600' },
  { value: 'AN', label: 'À nouveau', color: 'bg-cyan-500/10 text-cyan-600' },
  { value: 'PAI', label: 'Paie', color: 'bg-pink-500/10 text-pink-600' },
];

const STATUS_MAP = {
  draft: { label: 'Brouillon', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  validated: { label: 'Validé', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  reversed: { label: 'Contrepassé', class: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

const PAGE_SIZES = [20, 50, 100];

export default function JournalEntries() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [journalFilter, setJournalFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('entry_date');
  const [sortDir, setSortDir] = useState('desc');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [accounts, setAccounts] = useState([]);

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

  const [accountSearch, setAccountSearch] = useState('');

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (search) params.search = search;
      if (journalFilter !== 'all') params.journal_type = journalFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await axios.get(`${BACKEND_URL}/api/enterprise/journal/entries`, { params });
      setEntries(res.data.entries || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, journalFilter, statusFilter, dateFrom, dateTo]);

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

  const filteredAccounts = accounts.filter(a =>
    !accountSearch || a.code.includes(accountSearch) || a.label.toLowerCase().includes(accountSearch.toLowerCase())
  );

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
      lines: prev.lines.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, [field]: field === 'debit' || field === 'credit' ? parseFloat(value) || 0 : value };
        // Auto-clear opposite field
        if (field === 'debit' && updated.debit > 0) updated.credit = 0;
        if (field === 'credit' && updated.credit > 0) updated.debit = 0;
        return updated;
      }),
    }));
  };

  const totalDebit = form.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

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
    if (!window.confirm('Contrepasser cette écriture ? Cette action est irréversible.')) return;
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/journal/entries/${entryId}/reverse`);
      loadEntries();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Supprimer ce brouillon définitivement ?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/enterprise/journal/entries/${entryId}`);
      loadEntries();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const exportData = (format) => {
    // Trigger download
    const params = new URLSearchParams();
    if (journalFilter !== 'all') params.append('journal_type', journalFilter);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    window.open(`${BACKEND_URL}/api/enterprise/export/journal?format=${format}&${params.toString()}`);
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  const getJournalColor = (type) => {
    const j = JOURNAL_TYPES.find(jt => jt.value === type);
    return j?.color || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2.5 tracking-tight">
            <div className="p-2 rounded-xl bg-blue-500/10">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
            Journal comptable
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{total} écriture(s) au total</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export buttons */}
          <div className="flex items-center gap-1 mr-2">
            <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => exportData('csv')}>
              <FileSpreadsheet className="w-3 h-3" />CSV
            </Button>
            <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => exportData('pdf')}>
              <FileText className="w-3 h-3" />PDF
            </Button>
            <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => exportData('excel')}>
              <Download className="w-3 h-3" />Excel
            </Button>
          </div>

          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-500/20">
                <Plus className="w-3.5 h-3.5" />
                Nouvelle écriture
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  Saisie d'écriture comptable
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                {/* Header fields */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</label>
                    <Input type="date" value={form.entry_date} onChange={e => setForm(p => ({...p, entry_date: e.target.value}))} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Journal</label>
                    <Select value={form.journal_type} onValueChange={v => setForm(p => ({...p, journal_type: v}))}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {JOURNAL_TYPES.map(j => <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Référence</label>
                    <Input value={form.reference} onChange={e => setForm(p => ({...p, reference: e.target.value}))} placeholder="REF-001" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Libellé *</label>
                    <Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Description de l'écriture" className="h-10" />
                  </div>
                </div>

                {/* Lines */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lignes d'écriture</label>
                    <Button size="sm" variant="outline" onClick={addLine} className="text-xs gap-1 h-7">
                      <Plus className="w-3 h-3" />Ajouter ligne
                    </Button>
                  </div>

                  <div className="rounded-xl border overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Compte</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Libellé</th>
                          <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Débit (€)</th>
                          <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Crédit (€)</th>
                          <th className="p-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.lines.map((line, i) => (
                          <tr key={i} className="border-t hover:bg-muted/20 transition-colors">
                            <td className="p-2">
                              <Select value={line.account_code} onValueChange={v => updateLine(i, 'account_code', v)}>
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="Sélectionner..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  <div className="p-2 sticky top-0 bg-popover">
                                    <Input
                                      placeholder="Rechercher un compte..."
                                      value={accountSearch}
                                      onChange={e => setAccountSearch(e.target.value)}
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                  {filteredAccounts.map(a => (
                                    <SelectItem key={a.code} value={a.code} className="text-xs">
                                      <span className="font-mono font-medium">{a.code}</span> — {a.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Input className="h-9 text-xs" value={line.label} onChange={e => updateLine(i, 'label', e.target.value)} placeholder="Libellé ligne" />
                            </td>
                            <td className="p-2">
                              <Input
                                className="h-9 text-xs text-right font-mono tabular-nums"
                                type="number"
                                step="0.01"
                                value={line.debit || ''}
                                onChange={e => updateLine(i, 'debit', e.target.value)}
                                placeholder="0,00"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                className="h-9 text-xs text-right font-mono tabular-nums"
                                type="number"
                                step="0.01"
                                value={line.credit || ''}
                                onChange={e => updateLine(i, 'credit', e.target.value)}
                                placeholder="0,00"
                              />
                            </td>
                            <td className="p-2">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeLine(i)} disabled={form.lines.length <= 2}>
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/30 font-semibold">
                        <tr>
                          <td colSpan={2} className="p-3 text-right text-xs uppercase tracking-wider text-muted-foreground">Totaux</td>
                          <td className="p-3 text-right font-mono text-sm">{fmt(totalDebit)}</td>
                          <td className="p-3 text-right font-mono text-sm">{fmt(totalCredit)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Balance indicator */}
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isBalanced
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : totalDebit === 0 && totalCredit === 0
                        ? 'bg-muted/30 text-muted-foreground border border-transparent'
                        : 'bg-red-500/10 text-red-600 border border-red-500/20'
                  }`}>
                    {isBalanced ? (
                      <><CheckCircle className="w-4 h-4" /> Écriture équilibrée — Prête à enregistrer</>
                    ) : totalDebit === 0 && totalCredit === 0 ? (
                      <>Saisissez les montants des lignes</>
                    ) : (
                      <><AlertTriangle className="w-4 h-4" /> Écart de {fmt(Math.abs(totalDebit - totalCredit))} — L'écriture doit être équilibrée</>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 h-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700" onClick={handleCreate} disabled={!isBalanced || !form.description}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Enregistrer l'écriture
                  </Button>
                  <Button variant="outline" className="h-10" onClick={() => setShowCreate(false)}>Annuler</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Filters ── */}
      <Card className="border-0 shadow-sm bg-card/50 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-10 h-10"
                placeholder="Rechercher par libellé, référence, compte..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={journalFilter} onValueChange={v => { setJournalFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40 h-10"><Filter className="w-3.5 h-3.5 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous journaux</SelectItem>
                {JOURNAL_TYPES.map(j => <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="validated">Validé</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" className="w-36 h-10" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} placeholder="Du" />
            <Input type="date" className="w-36 h-10" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} placeholder="Au" />
          </div>
        </CardContent>
      </Card>

      {/* ── Table ── */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
              <p className="text-sm text-muted-foreground">Chargement des écritures...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <BookOpen className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucune écriture trouvée</p>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
                <Plus className="w-3 h-3 mr-1" />Créer une écriture
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="text-left p-3 pl-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">N°</th>
                    <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => { setSortBy('entry_date'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }}>
                      <span className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Journal</th>
                    <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Débit</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Crédit</th>
                    <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                    <th className="text-right p-3 pr-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, idx) => (
                    <tr key={e.entry_id} className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'}`}>
                      <td className="p-3 pl-5 font-mono text-[11px] text-muted-foreground">{e.entry_id?.slice(-8)}</td>
                      <td className="p-3 text-sm">{e.entry_date}</td>
                      <td className="p-3">
                        <Badge className={`text-[10px] font-medium ${getJournalColor(e.journal_type)}`}>
                          {e.journal_type}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm max-w-[250px] truncate">{e.description}</td>
                      <td className="p-3 text-right font-mono text-sm tabular-nums">{fmt(e.total_debit)}</td>
                      <td className="p-3 text-right font-mono text-sm tabular-nums">{fmt(e.total_credit)}</td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] ${STATUS_MAP[e.status]?.class || ''}`}>
                          {STATUS_MAP[e.status]?.label || e.status}
                        </Badge>
                      </td>
                      <td className="p-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => setShowDetail(e)} title="Voir détail">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {e.status === 'draft' && (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => handleValidate(e.entry_id)} title="Valider">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => handleDelete(e.entry_id)} title="Supprimer">
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            </>
                          )}
                          {e.status === 'validated' && !e.is_reversed && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => handleReverse(e.entry_id)} title="Contrepasser">
                              <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
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

      {/* ── Pagination ── */}
      {pages > 0 && entries.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Lignes par page :</span>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(parseInt(v)); setPage(1); }}>
              <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} sur {total}
            </span>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Detail Dialog ── */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              Écriture {showDetail?.entry_id?.slice(-8)}
              <Badge className={`ml-2 ${STATUS_MAP[showDetail?.status]?.class || ''}`}>
                {STATUS_MAP[showDetail?.status]?.label || showDetail?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Date', value: showDetail.entry_date },
                  { label: 'Journal', value: showDetail.journal_label || showDetail.journal_type },
                  { label: 'Référence', value: showDetail.reference || '—' },
                  { label: 'Description', value: showDetail.description },
                ].map((f, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{f.label}</p>
                    <p className="text-sm">{f.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Compte</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Libellé</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Débit</th>
                      <th className="text-right p-3 text-xs font-semibold text-muted-foreground">Crédit</th>
                      <th className="text-center p-3 text-xs font-semibold text-muted-foreground">Lettrage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showDetail.lines || []).map((l, i) => (
                      <tr key={i} className="border-t hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-mono font-medium text-blue-600">{l.account_code}</td>
                        <td className="p-3">{l.label}</td>
                        <td className="p-3 text-right font-mono tabular-nums">{l.debit > 0 ? fmt(l.debit) : ''}</td>
                        <td className="p-3 text-right font-mono tabular-nums">{l.credit > 0 ? fmt(l.credit) : ''}</td>
                        <td className="p-3 text-center">
                          {l.lettering_code ? (
                            <Badge variant="outline" className="text-[10px] bg-cyan-500/10 text-cyan-600 border-cyan-500/20">
                              <Link2 className="w-2.5 h-2.5 mr-1" />{l.lettering_code}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 font-semibold">
                    <tr>
                      <td colSpan={2} className="p-3 text-right text-xs uppercase tracking-wider text-muted-foreground">Totaux</td>
                      <td className="p-3 text-right font-mono">{fmt(showDetail.total_debit)}</td>
                      <td className="p-3 text-right font-mono">{fmt(showDetail.total_credit)}</td>
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
