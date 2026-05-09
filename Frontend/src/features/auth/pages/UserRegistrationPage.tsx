import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, UserPlus, CheckCircle2, Eye, EyeOff, LogIn } from 'lucide-react';
import { apiMutation } from '@/shared/lib/api';

interface RegistrationForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegistrationResult {
  message: string;
  userId: string;
  shopName: string;
  requestedRole: string;
}

type RegistrationHint = 'sign_in_first' | 'already_member' | null;

export default function UserRegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [hint, setHint] = useState<RegistrationHint>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState<RegistrationForm>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const updateField = (field: keyof RegistrationForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.fullName || !form.email || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setHint(null);
    try {
      const data = await apiMutation<RegistrationResult & { hint?: RegistrationHint }>('/api/register', 'POST', {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      });
      setResult(data);
      setStep('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      toast.error(message);

      // Surface the backend hint so the UI can show an actionable inline tip.
      try {
        const raw = (error as { hint?: string } | null);
        if (raw?.hint === 'sign_in_first' || raw?.hint === 'already_member') {
          setHint(raw.hint as RegistrationHint);
        } else if (message.toLowerCase().includes('wrong password') || message.toLowerCase().includes('sign in first')) {
          setHint('sign_in_first');
        } else if (message.toLowerCase().includes('already have an account in this shop') || message.toLowerCase().includes('already belong')) {
          setHint('already_member');
        }
      } catch {
        // ignore hint-parse errors
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success' && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-900/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-zinc-700/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md px-6">
          <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-zinc-800/50 shadow-2xl p-10 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" strokeWidth={2} />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              {result?.message?.startsWith('Welcome back') ? 'Welcome back!' : 'Welcome aboard!'}
            </h1>
            <p className="text-zinc-400 text-sm mb-6">
              {result?.message?.startsWith('Welcome back')
                ? 'You have joined this shop as a Customer. You can log in right away.'
                : 'Your account has been created. You can log in right away.'}
            </p>

            <div className="bg-zinc-800/40 rounded-2xl border border-zinc-700/40 p-5 text-left mb-6 space-y-3">
              <div>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Shop</p>
                <p className="text-sm text-white font-medium">{result.shopName}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Account Type</p>
                <p className="text-sm text-white font-medium">Customer</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Status</p>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Active
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-100 active:scale-[0.99] transition-all shadow-lg"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-zinc-800/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-zinc-700/5 rounded-full blur-3xl" />
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        <span>Back</span>
      </button>

      <div className="relative z-10 w-full max-w-md px-6 py-10">
        <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-zinc-800/50 shadow-2xl p-10">

          {/* Header */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg overflow-hidden">
              <img src="/images/logo.svg" alt="MoSPAMS" className="w-10 h-10 object-contain" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Create an Account</h1>
            <p className="text-zinc-400 text-sm">
              Sign up to track your motorcycle service and repairs.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="Juan Dela Cruz"
                className="w-full px-4 py-3 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-4 py-3 pr-11 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-4 py-3 pr-11 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-100 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Inline hint banner */}
          {hint === 'sign_in_first' && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
              <LogIn className="mt-0.5 w-4 h-4 shrink-0 text-amber-400" />
              <div className="flex-1">
                <p className="text-xs font-medium text-amber-300">This email already has an account.</p>
                <p className="mt-0.5 text-xs text-amber-400/80">
                  Sign in with your existing credentials, then you will be prompted to join this shop automatically.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="mt-2 text-xs font-semibold text-white underline hover:text-zinc-200 transition-colors"
                >
                  Go to Sign In →
                </button>
              </div>
            </div>
          )}

          {hint === 'already_member' && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
              <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0 text-blue-400" />
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-300">You already belong to this shop.</p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="mt-2 text-xs font-semibold text-white underline hover:text-zinc-200 transition-colors"
                >
                  Sign in instead →
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-zinc-500">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-white font-medium hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
