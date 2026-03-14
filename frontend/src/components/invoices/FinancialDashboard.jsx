import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, CreditCard, Clock, AlertTriangle, TrendingUp, FileText, Download } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const FinancialDashboard = () => {
  const [stats, setStats] = useState({});
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchStats(); }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/stats/financial?period=${period}`, { withCredentials: true });
      setStats(res.data || {});
    } catch {
      toast.error('Erreur lors du chargement des stats financières');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse bg-slate-200 rounded h-6 w-32 mx-auto"></div>
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
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8" data-testid="financial-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Tableau de bord financier
          </h1>
          <p className="text-slate-600 mt-1 text-sm">Vue d'ensemble de vos revenus et paiements</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <a
            href={`${API_URL}/exports/financial/pdf?period=${period}`}
            data-testid="export-financial-pdf"
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-xs md:text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Rapport</span> PDF
          </a>
          <div className="flex gap-1.5" data-testid="period-selector">
          {['7d', '30d', '90d'].map(p => (
            <button
              key={p}
              data-testid={`period-${p}`}
              onClick={() => setPeriod(p)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {p === '7d' ? '7j' : p === '30d' ? '30j' : '90j'}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">{kpi.title}</p>
                <p className="text-xl md:text-2xl font-bold text-slate-900 truncate">{kpi.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg ${kpi.color} flex items-center justify-center flex-shrink-0`}>
                <kpi.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Revenue over time */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm overflow-hidden">
          <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-4">Revenus par jour</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={stats.revenue_by_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '10px' }} tickLine={false} interval="preserveStartEnd" />
              <YAxis stroke="#64748b" style={{ fontSize: '10px' }} tickFormatter={v => `${v}`} width={35} tickLine={false} />
              <Tooltip
                formatter={(value) => [`${value.toFixed(2)} EUR`, 'Revenu']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by service */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm overflow-hidden">
          <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-4">Revenus par service</h3>
          {serviceData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-slate-400 text-sm">
              Aucune donnee disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={serviceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px' }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis stroke="#64748b" style={{ fontSize: '10px' }} tickFormatter={v => `${v}`} width={35} tickLine={false} />
                <Tooltip
                  formatter={(value) => [`${value.toFixed(2)} EUR`, 'Revenu']}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#7C3AED" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm overflow-hidden">
        <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-4">Transactions recentes</h3>
        {(stats?.recent_transactions || []).length === 0 ? (
          <p className="text-slate-400 text-center py-6 text-sm">Aucune transaction</p>
        ) : (
          <div className="space-y-2">
            {(stats?.recent_transactions || []).map((tx, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-slate-900 truncate">{tx.transaction_id}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Facture: {tx.invoice_id}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-sm text-slate-900">{formatCurrency(tx.amount)}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    tx.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                    tx.payment_status === 'initiated' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {tx.payment_status === 'paid' ? 'Paye' : tx.payment_status === 'initiated' ? 'Initie' : tx.payment_status}
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
