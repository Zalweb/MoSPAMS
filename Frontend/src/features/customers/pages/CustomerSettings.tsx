import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, MapPin, Mail, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiGet, apiMutation } from '@/shared/lib/api';
import { toast } from 'sonner';

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

  // Password form
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwSubmitting, setPwSubmitting] = useState(false);

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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error('New passwords do not match.');
      return;
    }
    if (pwForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setPwSubmitting(true);
    try {
      await apiMutation('/api/customer/password', 'PATCH', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
        new_password_confirmation: pwForm.confirm_password,
      });
      toast.success('Password changed successfully!');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setPwSubmitting(false);
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
              className="w-full h-10 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-foreground text-sm font-medium disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </motion.div>

      {/* Change Password Card */}
      <motion.div {...fadeUp(0.2)} className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-6 mt-4">
        <div className="flex items-center gap-2 mb-5">
          <Lock className="w-4 h-4 text-[#A8A29E]" />
          <h3 className="text-[14px] font-bold text-[#1C1917]">Change Password</h3>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <Label className="text-[11px] font-medium text-[#78716C] mb-1.5 block">Current Password</Label>
            <Input
              type="password"
              value={pwForm.current_password}
              onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })}
              className="h-10 rounded-xl border-[#E7E5E4] text-[13px]"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-medium text-[#78716C] mb-1.5 block">New Password</Label>
              <Input
                type="password"
                value={pwForm.new_password}
                onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
                className="h-10 rounded-xl border-[#E7E5E4] text-[13px]"
                required
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium text-[#78716C] mb-1.5 block">Confirm New Password</Label>
              <Input
                type="password"
                value={pwForm.confirm_password}
                onChange={e => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                className="h-10 rounded-xl border-[#E7E5E4] text-[13px]"
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={pwSubmitting}
            className="w-full h-10 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-foreground text-sm font-medium disabled:opacity-50"
          >
            {pwSubmitting ? 'Changing...' : 'Change Password'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
