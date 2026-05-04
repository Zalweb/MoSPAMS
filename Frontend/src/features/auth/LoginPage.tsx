import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowLeft, Shield, TrendingUp, Package, Wrench, DollarSign } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-950 to-black flex overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-zinc-800/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-zinc-800/20 rounded-full blur-[120px]" />
      </div>

      {/* Back to Home Button - Only show for public access */}
      {hostMode === 'public' && (
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          Back to Home
        </button>
      )}

      {/* Left Side - Text Content */}
      <div className="hidden lg:flex relative w-1/2 items-center justify-center p-12">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold mb-4">
              <TrendingUp className="w-3.5 h-3.5" strokeWidth={2} />
              Dashboard Preview
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
              Manage your shop with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
                real-time insights
              </span>
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Track inventory, services, sales, and reports all in one place.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatCard
              icon={DollarSign}
              label="Total Revenue"
              value="₱125,450"
              change="+12.5%"
              changeColor="text-green-400"
            />
            <StatCard
              icon={Package}
              label="Parts in Stock"
              value="1,247"
              change="-8 today"
              changeColor="text-zinc-400"
            />
            <StatCard
              icon={Wrench}
              label="Active Jobs"
              value="23"
              change="+5 new"
              changeColor="text-blue-400"
            />
            <StatCard
              icon={TrendingUp}
              label="Completed"
              value="156"
              change="This month"
              changeColor="text-zinc-400"
            />
          </div>

          {/* Chart Preview */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">
                  Revenue Trend
                </p>
                <p className="text-2xl font-bold text-white">₱48,250</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-semibold">
                +18.2%
              </div>
            </div>
            <div className="flex items-end gap-1 h-32">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 65, 92, 78, 85, 70, 95, 82, 90].map((height, i) => (
                <div
                  key={i}
                  className="flex-1 bg-zinc-700 rounded-t-sm hover:bg-white transition-colors cursor-pointer"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 mt-2">
              <span>Jan 1</span>
              <span>Jan 15</span>
              <span>Today</span>
            </div>
          </div>

          {/* Features List */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              'Real-time Analytics',
              'Inventory Tracking',
              'Service Management',
              'Sales Reports',
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-300"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="relative w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md">
          <div className="bg-zinc-950/80 backdrop-blur-sm rounded-2xl border border-zinc-800 shadow-2xl shadow-black/60 p-8">
            {/* Logo & Header */}
            <div className="text-center mb-8">
              {isSuperAdmin ? (
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 mb-4">
                  <Shield className="w-8 h-8 text-white" strokeWidth={2} />
                </div>
              ) : (
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white mb-4">
                  <span className="text-black text-2xl font-bold">Mo</span>
                </div>
              )}
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                {isSuperAdmin ? 'SuperAdmin Portal' : isShop ? `${shopName}` : 'Welcome Back'}
              </h1>
              <p className="text-sm text-zinc-400">
                {isSuperAdmin ? 'Platform administration access' : `Sign in to your ${isShop ? 'shop' : 'MoSPAMS'} account`}
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email/Username Input */}
              <div>
                <label htmlFor="emailOrUsername" className="block text-sm font-medium text-zinc-300 mb-2">
                  Email or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-zinc-500" strokeWidth={2} />
                  </div>
                  <input
                    id="emailOrUsername"
                    type="text"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder="you@example.com or username"
                    className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-zinc-700 transition-all duration-200"
                    disabled={loading}
                  />
                </div>
              </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-zinc-500" strokeWidth={2} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700 focus:border-zinc-700 transition-all duration-200"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-zinc-500 hover:text-zinc-300 transition-colors" strokeWidth={2} />
                  ) : (
                    <Eye className="w-5 h-5 text-zinc-500 hover:text-zinc-300 transition-colors" strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-800 text-white focus:ring-2 focus:ring-zinc-700"
                />
                <span className="text-sm text-zinc-400">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => toast.info('Password reset feature coming soon')}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" strokeWidth={2} />
                  Sign In
                </>
              )}
            </button>
            </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-zinc-950 text-zinc-500">OR</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={() => toast.info('Google sign-in coming soon')}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium text-sm hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200"
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
            Continue with Google
          </button>

            {/* Sign Up Link - Only show for public/shop, not SuperAdmin */}
            {!isSuperAdmin && (
              <p className="mt-6 text-center text-sm text-zinc-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/register-shop')}
                  className="text-white font-semibold hover:underline"
                >
                  Sign up
                </button>
              </p>
            )}
          </div>

        {/* Bottom Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-zinc-500">
            By signing in, you agree to our{' '}
            <button type="button" className="text-zinc-400 hover:text-white transition-colors">
              Terms of Service
            </button>{' '}
            and{' '}
            <button type="button" className="text-zinc-400 hover:text-white transition-colors">
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </div>
  </div>
);
}

function StatCard({
  icon: Icon,
  label,
  value,
  change,
  changeColor,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  change: string;
  changeColor: string;
}) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
          <Icon className="w-4 h-4 text-zinc-400" strokeWidth={2} />
        </div>
        <span className={`text-xs font-semibold ${changeColor}`}>{change}</span>
      </div>
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
