"""
Pydantic v2 schemas for CIT Campus Scheduling Platform.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# Auth schemas
class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str # "admin", "coordinator", "faculty", "club_rep"
    department: Optional[str] = None
    faculty_id: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Booking schemas
class BookingParseRequest(BaseModel):
    text: str

class BookingDraft(BaseModel):
    title: str
    event_type: str # "institute_event", "guest_lecture", "department_event", "club_event"
    day: str
    start_time: str # "14:00"
    end_time: str   # "17:00"
    start_period: str # "P6"
    duration: int # 3
    room_type: str # "seminar_hall", "auditorium", etc.
    preferred_room_id: Optional[str] = None
    expected_attendance: int
    clarification_needed: Optional[str] = None

class BookingCreateRequest(BaseModel):
    title: str
    event_type: str
    room_id: str
    day: str
    start_period: str
    duration: int = 1
    expected_attendance: int
    requester_notes: Optional[str] = None

class BookingDecisionRequest(BaseModel):
    decision: str # "approve", "reject"
    reason: Optional[str] = None

# Disruption schemas
class DisruptionCreateRequest(BaseModel):
    description: str
    disruptions: List[Dict[str, Any]]

class ProposalApproveRequest(BaseModel):
    base_version_id: str

# Admin reset
class DemoResetRequest(BaseModel):
    confirmation: str # Must be "RESET_DEMO_DATA"

# Timetable & Faculty Schemas
class TimetableModifyRequest(BaseModel):
    session_id: str
    day: str
    start_period: str
    room_id: str
    reason: Optional[str] = "Timetable modified by academic authority"

class FacultyUnavailabilityRequest(BaseModel):
    day: str
    period: str
    is_unavailable: bool = True
    reason: Optional[str] = "Marked unavailable by administrator"

class ScheduleChangeRequestCreate(BaseModel):
    session_id: str
    course_code: Optional[str] = None
    requested_day: str
    requested_period: str
    requested_room_id: Optional[str] = None
    reason: str

class ScheduleChangeDecisionRequest(BaseModel):
    decision: str # "approve", "reject"
    reason: Optional[str] = None

