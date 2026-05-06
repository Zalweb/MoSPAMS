import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!token) {
      toast.error('Missing reset token. Please use the link from your email.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (!token) { setError('Missing reset token. Please use the link from your email.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Tenant-Host': window.location.host,
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? 'Invalid or expired reset link.');
        return;
      }

      setDone(true);
      toast.success('Password reset successfully!');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-zinc-800/50 shadow-2xl p-10 text-center">
          <div className="w-14 h-14 bg-zinc-800/60 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-7 h-7 text-green-400" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Password updated</h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">
            Your password has been changed. You've been signed out of all devices.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-100 transition-all shadow-lg"
          >
            Go to login
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
              <ShieldCheck className="w-7 h-7 text-zinc-300" strokeWidth={1.5} />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Set new password</h1>
            <p className="text-zinc-400 text-sm">Must be at least 8 characters.</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              required
              disabled={loading}
              className="w-full px-4 py-3.5 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
              disabled={loading}
              className="w-full px-4 py-3.5 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
            />

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-100 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
