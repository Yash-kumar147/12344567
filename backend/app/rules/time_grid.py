"""
Pure Python Time Grid rules for CIT Campus Scheduling Platform.
No database or framework imports allowed.
"""

from typing import List, Dict, Tuple

DAYS: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
PERIODS: List[str] = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9"]
PERIOD_INDEX: Dict[str, int] = {p: i for i, p in enumerate(PERIODS)}
LUNCH_PERIOD: str = "P5"
EVENT_PERIODS: List[str] = ["P10", "P11", "P12", "P13"]

# Legal start periods per duration
# Duration 1: P1, P2, P3, P4, P6, P7, P8, P9 (excludes P5)
# Duration 2: P1, P2, P3, P6, P7, P8 (cannot cross or overlap lunch P5)
# Duration 3: P2 (P2-P4), P6 (P6-P8)
LEGAL_STARTS_BY_DURATION: Dict[int, List[str]] = {
    1: ["P1", "P2", "P3", "P4", "P6", "P7", "P8", "P9"],
    2: ["P1", "P2", "P3", "P6", "P7", "P8"],
    3: ["P2", "P6"]
}

def get_slot_periods(start_period: str, duration: int) -> List[str]:
    """Returns the list of periods occupied by a start_period and duration."""
    if start_period not in PERIOD_INDEX:
        return []
    idx = PERIOD_INDEX[start_period]
    if idx + duration > len(PERIODS):
        return []
    return [PERIODS[idx + i] for i in range(duration)]

def is_valid_start_period(start_period: str, duration: int) -> bool:
    """Checks if a start period is legal for a given duration (cannot cross lunch P5)."""
    legal_starts = LEGAL_STARTS_BY_DURATION.get(duration)
    if legal_starts is None:
        # Generic check: periods must not include lunch
        periods = get_slot_periods(start_period, duration)
        return len(periods) == duration and (LUNCH_PERIOD not in periods)
    return start_period in legal_starts

def get_all_legal_slots(duration: int) -> List[Tuple[str, str]]:
    """Returns all (day, start_period) pairs valid for duration."""
    slots = []
    starts = LEGAL_STARTS_BY_DURATION.get(duration, [])
    for d in DAYS:
        for p in starts:
            slots.append((d, p))
    return slots

