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
          background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 40%, transparent 70%)',
          willChange: 'transform'
        }}
        animate={{
          x: [0, 150, 0],
          y: [0, 100, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Blob 2 */}
      <motion.div
        className="absolute bottom-[10%] right-[8%] w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(240,240,240,0.06) 0%, rgba(240,240,240,0.02) 40%, transparent 70%)',
          willChange: 'transform'
        }}
        animate={{
          x: [0, -120, 0],
          y: [0, -130, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}
