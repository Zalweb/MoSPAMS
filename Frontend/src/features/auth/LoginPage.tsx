import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ArrowLeft, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { currentHostMode } from '@/shared/lib/hostMode';
import { useTenantBranding } from '@/shared/contexts/TenantBrandingContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const hostMode = currentHostMode();
  const tenant = useTenantBranding();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                <span className="text-black text-2xl font-bold">Mo</span>
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
                onClick={() => toast.info('Password reset coming soon')}
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

          {/* SSO Button */}
          <button
            type="button"
            onClick={() => toast.info('Google sign-in coming soon')}
            className="w-full px-6 py-3.5 rounded-xl bg-transparent border border-zinc-700/50 text-white font-medium text-sm hover:bg-zinc-800/30 hover:border-zinc-600/50 transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Log in with Gmail
          </button>

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
