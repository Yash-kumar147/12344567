"""
Pure Python Conflict detector for CIT Campus Scheduling Platform.
Reuses the authoritative rules to find structured violations.
No database or framework imports allowed.
"""

from typing import Dict, List, Any, Optional
from app.rules.time_grid import PERIODS, PERIOD_INDEX, LUNCH_PERIOD, LEGAL_STARTS_BY_DURATION, get_slot_periods

def find_violations(schedule_data: dict, dataset: dict, baseline_schedule: Optional[dict] = None) -> List[Dict[str, Any]]:
    """
    Evaluates a schedule against a dataset and returns structured violations.
    Each violation has: rule_id, entities, day, period, message.
    """
    rooms_by_id = {r["id"]: r for r in dataset.get("rooms", [])}
    faculty_by_id = {f["id"]: f for f in dataset.get("faculty", [])}
    groups_by_id = {g["id"]: g for g in dataset.get("student_groups", [])}
    sessions_by_id = {s["id"]: s for s in dataset.get("sessions", [])}
    maintenance = dataset.get("maintenance_windows", [])

    assignments = schedule_data.get("assignments", [])
    bookings = schedule_data.get("bookings", [])
    exams = schedule_data.get("exams", [])

    violations = []
    scheduled_sessions = set()

    # Track usage:
    faculty_slots = {}  # fid -> (day, period) -> sid
    group_slots = {}    # gid -> (day, period) -> sid
    room_slots = {}     # rid -> (day, period) -> sid
    fac_daily_hours = {}# fid -> day -> hours
    basket_slots = {}   # basket_id -> (day, start_period)

    # 1. Assignments check
    for a in assignments:
        sid = a.get("session_id")
        if not sid or sid not in sessions_by_id:
            violations.append({
                "rule_id": "UNKNOWN_SESSION",
                "entities": [sid],
                "day": a.get("day"),
                "period": a.get("start_period"),
                "message": f"Unknown session ID: {sid}"
            })
            continue

        if sid in scheduled_sessions:
            violations.append({
                "rule_id": "DUPLICATE_SESSION",
                "entities": [sid],
                "day": a.get("day"),
                "period": a.get("start_period"),
                "message": f"Session {sid} scheduled multiple times."
            })
        scheduled_sessions.add(sid)

        session = sessions_by_id[sid]
        day = a.get("day")
        start_p = a.get("start_period")
        room_id = a.get("room_id")
        duration = session.get("duration", 1)

        if start_p not in PERIOD_INDEX:
            violations.append({
                "rule_id": "INVALID_PERIOD",
                "entities": [sid],
                "day": day,
                "period": start_p,
                "message": f"Invalid start period {start_p}"
            })
            continue

        start_idx = PERIOD_INDEX[start_p]
        if start_idx + duration > len(PERIODS):
            violations.append({
                "rule_id": "PERIOD_OVERFLOW",
                "entities": [sid],
                "day": day,
                "period": start_p,
                "message": f"Session duration {duration} exceeds day periods"
            })
            continue

        assigned_periods = [PERIODS[start_idx + i] for i in range(duration)]

        # Lunch rule (Hard Constraint 9)
        if LUNCH_PERIOD in assigned_periods:
            violations.append({
                "rule_id": "LUNCH_PERIOD_VIOLATION",
                "entities": [sid],
                "day": day,
                "period": LUNCH_PERIOD,
                "message": f"Session {sid} crosses lunch period {LUNCH_PERIOD}"
            })

        # Lab start rule
        if duration == 3 and start_p not in ["P2", "P6"]:
            violations.append({
                "rule_id": "INVALID_LAB_SLOT",
                "entities": [sid],
                "day": day,
                "period": start_p,
                "message": f"3-hour lab must start at P2 or P6"
            })

        # Room checks (Hard Constraints 5, 6, 7, 8, 10)
        room = rooms_by_id.get(room_id)
        if not room:
            violations.append({
                "rule_id": "ROOM_NOT_FOUND",
                "entities": [sid, room_id],
                "day": day,
                "period": start_p,
                "message": f"Room {room_id} does not exist"
            })
        else:
            if room["capacity"] < session.get("min_capacity", 0):
                violations.append({
                    "rule_id": "INSUFFICIENT_ROOM_CAPACITY",
                    "entities": [sid, room_id],
                    "day": day,
                    "period": start_p,
                    "message": f"Room {room_id} capacity ({room['capacity']}) < needed ({session.get('min_capacity')})"
                })

            req_type = session.get("room_type_required")
            if req_type and req_type != room["type"]:
                if "lab" in req_type or req_type != room["type"]:
                    violations.append({
                        "rule_id": "ROOM_TYPE_MISMATCH",
                        "entities": [sid, room_id],
                        "day": day,
                        "period": start_p,
                        "message": f"Session requires {req_type}, room is {room['type']}"
                    })

            if session.get("needs_accessible") and not room.get("accessible", False):
                violations.append({
                    "rule_id": "ACCESSIBILITY_VIOLATION",
                    "entities": [sid, room_id],
                    "day": day,
                    "period": start_p,
                    "message": f"Accessible room required for session {sid}"
                })

            # Maintenance clash
            for m in maintenance:
                if m["room_id"] == room_id and m["day"] == day:
                    m_s = PERIOD_INDEX.get(m["start_period"], 0)
                    m_e = PERIOD_INDEX.get(m["end_period"], 0)
                    for p in assigned_periods:
                        if m_s <= PERIOD_INDEX[p] <= m_e:
                            violations.append({
                                "rule_id": "ROOM_MAINTENANCE_CLASH",
                                "entities": [sid, room_id],
                                "day": day,
                                "period": p,
                                "message": f"Room in maintenance on {day} {p} ({m.get('reason')})"
                            })

            # Room overlap
            for p in assigned_periods:
                slot = (day, p)
                if room_id not in room_slots:
                    room_slots[room_id] = {}
                if slot in room_slots[room_id]:
                    violations.append({
                        "rule_id": "ROOM_OVERLAP",
                        "entities": [sid, room_slots[room_id][slot], room_id],
                        "day": day,
                        "period": p,
                        "message": f"Room {room_id} booked for both {sid} and {room_slots[room_id][slot]}"
                    })
                else:
                    room_slots[room_id][slot] = sid

        # Fixed slot check (Hard Constraint 12)
        fixed = session.get("fixed_slot")
        if fixed and (fixed.get("day") != day or fixed.get("start_period") != start_p):
            violations.append({
                "rule_id": "FIXED_SLOT_VIOLATED",
                "entities": [sid],
                "day": day,
                "period": start_p,
                "message": f"Fixed slot violated for {sid}"
            })

        # Elective basket sync (Hard Constraint 4)
        b_id = session.get("basket_id")
        if b_id:
            if b_id not in basket_slots:
                basket_slots[b_id] = (day, start_p)
            else:
                exp_d, exp_p = basket_slots[b_id]
                if day != exp_d or start_p != exp_p:
                    violations.append({
                        "rule_id": "ELECTIVE_BASKET_DESYNC",
                        "entities": [sid, b_id],
                        "day": day,
                        "period": start_p,
                        "message": f"Basket {b_id} desynchronized: expected {exp_d} {exp_p}"
                    })

        # Faculty checks (Hard Constraints 2, 8, 11)
        for fid in session.get("faculty_ids", []):
            fac = faculty_by_id.get(fid)
            if not fac:
                continue
            if fid not in faculty_slots:
                faculty_slots[fid] = {}
            if fid not in fac_daily_hours:
                fac_daily_hours[fid] = {}
            fac_daily_hours[fid][day] = fac_daily_hours[fid].get(day, 0) + duration

            for un in fac.get("unavailable_slots", []):
                if un.get("day") == day and un.get("period") in assigned_periods:
                    violations.append({
                        "rule_id": "FACULTY_UNAVAILABLE",
                        "entities": [sid, fid],
                        "day": day,
                        "period": un.get("period"),
                        "message": f"Faculty {fid} unavailable on {day} {un.get('period')}"
                    })

            for p in assigned_periods:
                slot = (day, p)
                if slot in faculty_slots[fid]:
                    violations.append({
                        "rule_id": "FACULTY_OVERLAP",
                        "entities": [sid, faculty_slots[fid][slot], fid],
                        "day": day,
                        "period": p,
                        "message": f"Faculty {fid} clash at {day} {p}"
                    })
                else:
                    faculty_slots[fid][slot] = sid

        # Student group checks (Hard Constraint 3)
        for gid in session.get("group_ids", []):
            if gid not in group_slots:
                group_slots[gid] = {}
            for p in assigned_periods:
                slot = (day, p)
                if slot in group_slots[gid]:
                    prev_sid = group_slots[gid][slot]
                    prev_sess = sessions_by_id.get(prev_sid, {})
                    if not (b_id and prev_sess.get("basket_id") == b_id):
                        violations.append({
                            "rule_id": "STUDENT_GROUP_OVERLAP",
                            "entities": [sid, prev_sid, gid],
                            "day": day,
                            "period": p,
                            "message": f"Student group {gid} clash at {day} {p}"
                        })
                else:
                    group_slots[gid][slot] = sid

    # Missing sessions
    for sid in sessions_by_id:
        if sid not in scheduled_sessions:
            violations.append({
                "rule_id": "MISSING_SESSION",
                "entities": [sid],
                "day": None,
                "period": None,
                "message": f"Session {sid} not scheduled"
            })

    # Faculty daily limits
    for fid, d_map in fac_daily_hours.items():
        limit = faculty_by_id.get(fid, {}).get("daily_limit", 4)
        for d, hrs in d_map.items():
            if hrs > limit:
                violations.append({
                    "rule_id": "FACULTY_DAILY_LIMIT_EXCEEDED",
                    "entities": [fid],
                    "day": d,
                    "period": None,
                    "message": f"Faculty {fid} teaching {hrs} hrs > limit {limit} on {d}"
                })

    return violations

