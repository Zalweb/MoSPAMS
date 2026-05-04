import { useNavigate } from 'react-router';
import { Check, DollarSign } from 'lucide-react';

export default function PricingSection() {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Basic',
      price: '₱499',
      period: '/month',
      description: 'Perfect for small shops getting started',
      features: [
        'Up to 500 parts inventory',
        'Up to 50 service jobs/month',
        'Basic reports',
        '2 staff accounts',
        'Email support',
        'Mobile access',
      ],
      popular: false,
    },
    {
      name: 'Premium',
      price: '₱999',
      period: '/month',
      description: 'Best for growing motorcycle shops',
      features: [
        'Unlimited parts inventory',
        'Unlimited service jobs',
        'Advanced reports & analytics',
        '10 staff accounts',
        'Priority support',
        'Mobile access',
        'Custom categories',
        'Activity logs',
      ],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '₱1,999',
      period: '/month',
      description: 'For multi-branch operations',
      features: [
        'Everything in Premium',
        'Unlimited staff accounts',
        'Multi-branch support',
        'API access',
        'Dedicated support',
        'Custom integrations',
        'Advanced security',
        'Training & onboarding',
      ],
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="relative py-24 bg-transparent overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold mb-6">
            <DollarSign className="w-3.5 h-3.5" strokeWidth={2} />
            Simple Pricing
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight leading-tight">
            Choose the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
              perfect plan
            </span>
            {' '}for your shop
          </h2>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Start with a plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 transition-all duration-300 hover:scale-105 ${
                plan.popular
                  ? 'bg-zinc-900 border-zinc-700 shadow-2xl'
                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-bold shadow-lg">
                    MOST POPULAR
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-sm text-zinc-400 mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-zinc-400 text-sm">{plan.period}</span>
                </div>
              </div>

              {/* Features List */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      <Check className="w-5 h-5 text-zinc-400" />
                    </div>
                    <span className="text-sm text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => navigate('/register-shop')}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  plan.popular
                    ? 'bg-white text-black hover:bg-zinc-200'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
                }`}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="text-center mt-12">
          <p className="text-sm text-zinc-500">
            All plans include 14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
