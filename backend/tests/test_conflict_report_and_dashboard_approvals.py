"""
Tests for:
Task 1: Share conflict report only with admin and deputy coordinator
Task 2: After approving pending approvals in dashboard that section must remain empty until a new request is made
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app, DEMO_USERS
from app.db.mongo import db_manager

@pytest.fixture(autouse=True)
async def ensure_demo_users():
    await db_manager.connect()
    users_col = db_manager.get_collection("users")
    for u in DEMO_USERS:
        existing = await users_col.find_one({"email": u["email"]})
        if not existing:
            await users_col.insert_one(u)

@pytest.mark.asyncio
async def test_task_1_conflict_report_access_admin_and_deputy_coordinator_only():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Unauthenticated request -> 401
        res_unauth = await ac.get("/api/v1/reports/conflicts")
        assert res_unauth.status_code == 401
        res_unauth2 = await ac.get("/api/v1/conflicts/report")
        assert res_unauth2.status_code == 401

        # 2. Login Admin
        res_admin = await ac.post("/api/v1/auth/login", json={"email": "admin@cit.edu", "password": "Admin@123"})
        admin_token = res_admin.json()["access_token"]

        # Admin gets 200 OK
        res_admin_report = await ac.get("/api/v1/reports/conflicts", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_admin_report.status_code == 200
        data_admin = res_admin_report.json()
        assert "violations_count" in data_admin
        assert "hard_violations" in data_admin

        # 3. Login Coordinator (Deputy Coordinator)
        res_coord = await ac.post("/api/v1/auth/login", json={"email": "coord@cit.edu", "password": "Coord@123"})
        coord_token = res_coord.json()["access_token"]

        # Deputy Coordinator gets 200 OK
        res_coord_report = await ac.get("/api/v1/reports/conflicts", headers={"Authorization": f"Bearer {coord_token}"})
        assert res_coord_report.status_code == 200
        data_coord = res_coord_report.json()
        assert "violations_count" in data_coord

        # 4. Login Faculty (Dr. Sharma)
        res_fac = await ac.post("/api/v1/auth/login", json={"email": "faculty@cit.edu", "password": "Faculty@123"})
        fac_token = res_fac.json()["access_token"]

        # Faculty gets 403 Forbidden!
        res_fac_report = await ac.get("/api/v1/reports/conflicts", headers={"Authorization": f"Bearer {fac_token}"})
        assert res_fac_report.status_code == 403
        assert "forbidden" in res_fac_report.json()["detail"].lower()

        # 5. Login Club Representative
        res_club = await ac.post("/api/v1/auth/login", json={"email": "club@cit.edu", "password": "Club@123"})
        club_token = res_club.json()["access_token"]

        # Club Rep gets 403 Forbidden!
        res_club_report = await ac.get("/api/v1/reports/conflicts", headers={"Authorization": f"Bearer {club_token}"})
        assert res_club_report.status_code == 403
        assert "forbidden" in res_club_report.json()["detail"].lower()


@pytest.mark.asyncio
async def test_task_2_dashboard_pending_approvals_empty_after_approval_until_new_request():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Admin login
        res_admin = await ac.post("/api/v1/auth/login", json={"email": "admin@cit.edu", "password": "Admin@123"})
        admin_token = res_admin.json()["access_token"]

        # Club rep login
        res_club = await ac.post("/api/v1/auth/login", json={"email": "club@cit.edu", "password": "Club@123"})
        club_token = res_club.json()["access_token"]

        # Ensure all existing bookings are approved so pending count is 0
        b_col = db_manager.get_collection("bookings")
        pending_docs = await (b_col.find({"status": "pending"})).to_list(100)
        for doc in pending_docs:
            await b_col.update_one({"id": doc["id"]}, {"$set": {"status": "approved"}})

        # Initial summary check: pending approvals should be 0
        res_sum_init = await ac.get("/api/v1/dashboard/summary")
        assert res_sum_init.status_code == 200
        assert res_sum_init.json()["pending_approvals_count"] == 0

        # Club Rep submits a new booking request
        new_booking_req = {
            "title": "Freshers Induction Tech Talk",
            "event_type": "club_event",
            "room_id": "AUD1",
            "day": "Friday",
            "start_period": "P7",
            "duration": 2,
            "expected_attendance": 120
        }
        res_create = await ac.post("/api/v1/bookings", json=new_booking_req, headers={"Authorization": f"Bearer {club_token}"})
        assert res_create.status_code == 200
        b_data = res_create.json()
        assert b_data["status"] == "pending"
        booking_id = b_data["booking_id"]

        # Dashboard summary now reflects 1 pending approval
        res_sum_after_request = await ac.get("/api/v1/dashboard/summary")
        assert res_sum_after_request.json()["pending_approvals_count"] == 1

        # Admin approves the pending booking
        res_decide = await ac.post(
            f"/api/v1/bookings/{booking_id}/decision",
            json={"decision": "approve", "reason": "Reviewed and approved by Dean"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_decide.status_code == 200
        assert res_decide.json()["status"] == "approved"

        # Dashboard summary MUST REMAIN EMPTY (0 pending approvals) until a new request is made
        res_sum_after_approval = await ac.get("/api/v1/dashboard/summary")
        assert res_sum_after_approval.json()["pending_approvals_count"] == 0

        # Verify it stays empty on subsequent checks
        res_sum_verify = await ac.get("/api/v1/dashboard/summary")
        assert res_sum_verify.json()["pending_approvals_count"] == 0

        # Now when a second new request is made:
        req_2 = {
            "title": "Robotics Drone Racing Exhibition",
            "event_type": "club_event",
            "room_id": "OAT1",
            "day": "Wednesday",
            "start_period": "P7",
            "duration": 2,
            "expected_attendance": 80
        }
        res_create_2 = await ac.post("/api/v1/bookings", json=req_2, headers={"Authorization": f"Bearer {club_token}"})
        assert res_create_2.status_code == 200
        b2_id = res_create_2.json()["booking_id"]

        # Now and only now does a pending approval appear:
        res_sum_second = await ac.get("/api/v1/dashboard/summary")
        assert res_sum_second.json()["pending_approvals_count"] == 1

        # Approving the second request returns pending approvals to 0
        res_decide_2 = await ac.post(
            f"/api/v1/bookings/{b2_id}/decision",
            json={"decision": "approve", "reason": "Approved by Dean"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_decide_2.status_code == 200
        res_sum_final = await ac.get("/api/v1/dashboard/summary")
        assert res_sum_final.json()["pending_approvals_count"] == 0
