import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPlatformAdmin, getPlatformAdmins, setPlatformAdminStatus } from '@/features/superadmin/lib/api';
import type { PlatformAdmin } from '@/shared/types';

export default function SuperAdminAccessControlPage() {
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const load = async () => {
    setLoading(true);
    try {
      const response = await getPlatformAdmins();
      setAdmins(response.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load platform admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async () => {
    if (!form.name || !form.email) {
      toast.error('Name and email are required');
      return;
    }

    try {
      const response = await createPlatformAdmin({
        name: form.name,
        email: form.email,
        password: form.password || undefined,
      });

      if (response.data.temporaryPassword) {
        toast.success(`Platform admin created. Temporary password: ${response.data.temporaryPassword}`);
      } else {
        toast.success('Platform admin created');
      }

      setForm({ name: '', email: '', password: '' });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create platform admin');
    }
  };

  const onToggleStatus = async (admin: PlatformAdmin) => {
    const target = admin.statusCode === 'active' ? 'inactive' : 'active';

    try {
      await setPlatformAdminStatus(admin.userId, target);
      toast.success(`Set ${admin.name} to ${target}`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update admin status');
    }
  };

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-[22px] font-bold text-white tracking-tight">Access Control</h2>
        <p className="text-[13px] text-zinc-400 mt-0.5">Manage SuperAdmin accounts and platform-wide access</p>
      </div>

      <section className="bg-zinc-950 rounded-2xl border border-zinc-800 p-4 mb-4">
        <h3 className="text-[13px] font-semibold text-white mb-3">Create Platform Admin</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Input placeholder="Full name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500" />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500" />
          <Input placeholder="Password (optional)" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500" />
        </div>
        <Button className="mt-3 h-9 text-[12px] bg-white hover:bg-zinc-200 text-black" onClick={() => void onCreate()}>Create Admin</Button>
      </section>

      <section className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-x-auto">
        <table className="w-full min-w-[620px]">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase">Last Active</th>
              <th className="text-right px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-zinc-400">Loading platform admins...</td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[12px] text-zinc-400">No platform admins found</td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.userId}>
                  <td className="px-4 py-3 text-[12px] font-medium text-white">{admin.name}</td>
                  <td className="px-4 py-3 text-[12px] text-zinc-300">{admin.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-[3px] rounded-full border ${admin.statusCode === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}`}>
                      {admin.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-zinc-400">{admin.lastActive ? new Date(admin.lastActive).toLocaleString() : 'N/A'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" className="h-8 px-3 text-[11px] border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700" onClick={() => void onToggleStatus(admin)}>
                      {admin.statusCode === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}


