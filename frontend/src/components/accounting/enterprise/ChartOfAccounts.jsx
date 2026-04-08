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
  Plus, Search, ClipboardList, ChevronDown, ChevronRight, RefreshCw,
  Hash, Layers, TrendingUp, TrendingDown, Eye, History, BarChart3, Download
} from 'lucide-react';

const CLASSES = [
  { value: 'all', label: 'Toutes classes', icon: '📋' },
  { value: '1', label: '1 — Capitaux', icon: '🏦' },
  { value: '2', label: '2 — Immobilisations', icon: '🏢' },
  { value: '3', label: '3 — Stocks', icon: '📦' },
  { value: '4', label: '4 — Tiers', icon: '👥' },
  { value: '5', label: '5 — Financiers', icon: '💰' },
  { value: '6', label: '6 — Charges', icon: '📉' },
  { value: '7', label: '7 — Produits', icon: '📈' },
];

const TYPES = [
  { value: 'actif', label: 'Actif' },
  { value: 'passif', label: 'Passif' },
  { value: 'charge', label: 'Charge' },
  { value: 'produit', label: 'Produit' },
];

const TYPE_COLORS = {
  actif: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  passif: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  charge: 'bg-red-500/10 text-red-500 border-red-500/20',
  produit: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

const CLASS_COLORS = {
  '1': 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
  '2': 'from-violet-500/10 to-violet-600/5 border-violet-500/20',
  '3': 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
  '4': 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20',
  '5': 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
  '6': 'from-red-500/10 to-red-600/5 border-red-500/20',
  '7': 'from-green-500/10 to-green-600/5 border-green-500/20',
};

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [byClass, setByClass] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState({});
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [form, setForm] = useState({ code: '', label: '', class_num: '6', type: 'charge', description: '' });

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (classFilter !== 'all') params.class_num = classFilter;
      const res = await axios.get(`${BACKEND_URL}/api/enterprise/chart-of-accounts`, { params });
      setAccounts(res.data.accounts || []);
      setByClass(res.data.by_class || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, classFilter]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const toggleClass = (cls) => {
    setExpandedClasses(prev => ({ ...prev, [cls]: !prev[cls] }));
  };

  const expandAll = () => {
    const all = {};
    byClass.forEach(c => { all[c.class_num] = true; });
    setExpandedClasses(all);
  };

  const collapseAll = () => setExpandedClasses({});

  const handleCreate = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/chart-of-accounts`, form);
      setShowCreate(false);
      setForm({ code: '', label: '', class_num: '6', type: 'charge', description: '' });
      loadAccounts();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erreur');
    }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  const totalAccounts = accounts.length;
  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2.5 tracking-tight">
            <div className="p-2 rounded-xl bg-violet-500/10">
              <ClipboardList className="w-5 h-5 text-violet-500" />
            </div>
            Plan Comptable Général
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{totalAccounts} compte(s) — PCG français</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 shadow-md shadow-violet-500/20">
              <Plus className="w-3.5 h-3.5" />Nouveau compte
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-violet-500" />
                Créer un compte comptable
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code (min 4 chiffres)</label>
                  <Input value={form.code} onChange={e => setForm(p => ({...p, code: e.target.value}))} placeholder="6250" className="h-10 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Classe</label>
                  <Select value={form.class_num} onValueChange={v => setForm(p => ({...p, class_num: v}))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLASSES.filter(c => c.value !== 'all').map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Libellé</label>
                <Input value={form.label} onChange={e => setForm(p => ({...p, label: e.target.value}))} placeholder="Nom du compte" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
                <Select value={form.type} onValueChange={v => setForm(p => ({...p, type: v}))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description (optionnel)</label>
                <Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className="h-10" />
              </div>
              <Button className="w-full h-10 bg-gradient-to-r from-violet-500 to-violet-600" onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />Créer le compte
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm bg-card/50 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-10 h-10" placeholder="Rechercher un compte (code ou libellé)..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-52 h-10"><Layers className="w-3.5 h-3.5 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLASSES.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={expandAll}>Tout ouvrir</Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={collapseAll}>Tout fermer</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classes accordion */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {byClass.map(cls => (
            <Card key={cls.class_num} className={`bg-gradient-to-br ${CLASS_COLORS[cls.class_num] || ''} border overflow-hidden transition-all duration-300`}>
              <div
                className="p-4 cursor-pointer hover:bg-muted/10 transition-colors"
                onClick={() => toggleClass(cls.class_num)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="transition-transform duration-200" style={{ transform: expandedClasses[cls.class_num] ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                    <span className="text-2xl">{CLASSES.find(c => c.value === cls.class_num)?.icon || '📋'}</span>
                    <div>
                      <span className="font-semibold text-sm">Classe {cls.class_num} — {cls.class_label}</span>
                      <p className="text-[11px] text-muted-foreground">{cls.accounts.length} compte(s)</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs tabular-nums">{cls.accounts.length}</Badge>
                </div>
              </div>

              {expandedClasses[cls.class_num] && (
                <div className="border-t">
                  <table className="w-full">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left p-3 pl-14 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Code</th>
                        <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Libellé</th>
                        <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                        <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Solde</th>
                        <th className="text-right p-3 pr-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cls.accounts.map((a, idx) => (
                        <tr key={a.code} className={`border-t border-border/50 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/5'}`}>
                          <td className="p-3 pl-14 font-mono font-semibold text-sm text-blue-600">{a.code}</td>
                          <td className="p-3 text-sm">{a.label}</td>
                          <td className="p-3 text-center">
                            <Badge className={`text-[10px] ${TYPE_COLORS[a.type] || 'bg-muted'}`}>{a.type}</Badge>
                          </td>
                          <td className={`p-3 text-right font-mono text-sm tabular-nums font-medium ${
                            (a.balance || 0) > 0 ? 'text-emerald-500' : (a.balance || 0) < 0 ? 'text-red-500' : 'text-muted-foreground'
                          }`}>
                            {fmt(a.balance)}
                          </td>
                          <td className="p-3 pr-5 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" title="Voir le solde détaillé du compte" onClick={() => alert(`Solde ${a.code}: ${fmt(a.balance)}`)}>
                                <BarChart3 className="w-3 h-3 text-violet-500" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" title="Voir l'historique des mouvements" onClick={() => alert(`Mouvements du compte ${a.code}`)}>
                                <History className="w-3 h-3 text-blue-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
