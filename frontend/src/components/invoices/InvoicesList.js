import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, CreditCard, Clock, CheckCircle, AlertTriangle, Plus, Download } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const statusConfig = {
  en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  payée: { label: 'Payée', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  en_retard: { label: 'En retard', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  annulée: { label: 'Annulée', color: 'bg-slate-100 text-slate-800', icon: FileText },
};

const InvoicesList = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchInvoices(); }, [filter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const res = await axios.get(`${API_URL}/invoices${params}`, { withCredentials: true });
      setInvoices(res.data);
    } catch (err) {
      toast.error('Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (invoice) => {
    try {
      const res = await axios.post(
        `${API_URL}/invoices/${invoice.invoice_id}/checkout`,
        { origin_url: window.location.origin },
        { withCredentials: true }
      );
      window.location.href = res.data.url;
    } catch (err) {
      toast.error('Erreur lors de la création du paiement');
    }
  };

  const filters = [
    { value: '', label: 'Toutes' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'payée', label: 'Payées' },
    { value: 'en_retard', label: 'En retard' },
  ];

  const totalPending = invoices
    .filter(i => i.status === 'en_attente')
    .reduce((s, i) => s + (i.amount_ttc || 0), 0);
  const totalPaid = invoices
    .filter(i => i.status === 'payée')
    .reduce((s, i) => s + (i.amount_ttc || 0), 0);

  return (
    <div className="p-4 md:p-6 lg:p-8" data-testid="invoices-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Factures
          </h1>
          <p className="text-slate-600 mt-1 text-sm">{invoices.length} facture(s)</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <a
            href={`${API_URL}/exports/invoices/csv`}
            data-testid="export-invoices-csv"
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-xs md:text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            CSV
          </a>
          <a
            href={`${API_URL}/exports/financial/pdf`}
            data-testid="export-financial-pdf"
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-xs md:text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Rapport</span> PDF
          </a>
          <button
            data-testid="go-to-quotes-btn"
            onClick={() => navigate('/quotes')}
            className="flex items-center gap-2 px-4 md:px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-sm font-medium text-xs md:text-sm"
          >
            <Plus className="w-4 h-4" />
            Depuis un devis
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm text-slate-600 mb-1">Total encaissé</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm text-slate-600 mb-1">En attente</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm text-slate-600 mb-1">Nombre de factures</p>
          <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 sm:gap-2 mb-4 md:mb-6 flex-wrap" data-testid="invoice-filters">
        {filters.map(f => (
          <button
            key={f.value}
            data-testid={`filter-${f.value || 'all'}`}
            onClick={() => setFilter(f.value)}
            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-violet-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" data-testid="invoices-table">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aucune facture</p>
            <p className="text-sm text-slate-400 mt-2">Creez une facture depuis un devis accepte</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Facture</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Client</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden lg:table-cell">Service</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Montant TTC</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Statut</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden xl:table-cell">Date</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoices.map(inv => {
                    const cfg = statusConfig[inv.status] || statusConfig.en_attente;
                    return (
                      <tr key={inv.invoice_id} data-testid={`invoice-row-${inv.invoice_id}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 lg:px-6 py-4">
                          <span className="font-mono text-sm text-slate-900">{inv.invoice_id?.slice(-8)}</span>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="font-medium text-slate-900 text-sm">{inv.lead_name}</div>
                          <div className="text-xs text-slate-500">{inv.lead_email}</div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-slate-900 hidden lg:table-cell">{inv.service_type}</td>
                        <td className="px-4 lg:px-6 py-4 font-semibold text-slate-900 text-sm">{formatCurrency(inv.amount_ttc)}</td>
                        <td className="px-4 lg:px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-slate-500 hidden xl:table-cell">{formatDateTime(inv.created_at)}</td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center gap-2">
                            {inv.status === 'en_attente' && (
                              <button
                                data-testid={`pay-btn-${inv.invoice_id}`}
                                onClick={() => handlePay(inv)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-xs font-medium"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                Payer
                              </button>
                            )}
                            {inv.status === 'payée' && (
                              <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Payee
                              </span>
                            )}
                            <a
                              href={`${API_URL}/exports/invoice/${inv.invoice_id}/pdf`}
                              data-testid={`pdf-btn-${inv.invoice_id}`}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors font-medium"
                            >
                              <Download className="w-3.5 h-3.5" />
                              PDF
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {invoices.map(inv => {
                const cfg = statusConfig[inv.status] || statusConfig.en_attente;
                return (
                  <div key={inv.invoice_id} data-testid={`invoice-card-${inv.invoice_id}`} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 text-sm">{inv.lead_name}</p>
                        <p className="text-xs text-slate-500">{inv.service_type}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900">{formatCurrency(inv.amount_ttc)}</p>
                      <div className="flex items-center gap-2">
                        {inv.status === 'en_attente' && (
                          <button onClick={() => handlePay(inv)} data-testid={`pay-btn-mobile-${inv.invoice_id}`}
                            className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium">
                            <CreditCard className="w-3.5 h-3.5" /> Payer
                          </button>
                        )}
                        <a href={`${API_URL}/exports/invoice/${inv.invoice_id}/pdf`}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-violet-600 rounded-lg font-medium">
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
