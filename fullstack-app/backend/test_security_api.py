#!/usr/bin/env python3
"""Test security API endpoints."""
import requests
import json

# First, login to get token
login_data = {
    "username": "admin@hatzegopteryx.com",
    "password": "admin123"
}

login_response = requests.post("http://localhost:8000/api/auth/login", data=login_data)
print(f"Login status: {login_response.status_code}")

if login_response.status_code == 200:
    tokens = login_response.json()
    access_token = tokens["access_token"]
    print(f"Got access token: {access_token[:20]}...")
    
    # Test security dashboard
    headers = {"Authorization": f"Bearer {access_token}"}
    
    dashboard_response = requests.get("http://localhost:8000/api/security/dashboard", headers=headers)
    print(f"\nDashboard status: {dashboard_response.status_code}")
    
    if dashboard_response.status_code == 200:
        dashboard_data = dashboard_response.json()
        print(f"Health status: {dashboard_data['health_status']}")
        print(f"Summary: {dashboard_data['summary']}")
    else:
        print(f"Dashboard error: {dashboard_response.text}")
else:
    print(f"Login failed: {login_response.text}")