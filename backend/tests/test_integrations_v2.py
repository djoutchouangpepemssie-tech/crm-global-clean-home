"""
Test file for Integration Status Overview, Google Calendar, SendGrid Email, WhatsApp, and Widget Tracking
Tests the new integration infrastructure for Global Clean Home CRM
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# Test data prefix for cleanup
TEST_PREFIX = "TEST_intv2_"


@pytest.fixture(scope="module")
def db():
    """MongoDB client fixture"""
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="module")
def test_session(db):
    """Create test user and session for authentication"""
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    user_id = f"{TEST_PREFIX}user_{ts}"
    session_token = f"{TEST_PREFIX}session_{ts}"
    
    # Create test user
    db.users.insert_one({
        "user_id": user_id,
        "email": f"{TEST_PREFIX}test@example.com",
        "name": "Test Integration User",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create session
    db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    yield {"session_token": session_token, "user_id": user_id}
    
    # Cleanup
    db.users.delete_many({"user_id": {"$regex": f"^{TEST_PREFIX}"}})
    db.user_sessions.delete_many({"session_token": {"$regex": f"^{TEST_PREFIX}"}})
    db.leads.delete_many({"name": {"$regex": f"^{TEST_PREFIX}"}})
    db.magic_links.delete_many({"email": {"$regex": f"^{TEST_PREFIX}"}})


@pytest.fixture
def auth_cookies(test_session):
    """Get auth cookies for requests"""
    return {"session_token": test_session["session_token"]}


# ============= INTEGRATION STATUS OVERVIEW TESTS =============

class TestIntegrationStatusOverview:
    """Tests for GET /api/settings/integrations endpoint"""
    
    def test_get_integration_status_requires_auth(self):
        """GET /api/settings/integrations without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/settings/integrations")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Integration status requires authentication")
    
    def test_get_integration_status_success(self, auth_cookies):
        """GET /api/settings/integrations returns status for all integrations"""
        response = requests.get(
            f"{BASE_URL}/api/settings/integrations",
            cookies=auth_cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Check all required integrations are present
        assert "sendgrid" in data, "Missing sendgrid status"
        assert "google_calendar" in data, "Missing google_calendar status"
        assert "stripe" in data, "Missing stripe status"
        assert "whatsapp" in data, "Missing whatsapp status"
        assert "tracking_widget" in data, "Missing tracking_widget status"
        assert "zapier_webhooks" in data, "Missing zapier_webhooks status"
        
        # Check sendgrid structure
        assert "configured" in data["sendgrid"], "Missing sendgrid.configured"
        assert isinstance(data["sendgrid"]["configured"], bool)
        
        # Check google_calendar structure
        assert "configured" in data["google_calendar"], "Missing google_calendar.configured"
        
        # Check stripe structure
        assert "configured" in data["stripe"], "Missing stripe.configured"
        assert "mode" in data["stripe"], "Missing stripe.mode"
        
        # Check whatsapp structure
        assert "number" in data["whatsapp"], "Missing whatsapp.number"
        assert "configured" in data["whatsapp"], "Missing whatsapp.configured"
        
        print(f"PASS: Integration status returned: {list(data.keys())}")
        print(f"  - SendGrid configured: {data['sendgrid']['configured']}")
        print(f"  - Google Calendar configured: {data['google_calendar']['configured']}")
        print(f"  - Stripe mode: {data['stripe']['mode']}")
        print(f"  - WhatsApp number: {data['whatsapp']['number']}")


# ============= GOOGLE CALENDAR TESTS =============

class TestGoogleCalendar:
    """Tests for Google Calendar OAuth integration"""
    
    def test_gcal_status_requires_auth(self):
        """GET /api/gcal/status without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/gcal/status")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Google Calendar status requires authentication")
    
    def test_gcal_status_success(self, auth_cookies):
        """GET /api/gcal/status returns configuration and connection status"""
        response = requests.get(
            f"{BASE_URL}/api/gcal/status",
            cookies=auth_cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "connected" in data, "Missing connected field"
        assert "configured" in data, "Missing configured field"
        assert "message" in data, "Missing message field"
        
        # Since GOOGLE_CLIENT_ID is empty, configured should be False
        assert data["configured"] == False, f"Expected configured=False since GOOGLE_CLIENT_ID is empty, got {data['configured']}"
        assert data["connected"] == False, f"Expected connected=False, got {data['connected']}"
        
        print(f"PASS: Google Calendar status: connected={data['connected']}, configured={data['configured']}")
        print(f"  Message: {data['message']}")
    
    def test_gcal_auth_login_not_configured(self, auth_cookies):
        """GET /api/gcal/auth/login returns 500 when not configured"""
        response = requests.get(
            f"{BASE_URL}/api/gcal/auth/login",
            cookies=auth_cookies
        )
        # Should return 500 since GOOGLE_CLIENT_ID is not configured
        assert response.status_code == 500, f"Expected 500 (not configured), got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Missing error detail"
        assert "non configure" in data["detail"].lower() or "google" in data["detail"].lower(), \
            f"Error should mention Google Calendar not configured: {data['detail']}"
        
        print(f"PASS: Google Calendar auth login correctly returns error when not configured")
        print(f"  Error: {data['detail']}")
    
    def test_gcal_disconnect_requires_auth(self):
        """POST /api/gcal/disconnect without auth returns 401"""
        response = requests.post(f"{BASE_URL}/api/gcal/disconnect")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Google Calendar disconnect requires authentication")
    
    def test_gcal_disconnect_success(self, auth_cookies):
        """POST /api/gcal/disconnect works even if not connected"""
        response = requests.post(
            f"{BASE_URL}/api/gcal/disconnect",
            cookies=auth_cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data, "Missing message in response"
        
        print(f"PASS: Google Calendar disconnect: {data['message']}")


# ============= SENDGRID EMAIL SERVICE TESTS =============

class TestSendGridStatus:
    """Tests for SendGrid email service status"""
    
    def test_sendgrid_status_in_integrations(self, auth_cookies):
        """SendGrid status is included in integration overview"""
        response = requests.get(
            f"{BASE_URL}/api/settings/integrations",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        sendgrid = data.get("sendgrid", {})
        
        assert "configured" in sendgrid
        assert "sender_email" in sendgrid
        assert "sender_name" in sendgrid
        
        # Since SENDGRID_API_KEY is empty, configured should be False
        assert sendgrid["configured"] == False, f"Expected configured=False (empty API key), got {sendgrid['configured']}"
        assert sendgrid["sender_email"] == "noreply@globalcleanhome.com", f"Unexpected sender_email: {sendgrid['sender_email']}"
        
        print(f"PASS: SendGrid status: configured={sendgrid['configured']}")
        print(f"  Sender: {sendgrid['sender_name']} <{sendgrid['sender_email']}>")


# ============= MAGIC LINK WITH EMAIL TESTS =============

class TestMagicLinkEmail:
    """Tests for portal magic link that now sends email via SendGrid"""
    
    def test_magic_link_creation(self, db, auth_cookies):
        """POST /api/portal/magic-link creates magic link and attempts email send"""
        # First create a test lead
        ts = datetime.now().strftime("%Y%m%d%H%M%S")
        # Note: Portal lowercases email, so store lowercase to match
        test_email = f"{TEST_PREFIX}lead_{ts}@test.com".lower()
        
        lead = {
            "lead_id": f"{TEST_PREFIX}lead_{ts}",
            "name": f"{TEST_PREFIX}Test Lead",
            "email": test_email,
            "phone": "0612345678",
            "service_type": "Ménage",
            "status": "nouveau",
            "score": 50,
            "tags": [],
            "probability": 50,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        db.leads.insert_one(lead)
        
        # Request magic link
        response = requests.post(
            f"{BASE_URL}/api/portal/magic-link",
            json={"email": test_email}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Missing message in response"
        assert "magic_token" in data, "Missing magic_token in response"
        
        # Verify magic link was created in DB
        magic_link = db.magic_links.find_one({"token": data["magic_token"]})
        assert magic_link is not None, "Magic link not found in database"
        assert magic_link["email"] == test_email.lower()
        
        print(f"PASS: Magic link created for {test_email}")
        print(f"  Token: {data['magic_token'][:20]}...")
        print(f"  Note: Email not sent (SendGrid not configured) - graceful degradation working")


# ============= WHATSAPP FRENCH PHONE NORMALIZATION TESTS =============

class TestWhatsAppPhoneNormalization:
    """Tests for WhatsApp French phone number normalization"""
    
    def test_whatsapp_number_in_integrations(self, auth_cookies):
        """WhatsApp number (0622665308) is returned in integrations"""
        response = requests.get(
            f"{BASE_URL}/api/settings/integrations",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        whatsapp = data.get("whatsapp", {})
        
        assert whatsapp["number"] == "0622665308", f"Expected 0622665308, got {whatsapp['number']}"
        assert whatsapp["configured"] == True
        
        print(f"PASS: WhatsApp number configured: {whatsapp['number']}")
    
    def test_whatsapp_send_normalizes_french_number(self, db, auth_cookies):
        """POST /api/whatsapp/send normalizes 0-prefix phone to +33 format"""
        # Create test lead with French phone number
        ts = datetime.now().strftime("%Y%m%d%H%M%S")
        lead = {
            "lead_id": f"{TEST_PREFIX}wa_lead_{ts}",
            "name": f"{TEST_PREFIX}WhatsApp Test",
            "email": f"{TEST_PREFIX}wa_{ts}@test.com",
            "phone": "0622665308",  # French format with 0 prefix
            "service_type": "Ménage",
            "status": "nouveau",
            "score": 50,
            "tags": [],
            "probability": 50,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        db.leads.insert_one(lead)
        
        # Send WhatsApp message
        response = requests.post(
            f"{BASE_URL}/api/whatsapp/send",
            cookies=auth_cookies,
            json={
                "lead_id": lead["lead_id"],
                "message": "Test message"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "whatsapp_link" in data, "Missing whatsapp_link"
        assert "phone" in data, "Missing phone in response"
        
        # Phone should be normalized: 0622665308 -> 33622665308
        assert data["phone"] == "33622665308", f"Phone not normalized correctly: {data['phone']}"
        assert "wa.me/33622665308" in data["whatsapp_link"], f"WhatsApp link incorrect: {data['whatsapp_link']}"
        
        print(f"PASS: French phone normalized: 0622665308 -> {data['phone']}")
        print(f"  WhatsApp link: {data['whatsapp_link'][:50]}...")


# ============= TRACKING WIDGET TESTS =============

class TestTrackingWidget:
    """Tests for tracking widget endpoints"""
    
    def test_widget_snippet_requires_auth(self):
        """GET /api/widget/snippet without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/widget/snippet")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Widget snippet requires authentication")
    
    def test_widget_snippet_success(self, auth_cookies):
        """GET /api/widget/snippet returns correct script snippet"""
        response = requests.get(
            f"{BASE_URL}/api/widget/snippet",
            cookies=auth_cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "snippet" in data, "Missing snippet in response"
        assert "description" in data, "Missing description in response"
        
        # Snippet should be a script tag
        assert "<script" in data["snippet"], f"Snippet should contain script tag: {data['snippet']}"
        assert "/api/widget/script" in data["snippet"], f"Snippet should reference widget script URL"
        
        print(f"PASS: Widget snippet returned")
        print(f"  Snippet: {data['snippet']}")
        print(f"  Description: {data['description']}")
    
    def test_widget_script_is_public(self):
        """GET /api/widget/script is PUBLIC (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/widget/script")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Should return JavaScript content
        content_type = response.headers.get("content-type", "")
        assert "javascript" in content_type or "text/plain" in content_type, \
            f"Expected JavaScript content type, got {content_type}"
        
        # Should contain tracking code
        script = response.text
        assert "GCH_TRACKING" in script, "Script should define GCH_TRACKING object"
        assert "page_view" in script, "Script should track page_view events"
        
        print(f"PASS: Widget script is public and returns JavaScript ({len(script)} chars)")


# ============= STRIPE STATUS TESTS =============

class TestStripeStatus:
    """Tests for Stripe status in integrations"""
    
    def test_stripe_test_mode(self, auth_cookies):
        """Stripe is in test mode (sk_test_ prefix)"""
        response = requests.get(
            f"{BASE_URL}/api/settings/integrations",
            cookies=auth_cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        stripe = data.get("stripe", {})
        
        assert stripe["configured"] == True, f"Stripe should be configured, got {stripe['configured']}"
        assert stripe["mode"] == "test", f"Expected test mode, got {stripe['mode']}"
        
        print(f"PASS: Stripe status: mode={stripe['mode']}, configured={stripe['configured']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
