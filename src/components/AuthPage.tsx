import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck, UserCheck } from 'lucide-react';
import { SAN_MATEO_BARANGAYS, type User } from '../types/report';

interface AuthPageProps {
  onSuccess: (user: User, token: string) => void;
  onCancel: () => void;
  contextMessage?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onSuccess,
  onCancel,
  contextMessage,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [roleView, setRoleView] = useState<'citizen' | 'lgu_officer'>('citizen');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('katelyn.urbano@gmail.com');
  const [password, setPassword] = useState('citizen2026');
  const [showPassword, setShowPassword] = useState(false);
  const [barangay, setBarangay] = useState<string>(SAN_MATEO_BARANGAYS[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchRolePreset = (role: 'citizen' | 'lgu_officer') => {
    setRoleView(role);
    setMode('login');
    setError(null);
    if (role === 'citizen') {
      setEmail('katelyn.urbano@gmail.com');
      setPassword('citizen2026');
    } else {
      setEmail('dispatch@sanmateo.gov.ph');
      setPassword('officer2026');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        mode === 'login'
          ? { email, password }
          : { name, email, password, barangay };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { user?: User; token?: string; error?: string };
      if (!res.ok || !data.user || !data.token) {
        setError(data.error || 'Authentication failed.');
        return;
      }
      onSuccess(data.user, data.token);
    } catch {
      setError('Unable to reach San Mateo authentication service.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleContinue = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: roleView === 'lgu_officer' ? 'dispatch@sanmateo.gov.ph' : 'katelyn.urbano@gmail.com',
          password: roleView === 'lgu_officer' ? 'officer2026' : 'citizen2026',
        }),
      });
      const data = (await res.json()) as { user?: User; token?: string; error?: string };
      if (!res.ok || !data.user || !data.token) {
        setError(data.error || 'Google sign-in failed.');
        return;
      }
      onSuccess(data.user, data.token);
    } catch {
      setError('Unable to complete Google sign-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-[calc(100vh-140px)] bg-[#F3F7FD] py-8 sm:py-12 px-4 sm:px-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-5xl mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#154792] hover:text-[#1177F0] transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portal
        </button>
        {contextMessage && (
          <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FBE95C] text-[#154792] text-xs font-bold">
            {contextMessage}
          </div>
        )}
      </div>

      {contextMessage && (
        <div className="sm:hidden w-full max-w-5xl mb-4 px-4 py-2.5 rounded-2xl bg-[#FBE95C] text-[#154792] text-xs font-bold">
          {contextMessage}
        </div>
      )}

      {/* Asymmetric Split-Screen Card */}
      <div className="w-full max-w-5xl bg-[#FEFFFE] rounded-tl-[48px] rounded-br-[48px] rounded-tr-2xl rounded-bl-2xl shadow-2xl shadow-[#154792]/15 border border-[#d9e6f7] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Panel (#FEFFFE White) */}
        <div className="lg:col-span-6 bg-[#FEFFFE] p-8 sm:p-10 flex flex-col justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#154792] flex items-center justify-center text-[#FBE95C] font-extrabold text-sm">
              eS
            </div>
            <div>
              <span className="font-display font-extrabold text-base text-[#154792] tracking-tight">
                e-Sumbong Mo
              </span>
              <span className="mx-1.5 text-[#5EABF0]">•</span>
              <span className="text-xs font-bold text-[#1177F0] uppercase tracking-wide">
                San Mateo
              </span>
            </div>
          </div>

          {/* Clean Civic Vector Illustration in #1177F0 & #FBE95C */}
          <div className="my-8 flex items-center justify-center">
            <svg
              viewBox="0 0 360 240"
              className="w-full max-w-[320px] h-auto"
              fill="none"
              aria-hidden="true"
            >
              <rect x="20" y="24" width="320" height="184" rx="28" fill="#F3F7FD" />
              {/* Sierra Madre hills */}
              <path
                d="M28 168 L92 104 L148 142 L214 88 L286 138 L332 114 L332 184 L28 184 Z"
                fill="#5EABF0"
                fillOpacity="0.24"
              />
              {/* San Mateo Municipal Hall silhouette */}
              <rect x="78" y="106" width="110" height="72" rx="8" fill="#154792" />
              <rect x="106" y="88" width="54" height="22" rx="4" fill="#1177F0" />
              <rect x="129" y="66" width="8" height="24" rx="2" fill="#154792" />
              <circle cx="133" cy="64" r="6" fill="#FBE95C" />
              <rect x="92" y="122" width="14" height="16" rx="2" fill="#F3F7FD" />
              <rect x="114" y="122" width="14" height="16" rx="2" fill="#F3F7FD" />
              <rect x="136" y="122" width="14" height="16" rx="2" fill="#F3F7FD" />
              <rect x="158" y="122" width="14" height="16" rx="2" fill="#F3F7FD" />
              <rect x="122" y="148" width="22" height="30" rx="4" fill="#FBE95C" />

              {/* Floating Pin & Verified Check Card */}
              <rect
                x="196"
                y="62"
                width="112"
                height="96"
                rx="18"
                fill="#FEFFFE"
                stroke="#D6E4F7"
                strokeWidth="2"
              />
              <circle cx="252" cy="96" r="18" fill="#1177F0" />
              <circle cx="252" cy="96" r="7" fill="#FBE95C" />
              <rect x="216" y="124" width="72" height="8" rx="4" fill="#154792" fillOpacity="0.85" />
              <rect x="226" y="138" width="52" height="6" rx="3" fill="#5EABF0" />

              {/* Status pill badge */}
              <rect x="44" y="156" width="88" height="28" rx="14" fill="#FBE95C" />
              <circle cx="60" cy="170" r="5" fill="#154792" />
              <rect x="70" y="167" width="48" height="6" rx="3" fill="#154792" />
            </svg>
          </div>

          <p className="text-sm sm:text-base font-bold text-[#154792] text-balance">
            Report neighborhood hazards. Track real-time LGU action.
          </p>
        </div>

        {/* Right Panel (#154792 Deep Navy) */}
        <div className="lg:col-span-6 bg-[#154792] text-white p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-6">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-white">
                  {mode === 'login' ? 'Welcome back' : 'Create Citizen Account'}
                </h2>
                <p className="text-xs text-[#BFD9FA] mt-1 font-medium">
                  {roleView === 'lgu_officer'
                    ? 'San Mateo LGU Staff & Dispatch Access'
                    : 'San Mateo Resident Reporting Access'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode((m) => (m === 'login' ? 'register' : 'login'));
                  setError(null);
                }}
                className="text-xs font-bold text-[#FBE95C] hover:underline whitespace-nowrap shrink-0"
              >
                {mode === 'login' ? 'Register' : 'Sign In'}
              </button>
            </div>

            {error && (
              <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-500/20 border border-red-300/40 text-xs font-semibold text-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#D6E6FB] mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Juan Dela Cruz"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FEFFFE] text-[#154792] placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FBE95C]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#D6E6FB] mb-1.5">
                      Barangay in San Mateo
                    </label>
                    <select
                      value={barangay}
                      onChange={(e) => setBarangay(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FEFFFE] text-[#154792] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FBE95C]"
                    >
                      {SAN_MATEO_BARANGAYS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#D6E6FB] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="resident@sanmateo.ph"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FEFFFE] text-[#154792] placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FBE95C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#D6E6FB] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-4 py-2.5 pr-11 rounded-xl bg-[#FEFFFE] text-[#154792] placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FBE95C]"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4679C0] hover:text-[#154792]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* White primary Sign In button with #154792 text */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#FEFFFE] hover:bg-[#F3F7FD] text-[#154792] font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-[11px] text-[#9CC4F5]">
              <div className="h-px flex-1 bg-white/15" />
              <span>OR</span>
              <div className="h-px flex-1 bg-white/15" />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleContinue}
              className="w-full py-2.5 rounded-xl bg-[#145EC1] hover:bg-[#1177F0] border border-white/20 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#FBE95C"
                  d="M21.35 11.1H12v3.2h5.35c-.5 2.3-2.5 3.8-5.35 3.8a6 6 0 1 1 0-12c1.5 0 2.85.55 3.9 1.45l2.3-2.3A9.3 9.3 0 0 0 12 2.7a9.3 9.3 0 1 0 0 18.6c5.35 0 8.95-3.75 8.95-9.05 0-.4-.05-.8-.1-1.15Z"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          {/* Clean Role Switcher at the bottom */}
          <div className="mt-7 pt-5 border-t border-white/15">
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0F3673]">
              <button
                type="button"
                onClick={() => switchRolePreset('citizen')}
                className={`py-2 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  roleView === 'citizen'
                    ? 'bg-[#FBE95C] text-[#154792]'
                    : 'text-[#D6E6FB] hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                Citizen Resident
              </button>
              <button
                type="button"
                onClick={() => switchRolePreset('lgu_officer')}
                className={`py-2 px-3 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                  roleView === 'lgu_officer'
                    ? 'bg-[#FBE95C] text-[#154792]'
                    : 'text-[#D6E6FB] hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                LGU Staff / Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
