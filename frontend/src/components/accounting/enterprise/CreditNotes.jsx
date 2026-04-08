import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import BACKEND_URL from '../../../config';
import { Card, CardContent } from '../../ui/card';
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
import { Plus, Banknote, CheckCircle, RefreshCw, Trash2 } from 'lucide-react';

export default function CreditNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    invoice_id: '', reason: '', tva_rate: 'exonere',
    lines: [{ description: '', amount_ht: 0 }],
  });

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/enterprise/credit-notes`);
      setNotes(res.data.items || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const addLine = () => setForm(p => ({ ...p, lines: [...p.lines, { description: '', amount_ht: 0 }] }));
  const updateLine = (i, field, val) => setForm(p => ({
    ...p, lines: p.lines.map((l, idx) => idx === i ? { ...l, [field]: field === 'amount_ht' ? parseFloat(val) || 0 : val } : l)
  }));

  const handleCreate = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/credit-notes`, form);
      setShowCreate(false);
      loadNotes();
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const handleValidate = async (id) => {
    try {
      await axios.post(`${BACKEND_URL}/api/enterprise/credit-notes/${id}/validate`);
      loadNotes();
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Banknote className="w-5 h-5 text-violet-500" />
          Avoirs
        </h3>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="w-3 h-3" />Nouvel avoir</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer un avoir</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">ID Facture liée</label>
                <Input value={form.invoice_id} onChange={e => setForm(p => ({...p, invoice_id: e.target.value}))} placeholder="INV-2026-0001" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Raison</label>
                <Textarea value={form.reason} onChange={e => setForm(p => ({...p, reason: e.target.value}))} placeholder="Erreur de facturation" rows={2} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Taux TVA</label>
                <Select value={form.tva_rate} onValueChange={v => setForm(p => ({...p, tva_rate: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exonere">Exonéré (0%)</SelectItem>
                    <SelectItem value="reduit">Réduit (5.5%)</SelectItem>
                    <SelectItem value="intermediaire">Intermédiaire (10%)</SelectItem>
                    <SelectItem value="standard">Standard (20%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Lignes</label>
                  <Button size="sm" variant="outline" onClick={addLine} className="text-xs gap-1"><Plus className="w-3 h-3" />Ligne</Button>
                </div>
                {form.lines.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <Input className="h-8 text-xs flex-1" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description" />
                    <Input className="h-8 text-xs w-28" type="number" step="0.01" value={l.amount_ht} onChange={e => updateLine(i, 'amount_ht', e.target.value)} placeholder="HT" />
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={handleCreate}>Créer l'avoir</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin" /></div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Aucun avoir</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">N°</th>
                    <th className="text-left p-3">Facture liée</th>
                    <th className="text-left p-3">Raison</th>
                    <th className="text-right p-3">HT</th>
                    <th className="text-right p-3">TVA</th>
                    <th className="text-right p-3">TTC</th>
                    <th className="text-center p-3">Statut</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map(n => (
                    <tr key={n.credit_note_id} className="border-t hover:bg-muted/20">
                      <td className="p-3 font-mono text-[10px]">{n.credit_note_id}</td>
                      <td className="p-3 font-mono text-[10px]">{n.invoice_id}</td>
                      <td className="p-3 max-w-[200px] truncate">{n.reason}</td>
                      <td className="p-3 text-right font-mono">{fmt(n.total_ht)}</td>
                      <td className="p-3 text-right font-mono">{fmt(n.tva_amount)}</td>
                      <td className="p-3 text-right font-mono font-medium">{fmt(n.total_ttc)}</td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] ${n.status === 'validated' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {n.status === 'validated' ? 'Validé' : 'Brouillon'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {n.status === 'draft' && (
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleValidate(n.credit_note_id)}>
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
