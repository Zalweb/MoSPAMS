import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/context/AuthContext';
import GoogleSignUpModal from '@/features/auth/components/GoogleSignUpModal';
import GoogleLoginButton from '@/features/auth/components/GoogleLoginButton';
import type { GoogleData } from '@/shared/types';

interface LocationState { from?: { pathname?: string } }

export default function Login() {
  const { login, googleLogin, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [googleData, setGoogleData] = useState<GoogleData | null>(null);

  const dest = () => {
    const state = location.state as LocationState | null;
    return state?.from?.pathname && state.from.pathname !== '/login' ? state.from.pathname : '/';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email or phone.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    setSubmitting(true);
    const result = await login(email.trim().toLowerCase(), password.trim());
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Invalid email or password.');
      return;
    }
    navigate(dest(), { replace: true });
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return;
    const result = await googleLogin(credentialResponse.credential);
    if (result.needsRegistration) {
      setGoogleData(result.googleData);
      setSignUpOpen(true);
    } else {
      navigate(dest(), { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
      <div className="w-full max-w-[360px] px-4">
        <div className="bg-white rounded-[20px] border border-[#F5F5F4] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.03)] p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-[22px] font-semibold text-[#1C1917] mb-2">Welcome</h1>
            <p className="text-sm text-[#A8A29E]">We are happy to have you back!</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50/80 text-red-600 text-[12px] mb-4 border border-red-100/50">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div>
              <Input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email or phone"
                className="h-[42px] rounded-xl border-[#E7E5E4] bg-[#FAFAF9]/50 text-[13px] text-[#1C1917] placeholder:text-[#D6D3D1] focus:border-[#C4C0BC] focus:ring-0 focus:bg-white transition-all"
                autoComplete="email"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-[42px] rounded-xl border-[#E7E5E4] bg-[#FAFAF9]/50 text-[13px] text-[#1C1917] placeholder:text-[#D6D3D1] focus:border-[#C4C0BC] focus:ring-0 focus:bg-white transition-all"
                autoComplete="current-password"
                required
              />
            </div>

            {/* Options Row */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E7E5E4] text-[#1C1917] focus:ring-[#C4C0BC]"
                />
                <span className="text-sm text-[#78716C]">Remember me</span>
              </label>
              <a href="#" className="text-sm text-[#1C1917] hover:text-[#292524] font-medium">
                Forgot password?
              </a>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={submitting || !ready}
              className="w-full h-[42px] rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-sm font-medium transition-all disabled:opacity-50"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-[#E7E5E4]"></div>
            <span className="px-4 text-sm text-[#A8A29E]">Or</span>
            <div className="flex-1 border-t border-[#E7E5E4]"></div>
          </div>

          {/* Google Sign In Button */}
          <div className="flex justify-center">
            <GoogleLoginButton
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in failed. Please try again.')}
            />
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-sm text-[#78716C]">
              Don't have account{' '}
              <a href="#" className="text-[#1C1917] hover:text-[#292524] font-medium">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>

      {googleData && (
        <GoogleSignUpModal
          open={signUpOpen}
          googleData={googleData}
          onClose={() => { setSignUpOpen(false); setGoogleData(null); }}
          onSuccess={() => { setSignUpOpen(false); navigate(dest(), { replace: true }); }}
        />
      )}
    </div>
  );
}
