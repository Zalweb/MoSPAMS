import { useNavigate } from 'react-router';
import { Check, DollarSign } from 'lucide-react';

export default function PricingSection() {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Basic',
      price: '₱499',
      period: '/month',
      description: 'Perfect for small shops',
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
      description: 'Best for growing shops',
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
      description: 'Multi-branch operations',
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
    <section id="pricing" className="relative py-32 overflow-hidden">
      {/* Large background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <h2 className="text-[20rem] font-bold text-white/[0.02] select-none whitespace-nowrap">
          Pricing
        </h2>
      </div>

      {/* Decorative glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 text-zinc-300 text-sm font-medium mb-6">
            <DollarSign className="w-4 h-4" strokeWidth={2} />
            Simple Pricing
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Choose your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-600">
              perfect plan
            </span>
          </h2>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Flexible pricing for shops of all sizes. Start free, upgrade anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative group rounded-3xl p-8 transition-all duration-300 ${
                plan.popular
                  ? 'bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 border-2 border-zinc-700/50 shadow-2xl scale-105'
                  : 'bg-zinc-900/40 border border-zinc-800/50 hover:border-zinc-700/50'
              } backdrop-blur-xl`}
            >
              {/* Glow effect on hover */}
              <div className={`absolute inset-0 rounded-3xl transition-opacity duration-300 ${
                plan.popular ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl" />
              </div>

              {/* Content */}
              <div className="relative">
                {/* Plan Label */}
                <div className="mb-6">
                  <p className="text-sm text-zinc-500 mb-2">{plan.name} Plan</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-5xl font-bold text-white">{plan.price}</span>
                    <span className="text-zinc-500 text-lg">{plan.period}</span>
                  </div>
                  <p className="text-sm text-zinc-400">{plan.description}</p>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent mb-6" />

                {/* Features List */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center">
                          <Check className="w-3 h-3 text-zinc-400" strokeWidth={3} />
                        </div>
                      </div>
                      <span className="text-sm text-zinc-400 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => navigate('/register-shop')}
                  className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 ${
                    plan.popular
                      ? 'bg-white text-black hover:bg-zinc-100 shadow-lg'
                      : 'bg-zinc-800/50 text-white hover:bg-zinc-800 border border-zinc-700/50'
                  }`}
                >
                  Get Started
                </button>
              </div>
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
