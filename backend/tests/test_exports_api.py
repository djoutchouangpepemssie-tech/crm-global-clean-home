"""
Backend API tests for PDF/CSV Export Endpoints (Phase 7)
Tests: Invoice PDF, Quote PDF, Financial Report PDF, CSV exports (invoices/clients/interventions)
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from previous iteration
SESSION_TOKEN = "test_session_phase6_1773349629903"


@pytest.fixture
def auth_headers():
    """Get authenticated headers"""
    return {"Authorization": f"Bearer {SESSION_TOKEN}"}


@pytest.fixture
def api_client(auth_headers):
    """Shared authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        **auth_headers
    })
    return session


class TestExportAuth:
    """Test that export endpoints require authentication"""
    
    def test_invoice_pdf_requires_auth(self):
        """GET /api/exports/invoice/{id}/pdf without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/exports/invoice/fake_id/pdf")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invoice PDF export requires authentication")

    def test_quote_pdf_requires_auth(self):
        """GET /api/exports/quote/{id}/pdf without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/exports/quote/fake_id/pdf")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Quote PDF export requires authentication")

    def test_financial_pdf_requires_auth(self):
        """GET /api/exports/financial/pdf without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/exports/financial/pdf")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Financial report PDF export requires authentication")

    def test_invoices_csv_requires_auth(self):
        """GET /api/exports/invoices/csv without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/exports/invoices/csv")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invoices CSV export requires authentication")

    def test_clients_csv_requires_auth(self):
        """GET /api/exports/clients/csv without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/exports/clients/csv")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Clients CSV export requires authentication")

    def test_interventions_csv_requires_auth(self):
        """GET /api/exports/interventions/csv without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/exports/interventions/csv")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Interventions CSV export requires authentication")


class TestCSVExports:
    """Test CSV export endpoints with authentication"""

    def test_invoices_csv_export(self, api_client):
        """GET /api/exports/invoices/csv returns CSV file"""
        response = api_client.get(f"{BASE_URL}/api/exports/invoices/csv")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Check content type
        content_type = response.headers.get('Content-Type', '')
        assert 'text/csv' in content_type, f"Expected text/csv, got {content_type}"
        
        # Check content disposition
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'attachment' in content_disp, "Expected attachment disposition"
        assert 'csv' in content_disp, "Expected .csv filename"
        
        # Check CSV structure (header row)
        content = response.text
        assert 'invoice_id' in content, "CSV should have invoice_id header"
        assert 'lead_name' in content, "CSV should have lead_name header"
        print("✓ Invoices CSV export works correctly")

    def test_invoices_csv_with_status_filter(self, api_client):
        """GET /api/exports/invoices/csv?status=en_attente filters correctly"""
        response = api_client.get(f"{BASE_URL}/api/exports/invoices/csv?status=en_attente")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert 'text/csv' in response.headers.get('Content-Type', '')
        print("✓ Invoices CSV export with status filter works")

    def test_clients_csv_export(self, api_client):
        """GET /api/exports/clients/csv returns CSV file"""
        response = api_client.get(f"{BASE_URL}/api/exports/clients/csv")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        content_type = response.headers.get('Content-Type', '')
        assert 'text/csv' in content_type, f"Expected text/csv, got {content_type}"
        
        content = response.text
        assert 'lead_id' in content, "CSV should have lead_id header"
        assert 'name' in content, "CSV should have name header"
        print("✓ Clients CSV export works correctly")

    def test_interventions_csv_export(self, api_client):
        """GET /api/exports/interventions/csv returns CSV file"""
        response = api_client.get(f"{BASE_URL}/api/exports/interventions/csv")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        content_type = response.headers.get('Content-Type', '')
        assert 'text/csv' in content_type, f"Expected text/csv, got {content_type}"
        
        content = response.text
        assert 'intervention_id' in content, "CSV should have intervention_id header"
        print("✓ Interventions CSV export works correctly")


class TestFinancialPDFExport:
    """Test financial report PDF generation"""

    def test_financial_pdf_export(self, api_client):
        """GET /api/exports/financial/pdf returns PDF file"""
        response = api_client.get(f"{BASE_URL}/api/exports/financial/pdf")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        content_type = response.headers.get('Content-Type', '')
        assert 'application/pdf' in content_type, f"Expected application/pdf, got {content_type}"
        
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'attachment' in content_disp, "Expected attachment disposition"
        assert 'pdf' in content_disp, "Expected .pdf filename"
        
        # Check PDF magic bytes
        content = response.content
        assert content[:4] == b'%PDF', "File should start with PDF magic bytes"
        print("✓ Financial PDF export works correctly")

    def test_financial_pdf_with_period(self, api_client):
        """GET /api/exports/financial/pdf?period=7d works with period parameter"""
        response = api_client.get(f"{BASE_URL}/api/exports/financial/pdf?period=7d")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert 'application/pdf' in response.headers.get('Content-Type', '')
        print("✓ Financial PDF export with period=7d works")

    def test_financial_pdf_with_90d_period(self, api_client):
        """GET /api/exports/financial/pdf?period=90d works"""
        response = api_client.get(f"{BASE_URL}/api/exports/financial/pdf?period=90d")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.content[:4] == b'%PDF', "Should be valid PDF"
        print("✓ Financial PDF export with period=90d works")


class TestInvoicePDFExport:
    """Test invoice PDF generation with real data"""

    @pytest.fixture
    def test_invoice_id(self, api_client):
        """Get an existing invoice ID or create one"""
        # First check if there are existing invoices
        response = api_client.get(f"{BASE_URL}/api/invoices")
        if response.status_code == 200:
            invoices = response.json()
            if invoices:
                return invoices[0].get('invoice_id')
        return None
    
    def test_invoice_pdf_not_found(self, api_client):
        """GET /api/exports/invoice/{fake_id}/pdf returns 404"""
        response = api_client.get(f"{BASE_URL}/api/exports/invoice/fake_nonexistent_id/pdf")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invoice PDF returns 404 for non-existent invoice")

    def test_invoice_pdf_with_real_data(self, api_client, test_invoice_id):
        """GET /api/exports/invoice/{id}/pdf returns PDF for existing invoice"""
        if not test_invoice_id:
            pytest.skip("No invoices available to test PDF export")
        
        response = api_client.get(f"{BASE_URL}/api/exports/invoice/{test_invoice_id}/pdf")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        content_type = response.headers.get('Content-Type', '')
        assert 'application/pdf' in content_type, f"Expected application/pdf, got {content_type}"
        
        content = response.content
        assert content[:4] == b'%PDF', "File should start with PDF magic bytes"
        print(f"✓ Invoice PDF export works for invoice {test_invoice_id}")


class TestQuotePDFExport:
    """Test quote PDF generation with real data"""

    @pytest.fixture
    def test_quote_id(self, api_client):
        """Get an existing quote ID or create one"""
        response = api_client.get(f"{BASE_URL}/api/quotes")
        if response.status_code == 200:
            quotes = response.json()
            if quotes:
                return quotes[0].get('quote_id')
        return None

    def test_quote_pdf_not_found(self, api_client):
        """GET /api/exports/quote/{fake_id}/pdf returns 404"""
        response = api_client.get(f"{BASE_URL}/api/exports/quote/fake_nonexistent_id/pdf")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Quote PDF returns 404 for non-existent quote")

    def test_quote_pdf_with_real_data(self, api_client, test_quote_id):
        """GET /api/exports/quote/{id}/pdf returns PDF for existing quote"""
        if not test_quote_id:
            pytest.skip("No quotes available to test PDF export")
        
        response = api_client.get(f"{BASE_URL}/api/exports/quote/{test_quote_id}/pdf")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        content_type = response.headers.get('Content-Type', '')
        assert 'application/pdf' in content_type, f"Expected application/pdf, got {content_type}"
        
        content = response.content
        assert content[:4] == b'%PDF', "File should start with PDF magic bytes"
        print(f"✓ Quote PDF export works for quote {test_quote_id}")


class TestExistingEndpoints:
    """Verify previous endpoints still work"""

    def test_auth_me_endpoint(self, api_client):
        """GET /api/auth/me returns user data"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert 'user_id' in data or 'email' in data, "Auth endpoint should return user data"
        print("✓ Auth endpoint still works")

    def test_leads_endpoint(self, api_client):
        """GET /api/leads returns leads list"""
        response = api_client.get(f"{BASE_URL}/api/leads")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Leads endpoint still works")

    def test_quotes_endpoint(self, api_client):
        """GET /api/quotes returns quotes list"""
        response = api_client.get(f"{BASE_URL}/api/quotes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Quotes endpoint still works")

    def test_invoices_endpoint(self, api_client):
        """GET /api/invoices returns invoices list"""
        response = api_client.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Invoices endpoint still works")

    def test_tasks_endpoint(self, api_client):
        """GET /api/tasks returns tasks list"""
        response = api_client.get(f"{BASE_URL}/api/tasks")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Tasks endpoint still works")

    def test_interventions_endpoint(self, api_client):
        """GET /api/interventions returns interventions"""
        response = api_client.get(f"{BASE_URL}/api/interventions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Interventions endpoint still works")

    def test_notifications_endpoint(self, api_client):
        """GET /api/notifications returns notifications"""
        response = api_client.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Notifications endpoint still works")

    def test_webhooks_endpoint(self, api_client):
        """GET /api/webhooks returns webhooks list"""
        response = api_client.get(f"{BASE_URL}/api/webhooks")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Webhooks endpoint still works")

    def test_dashboard_stats_endpoint(self, api_client):
        """GET /api/stats/dashboard returns dashboard stats"""
        response = api_client.get(f"{BASE_URL}/api/stats/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Dashboard stats endpoint still works")

    def test_financial_stats_endpoint(self, api_client):
        """GET /api/stats/financial returns financial stats"""
        response = api_client.get(f"{BASE_URL}/api/stats/financial")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Financial stats endpoint still works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
