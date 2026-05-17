import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ArrowLeft, Shield, Eye, EyeOff, MailWarning } from 'lucide-react';
import { toast } from 'sonner';
import { currentHostMode } from '@/shared/lib/hostMode';
import { useTenantBranding } from '@/shared/contexts/TenantBrandingContext';
import type { CredentialResponse } from '@react-oauth/google';
import GoogleLoginButton from '@/features/auth/components/GoogleLoginButton';
import GoogleSignUpModal from '@/features/auth/components/GoogleSignUpModal';
import type { GoogleData } from '@/shared/types';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, googleLogin, pendingJoin, joinShop, clearPendingJoin } = useAuth();
  const hostMode = currentHostMode();
  const tenant = useTenantBranding();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [signUpModal, setSignUpModal] = useState<{ open: boolean; googleData: GoogleData | null }>({ open: false, googleData: null });

  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    setGoogleLoading(true);
    try {
      const result = await googleLogin(response.credential);
      if ('needsRegistration' in result && result.needsRegistration) {
        setSignUpModal({ open: true, googleData: result.googleData });
      } else if ('needsMembership' in result && result.needsMembership) {
        toast.message('Sign-in verified. Confirm to join this shop as Customer.');
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

  // On tenant subdomains, redirect to centralized Google OAuth proxy
  const handleGoogleProxy = () => {
    const subdomain = window.location.hostname.split('.')[0];
    const returnTo = encodeURIComponent(`${window.location.origin}/auth/callback`);
    const proxyHost = import.meta.env.VITE_GOOGLE_PROXY_HOST || 'mospams.shop';
    window.location.href = `https://${proxyHost}/auth/google?tenant=${subdomain}&return_to=${returnTo}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailOrUsername || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    setUnverifiedEmail(null);
    try {
      const result = await login(emailOrUsername, password, rememberMe);
      if ('success' in result && result.success) {
        toast.success('Login successful!');
        // Navigation handled by AuthContext
      } else if ('needsMembership' in result && result.needsMembership) {
        toast.message('Account found. Confirm to join this shop as Customer.');
      } else if ('requiresVerification' in result && result.requiresVerification) {
        setUnverifiedEmail(result.email);
      } else {
        toast.error(('error' in result && result.error) || 'Invalid credentials');
      }
    } catch (error) {
      toast.error('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinShop = async () => {
    if (!pendingJoin) return;

    setJoining(true);
    try {
      const result = await joinShop(pendingJoin.joinToken);
      if (result.success) {
        toast.success(`Joined ${pendingJoin.shop.shopName} as Customer.`);
      } else {
        toast.error(result.error);
      }
    } finally {
      setJoining(false);
    }
  };
  return (
    <div className="dark text-foreground min-h-screen bg-zinc-950 flex items-center justify-center relative overflow-hidden">
      {/* Background glow / light ray */}
      <div className="absolute inset-0 pointer-events-none flex justify-center">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[100px] pointer-events-none" />
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
      <div className="relative z-10 w-full max-w-[400px] px-6">
        <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-[32px] border border-white/5 shadow-2xl p-8 sm:p-10">
          
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-8">
            {isSuperAdmin ? (
              <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-zinc-300" strokeWidth={2} />
              </div>
            ) : (
              <div className="w-12 h-12 mb-4 rounded-xl flex items-center justify-center overflow-hidden">
                <img src={tenant.branding?.logoUrl || "/images/logo.svg"} alt="Logo" className="w-full h-full object-contain" />
              </div>
            )}
            <h1 className="text-[22px] font-semibold text-white mb-2 tracking-tight">
              {isSuperAdmin ? 'Platform Admin' : isShop ? shopName : 'Sign In'}
            </h1>
            <p className="text-zinc-400 text-xs">
              Please enter your details to sign in.
            </p>
          </div>

          {pendingJoin && (
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <p className="text-sm font-medium text-white">Join {pendingJoin.shop.shopName}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {pendingJoin.account?.email ?? 'This account'} is verified and can be added as a Customer.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleJoinShop}
                  disabled={joining}
                  className="flex-1 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-60"
                >
                  {joining ? 'Joining...' : 'Join shop'}
                </button>
                <button
                  type="button"
                  onClick={clearPendingJoin}
                  disabled={joining}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {unverifiedEmail && (
            <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <MailWarning className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-300">Email not verified</p>
                  <p className="mt-1 text-xs text-amber-400/80">
                    Please verify your email before signing in.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/register?verify=${encodeURIComponent(unverifiedEmail)}`)}
                    className="mt-3 text-xs font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors"
                  >
                    Enter verification code →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Email Input */}
              <div>
                <label htmlFor="login-email" className="sr-only">Enter your email address</label>
                <input
                  id="login-email"
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="Enter your email address"
                  autoComplete="email"
                  className="w-full px-4 py-3.5 bg-zinc-800/40 border border-white/5 rounded-xl text-white placeholder-zinc-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                  disabled={loading}
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <label htmlFor="login-password" className="sr-only">Password</label>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full px-4 py-3.5 bg-zinc-800/40 border border-white/5 rounded-xl text-white placeholder-zinc-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-white/20 transition-all pr-12"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-[11px] sm:text-xs mt-3 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-zinc-800/50 border-white/10 text-white focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-zinc-400">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-transparent text-zinc-500 text-[10px] uppercase tracking-widest backdrop-blur-sm">or</span>
            </div>
          </div>

          {/* Google Sign-In */}
          {isShop ? (
            <button
              type="button"
              onClick={handleGoogleProxy}
              aria-label="Sign in with Google"
              className="flex w-full items-center justify-center gap-3 px-6 py-3.5 bg-zinc-800/40 hover:bg-zinc-800/60 text-zinc-300 font-medium text-xs sm:text-sm rounded-xl border border-white/5 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
          ) : (
            <>
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
                  onSuccess={(_token: string) => {
                    setSignUpModal({ open: false, googleData: null });
                    toast.success('Account created! Welcome to MoSPAMS.');
                  }}
                />
              )}
            </>
          )}

          {/* Footer Sign Up */}
          <div className="mt-8 text-center">
            <p className="text-[11px] sm:text-xs text-zinc-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate(isShop ? '/register' : '/register-shop')}
                className="text-white font-medium hover:underline transition-colors"
              >
                Sign up
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
