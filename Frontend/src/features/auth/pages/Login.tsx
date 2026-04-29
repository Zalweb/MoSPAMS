import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { LayoutGrid, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/context/AuthContext';

interface LocationState { from?: { pathname?: string } }

export default function Login() {
  const { login, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('admin@mospams.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const ok = await login(email, password);
    setSubmitting(false);
    if (!ok) {
      setError('Invalid credentials. Try admin@mospams.com / staff@mospams.com with password "password".');
      return;
    }
    const state = location.state as LocationState | null;
    const dest = state?.from?.pathname && state.from.pathname !== '/login' ? state.from.pathname : '/';
    navigate(dest, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9] relative">
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `radial-gradient(circle, #1C1917 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="w-full max-w-[360px] px-4 relative z-10">
        <div className="text-center mb-10">
          <div className="w-11 h-11 rounded-[14px] bg-[#1C1917] flex items-center justify-center mx-auto mb-4 shadow-md">
            <LayoutGrid className="w-[18px] h-[18px] text-white" strokeWidth={2} />
          </div>
          <h1 className="text-[22px] font-bold text-[#1C1917] tracking-tight leading-none">MoSPAMS</h1>
          <p className="text-[13px] text-[#A8A29E] mt-1.5 font-normal">Motorcycle Service & Parts Management</p>
        </div>

        <div className="bg-white rounded-[20px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.03)] border border-[#F5F5F4]">
          <h2 className="text-[15px] font-semibold text-[#1C1917] mb-5">Sign In</h2>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50/80 text-red-600 text-[12px] mb-4 border border-red-100/50">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-[12px] font-medium text-[#78716C] mb-1.5 block">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-xl border-[#E7E5E4] bg-[#FAFAF9]/50 text-[13px] text-[#1C1917] placeholder:text-[#D6D3D1] focus:border-[#C4C0BC] focus:ring-0 focus:bg-white transition-all"
                placeholder="admin@mospams.com"
              />
            </div>
            <div>
              <Label className="text-[12px] font-medium text-[#78716C] mb-1.5 block">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded-xl border-[#E7E5E4] bg-[#FAFAF9]/50 text-[13px] text-[#1C1917] placeholder:text-[#D6D3D1] focus:border-[#C4C0BC] focus:ring-0 focus:bg-white transition-all"
                placeholder="password"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting || !ready}
              className="w-full h-10 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[13px] font-medium transition-all hover:shadow-lg hover:shadow-stone-900/10 mt-1 disabled:opacity-50"
            >
              {submitting ? 'Signing in…' : 'Sign In'}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 opacity-60" />
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#F5F5F4]">
            <p className="text-[11px] text-[#D6D3D1] text-center font-medium tracking-wide uppercase">Demo Credentials</p>
            <div className="mt-2.5 space-y-1 text-[11px] text-[#A8A29E] text-center">
              <p><span className="font-semibold text-[#78716C]">Admin</span> admin@mospams.com / password</p>
              <p><span className="font-semibold text-[#78716C]">Staff</span> staff@mospams.com / password</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
