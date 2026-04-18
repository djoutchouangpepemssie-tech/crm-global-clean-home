import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../shared';
import axios from 'axios';
import api from '../../../lib/api';
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
    try { const res = await axios.get(`${BACKEND_URL}/api/enterprise/credit-notes`); setNotes(res.data.items || []); }
    catch (err) { console.error(err); }
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
      setForm({ invoice_id: '', reason: '', tva_rate: 'exonere', lines: [{ description: '', amount_ht: 0 }] });
      loadNotes();
    } catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const handleValidate = async (id) => {
    try { await axios.post(`${BACKEND_URL}/api/enterprise/credit-notes/${id}/validate`); loadNotes(); }
    catch (err) { alert(err.response?.data?.detail || 'Erreur'); }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2.5 tracking-tight">
            <div className="p-2 rounded-xl bg-terracotta-500/10">
              <Banknote className="w-5 h-5 text-terracotta-500" />
            </div>
            Avoirs
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{notes.length} avoir(s)</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 shadow-md shadow-terracotta-500/20">
              <Plus className="w-3.5 h-3.5" />Nouvel avoir
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-terracotta-500" />Créer un avoir
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Facture liée</label>
                <Input className="h-10 font-mono" value={form.invoice_id} onChange={e => setForm(p => ({...p, invoice_id: e.target.value}))} placeholder="INV-2026-0001" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Raison</label>
                <Textarea value={form.reason} onChange={e => setForm(p => ({...p, reason: e.target.value}))} placeholder="Erreur de facturation" rows={2} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Taux TVA</label>
                <Select value={form.tva_rate} onValueChange={v => setForm(p => ({...p, tva_rate: v}))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
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
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lignes</label>
                  <Button size="sm" variant="outline" onClick={addLine} className="text-xs gap-1 h-7"><Plus className="w-3 h-3" />Ligne</Button>
                </div>
                {form.lines.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <Input className="h-9 text-xs flex-1" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Description" />
                    <Input className="h-9 text-xs w-28 font-mono" type="number" step="0.01" value={l.amount_ht} onChange={e => updateLine(i, 'amount_ht', e.target.value)} placeholder="HT" />
                  </div>
                ))}
              </div>
              <Button className="w-full h-10 bg-gradient-to-r from-terracotta-500 to-terracotta-600" onClick={handleCreate}>
                <Banknote className="w-4 h-4 mr-2" />Créer l'avoir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 rounded-full border-2 border-terracotta-500/20 border-t-terracotta-500 animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Banknote className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucun avoir</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-3 pl-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">N°</th>
                    <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Facture</th>
                    <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Raison</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">HT</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">TVA</th>
                    <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">TTC</th>
                    <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                    <th className="text-right p-3 pr-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map((n, idx) => (
                    <tr key={n.credit_note_id} className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="p-3 pl-5 font-mono text-[11px] text-muted-foreground">{n.credit_note_id?.slice(-8)}</td>
                      <td className="p-3 font-mono text-[11px]">{n.invoice_id}</td>
                      <td className="p-3 text-sm max-w-[200px] truncate">{n.reason}</td>
                      <td className="p-3 text-right font-mono text-sm tabular-nums">{fmt(n.total_ht)}</td>
                      <td className="p-3 text-right font-mono text-sm tabular-nums text-muted-foreground">{fmt(n.tva_amount)}</td>
                      <td className="p-3 text-right font-mono text-sm tabular-nums font-semibold">{fmt(n.total_ttc)}</td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] ${n.status === 'validated' ? 'bg-brand-500/10 text-brand-500 border-brand-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                          {n.status === 'validated' ? 'Validé' : 'Brouillon'}
                        </Badge>
                      </td>
                      <td className="p-3 pr-5 text-right">
                        {n.status === 'draft' && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => handleValidate(n.credit_note_id)}>
                            <CheckCircle className="w-3.5 h-3.5 text-brand-500" />
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
