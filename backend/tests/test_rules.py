"""
Tests for Rules Library and Agreement with Official Validator.
"""

import json
import pytest
from app.rules.conflicts import find_violations
from app.rules.time_grid import get_slot_periods, is_valid_start_period, LEGAL_STARTS_BY_DURATION
from data.validator import validate_schedule

@pytest.fixture
def dataset():
    with open("data/cit_public.json", "r", encoding="utf-8") as f:
        return json.load(f)

@pytest.fixture
def valid_schedule():
    with open("exports/schedule.json", "r", encoding="utf-8") as f:
        return json.load(f)

def test_legal_starts_by_duration():
    # 3-hour labs only legal in P2 or P6
    assert LEGAL_STARTS_BY_DURATION[3] == ["P2", "P6"]
    assert is_valid_start_period("P2", 3) is True
    assert is_valid_start_period("P6", 3) is True
    assert is_valid_start_period("P4", 3) is False # would cross lunch P5

def test_find_violations_agrees_with_validator_on_valid_schedule(dataset, valid_schedule):
    internal_violations = find_violations(valid_schedule, dataset)
    validator_report = validate_schedule(valid_schedule, dataset)

    assert len(internal_violations) == 0
    assert validator_report["valid"] is True
    assert validator_report["hard_violations_count"] == 0

def test_detects_faculty_overlap_accurately(dataset, valid_schedule):
    # Introduce deliberate faculty overlap
    corrupted = dict(valid_schedule)
    corrupted["assignments"] = [dict(a) for a in valid_schedule["assignments"]]
    
    # Put two different sessions with same faculty at same slot
    corrupted["assignments"][0]["day"] = "Monday"
    corrupted["assignments"][0]["start_period"] = "P1"
    corrupted["assignments"][1]["day"] = "Monday"
    corrupted["assignments"][1]["start_period"] = "P1"
    # Share faculty
    fid = dataset["sessions"][0]["faculty_ids"][0]
    corrupted["assignments"][1]["session_id"] = dataset["sessions"][0]["id"] # Duplicate session

    report = validate_schedule(corrupted, dataset)
    assert report["valid"] is False
    assert report["hard_violations_count"] > 0

