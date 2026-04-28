import { Shield, UserCheck, Clock, Activity } from 'lucide-react';
import { useData } from '@/shared/contexts/DataContext';

export default function Users() {
  const { logs } = useData();
  const recentLogs = logs.slice(0, 20);

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">User Management</h2>
        <p className="text-[13px] text-[#D6D3D1] mt-0.5">Manage access and monitor activity</p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { title: 'Administrator', desc: 'Full system access', count: 1, icon: Shield, accent: 'bg-[#1C1917] text-white' },
          { title: 'Staff / Mechanic', desc: 'Operational access', count: 1, icon: UserCheck, accent: 'bg-[#EFF6FF] text-[#3B82F6]' },
          { title: 'Activity Today', desc: 'Logged actions', count: logs.length, icon: Activity, accent: 'bg-[#F5F3FF] text-[#8B5CF6]' },
        ].map(card => (
          <div key={card.title} className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-[10px] ${card.accent.split(' ')[0]} flex items-center justify-center`}>
                <card.icon className={`w-[18px] h-[18px] ${card.accent.split(' ')[1]}`} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#44403C]">{card.title}</p>
                <p className="text-[10px] text-[#D6D3D1]">{card.desc}</p>
              </div>
            </div>
            <p className="text-[22px] font-bold text-[#1C1917] tracking-tight">{card.count}</p>
          </div>
        ))}
      </div>

      {/* Access Privileges */}
      <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] mb-6">
        <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4">Access Privileges</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[#F5F5F4]">
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase">Module</th>
              <th className="text-center px-4 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase">Administrator</th>
              <th className="text-center px-4 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase">Staff / Mechanic</th>
            </tr></thead>
            <tbody className="divide-y divide-[#FAFAF9]">
              {[
                { module: 'Inventory', admin: 'Full Control', staff: 'View & Track Only' },
                { module: 'Services', admin: 'Full Control', staff: 'Create & Update' },
                { module: 'Sales', admin: 'Full Control', staff: 'Record Transactions' },
                { module: 'Reports', admin: 'View All Reports', staff: 'View Only' },
                { module: 'Users', admin: 'Manage Users & Roles', staff: 'No Access' },
              ].map(row => (
                <tr key={row.module}>
                  <td className="px-4 py-3 text-[12px] font-medium text-[#44403C]">{row.module}</td>
                  <td className="px-4 py-3 text-center text-[12px] text-[#78716C]">{row.admin}</td>
                  <td className="px-4 py-3 text-center text-[12px] text-[#78716C]">{row.staff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-semibold text-[#1C1917] flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#D6D3D1]" strokeWidth={1.5} />
            Activity Log
          </h3>
          <span className="text-[10px] font-medium text-[#D6D3D1]">{recentLogs.length} entries</span>
        </div>
        <div className="space-y-0 max-h-96 overflow-y-auto">
          {recentLogs.map((log, i) => (
            <div key={log.id} className={`flex items-start gap-3 py-3 ${i < recentLogs.length - 1 ? 'border-b border-[#FAFAF9]' : ''}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${log.user.includes('Admin') ? 'bg-[#1C1917] text-white' : 'bg-[#EFF6FF] text-[#3B82F6]'}`}>
                {log.user.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[#44403C]">{log.user}</p>
                <p className="text-[11px] text-[#A8A29E]">{log.action}</p>
              </div>
              <span className="text-[10px] text-[#D6D3D1] shrink-0 tabular-nums">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
