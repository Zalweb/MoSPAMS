import { useNavigate } from 'react-router';
import { Rocket, Package, Wrench, Receipt, BarChart3, Users, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '@/shared/hooks/useScrollAnimation';

export default function ContactSection() {
 const navigate = useNavigate();
 const { ref: sectionRef, isVisible } = useScrollAnimation<HTMLDivElement>({ threshold: 0.1 });

 const scrollTo = (id: string) => {
 const el = document.getElementById(id);
 if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
 };

 return (
 <section id="contact" className="relative py-24 bg-transparent overflow-hidden">
 <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

 <div ref={sectionRef} className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
 {/* Badge */}
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={isVisible ? { opacity: 1, y: 0 } : {}}
 transition={{ delay: 0.1 }}
 className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-zinc-300 text-xs font-semibold mb-6"
 >
 <Rocket className="w-3.5 h-3.5" strokeWidth={2} />
 Get Started Today
 </motion.div>

 {/* Heading */}
 <motion.h2
 initial={{ opacity: 0, y: 20 }}
 animate={isVisible ? { opacity: 1, y: 0 } : {}}
 transition={{ delay: 0.2 }}
 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tight leading-tight"
 >
 Ready to simplify your{' '}
 <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
 motorcycle shop operations?
 </span>
 </motion.h2>

 {/* Subtitle */}
 <motion.p
 initial={{ opacity: 0, y: 20 }}
 animate={isVisible ? { opacity: 1, y: 0 } : {}}
 transition={{ delay: 0.3 }}
 className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto"
 >
 Start using MoSPAMS to manage parts, services, sales, and reports in one connected
 system. No complicated setup. No extra costs.
 </motion.p>

 {/* CTA Buttons */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={isVisible ? { opacity: 1, y: 0 } : {}}
 transition={{ delay: 0.4 }}
 className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-14"
 >
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
 className="px-10 py-4 rounded-2xl bg-muted border border-border text-foreground font-bold text-base hover:bg-zinc-800 hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-0.5"
 >
 Learn More
 </button>
 </motion.div>

 {/* Feature Pills */}
 <div className="flex flex-wrap justify-center gap-3">
 {[
 { Icon: Package, label: 'Inventory' },
 { Icon: Wrench, label: 'Services' },
 { Icon: Receipt, label: 'Sales' },
 { Icon: BarChart3, label: 'Reports' },
 { Icon: Users, label: 'Users' },
 { Icon: ClipboardList, label: 'Activity Logs' },
 ].map((item, index) => (
 <motion.div
 key={item.label}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={isVisible ? { opacity: 1, scale: 1 } : {}}
 transition={{ delay: 0.5 + 0.05 * index }}
 className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-background border border-slate-100 shadow-sm text-sm text-slate-600 font-medium hover:border-zinc-700 hover:text-foreground hover:bg-zinc-800 transition-all duration-200 cursor-default"
 >
 <item.Icon className="w-4 h-4" strokeWidth={2} />
 {item.label}
 </motion.div>
 ))}
 </div>
 </div>
 </section>
 );
}
