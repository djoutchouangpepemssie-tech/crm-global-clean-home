import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import api from '../../lib/api';
import BACKEND_URL from '../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import {
  Package, Plus, Search, AlertTriangle, ArrowDown, ArrowUp, RotateCcw,
  Edit, Trash2, TrendingDown, TrendingUp, BarChart3
} from 'lucide-react';

const CATEGORIES = [
  { value: 'produit_nettoyage', label: '🧴 Produits nettoyage' },
  { value: 'materiel', label: '🧹 Matériel' },
  { value: 'consommable', label: '📦 Consommables' },
  { value: 'equipement', label: '⚙️ Équipement' },
  { value: 'protection', label: '🧤 Protection' },
  { value: 'autre', label: '📎 Autre' },
];

const UNITS = ['unité', 'litre', 'kg', 'mètre', 'rouleau', 'boîte', 'paire'];

export default function StockTable() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // Dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Forms
  const [newItem, setNewItem] = useState({
    name: '', sku: '', category: 'produit_nettoyage', unit: 'unité',
    quantity: 0, unit_price: 0, alert_threshold: 5, supplier: '', description: '',
  });
  const [moveForm, setMoveForm] = useState({
    movement_type: 'in', quantity: 1, reason: '', reference: '',
  });

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 50 };
      if (search) params.search = search;
      if (category) params.category = category;
      if (lowStockOnly) params.low_stock = true;
      const res = await axios.get(`${BACKEND_URL}/api/stock`, { params });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      console.error('Error loading stock:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, lowStockOnly]);

  const loadSummary = async () => {
    try {
      const [sumRes, alertsRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/stock/stats/summary`),
        axios.get(`${BACKEND_URL}/api/stock/alerts/low`),
      ]);
      setSummary(sumRes.data);
      setAlerts(alertsRes.data.items || []);
    } catch (e) {
      console.error('Error loading summary:', e);
    }
  };

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { loadSummary(); }, []);

  // Create item
  const handleCreate = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/stock`, newItem);
      setAddOpen(false);
      setNewItem({ name: '', sku: '', category: 'produit_nettoyage', unit: 'unité', quantity: 0, unit_price: 0, alert_threshold: 5, supplier: '', description: '' });
      loadItems();
      loadSummary();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  // Update item
  const handleUpdate = async () => {
    if (!selectedItem) return;
    try {
      await axios.patch(`${BACKEND_URL}/api/stock/${selectedItem.item_id}`, {
        name: selectedItem.name,
        category: selectedItem.category,
        unit: selectedItem.unit,
        unit_price: selectedItem.unit_price,
        alert_threshold: selectedItem.alert_threshold,
        supplier: selectedItem.supplier,
        description: selectedItem.description,
      });
      setEditOpen(false);
      loadItems();
      loadSummary();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  // Delete item
  const handleDelete = async (itemId) => {
    if (!window.confirm('Supprimer cet article ?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/stock/${itemId}`);
      loadItems();
      loadSummary();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  // Stock movement
  const handleMovement = async () => {
    if (!selectedItem) return;
    try {
      await axios.post(`${BACKEND_URL}/api/stock/movement`, {
        item_id: selectedItem.item_id,
        ...moveForm,
      });
      setMoveOpen(false);
      loadItems();
      loadSummary();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6 text-purple-600" /> Gestion des stocks
        </h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nouvel article</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Ajouter un article</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nom de l'article *" value={newItem.name} onChange={e => setNewItem(f => ({ ...f, name: e.target.value }))} />
              <Input placeholder="SKU (auto si vide)" value={newItem.sku} onChange={e => setNewItem(f => ({ ...f, sku: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Select value={newItem.category} onValueChange={v => setNewItem(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={newItem.unit} onValueChange={v => setNewItem(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Quantité</label>
                  <Input type="number" min="0" value={newItem.quantity} onChange={e => setNewItem(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Prix unitaire</label>
                  <Input type="number" min="0" step="0.01" value={newItem.unit_price} onChange={e => setNewItem(f => ({ ...f, unit_price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Seuil alerte</label>
                  <Input type="number" min="0" value={newItem.alert_threshold} onChange={e => setNewItem(f => ({ ...f, alert_threshold: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <Input placeholder="Fournisseur" value={newItem.supplier} onChange={e => setNewItem(f => ({ ...f, supplier: e.target.value }))} />
              <Textarea placeholder="Description" value={newItem.description} onChange={e => setNewItem(f => ({ ...f, description: e.target.value }))} rows={2} />
              <Button className="w-full" onClick={handleCreate}>Ajouter l'article</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{summary.total_items}</p>
            <p className="text-xs text-gray-500">Articles</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{summary.total_quantity}</p>
            <p className="text-xs text-gray-500">Quantité totale</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{summary.total_value?.toFixed(2)} €</p>
            <p className="text-xs text-gray-500">Valeur totale</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{summary.categories?.length || 0}</p>
            <p className="text-xs text-gray-500">Catégories</p>
          </CardContent></Card>
          <Card className={summary.low_stock_count > 0 ? 'border-red-300' : ''}>
            <CardContent className="pt-4 text-center">
              <p className={`text-2xl font-bold ${summary.low_stock_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {summary.low_stock_count}
              </p>
              <p className="text-xs text-gray-500">Stock bas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-semibold text-red-600">Articles en stock bas ({alerts.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {alerts.slice(0, 10).map(item => (
                <Badge key={item.item_id} variant="destructive">
                  {item.name}: {item.quantity} {item.unit} (seuil: {item.alert_threshold})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-10" placeholder="Rechercher..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={category} onValueChange={v => { setCategory(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant={lowStockOnly ? 'default' : 'outline'} size="sm" onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }}>
              <AlertTriangle className="h-4 w-4 mr-1" /> Stock bas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucun article trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-3">Article</th>
                    <th className="pb-3">SKU</th>
                    <th className="pb-3">Catégorie</th>
                    <th className="pb-3 text-right">Quantité</th>
                    <th className="pb-3 text-right">Prix unit.</th>
                    <th className="pb-3 text-right">Valeur</th>
                    <th className="pb-3">Fournisseur</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const isLow = item.quantity <= item.alert_threshold;
                    return (
                      <tr key={item.item_id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {isLow && <AlertTriangle className="h-4 w-4 text-red-500" />}
                            <span className="font-medium">{item.name}</span>
                          </div>
                          {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                        </td>
                        <td className="text-gray-500 font-mono text-xs">{item.sku}</td>
                        <td><Badge variant="outline">{CATEGORIES.find(c => c.value === item.category)?.label || item.category}</Badge></td>
                        <td className={`text-right font-medium ${isLow ? 'text-red-600' : ''}`}>
                          {item.quantity} {item.unit}
                        </td>
                        <td className="text-right">{item.unit_price?.toFixed(2)} €</td>
                        <td className="text-right font-medium">{item.total_value?.toFixed(2)} €</td>
                        <td className="text-gray-500">{item.supplier || '-'}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(item); setMoveForm({ movement_type: 'in', quantity: 1, reason: '', reference: '' }); setMoveOpen(true); }} title="Mouvement stock">
                              <ArrowDown className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(item); setEditOpen(true); }} title="Modifier">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(item.item_id)} title="Supprimer">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > 50 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
              <span className="text-sm text-gray-500 self-center">Page {page} / {Math.ceil(total / 50)}</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)}>Suivant</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier l'article</DialogTitle></DialogHeader>
          {selectedItem && (
            <div className="space-y-3">
              <Input value={selectedItem.name} onChange={e => setSelectedItem(s => ({ ...s, name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Select value={selectedItem.category} onValueChange={v => setSelectedItem(s => ({ ...s, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" step="0.01" value={selectedItem.unit_price} onChange={e => setSelectedItem(s => ({ ...s, unit_price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <Input placeholder="Fournisseur" value={selectedItem.supplier || ''} onChange={e => setSelectedItem(s => ({ ...s, supplier: e.target.value }))} />
              <Input type="number" placeholder="Seuil alerte" value={selectedItem.alert_threshold} onChange={e => setSelectedItem(s => ({ ...s, alert_threshold: parseFloat(e.target.value) || 0 }))} />
              <Button className="w-full" onClick={handleUpdate}>Enregistrer</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Movement Dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mouvement de stock — {selectedItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Stock actuel : <span className="font-bold">{selectedItem?.quantity} {selectedItem?.unit}</span></p>
            <Select value={moveForm.movement_type} onValueChange={v => setMoveForm(f => ({ ...f, movement_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in"><TrendingUp className="h-4 w-4 inline mr-1 text-green-600" />Entrée</SelectItem>
                <SelectItem value="out"><TrendingDown className="h-4 w-4 inline mr-1 text-red-600" />Sortie</SelectItem>
                <SelectItem value="adjustment"><RotateCcw className="h-4 w-4 inline mr-1 text-blue-600" />Ajustement (nouveau solde)</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <label className="text-xs text-gray-500">{moveForm.movement_type === 'adjustment' ? 'Nouveau solde' : 'Quantité'}</label>
              <Input type="number" min="0" step="0.5" value={moveForm.quantity} onChange={e => setMoveForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))} />
            </div>
            <Input placeholder="Raison / motif" value={moveForm.reason} onChange={e => setMoveForm(f => ({ ...f, reason: e.target.value }))} />
            <Input placeholder="Référence (devis, facture...)" value={moveForm.reference} onChange={e => setMoveForm(f => ({ ...f, reference: e.target.value }))} />
            <Button className="w-full" onClick={handleMovement}>
              {moveForm.movement_type === 'in' ? '📥 Enregistrer l\'entrée' :
               moveForm.movement_type === 'out' ? '📤 Enregistrer la sortie' : '🔄 Ajuster le stock'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
