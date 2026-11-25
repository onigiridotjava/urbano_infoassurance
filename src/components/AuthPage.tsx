import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck, UserCheck } from 'lucide-react';
import { SAN_MATEO_BARANGAYS, type User } from '../types/report';

interface AuthPageProps {
  onSuccess: (user: User, token: string) => void;
  onCancel: () => void;
  contextMessage?: string;
  isMobileView?: boolean;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onSuccess,
  onCancel,
  contextMessage,
  isMobileView = false,
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
    <section
      className={`min-h-[calc(100vh-140px)] bg-[#F3F7FD] ${
        isMobileView ? 'py-4 px-3' : 'py-8 sm:py-12 px-4 sm:px-6'
      } flex flex-col items-center justify-center`}
    >
      <div className="w-full max-w-5xl mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#154792] hover:text-[#1177F0] transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portal
        </button>
        {contextMessage && !isMobileView && (
          <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFD700] text-[#154792] text-xs font-bold">
            {contextMessage}
          </div>
        )}
      </div>

      {contextMessage && (
        <div
          className={`${
            isMobileView ? 'block' : 'sm:hidden'
          } w-full max-w-5xl mb-3 px-4 py-2.5 rounded-2xl bg-[#FFD700] text-[#154792] text-xs font-bold`}
        >
          {contextMessage}
        </div>
      )}

      {/* Asymmetric Split-Screen Card */}
      <div
        className={`w-full max-w-5xl bg-[#FEFFFE] ${
          isMobileView
            ? 'rounded-3xl grid-cols-1'
            : 'rounded-tl-[48px] rounded-br-[48px] rounded-tr-2xl rounded-bl-2xl grid-cols-1 lg:grid-cols-12'
        } shadow-2xl shadow-[#154792]/15 border border-[#d9e6f7] overflow-hidden grid`}
      >
        {/* Left Brand Panel (White) */}
        <div
          className={`${
            isMobileView ? 'p-6' : 'lg:col-span-6 p-8 sm:p-10'
          } bg-[#FEFFFE] flex flex-col justify-between`}
        >
          {/* Top-Left Wordmark */}
          <div className="flex items-center gap-2">
            <span className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#154792]">
              e-Sumbong Mo
            </span>
            <span className="text-xs font-bold tracking-wider uppercase text-[#1177F0]">
              • SAN MATEO
            </span>
          </div>

          {/* Centered Large ES + Siren Logo */}
          <div className="my-10 flex flex-col items-center justify-center">
            <img
              src="/media/E-sumbong logo.png"
              alt="e-Sumbong Mo logo"
              className={`${
                isMobileView ? 'w-36 h-36' : 'w-48 h-48 sm:w-56 sm:h-56'
              } object-contain drop-shadow-md`}
            />
          </div>

          {/* Bottom San Mateo Motto */}
          <p className="text-center text-xs sm:text-sm font-medium text-slate-800 leading-relaxed max-w-sm mx-auto">
            Isang bayang <span className="font-extrabold text-[#154792]">MASIGLA</span>,{' '}
            <span className="font-extrabold text-[#154792]">MATATAG</span> at{' '}
            <span className="font-extrabold text-[#154792]">MAKAKALIKASAN</span> na may{' '}
            <span className="font-extrabold text-[#154792]">TAPAT</span> at{' '}
            <span className="font-extrabold text-[#154792]">RESPONSIBONG</span>{' '}
            pamahalaang para sa lahat
          </p>
        </div>

        {/* Right Panel (#154792 Deep Navy) */}
        <div
          className={`${
            isMobileView ? 'p-5' : 'lg:col-span-6 p-6 sm:p-10'
          } bg-[#154792] text-white flex flex-col justify-between`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-6">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-white">
                  {mode === 'login' ? 'WELCOME' : 'Create Citizen Account'}
                </h2>
                <p className="text-xs text-[#BFD9FA] mt-1 font-medium">
                  {roleView === 'lgu_officer'
                    ? 'San Mateo LGU Staff & Dispatch Access'
                    : 'San Mateo, Rizal Resident Report Portal'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode((m) => (m === 'login' ? 'register' : 'login'));
                  setError(null);
                }}
                className="text-xs font-bold text-[#FFD700] hover:underline whitespace-nowrap shrink-0"
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
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FEFFFE] text-[#154792] placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#D6E6FB] mb-1.5">
                      Barangay in San Mateo
                    </label>
                    <select
                      value={barangay}
                      onChange={(e) => setBarangay(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FEFFFE] text-[#154792] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
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
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FEFFFE] text-[#154792] placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
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
                    className="w-full px-4 py-2.5 pr-11 rounded-xl bg-[#FEFFFE] text-[#154792] placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
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

              {/* Primary Sign In button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#5EABF0] hover:bg-[#1177F0] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-[11px] text-[#9CC4F5]">
              <div className="h-px flex-1 bg-white/15" />
              <span>or</span>
              <div className="h-px flex-1 bg-white/15" />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleContinue}
              className="w-full py-2.5 rounded-xl bg-[#FEFFFE] hover:bg-[#F3F7FD] text-slate-800 font-semibold text-sm transition-colors flex items-center justify-center gap-2.5 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
                />
                <path
                  fill="#34A853"
                  d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09Z"
                />
                <path
                  fill="#EA4335"
                  d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96Z"
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
                    ? 'bg-[#FFD700] text-[#154792]'
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
                    ? 'bg-[#FFD700] text-[#154792]'
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