"""
CRM Global Clean Home - Phases 3, 4, 5 API Tests
Phase 3: Client Portal with Magic Link Authentication
Phase 4: Planning/Interventions with Teams
Phase 5: Notifications, Lead Scoring, User Roles, Client Retention
"""

import pytest
import requests
import os
from datetime import datetime, timedelta
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============= Test Session Setup =============

def create_test_session():
    """Create a test session for authenticated endpoints"""
    timestamp = int(datetime.now().timestamp() * 1000)
    session_token = f"test_session_{timestamp}"
    user_id = f"test-user-{timestamp}"
    
    # Insert test user and session via the leads endpoint flow
    import pymongo
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    client = pymongo.MongoClient(mongo_url)
    db = client[db_name]
    
    # Create test user
    db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "email": f"test_{timestamp}@test.com",
            "name": "Test User Phase345",
            "picture": None,
            "created_at": datetime.utcnow().isoformat()
        }},
        upsert=True
    )
    
    # Create test session
    expires = datetime.utcnow() + timedelta(days=1)
    db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "session_token": session_token,
            "user_id": user_id,
            "expires_at": expires.isoformat(),
            "created_at": datetime.utcnow().isoformat()
        }},
        upsert=True
    )
    
    client.close()
    return session_token, user_id

SESSION_TOKEN = None
USER_ID = None

def get_auth_headers():
    global SESSION_TOKEN, USER_ID
    if not SESSION_TOKEN:
        SESSION_TOKEN, USER_ID = create_test_session()
    return {"Authorization": f"Bearer {SESSION_TOKEN}"}


# ============= PHASE 3: PORTAL TESTS =============

class TestPortalMagicLink:
    """Phase 3: Test magic link authentication for client portal"""
    
    def test_01_create_lead_for_portal(self):
        """Create a test lead for portal testing"""
        payload = {
            "name": "TEST_Portal_Client",
            "email": f"portal_test_{int(time.time())}@example.com",
            "phone": "+33612345678",
            "service_type": "Ménage",
            "surface": 100,
            "address": "123 Rue Portal, Paris"
        }
        response = requests.post(f"{BASE_URL}/api/leads", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "lead_id" in data
        assert "score" in data, "Lead should have auto-calculated score"
        assert data["score"] > 0
        
        TestPortalMagicLink.lead_id = data["lead_id"]
        TestPortalMagicLink.lead_email = data["email"]
        print(f"✓ Created lead for portal: {data['lead_id']}, email: {data['email']}")
    
    def test_02_request_magic_link(self):
        """POST /api/portal/magic-link - Request magic link for existing lead"""
        if not hasattr(TestPortalMagicLink, 'lead_email'):
            pytest.skip("No lead_email from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/portal/magic-link",
            json={"email": TestPortalMagicLink.lead_email}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "magic_token" in data, "Should return magic_token for testing mode"
        
        TestPortalMagicLink.magic_token = data["magic_token"]
        print(f"✓ Magic link requested, token: {data['magic_token'][:20]}...")
    
    def test_03_magic_link_nonexistent_email(self):
        """POST /api/portal/magic-link - Request for non-existent email (should succeed but not expose)"""
        response = requests.post(
            f"{BASE_URL}/api/portal/magic-link",
            json={"email": "nonexistent_12345@example.com"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data
        # Should NOT expose whether email exists
        assert "magic_token" not in data or data.get("magic_token") is None
        print("✓ Magic link for non-existent email doesn't expose info")
    
    def test_04_authenticate_with_magic_link(self):
        """POST /api/portal/auth/{token} - Authenticate with magic link"""
        if not hasattr(TestPortalMagicLink, 'magic_token'):
            pytest.skip("No magic_token from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/portal/auth/{TestPortalMagicLink.magic_token}"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "lead_id" in data
        assert "lead_name" in data
        assert "email" in data
        assert data["lead_id"] == TestPortalMagicLink.lead_id
        
        # Store portal cookie for subsequent tests
        TestPortalMagicLink.portal_cookies = response.cookies
        print(f"✓ Authenticated via magic link: {data['lead_name']}")
    
    def test_05_magic_link_cannot_be_reused(self):
        """POST /api/portal/auth/{token} - Token should be single-use"""
        if not hasattr(TestPortalMagicLink, 'magic_token'):
            pytest.skip("No magic_token from previous test")
        
        response = requests.post(
            f"{BASE_URL}/api/portal/auth/{TestPortalMagicLink.magic_token}"
        )
        
        assert response.status_code == 400, f"Expected 400 for reused token, got {response.status_code}"
        print("✓ Magic link cannot be reused")
    
    def test_06_portal_me_requires_auth(self):
        """GET /api/portal/me - Should require portal auth"""
        response = requests.get(f"{BASE_URL}/api/portal/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/portal/me requires auth")
    
    def test_07_portal_me_with_auth(self):
        """GET /api/portal/me - Get portal session info"""
        if not hasattr(TestPortalMagicLink, 'portal_cookies'):
            pytest.skip("No portal_cookies from previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/portal/me",
            cookies=TestPortalMagicLink.portal_cookies
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "email" in data
        assert "lead_id" in data
        assert "lead_name" in data
        print(f"✓ Portal me: {data['lead_name']} ({data['email']})")


class TestPortalClientData:
    """Phase 3: Test client portal data endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Ensure we have portal auth"""
        if not hasattr(TestPortalMagicLink, 'portal_cookies'):
            pytest.skip("No portal session")
        self.cookies = TestPortalMagicLink.portal_cookies
        self.lead_id = TestPortalMagicLink.lead_id
    
    def test_get_portal_quotes(self):
        """GET /api/portal/quotes - Get client quotes"""
        response = requests.get(
            f"{BASE_URL}/api/portal/quotes",
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} client quotes")
    
    def test_get_portal_invoices(self):
        """GET /api/portal/invoices - Get client invoices"""
        response = requests.get(
            f"{BASE_URL}/api/portal/invoices",
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} client invoices")
    
    def test_submit_review(self):
        """POST /api/portal/reviews - Submit a review"""
        response = requests.post(
            f"{BASE_URL}/api/portal/reviews",
            json={"rating": 5, "comment": "Excellent service! Test review."},
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "review_id" in data
        TestPortalClientData.review_id = data["review_id"]
        print(f"✓ Submitted review: {data['review_id']}")
    
    def test_submit_review_invalid_rating(self):
        """POST /api/portal/reviews - Invalid rating should fail"""
        response = requests.post(
            f"{BASE_URL}/api/portal/reviews",
            json={"rating": 10, "comment": "Invalid"},
            cookies=self.cookies
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid rating, got {response.status_code}"
        print("✓ Invalid rating rejected")
    
    def test_get_portal_reviews(self):
        """GET /api/portal/reviews - Get client reviews"""
        response = requests.get(
            f"{BASE_URL}/api/portal/reviews",
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the review we just submitted
        assert len(data) >= 1
        print(f"✓ Got {len(data)} client reviews")


# ============= PHASE 4: PLANNING TESTS =============

class TestTeamsEndpoints:
    """Phase 4: Test teams CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = get_auth_headers()
    
    def test_01_create_team(self):
        """POST /api/teams - Create a team"""
        payload = {
            "name": f"TEST_Équipe_Nettoyage_{int(time.time())}",
            "color": "#7C3AED"
        }
        response = requests.post(
            f"{BASE_URL}/api/teams",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "team_id" in data
        assert data["name"] == payload["name"]
        assert data["color"] == payload["color"]
        assert "members" in data
        
        TestTeamsEndpoints.team_id = data["team_id"]
        print(f"✓ Created team: {data['team_id']}")
    
    def test_02_list_teams(self):
        """GET /api/teams - List teams"""
        response = requests.get(
            f"{BASE_URL}/api/teams",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} teams")
    
    def test_03_list_teams_requires_auth(self):
        """GET /api/teams - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/teams")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/teams requires auth")
    
    def test_04_add_team_member(self):
        """POST /api/teams/{id}/members - Add team member"""
        if not hasattr(TestTeamsEndpoints, 'team_id'):
            pytest.skip("No team_id from previous test")
        
        payload = {
            "name": "TEST_Jean_Technicien",
            "email": "jean.tech@test.com",
            "phone": "+33612345678",
            "role": "technicien"
        }
        response = requests.post(
            f"{BASE_URL}/api/teams/{TestTeamsEndpoints.team_id}/members",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "member_id" in data
        assert data["name"] == payload["name"]
        
        TestTeamsEndpoints.member_id = data["member_id"]
        print(f"✓ Added team member: {data['member_id']}")
    
    def test_05_add_member_to_nonexistent_team(self):
        """POST /api/teams/{id}/members - 404 for non-existent team"""
        response = requests.post(
            f"{BASE_URL}/api/teams/team_nonexistent123/members",
            json={"name": "Test"},
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ 404 for non-existent team")


class TestInterventionsEndpoints:
    """Phase 4: Test interventions CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = get_auth_headers()
    
    def test_01_create_intervention(self):
        """POST /api/interventions - Create intervention"""
        # First get a lead
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        leads = response.json()
        
        if not leads:
            pytest.skip("No leads available")
        
        lead_id = leads[0]["lead_id"]
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        payload = {
            "lead_id": lead_id,
            "title": "TEST_Nettoyage_Intervention",
            "description": "Test intervention from automated tests",
            "scheduled_date": tomorrow,
            "scheduled_time": "10:00",
            "duration_hours": 3,
            "address": "100 Rue Test, Paris"
        }
        
        if hasattr(TestTeamsEndpoints, 'team_id'):
            payload["team_id"] = TestTeamsEndpoints.team_id
        
        response = requests.post(
            f"{BASE_URL}/api/interventions",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "intervention_id" in data
        assert data["status"] == "planifiée"
        assert data["scheduled_date"] == tomorrow
        
        TestInterventionsEndpoints.intervention_id = data["intervention_id"]
        print(f"✓ Created intervention: {data['intervention_id']}")
    
    def test_02_list_interventions(self):
        """GET /api/interventions - List interventions"""
        response = requests.get(
            f"{BASE_URL}/api/interventions",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} interventions")
    
    def test_03_list_interventions_requires_auth(self):
        """GET /api/interventions - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/interventions")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/interventions requires auth")
    
    def test_04_list_interventions_with_filters(self):
        """GET /api/interventions with date filters"""
        today = datetime.now().strftime("%Y-%m-%d")
        future = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/interventions?date_from={today}&date_to={future}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Interventions filtered by date range")
    
    def test_05_check_in_intervention(self):
        """POST /api/interventions/{id}/check - Check-in"""
        if not hasattr(TestInterventionsEndpoints, 'intervention_id'):
            pytest.skip("No intervention_id from previous test")
        
        payload = {
            "type": "check_in",
            "latitude": 48.8566,
            "longitude": 2.3522,
            "notes": "Arrivé sur site"
        }
        response = requests.post(
            f"{BASE_URL}/api/interventions/{TestInterventionsEndpoints.intervention_id}/check",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "time" in data
        print(f"✓ Check-in recorded: {data['time']}")
    
    def test_06_verify_intervention_status_en_cours(self):
        """GET /api/interventions/{id} - Verify status changed to en_cours"""
        if not hasattr(TestInterventionsEndpoints, 'intervention_id'):
            pytest.skip("No intervention_id")
        
        response = requests.get(
            f"{BASE_URL}/api/interventions/{TestInterventionsEndpoints.intervention_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "en_cours", f"Expected 'en_cours', got '{data['status']}'"
        assert data["check_in"] is not None
        print("✓ Intervention status: en_cours")
    
    def test_07_check_out_intervention(self):
        """POST /api/interventions/{id}/check - Check-out"""
        if not hasattr(TestInterventionsEndpoints, 'intervention_id'):
            pytest.skip("No intervention_id from previous test")
        
        payload = {
            "type": "check_out",
            "latitude": 48.8566,
            "longitude": 2.3522,
            "notes": "Travail terminé"
        }
        response = requests.post(
            f"{BASE_URL}/api/interventions/{TestInterventionsEndpoints.intervention_id}/check",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Check-out recorded")
    
    def test_08_verify_intervention_status_terminee(self):
        """Verify status changed to terminée after check-out"""
        if not hasattr(TestInterventionsEndpoints, 'intervention_id'):
            pytest.skip("No intervention_id")
        
        response = requests.get(
            f"{BASE_URL}/api/interventions/{TestInterventionsEndpoints.intervention_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "terminée", f"Expected 'terminée', got '{data['status']}'"
        assert data["check_out"] is not None
        print("✓ Intervention status: terminée")


class TestCalendarEndpoint:
    """Phase 4: Test calendar view endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = get_auth_headers()
    
    def test_get_calendar_default(self):
        """GET /api/calendar - Get current month calendar"""
        response = requests.get(
            f"{BASE_URL}/api/calendar",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "month" in data
        assert "interventions" in data
        assert "teams" in data
        assert isinstance(data["interventions"], list)
        assert isinstance(data["teams"], list)
        print(f"✓ Calendar for {data['month']}: {len(data['interventions'])} interventions, {len(data['teams'])} teams")
    
    def test_get_calendar_specific_month(self):
        """GET /api/calendar?month=YYYY-MM - Get specific month"""
        response = requests.get(
            f"{BASE_URL}/api/calendar?month=2026-02",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["month"] == "2026-02"
        print("✓ Calendar for specific month retrieved")
    
    def test_calendar_requires_auth(self):
        """GET /api/calendar - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/calendar")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/calendar requires auth")


# ============= PHASE 5: ADVANCED FEATURES =============

class TestNotificationsEndpoints:
    """Phase 5: Test notifications endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = get_auth_headers()
    
    def test_get_notifications(self):
        """GET /api/notifications - Get notifications"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
        assert isinstance(data["notifications"], list)
        print(f"✓ Got {len(data['notifications'])} notifications, {data['unread_count']} unread")
    
    def test_get_notifications_unread_only(self):
        """GET /api/notifications?unread_only=true"""
        response = requests.get(
            f"{BASE_URL}/api/notifications?unread_only=true",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Filtered unread notifications")
    
    def test_notifications_requires_auth(self):
        """GET /api/notifications - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/notifications requires auth")
    
    def test_mark_notifications_read(self):
        """POST /api/notifications/read - Mark all as read"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/read",
            json={},
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Marked notifications as read")


class TestScoringEndpoints:
    """Phase 5: Test lead scoring endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = get_auth_headers()
    
    def test_get_scoring_rules(self):
        """GET /api/scoring/rules - Get scoring rules"""
        response = requests.get(
            f"{BASE_URL}/api/scoring/rules",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "source" in data
        assert "service_type" in data
        assert "has_phone" in data
        print("✓ Got scoring rules")
    
    def test_scoring_rules_requires_auth(self):
        """GET /api/scoring/rules - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/scoring/rules")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/scoring/rules requires auth")
    
    def test_recalculate_scores(self):
        """POST /api/scoring/recalculate - Recalculate all scores"""
        response = requests.post(
            f"{BASE_URL}/api/scoring/recalculate",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "total" in data
        print(f"✓ Recalculated scores for {data['total']} leads")


class TestUsersEndpoints:
    """Phase 5: Test users/roles endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = get_auth_headers()
    
    def test_list_users(self):
        """GET /api/users - List users"""
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} users")
    
    def test_users_requires_auth(self):
        """GET /api/users - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/users")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/users requires auth")


class TestClientsEndpoints:
    """Phase 5: Test client retention endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = get_auth_headers()
    
    def test_list_converted_clients(self):
        """GET /api/clients - List converted clients (status=gagné)"""
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        # Each client should have enriched data
        for client in data:
            assert "total_spent" in client
            assert "invoice_count" in client
        print(f"✓ Listed {len(data)} converted clients")
    
    def test_clients_requires_auth(self):
        """GET /api/clients - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/clients requires auth")
    
    def test_get_client_history(self):
        """GET /api/clients/{lead_id}/history - Get client full history"""
        # First get a lead
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        leads = response.json()
        
        if not leads:
            pytest.skip("No leads available")
        
        lead_id = leads[0]["lead_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/clients/{lead_id}/history",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "client" in data
        assert "quotes" in data
        assert "invoices" in data
        assert "interactions" in data
        assert "interventions" in data
        assert "total_revenue" in data
        print(f"✓ Got client history: {len(data['quotes'])} quotes, {len(data['invoices'])} invoices")
    
    def test_client_history_404_nonexistent(self):
        """GET /api/clients/{lead_id}/history - 404 for non-existent"""
        response = requests.get(
            f"{BASE_URL}/api/clients/lead_nonexistent123/history",
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ 404 for non-existent client history")


# ============= EXISTING ENDPOINTS REGRESSION =============

class TestExistingEndpointsStillWork:
    """Verify existing endpoints from Phases 1-2 still work"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.headers = get_auth_headers()
    
    def test_leads_endpoint(self):
        """GET /api/leads - Regression test"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=self.headers)
        assert response.status_code == 200
        print("✓ GET /api/leads works")
    
    def test_quotes_endpoint(self):
        """GET /api/quotes - Regression test"""
        response = requests.get(f"{BASE_URL}/api/quotes", headers=self.headers)
        assert response.status_code == 200
        print("✓ GET /api/quotes works")
    
    def test_tasks_endpoint(self):
        """GET /api/tasks - Regression test"""
        response = requests.get(f"{BASE_URL}/api/tasks", headers=self.headers)
        assert response.status_code == 200
        print("✓ GET /api/tasks works")
    
    def test_invoices_endpoint(self):
        """GET /api/invoices - Regression test"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=self.headers)
        assert response.status_code == 200
        print("✓ GET /api/invoices works")
    
    def test_financial_stats_endpoint(self):
        """GET /api/stats/financial - Regression test"""
        response = requests.get(f"{BASE_URL}/api/stats/financial", headers=self.headers)
        assert response.status_code == 200
        print("✓ GET /api/stats/financial works")
    
    def test_dashboard_stats_endpoint(self):
        """GET /api/stats/dashboard - Regression test"""
        response = requests.get(f"{BASE_URL}/api/stats/dashboard", headers=self.headers)
        assert response.status_code == 200
        print("✓ GET /api/stats/dashboard works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
