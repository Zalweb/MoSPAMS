import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const COOLDOWN_SECONDS = 60;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown]   = useState(0);
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendRequest = async (emailValue: string) => {
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Tenant-Host': window.location.host,
        },
        body: JSON.stringify({ email: emailValue }),
      });
    } catch {
      // same behaviour on network error — never reveal if email exists
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Please enter your email address.'); return; }

    await sendRequest(email);
    setSubmitted(true);
    startCooldown();
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    await sendRequest(email);
    startCooldown();
    toast.success('Reset link resent.');
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-zinc-800/50 shadow-2xl p-10 text-center">
          <div className="w-14 h-14 bg-zinc-800/60 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Mail className="w-7 h-7 text-zinc-300" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Check your email</h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-2">
            If an account with that email exists, we've sent a password reset link to{' '}
            <span className="text-white font-medium">{email}</span>.
          </p>
          <p className="text-zinc-500 text-xs mb-8">
            The link expires in <span className="text-zinc-400 font-medium">15 minutes</span>.
          </p>

          <button
            onClick={handleResend}
            disabled={cooldown > 0 || loading}
            className="w-full px-6 py-3 rounded-xl border border-zinc-700/50 text-zinc-300 text-sm font-medium hover:bg-zinc-800/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed mb-4"
          >
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : loading ? 'Sending…' : 'Resend reset link'}
          </button>

          <button
            onClick={() => navigate('/')}
            className="text-sm text-zinc-500 hover:text-white transition-colors flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center relative overflow-hidden px-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-zinc-800/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-zinc-700/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm mb-8"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          Back to login
        </button>

        <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-zinc-800/50 shadow-2xl p-10">
          <div className="flex justify-center mb-8">
            <div className="w-14 h-14 bg-zinc-800/60 rounded-2xl flex items-center justify-center">
              <Mail className="w-7 h-7 text-zinc-300" strokeWidth={1.5} />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Forgot password?</h1>
            <p className="text-zinc-400 text-sm">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              autoComplete="email"
              required
              disabled={loading}
              className="w-full px-4 py-3.5 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-100 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
