"""
CRM Global Clean Home - Comprehensive Backend API Tests
Tests all endpoints: leads, quotes, tasks, interactions, events, tracking, stats
CRITICAL: Tests route ordering fix for /leads/recent, /leads/export, /leads/bulk
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
SESSION_TOKEN = os.environ.get('TEST_SESSION_TOKEN', '')

class TestPublicEndpoints:
    """Test public endpoints that don't require authentication"""
    
    def test_create_lead_public(self):
        """POST /api/leads - Create lead (public endpoint)"""
        payload = {
            "name": "TEST_Jean Dupont",
            "email": f"test_{datetime.now().timestamp()}@example.com",
            "phone": "+33612345678",
            "service_type": "Ménage",
            "surface": 80.5,
            "address": "123 Rue de Test, Paris",
            "message": "Test lead from automated testing",
            "source": "Google Ads",
            "utm_source": "google",
            "utm_medium": "cpc",
            "utm_campaign": "test_campaign"
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "lead_id" in data, "Response should contain lead_id"
        assert data["name"] == payload["name"]
        assert data["email"] == payload["email"]
        assert data["service_type"] == payload["service_type"]
        assert data["status"] == "nouveau"
        assert "score" in data, "Lead should have auto-calculated score"
        assert data["score"] > 0, "Score should be greater than 0"
        
        # Store lead_id for later tests
        TestPublicEndpoints.created_lead_id = data["lead_id"]
        print(f"✓ Created lead: {data['lead_id']}")
    
    def test_create_event_public(self):
        """POST /api/events - Create tracking event (public endpoint)"""
        payload = {
            "event_type": "visite_page",
            "page_url": "/services/menage",
            "utm_source": "google",
            "utm_medium": "cpc"
        }
        response = requests.post(f"{BASE_URL}/api/events", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "event_id" in data
        print(f"✓ Created event: {data['event_id']}")
    
    def test_tracking_event_public(self):
        """POST /api/tracking/event - Public tracking endpoint"""
        payload = {
            "event_type": "page_view",
            "page_url": "/",
            "visitor_id": "test_visitor_123",
            "session_id": "test_session_123",
            "timestamp": datetime.now().isoformat()
        }
        response = requests.post(f"{BASE_URL}/api/tracking/event", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "tracked"
        print("✓ Tracking event recorded")


class TestAuthRequired:
    """Test that protected endpoints return 401 without auth"""
    
    def test_get_leads_requires_auth(self):
        """GET /api/leads should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/leads")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/leads correctly returns 401")
    
    def test_get_recent_leads_requires_auth(self):
        """GET /api/leads/recent should return 401 without auth (CRITICAL: tests route ordering)"""
        response = requests.get(f"{BASE_URL}/api/leads/recent")
        assert response.status_code == 401, f"Expected 401 for /leads/recent, got {response.status_code}: {response.text}"
        print("✓ GET /api/leads/recent correctly returns 401 (route ordering OK)")
    
    def test_get_export_leads_requires_auth(self):
        """GET /api/leads/export should return 401 without auth (CRITICAL: tests route ordering)"""
        response = requests.get(f"{BASE_URL}/api/leads/export")
        assert response.status_code == 401, f"Expected 401 for /leads/export, got {response.status_code}: {response.text}"
        print("✓ GET /api/leads/export correctly returns 401 (route ordering OK)")
    
    def test_dashboard_stats_requires_auth(self):
        """GET /api/stats/dashboard should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/stats/dashboard")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/stats/dashboard correctly returns 401")


class TestAuthenticatedEndpoints:
    """Test endpoints with valid authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth headers for all tests in this class"""
        self.headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        if not SESSION_TOKEN:
            pytest.skip("No session token available")
    
    # ============= AUTH ENDPOINTS =============
    
    def test_get_current_user(self):
        """GET /api/auth/me - Get current authenticated user"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "name" in data
        print(f"✓ Auth verified for user: {data['email']}")
    
    # ============= LEADS ENDPOINTS =============
    
    def test_get_leads_list(self):
        """GET /api/leads - Get leads list with filters"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Got {len(data)} leads")
    
    def test_get_leads_with_status_filter(self):
        """GET /api/leads?status=nouveau - Get leads filtered by status"""
        response = requests.get(f"{BASE_URL}/api/leads?status=nouveau", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned leads should have status nouveau
        for lead in data:
            assert lead["status"] == "nouveau", f"Expected status 'nouveau', got '{lead['status']}'"
        print(f"✓ Got {len(data)} leads with status 'nouveau'")
    
    def test_get_recent_leads_authenticated(self):
        """GET /api/leads/recent - CRITICAL: Tests route ordering fix"""
        response = requests.get(f"{BASE_URL}/api/leads/recent", headers=self.headers)
        
        # Should NOT return 404 or 422 (which would indicate route ordering bug)
        assert response.status_code != 404, "Route ordering bug: /leads/recent matched as /leads/{lead_id}"
        assert response.status_code != 422, "Route ordering bug: validation error because 'recent' is not valid lead_id"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "leads" in data, "Response should contain 'leads' key"
        assert "count" in data, "Response should contain 'count' key"
        print(f"✓ GET /api/leads/recent works! (route ordering fixed) - {data['count']} recent leads")
    
    def test_get_leads_export(self):
        """GET /api/leads/export - CRITICAL: Tests route ordering fix"""
        response = requests.get(f"{BASE_URL}/api/leads/export", headers=self.headers)
        
        # Should NOT return 404 or 422
        assert response.status_code != 404, "Route ordering bug: /leads/export matched as /leads/{lead_id}"
        assert response.status_code != 422, "Route ordering bug: validation error"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Response should be CSV
        assert "text/csv" in response.headers.get("content-type", ""), "Response should be CSV"
        print("✓ GET /api/leads/export works! (route ordering fixed)")
    
    def test_get_lead_by_id(self):
        """GET /api/leads/{lead_id} - Get specific lead"""
        # First get a lead ID
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        assert response.status_code == 200
        leads = response.json()
        
        if not leads:
            pytest.skip("No leads in database to test")
        
        lead_id = leads[0]["lead_id"]
        
        response = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["lead_id"] == lead_id
        print(f"✓ Got lead details for {lead_id}")
    
    def test_update_lead(self):
        """PATCH /api/leads/{lead_id} - Update a lead"""
        # Get a lead first
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        leads = response.json()
        
        if not leads:
            pytest.skip("No leads to update")
        
        lead_id = leads[0]["lead_id"]
        
        update_payload = {
            "status": "contacté",
            "notes": "Test note from automated testing"
        }
        response = requests.patch(f"{BASE_URL}/api/leads/{lead_id}", json=update_payload, headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Updated lead {lead_id}")
    
    def test_bulk_update_leads(self):
        """POST /api/leads/bulk - Bulk update leads"""
        # Get leads first
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        leads = response.json()
        
        if len(leads) < 1:
            pytest.skip("Not enough leads for bulk update")
        
        lead_ids = [leads[0]["lead_id"]]
        
        payload = {
            "lead_ids": lead_ids,
            "tags": ["test_tag", "automated_test"]
        }
        response = requests.post(f"{BASE_URL}/api/leads/bulk", json=payload, headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Bulk updated {len(lead_ids)} leads")
    
    # ============= QUOTES ENDPOINTS =============
    
    def test_create_and_get_quote(self):
        """POST /api/quotes and GET /api/quotes - Create and list quotes"""
        # Get a lead for the quote
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        leads = response.json()
        
        if not leads:
            pytest.skip("No leads to create quote for")
        
        lead_id = leads[0]["lead_id"]
        
        # Create quote
        quote_payload = {
            "lead_id": lead_id,
            "service_type": "Ménage",
            "surface": 80.0,
            "amount": 150.0,
            "details": "Nettoyage complet appartement - Test"
        }
        response = requests.post(f"{BASE_URL}/api/quotes", json=quote_payload, headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        quote = response.json()
        assert "quote_id" in quote
        assert quote["status"] == "brouillon"
        quote_id = quote["quote_id"]
        print(f"✓ Created quote: {quote_id}")
        
        # Get quotes list
        response = requests.get(f"{BASE_URL}/api/quotes", headers=self.headers)
        assert response.status_code == 200
        quotes = response.json()
        assert isinstance(quotes, list)
        print(f"✓ Got {len(quotes)} quotes")
        
        return quote_id
    
    def test_send_quote(self):
        """POST /api/quotes/{quote_id}/send - Mark quote as sent"""
        # First create a quote
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        leads = response.json()
        
        if not leads:
            pytest.skip("No leads for quote test")
        
        lead_id = leads[0]["lead_id"]
        
        quote_payload = {
            "lead_id": lead_id,
            "service_type": "Canapé",
            "amount": 80.0,
            "details": "Nettoyage canapé - Test envoi"
        }
        response = requests.post(f"{BASE_URL}/api/quotes", json=quote_payload, headers=self.headers)
        quote = response.json()
        quote_id = quote["quote_id"]
        
        # Send the quote
        response = requests.post(f"{BASE_URL}/api/quotes/{quote_id}/send", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Sent quote: {quote_id}")
    
    # ============= TASKS ENDPOINTS =============
    
    def test_create_and_list_tasks(self):
        """POST /api/tasks and GET /api/tasks - Create and list tasks"""
        # Get a lead for the task
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        leads = response.json()
        
        if not leads:
            pytest.skip("No leads for task")
        
        lead_id = leads[0]["lead_id"]
        due_date = (datetime.now() + timedelta(days=1)).isoformat()
        
        task_payload = {
            "lead_id": lead_id,
            "type": "rappel",
            "title": "TEST_Rappeler client",
            "description": "Test task from automated testing",
            "due_date": due_date
        }
        response = requests.post(f"{BASE_URL}/api/tasks", json=task_payload, headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        task = response.json()
        assert "task_id" in task
        task_id = task["task_id"]
        print(f"✓ Created task: {task_id}")
        
        # List tasks
        response = requests.get(f"{BASE_URL}/api/tasks", headers=self.headers)
        assert response.status_code == 200
        tasks = response.json()
        assert isinstance(tasks, list)
        print(f"✓ Got {len(tasks)} tasks")
        
        return task_id
    
    def test_complete_task(self):
        """PATCH /api/tasks/{task_id}/complete - Complete a task"""
        # Get pending tasks
        response = requests.get(f"{BASE_URL}/api/tasks?status=pending", headers=self.headers)
        tasks = response.json()
        
        if not tasks:
            pytest.skip("No pending tasks to complete")
        
        task_id = tasks[0]["task_id"]
        
        response = requests.patch(f"{BASE_URL}/api/tasks/{task_id}/complete", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Completed task: {task_id}")
    
    # ============= INTERACTIONS ENDPOINTS =============
    
    def test_create_and_list_interactions(self):
        """POST /api/interactions and GET /api/interactions"""
        # Get a lead
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        leads = response.json()
        
        if not leads:
            pytest.skip("No leads for interaction")
        
        lead_id = leads[0]["lead_id"]
        
        interaction_payload = {
            "lead_id": lead_id,
            "type": "appel",
            "content": "TEST_Appel de suivi - client intéressé"
        }
        response = requests.post(f"{BASE_URL}/api/interactions", json=interaction_payload, headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        interaction = response.json()
        assert "interaction_id" in interaction
        print(f"✓ Created interaction: {interaction['interaction_id']}")
        
        # List interactions
        response = requests.get(f"{BASE_URL}/api/interactions", headers=self.headers)
        assert response.status_code == 200
        interactions = response.json()
        assert isinstance(interactions, list)
        print(f"✓ Got {len(interactions)} interactions")
    
    # ============= STATS/DASHBOARD ENDPOINTS =============
    
    def test_get_dashboard_stats(self):
        """GET /api/stats/dashboard - Get dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/stats/dashboard", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_leads" in data
        assert "leads_by_source" in data
        assert "leads_by_service" in data
        assert "pending_tasks" in data
        print(f"✓ Dashboard stats: {data['total_leads']} leads, {data['pending_tasks']} pending tasks")
    
    def test_get_tracking_stats(self):
        """GET /api/tracking/stats - Get tracking analytics"""
        response = requests.get(f"{BASE_URL}/api/tracking/stats", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_visitors" in data
        assert "conversion_rate" in data
        print(f"✓ Tracking stats: {data['total_visitors']} visitors, {data['conversion_rate']}% conversion")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
