#!/usr/bin/env python3
"""
CIT Campus Scheduling Platform - Official Authoritative Validator
Checks schedules against all 13 hard constraints and calculates soft constraint penalties.

Usage:
    python validator.py <schedule_json> [dataset_json] [--before <baseline_json>]
"""

import sys
import json
import argparse
from typing import Dict, List, Any, Tuple, Optional

PERIODS = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9"]
PERIOD_INDEX = {p: i for i, p in enumerate(PERIODS)}
LUNCH_PERIOD = "P5"
LEGAL_LAB_STARTS = {"P2", "P6"}

def validate_schedule(schedule_data: dict, dataset: dict, baseline_schedule: Optional[dict] = None, disruption_data: Optional[dict] = None) -> dict:
    dataset_copy = dict(dataset)
    sessions_list = list(dataset.get("sessions", []))
    if disruption_data:
        for d in disruption_data.get("disruptions", []):
            if d.get("type") == "new_session" and d.get("session"):
                new_s = d["session"]
                if not any(s["id"] == new_s["id"] for s in sessions_list):
                    sessions_list.append(new_s)
    dataset_copy["sessions"] = sessions_list

    rooms_by_id = {r["id"]: r for r in dataset_copy.get("rooms", [])}
    faculty_by_id = {f["id"]: f for f in dataset_copy.get("faculty", [])}
    groups_by_id = {g["id"]: g for g in dataset_copy.get("student_groups", [])}
    courses_by_code = {c["code"]: c for c in dataset_copy.get("courses", [])}
    sessions_by_id = {s["id"]: s for s in dataset_copy.get("sessions", [])}
    maintenance = dataset_copy.get("maintenance_windows", [])

    assignments = schedule_data.get("assignments") or []
    bookings = schedule_data.get("bookings") or []
    exams = schedule_data.get("exams") or []

    hard_violations = []
    soft_penalties = {
        "faculty_avoid_period": 0,
        "student_group_gap": 0,
        "group_over_6_hours": 0,
        "repeated_course_same_day": 0,
        "underutilized_room": 0,
        "class_in_p9": 0
    }

    # 1. Check every session scheduled exactly once
    scheduled_session_ids = set()
    for a in assignments:
        sid = a.get("session_id")
        if not sid or sid not in sessions_by_id:
            hard_violations.append({
                "rule": "UNKNOWN_SESSION",
                "message": f"Assignment contains unknown session ID: {sid}",
                "session_id": sid
            })
            continue
        if sid in scheduled_session_ids:
            hard_violations.append({
                "rule": "DUPLICATE_SESSION",
                "message": f"Session {sid} is scheduled more than once.",
                "session_id": sid
            })
        scheduled_session_ids.add(sid)

    # In rescheduling, new_session in disruption might add a session
    expected_sessions = set(sessions_by_id.keys())
    missing_sessions = expected_sessions - scheduled_session_ids
    if missing_sessions:
        for ms in missing_sessions:
            hard_violations.append({
                "rule": "MISSING_SESSION",
                "message": f"Session {ms} is not scheduled.",
                "session_id": ms
            })

    # Track usage: (day, period) -> entities
    faculty_slots: Dict[str, Dict[Tuple[str, str], str]] = {} # fac_id -> (day, period) -> session_id
    group_slots: Dict[str, Dict[Tuple[str, str], str]] = {}   # group_id -> (day, period) -> session_id
    room_slots: Dict[str, Dict[Tuple[str, str], str]] = {}    # room_id -> (day, period) -> entity_id
    faculty_daily_hours: Dict[str, Dict[str, int]] = {}      # fac_id -> day -> hours
    group_daily_hours: Dict[str, Dict[str, int]] = {}        # group_id -> day -> hours
    group_course_days: Dict[str, Dict[str, List[str]]] = {}  # group_id -> day -> list of course_codes

    basket_slots: Dict[str, Tuple[str, str]] = {} # basket_id -> (day, start_period)

    # Evaluate each assignment
    for a in assignments:
        sid = a.get("session_id")
        if sid not in sessions_by_id:
            continue
        session = sessions_by_id[sid]
        day = a.get("day")
        start_p = a.get("start_period")
        room_id = a.get("room_id")
        duration = session.get("duration", 1)

        # Validate period bounds
        if start_p not in PERIOD_INDEX:
            hard_violations.append({
                "rule": "INVALID_PERIOD",
                "message": f"Invalid start period {start_p} for session {sid}.",
                "session_id": sid, "day": day, "period": start_p
            })
            continue

        start_idx = PERIOD_INDEX[start_p]
        if start_idx + duration > len(PERIODS):
            hard_violations.append({
                "rule": "PERIOD_OVERFLOW",
                "message": f"Session {sid} with duration {duration} exceeds day periods.",
                "session_id": sid, "day": day, "period": start_p
            })
            continue

        assigned_periods = [PERIODS[start_idx + offset] for offset in range(duration)]

        # Check lunch & lab constraints (Hard Constraint 9)
        if LUNCH_PERIOD in assigned_periods:
            hard_violations.append({
                "rule": "LUNCH_PERIOD_VIOLATION",
                "message": f"Session {sid} runs during lunch period {LUNCH_PERIOD}.",
                "session_id": sid, "day": day, "period": LUNCH_PERIOD
            })
        if duration == 3 and start_p not in LEGAL_LAB_STARTS:
            hard_violations.append({
                "rule": "INVALID_LAB_SLOT",
                "message": f"3-hour lab session {sid} must start at P2 or P6, got {start_p}.",
                "session_id": sid, "day": day, "period": start_p
            })

        # Check room exists & capacity & type (Hard Constraints 5, 6, 7, 10)
        room = rooms_by_id.get(room_id)
        if not room:
            hard_violations.append({
                "rule": "ROOM_NOT_FOUND",
                "message": f"Room {room_id} assigned to session {sid} does not exist.",
                "session_id": sid, "room_id": room_id
            })
        else:
            # Capacity check
            min_cap = session.get("min_capacity", 0)
            if room["capacity"] < min_cap:
                hard_violations.append({
                    "rule": "INSUFFICIENT_ROOM_CAPACITY",
                    "message": f"Room {room_id} capacity ({room['capacity']}) < session {sid} requirement ({min_cap}).",
                    "session_id": sid, "room_id": room_id
                })

            # Room type match
            required_type = session.get("room_type_required")
            if required_type and required_type != room["type"]:
                # Classrooms can be hosted in lecture halls if capacity fits, but lab types must match strictly
                if "lab" in required_type or required_type != room["type"]:
                    hard_violations.append({
                        "rule": "ROOM_TYPE_MISMATCH",
                        "message": f"Session {sid} requires {required_type}, but room {room_id} is {room['type']}.",
                        "session_id": sid, "room_id": room_id
                    })

            # Accessibility check (Hard Constraint 10)
            if session.get("needs_accessible") and not room.get("accessible", False):
                hard_violations.append({
                    "rule": "ACCESSIBILITY_VIOLATION",
                    "message": f"Session {sid} requires accessible room, but room {room_id} is not accessible.",
                    "session_id": sid, "room_id": room_id
                })

            # Room maintenance window check (Hard Constraint 8)
            for m in maintenance:
                if m["room_id"] == room_id and m["day"] == day:
                    m_start = PERIOD_INDEX.get(m["start_period"], 0)
                    m_end = PERIOD_INDEX.get(m["end_period"], 0)
                    for p in assigned_periods:
                        p_idx = PERIOD_INDEX[p]
                        if m_start <= p_idx <= m_end:
                            hard_violations.append({
                                "rule": "ROOM_MAINTENANCE_CLASH",
                                "message": f"Room {room_id} is in maintenance on {day} {p} ({m.get('reason')}).",
                                "session_id": sid, "room_id": room_id, "day": day, "period": p
                            })

            # Room overlap check (Hard Constraint 5)
            for p in assigned_periods:
                slot_key = (day, p)
                if room_id not in room_slots:
                    room_slots[room_id] = {}
                if slot_key in room_slots[room_id]:
                    hard_violations.append({
                        "rule": "ROOM_OVERLAP",
                        "message": f"Room {room_id} is double-booked at {day} {p} by {sid} and {room_slots[room_id][slot_key]}.",
                        "session_id": sid, "room_id": room_id, "day": day, "period": p
                    })
                else:
                    room_slots[room_id][slot_key] = sid

            # Soft constraint: Room used below 40% capacity
            if min_cap > 0 and (min_cap / room["capacity"]) < 0.40:
                soft_penalties["underutilized_room"] += duration

        # Fixed slot check (Hard Constraint 12)
        fixed_slot = session.get("fixed_slot")
        if fixed_slot:
            if fixed_slot.get("day") != day or fixed_slot.get("start_period") != start_p:
                hard_violations.append({
                    "rule": "FIXED_SLOT_VIOLATED",
                    "message": f"Session {sid} fixed slot was {fixed_slot}, but placed at {day} {start_p}.",
                    "session_id": sid
                })

        # Elective basket synchronization (Hard Constraint 4)
        basket_id = session.get("basket_id")
        if basket_id:
            if basket_id not in basket_slots:
                basket_slots[basket_id] = (day, start_p)
            else:
                expected_day, expected_start = basket_slots[basket_id]
                if day != expected_day or start_p != expected_start:
                    hard_violations.append({
                        "rule": "ELECTIVE_BASKET_DESYNC",
                        "message": f"Session {sid} in basket {basket_id} is at {day} {start_p}, but basket runs at {expected_day} {expected_start}.",
                        "session_id": sid, "basket_id": basket_id
                    })

        # Check faculty clashes & availability & daily limit (Hard Constraints 2, 8, 11)
        for fid in session.get("faculty_ids", []):
            fac = faculty_by_id.get(fid)
            if not fac:
                continue
            if fid not in faculty_slots:
                faculty_slots[fid] = {}
            if fid not in faculty_daily_hours:
                faculty_daily_hours[fid] = {}
            faculty_daily_hours[fid][day] = faculty_daily_hours[fid].get(day, 0) + duration

            # Faculty unavailability check
            for un in fac.get("unavailable_slots", []):
                if un.get("day") == day and un.get("period") in assigned_periods:
                    hard_violations.append({
                        "rule": "FACULTY_UNAVAILABLE",
                        "message": f"Faculty {fid} is unavailable on {day} {un.get('period')}.",
                        "session_id": sid, "faculty_id": fid, "day": day, "period": un.get("period")
                    })

            # Faculty avoid preferences (Soft constraint)
            for av in fac.get("avoid_slots", []):
                if av.get("day") == day and av.get("period") in assigned_periods:
                    soft_penalties["faculty_avoid_period"] += 5

            # Faculty overlap check
            for p in assigned_periods:
                slot_key = (day, p)
                if slot_key in faculty_slots[fid]:
                    hard_violations.append({
                        "rule": "FACULTY_OVERLAP",
                        "message": f"Faculty {fid} has overlapping sessions at {day} {p}: {sid} and {faculty_slots[fid][slot_key]}.",
                        "session_id": sid, "faculty_id": fid, "day": day, "period": p
                    })
                else:
                    faculty_slots[fid][slot_key] = sid

        # Check student group clashes (Hard Constraint 3)
        for gid in session.get("group_ids", []):
            if gid not in group_slots:
                group_slots[gid] = {}
            if gid not in group_daily_hours:
                group_daily_hours[gid] = {}
            group_daily_hours[gid][day] = group_daily_hours[gid].get(day, 0) + duration

            if gid not in group_course_days:
                group_course_days[gid] = {}
            if day not in group_course_days[gid]:
                group_course_days[gid][day] = []
            group_course_days[gid][day].append(session.get("course_code"))

            for p in assigned_periods:
                slot_key = (day, p)
                if slot_key in group_slots[gid]:
                    prev_sid = group_slots[gid][slot_key]
                    prev_sess = sessions_by_id.get(prev_sid, {})
                    # Sessions in same elective basket run simultaneously and do not conflict
                    if not (basket_id and prev_sess.get("basket_id") == basket_id):
                        hard_violations.append({
                            "rule": "STUDENT_GROUP_OVERLAP",
                            "message": f"Student group {gid} has overlapping sessions at {day} {p}: {sid} and {prev_sid}.",
                            "session_id": sid, "group_id": gid, "day": day, "period": p
                        })
                else:
                    group_slots[gid][slot_key] = sid

        # Soft constraint: Class in P9
        if "P9" in assigned_periods:
            soft_penalties["class_in_p9"] += 2

    # Check faculty daily limits (Hard Constraint 11)
    for fid, days_map in faculty_daily_hours.items():
        daily_limit = faculty_by_id.get(fid, {}).get("daily_limit", 4)
        for day, hrs in days_map.items():
            if hrs > daily_limit:
                hard_violations.append({
                    "rule": "FACULTY_DAILY_LIMIT_EXCEEDED",
                    "message": f"Faculty {fid} teaches {hrs} hours on {day} (limit {daily_limit}).",
                    "faculty_id": fid, "day": day, "hours": hrs
                })

    # Check soft constraint: Student group daily hours > 6
    for gid, days_map in group_daily_hours.items():
        for day, hrs in days_map.items():
            if hrs > 6:
                soft_penalties["group_over_6_hours"] += (hrs - 6) * 10

    # Check soft constraint: Repeated course on same day for group
    for gid, days_map in group_course_days.items():
        for day, c_codes in days_map.items():
            counts = {}
            for c in c_codes:
                counts[c] = counts.get(c, 0) + 1
            for c, cnt in counts.items():
                if cnt > 1:
                    soft_penalties["repeated_course_same_day"] += (cnt - 1) * 3

    # Check soft constraint: Student group gaps
    for gid, slots_map in group_slots.items():
        for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]:
            occupied = [PERIOD_INDEX[p] for (d, p) in slots_map.keys() if d == day]
            if len(occupied) >= 2:
                occupied.sort()
                for i in range(len(occupied) - 1):
                    gap = occupied[i+1] - occupied[i] - 1
                    # Exclude lunch (P5 is index 4)
                    if gap > 0:
                        # Count periods in between that are not P5
                        in_between = [PERIODS[k] for k in range(occupied[i]+1, occupied[i+1])]
                        gap_count = sum(1 for p in in_between if p != LUNCH_PERIOD)
                        soft_penalties["student_group_gap"] += gap_count * 2

    # Evaluate Bookings (Hard Constraint 13)
    booking_score = 0
    for b in bookings:
        if b.get("status") != "approved":
            continue
        room_id = b.get("room_id")
        day = b.get("day")
        start_p = b.get("start_period")
        duration = b.get("duration", 1)
        start_idx = PERIOD_INDEX.get(start_p, 0)
        b_periods = [PERIODS[start_idx + off] for off in range(duration) if start_idx + off < len(PERIODS)]

        room = rooms_by_id.get(room_id)
        if room and room["capacity"] < b.get("expected_attendance", 0):
            hard_violations.append({
                "rule": "BOOKING_CAPACITY_INSUFFICIENT",
                "message": f"Approved booking {b.get('id')} exceeds room {room_id} capacity.",
                "booking_id": b.get("id"), "room_id": room_id
            })

        for p in b_periods:
            slot_key = (day, p)
            if room_id in room_slots and slot_key in room_slots[room_id]:
                hard_violations.append({
                    "rule": "BOOKING_CLASH",
                    "message": f"Approved booking {b.get('id')} overlaps with session {room_slots[room_id][slot_key]} in room {room_id} on {day} {p}.",
                    "booking_id": b.get("id"), "room_id": room_id, "day": day, "period": p
                })
        booking_score += (7 - b.get("priority", 6)) * 10

    # Evaluate Exams (Halved capacity)
    for ex in exams:
        room_id = ex.get("room_id")
        room = rooms_by_id.get(room_id)
        if room:
            effective_cap = room["capacity"] // 2
            if effective_cap < ex.get("expected_students", 0):
                hard_violations.append({
                    "rule": "EXAM_CAPACITY_HALVED_EXCEEDED",
                    "message": f"Exam {ex.get('id')} students ({ex.get('expected_students')}) exceeds halved capacity ({effective_cap}) of room {room_id}.",
                    "exam_id": ex.get("id"), "room_id": room_id
                })

    # Rescheduling diff if baseline provided
    moved_sessions = 0
    moved_details = []
    if baseline_schedule:
        base_map = {a["session_id"]: a for a in baseline_schedule.get("assignments", [])}
        for a in assignments:
            sid = a["session_id"]
            if sid in base_map:
                old = base_map[sid]
                if (old["day"] != a["day"] or old["start_period"] != a["start_period"] or old["room_id"] != a["room_id"]):
                    moved_sessions += 1
                    moved_details.append({
                        "session_id": sid,
                        "from": f"{old['day']} {old['start_period']} ({old['room_id']})",
                        "to": f"{a['day']} {a['start_period']} ({a['room_id']})"
                    })

    total_soft_penalty = sum(soft_penalties.values())
    is_valid = len(hard_violations) == 0

    return {
        "valid": is_valid,
        "hard_violations_count": len(hard_violations),
        "hard_violations": hard_violations,
        "soft_penalty": total_soft_penalty,
        "soft_penalties_breakdown": soft_penalties,
        "booking_score": booking_score,
        "moved_sessions_count": moved_sessions,
        "moved_sessions_details": moved_details if baseline_schedule else None
    }

def main():
    parser = argparse.ArgumentParser(description="Official Validator for CIT Campus Scheduling Platform")
    parser.add_argument("schedule", help="Path to generated schedule.json")
    parser.add_argument("dataset", nargs="?", default="data/cit_public.json", help="Path to cit_public.json")
    parser.add_argument("--before", dest="baseline", default=None, help="Path to baseline schedule.json for diff validation")
    parser.add_argument("--disruption", dest="disruption", default=None, help="Path to disruption.json for disruption validation")
    args = parser.parse_args()

    with open(args.schedule, "r", encoding="utf-8") as f:
        schedule_data = json.load(f)
    with open(args.dataset, "r", encoding="utf-8") as f:
        dataset_data = json.load(f)

    baseline_data = None
    if args.baseline:
        with open(args.baseline, "r", encoding="utf-8") as f:
            baseline_data = json.load(f)

    disruption_data = None
    if args.disruption:
        with open(args.disruption, "r", encoding="utf-8") as f:
            disruption_data = json.load(f)

    report = validate_schedule(schedule_data, dataset_data, baseline_data, disruption_data)

    print("=" * 60)
    print("CIT CAMPUS SCHEDULING PLATFORM - VALIDATION REPORT")
    print("=" * 60)
    print(f"Status:               {'VALID (PASSED)' if report['valid'] else 'INVALID (FAILED)'}")
    print(f"Hard Violations:      {report['hard_violations_count']}")
    print(f"Total Soft Penalty:   {report['soft_penalty']}")
    print("Soft Penalty Breakdown:")
    for k, v in report['soft_penalties_breakdown'].items():
        print(f"  - {k:25s}: {v}")
    if report.get('booking_score') is not None:
        print(f"Booking Score:        {report['booking_score']}")
    if args.baseline:
        print(f"Moved Sessions:       {report['moved_sessions_count']}")
    print("=" * 60)

    if not report['valid']:
        print("VIOLATIONS ENCOUNTERED:")
        for v in report['hard_violations'][:10]:
            print(f"  * [{v.get('rule')}] {v.get('message')}")
        if len(report['hard_violations']) > 10:
            print(f"  ... and {len(report['hard_violations']) - 10} more.")
        sys.exit(1)
    else:
        print("All 13 hard constraints satisfied with 0 violations!")
        sys.exit(0)

if __name__ == "__main__":
    main()
