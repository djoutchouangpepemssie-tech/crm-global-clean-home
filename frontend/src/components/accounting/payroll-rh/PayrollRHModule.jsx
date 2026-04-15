import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, RefreshCw, User, FileText, Euro, X, Check, Trash2, Download } from 'lucide-react';
import BACKEND_URL from '../../../config.js';
const API = `${BACKEND_URL}/api/payroll-rh`;

const TABS = [
  { id: 'employees', label: '👥 Employés' },
  { id: 'payslips', label: '💰 Fiches de paie' },
  { id: 'contracts', label: '📋 Contrats' },
  { id: 'expenses', label: '🧾 Notes de frais' },
];

const fmt = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v || 0);

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)', width: '100%', maxWidth: '560px',
        maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-dropdown)'
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border-default)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder }) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '8px 12px',
        background: 'var(--bg-input)', border: '1px solid var(--border-input)',
        borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
        fontSize: '13px', outline: 'none', boxSizing: 'border-box'
      }}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      width: '100%', padding: '8px 12px',
      background: 'var(--bg-input)', border: '1px solid var(--border-input)',
      borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '13px'
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Btn({ children, onClick, variant = 'primary', disabled, style = {} }) {
  const styles = {
    primary: { background: 'var(--brand)', color: '#fff', border: 'none' },
    secondary: { background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' },
    danger: { background: '#ef4444', color: '#fff', border: 'none' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '8px 16px', borderRadius: 'var(--radius-md)',
      fontSize: '13px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1, transition: 'all 0.15s',
      ...styles[variant], ...style
    }}>
      {children}
    </button>
  );
}

/* ══════════════════ EMPLOYEES ══════════════════ */
function EmployeesTab() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', role: 'intervenant', salary_base: '', contract_type: 'CDI', start_date: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/employees`, { withCredentials: true });
      setEmployees(Array.isArray(data) ? data : data.items || []);
    } catch (e) { toast.error('Erreur chargement employés'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.first_name || !form.last_name) return toast.error('Prénom et nom requis');
    setSaving(true);
    try {
      await axios.post(`${API}/employees`, { ...form, salary_base: parseFloat(form.salary_base) || 0 }, { withCredentials: true });
      toast.success('Employé créé !');
      setShowModal(false);
      setForm({ first_name: '', last_name: '', email: '', phone: '', role: 'intervenant', salary_base: '', contract_type: 'CDI', start_date: '' });
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur création'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet employé ?')) return;
    try {
      await axios.delete(`${API}/employees/${id}`, { withCredentials: true });
      toast.success('Employé supprimé');
      load();
    } catch (e) { toast.error('Erreur suppression'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>
          {employees.length} employé{employees.length > 1 ? 's' : ''}
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Btn variant="secondary" onClick={load}><RefreshCw size={14} /></Btn>
          <Btn onClick={() => setShowModal(true)}><Plus size={14} /> Nouvel employé</Btn>
        </div>
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>Chargement...</p> :
        employees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <User size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>Aucun employé — créez le premier</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {employees.map(emp => (
              <div key={emp.employee_id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'var(--brand-light)', color: 'var(--brand)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '13px'
                  }}>
                    {emp.first_name?.[0]}{emp.last_name?.[0]}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0, fontSize: '13px' }}>
                      {emp.first_name} {emp.last_name}
                    </p>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '11px' }}>
                      {emp.role} · {emp.contract_type} · {fmt(emp.salary_base)}/mois
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDelete(emp.employee_id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#ef4444', padding: '4px'
                }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )
      }

      {showModal && (
        <Modal title="Nouvel employé" onClose={() => setShowModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Field label="Prénom *"><Input value={form.first_name} onChange={v => setForm(p => ({ ...p, first_name: v }))} placeholder="Marie" /></Field>
            <Field label="Nom *"><Input value={form.last_name} onChange={v => setForm(p => ({ ...p, last_name: v }))} placeholder="Dupont" /></Field>
          </div>
          <Field label="Email"><Input value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} type="email" placeholder="marie@exemple.com" /></Field>
          <Field label="Téléphone"><Input value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="+33 6 12 34 56 78" /></Field>
          <Field label="Rôle">
            <Select value={form.role} onChange={v => setForm(p => ({ ...p, role: v }))} options={[
              { value: 'intervenant', label: 'Intervenant' },
              { value: 'manager', label: 'Manager' },
              { value: 'admin', label: 'Admin' },
              { value: 'commercial', label: 'Commercial' },
            ]} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Field label="Type contrat">
              <Select value={form.contract_type} onChange={v => setForm(p => ({ ...p, contract_type: v }))} options={[
                { value: 'CDI', label: 'CDI' }, { value: 'CDD', label: 'CDD' },
                { value: 'Freelance', label: 'Freelance' }, { value: 'Stage', label: 'Stage' },
              ]} />
            </Field>
            <Field label="Salaire brut/mois (€)"><Input value={form.salary_base} onChange={v => setForm(p => ({ ...p, salary_base: v }))} type="number" placeholder="1800" /></Field>
          </div>
          <Field label="Date début"><Input value={form.start_date} onChange={v => setForm(p => ({ ...p, start_date: v }))} type="date" /></Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Annuler</Btn>
            <Btn onClick={handleCreate} disabled={saving}><Check size={14} /> {saving ? 'Création...' : 'Créer'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════ PAYSLIPS ══════════════════ */
function PayslipsTab() {
  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employee_id: '', period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear(), salary_base: '', bonus: '', deductions: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, e] = await Promise.all([
        axios.get(`${API}/payslips`, { withCredentials: true }),
        axios.get(`${API}/employees`, { withCredentials: true }),
      ]);
      setPayslips(Array.isArray(p.data) ? p.data : p.data.items || []);
      setEmployees(Array.isArray(e.data) ? e.data : e.data.items || []);
    } catch { toast.error('Erreur chargement'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.employee_id) return toast.error('Sélectionnez un employé');
    setSaving(true);
    try {
      await axios.post(`${API}/payslips`, {
        ...form,
        salary_base: parseFloat(form.salary_base) || 0,
        bonus: parseFloat(form.bonus) || 0,
        deductions: parseFloat(form.deductions) || 0,
        period_month: parseInt(form.period_month),
        period_year: parseInt(form.period_year),
      }, { withCredentials: true });
      toast.success('Fiche de paie créée !');
      setShowModal(false);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
    setSaving(false);
  };

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>
          {payslips.length} fiche{payslips.length > 1 ? 's' : ''} de paie
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Btn variant="secondary" onClick={load}><RefreshCw size={14} /></Btn>
          <Btn onClick={() => setShowModal(true)}><Plus size={14} /> Nouvelle fiche</Btn>
        </div>
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>Chargement...</p> :
        payslips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>Aucune fiche de paie</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted)' }}>
                  {['Employé', 'Période', 'Brut', 'Bonus', 'Net', 'Statut'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payslips.map(p => (
                  <tr key={p.payslip_id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{p.employee_name || p.employee_id}</td>
                    <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>{months[p.period_month - 1]} {p.period_year}</td>
                    <td style={{ padding: '10px 12px', fontSize: '13px' }}>{fmt(p.salary_base)}</td>
                    <td style={{ padding: '10px 12px', fontSize: '13px' }}>{fmt(p.bonus)}</td>
                    <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 600, color: 'var(--brand)' }}>{fmt(p.net_salary || (p.salary_base + (p.bonus || 0) - (p.deductions || 0)))}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                        background: p.status === 'paid' ? '#d1fae5' : '#fef3c7',
                        color: p.status === 'paid' ? '#065f46' : '#92400e'
                      }}>
                        {p.status === 'paid' ? 'Payée' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {showModal && (
        <Modal title="Nouvelle fiche de paie" onClose={() => setShowModal(false)}>
          <Field label="Employé *">
            <Select value={form.employee_id} onChange={v => setForm(p => ({ ...p, employee_id: v }))}
              options={[{ value: '', label: '-- Sélectionner --' }, ...employees.map(e => ({ value: e.employee_id, label: `${e.first_name} ${e.last_name}` }))]} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Field label="Mois">
              <Select value={form.period_month} onChange={v => setForm(p => ({ ...p, period_month: v }))}
                options={months.map((m, i) => ({ value: i + 1, label: m }))} />
            </Field>
            <Field label="Année"><Input value={form.period_year} onChange={v => setForm(p => ({ ...p, period_year: v }))} type="number" /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 12px' }}>
            <Field label="Salaire brut (€)"><Input value={form.salary_base} onChange={v => setForm(p => ({ ...p, salary_base: v }))} type="number" placeholder="1800" /></Field>
            <Field label="Bonus (€)"><Input value={form.bonus} onChange={v => setForm(p => ({ ...p, bonus: v }))} type="number" placeholder="0" /></Field>
            <Field label="Déductions (€)"><Input value={form.deductions} onChange={v => setForm(p => ({ ...p, deductions: v }))} type="number" placeholder="0" /></Field>
          </div>
          <Field label="Notes">
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Notes optionnelles..."
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '13px', minHeight: '60px', boxSizing: 'border-box' }} />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Annuler</Btn>
            <Btn onClick={handleCreate} disabled={saving}><Check size={14} /> {saving ? 'Création...' : 'Créer'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════ EXPENSES ══════════════════ */
function ExpensesTab() {
  const [reports, setReports] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employee_id: '', title: '', description: '', amount: '', category: 'transport', date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, e] = await Promise.all([
        axios.get(`${API}/expense-reports`, { withCredentials: true }),
        axios.get(`${API}/employees`, { withCredentials: true }),
      ]);
      setReports(Array.isArray(r.data) ? r.data : r.data.items || []);
      setEmployees(Array.isArray(e.data) ? e.data : e.data.items || []);
    } catch { toast.error('Erreur chargement'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.employee_id || !form.title || !form.amount) return toast.error('Champs requis manquants');
    setSaving(true);
    try {
      await axios.post(`${API}/expense-reports`, { ...form, amount: parseFloat(form.amount) }, { withCredentials: true });
      toast.success('Note de frais créée !');
      setShowModal(false);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>
          {reports.length} note{reports.length > 1 ? 's' : ''} de frais
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Btn variant="secondary" onClick={load}><RefreshCw size={14} /></Btn>
          <Btn onClick={() => setShowModal(true)}><Plus size={14} /> Nouvelle note</Btn>
        </div>
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px' }}>Chargement...</p> :
        reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <Euro size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>Aucune note de frais</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reports.map(r => (
              <div key={r.report_id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px', fontSize: '13px' }}>{r.title}</p>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '11px' }}>{r.category} · {r.date}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, color: 'var(--brand)', margin: '0 0 2px', fontSize: '14px' }}>{fmt(r.amount)}</p>
                  <span style={{
                    padding: '1px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 600,
                    background: r.status === 'validated' ? '#d1fae5' : r.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                    color: r.status === 'validated' ? '#065f46' : r.status === 'rejected' ? '#991b1b' : '#92400e'
                  }}>
                    {r.status === 'validated' ? 'Validée' : r.status === 'rejected' ? 'Rejetée' : 'En attente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {showModal && (
        <Modal title="Nouvelle note de frais" onClose={() => setShowModal(false)}>
          <Field label="Employé *">
            <Select value={form.employee_id} onChange={v => setForm(p => ({ ...p, employee_id: v }))}
              options={[{ value: '', label: '-- Sélectionner --' }, ...employees.map(e => ({ value: e.employee_id, label: `${e.first_name} ${e.last_name}` }))]} />
          </Field>
          <Field label="Titre *"><Input value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} placeholder="Taxi client, Fournitures..." /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Field label="Catégorie">
              <Select value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))} options={[
                { value: 'transport', label: '🚗 Transport' },
                { value: 'restauration', label: '🍽️ Restauration' },
                { value: 'hebergement', label: '🏨 Hébergement' },
                { value: 'materiel', label: '🛠️ Matériel' },
                { value: 'autre', label: '📎 Autre' },
              ]} />
            </Field>
            <Field label="Montant (€) *"><Input value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))} type="number" placeholder="45.50" /></Field>
          </div>
          <Field label="Date"><Input value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} type="date" /></Field>
          <Field label="Description">
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Description optionnelle..."
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '13px', minHeight: '60px', boxSizing: 'border-box' }} />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Annuler</Btn>
            <Btn onClick={handleCreate} disabled={saving}><Check size={14} /> {saving ? 'Création...' : 'Créer'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════ MAIN ══════════════════ */
export default function PayrollRHModule() {
  const [activeTab, setActiveTab] = useState('employees');

  return (
    <div style={{ padding: '24px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-lg)', padding: '4px', marginBottom: '24px', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 16px', borderRadius: 'var(--radius-md)',
            fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
            whiteSpace: 'nowrap',
            background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
            color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: activeTab === tab.id ? 'var(--shadow-card)' : 'none',
            transition: 'all 0.15s'
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'employees' && <EmployeesTab />}
      {activeTab === 'payslips' && <PayslipsTab />}
      {activeTab === 'contracts' && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ marginBottom: '16px' }}>Module contrats en cours de développement</p>
        </div>
      )}
      {activeTab === 'expenses' && <ExpensesTab />}
    </div>
  );
}
