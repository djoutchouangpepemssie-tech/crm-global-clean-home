import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Users, FileText, CheckCircle, Clock, DollarSign, Award, Target } from 'lucide-react';
import { formatCurrency, getStatusColor, getStatusLabel, formatDate } from '../../lib/utils';
import { toast } from 'sonner';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import LeadScoreBadge from '../shared/LeadScoreBadge';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  
  // Enable real-time notifications
  const { newLeadsCount } = useRealtimeNotifications();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, leadsRes] = await Promise.all([
        axios.get(`${API_URL}/stats/dashboard?period=${period}`, { withCredentials: true }),
        axios.get(`${API_URL}/leads?period=${period}`, { withCredentials: true })
      ]);
      setStats(statsRes.data);
      setLeads(leadsRes.data.slice(0, 10)); // Top 10 recent leads
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const kpiCards = [
    {
      title: 'Leads totaux',
      value: stats.total_leads,
      icon: Users,
      color: 'bg-blue-500',
      testId: 'kpi-total-leads'
    },
    {
      title: 'Nouveaux leads',
      value: stats.new_leads,
      icon: TrendingUp,
      color: 'bg-violet-500',
      testId: 'kpi-new-leads'
    },
    {
      title: 'Devis envoyés',
      value: stats.sent_quotes,
      icon: FileText,
      color: 'bg-rose-500',
      testId: 'kpi-sent-quotes'
    },
    {
      title: 'Leads gagnés',
      value: stats.won_leads,
      icon: CheckCircle,
      color: 'bg-green-500',
      testId: 'kpi-won-leads'
    },
    {
      title: 'Taux conversion L→D',
      value: stats.conversion_lead_to_quote + '%',
      icon: DollarSign,
      color: 'bg-amber-500',
      testId: 'kpi-conversion-lead-quote'
    },
    {
      title: 'Tâches en attente',
      value: stats.pending_tasks,
      icon: Clock,
      color: 'bg-orange-500',
      testId: 'kpi-pending-tasks'
    },
    {
      title: 'Score moyen leads',
      value: stats.avg_lead_score + '/100',
      icon: Award,
      color: 'bg-cyan-500',
      testId: 'kpi-avg-score'
    },
    {
      title: 'Meilleure source',
      value: stats.best_source.name,
      subtitle: `${stats.best_source.conversion_rate}% conv.`,
      icon: Target,
      color: 'bg-pink-500',
      testId: 'kpi-best-source'
    }
  ];

  // Prepare data for charts
  const sourceData = Object.entries(stats.leads_by_source || {}).map(([name, value]) => ({
    name: name || 'Inconnu',
    value
  }));

  const serviceData = Object.entries(stats.leads_by_service || {}).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['#7C3AED', '#E11D48', '#2563EB', '#10B981', '#F59E0B', '#EC4899'];

  return (
    <div className="p-8 space-y-8" data-testid="dashboard-page">
      {/* Period selector */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Dashboard</h1>
          <p className="text-slate-600 mt-1">Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex gap-2" data-testid="period-selector">
          {['1d', '7d', '30d'].map((p) => (
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
              {p === '1d' ? 'Aujourd\'hui' : p === '7d' ? '7 jours' : '30 jours'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => (
          <div
            key={index}
            data-testid={kpi.testId}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">{kpi.title}</p>
                <p className="text-3xl font-bold text-slate-900">{kpi.value}</p>
                {kpi.subtitle && <p className="text-xs text-slate-500 mt-1">{kpi.subtitle}</p>}
              </div>
              <div className={`w-12 h-12 rounded-lg ${kpi.color} flex items-center justify-center`}>
                <kpi.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads over time */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm" data-testid="chart-leads-over-time">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Leads au fil du temps</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.leads_by_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Area type="monotone" dataKey="count" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Leads by service */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm" data-testid="chart-leads-by-service">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Leads par service</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={serviceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="value" fill="#7C3AED" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sources and Recent Leads Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads by source */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm" data-testid="chart-leads-by-source">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Sources de trafic</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent leads */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm" data-testid="recent-leads-list">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Leads récents</h3>
          <div className="space-y-3">
            {leads.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Aucun lead récent</p>
            ) : (
              leads.map((lead) => (
                <div
                  key={lead.lead_id}
                  data-testid={`lead-item-${lead.lead_id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{lead.name}</p>
                        <p className="text-sm text-slate-600">{lead.service_type} - {lead.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <LeadScoreBadge score={lead.score || 50} />
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}>
                      {getStatusLabel(lead.status)}
                    </span>
                    <span className="text-sm text-slate-500">{formatDate(lead.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
