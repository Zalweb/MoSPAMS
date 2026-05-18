import { useState, useEffect } from 'react';
import { User, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiMutation } from '@/shared/lib/api';

type TabType = 'user' | 'password';

export default function CustomerSettings() {
 const [activeTab, setActiveTab] = useState<TabType>('user');
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [formData, setFormData] = useState({ full_name: '', phone: '', email: '', address: '' });
 const [currentPassword, setCurrentPassword] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');
 const [passwordError, setPasswordError] = useState('');

 useEffect(() => {
 const load = async () => {
 try {
 const data = await apiGet<{ full_name: string; phone: string; email: string; address: string }>('/api/customer/profile');
 setFormData({
 full_name: data.full_name || '',
 phone: data.phone || '',
 email: data.email || '',
 address: data.address || '',
 });
 } catch {
 toast.error('Failed to load profile');
 } finally {
 setLoading(false);
 }
 };
 void load();
 }, []);

 async function handleSaveProfile() {
 try {
 setSaving(true);
 await apiMutation('/api/customer/profile', 'PATCH', {
 full_name: formData.full_name,
 phone: formData.phone,
 address: formData.address,
 });
 toast.success('Profile updated successfully');
 } catch {
 toast.error('Failed to update profile');
 } finally {
 setSaving(false);
 }
 }

 async function handleChangePassword() {
 setPasswordError('');
 if (newPassword.length < 8) {
 setPasswordError('Password must be at least 8 characters');
 return;
 }
 if (newPassword !== confirmPassword) {
 setPasswordError('Passwords do not match');
 return;
 }
 try {
 setSaving(true);
 await apiMutation('/api/customer/password', 'PATCH', {
 current_password: currentPassword,
 new_password: newPassword,
 new_password_confirmation: confirmPassword,
 });
 toast.success('Password changed successfully');
 setCurrentPassword('');
 setNewPassword('');
 setConfirmPassword('');
 } catch (error: any) {
 setPasswordError(error?.message || error?.error || 'Failed to change password');
 } finally {
 setSaving(false);
 }
 }

 const inputClass = 'w-full px-4 py-2.5 bg-secondary dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-white/20';
 const disabledClass = 'w-full px-4 py-2.5 bg-secondary/50 dark:bg-zinc-800/50 border border-border dark:border-zinc-700 rounded-xl text-muted-foreground text-sm cursor-not-allowed';

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-bold text-foreground mb-2">Settings</h1>
 <p className="text-sm text-muted-foreground">Manage your profile and account security</p>
 </div>

 <div className="flex gap-2 border-b border-border">
 <button
 onClick={() => setActiveTab('user')}
 className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
 activeTab === 'user' ? 'text-foreground border-white' : 'text-muted-foreground border-transparent hover:text-foreground'
 }`}
 >
 <User className="w-4 h-4" strokeWidth={2} />
 User Profile
 </button>
 <button
 onClick={() => setActiveTab('password')}
 className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
 activeTab === 'password' ? 'text-foreground border-white' : 'text-muted-foreground border-transparent hover:text-foreground'
 }`}
 >
 <Lock className="w-4 h-4" strokeWidth={2} />
 Password
 </button>
 </div>

 <div className="brand-card rounded-2xl border p-6 shadow-sm" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
 {activeTab === 'user' && (
 <div className="space-y-6">
 <h3 className="text-lg font-semibold text-foreground mb-4">Personal Information</h3>

 {loading ? (
 <div className="flex items-center justify-center py-10">
 <div className="w-6 h-6 border-2 border-border border-t-white rounded-full animate-spin" />
 </div>
 ) : (
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-muted-foreground dark:text-zinc-300 mb-2">Full Name</label>
 <input
 type="text"
 value={formData.full_name}
 onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
 className={inputClass}
 placeholder="Enter your full name"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-muted-foreground dark:text-zinc-300 mb-2">Email Address</label>
 <div className="relative">
 <input type="email" value={formData.email} readOnly className={`${disabledClass} pr-28`} />
 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest bg-muted px-2 py-1 rounded-full border border-border/40">
 Cannot edit
 </span>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-muted-foreground dark:text-zinc-300 mb-2">Phone Number</label>
 <input
 type="tel"
 value={formData.phone}
 onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
 className={inputClass}
 placeholder="+63 XXX XXX XXXX"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-muted-foreground dark:text-zinc-300 mb-2">Address</label>
 <input
 type="text"
 value={formData.address}
 onChange={(e) => setFormData({ ...formData, address: e.target.value })}
 className={inputClass}
 placeholder="Your address"
 />
 </div>
 </div>
 )}

 <button
 onClick={handleSaveProfile}
 disabled={saving || loading}
 className="px-6 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
 style={{ background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' }}
 >
 {saving ? 'Saving...' : 'Save Changes'}
 </button>
 </div>
 )}

 {activeTab === 'password' && (
 <div className="space-y-6">
 <h3 className="text-lg font-semibold text-foreground mb-4">Change Password</h3>
 <div className="space-y-4 max-w-md">
 {passwordError && (
 <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
 {passwordError}
 </div>
 )}
 <div>
 <label className="block text-sm font-medium text-muted-foreground dark:text-zinc-300 mb-2">Current Password</label>
 <input
 type="password"
 value={currentPassword}
 onChange={(e) => setCurrentPassword(e.target.value)}
 className={inputClass}
 placeholder="Enter current password"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-muted-foreground dark:text-zinc-300 mb-2">New Password</label>
 <input
 type="password"
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 className={inputClass}
 placeholder="Enter new password (min 8 characters)"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-muted-foreground dark:text-zinc-300 mb-2">Confirm New Password</label>
 <input
 type="password"
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 className={inputClass}
 placeholder="Re-enter new password"
 />
 </div>
 </div>
 <button
 onClick={handleChangePassword}
 disabled={saving || !currentPassword || !newPassword || !confirmPassword}
 className="px-6 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
 style={{ background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' }}
 >
 {saving ? 'Changing...' : 'Change Password'}
 </button>
 </div>
 )}
 </div>
 </div>
 );
}
