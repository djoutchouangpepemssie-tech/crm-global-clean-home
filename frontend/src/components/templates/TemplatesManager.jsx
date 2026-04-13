import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../shared';
import axios from 'axios';
import {
  Plus, Trash2, Copy, Edit2, X, Save, Mail, FileText,
  MessageSquare, Search, RefreshCw, Eye, CheckCircle, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '../shared/ConfirmDialog';
import BACKEND_URL from '../../config.js';
const API_URL = BACKEND_URL + '/api';

const TYPES = [
  { id: 'email',      label: 'Email',          icon: Mail,        color: '#8b5cf6' },
  { id: 'note',       label: 'Note interne',   icon: FileText,    color: '#60a5fa' },
  { id: 'sms',        label: 'SMS',            icon: MessageSquare, color: '#10b981' },
  { id: 'devis',      label: 'Devis',          icon: FileText,    color: '#f97316' },
  { id: 'relance',    label: 'Relance',        icon: Mail,        color: '#f43f5e' },
];

const VARIABLES = [
  '{prenom}', '{nom}', '{email}', '{service}', '{adresse}', '{montant}', '{date}', '{intervenant}'
];

const inputCls = "w-full px-3 py-2.5 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all";

const TemplatesManager = ({ onSelectTemplate }) => {
  const { confirm, ConfirmElement } = useConfirm();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({ name: '', type: 'email', subject: '', content: '' });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/templates`, { withCredentials: true });
      setTemplates(Array.isArray(res.data) ? res.data : []);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.content) { toast.error('Nom et contenu requis'); return; }
    try {
      if (editingTemplate) {
        await axios.put(`${API_URL}/templates/${editingTemplate.template_id||editingTemplate.id}`, form, { withCredentials: true });
        toast.success('✅ Template mis à jour');
      } else {
        await axios.post(`${API_URL}/templates`, form, { withCredentials: true });
        toast.success('✅ Template créé');
      }
      setShowForm(false);
      setEditingTemplate(null);
      setForm({ name: '', type: 'email', subject: '', content: '' });
      fetchTemplates();
    } catch { toast.error('Erreur sauvegarde'); }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setForm({
      name: template.name || '',
      type: template.type || 'email',
      subject: template.subject || '',
      content: template.content || '',
    });
    setShowForm(true);
    setPreviewTemplate(null);
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Supprimer ce template ?',
      description: 'Cette action est irréversible.',
      variant: 'danger',
      confirmText: 'Supprimer',
    });
    if (!ok) return;
    try {
      await axios.delete(`${API_URL}/templates/${id}`, { withCredentials: true });
      toast.success('Template supprimé');
      fetchTemplates();
    } catch { toast.error('Erreur suppression'); }
  };

  const handleCopy = (template) => {
    navigator.clipboard.writeText(template.content || '');
    toast.success('📋 Contenu copié !');
  };

  const insertVariable = (variable) => {
    const textarea = document.getElementById('template-content');
    if (!textarea) {
      setForm(p => ({ ...p, content: p.content + variable }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = form.content.slice(0, start) + variable + form.content.slice(end);
    setForm(p => ({ ...p, content: newContent }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const filtered = templates.filter(t => {
    if (filterType && t.type !== filterType) return false;
    if (search && !(t.name || '').toLowerCase().includes(search.toLowerCase()) &&
        !(t.content || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-violet-400"/>
            </div>
            <h1 className="text-2xl font-black text-slate-100" style={{fontFamily:'Manrope,sans-serif'}}>Templates</h1>
          </div>
          <p className="text-slate-500 text-sm ml-10">{templates.length} template(s) · Emails, SMS, Notes</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchTemplates} className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>
          </button>
          <button onClick={()=>{ setEditingTemplate(null); setForm({name:'',type:'email',subject:'',content:''}); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)',boxShadow:'0 4px 16px rgba(124,58,237,0.3)'}}>
            <Plus className="w-4 h-4"/> Nouveau template
          </button>
        </div>
      </div>

      {/* FILTRES */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Rechercher un template..."
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"/>
        </div>
        <div className="flex gap-1.5 bg-white/5 rounded-xl border border-white/5 p-1">
          <button onClick={()=>setFilterType('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType===''?'bg-violet-600 text-white':'text-slate-500 hover:text-slate-300'}`}>
            Tous
          </button>
          {TYPES.map(t=>(
            <button key={t.id} onClick={()=>setFilterType(filterType===t.id?'':t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType===t.id?'text-white':'text-slate-500 hover:text-slate-300'}`}
              style={filterType===t.id?{background:t.color}:{}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTE */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_,i)=><div key={i} className="skeleton h-40 rounded-2xl"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="section-card flex flex-col items-center justify-center py-16 gap-4">
          <FileText className="w-14 h-14 text-slate-700"/>
          <p className="text-slate-500 font-semibold">Aucun template</p>
          <button onClick={()=>setShowForm(true)}
            className="px-5 py-2.5 text-white rounded-xl text-sm font-bold"
            style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
            + Créer le premier template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(template=>{
            const typeConfig = TYPES.find(t=>t.id===template.type)||TYPES[0];
            return (
              <div key={template.template_id||template.id}
                className="section-card p-5 hover:border-white/10 transition-all group">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{background:`${typeConfig.color}20`,border:`1px solid ${typeConfig.color}30`}}>
                      <typeConfig.icon className="w-4 h-4" style={{color:typeConfig.color}}/>
                    </div>
                    <div>
                      <p className="font-bold text-slate-200 text-sm">{template.name}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{background:`${typeConfig.color}15`,color:typeConfig.color}}>
                        {typeConfig.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sujet si email */}
                {template.subject && (
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <Tag className="w-3 h-3"/> {template.subject}
                  </p>
                )}

                {/* Aperçu contenu */}
                <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-3">
                  {template.content}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={()=>setPreviewTemplate(template)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
                    <Eye className="w-3.5 h-3.5"/> Voir
                  </button>
                  <button onClick={()=>handleEdit(template)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border border-violet-500/20 text-violet-400 hover:bg-violet-500/10 transition-all">
                    <Edit2 className="w-3.5 h-3.5"/> Modifier
                  </button>
                  <button onClick={()=>handleCopy(template)}
                    className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                    title="Copier le contenu">
                    <Copy className="w-3.5 h-3.5"/>
                  </button>
                  <button onClick={()=>handleDelete(template.template_id||template.id)}
                    className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>

                {/* Bouton sélectionner si callback */}
                {onSelectTemplate && (
                  <button onClick={()=>onSelectTemplate(template)}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white transition-all"
                    style={{background:`linear-gradient(135deg,${typeConfig.color},${typeConfig.color}cc)`}}>
                    <CheckCircle className="w-3.5 h-3.5"/> Utiliser ce template
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL APERÇU */}
      {previewTemplate && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.8)'}}
          onClick={()=>setPreviewTemplate(null)}>
          <div className="rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
            style={{background:'var(--bg-card)',border:'1px solid var(--border-default)'}}
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-100">{previewTemplate.name}</h3>
              <button onClick={()=>setPreviewTemplate(null)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl">
                <X className="w-4 h-4"/>
              </button>
            </div>
            {previewTemplate.subject && (
              <div className="mb-3 p-3 rounded-xl bg-white/3 border border-white/5">
                <p className="text-xs font-bold text-slate-400 mb-1">Sujet</p>
                <p className="text-sm text-slate-200">{previewTemplate.subject}</p>
              </div>
            )}
            <div className="p-4 rounded-xl bg-white/3 border border-white/5">
              <p className="text-xs font-bold text-slate-400 mb-2">Contenu</p>
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{previewTemplate.content}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>{ handleCopy(previewTemplate); setPreviewTemplate(null); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5">
                <Copy className="w-4 h-4"/> Copier
              </button>
              <button onClick={()=>{ handleEdit(previewTemplate); setPreviewTemplate(null); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
                <Edit2 className="w-4 h-4"/> Modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION/ÉDITION */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{background:'rgba(0,0,0,0.8)'}}
          onClick={()=>{ setShowForm(false); setEditingTemplate(null); }}>
          <div className="rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{background:'var(--bg-card)',border:'1px solid var(--border-default)'}}
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-slate-100">
                {editingTemplate ? '✏️ Modifier le template' : '✨ Nouveau template'}
              </h3>
              <button onClick={()=>{ setShowForm(false); setEditingTemplate(null); }}
                className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-xl">
                <X className="w-4 h-4"/>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom *</label>
                  <input required value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                    placeholder="Ex: Email de bienvenue" className={inputCls}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Type</label>
                  <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} className={inputCls}>
                    {TYPES.map(t=><option key={t.id} value={t.id} className="bg-slate-800">{t.label}</option>)}
                  </select>
                </div>
              </div>

              {(form.type==='email'||form.type==='relance') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Sujet de l&apos;email</label>
                  <input value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))}
                    placeholder="Ex: Votre devis Global Clean Home" className={inputCls}/>
                </div>
              )}

              {/* Variables disponibles */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Variables disponibles <span className="text-slate-600">(cliquez pour insérer)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map(v=>(
                    <button key={v} type="button" onClick={()=>insertVariable(v)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-violet-500/20 text-violet-400 hover:bg-violet-500/10 transition-all">
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Contenu *</label>
                <textarea id="template-content" required value={form.content}
                  onChange={e=>setForm(p=>({...p,content:e.target.value}))}
                  rows={10} placeholder="Bonjour {prenom},&#10;&#10;Suite à votre demande..."
                  className={`${inputCls} resize-none font-mono text-xs leading-relaxed`}/>
                <p className="text-[10px] text-slate-600 text-right mt-0.5">{form.content.length} caractères</p>
              </div>

              {/* Prévisualisation */}
              {form.content && (
                <div className="p-4 rounded-xl border border-white/5 bg-white/2">
                  <p className="text-xs font-bold text-slate-400 mb-2">📄 Aperçu</p>
                  <p className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">
                    {form.content
                      .replace('{prenom}','Marie')
                      .replace('{nom}','Dupont')
                      .replace('{service}','Ménage')
                      .replace('{montant}','150€')
                      .replace('{date}',new Date().toLocaleDateString('fr-FR'))
                      .replace('{intervenant}','Jean')
                      .replace('{adresse}','10 Rue de la Paix, Paris')
                      .replace('{email}','marie@email.com')
                    }
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>{ setShowForm(false); setEditingTemplate(null); }}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl text-sm font-bold">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-3 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
                  <Save className="w-4 h-4"/>
                  {editingTemplate ? 'Mettre à jour' : 'Créer le template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmElement />
    </div>
  );
};

export default TemplatesManager;
