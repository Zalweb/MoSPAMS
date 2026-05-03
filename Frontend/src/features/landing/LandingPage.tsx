import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import LandingNavbar from './components/LandingNavbar';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import AboutSection from './components/AboutSection';
import RolesSection from './components/RolesSection';
import ReportsSection from './components/ReportsSection';
import ContactSection from './components/ContactSection';
import LandingFooter from './components/LandingFooter';
import HeroLoginCard from './components/HeroLoginCard';

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);

  const handleSignInClick = () => {
    setShowLogin(true);
  };

  const handleCloseLogin = () => {
    setShowLogin(false);
  };

  return (
    <div className="min-h-screen bg-black overflow-x-clip selection:bg-zinc-800 selection:text-white">
      <LandingNavbar onSignInClick={handleSignInClick} />
      <main>
        <HeroSection
          showLogin={showLogin}
          onBackClick={() => setShowLogin(false)}
        />
        <FeaturesSection />
        <AboutSection />
        <RolesSection />
        <ReportsSection />
        <ContactSection onSignInClick={handleSignInClick} />
      </main>
      <LandingFooter />

      {/* Login Modal Overlay */}
      <AnimatePresence>
        {showLogin && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseLogin}
            />

            {/* Modal Container */}
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="pointer-events-auto">
                <HeroLoginCard onBack={handleCloseLogin} />
              </div>

              {/* Close button */}
              <motion.button
                onClick={handleCloseLogin}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-zinc-800/80 backdrop-blur-sm border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}