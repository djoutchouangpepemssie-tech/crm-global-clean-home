import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '../shared';
import api from '../../lib/api';
import {
  Plus, Trash2, Copy, Edit2, X, Save, Mail, FileText,
  MessageSquare, Search, RefreshCw, Eye, Tag, Send,
  Sparkles, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '../shared/ConfirmDialog';

const TYPES = [
  { id: 'email',   label: 'Email',        icon: Mail,            color: 'var(--brand,#047857)' },
  { id: 'note',    label: 'Note interne', icon: FileText,        color: '#60a5fa' },
  { id: 'sms',     label: 'SMS',          icon: MessageSquare,   color: '#10b981' },
  { id: 'devis',   label: 'Devis',        icon: FileText,        color: '#f97316' },
  { id: 'relance', label: 'Relance',      icon: Mail,            color: '#c2410c' },
];

const VARIABLES = [
  { key: '{prenom}',      label: 'Prénom',       mock: 'Marie' },
  { key: '{nom}',         label: 'Nom',          mock: 'Dupont' },
  { key: '{email}',       label: 'Email',        mock: 'marie.dupont@example.com' },
  { key: '{service}',     label: 'Service',      mock: 'Ménage à domicile' },
  { key: '{adresse}',     label: 'Adresse',      mock: '12 rue de la Paix, 75008 Paris' },
  { key: '{montant}',     label: 'Montant',      mock: '180€' },
  { key: '{date}',        label: 'Date',         mock: new Date().toLocaleDateString('fr-FR') },
  { key: '{intervenant}', label: 'Intervenant',  mock: 'Sophie M.' },
];

function fillVariables(text, customMock = {}) {
  if (!text) return '';
  let out = text;
  VARIABLES.forEach((v) => {
    const value = customMock[v.key] ?? v.mock;
    out = out.split(v.key).join(value);
  });
  return out;
}

// Templates par défaut proposés au premier lancement
const DEFAULT_TEMPLATES = [
  {
    name: 'Réponse devis express',
    type: 'email',
    subject: 'Votre devis Global Clean Home — {service}',
    content: `Bonjour {prenom},

Suite à votre demande pour un service de {service} à {adresse}, voici votre devis :

Montant : {montant}
Intervenant prévu : {intervenant}
Date proposée : {date}

Pour confirmer ou poser une question, répondez simplement à cet email.

À très bientôt,
L'équipe Global Clean Home`,
  },
  {
    name: 'Relance 48h après devis',
    type: 'relance',
    subject: 'Petite question sur votre devis ?',
    content: `Bonjour {prenom},

Je voulais m'assurer que vous aviez bien reçu votre devis de {montant} pour {service}.

Si vous avez la moindre question (tarif, date d'intervention, prestations incluses), je suis disponible — répondez à cet email ou appelez le 06 22 66 53 08.

Cordialement,
Global Clean Home`,
  },
  {
    name: 'Confirmation rendez-vous',
    type: 'email',
    subject: 'Votre rendez-vous est confirmé — {date}',
    content: `Bonjour {prenom},

C'est confirmé : {intervenant} interviendra chez vous le {date} à {adresse} pour votre {service}.

Quelques informations pratiques :
- Durée estimée : ~2 heures
- Matériel : nous apportons tout
- Vous n'avez rien à préparer

À très bientôt,
L'équipe Global Clean Home`,
  },
  {
    name: 'Remerciement après intervention',
    type: 'email',
    subject: 'Merci pour votre confiance, {prenom}',
    content: `Bonjour {prenom},

Nous espérons que vous êtes ravi du travail réalisé par {intervenant}.

Si vous avez une minute, votre avis sur Google nous aide énormément :
https://g.page/r/CXxxxxxxxxx/review

Et n'hésitez pas pour vos prochains besoins de nettoyage.

Bien à vous,
Global Clean Home`,
  },
];

export default function TemplatesManager({ onSelectTemplate }) {
  const { confirm, ConfirmElement } = useConfirm();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({ name: '', type: 'email', subject: '', content: '' });
  const [testing, setTesting] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/templates');
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erreur chargement templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleSeedDefaults = async () => {
    const ok = await confirm({
      title: 'Créer 4 templates par défaut ?',
      description: 'On va créer 4 modèles prêts à l\'emploi : réponse devis, relance 48h, confirmation RDV, remerciement post-intervention. Tu pourras les modifier après.',
    });
    if (!ok) return;
    try {
      for (const t of DEFAULT_TEMPLATES) {
        await api.post('/templates', t);
      }
      toast.success(`${DEFAULT_TEMPLATES.length} templates créés ✓`);
      fetchTemplates();
    } catch {
      toast.error('Erreur création templates par défaut');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.content) { toast.error('Nom et contenu requis'); return; }
    try {
      if (editingTemplate) {
        await api.put(`/templates/${editingTemplate.template_id || editingTemplate.id}`, form);
        toast.success('Template mis à jour ✓');
      } else {
        await api.post('/templates', form);
        toast.success('Template créé ✓');
      }
      setShowForm(false);
      setEditingTemplate(null);
      setForm({ name: '', type: 'email', subject: '', content: '' });
      fetchTemplates();
    } catch {
      toast.error('Erreur sauvegarde');
    }
  };

  const handleEdit = (t) => {
    setEditingTemplate(t);
    setForm({ name: t.name || '', type: t.type || 'email', subject: t.subject || '', content: t.content || '' });
    setShowForm(true);
    setPreviewTemplate(null);
  };

  const handleDuplicate = async (t) => {
    try {
      await api.post('/templates', {
        name: `${t.name} (copie)`, type: t.type, subject: t.subject, content: t.content,
      });
      toast.success('Template dupliqué');
      fetchTemplates();
    } catch {
      toast.error('Erreur duplication');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Supprimer ce template ?',
      description: 'Cette action est définitive.',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/templates/${id}`);
      toast.success('Supprimé');
      fetchTemplates();
    } catch {
      toast.error('Erreur suppression');
    }
  };

  const handleCopy = (t) => {
    try {
      navigator.clipboard.writeText(fillVariables(t.content));
      toast.success('Copié dans le presse-papier (avec variables remplies)');
    } catch {
      toast.error('Copie impossible');
    }
  };

  const handleTestSend = async (t) => {
    // Envoie le template à l'email de l'utilisateur courant pour qu'il voie le rendu
    setTesting(true);
    try {
      const me = await api.get('/auth/me').catch(() => ({ data: null }));
      const myEmail = me?.data?.email;
      if (!myEmail) {
        toast.error('Email utilisateur introuvable — connecte-toi avec un compte qui a un email');
        return;
      }
      const filledSubject = fillVariables(t.subject || `[Test] ${t.name}`);
      const filledHtml = `<div style="font-family:Inter,system-ui,sans-serif;line-height:1.6;color:#1f2937">
        <div style="background:#f3f4f6;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:12px;color:#6b7280">
          🧪 Test du template <strong>${t.name}</strong> envoyé depuis le CRM (variables remplies avec données fictives)
        </div>
        <div style="white-space:pre-wrap">${fillVariables(t.content).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>
      </div>`;
      await api.post('/emails/send', {
        to: myEmail,
        subject: `[Test] ${filledSubject}`,
        html: filledHtml,
        type: 'test_template',
      });
      toast.success(`Email envoyé à ${myEmail} ✓`);
    } catch (e) {
      const msg = e?.message || 'Échec envoi';
      toast.error(`Test échoué : ${msg}. Vérifie que Gmail est connecté.`);
    } finally {
      setTesting(false);
    }
  };

  const insertVariable = (varKey) => {
    const textarea = document.getElementById('template-content');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = form.content.slice(0, start);
    const after = form.content.slice(end);
    const newContent = before + varKey + after;
    setForm((p) => ({ ...p, content: newContent }));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varKey.length, start + varKey.length);
    }, 0);
  };

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (filterType && t.type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        return (t.name || '').toLowerCase().includes(q) ||
               (t.content || '').toLowerCase().includes(q) ||
               (t.subject || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [templates, search, filterType]);

  const isEmpty = !loading && templates.length === 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Templates"
        subtitle="Modèles de messages réutilisables pour répondre vite et bien"
        actions={
          <div className="flex gap-2">
            <button onClick={fetchTemplates} className="px-3 py-2 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 flex items-center gap-2 text-sm">
              <RefreshCw size={14} /> Actualiser
            </button>
            <button onClick={() => { setEditingTemplate(null); setForm({ name: '', type: 'email', subject: '', content: '' }); setShowForm(true); }}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-2 text-sm font-semibold">
              <Plus size={14} /> Nouveau template
            </button>
          </div>
        }
      />

      {/* Onboarding : seed templates par défaut si la liste est vide */}
      {isEmpty && (
        <div className="glass rounded-2xl p-8 text-center my-8" style={{ borderRadius: 'var(--lg-radius-lg, 24px)' }}>
          <Sparkles className="w-12 h-12 mx-auto text-brand-600 mb-3" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-1" style={{ fontFamily: 'Fraunces, serif' }}>
            Aucun template pour le moment
          </h3>
          <p className="text-sm text-neutral-600 mb-5 max-w-md mx-auto">
            Démarre avec 4 modèles prêts à l'emploi : réponse devis, relance 48h, confirmation RDV, remerciement post-intervention.
          </p>
          <button onClick={handleSeedDefaults}
            className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold inline-flex items-center gap-2">
            <Sparkles size={16} /> Créer les 4 templates par défaut
          </button>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* Filtres */}
          <div className="flex gap-3 my-6 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un template…"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-neutral-200 text-sm" />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-neutral-200 text-sm bg-white">
              <option value="">Tous types</option>
              {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          {/* Grille de templates */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => {
              const TypeMeta = TYPES.find((x) => x.id === t.type) || TYPES[0];
              const TypeIcon = TypeMeta.icon;
              return (
                <div key={t.template_id || t.id} className="bg-white border border-neutral-200 rounded-xl p-5 flex flex-col gap-3 hover:border-brand-300 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <TypeIcon size={14} style={{ color: TypeMeta.color }} />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">{TypeMeta.label}</span>
                      </div>
                      <h3 className="font-semibold text-neutral-900 truncate" style={{ fontFamily: 'Fraunces, serif' }}>
                        {t.name}
                      </h3>
                      {t.subject && <p className="text-xs text-neutral-500 mt-0.5 truncate italic">{t.subject}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed">{t.content}</p>
                  <div className="flex gap-1 mt-auto pt-2 border-t border-neutral-100">
                    <button onClick={() => setPreviewTemplate(t)}
                      className="flex-1 py-1.5 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100 flex items-center justify-center gap-1">
                      <Eye size={12} /> Voir
                    </button>
                    <button onClick={() => handleEdit(t)}
                      className="flex-1 py-1.5 rounded-lg text-xs text-neutral-600 hover:bg-neutral-100 flex items-center justify-center gap-1">
                      <Edit2 size={12} /> Modifier
                    </button>
                    <button onClick={() => handleDuplicate(t)}
                      className="py-1.5 px-2 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100" title="Dupliquer">
                      <Copy size={12} />
                    </button>
                    <button onClick={() => handleDelete(t.template_id || t.id)}
                      className="py-1.5 px-2 rounded-lg text-xs text-red-500 hover:bg-red-50" title="Supprimer">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {onSelectTemplate && (
                    <button onClick={() => onSelectTemplate(t)}
                      className="w-full py-2 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold flex items-center justify-center gap-1">
                      Utiliser <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* MODAL PREVIEW avec substitution variables */}
      {previewTemplate && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 modal-overlay" onClick={() => setPreviewTemplate(null)}>
          <div className="glass-elevated p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto" style={{ borderRadius: 'var(--lg-radius-lg, 24px)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900" style={{ fontFamily: 'Fraunces, serif' }}>
                  {previewTemplate.name}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">Aperçu avec données fictives (Marie Dupont, Paris 8…)</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg">
                <X size={16} />
              </button>
            </div>

            {previewTemplate.subject && (
              <div className="mb-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">Sujet</p>
                <p className="text-sm text-neutral-900">{fillVariables(previewTemplate.subject)}</p>
              </div>
            )}
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 mb-4">
              <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">Contenu (rendu)</p>
              <p className="text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">
                {fillVariables(previewTemplate.content)}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleCopy(previewTemplate)}
                className="flex-1 min-w-[140px] py-2.5 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-sm font-semibold flex items-center justify-center gap-2">
                <Copy size={14} /> Copier rempli
              </button>
              <button onClick={() => handleTestSend(previewTemplate)} disabled={testing}
                className="flex-1 min-w-[140px] py-2.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                <Send size={14} /> {testing ? 'Envoi…' : 'Tester sur mon mail'}
              </button>
              <button onClick={() => { handleEdit(previewTemplate); }}
                className="flex-1 min-w-[140px] py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold flex items-center justify-center gap-2">
                <Edit2 size={14} /> Modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION / ÉDITION */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 modal-overlay" onClick={() => { setShowForm(false); setEditingTemplate(null); }}>
          <div className="glass-elevated p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ borderRadius: 'var(--lg-radius-lg, 24px)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-neutral-900" style={{ fontFamily: 'Fraunces, serif' }}>
                {editingTemplate ? 'Modifier le template' : 'Nouveau template'}
              </h3>
              <button onClick={() => { setShowForm(false); setEditingTemplate(null); }}
                className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Nom *</label>
                  <input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Email de bienvenue"
                    className="w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Type</label>
                  <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm">
                    {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              {(form.type === 'email' || form.type === 'relance') && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Sujet de l'email</label>
                  <input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                    placeholder="Ex: Votre devis Global Clean Home — {service}"
                    className="w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm" />
                </div>
              )}

              {/* Variables disponibles — cliquables */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-2">
                  Variables <span className="text-neutral-400 font-normal">(clique pour insérer au curseur)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <button key={v.key} type="button" onClick={() => insertVariable(v.key)}
                      title={`Ex: ${v.mock}`}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono border border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 transition-all">
                      {v.key}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Contenu *</label>
                <textarea id="template-content" required value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  rows={10} placeholder={`Bonjour {prenom},\n\nSuite à votre demande pour {service}, voici votre devis de {montant}.\n\nÀ très bientôt,\nGlobal Clean Home`}
                  className="w-full px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/40" />
                <p className="text-[10px] text-neutral-400 text-right mt-0.5">{form.content.length} caractères</p>
              </div>

              {/* Preview avec substitution */}
              {form.content && (
                <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/40">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-brand-700 mb-2">
                    Aperçu (rendu avec données fictives)
                  </p>
                  <p className="text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">
                    {fillVariables(form.content)}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditingTemplate(null); }}
                  className="flex-1 px-4 py-3 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-xl text-sm font-semibold">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                  <Save size={14} />
                  {editingTemplate ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmElement />
    </div>
  );
}
