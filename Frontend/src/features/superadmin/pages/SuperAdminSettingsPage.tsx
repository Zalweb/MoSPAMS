import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getPlatformSettings,
  getSystemHealth,
  updatePlatformSettings,
  type PlatformSettings,
  type SystemHealth,
} from '@/features/superadmin/lib/api';

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getPlatformSettings(), getSystemHealth()])
      .then(([settingsRes, healthRes]) => {
        if (cancelled) return;
        setSettings(settingsRes.data);
        setHealth(healthRes.data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : 'Failed to load settings');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const onSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await updatePlatformSettings(settings);
      setSettings(response.data);
      toast.success('Platform settings updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-[22px] font-bold text-foreground tracking-tight">Platform Settings</h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">Manage maintenance mode, API keys, and system configuration</p>
      </div>

      {loading || !settings || !health ? (
        <p className="text-[13px] text-muted-foreground">Loading platform settings...</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr,1fr] gap-4">
          <section className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-[13px] font-semibold text-foreground mb-4">Configuration</h3>

            <label className="flex items-center justify-between mb-4">
                <span className="text-[12px] text-muted-foreground dark:text-zinc-300">Maintenance Mode</span>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(event) => setSettings((prev) => (prev ? { ...prev, maintenanceMode: event.target.checked } : prev))}
                className="w-4 h-4 accent-white border-border dark:border-zinc-700 bg-muted"
              />
            </label>

            <div className="space-y-3">
              <label className="block">
                <span className="text-[11px] font-medium text-muted-foreground">Weather API Key</span>
                <Input
                  value={settings.weatherApiKey ?? ''}
                  onChange={(event) => setSettings((prev) => (prev ? { ...prev, weatherApiKey: event.target.value } : prev))}
                  className="mt-1.5 h-9 rounded-xl border-border dark:border-zinc-700 bg-muted text-foreground dark:text-zinc-200 placeholder:text-muted-foreground"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-medium text-muted-foreground">SMS API Key</span>
                <Input
                  value={settings.smsApiKey ?? ''}
                  onChange={(event) => setSettings((prev) => (prev ? { ...prev, smsApiKey: event.target.value } : prev))}
                  className="mt-1.5 h-9 rounded-xl border-border dark:border-zinc-700 bg-muted text-foreground dark:text-zinc-200 placeholder:text-muted-foreground"
                />
              </label>
            </div>

            <Button className="mt-4 h-9 text-[12px] bg-white hover:bg-zinc-200 text-black" onClick={() => void onSave()} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </section>

          <section className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-[13px] font-semibold text-foreground mb-3">Database Health</h3>
              <p className="text-[12px] text-muted-foreground dark:text-zinc-300">
                Status:{' '}
                <span className={health.database.ok ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                  {health.database.ok ? 'Healthy' : 'Issue Detected'}
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{health.database.message}</p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-[13px] font-semibold text-foreground mb-3">System Metrics</h3>
              <Metric label="Shops" value={health.counts.shops} />
              <Metric label="Users" value={health.counts.users} />
              <Metric label="Pending Shops" value={health.counts.pendingShops} />
              <Metric label="Active Subscriptions" value={health.counts.activeSubscriptions} />
            </div>

            <div className="bg-card rounded-2xl border border-border p-5">
              <h3 className="text-[13px] font-semibold text-foreground mb-3">Version</h3>
              <p className="text-[18px] font-bold text-foreground">{health.version}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Generated {new Date(health.generatedAt).toLocaleString()}</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
      <span className="text-[12px] text-muted-foreground dark:text-zinc-300">{label}</span>
      <span className="text-[12px] font-semibold text-foreground">{value}</span>
    </div>
  );
}


