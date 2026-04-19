import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import BACKEND_URL from '../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, PieChart as PieIcon,
  Plus, BarChart3, FileText, Wallet, ArrowUpRight, ArrowDownRight,
  Calendar, Filter, Send, Download, Edit, Trash2, Eye, Check,
  AlertTriangle, BookOpen, Receipt, Building2, ChevronRight, Search,
  RefreshCw, Banknote, ArrowRight, X
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import PayrollRHModule from './payroll-rh/PayrollRHModule';
import { useConfirm } from '../shared/ConfirmDialog';
import { PageHeader } from '../shared';

const API = `${BACKEND_URL}/api/accounting/erp`;
const COLORS = ['#047857', '#047857', '#f59e0b', '#c2410c', '#3b82f6', '#ec4899', '#047857', '#14b8a6'];

const CATEGORIES = [
  { value: 'materiel', label: 'Matériel' },
  { value: 'transport', label: 'Transport' },
  { value: 'salaires', label: 'Salaires' },
  { value: 'fournitures', label: 'Fournitures' },
  { value: 'energie', label: 'Énergie' },
  { value: 'loyer', label: 'Loyer' },
  { value: 'assurances', label: 'Assurances' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'autres', label: 'Autres' },
];

const STATUS_LABELS = {
  brouillon: { label: 'Brouillon', color: 'bg-neutral-500', icon: '⚪' },
  envoyee: { label: 'Envoyée', color: 'bg-yellow-500', icon: '🟡' },
  payee: { label: 'Payée', color: 'bg-brand-500', icon: '🟢' },
  en_retard: { label: 'En retard', color: 'bg-terracotta-500', icon: '🔴' },
};

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const fmtPct = (n) => `${n >= 0 ? '+' : ''}${(n || 0).toFixed(1)}%`;

// ═══════════════════════════════════════════════════════════
// TOKENS + CHAPTERS
// ═══════════════════════════════════════════════════════════

const erpTokens = `
  .erp-root {
    --bg: oklch(0.965 0.012 80);
    --paper: oklch(0.975 0.014 82);
    --surface: oklch(0.985 0.008 85);
    --surface-2: oklch(0.945 0.014 78);
    --ink: oklch(0.165 0.012 60);
    --ink-2: oklch(0.32 0.012 60);
    --ink-3: oklch(0.52 0.010 60);
    --ink-4: oklch(0.72 0.008 70);
    --line: oklch(0.85 0.012 75);
    --line-2: oklch(0.92 0.010 78);
    --emerald: oklch(0.52 0.13 165);
    --emerald-deep: oklch(0.38 0.14 160);
    --emerald-soft: oklch(0.93 0.05 165);
    --gold: oklch(0.72 0.13 85);
    --gold-deep: oklch(0.58 0.13 78);
    --gold-soft: oklch(0.94 0.06 85);
    --rouge: oklch(0.48 0.15 25);
    --rouge-soft: oklch(0.94 0.07 25);
    --sepia: oklch(0.55 0.08 65);
    --sepia-soft: oklch(0.92 0.04 65);
    --warm: oklch(0.62 0.14 45);
    --warm-soft: oklch(0.94 0.05 45);
    --cool: oklch(0.55 0.08 220);
    --cool-soft: oklch(0.93 0.03 220);

    background: var(--bg); color: var(--ink); min-height: 100%;
    font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    padding-bottom: 60px;
  }
  .erp-display { font-family: 'Fraunces', serif; letter-spacing: -0.02em; }
  .erp-mono    { font-family: 'JetBrains Mono', ui-monospace, monospace; font-feature-settings: "tnum"; }
  .erp-label   {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--ink-3); font-weight: 500;
  }
  .erp-italic  { font-style: italic; font-weight: 400; }

  /* Hero */
  .erp-header {
    display: flex; align-items: flex-end; justify-content: space-between;
    padding: 40px 48px 24px; gap: 24px; flex-wrap: wrap;
    border-bottom: 1px solid var(--line-2);
  }
  .erp-title {
    font-family: 'Fraunces', serif; letter-spacing: -0.02em;
    font-size: 56px; font-weight: 300; line-height: 0.95;
    margin: 0 0 6px; color: var(--ink);
  }
  .erp-sub {
    font-family: 'Fraunces', serif; font-style: italic;
    font-size: 15px; color: var(--ink-3);
  }
  .erp-back-link {
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--ink-3); text-decoration: none;
    padding: 8px 14px; border-radius: 999px;
    background: var(--surface); border: 1px solid var(--line);
    transition: all .15s;
  }
  .erp-back-link:hover { color: var(--ink); border-color: var(--ink-3); }

  /* Tabs magazine */
  .erp-tabs-wrap {
    background: var(--paper); border-bottom: 1px solid var(--line);
    padding: 12px 48px; overflow-x: auto; -webkit-overflow-scrolling: touch;
    position: sticky; top: 0; z-index: 10;
  }
  .erp-tabs {
    display: inline-flex; gap: 4px;
  }
  .erp-tab {
    display: inline-flex; align-items: baseline; gap: 8px;
    padding: 10px 18px; border-radius: 10px;
    background: transparent; border: 1px solid transparent;
    color: var(--ink-3); cursor: pointer; transition: all .15s;
    white-space: nowrap;
  }
  .erp-tab:hover { background: var(--surface-2); color: var(--ink); }
  .erp-tab.active {
    background: var(--ink); border-color: var(--ink);
    color: var(--bg);
  }
  .erp-tab-roman {
    font-family: 'Fraunces', serif; font-size: 14px;
    font-weight: 500; letter-spacing: -0.01em;
    opacity: 0.7;
  }
  .erp-tab.active .erp-tab-roman { opacity: 1; color: var(--gold); }
  .erp-tab-label {
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    letter-spacing: 0.06em; text-transform: uppercase; font-weight: 500;
  }

  .erp-content {
    padding: 28px 48px 0;
  }

  /* Cartes KPI magazine */
  .erp-kpi {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 14px; padding: 20px 22px;
    transition: transform .15s, box-shadow .15s, border-color .15s;
    position: relative; overflow: hidden;
  }
  .erp-kpi:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.05); }
  .erp-kpi::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: var(--kpi-accent, var(--emerald));
  }
  .erp-kpi.alert { border-color: var(--rouge); background: var(--rouge-soft); }
  .erp-kpi-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in oklch, var(--kpi-accent, var(--emerald)) 12%, transparent);
    color: var(--kpi-accent, var(--emerald));
    margin-bottom: 14px;
  }
  .erp-kpi-trend {
    display: inline-flex; align-items: center; gap: 3px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
    padding: 3px 8px; border-radius: 999px;
    position: absolute; top: 22px; right: 22px;
  }
  .erp-kpi-trend.up   { background: var(--emerald-soft); color: var(--emerald-deep); }
  .erp-kpi-trend.down { background: var(--rouge-soft);   color: var(--rouge); }
  .erp-kpi-value {
    font-family: 'Fraunces', serif; font-weight: 500; letter-spacing: -0.02em;
    font-size: 28px; line-height: 1.05; color: var(--ink);
    margin-bottom: 6px;
  }
  .erp-kpi-title {
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--ink-3); font-weight: 500;
  }
  .erp-kpi-sub {
    font-family: 'Fraunces', serif; font-style: italic;
    font-size: 12px; color: var(--ink-3);
    margin-top: 4px; line-height: 1.3;
  }

  /* Section chart */
  .erp-chart-card {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 14px; overflow: hidden;
  }
  .erp-chart-card-head {
    padding: 18px 22px 12px;
    display: flex; align-items: baseline; gap: 10px;
    border-bottom: 1px solid var(--line-2);
  }
  .erp-chart-card-head h3 {
    font-family: 'Fraunces', serif; font-size: 18px; font-weight: 400;
    margin: 0; color: var(--ink); letter-spacing: -0.01em;
  }

  /* Action chip */
  .erp-chip-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 18px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    letter-spacing: 0.06em; text-transform: uppercase; font-weight: 500;
    cursor: pointer; transition: all .15s;
    border: 1px solid var(--line); background: var(--surface); color: var(--ink-2);
  }
  .erp-chip-btn:hover { border-color: var(--ink-3); color: var(--ink); }
  .erp-chip-btn.primary { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .erp-chip-btn.primary:hover { opacity: 0.88; }

  /* Bandeau d'alerte */
  .erp-banner {
    background: var(--rouge-soft); border: 1px solid var(--rouge);
    border-radius: 12px; padding: 14px 22px;
    display: flex; align-items: center; gap: 14px;
  }

  /* Toolbar */
  .erp-toolbar {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    padding: 16px 20px; background: var(--paper);
    border: 1px solid var(--line); border-radius: 12px;
    margin-bottom: 20px;
  }
  .erp-search {
    display: flex; align-items: center; gap: 8px;
    background: var(--surface); border: 1px solid var(--line);
    border-radius: 999px; padding: 7px 14px; flex: 1; min-width: 220px; max-width: 360px;
  }
  .erp-search input {
    flex: 1; border: 0; outline: 0; background: transparent;
    font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--ink);
  }
  .erp-filter {
    background: var(--surface); border: 1px solid var(--line);
    border-radius: 999px; padding: 7px 14px;
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-2);
    cursor: pointer; min-width: 140px;
  }
  .erp-count {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 12px; border-radius: 999px;
    background: var(--emerald-soft); color: var(--emerald-deep);
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
  }

  /* Badge status */
  .erp-status {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 999px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px;
    letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;
    border: 1px solid;
    white-space: nowrap;
  }
  .erp-status-dot { width: 5px; height: 5px; border-radius: 999px; }

  /* Table atelier */
  .erp-table-wrap {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: 14px; overflow: hidden;
  }
  .erp-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .erp-table {
    width: 100%; border-collapse: collapse; min-width: 700px;
  }
  .erp-table thead {
    background: var(--ink); color: var(--bg);
  }
  .erp-table thead th {
    padding: 12px 16px; text-align: left;
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    letter-spacing: 0.12em; text-transform: uppercase; font-weight: 500;
    border-right: 1px solid oklch(0.28 0.012 60);
    white-space: nowrap;
  }
  .erp-table thead th:last-child { border-right: 0; }
  .erp-table thead th.right { text-align: right; }
  .erp-table thead th.center { text-align: center; }

  .erp-table tbody tr {
    border-top: 1px solid var(--line-2);
    transition: background .1s;
  }
  .erp-table tbody tr:hover { background: var(--emerald-soft); }
  .erp-table tbody td {
    padding: 12px 16px; vertical-align: middle;
    border-right: 1px solid var(--line-2); font-size: 13px;
    color: var(--ink-2);
  }
  .erp-table tbody td:last-child { border-right: 0; }
  .erp-table tbody td.mono {
    font-family: 'JetBrains Mono', monospace; font-feature-settings: "tnum";
    font-size: 11px; color: var(--ink-3); letter-spacing: 0.04em;
  }
  .erp-table tbody td.num {
    text-align: right; font-family: 'Fraunces', serif;
    font-feature-settings: "tnum"; font-weight: 500; color: var(--ink);
  }
  .erp-table tbody td.center { text-align: center; }
  .erp-table tfoot td {
    padding: 14px 16px; background: var(--surface-2);
    border-top: 2px solid var(--ink);
    font-family: 'JetBrains Mono', monospace; font-size: 11px;
    letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
    color: var(--ink-2);
  }
  .erp-table tfoot td.num {
    font-family: 'Fraunces', serif; text-transform: none;
    letter-spacing: 0; font-size: 16px; color: var(--ink);
  }

  .erp-row-btn {
    width: 28px; height: 28px; border-radius: 6px;
    display: inline-flex; align-items: center; justify-content: center;
    border: 1px solid var(--line); background: var(--surface); color: var(--ink-3);
    cursor: pointer; transition: all .15s; margin: 0 2px;
  }
  .erp-row-btn:hover { border-color: var(--emerald); color: var(--emerald); background: var(--emerald-soft); }
  .erp-row-btn.danger:hover { border-color: var(--rouge); color: var(--rouge); background: var(--rouge-soft); }
  .erp-row-btn.gold:hover { border-color: var(--gold-deep); color: var(--gold-deep); background: var(--gold-soft); }

  /* Section titles */
  .erp-section-title {
    font-family: 'Fraunces', serif; font-size: 22px; font-weight: 400;
    color: var(--ink); letter-spacing: -0.01em;
    margin: 0 0 4px;
  }
  .erp-section-title em {
    font-style: italic; color: var(--emerald); font-weight: 400;
  }
  .erp-section-sub {
    font-family: 'Fraunces', serif; font-style: italic;
    font-size: 13px; color: var(--ink-3);
    margin-bottom: 16px;
  }

  /* Empty state */
  .erp-empty {
    padding: 60px 40px; text-align: center;
    background: var(--surface); border: 1px dashed var(--line);
    border-radius: 12px;
    font-family: 'Fraunces', serif; font-style: italic;
    color: var(--ink-3);
  }

  @media (max-width: 960px) {
    .erp-header { padding: 20px 20px 14px !important; }
    .erp-title { font-size: 36px !important; }
    .erp-tabs-wrap { padding: 10px 20px !important; }
    .erp-content { padding: 20px 20px 0 !important; }
  }
`;

/* Chiffres romains pour onglets */
function toRomanERP(n) {
  const map = [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let r = ''; for (const [v, s] of map) { while (n >= v) { r += s; n -= v; } } return r;
}

const CHAPTERS = [
  { tab: 'dashboard',  roman: 'I',    label: 'Dashboard',  titleJsx: <>Le <em className="erp-italic" style={{ color: 'var(--emerald)' }}>tableau</em> de bord</>,         sub: "Vision d'ensemble financière — CA, bénéfice, trésorerie et alertes du mois" },
  { tab: 'invoices',   roman: 'II',   label: 'Factures',   titleJsx: <>Les <em className="erp-italic" style={{ color: 'var(--rouge)' }}>factures</em></>,                 sub: "Émettre, suivre et relancer les ventes clients — relevé des créances et encaissements" },
  { tab: 'expenses',   roman: 'III',  label: 'Dépenses',   titleJsx: <>Les <em className="erp-italic" style={{ color: 'var(--warm)' }}>dépenses</em></>,                  sub: "Enregistrer les achats et charges par catégorie — matériel, salaires, loyer, fournitures" },
  { tab: 'treasury',   roman: 'IV',   label: 'Trésorerie', titleJsx: <>La <em className="erp-italic" style={{ color: 'var(--cool)' }}>trésorerie</em></>,                 sub: "Comptes bancaires, rapprochements, flux d'encaissements et de décaissements" },
  { tab: 'journals',   roman: 'V',    label: 'Journaux',   titleJsx: <>Les <em className="erp-italic" style={{ color: 'var(--sepia)' }}>journaux</em></>,                sub: "Écritures comptables à double entrée — plan de comptes et ventilation analytique" },
  { tab: 'tva',        roman: 'VI',   label: 'TVA',        titleJsx: <>La <em className="erp-italic" style={{ color: 'var(--gold-deep)' }}>TVA</em></>,                   sub: "Collectée, déductible, à décaisser — déclarations mensuelles et trimestrielles" },
  { tab: 'reports',    roman: 'VII',  label: 'Rapports',   titleJsx: <>Les <em className="erp-italic" style={{ color: 'var(--emerald-deep)' }}>rapports</em></>,         sub: "Bilan, compte de résultat, soldes intermédiaires — tous les indicateurs de gestion" },
  { tab: 'payroll-rh', roman: 'VIII', label: 'Paie & RH',  titleJsx: <>La <em className="erp-italic" style={{ color: 'var(--warm)' }}>paie</em> et les RH</>,            sub: "Salaires, cotisations, contrats de travail et registre du personnel" },
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function AccountingERP() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && t !== activeTab) setActiveTab(t);
  }, [searchParams, activeTab]);

  const currentChapter = CHAPTERS.find(c => c.tab === activeTab) || CHAPTERS[0];

  return (
    <div className="erp-root">
      <style>{erpTokens}</style>

      {/* HERO MAGAZINE */}
      <div className="erp-header">
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="erp-label" style={{ marginBottom: 12 }}>
            Comptabilité · ERP · Chapitre {currentChapter.roman}
          </div>
          <h1 className="erp-title">
            {currentChapter.titleJsx}
          </h1>
          <div className="erp-sub">{currentChapter.sub}</div>
        </div>
        <a href="/accounting-erp" className="erp-back-link">
          ← Retour au grimoire
        </a>
      </div>

      {/* TABS MAGAZINE */}
      <div className="erp-tabs-wrap">
        <div className="erp-tabs">
          {CHAPTERS.map(c => (
            <button
              key={c.tab}
              className={`erp-tab ${activeTab === c.tab ? 'active' : ''}`}
              onClick={() => setActiveTab(c.tab)}
            >
              <span className="erp-tab-roman">{c.roman}</span>
              <span className="erp-tab-label">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CONTENU */}
      <div className="erp-content">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="dashboard"><DashboardSection onNavigate={setActiveTab} /></TabsContent>
          <TabsContent value="invoices"><InvoiceModule /></TabsContent>
          <TabsContent value="expenses"><ExpenseModule /></TabsContent>
          <TabsContent value="treasury"><TreasuryModule /></TabsContent>
          <TabsContent value="journals"><JournalModule /></TabsContent>
          <TabsContent value="tva"><TVAModule /></TabsContent>
          <TabsContent value="reports"><ReportingModule /></TabsContent>
          <TabsContent value="payroll-rh"><PayrollRHModule /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// A. DASHBOARD FINANCIER
// ═══════════════════════════════════════════════════════════

function DashboardSection({ onNavigate }) {
  const [kpis, setKpis] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kRes, cRes] = await Promise.all([
        axios.get(`${API}/dashboard/kpis`),
        axios.get(`${API}/dashboard/charts`),
      ]);
      setKpis(kRes.data);
      setCharts(cRes.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState />;
  if (!kpis) return <EmptyState text="Impossible de charger le dashboard" />;

  const kpiCards = [
    {
      title: 'CA TTC (mois)',
      value: fmt(kpis.ca?.month),
      sub: `Jour ${fmt(kpis.ca?.day)} · Année ${fmt(kpis.ca?.year)}`,
      icon: DollarSign, accent: 'var(--emerald)',
    },
    {
      title: 'Bénéfice (mois)',
      value: fmt(kpis.benefice?.month),
      sub: 'Résultat net mensuel',
      icon: TrendingUp,
      accent: (kpis.benefice?.month ?? 0) >= 0 ? 'var(--emerald)' : 'var(--rouge)',
      trend: kpis.benefice?.variation_pct,
    },
    {
      title: 'Dépenses (mois)',
      value: fmt(kpis.expenses?.month),
      sub: Object.entries(kpis.expenses?.breakdown || {}).slice(0, 2).map(([k, v]) => `${k} ${fmt(v)}`).join(' · ') || 'Charges du mois',
      icon: CreditCard, accent: 'var(--warm)',
    },
    {
      title: 'Trésorerie',
      value: fmt(kpis.treasury?.solde),
      sub: `Prévu 30j · ${fmt(kpis.treasury?.prevision_30j)}`,
      icon: Wallet,
      accent: kpis.treasury?.solde < kpis.treasury?.alert_threshold ? 'var(--rouge)' : 'var(--cool)',
    },
    {
      title: 'Impayées',
      value: `${kpis.unpaid_invoices?.count || 0}`,
      sub: fmt(kpis.unpaid_invoices?.amount),
      icon: AlertTriangle,
      accent: (kpis.unpaid_invoices?.count || 0) > 0 ? 'var(--rouge)' : 'var(--ink-3)',
      alert: (kpis.unpaid_invoices?.overdue || 0) > 0,
    },
    {
      title: 'À payer',
      value: `${kpis.pending_expenses?.count || 0}`,
      sub: fmt(kpis.pending_expenses?.amount),
      icon: Receipt, accent: 'var(--gold-deep)',
    },
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* ───── 6 KPI CARDS MAGAZINE ───── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 14, marginBottom: 24,
      }}>
        {kpiCards.map((k, i) => <KPICard key={i} {...k} />)}
      </div>

      {/* ───── ALERTE ───── */}
      {kpis.unpaid_invoices?.overdue > 0 && (
        <div className="erp-banner" style={{ marginBottom: 20 }}>
          <AlertTriangle style={{ width: 18, height: 18, color: 'var(--rouge)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="erp-display" style={{ fontSize: 15, fontWeight: 500, color: 'var(--rouge)', marginBottom: 2 }}>
              {kpis.unpaid_invoices.overdue} facture{kpis.unpaid_invoices.overdue > 1 ? 's' : ''} en retard au-delà de 30 jours
            </div>
            <div className="erp-mono" style={{ fontSize: 11, color: 'oklch(0.35 0.12 25)', letterSpacing: '0.06em' }}>
              Total impayé · {fmt(kpis.unpaid_invoices.amount)}
            </div>
          </div>
          <button className="erp-chip-btn" style={{ borderColor: 'var(--rouge)', color: 'var(--rouge)' }} onClick={() => onNavigate('invoices')}>
            Voir les factures
          </button>
        </div>
      )}

      {/* ───── ACTIONS RAPIDES ───── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28, alignItems: 'center' }}>
        <span className="erp-label" style={{ marginRight: 6 }}>Actions rapides :</span>
        <button className="erp-chip-btn primary" onClick={() => onNavigate('invoices')}>
          <Plus style={{ width: 12, height: 12 }} /> Nouvelle facture
        </button>
        <button className="erp-chip-btn" onClick={() => onNavigate('expenses')}>
          <Plus style={{ width: 12, height: 12 }} /> Nouvelle dépense
        </button>
        <button className="erp-chip-btn" onClick={() => onNavigate('journals')}>
          <BookOpen style={{ width: 12, height: 12 }} /> Journal comptable
        </button>
        <button className="erp-chip-btn" onClick={load} title="Rafraîchir">
          <RefreshCw style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {/* ───── CHARTS ───── */}
      {charts && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 16,
        }}>
          {/* CA 12 mois */}
          <div className="erp-chart-card">
            <div className="erp-chart-card-head">
              <BarChart3 style={{ width: 16, height: 16, color: 'var(--emerald)' }} />
              <div>
                <div className="erp-label">Courbe · 12 mois</div>
                <h3>CA TTC sur <em className="erp-italic" style={{ color: 'var(--emerald)' }}>l'année</em></h3>
              </div>
            </div>
            <div style={{ padding: '18px 22px' }}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={charts.ca_monthly}>
                  <defs>
                    <linearGradient id="erp-ca-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.52 0.13 165)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="oklch(0.52 0.13 165)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="oklch(0.92 0.010 78)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'oklch(0.52 0.010 60)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'oklch(0.52 0.010 60)' }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip
                    formatter={(v) => fmt(v)}
                    contentStyle={{
                      background: 'oklch(0.985 0.008 85)', border: '1px solid oklch(0.85 0.012 75)',
                      borderRadius: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    }}
                  />
                  <Area type="monotone" dataKey="ca" stroke="oklch(0.52 0.13 165)" strokeWidth={2} fill="url(#erp-ca-grad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Répartition prestations */}
          <div className="erp-chart-card">
            <div className="erp-chart-card-head">
              <PieIcon style={{ width: 16, height: 16, color: 'var(--sepia)' }} />
              <div>
                <div className="erp-label">Ventilation</div>
                <h3>CA par <em className="erp-italic" style={{ color: 'var(--sepia)' }}>prestation</em></h3>
              </div>
            </div>
            <div style={{ padding: '18px 22px' }}>
              {(charts.prestation_breakdown || []).length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--ink-3)' }}>
                  Aucune donnée pour cette période.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={charts.prestation_breakdown}
                      dataKey="ca" nameKey="type"
                      cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                      paddingAngle={2}
                      label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {charts.prestation_breakdown.map((_, i) => (
                        <Cell key={i} fill={['oklch(0.52 0.13 165)', 'oklch(0.72 0.13 85)', 'oklch(0.62 0.14 45)', 'oklch(0.55 0.08 220)', 'oklch(0.55 0.12 35)', 'oklch(0.48 0.15 25)'][i % 6]} stroke="oklch(0.985 0.008 85)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => fmt(v)}
                      contentStyle={{
                        background: 'oklch(0.985 0.008 85)', border: '1px solid oklch(0.85 0.012 75)',
                        borderRadius: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Waterfall - Résultat */}
          <div className="erp-chart-card">
            <div className="erp-chart-card-head">
              <BarChart3 style={{ width: 16, height: 16, color: 'var(--gold-deep)' }} />
              <div>
                <div className="erp-label">Solde</div>
                <h3>Résultat <em className="erp-italic" style={{ color: 'var(--gold-deep)' }}>du mois</em></h3>
              </div>
            </div>
            <div style={{ padding: '18px 22px' }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={charts.waterfall}>
                  <CartesianGrid strokeDasharray="2 4" stroke="oklch(0.92 0.010 78)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'oklch(0.32 0.012 60)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'oklch(0.52 0.010 60)' }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip
                    formatter={(v) => fmt(v)}
                    contentStyle={{
                      background: 'oklch(0.985 0.008 85)', border: '1px solid oklch(0.85 0.012 75)',
                      borderRadius: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={42}>
                    {(charts.waterfall || []).map((entry, i) => (
                      <Cell key={i} fill={entry.value >= 0 ? 'oklch(0.52 0.13 165)' : 'oklch(0.48 0.15 25)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Solde bancaire */}
          <div className="erp-chart-card">
            <div className="erp-chart-card-head">
              <Wallet style={{ width: 16, height: 16, color: 'var(--cool)' }} />
              <div>
                <div className="erp-label">Banque · 6 mois</div>
                <h3>Solde <em className="erp-italic" style={{ color: 'var(--cool)' }}>bancaire</em></h3>
              </div>
            </div>
            <div style={{ padding: '18px 22px' }}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={charts.solde_monthly}>
                  <defs>
                    <linearGradient id="erp-bank-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.55 0.08 220)" stopOpacity={0.30} />
                      <stop offset="100%" stopColor="oklch(0.55 0.08 220)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="oklch(0.92 0.010 78)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'oklch(0.32 0.012 60)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'oklch(0.52 0.010 60)' }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip
                    formatter={(v) => fmt(v)}
                    contentStyle={{
                      background: 'oklch(0.985 0.008 85)', border: '1px solid oklch(0.85 0.012 75)',
                      borderRadius: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    }}
                  />
                  <Area type="monotone" dataKey="solde" stroke="oklch(0.55 0.08 220)" strokeWidth={2} fill="url(#erp-bank-grad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ title, value, sub, icon: Icon, accent, trend, alert }) {
  const style = { '--kpi-accent': accent || 'oklch(0.52 0.13 165)' };
  return (
    <div className={`erp-kpi ${alert ? 'alert' : ''}`} style={style}>
      <div className="erp-kpi-icon">
        {Icon && <Icon style={{ width: 16, height: 16 }} />}
      </div>
      {trend !== undefined && trend !== null && trend !== 0 && (
        <div className={`erp-kpi-trend ${trend > 0 ? 'up' : 'down'}`}>
          {trend > 0 ? <ArrowUpRight style={{ width: 10, height: 10 }} /> : <ArrowDownRight style={{ width: 10, height: 10 }} />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
      <div className="erp-kpi-value">{value}</div>
      <div className="erp-kpi-title">{title}</div>
      {sub && <div className="erp-kpi-sub">{sub}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// B. FACTURATION
// ═══════════════════════════════════════════════════════════

function InvoiceModule() {
  const { confirm, ConfirmElement } = useConfirm();
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailInv, setDetailInv] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(null);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await axios.get(`${API}/invoices`, { params });
      setInvoices(res.data.items);
      setTotal(res.data.total);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const handleSend = async (id) => {
    const ok = await confirm({
      title: 'Envoyer cette facture ?',
      description: 'Une écriture comptable sera générée.',
      variant: 'warning',
      confirmText: 'Envoyer',
    });
    if (!ok) return;
    try {
      await axios.post(`${API}/invoices/${id}/send`);
      loadInvoices();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Archiver cette facture ?',
      description: 'La facture sera archivée.',
      variant: 'warning',
      confirmText: 'Archiver',
    });
    if (!ok) return;
    try {
      await axios.delete(`${API}/invoices/${id}`);
      loadInvoices();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  const STATUS_STYLE = {
    brouillon: { label: 'Brouillon', color: 'var(--ink-3)', bg: 'var(--surface-2)' },
    envoyee:   { label: 'Envoyée',   color: 'var(--gold-deep)', bg: 'var(--gold-soft)' },
    payee:     { label: 'Payée',     color: 'var(--emerald)', bg: 'var(--emerald-soft)' },
    en_retard: { label: 'En retard', color: 'var(--rouge)', bg: 'var(--rouge-soft)' },
    annulee:   { label: 'Annulée',   color: 'var(--ink-3)', bg: 'var(--surface-2)' },
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Toolbar */}
      <div className="erp-toolbar">
        <button className="erp-chip-btn primary" onClick={() => setCreateOpen(true)}>
          <Plus style={{ width: 13, height: 13 }} /> Nouvelle facture
        </button>
        <div className="erp-search">
          <Search style={{ width: 13, height: 13, color: 'var(--ink-3)' }} />
          <input
            placeholder="N° facture, client…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="erp-filter"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">Tous statuts</option>
          <option value="brouillon">Brouillon</option>
          <option value="envoyee">Envoyée</option>
          <option value="payee">Payée</option>
          <option value="en_retard">En retard</option>
        </select>
        <span className="erp-count">{total} facture{total > 1 ? 's' : ''}</span>
      </div>

      {loading ? <LoadingState /> : (
        <div className="erp-table-wrap">
          <div className="erp-table-scroll">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>N° facture</th>
                  <th>Client</th>
                  <th>Prestation</th>
                  <th className="right">HT</th>
                  <th className="right">TVA</th>
                  <th className="right">TTC</th>
                  <th className="center">Statut</th>
                  <th>Date</th>
                  <th className="center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const st = STATUS_STYLE[inv.status_display || inv.status] || STATUS_STYLE.brouillon;
                  return (
                    <tr key={inv.invoice_id}>
                      <td className="mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>{inv.invoice_number}</td>
                      <td style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, color: 'var(--ink)' }}>{inv.client_name || '—'}</td>
                      <td style={{ fontStyle: 'italic' }}>{inv.prestation_type || '—'}</td>
                      <td className="num">{fmt(inv.total_ht)}</td>
                      <td className="num" style={{ color: 'var(--ink-3)' }}>{fmt(inv.total_tva)}</td>
                      <td className="num" style={{ fontSize: 15 }}>{fmt(inv.total_ttc)}</td>
                      <td className="center">
                        <span className="erp-status" style={{ color: st.color, background: st.bg, borderColor: st.color }}>
                          <span className="erp-status-dot" style={{ background: st.color }} />
                          {st.label}
                        </span>
                      </td>
                      <td className="mono">{inv.invoice_date?.slice(0, 10) || '—'}</td>
                      <td className="center" style={{ whiteSpace: 'nowrap' }}>
                        <button className="erp-row-btn" title="Détails" onClick={() => setDetailInv(inv)}>
                          <Eye style={{ width: 12, height: 12 }} />
                        </button>
                        {inv.status === 'brouillon' && (
                          <>
                            <button className="erp-row-btn" title="Envoyer" onClick={() => handleSend(inv.invoice_id)}>
                              <Send style={{ width: 12, height: 12 }} />
                            </button>
                            <button className="erp-row-btn danger" title="Archiver" onClick={() => handleDelete(inv.invoice_id)}>
                              <Trash2 style={{ width: 12, height: 12 }} />
                            </button>
                          </>
                        )}
                        {(inv.status === 'envoyee' || inv.status_display === 'en_retard') && (
                          <button className="erp-row-btn gold" title="Enregistrer paiement" onClick={() => setPaymentOpen(inv)}>
                            <Banknote style={{ width: 12, height: 12 }} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {invoices.length === 0 && (
                  <tr><td colSpan={9}><div className="erp-empty" style={{ border: 'none', padding: 40 }}>Aucune facture à afficher.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {total > 20 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
          <button className="erp-chip-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ opacity: page <= 1 ? 0.4 : 1 }}>Précédent</button>
          <span className="erp-mono" style={{ fontSize: 11, color: 'var(--ink-3)', padding: '10px 14px', letterSpacing: '0.08em' }}>Page {page}</span>
          <button className="erp-chip-btn" disabled={invoices.length < 20} onClick={() => setPage(p => p + 1)} style={{ opacity: invoices.length < 20 ? 0.4 : 1 }}>Suivant</button>
        </div>
      )}

      {/* Create Invoice Dialog */}
      <InvoiceCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); loadInvoices(); }} />

      {/* Detail Dialog */}
      {detailInv && (
        <Dialog open={!!detailInv} onOpenChange={() => setDetailInv(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Facture {detailInv.invoice_number}</DialogTitle></DialogHeader>
            <InvoiceDetail invoice={detailInv} />
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Dialog */}
      {paymentOpen && (
        <PaymentDialog invoice={paymentOpen} onClose={() => setPaymentOpen(null)} onPaid={() => { setPaymentOpen(null); loadInvoices(); }} />
      )}
      <ConfirmElement />
    </div>
  );
}

function InvoiceCreateDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    client_name: '', client_email: '', client_phone: '', client_address: '',
    prestation_type: '', notes: '', payment_terms: 'Paiement à 30 jours',
    items: [{ description: '', quantity: 1, unit_price_ht: 0, tva_rate: 20 }],
  });
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');

  useEffect(() => {
    if (open && clientSearch.length >= 2) {
      axios.get(`${BACKEND_URL}/api/leads`, { params: { search: clientSearch, page_size: 5 } })
        .then(r => setClients(r.data.leads || []))
        .catch(() => {});
    }
  }, [clientSearch, open]);

  const selectClient = (c) => {
    setForm(f => ({ ...f, client_name: c.name || '', client_email: c.email || '', client_phone: c.phone || '', client_address: c.address || '', client_id: c.lead_id }));
    setClientSearch('');
    setClients([]);
  };

  const updateItem = (idx, field, value) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: field === 'description' ? value : Number(value) };
      return { ...f, items };
    });
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price_ht: 0, tva_rate: 20 }] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const totals = useMemo(() => {
    let ht = 0, tva = 0;
    form.items.forEach(i => {
      const h = (i.quantity || 0) * (i.unit_price_ht || 0);
      ht += h;
      tva += h * (i.tva_rate || 0) / 100;
    });
    return { ht: Math.round(ht * 100) / 100, tva: Math.round(tva * 100) / 100, ttc: Math.round((ht + tva) * 100) / 100 };
  }, [form.items]);

  const handleSubmit = async () => {
    if (!form.items.length || !form.items[0].description) return alert('Ajoutez au moins un article');
    setSaving(true);
    try {
      await axios.post(`${API}/invoices`, form);
      onCreated();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>✨ Nouvelle Facture</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Client */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Client (rechercher dans CRM)</label>
            <Input placeholder="Rechercher un client..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
            {clients.length > 0 && (
              <div className="border rounded-md p-1 space-y-1 max-h-32 overflow-y-auto">
                {clients.map(c => (
                  <button key={c.lead_id} className="w-full text-left p-2 hover:bg-muted rounded text-sm" onClick={() => selectClient(c)}>
                    <strong>{c.name}</strong> — {c.email || c.phone || ''}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nom client" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
              <Input placeholder="Email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />
              <Input placeholder="Téléphone" value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} />
              <Input placeholder="Adresse" value={form.client_address} onChange={e => setForm(f => ({ ...f, client_address: e.target.value }))} />
            </div>
          </div>

          {/* Prestation type */}
          <Select value={form.prestation_type} onValueChange={v => setForm(f => ({ ...f, prestation_type: v }))}>
            <SelectTrigger><SelectValue placeholder="Type de prestation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="menage">🏠 Ménage domicile</SelectItem>
              <SelectItem value="bureau">🏢 Nettoyage bureau</SelectItem>
              <SelectItem value="canape">🛋️ Nettoyage canapé</SelectItem>
              <SelectItem value="tapis">🧹 Nettoyage tapis</SelectItem>
              <SelectItem value="matelas">🛏️ Nettoyage matelas</SelectItem>
              <SelectItem value="autre">📋 Autre</SelectItem>
            </SelectContent>
          </Select>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Articles / Services</label>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Ligne</Button>
            </div>
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-4" placeholder="Description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} />
                <Input className="col-span-2" type="number" placeholder="Qté" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                <Input className="col-span-2" type="number" placeholder="PU HT" value={item.unit_price_ht} onChange={e => updateItem(idx, 'unit_price_ht', e.target.value)} />
                <Select value={String(item.tva_rate)} onValueChange={v => updateItem(idx, 'tva_rate', v)}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5.5">5.5%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                  </SelectContent>
                </Select>
                <div className="col-span-1 text-right text-sm font-medium">{fmt(item.quantity * item.unit_price_ht * (1 + item.tva_rate / 100))}</div>
                <Button size="sm" variant="ghost" className="col-span-1" onClick={() => removeItem(idx)} disabled={form.items.length === 1}>
                  <Trash2 className="h-3 w-3 text-terracotta-400" />
                </Button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="bg-white border border-neutral-200 rounded-xl" className="bg-muted/30">
            <div className="p-4 grid grid-cols-3 gap-4 text-center">
              <div><div className="text-xs text-muted-foreground">Total HT</div><div className="text-lg font-bold">{fmt(totals.ht)}</div></div>
              <div><div className="text-xs text-muted-foreground">TVA</div><div className="text-lg font-bold text-amber-400">{fmt(totals.tva)}</div></div>
              <div><div className="text-xs text-muted-foreground">Total TTC</div><div className="text-lg font-bold text-brand-400">{fmt(totals.ttc)}</div></div>
            </div>
          </div>

          <Textarea placeholder="Notes / conditions..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button className="bg-brand-600 hover:bg-brand-700" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Création...' : '✅ Créer Facture (Brouillon)'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDetail({ invoice }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Client</div>
          <div className="font-medium">{invoice.client_name || '—'}</div>
          <div className="text-sm text-muted-foreground">{invoice.client_email}</div>
          <div className="text-sm text-muted-foreground">{invoice.client_phone}</div>
          <div className="text-sm text-muted-foreground">{invoice.client_address}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">N° Facture</div>
          <div className="font-mono font-bold">{invoice.invoice_number}</div>
          <div className="text-xs text-muted-foreground mt-2">Date</div>
          <div>{invoice.invoice_date?.slice(0, 10)}</div>
          <Badge className={`mt-2 ${(STATUS_LABELS[invoice.status_display || invoice.status] || STATUS_LABELS.brouillon).color} text-white`}>
            {(STATUS_LABELS[invoice.status_display || invoice.status] || STATUS_LABELS.brouillon).icon} {(STATUS_LABELS[invoice.status_display || invoice.status] || STATUS_LABELS.brouillon).label}
          </Badge>
        </div>
      </div>

      <Separator />

      <table className="w-full text-sm">
        <thead><tr className="border-b"><th className="text-left p-2">Description</th><th className="text-right p-2">Qté</th><th className="text-right p-2">PU HT</th><th className="text-right p-2">TVA</th><th className="text-right p-2">TTC</th></tr></thead>
        <tbody>
          {(invoice.items || []).map((item, i) => (
            <tr key={i} className="border-b">
              <td className="p-2">{item.description}</td>
              <td className="p-2 text-right">{item.quantity}</td>
              <td className="p-2 text-right">{fmt(item.unit_price_ht)}</td>
              <td className="p-2 text-right text-muted-foreground">{item.tva_rate}%</td>
              <td className="p-2 text-right font-medium">{fmt(item.amount_ttc)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-64 space-y-1">
          <div className="flex justify-between text-sm"><span>Total HT</span><span>{fmt(invoice.total_ht)}</span></div>
          <div className="flex justify-between text-sm text-amber-400"><span>TVA</span><span>{fmt(invoice.total_tva)}</span></div>
          <Separator />
          <div className="flex justify-between font-bold text-lg"><span>Total TTC</span><span className="text-brand-400">{fmt(invoice.total_ttc)}</span></div>
        </div>
      </div>

      {invoice.notes && <div className="text-sm text-muted-foreground italic">📝 {invoice.notes}</div>}

      {/* Journal entries */}
      {invoice.journal_entries?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2"><BookOpen className="h-4 w-4" />Écritures comptables</h4>
          {invoice.journal_entries.map(j => (
            <div className="bg-white border border-neutral-200 rounded-xl" key={j.entry_id} className="bg-muted/20">
              <div className="p-3 text-xs">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{j.description}</span>
                  <Badge variant="outline" className="text-xs">{j.journal_type}</Badge>
                </div>
                {j.entries.map((e, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{e.account_number} {e.account_label}</span>
                    <span>{e.debit > 0 ? `D: ${fmt(e.debit)}` : `C: ${fmt(e.credit)}`}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentDialog({ invoice, onClose, onPaid }) {
  const [form, setForm] = useState({ method: 'virement', reference: '', notes: '', amount: invoice.total_ttc });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/invoices/${invoice.invoice_id}/record-payment`, form);
      onPaid();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
    setSaving(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>💰 Enregistrer Paiement — {invoice.invoice_number}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Montant facture</div>
            <div className="text-2xl font-bold text-brand-400">{fmt(invoice.total_ttc)}</div>
          </div>
          <Input type="number" placeholder="Montant payé" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
          <Select value={form.method} onValueChange={v => setForm(f => ({ ...f, method: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="virement">🏦 Virement</SelectItem>
              <SelectItem value="carte">💳 Carte</SelectItem>
              <SelectItem value="especes">💵 Espèces</SelectItem>
              <SelectItem value="cheque">📝 Chèque</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Référence (optionnel)" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button className="bg-brand-600 hover:bg-brand-700" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Enregistrement...' : '✅ Enregistrer Paiement'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════
// C. DÉPENSES
// ═══════════════════════════════════════════════════════════

function ExpenseModule() {
  const { confirm, ConfirmElement } = useConfirm();
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 20 };
      if (search) params.search = search;
      if (catFilter) params.category = catFilter;
      const res = await axios.get(`${API}/expenses`, { params });
      setExpenses(res.data.items);
      setTotal(res.data.total);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, search, catFilter]);

  useEffect(() => { load(); }, [load]);

  const handlePay = async (id) => {
    const ok = await confirm({
      title: 'Marquer comme payée ?',
      description: 'La dépense sera marquée comme payée.',
      variant: 'warning',
      confirmText: 'Marquer payée',
    });
    if (!ok) return;
    try {
      await axios.post(`${API}/expenses/${id}/pay`);
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Supprimer cette dépense ?',
      description: 'Cette action est irréversible.',
      variant: 'danger',
      confirmText: 'Supprimer',
    });
    if (!ok) return;
    try {
      await axios.delete(`${API}/expenses/${id}`);
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="erp-toolbar">
        <button className="erp-chip-btn primary" onClick={() => setCreateOpen(true)} style={{ background: 'var(--warm)', borderColor: 'var(--warm)' }}>
          <Plus style={{ width: 13, height: 13 }} /> Nouvelle dépense
        </button>
        <div className="erp-search">
          <Search style={{ width: 13, height: 13, color: 'var(--ink-3)' }} />
          <input
            placeholder="Description, fournisseur…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="erp-filter"
          value={catFilter}
          onChange={e => { setCatFilter(e.target.value); setPage(1); }}
        >
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <span className="erp-count" style={{ background: 'var(--warm-soft)', color: 'oklch(0.35 0.12 45)' }}>{total} dépense{total > 1 ? 's' : ''}</span>
      </div>

      {loading ? <LoadingState /> : (
        <div className="erp-table-wrap">
          <div className="erp-table-scroll">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Catégorie</th>
                  <th>Description</th>
                  <th className="right">HT</th>
                  <th className="right">TVA</th>
                  <th className="right">TTC</th>
                  <th>Fournisseur</th>
                  <th className="center">Statut</th>
                  <th className="center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => {
                  const paid = exp.status === 'payee';
                  return (
                    <tr key={exp.expense_id}>
                      <td className="mono">{exp.date?.slice(0, 10)}</td>
                      <td style={{ fontStyle: 'italic', color: 'var(--ink-2)' }}>{exp.category}</td>
                      <td style={{ fontFamily: 'Fraunces, serif', color: 'var(--ink)' }}>{exp.description}</td>
                      <td className="num">{fmt(exp.amount_ht)}</td>
                      <td className="num" style={{ color: 'var(--ink-3)' }}>{fmt(exp.amount_tva)}</td>
                      <td className="num" style={{ fontSize: 15 }}>{fmt(exp.amount_ttc)}</td>
                      <td style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>{exp.supplier_name || '—'}</td>
                      <td className="center">
                        <span className="erp-status" style={{
                          color: paid ? 'var(--emerald)' : 'var(--gold-deep)',
                          background: paid ? 'var(--emerald-soft)' : 'var(--gold-soft)',
                          borderColor: paid ? 'var(--emerald)' : 'var(--gold-deep)',
                        }}>
                          <span className="erp-status-dot" style={{ background: paid ? 'var(--emerald)' : 'var(--gold-deep)' }} />
                          {paid ? 'Payée' : 'En attente'}
                        </span>
                      </td>
                      <td className="center" style={{ whiteSpace: 'nowrap' }}>
                        {exp.status === 'en_attente' && (
                          <button className="erp-row-btn gold" title="Marquer payée" onClick={() => handlePay(exp.expense_id)}>
                            <Banknote style={{ width: 12, height: 12 }} />
                          </button>
                        )}
                        <button className="erp-row-btn danger" title="Supprimer" onClick={() => handleDelete(exp.expense_id)}>
                          <Trash2 style={{ width: 12, height: 12 }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {expenses.length === 0 && (
                  <tr><td colSpan={9}><div className="erp-empty" style={{ border: 'none', padding: 40 }}>Aucune dépense à afficher.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ExpenseCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load(); }} />
      <ConfirmElement />
    </div>
  );
}

function ExpenseCreateDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    category: 'autres', description: '', amount_ht: 0, supplier_name: '', status: 'payee',
  });
  const [saving, setSaving] = useState(false);

  const tvaRate = { materiel: 20, transport: 20, fournitures: 20, salaires: 0, energie: 20, loyer: 20, assurances: 0, maintenance: 20, autres: 20 }[form.category] || 20;
  const tva = Math.round(form.amount_ht * tvaRate) / 100;
  const ttc = Math.round((form.amount_ht + tva) * 100) / 100;

  const handleSubmit = async () => {
    if (!form.description || form.amount_ht <= 0) return alert('Remplissez description et montant');
    setSaving(true);
    try {
      await axios.post(`${API}/expenses`, form);
      onCreated();
    } catch (e) { alert(e.response?.data?.detail || 'Erreur'); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>💸 Nouvelle Dépense</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Input type="number" placeholder="Montant HT (€)" value={form.amount_ht || ''} onChange={e => setForm(f => ({ ...f, amount_ht: Number(e.target.value) }))} />
          <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg text-center">
            <div><div className="text-xs text-muted-foreground">TVA ({tvaRate}%)</div><div className="font-bold text-amber-400">{fmt(tva)}</div></div>
            <div><div className="text-xs text-muted-foreground">Total TTC</div><div className="font-bold text-terracotta-400">{fmt(ttc)}</div></div>
            <div>
              <div className="text-xs text-muted-foreground">Statut</div>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payee">✅ Payée</SelectItem>
                  <SelectItem value="en_attente">⏳ En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Input placeholder="Fournisseur (optionnel)" value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Enregistrement...' : '✅ Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════
// D. TRÉSORERIE
// ═══════════════════════════════════════════════════════════

function TreasuryModule() {
  const [data, setData] = useState(null);
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/treasury`, { params: { month } });
      setData(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState />;
  if (!data) return <EmptyState text="Erreur chargement trésorerie" />;

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Toolbar période */}
      <div className="erp-toolbar">
        <span className="erp-label">Période :</span>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{
            padding: '7px 14px', borderRadius: 999,
            background: 'var(--surface)', border: '1px solid var(--line)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--ink)',
            outline: 'none', minWidth: 160,
          }}
        />
        <button className="erp-chip-btn" onClick={load}>
          <RefreshCw style={{ width: 12, height: 12 }} /> Rafraîchir
        </button>
      </div>

      {/* Cards bilan */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 14, marginBottom: 24,
      }}>
        <KPICard title="Solde initial"  value={fmt(data.solde_initial)} sub="Début de période" icon={Wallet} accent="var(--ink-3)" />
        <KPICard title="Entrées"        value={`+${fmt(data.total_in)}`} sub="Factures encaissées" icon={ArrowUpRight} accent="var(--emerald)" />
        <KPICard title="Sorties"        value={`-${fmt(data.total_out)}`} sub="Dépenses réglées" icon={ArrowDownRight} accent="var(--rouge)" />
        <KPICard
          title="Solde courant"
          value={fmt(data.solde_courant)}
          sub={`Prévision 30j · ${fmt(data.prevision_30j)}`}
          icon={Banknote}
          accent={data.solde_courant >= 0 ? 'var(--cool)' : 'var(--rouge)'}
        />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16,
      }}>
        {/* Entrées */}
        <div className="erp-chart-card">
          <div className="erp-chart-card-head">
            <ArrowUpRight style={{ width: 16, height: 16, color: 'var(--emerald)' }} />
            <div>
              <div className="erp-label">Encaissements</div>
              <h3><em className="erp-italic" style={{ color: 'var(--emerald)' }}>Entrées</em> du mois</h3>
            </div>
          </div>
          <div style={{ padding: '12px 18px 18px', maxHeight: 340, overflowY: 'auto' }}>
            {data.entries_in.length === 0 ? (
              <div className="erp-empty" style={{ padding: 30, border: 'none' }}>Aucune entrée enregistrée.</div>
            ) : (
              data.entries_in.map((e, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', marginBottom: 6,
                  background: 'var(--emerald-soft)', borderRadius: 8,
                  borderLeft: '3px solid var(--emerald)',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {e.invoice_number} · {e.client_name}
                    </div>
                    <div className="erp-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.04em', marginTop: 2 }}>
                      {e.payment_date?.slice(0, 10)}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, fontSize: 15, color: 'var(--emerald-deep)', whiteSpace: 'nowrap' }}>
                    +{fmt(e.total_ttc)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sorties */}
        <div className="erp-chart-card">
          <div className="erp-chart-card-head">
            <ArrowDownRight style={{ width: 16, height: 16, color: 'var(--rouge)' }} />
            <div>
              <div className="erp-label">Décaissements</div>
              <h3><em className="erp-italic" style={{ color: 'var(--rouge)' }}>Sorties</em> du mois</h3>
            </div>
          </div>
          <div style={{ padding: '12px 18px 18px', maxHeight: 340, overflowY: 'auto' }}>
            {data.entries_out.length === 0 ? (
              <div className="erp-empty" style={{ padding: 30, border: 'none' }}>Aucune sortie enregistrée.</div>
            ) : (
              data.entries_out.map((e, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', marginBottom: 6,
                  background: 'var(--rouge-soft)', borderRadius: 8,
                  borderLeft: '3px solid var(--rouge)',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {e.description}
                    </div>
                    <div className="erp-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.04em', marginTop: 2 }}>
                      {e.category} · {e.date?.slice(0, 10)}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, fontSize: 15, color: 'var(--rouge)', whiteSpace: 'nowrap' }}>
                    -{fmt(e.amount_ttc)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// E. JOURNAUX COMPTABLES
// ═══════════════════════════════════════════════════════════

function JournalModule() {
  const [journalType, setJournalType] = useState('general');
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState({ debit: 0, credit: 0, balanced: true });
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (month) params.month = month;
      const res = await axios.get(`${API}/journals/${journalType}`, { params });
      setEntries(res.data.items);
      setTotals({ debit: res.data.total_debit, credit: res.data.total_credit, balanced: res.data.is_balanced });
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [journalType, month]);

  useEffect(() => { load(); }, [load]);

  const JOURNAL_TYPES = [
    { k: 'general', label: 'Général',  emoji: '📋', tone: 'var(--ink-2)' },
    { k: 'ventes',  label: 'Ventes',   emoji: '📈', tone: 'var(--emerald)' },
    { k: 'achats',  label: 'Achats',   emoji: '📉', tone: 'var(--warm)' },
    { k: 'banque',  label: 'Banque',   emoji: '🏦', tone: 'var(--cool)' },
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Toolbar types de journal */}
      <div className="erp-toolbar">
        <span className="erp-label">Journal :</span>
        <div style={{ display: 'inline-flex', gap: 4 }}>
          {JOURNAL_TYPES.map(jt => (
            <button key={jt.k}
              className={`erp-chip-btn ${journalType === jt.k ? 'primary' : ''}`}
              onClick={() => setJournalType(jt.k)}
              style={journalType === jt.k ? { background: jt.tone, borderColor: jt.tone } : {}}
            >
              {jt.label}
            </button>
          ))}
        </div>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          placeholder="Mois"
          style={{
            padding: '7px 14px', borderRadius: 999,
            background: 'var(--surface)', border: '1px solid var(--line)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--ink)',
            outline: 'none', minWidth: 160,
          }}
        />
        {month && (
          <button className="erp-row-btn" onClick={() => setMonth('')} title="Effacer">
            <X style={{ width: 12, height: 12 }} />
          </button>
        )}
      </div>

      {/* Balance summary */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <span className="erp-status" style={{ color: 'var(--emerald)', background: 'var(--emerald-soft)', borderColor: 'var(--emerald)' }}>
          Débit · {fmt(totals.debit)}
        </span>
        <span className="erp-status" style={{ color: 'var(--rouge)', background: 'var(--rouge-soft)', borderColor: 'var(--rouge)' }}>
          Crédit · {fmt(totals.credit)}
        </span>
        <span className="erp-status" style={{
          color: totals.balanced ? 'var(--emerald)' : 'var(--rouge)',
          background: totals.balanced ? 'var(--emerald-soft)' : 'var(--rouge-soft)',
          borderColor: totals.balanced ? 'var(--emerald)' : 'var(--rouge)',
        }}>
          {totals.balanced ? '✓ Équilibré' : '⚠ Déséquilibré'}
        </span>
      </div>

      {loading ? <LoadingState /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {entries.length === 0 ? (
            <div className="erp-empty">Aucune écriture comptable pour ce journal.</div>
          ) : entries.map(entry => (
            <div key={entry.entry_id} className="erp-chart-card">
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid var(--line-2)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
              }}>
                <div>
                  <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, fontSize: 16, color: 'var(--ink)' }}>
                    {entry.description}
                  </div>
                  <div className="erp-mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em', marginTop: 3 }}>
                    {entry.entry_date?.slice(0, 10)} · {entry.reference_type}
                  </div>
                </div>
                <span className="erp-status" style={{ color: 'var(--sepia)', background: 'var(--sepia-soft)', borderColor: 'var(--sepia)' }}>
                  {entry.journal_type}
                </span>
              </div>
              <div className="erp-table-scroll">
                <table className="erp-table" style={{ minWidth: 0, border: 'none' }}>
                  <thead>
                    <tr>
                      <th>Compte</th>
                      <th>Libellé</th>
                      <th className="right">Débit</th>
                      <th className="right">Crédit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(entry.entries || []).map((e, i) => (
                      <tr key={i}>
                        <td className="mono" style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{e.account_number}</td>
                        <td>{e.account_label}</td>
                        <td className="num" style={{ color: e.debit > 0 ? 'var(--emerald-deep)' : 'var(--ink-4)' }}>
                          {e.debit > 0 ? fmt(e.debit) : '—'}
                        </td>
                        <td className="num" style={{ color: e.credit > 0 ? 'var(--rouge)' : 'var(--ink-4)' }}>
                          {e.credit > 0 ? fmt(e.credit) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'right' }}>Totaux</td>
                      <td className="num" style={{ color: 'var(--emerald-deep)' }}>{fmt(entry.total_debit)}</td>
                      <td className="num" style={{ color: 'var(--rouge)' }}>{fmt(entry.total_credit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {entry.is_balanced && (
                <div style={{ padding: '10px 20px', background: 'var(--emerald-soft)', textAlign: 'right' }}>
                  <span className="erp-mono" style={{ fontSize: 10, color: 'var(--emerald-deep)', letterSpacing: '0.1em', fontWeight: 600 }}>
                    ✓ ÉCRITURE ÉQUILIBRÉE
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// F. TVA & FISCALITÉ
// ═══════════════════════════════════════════════════════════

function TVAModule() {
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/tva/${month}`);
      setData(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API}/tva/${month}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `declaration_tva_${month}.csv`;
      a.click();
    } catch (e) { alert('Erreur export'); }
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="erp-toolbar">
        <span className="erp-label">Période :</span>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{
            padding: '7px 14px', borderRadius: 999,
            background: 'var(--surface)', border: '1px solid var(--line)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--ink)',
            outline: 'none', minWidth: 160,
          }}
        />
        <button className="erp-chip-btn" onClick={handleExport}>
          <Download style={{ width: 12, height: 12 }} /> Exporter CSV
        </button>
      </div>

      {loading ? <LoadingState /> : data ? (
        <>
          {/* Trio TVA XXL */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 24,
          }}>
            {/* TVA Collectée */}
            <div className="erp-kpi" style={{ '--kpi-accent': 'var(--emerald)', padding: '26px 28px' }}>
              <div className="erp-kpi-icon"><TrendingUp style={{ width: 16, height: 16 }} /></div>
              <div className="erp-kpi-title" style={{ marginBottom: 8 }}>TVA Collectée</div>
              <div className="erp-kpi-value" style={{ fontSize: 34 }}>{fmt(data.tva_collectee)}</div>
              <div className="erp-kpi-sub">Calculée sur les ventes</div>
            </div>
            {/* TVA Déductible */}
            <div className="erp-kpi" style={{ '--kpi-accent': 'var(--cool)', padding: '26px 28px' }}>
              <div className="erp-kpi-icon"><TrendingDown style={{ width: 16, height: 16 }} /></div>
              <div className="erp-kpi-title" style={{ marginBottom: 8 }}>TVA Déductible</div>
              <div className="erp-kpi-value" style={{ fontSize: 34 }}>{fmt(data.tva_deductible)}</div>
              <div className="erp-kpi-sub">Récupérée sur les achats</div>
            </div>
            {/* TVA à verser */}
            <div className="erp-kpi" style={{
              '--kpi-accent': data.tva_a_verser >= 0 ? 'var(--rouge)' : 'var(--emerald)',
              padding: '26px 28px', border: '2px solid',
              borderColor: data.tva_a_verser >= 0 ? 'var(--rouge)' : 'var(--emerald)',
            }}>
              <div className="erp-kpi-icon"><Receipt style={{ width: 16, height: 16 }} /></div>
              <div className="erp-kpi-title" style={{ marginBottom: 8 }}>
                {data.tva_a_verser >= 0 ? 'À verser' : 'Crédit TVA'}
              </div>
              <div className="erp-kpi-value" style={{ fontSize: 34, color: data.tva_a_verser >= 0 ? 'var(--rouge)' : 'var(--emerald)' }}>
                {fmt(Math.abs(data.tva_a_verser))}
              </div>
              <div className="erp-kpi-sub">
                {data.tva_a_verser >= 0 ? 'À payer au Trésor Public' : 'En report sur le mois suivant'}
              </div>
            </div>
          </div>

          {/* Detail tables */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16,
          }}>
            <div className="erp-chart-card">
              <div className="erp-chart-card-head">
                <TrendingUp style={{ width: 16, height: 16, color: 'var(--emerald)' }} />
                <div>
                  <div className="erp-label">Détail</div>
                  <h3>TVA <em className="erp-italic" style={{ color: 'var(--emerald)' }}>collectée</em> par taux</h3>
                </div>
              </div>
              <div className="erp-table-scroll">
                <table className="erp-table" style={{ minWidth: 0, border: 'none' }}>
                  <thead>
                    <tr>
                      <th>Taux</th>
                      <th className="right">Base HT</th>
                      <th className="right">TVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.detail_collectee || []).length === 0 ? (
                      <tr><td colSpan={3}><div className="erp-empty" style={{ border: 'none', padding: 30 }}>Aucune vente sur la période.</div></td></tr>
                    ) : (data.detail_collectee || []).map((d, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, fontSize: 15 }}>{d.rate}%</td>
                        <td className="num" style={{ color: 'var(--ink-2)' }}>{fmt(d.base_ht)}</td>
                        <td className="num" style={{ color: 'var(--emerald-deep)' }}>{fmt(d.tva)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="erp-chart-card">
              <div className="erp-chart-card-head">
                <TrendingDown style={{ width: 16, height: 16, color: 'var(--cool)' }} />
                <div>
                  <div className="erp-label">Détail</div>
                  <h3>TVA <em className="erp-italic" style={{ color: 'var(--cool)' }}>déductible</em> par taux</h3>
                </div>
              </div>
              <div className="erp-table-scroll">
                <table className="erp-table" style={{ minWidth: 0, border: 'none' }}>
                  <thead>
                    <tr>
                      <th>Taux</th>
                      <th className="right">Base HT</th>
                      <th className="right">TVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.detail_deductible || []).length === 0 ? (
                      <tr><td colSpan={3}><div className="erp-empty" style={{ border: 'none', padding: 30 }}>Aucun achat sur la période.</div></td></tr>
                    ) : (data.detail_deductible || []).map((d, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, fontSize: 15 }}>{d.rate}%</td>
                        <td className="num" style={{ color: 'var(--ink-2)' }}>{fmt(d.base_ht)}</td>
                        <td className="num" style={{ color: 'var(--cool)' }}>{fmt(d.tva)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : <EmptyState text="Erreur chargement TVA" />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// G. REPORTING
// ═══════════════════════════════════════════════════════════

function ReportingModule() {
  const [reportTab, setReportTab] = useState('pl');
  const REPORT_TABS = [
    { k: 'pl',       label: 'Compte de résultat', tone: 'var(--emerald)' },
    { k: 'clients',  label: 'Top clients',        tone: 'var(--gold-deep)' },
    { k: 'services', label: 'Services',           tone: 'var(--sepia)' },
    { k: 'compare',  label: 'Comparaison',        tone: 'var(--cool)' },
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="erp-toolbar">
        <span className="erp-label">Rapport :</span>
        {REPORT_TABS.map(rt => (
          <button key={rt.k}
            className={`erp-chip-btn ${reportTab === rt.k ? 'primary' : ''}`}
            onClick={() => setReportTab(rt.k)}
            style={reportTab === rt.k ? { background: rt.tone, borderColor: rt.tone } : {}}
          >
            {rt.label}
          </button>
        ))}
      </div>

      <Tabs value={reportTab} onValueChange={setReportTab}>
        <TabsContent value="pl"><IncomeStatement /></TabsContent>
        <TabsContent value="clients"><TopClients /></TabsContent>
        <TabsContent value="services"><ServicesAnalysis /></TabsContent>
        <TabsContent value="compare"><PeriodComparison /></TabsContent>
      </Tabs>
    </div>
  );
}

function IncomeStatement() {
  const [data, setData] = useState(null);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = month ? { month } : {};
        const res = await axios.get(`${API}/reports/income-statement`, { params });
        setData(res.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [month]);

  if (loading) return <LoadingState />;
  if (!data) return <EmptyState text="Erreur" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-48" placeholder="Toutes périodes" />
        {month && <Button size="sm" variant="ghost" onClick={() => setMonth('')}>Tout</Button>}
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl" className="max-w-lg">
        <div className="px-5 pt-5 pb-3"><h3>📊 Compte de Résultat {month || '(global)'}</h3></div>
        <div className="space-y-3">
          <div className="flex justify-between py-2"><span>CA HT</span><span className="font-bold text-brand-400">{fmt(data.ca_ht)}</span></div>
          <Separator />
          {data.charges_detail.map((c, i) => (
            <div key={i} className="flex justify-between py-1 text-sm pl-4">
              <span className="text-muted-foreground">- {c.category}</span>
              <span className="text-terracotta-400">{fmt(c.ht)}</span>
            </div>
          ))}
          <div className="flex justify-between py-2 border-t"><span>Total Charges HT</span><span className="font-bold text-terracotta-400">{fmt(data.charges_ht)}</span></div>
          <Separator />
          <div className="flex justify-between py-2 text-lg">
            <span className="font-bold">Résultat Brut</span>
            <span className={`font-bold ${data.resultat_brut >= 0 ? 'text-brand-400' : 'text-terracotta-400'}`}>{fmt(data.resultat_brut)}</span>
          </div>
          <div className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">- TVA à verser</span><span>{fmt(data.tva_a_verser)}</span></div>
          <Separator />
          <div className="flex justify-between py-2 text-xl">
            <span className="font-bold">Résultat Net</span>
            <span className={`font-bold ${data.resultat_net >= 0 ? 'text-brand-400' : 'text-terracotta-400'}`}>{fmt(data.resultat_net)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopClients() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/reports/top-clients`).then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (!data) return <EmptyState text="Aucune donnée" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-5 pt-5 pb-3"><h3 className="text-sm">👥 Top Clients par CA</h3></div>
          <div className="px-5 pb-5">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr><th className="text-left p-2">Client</th><th className="text-right p-2">CA TTC</th><th className="text-right p-2">Factures</th><th className="text-right p-2">% CA</th></tr>
                </thead>
                <tbody>
                  {data.clients.map((c, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-medium">{c.client_name}</td>
                      <td className="p-2 text-right font-bold">{fmt(c.ca_ttc)}</td>
                      <td className="p-2 text-right">{c.invoices_count}</td>
                      <td className="p-2 text-right text-muted-foreground">{c.pct_ca}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-5 pt-5 pb-3"><h3 className="text-sm">📊 Répartition CA par client</h3></div>
          <div className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.clients} dataKey="ca_ttc" nameKey="client_name" cx="50%" cy="50%" outerRadius={100} label={({ client_name, pct_ca }) => `${client_name} (${pct_ca}%)`}>
                  {data.clients.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServicesAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/reports/services-analysis`).then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (!data) return <EmptyState text="Aucune donnée" />;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-5 pt-5 pb-3"><h3 className="text-sm">🧹 Rentabilité par type de prestation</h3></div>
        <div className="px-5 pb-5">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3">Type prestation</th>
                  <th className="text-right p-3">CA TTC</th>
                  <th className="text-right p-3">Interventions</th>
                  <th className="text-right p-3">Moy / interv.</th>
                  <th className="text-right p-3">Marge %</th>
                  <th className="text-right p-3">Marge estimée</th>
                </tr>
              </thead>
              <tbody>
                {data.services.map((s, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3 font-medium">{s.type}</td>
                    <td className="p-3 text-right font-bold">{fmt(s.ca_ttc)}</td>
                    <td className="p-3 text-right">{s.count}</td>
                    <td className="p-3 text-right">{fmt(s.avg_per_intervention)}</td>
                    <td className="p-3 text-right">
                      <Badge variant="outline" className={s.margin_pct >= 50 ? 'text-brand-400 border-brand-500/30' : 'text-amber-400 border-amber-500/30'}>
                        {s.margin_pct}%
                      </Badge>
                    </td>
                    <td className="p-3 text-right text-brand-400">{fmt(s.margin_estimated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-5 pt-5 pb-3"><h3 className="text-sm">📊 CA par type de service</h3></div>
        <div className="px-5 pb-5">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.services}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="type" tick={{ fontSize: 11 }} stroke="#666" />
              <YAxis tick={{ fontSize: 10 }} stroke="#666" />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
              <Bar dataKey="ca_ttc" name="CA TTC" radius={[4, 4, 0, 0]}>
                {data.services.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function PeriodComparison() {
  const [data, setData] = useState(null);
  const [month1, setMonth1] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [month2, setMonth2] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/reports/period-comparison`, { params: { month1, month2 } })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month1, month2]);

  if (loading) return <LoadingState />;
  if (!data) return <EmptyState text="Erreur" />;

  const chartData = [
    { name: 'CA HT', [data.period1.month]: data.period1.ca_ht, [data.period2.month]: data.period2.ca_ht },
    { name: 'Dépenses HT', [data.period1.month]: data.period1.expenses_ht, [data.period2.month]: data.period2.expenses_ht },
    { name: 'Bénéfice', [data.period1.month]: data.period1.benefice, [data.period2.month]: data.period2.benefice },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input type="month" value={month1} onChange={e => setMonth1(e.target.value)} className="w-48" />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Input type="month" value={month2} onChange={e => setMonth2(e.target.value)} className="w-48" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-5 pt-5 pb-3"><h3 className="text-sm">📅 Comparaison</h3></div>
          <div className="px-5 pb-5">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Indicateur</th>
                    <th className="text-right p-3">{data.period1.month}</th>
                    <th className="text-right p-3">{data.period2.month}</th>
                    <th className="text-right p-3">Variation</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['CA HT', data.period1.ca_ht, data.period2.ca_ht],
                    ['Dépenses HT', data.period1.expenses_ht, data.period2.expenses_ht],
                    ['Bénéfice', data.period1.benefice, data.period2.benefice],
                  ].map(([label, v1, v2], i) => {
                    const variation = v2 !== 0 ? ((v1 - v2) / Math.abs(v2)) * 100 : 0;
                    return (
                      <tr key={i} className="border-t">
                        <td className="p-3 font-medium">{label}</td>
                        <td className="p-3 text-right">{fmt(v1)}</td>
                        <td className="p-3 text-right">{fmt(v2)}</td>
                        <td className={`p-3 text-right font-medium ${variation >= 0 ? 'text-brand-400' : 'text-terracotta-400'}`}>
                          {fmtPct(variation)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-5 pt-5 pb-3"><h3 className="text-sm">📊 Graphique comparatif</h3></div>
          <div className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#666" />
                <YAxis tick={{ fontSize: 10 }} stroke="#666" />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                <Legend />
                <Bar dataKey={data.period1.month} fill="#047857" radius={[4, 4, 0, 0]} />
                <Bar dataKey={data.period2.month} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════

function LoadingState() {
  return (
    <div style={{
      padding: '80px 40px', textAlign: 'center',
      fontFamily: 'Fraunces, serif', fontStyle: 'italic',
      color: 'var(--ink-3)', fontSize: 15,
    }}>
      <RefreshCw style={{ width: 22, height: 22, color: 'var(--ink-3)', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
      <div>Consultation du grimoire…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{
      padding: '60px 40px', textAlign: 'center',
      background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 12,
    }}>
      <FileText style={{ width: 36, height: 36, color: 'var(--ink-4)', marginBottom: 12 }} />
      <div style={{
        fontFamily: 'Fraunces, serif', fontStyle: 'italic',
        fontSize: 15, color: 'var(--ink-3)',
      }}>
        {text}
      </div>
    </div>
  );
}
