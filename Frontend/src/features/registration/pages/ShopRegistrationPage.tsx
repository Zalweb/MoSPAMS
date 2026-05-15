import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Check, ArrowLeft, Loader2, Sparkles, Store, Mail } from 'lucide-react';

interface RegistrationForm {
  shopName: string;
  subdomain: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  address: string;
  selectedPlan: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  agreeToTerms: boolean;
}

const PLANS = [
  {
    code: 'BASIC',
    name: 'Basic',
    price: 499,
    features: [
      'Up to 3 staff users',
      'Inventory management',
      'Service job tracking',
      'Basic reports',
      'Email support',
    ],
  },
  {
    code: 'PREMIUM',
    name: 'Premium',
    price: 999,
    features: [
      'Up to 10 staff users',
      'Everything in Basic',
      'Advanced reports',
      'Customer portal',
      'Priority support',
      'Custom branding',
    ],
    popular: true,
  },
  {
    code: 'ENTERPRISE',
    name: 'Enterprise',
    price: 1999,
    features: [
      'Unlimited users',
      'Everything in Premium',
      'Custom domain support',
      'API access',
      'Dedicated support',
      'Custom features',
    ],
  },
];

const RESEND_COOLDOWN = 60;

export default function ShopRegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'verify' | 'success'>('form');

  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingShopName, setPendingShopName] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [registrationResult, setRegistrationResult] = useState<{
    shopName: string;
    subdomain: string;
    invitationCode: string;
    ownerEmail: string;
    temporaryPassword: string;
    trialDays: number;
    trialEndsAt: string;
  } | null>(null);

  const [form, setForm] = useState<RegistrationForm>({
    shopName: '',
    subdomain: '',
    ownerName: '',
    ownerEmail: '',
    phone: '',
    address: '',
    selectedPlan: 'PREMIUM',
    agreeToTerms: false,
  });

  useEffect(() => {
    if (step !== 'verify') return;
    setResendCountdown(RESEND_COOLDOWN);
    countdownRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [step]);

  const updateForm = (field: keyof RegistrationForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'shopName' && typeof value === 'string') {
      const subdomain = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 30);
      setForm(prev => ({ ...prev, subdomain }));
    }
  };

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shopName.trim()) { toast.error('Shop name is required'); return; }
    if (!form.subdomain.trim()) { toast.error('Subdomain is required'); return; }
    if (!/^[a-z0-9-]+$/.test(form.subdomain)) {
      toast.error('Subdomain can only contain lowercase letters, numbers, and hyphens');
      return;
    }
    if (!form.ownerName.trim()) { toast.error('Owner name is required'); return; }
    if (!form.ownerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail)) {
      toast.error('Valid email is required');
      return;
    }
    if (!form.agreeToTerms) { toast.error('You must agree to the Terms of Service'); return; }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/shop-registration/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          shopName: form.shopName,
          subdomain: form.subdomain,
          ownerName: form.ownerName,
          ownerEmail: form.ownerEmail,
          phone: form.phone || null,
          address: form.address || null,
          planCode: form.selectedPlan,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Registration failed');
      setPendingEmail(data.email);
      setPendingShopName(data.shopName);
      setPendingToken(data.pendingToken);
      setStep('verify');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) { setOtpError('Please enter the 6-digit code.'); return; }
    setVerifying(true);
    setOtpError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/shop-registration/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, code: otp, pendingToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        setOtpError(data.errors?.code?.[0] || data.message || 'Verification failed.');
        return;
      }
      setRegistrationResult({
        shopName: data.data.shopName,
        subdomain: data.data.subdomain,
        invitationCode: data.data.invitationCode,
        ownerEmail: data.data.ownerEmail,
        temporaryPassword: data.data.temporaryPassword || '',
        trialDays: data.data.trialDays || 14,
        trialEndsAt: data.data.trialEndsAt || '',
      });
      setStep('success');
      toast.success('Your shop is ready!');
    } catch {
      setOtpError('Something went wrong. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/shop-registration/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, pendingToken }),
      });
      if (response.ok) {
        setResendCountdown(RESEND_COOLDOWN);
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
          setResendCountdown(prev => {
            if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
            return prev - 1;
          });
        }, 1000);
        toast.success('A new code has been sent.');
      }
    } finally {
      setResending(false);
    }
  };

  if (step === 'verify') {
    return (
      <div className="dark text-foreground min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-muted/40 backdrop-blur-2xl rounded-3xl border border-border/50 shadow-2xl p-10">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Mail className="w-7 h-7 text-blue-400" strokeWidth={2} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">Check your email</h2>
            <p className="text-muted-foreground text-sm text-center mb-2">
              We sent a 6-digit code to <span className="text-foreground font-medium">{pendingEmail}</span>
            </p>
            <p className="text-muted-foreground text-xs text-center mb-8">
              to activate <span className="text-foreground font-medium">{pendingShopName}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="sr-only">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
                  placeholder="000000"
                  className="w-full px-4 py-4 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-foreground text-center text-2xl font-mono tracking-[0.5em] placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600/50 transition-all"
                  disabled={verifying}
                />
                {otpError && <p className="text-red-400 text-sm mt-2 text-center">{otpError}</p>}
              </div>

              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying || otp.length !== 6}
                className="w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {verifying
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                  : 'Verify & Create Shop'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCountdown > 0 || resending}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {resendCountdown > 0
                    ? `Resend code in ${resendCountdown}s`
                    : resending ? 'Sending...' : 'Resend code'}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  ← Back to registration form
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success' && registrationResult) {
    const trialEnd = registrationResult.trialEndsAt
      ? new Date(registrationResult.trialEndsAt).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        })
      : '';

    return (
      <div className="dark text-foreground min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-2xl w-full bg-muted/40 backdrop-blur-2xl rounded-3xl border border-border/50 shadow-2xl p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" strokeWidth={2} />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Your Shop is Ready!</h1>
            <p className="text-muted-foreground">
              {registrationResult.trialDays}-day free trial active — expires {trialEnd}
            </p>
          </div>

          {registrationResult.temporaryPassword ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 mb-6">
              <h2 className="font-semibold text-green-400 mb-4">Your Login Credentials</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="font-mono text-sm text-foreground bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-700/30">
                    {registrationResult.ownerEmail}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Temporary Password</p>
                  <p className="font-mono font-bold text-lg text-foreground bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-700/30 tracking-widest">
                    {registrationResult.temporaryPassword}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Save this password — it won't be shown again. Change it after your first login.
              </p>
            </div>
          ) : (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
              <h2 className="font-semibold text-blue-400 mb-2">Sign In</h2>
              <p className="text-sm text-muted-foreground">
                You already have a MoSPAMS account. Sign in at your shop URL using your existing password.
              </p>
            </div>
          )}

          <div className="bg-zinc-800/30 rounded-2xl border border-zinc-700/30 p-6 mb-6">
            <h2 className="font-semibold text-foreground mb-4">Shop Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Shop Name</p>
                <p className="font-medium text-foreground">{registrationResult.shopName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Shop URL</p>
                <p className="font-medium text-blue-400">
                  https://{registrationResult.subdomain}.mospams.shop
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Staff Invitation Code</p>
                <p className="font-mono font-bold text-lg text-foreground bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-700/30">
                  {registrationResult.invitationCode}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Share this code with staff members to let them join your shop.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black font-semibold hover:bg-zinc-100 transition-all shadow-lg"
            >
              Go to Login
            </button>
            <p className="text-sm text-muted-foreground mt-4">
              Log in at{' '}
              <span className="text-blue-400">
                https://{registrationResult.subdomain}.mospams.shop
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dark text-foreground min-h-screen bg-background py-12 px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-zinc-800/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-zinc-800/5 rounded-full blur-3xl" />
      </div>

      <div className="absolute top-20 right-20 opacity-20">
        <Sparkles className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="absolute bottom-20 left-20 opacity-20">
        <Sparkles className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
      </div>

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            Back to Home
          </button>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm border border-border/50 text-zinc-300 text-sm font-medium mb-6">
            <Store className="w-4 h-4" strokeWidth={2} />
            Shop Registration
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Start your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-600">
              free trial
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Get your own motorcycle shop management system in minutes
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-muted/40 backdrop-blur-2xl rounded-3xl border border-border/50 p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Shop Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Shop Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.shopName}
                  onChange={e => updateForm('shopName', e.target.value)}
                  placeholder="e.g., MotoWorks Repair Shop"
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600/50 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Subdomain <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    value={form.subdomain}
                    onChange={e => updateForm('subdomain', e.target.value)}
                    placeholder="motoworks"
                    pattern="[a-z0-9\-]+"
                    className="flex-1 px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600/50 transition-all"
                    required
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">.mospams.shop</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Your shop will be accessible at: https://{form.subdomain || 'yourshop'}.mospams.shop
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Phone Number</label>
                <input
                  value={form.phone}
                  onChange={e => updateForm('phone', e.target.value)}
                  placeholder="0917-123-4567"
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Address</label>
                <input
                  value={form.address}
                  onChange={e => updateForm('address', e.target.value)}
                  placeholder="123 Main St, Manila"
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600/50 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="bg-muted/40 backdrop-blur-2xl rounded-3xl border border-border/50 p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Owner Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.ownerName}
                  onChange={e => updateForm('ownerName', e.target.value)}
                  placeholder="Juan Dela Cruz"
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600/50 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={form.ownerEmail}
                  onChange={e => updateForm('ownerEmail', e.target.value)}
                  placeholder="juan@example.com"
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600/50 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-muted/40 backdrop-blur-2xl rounded-3xl border border-border/50 p-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Choose Your Plan</h2>
            <p className="text-muted-foreground mb-6">14-day free trial • No credit card required</p>

            <div className="grid md:grid-cols-3 gap-6">
              {PLANS.map(plan => (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => updateForm('selectedPlan', plan.code)}
                  className={`relative text-left p-6 rounded-2xl border-2 transition-all ${
                    form.selectedPlan === plan.code
                      ? 'border-white bg-zinc-800/50 scale-105'
                      : 'border-zinc-700/50 hover:border-zinc-600/50 bg-zinc-800/20'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-white text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        POPULAR
                      </span>
                    </div>
                  )}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-foreground">₱{plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent mb-4" />
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <div className="mt-0.5">
                          <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-muted-foreground" strokeWidth={3} />
                          </div>
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {form.selectedPlan === plan.code && (
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-black" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-muted/40 backdrop-blur-2xl rounded-3xl border border-border/50 p-8">
            <label className="flex items-start gap-3 cursor-pointer mb-6">
              <input
                type="checkbox"
                checked={form.agreeToTerms}
                onChange={e => updateForm('agreeToTerms', e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-800"
                required
              />
              <span className="text-sm text-muted-foreground">
                I agree to the{' '}
                <a href="/terms" className="text-blue-400 hover:text-blue-300 transition-colors">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors">Privacy Policy</a>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-white text-black font-semibold text-base hover:bg-zinc-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending verification code...
                </span>
              ) : (
                'Start Free Trial'
              )}
            </button>

            <p className="text-center text-sm text-muted-foreground mt-4">
              No credit card required &mdash; 14-day free trial, instant access
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
