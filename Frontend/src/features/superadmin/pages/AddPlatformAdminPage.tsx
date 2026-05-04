import { useState } from 'react';
import { Shield, User, Mail, ArrowLeft, CheckCircle, Copy, Key } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { createPlatformAdmin } from '@/features/superadmin/lib/api';
import { toast } from 'sonner';

export default function AddPlatformAdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [credentials, setCredentials] = useState<{ temporaryPassword: string | null } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = formData.password 
        ? { name: formData.name, email: formData.email, password: formData.password }
        : { name: formData.name, email: formData.email };
      
      const result = await createPlatformAdmin(payload);
      setCredentials(result.data);
      setSuccess(true);
      toast.success('Platform admin created successfully!');
    } catch (error) {
      console.error('Failed to create admin', error);
      toast.error('Failed to create platform admin');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }

  if (success && credentials) {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-950 rounded-2xl border border-zinc-800 p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" strokeWidth={2} />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Admin Created Successfully!</h2>
          <p className="text-zinc-400 mb-6">The platform admin account has been created.</p>

          {credentials.temporaryPassword && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6 text-left">
              <h3 className="text-sm font-semibold text-zinc-400 mb-4">Login Credentials</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Email</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.email}
                      readOnly
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    <button
                      onClick={() => copyToClipboard(formData.email)}
                      className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors"
                    >
                      <Copy className="w-4 h-4 text-zinc-400" strokeWidth={2} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Temporary Password</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={credentials.temporaryPassword}
                      readOnly
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(credentials.temporaryPassword!)}
                      className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-colors"
                    >
                      <Copy className="w-4 h-4 text-zinc-400" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-400">
                  ⚠️ Make sure to save these credentials. The temporary password will not be shown again.
                </p>
              </div>
            </div>
          )}

          {!credentials.temporaryPassword && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-400">
                Admin created with custom password. They can login immediately with the credentials provided.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/superadmin/access-control')}
              className="flex-1 px-6 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white font-semibold hover:bg-zinc-700 transition-colors"
            >
              View All Admins
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setCredentials(null);
                setFormData({ name: '', email: '', password: '' });
              }}
              className="flex-1 px-6 py-3 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
            >
              Add Another Admin
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/superadmin/access-control')}
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-400" strokeWidth={2} />
        </button>
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Add Platform Admin</h1>
          <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Create a new platform administrator account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" strokeWidth={2} />
            Admin Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Full Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" strokeWidth={2} />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Email Address <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" strokeWidth={2} />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">This will be used as the login email</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Password <span className="text-zinc-500">(Optional)</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" strokeWidth={2} />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave empty to auto-generate"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Leave empty to generate a temporary password automatically
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" strokeWidth={2} />
            <div>
              <h3 className="text-sm font-semibold text-blue-400 mb-1">Platform Admin Permissions</h3>
              <p className="text-xs text-blue-300/80">
                Platform admins have full access to all SuperAdmin features including shop management, 
                billing, analytics, and system settings. Only create admin accounts for trusted personnel.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-800 flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/superadmin/access-control')}
            className="flex-1 px-6 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-semibold hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" strokeWidth={2} />
            {loading ? 'Creating Admin...' : 'Create Admin'}
          </button>
        </div>
      </form>
    </div>
  );
}
