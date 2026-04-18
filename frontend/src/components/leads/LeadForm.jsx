/**
 * LeadForm — ATELIER direction
 * Crème / Fraunces / émeraude / terracotta
 * Logique 100% préservée (RHF + zod + détection doublons).
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, Mail, Phone, MapPin, MessageSquare, Tag, AlertTriangle,
  CheckCircle2, User, ChevronDown,
} from 'lucide-react';

import api from '../../lib/api';
import { useCreateLead } from '../../hooks/api';
import { PageHeader } from '../shared';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../ui/dropdown-menu';

// ── Schema ─────────────────────────────────────────────────────
const leadSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères').max(120),
  email: z.string().trim().email('Email invalide'),
  phone: z.string().trim().min(6, 'Numéro de téléphone invalide').max(20),
  service_type: z.enum(['Ménage', 'Canapé', 'Matelas', 'Tapis', 'Bureaux'], {
    errorMap: () => ({ message: 'Service invalide' }),
  }),
  surface: z.string().optional()
    .refine((v) => !v || (!isNaN(Number(v)) && Number(v) > 0), 'Surface invalide'),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
  source: z.string().trim().max(80).optional(),
});

const SERVICES = ['Ménage', 'Canapé', 'Matelas', 'Tapis', 'Bureaux'];
const SOURCES = ['Direct', 'Google Ads', 'SEO', 'Meta Ads', 'Referral', 'Recommandation'];

// ── Erreur inline (terracotta au lieu de rose) ─────────────────
function FieldError({ error }) {
  if (!error) return null;
  return (
    <p className="mt-1.5 text-xs text-terracotta-600 flex items-center gap-1">
      <AlertTriangle className="w-3 h-3" />
      {error.message}
    </p>
  );
}

// ── Label standardisé (font-mono, minuscules stylisées) ────────
const FieldLabel = ({ icon: Icon, children, required }) => (
  <label className="block text-[10px] font-mono uppercase tracking-[0.1em] text-neutral-600 mb-1.5">
    {Icon && <Icon className="w-3 h-3 inline mr-1" />}
    {children}
    {required && <span className="text-terracotta-600 ml-0.5">*</span>}
  </label>
);

const primaryBtn = "bg-neutral-900 hover:bg-neutral-800 text-white";

// ══════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════
export default function LeadForm() {
  const navigate = useNavigate();
  const createLead = useCreateLead();
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(leadSchema),
    mode: 'onChange',
    defaultValues: {
      name: '', email: '', phone: '',
      service_type: 'Ménage', surface: '',
      address: '', message: '', source: 'Direct',
    },
  });

  const serviceType = watch('service_type');
  const source = watch('source');
  const email = watch('email');
  const phone = watch('phone');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const emailOk = email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
      const phoneOk = phone && phone.replace(/\D/g, '').length >= 6;
      if (!emailOk && !phoneOk) { setDuplicateWarning(null); return; }
      try {
        const { data } = await api.get('/leads?period=90d&page=1&page_size=200');
        if (cancelled) return;
        const leads = Array.isArray(data) ? data : data.leads || data.items || [];
        const found = leads.find(
          (l) =>
            (emailOk && l.email?.toLowerCase() === email.toLowerCase()) ||
            (phoneOk && l.phone?.replace(/\D/g, '') === phone.replace(/\D/g, ''))
        );
        setDuplicateWarning(found ? {
          lead_id: found.lead_id, name: found.name, status: found.status,
        } : null);
      } catch { /* silent */ }
    };
    const timer = setTimeout(check, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [email, phone]);

  const onSubmit = async (values) => {
    const payload = {
      ...values,
      surface: values.surface ? Number(values.surface) : undefined,
      manual: true,
    };
    try {
      const lead = await createLead.mutateAsync(payload);
      navigate('/quotes/new', { state: { lead } });
    } catch { /* toast handled upstream */ }
  };

  const errorCls = "border-terracotta-400 focus-visible:ring-terracotta-400";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader
        breadcrumbs={[{ label: 'Leads', to: '/leads' }, { label: 'Nouveau lead' }]}
        title="Créer un lead"
        subtitle="Ajoutez un prospect manuellement au pipeline"
        actions={[{ label: 'Annuler', icon: ArrowLeft, onClick: () => navigate('/leads') }]}
      />

      {/* Alerte doublon (amber atelier) */}
      {duplicateWarning && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              Doublon potentiel détecté
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              Un lead avec le même email ou téléphone existe déjà :{' '}
              <button
                type="button"
                onClick={() => navigate(`/leads/${duplicateWarning.lead_id}`)}
                className="font-semibold underline hover:no-underline text-amber-900"
              >
                {duplicateWarning.name}
              </button>{' '}
              <span className="font-mono text-[11px]">(statut : {duplicateWarning.status})</span>
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ─ Bloc Contact ─ */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h3 className="font-display text-lg text-neutral-900 mb-5 flex items-center gap-2">
            <User className="w-4 h-4 text-brand-700" />
            Informations de contact
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FieldLabel required>Nom complet</FieldLabel>
              <Input {...register('name')} placeholder="Jean Dupont"
                className={errors.name ? errorCls : ''} />
              <FieldError error={errors.name} />
            </div>

            <div>
              <FieldLabel icon={Mail} required>Email</FieldLabel>
              <Input {...register('email')} type="email"
                placeholder="jean.dupont@example.com"
                className={errors.email ? errorCls : ''} />
              <FieldError error={errors.email} />
            </div>

            <div>
              <FieldLabel icon={Phone} required>Téléphone</FieldLabel>
              <Input {...register('phone')} type="tel"
                placeholder="+33 6 12 34 56 78"
                className={errors.phone ? errorCls : ''} />
              <FieldError error={errors.phone} />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel icon={MapPin}>Adresse</FieldLabel>
              <Input {...register('address')} placeholder="12 rue des Lilas, 75001 Paris" />
              <FieldError error={errors.address} />
            </div>
          </div>
        </div>

        {/* ─ Bloc Service ─ */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h3 className="font-display text-lg text-neutral-900 mb-5 flex items-center gap-2">
            <Tag className="w-4 h-4 text-terracotta-600" />
            Service &amp; acquisition
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Type de service</FieldLabel>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {serviceType}
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {SERVICES.map((s) => (
                    <DropdownMenuItem key={s} onClick={() => setValue('service_type', s, { shouldValidate: true })}>
                      {s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <FieldError error={errors.service_type} />
            </div>

            <div>
              <FieldLabel>Surface (m²)</FieldLabel>
              <Input {...register('surface')} type="number" step="0.1" min="0"
                placeholder="80" className={`tabular-nums ${errors.surface ? errorCls : ''}`} />
              <FieldError error={errors.surface} />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel>Source d'acquisition</FieldLabel>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {source}
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {SOURCES.map((s) => (
                    <DropdownMenuItem key={s} onClick={() => setValue('source', s, { shouldValidate: true })}>
                      {s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* ─ Bloc Message ─ */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h3 className="font-display text-lg text-neutral-900 mb-5 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-neutral-600" />
            Message / notes internes
          </h3>
          <Textarea
            {...register('message')}
            rows={4}
            placeholder="Besoin spécifique, contexte, remarques…"
            className="resize-none font-display"
          />
          <FieldError error={errors.message} />
        </div>

        {/* Info (brand-50 au lieu de blue-50) */}
        <div className="rounded-lg bg-brand-50 border border-brand-100 p-3 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-brand-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-brand-900 leading-relaxed">
            <span className="font-semibold">Aucun email automatique ne sera envoyé.</span>{' '}
            Le client recevra un message uniquement quand vous enverrez explicitement un devis.
          </p>
        </div>

        {/* Boutons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/leads')}
            disabled={createLead.isPending}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={!isValid || createLead.isPending}
            className={primaryBtn}
          >
            {createLead.isPending ? 'Création…' : 'Créer le lead →'}
          </Button>
        </div>
      </form>
    </div>
  );
}
