"""
Gmail Integration Tests - CRM Global Clean Home
Tests for Gmail OAuth flow, email endpoints, and settings integrations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test session token created during testing
TEST_SESSION_TOKEN = "test_gmail_1773410254644"


class TestGmailIntegration:
    """Gmail integration endpoint tests"""
    
    def test_settings_integrations_has_gmail_key(self):
        """Test that /api/settings/integrations returns gmail key (not sendgrid)"""
        response = requests.get(
            f"{BASE_URL}/api/settings/integrations",
            headers={"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify gmail key exists
        assert "gmail" in data, "Missing 'gmail' key in integrations response"
        assert "connected" in data["gmail"], "Missing 'connected' field in gmail"
        assert "configured" in data["gmail"], "Missing 'configured' field in gmail"
        
        # Verify no sendgrid key
        assert "sendgrid" not in data, "Unexpected 'sendgrid' key in response - should be gmail"
        
        print(f"Gmail integration status: {data['gmail']}")
    
    def test_gmail_status_endpoint(self):
        """/api/gmail/status returns connection status"""
        response = requests.get(
            f"{BASE_URL}/api/gmail/status",
            headers={"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "connected" in data, "Missing 'connected' field in gmail status"
        # Not connected since this is a test environment
        assert data["connected"] == False, "Expected Gmail not connected in test"
        print(f"Gmail status: {data}")
    
    def test_gmail_disconnect_endpoint(self):
        """/api/gmail/disconnect works even when not connected"""
        response = requests.post(
            f"{BASE_URL}/api/gmail/disconnect",
            headers={"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        print(f"Gmail disconnect response: {data}")
    
    def test_emails_stats_endpoint(self):
        """/api/emails/stats returns email statistics"""
        response = requests.get(
            f"{BASE_URL}/api/emails/stats",
            headers={"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_sent" in data
        assert "total_received" in data
        assert "total_followups" in data
        print(f"Email stats: {data}")
    
    def test_auth_google_returns_authorization_url(self):
        """/api/auth/google returns Google OAuth authorization URL"""
        response = requests.get(
            f"{BASE_URL}/api/auth/google",
            headers={"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "authorization_url" in data, "Missing authorization_url in response"
        assert "accounts.google.com" in data["authorization_url"], "Invalid Google OAuth URL"
        assert "client_id=" in data["authorization_url"], "Missing client_id in OAuth URL"
        print(f"Gmail OAuth URL generated successfully")


class TestLeadEmails:
    """Tests for lead email history endpoint"""
    
    @pytest.fixture
    def test_lead(self):
        """Create a test lead for email tests"""
        response = requests.post(
            f"{BASE_URL}/api/leads",
            headers={
                "Authorization": f"Bearer {TEST_SESSION_TOKEN}",
                "Content-Type": "application/json"
            },
            json={
                "name": "Email Test Lead",
                "email": "emailtest@example.com",
                "phone": "0698765432",
                "service_type": "Tapis",
                "source": "Google Ads"
            }
        )
        assert response.status_code == 200
        return response.json()
    
    def test_get_lead_emails_empty(self, test_lead):
        """/api/emails/lead/{lead_id} returns empty list when no emails"""
        lead_id = test_lead["lead_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/emails/lead/{lead_id}",
            headers={"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "emails" in data
        assert "count" in data
        assert isinstance(data["emails"], list)
        print(f"Lead emails response: {data}")


class TestQuoteSend:
    """Tests for quote send endpoint with Gmail integration"""
    
    @pytest.fixture
    def test_quote(self):
        """Create a test lead and quote"""
        # Create lead
        lead_response = requests.post(
            f"{BASE_URL}/api/leads",
            headers={
                "Authorization": f"Bearer {TEST_SESSION_TOKEN}",
                "Content-Type": "application/json"
            },
            json={
                "name": "Quote Send Test",
                "email": "quotesend@example.com",
                "phone": "0611223344",
                "service_type": "Bureaux",
                "source": "SEO"
            }
        )
        lead = lead_response.json()
        
        # Create quote
        quote_response = requests.post(
            f"{BASE_URL}/api/quotes",
            headers={
                "Authorization": f"Bearer {TEST_SESSION_TOKEN}",
                "Content-Type": "application/json"
            },
            json={
                "lead_id": lead["lead_id"],
                "service_type": "Bureaux",
                "amount": 350,
                "details": "Test quote for send test"
            }
        )
        return quote_response.json()
    
    def test_send_quote_marks_as_sent(self, test_quote):
        """/api/quotes/{quote_id}/send marks quote as sent"""
        quote_id = test_quote["quote_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/quotes/{quote_id}/send",
            headers={"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "email_sent" in data
        # Gmail not connected, so email_sent should be False
        assert data["email_sent"] == False, "Expected email_sent=False when Gmail not connected"
        print(f"Quote send response: {data}")
        
        # Verify quote status changed to "envoyé"
        verify_response = requests.get(
            f"{BASE_URL}/api/quotes?lead_id={test_quote['lead_id']}",
            headers={"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        )
        quotes = verify_response.json()
        sent_quote = next((q for q in quotes if q["quote_id"] == quote_id), None)
        assert sent_quote is not None
        assert sent_quote["status"] == "envoyé", f"Expected status 'envoyé', got '{sent_quote['status']}'"


class TestUnauthorizedAccess:
    """Tests for endpoints without authentication"""
    
    def test_gmail_status_requires_auth(self):
        """Gmail status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/gmail/status")
        assert response.status_code == 401
    
    def test_settings_integrations_requires_auth(self):
        """Settings integrations requires authentication"""
        response = requests.get(f"{BASE_URL}/api/settings/integrations")
        assert response.status_code == 401
    
    def test_emails_stats_requires_auth(self):
        """Email stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/emails/stats")
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
