#!/usr/bin/env python3
"""
Holiday Request Management API Testing Suite - Category Feature Testing
Tests all backend endpoints with focus on 5 holiday categories
"""

import requests
import sys
import json
from datetime import datetime, timedelta
import subprocess
import time

class HolidayCategoryTester:
    def __init__(self, base_url="https://vacation-hub-62.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.expected_categories = ['paid_holiday', 'unpaid_leave', 'sick_leave', 'parental_leave', 'maternity_leave']
        
    def log(self, message):
        """Log with timestamp"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                self.log(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "endpoint": endpoint,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "endpoint": endpoint,
                "error": str(e)
            })
            return False, {}

    def create_test_user_and_session(self):
        """Create test user and session in MongoDB"""
        self.log("🔧 Creating test user and session in MongoDB...")
        
        timestamp = int(time.time())
        user_id = f"test-user-{timestamp}"
        session_token = f"test_session_{timestamp}"
        email = f"test.user.{timestamp}@example.com"
        
        mongo_script = f'''
use('test_database');
var userId = '{user_id}';
var sessionToken = '{session_token}';
var email = '{email}';
var currentYear = new Date().getFullYear();

// Insert user
db.users.insertOne({{
  user_id: userId,
  email: email,
  name: 'Test User HR',
  picture: 'https://via.placeholder.com/150',
  role: 'hr',
  created_at: new Date()
}});

// Insert session
db.user_sessions.insertOne({{
  session_id: 'sess_' + Date.now(),
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
}});

// Insert holiday credits for all 5 categories
var categories = [
  {{id: 'paid_holiday', days: 35.0}},
  {{id: 'unpaid_leave', days: 0.0}},
  {{id: 'sick_leave', days: 5.0}},
  {{id: 'parental_leave', days: 10.0}},
  {{id: 'maternity_leave', days: 90.0}}
];

categories.forEach(function(cat) {{
  db.holiday_credits.insertOne({{
    credit_id: 'cred_test_' + cat.id + '_' + Date.now(),
    user_id: userId,
    user_email: email,
    user_name: 'Test User HR',
    year: currentYear,
    category: cat.id,
    total_days: cat.days,
    used_days: 0.0,
    remaining_days: cat.days,
    created_at: new Date(),
    updated_at: new Date()
  }});
}});

print('SUCCESS: Test user created');
print('User ID: ' + userId);
print('Session Token: ' + sessionToken);
'''
        
        try:
            result = subprocess.run(
                ['mongosh', '--eval', mongo_script],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                self.user_id = user_id
                self.session_token = session_token
                self.log(f"✅ Test user created - ID: {user_id}")
                self.log(f"✅ Session token: {session_token}")
                return True
            else:
                self.log(f"❌ MongoDB script failed: {result.stderr}")
                return False
                
        except Exception as e:
            self.log(f"❌ Failed to create test user: {str(e)}")
            return False

    def test_basic_endpoints(self):
        """Test basic non-auth endpoints"""
        self.log("\n📋 Testing Basic Endpoints...")
        
        # Test root endpoint
        self.run_test("Root API", "GET", "", 200)
        
        # Test health endpoint
        self.run_test("Health Check", "GET", "health", 200)

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        self.log("\n🔐 Testing Authentication Endpoints...")
        
        if not self.session_token:
            self.log("❌ No session token available for auth tests")
            return False
            
        # Test /auth/me
        success, user_data = self.run_test("Get Current User", "GET", "auth/me", 200)
        if success and user_data:
            self.log(f"   User: {user_data.get('name', 'Unknown')} ({user_data.get('role', 'Unknown')})")
            
        return success

    def test_credits_endpoints(self):
        """Test holiday credits endpoints"""
        self.log("\n💳 Testing Credits Endpoints...")
        
        # Test my credits
        success, credits = self.run_test("Get My Credits", "GET", "credits/my", 200)
        if success and credits:
            self.log(f"   Found {len(credits)} credit records")
            
        # Test all credits (HR only)
        success, all_credits = self.run_test("Get All Credits (HR)", "GET", "credits/all", 200)
        if success and all_credits:
            self.log(f"   Found {len(all_credits)} total credit records")

    def test_requests_endpoints(self):
        """Test holiday request endpoints"""
        self.log("\n📝 Testing Request Endpoints...")
        
        # Test my requests
        success, requests = self.run_test("Get My Requests", "GET", "requests/my", 200)
        if success:
            self.log(f"   Found {len(requests)} requests")
            
        # Test all requests (HR only)
        success, all_requests = self.run_test("Get All Requests (HR)", "GET", "requests/all", 200)
        if success:
            self.log(f"   Found {len(all_requests)} total requests")
            
        # Test pending requests (HR only)
        success, pending = self.run_test("Get Pending Requests (HR)", "GET", "requests/pending", 200)
        if success:
            self.log(f"   Found {len(pending)} pending requests")
            
        # Test create request
        request_data = {
            "start_date": "2024-12-20",
            "end_date": "2024-12-22",
            "days_count": 2.0,
            "reason": "Test holiday request"
        }
        success, response = self.run_test("Create Holiday Request", "POST", "requests", 201, request_data)
        if success:
            self.log(f"   Created request: {response.get('request_id', 'Unknown')}")

    def test_public_holidays_endpoints(self):
        """Test public holidays endpoints"""
        self.log("\n🎉 Testing Public Holidays Endpoints...")
        
        # Test get public holidays
        success, holidays = self.run_test("Get Public Holidays", "GET", "public-holidays", 200)
        if success:
            self.log(f"   Found {len(holidays)} public holidays")
            
        # Test create public holiday (HR only)
        holiday_data = {
            "name": "Test Holiday",
            "date": "2024-12-25",
            "year": 2024
        }
        success, response = self.run_test("Create Public Holiday (HR)", "POST", "public-holidays", 200, holiday_data)
        if success:
            self.log(f"   Created holiday: {response.get('holiday_id', 'Unknown')}")

    def test_users_endpoints(self):
        """Test users endpoints"""
        self.log("\n👥 Testing Users Endpoints...")
        
        # Test get all users (HR only)
        success, users = self.run_test("Get All Users (HR)", "GET", "users", 200)
        if success:
            self.log(f"   Found {len(users)} users")

    def test_settings_endpoints(self):
        """Test settings endpoints"""
        self.log("\n⚙️ Testing Settings Endpoints...")
        
        # Test get settings (HR only)
        success, settings = self.run_test("Get Settings (HR)", "GET", "settings", 200)
        if success:
            self.log(f"   Email notifications: {settings.get('email_notifications_enabled', 'Unknown')}")
            self.log(f"   Calendar sync: {settings.get('calendar_sync_enabled', 'Unknown')}")

    def test_calendar_endpoints(self):
        """Test calendar endpoints"""
        self.log("\n📅 Testing Calendar Endpoints...")
        
        # Test get calendar events
        current_year = datetime.now().year
        current_month = datetime.now().month
        success, events = self.run_test("Get Calendar Events", "GET", f"calendar/events?year={current_year}&month={current_month}", 200)
        if success:
            self.log(f"   Found {len(events)} calendar events")

    def cleanup_test_data(self):
        """Clean up test data from MongoDB"""
        self.log("\n🧹 Cleaning up test data...")
        
        cleanup_script = '''
use('test_database');
var result1 = db.users.deleteMany({email: /test\.user\./});
var result2 = db.user_sessions.deleteMany({session_token: /test_session/});
var result3 = db.holiday_credits.deleteMany({credit_id: /cred_test/});
var result4 = db.holiday_requests.deleteMany({user_email: /test\.user\./});
var result5 = db.public_holidays.deleteMany({name: "Test Holiday"});

print('Deleted users: ' + result1.deletedCount);
print('Deleted sessions: ' + result2.deletedCount);
print('Deleted credits: ' + result3.deletedCount);
print('Deleted requests: ' + result4.deletedCount);
print('Deleted holidays: ' + result5.deletedCount);
'''
        
        try:
            subprocess.run(['mongosh', '--eval', cleanup_script], timeout=30)
            self.log("✅ Test data cleaned up")
        except Exception as e:
            self.log(f"⚠️ Cleanup warning: {str(e)}")

    def run_all_tests(self):
        """Run complete test suite"""
        self.log("🚀 Starting Holiday Management API Test Suite")
        self.log(f"   Base URL: {self.base_url}")
        
        # Test basic endpoints first
        self.test_basic_endpoints()
        
        # Create test user and session
        if not self.create_test_user_and_session():
            self.log("❌ Cannot proceed without test user - stopping tests")
            return False
            
        # Test authenticated endpoints
        self.test_auth_endpoints()
        self.test_credits_endpoints()
        self.test_requests_endpoints()
        self.test_public_holidays_endpoints()
        self.test_users_endpoints()
        self.test_settings_endpoints()
        self.test_calendar_endpoints()
        
        # Cleanup
        self.cleanup_test_data()
        
        # Print summary
        self.log(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            self.log("\n❌ Failed Tests:")
            for test in self.failed_tests:
                error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
                self.log(f"   - {test['test']}: {error_msg}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = HolidayAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())