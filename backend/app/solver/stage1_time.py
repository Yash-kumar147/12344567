"""
Stage 1: Time Assignment using Google OR-Tools CP-SAT.
Assigns each event a valid (day, start_period) slot respecting:
- Faculty non-overlap
- Student group non-overlap
- Daily faculty teaching limit (4 hours)
- Room-type relaxation at each time slot
- Soft penalties (avoid slots, P9 classes, student group gaps)
"""

from typing import Dict, List, Any, Tuple, Optional
from ortools.sat.python import cp_model
from app.solver.preprocess import PreprocessedDataset
from app.rules.time_grid import DAYS, PERIODS, PERIOD_INDEX, get_slot_periods

def solve_stage1_time(
    dataset_prep: PreprocessedDataset,
    time_limit_sec: int = 30,
    num_workers: int = 2,
    hints: Optional[Dict[str, Tuple[str, str]]] = None,
    no_good_cuts: Optional[List[Dict[str, Tuple[str, str]]]] = None
) -> Tuple[str, Optional[Dict[str, Tuple[str, str]]]]:
    """
    Returns (status, event_slots_dict).
    event_slots_dict: {event_id: (day, start_period)}
    """
    model = cp_model.CpModel()

    # Decision variables: x[event_id, slot_idx] is 1 if event assigned to slot
    x: Dict[Tuple[str, int], cp_model.IntVar] = {}
    event_slot_map: Dict[str, List[Tuple[str, str]]] = {}

    for event in dataset_prep.events:
        eid = event["id"]
        slots = event["candidate_slots"]
        event_slot_map[eid] = slots

        slot_vars = []
        for s_idx, slot in enumerate(slots):
            var = model.NewBoolVar(f"x_{eid}_{s_idx}")
            x[(eid, s_idx)] = var
            slot_vars.append(var)

            # Apply hint if available
            if hints and eid in hints:
                hint_day, hint_start = hints[eid]
                if slot == (hint_day, hint_start):
                    model.AddHint(var, 1)

        # Exactly one slot per event
        if not slot_vars:
            return "INFEASIBLE_EMPTY_CANDIDATES", None
        model.AddExactlyOne(slot_vars)

    # Precompute occupancy map: (eid, day, period) -> list of x[(eid, s_idx)] that cover that period
    event_occupancy: Dict[Tuple[str, str, str], List[cp_model.IntVar]] = {}
    for event in dataset_prep.events:
        eid = event["id"]
        duration = event["duration"]
        for s_idx, (day, start_p) in enumerate(event["candidate_slots"]):
            periods = get_slot_periods(start_p, duration)
            for p in periods:
                key = (eid, day, p)
                if key not in event_occupancy:
                    event_occupancy[key] = []
                event_occupancy[key].append(x[(eid, s_idx)])

    # 1. Faculty non-overlap constraint
    for fid in dataset_prep.faculty_by_id:
        fac_events = [e["id"] for e in dataset_prep.events if fid in e["faculty_ids"]]
        if not fac_events:
            continue
        for day in DAYS:
            for p in PERIODS:
                active_vars = []
                for eid in fac_events:
                    key = (eid, day, p)
                    if key in event_occupancy:
                        active_vars.extend(event_occupancy[key])
                if active_vars:
                    model.Add(sum(active_vars) <= 1)

    # 2. Student group non-overlap constraint
    for gid in dataset_prep.groups_by_id:
        grp_events = [e["id"] for e in dataset_prep.events if gid in e["group_ids"]]
        if not grp_events:
            continue
        for day in DAYS:
            for p in PERIODS:
                active_vars = []
                for eid in grp_events:
                    key = (eid, day, p)
                    if key in event_occupancy:
                        active_vars.extend(event_occupancy[key])
                if active_vars:
                    model.Add(sum(active_vars) <= 1)

    # 3. Faculty daily limits (<= 4 hours per day)
    for fid, fac in dataset_prep.faculty_by_id.items():
        daily_limit = fac.get("daily_limit", 4)
        fac_events = [e["id"] for e in dataset_prep.events if fid in e["faculty_ids"]]
        for day in DAYS:
            daily_period_vars = []
            for p in PERIODS:
                for eid in fac_events:
                    key = (eid, day, p)
                    if key in event_occupancy:
                        daily_period_vars.extend(event_occupancy[key])
            if daily_period_vars:
                model.Add(sum(daily_period_vars) <= daily_limit)

    # 4. Room-count relaxation:
    # A) Specialized labs:
    lab_types = ["physics_lab", "chemistry_lab", "computer_lab", "electronics_lab", "mechanical_lab", "civil_lab"]
    for ltype in lab_types:
        max_count = dataset_prep.room_count_by_type.get(ltype, 1)
        matching_events = [e for e in dataset_prep.events if any(sub.get("room_type_required") == ltype for sub in e["sub_sessions"])]
        for day in DAYS:
            for p in PERIODS:
                active_terms = []
                for e in matching_events:
                    key = (e["id"], day, p)
                    if key in event_occupancy:
                        # Multiplier is number of sub-sessions needing this lab
                        sub_reqs = sum(1 for sub in e["sub_sessions"] if sub.get("room_type_required") == ltype)
                        for var in event_occupancy[key]:
                            active_terms.append(sub_reqs * var)
                if active_terms:
                    model.Add(sum(active_terms) <= max_count)

    # B) Classrooms and Lecture Halls total capacity:
    total_class_lh = dataset_prep.room_count_by_type.get("classroom", 12) + dataset_prep.room_count_by_type.get("lecture_hall", 4)
    general_events = [e for e in dataset_prep.events if any(sub.get("room_type_required") in ["classroom", "lecture_hall"] for sub in e["sub_sessions"])]
    for day in DAYS:
        for p in PERIODS:
            active_terms = []
            for e in general_events:
                key = (e["id"], day, p)
                if key in event_occupancy:
                    sub_reqs = sum(1 for sub in e["sub_sessions"] if sub.get("room_type_required") in ["classroom", "lecture_hall"])
                    for var in event_occupancy[key]:
                        active_terms.append(sub_reqs * var)
            if active_terms:
                model.Add(sum(active_terms) <= total_class_lh)

    # 5. Apply No-Good Cuts if any passed from Stage 2 feedback
    if no_good_cuts:
        for cut in no_good_cuts:
            cut_vars = []
            for eid, (c_day, c_start) in cut.items():
                if eid in event_slot_map:
                    for s_idx, slot in enumerate(event_slot_map[eid]):
                        if slot == (c_day, c_start):
                            cut_vars.append(x[(eid, s_idx)])
            if cut_vars:
                model.Add(sum(cut_vars) <= len(cut_vars) - 1)

    # 6. Objective function: Soft penalties
    penalties = []

    # Soft 1: Faculty avoid slots (penalty 5)
    for fid, fac in dataset_prep.faculty_by_id.items():
        avoid_slots = fac.get("avoid_slots", [])
        if not avoid_slots:
            continue
        fac_events = [e for e in dataset_prep.events if fid in e["faculty_ids"]]
        for e in fac_events:
            eid = e["id"]
            for s_idx, (d, start_p) in enumerate(e["candidate_slots"]):
                periods = get_slot_periods(start_p, e["duration"])
                for av in avoid_slots:
                    if av["day"] == d and av["period"] in periods:
                        penalties.append(5 * x[(eid, s_idx)])

    # Soft 2: Classes scheduled in P9 (penalty 2)
    for e in dataset_prep.events:
        eid = e["id"]
        for s_idx, (d, start_p) in enumerate(e["candidate_slots"]):
            periods = get_slot_periods(start_p, e["duration"])
            if "P9" in periods:
                penalties.append(2 * x[(eid, s_idx)])

    if penalties:
        model.Minimize(sum(penalties))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(time_limit_sec)
    solver.parameters.num_workers = int(num_workers)
    solver.parameters.random_seed = 42

    status_code = solver.Solve(model)
    status_str = solver.StatusName(status_code)

    if status_code in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        solution = {}
        for eid, slots in event_slot_map.items():
            for s_idx, slot in enumerate(slots):
                if solver.Value(x[(eid, s_idx)]) == 1:
                    solution[eid] = slot
                    break
        return status_str, solution
    return status_str, None
