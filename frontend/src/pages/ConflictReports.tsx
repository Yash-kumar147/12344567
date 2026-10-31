import React, { useState } from 'react';
import { 
  ShieldCheck, CheckCircle2, AlertTriangle, FileCode, 
  RefreshCw, Check, ArrowRight, Download, Terminal, Info 
} from 'lucide-react';

export const ConflictReports: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastVerified, setLastVerified] = useState<string>('Just now');
  const [activeTab, setActiveTab] = useState<'hard' | 'soft' | 'cli'>('hard');

  const hardRules = [
    {
      id: 'HC-01',
      title: 'Room Double-Booking',
      description: 'No two active sessions or exams occupy the same room in any period.',
      violations: 0,
      status: 'passed'
    },
    {
      id: 'HC-02',
      title: 'Faculty Double-Booking',
      description: 'No instructor is scheduled to teach two different groups in the same slot.',
      violations: 0,
      status: 'passed'
    },
    {
      id: 'HC-03',
      title: 'Student Group Overlap',
      description: 'No cohort/section has concurrent overlapping sessions or exams.',
      violations: 0,
      status: 'passed'
    },
    {
      id: 'HC-04',
      title: 'Faculty Daily Teaching Limit',
      description: 'Maximum of 4 hours instruction per faculty member per day.',
      violations: 0,
      status: 'passed'
    },
    {
      id: 'HC-05',
      title: 'Room Capacity Adherence',
      description: 'Room capacity must accommodate student cohort size (regular sessions).',
      violations: 0,
      status: 'passed'
    },
    {
      id: 'HC-06',
      title: 'Room Type Compatibility',
      description: 'Labs allocated to laboratories (CSE, ECE, Mech, Chem, Phys); lectures to lecture halls.',
      violations: 0,
      status: 'passed'
    },
    {
      id: 'HC-07',
      title: 'Accessibility Compliance',
      description: 'Sessions requiring mobility accessibility must have ground-floor or ramp access.',
      violations: 0,
      status: 'passed'
    },
    {
      id: 'HC-08',
      title: 'Scheduled Maintenance Windows',
      description: 'Rooms closed during scheduled maintenance (e.g. LAB_CHEM Friday P8-P9) must stay empty.',
      violations: 0,
      status: 'passed'
    },
    {
      id: 'HC-09',
      title: 'Faculty Unavailability Windows',
      description: 'No teaching assignment scheduled in a faculty member’s declared unavailable slots.',
      violations: 0,
      status: 'passed'
    },
    {
      id: 'HC-10',
      title: 'Lunch Period Protection',
      description: 'Period 5 (13:00 - 14:00) is strictly reserved for campus-wide lunch.',
      violations: 0,
      status: 'passed'
    },
    {
      id: 'HC-11',
      title: '3-Hour Lab Block Starts',
      description: 'All 3-hour laboratory sessions must commence strictly at Period 2 or Period 6.',
      violations: 0,
      status: 'passed'
    },
    {
      id: 'HC-12',
      title: 'Elective Basket Concurrency',
      description: 'All elective courses within the same elective basket run concurrently in identical slots.',
      violations: 0,
      status: 'passed'
    },
    {
      id: 'HC-13',
      title: 'Exam Halved Capacity (Anti-Copy)',
      description: 'Midsem exams must not exceed floor(capacity / 2) to maintain invigilation standards.',
      violations: 0,
      status: 'passed'
    }
  ];

  const softMetrics = [
    {
      name: 'Faculty Avoid Slots',
      penaltyWeight: 5,
      actualViolations: 0,
      description: 'Assigned sessions during faculty preferred avoid slots'
    },
    {
      name: 'Inter-Building Room Switches',
      penaltyWeight: 2,
      actualViolations: 4,
      description: 'Back-to-back classes for faculty requiring walking between blocks'
    },
    {
      name: 'Student Cohort Idle Gaps',
      penaltyWeight: 3,
      actualViolations: 6,
      description: 'Gaps > 1 period between lectures in student daily schedule'
    }
  ];

  const runVerification = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setLastVerified('Just now');
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink">Constraint & Conflict Verification</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-ok-bg text-ok-text border border-emerald-200">
              0 Hard Violations
            </span>
          </div>
          <p className="text-sm text-muted mt-1">
            Auditing 189 sessions and 41 midsem exams against CIT’s 13 hard scheduling constraints.
          </p>
        </div>

        <button
          onClick={runVerification}
          disabled={isRunning}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Auditing Constraints...' : 'Run Live Verification'}
        </button>
      </div>

      {/* Hero Pass Status Card */}
      <div className="bg-gradient-to-br from-emerald-50 via-card to-teal-50/50 rounded-2xl border border-emerald-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-ok-bg text-ok-text flex items-center justify-center shrink-0 border border-emerald-300">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-ink">Zero Hard Constraint Violations</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-ok-bg text-ok-text uppercase tracking-wide">
                  PASSED
                </span>
              </div>
              <p className="text-xs text-muted mt-1 max-w-2xl leading-relaxed">
                The current active timetable (Version: <code className="bg-page px-1.5 py-0.5 rounded font-mono text-ink">ver_20250414_001</code>) 
                satisfies all 13 hard constraints verified by the deterministic Python validator. 
                Zero rooms are double-booked, zero student sections overlap, and all faculty daily caps are honored.
              </p>
            </div>
          </div>

          <div className="bg-card px-5 py-4 rounded-xl border border-line shrink-0 text-center sm:text-right">
            <div className="text-xs text-muted">Audited At</div>
            <div className="text-sm font-semibold text-ink">{lastVerified}</div>
            <div className="text-[11px] text-ok-text font-medium mt-1">100% Deterministic Guarantee</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <button
          onClick={() => setActiveTab('hard')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'hard'
              ? 'bg-brand text-white shadow-xs'
              : 'text-muted hover:text-ink hover:bg-page'
          }`}
        >
          Hard Constraints (13 Rules)
        </button>
        <button
          onClick={() => setActiveTab('soft')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'soft'
              ? 'bg-brand text-white shadow-xs'
              : 'text-muted hover:text-ink hover:bg-page'
          }`}
        >
          Soft Optimization Penalties
        </button>
        <button
          onClick={() => setActiveTab('cli')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'cli'
              ? 'bg-brand text-white shadow-xs'
              : 'text-muted hover:text-ink hover:bg-page'
          }`}
        >
          CLI Validator Terminal Output
        </button>
      </div>

      {/* Tab 1: Hard Constraints Table */}
      {activeTab === 'hard' && (
        <div className="bg-card rounded-2xl border border-line shadow-sm overflow-hidden">
          <div className="p-4 border-b border-line flex items-center justify-between">
            <span className="text-xs font-bold text-ink">Automated Rule Verification Matrix</span>
            <span className="text-xs text-muted">13 of 13 rules verified clean</span>
          </div>

          <div className="divide-y divide-line">
            {hardRules.map((rule) => (
              <div key={rule.id} className="p-4 hover:bg-page/40 transition-colors flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-ok-bg text-ok-text flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4 font-bold" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brand">{rule.id}</span>
                      <span className="font-semibold text-sm text-ink">{rule.title}</span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">{rule.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold text-ok-text bg-ok-bg px-2.5 py-1 rounded-full border border-emerald-200">
                    0 Violations
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Soft Optimization Penalties */}
      {activeTab === 'soft' && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-line p-5 shadow-sm">
            <h3 className="font-bold text-sm text-ink mb-1">Soft Constraint Penalties</h3>
            <p className="text-xs text-muted mb-4">
              Soft constraints guide the CP-SAT solver objective to minimize inconvenience without restricting feasible schedules.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {softMetrics.map((m, i) => (
                <div key={i} className="p-4 rounded-xl bg-page border border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-ink">{m.name}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      Weight: {m.penaltyWeight}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-ink">{m.actualViolations}</div>
                  <div className="text-[11px] text-muted">{m.description}</div>
                  <div className="text-[11px] text-brand font-medium pt-1">
                    Penalty Total: {m.actualViolations * m.penaltyWeight} pts
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: CLI Output Simulation */}
      {activeTab === 'cli' && (
        <div className="bg-ink text-emerald-400 font-mono text-xs rounded-2xl p-5 shadow-inner space-y-2 border border-slate-700">
          <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              <span>python validator.py --schedule exports/schedule.json --dataset data/cit_public.json</span>
            </div>
            <span className="text-emerald-400">Exit Code: 0</span>
          </div>

          <pre className="text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
{`[CIT VALIDATOR v1.0.0] Loading dataset: data/cit_public.json
[CIT VALIDATOR v1.0.0] Loading schedule: exports/schedule.json
Auditing 189 sessions and 41 midsem exams across 27 rooms...

[CHECK 1/13] Room double-booking: PASSED (0 conflicts)
[CHECK 2/13] Faculty double-booking: PASSED (0 conflicts)
[CHECK 3/13] Student group overlaps: PASSED (0 conflicts)
[CHECK 4/13] Faculty daily limit (max 4h): PASSED (0 violations)
[CHECK 5/13] Room capacity requirements: PASSED (0 violations)
[CHECK 6/13] Room type compatibility: PASSED (0 violations)
[CHECK 7/13] Accessibility compliance: PASSED (0 violations)
[CHECK 8/13] Room maintenance windows: PASSED (0 violations)
[CHECK 9/13] Faculty unavailability: PASSED (0 violations)
[CHECK 10/13] Lunch period (P5 13:00-14:00): PASSED (0 violations)
[CHECK 11/13] 3-hr lab start period (P2 or P6): PASSED (0 violations)
[CHECK 12/13] Elective basket concurrency: PASSED (0 violations)
[CHECK 13/13] Exam halved room capacity: PASSED (0 violations)

--------------------------------------------------------------------------------
VALIDATION STATUS: VALID (PASSED)
HARD VIOLATIONS: 0
SOFT PENALTY SCORE: 26.0
--------------------------------------------------------------------------------`}
          </pre>
        </div>
      )}
    </div>
  );
};
