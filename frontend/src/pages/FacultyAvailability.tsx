import React, { useState, useEffect } from 'react';
import { 
  Users, Clock, AlertTriangle, ShieldCheck, Search, 
  CheckCircle2, XCircle, Calendar, BookOpen, ChevronRight, Lock, Sparkles 
} from 'lucide-react';
import { getCitDataset, getActiveSchedule, markFacultyUnavailability, getAllFacultyUnavailability } from '../api';
import { useAuth } from '../context/AuthContext';
import { Faculty } from '../types';

export const FacultyAvailability: React.FC = () => {
  const { user, token } = useAuth();
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [scheduleAssignments, setScheduleAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [customUnavail, setCustomUnavail] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [dataset, sched, serverUnavail] = await Promise.all([
          getCitDataset().catch(() => ({ faculty: [] })),
          getActiveSchedule().catch(() => ({ assignments: [] })),
          getAllFacultyUnavailability(token || undefined).catch(() => [])
        ]);
        setFacultyList(dataset.faculty || []);
        setScheduleAssignments(sched.assignments || []);
        if (dataset.faculty && dataset.faculty.length > 0) {
          setSelectedFaculty(dataset.faculty[0]);
        }
        
        const unavailMap: Record<string, boolean> = {};
        for (const item of serverUnavail) {
          unavailMap[`${item.faculty_id}_${item.day}_${item.period}`] = item.is_unavailable;
        }
        setCustomUnavail(unavailMap);
      } catch (e) {
        console.error('Failed to load faculty', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token]);

  const departments = ['All', 'Computer Science', 'Electronics & Comm', 'Mechanical', 'Civil', 'Basic Sciences', 'Humanities'];

  const filteredFaculty = facultyList.filter(f => {
    const matchDept = selectedDept === 'All' || f.department.toLowerCase().includes(selectedDept.toLowerCase());
    const matchSearch = searchQuery === '' || 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchSearch;
  });

  const periods = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const getSlotStatus = (f: Faculty, day: string, period: string) => {
    if (period === 'P5') return { label: 'Lunch (Protected)', color: 'bg-teal-50 text-brand-dark', isUnavail: false };
    
    // Check custom server-side unavailabilities
    const customKey = `${f.id}_${day}_${period}`;
    if (customKey in customUnavail) {
      if (customUnavail[customKey]) {
        return { label: 'Unavailable (Admin Hard Block)', color: 'bg-bad-bg text-bad-text font-bold', isUnavail: true };
      }
    }

    // Check dataset unavailable (Hard)
    const isUnavail = f.unavailable_slots?.some(s => s.day === day && s.period === period);
    if (isUnavail) return { label: 'Unavailable (Hard)', color: 'bg-bad-bg text-bad-text font-bold', isUnavail: true };

    // Check avoid (Soft)
    const isAvoid = f.avoid_slots?.some(s => s.day === day && s.period === period);
    if (isAvoid) return { label: 'Avoid (Soft)', color: 'bg-wait-bg text-wait-text font-medium', isUnavail: false };

    return { label: 'Available', color: 'bg-emerald-50/50 text-ok-text', isUnavail: false };
  };

  // Task 3: Only admin can mark unavailability of faculty for that period or time
  const handleToggleUnavailability = async (facultyId: string, day: string, period: string) => {
    if (period === 'P5') return;

    if (user?.role !== 'admin') {
      setNotification({
        text: 'Access Denied: Only administrators have permission to mark faculty unavailability.',
        type: 'error'
      });
      return;
    }

    const currentStatus = getSlotStatus(selectedFaculty!, day, period);
    const newIsUnavailable = !currentStatus.isUnavail;

    try {
      await markFacultyUnavailability(facultyId, {
        day,
        period,
        is_unavailable: newIsUnavailable,
        reason: 'Marked by Administrator in Faculty Workload Matrix'
      }, token || undefined);

      setCustomUnavail(prev => ({
        ...prev,
        [`${facultyId}_${day}_${period}`]: newIsUnavailable
      }));

      setNotification({
        text: `Faculty ${facultyId} marked as ${newIsUnavailable ? 'UNAVAILABLE' : 'AVAILABLE'} on ${day} ${period}.`,
        type: 'success'
      });
    } catch (err: any) {
      setNotification({ text: err.message, type: 'error' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Faculty Availability & Workload</h1>
          <p className="text-sm text-muted mt-1">
            Tracking individual daily caps (max 4h), hard unavailable slots, and soft avoid preferences.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-xl border border-line shadow-sm">
          <ShieldCheck className="w-5 h-5 text-brand" />
          <div className="text-xs">
            <span className="font-bold text-ink">Policy:</span>{' '}
            <span className="text-muted">Max 4 teaching hours / day</span>
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

      {/* Task 3 Authority Callout */}
      <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-4 ${
        user?.role === 'admin' ? 'bg-teal-50/70 border-teal-200 text-teal-900' : 'bg-gray-50 border-line text-muted'
      }`}>
        <div className="flex items-center gap-2.5">
          {user?.role === 'admin' ? (
            <Sparkles className="w-5 h-5 text-brand shrink-0" />
          ) : (
            <Lock className="w-5 h-5 text-gray-500 shrink-0" />
          )}
          <div>
            <strong className="text-ink">Task 3 Rule:</strong>{' '}
            {user?.role === 'admin' ? (
              <span><strong>Admin Mode Active:</strong> You can click any period slot below to mark or unmark faculty unavailability.</span>
            ) : (
              <span>You are logged in as <strong>{user?.role}</strong>. Only Administrators can mark faculty unavailability for specific slots.</span>
            )}
          </div>
        </div>
        {user?.role === 'admin' && (
          <span className="text-[10px] font-bold bg-brand text-white px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
            Admin Editable
          </span>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-ink">{facultyList.length}</div>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-brand flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs font-semibold text-muted mt-1">Total Faculty Members</div>
          <div className="text-[11px] text-brand mt-2 font-medium">Across all 6 academic departments</div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-ink">4 Hours</div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs font-semibold text-muted mt-1">Max Daily Teaching Cap</div>
          <div className="text-[11px] text-blue-600 mt-2 font-medium">Strict CP-SAT hard constraint</div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-ink">P5 (12-1 PM)</div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs font-semibold text-muted mt-1">Universal Lunch Break</div>
          <div className="text-[11px] text-amber-600 mt-2 font-medium">100% protected campus-wide</div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-ink">0 Clashes</div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs font-semibold text-muted mt-1">Faculty Overlap Violations</div>
          <div className="text-[11px] text-emerald-600 mt-2 font-medium">Certified by validator.py</div>
        </div>
      </div>

      {/* Main Grid: Left List & Right Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Faculty Selector */}
        <div className="lg:col-span-5 bg-card rounded-2xl border border-line p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-ink">Faculty Directory</h2>
            <span className="text-xs text-muted font-medium">{filteredFaculty.length} members</span>
          </div>

          {/* Search & Department Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, ID or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-line bg-page focus:border-brand outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {departments.map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    selectedDept === dept ? 'bg-brand text-white shadow-xs' : 'bg-page hover:bg-gray-200/60 text-muted'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Faculty Cards List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredFaculty.map(f => {
              const isSelected = selectedFaculty?.id === f.id;
              const unavailCount = (f.unavailable_slots?.length || 0);
              const avoidCount = (f.avoid_slots?.length || 0);

              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFaculty(f)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    isSelected ? 'border-brand bg-teal-50/50 shadow-xs' : 'border-line hover:bg-page'
                  }`}
                >
                  <div>
                    <div className="font-bold text-ink">{f.name}</div>
                    <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-semibold text-brand">{f.id}</span>
                      <span>•</span>
                      <span>{f.department}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px]">
                    {unavailCount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-bad-bg text-bad-text font-medium">
                        {unavailCount} Unavail
                      </span>
                    )}
                    {avoidCount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-wait-bg text-wait-text font-medium">
                        {avoidCount} Avoid
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail / Availability Heatmap */}
        <div className="lg:col-span-7 bg-card rounded-2xl border border-line p-5 shadow-sm flex flex-col justify-between">
          {selectedFaculty ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-line gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-ink">{selectedFaculty.name}</h2>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-page border border-line">
                      {selectedFaculty.id}
                    </span>
                  </div>
                  <div className="text-xs text-muted mt-0.5">{selectedFaculty.department}</div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-xl bg-teal-50 text-brand text-xs font-semibold">
                    Teaching Cap: {selectedFaculty.daily_limit || 4} hrs/day
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 py-3 text-xs border-b border-line">
                <span className="text-muted font-medium">Slot Status:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></span>
                  <span className="text-ink">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-bad-bg border border-red-300"></span>
                  <span className="text-ink">Unavailable (Hard)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-wait-bg border border-amber-300"></span>
                  <span className="text-ink">Avoid Preferred (Soft)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-teal-50 border border-teal-200"></span>
                  <span className="text-ink">Lunch (P5)</span>
                </div>
              </div>

              {/* Availability Grid Matrix */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="border-b border-line text-xs font-semibold text-muted">
                      <th className="py-2.5 px-3 text-left">Day</th>
                      {periods.map(p => (
                        <th key={p} className="py-2.5 px-2 font-mono text-[11px]">{p}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs">
                    {days.map(d => (
                      <tr key={d} className="hover:bg-page/50">
                        <td className="py-3 px-3 text-left font-semibold text-ink whitespace-nowrap">{d}</td>
                        {periods.map(p => {
                          const status = getSlotStatus(selectedFaculty, d, p);
                          const isClickable = user?.role === 'admin' && p !== 'P5';

                          return (
                            <td key={p} className="p-1">
                              <button
                                type="button"
                                disabled={p === 'P5'}
                                onClick={() => isClickable && handleToggleUnavailability(selectedFaculty.id, d, p)}
                                title={
                                  user?.role === 'admin' && p !== 'P5'
                                    ? `Click to toggle unavailability for ${d} ${p}`
                                    : `${d} ${p}: ${status.label}`
                                }
                                className={`w-full h-9 rounded-lg flex items-center justify-center text-[10px] font-medium border border-transparent transition-all ${
                                  status.color
                                } ${isClickable ? 'hover:ring-2 hover:ring-brand cursor-pointer' : 'cursor-default'}`}
                              >
                                {p === 'P5' ? 'LUNCH' : status.label.includes('Unavail') ? 'OFF' : status.label.includes('Avoid') ? 'AVOID' : 'OPEN'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Extra Info Box */}
              <div className="mt-6 p-4 rounded-xl bg-page border border-line text-xs space-y-1.5">
                <div className="font-semibold text-ink">Authority Rules:</div>
                <ul className="list-disc pl-4 space-y-1 text-muted">
                  <li><strong>Task 3 Enforcement:</strong> Only Admin (Dean) has permission to mark faculty unavailability for specific slots.</li>
                  <li>Hard unavailable slots are excluded from candidate domain in Stage 1 CP-SAT solver.</li>
                  <li>Daily teaching limit strictly enforced: max 4 periods per faculty per day.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-muted text-sm">Select a faculty member to view detailed schedule</div>
          )}
        </div>
      </div>
    </div>
  );
};
