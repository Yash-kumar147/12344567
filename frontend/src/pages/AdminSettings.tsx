import React, { useState } from 'react';
import { 
  Settings, Sliders, ShieldAlert, CheckCircle2, RotateCcw, 
  Layers, Lock, AlertTriangle, ArrowUpDown, Cpu, Save 
} from 'lucide-react';
import { demoReset } from '../api';
import { useAuth } from '../context/AuthContext';

export const AdminSettings: React.FC = () => {
  const { token, user } = useAuth();
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'ok' | 'bad'; text: string } | null>(null);

  const [priorities] = useState([
    { tier: 1, name: 'Midsem / Endsem Exams', description: 'Academic examinations; strictly inviolable. Effective capacity halved.', badge: 'Tier 1 (Highest)' },
    { tier: 2, name: 'Regular Classes & Labs', description: 'Curricular lectures and 3-hour lab sessions.', badge: 'Tier 2' },
    { tier: 3, name: 'Institute Events', description: 'Convocation, Foundation Day, National Seminars, Spectra Fest Keynotes.', badge: 'Tier 3' },
    { tier: 4, name: 'Guest Lectures', description: 'Distinguished visiting scholar lectures and industrial workshops.', badge: 'Tier 4' },
    { tier: 5, name: 'Department Events', description: 'Department technical seminars, symposiums, and faculty colloquiums.', badge: 'Tier 5' },
    { tier: 6, name: 'Club Events', description: 'Student society workshops, cultural rehearsals, hackathons, and social events.', badge: 'Tier 6 (Lowest)' },
  ]);

  const handleResetSubmit = async () => {
    if (confirmationInput !== 'RESET_DEMO_DATA') {
      setFeedbackMsg({ type: 'bad', text: "Confirmation phrase does not match 'RESET_DEMO_DATA'" });
      return;
    }

    setIsResetting(true);
    try {
      await demoReset('RESET_DEMO_DATA', token || undefined);
      setFeedbackMsg({ type: 'ok', text: 'Demo baseline reset successfully! All bookings and disruptions restored to pristine state.' });
      setResetModalOpen(false);
      setConfirmationInput('');
    } catch (e: any) {
      setFeedbackMsg({ type: 'bad', text: e.message || 'Demo reset failed.' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">System Configuration & Policies</h1>
          <p className="text-sm text-muted mt-1">
            Configure Spectra booking priority tiers, CP-SAT solver parameters, and baseline demo state.
          </p>
        </div>

        {feedbackMsg && (
          <div className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            feedbackMsg.type === 'ok' ? 'bg-ok-bg text-ok-text border-emerald-200' : 'bg-bad-bg text-bad-text border-red-200'
          }`}>
            {feedbackMsg.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}
      </div>

      {/* Priority Hierarchy Section */}
      <div className="bg-card rounded-2xl border border-line p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand" />
              <h2 className="text-lg font-bold text-ink">Spectra Venue Priority Hierarchy</h2>
            </div>
            <p className="text-xs text-muted mt-1">
              Deterministic priority order for venue conflict resolution. Higher tiers automatically displace lower tiers.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-brand border border-teal-200">
            6 Strict Tiers Active
          </span>
        </div>

        <div className="space-y-2.5">
          {priorities.map((p) => (
            <div 
              key={p.tier} 
              className="p-4 rounded-xl border border-line bg-page/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-brand font-bold text-xs flex items-center justify-center shrink-0">
                  #{p.tier}
                </div>
                <div>
                  <div className="font-semibold text-sm text-ink">{p.name}</div>
                  <div className="text-xs text-muted mt-0.5">{p.description}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-card border border-line text-ink">
                  {p.badge}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Displacement Policy Box */}
        <div className="bg-teal-50/50 border border-teal-200 rounded-xl p-4 text-xs space-y-1">
          <div className="font-bold text-brand-dark">Priority Displacement Rules:</div>
          <ul className="list-disc pl-4 space-y-1 text-ink/80">
            <li>A higher priority booking displacing a lower priority booking triggers automatic ranked alternative recommendations.</li>
            <li>Bookings in the same priority tier are resolved First-Come First-Served (FCFS); no displacement is permitted.</li>
            <li>Displaced users receive instant notifications with alternative venues that satisfy capacity and equipment criteria.</li>
          </ul>
        </div>
      </div>

      {/* Solver Configuration */}
      <div className="bg-card rounded-2xl border border-line p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-bold text-ink">CP-SAT Optimization Engine Parameters</h2>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-page border border-line text-muted">
            OR-Tools 9.15
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-page border border-line">
            <div className="text-xs text-muted font-medium">Solver Timeout</div>
            <div className="text-xl font-bold text-ink mt-1">40 Seconds</div>
            <div className="text-[11px] text-brand mt-1">Stops on optimal or first feasible</div>
          </div>

          <div className="p-4 rounded-xl bg-page border border-line">
            <div className="text-xs text-muted font-medium">Parallel Worker Threads</div>
            <div className="text-xl font-bold text-ink mt-1">2 Cores</div>
            <div className="text-[11px] text-muted mt-1">Deterministic seed enabled</div>
          </div>

          <div className="p-4 rounded-xl bg-page border border-line">
            <div className="text-xs text-muted font-medium">Soft Penalty Weights</div>
            <div className="text-xl font-bold text-ink mt-1">5 / 2 / 3</div>
            <div className="text-[11px] text-muted mt-1">Avoid Slot / Room Switch / Gap</div>
          </div>
        </div>
      </div>

      {/* Danger Zone: Demo Reset */}
      <div className="bg-card rounded-2xl border border-red-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-bad-text">
          <ShieldAlert className="w-5 h-5" />
          <h2 className="text-lg font-bold">Admin Demo Controls (Danger Zone)</h2>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          Reset all in-memory bookings, approved proposals, and temporary disruptions back to the pristine benchmark state 
          defined in <code className="bg-page px-1 py-0.5 rounded font-mono text-ink">data/cit_public.json</code> and <code className="bg-page px-1 py-0.5 rounded font-mono text-ink">exports/schedule.json</code>.
        </p>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted">
            Requires explicit confirmation string <span className="font-mono font-bold text-bad-text">"RESET_DEMO_DATA"</span>.
          </div>
          <button
            onClick={() => setResetModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Demo Data
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl border border-line max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-bad-text">
              <div className="p-2 rounded-xl bg-bad-bg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-ink">Confirm Demo Reset</h3>
                <p className="text-xs text-muted">This action will erase all live changes.</p>
              </div>
            </div>

            <p className="text-xs text-ink leading-relaxed">
              To proceed, please type <strong className="font-mono text-bad-text">RESET_DEMO_DATA</strong> in the input below:
            </p>

            <input
              type="text"
              placeholder="RESET_DEMO_DATA"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-line text-sm font-mono focus:border-red-500 outline-none"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setResetModalOpen(false);
                  setConfirmationInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-line text-muted hover:text-ink hover:bg-page"
              >
                Cancel
              </button>
              <button
                onClick={handleResetSubmit}
                disabled={confirmationInput !== 'RESET_DEMO_DATA' || isResetting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                {isResetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

