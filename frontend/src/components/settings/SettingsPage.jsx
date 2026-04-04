import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import {
  User, Building2, Bell, Shield, Palette, Globe, CreditCard, Users,
  Mail, Key, Database, Clock, MapPin, FileText, Zap, Camera,
  ChevronRight, Check, X, Eye, EyeOff, Upload, Download, Trash2,
  Plus, Edit3, Copy, RefreshCw, AlertTriangle, Info, ExternalLink,
  Smartphone, Monitor, Moon, Sun, Lock, Unlock, LogOut, Hash,
  Volume2, VolumeX, BellRing, BellOff, Star, Settings, Save,
  ToggleLeft, ToggleRight, Briefcase, Phone, Link2, Sliders,
  HardDrive, Cloud, Archive, Tag, Layers, Megaphone, Receipt,
  CalendarDays, UserCheck, Search, Filter, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import BACKEND_URL from '../../config.js';

const API_URL = BACKEND_URL + '/api';

/* ────────────────────────────────────────────────
   Reusable UI Components
──────────────────────────────────────────────── */

const SectionCard = ({ title, description, icon: Icon, children, color = '#8b5cf6', badge, collapsible = false, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/8 overflow-hidden transition-all duration-200 hover:border-white/12"
      style={{ background: 'rgba(255,255,255,0.02)' }}>
      <button
        onClick={() => collapsible && setOpen(!open)}
        className={`w-full flex items-center gap-4 p-5 ${collapsible ? 'cursor-pointer hover:bg-white/3' : 'cursor-default'} transition-all`}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-100" style={{ fontFamily: 'Manrope, sans-serif' }}>{title}</h3>
            {badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
                {badge}
              </span>
            )}
          </div>
          {description && <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>}
        </div>
        {collapsible && (
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {open && <div className="px-5 pb-5 pt-0 space-y-4">{children}</div>}
    </div>
  );
};

const FieldRow = ({ label, description, children, horizontal = true }) => (
  <div className={`${horizontal ? 'flex items-start justify-between gap-4' : 'space-y-2'} py-3 border-t border-white/5 first:border-t-0 first:pt-0`}>
    <div className="min-w-0 flex-shrink-0" style={{ maxWidth: horizontal ? '55%' : '100%' }}>
      <p className="text-sm font-medium text-slate-300">{label}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </div>
    <div className={`${horizontal ? 'flex-shrink-0' : 'w-full'}`}>{children}</div>
  </div>
);

const Toggle = ({ checked, onChange, disabled = false, size = 'md' }) => {
  const sizes = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-4' },
    md: { track: 'w-10 h-5', thumb: 'w-4 h-4', translate: 'translate-x-5' },
    lg: { track: 'w-12 h-6', thumb: 'w-5 h-5', translate: 'translate-x-6' },
  };
  const s = sizes[size];
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex ${s.track} items-center rounded-full transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ background: checked ? '#8b5cf6' : 'rgba(255,255,255,0.1)' }}
    >
      <span className={`inline-block ${s.thumb} transform rounded-full bg-white shadow-lg transition-transform duration-200 ${checked ? s.translate : 'translate-x-0.5'}`} />
    </button>
  );
};

const TextInput = ({ value, onChange, placeholder, type = 'text', icon: Icon, disabled = false, className = '' }) => (
  <div className={`relative ${className}`}>
    {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />}
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 rounded-xl text-sm text-slate-200 placeholder-slate-600
                 bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30
                 disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
    />
  </div>
);

const SelectInput = ({ value, onChange, options, icon: Icon, className = '' }) => (
  <div className={`relative ${className}`}>
    {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none z-10" />}
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-8 py-2.5 rounded-xl text-sm text-slate-200
                 bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/40
                 appearance-none cursor-pointer transition-all`}
      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value} style={{ background: '#1a1a2e', color: '#e2e8f0' }}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

const TextArea = ({ value, onChange, placeholder, rows = 3, className = '' }) => (
  <textarea
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    className={`w-full px-3 py-2.5 rounded-xl text-sm text-slate-200 placeholder-slate-600
               bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30
               resize-none transition-all ${className}`}
  />
);

const ActionButton = ({ children, variant = 'primary', size = 'md', icon: Icon, onClick, disabled = false, loading = false, className = '' }) => {
  const variants = {
    primary: 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20',
    secondary: 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
    success: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20',
    ghost: 'hover:bg-white/5 text-slate-400',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-sm',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200
                 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

const ColorPicker = ({ value, onChange, presets }) => (
  <div className="flex items-center gap-2 flex-wrap">
    {presets.map(color => (
      <button
        key={color}
        onClick={() => onChange(color)}
        className={`w-7 h-7 rounded-lg transition-all duration-200 ${value === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-110'}`}
        style={{ background: color }}
      />
    ))}
  </div>
);

const Badge = ({ children, color = '#8b5cf6' }) => (
  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
    {children}
  </span>
);

const DangerZone = ({ title, description, buttonText, onConfirm }) => {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
      <div>
        <p className="text-sm font-semibold text-red-400">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      {confirming ? (
        <div className="flex items-center gap-2">
          <ActionButton variant="danger" size="sm" onClick={() => { onConfirm(); setConfirming(false); }}>Confirmer</ActionButton>
          <ActionButton variant="ghost" size="sm" onClick={() => setConfirming(false)}>Annuler</ActionButton>
        </div>
      ) : (
        <ActionButton variant="danger" size="sm" icon={AlertTriangle} onClick={() => setConfirming(true)}>{buttonText}</ActionButton>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────
   Navigation tabs
──────────────────────────────────────────────── */
const settingsTabs = [
  { id: 'profile', label: 'Profil', icon: User, color: '#8b5cf6' },
  { id: 'company', label: 'Entreprise', icon: Building2, color: '#f97316' },
  { id: 'appearance', label: 'Apparence', icon: Palette, color: '#ec4899' },
  { id: 'notifications', label: 'Notifications', icon: Bell, color: '#f59e0b' },
  { id: 'security', label: 'Sécurité', icon: Shield, color: '#ef4444' },
  { id: 'team', label: 'Équipe', icon: Users, color: '#10b981' },
  { id: 'billing', label: 'Facturation', icon: CreditCard, color: '#6366f1' },
  { id: 'email', label: 'Email & SMS', icon: Mail, color: '#06b6d4' },
  { id: 'scheduling', label: 'Planning', icon: Clock, color: '#84cc16' },
  { id: 'zones', label: 'Zones', icon: MapPin, color: '#f43f5e' },
  { id: 'documents', label: 'Documents', icon: FileText, color: '#a855f7' },
  { id: 'integrations', label: 'Intégrations', icon: Zap, color: '#eab308' },
  { id: 'api', label: 'API', icon: Key, color: '#64748b' },
  { id: 'data', label: 'Données', icon: Database, color: '#0ea5e9' },
  { id: 'advanced', label: 'Avancé', icon: Sliders, color: '#78716c' },
];

/* ────────────────────────────────────────────────
   MAIN SETTINGS PAGE
──────────────────────────────────────────────── */
const SettingsPage = () => {
  const { user, login: setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const contentRef = useRef(null);

  // Profile state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    jobTitle: user?.jobTitle || 'Gérant',
    avatar: user?.picture || '',
  });

  // Company state
  const [companyData, setCompanyData] = useState({
    name: 'Global Clean Home',
    legalName: 'Global Clean Home SARL',
    siret: '',
    tva: '',
    address: '',
    city: 'Paris',
    zipCode: '',
    country: 'France',
    phone: '',
    email: '',
    website: '',
    logo: '',
    slogan: 'Votre maison, notre passion',
    apeCode: '8121Z',
    capitalSocial: '',
    rcs: '',
  });

  // Appearance state
  const [appearance, setAppearance] = useState({
    theme: 'dark',
    accentColor: '#8b5cf6',
    fontSize: 'medium',
    density: 'comfortable',
    sidebarPosition: 'left',
    animationsEnabled: true,
    reducedMotion: false,
    roundedCorners: true,
    language: 'fr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'EUR',
    numberFormat: 'fr-FR',
    startPage: '/dashboard',
  });

  // Notifications state
  const [notifications, setNotifications] = useState({
    emailEnabled: true,
    pushEnabled: true,
    smsEnabled: false,
    soundEnabled: true,
    desktopEnabled: true,
    // Categories
    newLead: { email: true, push: true, sms: false },
    quoteAccepted: { email: true, push: true, sms: true },
    paymentReceived: { email: true, push: true, sms: false },
    taskDue: { email: false, push: true, sms: false },
    ticketCreated: { email: true, push: true, sms: false },
    interventionReminder: { email: true, push: true, sms: true },
    weeklyReport: { email: true, push: false, sms: false },
    monthlyDigest: { email: true, push: false, sms: false },
    systemAlerts: { email: true, push: true, sms: false },
    marketingUpdates: { email: false, push: false, sms: false },
    // Quiet hours
    quietHoursEnabled: false,
    quietStart: '22:00',
    quietEnd: '07:00',
    quietWeekends: true,
  });

  // Security state
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    twoFactorMethod: 'app',
    sessionTimeout: 30,
    passwordMinLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    ipWhitelist: '',
    loginAlerts: true,
    trustedDevices: [],
    activeSessions: [],
  });

  // Team state
  const [team, setTeam] = useState({
    members: [],
    roles: [
      { id: 1, name: 'Admin', color: '#ef4444', permissions: 'all' },
      { id: 2, name: 'Manager', color: '#8b5cf6', permissions: 'manage' },
      { id: 3, name: 'Commercial', color: '#3b82f6', permissions: 'leads,quotes' },
      { id: 4, name: 'Opérateur', color: '#10b981', permissions: 'planning,tasks' },
      { id: 5, name: 'Comptable', color: '#f59e0b', permissions: 'invoices,finance' },
    ],
    inviteEmail: '',
    inviteRole: 'commercial',
    maxMembers: 25,
  });

  // Billing state
  const [billing, setBilling] = useState({
    plan: 'pro',
    billingCycle: 'monthly',
    nextBillingDate: '2026-05-01',
    paymentMethod: 'card',
    cardLast4: '4242',
    cardBrand: 'Visa',
    invoiceEmail: '',
    taxId: '',
    billingAddress: '',
    autoRenew: true,
    usage: { leads: 847, maxLeads: 5000, storage: 2.4, maxStorage: 10, users: 5, maxUsers: 25 },
  });

  // Email settings
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpEncryption: 'tls',
    senderName: 'Global Clean Home',
    senderEmail: '',
    replyTo: '',
    signature: '',
    // SMS
    smsProvider: 'twilio',
    smsApiKey: '',
    smsFrom: '',
    // Templates
    templateWelcome: true,
    templateQuote: true,
    templateInvoice: true,
    templateReminder: true,
    templateFollowup: true,
    // Automation
    autoFollowUp: true,
    followUpDelay: 48,
    autoThankYou: true,
    birthdayEmails: false,
  });

  // Scheduling state
  const [scheduling, setScheduling] = useState({
    workDays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false },
    workStart: '08:00',
    workEnd: '19:00',
    breakStart: '12:00',
    breakEnd: '13:00',
    slotDuration: 60,
    bufferTime: 15,
    maxBookingsPerDay: 12,
    allowWeekendBooking: true,
    autoConfirm: false,
    reminderBefore: 24,
    cancellationDeadline: 12,
    holidays: [],
    overtimeEnabled: false,
    overtimeRate: 1.5,
  });

  // Zones state
  const [zones, setZones] = useState({
    serviceRadius: 30,
    zones: [
      { id: 1, name: 'Paris Centre', zipCodes: '75001-75009', color: '#8b5cf6', surcharge: 0 },
      { id: 2, name: 'Paris Est', zipCodes: '75010-75012,75020', color: '#3b82f6', surcharge: 0 },
      { id: 3, name: 'Banlieue Proche', zipCodes: '92,93,94', color: '#10b981', surcharge: 5 },
      { id: 4, name: 'Grande Couronne', zipCodes: '77,78,91,95', color: '#f59e0b', surcharge: 15 },
    ],
    travelCostPerKm: 0.50,
    freeDeliveryRadius: 10,
    showMapOnPortal: true,
  });

  // Documents state
  const [documents, setDocuments] = useState({
    quotePrefix: 'DEV-',
    invoicePrefix: 'FAC-',
    contractPrefix: 'CTR-',
    nextQuoteNumber: 1024,
    nextInvoiceNumber: 567,
    nextContractNumber: 89,
    defaultPaymentTerms: 30,
    defaultTaxRate: 20,
    showLogo: true,
    showSignature: true,
    footerText: '',
    legalMentions: '',
    bankName: '',
    iban: '',
    bic: '',
    autoNumbering: true,
    defaultLanguage: 'fr',
    pdfQuality: 'high',
  });

  // Integration state
  const [integrations, setIntegrations] = useState({
    googleCalendar: { connected: false, email: '' },
    googleMaps: { apiKey: '', enabled: true },
    stripe: { connected: true, mode: 'live' },
    mailchimp: { connected: false, listId: '' },
    slack: { connected: false, webhook: '' },
    zapier: { connected: false },
    hubspot: { connected: false },
    quickbooks: { connected: false },
    twilio: { connected: false, sid: '', token: '' },
    sendgrid: { connected: false, apiKey: '' },
    googleAds: { connected: false, customerId: '' },
    facebookAds: { connected: false, pixelId: '' },
    wordpress: { connected: false, url: '' },
  });

  // API state
  const [apiSettings, setApiSettings] = useState({
    apiKeys: [
      { id: 1, name: 'Production', key: 'gch_live_••••••••••••4f2a', created: '2026-01-15', lastUsed: '2026-04-03', active: true },
      { id: 2, name: 'Staging', key: 'gch_test_••••••••••••8b1c', created: '2026-02-20', lastUsed: '2026-03-28', active: true },
    ],
    webhookUrl: '',
    webhookEvents: ['lead.created', 'quote.accepted', 'payment.received'],
    rateLimit: 1000,
    corsOrigins: '',
  });

  // Data state
  const [dataSettings, setDataSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    backupRetention: 30,
    lastBackup: '2026-04-03T22:00:00',
    storageUsed: 2.4,
    storageMax: 10,
    dataRetention: 365,
    gdprMode: true,
    anonymizeAfter: 730,
    exportFormat: 'csv',
  });

  // Advanced state
  const [advanced, setAdvanced] = useState({
    debugMode: false,
    betaFeatures: false,
    analyticsTracking: true,
    errorReporting: true,
    cacheEnabled: true,
    cacheDuration: 3600,
    logLevel: 'info',
    maintenanceMode: false,
    customCss: '',
    customJs: '',
  });

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success('Paramètres enregistrés avec succès !');
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Filter tabs by search
  const filteredTabs = searchQuery
    ? settingsTabs.filter(t => t.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : settingsTabs;

  // Scroll to top on tab change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  /* ────────────────────────────────────────────────
     PROFILE TAB
  ──────────────────────────────────────────────── */
  const renderProfile = () => (
    <div className="space-y-6">
      <SectionCard title="Photo de profil" description="Votre avatar visible dans le CRM" icon={Camera} color="#8b5cf6">
        <div className="flex items-center gap-5">
          <div className="relative group">
            {profileData.avatar ? (
              <img src={profileData.avatar} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover ring-2 ring-violet-500/30" />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
                {profileData.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <button className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="space-y-2">
            <ActionButton variant="secondary" size="sm" icon={Upload}>Changer la photo</ActionButton>
            <p className="text-xs text-slate-500">JPG, PNG ou GIF. Max 5 Mo.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Informations personnelles" description="Vos données de profil" icon={User} color="#8b5cf6">
        <FieldRow label="Nom complet" description="Affiché dans le CRM et les communications" horizontal={false}>
          <TextInput value={profileData.name} onChange={v => setProfileData(p => ({ ...p, name: v }))} icon={User} placeholder="Votre nom" />
        </FieldRow>
        <FieldRow label="Email" description="Adresse email de connexion" horizontal={false}>
          <TextInput value={profileData.email} onChange={v => setProfileData(p => ({ ...p, email: v }))} icon={Mail} type="email" placeholder="email@exemple.com" />
        </FieldRow>
        <FieldRow label="Téléphone" description="Pour les notifications SMS" horizontal={false}>
          <TextInput value={profileData.phone} onChange={v => setProfileData(p => ({ ...p, phone: v }))} icon={Phone} placeholder="+33 6 12 34 56 78" />
        </FieldRow>
        <FieldRow label="Poste / Fonction" horizontal={false}>
          <SelectInput value={profileData.jobTitle} onChange={v => setProfileData(p => ({ ...p, jobTitle: v }))} icon={Briefcase}
            options={[
              { value: 'Gérant', label: 'Gérant' },
              { value: 'Directeur', label: 'Directeur' },
              { value: 'Manager', label: 'Manager' },
              { value: 'Commercial', label: 'Commercial' },
              { value: 'Opérateur', label: 'Opérateur' },
              { value: 'Comptable', label: 'Comptable' },
              { value: 'Assistant', label: 'Assistant(e)' },
            ]} />
        </FieldRow>
        <FieldRow label="Bio" description="Courte description (visible sur le portail)" horizontal={false}>
          <TextArea value={profileData.bio} onChange={v => setProfileData(p => ({ ...p, bio: v }))} placeholder="Quelques mots sur vous..." rows={3} />
        </FieldRow>
      </SectionCard>
    </div>
  );

  /* ────────────────────────────────────────────────
     COMPANY TAB
  ──────────────────────────────────────────────── */
  const renderCompany = () => (
    <div className="space-y-6">
      <SectionCard title="Identité de l'entreprise" description="Informations légales et commerciales" icon={Building2} color="#f97316">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Nom commercial</label>
            <TextInput value={companyData.name} onChange={v => setCompanyData(p => ({ ...p, name: v }))} icon={Building2} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Raison sociale</label>
            <TextInput value={companyData.legalName} onChange={v => setCompanyData(p => ({ ...p, legalName: v }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">SIRET</label>
            <TextInput value={companyData.siret} onChange={v => setCompanyData(p => ({ ...p, siret: v }))} placeholder="123 456 789 00012" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">N° TVA</label>
            <TextInput value={companyData.tva} onChange={v => setCompanyData(p => ({ ...p, tva: v }))} placeholder="FR12345678901" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Code APE / NAF</label>
            <TextInput value={companyData.apeCode} onChange={v => setCompanyData(p => ({ ...p, apeCode: v }))} placeholder="8121Z" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Capital social</label>
            <TextInput value={companyData.capitalSocial} onChange={v => setCompanyData(p => ({ ...p, capitalSocial: v }))} placeholder="10 000 €" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">RCS</label>
            <TextInput value={companyData.rcs} onChange={v => setCompanyData(p => ({ ...p, rcs: v }))} placeholder="Paris B 123 456 789" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Slogan</label>
            <TextInput value={companyData.slogan} onChange={v => setCompanyData(p => ({ ...p, slogan: v }))} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Coordonnées" description="Adresse et contacts de l'entreprise" icon={MapPin} color="#f97316">
        <FieldRow label="Adresse" horizontal={false}>
          <TextInput value={companyData.address} onChange={v => setCompanyData(p => ({ ...p, address: v }))} icon={MapPin} placeholder="123 rue de la Propreté" />
        </FieldRow>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Ville</label>
            <TextInput value={companyData.city} onChange={v => setCompanyData(p => ({ ...p, city: v }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Code postal</label>
            <TextInput value={companyData.zipCode} onChange={v => setCompanyData(p => ({ ...p, zipCode: v }))} placeholder="75012" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Pays</label>
            <SelectInput value={companyData.country} onChange={v => setCompanyData(p => ({ ...p, country: v }))}
              options={[
                { value: 'France', label: '🇫🇷 France' },
                { value: 'Belgique', label: '🇧🇪 Belgique' },
                { value: 'Suisse', label: '🇨🇭 Suisse' },
                { value: 'Luxembourg', label: '🇱🇺 Luxembourg' },
                { value: 'Canada', label: '🇨🇦 Canada' },
              ]} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Téléphone</label>
            <TextInput value={companyData.phone} onChange={v => setCompanyData(p => ({ ...p, phone: v }))} icon={Phone} placeholder="+33 1 23 45 67 89" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Email</label>
            <TextInput value={companyData.email} onChange={v => setCompanyData(p => ({ ...p, email: v }))} icon={Mail} placeholder="contact@globalcleanhome.fr" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Site web</label>
            <TextInput value={companyData.website} onChange={v => setCompanyData(p => ({ ...p, website: v }))} icon={Globe} placeholder="https://globalcleanhome.fr" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Logo & Branding" description="Identité visuelle de l'entreprise" icon={Palette} color="#f97316">
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center bg-white/5">
            {companyData.logo ? (
              <img src={companyData.logo} alt="Logo" className="w-full h-full object-contain rounded-2xl" />
            ) : (
              <Upload className="w-6 h-6 text-slate-500" />
            )}
          </div>
          <div className="space-y-2">
            <ActionButton variant="secondary" size="sm" icon={Upload}>Uploader le logo</ActionButton>
            <p className="text-xs text-slate-500">PNG ou SVG, fond transparent recommandé. Min 256x256px.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );

  /* ────────────────────────────────────────────────
     APPEARANCE TAB
  ──────────────────────────────────────────────── */
  const renderAppearance = () => (
    <div className="space-y-6">
      <SectionCard title="Thème" description="Apparence générale de l'interface" icon={Palette} color="#ec4899">
        <FieldRow label="Mode d'affichage" description="Choisissez le thème de couleur">
          <div className="flex gap-2">
            {[
              { value: 'light', icon: Sun, label: 'Clair' },
              { value: 'dark', icon: Moon, label: 'Sombre' },
              { value: 'auto', icon: Monitor, label: 'Auto' },
            ].map(t => (
              <button
                key={t.value}
                onClick={() => setAppearance(p => ({ ...p, theme: t.value }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  appearance.theme === t.value
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </FieldRow>

        <FieldRow label="Couleur d'accent" description="Couleur principale de l'interface">
          <ColorPicker
            value={appearance.accentColor}
            onChange={v => setAppearance(p => ({ ...p, accentColor: v }))}
            presets={['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7']}
          />
        </FieldRow>

        <FieldRow label="Taille du texte">
          <SelectInput value={appearance.fontSize} onChange={v => setAppearance(p => ({ ...p, fontSize: v }))}
            options={[
              { value: 'small', label: 'Petit' },
              { value: 'medium', label: 'Normal' },
              { value: 'large', label: 'Grand' },
              { value: 'xlarge', label: 'Très grand' },
            ]} />
        </FieldRow>

        <FieldRow label="Densité d'affichage" description="Espacement entre les éléments">
          <SelectInput value={appearance.density} onChange={v => setAppearance(p => ({ ...p, density: v }))}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'comfortable', label: 'Confortable' },
              { value: 'spacious', label: 'Spacieux' },
            ]} />
        </FieldRow>

        <FieldRow label="Animations" description="Transitions et animations de l'interface">
          <Toggle checked={appearance.animationsEnabled} onChange={v => setAppearance(p => ({ ...p, animationsEnabled: v }))} />
        </FieldRow>

        <FieldRow label="Coins arrondis" description="Bordures arrondies sur les éléments">
          <Toggle checked={appearance.roundedCorners} onChange={v => setAppearance(p => ({ ...p, roundedCorners: v }))} />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Régionalisation" description="Langue, format de date et devise" icon={Globe} color="#ec4899">
        <FieldRow label="Langue" horizontal={false}>
          <SelectInput value={appearance.language} onChange={v => setAppearance(p => ({ ...p, language: v }))} icon={Globe}
            options={[
              { value: 'fr', label: '🇫🇷 Français' },
              { value: 'en', label: '🇬🇧 English' },
              { value: 'es', label: '🇪🇸 Español' },
              { value: 'de', label: '🇩🇪 Deutsch' },
              { value: 'pt', label: '🇵🇹 Português' },
              { value: 'it', label: '🇮🇹 Italiano' },
              { value: 'ar', label: '🇸🇦 العربية' },
            ]} />
        </FieldRow>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Format de date</label>
            <SelectInput value={appearance.dateFormat} onChange={v => setAppearance(p => ({ ...p, dateFormat: v }))}
              options={[
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2026)' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2026)' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-12-31)' },
              ]} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Format d'heure</label>
            <SelectInput value={appearance.timeFormat} onChange={v => setAppearance(p => ({ ...p, timeFormat: v }))}
              options={[
                { value: '24h', label: '24h (14:30)' },
                { value: '12h', label: '12h (2:30 PM)' },
              ]} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Devise</label>
            <SelectInput value={appearance.currency} onChange={v => setAppearance(p => ({ ...p, currency: v }))}
              options={[
                { value: 'EUR', label: '€ Euro (EUR)' },
                { value: 'USD', label: '$ Dollar US (USD)' },
                { value: 'GBP', label: '£ Livre sterling (GBP)' },
                { value: 'CHF', label: 'CHF Franc suisse (CHF)' },
                { value: 'CAD', label: '$ Dollar canadien (CAD)' },
              ]} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Page d'accueil</label>
            <SelectInput value={appearance.startPage} onChange={v => setAppearance(p => ({ ...p, startPage: v }))}
              options={[
                { value: '/dashboard', label: 'Dashboard' },
                { value: '/director', label: 'Vue Directeur' },
                { value: '/leads', label: 'Leads' },
                { value: '/planning', label: 'Planning' },
                { value: '/kanban', label: 'Kanban' },
              ]} />
          </div>
        </div>
      </SectionCard>
    </div>
  );

  /* ────────────────────────────────────────────────
     NOTIFICATIONS TAB
  ──────────────────────────────────────────────── */
  const renderNotifications = () => {
    const categories = [
      { key: 'newLead', label: 'Nouveau lead', description: 'Quand un nouveau prospect arrive', icon: Users, color: '#8b5cf6' },
      { key: 'quoteAccepted', label: 'Devis accepté', description: 'Quand un client accepte un devis', icon: FileText, color: '#10b981' },
      { key: 'paymentReceived', label: 'Paiement reçu', description: 'Quand un paiement est enregistré', icon: CreditCard, color: '#f59e0b' },
      { key: 'taskDue', label: 'Tâche due', description: 'Rappel de tâche à échéance', icon: Clock, color: '#3b82f6' },
      { key: 'ticketCreated', label: 'Nouveau ticket', description: 'Quand un ticket SAV est créé', icon: AlertTriangle, color: '#ef4444' },
      { key: 'interventionReminder', label: 'Rappel intervention', description: 'Avant chaque intervention planifiée', icon: CalendarDays, color: '#06b6d4' },
      { key: 'weeklyReport', label: 'Rapport hebdo', description: 'Résumé de la semaine', icon: FileText, color: '#a855f7' },
      { key: 'monthlyDigest', label: 'Digest mensuel', description: 'Récapitulatif du mois', icon: FileText, color: '#ec4899' },
      { key: 'systemAlerts', label: 'Alertes système', description: 'Maintenance et mises à jour', icon: AlertTriangle, color: '#f97316' },
      { key: 'marketingUpdates', label: 'Marketing', description: 'Nouveautés et offres', icon: Megaphone, color: '#64748b' },
    ];

    return (
      <div className="space-y-6">
        <SectionCard title="Canaux de notification" description="Activez/désactivez les canaux" icon={Bell} color="#f59e0b">
          <FieldRow label="Notifications par email" description="Recevoir les notifications par email">
            <Toggle checked={notifications.emailEnabled} onChange={v => setNotifications(p => ({ ...p, emailEnabled: v }))} />
          </FieldRow>
          <FieldRow label="Notifications push" description="Notifications dans le navigateur/mobile">
            <Toggle checked={notifications.pushEnabled} onChange={v => setNotifications(p => ({ ...p, pushEnabled: v }))} />
          </FieldRow>
          <FieldRow label="Notifications SMS" description="Recevoir par SMS (crédits requis)">
            <Toggle checked={notifications.smsEnabled} onChange={v => setNotifications(p => ({ ...p, smsEnabled: v }))} />
          </FieldRow>
          <FieldRow label="Sons" description="Jouer un son à chaque notification">
            <Toggle checked={notifications.soundEnabled} onChange={v => setNotifications(p => ({ ...p, soundEnabled: v }))} />
          </FieldRow>
          <FieldRow label="Bureau" description="Notifications système du bureau">
            <Toggle checked={notifications.desktopEnabled} onChange={v => setNotifications(p => ({ ...p, desktopEnabled: v }))} />
          </FieldRow>
        </SectionCard>

        <SectionCard title="Préférences par catégorie" description="Personnalisez chaque type de notification" icon={Sliders} color="#f59e0b">
          <div className="space-y-1">
            {/* Header */}
            <div className="flex items-center gap-3 px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="flex-1">Événement</span>
              <span className="w-14 text-center">Email</span>
              <span className="w-14 text-center">Push</span>
              <span className="w-14 text-center">SMS</span>
            </div>
            {categories.map(cat => (
              <div key={cat.key} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/3 transition-all border-t border-white/5 first:border-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cat.color}15` }}>
                  <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-300">{cat.label}</p>
                  <p className="text-[10px] text-slate-500 truncate">{cat.description}</p>
                </div>
                <div className="w-14 flex justify-center">
                  <Toggle size="sm" checked={notifications[cat.key]?.email} onChange={v => setNotifications(p => ({ ...p, [cat.key]: { ...p[cat.key], email: v } }))} />
                </div>
                <div className="w-14 flex justify-center">
                  <Toggle size="sm" checked={notifications[cat.key]?.push} onChange={v => setNotifications(p => ({ ...p, [cat.key]: { ...p[cat.key], push: v } }))} />
                </div>
                <div className="w-14 flex justify-center">
                  <Toggle size="sm" checked={notifications[cat.key]?.sms} onChange={v => setNotifications(p => ({ ...p, [cat.key]: { ...p[cat.key], sms: v } }))} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Heures silencieuses" description="Pas de notifications pendant ces heures" icon={BellOff} color="#f59e0b">
          <FieldRow label="Activer les heures silencieuses">
            <Toggle checked={notifications.quietHoursEnabled} onChange={v => setNotifications(p => ({ ...p, quietHoursEnabled: v }))} />
          </FieldRow>
          {notifications.quietHoursEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Début</label>
                  <TextInput type="time" value={notifications.quietStart} onChange={v => setNotifications(p => ({ ...p, quietStart: v }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Fin</label>
                  <TextInput type="time" value={notifications.quietEnd} onChange={v => setNotifications(p => ({ ...p, quietEnd: v }))} />
                </div>
              </div>
              <FieldRow label="Inclure les weekends" description="Pas de notifications le samedi et dimanche">
                <Toggle checked={notifications.quietWeekends} onChange={v => setNotifications(p => ({ ...p, quietWeekends: v }))} />
              </FieldRow>
            </>
          )}
        </SectionCard>
      </div>
    );
  };

  /* ────────────────────────────────────────────────
     SECURITY TAB
  ──────────────────────────────────────────────── */
  const renderSecurity = () => (
    <div className="space-y-6">
      <SectionCard title="Mot de passe" description="Gérez votre mot de passe de connexion" icon={Lock} color="#ef4444">
        <div className="space-y-4">
          <FieldRow label="Mot de passe actuel" horizontal={false}>
            <TextInput type="password" value="" onChange={() => {}} icon={Lock} placeholder="••••••••" />
          </FieldRow>
          <FieldRow label="Nouveau mot de passe" horizontal={false}>
            <TextInput type="password" value="" onChange={() => {}} icon={Key} placeholder="••••••••" />
          </FieldRow>
          <FieldRow label="Confirmer le mot de passe" horizontal={false}>
            <TextInput type="password" value="" onChange={() => {}} icon={Key} placeholder="••••••••" />
          </FieldRow>
          <ActionButton variant="primary" size="sm" icon={Save}>Changer le mot de passe</ActionButton>
        </div>
      </SectionCard>

      <SectionCard title="Authentification à deux facteurs" description="Ajoutez une couche de sécurité supplémentaire" icon={Shield} color="#ef4444" badge={security.twoFactorEnabled ? 'Activé' : 'Désactivé'}>
        <FieldRow label="Activer la 2FA" description="Protégez votre compte avec un second facteur">
          <Toggle checked={security.twoFactorEnabled} onChange={v => setSecurity(p => ({ ...p, twoFactorEnabled: v }))} />
        </FieldRow>
        {security.twoFactorEnabled && (
          <FieldRow label="Méthode 2FA">
            <SelectInput value={security.twoFactorMethod} onChange={v => setSecurity(p => ({ ...p, twoFactorMethod: v }))}
              options={[
                { value: 'app', label: '📱 App Authenticator' },
                { value: 'sms', label: '💬 SMS' },
                { value: 'email', label: '📧 Email' },
              ]} />
          </FieldRow>
        )}
      </SectionCard>

      <SectionCard title="Politique de mot de passe" description="Règles pour les mots de passe de l'équipe" icon={Key} color="#ef4444">
        <FieldRow label="Longueur minimum">
          <SelectInput value={String(security.passwordMinLength)} onChange={v => setSecurity(p => ({ ...p, passwordMinLength: parseInt(v) }))}
            options={[
              { value: '6', label: '6 caractères' },
              { value: '8', label: '8 caractères' },
              { value: '10', label: '10 caractères' },
              { value: '12', label: '12 caractères' },
              { value: '16', label: '16 caractères' },
            ]} />
        </FieldRow>
        <FieldRow label="Majuscule requise" description="Au moins une lettre majuscule">
          <Toggle checked={security.requireUppercase} onChange={v => setSecurity(p => ({ ...p, requireUppercase: v }))} />
        </FieldRow>
        <FieldRow label="Chiffre requis" description="Au moins un chiffre">
          <Toggle checked={security.requireNumbers} onChange={v => setSecurity(p => ({ ...p, requireNumbers: v }))} />
        </FieldRow>
        <FieldRow label="Caractère spécial requis" description="Ex: !@#$%^&*">
          <Toggle checked={security.requireSpecialChars} onChange={v => setSecurity(p => ({ ...p, requireSpecialChars: v }))} />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Sessions & Appareils" description="Gérez vos sessions actives" icon={Monitor} color="#ef4444">
        <FieldRow label="Expiration de session" description="Déconnexion automatique après inactivité">
          <SelectInput value={String(security.sessionTimeout)} onChange={v => setSecurity(p => ({ ...p, sessionTimeout: parseInt(v) }))}
            options={[
              { value: '15', label: '15 minutes' },
              { value: '30', label: '30 minutes' },
              { value: '60', label: '1 heure' },
              { value: '120', label: '2 heures' },
              { value: '480', label: '8 heures' },
              { value: '0', label: 'Jamais' },
            ]} />
        </FieldRow>
        <FieldRow label="Alertes de connexion" description="Notifier lors d'une connexion inhabituelle">
          <Toggle checked={security.loginAlerts} onChange={v => setSecurity(p => ({ ...p, loginAlerts: v }))} />
        </FieldRow>
        <FieldRow label="Whitelist IP" description="Restreindre l'accès à certaines IP (une par ligne)" horizontal={false}>
          <TextArea value={security.ipWhitelist} onChange={v => setSecurity(p => ({ ...p, ipWhitelist: v }))} placeholder="192.168.1.0/24&#10;10.0.0.0/8" rows={3} />
        </FieldRow>
        <ActionButton variant="danger" size="sm" icon={LogOut}>Déconnecter toutes les autres sessions</ActionButton>
      </SectionCard>
    </div>
  );

  /* ────────────────────────────────────────────────
     TEAM TAB
  ──────────────────────────────────────────────── */
  const renderTeam = () => (
    <div className="space-y-6">
      <SectionCard title="Inviter un membre" description="Ajoutez de nouveaux collaborateurs" icon={Plus} color="#10b981">
        <div className="flex gap-3">
          <TextInput className="flex-1" value={team.inviteEmail} onChange={v => setTeam(p => ({ ...p, inviteEmail: v }))} icon={Mail} placeholder="email@collaborateur.com" />
          <SelectInput value={team.inviteRole} onChange={v => setTeam(p => ({ ...p, inviteRole: v }))} className="w-40"
            options={team.roles.map(r => ({ value: r.name.toLowerCase(), label: r.name }))} />
          <ActionButton variant="primary" icon={Plus}>Inviter</ActionButton>
        </div>
        <p className="text-xs text-slate-500">
          {billing.usage.users}/{billing.usage.maxUsers} membres utilisés sur votre plan
        </p>
      </SectionCard>

      <SectionCard title="Rôles & Permissions" description="Configurez les droits d'accès" icon={Shield} color="#10b981" badge={`${team.roles.length} rôles`}>
        <div className="space-y-2">
          {team.roles.map(role => (
            <div key={role.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: role.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200">{role.name}</p>
                <p className="text-[10px] text-slate-500">{role.permissions === 'all' ? 'Accès complet' : `Modules: ${role.permissions}`}</p>
              </div>
              <ActionButton variant="ghost" size="sm" icon={Edit3} className="opacity-0 group-hover:opacity-100">Modifier</ActionButton>
            </div>
          ))}
          <ActionButton variant="secondary" size="sm" icon={Plus}>Créer un rôle</ActionButton>
        </div>
      </SectionCard>

      <SectionCard title="Membres de l'équipe" description="Tous les utilisateurs du CRM" icon={Users} color="#10b981">
        <div className="p-8 text-center">
          <Users className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Les membres apparaîtront ici</p>
          <p className="text-xs text-slate-500 mt-1">Invitez des collaborateurs via le formulaire ci-dessus</p>
        </div>
      </SectionCard>
    </div>
  );

  /* ────────────────────────────────────────────────
     BILLING TAB
  ──────────────────────────────────────────────── */
  const renderBilling = () => {
    const plans = [
      { id: 'starter', name: 'Starter', price: 29, features: ['5 utilisateurs', '1 000 leads', '5 Go stockage', 'Email support'], color: '#64748b' },
      { id: 'pro', name: 'Pro', price: 79, features: ['25 utilisateurs', '5 000 leads', '10 Go stockage', 'Support prioritaire', 'API access', 'Workflows'], color: '#8b5cf6', popular: true },
      { id: 'enterprise', name: 'Enterprise', price: 199, features: ['Illimité utilisateurs', 'Illimité leads', '100 Go stockage', 'Support dédié', 'SSO / SAML', 'Custom branding'], color: '#f97316' },
    ];

    return (
      <div className="space-y-6">
        <SectionCard title="Plan actuel" description="Gérez votre abonnement" icon={CreditCard} color="#6366f1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div key={plan.id}
                className={`relative p-5 rounded-2xl border transition-all ${
                  billing.plan === plan.id
                    ? 'border-violet-500/40 bg-violet-500/5'
                    : 'border-white/8 bg-white/2 hover:border-white/15'
                }`}>
                {plan.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-0.5 rounded-full bg-violet-600 text-white">
                    Populaire
                  </span>
                )}
                <h4 className="text-lg font-bold text-slate-100" style={{ fontFamily: 'Manrope, sans-serif' }}>{plan.name}</h4>
                <div className="mt-2">
                  <span className="text-3xl font-black" style={{ color: plan.color }}>{plan.price}€</span>
                  <span className="text-xs text-slate-500">/mois</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-400">
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full mt-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    billing.plan === plan.id
                      ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                      : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {billing.plan === plan.id ? '✓ Plan actuel' : 'Choisir ce plan'}
                </button>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Utilisation" description="Consommation de votre plan" icon={TrendingUp} color="#6366f1">
          {[
            { label: 'Leads', used: billing.usage.leads, max: billing.usage.maxLeads, color: '#8b5cf6' },
            { label: 'Stockage', used: billing.usage.storage, max: billing.usage.maxStorage, unit: 'Go', color: '#3b82f6' },
            { label: 'Utilisateurs', used: billing.usage.users, max: billing.usage.maxUsers, color: '#10b981' },
          ].map(item => {
            const pct = (item.used / item.max) * 100;
            return (
              <div key={item.label} className="py-3 border-t border-white/5 first:border-0">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-300">{item.label}</span>
                  <span className="text-slate-500">{item.used}{item.unit ? ` ${item.unit}` : ''} / {item.max}{item.unit ? ` ${item.unit}` : ''}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct > 80 ? '#ef4444' : item.color }} />
                </div>
              </div>
            );
          })}
        </SectionCard>

        <SectionCard title="Moyen de paiement" description="Carte bancaire enregistrée" icon={CreditCard} color="#6366f1">
          <div className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 rounded-lg bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">{billing.cardBrand}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">•••• •••• •••• {billing.cardLast4}</p>
                <p className="text-[10px] text-slate-500">Expire 12/2028</p>
              </div>
            </div>
            <ActionButton variant="secondary" size="sm" icon={Edit3}>Modifier</ActionButton>
          </div>
          <FieldRow label="Renouvellement automatique">
            <Toggle checked={billing.autoRenew} onChange={v => setBilling(p => ({ ...p, autoRenew: v }))} />
          </FieldRow>
        </SectionCard>
      </div>
    );
  };

  /* ────────────────────────────────────────────────
     EMAIL & SMS TAB
  ──────────────────────────────────────────────── */
  const renderEmail = () => (
    <div className="space-y-6">
      <SectionCard title="Configuration SMTP" description="Serveur d'envoi d'emails" icon={Mail} color="#06b6d4" collapsible defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Serveur SMTP</label>
            <TextInput value={emailSettings.smtpHost} onChange={v => setEmailSettings(p => ({ ...p, smtpHost: v }))} placeholder="smtp.gmail.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Port</label>
            <TextInput value={String(emailSettings.smtpPort)} onChange={v => setEmailSettings(p => ({ ...p, smtpPort: parseInt(v) || 587 }))} placeholder="587" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Utilisateur</label>
            <TextInput value={emailSettings.smtpUser} onChange={v => setEmailSettings(p => ({ ...p, smtpUser: v }))} icon={User} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Mot de passe</label>
            <TextInput type="password" value={emailSettings.smtpPassword} onChange={v => setEmailSettings(p => ({ ...p, smtpPassword: v }))} icon={Lock} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Chiffrement</label>
            <SelectInput value={emailSettings.smtpEncryption} onChange={v => setEmailSettings(p => ({ ...p, smtpEncryption: v }))}
              options={[
                { value: 'tls', label: 'TLS (recommandé)' },
                { value: 'ssl', label: 'SSL' },
                { value: 'none', label: 'Aucun' },
              ]} />
          </div>
        </div>
        <ActionButton variant="secondary" size="sm" icon={Zap}>Tester la connexion</ActionButton>
      </SectionCard>

      <SectionCard title="Expéditeur" description="Identité de l'envoi" icon={Mail} color="#06b6d4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Nom de l'expéditeur</label>
            <TextInput value={emailSettings.senderName} onChange={v => setEmailSettings(p => ({ ...p, senderName: v }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Email de l'expéditeur</label>
            <TextInput value={emailSettings.senderEmail} onChange={v => setEmailSettings(p => ({ ...p, senderEmail: v }))} icon={Mail} placeholder="contact@globalcleanhome.fr" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Répondre à</label>
            <TextInput value={emailSettings.replyTo} onChange={v => setEmailSettings(p => ({ ...p, replyTo: v }))} icon={Mail} placeholder="support@globalcleanhome.fr" />
          </div>
        </div>
        <FieldRow label="Signature email" horizontal={false}>
          <TextArea value={emailSettings.signature} onChange={v => setEmailSettings(p => ({ ...p, signature: v }))} placeholder="Cordialement,&#10;L'équipe Global Clean Home" rows={4} />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Configuration SMS" description="Envoi de SMS (Twilio, Vonage...)" icon={Smartphone} color="#06b6d4" collapsible defaultOpen={false}>
        <FieldRow label="Fournisseur SMS">
          <SelectInput value={emailSettings.smsProvider} onChange={v => setEmailSettings(p => ({ ...p, smsProvider: v }))}
            options={[
              { value: 'twilio', label: 'Twilio' },
              { value: 'vonage', label: 'Vonage' },
              { value: 'messagebird', label: 'MessageBird' },
              { value: 'ovh', label: 'OVH SMS' },
            ]} />
        </FieldRow>
        <FieldRow label="Clé API" horizontal={false}>
          <TextInput type="password" value={emailSettings.smsApiKey} onChange={v => setEmailSettings(p => ({ ...p, smsApiKey: v }))} icon={Key} placeholder="sk_••••••••" />
        </FieldRow>
        <FieldRow label="Numéro expéditeur" horizontal={false}>
          <TextInput value={emailSettings.smsFrom} onChange={v => setEmailSettings(p => ({ ...p, smsFrom: v }))} icon={Phone} placeholder="+33600000000" />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Automatisations email" description="Emails automatiques" icon={Zap} color="#06b6d4">
        <FieldRow label="Email de bienvenue" description="Envoyé automatiquement aux nouveaux clients">
          <Toggle checked={emailSettings.templateWelcome} onChange={v => setEmailSettings(p => ({ ...p, templateWelcome: v }))} />
        </FieldRow>
        <FieldRow label="Confirmation de devis" description="Envoyé quand un devis est généré">
          <Toggle checked={emailSettings.templateQuote} onChange={v => setEmailSettings(p => ({ ...p, templateQuote: v }))} />
        </FieldRow>
        <FieldRow label="Facture par email" description="Envoi automatique des factures">
          <Toggle checked={emailSettings.templateInvoice} onChange={v => setEmailSettings(p => ({ ...p, templateInvoice: v }))} />
        </FieldRow>
        <FieldRow label="Rappel de paiement" description="Envoyé avant l'échéance">
          <Toggle checked={emailSettings.templateReminder} onChange={v => setEmailSettings(p => ({ ...p, templateReminder: v }))} />
        </FieldRow>
        <FieldRow label="Relance automatique" description={`Envoyée ${emailSettings.followUpDelay}h après un devis sans réponse`}>
          <Toggle checked={emailSettings.autoFollowUp} onChange={v => setEmailSettings(p => ({ ...p, autoFollowUp: v }))} />
        </FieldRow>
        <FieldRow label="Email de remerciement" description="Après chaque intervention">
          <Toggle checked={emailSettings.autoThankYou} onChange={v => setEmailSettings(p => ({ ...p, autoThankYou: v }))} />
        </FieldRow>
        <FieldRow label="Emails d'anniversaire" description="Souhaitez l'anniversaire de vos clients">
          <Toggle checked={emailSettings.birthdayEmails} onChange={v => setEmailSettings(p => ({ ...p, birthdayEmails: v }))} />
        </FieldRow>
      </SectionCard>
    </div>
  );

  /* ────────────────────────────────────────────────
     SCHEDULING TAB
  ──────────────────────────────────────────────── */
  const renderScheduling = () => {
    const days = [
      { key: 'mon', label: 'Lun' },
      { key: 'tue', label: 'Mar' },
      { key: 'wed', label: 'Mer' },
      { key: 'thu', label: 'Jeu' },
      { key: 'fri', label: 'Ven' },
      { key: 'sat', label: 'Sam' },
      { key: 'sun', label: 'Dim' },
    ];

    return (
      <div className="space-y-6">
        <SectionCard title="Jours de travail" description="Définissez vos jours ouvrés" icon={CalendarDays} color="#84cc16">
          <div className="flex gap-2 flex-wrap">
            {days.map(d => (
              <button
                key={d.key}
                onClick={() => setScheduling(p => ({ ...p, workDays: { ...p.workDays, [d.key]: !p.workDays[d.key] } }))}
                className={`w-12 h-12 rounded-xl text-xs font-bold transition-all ${
                  scheduling.workDays[d.key]
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-slate-500 border border-white/10'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Horaires" description="Heures de travail et pauses" icon={Clock} color="#84cc16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Début journée</label>
              <TextInput type="time" value={scheduling.workStart} onChange={v => setScheduling(p => ({ ...p, workStart: v }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Fin journée</label>
              <TextInput type="time" value={scheduling.workEnd} onChange={v => setScheduling(p => ({ ...p, workEnd: v }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Début pause</label>
              <TextInput type="time" value={scheduling.breakStart} onChange={v => setScheduling(p => ({ ...p, breakStart: v }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Fin pause</label>
              <TextInput type="time" value={scheduling.breakEnd} onChange={v => setScheduling(p => ({ ...p, breakEnd: v }))} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Réservations" description="Paramètres des créneaux" icon={CalendarDays} color="#84cc16">
          <FieldRow label="Durée d'un créneau" description="Durée par défaut d'une intervention">
            <SelectInput value={String(scheduling.slotDuration)} onChange={v => setScheduling(p => ({ ...p, slotDuration: parseInt(v) }))}
              options={[
                { value: '30', label: '30 minutes' },
                { value: '60', label: '1 heure' },
                { value: '90', label: '1h30' },
                { value: '120', label: '2 heures' },
                { value: '180', label: '3 heures' },
                { value: '240', label: '4 heures' },
              ]} />
          </FieldRow>
          <FieldRow label="Temps tampon" description="Temps entre deux interventions">
            <SelectInput value={String(scheduling.bufferTime)} onChange={v => setScheduling(p => ({ ...p, bufferTime: parseInt(v) }))}
              options={[
                { value: '0', label: 'Aucun' },
                { value: '15', label: '15 minutes' },
                { value: '30', label: '30 minutes' },
                { value: '45', label: '45 minutes' },
                { value: '60', label: '1 heure' },
              ]} />
          </FieldRow>
          <FieldRow label="Max réservations/jour" description="Nombre maximum d'interventions par jour">
            <TextInput type="number" value={String(scheduling.maxBookingsPerDay)} onChange={v => setScheduling(p => ({ ...p, maxBookingsPerDay: parseInt(v) || 0 }))} />
          </FieldRow>
          <FieldRow label="Confirmation automatique" description="Confirmer les réservations sans validation manuelle">
            <Toggle checked={scheduling.autoConfirm} onChange={v => setScheduling(p => ({ ...p, autoConfirm: v }))} />
          </FieldRow>
          <FieldRow label="Rappel avant intervention" description="Heures avant l'intervention">
            <SelectInput value={String(scheduling.reminderBefore)} onChange={v => setScheduling(p => ({ ...p, reminderBefore: parseInt(v) }))}
              options={[
                { value: '2', label: '2 heures' },
                { value: '12', label: '12 heures' },
                { value: '24', label: '24 heures' },
                { value: '48', label: '48 heures' },
              ]} />
          </FieldRow>
          <FieldRow label="Limite d'annulation" description="Heures minimum avant pour annuler">
            <SelectInput value={String(scheduling.cancellationDeadline)} onChange={v => setScheduling(p => ({ ...p, cancellationDeadline: parseInt(v) }))}
              options={[
                { value: '2', label: '2 heures' },
                { value: '6', label: '6 heures' },
                { value: '12', label: '12 heures' },
                { value: '24', label: '24 heures' },
                { value: '48', label: '48 heures' },
              ]} />
          </FieldRow>
        </SectionCard>

        <SectionCard title="Heures supplémentaires" description="Tarification hors horaires" icon={Clock} color="#84cc16">
          <FieldRow label="Activer les heures sup" description="Permettre les interventions hors horaires">
            <Toggle checked={scheduling.overtimeEnabled} onChange={v => setScheduling(p => ({ ...p, overtimeEnabled: v }))} />
          </FieldRow>
          {scheduling.overtimeEnabled && (
            <FieldRow label="Coefficient" description="Multiplicateur du tarif normal">
              <SelectInput value={String(scheduling.overtimeRate)} onChange={v => setScheduling(p => ({ ...p, overtimeRate: parseFloat(v) }))}
                options={[
                  { value: '1.25', label: 'x1.25 (+25%)' },
                  { value: '1.5', label: 'x1.5 (+50%)' },
                  { value: '1.75', label: 'x1.75 (+75%)' },
                  { value: '2', label: 'x2 (+100%)' },
                ]} />
            </FieldRow>
          )}
        </SectionCard>
      </div>
    );
  };

  /* ────────────────────────────────────────────────
     ZONES TAB
  ──────────────────────────────────────────────── */
  const renderZones = () => (
    <div className="space-y-6">
      <SectionCard title="Rayon de service" description="Zone géographique couverte" icon={MapPin} color="#f43f5e">
        <FieldRow label="Rayon maximum" description="Distance max autour du siège (km)">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="5"
              max="100"
              value={zones.serviceRadius}
              onChange={e => setZones(p => ({ ...p, serviceRadius: parseInt(e.target.value) }))}
              className="w-32 accent-rose-500"
            />
            <span className="text-sm font-bold text-slate-200 w-12 text-right">{zones.serviceRadius} km</span>
          </div>
        </FieldRow>
        <FieldRow label="Coût déplacement" description="Par kilomètre au-delà du rayon gratuit">
          <TextInput value={String(zones.travelCostPerKm)} onChange={v => setZones(p => ({ ...p, travelCostPerKm: parseFloat(v) || 0 }))} placeholder="0.50" className="w-24" />
        </FieldRow>
        <FieldRow label="Rayon gratuit" description="Pas de frais de déplacement dans ce rayon">
          <TextInput value={String(zones.freeDeliveryRadius)} onChange={v => setZones(p => ({ ...p, freeDeliveryRadius: parseInt(v) || 0 }))} placeholder="10" className="w-24" />
        </FieldRow>
        <FieldRow label="Carte sur le portail" description="Afficher la carte des zones sur le portail client">
          <Toggle checked={zones.showMapOnPortal} onChange={v => setZones(p => ({ ...p, showMapOnPortal: v }))} />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Zones de tarification" description="Tarifs différenciés par zone" icon={Layers} color="#f43f5e" badge={`${zones.zones.length} zones`}>
        <div className="space-y-3">
          {zones.zones.map(zone => (
            <div key={zone.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: zone.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200">{zone.name}</p>
                <p className="text-[10px] text-slate-500">Codes postaux : {zone.zipCodes}</p>
              </div>
              <span className={`text-xs font-bold ${zone.surcharge > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {zone.surcharge > 0 ? `+${zone.surcharge}€` : 'Gratuit'}
              </span>
              <ActionButton variant="ghost" size="sm" icon={Edit3} className="opacity-0 group-hover:opacity-100" />
            </div>
          ))}
          <ActionButton variant="secondary" size="sm" icon={Plus}>Ajouter une zone</ActionButton>
        </div>
      </SectionCard>
    </div>
  );

  /* ────────────────────────────────────────────────
     DOCUMENTS TAB
  ──────────────────────────────────────────────── */
  const renderDocuments = () => (
    <div className="space-y-6">
      <SectionCard title="Numérotation" description="Préfixes et compteurs des documents" icon={Hash} color="#a855f7">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Préfixe devis', key: 'quotePrefix', numKey: 'nextQuoteNumber' },
            { label: 'Préfixe facture', key: 'invoicePrefix', numKey: 'nextInvoiceNumber' },
            { label: 'Préfixe contrat', key: 'contractPrefix', numKey: 'nextContractNumber' },
          ].map(item => (
            <div key={item.key} className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">{item.label}</label>
              <div className="flex gap-2">
                <TextInput className="w-24" value={documents[item.key]} onChange={v => setDocuments(p => ({ ...p, [item.key]: v }))} />
                <TextInput className="flex-1" type="number" value={String(documents[item.numKey])} onChange={v => setDocuments(p => ({ ...p, [item.numKey]: parseInt(v) || 0 }))} />
              </div>
              <p className="text-[10px] text-slate-500">Prochain : {documents[item.key]}{documents[item.numKey]}</p>
            </div>
          ))}
        </div>
        <FieldRow label="Numérotation automatique" description="Incrémenter automatiquement les numéros">
          <Toggle checked={documents.autoNumbering} onChange={v => setDocuments(p => ({ ...p, autoNumbering: v }))} />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Paramètres par défaut" description="Valeurs par défaut des documents" icon={FileText} color="#a855f7">
        <FieldRow label="Délai de paiement" description="Jours accordés pour le paiement">
          <SelectInput value={String(documents.defaultPaymentTerms)} onChange={v => setDocuments(p => ({ ...p, defaultPaymentTerms: parseInt(v) }))}
            options={[
              { value: '0', label: 'Comptant' },
              { value: '15', label: '15 jours' },
              { value: '30', label: '30 jours' },
              { value: '45', label: '45 jours' },
              { value: '60', label: '60 jours' },
            ]} />
        </FieldRow>
        <FieldRow label="Taux de TVA par défaut">
          <SelectInput value={String(documents.defaultTaxRate)} onChange={v => setDocuments(p => ({ ...p, defaultTaxRate: parseInt(v) }))}
            options={[
              { value: '0', label: '0% (Exonéré)' },
              { value: '5.5', label: '5.5% (Réduit)' },
              { value: '10', label: '10% (Intermédiaire)' },
              { value: '20', label: '20% (Normal)' },
            ]} />
        </FieldRow>
        <FieldRow label="Qualité PDF">
          <SelectInput value={documents.pdfQuality} onChange={v => setDocuments(p => ({ ...p, pdfQuality: v }))}
            options={[
              { value: 'draft', label: 'Brouillon (rapide)' },
              { value: 'standard', label: 'Standard' },
              { value: 'high', label: 'Haute qualité' },
            ]} />
        </FieldRow>
        <FieldRow label="Afficher le logo" description="Sur les devis, factures et contrats">
          <Toggle checked={documents.showLogo} onChange={v => setDocuments(p => ({ ...p, showLogo: v }))} />
        </FieldRow>
        <FieldRow label="Afficher la signature" description="Espace de signature en bas des documents">
          <Toggle checked={documents.showSignature} onChange={v => setDocuments(p => ({ ...p, showSignature: v }))} />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Coordonnées bancaires" description="Affichées sur les factures" icon={CreditCard} color="#a855f7" collapsible defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Banque</label>
            <TextInput value={documents.bankName} onChange={v => setDocuments(p => ({ ...p, bankName: v }))} placeholder="BNP Paribas" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">IBAN</label>
            <TextInput value={documents.iban} onChange={v => setDocuments(p => ({ ...p, iban: v }))} placeholder="FR76 1234 5678 9012 3456 7890 123" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">BIC / SWIFT</label>
            <TextInput value={documents.bic} onChange={v => setDocuments(p => ({ ...p, bic: v }))} placeholder="BNPAFRPP" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Mentions légales" description="Texte en bas des documents" icon={FileText} color="#a855f7" collapsible defaultOpen={false}>
        <FieldRow label="Pied de page" horizontal={false}>
          <TextArea value={documents.footerText} onChange={v => setDocuments(p => ({ ...p, footerText: v }))} placeholder="Pénalités de retard : 3x le taux d'intérêt légal..." rows={3} />
        </FieldRow>
        <FieldRow label="Mentions légales" horizontal={false}>
          <TextArea value={documents.legalMentions} onChange={v => setDocuments(p => ({ ...p, legalMentions: v }))} placeholder="SARL au capital de... RCS Paris..." rows={4} />
        </FieldRow>
      </SectionCard>
    </div>
  );

  /* ────────────────────────────────────────────────
     INTEGRATIONS TAB
  ──────────────────────────────────────────────── */
  const renderIntegrations = () => {
    const integrationsList = [
      { key: 'stripe', name: 'Stripe', desc: 'Paiements en ligne', icon: '💳', color: '#6366f1' },
      { key: 'googleCalendar', name: 'Google Calendar', desc: 'Synchronisation du planning', icon: '📅', color: '#4285f4' },
      { key: 'googleMaps', name: 'Google Maps', desc: 'Géolocalisation et itinéraires', icon: '🗺️', color: '#34a853' },
      { key: 'mailchimp', name: 'Mailchimp', desc: 'Campagnes email marketing', icon: '🐒', color: '#ffe01b' },
      { key: 'slack', name: 'Slack', desc: 'Notifications d\'équipe', icon: '💬', color: '#4a154b' },
      { key: 'zapier', name: 'Zapier', desc: 'Automatisations cross-app', icon: '⚡', color: '#ff4a00' },
      { key: 'hubspot', name: 'HubSpot', desc: 'CRM & Marketing', icon: '🔶', color: '#ff7a59' },
      { key: 'quickbooks', name: 'QuickBooks', desc: 'Comptabilité', icon: '📊', color: '#2ca01c' },
      { key: 'twilio', name: 'Twilio', desc: 'SMS & WhatsApp', icon: '📱', color: '#f22f46' },
      { key: 'sendgrid', name: 'SendGrid', desc: 'Emails transactionnels', icon: '📧', color: '#1a82e2' },
      { key: 'googleAds', name: 'Google Ads', desc: 'Tracking des conversions', icon: '📢', color: '#fbbc04' },
      { key: 'facebookAds', name: 'Facebook Ads', desc: 'Pixel de suivi', icon: '📘', color: '#1877f2' },
      { key: 'wordpress', name: 'WordPress', desc: 'Site web & formulaires', icon: '🌐', color: '#21759b' },
    ];

    return (
      <div className="space-y-6">
        <SectionCard title="Services connectés" description="Gérez vos intégrations tierces" icon={Zap} color="#eab308"
          badge={`${integrationsList.filter(i => integrations[i.key]?.connected).length} actives`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {integrationsList.map(int => {
              const connected = integrations[int.key]?.connected;
              return (
                <div key={int.key}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    connected ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/8 bg-white/2 hover:border-white/15'
                  }`}>
                  <span className="text-2xl flex-shrink-0">{int.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-200">{int.name}</p>
                      {connected && <Badge color="#10b981">Connecté</Badge>}
                    </div>
                    <p className="text-[10px] text-slate-500">{int.desc}</p>
                  </div>
                  <ActionButton
                    variant={connected ? 'success' : 'secondary'}
                    size="sm"
                    icon={connected ? Check : Link2}
                  >
                    {connected ? 'Gérer' : 'Connecter'}
                  </ActionButton>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    );
  };

  /* ────────────────────────────────────────────────
     API TAB
  ──────────────────────────────────────────────── */
  const renderApi = () => (
    <div className="space-y-6">
      <SectionCard title="Clés API" description="Accédez au CRM via l'API REST" icon={Key} color="#64748b" badge={`${apiSettings.apiKeys.length} clés`}>
        <div className="space-y-3">
          {apiSettings.apiKeys.map(key => (
            <div key={key.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${key.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200">{key.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">{key.key}</p>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-[10px] text-slate-500">Créée le {key.created}</p>
                <p className="text-[10px] text-slate-500">Dernier usage : {key.lastUsed}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <ActionButton variant="ghost" size="sm" icon={Copy} />
                <ActionButton variant="ghost" size="sm" icon={RefreshCw} />
                <ActionButton variant="ghost" size="sm" icon={Trash2} />
              </div>
            </div>
          ))}
          <ActionButton variant="secondary" size="sm" icon={Plus}>Nouvelle clé API</ActionButton>
        </div>
      </SectionCard>

      <SectionCard title="Webhooks" description="Recevez des événements en temps réel" icon={Zap} color="#64748b">
        <FieldRow label="URL du webhook" horizontal={false}>
          <TextInput value={apiSettings.webhookUrl} onChange={v => setApiSettings(p => ({ ...p, webhookUrl: v }))} icon={Link2} placeholder="https://votre-app.com/webhook" />
        </FieldRow>
        <FieldRow label="Événements" description="Sélectionnez les événements à envoyer" horizontal={false}>
          <div className="flex flex-wrap gap-2">
            {['lead.created', 'lead.updated', 'lead.deleted', 'quote.created', 'quote.accepted', 'quote.rejected',
              'invoice.created', 'payment.received', 'task.completed', 'booking.created', 'booking.cancelled',
              'ticket.created', 'ticket.resolved', 'contract.signed'].map(evt => {
              const isActive = apiSettings.webhookEvents.includes(evt);
              return (
                <button
                  key={evt}
                  onClick={() => setApiSettings(p => ({
                    ...p,
                    webhookEvents: isActive
                      ? p.webhookEvents.filter(e => e !== evt)
                      : [...p.webhookEvents, evt]
                  }))}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all ${
                    isActive ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-white/5 text-slate-500 border border-white/10'
                  }`}
                >
                  {evt}
                </button>
              );
            })}
          </div>
        </FieldRow>
        <FieldRow label="Rate limit" description="Requêtes max par heure">
          <TextInput type="number" value={String(apiSettings.rateLimit)} onChange={v => setApiSettings(p => ({ ...p, rateLimit: parseInt(v) || 0 }))} className="w-28" />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Documentation API" description="Ressources pour les développeurs" icon={FileText} color="#64748b">
        <div className="flex gap-3 flex-wrap">
          <ActionButton variant="secondary" size="sm" icon={ExternalLink}>Documentation</ActionButton>
          <ActionButton variant="secondary" size="sm" icon={ExternalLink}>Swagger UI</ActionButton>
          <ActionButton variant="secondary" size="sm" icon={Download}>Postman Collection</ActionButton>
        </div>
      </SectionCard>
    </div>
  );

  /* ────────────────────────────────────────────────
     DATA TAB
  ──────────────────────────────────────────────── */
  const renderData = () => (
    <div className="space-y-6">
      <SectionCard title="Sauvegardes automatiques" description="Protection de vos données" icon={Cloud} color="#0ea5e9">
        <FieldRow label="Sauvegarde automatique" description="Sauvegarder régulièrement vos données">
          <Toggle checked={dataSettings.autoBackup} onChange={v => setDataSettings(p => ({ ...p, autoBackup: v }))} />
        </FieldRow>
        <FieldRow label="Fréquence">
          <SelectInput value={dataSettings.backupFrequency} onChange={v => setDataSettings(p => ({ ...p, backupFrequency: v }))}
            options={[
              { value: 'hourly', label: 'Toutes les heures' },
              { value: 'daily', label: 'Quotidienne' },
              { value: 'weekly', label: 'Hebdomadaire' },
            ]} />
        </FieldRow>
        <FieldRow label="Rétention" description="Durée de conservation des sauvegardes">
          <SelectInput value={String(dataSettings.backupRetention)} onChange={v => setDataSettings(p => ({ ...p, backupRetention: parseInt(v) }))}
            options={[
              { value: '7', label: '7 jours' },
              { value: '14', label: '14 jours' },
              { value: '30', label: '30 jours' },
              { value: '90', label: '90 jours' },
              { value: '365', label: '1 an' },
            ]} />
        </FieldRow>
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
          <div>
            <p className="text-xs font-semibold text-slate-300">Dernière sauvegarde</p>
            <p className="text-[10px] text-slate-500">{new Date(dataSettings.lastBackup).toLocaleString('fr-FR')}</p>
          </div>
          <ActionButton variant="secondary" size="sm" icon={RefreshCw}>Sauvegarder maintenant</ActionButton>
        </div>
      </SectionCard>

      <SectionCard title="Export de données" description="Téléchargez vos données" icon={Download} color="#0ea5e9">
        <FieldRow label="Format d'export">
          <SelectInput value={dataSettings.exportFormat} onChange={v => setDataSettings(p => ({ ...p, exportFormat: v }))}
            options={[
              { value: 'csv', label: 'CSV' },
              { value: 'xlsx', label: 'Excel (XLSX)' },
              { value: 'json', label: 'JSON' },
              { value: 'pdf', label: 'PDF' },
            ]} />
        </FieldRow>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['Leads', 'Devis', 'Factures', 'Clients', 'Interventions', 'Contrats'].map(item => (
            <ActionButton key={item} variant="secondary" size="sm" icon={Download}>{item}</ActionButton>
          ))}
        </div>
        <ActionButton variant="primary" icon={Archive}>Exporter tout (ZIP)</ActionButton>
      </SectionCard>

      <SectionCard title="Import de données" description="Importez des données en masse" icon={Upload} color="#0ea5e9">
        <div className="p-6 rounded-xl border-2 border-dashed border-white/10 text-center hover:border-violet-500/30 transition-all cursor-pointer">
          <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">Glissez un fichier ici ou cliquez</p>
          <p className="text-xs text-slate-500 mt-1">CSV, XLSX ou JSON — Max 50 Mo</p>
        </div>
      </SectionCard>

      <SectionCard title="RGPD & Confidentialité" description="Conformité des données personnelles" icon={Shield} color="#0ea5e9">
        <FieldRow label="Mode RGPD" description="Activer les fonctionnalités de conformité RGPD">
          <Toggle checked={dataSettings.gdprMode} onChange={v => setDataSettings(p => ({ ...p, gdprMode: v }))} />
        </FieldRow>
        <FieldRow label="Rétention des données" description="Durée de conservation des données clients">
          <SelectInput value={String(dataSettings.dataRetention)} onChange={v => setDataSettings(p => ({ ...p, dataRetention: parseInt(v) }))}
            options={[
              { value: '90', label: '90 jours' },
              { value: '180', label: '6 mois' },
              { value: '365', label: '1 an' },
              { value: '730', label: '2 ans' },
              { value: '1095', label: '3 ans' },
              { value: '1825', label: '5 ans' },
            ]} />
        </FieldRow>
        <FieldRow label="Anonymisation auto" description="Anonymiser les données après cette durée (jours)">
          <TextInput type="number" value={String(dataSettings.anonymizeAfter)} onChange={v => setDataSettings(p => ({ ...p, anonymizeAfter: parseInt(v) || 0 }))} className="w-28" />
        </FieldRow>
      </SectionCard>

      {/* Danger zone */}
      <SectionCard title="Zone dangereuse" description="Actions irréversibles" icon={AlertTriangle} color="#ef4444">
        <div className="space-y-3">
          <DangerZone title="Réinitialiser les données" description="Supprimer toutes les données de test" buttonText="Réinitialiser" onConfirm={() => toast.error('Données réinitialisées')} />
          <DangerZone title="Supprimer le compte" description="Supprimer définitivement votre compte et toutes les données" buttonText="Supprimer" onConfirm={() => toast.error('Compte supprimé')} />
        </div>
      </SectionCard>
    </div>
  );

  /* ────────────────────────────────────────────────
     ADVANCED TAB
  ──────────────────────────────────────────────── */
  const renderAdvanced = () => (
    <div className="space-y-6">
      <SectionCard title="Développement" description="Options pour les développeurs" icon={Sliders} color="#78716c">
        <FieldRow label="Mode debug" description="Afficher les informations de débogage">
          <Toggle checked={advanced.debugMode} onChange={v => setAdvanced(p => ({ ...p, debugMode: v }))} />
        </FieldRow>
        <FieldRow label="Fonctionnalités bêta" description="Activer les features en cours de test">
          <Toggle checked={advanced.betaFeatures} onChange={v => setAdvanced(p => ({ ...p, betaFeatures: v }))} />
        </FieldRow>
        <FieldRow label="Niveau de log">
          <SelectInput value={advanced.logLevel} onChange={v => setAdvanced(p => ({ ...p, logLevel: v }))}
            options={[
              { value: 'error', label: 'Error' },
              { value: 'warn', label: 'Warning' },
              { value: 'info', label: 'Info' },
              { value: 'debug', label: 'Debug' },
              { value: 'verbose', label: 'Verbose' },
            ]} />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Performance" description="Optimisation du CRM" icon={Zap} color="#78716c">
        <FieldRow label="Cache activé" description="Mettre en cache les données fréquentes">
          <Toggle checked={advanced.cacheEnabled} onChange={v => setAdvanced(p => ({ ...p, cacheEnabled: v }))} />
        </FieldRow>
        <FieldRow label="Durée du cache" description="En secondes">
          <SelectInput value={String(advanced.cacheDuration)} onChange={v => setAdvanced(p => ({ ...p, cacheDuration: parseInt(v) }))}
            options={[
              { value: '300', label: '5 minutes' },
              { value: '900', label: '15 minutes' },
              { value: '1800', label: '30 minutes' },
              { value: '3600', label: '1 heure' },
              { value: '86400', label: '24 heures' },
            ]} />
        </FieldRow>
        <FieldRow label="Analytics tracking" description="Envoyer des données d'utilisation anonymes">
          <Toggle checked={advanced.analyticsTracking} onChange={v => setAdvanced(p => ({ ...p, analyticsTracking: v }))} />
        </FieldRow>
        <FieldRow label="Rapports d'erreurs" description="Envoyer les erreurs automatiquement">
          <Toggle checked={advanced.errorReporting} onChange={v => setAdvanced(p => ({ ...p, errorReporting: v }))} />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Mode maintenance" description="Suspendre l'accès au CRM" icon={AlertTriangle} color="#78716c">
        <FieldRow label="Activer le mode maintenance" description="Seuls les admins peuvent se connecter">
          <Toggle checked={advanced.maintenanceMode} onChange={v => setAdvanced(p => ({ ...p, maintenanceMode: v }))} />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Personnalisation avancée" description="CSS et JavaScript personnalisés" icon={Layers} color="#78716c" collapsible defaultOpen={false}>
        <FieldRow label="CSS personnalisé" horizontal={false}>
          <TextArea value={advanced.customCss} onChange={v => setAdvanced(p => ({ ...p, customCss: v }))} placeholder="/* Vos styles CSS ici */" rows={5} className="font-mono text-xs" />
        </FieldRow>
        <FieldRow label="JavaScript personnalisé" horizontal={false}>
          <TextArea value={advanced.customJs} onChange={v => setAdvanced(p => ({ ...p, customJs: v }))} placeholder="// Votre code JavaScript ici" rows={5} className="font-mono text-xs" />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Informations système" description="Version et état du CRM" icon={Info} color="#78716c">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Version', value: 'v2.4.1' },
            { label: 'Build', value: '#1847' },
            { label: 'Environnement', value: 'Production' },
            { label: 'Uptime', value: '99.97%' },
            { label: 'Backend', value: 'Railway' },
            { label: 'Frontend', value: 'Vercel' },
            { label: 'Base de données', value: 'Supabase' },
            { label: 'CDN', value: 'Cloudflare' },
          ].map(info => (
            <div key={info.label} className="p-3 rounded-xl bg-white/3 border border-white/5">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{info.label}</p>
              <p className="text-sm font-bold text-slate-200 mt-1">{info.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );

  /* ────────────────────────────────────────────────
     Tab renderer
  ──────────────────────────────────────────────── */
  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfile();
      case 'company': return renderCompany();
      case 'appearance': return renderAppearance();
      case 'notifications': return renderNotifications();
      case 'security': return renderSecurity();
      case 'team': return renderTeam();
      case 'billing': return renderBilling();
      case 'email': return renderEmail();
      case 'scheduling': return renderScheduling();
      case 'zones': return renderZones();
      case 'documents': return renderDocuments();
      case 'integrations': return renderIntegrations();
      case 'api': return renderApi();
      case 'data': return renderData();
      case 'advanced': return renderAdvanced();
      default: return renderProfile();
    }
  };

  const activeTabData = settingsTabs.find(t => t.id === activeTab);

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0" style={{ background: 'hsl(224, 71%, 4%)' }}>
      {/* ── Left sidebar nav ── */}
      <div className="lg:w-64 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-white/5 bg-white/[0.01]">
        <div className="p-4 lg:p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', boxShadow: '0 0 20px rgba(139,92,246,0.3)' }}>
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-100" style={{ fontFamily: 'Manrope, sans-serif' }}>Paramètres</h1>
              <p className="text-[10px] text-slate-500 font-semibold">Configuration du CRM</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-xs text-slate-300 placeholder-slate-600 bg-white/5 border border-white/8 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
            />
          </div>

          {/* Tab list */}
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 hide-scrollbar">
            {filteredTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  }`}
                  style={isActive ? {
                    background: `linear-gradient(90deg, ${tab.color}22, ${tab.color}08)`,
                    color: tab.color,
                    border: `1px solid ${tab.color}25`,
                  } : { border: '1px solid transparent' }}
                >
                  <tab.icon className="w-4 h-4 flex-shrink-0" style={isActive ? { color: tab.color } : {}} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Main content ── */}
      <div ref={contentRef} className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-3xl mx-auto p-4 md:p-6 lg:p-8 pb-32">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {activeTabData && (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${activeTabData.color}15` }}>
                  <activeTabData.icon className="w-4 h-4" style={{ color: activeTabData.color }} />
                </div>
              )}
              <div>
                <h2 className="text-xl font-black text-slate-100" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {activeTabData?.label}
                </h2>
              </div>
            </div>
            <ActionButton variant="primary" icon={Save} onClick={handleSave} loading={saving}>
              Enregistrer
            </ActionButton>
          </div>

          {/* Content */}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
