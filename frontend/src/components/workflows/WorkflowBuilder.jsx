import React, { useState, useEffect } from 'react';
import { PageHeader } from '../shared';
import axios from 'axios';
import api from '../../lib/api';
import { Zap, Play, RefreshCw, CheckCircle, Clock, Mail, Bell, ClipboardList, ChevronRight, ToggleLeft, ToggleRight, Send, Eye } from 'lucide-react';
import { toast } from 'sonner';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const STEP_ICONS = { send_email: Mail, create_task: ClipboardList, send_notification: Bell, wait: Clock };
const STEP_COLORS = { send_email: '#60a5fa', create_task: '#f59e0b', send_notification: '#a78bfa', wait: '#94a3b8' };
const TRIGGER_LABELS = { new_lead: 'Nouveau lead', score_change: 'Score change', status_change: 'Statut change', quote_sent: 'Devis envoye', quote_accepted: 'Devis accepte' };

const WorkflowCard = ({ workflow, onToggle, onTest, leads }) => {
  const [showTest, setShowTest] = useState(false);
  const [testLead, setTestLead] = useState('');
  const [testing, setTesting] = useState(false);
  const handleTest = async () => {
    if (!testLead) { toast.error('Selectionnez un lead'); return; }
    setTesting(true);
    try { await onTest(workflow.workflow_id, testLead); setShowTest(false); toast.success('Workflow lance!'); }
    catch { toast.error('Erreur'); } finally { setTesting(false); }
  };
  return (
    <div className={'section-card p-5 transition-all ' + (workflow.is_active ? 'border-violet-500/20' : 'opacity-60')}>
      <div className='flex items-start justify-between mb-4'>
        <div className='flex-1 min-w-0 pr-3'>
          <div className='flex items-center gap-2 mb-1'>
            <h3 className='font-bold text-slate-100 text-sm'>{workflow.name}</h3>
            {workflow.is_active
              ? <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'>Actif</span>
              : <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/25'>Inactif</span>}
          </div>
          <p className='text-xs text-slate-500 mb-2'>{workflow.description}</p>
          <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20'>
            {TRIGGER_LABELS[workflow.trigger && workflow.trigger.type] || ''}
          </span>
        </div>
        <button onClick={() => onToggle(workflow.workflow_id)} className='flex-shrink-0'>
          {workflow.is_active ? <ToggleRight className='w-8 h-8 text-emerald-400' /> : <ToggleLeft className='w-8 h-8 text-slate-600' />}
        </button>
      </div>
      <div className='flex items-center gap-1 mb-4 overflow-x-auto pb-1'>
        {(workflow.steps || []).map((step, i) => {
          const Icon = STEP_ICONS[step.type] || Zap;
          const color = STEP_COLORS[step.type] || '#94a3b8';
          return (
            <React.Fragment key={i}>
              <div className='flex flex-col items-center gap-1 flex-shrink-0'>
                <div className='w-8 h-8 rounded-lg flex items-center justify-center' style={{background:color+'15',border:'1px solid '+color+'30'}}>
                  <Icon className='w-4 h-4' style={{color}} />
                </div>
                {step.delay_hours > 0 && <span className='text-[9px] text-slate-600'>{step.delay_hours >= 24 ? (step.delay_hours/24)+'j' : step.delay_hours+'h'}</span>}
              </div>
              {i < workflow.steps.length - 1 && <ChevronRight className='w-3 h-3 text-slate-700 flex-shrink-0' />}
            </React.Fragment>
          );
        })}
      </div>
      <div className='flex gap-2'>
        <button onClick={() => setShowTest(!showTest)} className='flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl text-xs font-medium transition-all'>
          <Play className='w-3.5 h-3.5' /> Tester
        </button>
      </div>
      {showTest && (
        <div className='mt-3 p-3 rounded-xl bg-white/3 border border-white/10'>
          <p className='text-xs font-semibold text-slate-400 mb-2'>Tester sur un lead :</p>
          <div className='flex gap-2'>
            <select value={testLead} onChange={e => setTestLead(e.target.value)} className='flex-1 px-3 py-2 bg-white/5 border border-white/10 text-slate-200 rounded-xl text-xs'>
              <option value='' className='bg-slate-800'>Selectionnez...</option>
              {leads.map(l => <option key={l.lead_id} value={l.lead_id} className='bg-slate-800'>{l.name}</option>)}
            </select>
            <button onClick={handleTest} disabled={testing} className='px-3 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold disabled:opacity-60'>
              {testing ? <div className='w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin' /> : <Send className='w-3.5 h-3.5' />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const WorkflowBuilder = () => {
  const [workflows, setWorkflows] = useState([]);
  const [stats, setStats] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workflows');
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [wfRes, statsRes, execRes, leadsRes] = await Promise.all([
        axios.get(API_URL + '/workflows/', { withCredentials: true }),
        axios.get(API_URL + '/workflows/stats', { withCredentials: true }),
        axios.get(API_URL + '/workflows/executions', { withCredentials: true }),
        axios.get(API_URL + '/leads?limit=30', { withCredentials: true }),
      ]);
      // Handle paginated response formats
      const wfData = wfRes.data;
      setWorkflows(Array.isArray(wfData) ? wfData : (wfData?.items || wfData?.workflows || []));
      setStats(statsRes.data);
      const execData = execRes.data;
      setExecutions(Array.isArray(execData) ? execData : (execData?.items || execData?.executions || []));
      const leadData = leadsRes.data;
      setLeads(Array.isArray(leadData) ? leadData : (leadData?.items || leadData?.leads || []));
    } catch(e) { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  const handleToggle = async (wfId) => {
    try {
      const res = await axios.patch(API_URL + '/workflows/' + wfId + '/toggle', {}, { withCredentials: true });
      setWorkflows(prev => prev.map(wf => wf.workflow_id === wfId ? {...wf, is_active: res.data.is_active} : wf));
      toast.success(res.data.is_active ? 'Workflow active!' : 'Workflow desactive');
    } catch { toast.error('Erreur'); }
  };

  const handleTest = async (wfId, leadId) => {
    await axios.post(API_URL + '/workflows/' + wfId + '/test', { lead_id: leadId }, { withCredentials: true });
    fetchAll();
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      await axios.post(API_URL + '/workflows/process', {}, { withCredentials: true });
      toast.success('Executions traitees!');
      fetchAll();
    } catch { toast.error('Erreur'); } finally { setProcessing(false); }
  };

  const STATUS_CFG = {
    completed: {color:'#34d399',bg:'rgba(52,211,153,0.1)',label:'Envoye'},
    scheduled: {color:'#f59e0b',bg:'rgba(245,158,11,0.1)',label:'Programme'},
    failed: {color:'#f43f5e',bg:'rgba(244,63,94,0.1)',label:'Echec'},
  };

  return (
    <div className='p-4 md:p-6 lg:p-8 space-y-5 animate-fade-in'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <Zap className='w-5 h-5 text-violet-400' />
            <h1 className='text-2xl font-bold text-slate-100' style={{fontFamily:'Manrope,sans-serif'}}>Workflow Builder</h1>
          </div>
          <p className='text-slate-500 text-sm'>Automatisez vos relances — emails naturels, rediges comme un humain</p>
        </div>
        <div className='flex items-center gap-2'>
          <button onClick={fetchAll} className='p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 border border-white/5'>
            <RefreshCw className='w-4 h-4' />
          </button>
          <button onClick={handleProcess} disabled={processing} className='flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm disabled:opacity-60'>
            {processing ? <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' /> : <Play className='w-4 h-4' />}
            Traiter maintenant
          </button>
        </div>
      </div>

      {stats && (
        <div className='grid grid-cols-2 lg:grid-cols-5 gap-3'>
          {[
            {label:'Actifs', value:workflows.filter(w=>w.is_active).length, icon:Zap, color:'#a78bfa'},
            {label:'Total executions', value:stats.total||0, icon:CheckCircle, color:'#60a5fa'},
            {label:'Terminees', value:stats.completed||0, icon:CheckCircle, color:'#34d399'},
            {label:'Programmees', value:stats.scheduled||0, icon:Clock, color:'#f59e0b'},
            {label:'Emails envoyes', value:stats.emails_sent||0, icon:Mail, color:'#60a5fa'},
          ].map((m,i) => (
            <div key={i} className='metric-card'>
              <div className='w-8 h-8 rounded-lg flex items-center justify-center mb-2' style={{background:m.color+'15',border:'1px solid '+m.color+'30'}}>
                <m.icon className='w-4 h-4' style={{color:m.color}} />
              </div>
              <p className='text-xl font-bold text-slate-100'>{m.value}</p>
              <p className='text-xs text-slate-500'>{m.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className='flex gap-1 bg-white/3 rounded-2xl border border-white/5 p-1.5'>
        {[{id:'workflows',label:'Workflows',icon:Zap},{id:'history',label:'Historique',icon:Clock},{id:'templates',label:'Emails',icon:Mail}].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ' + (activeTab===tab.id?'bg-violet-600 text-white':'text-slate-500 hover:text-slate-300')}>
            <tab.icon className='w-4 h-4' />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'workflows' && (
        loading ? (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {[...Array(4)].map((_,i) => <div key={i} className='skeleton h-48 rounded-2xl' />)}
          </div>
        ) : (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {workflows.map(wf => <WorkflowCard key={wf.workflow_id} workflow={wf} onToggle={handleToggle} onTest={handleTest} leads={leads} />)}
          </div>
        )
      )}

      {activeTab === 'history' && (
        <div className='section-card p-5'>
          <h3 className='text-sm font-semibold text-slate-200 mb-4'>Historique des executions</h3>
          {executions.length > 0 ? (
            <div className='space-y-2'>
              {executions.slice(0,30).map((exec, i) => {
                const cfg = STATUS_CFG[exec.status] || STATUS_CFG.scheduled;
                const Icon = STEP_ICONS[exec.step_type] || Zap;
                return (
                  <div key={i} className='flex items-center gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-all'>
                    <div className='w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0' style={{background:cfg.bg,border:'1px solid '+cfg.color+'30'}}>
                      <Icon className='w-4 h-4' style={{color:cfg.color}} />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-semibold text-slate-200 truncate'>{exec.workflow_name}</p>
                      <p className='text-[10px] text-slate-500'>{exec.step_label} — {exec.lead_name}</p>
                    </div>
                    <span className='px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0' style={{background:cfg.bg,color:cfg.color}}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className='text-center py-12 text-slate-600'>
              <Clock className='w-12 h-12 mx-auto mb-3 opacity-30' />
              <p className='text-sm'>Aucune execution</p>
              <p className='text-xs mt-1'>Activez un workflow et testez-le</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'templates' && (
        <div className='section-card p-5'>
          <h3 className='text-sm font-semibold text-slate-200 mb-1'>Emails rediges comme un humain</h3>
          <p className='text-xs text-slate-500 mb-4'>Chaque email est personnalise. Ton naturel, pas robotique.</p>
          <div className='space-y-2'>
            {[
              {label:'Email de bienvenue', timing:'Immediat', color:'#a78bfa'},
              {label:'Relance J+1', timing:'24h apres', color:'#60a5fa'},
              {label:'Relance finale J+2', timing:'48h apres', color:'#f43f5e'},
              {label:'Accompagnement devis', timing:'A envoi devis', color:'#34d399'},
              {label:'Relance devis J+2', timing:'48h apres devis', color:'#f59e0b'},
              {label:'Lead chaud urgent', timing:'Immediat', color:'#f43f5e'},
              {label:'Demande avis client', timing:'24h apres intervention', color:'#06b6d4'},
              {label:'Nurturing conseils', timing:'Semaine 1', color:'#34d399'},
              {label:'Nurturing offre speciale', timing:'Semaine 2', color:'#a78bfa'},
            ].map((t,i) => (
              <div key={i} className='flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5'>
                <div className='w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0' style={{background:t.color+'15',border:'1px solid '+t.color+'30'}}>
                  <Mail className='w-4 h-4' style={{color:t.color}} />
                </div>
                <div className='flex-1'>
                  <p className='text-sm font-semibold text-slate-200'>{t.label}</p>
                  <p className='text-xs text-slate-500'>{t.timing}</p>
                </div>
                <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'>Actif</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowBuilder;
