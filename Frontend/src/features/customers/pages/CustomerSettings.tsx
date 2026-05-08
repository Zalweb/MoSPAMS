import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, MapPin, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiGet, apiMutation } from '@/shared/lib/api';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
});

export default function CustomerSettings() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiGet<{ full_name: string; phone: string; email: string; address: string }>('/api/customer/profile');
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
        });
      } catch (err) {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    void fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      await apiMutation('/api/customer/profile', 'PATCH', formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#D6D3D1]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div {...fadeUp(0)} className="mb-8">
        <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Profile Settings</h2>
        <p className="text-[13px] text-[#D6D3D1] mt-0.5">Manage your account information</p>
      </motion.div>

      <motion.div {...fadeUp(0.1)} className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-600 text-[12px] mb-5 border border-red-100/50">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 flex items-center gap-2 rounded-xl bg-green-50 text-green-700 text-[12px] mb-5 border border-green-100/50">
            <CheckCircle2 className="w-4 h-4" />
            Profile updated successfully
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="text-[11px] font-medium text-[#78716C] flex items-center gap-1.5 mb-1.5">
              <User className="w-3.5 h-3.5" /> Full Name
            </Label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="h-10 rounded-xl border-[#E7E5E4] text-[13px]"
              required
            />
          </div>

          <div>
            <Label className="text-[11px] font-medium text-[#78716C] flex items-center gap-1.5 mb-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Address
            </Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-10 rounded-xl border-[#E7E5E4] text-[13px]"
            />
          </div>

          <div>
            <Label className="text-[11px] font-medium text-[#78716C] flex items-center gap-1.5 mb-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone Number
            </Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="h-10 rounded-xl border-[#E7E5E4] text-[13px]"
            />
          </div>

          <div>
            <Label className="text-[11px] font-medium text-[#78716C] flex items-center gap-1.5 mb-1.5">
              <MapPin className="w-3.5 h-3.5" /> Address
            </Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="h-10 rounded-xl border-[#E7E5E4] text-[13px]"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-sm font-medium disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
