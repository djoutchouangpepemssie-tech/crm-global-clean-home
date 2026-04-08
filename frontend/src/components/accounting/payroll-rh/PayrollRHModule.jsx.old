/**
 * PayrollRHModule SIMPLIFIED — Robust version that works even with missing endpoints
 */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import BACKEND_URL from '../../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  Briefcase, AlertCircle, RefreshCw, Plus, Eye, Edit, Trash2, Download, Check, X
} from 'lucide-react';

const API = `${BACKEND_URL}/api/payroll-rh`;

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

export default function PayrollRHModule() {
  const [subTab, setSubTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API}/stats`, { timeout: 5000 });
      setStats(data);
    } catch (e) {
      console.warn('[PayrollRHModule] Stats load failed:', e.message);
      setStats(null);
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    loadStats(); 
  }, [loadStats]);

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Briefcase className="h-6 w-6 text-violet-500" />
          <h2 className="text-xl font-bold">Paie & Ressources Humaines</h2>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/30">
            Module ERP
          </Badge>
        </div>
        <Button 
          onClick={loadStats} 
          variant="outline" 
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-700 font-medium">Erreur de chargement</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-11">
          <TabsTrigger value="dashboard" className="text-xs">📊 Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="employees" className="text-xs">👥 Intervenants</TabsTrigger>
          <TabsTrigger value="contracts" className="text-xs">📄 Contrats</TabsTrigger>
          <TabsTrigger value="payslips" className="text-xs">📋 Fiches de Paie</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs">📝 Notes de Frais</TabsTrigger>
        </TabsList>

        {/* 1. Dashboard */}
        <TabsContent value="dashboard" className="space-y-4">
          <DashboardTab stats={stats} loading={loading} onRefresh={loadStats} />
        </TabsContent>

        {/* 2. Employees */}
        <TabsContent value="employees" className="space-y-4">
          <EmployeesTab />
        </TabsContent>

        {/* 3. Contracts */}
        <TabsContent value="contracts" className="space-y-4">
          <ContractsTab />
        </TabsContent>

        {/* 4. Payslips */}
        <TabsContent value="payslips" className="space-y-4">
          <PayslipsTab />
        </TabsContent>

        {/* 5. Expense Reports */}
        <TabsContent value="expenses" className="space-y-4">
          <ExpenseReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DASHBOARD TAB
// ═══════════════════════════════════════════════════════

function DashboardTab({ stats, loading, onRefresh }) {
  if (loading) {
    return <Card><CardContent className="pt-6">Chargement...</CardContent></Card>;
  }

  if (!stats) {
    return (
      <Card className="bg-yellow-500/10 border-yellow-500/30">
        <CardContent className="pt-6 space-y-3">
          <p className="text-sm">Les données ne sont pas disponibles actuellement.</p>
          <Button onClick={onRefresh} size="sm">Réessayer</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <KPICard 
        title="Intervenants" 
        value={stats.total_employees || 0} 
        icon="👥"
      />
      <KPICard 
        title="Masse Salariale (Mois)" 
        value={fmt(stats.monthly_salary_total || 0)} 
        icon="💸"
      />
      <KPICard 
        title="Charges Sociales (Mois)" 
        value={fmt((stats.monthly_salary_total || 0) * 0.42)} 
        icon="📊"
      />
      <KPICard 
        title="Notes de Frais en Attente" 
        value={stats.pending_expenses || 0} 
        icon="📝"
      />
    </div>
  );
}

function KPICard({ title, value, icon }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{title}</p>
            <p className="text-lg font-bold mt-1">{value}</p>
          </div>
          <span className="text-3xl">{icon}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// EMPLOYEES TAB
// ═══════════════════════════════════════════════════════

function EmployeesTab() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(`${API}/employees`, { timeout: 5000 });
        setEmployees(data.employees || []);
      } catch (e) {
        console.error('[EmployeesTab]', e.message);
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <Card><CardContent className="pt-6">Chargement...</CardContent></Card>;
  }

  if (employees.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-gray-500">Aucun intervenant</p>
          <Button className="mt-4"><Plus className="h-4 w-4 mr-2" />Ajouter un intervenant</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intervenants ({employees.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {employees.map((emp) => (
            <div key={emp._id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
              <div>
                <p className="font-medium">{emp.full_name}</p>
                <p className="text-xs text-gray-500">{emp.function} • {emp.email}</p>
              </div>
              <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                {emp.status === 'active' ? '🟢 Actif' : '⚪ Inactif'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// CONTRACTS TAB
// ═══════════════════════════════════════════════════════

function ContractsTab() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(`${API}/contracts`, { timeout: 5000 });
        setContracts(data.contracts || []);
      } catch (e) {
        console.error('[ContractsTab]', e.message);
        setContracts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <Card><CardContent className="pt-6">Chargement...</CardContent></Card>;
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-gray-500">Aucun contrat</p>
          <Button className="mt-4"><Plus className="h-4 w-4 mr-2" />Créer un contrat</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contrats RH ({contracts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {contracts.map((contract) => (
            <div key={contract._id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
              <div>
                <p className="font-medium">{contract.function}</p>
                <p className="text-xs text-gray-500">{contract.contract_type} • {fmt(contract.salary_brut)}/mois</p>
              </div>
              <Badge variant="outline">{contract.contract_type}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// PAYSLIPS TAB
// ═══════════════════════════════════════════════════════

function PayslipsTab() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(`${API}/payroll`, { timeout: 5000 });
        setPayslips(data.items || []);
      } catch (e) {
        console.error('[PayslipsTab]', e.message);
        setPayslips([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <Card><CardContent className="pt-6">Chargement...</CardContent></Card>;
  }

  if (payslips.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-gray-500">Aucune fiche de paie</p>
          <Button className="mt-4"><Plus className="h-4 w-4 mr-2" />Créer une fiche</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fiches de Paie ({payslips.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {payslips.map((slip) => (
            <div key={slip._id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
              <div>
                <p className="font-medium">Fiche #{slip.payslip_id}</p>
                <p className="text-xs text-gray-500">{fmt(slip.salary_net)} net</p>
              </div>
              <Badge variant={slip.status === 'paid' ? 'default' : 'secondary'}>
                {slip.status === 'paid' ? '✅ Payée' : '⏳ En attente'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// EXPENSE REPORTS TAB
// ═══════════════════════════════════════════════════════

function ExpenseReportsTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(`${API}/expense-reports`, { timeout: 5000 });
        setReports(data.reports || []);
      } catch (e) {
        console.error('[ExpenseReportsTab]', e.message);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <Card><CardContent className="pt-6">Chargement...</CardContent></Card>;
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-gray-500">Aucune note de frais</p>
          <Button className="mt-4"><Plus className="h-4 w-4 mr-2" />Créer une note</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes de Frais ({reports.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {reports.map((report) => (
            <div key={report._id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
              <div>
                <p className="font-medium">Note #{report.report_id}</p>
                <p className="text-xs text-gray-500">{fmt(report.total_ttc)} TTC</p>
              </div>
              <Badge variant={report.status === 'validated' ? 'default' : 'secondary'}>
                {report.status === 'validated' ? '✅ Validée' : '⏳ En attente'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
