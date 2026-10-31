"""
Pure Python Time Grid rules for CIT Campus Scheduling Platform.
No database or framework imports allowed.
"""

from typing import List, Dict, Tuple

DAYS: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

# Periods P1 to P9 (Academic teaching) + Lunch Break (between P5 and P6) + Event Periods P10 to P13
TEACHING_PERIODS: List[str] = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9"]
EVENT_PERIODS: List[str] = ["P10", "P11", "P12", "P13"]
ALL_PERIODS: List[str] = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10", "P11", "P12", "P13"]

PERIODS: List[str] = ALL_PERIODS
PERIOD_INDEX: Dict[str, int] = {p: i for i, p in enumerate(PERIODS)}
LUNCH_PERIOD: str = "P5" # 1-hour protected lunch break between P5 and P6

# Legal start periods per duration for regular classes
LEGAL_STARTS_BY_DURATION: Dict[int, List[str]] = {
    1: ["P1", "P2", "P3", "P4", "P6", "P7", "P8", "P9"],
    2: ["P1", "P2", "P3", "P6", "P7", "P8"],
    3: ["P2", "P6"]
}

# Legal start periods for events (including evening event periods P10 to P13)
EVENT_STARTS_BY_DURATION: Dict[int, List[str]] = {
    1: ["P1", "P2", "P3", "P4", "P6", "P7", "P8", "P9", "P10", "P11", "P12", "P13"],
    2: ["P1", "P2", "P3", "P6", "P7", "P8", "P10", "P11", "P12"],
    3: ["P2", "P6", "P10", "P11"]
}

def is_event_only_period(period: str) -> bool:
    """Returns True if the period is strictly reserved for events (P10 to P13)."""
    return period in EVENT_PERIODS

def is_teaching_period(period: str) -> bool:
    """Returns True if the period is available for academic teaching."""
    return period in TEACHING_PERIODS and period != LUNCH_PERIOD

def get_slot_periods(start_period: str, duration: int) -> List[str]:
    """Returns the list of periods occupied by a start_period and duration."""
    if start_period not in PERIOD_INDEX:
        return []
    idx = PERIOD_INDEX[start_period]
    if idx + duration > len(PERIODS):
        return []
    return [PERIODS[idx + i] for i in range(duration)]

def is_valid_start_period(start_period: str, duration: int, is_event: bool = False) -> bool:
    """Checks if a start period is legal for a given duration."""
    if not is_event:
        # Regular classes cannot be in P10-P13 or Lunch P5
        legal_starts = LEGAL_STARTS_BY_DURATION.get(duration)
        if legal_starts is None:
            periods = get_slot_periods(start_period, duration)
            return len(periods) == duration and (LUNCH_PERIOD not in periods) and not any(is_event_only_period(p) for p in periods)
        return start_period in legal_starts
    else:
        # Events can use event periods P10-P13
        legal_starts = EVENT_STARTS_BY_DURATION.get(duration)
        if legal_starts is None:
            periods = get_slot_periods(start_period, duration)
            return len(periods) == duration and (LUNCH_PERIOD not in periods)
        return start_period in legal_starts

def get_all_legal_slots(duration: int, is_event: bool = False) -> List[Tuple[str, str]]:
    """Returns all (day, start_period) pairs valid for duration."""
    slots = []
    starts = EVENT_STARTS_BY_DURATION.get(duration, []) if is_event else LEGAL_STARTS_BY_DURATION.get(duration, [])
    for d in DAYS:
        for p in starts:
            slots.append((d, p))
    return slots
