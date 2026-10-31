import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, ArrowRight, AlertTriangle, 
  ShieldAlert, Layers, Calendar, Clock, UserCheck, Shield 
} from 'lucide-react';
import { 
  getBookings, decideBooking, getPendingProposals, approveProposal,
  getScheduleChangeRequests, decideScheduleChangeRequest 
} from '../api';
import { useAuth } from '../context/AuthContext';
import { Booking, Proposal } from '../types';

export const Approvals: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'bookings' | 'faculty_changes' | 'disruptions'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [facultyRequests, setFacultyRequests] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isAuthorized = user?.role === 'admin' || user?.role === 'coordinator' || user?.role === 'deputy_coordinator';

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    }
  }, [token, user]);

  const loadData = () => {
    getBookings(token || undefined)
      .then(bList => {
        if (Array.isArray(bList)) {
          setBookings(bList.filter(b => b && b.status === 'pending'));
        } else {
          setBookings([]);
        }
      })
      .catch(() => setBookings([]));

    getPendingProposals(token || undefined)
      .then(pList => {
        if (Array.isArray(pList)) {
          setProposals(pList);
        } else {
          setProposals([]);
        }
      })
      .catch(() => setProposals([]));

    getScheduleChangeRequests(token || undefined)
      .then(reqs => {
        if (Array.isArray(reqs)) {
          setFacultyRequests(reqs.filter((r: any) => r && r.status === 'pending'));
        } else {
          setFacultyRequests([]);
        }
      })
      .catch(() => setFacultyRequests([]));
  };

  const handleBookingDecision = async (id: string, decision: 'approve' | 'reject') => {
    setStatusMsg(null);
    try {
      await decideBooking(id, decision, token || undefined);
      setStatusMsg({ text: `Booking request ${decision}d successfully.`, type: 'success' });
      loadData();
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    }
  };

  const handleApproveProposal = async (proposal: Proposal) => {
    setStatusMsg(null);
    try {
      await approveProposal(proposal.id, proposal.base_version_id, token || undefined);
      setStatusMsg({ text: 'Rescheduling proposal approved and published to active schedule!', type: 'success' });
      loadData();
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    }
  };

  const handleFacultyDecision = async (id: string, decision: 'approve' | 'reject') => {
    setStatusMsg(null);
    try {
      await decideScheduleChangeRequest(id, decision, `Decision by ${user?.name || user?.role}`, token || undefined);
      setStatusMsg({ 
        text: `Faculty schedule change ${decision === 'approve' ? 'approved and timetable updated' : 'rejected'}!`, 
        type: 'success' 
      });
      loadData();
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    }
  };

  // Restrict view if neither admin nor coordinator
  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-card p-8 rounded-3xl border border-line text-center shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-ink">Administrative & Coordinator Access Only</h2>
        <p className="text-xs text-muted leading-relaxed">
          Pending requests and schedule approvals are restricted to <strong>Administrators</strong> and <strong>Department Coordinators</strong>.
          You are currently logged in with the <span className="font-semibold text-ink uppercase">[{user?.role || 'Guest'}]</span> role.
        </p>
        <div className="pt-2 text-[11px] text-muted italic">
          Please switch to the Dean (admin@cit.edu) or Dept Coordinator (coord@cit.edu) demo account in the top right to access approvals.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-card p-5 rounded-2xl border border-line shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand font-semibold text-xs uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" /> Central Approval Portal
          </div>
          <h1 className="text-xl font-bold text-ink mt-1">Pending Requests & Approvals</h1>
          <p className="text-xs text-muted">
            Verification queue: Spectra venue requests, faculty timetable changes, and disruption diffs.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap items-center bg-page p-1 rounded-xl border border-line text-xs font-semibold">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-3.5 py-2 rounded-lg transition-colors ${
              activeTab === 'bookings' ? 'bg-brand text-white shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            Venue Requests ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('faculty_changes')}
            className={`px-3.5 py-2 rounded-lg transition-colors ${
              activeTab === 'faculty_changes' ? 'bg-brand text-white shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            Faculty Changes ({facultyRequests.length})
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('disruptions')}
              className={`px-3.5 py-2 rounded-lg transition-colors ${
                activeTab === 'disruptions' ? 'bg-brand text-white shadow-xs' : 'text-muted hover:text-ink'
              }`}
            >
              Disruptions ({proposals.length})
            </button>
          )}
        </div>
      </div>

      {/* Admin Unilateral Authority Notice */}
      {user?.role === 'admin' && (
        <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200 text-xs text-brand-dark flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-brand shrink-0" />
            <span>
              <strong>Admin Authority:</strong> As Administrator (Dean), you can approve any venue booking directly on your sole authority without requiring anyone else's permission.
            </span>
          </div>
          <span className="text-[10px] bg-brand text-white font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
            Unilateral Authority
          </span>
        </div>
      )}

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          statusMsg.type === 'success' ? 'bg-ok-bg text-ok-text' : 'bg-bad-bg text-bad-text'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Tab 1: Venue Bookings */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {bookings.map((b) => {
            const rawType = b.event_type || (b as any).type || 'Event';
            const displayType = String(rawType).replace(/_/g, ' ');
            return (
              <div key={b.id} className="bg-card p-5 rounded-2xl border border-line shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-ink">{b.title || 'Venue Booking Request'}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-wait-bg text-wait-text capitalize">
                      {displayType}
                    </span>
                    {(b.requester_id === user?.id || (b as any).requester === user?.name) && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-brand-dark">
                        Your Request (Admin Self-Approval Permitted)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-1.5 flex flex-wrap items-center gap-4">
                    <span><strong>Day:</strong> {b.day || 'N/A'}</span>
                    <span><strong>Time:</strong> {b.start_period || 'N/A'} ({b.duration || 1}h)</span>
                    <span><strong>Venue:</strong> {b.room_id || 'N/A'}</span>
                    <span><strong>Attendance:</strong> {b.expected_attendance || 'N/A'} students</span>
                    <span><strong>Requester:</strong> {b.requester_name || b.requester_id || (b as any).requester || 'User'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {user?.role === 'admin' ? (
                    <>
                      <button
                        onClick={() => handleBookingDecision(b.id, 'approve')}
                        className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                      >
                        Approve Booking
                      </button>
                      <button
                        onClick={() => handleBookingDecision(b.id, 'reject')}
                        className="px-4 py-2 bg-white border border-line hover:bg-gray-100 text-ink rounded-xl text-xs font-semibold transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-muted italic bg-page px-3 py-1.5 rounded-xl border border-line">
                      Admin ratification required
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {bookings.length === 0 && (
            <div className="bg-card p-12 text-center rounded-2xl border border-line text-muted text-xs">
              No pending venue bookings requiring approval.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Faculty Schedule Change Requests (Task 4) */}
      {activeTab === 'faculty_changes' && (
        <div className="space-y-4">
          {facultyRequests.map((req) => (
            <div key={req.id} className="bg-card p-5 rounded-2xl border border-line shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-teal-50 text-brand-dark font-bold text-[11px]">
                    {req.course_code || req.session_id}
                  </span>
                  <span className="text-sm font-bold text-ink">{req.faculty_name}</span>
                  <span className="text-xs text-muted">({req.faculty_id})</span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-800">
                    <span className="font-bold">Current:</span> {req.current_day} {req.current_period} ({req.current_room_id})
                  </div>
                  <ArrowRight className="w-4 h-4 text-brand" />
                  <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-800">
                    <span className="font-bold">Requested:</span> {req.requested_day} {req.requested_period} ({req.requested_room_id})
                  </div>
                </div>

                <div className="text-xs text-muted">
                  <strong>Reason:</strong> {req.reason}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => handleFacultyDecision(req.id, 'approve')}
                  className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Update Timetable
                </button>
                <button
                  onClick={() => handleFacultyDecision(req.id, 'reject')}
                  className="px-4 py-2 bg-white border border-line hover:bg-gray-100 text-ink rounded-xl text-xs font-semibold transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}

          {facultyRequests.length === 0 && (
            <div className="bg-card p-12 text-center rounded-2xl border border-line text-muted text-xs">
              No pending faculty schedule change requests.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Disruption Reschedule Proposals */}
      {activeTab === 'disruptions' && user?.role === 'admin' && (
        <div className="space-y-6">
          {proposals.map((prop) => (
            <div key={prop.id} className="bg-card p-6 rounded-2xl border border-line shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-brand" />
                    <h3 className="font-bold text-base text-ink">Rescheduling Proposal: {prop.id}</h3>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Optimized fix with <strong>{prop.moved_count || (prop.moved_details || []).length} minimal moves</strong> generated for disruption {prop.disruption_id}.
                  </p>
                </div>

                <button
                  onClick={() => handleApproveProposal(prop)}
                  className="px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                >
                  Commit & Publish Proposal
                </button>
              </div>

              {/* Before and After Cascade Diff Table */}
              <div className="overflow-x-auto">
                <div className="text-xs font-bold text-ink mb-2">Before-and-After Schedule Diff:</div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-line text-muted font-semibold bg-page">
                      <th className="p-2.5">Session ID</th>
                      <th className="p-2.5">Original Slot & Venue</th>
                      <th className="p-2.5">New Slot & Venue</th>
                      <th className="p-2.5">Cascade Relocation Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {(prop.moved_details || []).map((m, idx) => (
                      <tr key={idx} className="hover:bg-page/60">
                        <td className="p-2.5 font-bold text-ink">{m.session_id}</td>
                        <td className="p-2.5">
                          <span className="inline-block px-2 py-0.5 rounded bg-bad-bg text-bad-text font-medium">
                            {m.from_slot} ({m.from_room})
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className="inline-block px-2 py-0.5 rounded bg-ok-bg text-ok-text font-medium flex items-center gap-1.5 w-fit">
                            <ArrowRight className="w-3 h-3" /> {m.to_slot} ({m.to_room})
                          </span>
                        </td>
                        <td className="p-2.5 text-muted text-[11px]">{m.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {proposals.length === 0 && (
            <div className="bg-card p-12 text-center rounded-2xl border border-line text-muted text-xs">
              No pending rescheduling proposals. All schedules active and conflict-free.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
