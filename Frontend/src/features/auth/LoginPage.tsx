import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ArrowLeft, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { currentHostMode } from '@/shared/lib/hostMode';
import { useTenantBranding } from '@/shared/contexts/TenantBrandingContext';
import type { CredentialResponse } from '@react-oauth/google';
import GoogleLoginButton from '@/features/auth/components/GoogleLoginButton';
import GoogleSignUpModal from '@/features/auth/components/GoogleSignUpModal';
import type { GoogleData } from '@/shared/types';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  const hostMode = currentHostMode();
  const tenant = useTenantBranding();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signUpModal, setSignUpModal] = useState<{ open: boolean; googleData: GoogleData | null }>({ open: false, googleData: null });

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    setGoogleLoading(true);
    try {
      const result = await googleLogin(response.credential);
      if (result.needsRegistration) {
        setSignUpModal({ open: true, googleData: result.googleData });
      } else {
        toast.success('Signed in with Google!');
      }
    } catch {
      toast.error('Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const isSuperAdmin = hostMode === 'platform';
  const isShop = hostMode === 'tenant';
  const shopName = tenant.branding?.shopName || 'Shop';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailOrUsername || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await login(emailOrUsername, password);
      if (result.success) {
        toast.success('Login successful!');
        // Navigation handled by AuthContext
      } else {
        toast.error(result.error || 'Invalid credentials');
      }
    } catch (error) {
      toast.error('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center relative overflow-hidden">
      {/* Subtle background glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-zinc-800/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-zinc-700/5 rounded-full blur-3xl" />
      </div>

      {/* Back Button - Top Left */}
      {hostMode === 'public' && (
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 z-50 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          <span>Back</span>
        </button>
      )}

      {/* Centered Login Container */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-zinc-800/50 shadow-2xl p-10">
          
          {/* Logo/Icon */}
          <div className="flex justify-center mb-8">
            {isSuperAdmin ? (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-zinc-300" strokeWidth={2} />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg overflow-hidden">
                <img src="/images/logo.png" alt="MoSPAMS" className="w-12 h-12 object-contain" />
              </div>
            )}
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-3">
              {isSuperAdmin ? 'Platform Admin' : isShop ? shopName : 'Welcome back'}
            </h1>
            <p className="text-zinc-400 text-sm">
              {isSuperAdmin ? (
                'Sign in to manage the platform'
              ) : isShop ? (
                <>
                  New here?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="text-white font-medium hover:underline"
                  >
                    Join this shop
                  </button>
                </>
              ) : (
                <>
                  New here?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/register-shop')}
                    className="text-white font-medium hover:underline"
                  >
                    Create an account
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <input
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="Email address"
                className="w-full px-4 py-3.5 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3.5 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-white focus:ring-2 focus:ring-zinc-600"
                />
                <span className="text-zinc-400">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-100 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Signing in...' : 'Continue'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800/60" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-zinc-900/40 text-zinc-500 text-xs">or</span>
            </div>
          </div>

          {/* Google Sign-In */}
          <div className={`flex justify-center transition-opacity ${googleLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            <GoogleLoginButton
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google sign-in failed. Please try again.')}
            />
          </div>

          {signUpModal.googleData && (
            <GoogleSignUpModal
              open={signUpModal.open}
              googleData={signUpModal.googleData}
              onClose={() => setSignUpModal({ open: false, googleData: null })}
              onSuccess={() => {
                setSignUpModal({ open: false, googleData: null });
                toast.success('Account created! Welcome to MoSPAMS.');
              }}
            />
          )}

          {/* Footer Legal Text */}
          <p className="mt-8 text-center text-xs text-zinc-500 leading-relaxed">
            By continuing, you agree to our{' '}
            <button type="button" className="text-zinc-400 hover:text-white underline transition-colors">
              Terms
            </button>
            {' '}and{' '}
            <button type="button" className="text-zinc-400 hover:text-white underline transition-colors">
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
