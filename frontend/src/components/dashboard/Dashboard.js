import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, UserPlus, Trophy, FileText, Target, CheckSquare, TrendingUp, Star, ArrowUpRight } from 'lucide-react';
import { getStatusColor, getStatusLabel, formatDateTime } from '../../lib/utils';
import LeadScoreBadge from '../shared/LeadScoreBadge';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const CHART_COLORS = ['#7C3AED', '#E11D48', '#2563EB', '#10B981', '#F59E0B', '#6366F1'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/stats/dashboard?period=${period}`, { withCredentials: true });
      setStats(response.data);
    } catch {
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, [period]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, [period]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-slate-500 text-sm">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  const kpis = [
    { title: 'Total leads', value: stats.total_leads, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50', change: null },
    { title: 'Nouveaux', value: stats.new_leads, icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50', change: '+' + stats.new_leads },
    { title: 'Gagnés', value: stats.won_leads, icon: Trophy, color: 'text-emerald-600', bg: 'bg-emerald-50', change: null },
    { title: 'Devis envoyés', value: stats.sent_quotes, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50', change: null },
    { title: 'Taux conversion', value: `${stats.conversion_lead_to_quote || 0}%`, icon: Target, color: 'text-rose-600', bg: 'bg-rose-50', change: null },
    { title: 'Tâches en cours', value: stats.pending_tasks, icon: CheckSquare, color: 'text-cyan-600', bg: 'bg-cyan-50', change: null },
    { title: 'Score moyen', value: stats.avg_lead_score || 0, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50', change: null },
    { title: 'Meilleure source', value: stats.best_source?.name || '-', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50', change: null },
  ];

  const sourceData = Object.entries(stats.leads_by_source || {}).map(([name, value]) => ({
    name: name || 'Inconnu', value
  }));

  const serviceData = Object.entries(stats.leads_by_service || {}).map(([name, value]) => ({
    name, value
  }));

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Tableau de bord
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Vue d'ensemble de votre activite</p>
        </div>
        <div className="flex gap-1 sm:gap-1.5 bg-white rounded-lg border border-slate-200 p-1" data-testid="period-selector">
          {[
            { key: '1d', label: "Aujourd'hui" },
            { key: '7d', label: '7 jours' },
            { key: '30d', label: '30 jours' },
          ].map(p => (
            <button
              key={p.key}
              data-testid={`period-${p.key}`}
              onClick={() => setPeriod(p.key)}
              className={`px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all duration-150 ${
                period === p.key
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children" data-testid="kpi-grid">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl border border-slate-200 p-5 hover-lift animate-fade-in"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              {kpi.change && (
                <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <ArrowUpRight className="w-3 h-3" />
                  {kpi.change}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{kpi.title}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads over time */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 hover-lift">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Leads par jour</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.leads_by_day || []}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" stroke="#94A3B8" style={{ fontSize: '11px' }} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" style={{ fontSize: '11px' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                labelStyle={{ fontWeight: 600, color: '#0F172A' }}
              />
              <Area type="monotone" dataKey="count" stroke="#7C3AED" strokeWidth={2} fill="url(#colorLeads)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sources pie chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 hover-lift">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Sources</h3>
          {sourceData.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">Pas de données</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3} dataKey="value">
                    {sourceData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Leads']} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {sourceData.map((s, idx) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></span>
                      <span className="text-slate-600">{s.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Service chart + Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 hover-lift">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Par service</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={serviceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" stroke="#94A3B8" style={{ fontSize: '11px' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis dataKey="name" type="category" stroke="#94A3B8" style={{ fontSize: '11px' }} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
              <Bar dataKey="value" fill="#7C3AED" radius={[0, 6, 6, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Leads */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 hover-lift">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Leads récents</h3>
            <button
              onClick={() => navigate('/leads')}
              className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
            >
              Voir tout
            </button>
          </div>
          <div className="space-y-3">
            {(stats.recent_leads || []).slice(0, 6).map((lead) => (
              <div
                key={lead.lead_id}
                data-testid={`recent-lead-${lead.lead_id}`}
                onClick={() => navigate(`/leads/${lead.lead_id}`)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-violet-700 font-semibold text-sm flex-shrink-0 group-hover:bg-violet-200 transition-colors">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{lead.name}</p>
                  <p className="text-xs text-slate-500">{lead.service_type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <LeadScoreBadge score={lead.score || 50} />
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(lead.status)}`}>
                    {getStatusLabel(lead.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
