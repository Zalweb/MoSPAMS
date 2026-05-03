import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ArrowLeft, Loader2 } from 'lucide-react';

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
          'ngrok-skip-browser-warning': 'true',
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
      });
      setStep('success');
      toast.success('Registration submitted successfully!');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error instanceof Error ? error.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success' && registrationResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Registration Submitted!</h1>
            <p className="text-slate-600">Your shop registration is under review</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-6 mb-6">
            <h2 className="font-semibold text-slate-900 mb-4">Your Shop Details:</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-500">Shop Name</p>
                <p className="font-medium text-slate-900">{registrationResult.shopName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Your Shop URL</p>
                <p className="font-medium text-blue-600">
                  https://{registrationResult.subdomain}.mospams.shop
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Invitation Code</p>
                <p className="font-mono font-bold text-lg text-slate-900">
                  {registrationResult.invitationCode}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Save this code! You'll need it to create your account after approval.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>Our team will review your application (usually within 24 hours)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>You'll receive an email when your shop is activated</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>SuperAdmin will provision your Owner account and share temporary login credentials</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>Start your 14-day free trial!</span>
              </li>
            </ol>
          </div>

          <div className="text-center">
            <p className="text-sm text-slate-600 mb-4">
              Questions? Contact us at{' '}
              <a href="mailto:support@mospams.shop" className="text-blue-600 hover:underline">
                support@mospams.shop
              </a>
            </p>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </button>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Start Your Free Trial</h1>
          <p className="text-lg text-slate-600">
            Get your own motorcycle shop management system in minutes
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Shop Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Shop Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.shopName}
                  onChange={(e) => updateForm('shopName', e.target.value)}
                  placeholder="e.g., MotoWorks Repair Shop"
                  className="rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Subdomain <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={form.subdomain}
                    onChange={(e) => updateForm('subdomain', e.target.value)}
                    placeholder="motoworks"
                    className="rounded-xl"
                    pattern="[a-z0-9-]+"
                    required
                  />
                  <span className="text-sm text-slate-500 whitespace-nowrap">.mospams.shop</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Your shop will be accessible at: https://{form.subdomain || 'yourshop'}.mospams.shop
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) => updateForm('phone', e.target.value)}
                  placeholder="0917-123-4567"
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Address
                </label>
                <Input
                  value={form.address}
                  onChange={(e) => updateForm('address', e.target.value)}
                  placeholder="123 Main St, Manila"
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Owner Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.ownerName}
                  onChange={(e) => updateForm('ownerName', e.target.value)}
                  placeholder="Juan Dela Cruz"
                  className="rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => updateForm('ownerEmail', e.target.value)}
                  placeholder="juan@example.com"
                  className="rounded-xl"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Choose Your Plan</h2>
            <p className="text-slate-600 mb-6">14-day free trial • No credit card required</p>

            <div className="grid md:grid-cols-3 gap-6">
              {PLANS.map((plan) => (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => updateForm('selectedPlan', plan.code)}
                  className={`relative text-left p-6 rounded-xl border-2 transition-all ${
                    form.selectedPlan === plan.code
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-slate-900">₱{plan.price}</span>
                      <span className="text-slate-600">/month</span>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {form.selectedPlan === plan.code && (
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.agreeToTerms}
                onChange={(e) => updateForm('agreeToTerms', e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300"
                required
              />
              <span className="text-sm text-slate-600">
                I agree to the{' '}
                <a href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
              </span>
            </label>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-6 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Start Free Trial'
              )}
            </Button>

            <p className="text-center text-sm text-slate-500 mt-4">
              Your shop will be reviewed and activated within 24 hours
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
