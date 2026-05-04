import { useNavigate } from 'react-router';
import { Rocket, Package, Wrench, Receipt, BarChart3, Users, ClipboardList } from 'lucide-react';

export default function ContactSection() {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section id="contact" className="relative py-24 bg-transparent overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold mb-6">
          <Rocket className="w-3.5 h-3.5" strokeWidth={2} />
          Get Started Today
        </div>

        {/* Heading */}
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight leading-tight">
          Ready to simplify your{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
            motorcycle shop operations?
          </span>
        </h2>

        {/* Subtitle */}
        <p className="text-lg text-zinc-400 leading-relaxed mb-10 max-w-2xl mx-auto">
          Start using MoSPAMS to manage parts, services, sales, and reports in one connected
          system. No complicated setup. No extra costs.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-14">
          <button
            id="contact-get-started-btn"
            onClick={() => navigate('/register-shop')}
            className="px-10 py-4 rounded-2xl bg-white text-black font-bold text-base hover:bg-zinc-200 hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-0.5"
          >
            Get Started Free
          </button>
          <button
            id="contact-learn-more-btn"
            onClick={() => scrollTo('features')}
            className="px-10 py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white font-bold text-base hover:bg-zinc-800 hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-0.5"
          >
            Learn More
          </button>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { Icon: Package, label: 'Inventory' },
            { Icon: Wrench, label: 'Services' },
            { Icon: Receipt, label: 'Sales' },
            { Icon: BarChart3, label: 'Reports' },
            { Icon: Users, label: 'Users' },
            { Icon: ClipboardList, label: 'Activity Logs' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black border border-slate-100 shadow-sm text-sm text-slate-600 font-medium hover:border-zinc-700 hover:text-white hover:bg-zinc-800 transition-all duration-200 cursor-default"
            >
              <item.Icon className="w-4 h-4" strokeWidth={2} />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
