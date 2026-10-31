"""
Tests for Two-Stage CP-SAT Solver and Exam Scheduler.
Verifies zero hard violations, all sessions scheduled, halved exam capacity.
"""

import json
import pytest
from app.solver.engine import SchedulingEngine
from app.solver.exams import solve_midsem_exams
from validator import validate_schedule

@pytest.fixture
def dataset():
    with open("data/cit_public.json", "r", encoding="utf-8") as f:
        return json.load(f)

def test_full_schedule_generation_and_validation(dataset):
    engine = SchedulingEngine(time_limit_sec=40, num_workers=2)
    success, schedule, violations = engine.generate_schedule(dataset)

    assert success is True
    assert len(schedule["assignments"]) == 189
    
    # Run official validator
    report = validate_schedule(schedule, dataset)
    assert report["valid"] is True
    assert report["hard_violations_count"] == 0

def test_midsem_exams_halved_capacity(dataset):
    status, exam_assignments = solve_midsem_exams(dataset, time_limit_sec=20)
    assert status in ["OPTIMAL", "FEASIBLE"]
    assert len(exam_assignments) == 41

    # Check halved capacity constraint for every exam
    rooms_by_id = {r["id"]: r for r in dataset["rooms"]}
    for ex in exam_assignments:
        room = rooms_by_id[ex["room_id"]]
        effective_cap = room["capacity"] // 2
        assert effective_cap >= ex["expected_students"]

