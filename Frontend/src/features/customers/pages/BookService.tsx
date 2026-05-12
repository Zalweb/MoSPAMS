import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Wrench, CheckCircle2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiMutation, apiGet } from '@/shared/lib/api';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

export default function BookService() {
  const navigate = useNavigate();
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [motorcycleModel, setMotorcycleModel] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    apiGet<{ data: Array<{ name?: string; service_name?: string }> }>('/api/customer/service-types')
      .then(r => setServiceTypes(r.data.map(s => s.name || s.service_name || '').filter(Boolean)))
      .catch(() => setServiceTypes([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!motorcycleModel.trim()) { setError('Please enter your motorcycle model.'); return; }
    if (!serviceType) { setError('Please select a service type.'); return; }

    setSubmitting(true);
    try {
      await apiMutation('/api/customer/services', 'POST', {
        motorcycle_model: motorcycleModel.trim(),
        service_type: serviceType,
        notes: notes.trim() || null,
      });
      setSuccess(true);
    } catch {
      setError('Failed to book service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 border border-green-500/20">
          <CheckCircle2 className="w-8 h-8 text-green-500" strokeWidth={2} />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Service Booked!</h2>
        <p className="text-sm text-muted-foreground mb-6">We'll contact you when your service is scheduled.</p>
        <Button 
          onClick={() => navigate('/dashboard/customer')} 
          className="h-10 rounded-xl bg-foreground text-background hover:opacity-90 px-6"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <motion.div {...fadeUp(0)} className="mb-8 px-1">
        <h2 className="text-2xl font-bold text-foreground">Book a Service</h2>
        <p className="text-sm text-muted-foreground mt-1">Schedule your motorcycle service</p>
      </motion.div>

      <motion.div 
        {...fadeUp(0.1)} 
        className="bg-card dark:bg-zinc-900/40 backdrop-blur-xl rounded-[32px] border border-border/50 shadow-xl p-8"
      >
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 text-red-400 text-xs mb-6 border border-red-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Motorcycle Model</Label>
            <Input 
              value={motorcycleModel} 
              onChange={(e) => setMotorcycleModel(e.target.value)} 
              placeholder="e.g., Honda Click 150i" 
              className="h-12 rounded-2xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all" 
              required 
            />
          </div>

          <div className="space-y-2 relative">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Service Type</Label>
            
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-14 px-5 rounded-2xl border transition-all text-left flex items-center justify-between group ${
                  isOpen 
                    ? 'border-[rgb(var(--color-primary-rgb))] ring-2 ring-[rgb(var(--color-primary-rgb))]/20 bg-muted/50' 
                    : 'border-border/50 bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    serviceType ? 'bg-[rgb(var(--color-primary-rgb))] text-white' : 'bg-muted group-hover:bg-muted/80'
                  }`}>
                    <Wrench className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <span className={`text-sm font-semibold ${serviceType ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {serviceType || 'Select a service type...'}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Plus className={`w-4 h-4 transition-colors ${isOpen ? 'text-[rgb(var(--color-primary-rgb))]' : 'text-muted-foreground'}`} style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }} />
                </motion.div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute left-0 right-0 top-full mt-2 bg-card dark:bg-zinc-900/90 backdrop-blur-xl rounded-2xl border border-border shadow-2xl z-[70] overflow-hidden p-1.5"
                    >
                      {serviceTypes.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground italic">
                          No service types available
                        </div>
                      ) : (
                        <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                          {serviceTypes.map(type => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                setServiceType(type);
                                setIsOpen(false);
                              }}
                              className={`w-full p-3.5 rounded-xl text-left text-sm font-semibold transition-all flex items-center gap-3 group ${
                                serviceType === type
                                  ? 'bg-[rgb(var(--color-primary-rgb))]/10 text-[rgb(var(--color-primary-rgb))]'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                                serviceType === type ? 'bg-[rgb(var(--color-primary-rgb))] text-white' : 'bg-muted group-hover:bg-muted/80'
                              }`}>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </div>
                              {type}
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Notes (optional)</Label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Any special requests or concerns..." 
              className="w-full p-4 rounded-2xl bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all resize-none h-24" 
            />
          </div>

          <Button 
            type="submit" 
            disabled={submitting} 
            className="w-full h-12 rounded-2xl bg-[rgb(var(--color-primary-rgb))] hover:bg-[rgb(var(--color-primary-rgb))]/90 text-white font-bold transition-all active:scale-95 shadow-lg shadow-[rgb(var(--color-primary-rgb))]/20 disabled:opacity-50"
          >
            {submitting ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
