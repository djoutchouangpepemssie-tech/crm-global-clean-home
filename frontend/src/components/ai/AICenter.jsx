import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Brain, Mail, Target, Zap, Send, Copy, Check, AlertTriangle, Users, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const AICenter = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('insights');
  const [insights, setInsights] = useState(null);
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState('');
  const [context, setContext] = useState('relance');
  const [tone, setTone] = useState('professionnel');
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [scoring, setScoring] = useState(false);

  useEffect(() => { fetchInsights(); fetchLeads(); }, []);

  const fetchInsights = async () => {
    try {
      const res = await axios.get(API_URL + '/ai/insights', { withCredentials: true });
      setInsights(res.data);
    } catch(e) {}
  };

  const fetchLeads = async () => {
    try {
      const res = await axios.get(API_URL + '/leads?limit=50', { withCredentials: true });
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch(e) {}
  };

  const handleGenerate = async () => {
    if (!selectedLead) { toast.error('Selectionnez un lead'); return; }
    setGenerating(true);
    try {
      const res = await axios.post(API_URL + '/ai/generate-email',
        { lead_id: selectedLead, context, tone }, { withCredentials: true });
      setGeneratedEmail(res.data);
      toast.success('Email genere !');
    } catch(e) { toast.error('Erreur'); } finally { setGenerating(false); }
  };

  const handleSend = async () => {
    if (!generatedEmail || !selectedLead) return;
    setSending(true);
    try {
      await axios.post(API_URL + '/ai/send-email/' + selectedLead, generatedEmail, { withCredentials: true });
      toast.success('Email envoye !'); setGeneratedEmail(null);
    } catch(e) { toast.error('Erreur'); } finally { setSending(false); }
  };

  const handleScoreAll = async () => {
    setScoring(true);
    try {
      const res = await axios.post(API_URL + '/ai/score-batch', {}, { withCredentials: true });
      toast.success(res.data.updated + ' leads re-scores !'); fetchInsights();
    } catch(e) { toast.error('Erreur'); } finally { setScoring(false); }
  };

  const segs = (insights && insights.segments) ? insights.segments : {};

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-bold text-slate-100">Centre IA</h1>
          </div>
          <p className="text-slate-500 text-sm">Lead scoring predictif, emails intelligents et recommandations</p>
        </div>
        <button onClick={handleScoreAll} disabled={scoring}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm disabled:opacity-60">
          {scoring ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Brain className="w-4 h-4" />}
          Re-scorer tous les leads
        </button>
      </div>

      <div className="flex gap-1 bg-white/3 rounded-2xl border border-white/5 p-1.5">
        {[{id:'insights',label:'Insights',icon:Brain},{id:'email',label:'Email IA',icon:Mail},{id:'segments',label:'Segments',icon:Target}].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={"flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all " + (activeTab === tab.id ? "bg-violet-600 text-white" : "text-slate-500 hover:text-slate-300")}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'insights' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              {key:'hot',label:'Leads chauds',emoji:'🔥',color:'#f43f5e'},
              {key:'warm',label:'Leads tiedies',emoji:'⬆️',color:'#f59e0b'},
              {key:'cold',label:'Leads froids',emoji:'❄️',color:'#60a5fa'},
            ].map(seg => (
              <div key={seg.key} className="section-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{seg.emoji}</span>
                  <span className="text-3xl font-black" style={{color:seg.color}}>{(segs[seg.key] && segs[seg.key].count) || 0}</span>
                </div>
                <p className="font-bold text-slate-200">{seg.label}</p>
                <p className="text-xs text-slate-500 mb-3">Score moy: {(segs[seg.key] && segs[seg.key].avg_score) || 0}/100</p>
                <button onClick={() => navigate('/leads')}
                  style={{background:seg.color+'20',color:seg.color}}
                  className="w-full py-2 rounded-xl text-xs font-semibold">Voir ces leads</button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {label:'Total leads',value:insights ? insights.total_leads : 0,icon:Users,color:'#a78bfa'},
              {label:'Score moyen',value:(insights ? insights.avg_score : 0)+'/100',icon:Target,color:'#60a5fa'},
              {label:'Leads chauds',value:(segs.hot && segs.hot.count) || 0,icon:Zap,color:'#f43f5e'},
              {label:'A relancer',value:(insights && insights.urgent_leads) ? insights.urgent_leads.length : 0,icon:AlertTriangle,color:'#f59e0b'},
            ].map((m,i) => (
              <div key={i} className="metric-card">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{background:m.color+'15',border:'1px solid '+m.color+'30'}}>
                  <m.icon className="w-4 h-4" style={{color:m.color}} />
                </div>
                <p className="text-2xl font-bold text-slate-100">{m.value}</p>
                <p className="text-xs text-slate-500 mt-1">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'email' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="section-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" /> Generateur email IA
            </h3>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Lead cible</label>
              <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-sm">
                <option value="" className="bg-slate-800">Selectionnez un lead...</option>
                {leads.map(l => (
                  <option key={l.lead_id} value={l.lead_id} className="bg-slate-800">
                    {l.name} — {l.service_type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Contexte</label>
              <div className="space-y-2">
                {[{id:'relance',label:'Relance prospect',icon:'📧'},{id:'devis_envoye',label:'Devis envoye',icon:'📄'},{id:'suivi',label:'Suivi client',icon:'⭐'}].map(c => (
                  <button key={c.id} onClick={() => setContext(c.id)}
                    className={"w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all " + (context===c.id?"border-violet-500 bg-violet-500/10":"border-white/5 hover:border-white/15")}>
                    <span className="text-xl">{c.icon}</span>
                    <span className="text-sm font-semibold text-slate-200">{c.label}</span>
                    {context===c.id && <Check className="w-4 h-4 text-violet-400 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Ton</label>
              <div className="flex gap-2">
                {[{id:'professionnel',label:'Pro',emoji:'👔'},{id:'amical',label:'Amical',emoji:'😊'},{id:'urgent',label:'Urgent',emoji:'🚨'}].map(t => (
                  <button key={t.id} onClick={() => setTone(t.id)}
                    className={"flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all " + (tone===t.id?"border-violet-500 bg-violet-500/10":"border-white/5 hover:border-white/15")}>
                    <span className="text-xl">{t.emoji}</span>
                    <span className="text-xs font-semibold text-slate-300">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleGenerate} disabled={generating || !selectedLead}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
              {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Generation...' : 'Generer email'}
            </button>
          </div>

          <div className="section-card p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400" /> Apercu email
            </h3>
            {generatedEmail ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">OBJET</label>
                  <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-sm text-slate-200 flex-1">{generatedEmail.subject}</p>
                    <button onClick={() => { navigator.clipboard.writeText(generatedEmail.subject); toast.success('Copie!'); }}
                      className="text-slate-500 hover:text-slate-300">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">CORPS</label>
                  <textarea value={generatedEmail.body}
                    onChange={e => setGeneratedEmail(prev => ({...prev, body: e.target.value}))}
                    rows={10}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-sm resize-none focus:outline-none focus:border-violet-500 font-mono leading-relaxed" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { navigator.clipboard.writeText(generatedEmail.body); toast.success('Copie!'); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-sm">
                    <Copy className="w-4 h-4" /> Copier
                  </button>
                  <button onClick={handleSend} disabled={sending}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm disabled:opacity-60">
                    {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                    Envoyer
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-slate-600">
                <Sparkles className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm">Selectionnez un lead et generez un email</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'segments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            {key:'hot',label:'Leads chauds (75-100)',emoji:'🔥',color:'#f43f5e',strategy:'Appelez dans les 30 min. Devis personnalise immediat. Offre speciale limitee.'},
            {key:'warm',label:'Leads tiedies (55-74)',emoji:'⬆️',color:'#f59e0b',strategy:'Devis sous 2h. Relance J+1 et J+3. Remise de 10% si reponse sous 48h.'},
            {key:'lukewarm',label:'Leads neutres (35-54)',emoji:'⚖️',color:'#a78bfa',strategy:'Sequence email 7 jours. Temoignages clients. Rappel personnalise.'},
            {key:'cold',label:'Leads froids (0-34)',emoji:'❄️',color:'#60a5fa',strategy:'Nurturing long terme. Newsletter mensuelle. Reactivation a J+30.'},
          ].map(seg => (
            <div key={seg.key} className="section-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{seg.emoji}</span>
                <div>
                  <p className="font-bold text-slate-200">{seg.label}</p>
                  <p className="text-2xl font-black" style={{color:seg.color}}>{(segs[seg.key] && segs[seg.key].count) || 0} leads</p>
                </div>
              </div>
              <div className="p-3 rounded-xl mb-3" style={{background:seg.color+'10',border:'1px solid '+seg.color+'20'}}>
                <p className="text-xs font-semibold mb-1" style={{color:seg.color}}>Strategie recommandee</p>
                <p className="text-xs text-slate-400 leading-relaxed">{seg.strategy}</p>
              </div>
              <button onClick={() => navigate('/leads')}
                style={{background:seg.color+'15',color:seg.color}}
                className="w-full py-2.5 rounded-xl text-sm font-semibold">Voir ces leads</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AICenter;
