"""
Tests for Tasks 1 to 4:
Task 1: Show pending request to only admin, request can only be approved by admin
Task 2: Show requester unavailable venue when two users ask for same venue for same date and time
Task 3: Only admin and department coordinator can create or modify timetable for faculty, and only admin can mark unavailability of faculty
Task 4: Any faculty can request a schedule change, admin or deputy coordinator can see that request and make changes in timetable
"""

import pytest
import json
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

@pytest.fixture(autouse=True)
def preserve_schedule():
    with open("exports/schedule.json", "r", encoding="utf-8") as f:
        original = f.read()
    yield
    with open("exports/schedule.json", "w", encoding="utf-8") as f:
        f.write(original)

@pytest.fixture
def dataset():
    with open("data/cit_public.json", "r", encoding="utf-8") as f:
        return json.load(f)

@pytest.mark.asyncio
async def test_task_1_pending_requests_and_admin_only_approval():
    await db_manager.connect()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Login Admin
        res_admin = await ac.post("/api/v1/auth/login", json={"email": "admin@cit.edu", "password": "Admin@123"})
        admin_token = res_admin.json()["access_token"]

        # Login Coordinator
        res_coord = await ac.post("/api/v1/auth/login", json={"email": "coord@cit.edu", "password": "Coord@123"})
        coord_token = res_coord.json()["access_token"]

        # Login Club Rep
        res_club = await ac.post("/api/v1/auth/login", json={"email": "club@cit.edu", "password": "Club@123"})
        club_token = res_club.json()["access_token"]

        # Club Rep submits a booking (which will be pending)
        booking_payload = {
            "title": "Club Dance Practice Slot",
            "event_type": "club_event",
            "room_id": "OAT1",
            "day": "Monday",
            "start_period": "P7",
            "duration": 2,
            "expected_attendance": 80
        }
        res_create = await ac.post("/api/v1/bookings", json=booking_payload, headers={"Authorization": f"Bearer {club_token}"})
        assert res_create.status_code == 200
        booking_id = res_create.json()["booking_id"]
        assert res_create.json()["status"] == "pending"

        # Task 1 Check 1: Admin can see the pending booking
        res_b_admin = await ac.get("/api/v1/bookings", headers={"Authorization": f"Bearer {admin_token}"})
        admin_bookings = res_b_admin.json()
        assert any(b["id"] == booking_id and b["status"] == "pending" for b in admin_bookings)

        # Task 1 Check 2: Coordinator CANNOT see club rep's pending booking
        res_b_coord = await ac.get("/api/v1/bookings", headers={"Authorization": f"Bearer {coord_token}"})
        coord_bookings = res_b_coord.json()
        assert not any(b["id"] == booking_id for b in coord_bookings)

        # Task 1 Check 3: Coordinator CANNOT approve booking (403 Forbidden)
        res_coord_decide = await ac.post(
            f"/api/v1/bookings/{booking_id}/decision",
            json={"decision": "approve", "reason": "Approved by coordinator"},
            headers={"Authorization": f"Bearer {coord_token}"}
        )
        assert res_coord_decide.status_code == 403

        # Task 1 Check 4: Admin CAN approve booking (200 OK)
        res_admin_decide = await ac.post(
            f"/api/v1/bookings/{booking_id}/decision",
            json={"decision": "approve", "reason": "Approved by admin"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_admin_decide.status_code == 200
        assert res_admin_decide.json()["status"] == "approved"

        # Task 1 Check 5: Admin CAN approve self request of booking of venues
        admin_self_booking = {
            "title": "Dean Office Annual Review",
            "event_type": "institute_event",
            "room_id": "AUD1",
            "day": "Wednesday",
            "start_period": "P8",
            "duration": 1,
            "expected_attendance": 150
        }
        res_create_self = await ac.post("/api/v1/bookings", json=admin_self_booking, headers={"Authorization": f"Bearer {admin_token}"})
        self_booking_id = res_create_self.json()["booking_id"]

        res_self_decide = await ac.post(
            f"/api/v1/bookings/{self_booking_id}/decision",
            json={"decision": "approve", "reason": "Self-approved by Dean Office"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_self_decide.status_code == 200
        assert res_self_decide.json()["status"] == "approved"


@pytest.mark.asyncio
async def test_task_2_unavailable_venue_when_two_users_ask_same_venue_and_time():
    await db_manager.connect()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # User 1 (Club Rep) requests SH2 on Friday P6
        res_club = await ac.post("/api/v1/auth/login", json={"email": "club@cit.edu", "password": "Club@123"})
        club_token = res_club.json()["access_token"]

        user1_booking = {
            "title": "Music Club Audition",
            "event_type": "club_event",
            "room_id": "SH2",
            "day": "Friday",
            "start_period": "P6",
            "duration": 2,
            "expected_attendance": 50
        }
        res1 = await ac.post("/api/v1/bookings", json=user1_booking, headers={"Authorization": f"Bearer {club_token}"})
        assert res1.status_code == 200
        assert res1.json()["success"] is True

        # User 2 (Faculty) asks for SAME venue for SAME date and time
        res_fac = await ac.post("/api/v1/auth/login", json={"email": "faculty@cit.edu", "password": "Faculty@123"})
        fac_token = res_fac.json()["access_token"]

        user2_booking = {
            "title": "Remedial Physics Tutorial",
            "event_type": "club_event", # same priority tier
            "room_id": "SH2",
            "day": "Friday",
            "start_period": "P6",
            "duration": 2,
            "expected_attendance": 45
        }
        res2 = await ac.post("/api/v1/bookings", json=user2_booking, headers={"Authorization": f"Bearer {fac_token}"})
        data2 = res2.json()
        # Task 2: Requester is shown that venue is UNAVAILABLE
        assert data2["success"] is False
        assert data2.get("unavailable") is True or data2.get("status") == "rejected"
        assert "unavailable" in data2["reason"].lower() or "already requested" in data2["reason"].lower()
        assert len(data2.get("alternatives", [])) > 0

@pytest.mark.asyncio
async def test_task_3_timetable_modification_and_faculty_unavailability_permissions():
    await db_manager.connect()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_admin = await ac.post("/api/v1/auth/login", json={"email": "admin@cit.edu", "password": "Admin@123"})
        admin_token = res_admin.json()["access_token"]

        res_coord = await ac.post("/api/v1/auth/login", json={"email": "coord@cit.edu", "password": "Coord@123"})
        coord_token = res_coord.json()["access_token"]

        res_fac = await ac.post("/api/v1/auth/login", json={"email": "faculty@cit.edu", "password": "Faculty@123"})
        fac_token = res_fac.json()["access_token"]

        # Part A: Coordinator CAN modify timetable
        coord_modify = {
            "session_id": "SES001",
            "day": "Wednesday",
            "start_period": "P2",
            "room_id": "LAB_PHY"
        }
        res_mod_coord = await ac.post("/api/v1/schedules/modify", json=coord_modify, headers={"Authorization": f"Bearer {coord_token}"})
        assert res_mod_coord.status_code == 200
        assert res_mod_coord.json()["success"] is True

        # Part B: Admin CAN modify timetable
        admin_modify = {
            "session_id": "SES001",
            "day": "Thursday",
            "start_period": "P6",
            "room_id": "LAB_PHY"
        }
        res_mod_admin = await ac.post("/api/v1/schedules/modify", json=admin_modify, headers={"Authorization": f"Bearer {admin_token}"})
        assert res_mod_admin.status_code == 200

        # Part C: Faculty CANNOT modify timetable (403 Forbidden)
        res_mod_fac = await ac.post("/api/v1/schedules/modify", json=admin_modify, headers={"Authorization": f"Bearer {fac_token}"})
        assert res_mod_fac.status_code == 403

        # Part D: ONLY Admin can mark faculty unavailability
        unavail_payload = {
            "day": "Tuesday",
            "period": "P3",
            "is_unavailable": True,
            "reason": "Administrative committee duty"
        }
        # Admin succeeds:
        res_unavail_admin = await ac.post("/api/v1/faculty/FAC01/unavailability", json=unavail_payload, headers={"Authorization": f"Bearer {admin_token}"})
        assert res_unavail_admin.status_code == 200
        assert res_unavail_admin.json()["success"] is True

        # Coordinator CANNOT mark faculty unavailability (403 Forbidden):
        res_unavail_coord = await ac.post("/api/v1/faculty/FAC01/unavailability", json=unavail_payload, headers={"Authorization": f"Bearer {coord_token}"})
        assert res_unavail_coord.status_code == 403

        # Faculty CANNOT mark faculty unavailability (403 Forbidden):
        res_unavail_fac = await ac.post("/api/v1/faculty/FAC01/unavailability", json=unavail_payload, headers={"Authorization": f"Bearer {fac_token}"})
        assert res_unavail_fac.status_code == 403

@pytest.mark.asyncio
async def test_task_4_faculty_schedule_change_request_and_coordinator_approval():
    await db_manager.connect()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res_coord = await ac.post("/api/v1/auth/login", json={"email": "coord@cit.edu", "password": "Coord@123"})
        coord_token = res_coord.json()["access_token"]

        res_fac = await ac.post("/api/v1/auth/login", json={"email": "faculty@cit.edu", "password": "Faculty@123"})
        fac_token = res_fac.json()["access_token"]

        # Step 1: Faculty requests schedule change
        scr_payload = {
            "session_id": "SES002",
            "course_code": "BS104",
            "requested_day": "Friday",
            "requested_period": "P2",
            "requested_room_id": "LAB_PHY",
            "reason": "Attending national physics symposium on Tuesday"
        }
        res_req = await ac.post("/api/v1/schedule-change-requests", json=scr_payload, headers={"Authorization": f"Bearer {fac_token}"})
        assert res_req.status_code == 200
        scr_id = res_req.json()["id"]
        assert res_req.json()["status"] == "pending"

        # Step 2: Deputy Coordinator can see the request
        res_list = await ac.get("/api/v1/schedule-change-requests", headers={"Authorization": f"Bearer {coord_token}"})
        assert res_list.status_code == 200
        requests_list = res_list.json()
        assert any(r["id"] == scr_id for r in requests_list)

        # Step 3: Deputy Coordinator approves request and makes changes in timetable
        res_decide = await ac.post(
            f"/api/v1/schedule-change-requests/{scr_id}/decision",
            json={"decision": "approve", "reason": "Approved by Dept Coordinator"},
            headers={"Authorization": f"Bearer {coord_token}"}
        )
        assert res_decide.status_code == 200
        assert res_decide.json()["status"] == "approved"

        # Verify active schedule updated
        res_sched = await ac.get("/api/v1/schedules/active")
        assert res_sched.status_code == 200
        assignments = res_sched.json()["assignments"]
        ses2 = next(a for a in assignments if a["session_id"] == "SES002")
        assert ses2["day"] == "Friday"
        assert ses2["start_period"] == "P2"
