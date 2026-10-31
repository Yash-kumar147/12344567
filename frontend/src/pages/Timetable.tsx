import React, { useState, useEffect } from 'react';
import { 
  Calendar, Filter, Users, Armchair, AlertCircle, Layers, CheckCircle2, 
  Edit3, Send, Clock, ArrowRight, ShieldCheck, AlertTriangle, X 
} from 'lucide-react';
import { 
  getActiveSchedule, modifyTimetableSession, 
  createScheduleChangeRequest, getScheduleChangeRequests, decideScheduleChangeRequest 
} from '../api';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [
  { id: 'P1', label: 'P1', time: '08:00 - 09:00', isLunch: false, isEventOnly: false },
  { id: 'P2', label: 'P2', time: '09:00 - 10:00', isLunch: false, isEventOnly: false },
  { id: 'P3', label: 'P3', time: '10:00 - 11:00', isLunch: false, isEventOnly: false },
  { id: 'P4', label: 'P4', time: '11:00 - 12:00', isLunch: false, isEventOnly: false },
  { id: 'P5', label: 'P5', time: '12:00 - 13:00', isLunch: false, isEventOnly: false },
  { id: 'LUNCH', label: 'Lunch Break (1 hr)', time: '13:00 - 14:00', isLunch: true, isEventOnly: false },
  { id: 'P6', label: 'P6', time: '14:00 - 15:00', isLunch: false, isEventOnly: false },
  { id: 'P7', label: 'P7', time: '15:00 - 16:00', isLunch: false, isEventOnly: false },
  { id: 'P8', label: 'P8', time: '16:00 - 17:00', isLunch: false, isEventOnly: false },
  { id: 'P9', label: 'P9', time: '17:00 - 18:00', isLunch: false, isEventOnly: false },
  { id: 'P10', label: 'P10 (Events Only)', time: '18:00 - 19:00', isLunch: false, isEventOnly: true },
  { id: 'P11', label: 'P11 (Events Only)', time: '19:00 - 20:00', isLunch: false, isEventOnly: true },
  { id: 'P12', label: 'P12 (Events Only)', time: '20:00 - 21:00', isLunch: false, isEventOnly: true },
  { id: 'P13', label: 'P13 (Events Only)', time: '21:00 - 22:00', isLunch: false, isEventOnly: true }
];

export const Timetable: React.FC = () => {
  const { user, token } = useAuth();
  const [filterType, setFilterType] = useState<'group' | 'faculty' | 'room'>('group');
  const [selectedEntity, setSelectedEntity] = useState<string>('Y1-A');
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [version, setVersion] = useState<string>('v1.0');
  const [loading, setLoading] = useState(true);

  // Task 4: Schedule Change Requests State
  const [scheduleChangeRequests, setScheduleChangeRequests] = useState<any[]>([]);

  // Modals State
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Modify Timetable Form (Admin & Coordinator)
  const [modSessionId, setModSessionId] = useState('SES001');
  const [modDay, setModDay] = useState('Monday');
  const [modPeriod, setModPeriod] = useState('P1');
  const [modRoom, setModRoom] = useState('LH101');

  // Faculty Schedule Change Form
  const [reqSessionId, setReqSessionId] = useState('SES001');
  const [reqCourseCode, setReqCourseCode] = useState('BS104');
  const [reqDay, setReqDay] = useState('Friday');
  const [reqPeriod, setReqPeriod] = useState('P2');
  const [reqRoom, setReqRoom] = useState('LH101');
  const [reqReason, setReqReason] = useState('Attending academic symposium');

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadSchedule();
    loadRequests();
  }, [token]);

  const loadSchedule = () => {
    getActiveSchedule()
      .then(data => {
        setScheduleData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const loadRequests = () => {
    getScheduleChangeRequests(token || undefined).then(setScheduleChangeRequests);
  };

  const groups = ['Y1-A', 'Y1-B', 'Y1-C', 'Y1-D', 'Y2-CSE', 'Y2-ECE', 'Y2-EEE', 'Y2-ME', 'Y2-CE', 'Y3-CSE', 'Y3-ECE', 'Y3-EEE', 'Y3-ME', 'Y3-CE'];
  const rooms = ['LH101', 'LH102', 'CR101', 'CR102', 'SH1', 'AUD1', 'LAB_CS1', 'LAB_PHY', 'LAB_CHEM', 'LAB_ECE'];
  const faculty = ['FAC01', 'FAC02', 'FAC03', 'FAC04', 'FAC05', 'FAC06', 'FAC07', 'FAC08'];

  // Check assignments
  const getCellContent = (day: string, periodId: string) => {
    if (periodId === 'LUNCH') {
      return { type: 'lunch', label: 'LUNCH BREAK (1 HR)', duration: 1 };
    }
    if (['P10', 'P11', 'P12', 'P13'].includes(periodId)) {
      return { type: 'event_only', label: 'Events Only Slot', course: 'Reserved for Spectra Events', room: 'Campus Venues', duration: 1 };
    }
    if (scheduleData?.assignments) {
      const match = scheduleData.assignments.find((a: any) => a.day === day && a.start_period === periodId);
      if (match) {
        return {
          type: 'class',
          session_id: match.session_id,
          room: match.room_id,
          course: match.session_id.startsWith('SES') ? `Course ${match.session_id.slice(-2)}` : match.session_id,
          duration: 1
        };
      }
    }
    if (periodId === 'P2' && (day === 'Monday' || day === 'Thursday')) {
      return { type: 'lab', course: 'Engineering Lab', room: 'LAB_PHY', duration: 3 };
    }
    if (periodId === 'P1') {
      return { type: 'class', course: 'Maths 101', room: 'CR101', duration: 1 };
    }
    if (periodId === 'P6' && day === 'Tuesday') {
      return { type: 'class', course: 'Computer Sci', room: 'LH101', duration: 1 };
    }
    return null;
  };

  // Task 3: Admin & Coordinator can modify timetable
  const handleModifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await modifyTimetableSession({
        session_id: modSessionId,
        day: modDay,
        start_period: modPeriod,
        room_id: modRoom
      }, token || undefined);
      setNotification({
        text: `Timetable updated: Session ${modSessionId} relocated to ${modDay} ${modPeriod} (${modRoom})!`,
        type: 'success'
      });
      setShowModifyModal(false);
      loadSchedule();
    } catch (err: any) {
      setNotification({ text: err.message, type: 'error' });
    }
  };

  // Task 4: Any faculty can request a schedule change
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createScheduleChangeRequest({
        session_id: reqSessionId,
        course_code: reqCourseCode,
        requested_day: reqDay,
        requested_period: reqPeriod,
        requested_room_id: reqRoom,
        reason: reqReason
      }, token || undefined);
      setNotification({
        text: `Schedule change request for ${reqSessionId} submitted successfully! Awaiting review.`,
        type: 'success'
      });
      setShowRequestModal(false);
      loadRequests();
    } catch (err: any) {
      setNotification({ text: err.message, type: 'error' });
    }
  };

  // Task 4: Admin or Deputy Coordinator can approve change and update timetable
  const handleDecideRequest = async (id: string, decision: 'approve' | 'reject') => {
    try {
      await decideScheduleChangeRequest(id, decision, `Reviewed by ${user?.name}`, token || undefined);
      setNotification({
        text: `Schedule change request ${decision === 'approve' ? 'approved and timetable updated' : 'rejected'}!`,
        type: 'success'
      });
      loadRequests();
      loadSchedule();
    } catch (err: any) {
      setNotification({ text: err.message, type: 'error' });
    }
  };

  const isAuthority = user?.role === 'admin' || user?.role === 'coordinator';
  const pendingRequests = scheduleChangeRequests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-line shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-brand font-semibold text-xs uppercase tracking-wider">
            <Calendar className="w-4 h-4" /> Academic Timetable
          </div>
          <h1 className="text-xl font-bold text-ink mt-1">CIT Campus Master Schedule</h1>
          <p className="text-xs text-muted">Weekly timetable grid with automated clash detection and room routing.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Action buttons based on Role */}
          {isAuthority && (
            <button
              onClick={() => setShowModifyModal(true)}
              className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" /> Modify Timetable
            </button>
          )}

          {user?.role === 'faculty' && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Request Schedule Change
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-ok-bg text-ok-text px-3 py-1.5 rounded-xl text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>0 Violations</span>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
          notification.type === 'success' ? 'bg-ok-bg text-ok-text' : 'bg-bad-bg text-bad-text'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Task 4: Admin or Deputy Coordinator Review Panel */}
      {isAuthority && pendingRequests.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
              <Clock className="w-4 h-4 text-amber-700" />
              <span>Pending Faculty Schedule Change Requests ({pendingRequests.length})</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
              Task 4 Workflow: Admin & Deputy Coordinator Review
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-white p-4 rounded-xl border border-amber-200 text-xs space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-ink flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-teal-50 text-brand-dark font-mono text-[11px]">
                      {req.session_id}
                    </span>
                    <span>{req.faculty_name}</span>
                  </div>
                  <span className="text-[10px] text-muted font-medium">({req.course_code})</span>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-medium">
                    {req.current_day} {req.current_period} ({req.current_room_id})
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted shrink-0" />
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold">
                    {req.requested_day} {req.requested_period} ({req.requested_room_id})
                  </span>
                </div>

                <div className="text-muted text-[11px]">
                  <strong>Reason:</strong> {req.reason}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-line/60">
                  <button
                    onClick={() => handleDecideRequest(req.id, 'approve')}
                    className="px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg font-bold text-[11px] transition-colors shadow-xs"
                  >
                    Approve & Update Timetable
                  </button>
                  <button
                    onClick={() => handleDecideRequest(req.id, 'reject')}
                    className="px-3 py-1.5 bg-white border border-line hover:bg-gray-100 text-ink rounded-lg font-medium text-[11px] transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task 4: Faculty My Requests Status Panel */}
      {user?.role === 'faculty' && scheduleChangeRequests.length > 0 && (
        <div className="bg-card border border-line rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <Send className="w-4 h-4 text-brand" /> My Schedule Change Requests ({scheduleChangeRequests.length})
            </h3>
          </div>

          <div className="space-y-2">
            {scheduleChangeRequests.map((r) => (
              <div key={r.id} className="p-3 bg-page rounded-xl border border-line text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-ink">{r.course_code || r.session_id}: {r.requested_day} {r.requested_period} ({r.requested_room_id})</div>
                  <div className="text-muted text-[11px] mt-0.5">Reason: {r.reason}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${
                  r.status === 'approved' ? 'bg-ok-bg text-ok-text' :
                  r.status === 'pending' ? 'bg-wait-bg text-wait-text' :
                  'bg-bad-bg text-bad-text'
                }`}>
                  {r.status === 'approved' ? 'Approved & Applied' : r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Notice Banner */}
      <div className="bg-card p-3 rounded-xl border border-line flex items-center justify-between text-xs text-muted">
        <div>
          <span className="font-bold text-ink">Permission Status: </span>
          {isAuthority ? (
            <span className="text-brand font-semibold">Authorized to create & modify timetable ({user?.role})</span>
          ) : (
            <span>Read-only timetable view (modifications restricted to Admin and Dept Coordinator)</span>
          )}
        </div>
        <span className="font-mono text-[11px] text-muted">Active Role: {user?.role || 'Guest'}</span>
      </div>

      {/* Filter Tabs & Entity Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-line">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted mr-2">Filter by:</span>
          <button
            onClick={() => { setFilterType('group'); setSelectedEntity('Y1-A'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filterType === 'group' ? 'bg-brand text-white' : 'bg-page text-muted hover:text-ink'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Student Group
          </button>
          <button
            onClick={() => { setFilterType('room'); setSelectedEntity('LH101'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filterType === 'room' ? 'bg-brand text-white' : 'bg-page text-muted hover:text-ink'
            }`}
          >
            <Armchair className="w-3.5 h-3.5" /> Room
          </button>
          <button
            onClick={() => { setFilterType('faculty'); setSelectedEntity('FAC01'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filterType === 'faculty' ? 'bg-brand text-white' : 'bg-page text-muted hover:text-ink'
            }`}
          >
            <Filter className="w-3.5 h-3.5" /> Faculty
          </button>
        </div>

        {/* Entity Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Select {filterType}:</span>
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="bg-page border border-line rounded-xl px-3 py-1.5 text-xs font-semibold text-ink outline-none focus:border-brand cursor-pointer"
          >
            {filterType === 'group' && groups.map(g => <option key={g} value={g}>{g}</option>)}
            {filterType === 'room' && rooms.map(r => <option key={r} value={r}>{r}</option>)}
            {filterType === 'faculty' && faculty.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Main Timetable Grid */}
      <div className="bg-card p-5 rounded-2xl border border-line shadow-sm overflow-x-auto">
        <table className="w-full text-center border-collapse min-w-[800px]">
          <thead>
            <tr className="text-xs font-bold text-muted border-b border-line bg-page">
              <th className="py-3 px-3 text-left w-24">Day</th>
              {PERIODS.map(p => (
                <th key={p.id} className={`py-3 px-2 ${
                  p.isLunch ? 'bg-amber-100/60 text-amber-900 border-x border-amber-200' :
                  p.isEventOnly ? 'bg-purple-50 text-purple-900 border-l border-purple-100' : ''
                }`}>
                  <div className="font-bold text-ink">{p.label}</div>
                  <div className="text-[10px] font-normal text-muted">{p.time}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-xs">
            {DAYS.map(day => (
              <tr key={day} className="hover:bg-teal-50/20 transition-colors">
                <td className="py-4 px-3 font-bold text-left text-ink bg-page/40">
                  {day}
                </td>
                {PERIODS.map(period => {
                  if (period.isLunch) {
                    return (
                      <td key={period.id} className="bg-amber-50/70 border-x border-amber-200 text-amber-900 font-bold text-[11px] p-2">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span>Lunch Break</span>
                          <span className="text-[10px] font-normal text-amber-700">1 Hour</span>
                        </div>
                      </td>
                    );
                  }

                  if (period.isEventOnly) {
                    return (
                      <td key={period.id} className="p-1 bg-purple-50/30 border-l border-purple-100/60">
                        <div className="p-2 rounded-xl bg-purple-100/70 border border-purple-200 text-purple-900 text-center">
                          <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Events Only</div>
                          <div className="text-[9px] text-purple-600 mt-0.5">Open for Spectra</div>
                        </div>
                      </td>
                    );
                  }

                  const cell = getCellContent(day, period.id);
                  if (!cell) {
                    return <td key={period.id} className="p-2 text-muted/40">—</td>;
                  }

                  if (cell.type === 'lab') {
                    return (
                      <td key={period.id} className="p-1">
                        <div 
                          onClick={() => {
                            if (isAuthority) {
                              setModSessionId(cell.session_id || 'SES001');
                              setModDay(day);
                              setModPeriod(period.id);
                              setShowModifyModal(true);
                            } else if (user?.role === 'faculty') {
                              setReqSessionId(cell.session_id || 'SES001');
                              setShowRequestModal(true);
                            }
                          }}
                          className={`p-2 rounded-xl bg-teal-100/90 border border-teal-300 text-brand-dark font-semibold shadow-xs ${
                            isAuthority || user?.role === 'faculty' ? 'cursor-pointer hover:scale-[1.02]' : ''
                          }`}
                        >
                          <div className="text-[11px] font-bold">{cell.course}</div>
                          <div className="text-[10px] text-muted flex items-center justify-center gap-1 mt-0.5">
                            <Armchair className="w-3 h-3" /> {cell.room} • 3 Hrs
                          </div>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td key={period.id} className="p-1">
                      <div 
                        onClick={() => {
                          if (isAuthority) {
                            setModSessionId(cell.session_id || 'SES001');
                            setModDay(day);
                            setModPeriod(period.id);
                            setShowModifyModal(true);
                          } else if (user?.role === 'faculty') {
                            setReqSessionId(cell.session_id || 'SES001');
                            setShowRequestModal(true);
                          }
                        }}
                        className={`p-2 rounded-xl bg-brand-tint border border-teal-200/60 text-brand-dark font-medium transition-transform ${
                          isAuthority || user?.role === 'faculty' ? 'cursor-pointer hover:scale-[1.02]' : ''
                        }`}
                      >
                        <div className="text-[11px] font-bold">{cell.course}</div>
                        <div className="text-[10px] text-muted flex items-center justify-center gap-1 mt-0.5">
                          <Armchair className="w-3 h-3" /> {cell.room}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Task 3 Modal: Modify Timetable (Admin & Coordinator) */}
      {showModifyModal && isAuthority && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card p-6 rounded-2xl border border-line max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-brand" />
                <h3 className="font-bold text-sm text-ink">Modify Timetable Session</h3>
              </div>
              <button onClick={() => setShowModifyModal(false)} className="text-muted hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleModifySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">Session ID to Relocate</label>
                <input
                  type="text"
                  value={modSessionId}
                  onChange={(e) => setModSessionId(e.target.value)}
                  required
                  placeholder="e.g. SES001"
                  className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">New Day</label>
                  <select
                    value={modDay}
                    onChange={(e) => setModDay(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">New Start Period</label>
                  <select
                    value={modPeriod}
                    onChange={(e) => setModPeriod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                  >
                    {PERIODS.filter(p => !p.isLunch && !p.isEventOnly).map(p => (
                      <option key={p.id} value={p.id}>{p.id} ({p.time})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">New Room / Venue</label>
                <select
                  value={modRoom}
                  onChange={(e) => setModRoom(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                >
                  {rooms.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModifyModal(false)}
                  className="px-4 py-2 border border-line rounded-xl text-ink hover:bg-page font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl font-bold shadow-sm"
                >
                  Apply Change to Master Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task 4 Modal: Request Schedule Change (Faculty) */}
      {showRequestModal && user?.role === 'faculty' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card p-6 rounded-2xl border border-line max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-brand" />
                <h3 className="font-bold text-sm text-ink">Request Schedule Change</h3>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="text-muted hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Session ID</label>
                  <input
                    type="text"
                    value={reqSessionId}
                    onChange={(e) => setReqSessionId(e.target.value)}
                    required
                    placeholder="e.g. SES001"
                    className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-muted font-medium mb-1">Course Code</label>
                  <input
                    type="text"
                    value={reqCourseCode}
                    onChange={(e) => setReqCourseCode(e.target.value)}
                    placeholder="e.g. BS104"
                    className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">Requested Day</label>
                  <select
                    value={reqDay}
                    onChange={(e) => setReqDay(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Requested Period</label>
                  <select
                    value={reqPeriod}
                    onChange={(e) => setReqPeriod(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                  >
                    {PERIODS.filter(p => !p.isLunch && !p.isEventOnly).map(p => (
                      <option key={p.id} value={p.id}>{p.id} ({p.time})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Preferred Room</label>
                <select
                  value={reqRoom}
                  onChange={(e) => setReqRoom(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                >
                  {rooms.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Reason for Rescheduling</label>
                <textarea
                  rows={2}
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  required
                  placeholder="e.g. Medical leave, academic symposium, lab instrument calibration..."
                  className="w-full p-2.5 rounded-xl border border-line bg-page outline-none focus:border-brand"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 border border-line rounded-xl text-ink hover:bg-page font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl font-bold shadow-sm"
                >
                  Submit Request to Admin / Coordinator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
