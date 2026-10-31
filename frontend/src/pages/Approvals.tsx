import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ArrowRight, AlertTriangle, ShieldAlert, Layers } from 'lucide-react';
import { getBookings, decideBooking, getPendingProposals, approveProposal } from '../api';
import { useAuth } from '../context/AuthContext';
import { Booking, Proposal } from '../types';

export const Approvals: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'bookings' | 'disruptions'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = () => {
    getBookings(token || undefined).then(bList => {
      setBookings(bList.filter(b => b.status === 'pending'));
    });
    getPendingProposals(token || undefined).then(setProposals);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-card p-5 rounded-2xl border border-line shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand font-semibold text-xs uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" /> Approval Workflow
          </div>
          <h1 className="text-xl font-bold text-ink mt-1">Pending Approvals & Schedule Diffs</h1>
          <p className="text-xs text-muted">
            Inspect incoming venue requests and review before-and-after cascade diffs before publication.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-page p-1 rounded-xl border border-line text-xs font-semibold">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'bookings' ? 'bg-brand text-white shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            Venue Requests ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('disruptions')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'disruptions' ? 'bg-brand text-white shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            Reschedule Proposals ({proposals.length})
          </button>
        </div>
      </div>

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
          {bookings.map((b) => (
            <div key={b.id} className="bg-card p-5 rounded-2xl border border-line shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-ink">{b.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-wait-bg text-wait-text capitalize">
                    {b.event_type.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-muted mt-1.5 flex flex-wrap items-center gap-4">
                  <span><strong>Day:</strong> {b.day}</span>
                  <span><strong>Time:</strong> {b.start_period} ({b.duration}h)</span>
                  <span><strong>Venue:</strong> {b.room_id}</span>
                  <span><strong>Attendance:</strong> {b.expected_attendance} students</span>
                  <span><strong>Requester:</strong> {b.requester_name || b.requester_id}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
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
              </div>
            </div>
          ))}

          {bookings.length === 0 && (
            <div className="bg-card p-12 text-center rounded-2xl border border-line text-muted text-xs">
              No pending venue bookings requiring approval.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Disruption Reschedule Proposals */}
      {activeTab === 'disruptions' && (
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
                    Optimized fix with <strong>{prop.moved_count} minimal moves</strong> generated for disruption {prop.disruption_id}.
                  </p>
                </div>

                {user?.role === 'admin' ? (
                  <button
                    onClick={() => handleApproveProposal(prop)}
                    className="px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                  >
                    Commit & Publish Proposal
                  </button>
                ) : (
                  <span className="text-xs text-muted italic">Admin privileges required to commit</span>
                )}
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
                    {prop.moved_details.map((m, idx) => (
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
