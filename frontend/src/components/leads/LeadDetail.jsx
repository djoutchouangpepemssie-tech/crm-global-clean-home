/**
 * LeadDetail — ATELIER direction
 * Crème / Fraunces / émeraude (brand) / terracotta (accent)
 * Logique 100% préservée.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Phone, Mail, MessageSquare, FileText, CheckSquare, Activity,
  MapPin, Calendar, Globe, TrendingUp, Send, Plus, Save,
  Sparkles, Clock, User, Tag, Hash,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useLead, useUpdateLead, useQuotesByLead, useTasksByLead,
  useSendQuote, useInteractionsByLead, useCreateInteraction,
} from '../../hooks/api';
import { PageHeader, StatusBadge, EmptyState, useConfirm } from '../shared';
import { relativeTime, shortDateTime, shortDate } from '../../lib/dates';
import { getAllowedNextStatuses, LEAD_STATUS_LABELS } from '../../lib/leadStatus';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import BACKEND_URL from '../../config.js';

// ── Score circulaire (palette atelier) ──────────────────────────
function ScoreCircle({ score = 0, size = 140 }) {
  const s = Math.min(100, Math.max(0, score));
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (s / 100) * circumference;
  // Froid → Tiède → Chaud → Brûlant : encre → amber → terracotta → émeraude
  const color = s < 30 ? '#64748b' : s < 60 ? '#d97706' : s < 80 ? '#c2410c' : '#047857';
  const label = s < 30 ? 'Froid' : s < 60 ? 'Tiède' : s < 80 ? 'Chaud' : 'Brûlant';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius}
          stroke="#e5e0d6" strokeWidth="8" fill="none" />
        <circle cx={size/2} cy={size/2} r={radius}
          stroke={color} strokeWidth="8" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 0.61, 0.36, 1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-semibold text-4xl text-neutral-900 leading-none">{s}</span>
        <span className="text-[10px] uppercase tracking-[0.15em] font-mono mt-1" style={{ color }}>
          {label}
        </span>
      </div>
    </div>
  );
}

// ── Info row ────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, href }) {
  if (!value) return null;
  const content = (
    <div className="flex items-start gap-3 py-2.5 text-sm">
      <Icon className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.08em] font-mono text-neutral-500">{label}</div>
        <div className="text-neutral-900 truncate mt-0.5">{value}</div>
      </div>
    </div>
  );
  return href ? (
    <a href={href} className="block hover:bg-neutral-50 rounded-lg -mx-2 px-2 transition-colors">{content}</a>
  ) : content;
}

// ── Timeline item (palette atelier) ─────────────────────────────
function TimelineItem({ item }) {
  const icons = {
    note:    { Icon: FileText,      color: 'text-neutral-600 bg-neutral-100' },
    appel:   { Icon: Phone,         color: 'text-brand-700 bg-brand-50' },
    email:   { Icon: Mail,          color: 'text-neutral-700 bg-neutral-100' },
    sms:     { Icon: MessageSquare, color: 'text-brand-700 bg-brand-50' },
    relance: { Icon: Sparkles,      color: 'text-terracotta-700 bg-terracotta-50' },
    quote:   { Icon: FileText,      color: 'text-terracotta-700 bg-terracotta-50' },
    task:    { Icon: CheckSquare,   color: 'text-brand-700 bg-brand-50' },
  };
  const { Icon, color } = icons[item.type] || icons.note;

  return (
    <div className="relative flex gap-4 group">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 w-px bg-neutral-200 mt-1" />
      </div>
      <div className="flex-1 min-w-0 pb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-neutral-900">{item.title}</span>
          {item.badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-mono uppercase tracking-wider">
              {item.badge}
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-sm text-neutral-600 mt-1 leading-relaxed whitespace-pre-wrap">
            {item.description}
          </p>
        )}
        <div className="text-xs text-neutral-400 mt-1.5 font-mono">
          {relativeTime(item.date)} · {shortDateTime(item.date)}
        </div>
      </div>
    </div>
  );
}

// Helper : classe bouton primaire atelier
const primaryBtn = "bg-neutral-900 hover:bg-neutral-800 text-white";

// ══════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════
export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm, ConfirmElement } = useConfirm();

  const [activeTab, setActiveTab] = useState('overview');
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [newInteraction, setNewInteraction] = useState({ type: 'note', content: '' });

  const { data: lead, isLoading, error } = useLead(id);
  const { data: interactions = [] } = useInteractionsByLead(id);
  const { data: quotes = [] } = useQuotesByLead(id);
  const { data: tasks = [] } = useTasksByLead(id);

  const updateLead = useUpdateLead();
  const createInteraction = useCreateInteraction();
  const sendQuote = useSendQuote();

  useEffect(() => {
    if (lead?.notes !== undefined && !notesDirty) setNotes(lead.notes || '');
  }, [lead?.notes, notesDirty]);

  const timeline = useMemo(() => {
    const items = [];
    interactions.forEach((i) => {
      items.push({
        id: `i-${i.interaction_id || i.id}`,
        type: i.type || 'note',
        title: ({ note: 'Note ajoutée', appel: 'Appel enregistré', email: 'Email envoyé',
                  sms: 'SMS envoyé', relance: 'Relance effectuée' })[i.type] || 'Interaction',
        description: i.content,
        date: i.created_at,
      });
    });
    quotes.forEach((q) => {
      items.push({
        id: `q-${q.quote_id}`,
        type: 'quote',
        title: `Devis ${q.quote_number || (q.quote_id ? q.quote_id.slice(0, 8) : '')}`,
        badge: q.status,
        description: q.amount ? `${Number(q.amount).toLocaleString('fr-FR')} € HT` : null,
        date: q.created_at,
      });
    });
    tasks.forEach((t) => {
      items.push({
        id: `t-${t.task_id || t.id}`,
        type: 'task',
        title: t.title || 'Tâche',
        badge: t.status,
        description: t.description,
        date: t.created_at || t.due_date,
      });
    });
    return items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [interactions, quotes, tasks]);

  const handleStatusChange = async (nextStatus) => {
    await updateLead.mutateAsync({ leadId: id, payload: { status: nextStatus } });
    toast.success(`Statut changé en "${LEAD_STATUS_LABELS[nextStatus]}"`);
  };

  const handleSaveNotes = async () => {
    await updateLead.mutateAsync({ leadId: id, payload: { notes } });
    setNotesDirty(false);
    toast.success('Notes sauvegardées');
  };

  const handleAddInteraction = async (e) => {
    e.preventDefault();
    if (!newInteraction.content.trim()) return;
    await createInteraction.mutateAsync({
      lead_id: id, type: newInteraction.type, content: newInteraction.content.trim(),
    });
    setNewInteraction({ type: 'note', content: '' });
  };

  const handleCreateQuote = () => navigate('/quotes/new', { state: { lead } });

  const handleSendQuote = async (quoteId) => {
    const ok = await confirm({
      title: 'Envoyer ce devis par email ?',
      description: `Le devis sera envoyé à ${lead?.email || "l'adresse du client"}.`,
      confirmText: 'Envoyer', variant: 'info',
    });
    if (ok) await sendQuote.mutateAsync(quoteId);
  };

  const handleWhatsApp = async () => {
    if (!lead?.phone) { toast.error('Aucun numéro de téléphone enregistré'); return; }
    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/whatsapp/send`,
        { lead_id: id, message: `Bonjour ${lead.name}, Global Clean Home vous contacte.` },
        { withCredentials: true }
      );
      if (res.data?.link) window.open(res.data.link, '_blank');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur WhatsApp');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto animate-pulse">
        <div className="h-8 w-40 bg-neutral-200 rounded mb-6" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="h-64 bg-neutral-100 rounded-xl lg:col-span-2" />
          <div className="h-64 bg-neutral-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <EmptyState
          icon={Activity}
          title="Lead introuvable"
          description="Ce lead a peut-être été supprimé ou vous n'avez pas les droits nécessaires."
          action={{ label: 'Retour aux leads', onClick: () => navigate('/leads') }}
        />
      </div>
    );
  }

  const allowedNext = getAllowedNextStatuses(lead.status);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <PageHeader
        breadcrumbs={[{ label: 'Leads', to: '/leads' }, { label: lead.name || 'Détail' }]}
        title={lead.name || 'Sans nom'}
        subtitle={
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <StatusBadge domain="lead" status={lead.status} />
            {allowedNext.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">Changer…</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel className="text-xs font-mono uppercase tracking-wider text-neutral-500">
                    Transitions autorisées
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allowedNext.map((s) => (
                    <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)} className="gap-2">
                      <StatusBadge domain="lead" status={s} size="xs" />
                      {LEAD_STATUS_LABELS[s]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs text-neutral-500">Créé {relativeTime(lead.created_at)}</span>
          </div>
        }
        actions={[
          ...(lead.phone ? [{ label: 'Appeler', icon: Phone, onClick: () => (window.location.href = `tel:${lead.phone}`) }] : []),
          ...(lead.email ? [{ label: 'Email', icon: Mail, onClick: () => (window.location.href = `mailto:${lead.email}`) }] : []),
          ...(lead.phone ? [{ label: 'WhatsApp', icon: MessageSquare, onClick: handleWhatsApp }] : []),
          { label: 'Créer un devis', icon: Plus, onClick: handleCreateQuote, variant: 'primary' },
        ]}
        tabs={[
          { id: 'overview', label: "Vue d'ensemble", icon: User, active: activeTab === 'overview' },
          { id: 'timeline', label: 'Timeline', icon: Activity, active: activeTab === 'timeline', badge: timeline.length },
          { id: 'quotes', label: 'Devis', icon: FileText, active: activeTab === 'quotes', badge: quotes.length },
          { id: 'tasks', label: 'Tâches', icon: CheckSquare, active: activeTab === 'tasks', badge: tasks.length },
          { id: 'notes', label: 'Notes', icon: FileText, active: activeTab === 'notes' },
        ]}
        onTabChange={setActiveTab}
      />

      {/* ─── Onglet Vue d'ensemble ─── */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500 mb-4">
                Informations de contact
              </h3>
              <div className="grid sm:grid-cols-2 gap-x-6">
                <InfoRow icon={Mail} label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : null} />
                <InfoRow icon={Phone} label="Téléphone" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : null} />
                <InfoRow icon={MapPin} label="Adresse" value={lead.address} />
                <InfoRow icon={Tag} label="Service" value={lead.service_type} />
                {lead.surface && <InfoRow icon={Hash} label="Surface" value={`${lead.surface} m²`} />}
                <InfoRow icon={Calendar} label="Créé le" value={shortDate(lead.created_at)} />
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500 mb-4">
                Tracking &amp; acquisition
              </h3>
              <div className="grid sm:grid-cols-2 gap-x-6">
                <InfoRow icon={Globe} label="Source" value={lead.source} />
                <InfoRow icon={TrendingUp} label="Campagne" value={lead.campaign || lead.utm_campaign} />
                <InfoRow icon={Tag} label="UTM source" value={lead.utm_source} />
                <InfoRow icon={Tag} label="UTM medium" value={lead.utm_medium} />
              </div>
              {!lead.source && !lead.utm_source && (
                <p className="text-xs text-neutral-400 italic mt-2">Aucune donnée de tracking enregistrée</p>
              )}
            </div>

            {lead.message && (
              <div className="rounded-xl border border-neutral-200 bg-brand-50/30 p-6">
                <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500 mb-2">
                  Message initial
                </h3>
                <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed font-display">
                  « {lead.message} »
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-neutral-200 bg-white p-6 flex flex-col items-center">
              <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500 mb-4">
                Score de prospection
              </h3>
              <ScoreCircle score={lead.score || 0} />
              {lead.probability !== undefined && (
                <div className="w-full mt-6">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-neutral-500">Probabilité de closing</span>
                    <span className="font-semibold text-neutral-900 tabular-nums">{lead.probability}%</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-600 rounded-full transition-all duration-700"
                      style={{ width: `${lead.probability}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <h3 className="text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500 mb-3">
                Dernière activité
              </h3>
              <div className="flex items-center gap-2 text-sm text-neutral-900">
                <Clock className="w-4 h-4 text-neutral-400" />
                {relativeTime(lead.updated_at || lead.created_at)}
              </div>
              <p className="text-xs text-neutral-500 mt-1 font-mono">
                {shortDateTime(lead.updated_at || lead.created_at)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Onglet Timeline ─── */}
      {activeTab === 'timeline' && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <form onSubmit={handleAddInteraction} className="mb-6 pb-6 border-b border-neutral-200">
            <label className="block text-[11px] font-mono uppercase tracking-[0.1em] text-neutral-500 mb-2">
              Ajouter une interaction
            </label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {['note', 'appel', 'email', 'relance'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewInteraction((s) => ({ ...s, type: t }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize
                    ${newInteraction.type === t
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newInteraction.content}
                onChange={(e) => setNewInteraction((s) => ({ ...s, content: e.target.value }))}
                placeholder="Décrivez l'interaction…"
                className="flex-1"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!newInteraction.content.trim() || createInteraction.isPending}
                className={primaryBtn}
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Ajouter
              </Button>
            </div>
          </form>

          {timeline.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Aucune interaction pour l'instant"
              description="Les interactions, devis et tâches apparaîtront ici au fur et à mesure."
              className="py-10"
            />
          ) : (
            <div className="space-y-0">
              {timeline.map((item) => <TimelineItem key={item.id} item={item} />)}
            </div>
          )}
        </div>
      )}

      {/* ─── Onglet Devis ─── */}
      {activeTab === 'quotes' && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-neutral-900">Devis liés ({quotes.length})</h3>
            <Button size="sm" onClick={handleCreateQuote} className={primaryBtn}>
              <Plus className="w-3.5 h-3.5 mr-1" />Nouveau devis
            </Button>
          </div>
          {quotes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucun devis"
              description="Créez un devis pour ce lead en un clic."
              action={{ label: 'Créer un devis', icon: Plus, onClick: handleCreateQuote }}
              className="py-10"
            />
          ) : (
            <div className="space-y-2">
              {quotes.map((q) => (
                <div
                  key={q.quote_id}
                  className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-neutral-900">{q.service_type || 'Devis'}</span>
                      <StatusBadge domain="quote" status={q.status} size="xs" />
                    </div>
                    <div className="text-sm text-neutral-500 mt-0.5">
                      <span className="font-mono tabular-nums text-neutral-900">
                        {q.amount ? `${Number(q.amount).toLocaleString('fr-FR')} €` : 'Montant non défini'}
                      </span>
                      {q.amount && <span className="text-xs text-neutral-400"> HT</span>}
                      {' · '}
                      {relativeTime(q.created_at)}
                    </div>
                  </div>
                  {q.status === 'brouillon' && (
                    <Button size="sm" variant="outline" onClick={() => handleSendQuote(q.quote_id)}>
                      <Send className="w-3.5 h-3.5 mr-1" />Envoyer
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Onglet Tâches ─── */}
      {activeTab === 'tasks' && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Tâches ({tasks.length})</h3>
          {tasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="Aucune tâche"
              description="Ajoutez des tâches de suivi pour ne rien oublier."
              className="py-10"
            />
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.task_id || t.id} className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200">
                  <CheckSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    t.status === 'completed' ? 'text-brand-600' : 'text-neutral-400'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium ${
                      t.status === 'completed' ? 'line-through text-neutral-400' : 'text-neutral-900'
                    }`}>
                      {t.title}
                    </div>
                    {t.description && <p className="text-xs text-neutral-500 mt-0.5">{t.description}</p>}
                    {t.due_date && <p className="text-xs text-neutral-400 mt-1 font-mono">Échéance {relativeTime(t.due_date)}</p>}
                  </div>
                  <StatusBadge domain="task" status={t.status} size="xs" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Onglet Notes ─── */}
      {activeTab === 'notes' && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-900">Notes privées</h3>
            {notesDirty && (
              <Button size="sm" onClick={handleSaveNotes} disabled={updateLead.isPending} className={primaryBtn}>
                <Save className="w-3.5 h-3.5 mr-1" />Enregistrer
              </Button>
            )}
          </div>
          <Textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
            placeholder="Ajoutez vos notes sur ce lead…"
            rows={10}
            className="resize-none font-display"
          />
          <p className="text-xs text-neutral-400 mt-2 italic">
            Ces notes sont visibles uniquement par votre équipe.
          </p>
        </div>
      )}

      <ConfirmElement />
    </div>
  );
}
