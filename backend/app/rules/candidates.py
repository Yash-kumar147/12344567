"""
Pure Python Candidate generators for rooms and slots.
Filters by room type, capacity, accessibility, room maintenance, faculty unavailability, and fixed slots.
No database or framework imports allowed.
"""

from typing import List, Dict, Any, Tuple
from app.rules.time_grid import get_all_legal_slots, get_slot_periods, PERIOD_INDEX

def get_candidate_rooms(session: Dict[str, Any], rooms: List[Dict[str, Any]], is_exam: bool = False) -> List[Dict[str, Any]]:
    """
    Returns valid candidate rooms for a session or exam.
    Checks capacity (halved for exams), room type compatibility, and accessibility.
    """
    required_type = session.get("room_type_required")
    min_capacity = session.get("min_capacity", 0)
    needs_accessible = session.get("needs_accessible", False)
    allowed_types = session.get("room_types_allowed") # Used for exams

    candidates = []
    for r in rooms:
        # Check capacity
        effective_capacity = r["capacity"] // 2 if is_exam else r["capacity"]
        if effective_capacity < min_capacity:
            continue

        # Check accessibility
        if needs_accessible and not r.get("accessible", False):
            continue

        # Check room type
        r_type = r.get("type")
        if allowed_types:
            if r_type not in allowed_types:
                continue
        elif required_type:
            if "lab" in required_type:
                # Specialized labs must match strictly
                if r_type != required_type:
                    continue
            elif required_type == "classroom":
                # Classrooms can be in classroom or lecture hall
                if r_type not in ["classroom", "lecture_hall"]:
                    continue
            elif required_type == "lecture_hall":
                if r_type not in ["lecture_hall", "auditorium"]:
                    continue
            else:
                if r_type != required_type:
                    continue

        candidates.append(r)
    return candidates

def get_candidate_slots(
    session: Dict[str, Any],
    faculty_by_id: Dict[str, Any],
    room_maintenance: List[Dict[str, Any]] = None,
    candidate_rooms: List[Dict[str, Any]] = None
) -> List[Tuple[str, str]]:
    """
    Returns legal (day, start_period) slots for a session.
    Respects fixed slots, duration rules, faculty unavailability,
    and ensures at least one candidate room is not in maintenance.
    """
    fixed = session.get("fixed_slot")
    if fixed:
        return [(fixed["day"], fixed["start_period"])]

    duration = session.get("duration", 1)
    all_slots = get_all_legal_slots(duration)
    faculty_ids = session.get("faculty_ids", [])
    maintenance = room_maintenance or []

    valid_slots = []
    for day, start_p in all_slots:
        periods = get_slot_periods(start_p, duration)
        
        # Check faculty unavailability
        fac_clash = False
        for fid in faculty_ids:
            fac = faculty_by_id.get(fid)
            if not fac:
                continue
            for un in fac.get("unavailable_slots", []):
                if un.get("day") == day and un.get("period") in periods:
                    fac_clash = True
                    break
            if fac_clash:
                break
        
        if fac_clash:
            continue

        # If candidate rooms provided, ensure at least ONE candidate room is free from maintenance
        if candidate_rooms:
            has_free_room = False
            for r in candidate_rooms:
                rid = r["id"]
                r_in_maint = False
                for m in maintenance:
                    if m["room_id"] == rid and m["day"] == day:
                        m_s = PERIOD_INDEX.get(m["start_period"], 0)
                        m_e = PERIOD_INDEX.get(m["end_period"], 0)
                        for p in periods:
                            if m_s <= PERIOD_INDEX[p] <= m_e:
                                r_in_maint = True
                                break
                    if r_in_maint:
                        break
                if not r_in_maint:
                    has_free_room = True
                    break
            if not has_free_room:
                continue

        valid_slots.append((day, start_p))

    return valid_slots
