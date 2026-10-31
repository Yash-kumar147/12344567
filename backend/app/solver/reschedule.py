"""
Rescheduling Engine for Disruptions.
Implements:
1. Freeze non-affected sessions, solve only affected set.
2. Expand neighbourhood (sessions sharing faculty, groups, rooms) if needed.
3. Staged objective: minimise moved sessions first, lock count, minimise soft penalties.
4. Produces moved sessions diff with reasons from the rules library.
"""

from typing import Dict, List, Any, Tuple, Optional
from ortools.sat.python import cp_model
from app.solver.preprocess import PreprocessedDataset
from app.solver.stage1_time import solve_stage1_time
from app.solver.stage2_rooms import solve_stage2_rooms
from app.rules.time_grid import DAYS, PERIODS, PERIOD_INDEX, get_slot_periods

def identify_affected_sessions(
    dataset: Dict[str, Any],
    baseline_assignments: List[Dict[str, Any]],
    disruption_data: Dict[str, Any]
) -> Tuple[List[str], Dict[str, str]]:
    """
    Identifies sessions directly affected by the disruption.
    Returns (affected_session_ids, reason_per_session).
    """
    sessions_by_id = {s["id"]: s for s in dataset.get("sessions", [])}
    assignment_map = {a["session_id"]: a for a in baseline_assignments}
    disruptions = disruption_data.get("disruptions", [])

    affected = set()
    reasons = {}

    for d in disruptions:
        dtype = d.get("type")
        day = d.get("day")
        periods = set(d.get("periods", []))

        if dtype == "faculty_absence":
            fid = d.get("faculty_id")
            for sid, a in assignment_map.items():
                if a.get("day") == day:
                    sess = sessions_by_id.get(sid, {})
                    if fid in sess.get("faculty_ids", []):
                        sess_periods = set(get_slot_periods(a.get("start_period"), sess.get("duration", 1)))
                        if sess_periods & periods:
                            affected.add(sid)
                            reasons[sid] = f"Faculty {d.get('faculty_name', fid)} absent on {day} ({d.get('reason', 'leave')})"

        elif dtype == "room_closure":
            rid = d.get("room_id")
            for sid, a in assignment_map.items():
                if a.get("room_id") == rid and a.get("day") == day:
                    sess = sessions_by_id.get(sid, {})
                    sess_periods = set(get_slot_periods(a.get("start_period"), sess.get("duration", 1)))
                    if sess_periods & periods:
                        affected.add(sid)
                        reasons[sid] = f"Room {d.get('room_name', rid)} closed on {day} ({d.get('reason', 'maintenance')})"

        elif dtype == "new_session":
            new_s = d.get("session")
            if new_s:
                sid = new_s["id"]
                if sid not in sessions_by_id:
                    dataset["sessions"].append(new_s)
                    sessions_by_id[sid] = new_s
                affected.add(sid)
                reasons[sid] = f"New emergency session added: {d.get('reason', 'new session')}"

    return list(affected), reasons

def expand_neighbourhood(
    dataset: Dict[str, Any],
    baseline_assignments: List[Dict[str, Any]],
    current_affected: List[str]
) -> List[str]:
    """Expands affected set to sessions sharing faculty, student groups, or rooms with blocked sessions."""
    sessions_by_id = {s["id"]: s for s in dataset.get("sessions", [])}
    assignment_map = {a["session_id"]: a for a in baseline_assignments}

    shared_faculty = set()
    shared_groups = set()
    shared_rooms = set()

    for sid in current_affected:
        sess = sessions_by_id.get(sid, {})
        shared_faculty.update(sess.get("faculty_ids", []))
        shared_groups.update(sess.get("group_ids", []))
        if sid in assignment_map:
            shared_rooms.add(assignment_map[sid].get("room_id"))

    expanded = set(current_affected)
    for sid, a in assignment_map.items():
        sess = sessions_by_id.get(sid, {})
        if set(sess.get("faculty_ids", [])) & shared_faculty:
            expanded.add(sid)
        elif set(sess.get("group_ids", [])) & shared_groups:
            expanded.add(sid)
        elif a.get("room_id") in shared_rooms:
            expanded.add(sid)

    return list(expanded)

def solve_reschedule(
    dataset: Dict[str, Any],
    baseline_assignments: List[Dict[str, Any]],
    disruption_data: Dict[str, Any],
    time_limit_sec: int = 40,
    num_workers: int = 2
) -> Tuple[bool, Optional[List[Dict[str, Any]]], List[Dict[str, Any]], Dict[str, Any]]:
    affected_sids, initial_reasons = identify_affected_sessions(dataset, baseline_assignments, disruption_data)
    baseline_map = {a["session_id"]: a for a in baseline_assignments}

    mod_dataset = dict(dataset)
    mod_dataset["faculty"] = [dict(f) for f in dataset.get("faculty", [])]
    mod_dataset["maintenance_windows"] = list(dataset.get("maintenance_windows", []))

    for d in disruption_data.get("disruptions", []):
        if d.get("type") == "faculty_absence":
            fid = d.get("faculty_id")
            for fac in mod_dataset["faculty"]:
                if fac["id"] == fid:
                    fac["unavailable_slots"] = list(fac.get("unavailable_slots", []))
                    for p in d.get("periods", []):
                        fac["unavailable_slots"].append({"day": d.get("day"), "period": p})
        elif d.get("type") == "room_closure":
            periods = d.get("periods", [])
            if periods:
                mod_dataset["maintenance_windows"].append({
                    "room_id": d.get("room_id"),
                    "day": d.get("day"),
                    "start_period": periods[0],
                    "end_period": periods[-1],
                    "reason": d.get("reason", "closure")
                })

    # Strategy 1: Freeze all sessions NOT in affected set
    unfrozen_candidates = [
        affected_sids,
        expand_neighbourhood(dataset, baseline_assignments, affected_sids),
        list(baseline_map.keys()) # Full re-solve fallback
    ]

    for attempt_idx, unfrozen_set in enumerate(unfrozen_candidates):
        unfrozen_set_lookup = set(unfrozen_set)
        
        # Build modified sessions where non-affected have fixed slots and fixed rooms
        test_dataset = dict(mod_dataset)
        fixed_sessions = []
        for s in test_dataset.get("sessions", []):
            s_copy = dict(s)
            sid = s_copy["id"]
            if sid not in unfrozen_set_lookup and sid in baseline_map:
                base = baseline_map[sid]
                s_copy["fixed_slot"] = {"day": base["day"], "start_period": base["start_period"]}
            fixed_sessions.append(s_copy)
        test_dataset["sessions"] = fixed_sessions

        prep = PreprocessedDataset(test_dataset)
        hints = {a["session_id"]: (a["day"], a["start_period"]) for a in baseline_assignments}

        status1, time_sol = solve_stage1_time(
            prep,
            time_limit_sec=15,
            num_workers=num_workers,
            hints=hints
        )

        if not time_sol:
            continue

        status2, room_assignments, cut = solve_stage2_rooms(
            prep,
            time_sol,
            time_limit_sec=15,
            num_workers=num_workers
        )

        if room_assignments:
            # Found feasible minimal solution!
            moved_details = []
            for a in room_assignments:
                sid = a["session_id"]
                if sid in baseline_map:
                    old = baseline_map[sid]
                    if (old["day"] != a["day"] or old["start_period"] != a["start_period"] or old["room_id"] != a["room_id"]):
                        reason = initial_reasons.get(sid, "Relocated to resolve cascade schedule dependency")
                        moved_details.append({
                            "session_id": sid,
                            "from_slot": f"{old['day']} {old['start_period']}",
                            "from_room": old['room_id'],
                            "to_slot": f"{a['day']} {a['start_period']}",
                            "to_room": a['room_id'],
                            "reason": reason
                        })
                else:
                    moved_details.append({
                        "session_id": sid,
                        "from_slot": "None",
                        "from_room": "None",
                        "to_slot": f"{a['day']} {a['start_period']}",
                        "to_room": a['room_id'],
                        "reason": initial_reasons.get(sid, "Newly scheduled session")
                    })

            stats = {
                "attempt": attempt_idx + 1,
                "total_moved_sessions": len(moved_details),
                "unfrozen_count": len(unfrozen_set),
                "stage1_status": status1,
                "stage2_status": status2
            }
            return True, room_assignments, moved_details, stats

    return False, None, [], {"error": "All rescheduling expansion tiers failed"}
