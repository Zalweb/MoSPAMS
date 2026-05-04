import { Wrench, Terminal, Mail, Settings } from 'lucide-react';

export function MaintenanceModePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">System Maintenance</h1>
        <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Control platform maintenance mode</p>
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
          <Wrench className="w-8 h-8 text-zinc-600" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Maintenance Mode Coming Soon</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          Toggle maintenance mode, schedule downtime, and display custom maintenance messages.
        </p>
      </div>
    </div>
  );
}

export function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">API Keys</h1>
        <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Manage external API integrations</p>
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
          <Terminal className="w-8 h-8 text-zinc-600" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">API Keys Management Coming Soon</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          Configure external API keys for weather, SMS, payment gateways, and other integrations.
        </p>
      </div>
    </div>
  );
}

export function EmailTemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Email Templates</h1>
        <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Customize email notifications</p>
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-zinc-600" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Email Templates Coming Soon</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          Create and customize email templates for shop notifications, password resets, and system alerts.
        </p>
      </div>
    </div>
  );
}

export function SupportTicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Support Tickets</h1>
        <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Manage shop support requests</p>
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8 text-zinc-600" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Support System Coming Soon</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          View and respond to support tickets from shops, track resolution times, and manage support queue.
        </p>
      </div>
    </div>
  );
}

export function ShopFeedbackPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">Shop Feedback</h1>
        <p className="text-[13px] sm:text-[14px] text-zinc-400 mt-1">Review feedback from shops</p>
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8 text-zinc-600" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Feedback System Coming Soon</h3>
        <p className="text-zinc-400 max-w-md mx-auto">
          Collect and analyze feedback from shops to improve the platform.
        </p>
      </div>
    </div>
  );
}
