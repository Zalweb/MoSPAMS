import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Lock,
  Package,
  Receipt,
  Rocket,
  Shield,
  Users,
} from 'lucide-react';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';

interface ContactSectionProps {
  onSignInClick: () => void;
}

const FEATURE_PILLS = [
  { icon: Package, label: 'Inventory' },
  { icon: Activity, label: 'Services' },
  { icon: Receipt, label: 'Sales' },
  { icon: BarChart3, label: 'Reports' },
  { icon: Users, label: 'Users' },
  { icon: Shield, label: 'Activity Logs' },
];

export default function ContactSection({ onSignInClick }: ContactSectionProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section id="contact" className="relative py-24 bg-black overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-zinc-900/60 to-zinc-800/40 blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-zinc-900/50 to-zinc-800/40 blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div ref={ref} className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold mb-6"
        >
          <Rocket className="w-3.5 h-3.5" />
          Get Started Today
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight leading-tight"
        >
          Ready to simplify your{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
            motorcycle shop operations?
          </span>
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="text-lg text-zinc-400 leading-relaxed mb-10 max-w-2xl mx-auto"
        >
          Start using MoSPAMS to manage parts, services, sales, and reports in one connected
          system. No complicated setup. No extra costs.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-14"
        >
          <motion.button
            id="contact-signin-btn"
            onClick={onSignInClick}
            className="px-10 py-4 rounded-2xl bg-white text-black font-bold text-base hover:bg-zinc-200 hover:shadow-2xl transition-all duration-200"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            Sign In to MoSPAMS
          </motion.button>
          <motion.div
            className="flex items-center gap-2 text-sm text-zinc-500"
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : {}}
            transition={{ delay: 0.5 }}
          >
            <Lock className="w-4 h-4 text-zinc-500" />
            Secure login • Role-based access
          </motion.div>
        </motion.div>

        {/* Feature Pills */}
        <motion.div
          className="flex flex-wrap justify-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5 }}
        >
          {FEATURE_PILLS.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black border border-zinc-800 shadow-sm text-sm text-zinc-400 font-medium hover:border-zinc-700 hover:text-white hover:bg-zinc-800 transition-all duration-200 cursor-default"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.6 + index * 0.05 }}
                whileHover={{ y: -2, scale: 1.02 }}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}