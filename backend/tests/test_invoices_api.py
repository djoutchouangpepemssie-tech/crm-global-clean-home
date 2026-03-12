"""
CRM Global Clean Home - Phase 2: Invoices & Stripe Checkout API Tests
Tests all invoice endpoints, Stripe checkout, and financial stats
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
SESSION_TOKEN = os.environ.get('TEST_SESSION_TOKEN', '')


class TestInvoicesAuthRequired:
    """Test that invoice endpoints return 401 without auth"""
    
    def test_list_invoices_requires_auth(self):
        """GET /api/invoices should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/invoices correctly returns 401")
    
    def test_create_invoice_from_quote_requires_auth(self):
        """POST /api/invoices/from-quote/{quote_id} should return 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/invoices/from-quote/fake_quote_id")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/invoices/from-quote requires auth")
    
    def test_get_single_invoice_requires_auth(self):
        """GET /api/invoices/{invoice_id} should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/invoices/fake_invoice_id")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/invoices/{id} requires auth")
    
    def test_update_invoice_requires_auth(self):
        """PATCH /api/invoices/{invoice_id} should return 401 without auth"""
        response = requests.patch(f"{BASE_URL}/api/invoices/fake_invoice_id", json={"status": "payée"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ PATCH /api/invoices/{id} requires auth")
    
    def test_checkout_requires_auth(self):
        """POST /api/invoices/{invoice_id}/checkout should return 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/invoices/fake_invoice_id/checkout", json={"origin_url": "http://test.com"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/invoices/{id}/checkout requires auth")
    
    def test_payment_status_requires_auth(self):
        """GET /api/invoices/{invoice_id}/payment-status should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/invoices/fake_invoice_id/payment-status?session_id=test")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/invoices/{id}/payment-status requires auth")
    
    def test_financial_stats_requires_auth(self):
        """GET /api/stats/financial should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/stats/financial")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/stats/financial requires auth")


class TestStripeWebhook:
    """Test Stripe webhook endpoint (public)"""
    
    def test_stripe_webhook_accepts_post(self):
        """POST /api/webhook/stripe should accept POST requests"""
        response = requests.post(
            f"{BASE_URL}/api/webhook/stripe",
            json={"type": "checkout.session.completed"},
            headers={"Content-Type": "application/json"}
        )
        # Should return 200 with error status (no valid Stripe signature)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "status" in data
        print("✓ Stripe webhook accepts POST requests")


class TestInvoiceWorkflow:
    """Test full invoice workflow with authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth headers"""
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        if not SESSION_TOKEN:
            pytest.skip("No session token available")
    
    def test_01_create_lead_for_invoice(self):
        """Create a test lead for invoice testing"""
        payload = {
            "name": "TEST_Invoice_Client",
            "email": f"invoice_test_{datetime.now().timestamp()}@example.com",
            "phone": "+33612345678",
            "service_type": "Bureaux",
            "surface": 200,
            "address": "123 Rue Test, Paris"
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "lead_id" in data
        TestInvoiceWorkflow.lead_id = data["lead_id"]
        print(f"✓ Created lead for invoice test: {data['lead_id']}")
    
    def test_02_create_quote(self):
        """Create a quote from the lead"""
        if not hasattr(TestInvoiceWorkflow, 'lead_id'):
            pytest.skip("No lead_id from previous test")
        
        payload = {
            "lead_id": TestInvoiceWorkflow.lead_id,
            "service_type": "Bureaux",
            "surface": 200,
            "amount": 500.00,
            "details": "Nettoyage complet bureaux - Test facture"
        }
        response = requests.post(f"{BASE_URL}/api/quotes", json=payload, headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "quote_id" in data
        assert data["status"] == "brouillon"
        TestInvoiceWorkflow.quote_id = data["quote_id"]
        print(f"✓ Created quote: {data['quote_id']}")
    
    def test_03_send_quote(self):
        """Send the quote to make it eligible for invoice"""
        if not hasattr(TestInvoiceWorkflow, 'quote_id'):
            pytest.skip("No quote_id from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/quotes/{TestInvoiceWorkflow.quote_id}/send",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Sent quote: {TestInvoiceWorkflow.quote_id}")
    
    def test_04_create_invoice_from_quote(self):
        """Create invoice from sent quote"""
        if not hasattr(TestInvoiceWorkflow, 'quote_id'):
            pytest.skip("No quote_id from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/invoices/from-quote/{TestInvoiceWorkflow.quote_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "invoice_id" in data
        assert data["quote_id"] == TestInvoiceWorkflow.quote_id
        assert data["status"] == "en_attente"
        
        # Verify TVA calculation
        amount_ht = data["amount_ht"]
        tva = data["tva"]
        amount_ttc = data["amount_ttc"]
        assert round(tva, 2) == round(amount_ht * 0.20, 2), "TVA should be 20%"
        assert round(amount_ttc, 2) == round(amount_ht + tva, 2), "TTC should be HT + TVA"
        
        TestInvoiceWorkflow.invoice_id = data["invoice_id"]
        print(f"✓ Created invoice: {data['invoice_id']} - Amount TTC: {data['amount_ttc']}€")
    
    def test_05_get_invoice_by_id(self):
        """Get single invoice by ID"""
        if not hasattr(TestInvoiceWorkflow, 'invoice_id'):
            pytest.skip("No invoice_id from previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/invoices/{TestInvoiceWorkflow.invoice_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["invoice_id"] == TestInvoiceWorkflow.invoice_id
        assert "lead_name" in data
        assert "lead_email" in data
        print(f"✓ Got invoice: {data['invoice_id']} for client {data['lead_name']}")
    
    def test_06_list_invoices(self):
        """List all invoices"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} invoices")
    
    def test_07_list_invoices_with_status_filter(self):
        """List invoices with status filter"""
        response = requests.get(f"{BASE_URL}/api/invoices?status=en_attente", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # All returned invoices should have status en_attente
        for inv in data:
            assert inv["status"] == "en_attente"
        print(f"✓ Listed {len(data)} pending invoices")
    
    def test_08_update_invoice_notes(self):
        """Update invoice notes"""
        if not hasattr(TestInvoiceWorkflow, 'invoice_id'):
            pytest.skip("No invoice_id from previous test")
        
        response = requests.patch(
            f"{BASE_URL}/api/invoices/{TestInvoiceWorkflow.invoice_id}",
            json={"notes": "Test note from automated testing"},
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Updated invoice notes")
    
    def test_09_create_stripe_checkout(self):
        """Create Stripe checkout session"""
        if not hasattr(TestInvoiceWorkflow, 'invoice_id'):
            pytest.skip("No invoice_id from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/invoices/{TestInvoiceWorkflow.invoice_id}/checkout",
            json={"origin_url": "https://test.example.com"},
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "url" in data, "Response should contain Stripe checkout URL"
        assert "session_id" in data, "Response should contain session_id"
        assert "stripe.com" in data["url"], "URL should be a Stripe checkout URL"
        
        TestInvoiceWorkflow.stripe_session_id = data["session_id"]
        print(f"✓ Created Stripe checkout session: {data['session_id'][:30]}...")
    
    def test_10_check_payment_status(self):
        """Check payment status via Stripe"""
        if not hasattr(TestInvoiceWorkflow, 'invoice_id') or not hasattr(TestInvoiceWorkflow, 'stripe_session_id'):
            pytest.skip("No invoice_id or stripe_session_id from previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/invoices/{TestInvoiceWorkflow.invoice_id}/payment-status?session_id={TestInvoiceWorkflow.stripe_session_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "payment_status" in data
        assert "status" in data
        assert data["payment_status"] in ["unpaid", "paid"], f"Unexpected payment status: {data['payment_status']}"
        print(f"✓ Payment status: {data['payment_status']}, session status: {data['status']}")
    
    def test_11_cannot_create_duplicate_invoice(self):
        """Creating invoice from same quote should return existing invoice"""
        if not hasattr(TestInvoiceWorkflow, 'quote_id') or not hasattr(TestInvoiceWorkflow, 'invoice_id'):
            pytest.skip("No quote_id or invoice_id from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/invoices/from-quote/{TestInvoiceWorkflow.quote_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Should return the existing invoice, not create a duplicate
        assert data["invoice_id"] == TestInvoiceWorkflow.invoice_id, "Should return existing invoice"
        print("✓ Duplicate invoice creation returns existing invoice")
    
    def test_12_cannot_checkout_paid_invoice(self):
        """After marking invoice as paid, checkout should fail"""
        # This test verifies the business logic but needs manual payment
        # Just verify the endpoint exists and responds correctly
        if not hasattr(TestInvoiceWorkflow, 'invoice_id'):
            pytest.skip("No invoice_id from previous test")
        
        # Update invoice to paid status for test
        response = requests.patch(
            f"{BASE_URL}/api/invoices/{TestInvoiceWorkflow.invoice_id}",
            json={"status": "payée"},
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Now try to checkout - should fail
        response = requests.post(
            f"{BASE_URL}/api/invoices/{TestInvoiceWorkflow.invoice_id}/checkout",
            json={"origin_url": "https://test.example.com"},
            headers=self.headers
        )
        
        assert response.status_code == 400, f"Expected 400 for paid invoice, got {response.status_code}"
        print("✓ Cannot checkout already paid invoice")


class TestFinancialStats:
    """Test financial statistics endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth headers"""
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        if not SESSION_TOKEN:
            pytest.skip("No session token available")
    
    def test_get_financial_stats_default(self):
        """GET /api/stats/financial - Default 30 day period"""
        response = requests.get(f"{BASE_URL}/api/stats/financial", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "period" in data
        assert data["period"] == "30d"
        assert "total_invoices" in data
        assert "paid_count" in data
        assert "pending_count" in data
        assert "overdue_count" in data
        assert "total_revenue" in data
        assert "total_pending" in data
        assert "total_overdue" in data
        assert "revenue_by_service" in data
        assert "revenue_by_day" in data
        assert "recent_transactions" in data
        
        # Verify revenue_by_day has 30 entries
        assert len(data["revenue_by_day"]) == 30, "Should have 30 days of revenue data"
        
        print(f"✓ Financial stats: {data['total_invoices']} invoices, {data['total_revenue']}€ revenue")
    
    def test_get_financial_stats_7d(self):
        """GET /api/stats/financial?period=7d - 7 day period"""
        response = requests.get(f"{BASE_URL}/api/stats/financial?period=7d", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["period"] == "7d"
        print(f"✓ 7-day financial stats retrieved")
    
    def test_get_financial_stats_90d(self):
        """GET /api/stats/financial?period=90d - 90 day period"""
        response = requests.get(f"{BASE_URL}/api/stats/financial?period=90d", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["period"] == "90d"
        print(f"✓ 90-day financial stats retrieved")


class TestInvoice404Errors:
    """Test 404 errors for non-existent invoices"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth headers"""
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        if not SESSION_TOKEN:
            pytest.skip("No session token available")
    
    def test_get_nonexistent_invoice(self):
        """GET /api/invoices/{invoice_id} - 404 for non-existent"""
        response = requests.get(f"{BASE_URL}/api/invoices/inv_nonexistent123", headers=self.headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ 404 for non-existent invoice")
    
    def test_create_invoice_nonexistent_quote(self):
        """POST /api/invoices/from-quote/{quote_id} - 404 for non-existent quote"""
        response = requests.post(
            f"{BASE_URL}/api/invoices/from-quote/quote_nonexistent123",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ 404 for non-existent quote")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
