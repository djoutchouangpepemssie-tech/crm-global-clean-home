import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, CreditCard, Clock, AlertTriangle, TrendingUp, FileText, Download } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const FinancialDashboard = () => {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchStats(); }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/stats/financial?period=${period}`, { withCredentials: true });
      setStats(res.data);
    } catch {
      toast.error('Erreur lors du chargement des stats financières');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  const kpis = [
    { title: 'Chiffre d\'affaires', value: formatCurrency(stats.total_revenue), icon: DollarSign, color: 'bg-green-500' },
    { title: 'En attente', value: formatCurrency(stats.total_pending), icon: Clock, color: 'bg-amber-500' },
    { title: 'En retard', value: formatCurrency(stats.total_overdue), icon: AlertTriangle, color: 'bg-red-500' },
    { title: 'Factures payées', value: stats.paid_count, icon: CreditCard, color: 'bg-blue-500' },
    { title: 'Factures en attente', value: stats.pending_count, icon: FileText, color: 'bg-yellow-500' },
    { title: 'Total factures', value: stats.total_invoices, icon: TrendingUp, color: 'bg-violet-500' },
  ];

  const serviceData = Object.entries(stats.revenue_by_service || {}).map(([name, value]) => ({
    name,
    revenue: value,
  }));

  return (
    <div className="p-8 space-y-8" data-testid="financial-dashboard">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Tableau de bord financier
          </h1>
          <p className="text-slate-600 mt-1">Vue d'ensemble de vos revenus et paiements</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`${API_URL}/exports/financial/pdf?period=${period}`}
            data-testid="export-financial-pdf"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Rapport PDF
          </a>
          <div className="flex gap-2" data-testid="period-selector">
          {['7d', '30d', '90d'].map(p => (
            <button
              key={p}
              data-testid={`period-${p}`}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : '90 jours'}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">{kpi.title}</p>
                <p className="text-3xl font-bold text-slate-900">{kpi.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${kpi.color} flex items-center justify-center`}>
                <kpi.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue over time */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Revenus par jour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.revenue_by_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '11px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '11px' }} tickFormatter={v => `${v}€`} />
              <Tooltip
                formatter={(value) => [`${value.toFixed(2)} €`, 'Revenu']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by service */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Revenus par service</h3>
          {serviceData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              Aucune donnée disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '11px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '11px' }} tickFormatter={v => `${v}€`} />
                <Tooltip
                  formatter={(value) => [`${value.toFixed(2)} €`, 'Revenu']}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Bar dataKey="revenue" fill="#7C3AED" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Transactions récentes</h3>
        {stats.recent_transactions.length === 0 ? (
          <p className="text-slate-400 text-center py-8">Aucune transaction</p>
        ) : (
          <div className="space-y-3">
            {stats.recent_transactions.map((tx, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-mono text-sm text-slate-900">{tx.transaction_id}</p>
                  <p className="text-xs text-slate-500 mt-1">Facture: {tx.invoice_id}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{formatCurrency(tx.amount)}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    tx.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                    tx.payment_status === 'initiated' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {tx.payment_status === 'paid' ? 'Payé' : tx.payment_status === 'initiated' ? 'Initié' : tx.payment_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialDashboard;
