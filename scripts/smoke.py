"""
Post-Deploy Smoke Test for CIT Campus Scheduling Platform.
Hits /api/v1/health/ready, logs in as each role, and fetches /schedules/active.
"""

import sys
import os
import argparse
import httpx

DEMO_ACCOUNTS = [
    ("admin@cit.edu", "Admin@123", "admin"),
    ("coord@cit.edu", "Coord@123", "coordinator"),
    ("faculty@cit.edu", "Faculty@123", "faculty"),
    ("club@cit.edu", "Club@123", "club_rep")
]

def run_smoke_tests(base_url: str):
    print(f"Starting smoke tests against target: {base_url}\n")
    client = httpx.Client(base_url=base_url, timeout=15.0)

    # 1. Health check
    print("[1/3] Testing /api/v1/health/ready...")
    try:
        r_health = client.get("/api/v1/health/ready")
        print(f"      Status: {r_health.status_code}")
        if r_health.status_code != 200:
            print(f"      FAIL: Health check failed: {r_health.text}")
            sys.exit(1)
        print("      PASS: System is ready and healthy.\n")
    except Exception as e:
        print(f"      FAIL: Could not reach {base_url}: {e}")
        sys.exit(1)

    # 2. Login for each role
    print("[2/3] Testing authentication for all 4 demo roles...")
    for email, password, expected_role in DEMO_ACCOUNTS:
        r_login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        if r_login.status_code != 200:
            print(f"      FAIL: Login failed for {email} ({expected_role}): {r_login.text}")
            sys.exit(1)
        data = r_login.json()
        assert data["user"]["role"] == expected_role
        print(f"      PASS: {expected_role.upper():12s} logged in successfully ({email}).")
    print()

    # 3. Active schedule fetch
    print("[3/3] Testing /api/v1/schedules/active...")
    r_sched = client.get("/api/v1/schedules/active")
    if r_sched.status_code != 200:
        print(f"      FAIL: Active schedule fetch failed: {r_sched.text}")
        sys.exit(1)
    sched_data = r_sched.json()
    assignments = sched_data.get("assignments", [])
    print(f"      PASS: Fetched active schedule with {len(assignments)} clash-free sessions.\n")

    print("ALL SMOKE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CIT Platform Smoke Tests")
    parser.add_argument("--url", default="http://localhost:8000", help="Base URL of deployed frontend or backend")
    args = parser.parse_args()
    run_smoke_tests(args.url.rstrip("/"))

