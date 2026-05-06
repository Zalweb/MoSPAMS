import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Check, ArrowLeft, Loader2, Sparkles, Store } from 'lucide-react';

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

export default function ShopRegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
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

  const updateForm = (field: keyof RegistrationForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === 'shopName' && typeof value === 'string') {
      const subdomain = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 30);
      setForm((prev) => ({ ...prev, subdomain }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.shopName.trim()) {
      toast.error('Shop name is required');
      return;
    }
    if (!form.subdomain.trim()) {
      toast.error('Subdomain is required');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.subdomain)) {
      toast.error('Subdomain can only contain lowercase letters, numbers, and hyphens');
      return;
    }
    if (!form.ownerName.trim()) {
      toast.error('Owner name is required');
      return;
    }
    if (!form.ownerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail)) {
      toast.error('Valid email is required');
      return;
    }
    if (!form.agreeToTerms) {
      toast.error('You must agree to the Terms of Service');
      return;
    }

    setLoading(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_BASE_URL}/api/shop-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
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

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setRegistrationResult({
        shopName: data.data.shopName,
        subdomain: data.data.subdomain,
        invitationCode: data.data.invitationCode,
        ownerEmail: data.data.ownerEmail,
        temporaryPassword: data.data.temporaryPassword,
        trialDays: data.data.trialDays,
        trialEndsAt: data.data.trialEndsAt,
      });
      setStep('success');
      toast.success('Your shop is ready!');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error instanceof Error ? error.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success' && registrationResult) {
    const trialEnd = new Date(registrationResult.trialEndsAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-2xl w-full bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-zinc-800/50 shadow-2xl p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" strokeWidth={2} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Your Shop is Ready!</h1>
            <p className="text-zinc-400">
              {registrationResult.trialDays}-day free trial active &mdash; expires {trialEnd}
            </p>
          </div>

          {/* Temporary login credentials */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-green-400 mb-4">Your Login Credentials</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Email</p>
                <p className="font-mono text-sm text-white bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-700/30">
                  {registrationResult.ownerEmail}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Temporary Password</p>
                <p className="font-mono font-bold text-lg text-white bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-700/30 tracking-widest">
                  {registrationResult.temporaryPassword}
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-3">
              Save this password — it won't be shown again. Change it after your first login.
            </p>
          </div>

          {/* Shop details */}
          <div className="bg-zinc-800/30 rounded-2xl border border-zinc-700/30 p-6 mb-6">
            <h2 className="font-semibold text-white mb-4">Shop Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Shop Name</p>
                <p className="font-medium text-white">{registrationResult.shopName}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Shop URL</p>
                <p className="font-medium text-blue-400">
                  https://{registrationResult.subdomain}.mospams.shop
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Staff Invitation Code</p>
                <p className="font-mono font-bold text-lg text-white bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-700/30">
                  {registrationResult.invitationCode}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Share this code with staff members to let them join your shop.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => navigate(`/`)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black font-semibold hover:bg-zinc-100 transition-all"
            >
              Go to Login
            </button>
            <p className="text-sm text-zinc-500 mt-4">
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
    <div className="min-h-screen bg-black py-12 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-zinc-800/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-zinc-800/5 rounded-full blur-3xl" />
      </div>

      {/* Floating sparkles */}
      <div className="absolute top-20 right-20 opacity-20">
        <Sparkles className="w-6 h-6 text-zinc-400" strokeWidth={1.5} />
      </div>
      <div className="absolute bottom-20 left-20 opacity-20">
        <Sparkles className="w-8 h-8 text-zinc-400" strokeWidth={1.5} />
      </div>

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            Back to Home
          </button>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 text-zinc-300 text-sm font-medium mb-6">
            <Store className="w-4 h-4" strokeWidth={2} />
            Shop Registration
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Start your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-600">
              free trial
            </span>
          </h1>
          <p className="text-lg text-zinc-400">
            Get your own motorcycle shop management system in minutes
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shop Information */}
          <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-zinc-800/50 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Shop Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Shop Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.shopName}
                  onChange={(e) => updateForm('shopName', e.target.value)}
                  placeholder="e.g., MotoWorks Repair Shop"
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600/50 transition-all"
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
                    onChange={(e) => updateForm('subdomain', e.target.value)}
                    placeholder="motoworks"
                    pattern="[a-z0-9\-]+"
                    className="flex-1 px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600/50 transition-all"
                    required
                  />
                  <span className="text-sm text-zinc-500 whitespace-nowrap">.mospams.shop</span>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Your shop will be accessible at: https://{form.subdomain || 'yourshop'}.mospams.shop
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Phone Number
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => updateForm('phone', e.target.value)}
                  placeholder="0917-123-4567"
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Address
                </label>
                <input
                  value={form.address}
                  onChange={(e) => updateForm('address', e.target.value)}
                  placeholder="123 Main St, Manila"
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Owner Information */}
          <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-zinc-800/50 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Owner Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.ownerName}
                  onChange={(e) => updateForm('ownerName', e.target.value)}
                  placeholder="Juan Dela Cruz"
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600/50 transition-all"
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
                  onChange={(e) => updateForm('ownerEmail', e.target.value)}
                  placeholder="juan@example.com"
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600/50 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Choose Plan */}
          <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-zinc-800/50 p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Choose Your Plan</h2>
            <p className="text-zinc-400 mb-6">14-day free trial • No credit card required</p>

            <div className="grid md:grid-cols-3 gap-6">
              {PLANS.map((plan) => (
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
                      <span className="bg-white text-black text-xs font-bold px-3 py-1 rounded-full">
                        POPULAR
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-white">₱{plan.price}</span>
                      <span className="text-zinc-400">/month</span>
                    </div>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent mb-4" />

                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-zinc-400">
                        <div className="mt-0.5">
                          <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-zinc-400" strokeWidth={3} />
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

          {/* Terms & Submit */}
          <div className="bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-zinc-800/50 p-8">
            <label className="flex items-start gap-3 cursor-pointer mb-6">
              <input
                type="checkbox"
                checked={form.agreeToTerms}
                onChange={(e) => updateForm('agreeToTerms', e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-800"
                required
              />
              <span className="text-sm text-zinc-400">
                I agree to the{' '}
                <a href="/terms" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Privacy Policy
                </a>
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
                  Creating your shop...
                </span>
              ) : (
                'Start Free Trial'
              )}
            </button>

            <p className="text-center text-sm text-zinc-500 mt-4">
              No credit card required &mdash; 14-day free trial, instant access
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
