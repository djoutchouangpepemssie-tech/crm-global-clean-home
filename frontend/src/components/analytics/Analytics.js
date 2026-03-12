import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Eye, MousePointer, FileText, TrendingUp, Globe } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/tracking/stats?period=${period}`, {
        withCredentials: true
      });
      setStats(response.data);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const kpiCards = [
    {
      title: 'Visiteurs uniques',
      value: stats.total_visitors,
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Pages vues',
      value: stats.total_page_views,
      icon: Eye,
      color: 'bg-violet-500'
    },
    {
      title: 'Clics CTA',
      value: stats.total_cta_clicks,
      icon: MousePointer,
      color: 'bg-rose-500'
    },
    {
      title: 'Formulaires',
      value: stats.total_form_submits,
      icon: FileText,
      color: 'bg-green-500'
    },
    {
      title: 'Taux conversion',
      value: stats.conversion_rate + '%',
      icon: TrendingUp,
      color: 'bg-amber-500'
    },
    {
      title: 'Sessions',
      value: stats.total_sessions,
      icon: Globe,
      color: 'bg-cyan-500'
    }
  ];

  const sourceData = Object.entries(stats.sources).map(([name, value]) => ({
    name,
    value
  }));

  const deviceData = Object.entries(stats.devices).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  const COLORS = ['#7C3AED', '#E11D48', '#2563EB', '#10B981', '#F59E0B', '#EC4899'];

  return (
    <div className="p-8 space-y-8" data-testid="analytics-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Analytics Visiteurs
          </h1>
          <p className="text-slate-600 mt-1">Suivez le comportement des prospects sur votre site</p>
        </div>
        <div className="flex gap-2">
          {['1d', '7d', '30d'].map((p) => (
            <button
              key={p}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiCards.map((kpi, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
          >
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

      {/* Funnel */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Entonnoir de conversion</h2>
        <div className="space-y-3">
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-700">Visiteurs</span>
              <span className="text-sm font-semibold text-slate-900">{stats.funnel.visitors}</span>
            </div>
            <div className="h-8 bg-blue-500 rounded-lg" style={{ width: '100%' }}></div>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-700">Clics CTA</span>
              <span className="text-sm font-semibold text-slate-900">{stats.funnel.cta_clicks}</span>
            </div>
            <div
              className="h-8 bg-violet-500 rounded-lg"
              style={{
                width: `${(stats.funnel.cta_clicks / stats.funnel.visitors) * 100}%`
              }}
            ></div>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-700">Formulaires soumis</span>
              <span className="text-sm font-semibold text-slate-900">{stats.funnel.form_submits}</span>
            </div>
            <div
              className="h-8 bg-green-500 rounded-lg"
              style={{
                width: `${(stats.funnel.form_submits / stats.funnel.visitors) * 100}%`
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sources */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Sources de trafic</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
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

        {/* Devices */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Appareils</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={deviceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip />
              <Bar dataKey="value" fill="#7C3AED" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top pages */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Pages les plus visitées</h2>
        <div className="space-y-3">
          {stats.top_pages.slice(0, 10).map((page, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{page.url}</p>
              </div>
              <span className="ml-4 px-3 py-1 bg-white rounded-full text-sm font-semibold text-slate-700">
                {page.views} vues
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Installation Instructions */}
      <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-xl border border-violet-200 p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Installation du Widget de Tracking</h2>
        <p className="text-slate-600 mb-4">
          Pour tracker les visiteurs sur votre site globalcleanhome.com, ajoutez ce code avant la fermeture du &lt;/body&gt; :
        </p>
        <div className="bg-slate-900 text-white p-6 rounded-lg font-mono text-sm overflow-x-auto">
          <code>
            {`<script src="https://clean-home-hub-3.preview.emergentagent.com/tracking.js"></script>
<script>
  GCHTracker.init({ apiKey: 'gch_${Math.random().toString(36).substring(7)}' });
</script>`}
          </code>
        </div>
        <p className="text-sm text-slate-600 mt-4">
          🔒 Le tracking est automatique : pages vues, clics, formulaires, temps passé, etc.
        </p>
      </div>
    </div>
  );
};

export default Analytics;
