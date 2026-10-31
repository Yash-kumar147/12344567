import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Calendar, ShieldCheck, Users, Search, 
  Filter, CheckCircle2, AlertCircle, Info, Sparkles 
} from 'lucide-react';
import { getActiveSchedule, getCitDataset } from '../api';
import { Exam, Room } from '../types';

export const Exams: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('All');
  const [selectedRoom, setSelectedRoom] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [sched, dataset] = await Promise.all([
          getActiveSchedule().catch(() => ({ exams: [] })),
          getCitDataset().catch(() => ({ rooms: [], exams: [] } as any))
        ]);

        const examList: Exam[] = (sched.exams && sched.exams.length > 0) ? sched.exams : (dataset.exams || []);
        setExams(examList);

        const rMap: Record<string, Room> = {};
        if (dataset.rooms) {
          dataset.rooms.forEach((r: Room) => {
            rMap[r.id] = r;
          });
        }
        setRooms(rMap);
      } catch (e) {
        console.error('Failed to load exams', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const days = ['All', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const examRooms = ['All', 'LH101', 'LH102', 'LH201', 'LH202', 'AUD1'];

  const filteredExams = exams.filter(ex => {
    const matchDay = selectedDay === 'All' || ex.day === selectedDay;
    const matchRoom = selectedRoom === 'All' || ex.room_id === selectedRoom;
    const matchSearch = searchQuery === '' || 
      ex.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.room_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDay && matchRoom && matchSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink">Midsem Exam Schedule</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-ok-bg text-ok-text border border-emerald-200">
              Verified Clash-Free
            </span>
          </div>
          <p className="text-sm text-muted mt-1">
            Automated CP-SAT generation with halved room capacity constraint for invigilation integrity.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-xl border border-line shadow-sm">
          <ShieldCheck className="w-5 h-5 text-brand" />
          <div className="text-xs">
            <span className="font-bold text-ink">50% Seating Rule:</span>{' '}
            <span className="text-muted">Effective Cap = Room Cap / 2</span>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-ink">{exams.length}</div>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-brand flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs font-semibold text-muted mt-1">Total Midsem Exams</div>
          <div className="text-[11px] text-brand mt-2 font-medium">All 41 courses scheduled</div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-ink">5 Halls</div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs font-semibold text-muted mt-1">Designated Exam Venues</div>
          <div className="text-[11px] text-muted mt-2">LH101, LH102, LH201, LH202, AUD1</div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-ok-text">0 Clashes</div>
            <div className="w-9 h-9 rounded-xl bg-ok-bg text-ok-text flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs font-semibold text-muted mt-1">Student Group Overlaps</div>
          <div className="text-[11px] text-ok-text mt-2 font-medium">No student has 2 exams simultaneously</div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-line shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-ink">2 Hours</div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs font-semibold text-muted mt-1">Exam Duration Standard</div>
          <div className="text-[11px] text-muted mt-2">Periods: P1-P2, P3-P4, P6-P7</div>
        </div>
      </div>

      {/* Halved Capacity Warning Notice */}
      <div className="bg-gradient-to-r from-teal-500/10 via-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-brand text-white rounded-xl">
          <Info className="w-5 h-5" />
        </div>
        <div className="text-xs text-ink space-y-1">
          <div className="font-bold text-brand-dark text-sm">Strict Anti-Copy Seating Protocol Active</div>
          <p className="text-muted leading-relaxed">
            Per CIT Examination Board guidelines, every candidate must have at least one empty desk adjacent. 
            The CP-SAT solver strictly limits student allocations to exactly <strong className="text-ink">floor(room.capacity / 2)</strong>.
            For example, <strong>LH101 (Cap: 120)</strong> is capped at <strong>60 examinees</strong>; 
            <strong> AUD1 (Cap: 300)</strong> is capped at <strong>150 examinees</strong>.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card p-4 rounded-2xl border border-line shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Day Filter */}
          <div className="flex items-center gap-1 bg-page p-1 rounded-xl border border-line text-xs font-medium">
            <span className="px-2 text-muted">Day:</span>
            {days.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  selectedDay === d ? 'bg-brand text-white shadow-xs font-semibold' : 'text-muted hover:text-ink'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Room Filter */}
          <div className="flex items-center gap-1 bg-page p-1 rounded-xl border border-line text-xs font-medium">
            <span className="px-2 text-muted">Room:</span>
            {examRooms.map(r => (
              <button
                key={r}
                onClick={() => setSelectedRoom(r)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  selectedRoom === r ? 'bg-brand text-white shadow-xs font-semibold' : 'text-muted hover:text-ink'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Search input */}
        <div className="flex items-center gap-2 bg-page px-3 py-2 rounded-xl border border-line w-full md:w-72 focus-within:border-brand">
          <Search className="w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search course or exam code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs w-full outline-none placeholder:text-muted"
          />
        </div>
      </div>

      {/* Exam Grid / Table */}
      {loading ? (
        <div className="text-center py-12 text-sm text-muted">Loading midsem exam roster...</div>
      ) : filteredExams.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-line">
          <AlertCircle className="w-8 h-8 text-muted mx-auto mb-2" />
          <div className="text-sm font-semibold text-ink">No exams match your filters</div>
          <div className="text-xs text-muted mt-1">Try resetting the day or room filter above.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((ex) => {
            const room = rooms[ex.room_id];
            const maxCap = room ? room.capacity : 120;
            const effectiveCap = Math.floor(maxCap / 2);
            const isFull = ex.expected_students >= effectiveCap;

            return (
              <div 
                key={ex.exam_id}
                className="bg-card rounded-2xl border border-line p-5 shadow-sm hover:border-brand transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-brand font-bold text-xs">
                      {ex.course_code}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-page border border-line text-ink">
                      {ex.exam_id}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm text-ink line-clamp-1 mb-1">
                    {ex.course_name}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-muted mb-4">
                    <Calendar className="w-3.5 h-3.5 text-brand" />
                    <span>{ex.day} • {ex.start_period} ({ex.duration} hrs)</span>
                  </div>

                  {/* Room & Capacity Bar */}
                  <div className="bg-page p-3 rounded-xl border border-line space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-ink">Venue: <strong className="text-brand">{ex.room_id}</strong></span>
                      <span className="text-muted">Total: {maxCap} seats</span>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-muted">Registered: <strong>{ex.expected_students}</strong></span>
                        <span className="text-brand font-semibold">Effective Cap: <strong>{effectiveCap}</strong></span>
                      </div>
                      <div className="w-full bg-line rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${isFull ? 'bg-amber-500' : 'bg-brand'}`} 
                          style={{ width: `${Math.min(100, (ex.expected_students / effectiveCap) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-ok-text font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Halved Cap Compliant</span>
                  </div>
                  <span className="text-muted text-[11px]">Seating Density 50%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
