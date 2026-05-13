import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';
import { apiGet } from '@/shared/lib/api';

interface PlanData {
  planId: number;
  planCode: string;
  planName: string;
  monthlyPrice: number;
  description: string | null;
}

const FALLBACK_PLANS: PlanData[] = [
  { planId: 1, planCode: 'basic', planName: 'Basic', monthlyPrice: 499, description: 'Perfect for small shops' },
  { planId: 2, planCode: 'premium', planName: 'Premium', monthlyPrice: 999, description: 'Best for growing shops' },
  { planId: 3, planCode: 'enterprise', planName: 'Enterprise', monthlyPrice: 1999, description: 'Full-featured operations' },
];

const PLAN_FEATURES: Record<string, string[]> = {
  basic: [
    'Up to 500 parts inventory',
    'Up to 50 service jobs/month',
    'Basic reports & dashboard',
    '2 staff accounts',
    'Google Sign-In',
    'Shop subdomain',
  ],
  premium: [
    'Unlimited parts inventory',
    'Unlimited service jobs',
    'Advanced reports & analytics',
    '10 staff accounts',
    'Google Sign-In',
    'Shop branding & logo',
    'Mechanic dashboard',
    'Customer portal',
    'Activity logs',
  ],
  enterprise: [
    'Everything in Premium',
    'Unlimited staff accounts',
    'Custom domain support',
    'Priority support',
    'Advanced security',
    'Dedicated onboarding',
  ],
};

const POPULAR_PLAN = 'premium';

export default function PricingSection() {
  const navigate = useNavigate();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.2 });
  const { ref: cardsRef, isVisible: cardsVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.1 });
  const [plans, setPlans] = useState<PlanData[]>(FALLBACK_PLANS);

  useEffect(() => {
    apiGet<{ data: PlanData[] }>('/api/plans')
      .then(res => {
        if (res.data && res.data.length > 0) {
          setPlans(res.data);
        }
      })
      .catch(() => { /* use fallback */ });
  }, []);

  const plansWithFeatures = plans.map(plan => {
    const code = plan.planCode.toLowerCase();
    return {
      ...plan,
      features: PLAN_FEATURES[code] ?? PLAN_FEATURES.basic,
      popular: code === POPULAR_PLAN,
    };
  });

  return (
    <section id="pricing" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <h2 className="text-[20rem] font-bold text-foreground/[0.02] select-none whitespace-nowrap">
          Pricing
        </h2>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm border border-border/50 text-zinc-300 text-sm font-medium mb-6"
          >
            <DollarSign className="w-4 h-4" strokeWidth={2} />
            Simple Pricing
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight"
          >
            Choose your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-600">
              perfect plan
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 }}
            className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto"
          >
            Flexible pricing for shops of all sizes. Start free, upgrade anytime.
          </motion.p>
        </div>

        <div ref={cardsRef} className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plansWithFeatures.map((plan, index) => (
            <motion.div
              key={plan.planCode}
              initial={{ opacity: 0, y: 30 }}
              animate={cardsVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 * index, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`relative group rounded-3xl p-8 transition-all duration-300 ${
                plan.popular
                  ? 'bg-gradient-to-b from-zinc-800/80 to-zinc-900/80 border-2 border-zinc-700/50 shadow-2xl scale-105'
                  : 'bg-muted/40 border border-border/50 hover:border-zinc-700/50'
              } backdrop-blur-xl`}
            >
              <div className={`absolute inset-0 rounded-3xl transition-opacity duration-300 ${
                plan.popular ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-3xl" />
              </div>

              <div className="relative">
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-2">{plan.planName} Plan</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-5xl font-bold text-foreground">₱{plan.monthlyPrice.toLocaleString()}</span>
                    <span className="text-muted-foreground text-lg">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent mb-6" />

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center">
                          <Check className="w-3 h-3 text-muted-foreground" strokeWidth={3} />
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate('/register-shop')}
                  className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 ${
                    plan.popular
                      ? 'bg-white text-black hover:bg-zinc-100 shadow-lg'
                      : 'bg-zinc-800/50 text-foreground hover:bg-zinc-800 border border-zinc-700/50'
                  }`}
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            All plans include 14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
