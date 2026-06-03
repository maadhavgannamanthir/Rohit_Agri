import React, { useState, useRef, useEffect } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  BarChart3,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const AuthPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus first input on load or mode switch
    setTimeout(() => firstInputRef.current?.focus(), 80);
  }, [mode]);

  const reset = () => {
    setEmail('');
    setPassword('');
    setName('');
    setShowPassword(false);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password, name.trim());
        setSuccess('Account created successfully! Logging you in...');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isSignin = mode === 'signin';

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4 relative overflow-hidden">
      {/* background flourish */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-[#6B8E23]/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-[#D2691E]/10 blur-3xl" />
      </div>

      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row ring-1 ring-stone-200/70">
        {/* LEFT — Brand panel */}
        <div className="relative hidden md:flex md:w-[44%] bg-gradient-to-b from-[#2D3B1F] via-[#26331A] to-[#1B2412] text-white p-8 flex-col justify-between overflow-hidden">
          {/* decorative blobs */}
          <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-[#6B8E23]/25 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-[#D2691E]/15 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }} />

          <div className="relative">
            <div className="flex items-center gap-3">
              <img
                src="/rohit-agro-logo.svg"
                alt="Rohit Agro"
                className="w-11 h-11 rounded-xl bg-white p-0.5 shadow-md"
              />
              <div>
                <div className="font-bold text-lg leading-tight">Rohit Agro</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-stone-300">
                  ERP Farm Portal
                </div>
              </div>
            </div>

            <h2 className="mt-10 text-2xl font-bold leading-tight">
              {isSignin ? 'Secure Livestock & Dairy Admin' : 'Register New Staff Account'}
            </h2>
            <p className="mt-3 text-sm text-stone-300/90 leading-relaxed">
              {isSignin
                ? 'Sign in to access your dashboard, record milk collections, manage clients, and track financials.'
                : 'Configure administrative credentials to monitor inventory, generate client invoices, and log veterinary visits.'}
            </p>
          </div>

          <div className="relative space-y-3.5 mt-8">
            {[
              { icon: BarChart3, text: 'Milking Logs & Yield Analytics' },
              { icon: ShieldCheck, text: 'Protected Administration ERP' },
              { icon: Sparkles, text: 'Client Invoicing & Payment Tracking' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-stone-200">
                <div className="w-8 h-8 rounded-lg bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#C7E07A]" />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>

          <div className="relative text-[10px] text-stone-400 mt-10">
            © {new Date().getFullYear()} Rohit Agro · Authorized Staff Only
          </div>
        </div>

        {/* RIGHT — Form */}
        <div className="flex-1 relative bg-white p-6 sm:p-10 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            {/* Mobile brand logo */}
            <div className="md:hidden flex items-center gap-2.5 mb-6">
              <img src="/rohit-agro-logo.svg" alt="Rohit Agro" className="w-9 h-9 rounded-lg shadow-sm" />
              <div>
                <div className="font-bold text-stone-900 text-sm leading-tight">Rohit Agro</div>
                <div className="text-[10px] uppercase tracking-widest text-stone-500">ERP Farm Portal</div>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="inline-flex p-1 bg-stone-100 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setSuccess(null);
                }}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                  isSignin
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setSuccess(null);
                }}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                  !isSignin
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Create Staff Account
              </button>
            </div>

            <h3 className="text-xl font-bold text-stone-900 tracking-tight">
              {isSignin ? 'Sign in to Rohit Agro' : 'Staff Registration'}
            </h3>
            <p className="mt-1 text-xs text-stone-500">
              {isSignin
                ? 'Authorized personnel login. Credentials required.'
                : 'Create an administrative profile to manage farm workflows.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {!isSignin && (
                <Field label="Full name">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input
                    ref={isSignin ? null : firstInputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Farmer"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:border-[#6B8E23] focus:ring-2 focus:ring-[#6B8E23]/20 outline-none text-sm transition"
                  />
                </Field>
              )}

              <Field label="Email address">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  ref={isSignin ? firstInputRef : null}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@rohitagro.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:border-[#6B8E23] focus:ring-2 focus:ring-[#6B8E23]/20 outline-none text-sm transition"
                  autoComplete="email"
                />
              </Field>

              <Field
                label="Password"
                hint={
                  isSignin ? (
                    <button
                      type="button"
                      className="text-[10px] font-semibold text-[#6B8E23] hover:underline"
                      onClick={() =>
                        setError('Password reset is coming soon. Please contact your system administrator.')
                      }
                    >
                      Forgot password?
                    </button>
                  ) : null
                }
              >
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignin ? 'Your password' : 'At least 6 characters'}
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:border-[#6B8E23] focus:ring-2 focus:ring-[#6B8E23]/20 outline-none text-sm transition"
                  autoComplete={isSignin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </Field>

              {isSignin && (
                <label className="flex items-center gap-2 text-xs text-stone-600 select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-[#6B8E23] focus:ring-[#6B8E23]"
                  />
                  Remember session on this device
                </label>
              )}

              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="group w-full bg-gradient-to-b from-[#7BA02A] to-[#5F7F1F] hover:from-[#82A82E] hover:to-[#557119] disabled:opacity-60 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-sm shadow-[#6B8E23]/30 text-sm"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{isSignin ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label className="text-[10px] font-bold text-stone-700 uppercase tracking-wider">
        {label}
      </label>
      {hint}
    </div>
    <div className="relative">{children}</div>
  </div>
);

export default AuthPage;
