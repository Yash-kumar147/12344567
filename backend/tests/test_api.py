"""
End-to-End API Integration Tests for CIT Campus Scheduling Platform.
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
async def test_health_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res_live = await ac.get("/api/v1/health/live")
        assert res_live.status_code == 200
        assert res_live.json()["status"] == "live"

        res_ready = await ac.get("/api/v1/health/ready")
        assert res_ready.status_code == 200
        assert res_ready.json()["status"] == "ready"

@pytest.mark.asyncio
async def test_all_four_demo_account_logins():
    accounts = [
        ("admin@cit.edu", "Admin@123", "admin"),
        ("coord@cit.edu", "Coord@123", "coordinator"),
        ("faculty@cit.edu", "Faculty@123", "faculty"),
        ("club@cit.edu", "Club@123", "club_rep")
    ]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        for email, pwd, role in accounts:
            res = await ac.post("/api/v1/auth/login", json={"email": email, "password": pwd})
            assert res.status_code == 200, f"Login failed for {email}: {res.text}"
            data = res.json()
            assert "access_token" in data
            assert data["user"]["role"] == role
            assert data["user"]["email"] == email

@pytest.mark.asyncio
async def test_ai_hinglish_booking_parse_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {"text": "Hume Spectra ke liye Friday ko 2 se 5 baje tak seminar hall chahiye, 100 students ke liye."}
        res = await ac.post("/api/v1/bookings/parse", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["day"] == "Friday"
        assert data["start_time"] == "14:00"
        assert data["end_time"] == "17:00"
        assert data["room_type"] == "seminar_hall"
        assert data["expected_attendance"] == 100

@pytest.mark.asyncio
async def test_dashboard_summary_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/dashboard/summary")
        assert res.status_code == 200
        data = res.json()
        assert data["sessions_scheduled"] == 189
        assert data["total_rooms"] == 27
        assert data["has_conflicts"] is False

@pytest.mark.asyncio
async def test_exports_schedule_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/exports/schedule.json")
        assert res.status_code == 200
        data = res.json()
        assert "assignments" in data
        assert len(data["assignments"]) == 189
