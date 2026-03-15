import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, CreditCard, Clock, CheckCircle, AlertTriangle, Plus, Download, TrendingUp } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const STATUS_CONFIG = {
  'en_attente': { label: 'En attente', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: Clock },
  'payée': { label: 'Payée', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', icon: CheckCircle },
  'payee': { label: 'Payée', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', icon: CheckCircle },
  'en_retard': { label: 'En retard', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.2)', icon: AlertTriangle },
  'annulée': { label: 'Annulée', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', icon: FileText },
};

const InvoicesList = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { fetchInvoices(); }, [filter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const res = await axios.get(`${API_URL}/invoices${params}`, { withCredentials: true });
      setInvoices(Array.isArray(res.data) ? res.data : res.data.invoices || []);
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  const handleSendInvoice = async (invoice) => {
    try {
      await axios.post(`${API_URL}/invoices/${invoice.invoice_id}/send-portal`, {}, { withCredentials: true });
      toast.success('✓ Facture envoyée au client avec lien de paiement');
    } catch { toast.error('Erreur lors de l\'envoi'); }
  };

  const handlePay = async (invoice) => {
    try {
      const res = await axios.post(`${API_URL}/invoices/${invoice.invoice_id}/checkout`,
        { origin_url: window.location.origin }, { withCredentials: true });
      window.location.href = res.data.url;
    } catch { toast.error('Erreur lors de la création du paiement'); }
  };

  const totalPaid = invoices.filter(i => ['payée','payee'].includes(i.status)).reduce((s, i) => s + (i.amount_ttc || 0), 0);
  const totalPending = invoices.filter(i => i.status === 'en_attente').reduce((s, i) => s + (i.amount_ttc || 0), 0);
  const totalLate = invoices.filter(i => i.status === 'en_retard').reduce((s, i) => s + (i.amount_ttc || 0), 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in" data-testid="invoices-page">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Factures</h1>
          </div>
          <p className="text-slate-500 text-sm"><span className="text-violet-400 font-semibold">{invoices.length}</span> facture(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`${API_URL}/exports/invoices/csv`} data-testid="export-invoices-csv"
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 rounded-lg transition-all text-sm font-medium">
            <Download className="w-4 h-4" /> CSV
          </a>
          <a href={`${API_URL}/exports/financial/pdf`} data-testid="export-financial-pdf"
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 rounded-lg transition-all text-sm font-medium">
            <FileText className="w-4 h-4" /> PDF
          </a>
          <button onClick={() => navigate('/quotes')} data-testid="go-to-quotes-btn"
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-all text-sm font-medium"
            style={{boxShadow:'0 0 15px rgba(139,92,246,0.25)'}}>
            <Plus className="w-4 h-4" /> Depuis un devis
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total encaissé', value: formatCurrency(totalPaid), color: '#34d399', icon: CheckCircle, desc: `${invoices.filter(i => ['payée','payee'].includes(i.status)).length} factures payées` },
          { label: 'En attente', value: formatCurrency(totalPending), color: '#f59e0b', icon: Clock, desc: `${invoices.filter(i => i.status === 'en_attente').length} factures en attente` },
          { label: 'En retard', value: formatCurrency(totalLate), color: '#f43f5e', icon: AlertTriangle, desc: `${invoices.filter(i => i.status === 'en_retard').length} factures en retard` },
        ].map((s, i) => (
          <div key={i} className="metric-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:`${s.color}15`,border:`1px solid ${s.color}25`}}>
                <s.icon className="w-4 h-4" style={{color:s.color}} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{color:s.color,fontFamily:'Manrope,sans-serif'}}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            <p className="text-xs text-slate-600 mt-0.5">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap" data-testid="invoice-filters">
        {[
          { value: '', label: 'Toutes' },
          { value: 'en_attente', label: 'En attente' },
          { value: 'payée', label: 'Payées' },
          { value: 'en_retard', label: 'En retard' },
        ].map(f => (
          <button key={f.value} data-testid={`filter-${f.value || 'all'}`}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f.value
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="section-card overflow-hidden" data-testid="invoices-table">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Aucune facture</p>
            <p className="text-xs text-slate-600 mt-1">Créez une facture depuis un devis accepté</p>
            <button onClick={() => navigate('/quotes')} className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all">
              Voir les devis
            </button>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{borderBottom:'1px solid rgba(255,255,255,0.05)',background:'rgba(255,255,255,0.02)'}}>
                    {['Réf.','Client','Service','Montant','Statut','Date','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG['en_attente'];
                    const StatusIcon = cfg.icon;
                    return (
                      <tr key={inv.invoice_id} data-testid={`invoice-row-${inv.invoice_id}`}
                        className="group hover:bg-white/3 transition-all"
                        style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-500 bg-white/5 px-2 py-1 rounded">
                            #{inv.invoice_id?.slice(-6)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-200">{inv.lead_name}</p>
                          <p className="text-xs text-slate-500">{inv.lead_email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">{inv.service_type}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-slate-200">{formatCurrency(inv.amount_ttc)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit"
                            style={{color:cfg.color,background:cfg.bg,border:`1px solid ${cfg.border}`}}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(inv.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleSendInvoice(inv)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-medium transition-all"
                              title="Envoyer au client">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              Envoyer
                            </button>
                            {inv.status === 'en_attente' && (
                              <button onClick={() => handlePay(inv)} data-testid={`pay-btn-${inv.invoice_id}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/20 text-violet-300 rounded-lg text-xs font-medium transition-all">
                                <CreditCard className="w-3.5 h-3.5" /> Payer
                              </button>
                            )}
                            {['payée','payee'].includes(inv.status) && (
                              <span className="flex items-center gap-1 text-green-400 text-xs font-medium">
                                <CheckCircle className="w-3.5 h-3.5" /> Payée
                              </span>
                            )}
                            <a href={`${API_URL}/exports/invoice/${inv.invoice_id}/pdf`}
                              data-testid={`pdf-btn-${inv.invoice_id}`}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 rounded-lg text-xs transition-all">
                              <Download className="w-3.5 h-3.5" /> PDF
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-white/5">
              {invoices.map(inv => {
                const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG['en_attente'];
                return (
                  <div key={inv.invoice_id} data-testid={`invoice-card-${inv.invoice_id}`} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 text-sm">{inv.lead_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{inv.service_type}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                        style={{color:cfg.color,background:cfg.bg}}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-violet-400 text-lg">{formatCurrency(inv.amount_ttc)}</p>
                      <div className="flex items-center gap-2">
                        {inv.status === 'en_attente' && (
                          <button onClick={() => handlePay(inv)} data-testid={`pay-btn-mobile-${inv.invoice_id}`}
                            className="flex items-center gap-1 px-3 py-1.5 bg-violet-600/20 border border-violet-500/20 text-violet-300 rounded-lg text-xs font-medium">
                            <CreditCard className="w-3.5 h-3.5" /> Payer
                          </button>
                        )}
                        <a href={`${API_URL}/exports/invoice/${inv.invoice_id}/pdf`}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 text-slate-400 rounded-lg text-xs">
                          <Download className="w-3.5 h-3.5" /> PDF
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InvoicesList;
