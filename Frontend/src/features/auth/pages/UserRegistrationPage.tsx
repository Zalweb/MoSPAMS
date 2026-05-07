import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, UserPlus, CheckCircle2, Wrench, ClipboardList } from 'lucide-react';
import { apiMutation } from '@/shared/lib/api';

interface RegistrationForm {
  invitationCode: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  requestedRole: 'Staff' | 'Mechanic';
}

interface RegistrationResult {
  message: string;
  userId: string;
  shopName: string;
  requestedRole: string;
}

export default function UserRegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [result, setResult] = useState<RegistrationResult | null>(null);

  const [form, setForm] = useState<RegistrationForm>({
    invitationCode: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    requestedRole: 'Staff',
  });

  const updateField = (field: keyof RegistrationForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.invitationCode || !form.fullName || !form.email || !form.password) {
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
    try {
      const data = await apiMutation<RegistrationResult>('/api/register', 'POST', {
        invitationCode: form.invitationCode,
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        requestedRole: form.requestedRole,
      });
      setResult(data);
      setStep('success');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed. Please try again.');
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

            <h1 className="text-2xl font-bold text-white mb-2">Registration Successful!</h1>
            <p className="text-zinc-400 text-sm mb-6">
              Your account has been created and is pending approval.
            </p>

            <div className="bg-zinc-800/40 rounded-2xl border border-zinc-700/40 p-5 text-left mb-6 space-y-3">
              <div>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Shop</p>
                <p className="text-sm text-white font-medium">{result.shopName}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Requested Role</p>
                <p className="text-sm text-white font-medium">{result.requestedRole}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Status</p>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Pending Approval
                </span>
              </div>
            </div>

            <p className="text-zinc-500 text-xs mb-6 leading-relaxed">
              The shop owner will review your request. Once approved, you'll be able to log in with your email and password.
            </p>

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
            <h1 className="text-2xl font-bold text-white mb-2">Join a Shop</h1>
            <p className="text-zinc-400 text-sm">
              Enter the invitation code from your shop owner to create your account.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Invitation Code */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Invitation Code</label>
              <input
                type="text"
                value={form.invitationCode}
                onChange={(e) => updateField('invitationCode', e.target.value)}
                placeholder="Enter shop invitation code"
                className="w-full px-4 py-3 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all font-mono tracking-wider"
                disabled={loading}
              />
            </div>

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
              <input
                type="password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-4 py-3 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-4 py-3 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2.5">I want to join as</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField('requestedRole', 'Staff')}
                  className={`flex items-center gap-2.5 p-3.5 rounded-xl border transition-all text-left ${
                    form.requestedRole === 'Staff'
                      ? 'bg-white/5 border-white/30 ring-1 ring-white/10'
                      : 'bg-zinc-800/30 border-zinc-700/40 hover:border-zinc-600/60'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      form.requestedRole === 'Staff' ? 'bg-white/10' : 'bg-zinc-800'
                    }`}
                  >
                    <ClipboardList
                      className={`w-4 h-4 ${form.requestedRole === 'Staff' ? 'text-white' : 'text-zinc-500'}`}
                      strokeWidth={1.75}
                    />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${form.requestedRole === 'Staff' ? 'text-white' : 'text-zinc-400'}`}>
                      Staff
                    </p>
                    <p className="text-[10px] text-zinc-500">Sales & Inventory</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => updateField('requestedRole', 'Mechanic')}
                  className={`flex items-center gap-2.5 p-3.5 rounded-xl border transition-all text-left ${
                    form.requestedRole === 'Mechanic'
                      ? 'bg-white/5 border-white/30 ring-1 ring-white/10'
                      : 'bg-zinc-800/30 border-zinc-700/40 hover:border-zinc-600/60'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      form.requestedRole === 'Mechanic' ? 'bg-white/10' : 'bg-zinc-800'
                    }`}
                  >
                    <Wrench
                      className={`w-4 h-4 ${form.requestedRole === 'Mechanic' ? 'text-white' : 'text-zinc-500'}`}
                      strokeWidth={1.75}
                    />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${form.requestedRole === 'Mechanic' ? 'text-white' : 'text-zinc-400'}`}>
                      Mechanic
                    </p>
                    <p className="text-[10px] text-zinc-500">Service Jobs</p>
                  </div>
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
