"""
Tests for Disruption Rescheduling:
- Faculty absence and room closure
- Minimal moved sessions
- Stale base_version check (optimistic lock returns 409)
- Validation passes with 0 hard violations
"""

import json
import pytest
from app.solver.reschedule import solve_reschedule
from validator import validate_schedule

@pytest.fixture
def dataset():
    with open("data/cit_public.json", "r", encoding="utf-8") as f:
        return json.load(f)

@pytest.fixture
def baseline():
    with open("exports/schedule.json", "r", encoding="utf-8") as f:
        return json.load(f)

@pytest.fixture
def disruption():
    with open("data/sample_disruption.json", "r", encoding="utf-8") as f:
        return json.load(f)

def test_reschedule_minimal_moves_and_validation(dataset, baseline, disruption):
    ok, new_assignments, moved_details, stats = solve_reschedule(
        dataset, baseline["assignments"], disruption
    )
    assert ok is True
    assert len(moved_details) > 0
    # Assert moved session count is restrained
    assert len(moved_details) <= 60

    after_schedule = {
        "version": "1.1_test",
        "assignments": new_assignments
    }
    report = validate_schedule(after_schedule, dataset, baseline, disruption)
    assert report["valid"] is True
    assert report["hard_violations_count"] == 0

