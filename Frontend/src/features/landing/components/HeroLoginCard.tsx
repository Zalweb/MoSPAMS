import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/context/AuthContext';
import GoogleSignUpModal from '@/features/auth/components/GoogleSignUpModal';
import GoogleLoginButton from '@/features/auth/components/GoogleLoginButton';
import type { GoogleData } from '@/shared/types';
import type { CredentialResponse } from '@react-oauth/google';

interface HeroLoginCardProps {
  onBack: () => void;
}

interface LocationState {
  from?: { pathname?: string };
}

export default function HeroLoginCard({ onBack }: HeroLoginCardProps) {
  const { login, googleLogin, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [googleData, setGoogleData] = useState<GoogleData | null>(null);

  const dest = () => {
    const state = location.state as LocationState | null;
    return state?.from?.pathname && state.from.pathname !== '/'
      ? state.from.pathname
      : '/dashboard';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email or phone.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-full max-w-md bg-white rounded-2xl border border-violet-100 shadow-[0_8px_30px_rgb(124,58,237,0.12)] p-6 sm:p-8 relative"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-black transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to overview
      </button>

      {/* Header */}
      <div className="text-center mb-8 mt-8">
        <h2 className="text-2xl font-bold text-black mb-2">Welcome</h2>
        <p className="text-sm text-zinc-500">We are happy to have you back!</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-600 text-xs mb-5 border border-red-100">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email or phone"
            className="h-11 rounded-xl border-zinc-200 bg-white text-sm text-black placeholder:text-zinc-400 focus:border-black focus:ring-4 focus:ring-black/5 focus:bg-white transition-all"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="h-11 rounded-xl border-zinc-200 bg-white text-sm text-black placeholder:text-zinc-400 focus:border-black focus:ring-4 focus:ring-black/5 focus:bg-white transition-all"
            autoComplete="current-password"
            required
          />
        </div>

        <div className="flex items-center justify-between pt-1 pb-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black focus:ring-offset-0"
            />
            <span className="text-sm text-zinc-500 group-hover:text-zinc-700 transition-colors">Remember me</span>
          </label>
          <a href="#" className="text-sm text-black hover:text-black font-medium transition-colors">
            Forgot password?
          </a>
        </div>

        <Button
          type="submit"
          disabled={submitting || !ready}
          className="w-full h-11 rounded-xl bg-black hover:bg-zinc-800 text-white text-sm font-semibold transition-all duration-200 disabled:opacity-50"
        >
          {submitting ? 'Logging...' : 'Log In'}
        </Button>
      </form>

      <div className="flex items-center my-6">
        <div className="flex-1 border-t border-gray-100"></div>
        <span className="px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Or</span>
        <div className="flex-1 border-t border-gray-100"></div>
      </div>

      <div className="flex justify-center">
        <GoogleLoginButton
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Google sign-in failed. Please try again.')}
        />
      </div>

      <div className="text-center mt-6">
        <p className="text-sm text-gray-500">
          Don't have account?{' '}
          <a href="#" className="text-violet-600 hover:text-violet-700 font-medium transition-colors">
            Sign up
          </a>
        </p>
      </div>

      {googleData && (
        <GoogleSignUpModal
          open={signUpOpen}
          googleData={googleData}
          onClose={() => {
            setSignUpOpen(false);
            setGoogleData(null);
          }}
          onSuccess={() => {
            setSignUpOpen(false);
            navigate(dest(), { replace: true });
          }}
        />
      )}
    </motion.div>
  );
}
