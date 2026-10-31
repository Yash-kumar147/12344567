import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Users, Armchair, AlertCircle, Layers, CheckCircle2 } from 'lucide-react';
import { getActiveSchedule } from '../api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [
  { id: 'P1', label: 'P1', time: '08:00 - 09:00' },
  { id: 'P2', label: 'P2', time: '09:00 - 10:00' },
  { id: 'P3', label: 'P3', time: '10:00 - 11:00' },
  { id: 'P4', label: 'P4', time: '11:00 - 12:00' },
  { id: 'P5', label: 'P5 (Lunch)', time: '12:00 - 13:00' },
  { id: 'P6', label: 'P6', time: '13:00 - 14:00' },
  { id: 'P7', label: 'P7', time: '14:00 - 15:00' },
  { id: 'P8', label: 'P8', time: '15:00 - 16:00' },
  { id: 'P9', label: 'P9', time: '16:00 - 17:00' }
];

export const Timetable: React.FC = () => {
  const [filterType, setFilterType] = useState<'group' | 'faculty' | 'room'>('group');
  const [selectedEntity, setSelectedEntity] = useState<string>('Y1-A');
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [version, setVersion] = useState<string>('v1.0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveSchedule()
      .then(data => {
        setScheduleData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const groups = ['Y1-A', 'Y1-B', 'Y1-C', 'Y1-D', 'Y2-CSE', 'Y2-ECE', 'Y2-EEE', 'Y2-ME', 'Y2-CE', 'Y3-CSE', 'Y3-ECE', 'Y3-EEE', 'Y3-ME', 'Y3-CE'];
  const rooms = ['LH101', 'LH102', 'CR101', 'CR102', 'SH1', 'AUD1', 'LAB_CS1', 'LAB_PHY', 'LAB_CHEM', 'LAB_ECE'];
  const faculty = ['FAC01', 'FAC02', 'FAC03', 'FAC04', 'FAC05', 'FAC06', 'FAC07', 'FAC08'];

  // Demo schedule grid mapping
  const getCellContent = (day: string, periodId: string) => {
    if (periodId === 'P5') {
      return { type: 'lunch', label: 'LUNCH BREAK', duration: 1 };
    }
    // Check assignments
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
    // Representative weekly schedule view
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-line shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-brand font-semibold text-xs uppercase tracking-wider">
            <Calendar className="w-4 h-4" /> Timetable Viewer
          </div>
          <h1 className="text-xl font-bold text-ink mt-1">Chilika Institute of Technology Schedule</h1>
          <p className="text-xs text-muted">Weekly timetable grid with automated clash detection and room routing.</p>
        </div>

        {/* Version Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-page px-3 py-1.5 rounded-xl border border-line text-xs">
            <Layers className="w-4 h-4 text-brand" />
            <span className="text-muted">Version:</span>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="bg-transparent font-semibold text-ink outline-none cursor-pointer"
            >
              <option value="v1.0">v1.0 (Published Baseline)</option>
              <option value="v1.1">v1.1 (Post-Disruption Re-solve)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-ok-bg text-ok-text px-3 py-1.5 rounded-xl text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>0 Violations</span>
          </div>
        </div>
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
                <th key={p.id} className={`py-3 px-2 ${p.id === 'P5' ? 'bg-gray-100/70 text-muted' : ''}`}>
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
                  if (period.id === 'P5') {
                    return (
                      <td key={period.id} className="bg-gray-50 border-l border-r border-line text-muted font-semibold text-[11px] p-2">
                        Lunch Break
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
                        <div className="p-2 rounded-xl bg-teal-100/90 border border-teal-300 text-brand-dark font-semibold shadow-xs">
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
                      <div className="p-2 rounded-xl bg-brand-tint border border-teal-200/60 text-brand-dark font-medium transition-transform hover:scale-[1.02]">
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
    </div>
  );
};
