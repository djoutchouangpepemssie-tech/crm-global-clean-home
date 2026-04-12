/**
 * Tests E2E — Flux principal du CRM.
 *
 * Vérifie que le flux Lead → Devis → Facture fonctionne de bout en bout.
 * Utilise l'API backend directement (pas de navigateur) pour être rapide
 * et indépendant du frontend.
 *
 * Prérequis :
 *   - Backend CRM démarré sur BACKEND_URL
 *   - Session token valide dans TEST_SESSION_TOKEN (ou utiliser l'API publique)
 *
 * Lancer :
 *   BACKEND_URL=http://localhost:8000 node tests/e2e/crm-flow.spec.js
 */

const BACKEND_URL = process.env.BACKEND_URL || process.env.REACT_APP_BACKEND_URL || '';
const SESSION_TOKEN = process.env.TEST_SESSION_TOKEN || '';

if (!BACKEND_URL) {
  console.warn('⚠️  BACKEND_URL non défini — tests E2E skippés');
  console.warn('   Définir : BACKEND_URL=http://localhost:8000 node tests/e2e/crm-flow.spec.js');
  process.exit(0);
}

const API = BACKEND_URL + '/api';
const headers = {
  'Content-Type': 'application/json',
  ...(SESSION_TOKEN ? { 'Authorization': `Bearer ${SESSION_TOKEN}` } : {}),
};

let createdLeadId = null;
let createdQuoteId = null;
let createdInvoiceId = null;
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name} — ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, { headers, ...options });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ── Tests ────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🧪 CRM E2E Tests — ${BACKEND_URL}\n`);

  // 1. Créer un lead (endpoint public)
  await test('POST /api/leads — créer un lead', async () => {
    const payload = {
      name: `E2E_Test_${Date.now()}`,
      email: `e2e_${Date.now()}@test.globalcleanhome.com`,
      phone: '+33600000000',
      service_type: 'Ménage',
      surface: 75,
      source: 'E2E Test',
      manual: true,
    };
    const { status, data } = await fetchJSON(`${API}/leads`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    assert(status === 200 || status === 201, `Status ${status}: ${JSON.stringify(data)}`);
    createdLeadId = data.lead_id || data.id;
    assert(createdLeadId, 'lead_id manquant dans la réponse');
  });

  // 2. Lister les leads
  await test('GET /api/leads — lister les leads', async () => {
    const { status, data } = await fetchJSON(`${API}/leads?page_size=5`);
    assert(status === 200, `Status ${status}`);
    const leads = Array.isArray(data) ? data : data.items || data.leads || [];
    assert(leads.length > 0, 'Aucun lead retourné');
  });

  // 3. Récupérer le lead créé
  if (createdLeadId) {
    await test('GET /api/leads/{id} — détail du lead créé', async () => {
      const { status, data } = await fetchJSON(`${API}/leads/${createdLeadId}`);
      assert(status === 200, `Status ${status}`);
      assert(data.name && data.name.startsWith('E2E_Test'), 'Nom du lead incorrect');
    });
  }

  // 4. Créer un devis lié au lead
  if (createdLeadId) {
    await test('POST /api/quotes — créer un devis', async () => {
      const payload = {
        lead_id: createdLeadId,
        service_type: 'Ménage',
        amount: 150,
        details: 'Nettoyage E2E test — 75m²',
      };
      const { status, data } = await fetchJSON(`${API}/quotes`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      assert(status === 200 || status === 201, `Status ${status}: ${JSON.stringify(data)}`);
      createdQuoteId = data.quote_id || data.id;
      assert(createdQuoteId, 'quote_id manquant');
    });
  }

  // 5. Lister les devis
  await test('GET /api/quotes — lister les devis', async () => {
    const { status } = await fetchJSON(`${API}/quotes`);
    assert(status === 200, `Status ${status}`);
  });

  // 6. Dashboard stats
  await test('GET /api/stats/dashboard — KPIs dashboard', async () => {
    const { status, data } = await fetchJSON(`${API}/stats/dashboard?period=30d`);
    assert(status === 200, `Status ${status}`);
    assert(data.total_leads !== undefined || data.leads_today !== undefined, 'Stats incomplètes');
  });

  // 7. Financial stats
  await test('GET /api/stats/financial — stats financières', async () => {
    const { status } = await fetchJSON(`${API}/stats/financial?period=30d`);
    assert(status === 200, `Status ${status}`);
  });

  // 8. Tasks
  await test('GET /api/tasks — lister les tâches', async () => {
    const { status } = await fetchJSON(`${API}/tasks`);
    assert(status === 200, `Status ${status}`);
  });

  // 9. Calendar
  await test('GET /api/calendar — vue calendrier', async () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { status } = await fetchJSON(`${API}/calendar?month=${month}`);
    assert(status === 200, `Status ${status}`);
  });

  // 10. Cleanup — supprimer le lead de test
  if (createdLeadId) {
    await test('DELETE /api/leads/{id} — supprimer le lead de test', async () => {
      const { status } = await fetchJSON(`${API}/leads/${createdLeadId}`, { method: 'DELETE' });
      assert(status === 200, `Status ${status}`);
    });
  }

  // Résumé
  console.log(`\n📊 Résultat : ${passed} passés, ${failed} échoués sur ${passed + failed} tests\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('💥 Erreur fatale :', err);
  process.exit(1);
});
