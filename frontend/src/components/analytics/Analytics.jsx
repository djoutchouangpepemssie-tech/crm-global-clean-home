import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Eye, MousePointer, FileText, TrendingUp, Globe } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Analytics = () => {
  const [stats, setStats] = useState({});
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/tracking/stats?period=${period}`, {
        withCredentials: true
      });
      setStats(response.data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-pulse bg-slate-200 rounded h-6 w-32 mx-auto"></div>
          <p className="mt-4 text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const kpiCards = [
    {
      title: 'Visiteurs uniques',
      value: (stats?.total_visitors ?? 0),
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Pages vues',
      value: (stats?.total_page_views ?? 0),
      icon: Eye,
      color: 'bg-violet-500'
    },
    {
      title: 'Clics CTA',
      value: (stats?.total_cta_clicks ?? 0),
      icon: MousePointer,
      color: 'bg-rose-500'
    },
    {
      title: 'Formulaires',
      value: (stats?.total_form_submits ?? 0),
      icon: FileText,
      color: 'bg-green-500'
    },
    {
      title: 'Taux conversion',
      value: (stats?.conversion_rate ?? 0) + '%',
      icon: TrendingUp,
      color: 'bg-amber-500'
    },
    {
      title: 'Sessions',
      value: (stats?.total_sessions ?? 0),
      icon: Globe,
      color: 'bg-cyan-500'
    }
  ];

  const sourceData = Object.entries((stats?.sources ?? 0) || {}).map(([name, value]) => ({
    name,
    value
  }));

  const deviceData = Object.entries((stats?.devices ?? 0) || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  const COLORS = ['#7C3AED', '#E11D48', '#2563EB', '#10B981', '#F59E0B', '#EC4899'];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8" data-testid="analytics-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Analytics Visiteurs
          </h1>
          <p className="text-slate-600 mt-1 text-sm">Suivez le comportement des prospects sur votre site</p>
        </div>
        <div className="flex gap-1.5">
          {['1d', '7d', '30d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {p === '1d' ? "Aujourd'hui" : p === '7d' ? '7 jours' : '30 jours'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {kpiCards.map((kpi, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
          >
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

      {/* Funnel */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm overflow-hidden">
        <h2 className="text-sm md:text-base font-semibold text-slate-900 mb-4">Entonnoir de conversion</h2>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-700">Visiteurs</span>
              <span className="text-xs font-semibold text-slate-900">{(stats?.funnel?.visitors || 0)}</span>
            </div>
            <div className="h-6 bg-blue-500 rounded-lg" style={{ width: '100%' }}></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-700">Clics CTA</span>
              <span className="text-xs font-semibold text-slate-900">{(stats?.funnel?.cta_clicks || 0)}</span>
            </div>
            <div
              className="h-6 bg-violet-500 rounded-lg"
              style={{
                width: `${(stats?.funnel?.visitors || 0) > 0 ? ((stats?.funnel?.cta_clicks || 0) / (stats?.funnel?.visitors || 0)) * 100 : 0}%`
              }}
            ></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-700">Formulaires soumis</span>
              <span className="text-xs font-semibold text-slate-900">{(stats?.funnel?.form_submits || 0)}</span>
            </div>
            <div
              className="h-6 bg-green-500 rounded-lg"
              style={{
                width: `${(stats?.funnel?.visitors || 0) > 0 ? ((stats?.funnel?.form_submits || 0) / (stats?.funnel?.visitors || 0)) * 100 : 0}%`
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Sources */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm overflow-hidden">
          <h2 className="text-sm md:text-base font-semibold text-slate-900 mb-4">Sources de trafic</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="50%"
                labelLine={false}
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
          <div className="space-y-1 mt-2">
            {sourceData.map((s, idx) => (
              <div key={s.name} className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="text-slate-600 truncate">{s.name}</span>
                </div>
                <span className="font-semibold text-slate-900 flex-shrink-0">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Devices */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm overflow-hidden">
          <h2 className="text-sm md:text-base font-semibold text-slate-900 mb-4">Appareils</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={deviceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px' }} tickLine={false} />
              <YAxis stroke="#64748b" style={{ fontSize: '10px' }} width={30} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: '12px' }} />
              <Bar dataKey="value" fill="#7C3AED" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top pages */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm overflow-hidden">
        <h2 className="text-sm md:text-base font-semibold text-slate-900 mb-4">Pages les plus visitees</h2>
        <div className="space-y-2">
          {(stats?.top_pages || []).slice(0, 10).map((page, index) => (
            <div key={index} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 truncate">{page.url}</p>
              </div>
              <span className="px-2 py-0.5 bg-white rounded-full text-xs font-semibold text-slate-700 flex-shrink-0">
                {page.views}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Installation Instructions */}
      <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-xl border border-violet-200 p-4 md:p-8 overflow-hidden">
        <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-3">Installation du Widget de Tracking</h2>
        <p className="text-sm text-slate-600 mb-4">
          Pour tracker les visiteurs sur globalcleanhome.com, ajoutez ce code avant la fermeture du &lt;/body&gt; :
        </p>
        <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
          <code className="break-all">
            {`<script src="${process.env.REACT_APP_BACKEND_URL}/tracking.js"></script>`}
          </code>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Le tracking est automatique : pages vues, clics, formulaires, temps passe.
        </p>
      </div>
    </div>
  );
};

export default Analytics;
