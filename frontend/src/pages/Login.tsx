import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, ShieldCheck, User, Users, Calendar, 
  Sparkles, ArrowRight, Lock, Mail, AlertCircle 
} from 'lucide-react';
import { useAuth, DEMO_PRESETS } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login, quickLogin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials. Please verify your email and password.');
    }
  };

  const handleQuick = async (role: any) => {
    setErrorMsg(null);
    try {
      await quickLogin(role);
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick login failed.');
    }
  };

  return (
    <div className="min-h-screen bg-page flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* CIT Brand Logo */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-brand text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-teal-700/20 mb-4">
          CIT
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-ink">
          CIT Campus Scheduling
        </h2>
        <p className="mt-2 text-sm text-muted">
          Chilika Institute of Technology • Automated Timetabling & Venue Booking
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-card py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-3xl border border-line space-y-6">
          {/* Quick Demo Login Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-ink uppercase tracking-wider">
                1-Click Demo Accounts
              </span>
              <span className="text-[11px] text-brand font-medium">No typing required</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_PRESETS.map((preset) => (
                <button
                  key={preset.role}
                  type="button"
                  onClick={() => handleQuick(preset.role)}
                  disabled={isLoading}
                  className="p-3.5 rounded-2xl border border-line bg-page/50 hover:bg-teal-50/60 hover:border-brand text-left transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-ink group-hover:text-brand">
                      {preset.label}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="text-[11px] text-muted font-mono mt-1">
                    {preset.email}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted">Or sign in with email</span>
            </div>
          </div>

          {/* Error notice */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-bad-bg border border-red-200 text-bad-text text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleManualLogin}>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Institutional Email
              </label>
              <div className="relative rounded-xl border border-line focus-within:border-brand transition-colors">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="admin@cit.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 text-xs text-ink bg-transparent outline-none rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl border border-line focus-within:border-brand transition-colors">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 text-xs text-ink bg-transparent outline-none rounded-xl"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Footer note */}
          <div className="pt-2 text-center text-xs text-muted">
            <span>Powered by OR-Tools CP-SAT & Google Gemini AI Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
};

