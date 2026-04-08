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
  Plus, Search, ClipboardList, ChevronDown, ChevronRight, RefreshCw
} from 'lucide-react';

const CLASSES = [
  { value: 'all', label: 'Toutes classes' },
  { value: '1', label: '1 - Capitaux' },
  { value: '2', label: '2 - Immobilisations' },
  { value: '3', label: '3 - Stocks' },
  { value: '4', label: '4 - Tiers' },
  { value: '5', label: '5 - Financiers' },
  { value: '6', label: '6 - Charges' },
  { value: '7', label: '7 - Produits' },
];

const TYPES = [
  { value: 'actif', label: 'Actif' },
  { value: 'passif', label: 'Passif' },
  { value: 'charge', label: 'Charge' },
  { value: 'produit', label: 'Produit' },
];

const TYPE_COLORS = {
  actif: 'bg-blue-500/10 text-blue-500',
  passif: 'bg-purple-500/10 text-purple-500',
  charge: 'bg-red-500/10 text-red-500',
  produit: 'bg-emerald-500/10 text-emerald-500',
};

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [byClass, setByClass] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState({});
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-violet-500" />
            Plan Comptable Général
          </h3>
          <p className="text-xs text-muted-foreground">{accounts.length} compte(s)</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="w-3 h-3" />Nouveau compte</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau compte comptable</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Code (min 4 chiffres)</label>
                  <Input value={form.code} onChange={e => setForm(p => ({...p, code: e.target.value}))} placeholder="6250" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Classe</label>
                  <Select value={form.class_num} onValueChange={v => setForm(p => ({...p, class_num: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLASSES.filter(c => c.value !== 'all').map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Libellé</label>
                <Input value={form.label} onChange={e => setForm(p => ({...p, label: e.target.value}))} placeholder="Nom du compte" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Type</label>
                <Select value={form.type} onValueChange={v => setForm(p => ({...p, type: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Description (optionnel)</label>
                <Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
              </div>
              <Button className="w-full" onClick={handleCreate}>Créer le compte</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8 h-9 text-sm" placeholder="Rechercher un compte..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CLASSES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-violet-500" /></div>
      ) : (
        <div className="space-y-2">
          {byClass.map(cls => (
            <Card key={cls.class_num}>
              <CardHeader className="p-3 cursor-pointer" onClick={() => toggleClass(cls.class_num)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {expandedClasses[cls.class_num] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="font-semibold text-sm">Classe {cls.class_num} — {cls.class_label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{cls.accounts.length} comptes</Badge>
                </div>
              </CardHeader>
              {expandedClasses[cls.class_num] && (
                <CardContent className="p-0">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left p-2 pl-4">Code</th>
                        <th className="text-left p-2">Libellé</th>
                        <th className="text-center p-2">Type</th>
                        <th className="text-right p-2 pr-4">Solde</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cls.accounts.map(a => (
                        <tr key={a.code} className="border-t hover:bg-muted/10">
                          <td className="p-2 pl-4 font-mono font-medium">{a.code}</td>
                          <td className="p-2">{a.label}</td>
                          <td className="p-2 text-center"><Badge className={`text-[10px] ${TYPE_COLORS[a.type] || ''}`}>{a.type}</Badge></td>
                          <td className="p-2 pr-4 text-right font-mono">{fmt(a.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
