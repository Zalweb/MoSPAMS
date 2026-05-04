import { motion } from 'framer-motion';

export default function AnimatedBackground() {
  return (
    <div 
      className="fixed inset-0 overflow-hidden pointer-events-none" 
      style={{ zIndex: 0 }}
    >
      {/* Blob 1 */}
      <motion.div
        className="absolute top-[5%] left-[5%] w-[450px] h-[450px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 65%)',
          filter: 'blur(70px)',
        }}
        animate={{
          x: [0, 150, 0],
          y: [0, 100, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Blob 2 */}
      <motion.div
        className="absolute bottom-[10%] right-[8%] w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(240,240,240,0.25) 0%, transparent 65%)',
          filter: 'blur(70px)',
        }}
        animate={{
          x: [0, -120, 0],
          y: [0, -130, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}
