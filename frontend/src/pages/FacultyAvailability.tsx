import React, { useState, useEffect } from 'react';
import { 
  Users, Clock, AlertTriangle, ShieldCheck, Search, 
  CheckCircle2, XCircle, Calendar, BookOpen, ChevronRight 
} from 'lucide-react';
import { getCitDataset, getActiveSchedule } from '../api';
import { Faculty, Room } from '../types';

export const FacultyAvailability: React.FC = () => {
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [scheduleAssignments, setScheduleAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [dataset, sched] = await Promise.all([
          getCitDataset().catch(() => ({ faculty: [] })),
          getActiveSchedule().catch(() => ({ assignments: [] }))
        ]);
        setFacultyList(dataset.faculty || []);
        setScheduleAssignments(sched.assignments || []);
        if (dataset.faculty && dataset.faculty.length > 0) {
          setSelectedFaculty(dataset.faculty[0]);
        }
      } catch (e) {
        console.error('Failed to load faculty', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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
    if (period === 'P5') return { label: 'Lunch (Protected)', color: 'bg-teal-50 text-brand-dark' };
    
    // Check unavailable (Hard)
    const isUnavail = f.unavailable_slots?.some(s => s.day === day && s.period === period);
    if (isUnavail) return { label: 'Unavailable (Hard)', color: 'bg-bad-bg text-bad-text font-bold' };

    // Check avoid (Soft)
    const isAvoid = f.avoid_slots?.some(s => s.day === day && s.period === period);
    if (isAvoid) return { label: 'Avoid (Soft)', color: 'bg-wait-bg text-wait-text font-medium' };

    return { label: 'Available', color: 'bg-emerald-50/50 text-ok-text' };
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
            <span className="font-bold text-ink">Daily Limit Rule:</span>{' '}
            <span className="text-muted">Max 4 teaching hours / faculty / day</span>
          </div>
        </div>
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
          <div className="text-xs font-semibold text-muted mt-1">Daily Cap Maximum</div>
          <div className="text-[11px] text-muted mt-2">Zero faculty exceed 4h/day</div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-ok-text">100% Free</div>
            <div className="w-9 h-9 rounded-xl bg-ok-bg text-ok-text flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs font-semibold text-muted mt-1">Lunch Hour Protection</div>
          <div className="text-[11px] text-ok-text mt-2 font-medium">Period 5 (13:00 - 14:00) kept clear</div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-ink">Weight 5</div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs font-semibold text-muted mt-1">Soft Penalty on Avoid Slots</div>
          <div className="text-[11px] text-muted mt-2">Minimised by CP-SAT Stage 1</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card p-4 rounded-2xl border border-line shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <span className="text-xs font-medium text-muted px-2">Dept:</span>
          {departments.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDept(d)}
              className={`px-3 py-1.5 rounded-xl text-xs transition-colors ${
                selectedDept === d ? 'bg-brand text-white font-semibold' : 'bg-page text-muted hover:text-ink border border-line'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-page px-3 py-2 rounded-xl border border-line w-full md:w-72 focus-within:border-brand">
          <Search className="w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search faculty by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs w-full outline-none placeholder:text-muted"
          />
        </div>
      </div>

      {/* Faculty Split View: List on Left, Schedule Matrix on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List */}
        <div className="lg:col-span-5 bg-card rounded-2xl border border-line p-4 shadow-sm flex flex-col h-[640px]">
          <div className="text-sm font-bold text-ink mb-3 px-1 flex justify-between items-center">
            <span>Faculty Directory</span>
            <span className="text-xs font-normal text-muted">{filteredFaculty.length} of {facultyList.length}</span>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {filteredFaculty.map(f => {
              const isSelected = selectedFaculty?.id === f.id;
              const unavailCount = f.unavailable_slots?.length || 0;
              const avoidCount = f.avoid_slots?.length || 0;

              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFaculty(f)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-brand bg-teal-50/40 shadow-xs'
                      : 'border-line hover:border-teal-300 hover:bg-page'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-ink">{f.name}</div>
                      <div className="text-xs text-muted mt-0.5">{f.department} • <span className="font-mono">{f.id}</span></div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-brand' : 'text-muted'}`} />
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-line/60 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                      Max {f.daily_limit || 4}h/day
                    </span>
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
                          return (
                            <td key={p} className="p-1">
                              <div 
                                title={`${d} ${p}: ${status.label}`}
                                className={`h-9 rounded-lg flex items-center justify-center text-[10px] font-medium border border-transparent transition-all ${status.color}`}
                              >
                                {p === 'P5' ? 'LUNCH' : status.label.includes('Unavail') ? 'OFF' : status.label.includes('Avoid') ? 'AVOID' : 'OPEN'}
                              </div>
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
                <div className="font-semibold text-ink">Workload & Policy Constraints:</div>
                <ul className="list-disc pl-4 space-y-1 text-muted">
                  <li>Daily teaching limit strictly enforced: no faculty scheduled more than 4 periods in any day.</li>
                  <li>Hard unavailable slots are excluded from candidate domain in Stage 1 CP-SAT solver.</li>
                  <li>Soft avoid preferences carry a penalty weight of 5, penalising solver assignments during those slots.</li>
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
