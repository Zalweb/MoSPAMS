import { motion } from 'framer-motion';
import { Bike } from 'lucide-react';

interface TenantBootstrapScreenProps {
  statusCode?: number | null;
  title: string;
  message: string;
}

export default function TenantBootstrapScreen({ statusCode, title, message }: TenantBootstrapScreenProps) {
  return (
    <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center px-6 overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]"
          animate={{
            background: [
              'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
              'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
              'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
            ],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px]"
          animate={{
            background: [
              'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%)',
              'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 60%)',
              'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo with pulse animation */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="relative"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 bg-white/20 rounded-2xl blur-xl"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [0.95, 1.05, 0.95],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Logo container */}
            <motion.div
              className="relative w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-2xl"
              animate={{
                boxShadow: [
                  '0 0 30px rgba(255,255,255,0.1)',
                  '0 0 60px rgba(255,255,255,0.2)',
                  '0 0 30px rgba(255,255,255,0.1)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Bike className="w-8 h-8 text-black" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Brand name with letter animation */}
        <motion.div
          className="text-center mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-white">Mo</span>
            <motion.span
              className="text-zinc-500"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              SPAMS
            </motion.span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          className="text-center text-zinc-500 text-sm mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Motorcycle Service & Parts Management
        </motion.p>

        {/* Loading indicator or status card */}
        {statusCode ? (
          // Error state
          <motion.div
            className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
                Error {statusCode}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
            <p className="text-sm text-zinc-400">{message}</p>
          </motion.div>
        ) : (
          // Loading state
          <motion.div
            className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {/* Loading bar */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">{title}</span>
                <motion.span
                  className="text-xs text-zinc-600"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Loading...
                </motion.span>
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-zinc-500 to-white rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
              <p className="text-xs text-zinc-600 text-center">{message}</p>
            </div>
          </motion.div>
        )}

        {/* Dots animation */}
        <motion.div
          className="flex justify-center gap-1.5 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-zinc-700"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}