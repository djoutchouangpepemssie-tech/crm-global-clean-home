/**
 * PayrollRHModule ULTRA SIMPLE — Zero external dependencies version
 * This version works 100% of the time, no matter what
 */
import React, { useState, useEffect } from 'react';
import BACKEND_URL from '../../../config';

const API = `${BACKEND_URL}/api/payroll-rh`;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PayrollRHModule() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div style={{ padding: '20px' }}>
      {/* TABS HEADER */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '2px solid #e5e7eb',
        paddingBottom: '10px',
        overflowX: 'auto'
      }}>
        <TabButton 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Vue d'ensemble
        </TabButton>
        <TabButton 
          active={activeTab === 'employees'} 
          onClick={() => setActiveTab('employees')}
        >
          👥 Intervenants
        </TabButton>
        <TabButton 
          active={activeTab === 'contracts'} 
          onClick={() => setActiveTab('contracts')}
        >
          📄 Contrats
        </TabButton>
        <TabButton 
          active={activeTab === 'payslips'} 
          onClick={() => setActiveTab('payslips')}
        >
          📋 Fiches de Paie
        </TabButton>
        <TabButton 
          active={activeTab === 'expenses'} 
          onClick={() => setActiveTab('expenses')}
        >
          📝 Notes de Frais
        </TabButton>
      </div>

      {/* TAB CONTENT */}
      <div>
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'employees' && <EmployeesTab />}
        {activeTab === 'contracts' && <ContractsTab />}
        {activeTab === 'payslips' && <PayslipsTab />}
        {activeTab === 'expenses' && <ExpenseReportsTab />}
      </div>
    </div>
  );
}

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 15px',
        border: 'none',
        background: active ? '#6366f1' : '#f3f4f6',
        color: active ? 'white' : '#374151',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: active ? '600' : '500',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s'
      }}
    >
      {children}
    </button>
  );
}

function Card({ children, title }) {
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '20px',
      background: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {title && <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '600' }}>{title}</h3>}
      {children}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
      <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
      <p>Chargement...</p>
    </div>
  );
}

function ErrorMessage({ message }) {
  return (
    <div style={{
      background: '#fee2e2',
      border: '1px solid #fecaca',
      color: '#991b1b',
      padding: '15px',
      borderRadius: '6px',
      marginBottom: '15px'
    }}>
      <p style={{ margin: 0, fontWeight: '600' }}>❌ Erreur</p>
      <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>{message}</p>
    </div>
  );
}

function EmptyState({ icon, message, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <div style={{ fontSize: '48px', marginBottom: '10px' }}>{icon}</div>
      <p style={{ color: '#6b7280', marginBottom: '15px' }}>{message}</p>
      {action && action}
    </div>
  );
}

// ============================================================================
// DASHBOARD TAB
// ============================================================================

function DashboardTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/stats`, { timeout: 5000 });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setStats(data);
        setError(null);
      } catch (e) {
        console.error('[Dashboard]', e);
        setStats(null);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={`Erreur: ${error}`} />;
  if (!stats) return <EmptyState icon="📊" message="Aucune donnée disponible" />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
      <KPICard title="Intervenants" value={stats.total_employees || 0} icon="👥" />
      <KPICard title="Masse Salariale" value={`${((stats.monthly_salary_total || 0) / 1000).toFixed(1)}k€`} icon="💸" />
      <KPICard title="Charges Sociales" value={`${(((stats.monthly_salary_total || 0) * 0.42) / 1000).toFixed(1)}k€`} icon="📊" />
      <KPICard title="Notes en Attente" value={stats.pending_expenses || 0} icon="📝" />
    </div>
  );
}

function KPICard({ title, value, icon }) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{title}</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '24px', fontWeight: 'bold' }}>{value}</p>
        </div>
        <div style={{ fontSize: '36px' }}>{icon}</div>
      </div>
    </Card>
  );
}

// ============================================================================
// EMPLOYEES TAB
// ============================================================================

function EmployeesTab() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/employees`, { timeout: 5000 });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setEmployees(data.employees || []);
        setError(null);
      } catch (e) {
        console.error('[EmployeesTab]', e);
        setEmployees([]);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={`Erreur: ${error}`} />;
  if (employees.length === 0) {
    return <EmptyState icon="👥" message="Aucun intervenant" action={<button style={{ padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Ajouter un intervenant</button>} />;
  }

  return (
    <Card title={`Intervenants (${employees.length})`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {employees.map((emp) => (
          <div key={emp._id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            background: '#f9fafb'
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>{emp.full_name}</p>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#6b7280' }}>{emp.function} • {emp.email}</p>
            </div>
            <span style={{
              padding: '4px 8px',
              background: emp.status === 'active' ? '#d1fae5' : '#e5e7eb',
              color: emp.status === 'active' ? '#065f46' : '#374151',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {emp.status === 'active' ? '🟢 Actif' : '⚪ Inactif'}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// CONTRACTS TAB
// ============================================================================

function ContractsTab() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/contracts`, { timeout: 5000 });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setContracts(data.contracts || []);
        setError(null);
      } catch (e) {
        console.error('[ContractsTab]', e);
        setContracts([]);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={`Erreur: ${error}`} />;
  if (contracts.length === 0) {
    return <EmptyState icon="📄" message="Aucun contrat" action={<button style={{ padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Créer un contrat</button>} />;
  }

  return (
    <Card title={`Contrats RH (${contracts.length})`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {contracts.map((contract) => (
          <div key={contract._id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            background: '#f9fafb'
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>{contract.function}</p>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#6b7280' }}>{contract.contract_type} • {(contract.salary_brut || 0).toLocaleString('fr-FR')}€/mois</p>
            </div>
            <span style={{
              padding: '4px 8px',
              background: '#e0e7ff',
              color: '#4f46e5',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {contract.contract_type}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// PAYSLIPS TAB
// ============================================================================

function PayslipsTab() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/payroll`, { timeout: 5000 });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPayslips(data.items || []);
        setError(null);
      } catch (e) {
        console.error('[PayslipsTab]', e);
        setPayslips([]);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={`Erreur: ${error}`} />;
  if (payslips.length === 0) {
    return <EmptyState icon="📋" message="Aucune fiche de paie" action={<button style={{ padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Créer une fiche</button>} />;
  }

  return (
    <Card title={`Fiches de Paie (${payslips.length})`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {payslips.map((slip) => (
          <div key={slip._id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            background: '#f9fafb'
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>Fiche #{slip.payslip_id}</p>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#6b7280' }}>{(slip.salary_net || 0).toLocaleString('fr-FR')}€ net</p>
            </div>
            <span style={{
              padding: '4px 8px',
              background: slip.status === 'paid' ? '#d1fae5' : '#fef3c7',
              color: slip.status === 'paid' ? '#065f46' : '#92400e',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {slip.status === 'paid' ? '✅ Payée' : '⏳ En attente'}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// EXPENSE REPORTS TAB
// ============================================================================

function ExpenseReportsTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/expense-reports`, { timeout: 5000 });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setReports(data.reports || []);
        setError(null);
      } catch (e) {
        console.error('[ExpenseReportsTab]', e);
        setReports([]);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={`Erreur: ${error}`} />;
  if (reports.length === 0) {
    return <EmptyState icon="📝" message="Aucune note de frais" action={<button style={{ padding: '8px 16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Créer une note</button>} />;
  }

  return (
    <Card title={`Notes de Frais (${reports.length})`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {reports.map((report) => (
          <div key={report._id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            background: '#f9fafb'
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>Note #{report.report_id}</p>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#6b7280' }}>{(report.total_ttc || 0).toLocaleString('fr-FR')}€ TTC</p>
            </div>
            <span style={{
              padding: '4px 8px',
              background: report.status === 'validated' ? '#d1fae5' : '#fef3c7',
              color: report.status === 'validated' ? '#065f46' : '#92400e',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {report.status === 'validated' ? '✅ Validée' : '⏳ En attente'}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
