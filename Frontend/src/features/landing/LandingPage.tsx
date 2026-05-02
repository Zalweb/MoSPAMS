import { useState } from 'react';
import LandingNavbar from './components/LandingNavbar';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import AboutSection from './components/AboutSection';
import RolesSection from './components/RolesSection';
import ReportsSection from './components/ReportsSection';
import ContactSection from './components/ContactSection';
import LandingFooter from './components/LandingFooter';

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="min-h-screen bg-black overflow-x-clip selection:bg-zinc-800 selection:text-white">
      <LandingNavbar onSignInClick={() => {
        setShowLogin(prev => {
          const nextState = !prev;
          if (nextState) {
            requestAnimationFrame(() => {
              setTimeout(() => {
                document.getElementById('hero-right-container')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                  inline: 'nearest',
                });
              }, 120);
            });
          }
          return nextState;
        });
      }} />
      <main>
        <HeroSection 
          showLogin={showLogin} 
          onBackClick={() => setShowLogin(false)} 
        />
        <FeaturesSection />
        <AboutSection />
        <RolesSection />
        <ReportsSection />
        <ContactSection onSignInClick={() => {
            setShowLogin(true);
            document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' });
        }} />
      </main>
      <LandingFooter />
    </div>
  );
}
