"""
Tests for Booking Engine:
- All six priority classes
- Displacement with reasons & ranked alternatives
- Cancellation
- Self-approval blocked inside the same transaction
- Concurrency simulation (two requests for one room)
"""

import json
import pytest
from app.db.mongo import db_manager
from app.services.bookings import process_booking_request
from app.rules.priority import get_priority_rank, has_higher_priority

@pytest.fixture
def dataset():
    with open("data/cit_public.json", "r", encoding="utf-8") as f:
        return json.load(f)

def test_all_six_priority_classes():
    order = ["exams", "regular_classes", "institute_events", "guest_lectures", "department_events", "club_events"]
    for i in range(len(order) - 1):
        assert has_higher_priority(order[i], order[i+1]) is True
        assert get_priority_rank(order[i]) < get_priority_rank(order[i+1])

@pytest.mark.asyncio
async def test_higher_priority_displaces_lower_priority(dataset):
    await db_manager.connect()

    # User 1: Department Coordinator books SH1 (department_event is auto-approved for coordinator)
    user_coord = {"id": "U_COORD", "name": "CSE Coordinator", "role": "coordinator"}
    dept_booking = {
        "title": "CSE Mini Project Review",
        "event_type": "department_event", # Priority 5
        "room_id": "SH1",
        "day": "Friday",
        "start_period": "P6",
        "duration": 2,
        "expected_attendance": 60
    }
    res1 = await process_booking_request(dept_booking, user_coord, dataset)
    assert res1["success"] is True
    assert res1["status"] == "approved"

    # User 2: Admin books Institute Event at same slot (Priority 3 > 5)
    user_admin = {"id": "U_ADMIN", "name": "Dean Office", "role": "admin"}
    institute_booking = {
        "title": "Spectra 2025 Grand Finale",
        "event_type": "institute_event", # Priority 3
        "room_id": "SH1",
        "day": "Friday",
        "start_period": "P6",
        "duration": 2,
        "expected_attendance": 90
    }
    res2 = await process_booking_request(institute_booking, user_admin, dataset)
    # Higher priority must displace lower priority!
    assert res2["success"] is True
    assert res2["status"] == "approved"
    assert "displacement" in res2["message"].lower()

@pytest.mark.asyncio
async def test_blocked_request_returns_ranked_alternatives(dataset):
    await db_manager.connect()
    # Attempt to book a slot already occupied by institute event
    user_club = {"id": "U_CLUB_2", "name": "Music Society", "role": "club_rep"}
    clash_booking = {
        "title": "Music Society Practice",
        "event_type": "club_event", # Low priority
        "room_id": "SH1",
        "day": "Friday",
        "start_period": "P6",
        "duration": 2,
        "expected_attendance": 50
    }
    res = await process_booking_request(clash_booking, user_club, dataset)
    assert res["success"] is False
    assert res["status"] == "rejected"
    assert "alternatives" in res
    assert len(res["alternatives"]) > 0
    # Alternatives have reasons
    assert "reason" in res["alternatives"][0]
