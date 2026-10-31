import { User, DashboardSummary, Booking, Proposal, Exam, Faculty, Room } from './types';

const BASE_URL = '/api/v1';

export async function loginApi(email: string, password: string): Promise<{ access_token: string; user: User }> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed');
  }
  return res.json();
}

export async function getMeApi(token?: string): Promise<User> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/auth/me`, { headers });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const res = await fetch(`${BASE_URL}/dashboard/summary`);
    if (res.ok) return res.json();
  } catch (e) {
    console.warn('API error, using default summary', e);
  }
  return {
    sessions_scheduled: 189,
    total_rooms: 27,
    room_utilisation_pct: 82,
    spectra_requests_total: 25,
    pending_approvals_count: 4,
    midsem_exams_count: 41,
    has_conflicts: false,
    conflicts_count: 0
  };
}

export async function getActiveSchedule(): Promise<any> {
  try {
    const res = await fetch(`${BASE_URL}/schedules/active`);
    if (res.ok) return res.json();
  } catch (e) {}

  // Fallback to static public export
  const res = await fetch('/schedule.json');
  if (!res.ok) throw new Error('Failed to load active schedule');
  return res.json();
}

export async function getCitDataset(): Promise<{
  institute: string;
  rooms: Room[];
  faculty: Faculty[];
  exams: Exam[];
  sessions: any[];
  student_groups: any[];
  maintenance_windows: any[];
  booking_requests: any[];
}> {
  try {
    const res = await fetch('/cit_public.json');
    if (res.ok) return res.json();
  } catch (e) {}
  
  const res = await fetch('/data/cit_public.json');
  return res.json();
}

export async function parseBookingAi(text: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/bookings/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail?.message || 'AI parsing unavailable');
  }
  return res.json();
}

export async function createBooking(data: any, token?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function getBookings(token?: string): Promise<Booking[]> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/bookings`, { headers });
    if (res.ok) return res.json();
  } catch (e) {}
  
  // Default mock booking dataset if offline
  return [
    {
      id: 'BR01',
      title: 'Spectra - Inaugural Keynote',
      event_type: 'spectra_event',
      priority: 3,
      room_id: 'AUD1',
      day: 'Thursday',
      start_period: 'P6',
      duration: 3,
      expected_attendance: 250,
      requester_id: 'USR04',
      requester_name: 'Club Rep (Cultural Council)',
      status: 'pending',
      created_at: new Date().toISOString()
    },
    {
      id: 'BR02',
      title: 'ECE Department Workshop on RISC-V',
      event_type: 'department_event',
      priority: 5,
      room_id: 'LH102',
      day: 'Wednesday',
      start_period: 'P2',
      duration: 2,
      expected_attendance: 75,
      requester_id: 'USR02',
      requester_name: 'Dr. Coordinator',
      status: 'pending',
      created_at: new Date().toISOString()
    },
    {
      id: 'BR03',
      title: 'Distinguished Alumni Guest Lecture',
      event_type: 'guest_lecture',
      priority: 4,
      room_id: 'LH101',
      day: 'Tuesday',
      start_period: 'P7',
      duration: 2,
      expected_attendance: 110,
      requester_id: 'USR03',
      requester_name: 'Dr. Sharma',
      status: 'pending',
      created_at: new Date().toISOString()
    }
  ];
}

export async function decideBooking(id: string, decision: 'approve' | 'reject', token?: string, reason?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/bookings/${id}/decision`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ decision, reason })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Decision failed');
  }
  return res.json();
}

export async function getPendingProposals(token?: string): Promise<Proposal[]> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/proposals/pending`, { headers });
    if (res.ok) return res.json();
  } catch (e) {}

  // Fallback proposal simulating sample disruption
  return [
    {
      id: 'PROP_DISR_01',
      disruption_id: 'DISR_2025_001',
      base_version_id: 'v1',
      status: 'pending_approval',
      new_assignments: [],
      moved_count: 45,
      moved_details: [
        {
          session_id: 'SES001',
          from_slot: 'Monday P1',
          from_room: 'LH101',
          to_slot: 'Monday P3',
          to_room: 'LH102',
          reason: 'Emergency room maintenance in LH101'
        },
        {
          session_id: 'SES002',
          from_slot: 'Tuesday P2',
          from_room: 'LH101',
          to_slot: 'Tuesday P4',
          to_room: 'LH201',
          reason: 'LH101 HVAC overhaul'
        },
        {
          session_id: 'SES015',
          from_slot: 'Wednesday P6',
          from_room: 'LAB_CHEM',
          to_slot: 'Thursday P6',
          to_room: 'LAB_CHEM',
          reason: 'Faculty medical absence (Dr. Arvind Sharma)'
        }
      ],
      created_at: new Date().toISOString()
    }
  ];
}

export async function approveProposal(id: string, base_version_id: string, token?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/proposals/${id}/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ base_version_id })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Approval failed');
  }
  return res.json();
}

export async function demoReset(confirmation: string, token?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/admin/demo-reset`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ confirmation })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Reset failed');
  }
  return res.json();
}
