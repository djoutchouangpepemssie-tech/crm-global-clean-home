import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText, Plus, Edit3, Trash2, Mail, Download, Check, Save,
  Search, Filter, ChevronLeft, ChevronRight, X, Eye, BarChart3,
  Calendar, Users, DollarSign, TrendingUp, Settings, Printer,
  AlertCircle, CheckCircle, Clock, Send, Archive, RefreshCw
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '';

const MONTHS_FR = {
  1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril',
  5: 'Mai', 6: 'Juin', 7: 'Juillet', 8: 'Août',
  9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre'
};

const CONTRACT_TYPES = ['CDI', 'CDD', 'Stage', 'Prestataire'];

const STATUS_COLORS = {
  brouillon: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'validée': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'envoyée': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'payée': 'bg-green-500/20 text-green-400 border-green-500/30',
  'archivée': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const STATUS_ICONS = {
  brouillon: Clock,
  'validée': Check,
  'envoyée': Send,
  'payée': CheckCircle,
  'archivée': Archive,
};

const fmt = (n) => {
  if (n === undefined || n === null) return '0,00';
  return n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// ── Default rates ──
const DEFAULT_RATES = {
  rate_securite_sociale: 8,
  rate_retraite: 3.45,
  rate_mutuelle: 0,
  mutuelle_fixed: 50,
  rate_csg_crds: 8,
  rate_chomage: 0.95,
  rate_patron_ss: 42.5,
  rate_patron_retraite: 4.5,
  rate_patron_chomage: 4.4,
  rate_patron_transport: 5.25,
  rate_patron_apprentissage: 0.68,
  rate_patron_formation: 0.55,
  income_tax_rate: 0,
};

const EMPTY_PAYSLIP = {
  employee_name: '',
  employee_first_name: '',
  employee_email: '',
  social_security_number: '',
  job_title: '',
  hire_date: '',
  contract_type: 'CDI',
  gross_monthly_salary: 0,
  period_month: new Date().getMonth() + 1,
  period_year: new Date().getFullYear(),
  days_worked: 22,
  hours_worked: 151.67,
  paid_leave_days: 0,
  absence_days: 0,
  absence_reason: '',
  base_salary: 0,
  overtime_hours_25: 0,
  overtime_hours_50: 0,
  primes: [],
  advantages: [],
  indemnities: [],
  other_deductions: [],
  rate_patron_other: [],
  ...DEFAULT_RATES,
  cumul_brut_ytd: 0,
  cumul_cotisations_ytd: 0,
  cumul_net_ytd: 0,
  remaining_leave_days: 25,
  payment_date: '',
  notes: '',
};

// ── Compute payslip locally (mirrors backend) ──
function computePayslip(data) {
  const standardDays = 22;
  const daysWorked = data.days_worked || standardDays;
  const grossMonthly = data.gross_monthly_salary || 0;
  
  let baseSalary = data.base_salary || 0;
  if (baseSalary <= 0 && grossMonthly > 0) {
    baseSalary = Math.round(grossMonthly * (daysWorked / standardDays) * 100) / 100;
  }
  
  const hourlyRate = grossMonthly > 0 ? grossMonthly / 151.67 : 0;
  const overtime25 = Math.round((data.overtime_hours_25 || 0) * hourlyRate * 1.25 * 100) / 100;
  const overtime50 = Math.round((data.overtime_hours_50 || 0) * hourlyRate * 1.50 * 100) / 100;
  
  const totalPrimes = (data.primes || []).reduce((s, p) => s + (p.amount || 0), 0);
  const totalAdvantages = (data.advantages || []).reduce((s, p) => s + (p.amount || 0), 0);
  const totalIndemnities = (data.indemnities || []).reduce((s, p) => s + (p.amount || 0), 0);
  
  const gross = Math.round((baseSalary + overtime25 + overtime50 + totalPrimes + totalAdvantages + totalIndemnities) * 100) / 100;
  
  const ss = Math.round(gross * (data.rate_securite_sociale || 0) / 100 * 100) / 100;
  const retraite = Math.round(gross * (data.rate_retraite || 0) / 100 * 100) / 100;
  const mutuelle = (data.rate_mutuelle || 0) === 0 ? (data.mutuelle_fixed || 0) : Math.round(gross * data.rate_mutuelle / 100 * 100) / 100;
  const csg = Math.round(gross * (data.rate_csg_crds || 0) / 100 * 100) / 100;
  const chomage = Math.round(gross * (data.rate_chomage || 0) / 100 * 100) / 100;
  const otherDed = (data.other_deductions || []).reduce((s, p) => s + (p.amount || 0), 0);
  
  const totalEmployeeContributions = Math.round((ss + retraite + mutuelle + csg + chomage + otherDed) * 100) / 100;
  const netBeforeTax = Math.round((gross - totalEmployeeContributions) * 100) / 100;
  const incomeTax = Math.round(netBeforeTax * (data.income_tax_rate || 0) / 100 * 100) / 100;
  const netPay = Math.round((netBeforeTax - incomeTax) * 100) / 100;
  
  const patronSS = Math.round(gross * (data.rate_patron_ss || 0) / 100 * 100) / 100;
  const patronRetraite = Math.round(gross * (data.rate_patron_retraite || 0) / 100 * 100) / 100;
  const patronChomage = Math.round(gross * (data.rate_patron_chomage || 0) / 100 * 100) / 100;
  const patronTransport = Math.round(gross * (data.rate_patron_transport || 0) / 100 * 100) / 100;
  const patronApprentissage = Math.round(gross * (data.rate_patron_apprentissage || 0) / 100 * 100) / 100;
  const patronFormation = Math.round(gross * (data.rate_patron_formation || 0) / 100 * 100) / 100;
  const patronOther = (data.rate_patron_other || []).reduce((s, p) => s + (p.amount || 0), 0);
  
  const totalEmployer = Math.round((patronSS + patronRetraite + patronChomage + patronTransport + patronApprentissage + patronFormation + patronOther) * 100) / 100;
  const totalCost = Math.round((gross + totalEmployer) * 100) / 100;
  
  return {
    base_salary_computed: baseSalary, overtime_25: overtime25, overtime_50: overtime50,
    total_primes: Math.round(totalPrimes * 100) / 100,
    total_advantages: Math.round(totalAdvantages * 100) / 100,
    total_indemnities: Math.round(totalIndemnities * 100) / 100,
    gross,
    contribution_ss: ss, contribution_retraite: retraite, contribution_mutuelle: mutuelle,
    contribution_csg: csg, contribution_chomage: chomage, contribution_other: Math.round(otherDed * 100) / 100,
    total_employee_contributions: totalEmployeeContributions,
    net_before_tax: netBeforeTax, income_tax: incomeTax, net_pay: netPay,
    patron_ss: patronSS, patron_retraite: patronRetraite, patron_chomage: patronChomage,
    patron_transport: patronTransport, patron_apprentissage: patronApprentissage,
    patron_formation: patronFormation, patron_other: Math.round(patronOther * 100) / 100,
    total_employer: totalEmployer, total_cost: totalCost,
  };
}

// ── Reusable Input ──
function Field({ label, value, onChange, type = 'text', className = '', readOnly = false, suffix = '', min, step }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs text-gray-400 font-medium">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          readOnly={readOnly}
          min={min}
          step={step}
          className={`w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition
            ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
        {suffix && <span className="absolute right-3 top-2 text-xs text-gray-500">{suffix}</span>}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs text-gray-400 font-medium">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
      >
        {options.map(o => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Dynamic list items (primes, advantages, etc.) ──
function DynamicItems({ label, items, onChange, addLabel }) {
  const add = () => onChange([...items, { label: '', amount: 0 }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, field, val) => {
    const copy = [...items];
    copy[i] = { ...copy[i], [field]: field === 'amount' ? (parseFloat(val) || 0) : val };
    onChange(copy);
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <button onClick={add} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
          <Plus size={12} /> {addLabel || 'Ajouter'}
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-end">
          <div className="flex-1">
            <input
              placeholder="Libellé"
              value={item.label}
              onChange={e => update(i, 'label', e.target.value)}
              className="w-full px-2 py-1.5 bg-gray-800/50 border border-gray-700 rounded text-xs text-white"
            />
          </div>
          <div className="w-28">
            <input
              type="number"
              placeholder="Montant"
              value={item.amount}
              onChange={e => update(i, 'amount', e.target.value)}
              className="w-full px-2 py-1.5 bg-gray-800/50 border border-gray-700 rounded text-xs text-white text-right"
              step="0.01"
            />
          </div>
          <button onClick={() => remove(i)} className="text-red-400 hover:text-red-300 pb-1">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════
// PAYSLIP EDITOR
// ══════════════════════════════════════════════

function PayslipEditor({ payslip, onSave, onCancel, loading }) {
  const [form, setForm] = useState({ ...EMPTY_PAYSLIP, ...payslip });
  const computed = useMemo(() => computePayslip(form), [form]);
  
  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));
  
  const handleSave = (asDraft = true) => {
    onSave({ ...form }, asDraft);
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
      {/* Employee Info */}
      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
        <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
          <Users size={16} /> Informations Salarié
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Nom" value={form.employee_name} onChange={v => set('employee_name', v)} />
          <Field label="Prénom" value={form.employee_first_name} onChange={v => set('employee_first_name', v)} />
          <Field label="Email" value={form.employee_email} onChange={v => set('employee_email', v)} type="email" />
          <Field label="N° Sécurité sociale" value={form.social_security_number} onChange={v => set('social_security_number', v)} />
          <Field label="Poste / Fonction" value={form.job_title} onChange={v => set('job_title', v)} />
          <Field label="Date d'embauche" value={form.hire_date} onChange={v => set('hire_date', v)} type="date" />
          <SelectField label="Type de contrat" value={form.contract_type} onChange={v => set('contract_type', v)} options={CONTRACT_TYPES} />
          <Field label="Salaire brut mensuel" value={form.gross_monthly_salary} onChange={v => set('gross_monthly_salary', v)} type="number" suffix="€" step="0.01" />
        </div>
      </div>

      {/* Pay Period */}
      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
        <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
          <Calendar size={16} /> Période de Paie
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SelectField label="Mois" value={form.period_month} onChange={v => set('period_month', parseInt(v))}
            options={Object.entries(MONTHS_FR).map(([k, v]) => ({ value: k, label: v }))} />
          <Field label="Année" value={form.period_year} onChange={v => set('period_year', v)} type="number" />
          <Field label="Jours travaillés" value={form.days_worked} onChange={v => set('days_worked', v)} type="number" step="0.5" />
          <Field label="Heures travaillées" value={form.hours_worked} onChange={v => set('hours_worked', v)} type="number" step="0.01" />
          <Field label="Congés payés (j)" value={form.paid_leave_days} onChange={v => set('paid_leave_days', v)} type="number" step="0.5" />
          <Field label="Absences (j)" value={form.absence_days} onChange={v => set('absence_days', v)} type="number" step="0.5" />
        </div>
        {form.absence_days > 0 && (
          <div className="mt-2">
            <Field label="Motif d'absence" value={form.absence_reason} onChange={v => set('absence_reason', v)} />
          </div>
        )}
      </div>

      {/* Gross Elements */}
      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
        <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
          <DollarSign size={16} /> Éléments de Rémunération (Brut)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <Field label="Salaire de base (auto)" value={fmt(computed.base_salary_computed)} readOnly className="opacity-80" />
          <Field label="Heures supp. 25%" value={form.overtime_hours_25} onChange={v => set('overtime_hours_25', v)} type="number" suffix="h" step="0.5" />
          <Field label="Heures supp. 50%" value={form.overtime_hours_50} onChange={v => set('overtime_hours_50', v)} type="number" suffix="h" step="0.5" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DynamicItems label="Primes" items={form.primes} onChange={v => set('primes', v)} addLabel="Prime" />
          <DynamicItems label="Avantages en nature" items={form.advantages} onChange={v => set('advantages', v)} addLabel="Avantage" />
          <DynamicItems label="Indemnités" items={form.indemnities} onChange={v => set('indemnities', v)} addLabel="Indemnité" />
        </div>
        
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-blue-400">BRUT IMPOSABLE</span>
            <span className="text-lg font-bold text-blue-300">{fmt(computed.gross)} €</span>
          </div>
        </div>
      </div>

      {/* Employee Contributions */}
      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
        <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
          <TrendingUp size={16} /> Cotisations Salarié
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
          <Field label="Sécu. Sociale (%)" value={form.rate_securite_sociale} onChange={v => set('rate_securite_sociale', v)} type="number" suffix="%" step="0.01" />
          <Field label="Retraite (%)" value={form.rate_retraite} onChange={v => set('rate_retraite', v)} type="number" suffix="%" step="0.01" />
          <Field label="Mutuelle (fixe €)" value={form.mutuelle_fixed} onChange={v => set('mutuelle_fixed', v)} type="number" suffix="€" step="0.01" />
          <Field label="CSG/CRDS (%)" value={form.rate_csg_crds} onChange={v => set('rate_csg_crds', v)} type="number" suffix="%" step="0.01" />
          <Field label="Chômage (%)" value={form.rate_chomage} onChange={v => set('rate_chomage', v)} type="number" suffix="%" step="0.01" />
        </div>
        <DynamicItems label="Autres retenues" items={form.other_deductions} onChange={v => set('other_deductions', v)} addLabel="Retenue" />
        
        <div className="mt-3 space-y-1 text-xs">
          <div className="flex justify-between text-gray-400">
            <span>Sécurité Sociale ({form.rate_securite_sociale}%)</span>
            <span className="text-red-400">-{fmt(computed.contribution_ss)} €</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Retraite AGIRC-ARRCO ({form.rate_retraite}%)</span>
            <span className="text-red-400">-{fmt(computed.contribution_retraite)} €</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Mutuelle</span>
            <span className="text-red-400">-{fmt(computed.contribution_mutuelle)} €</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>CSG/CRDS ({form.rate_csg_crds}%)</span>
            <span className="text-red-400">-{fmt(computed.contribution_csg)} €</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Assurance chômage ({form.rate_chomage}%)</span>
            <span className="text-red-400">-{fmt(computed.contribution_chomage)} €</span>
          </div>
        </div>
        
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-red-400">TOTAL COTISATIONS</span>
            <span className="text-lg font-bold text-red-300">-{fmt(computed.total_employee_contributions)} €</span>
          </div>
        </div>
      </div>

      {/* Tax */}
      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
        <h3 className="text-sm font-bold text-amber-400 mb-3">Prélèvement à la source</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Taux PAS (%)" value={form.income_tax_rate} onChange={v => set('income_tax_rate', v)} type="number" suffix="%" step="0.1" />
          <Field label="Montant PAS (auto)" value={fmt(computed.income_tax)} readOnly suffix="€" />
        </div>
      </div>

      {/* NET */}
      <div className="p-4 bg-green-500/10 border-2 border-green-500/40 rounded-xl">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-green-400">💰 NET À PAYER</span>
          <span className="text-2xl font-black text-green-300">{fmt(computed.net_pay)} €</span>
        </div>
      </div>

      {/* Employer Contributions (collapsed) */}
      <details className="bg-gray-800/30 rounded-xl border border-gray-700/50">
        <summary className="p-4 cursor-pointer text-sm font-bold text-gray-400 flex items-center gap-2">
          <Settings size={16} /> Cotisations Patronales (coût employeur)
        </summary>
        <div className="px-4 pb-4 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            <Field label="Sécu. Sociale (%)" value={form.rate_patron_ss} onChange={v => set('rate_patron_ss', v)} type="number" suffix="%" step="0.01" />
            <Field label="Retraite (%)" value={form.rate_patron_retraite} onChange={v => set('rate_patron_retraite', v)} type="number" suffix="%" step="0.01" />
            <Field label="Chômage (%)" value={form.rate_patron_chomage} onChange={v => set('rate_patron_chomage', v)} type="number" suffix="%" step="0.01" />
            <Field label="Transport (%)" value={form.rate_patron_transport} onChange={v => set('rate_patron_transport', v)} type="number" suffix="%" step="0.01" />
            <Field label="Apprentissage (%)" value={form.rate_patron_apprentissage} onChange={v => set('rate_patron_apprentissage', v)} type="number" suffix="%" step="0.01" />
            <Field label="Formation (%)" value={form.rate_patron_formation} onChange={v => set('rate_patron_formation', v)} type="number" suffix="%" step="0.01" />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400 font-medium">Total patronal</span>
            <span className="text-gray-300 font-bold">{fmt(computed.total_employer)} €</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-700 pt-2">
            <span className="text-blue-400 font-bold">COÛT TOTAL EMPLOYEUR</span>
            <span className="text-blue-300 font-bold">{fmt(computed.total_cost)} €</span>
          </div>
        </div>
      </details>

      {/* Cumuls */}
      <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
        <h3 className="text-sm font-bold text-blue-400 mb-3">Cumuls & Compléments</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Cumul Brut (année)" value={form.cumul_brut_ytd} onChange={v => set('cumul_brut_ytd', v)} type="number" suffix="€" />
          <Field label="Cumul Cotisations" value={form.cumul_cotisations_ytd} onChange={v => set('cumul_cotisations_ytd', v)} type="number" suffix="€" />
          <Field label="Cumul Net" value={form.cumul_net_ytd} onChange={v => set('cumul_net_ytd', v)} type="number" suffix="€" />
          <Field label="Congés restants (j)" value={form.remaining_leave_days} onChange={v => set('remaining_leave_days', v)} type="number" />
        </div>
        <div className="mt-3">
          <Field label="Date de versement" value={form.payment_date} onChange={v => set('payment_date', v)} type="date" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 sticky bottom-0 bg-gray-900/95 backdrop-blur p-4 -mx-4 -mb-4 rounded-b-xl border-t border-gray-700/50">
        <button onClick={onCancel}
          className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition text-sm flex items-center gap-2">
          <X size={16} /> Annuler
        </button>
        <button onClick={() => handleSave(true)} disabled={loading}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition text-sm flex items-center gap-2 disabled:opacity-50">
          <Save size={16} /> {loading ? 'Enregistrement...' : 'Enregistrer Brouillon'}
        </button>
        <button onClick={() => handleSave(false)} disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition text-sm flex items-center gap-2 disabled:opacity-50">
          <Check size={16} /> {loading ? 'Validation...' : 'Valider & Enregistrer'}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// PAYSLIP DETAIL VIEW
// ══════════════════════════════════════════════

function PayslipDetail({ payslip, onClose, onAction }) {
  const computed = computePayslip(payslip);
  const periodLabel = `${MONTHS_FR[payslip.period_month] || '?'} ${payslip.period_year}`;
  const empName = `${payslip.employee_first_name || ''} ${payslip.employee_name || ''}`.trim();
  const StatusIcon = STATUS_ICONS[payslip.status] || Clock;
  
  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">{empName}</h2>
          <p className="text-sm text-gray-400">Bulletin de paie — {periodLabel}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[payslip.status] || ''} flex items-center gap-1`}>
          <StatusIcon size={12} /> {payslip.status}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Brut', value: computed.gross, color: 'blue' },
          { label: 'Cotisations', value: computed.total_employee_contributions, color: 'red', prefix: '-' },
          { label: 'Net à payer', value: computed.net_pay, color: 'green' },
          { label: 'Coût employeur', value: computed.total_cost, color: 'purple' },
        ].map(({ label, value, color, prefix = '' }) => (
          <div key={label} className={`p-3 bg-${color}-500/10 border border-${color}-500/30 rounded-lg`}>
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`text-lg font-bold text-${color}-400`}>{prefix}{fmt(value)} €</p>
          </div>
        ))}
      </div>

      {/* Detail table */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50 space-y-3">
        <h4 className="text-xs font-bold text-gray-400 uppercase">Détail</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-gray-400">Poste</div><div className="text-white">{payslip.job_title || '—'}</div>
          <div className="text-gray-400">Contrat</div><div className="text-white">{payslip.contract_type}</div>
          <div className="text-gray-400">Jours travaillés</div><div className="text-white">{payslip.days_worked}</div>
          <div className="text-gray-400">Heures travaillées</div><div className="text-white">{payslip.hours_worked}</div>
          <div className="text-gray-400">Congés payés</div><div className="text-white">{payslip.paid_leave_days} j</div>
          <div className="text-gray-400">Absences</div><div className="text-white">{payslip.absence_days} j {payslip.absence_reason ? `(${payslip.absence_reason})` : ''}</div>
        </div>
      </div>

      {/* Audit trail */}
      {payslip.audit_trail && payslip.audit_trail.length > 0 && (
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Historique</h4>
          <div className="space-y-1">
            {payslip.audit_trail.slice(-10).reverse().map((a, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-300">{a.details}</span>
                <span className="text-gray-500">{a.at ? new Date(a.at).toLocaleString('fr-FR') : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700/50">
        <button onClick={onClose}
          className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-xs flex items-center gap-1">
          <X size={14} /> Fermer
        </button>
        <button onClick={() => onAction('edit')}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-xs flex items-center gap-1">
          <Edit3 size={14} /> Éditer
        </button>
        {payslip.status === 'brouillon' && (
          <button onClick={() => onAction('validate')}
            className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-xs flex items-center gap-1">
            <Check size={14} /> Valider
          </button>
        )}
        <button onClick={() => onAction('pdf')}
          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 text-xs flex items-center gap-1">
          <Download size={14} /> PDF
        </button>
        <button onClick={() => onAction('email')}
          className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 text-xs flex items-center gap-1">
          <Mail size={14} /> Envoyer Email
        </button>
        {(payslip.status === 'validée' || payslip.status === 'envoyée') && (
          <button onClick={() => onAction('paid')}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 text-xs flex items-center gap-1">
            <CheckCircle size={14} /> Marquer Payé
          </button>
        )}
        <button onClick={() => onAction('delete')}
          className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 text-xs flex items-center gap-1">
          <Trash2 size={14} /> Archiver
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// STATS DASHBOARD
// ══════════════════════════════════════════════

function PayrollStats({ stats }) {
  if (!stats || !stats.monthly) return null;
  const maxGross = Math.max(...stats.monthly.map(m => m.total_gross), 1);
  
  return (
    <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <BarChart3 size={16} className="text-blue-400" /> Statistiques {stats.year}
      </h3>
      
      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Bulletins', value: stats.totals.count, suffix: '', color: 'blue' },
          { label: 'Total Brut', value: stats.totals.total_gross, suffix: '€', color: 'blue' },
          { label: 'Total Net', value: stats.totals.total_net, suffix: '€', color: 'green' },
          { label: 'Coût Total', value: stats.totals.total_cost, suffix: '€', color: 'purple' },
        ].map(({ label, value, suffix, color }) => (
          <div key={label} className="text-center">
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`text-base font-bold text-${color}-400`}>{typeof value === 'number' && suffix ? fmt(value) : value} {suffix}</p>
          </div>
        ))}
      </div>
      
      {/* Monthly bars */}
      <div className="flex items-end gap-1 h-24">
        {Array.from({ length: 12 }, (_, i) => {
          const m = stats.monthly.find(x => x.month === i + 1);
          const h = m ? (m.total_gross / maxGross) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-blue-500/30 rounded-t relative" style={{ height: `${Math.max(h, 2)}%` }}>
                {m && <div className="absolute inset-0 bg-blue-500/60 rounded-t" style={{ height: `${(m.total_net / m.total_gross) * 100}%`, bottom: 0, top: 'auto' }} />}
              </div>
              <span className="text-[10px] text-gray-500">{MONTHS_FR[i + 1]?.slice(0, 3)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// CONFIRM MODAL
// ══════════════════════════════════════════════

function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = 'Confirmer', danger = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400 mb-4">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">Annuler</button>
          <button onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm text-white ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MAIN PAYROLL MODULE
// ══════════════════════════════════════════════

export default function PayrollModule() {
  const { token } = useAuth();
  const [view, setView] = useState('list'); // list, create, edit, detail
  const [payslips, setPayslips] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  
  // Filters
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch payslips ──
  const fetchPayslips = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterSearch) params.set('search', filterSearch);
      if (filterStatus) params.set('status', filterStatus);
      if (filterMonth) params.set('period_month', filterMonth);
      if (filterYear) params.set('period_year', filterYear);
      
      const res = await fetch(`${API}/api/payroll?${params}`, { headers });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`[PayrollModule] HTTP ${res.status}:`, errText);
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Réponse invalide du serveur (non-JSON)');
      }
      const data = await res.json();
      setPayslips(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
      showToast('Erreur de chargement', 'error');
    }
    setLoading(false);
  }, [headers, page, filterSearch, filterStatus, filterMonth, filterYear]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/payroll/stats?year=${filterYear || new Date().getFullYear()}`, { headers });
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          setStats(await res.json());
        } else {
          console.warn('[PayrollModule] Stats response not JSON');
        }
      }
    } catch (e) { 
      console.error('[PayrollModule] Stats fetch error:', e);
    }
  }, [headers, filterYear]);

  useEffect(() => { fetchPayslips(); }, [fetchPayslips]);
  useEffect(() => { if (showStats) fetchStats(); }, [showStats, fetchStats]);

  // ── Actions ──
  const handleSave = async (formData, asDraft) => {
    setSaving(true);
    try {
      const isEdit = !!selected?.payslip_id;
      const url = isEdit ? `${API}/api/payroll/${selected.payslip_id}` : `${API}/api/payroll/create`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, { method, headers, body: JSON.stringify(formData) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Erreur');
      }
      const saved = await res.json();
      
      // Validate if not draft
      if (!asDraft && saved.payslip_id) {
        await fetch(`${API}/api/payroll/${saved.payslip_id}/validate`, { method: 'POST', headers });
      }
      
      showToast(asDraft ? 'Brouillon enregistré' : 'Bulletin validé');
      setView('list');
      setSelected(null);
      fetchPayslips();
    } catch (e) {
      showToast(e.message || 'Erreur', 'error');
    }
    setSaving(false);
  };

  const handleAction = async (action, payslip) => {
    const ps = payslip || selected;
    if (!ps) return;

    switch (action) {
      case 'edit':
        setSelected(ps);
        setView('edit');
        break;
      case 'detail':
        setSelected(ps);
        setView('detail');
        break;
      case 'validate':
        setConfirm({
          title: 'Valider le bulletin ?',
          message: `Valider le bulletin de ${ps.employee_first_name} ${ps.employee_name} pour ${MONTHS_FR[ps.period_month]} ${ps.period_year} ?`,
          onConfirm: async () => {
            try {
              await fetch(`${API}/api/payroll/${ps.payslip_id}/validate`, { method: 'POST', headers });
              showToast('Bulletin validé');
              fetchPayslips();
              setView('list');
            } catch (e) { showToast('Erreur', 'error'); }
            setConfirm(null);
          }
        });
        break;
      case 'pdf':
        window.open(`${API}/api/payroll/${ps.payslip_id}/pdf?token=${token}`, '_blank');
        break;
      case 'email':
        setConfirm({
          title: 'Envoyer par email ?',
          message: `Envoyer le bulletin PDF à ${ps.employee_email || 'email non défini'} ?`,
          confirmLabel: 'Envoyer',
          onConfirm: async () => {
            try {
              const res = await fetch(`${API}/api/payroll/${ps.payslip_id}/send-email`, { method: 'POST', headers });
              const data = await res.json();
              if (!res.ok) throw new Error(data.detail || 'Erreur');
              showToast(`Email envoyé à ${data.sent_to}`);
              fetchPayslips();
            } catch (e) { showToast(e.message || 'Erreur envoi', 'error'); }
            setConfirm(null);
          }
        });
        break;
      case 'paid':
        setConfirm({
          title: 'Marquer comme payé ?',
          message: 'Confirmer que le virement a été effectué ?',
          onConfirm: async () => {
            try {
              await fetch(`${API}/api/payroll/${ps.payslip_id}/mark-paid`, { method: 'POST', headers });
              showToast('Marqué comme payé');
              fetchPayslips();
              setView('list');
            } catch (e) { showToast('Erreur', 'error'); }
            setConfirm(null);
          }
        });
        break;
      case 'delete':
        setConfirm({
          title: 'Archiver le bulletin ?',
          message: 'Cette action est réversible. Le bulletin sera archivé.',
          confirmLabel: 'Archiver',
          danger: true,
          onConfirm: async () => {
            try {
              await fetch(`${API}/api/payroll/${ps.payslip_id}`, { method: 'DELETE', headers });
              showToast('Bulletin archivé');
              fetchPayslips();
              setView('list');
              setSelected(null);
            } catch (e) { showToast('Erreur', 'error'); }
            setConfirm(null);
          }
        });
        break;
      default:
        break;
    }
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (filterMonth) params.set('period_month', filterMonth);
    if (filterYear) params.set('period_year', filterYear);
    window.open(`${API}/api/payroll/export/excel?${params}&token=${token}`, '_blank');
  };

  // ── Render ──
  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="text-blue-400" size={28} />
            Gestion de la Paie
          </h1>
          <p className="text-sm text-gray-400 mt-1">Bulletins de paie • Normes françaises</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowStats(!showStats)}
            className="px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 text-sm flex items-center gap-1 border border-purple-500/30">
            <BarChart3 size={14} /> Stats
          </button>
          <button onClick={handleExportCSV}
            className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm flex items-center gap-1">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => { setSelected(null); setView('create'); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm flex items-center gap-2 font-medium">
            <Plus size={16} /> Nouveau Bulletin
          </button>
        </div>
      </div>

      {/* Stats */}
      {showStats && <div className="mb-6"><PayrollStats stats={stats} /></div>}

      {/* CREATE / EDIT */}
      {(view === 'create' || view === 'edit') && (
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 sm:p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            {view === 'create' ? <><Plus size={18} className="text-blue-400" /> Nouveau Bulletin</> 
                               : <><Edit3 size={18} className="text-blue-400" /> Modifier Bulletin</>}
          </h2>
          <PayslipEditor
            payslip={view === 'edit' ? selected : EMPTY_PAYSLIP}
            onSave={handleSave}
            onCancel={() => { setView('list'); setSelected(null); }}
            loading={saving}
          />
        </div>
      )}

      {/* DETAIL VIEW */}
      {view === 'detail' && selected && (
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 sm:p-6">
          <PayslipDetail
            payslip={selected}
            onClose={() => { setView('list'); setSelected(null); }}
            onAction={(a) => handleAction(a, selected)}
          />
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                placeholder="Rechercher par nom..."
                value={filterSearch}
                onChange={e => { setFilterSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white">
              <option value="">Tous statuts</option>
              <option value="brouillon">Brouillon</option>
              <option value="validée">Validée</option>
              <option value="envoyée">Envoyée</option>
              <option value="payée">Payée</option>
            </select>
            <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white">
              <option value="">Tous mois</option>
              {Object.entries(MONTHS_FR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="number" value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1); }}
              className="w-24 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white"
              placeholder="Année" />
            <button onClick={fetchPayslips} className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Table */}
          <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800/50 border-b border-gray-700/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Salarié</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Période</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Brut</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Net</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase">Statut</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">Chargement...</td></tr>
                  ) : payslips.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-500">
                      Aucun bulletin trouvé. <button onClick={() => setView('create')} className="text-blue-400 hover:underline">Créer un bulletin</button>
                    </td></tr>
                  ) : payslips.map(ps => {
                    const StatusIcon = STATUS_ICONS[ps.status] || Clock;
                    return (
                      <tr key={ps.payslip_id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition"
                        onClick={() => handleAction('detail', ps)}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{ps.employee_first_name} {ps.employee_name}</div>
                          <div className="text-xs text-gray-500">{ps.job_title} • {ps.contract_type}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {MONTHS_FR[ps.period_month]} {ps.period_year}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-300 font-medium">{fmt(ps.gross)} €</td>
                        <td className="px-4 py-3 text-right text-green-300 font-medium">{fmt(ps.net_pay)} €</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[ps.status] || ''}`}>
                            <StatusIcon size={10} /> {ps.status}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleAction('edit', ps)} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-blue-400" title="Éditer">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleAction('pdf', ps)} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-purple-400" title="PDF">
                              <Download size={14} />
                            </button>
                            <button onClick={() => handleAction('email', ps)} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-orange-400" title="Email">
                              <Mail size={14} />
                            </button>
                            <button onClick={() => handleAction('delete', ps)} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400" title="Archiver">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > 20 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50">
                <span className="text-xs text-gray-400">{total} bulletin(s) • Page {page}</span>
                <div className="flex gap-1">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="p-1.5 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-30">
                    <ChevronLeft size={14} className="text-gray-300" />
                  </button>
                  <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}
                    className="p-1.5 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-30">
                    <ChevronRight size={14} className="text-gray-300" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
