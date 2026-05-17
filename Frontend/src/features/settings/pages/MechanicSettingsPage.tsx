import { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { apiMutation } from '@/shared/lib/api';
import { useAuth } from '@/features/auth/context/AuthContext';

type TabType = 'user' | 'password';

export default function MechanicSettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('user');
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  async function handleSaveUserProfile() {
    try {
      setSaving(true);
      await apiMutation('/api/users/profile', 'PATCH', { fullName: userName });
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError('');
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    try {
      setSaving(true);
      await apiMutation('/api/users/password', 'PATCH', {
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

      <div className="brand-card backdrop-blur-xl rounded-2xl border p-6 shadow-sm" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
        {activeTab === 'user' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground dark:text-zinc-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className={inputClass}
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground dark:text-zinc-300 mb-2">Email Address</label>
                <input type="email" value={user?.email || ''} disabled className={disabledClass} />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground dark:text-zinc-300 mb-2">Role</label>
                <input type="text" value={user?.role || ''} disabled className={disabledClass} />
                <p className="text-xs text-muted-foreground mt-1">Your role is assigned by the shop owner</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground dark:text-zinc-300 mb-2">Shop</label>
                <input type="text" value={user?.shopName || 'N/A'} disabled className={disabledClass} />
              </div>
            </div>

            <button
              onClick={handleSaveUserProfile}
              disabled={saving}
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
                  placeholder="Enter new password (min 6 characters)"
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
