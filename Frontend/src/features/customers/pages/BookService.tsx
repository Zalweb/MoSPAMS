import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Wrench, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiMutation } from '@/shared/lib/api';

const SERVICE_TYPES = [
  'Oil Change',
  'Tune Up',
  'Brake Service',
  'Tire Change',
  'Chain Adjustment',
  'Battery Check',
  'Electrical Check',
  'General Inspection',
];

export default function BookService() {
  const navigate = useNavigate();
  const [motorcycleModel, setMotorcycleModel] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
        <div className="w-16 h-16 rounded-full bg-[#ECFDF5] flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-[#059669]" strokeWidth={2} />
        </div>
        <h2 className="text-[22px] font-bold text-[#1C1917] mb-2">Service Booked!</h2>
        <p className="text-[13px] text-[#A8A29E] mb-6">We'll contact you when your service is scheduled.</p>
        <Button
          onClick={() => navigate('/customer')}
          className="h-10 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-sm"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Book a Service</h2>
        <p className="text-[13px] text-[#D6D3D1] mt-0.5">Schedule your motorcycle service</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 max-w-lg">
        {error && (
          <div className="p-3 rounded-xl bg-red-50/80 text-red-600 text-[12px] mb-4 border border-red-100/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="text-[11px] font-medium text-[#78716C]">Motorcycle Model</Label>
            <Input
              value={motorcycleModel}
              onChange={(e) => setMotorcycleModel(e.target.value)}
              placeholder="e.g., Honda Click 150i"
              className="mt-1.5 h-10 rounded-xl border-[#E7E5E4] text-[13px]"
              required
            />
          </div>

          <div>
            <Label className="text-[11px] font-medium text-[#78716C]">Service Type</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {SERVICE_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setServiceType(type)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    serviceType === type
                      ? 'border-[#1C1917] bg-[#1C1917] text-white'
                      : 'border-[#E7E5E4] bg-white text-[#78716C] hover:border-[#C4C0BC]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4" strokeWidth={1.5} />
                    <span className="text-[12px] font-medium">{type}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-medium text-[#78716C]">Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests or concerns..."
              className="mt-1.5 h-10 rounded-xl border-[#E7E5E4] text-[13px]"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Booking...' : 'Book Service'}
          </Button>
        </form>
      </div>
    </div>
  );
}
