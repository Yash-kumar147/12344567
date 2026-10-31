import React, { useState } from 'react';
import { 
  ShieldCheck, Clock, History, FileText, CheckCircle2, 
  AlertTriangle, Filter, Search, ArrowRight, UserCheck, RefreshCw 
} from 'lucide-react';

interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  category: 'solver' | 'disruption' | 'booking' | 'admin';
  action: string;
  description: string;
  status: 'success' | 'warning' | 'info';
  details?: Record<string, any>;
}

export const AuditHistory: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const auditEvents: AuditEvent[] = [
    {
      id: 'AUD-001',
      timestamp: '2025-04-14 10:15:22 UTC',
      actor: 'Prof. S. Jena (Dean Academic)',
      actorRole: 'admin',
      category: 'disruption',
      action: 'Approved Reschedule Proposal',
      description: 'Approved proposal PROP_DISR_01 resolving faculty absence and LH101 maintenance. 45 sessions moved with minimal disruption. Optimistic lock verified (base_version: v1).',
      status: 'success',
      details: {
        proposal_id: 'PROP_DISR_01',
        moved_count: 45,
        new_version_id: 'ver_resched_20250414_1015'
      }
    },
    {
      id: 'AUD-002',
      timestamp: '2025-04-14 09:40:11 UTC',
      actor: 'Dr. Coordinator (CSE Dept)',
      actorRole: 'coordinator',
      category: 'booking',
      action: 'Priority Venue Displacement & Allocation',
      description: 'Approved Spectra Inaugural Keynote in AUD1 (Priority 3). Displaced lower priority Robotics Club informal session (Priority 6) to Seminar Hall 1.',
      status: 'warning',
      details: {
        booking_id: 'BR01',
        venue: 'AUD1',
        displaced_id: 'BR_CLUB_09'
      }
    },
    {
      id: 'AUD-003',
      timestamp: '2025-04-14 08:30:00 UTC',
      actor: 'System CP-SAT Engine',
      actorRole: 'system',
      category: 'solver',
      action: 'Midsem Exam Timetable Generated',
      description: 'Scheduled 41 midsem exams across 5 designated examination venues with strict 50% halved capacity constraint.',
      status: 'success',
      details: {
        total_exams: 41,
        violations: 0,
        venues: ['LH101', 'LH102', 'LH201', 'LH202', 'AUD1']
      }
    },
    {
      id: 'AUD-004',
      timestamp: '2025-04-13 18:00:00 UTC',
      actor: 'Prof. S. Jena (Dean Academic)',
      actorRole: 'admin',
      category: 'solver',
      action: 'Master Timetable Published (ver_20250414_001)',
      description: 'Generated and published 189 clash-free teaching sessions covering 243 instructional hours across 27 campus venues.',
      status: 'success',
      details: {
        sessions_count: 189,
        hard_violations: 0,
        soft_penalty: 26.0
      }
    },
    {
      id: 'AUD-005',
      timestamp: '2025-04-13 14:22:15 UTC',
      actor: 'Dr. Arvind Sharma',
      actorRole: 'faculty',
      category: 'disruption',
      action: 'Disruption Registered: Medical Leave',
      description: 'Submitted unavailability for Wednesday P6-P8 and Friday P1-P3 due to medical leave.',
      status: 'info',
      details: {
        faculty_id: 'FAC01',
        disruption_id: 'DISR_2025_001'
      }
    },
    {
      id: 'AUD-006',
      timestamp: '2025-04-13 10:00:00 UTC',
      actor: 'Administrator',
      actorRole: 'admin',
      category: 'admin',
      action: 'Initial Benchmark Baseline Initialized',
      description: 'Imported CIT official dataset (data/cit_public.json) containing 27 rooms, 40 faculty, 14 student groups, and 62 courses.',
      status: 'info',
      details: {
        dataset: 'cit_public.json'
      }
    }
  ];

  const categories = ['All', 'solver', 'disruption', 'booking', 'admin'];

  const filteredEvents = auditEvents.filter(ev => {
    const matchCat = selectedCategory === 'All' || ev.category === selectedCategory;
    const matchSearch = searchQuery === '' || 
      ev.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.actor.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink">Immutable Audit Trail</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-brand border border-teal-200">
              Tamper-Evident Ledger
            </span>
          </div>
          <p className="text-sm text-muted mt-1">
            Chronological audit of solver runs, emergency disruptions, approval decisions, and venue displacements.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-xl border border-line shadow-sm">
          <ShieldCheck className="w-5 h-5 text-brand" />
          <div className="text-xs">
            <span className="font-bold text-ink">Optimistic Locking:</span>{' '}
            <span className="text-muted">Concurrent edits prevented via base_version checks</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card p-4 rounded-2xl border border-line shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-medium text-muted px-2">Category:</span>
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1.5 rounded-xl text-xs capitalize transition-colors ${
                selectedCategory === c
                  ? 'bg-brand text-white font-semibold'
                  : 'bg-page text-muted hover:text-ink border border-line'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-page px-3 py-2 rounded-xl border border-line w-full md:w-72 focus-within:border-brand">
          <Search className="w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search audit actions, actors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs w-full outline-none placeholder:text-muted"
          />
        </div>
      </div>

      {/* Audit Timeline */}
      <div className="space-y-4">
        {filteredEvents.map((ev) => (
          <div
            key={ev.id}
            className="bg-card rounded-2xl border border-line p-5 shadow-sm hover:border-brand transition-all space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  ev.category === 'solver' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                  ev.category === 'disruption' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  ev.category === 'booking' ? 'bg-teal-50 text-brand-dark border border-teal-200' :
                  'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {ev.category}
                </span>
                <span className="font-bold text-sm text-ink">{ev.action}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted font-mono">
                <Clock className="w-3.5 h-3.5 text-muted" />
                <span>{ev.timestamp}</span>
              </div>
            </div>

            <p className="text-xs text-ink leading-relaxed">
              {ev.description}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted">Actor:</span>
                <span className="font-semibold text-ink">{ev.actor}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-page border border-line uppercase text-muted font-mono">
                  {ev.actorRole}
                </span>
              </div>

              {ev.details && (
                <div className="flex items-center gap-2 font-mono text-[11px] text-muted bg-page px-2.5 py-1 rounded-lg border border-line">
                  {Object.entries(ev.details).map(([k, v]) => (
                    <span key={k}>
                      {k}: <strong className="text-ink">{Array.isArray(v) ? v.join(',') : String(v)}</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

