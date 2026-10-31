import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, CheckCircle2, Clock, Armchair, Tag, FileText, 
  ArrowRight, Sparkles, RefreshCw, Bot, UploadCloud 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDashboardSummary, decideBooking } from '../api';
import { DashboardSummary } from '../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [pendingList, setPendingList] = useState([
    {
      id: 'BR01',
      title: 'Spectra - Auditorium Booking',
      requester: 'Club Representative',
      time: '2h ago'
    },
    {
      id: 'BR02',
      title: 'Department Event - Seminar Hall',
      requester: 'Dept. Coordinator',
      time: '3h ago'
    },
    {
      id: 'BR03',
      title: 'Guest Lecture - Open Air Theatre',
      requester: 'Faculty',
      time: '5h ago'
    }
  ]);

  useEffect(() => {
    getDashboardSummary().then(data => {
      setSummary(data);
      setLoading(false);
    });
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await decideBooking(id, action);
    } catch (e) {}
    setPendingList(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Welcome back, {user?.name?.split(' ')[0] || 'John'}!
        </h1>
        <p className="text-sm text-muted">Here's what's happening at CIT this week.</p>
      </div>

      {/* 4 Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-card p-5 rounded-2xl border border-line shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-ink">
              {summary?.sessions_scheduled || 189}
            </div>
            <div className="text-xs text-muted font-medium">Sessions Scheduled</div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-ok-text">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>No Conflicts</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-brand flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-card p-5 rounded-2xl border border-line shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-ink">
              {summary?.total_rooms || 27}
            </div>
            <div className="text-xs text-muted font-medium">Rooms</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-bold text-brand">82% Utilisation</span>
              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: '82%' }}></div>
              </div>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-brand flex items-center justify-center">
            <Armchair className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-card p-5 rounded-2xl border border-line shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-ink">
              {summary?.spectra_requests_total || 25}
            </div>
            <div className="text-xs text-muted font-medium">Spectra Requests</div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-wait-text">
              <Clock className="w-3.5 h-3.5" />
              <span>{pendingList.length} Pending</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-brand flex items-center justify-center">
            <Tag className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-card p-5 rounded-2xl border border-line shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-ink">
              {summary?.midsem_exams_count || 41}
            </div>
            <div className="text-xs text-muted font-medium">Midsem Exams</div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-ok-text">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Scheduled</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-brand flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Middle Section: Weekly Timetable Grid & Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Timetable Preview (2 Cols) */}
        <div className="lg:col-span-2 bg-card p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand" />
              <h2 className="font-bold text-base text-ink">Weekly Timetable</h2>
            </div>
            <Link to="/timetable" className="text-xs font-semibold text-brand hover:underline flex items-center gap-1">
              View Full Timetable <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="text-xs font-semibold text-muted border-b border-line">
                  <th className="py-2.5 px-2 text-left">Day</th>
                  <th className="py-2.5 px-2">P1<br/><span className="text-[10px] font-normal text-muted">(8-9)</span></th>
                  <th className="py-2.5 px-2">P2<br/><span className="text-[10px] font-normal text-muted">(9-10)</span></th>
                  <th className="py-2.5 px-2">P3<br/><span className="text-[10px] font-normal text-muted">(10-11)</span></th>
                  <th className="py-2.5 px-2">P4<br/><span className="text-[10px] font-normal text-muted">(11-12)</span></th>
                  <th className="py-2.5 px-2 bg-gray-50 text-muted">P5<br/><span className="text-[10px] font-normal text-muted">(12-1)</span></th>
                  <th className="py-2.5 px-2">P6<br/><span className="text-[10px] font-normal text-muted">(1-2)</span></th>
                  <th className="py-2.5 px-2">P7<br/><span className="text-[10px] font-normal text-muted">(2-3)</span></th>
                  <th className="py-2.5 px-2">P9<br/><span className="text-[10px] font-normal text-muted">(4-5)</span></th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-line">
                <tr>
                  <td className="py-3 px-2 font-semibold text-left">Mon</td>
                  <td className="p-1"><span className="block p-1.5 rounded-lg bg-brand-tint text-brand-dark font-medium">CSE 101</span></td>
                  <td className="p-1"><span className="block p-1.5 rounded-lg bg-brand-tint text-brand-dark font-medium">Maths 201</span></td>
                  <td colSpan={2} className="p-1"><span className="block p-1.5 rounded-lg bg-brand-tint text-brand-dark font-medium">Physics Lab</span></td>
                  <td className="p-1 bg-gray-50 text-muted font-medium">Lunch</td>
                  <td className="p-1 text-muted">—</td>
                  <td className="p-1 text-muted">—</td>
                  <td className="p-1 text-muted">—</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-semibold text-left">Tue</td>
                  <td className="p-1"><span className="block p-1.5 rounded-lg bg-brand-tint text-brand-dark font-medium">ECE 101</span></td>
                  <td className="p-1"><span className="block p-1.5 rounded-lg bg-brand-tint text-brand-dark font-medium">EEE 201</span></td>
                  <td colSpan={2} className="p-1"><span className="block p-1.5 rounded-lg bg-brand-tint text-brand-dark font-medium">Data Structures</span></td>
                  <td className="p-1 bg-gray-50 text-muted font-medium">Lunch</td>
                  <td className="p-1 text-muted">—</td>
                  <td className="p-1 text-muted">—</td>
                  <td className="p-1 text-muted">—</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-semibold text-left">Wed</td>
                  <td className="p-1"><span className="block p-1.5 rounded-lg bg-brand-tint text-brand-dark font-medium">Maths 101</span></td>
                  <td className="p-1"><span className="block p-1.5 rounded-lg bg-brand-tint text-brand-dark font-medium">CSE 201</span></td>
                  <td className="p-1"><span className="block p-1.5 rounded-lg bg-brand-tint text-brand-dark font-medium">Elective A</span></td>
                  <td className="p-1 text-muted">—</td>
                  <td className="p-1 bg-gray-50 text-muted font-medium">Lunch</td>
                  <td className="p-1 text-muted">—</td>
                  <td className="p-1 text-muted">—</td>
                  <td className="p-1 text-muted">—</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-semibold text-left">Thu</td>
                  <td className="p-1"><span className="block p-1.5 rounded-lg bg-brand-tint text-brand-dark font-medium">Physics 101</span></td>
                  <td className="p-1"><span className="block p-1.5 rounded-lg bg-brand-tint text-brand-dark font-medium">Chemistry 201</span></td>
                  <td className="p-1"><span className="block p-1.5 rounded-lg bg-brand-tint text-brand-dark font-medium">Elective B</span></td>
                  <td className="p-1 text-muted">—</td>
                  <td className="p-1 bg-gray-50 text-muted font-medium">Lunch</td>
                  <td className="p-1 text-muted">—</td>
                  <td className="p-1 text-muted">—</td>
                  <td className="p-1 text-muted">—</td>
                </tr>
                <tr>
                  <td className="py-3 px-2 font-semibold text-left">Fri</td>
                  <td className="p-1"><span className="block p-1.5 rounded-lg bg-brand-tint text-brand-dark font-medium">CSE 101</span></td>
                  <td className="p-1"><span className="block p-1.5 rounded-lg bg-brand-tint text-brand-dark font-medium">EEE 201</span></td>
                  <td colSpan={2} className="p-1"><span className="block p-1.5 rounded-lg bg-brand-tint text-brand-dark font-medium">Project Lab</span></td>
                  <td className="p-1 bg-gray-50 text-muted font-medium">Lunch</td>
                  <td className="p-1 text-muted">—</td>
                  <td className="p-1 text-muted">—</td>
                  <td className="p-1 text-muted">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Approvals Card (1 Col) */}
        <div className="bg-card p-5 rounded-2xl border border-line shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-brand" />
                <h2 className="font-bold text-base text-ink">Pending Approvals</h2>
              </div>
              <Link to="/approvals" className="text-xs font-semibold text-brand hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {pendingList.map((item) => (
                <div key={item.id} className="p-3.5 rounded-xl border border-line bg-page hover:bg-white transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-xs text-ink">{item.title}</div>
                      <div className="text-[11px] text-muted mt-0.5">
                        Requested by {item.requester} • {item.time}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleAction(item.id, 'approve')}
                      className="flex-1 py-1 px-3 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(item.id, 'reject')}
                      className="py-1 px-3 bg-white border border-line hover:bg-gray-100 text-ink rounded-lg text-xs font-medium transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
              {pendingList.length === 0 && (
                <div className="text-center py-8 text-xs text-muted">All pending requests approved!</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Quick Actions & Important Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions (2 cols) */}
        <div className="lg:col-span-2 bg-card p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-brand" />
            <h2 className="font-bold text-base text-ink">Quick Actions</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/bookings')}
              className="p-4 rounded-xl border border-line hover:border-brand hover:bg-teal-50/30 transition-all text-center flex flex-col items-center justify-center gap-2.5"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-brand flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-ink leading-tight">Book a Venue</span>
            </button>

            <button
              onClick={() => navigate('/approvals')}
              className="p-4 rounded-xl border border-line hover:border-brand hover:bg-teal-50/30 transition-all text-center flex flex-col items-center justify-center gap-2.5"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-brand flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-ink leading-tight">Request Schedule Change</span>
            </button>

            <button
              onClick={() => navigate('/ai-assistant')}
              className="p-4 rounded-xl border border-line hover:border-brand hover:bg-teal-50/30 transition-all text-center flex flex-col items-center justify-center gap-2.5"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-brand flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-ink leading-tight">Ask AI Assistant</span>
            </button>

            <button
              onClick={() => navigate('/settings')}
              className="p-4 rounded-xl border border-line hover:border-brand hover:bg-teal-50/30 transition-all text-center flex flex-col items-center justify-center gap-2.5"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-brand flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-ink leading-tight">Upload Dataset</span>
            </button>
          </div>
        </div>

        {/* Important Notices (1 col) */}
        <div className="bg-card p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base text-ink">Important Notices</h2>
            <span className="text-xs font-semibold text-brand hover:underline cursor-pointer">View All</span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="border-l-2 border-brand pl-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">Spectra Week</span>
                <span className="text-[11px] text-muted">Apr 14</span>
              </div>
              <p className="text-muted mt-1 text-[11px]">
                Main events bookings are now open. Follow priority rules.
              </p>
            </div>

            <div className="border-l-2 border-brand pl-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">Midsem Exams</span>
                <span className="text-[11px] text-muted">Apr 13</span>
              </div>
              <p className="text-muted mt-1 text-[11px]">
                Exam schedule released. Check your timetable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
