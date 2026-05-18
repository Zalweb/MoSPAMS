import { useState, useEffect } from 'react';
import { User, Mail, Shield, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/context/AuthContext';
import { apiMutation } from '@/shared/lib/api';

export default function SuperAdminProfilePage() {
 const { user, refreshUser } = useAuth();
 const [name, setName] = useState(user?.name || '');
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 if (user?.name) setName(user.name);
 }, [user?.name]);

 const handleSave = async () => {
 if (!name.trim()) { toast.error('Name is required'); return; }
 try {
 setSaving(true);
 await apiMutation('/api/superadmin/profile', 'PATCH', { fullName: name.trim() });
 await refreshUser();
 toast.success('Profile updated');
 } catch {
 toast.error('Failed to update profile');
 } finally {
 setSaving(false);
 }
 };

 return (
 <div className="max-w-2xl mx-auto">
 <div className="mb-7">
 <h2 className="text-[22px] font-bold text-foreground tracking-tight">Profile Settings</h2>
 <p className="text-[13px] text-muted-foreground mt-0.5">Manage your platform admin account</p>
 </div>

 <div className="space-y-6">
 <div className="bg-gradient-to-br from-card to-foreground/[0.03] rounded-2xl border border-border p-6">
 <h3 className="text-[15px] font-semibold text-foreground mb-6 flex items-center gap-2">
 <User className="w-5 h-5" strokeWidth={1.75} />
 Account Information
 </h3>

 <div className="space-y-4">
 <div>
 <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Full Name</label>
 <Input value={name} onChange={e => setName(e.target.value)} className="bg-muted border-border dark:border-zinc-700 text-foreground" />
 </div>
 <div>
 <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Email</label>
 <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-[13px] text-muted-foreground">
 <Mail className="w-4 h-4" />
 {user?.email || 'No email'}
 </div>
 </div>
 <div>
 <label className="block text-[12px] font-medium text-muted-foreground mb-1.5">Role</label>
 <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-[13px] text-muted-foreground">
 <Shield className="w-4 h-4" />
 SuperAdmin
 </div>
 </div>
 </div>

 <div className="mt-6 pt-6 border-t border-border">
 <Button className="text-[13px] flex items-center gap-2" style={{ background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' }} onClick={() => void handleSave()} disabled={saving}>
 <Save className="w-4 h-4" />
 {saving ? 'Saving...' : 'Save Changes'}
 </Button>
 </div>
 </div>
 </div>
 </div>
 );
}
