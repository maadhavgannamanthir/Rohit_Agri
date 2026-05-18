import React, { useEffect, useRef, useState } from 'react';
import {
  X,
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

interface Props {
  open: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

const AuthModal: React.FC<Props> = ({ open, onClose, defaultMode = 'signin' }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
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
    if (open) {
      // Focus first relevant input shortly after open
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const reset = () => {
    setEmail('');
    setPassword('');
    setName('');
    setShowPassword(false);
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    reset();
    onClose();
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
        handleClose();
      } else {
        await signUp(email, password, name.trim());
        setSuccess('Account created. Redirecting to your dashboard…');
        setTimeout(() => handleClose(), 1100);
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/60 backdrop-blur-md"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row ring-1 ring-stone-200/70"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT — Brand panel */}
        <div className="relative hidden md:flex md:w-[44%] bg-gradient-to-br from-[#2D3B1F] via-[#3A4D24] to-[#1F2A14] text-white p-8 flex-col justify-between overflow-hidden">
          {/* decorative blobs */}
          <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-[#6B8E23]/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-[#D2691E]/20 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.06]" style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }} />

          <div className="relative">
            <div className="flex items-center gap-3">
              <img
                src="/rohit-agro-logo.svg"
                alt="Rohit Agro"
                className="w-11 h-11 rounded-xl bg-white/10 p-1 ring-1 ring-white/15"
              />
              <div>
                <div className="font-bold text-lg leading-tight">Rohit Agro</div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-stone-300/80">
                  Farm Operating System
                </div>
              </div>
            </div>

            <h2 className="mt-10 text-3xl font-bold leading-tight">
              {isSignin ? 'Welcome back to your farm.' : 'Run a smarter farm.'}
            </h2>
            <p className="mt-3 text-sm text-stone-300/90 max-w-sm">
              {isSignin
                ? 'Sign in to track livestock, weigh-ins, expenses, and partner profits — all in one place.'
                : 'Create an account to register animals, log weights, manage expenses and split profits with partners automatically.'}
            </p>
          </div>

          <div className="relative space-y-3 mt-10">
            {[
              { icon: BarChart3, text: 'Real-time dashboards & herd insights' },
              { icon: ShieldCheck, text: 'Bank-grade security & row-level access' },
              { icon: Sparkles, text: 'Automatic profit-share calculations' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-stone-100/90">
                <div className="w-8 h-8 rounded-lg bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#C7E07A]" />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>

          <div className="relative text-[11px] text-stone-400 mt-10">
            © {new Date().getFullYear()} Rohit Agro · Built for serious farmers
          </div>
        </div>

        {/* RIGHT — Form */}
        <div className="flex-1 relative bg-white">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="px-6 sm:px-10 pt-8 sm:pt-12 pb-8">
            {/* Mobile brand */}
            <div className="md:hidden flex items-center gap-2.5 mb-6">
              <img src="/rohit-agro-logo.svg" alt="Rohit Agro" className="w-9 h-9 rounded-lg" />
              <div>
                <div className="font-bold text-stone-900 text-sm leading-tight">Rohit Agro</div>
                <div className="text-[10px] uppercase tracking-widest text-stone-500">Farm Manager</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="inline-flex p-1 bg-stone-100 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setSuccess(null);
                }}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${
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
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${
                  !isSignin
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Create account
              </button>
            </div>

            <h3 className="text-2xl font-bold text-stone-900 tracking-tight">
              {isSignin ? 'Sign in to your account' : 'Create your farm account'}
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              {isSignin
                ? 'Enter your credentials to continue.'
                : 'It takes less than a minute. No credit card required.'}
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
                  placeholder="you@farm.com"
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
                      className="text-xs font-semibold text-[#6B8E23] hover:underline"
                      onClick={() =>
                        setError('Password reset is coming soon. Please contact your admin.')
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
                <label className="flex items-center gap-2 text-sm text-stone-600 select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-[#6B8E23] focus:ring-[#6B8E23]"
                  />
                  Remember me on this device
                </label>
              )}

              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="group w-full bg-gradient-to-b from-[#7BA02A] to-[#5F7F1F] hover:from-[#82A82E] hover:to-[#557119] disabled:opacity-60 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-sm shadow-[#6B8E23]/30"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{isSignin ? 'Sign in' : 'Create account'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              {!isSignin && (
                <p className="text-[11px] text-stone-500 text-center leading-relaxed">
                  By creating an account you agree to our{' '}
                  <a href="#" className="underline hover:text-stone-700">Terms</a> and{' '}
                  <a href="#" className="underline hover:text-stone-700">Privacy Policy</a>.
                </p>
              )}
            </form>

            <div className="mt-6 flex items-center gap-2 text-xs text-stone-500 justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Secured with end-to-end encryption
            </div>
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
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
        {label}
      </label>
      {hint}
    </div>
    <div className="relative">{children}</div>
  </div>
);

export default AuthModal;
