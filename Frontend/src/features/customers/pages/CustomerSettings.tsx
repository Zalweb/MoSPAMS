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
  const [loadingProfile, setLoadingProfile] = useState(true);
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
        setLoadingProfile(false);
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
      await apiMutation('/api/customer/profile', 'PATCH', {
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address,
      });
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

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div {...fadeUp(0)} className="mb-8">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Profile Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your account information</p>
      </motion.div>

      <motion.div {...fadeUp(0.1)} className="bg-card dark:bg-zinc-900/40 backdrop-blur-xl rounded-[32px] border border-border/50 shadow-xl p-8 mb-6">
        {loadingProfile ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 text-red-400 text-xs mb-6 border border-red-500/20">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 flex items-center gap-2 rounded-2xl bg-green-500/10 text-green-500 text-xs mb-6 border border-green-500/20">
            <CheckCircle2 className="w-4 h-4" />
            Profile updated successfully
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Full Name
            </Label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="h-12 rounded-2xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" /> Email Address
            </Label>
            <div className="relative">
              <Input
                type="email"
                value={formData.email}
                readOnly
                className="h-12 rounded-2xl bg-muted/30 border-border/30 text-muted-foreground cursor-not-allowed select-none pr-24"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest bg-muted px-2 py-1 rounded-full border border-border/40">
                Cannot edit
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" /> Phone Number
            </Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="h-12 rounded-2xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" /> Address
            </Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="h-12 rounded-2xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all"
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-2xl font-bold transition-all active:scale-95 shadow-lg disabled:opacity-50"
              style={{ background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' }}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
          </>
        )}
      </motion.div>

      {/* Change Password Card */}
      <motion.div {...fadeUp(0.2)} className="bg-card dark:bg-zinc-900/40 backdrop-blur-xl rounded-[32px] border border-border/50 shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Security</h3>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1 block">Current Password</Label>
            <Input
              type="password"
              value={pwForm.current_password}
              onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })}
              className="h-12 rounded-2xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1 block">New Password</Label>
              <Input
                type="password"
                value={pwForm.new_password}
                onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
                className="h-12 rounded-2xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1 block">Confirm Password</Label>
              <Input
                type="password"
                value={pwForm.confirm_password}
                onChange={e => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                className="h-12 rounded-2xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-[rgb(var(--color-primary-rgb))]/20 transition-all"
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={pwSubmitting}
            className="w-full h-12 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            {pwSubmitting ? 'Changing...' : 'Update Password'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
