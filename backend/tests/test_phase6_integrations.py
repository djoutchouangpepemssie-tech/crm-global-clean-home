"""
Phase 6: External Integrations Tests
Tests for:
- Webhooks CRUD (Zapier/Make)
- Google Calendar iCal export
- WhatsApp messaging
- Tracking Widget generator
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
SESSION_TOKEN = os.environ.get('TEST_SESSION_TOKEN', '')
LEAD_ID = os.environ.get('TEST_LEAD_ID', '')

@pytest.fixture(scope='module')
def auth_headers():
    if not SESSION_TOKEN:
        pytest.skip("TEST_SESSION_TOKEN not set")
    return {"Authorization": f"Bearer {SESSION_TOKEN}"}

@pytest.fixture(scope='module')
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

# ============== WEBHOOKS TESTS ==============

class TestWebhooks:
    """Webhook CRUD and event listing tests"""
    
    webhook_id = None
    
    def test_get_webhook_events(self, api_client, auth_headers):
        """GET /api/webhooks/events - list valid event types (auth required)"""
        response = api_client.get(f"{BASE_URL}/api/webhooks/events", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "events" in data
        assert isinstance(data["events"], list)
        assert len(data["events"]) > 0
        # Check some expected events
        assert "new_lead" in data["events"]
        assert "quote_created" in data["events"]
        print(f"✓ Found {len(data['events'])} valid webhook events")
    
    def test_create_webhook(self, api_client, auth_headers):
        """POST /api/webhooks - creates a webhook (auth required)"""
        payload = {
            "name": "Test Zapier Webhook",
            "url": "https://hooks.zapier.com/test/12345",
            "events": ["new_lead", "quote_sent"],
            "active": True
        }
        response = api_client.post(f"{BASE_URL}/api/webhooks", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "webhook_id" in data
        assert data["name"] == "Test Zapier Webhook"
        assert data["url"] == "https://hooks.zapier.com/test/12345"
        assert set(data["events"]) == {"new_lead", "quote_sent"}
        assert data["active"] == True
        assert "secret" in data
        
        TestWebhooks.webhook_id = data["webhook_id"]
        print(f"✓ Created webhook: {data['webhook_id']}")
    
    def test_create_webhook_invalid_event(self, api_client, auth_headers):
        """POST /api/webhooks with invalid event returns 400"""
        payload = {
            "name": "Invalid Webhook",
            "url": "https://hooks.zapier.com/test/invalid",
            "events": ["new_lead", "invalid_event_type"],
            "active": True
        }
        response = api_client.post(f"{BASE_URL}/api/webhooks", json=payload, headers=auth_headers)
        assert response.status_code == 400, f"Expected 400 for invalid event, got {response.status_code}"
        print("✓ Invalid event type correctly rejected with 400")
    
    def test_list_webhooks(self, api_client, auth_headers):
        """GET /api/webhooks - lists all webhooks (auth required)"""
        response = api_client.get(f"{BASE_URL}/api/webhooks", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        # Should find the webhook we created
        webhook_ids = [wh["webhook_id"] for wh in data]
        assert TestWebhooks.webhook_id in webhook_ids, "Created webhook not found in list"
        print(f"✓ Listed {len(data)} webhooks")
    
    def test_update_webhook(self, api_client, auth_headers):
        """PATCH /api/webhooks/{id} - updates webhook (auth required)"""
        if not TestWebhooks.webhook_id:
            pytest.skip("No webhook created to update")
        
        payload = {"active": False, "name": "Updated Webhook Name"}
        response = api_client.patch(
            f"{BASE_URL}/api/webhooks/{TestWebhooks.webhook_id}",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("message") == "Webhook mis à jour"
        print("✓ Webhook updated successfully")
    
    def test_get_webhook_logs(self, api_client, auth_headers):
        """GET /api/webhooks/{id}/logs - returns delivery logs (auth required)"""
        if not TestWebhooks.webhook_id:
            pytest.skip("No webhook created")
        
        response = api_client.get(
            f"{BASE_URL}/api/webhooks/{TestWebhooks.webhook_id}/logs",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Logs should be a list"
        # May be empty if webhook hasn't been triggered
        print(f"✓ Webhook logs endpoint works, returned {len(data)} logs")
    
    def test_delete_webhook(self, api_client, auth_headers):
        """DELETE /api/webhooks/{id} - deletes webhook (auth required)"""
        if not TestWebhooks.webhook_id:
            pytest.skip("No webhook created to delete")
        
        response = api_client.delete(
            f"{BASE_URL}/api/webhooks/{TestWebhooks.webhook_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("message") == "Webhook supprimé"
        print("✓ Webhook deleted successfully")


# ============== iCAL CALENDAR TESTS ==============

class TestCalendarIcal:
    """Google Calendar iCal export tests"""
    
    def test_export_ical(self, api_client, auth_headers):
        """GET /api/calendar/ical - returns iCal format (auth required)"""
        response = api_client.get(f"{BASE_URL}/api/calendar/ical", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "text/calendar" in content_type, f"Expected text/calendar, got {content_type}"
        
        # Check iCal content
        content = response.text
        assert content.startswith("BEGIN:VCALENDAR"), "iCal should start with BEGIN:VCALENDAR"
        assert "VERSION:2.0" in content
        assert "PRODID:-//Global Clean Home CRM//FR" in content
        assert content.strip().endswith("END:VCALENDAR"), "iCal should end with END:VCALENDAR"
        
        print("✓ iCal export returns valid calendar format")
    
    def test_export_ical_unauthorized(self, api_client):
        """GET /api/calendar/ical without auth returns 401"""
        response = api_client.get(f"{BASE_URL}/api/calendar/ical")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ iCal endpoint correctly requires auth")


# ============== WHATSAPP TESTS ==============

class TestWhatsApp:
    """WhatsApp messaging tests"""
    
    def test_get_whatsapp_templates(self, api_client, auth_headers):
        """GET /api/whatsapp/templates - returns templates (auth required)"""
        response = api_client.get(f"{BASE_URL}/api/whatsapp/templates", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "templates" in data
        assert isinstance(data["templates"], dict)
        
        # Check expected templates exist
        expected_templates = ["welcome", "quote_ready", "reminder", "invoice", "followup"]
        for template in expected_templates:
            assert template in data["templates"], f"Missing template: {template}"
        
        print(f"✓ Found {len(data['templates'])} WhatsApp templates")
    
    def test_send_whatsapp_message(self, api_client, auth_headers):
        """POST /api/whatsapp/send - sends WhatsApp to lead (returns wa_link)"""
        if not LEAD_ID:
            pytest.skip("TEST_LEAD_ID not set")
        
        payload = {
            "lead_id": LEAD_ID,
            "message": "Bonjour, ceci est un test de message WhatsApp."
        }
        response = api_client.post(f"{BASE_URL}/api/whatsapp/send", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "whatsapp_link" in data or "wa_link" in data, "Response should include whatsapp_link"
        wa_link = data.get("whatsapp_link") or data.get("wa_link")
        assert wa_link.startswith("https://wa.me/"), f"Invalid WhatsApp link format: {wa_link}"
        assert "phone" in data
        
        print(f"✓ WhatsApp send works, link generated: {wa_link[:50]}...")
    
    def test_send_whatsapp_with_template(self, api_client, auth_headers):
        """POST /api/whatsapp/send with template"""
        if not LEAD_ID:
            pytest.skip("TEST_LEAD_ID not set")
        
        payload = {
            "lead_id": LEAD_ID,
            "message": "",
            "template": "welcome"
        }
        response = api_client.post(f"{BASE_URL}/api/whatsapp/send", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "whatsapp_link" in data
        print("✓ WhatsApp template message works")
    
    def test_send_whatsapp_invalid_lead(self, api_client, auth_headers):
        """POST /api/whatsapp/send with invalid lead returns 404"""
        payload = {
            "lead_id": "nonexistent_lead_12345",
            "message": "Test message"
        }
        response = api_client.post(f"{BASE_URL}/api/whatsapp/send", json=payload, headers=auth_headers)
        assert response.status_code == 404, f"Expected 404 for invalid lead, got {response.status_code}"
        print("✓ Invalid lead correctly returns 404")


# ============== TRACKING WIDGET TESTS ==============

class TestTrackingWidget:
    """Tracking widget script and snippet tests"""
    
    def test_get_widget_script_public(self, api_client):
        """GET /api/widget/script - returns JS tracking code (PUBLIC, no auth)"""
        response = api_client.get(f"{BASE_URL}/api/widget/script")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "javascript" in content_type, f"Expected application/javascript, got {content_type}"
        
        # Check JS content
        content = response.text
        assert "GCH_TRACKING" in content, "Script should contain GCH_TRACKING object"
        assert "init" in content, "Script should have init function"
        assert "trackPageView" in content
        assert "trackClicks" in content
        assert "trackFormSubmissions" in content
        
        print("✓ Widget script returns valid JavaScript (no auth required)")
    
    def test_get_widget_snippet(self, api_client, auth_headers):
        """GET /api/widget/snippet - returns HTML installation snippet (auth required)"""
        response = api_client.get(f"{BASE_URL}/api/widget/snippet", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "snippet" in data
        assert "description" in data
        assert "<script" in data["snippet"]
        assert "/api/widget/script" in data["snippet"]
        
        print(f"✓ Widget snippet: {data['snippet']}")
    
    def test_get_widget_snippet_unauthorized(self, api_client):
        """GET /api/widget/snippet without auth returns 401"""
        response = api_client.get(f"{BASE_URL}/api/widget/snippet")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Widget snippet endpoint correctly requires auth")


# ============== LEAD CREATION WITH WEBHOOK FIRE ==============

class TestLeadWebhookFire:
    """Test that creating a lead fires webhooks"""
    
    def test_create_lead_public(self, api_client):
        """POST /api/leads - creates lead (public endpoint, fires webhooks)"""
        import time
        ts = int(time.time())
        
        payload = {
            "name": f"Test Lead Webhook Fire {ts}",
            "email": f"webhook.fire.test.{ts}@example.com",
            "phone": "+33698765432",
            "service_type": "Canapé",
            "source": "Google Ads"
        }
        response = api_client.post(f"{BASE_URL}/api/leads", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "lead_id" in data
        assert data["name"] == payload["name"]
        assert data["email"] == payload["email"]
        assert "score" in data, "Lead should have calculated score"
        
        print(f"✓ Lead created (id={data['lead_id']}), webhooks would fire if registered")


# ============== AUTH REQUIREMENT CHECKS ==============

class TestAuthRequirements:
    """Verify auth is required on protected endpoints"""
    
    def test_webhooks_requires_auth(self, api_client):
        """GET /api/webhooks without auth returns 401"""
        response = api_client.get(f"{BASE_URL}/api/webhooks")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/webhooks requires auth")
    
    def test_webhook_events_requires_auth(self, api_client):
        """GET /api/webhooks/events without auth returns 401"""
        response = api_client.get(f"{BASE_URL}/api/webhooks/events")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/webhooks/events requires auth")
    
    def test_whatsapp_templates_requires_auth(self, api_client):
        """GET /api/whatsapp/templates without auth returns 401"""
        response = api_client.get(f"{BASE_URL}/api/whatsapp/templates")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/whatsapp/templates requires auth")
    
    def test_whatsapp_send_requires_auth(self, api_client):
        """POST /api/whatsapp/send without auth returns 401"""
        response = api_client.post(f"{BASE_URL}/api/whatsapp/send", json={"lead_id": "test", "message": "test"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/whatsapp/send requires auth")
