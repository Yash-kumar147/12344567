"""
Stage 2: Room Assignment using Google OR-Tools CP-SAT.
With times fixed from Stage 1, assigns each individual session a candidate room.
- AddNoOverlap per room across all periods
- Room maintenance windows strictly respected
- Objective: Best-fit capacity (minimise underutilization < 40% capacity)
- Returns (status, assignments, offending_cut_if_infeasible)
"""

from typing import Dict, List, Any, Tuple, Optional
from ortools.sat.python import cp_model
from app.solver.preprocess import PreprocessedDataset
from app.rules.candidates import get_candidate_rooms
from app.rules.time_grid import PERIODS, PERIOD_INDEX, get_slot_periods

def solve_stage2_rooms(
    dataset_prep: PreprocessedDataset,
    time_assignments: Dict[str, Tuple[str, str]], # event_id -> (day, start_p)
    time_limit_sec: int = 30,
    num_workers: int = 2
) -> Tuple[str, Optional[List[Dict[str, Any]]], Optional[Dict[str, Tuple[str, str]]]]:
    """
    Returns (status_name, assignments_list, offending_cut).
    assignments_list: [{"session_id": sid, "day": day, "start_period": start_p, "room_id": rid}, ...]
    """
    model = cp_model.CpModel()

    # Expand all individual sessions
    all_sessions: List[Dict[str, Any]] = []
    session_time: Dict[str, Tuple[str, str]] = {}
    session_event_map: Dict[str, str] = {}

    for event in dataset_prep.events:
        eid = event["id"]
        if eid not in time_assignments:
            continue
        day, start_p = time_assignments[eid]
        for sub in event["sub_sessions"]:
            sid = sub["id"]
            all_sessions.append(sub)
            session_time[sid] = (day, start_p)
            session_event_map[sid] = eid

    # Candidate rooms for each session
    session_candidates: Dict[str, List[str]] = {}
    y: Dict[Tuple[str, str], cp_model.IntVar] = {} # y[(sid, rid)]

    for sub in all_sessions:
        sid = sub["id"]
        day, start_p = session_time[sid]
        duration = sub.get("duration", 1)
        periods = get_slot_periods(start_p, duration)

        c_rooms = get_candidate_rooms(sub, dataset_prep.rooms)
        
        # Filter out rooms in maintenance during these periods
        valid_rooms = []
        for r in c_rooms:
            rid = r["id"]
            in_maint = False
            for m in dataset_prep.maintenance:
                if m["room_id"] == rid and m["day"] == day:
                    m_s = PERIOD_INDEX.get(m["start_period"], 0)
                    m_e = PERIOD_INDEX.get(m["end_period"], 0)
                    for p in periods:
                        if m_s <= PERIOD_INDEX[p] <= m_e:
                            in_maint = True
                            break
                if in_maint:
                    break
            if not in_maint:
                valid_rooms.append(rid)

        session_candidates[sid] = valid_rooms
        if not valid_rooms:
            # Immediate infeasibility: No room fits this session at this fixed time!
            offending_cut = {session_event_map[sid]: session_time[sid]}
            return "INFEASIBLE_NO_ROOMS", None, offending_cut

        room_vars = []
        for rid in valid_rooms:
            var = model.NewBoolVar(f"y_{sid}_{rid}")
            y[(sid, rid)] = var
            room_vars.append(var)

        model.AddExactlyOne(room_vars)

    # Room non-overlap constraint: for each room and each (day, period), <= 1 session
    room_period_occupancy: Dict[Tuple[str, str, str], List[cp_model.IntVar]] = {}
    for sub in all_sessions:
        sid = sub["id"]
        day, start_p = session_time[sid]
        duration = sub.get("duration", 1)
        periods = get_slot_periods(start_p, duration)

        for rid in session_candidates[sid]:
            var = y[(sid, rid)]
            for p in periods:
                key = (rid, day, p)
                if key not in room_period_occupancy:
                    room_period_occupancy[key] = []
                room_period_occupancy[key].append(var)

    for key, vars_list in room_period_occupancy.items():
        if len(vars_list) > 1:
            model.Add(sum(vars_list) <= 1)

    # Objective: best-fit capacity (minimise underutilization)
    penalties = []
    for sub in all_sessions:
        sid = sub["id"]
        min_cap = sub.get("min_capacity", 0)
        for rid in session_candidates[sid]:
            room = dataset_prep.rooms_by_id[rid]
            cap = room["capacity"]
            if min_cap > 0 and (min_cap / cap) < 0.40:
                # Underutilized penalty
                penalties.append(10 * y[(sid, rid)])
            else:
                # Small penalty proportional to excess wasted capacity to favor tightest fit
                wasted = cap - min_cap
                penalties.append(wasted * y[(sid, rid)])

    if penalties:
        model.Minimize(sum(penalties))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(time_limit_sec)
    solver.parameters.num_workers = int(num_workers)
    solver.parameters.random_seed = 42

    status_code = solver.Solve(model)
    status_str = solver.StatusName(status_code)

    if status_code in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        assignments = []
        for sub in all_sessions:
            sid = sub["id"]
            day, start_p = session_time[sid]
            for rid in session_candidates[sid]:
                if solver.Value(y[(sid, rid)]) == 1:
                    assignments.append({
                        "session_id": sid,
                        "day": day,
                        "start_period": start_p,
                        "room_id": rid
                    })
                    break
        return status_str, assignments, None
    else:
        # Infeasible: construct offending time cut
        offending_cut = {eid: slot for eid, slot in time_assignments.items()}
        return status_str, None, offending_cut

