"""
Exam Scheduler using Google OR-Tools CP-SAT.
Schedules midsem exams for CIT.
Enforces:
- Halved room capacity: effective_capacity = room['capacity'] // 2 >= exam['expected_students']
- No student group clashes
- No room clashes
- Lunch period (P5) respected
"""

from typing import Dict, List, Any, Tuple, Optional
from ortools.sat.python import cp_model
from app.rules.candidates import get_candidate_rooms
from app.rules.time_grid import DAYS, PERIODS, PERIOD_INDEX, get_slot_periods, LEGAL_STARTS_BY_DURATION

def solve_midsem_exams(
    dataset: Dict[str, Any],
    time_limit_sec: int = 30,
    num_workers: int = 2
) -> Tuple[str, Optional[List[Dict[str, Any]]]]:
    """
    Returns (status_name, exam_assignments_list).
    exam_assignments_list: [
      {"exam_id": eid, "course_code": code, "day": day, "start_period": start_p, "room_id": rid, "duration": 2}, ...
    ]
    """
    model = cp_model.CpModel()
    exams = dataset.get("exams", [])
    rooms = dataset.get("rooms", [])

    if not exams:
        return "OPTIMAL", []

    # Duration for exams is typically 2 hours
    legal_starts = LEGAL_STARTS_BY_DURATION.get(2, ["P1", "P2", "P3", "P6", "P7", "P8"])
    all_slots = [(d, p) for d in DAYS for p in legal_starts]

    # Pre-filter candidate rooms for each exam with halved capacity
    exam_candidates: Dict[str, List[Tuple[Tuple[str, str], str]]] = {}
    z: Dict[Tuple[str, str, str, str], cp_model.IntVar] = {}

    for exam in exams:
        eid = exam["id"]
        # Required capacity for exam
        needed_cap = exam.get("expected_students", 60)
        c_rooms = get_candidate_rooms({
            "min_capacity": needed_cap,
            "room_types_allowed": exam.get("room_types_allowed", ["lecture_hall", "classroom", "seminar_hall"])
        }, rooms, is_exam=True)

        options = []
        option_vars = []
        for slot in all_slots:
            d, p = slot
            for r in c_rooms:
                rid = r["id"]
                var = model.NewBoolVar(f"z_{eid}_{d}_{p}_{rid}")
                z[(eid, d, p, rid)] = var
                options.append((slot, rid))
                option_vars.append(var)

        exam_candidates[eid] = options
        if not option_vars:
            return "INFEASIBLE_NO_EXAM_ROOMS", None

        # Each exam scheduled exactly once
        model.AddExactlyOne(option_vars)

    # Student group non-overlap constraint:
    # A student group cannot have two exams at the same time
    for gid in {g for ex in exams for g in ex.get("group_ids", [])}:
        ex_for_group = [ex["id"] for ex in exams if gid in ex.get("group_ids", [])]
        for d in DAYS:
            for p in PERIODS:
                active_vars = []
                for eid in ex_for_group:
                    for (slot_d, start_p), rid in exam_candidates[eid]:
                        if slot_d == d:
                            periods = get_slot_periods(start_p, 2)
                            if p in periods:
                                active_vars.append(z[(eid, d, start_p, rid)])
                if active_vars:
                    model.Add(sum(active_vars) <= 1)

    # Room non-overlap constraint:
    for r in rooms:
        rid = r["id"]
        for d in DAYS:
            for p in PERIODS:
                room_vars = []
                for exam in exams:
                    eid = exam["id"]
                    for (slot_d, start_p), cand_rid in exam_candidates[eid]:
                        if cand_rid == rid and slot_d == d:
                            periods = get_slot_periods(start_p, 2)
                            if p in periods:
                                room_vars.append(z[(eid, d, start_p, rid)])
                if room_vars:
                    model.Add(sum(room_vars) <= 1)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(time_limit_sec)
    solver.parameters.num_workers = int(num_workers)
    solver.parameters.random_seed = 42

    status_code = solver.Solve(model)
    status_str = solver.StatusName(status_code)

    if status_code in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        assignments = []
        for exam in exams:
            eid = exam["id"]
            for (d, start_p), rid in exam_candidates[eid]:
                if solver.Value(z[(eid, d, start_p, rid)]) == 1:
                    assignments.append({
                        "exam_id": eid,
                        "course_code": exam.get("course_code"),
                        "course_name": exam.get("course_name"),
                        "day": d,
                        "start_period": start_p,
                        "room_id": rid,
                        "duration": 2,
                        "expected_students": exam.get("expected_students")
                    })
                    break
        return status_str, assignments
    return status_str, None

