"""
Pure Python Priority engine for CIT Campus Scheduling Platform.
Handles booking priorities, displacement rules, and alternative generation.
Normalizes singular and plural naming.
No database or framework imports allowed.
"""

from typing import List, Dict, Any, Optional

DEFAULT_PRIORITY_ORDER = [
    "exams",
    "regular_classes",
    "institute_events",
    "guest_lectures",
    "department_events",
    "club_events"
]

NORMALIZATION = {
    "exam": "exams",
    "exams": "exams",
    "regular_class": "regular_classes",
    "regular_classes": "regular_classes",
    "class": "regular_classes",
    "institute_event": "institute_events",
    "institute_events": "institute_events",
    "guest_lecture": "guest_lectures",
    "guest_lectures": "guest_lectures",
    "department_event": "department_events",
    "department_events": "department_events",
    "club_event": "club_events",
    "club_events": "club_events"
}

def get_priority_rank(event_type: str, custom_order: Optional[List[str]] = None) -> int:
    """
    Returns rank of event type. Lower integer index = higher priority.
    Returns 999 if type not found.
    """
    normalized = NORMALIZATION.get(event_type.lower().strip(), event_type.lower().strip())
    order = custom_order or DEFAULT_PRIORITY_ORDER
    try:
        return order.index(normalized)
    except ValueError:
        return 999

def has_higher_priority(type_a: str, type_b: str, custom_order: Optional[List[str]] = None) -> bool:
    """Returns True if type_a has higher priority than type_b."""
    return get_priority_rank(type_a, custom_order) < get_priority_rank(type_b, custom_order)

def can_displace(request_type: str, existing_type: str, custom_order: Optional[List[str]] = None) -> bool:
    """A higher priority event can displace a lower priority approved booking."""
    return has_higher_priority(request_type, existing_type, custom_order)
