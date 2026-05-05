import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowLeft, Bike, Loader2 } from 'lucide-react';
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
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-800 shadow-2xl shadow-black/50 p-6 sm:p-8 relative overflow-hidden"
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      {/* Back Button */}
      <motion.button
        onClick={onBack}
        className="absolute top-6 right-6 flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-white transition-colors"
        whileHover={{ x: -4 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </motion.button>

      {/* Content */}
      <div className="relative z-10">
        {/* Logo */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
            <Bike className="w-6 h-6 text-white" />
          </div>
        </motion.div>

        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
          <p className="text-sm text-zinc-400">Sign in to your MoSPAMS account</p>
        </motion.div>

        {error && (
          <motion.div
            className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-5"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email or phone"
              className="w-full h-11 px-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-white/10 transition-all"
              autoComplete="email"
              required
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full h-11 px-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-white/10 transition-all"
              autoComplete="current-password"
              required
            />
          </motion.div>

          <motion.div
            className="flex items-center justify-between pt-1 pb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-white focus:ring-white/20 focus:ring-offset-0"
              />
              <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">Remember me</span>
            </label>
            <a href="#" className="text-sm text-zinc-400 hover:text-white font-medium transition-colors">
              Forgot password?
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <button
              type="submit"
              disabled={submitting || !ready}
              className="w-full h-11 rounded-xl bg-white hover:bg-zinc-200 text-black text-sm font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </motion.div>
        </form>

        <motion.div
          className="flex items-center my-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex-1 border-t border-zinc-700/50"></div>
          <span className="px-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Or</span>
          <div className="flex-1 border-t border-zinc-700/50"></div>
        </motion.div>

        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in failed. Please try again.')}
          />
        </motion.div>

        <motion.p
          className="text-center mt-6 text-sm text-zinc-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Don't have an account?{' '}
          <a href="#" className="text-white hover:text-zinc-300 font-medium transition-colors">
            Sign up
          </a>
        </motion.p>
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