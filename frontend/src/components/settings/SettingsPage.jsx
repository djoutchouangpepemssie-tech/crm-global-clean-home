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
  CalendarDays, UserCheck, Search, Filter, ChevronDown, ChevronUp,
  TrendingUp, Activity, FolderOpen, CheckSquare
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import BACKEND_URL from '../../config.js';

const API_URL = BACKEND_URL + '/api';

// Vague 5 : composants réutilisables extraits dans shared.jsx (~200 lignes en moins)
import {
  SectionCard, FieldRow, Toggle, TextInput, SelectInput, TextArea,
  ActionButton, ColorPicker, Badge, DangerZone, settingsTabs,
} from './shared';

/* Supprimer les composants réutilisables inlinés ci-dessous — ils vivent
   maintenant dans settings/shared.jsx. L'ancien code est commenté pour
   référence mais sera supprimé au prochain nettoyage. */

// [EXTRACTION VAGUE 5] Les composants SectionCard, FieldRow, Toggle,
// TextInput, SelectInput, TextArea, ActionButton, ColorPicker, Badge,
// DangerZone et settingsTabs ont été extraits dans ./shared.jsx
// (commit vague-5). Les 200 lignes de code qui les définissaient
// ici ont été supprimées.

/* ────────────────────────────────────────────────
   (ancien code composants inline supprimé par Vague 5
    — vit maintenant dans ./shared.jsx)
──────────────────────────────────────────────── */

// PurgePanel extrait dans ./PurgePanel.jsx (Vague 13)
import PurgePanel from './PurgePanel';

/* ────────────────────────────────────────────────
   MAIN SETTINGS PAGE
──────────────────────────────────────────────── */
const SettingsPage = () => {
  const { user, login: setUser } = useAuth();
  const { prefs: themePrefs, updateTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
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

  // Appearance state — synced with ThemeContext for visual keys
  const [appearance, setAppearanceRaw] = useState({
    theme: themePrefs.theme || 'dark',
    accentColor: themePrefs.accentColor || '#8b5cf6',
    fontSize: themePrefs.fontSize || 'medium',
    density: themePrefs.density || 'comfortable',
    sidebarPosition: 'left',
    animationsEnabled: themePrefs.animationsEnabled !== false,
    reducedMotion: false,
    roundedCorners: themePrefs.roundedCorners !== false,
    language: 'fr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'EUR',
    numberFormat: 'fr-FR',
    startPage: '/dashboard',
  });

  // Wrapper: sync visual appearance keys to ThemeContext instantly
  const THEME_KEYS_REF = useRef(['theme', 'accentColor', 'fontSize', 'density', 'animationsEnabled', 'roundedCorners']);
  const setAppearance = useCallback((updater) => {
    setAppearanceRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      // Push visual keys to ThemeContext for instant DOM effect
      THEME_KEYS_REF.current.forEach(key => {
        if (next[key] !== undefined && next[key] !== prev[key]) {
          updateTheme(key, next[key]);
        }
      });
      return next;
    });
  }, [updateTheme]); // eslint-disable-line

  // Notifications state
  const [notifications, setNotifications] = useState({
    emailEnabled: true,
    pushEnabled: true,
    smsEnabled: false,
    soundEnabled: true,
    desktopEnabled: true,
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

  // Password change state (séparé)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

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
  const [inviting, setInviting] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [newRoleForm, setNewRoleForm] = useState({ name: '', color: '#8b5cf6', permissions: '' });
  const [showNewRoleForm, setShowNewRoleForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

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
    usage: { leads: 0, maxLeads: 5000, storage: 0, maxStorage: 10, users: 0, maxUsers: 25 },
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
    smsProvider: 'twilio',
    smsApiKey: '',
    smsFrom: '',
    templateWelcome: true,
    templateQuote: true,
    templateInvoice: true,
    templateReminder: true,
    templateFollowup: true,
    autoFollowUp: true,
    followUpDelay: 48,
    autoThankYou: true,
    birthdayEmails: false,
  });
  const [testingSmtp, setTestingSmtp] = useState(false);

  // 2FA state
  const [twoFASetup, setTwoFASetup] = useState(null); // {secret, otpauth_uri}
  const [twoFACode, setTwoFACode] = useState('');
  const [settingUp2FA, setSettingUp2FA] = useState(false);

  // Zone editing state
  const [editingZone, setEditingZone] = useState(null);
  const [showNewZoneForm, setShowNewZoneForm] = useState(false);
  const [newZoneForm, setNewZoneForm] = useState({ name: '', zipCodes: '', color: '#8b5cf6', surcharge: 0 });

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
    stripe: { connected: false, mode: 'test' },
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
  const [connectingService, setConnectingService] = useState(null);

  // API state
  const [apiSettings, setApiSettings] = useState({
    apiKeys: [],
    webhookUrl: '',
    webhookEvents: ['lead.created', 'quote.accepted', 'payment.received'],
    rateLimit: 1000,
    corsOrigins: '',
  });
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [showNewKey, setShowNewKey] = useState(null);

  // Data state
  const [dataSettings, setDataSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    backupRetention: 30,
    lastBackup: null,
    storageUsed: 0,
    storageMax: 10,
    dataRetention: 365,
    gdprMode: true,
    anonymizeAfter: 730,
    exportFormat: 'csv',
  });
  const [backingUp, setBackingUp] = useState(false);
  const [exporting, setExporting] = useState(null);

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

  /* ────────────────────────────────────────────────
     API HELPERS
  ──────────────────────────────────────────────── */
  const sectionToState = {
    profile: setProfileData,
    company: setCompanyData,
    appearance: setAppearance,
    notifications: setNotifications,
    security: setSecurity,
    team: (data) => setTeam(prev => ({ ...prev, ...data })),
    billing: (data) => setBilling(prev => ({ ...prev, ...data })),
    email: setEmailSettings,
    scheduling: setScheduling,
    zones: setZones,
    documents: setDocuments,
    integrations: setIntegrations,
    api: setApiSettings,
    data: setDataSettings,
    advanced: setAdvanced,
  };

  const sectionToGetter = {
    profile: profileData,
    company: companyData,
    appearance,
    notifications,
    security,
    team,
    billing,
    email: emailSettings,
    scheduling,
    zones,
    documents,
    integrations,
    api: apiSettings,
    data: dataSettings,
    advanced,
  };

  // Charger les settings d'une section depuis l'API
  const loadSection = useCallback(async (section) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/settings/${section}`);
      const data = res.data?.data;
      if (data && sectionToState[section]) {
        sectionToState[section](data);
      }

      // Charger les stats billing depuis le dashboard
      if (section === 'billing') {
        try {
          const statsRes = await axios.get(`${API_URL}/stats/dashboard`);
          const stats = statsRes.data;
          setBilling(prev => ({
            ...prev,
            usage: {
              leads: stats?.total_leads || prev.usage?.leads || 0,
              maxLeads: prev.usage?.maxLeads || 5000,
              storage: prev.usage?.storage || 0,
              maxStorage: prev.usage?.maxStorage || 10,
              users: stats?.total_users || prev.usage?.users || 0,
              maxUsers: prev.usage?.maxUsers || 25,
            }
          }));
        } catch (e) {
          // Ignorer si l'endpoint n'existe pas
        }
      }

      // Charger les membres pour la section team
      if (section === 'team') {
        try {
          const usersRes = await axios.get(`${API_URL}/users`);
          const members = usersRes.data?.users || usersRes.data || [];
          setTeam(prev => ({ ...prev, members }));
        } catch (e) {
          // Ignorer si pas de membres
        }
      }

      // Charger les clés API pour la section api
      if (section === 'api') {
        try {
          const keysRes = await axios.get(`${API_URL}/settings/api-keys/list`);
          setApiSettings(prev => ({ ...prev, apiKeys: keysRes.data?.keys || [] }));
        } catch (e) {
          // Ignorer
        }
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        console.warn(`Erreur chargement section ${section}:`, err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  // Charger la section au changement d'onglet
  useEffect(() => {
    loadSection(activeTab);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]); // eslint-disable-line

  // Sauvegarder la section active
  const handleSave = async () => {
    setSaving(true);
    try {
      const rawData = sectionToGetter[activeTab];
      if (!rawData) {
        toast.error('Pas de données à sauvegarder');
        setSaving(false);
        return;
      }

      // Clone et nettoie les données selon la section
      const cleanData = { ...rawData };

      // Exclure les champs temporaires/formulaires
      const fieldsToExclude = {
        team: ['inviteEmail', 'inviteRole', 'members', 'roles', 'maxMembers'],
        billing: ['usage'],
        email: ['testingSmtp'],
        api: ['apiKeys', 'newKeyName', 'creatingKey', 'showNewKey'],
        data: ['backingUp', 'exporting'],
        integrations: ['connectingService'],
      };

      const excludeList = fieldsToExclude[activeTab] || [];
      excludeList.forEach(field => delete cleanData[field]);

      // Validation basique
      if (Object.keys(cleanData).length === 0) {
        toast.error('Aucune donnée valide à sauvegarder');
        setSaving(false);
        return;
      }

      // Envoyer au backend
      const response = await axios.put(`${API_URL}/settings/${activeTab}`, cleanData);
      toast.success('Paramètres enregistrés avec succès !');
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      const msg = err.response?.data?.detail || err.message || 'Erreur lors de la sauvegarde';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ────────────────────────────────────────────────
     HANDLERS SPÉCIAUX
  ──────────────────────────────────────────────── */

  // Changer le mot de passe
  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    setChangingPassword(true);
    try {
      await axios.post(`${API_URL}/settings/password`, passwordForm);
      toast.success('Mot de passe mis à jour avec succès');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors du changement de mot de passe');
    } finally {
      setChangingPassword(false);
    }
  };

  // Inviter un membre
  const handleInvite = async () => {
    if (!team.inviteEmail) {
      toast.error('Email requis');
      return;
    }
    setInviting(true);
    try {
      await axios.post(`${API_URL}/settings/team/invite`, {
        email: team.inviteEmail,
        role: team.inviteRole,
      });
      toast.success(`Invitation envoyée à ${team.inviteEmail}`);
      setTeam(prev => ({ ...prev, inviteEmail: '' }));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de l\'invitation');
    } finally {
      setInviting(false);
    }
  };

  // Retirer un membre
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir retirer ce membre de l\'équipe ? Cette action est irréversible.')) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/settings/team/${memberId}`);
      toast.success('Membre retiré');
      setTeam(prev => ({ ...prev, members: prev.members.filter(m => m.user_id !== memberId) }));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  // Tester SMTP
  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      await axios.post(`${API_URL}/settings/email/test-smtp`, {
        smtpHost: emailSettings.smtpHost,
        smtpPort: emailSettings.smtpPort,
        smtpUser: emailSettings.smtpUser,
        smtpPassword: emailSettings.smtpPassword,
        smtpEncryption: emailSettings.smtpEncryption,
        senderEmail: emailSettings.senderEmail,
      });
      toast.success('Connexion SMTP réussie !');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Connexion SMTP échouée');
    } finally {
      setTestingSmtp(false);
    }
  };

  // Backup manuel
  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const res = await axios.post(`${API_URL}/settings/data/backup`);
      toast.success('Backup déclenché avec succès !');
      setDataSettings(prev => ({ ...prev, lastBackup: res.data?.started_at || new Date().toISOString() }));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors du backup');
    } finally {
      setBackingUp(false);
    }
  };

  // Export de données
  const handleExport = async (type) => {
    setExporting(type);
    try {
      await axios.post(`${API_URL}/settings/data/export?type=${type}`);
      toast.success(`Export "${type}" en cours. Vous recevrez un email quand il sera prêt.`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de l\'export');
    } finally {
      setExporting(null);
    }
  };

  // Connecter/déconnecter une intégration
  const handleToggleIntegration = async (serviceKey, currentlyConnected) => {
    setConnectingService(serviceKey);
    try {
      if (currentlyConnected) {
        await axios.post(`${API_URL}/settings/integrations/${serviceKey}/disconnect`);
        setIntegrations(prev => ({ ...prev, [serviceKey]: { ...prev[serviceKey], connected: false } }));
        toast.success(`${serviceKey} déconnecté`);
      } else {
        const config = integrations[serviceKey] || {};
        await axios.post(`${API_URL}/settings/integrations/${serviceKey}/connect`, config);
        setIntegrations(prev => ({ ...prev, [serviceKey]: { ...prev[serviceKey], connected: true } }));
        toast.success(`${serviceKey} connecté !`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || `Erreur avec ${serviceKey}`);
    } finally {
      setConnectingService(null);
    }
  };

  // Créer une clé API
  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Nom de la clé requis');
      return;
    }
    setCreatingKey(true);
    try {
      const res = await axios.post(`${API_URL}/settings/api-keys`, { name: newKeyName });
      const newKey = res.data;
      setShowNewKey(newKey);
      setNewKeyName('');
      // Recharger la liste
      const keysRes = await axios.get(`${API_URL}/settings/api-keys/list`);
      setApiSettings(prev => ({ ...prev, apiKeys: keysRes.data?.keys || [] }));
      toast.success('Clé API créée ! Copiez-la maintenant, elle ne sera plus affichée.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setCreatingKey(false);
    }
  };

  // Supprimer une clé API
  const handleDeleteApiKey = async (keyId) => {
    if (!window.confirm('Supprimer cette clé API ? Toute application qui l\'utilise cessera de fonctionner immédiatement.')) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/settings/api-keys/${keyId}`);
      setApiSettings(prev => ({ ...prev, apiKeys: prev.apiKeys.filter(k => k.key_id !== keyId) }));
      toast.success('Clé API supprimée');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  // Régénérer une clé API
  const handleRegenerateApiKey = async (keyId) => {
    try {
      const res = await axios.post(`${API_URL}/settings/api-keys/${keyId}/regenerate`);
      setShowNewKey({ key: res.data.key, name: 'Clé régénérée' });
      toast.success('Clé régénérée ! Copiez-la maintenant.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la régénération');
    }
  };

  // Déconnecter toutes les sessions
  const handleLogoutAll = async () => {
    try {
      await axios.post(`${API_URL}/settings/security/logout-all`);
      toast.success('Toutes les autres sessions ont été déconnectées');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };

  // Supprimer le compte
  const handleDeleteAccount = async () => {
    const confirmText = window.prompt(
      'ATTENTION : Suppression définitive du compte\n\n' +
      'Toutes vos données seront perdues. Cette action est IRRÉVERSIBLE.\n\n' +
      'Tapez "SUPPRIMER MON COMPTE" pour confirmer :'
    );
    if (confirmText !== 'SUPPRIMER MON COMPTE') {
      toast.info('Suppression annulée');
      return;
    }
    try {
      await axios.delete(`${API_URL}/settings/account`);
      toast.success('Compte supprimé');
      setTimeout(() => window.location.href = '/', 1500);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  // ── Team: Create role ──
  const handleCreateRole = async () => {
    if (!newRoleForm.name.trim()) { toast.error('Nom du rôle requis'); return; }
    try {
      const res = await axios.post(`${API_URL}/settings/team/roles`, newRoleForm);
      const role = res.data.role;
      setTeam(prev => ({ ...prev, roles: [...prev.roles, role] }));
      setNewRoleForm({ name: '', color: '#8b5cf6', permissions: '' });
      setShowNewRoleForm(false);
      toast.success(`Rôle "${role.name}" créé !`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  // ── Team: Update role ──
  const handleUpdateRole = async (roleId, data) => {
    try {
      const res = await axios.put(`${API_URL}/settings/team/roles/${roleId}`, data);
      setTeam(prev => ({ ...prev, roles: prev.roles.map(r => r.id === roleId ? res.data.role : r) }));
      setEditingRole(null);
      toast.success('Rôle mis à jour');
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  // ── Team: Delete role ──
  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Supprimer ce rôle ? Les membres qui l\'ont attribué perdront leurs permissions associées.')) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/settings/team/roles/${roleId}`);
      setTeam(prev => ({ ...prev, roles: prev.roles.filter(r => r.id !== roleId) }));
      toast.success('Rôle supprimé');
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  // ── Team: Update member role ──
  const handleUpdateMember = async (memberId, data) => {
    try {
      await axios.put(`${API_URL}/settings/team/${memberId}`, data);
      setTeam(prev => ({ ...prev, members: prev.members.map(m => m.user_id === memberId ? { ...m, ...data } : m) }));
      setEditingMember(null);
      toast.success('Membre mis à jour');
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  // ── Company logo upload ──
  const handleLogoUpload = async (file) => {
    if (!file) return;
    if (file.size > 5_000_000) { toast.error('Image trop grande. Maximum 5 Mo.'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      try {
        await axios.post(`${API_URL}/settings/company/logo`, { logo: base64 });
        setCompanyData(p => ({ ...p, logo: base64 }));
        toast.success('Logo mis à jour !');
      } catch (err) { toast.error('Erreur lors de l\'upload du logo'); }
    };
    reader.readAsDataURL(file);
  };

  // ── Billing: Change plan ──
  const handleChangePlan = async (planId) => {
    if (planId === billing.plan) return;
    try {
      await axios.post(`${API_URL}/settings/billing/change-plan`, { plan: planId, billingCycle: billing.billingCycle });
      setBilling(prev => ({ ...prev, plan: planId }));
      toast.success(`Plan changé vers ${planId} !`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  // ── 2FA setup ──
  const handleSetup2FA = async () => {
    setSettingUp2FA(true);
    try {
      const res = await axios.post(`${API_URL}/settings/security/2fa/setup`);
      setTwoFASetup(res.data);
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
    finally { setSettingUp2FA(false); }
  };

  const handleVerify2FA = async () => {
    if (!twoFACode || twoFACode.length !== 6) { toast.error('Code à 6 chiffres requis'); return; }
    try {
      await axios.post(`${API_URL}/settings/security/2fa/verify`, { code: twoFACode });
      setSecurity(prev => ({ ...prev, twoFactorEnabled: true }));
      setTwoFASetup(null);
      setTwoFACode('');
      toast.success('2FA activée avec succès !');
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  const handleDisable2FA = async () => {
    try {
      await axios.post(`${API_URL}/settings/security/2fa/disable`);
      setSecurity(prev => ({ ...prev, twoFactorEnabled: false }));
      toast.success('2FA désactivée');
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  // ── Zones: Add zone ──
  const handleAddZone = async () => {
    if (!newZoneForm.name.trim()) { toast.error('Nom de la zone requis'); return; }
    try {
      const res = await axios.post(`${API_URL}/settings/zones/add`, newZoneForm);
      const zone = res.data.zone;
      setZones(prev => ({ ...prev, zones: [...(prev.zones || []), zone] }));
      setNewZoneForm({ name: '', zipCodes: '', color: '#8b5cf6', surcharge: 0 });
      setShowNewZoneForm(false);
      toast.success(`Zone "${zone.name}" ajoutée !`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  // ── Zones: Update zone ──
  const handleUpdateZone = async (zoneId, data) => {
    try {
      const res = await axios.put(`${API_URL}/settings/zones/${zoneId}`, data);
      setZones(prev => ({ ...prev, zones: (prev.zones || []).map(z => z.id === zoneId ? res.data.zone : z) }));
      setEditingZone(null);
      toast.success('Zone mise à jour');
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  // ── Zones: Delete zone ──
  const handleDeleteZone = async (zoneId) => {
    try {
      await axios.delete(`${API_URL}/settings/zones/${zoneId}`);
      setZones(prev => ({ ...prev, zones: (prev.zones || []).filter(z => z.id !== zoneId) }));
      toast.success('Zone supprimée');
    } catch (err) { toast.error(err.response?.data?.detail || 'Erreur'); }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copié dans le presse-papiers'));
  };

  // Filter tabs by search
  const filteredTabs = searchQuery
    ? settingsTabs.filter(t => t.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : settingsTabs;

  /* ────────────────────────────────────────────────
     PROFILE TAB
  ──────────────────────────────────────────────── */
  const renderProfile = () => (
    <div className="space-y-6" data-testid="tab-profile">
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
            <label className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
              <Camera className="w-5 h-5 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 5_000_000) { toast.error('Image trop grande. Maximum 5 Mo.'); return; }
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  const base64 = ev.target.result;
                  try {
                    await axios.post(`${API_URL}/settings/profile/avatar`, { avatar: base64 });
                    setProfileData(p => ({ ...p, avatar: base64 }));
                    toast.success('Avatar mis à jour !');
                  } catch (err) {
                    toast.error('Erreur lors de l\'upload');
                  }
                };
                reader.readAsDataURL(file);
              }} />
            </label>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Survolez votre photo pour la modifier. JPG, PNG ou GIF. Max 5 Mo.</p>
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
          <TextInput value={profileData.phone || ''} onChange={v => setProfileData(p => ({ ...p, phone: v }))} icon={Phone} placeholder="+33 6 12 34 56 78" />
        </FieldRow>
        <FieldRow label="Poste / Fonction" horizontal={false}>
          <SelectInput value={profileData.jobTitle || 'Gérant'} onChange={v => setProfileData(p => ({ ...p, jobTitle: v }))} icon={Briefcase}
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
          <TextArea value={profileData.bio || ''} onChange={v => setProfileData(p => ({ ...p, bio: v }))} placeholder="Quelques mots sur vous..." rows={3} />
        </FieldRow>
      </SectionCard>
    </div>
  );

  /* ────────────────────────────────────────────────
     COMPANY TAB
  ──────────────────────────────────────────────── */
  const renderCompany = () => (
    <div className="space-y-6" data-testid="tab-company">
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
          <div className="relative group w-24 h-24 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center bg-white/5 overflow-hidden">
            {companyData.logo ? (
              <img src={companyData.logo} alt="Logo" className="w-full h-full object-contain rounded-2xl" />
            ) : (
              <Upload className="w-6 h-6 text-slate-500" />
            )}
            <label className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
              <Camera className="w-5 h-5 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e.target.files[0])} />
            </label>
          </div>
          <div className="space-y-2">
            <label className="cursor-pointer">
              <ActionButton variant="secondary" size="sm" icon={Upload} onClick={() => document.getElementById('logo-upload-input')?.click()}>Uploader le logo</ActionButton>
            </label>
            <input id="logo-upload-input" type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e.target.files[0])} />
            {companyData.logo && (
              <ActionButton variant="ghost" size="sm" icon={Trash2} onClick={() => setCompanyData(p => ({ ...p, logo: '' }))}>Supprimer</ActionButton>
            )}
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
    <div className="space-y-6" data-testid="tab-appearance">
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
      <div className="space-y-6" data-testid="tab-notifications">
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
                  <Toggle size="sm" checked={notifications[cat.key]?.email || false} onChange={v => setNotifications(p => ({ ...p, [cat.key]: { ...p[cat.key], email: v } }))} />
                </div>
                <div className="w-14 flex justify-center">
                  <Toggle size="sm" checked={notifications[cat.key]?.push || false} onChange={v => setNotifications(p => ({ ...p, [cat.key]: { ...p[cat.key], push: v } }))} />
                </div>
                <div className="w-14 flex justify-center">
                  <Toggle size="sm" checked={notifications[cat.key]?.sms || false} onChange={v => setNotifications(p => ({ ...p, [cat.key]: { ...p[cat.key], sms: v } }))} />
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
    <div className="space-y-6" data-testid="tab-security">
      <SectionCard title="Mot de passe" description="Gérez votre mot de passe de connexion" icon={Lock} color="#ef4444">
        <div className="space-y-4">
          <FieldRow label="Mot de passe actuel" horizontal={false}>
            <TextInput type="password" value={passwordForm.currentPassword} onChange={v => setPasswordForm(p => ({ ...p, currentPassword: v }))} icon={Lock} placeholder="••••••••" />
          </FieldRow>
          <FieldRow label="Nouveau mot de passe" horizontal={false}>
            <TextInput type="password" value={passwordForm.newPassword} onChange={v => setPasswordForm(p => ({ ...p, newPassword: v }))} icon={Key} placeholder="••••••••" />
          </FieldRow>
          <FieldRow label="Confirmer le mot de passe" horizontal={false}>
            <TextInput type="password" value={passwordForm.confirmPassword} onChange={v => setPasswordForm(p => ({ ...p, confirmPassword: v }))} icon={Key} placeholder="••••••••" />
          </FieldRow>
          <ActionButton variant="primary" size="sm" icon={Save} onClick={handleChangePassword} loading={changingPassword}>
            Changer le mot de passe
          </ActionButton>
        </div>
      </SectionCard>

      <SectionCard title="Authentification à deux facteurs" description="Ajoutez une couche de sécurité supplémentaire" icon={Shield} color="#ef4444" badge={security.twoFactorEnabled ? 'Activé' : 'Désactivé'}>
        {security.twoFactorEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <Check className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-400">2FA activée</p>
                <p className="text-xs text-slate-500">Votre compte est protégé par un second facteur</p>
              </div>
            </div>
            <FieldRow label="Méthode 2FA">
              <SelectInput value={security.twoFactorMethod} onChange={v => setSecurity(p => ({ ...p, twoFactorMethod: v }))}
                options={[
                  { value: 'app', label: '📱 App Authenticator' },
                  { value: 'sms', label: '💬 SMS' },
                  { value: 'email', label: '📧 Email' },
                ]} />
            </FieldRow>
            <ActionButton variant="danger" size="sm" icon={X} onClick={handleDisable2FA}>Désactiver la 2FA</ActionButton>
          </div>
        ) : twoFASetup ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
              <p className="text-sm font-bold text-violet-400 mb-2">📱 Scannez ce code avec votre app Authenticator</p>
              <div className="p-4 bg-white rounded-xl w-fit mx-auto mb-3">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFASetup.otpauth_uri)}`} alt="QR Code" className="w-48 h-48" />
              </div>
              <p className="text-xs text-slate-500 mb-1">Ou entrez ce code manuellement :</p>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-black/30 font-mono text-xs text-violet-300">
                <span className="flex-1 break-all select-all">{twoFASetup.secret}</span>
                <ActionButton variant="ghost" size="sm" icon={Copy} onClick={() => copyToClipboard(twoFASetup.secret)} />
              </div>
            </div>
            <FieldRow label="Code de vérification" description="Entrez le code à 6 chiffres de votre app" horizontal={false}>
              <div className="flex gap-2">
                <TextInput value={twoFACode} onChange={setTwoFACode} placeholder="123456" className="w-40 font-mono" />
                <ActionButton variant="primary" size="sm" icon={Check} onClick={handleVerify2FA}>Vérifier</ActionButton>
              </div>
            </FieldRow>
            <ActionButton variant="ghost" size="sm" icon={X} onClick={() => { setTwoFASetup(null); setTwoFACode(''); }}>Annuler</ActionButton>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">Protégez votre compte avec un second facteur d'authentification via une app comme Google Authenticator ou Authy.</p>
            <ActionButton variant="primary" size="sm" icon={Shield} onClick={handleSetup2FA} loading={settingUp2FA}>
              Configurer la 2FA
            </ActionButton>
          </div>
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
          <TextArea value={security.ipWhitelist || ''} onChange={v => setSecurity(p => ({ ...p, ipWhitelist: v }))} placeholder="192.168.1.0/24&#10;10.0.0.0/8" rows={3} />
        </FieldRow>
        <ActionButton variant="danger" size="sm" icon={LogOut} onClick={handleLogoutAll}>
          Déconnecter toutes les autres sessions
        </ActionButton>
      </SectionCard>
    </div>
  );

  /* ────────────────────────────────────────────────
     TEAM TAB
  ──────────────────────────────────────────────── */
  const renderTeam = () => (
    <div className="space-y-6" data-testid="tab-team">
      <SectionCard title="Inviter un membre" description="Ajoutez de nouveaux collaborateurs" icon={Plus} color="#10b981">
        <div className="flex gap-3">
          <TextInput className="flex-1" value={team.inviteEmail} onChange={v => setTeam(p => ({ ...p, inviteEmail: v }))} icon={Mail} placeholder="email@collaborateur.com" />
          <SelectInput value={team.inviteRole} onChange={v => setTeam(p => ({ ...p, inviteRole: v }))} className="w-40"
            options={team.roles.map(r => ({ value: r.name.toLowerCase(), label: r.name }))} />
          <ActionButton variant="primary" icon={Plus} onClick={handleInvite} loading={inviting}>Inviter</ActionButton>
        </div>
        <p className="text-xs text-slate-500">
          {team.members?.length || 0}/{team.maxMembers || 25} membres utilisés sur votre plan
        </p>
      </SectionCard>

      <SectionCard title="Rôles & Permissions" description="Configurez les droits d'accès" icon={Shield} color="#10b981" badge={`${team.roles.length} rôles`}>
        <div className="space-y-2">
          {team.roles.map(role => (
            <div key={role.id}>
              {editingRole === role.id ? (
                <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-500/5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Nom</label>
                      <TextInput value={role.name} onChange={v => setTeam(prev => ({ ...prev, roles: prev.roles.map(r => r.id === role.id ? { ...r, name: v } : r) }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Permissions</label>
                      <TextInput value={role.permissions} onChange={v => setTeam(prev => ({ ...prev, roles: prev.roles.map(r => r.id === role.id ? { ...r, permissions: v } : r) }))} placeholder="leads,quotes,invoices" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Couleur</label>
                    <ColorPicker value={role.color} onChange={v => setTeam(prev => ({ ...prev, roles: prev.roles.map(r => r.id === role.id ? { ...r, color: v } : r) }))}
                      presets={['#ef4444', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#f97316']} />
                  </div>
                  <div className="flex gap-2">
                    <ActionButton variant="primary" size="sm" icon={Save} onClick={() => handleUpdateRole(role.id, { name: role.name, color: role.color, permissions: role.permissions })}>Sauvegarder</ActionButton>
                    <ActionButton variant="ghost" size="sm" icon={X} onClick={() => setEditingRole(null)}>Annuler</ActionButton>
                    {role.id > 5 && <ActionButton variant="danger" size="sm" icon={Trash2} onClick={() => handleDeleteRole(role.id)}>Supprimer</ActionButton>}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: role.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">{role.name}</p>
                    <p className="text-[10px] text-slate-500">{role.permissions === 'all' ? 'Accès complet' : `Modules: ${role.permissions}`}</p>
                  </div>
                  <ActionButton variant="ghost" size="sm" icon={Edit3} className="opacity-0 group-hover:opacity-100" onClick={() => setEditingRole(role.id)}>Modifier</ActionButton>
                </div>
              )}
            </div>
          ))}

          {showNewRoleForm ? (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
              <p className="text-sm font-bold text-emerald-400">Nouveau rôle</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Nom</label>
                  <TextInput value={newRoleForm.name} onChange={v => setNewRoleForm(p => ({ ...p, name: v }))} placeholder="Ex: Superviseur" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Permissions</label>
                  <TextInput value={newRoleForm.permissions} onChange={v => setNewRoleForm(p => ({ ...p, permissions: v }))} placeholder="leads,quotes,planning" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Couleur</label>
                <ColorPicker value={newRoleForm.color} onChange={v => setNewRoleForm(p => ({ ...p, color: v }))}
                  presets={['#ef4444', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#f97316']} />
              </div>
              <div className="flex gap-2">
                <ActionButton variant="primary" size="sm" icon={Plus} onClick={handleCreateRole}>Créer</ActionButton>
                <ActionButton variant="ghost" size="sm" icon={X} onClick={() => setShowNewRoleForm(false)}>Annuler</ActionButton>
              </div>
            </div>
          ) : (
            <ActionButton variant="secondary" size="sm" icon={Plus} onClick={() => setShowNewRoleForm(true)}>Créer un rôle</ActionButton>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Membres de l'équipe" description="Tous les utilisateurs du CRM" icon={Users} color="#10b981">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 text-slate-500 mx-auto animate-spin" />
          </div>
        ) : team.members && team.members.length > 0 ? (
          <div className="space-y-2">
            {team.members.map(member => (
              <div key={member.user_id}>
                {editingMember === member.user_id ? (
                  <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-500/5 space-y-3">
                    <div className="flex items-center gap-3">
                      {member.picture ? (
                        <img src={member.picture} alt={member.name} className="w-9 h-9 rounded-xl object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white"
                          style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
                          {member.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-200">{member.name}</p>
                        <p className="text-[10px] text-slate-500">{member.email}</p>
                      </div>
                    </div>
                    <FieldRow label="Rôle" horizontal={false}>
                      <SelectInput value={member.role || 'Membre'} onChange={v => setTeam(prev => ({ ...prev, members: prev.members.map(m => m.user_id === member.user_id ? { ...m, role: v } : m) }))}
                        options={team.roles.map(r => ({ value: r.name, label: r.name }))} />
                    </FieldRow>
                    <div className="flex gap-2">
                      <ActionButton variant="primary" size="sm" icon={Save} onClick={() => handleUpdateMember(member.user_id, { role: member.role })}>Sauvegarder</ActionButton>
                      <ActionButton variant="ghost" size="sm" icon={X} onClick={() => setEditingMember(null)}>Annuler</ActionButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
                    {member.picture ? (
                      <img src={member.picture} alt={member.name} className="w-9 h-9 rounded-xl object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white"
                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
                        {member.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200">{member.name}</p>
                      <p className="text-[10px] text-slate-500">{member.email}</p>
                    </div>
                    <Badge color="#8b5cf6">{member.role || 'Membre'}</Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ActionButton variant="ghost" size="sm" icon={Edit3} onClick={() => setEditingMember(member.user_id)} />
                      <ActionButton variant="ghost" size="sm" icon={Trash2} className="text-red-400"
                        onClick={() => handleRemoveMember(member.user_id)} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Users className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Les membres apparaîtront ici</p>
            <p className="text-xs text-slate-500 mt-1">Invitez des collaborateurs via le formulaire ci-dessus</p>
          </div>
        )}
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
      <div className="space-y-6" data-testid="tab-billing">
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
                  onClick={() => handleChangePlan(plan.id)}
                  className={`w-full mt-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    billing.plan === plan.id
                      ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30 cursor-default'
                      : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white cursor-pointer'
                  }`}
                >
                  {billing.plan === plan.id ? '✓ Plan actuel' : plan.price > (plans.find(p => p.id === billing.plan)?.price || 0) ? 'Upgrade' : 'Downgrade'}
                </button>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Utilisation" description="Consommation de votre plan" icon={TrendingUp} color="#6366f1">
          {[
            { label: 'Leads', used: billing.usage?.leads || 0, max: billing.usage?.maxLeads || 5000, color: '#8b5cf6' },
            { label: 'Stockage', used: billing.usage?.storage || 0, max: billing.usage?.maxStorage || 10, unit: 'Go', color: '#3b82f6' },
            { label: 'Utilisateurs', used: billing.usage?.users || 0, max: billing.usage?.maxUsers || 25, color: '#10b981' },
          ].map(item => {
            const pct = (item.used / item.max) * 100;
            return (
              <div key={item.label} className="py-3 border-t border-white/5 first:border-0">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-300">{item.label}</span>
                  <span className="text-slate-500">{item.used}{item.unit ? ` ${item.unit}` : ''} / {item.max}{item.unit ? ` ${item.unit}` : ''}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 80 ? '#ef4444' : item.color }} />
                </div>
              </div>
            );
          })}
        </SectionCard>

        <SectionCard title="Moyen de paiement" description="Carte bancaire enregistrée" icon={CreditCard} color="#6366f1">
          <div className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 rounded-lg bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">{billing.cardBrand || 'CARD'}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">•••• •••• •••• {billing.cardLast4 || '????'}</p>
                <p className="text-[10px] text-slate-500">Expire 12/2028</p>
              </div>
            </div>
            <ActionButton variant="secondary" size="sm" icon={Edit3} onClick={() => toast.info('Redirection vers le portail de paiement Stripe...')}>Modifier</ActionButton>
          </div>
          <FieldRow label="Cycle de facturation">
            <SelectInput value={billing.billingCycle} onChange={v => setBilling(p => ({ ...p, billingCycle: v }))}
              options={[
                { value: 'monthly', label: 'Mensuel' },
                { value: 'yearly', label: 'Annuel (-20%)' },
              ]} />
          </FieldRow>
          <FieldRow label="Renouvellement automatique">
            <Toggle checked={billing.autoRenew} onChange={v => setBilling(p => ({ ...p, autoRenew: v }))} />
          </FieldRow>
          <FieldRow label="Email de facturation" horizontal={false}>
            <TextInput value={billing.invoiceEmail || ''} onChange={v => setBilling(p => ({ ...p, invoiceEmail: v }))} icon={Mail} placeholder="facturation@entreprise.fr" />
          </FieldRow>
        </SectionCard>
      </div>
    );
  };

  /* ────────────────────────────────────────────────
     EMAIL & SMS TAB
  ──────────────────────────────────────────────── */
  const renderEmail = () => (
    <div className="space-y-6" data-testid="tab-email">
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
        <ActionButton variant="secondary" size="sm" icon={Zap} onClick={handleTestSmtp} loading={testingSmtp}>
          Tester la connexion SMTP
        </ActionButton>
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
      <div className="space-y-6" data-testid="tab-scheduling">
        <SectionCard title="Jours de travail" description="Définissez vos jours ouvrés" icon={CalendarDays} color="#84cc16">
          <div className="flex gap-2 flex-wrap">
            {days.map(d => (
              <button
                key={d.key}
                onClick={() => setScheduling(p => ({ ...p, workDays: { ...p.workDays, [d.key]: !p.workDays[d.key] } }))}
                className={`w-12 h-12 rounded-xl text-xs font-bold transition-all ${
                  scheduling.workDays?.[d.key]
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
    <div className="space-y-6" data-testid="tab-zones">
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

      <SectionCard title="Zones de tarification" description="Tarifs différenciés par zone" icon={Layers} color="#f43f5e" badge={`${zones.zones?.length || 0} zones`}>
        <div className="space-y-3">
          {(zones.zones || []).map(zone => (
            <div key={zone.id}>
              {editingZone === zone.id ? (
                <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-500/5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Nom</label>
                      <TextInput value={zone.name} onChange={v => setZones(prev => ({ ...prev, zones: prev.zones.map(z => z.id === zone.id ? { ...z, name: v } : z) }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Codes postaux</label>
                      <TextInput value={zone.zipCodes} onChange={v => setZones(prev => ({ ...prev, zones: prev.zones.map(z => z.id === zone.id ? { ...z, zipCodes: v } : z) }))} placeholder="75001-75009" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Surcharge (€)</label>
                      <TextInput type="number" value={String(zone.surcharge)} onChange={v => setZones(prev => ({ ...prev, zones: prev.zones.map(z => z.id === zone.id ? { ...z, surcharge: parseFloat(v) || 0 } : z) }))} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Couleur</label>
                    <ColorPicker value={zone.color} onChange={v => setZones(prev => ({ ...prev, zones: prev.zones.map(z => z.id === zone.id ? { ...z, color: v } : z) }))}
                      presets={['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316']} />
                  </div>
                  <div className="flex gap-2">
                    <ActionButton variant="primary" size="sm" icon={Save} onClick={() => handleUpdateZone(zone.id, { name: zone.name, zipCodes: zone.zipCodes, color: zone.color, surcharge: zone.surcharge })}>Sauvegarder</ActionButton>
                    <ActionButton variant="ghost" size="sm" icon={X} onClick={() => setEditingZone(null)}>Annuler</ActionButton>
                    <ActionButton variant="danger" size="sm" icon={Trash2} onClick={() => handleDeleteZone(zone.id)}>Supprimer</ActionButton>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: zone.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">{zone.name}</p>
                    <p className="text-[10px] text-slate-500">Codes postaux : {zone.zipCodes}</p>
                  </div>
                  <span className={`text-xs font-bold ${zone.surcharge > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {zone.surcharge > 0 ? `+${zone.surcharge}€` : 'Gratuit'}
                  </span>
                  <ActionButton variant="ghost" size="sm" icon={Edit3} className="opacity-0 group-hover:opacity-100" onClick={() => setEditingZone(zone.id)} />
                </div>
              )}
            </div>
          ))}

          {showNewZoneForm ? (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
              <p className="text-sm font-bold text-emerald-400">Nouvelle zone</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Nom</label>
                  <TextInput value={newZoneForm.name} onChange={v => setNewZoneForm(p => ({ ...p, name: v }))} placeholder="Ex: Banlieue Nord" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Codes postaux</label>
                  <TextInput value={newZoneForm.zipCodes} onChange={v => setNewZoneForm(p => ({ ...p, zipCodes: v }))} placeholder="93,94" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Surcharge (€)</label>
                  <TextInput type="number" value={String(newZoneForm.surcharge)} onChange={v => setNewZoneForm(p => ({ ...p, surcharge: parseFloat(v) || 0 }))} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Couleur</label>
                <ColorPicker value={newZoneForm.color} onChange={v => setNewZoneForm(p => ({ ...p, color: v }))}
                  presets={['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316']} />
              </div>
              <div className="flex gap-2">
                <ActionButton variant="primary" size="sm" icon={Plus} onClick={handleAddZone}>Ajouter</ActionButton>
                <ActionButton variant="ghost" size="sm" icon={X} onClick={() => setShowNewZoneForm(false)}>Annuler</ActionButton>
              </div>
            </div>
          ) : (
            <ActionButton variant="secondary" size="sm" icon={Plus} onClick={() => setShowNewZoneForm(true)}>Ajouter une zone</ActionButton>
          )}
        </div>
      </SectionCard>
    </div>
  );

  /* ────────────────────────────────────────────────
     DOCUMENTS TAB
  ──────────────────────────────────────────────── */
  const renderDocuments = () => (
    <div className="space-y-6" data-testid="tab-documents">
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
      { key: 'slack', name: 'Slack', desc: "Notifications d'équipe", icon: '💬', color: '#4a154b' },
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
      <div className="space-y-6" data-testid="tab-integrations">
        <SectionCard title="Services connectés" description="Gérez vos intégrations tierces" icon={Zap} color="#eab308"
          badge={`${integrationsList.filter(i => integrations[i.key]?.connected).length} actives`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {integrationsList.map(int => {
              const connected = integrations[int.key]?.connected;
              const isConnecting = connectingService === int.key;
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
                    variant={connected ? 'danger' : 'secondary'}
                    size="sm"
                    icon={connected ? X : Link2}
                    loading={isConnecting}
                    onClick={() => handleToggleIntegration(int.key, connected)}
                  >
                    {connected ? 'Déconnecter' : 'Connecter'}
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
    <div className="space-y-6" data-testid="tab-api">
      {showNewKey && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-emerald-400">🎉 Nouvelle clé API créée</p>
            <ActionButton variant="ghost" size="sm" icon={X} onClick={() => setShowNewKey(null)} />
          </div>
          <p className="text-xs text-slate-400 mb-2">Copiez cette clé maintenant. Elle ne sera plus affichée.</p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-black/30 font-mono text-xs text-emerald-300">
            <span className="flex-1 break-all">{showNewKey.key}</span>
            <ActionButton variant="ghost" size="sm" icon={Copy} onClick={() => copyToClipboard(showNewKey.key)}>Copier</ActionButton>
          </div>
        </div>
      )}

      <SectionCard title="Clés API" description="Accédez au CRM via l'API REST" icon={Key} color="#64748b" badge={`${apiSettings.apiKeys?.length || 0} clés`}>
        <div className="space-y-3">
          {(apiSettings.apiKeys || []).map(key => (
            <div key={key.key_id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${key.active ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200">{key.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">{key.key_preview || '••••••••••••'}</p>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-[10px] text-slate-500">Créée le {key.created_at ? new Date(key.created_at).toLocaleDateString('fr-FR') : '—'}</p>
                <p className="text-[10px] text-slate-500">Dernier usage : {key.last_used ? new Date(key.last_used).toLocaleDateString('fr-FR') : 'Jamais'}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <ActionButton variant="ghost" size="sm" icon={RefreshCw} onClick={() => handleRegenerateApiKey(key.key_id)} />
                <ActionButton variant="ghost" size="sm" icon={Trash2} onClick={() => handleDeleteApiKey(key.key_id)} />
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <TextInput className="flex-1" value={newKeyName} onChange={setNewKeyName} placeholder="Nom de la clé (ex: Production)" icon={Key} />
            <ActionButton variant="secondary" size="md" icon={Plus} onClick={handleCreateApiKey} loading={creatingKey}>Créer</ActionButton>
          </div>
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
              const isActive = (apiSettings.webhookEvents || []).includes(evt);
              return (
                <button
                  key={evt}
                  onClick={() => setApiSettings(p => ({
                    ...p,
                    webhookEvents: isActive
                      ? (p.webhookEvents || []).filter(e => e !== evt)
                      : [...(p.webhookEvents || []), evt]
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
          <TextInput type="number" value={String(apiSettings.rateLimit || 1000)} onChange={v => setApiSettings(p => ({ ...p, rateLimit: parseInt(v) || 0 }))} className="w-28" />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Documentation API" description="Ressources pour les développeurs" icon={FileText} color="#64748b">
        <div className="flex gap-3 flex-wrap">
          <ActionButton variant="secondary" size="sm" icon={ExternalLink} onClick={() => window.open(`${BACKEND_URL}/docs`, '_blank')}>Documentation</ActionButton>
          <ActionButton variant="secondary" size="sm" icon={ExternalLink} onClick={() => window.open(`${BACKEND_URL}/redoc`, '_blank')}>Swagger UI</ActionButton>
          <ActionButton variant="secondary" size="sm" icon={Download}>Postman Collection</ActionButton>
        </div>
      </SectionCard>
    </div>
  );

  /* ────────────────────────────────────────────────
     DATA TAB
  ──────────────────────────────────────────────── */
  const renderData = () => (
    <div className="space-y-6" data-testid="tab-data">
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
            <p className="text-[10px] text-slate-500">
              {dataSettings.lastBackup ? new Date(dataSettings.lastBackup).toLocaleString('fr-FR') : 'Jamais'}
            </p>
          </div>
          <ActionButton variant="secondary" size="sm" icon={RefreshCw} onClick={handleBackup} loading={backingUp}>
            Sauvegarder maintenant
          </ActionButton>
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
          {[
            { label: 'Leads', type: 'leads' },
            { label: 'Devis', type: 'quotes' },
            { label: 'Factures', type: 'invoices' },
            { label: 'Clients', type: 'contacts' },
            { label: 'Interventions', type: 'interventions' },
            { label: 'Tout (ZIP)', type: 'all' },
          ].map(item => (
            <ActionButton key={item.type} variant="secondary" size="sm" icon={Download}
              loading={exporting === item.type}
              onClick={() => handleExport(item.type)}>
              {item.label}
            </ActionButton>
          ))}
        </div>
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

      <SectionCard title="Suppression de données" description="Supprimez par catégorie ou tout d'un coup" icon={AlertTriangle} color="#ef4444">
        <PurgePanel apiUrl={API_URL} />
      </SectionCard>

      <SectionCard title="Supprimer le compte" description="Action irréversible" icon={AlertTriangle} color="#ef4444">
        <DangerZone
          title="Supprimer le compte"
          description="Supprimer définitivement votre compte et toutes les données"
          buttonText="Supprimer"
          onConfirm={handleDeleteAccount}
        />
      </SectionCard>
    </div>
  );

  /* ────────────────────────────────────────────────
     ADVANCED TAB
  ──────────────────────────────────────────────── */
  const renderAdvanced = () => (
    <div className="space-y-6" data-testid="tab-advanced">
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
            { label: 'Base de données', value: 'MongoDB' },
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
    if (loading) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Chargement...</p>
          </div>
        </div>
      );
    }

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
    <div className="flex flex-col lg:flex-row h-full min-h-0" style={{ background: 'var(--bg-app)' }}>
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
                  data-testid={`tab-btn-${tab.id}`}
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
            <ActionButton variant="primary" icon={Save} onClick={handleSave} loading={saving} data-testid="save-btn">
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