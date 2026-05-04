import LandingNavbar from './components/LandingNavbar';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import AboutSection from './components/AboutSection';
import PricingSection from './components/PricingSection';
import RolesSection from './components/RolesSection';
import ReportsSection from './components/ReportsSection';
import ContactSection from './components/ContactSection';
import LandingFooter from './components/LandingFooter';
import AnimatedBackground from '@/shared/components/AnimatedBackground';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black overflow-x-clip selection:bg-zinc-800 selection:text-white">
      <AnimatedBackground />
      <div className="relative z-10">
        <LandingNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AboutSection />
        <PricingSection />
        <RolesSection />
        <ReportsSection />
        <ContactSection />
      </main>
      <LandingFooter />
      </div>
    </div>
  );
}
