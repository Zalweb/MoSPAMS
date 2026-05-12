import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ArrowLeft, Shield, Eye, EyeOff } from 'lucide-react';
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
    try {
      const result = await login(emailOrUsername, password, rememberMe);
      if ('success' in result && result.success) {
        toast.success('Login successful!');
        // Navigation handled by AuthContext
      } else if ('needsMembership' in result && result.needsMembership) {
        toast.message('Account found. Confirm to join this shop as Customer.');
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
    <div className="dark text-foreground min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center relative overflow-hidden">
      {/* Subtle background glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-zinc-800/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-zinc-700/5 rounded-full blur-3xl" />
      </div>

      {/* Back Button - Top Left */}
      {hostMode === 'public' && (
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 z-50 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          <span>Back</span>
        </button>
      )}

      {/* Centered Login Container */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-muted/40 backdrop-blur-2xl rounded-3xl border border-border/50 shadow-2xl p-10">
          
          {/* Logo/Icon */}
          <div className="flex justify-center mb-8">
            {isSuperAdmin ? (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-zinc-300" strokeWidth={2} />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-transparent flex items-center justify-center overflow-hidden">
                <img src={tenant.branding?.logoUrl || "/images/logo.svg"} alt="MoSPAMS" className="w-full h-full object-contain" />
              </div>
            )}
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-3">
              {isSuperAdmin ? 'Platform Admin' : isShop ? shopName : 'Welcome back'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isSuperAdmin ? (
                'Sign in to manage the platform'
              ) : isShop ? (
                <>
                  New here?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="text-foreground font-medium hover:underline"
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
                    className="text-foreground font-medium hover:underline"
                  >
                    Create an account
                  </button>
                </>
              )}
            </p>
          </div>

          {pendingJoin && (
            <div className="mb-6 rounded-2xl border border-zinc-700/50 bg-zinc-800/40 p-4">
              <p className="text-sm font-medium text-foreground">Join {pendingJoin.shop.shopName} as Customer</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {pendingJoin.account?.email ?? 'This account'} is verified and can be added to this shop with Customer access.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleJoinShop}
                  disabled={joining}
                  className="flex-1 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-60"
                >
                  {joining ? 'Joining...' : 'Join this shop'}
                </button>
                <button
                  type="button"
                  onClick={clearPendingJoin}
                  disabled={joining}
                  className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="login-email" className="sr-only">Email address</label>
              <input
                id="login-email"
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
                className="w-full px-4 py-3.5 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-foreground placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
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
                className="w-full px-4 py-3.5 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-foreground placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all pr-12"
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

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-foreground focus:ring-2 focus:ring-zinc-600"
                />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3.5 rounded-xl bg-[rgb(var(--color-primary-rgb))] text-white font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-[rgb(var(--color-primary-rgb))]/20"
            >
              {loading ? 'Signing in...' : 'Continue'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-muted/40 text-muted-foreground text-xs">or</span>
            </div>
          </div>

          {/* Google Sign-In */}
          {isShop ? (
            /* Tenant subdomains: redirect to centralized proxy on mospams.shop */
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleGoogleProxy}
                aria-label="Sign in with Google"
                className="flex items-center gap-3 px-6 py-2.5 bg-white hover:bg-zinc-100 text-zinc-700 font-medium text-sm rounded-lg border border-zinc-300 transition-colors shadow-sm w-[320px] justify-center"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </button>
            </div>
          ) : (
            /* Public/Platform hosts: use direct GIS button (registered origins) */
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

          {/* Footer Legal Text */}
          <p className="mt-8 text-center text-xs text-muted-foreground leading-relaxed">
            By continuing, you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
