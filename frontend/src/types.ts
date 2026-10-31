export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'coordinator' | 'deputy_coordinator' | 'faculty' | 'club_rep';
  department?: string;
  faculty_id?: string;
}

export interface Assignment {
  session_id: string;
  day: string;
  start_period: string;
  room_id: string;
}

export interface Session {
  id: string;
  course_code: string;
  faculty_ids: string[];
  group_ids: string[];
  type: string;
  duration: number;
  room_type_required: string;
  min_capacity: number;
  needs_accessible?: boolean;
  basket_id?: string;
}

export interface Room {
  id: string;
  name: string;
  type: string;
  capacity: number;
  features: string[];
  accessible: boolean;
}

export interface Faculty {
  id: string;
  name: string;
  department: string;
  daily_limit: number;
  unavailable_slots: { day: string; period: string }[];
  avoid_slots: { day: string; period: string }[];
}

export interface StudentGroup {
  id: string;
  name: string;
  size: number;
  year: number;
  branch: string;
}

export interface Booking {
  id: string;
  title: string;
  event_type: string;
  priority: number;
  room_id: string;
  day: string;
  start_period: string;
  duration: number;
  expected_attendance: number;
  requester_id: string;
  requester_name?: string;
  status: 'pending' | 'approved' | 'rejected' | 'displaced' | 'cancelled';
  displacement_reason?: string;
  suggested_alternatives?: any[];
  created_at: string;
}

export interface Exam {
  exam_id: string;
  course_code: string;
  course_name: string;
  day: string;
  start_period: string;
  room_id: string;
  duration: number;
  expected_students: number;
}

export interface MovedSession {
  session_id: string;
  from_slot: string;
  from_room: string;
  to_slot: string;
  to_room: string;
  reason: string;
}

export interface Proposal {
  id: string;
  disruption_id: string;
  base_version_id: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  new_assignments: Assignment[];
  moved_details: MovedSession[];
  moved_count: number;
  created_at: string;
}

export interface DashboardSummary {
  sessions_scheduled: number;
  total_rooms: number;
  room_utilisation_pct: number;
  spectra_requests_total: number;
  pending_approvals_count: number;
  midsem_exams_count: number;
  has_conflicts: boolean;
  conflicts_count: number;
}

