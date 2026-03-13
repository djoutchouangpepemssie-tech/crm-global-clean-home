#!/usr/bin/env python3
import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List

class CRMAPITester:
    def __init__(self, base_url="https://quote-email-flow.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = "test_session_1773332631052"  # From MongoDB setup
        self.user_id = "test-user-1773332631052"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {}  # Track created entities

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict[str, Any] = None, headers: Dict[str, str] = None) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Add auth header
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        
        # Merge additional headers
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers)
            else:
                response = requests.request(method, url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    return success, response_data
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n📋 TESTING AUTHENTICATION")
        
        # Test /auth/me with test session
        success, user_data = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if success and user_data:
            print(f"   User: {user_data.get('name')} ({user_data.get('email')})")
            return True
        return False

    def test_leads_endpoints(self):
        """Test leads management endpoints"""
        print("\n📋 TESTING LEADS MANAGEMENT")
        
        # Create a new lead (public endpoint - no auth required)
        lead_data = {
            "name": "John Doe",
            "email": "john.doe@example.com",
            "phone": "+33123456789",
            "service_type": "Ménage",
            "surface": 50.0,
            "address": "123 Rue de la Paix, Paris",
            "message": "Besoin de nettoyage hebdomadaire",
            "source": "Google Ads",
            "utm_source": "google",
            "utm_medium": "cpc"
        }
        
        success, lead = self.run_test(
            "Create Lead (Public)",
            "POST",
            "leads",
            200,
            lead_data
        )
        
        if success and lead:
            self.created_ids['lead_id'] = lead.get('lead_id')
            print(f"   Created lead: {lead.get('lead_id')}")
        
        # Get all leads (requires auth)
        success, leads = self.run_test(
            "Get All Leads",
            "GET",
            "leads",
            200
        )
        
        if success:
            print(f"   Found {len(leads)} leads")
        
        # Test leads with filters
        success, filtered_leads = self.run_test(
            "Get Leads with Filters",
            "GET",
            "leads?status=nouveau&service_type=Ménage",
            200
        )
        
        # Get specific lead
        if 'lead_id' in self.created_ids:
            success, lead_detail = self.run_test(
                "Get Lead Detail",
                "GET",
                f"leads/{self.created_ids['lead_id']}",
                200
            )
        
        # Update lead status
        if 'lead_id' in self.created_ids:
            update_data = {
                "status": "contacté",
                "notes": "Premier contact effectué"
            }
            success, _ = self.run_test(
                "Update Lead",
                "PATCH",
                f"leads/{self.created_ids['lead_id']}",
                200,
                update_data
            )

    def test_quotes_endpoints(self):
        """Test quotes management endpoints"""
        print("\n📋 TESTING QUOTES MANAGEMENT")
        
        if 'lead_id' not in self.created_ids:
            print("❌ Skipping quotes tests - no lead created")
            return
        
        # Create a quote
        quote_data = {
            "lead_id": self.created_ids['lead_id'],
            "service_type": "Ménage",
            "surface": 50.0,
            "amount": 150.0,
            "details": "Nettoyage complet appartement 50m² - Hebdomadaire"
        }
        
        success, quote = self.run_test(
            "Create Quote",
            "POST",
            "quotes",
            200,
            quote_data
        )
        
        if success and quote:
            self.created_ids['quote_id'] = quote.get('quote_id')
            print(f"   Created quote: {quote.get('quote_id')}")
        
        # Get all quotes
        success, quotes = self.run_test(
            "Get All Quotes",
            "GET",
            "quotes",
            200
        )
        
        if success:
            print(f"   Found {len(quotes)} quotes")
        
        # Send quote (creates follow-up task)
        if 'quote_id' in self.created_ids:
            success, _ = self.run_test(
                "Send Quote",
                "POST",
                f"quotes/{self.created_ids['quote_id']}/send",
                200
            )
            
            if success:
                print("   Quote sent - follow-up task should be created")

    def test_tasks_endpoints(self):
        """Test tasks management endpoints"""
        print("\n📋 TESTING TASKS MANAGEMENT")
        
        # Create a task
        if 'lead_id' in self.created_ids:
            task_data = {
                "lead_id": self.created_ids['lead_id'],
                "type": "rappel",
                "title": "Rappeler client",
                "description": "Vérifier satisfaction après nettoyage",
                "due_date": (datetime.now() + timedelta(days=1)).isoformat()
            }
            
            success, task = self.run_test(
                "Create Task",
                "POST",
                "tasks",
                200,
                task_data
            )
            
            if success and task:
                self.created_ids['task_id'] = task.get('task_id')
                print(f"   Created task: {task.get('task_id')}")
        
        # Get all tasks
        success, tasks = self.run_test(
            "Get All Tasks",
            "GET",
            "tasks",
            200
        )
        
        if success:
            print(f"   Found {len(tasks)} tasks")
            
        # Get pending tasks only
        success, pending_tasks = self.run_test(
            "Get Pending Tasks",
            "GET",
            "tasks?status=pending",
            200
        )
        
        # Complete a task
        if 'task_id' in self.created_ids:
            success, _ = self.run_test(
                "Complete Task",
                "PATCH",
                f"tasks/{self.created_ids['task_id']}/complete",
                200
            )

    def test_interactions_endpoints(self):
        """Test interactions endpoints"""
        print("\n📋 TESTING INTERACTIONS")
        
        if 'lead_id' not in self.created_ids:
            print("❌ Skipping interactions tests - no lead created")
            return
            
        # Create interaction
        interaction_data = {
            "lead_id": self.created_ids['lead_id'],
            "type": "appel",
            "content": "Client intéressé, souhaite programmer intervention"
        }
        
        success, interaction = self.run_test(
            "Create Interaction",
            "POST",
            "interactions",
            200,
            interaction_data
        )
        
        if success and interaction:
            self.created_ids['interaction_id'] = interaction.get('interaction_id')
        
        # Get interactions
        success, interactions = self.run_test(
            "Get All Interactions",
            "GET",
            "interactions",
            200
        )

    def test_events_endpoints(self):
        """Test events tracking endpoints"""
        print("\n📋 TESTING EVENTS TRACKING")
        
        # Create event (public endpoint)
        event_data = {
            "lead_id": self.created_ids.get('lead_id'),
            "event_type": "clic_devis",
            "page_url": "https://globalcleanhome.com/devis",
            "utm_source": "google",
            "utm_medium": "cpc",
            "device_info": {"browser": "Chrome", "os": "Windows"}
        }
        
        success, event = self.run_test(
            "Create Event",
            "POST",
            "events",
            200,
            event_data
        )
        
        # Get events (requires auth)
        success, events = self.run_test(
            "Get All Events",
            "GET",
            "events",
            200
        )

    def test_activity_logs(self):
        """Test activity logs endpoint"""
        print("\n📋 TESTING ACTIVITY LOGS")
        
        success, logs = self.run_test(
            "Get Activity Logs",
            "GET",
            "activity",
            200
        )
        
        if success:
            print(f"   Found {len(logs)} activity logs")

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📋 TESTING DASHBOARD STATS")
        
        # Test different periods
        for period in ["1d", "7d", "30d"]:
            success, stats = self.run_test(
                f"Dashboard Stats ({period})",
                "GET",
                f"stats/dashboard?period={period}",
                200
            )
            
            if success:
                print(f"   {period}: {stats.get('total_leads', 0)} leads, {stats.get('total_quotes', 0)} quotes")

    def test_public_lead_api(self):
        """Test public lead creation API (for website integration)"""
        print("\n📋 TESTING PUBLIC LEAD API")
        
        # Test without auth (simulating website form)
        lead_data = {
            "name": "Jane Smith",
            "email": "jane.smith@example.com", 
            "phone": "+33987654321",
            "service_type": "Canapé",
            "message": "Nettoyage canapé en urgence"
        }
        
        success, lead = self.run_test(
            "Create Lead from Website (No Auth)",
            "POST",
            "leads",
            200,
            lead_data,
            headers={"Authorization": ""}  # Override auth
        )

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 STARTING CRM API TESTING")
        print(f"🔗 Base URL: {self.base_url}")
        print(f"🔑 Session Token: {self.session_token[:20]}...")
        
        # Test auth first - critical for other tests
        if not self.test_auth_endpoints():
            print("\n❌ Authentication failed - stopping tests")
            return 1
        
        # Run all other tests
        self.test_public_lead_api()
        self.test_leads_endpoints() 
        self.test_quotes_endpoints()
        self.test_tasks_endpoints()
        self.test_interactions_endpoints()
        self.test_events_endpoints()
        self.test_activity_logs()
        self.test_dashboard_stats()
        
        # Print summary
        print(f"\n📊 TEST SUMMARY")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = CRMAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())