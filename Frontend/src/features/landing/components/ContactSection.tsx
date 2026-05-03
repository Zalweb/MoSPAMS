interface ContactSectionProps {
  onSignInClick: () => void;
}

export default function ContactSection({ onSignInClick }: ContactSectionProps) {

  return (
    <section id="contact" className="relative py-24 bg-black overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-violet-100/60 to-purple-100/40 blur-3xl" />
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-zinc-900/60 to-zinc-800/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-zinc-900/50 to-zinc-800/40 blur-3xl" />
      </div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold mb-6">
          🚀 Get Started Today
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

        {/* CTA Button */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-14">
          <button
            id="contact-signin-btn"
            onClick={onSignInClick}
            className="px-10 py-4 rounded-2xl bg-white text-black font-bold text-base hover:bg-zinc-200 hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-0.5"
          >
            Sign In to MoSPAMS
          </button>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <svg className="w-4 h-4 text-zinc-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
                clipRule="evenodd"
              />
            </svg>
            Secure login • Role-based access
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { icon: '📦', label: 'Inventory' },
            { icon: '🔧', label: 'Services' },
            { icon: '🧾', label: 'Sales' },
            { icon: '📊', label: 'Reports' },
            { icon: '👥', label: 'Users' },
            { icon: '📋', label: 'Activity Logs' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black border border-slate-100 shadow-sm text-sm text-slate-600 font-medium hover:border-zinc-700 hover:text-white hover:bg-zinc-800 transition-all duration-200 cursor-default"
            >
              <span>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
