import { useMemo, useState } from 'react';
import { TrendingUp, Package, Wrench, Download } from 'lucide-react';
import { useData } from '@/shared/contexts/DataContext';
import { inPeriod, type Period } from '@/shared/lib/period';
import { downloadCSV, toCSV } from '@/shared/lib/csv';

type ReportType = 'sales' | 'inventory' | 'services';

const PERIOD_LABEL: Record<Period, string> = { daily: 'Today', weekly: 'This week', monthly: 'This month', yearly: 'This year' };

export default function Reports() {
  const { parts, services, transactions } = useData();
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [period, setPeriod] = useState<Period>('daily');

  const filteredTx = transactions.filter(t => inPeriod(t.createdAt, period));
  const filteredServices = services.filter(s => inPeriod(s.createdAt, period));

  const partsRevenue = filteredTx.reduce((s, t) => s + t.items.reduce((a, i) => a + i.price * i.quantity, 0), 0);
  const laborRevenueTx = filteredTx.reduce((s, t) => s + (t.serviceLaborCost || 0), 0);
  const totalRevenue = filteredTx.reduce((s, t) => s + t.total, 0);
  const cashTotal = filteredTx.filter(t => t.paymentMethod === 'Cash').reduce((s, t) => s + t.total, 0);
  const gcashTotal = filteredTx.filter(t => t.paymentMethod === 'GCash').reduce((s, t) => s + t.total, 0);
  const laborInvoiced = filteredServices.reduce((s, svc) => s + svc.laborCost, 0);

  const serviceTypeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredServices.forEach(s => { map[s.serviceType] = (map[s.serviceType] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredServices]);

  const partsUsed = useMemo(() => {
    const map: Record<string, { name: string; count: number; revenue: number }> = {};
    filteredTx.forEach(tx => {
      tx.items.forEach(item => {
        if (!map[item.partId]) map[item.partId] = { name: item.name, count: 0, revenue: 0 };
        map[item.partId].count += item.quantity;
        map[item.partId].revenue += item.price * item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredTx]);

  const lowStockItems = parts.filter(p => p.stock <= p.minStock);
  const serviceStatusCounts = { Pending: services.filter(s => s.status === 'Pending').length, Ongoing: services.filter(s => s.status === 'Ongoing').length, Completed: services.filter(s => s.status === 'Completed').length };
  const maxServiceCount = Math.max(...Object.values(serviceStatusCounts), 1);

  const tabs = [
    { key: 'sales' as const, label: 'Sales Report', icon: TrendingUp },
    { key: 'inventory' as const, label: 'Inventory Report', icon: Package },
    { key: 'services' as const, label: 'Service Report', icon: Wrench },
  ];

  const exportSalesCSV = () => {
    const rows = filteredTx.map(t => ({
      id: t.id,
      date: new Date(t.createdAt).toISOString(),
      type: t.type,
      items: t.items.map(i => `${i.name} x${i.quantity}`).join('; '),
      partsRevenue: t.items.reduce((s, i) => s + i.price * i.quantity, 0),
      laborCost: t.serviceLaborCost || 0,
      paymentMethod: t.paymentMethod,
      total: t.total,
    }));
    downloadCSV(`sales-${period}-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows, [
      { key: 'id', label: 'Transaction' },
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'items', label: 'Items' },
      { key: 'partsRevenue', label: 'Parts Revenue (₱)' },
      { key: 'laborCost', label: 'Labor (₱)' },
      { key: 'paymentMethod', label: 'Payment' },
      { key: 'total', label: 'Total (₱)' },
    ]));
  };

  const exportInventoryCSV = () => {
    downloadCSV(`inventory-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(parts, [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'stock', label: 'Stock' },
      { key: 'minStock', label: 'Min Stock' },
      { key: 'price', label: 'Price (₱)' },
      { key: 'barcode', label: 'Barcode' },
    ]));
  };

  const exportServicesCSV = () => {
    const rows = filteredServices.map(s => ({
      id: s.id,
      customerName: s.customerName,
      motorcycleModel: s.motorcycleModel,
      serviceType: s.serviceType,
      laborCost: s.laborCost,
      status: s.status,
      createdAt: s.createdAt,
      completedAt: s.completedAt || '',
    }));
    downloadCSV(`services-${period}-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows, [
      { key: 'id', label: 'ID' },
      { key: 'customerName', label: 'Customer' },
      { key: 'motorcycleModel', label: 'Motorcycle' },
      { key: 'serviceType', label: 'Service' },
      { key: 'laborCost', label: 'Labor (₱)' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created' },
      { key: 'completedAt', label: 'Completed' },
    ]));
  };

  const onExport = () => {
    if (reportType === 'sales') exportSalesCSV();
    else if (reportType === 'inventory') exportInventoryCSV();
    else exportServicesCSV();
  };

  return (
    <div>
      <div className="mb-7 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Reports & Analytics</h2>
          <p className="text-[13px] text-[#D6D3D1] mt-0.5">Track your shop's performance — {PERIOD_LABEL[period]}</p>
        </div>
        <button onClick={onExport} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white border border-[#E7E5E4] text-[12px] font-medium text-[#44403C] hover:bg-[#F5F5F4]">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map(r => (
          <button key={r.key} onClick={() => setReportType(r.key)} className={`flex items-center gap-2 px-4 py-[9px] rounded-xl text-[12px] font-medium transition-all ${reportType === r.key ? 'bg-[#1C1917] text-white shadow-sm' : 'bg-white text-[#A8A29E] border border-[#F0EFED] hover:border-[#E7E5E4] hover:text-[#78716C]'}`}>
            <r.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1 mb-6 flex-wrap">
        {(['daily', 'weekly', 'monthly', 'yearly'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-[6px] rounded-full text-[12px] font-medium capitalize transition-all ${period === p ? 'bg-[#F5F5F4] text-[#44403C]' : 'text-[#D6D3D1] hover:text-[#A8A29E]'}`}>{p}</button>
        ))}
      </div>

      {reportType === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}`, accent: 'bg-[#1C1917] text-white' },
              { label: 'Transactions', value: filteredTx.length.toString(), accent: 'bg-[#EFF6FF] text-[#3B82F6]' },
              { label: 'Cash', value: `₱${cashTotal.toLocaleString()}`, accent: 'bg-[#ECFDF5] text-[#10B981]' },
              { label: 'GCash', value: `₱${gcashTotal.toLocaleString()}`, accent: 'bg-[#F5F3FF] text-[#8B5CF6]' },
            ].map((s, i) => (
              <div key={s.label} className={`rounded-2xl p-4 ${i === 0 ? 'bg-[#1C1917]' : s.accent.split(' ')[0]}`}>
                <p className={`text-[11px] font-medium ${i === 0 ? 'text-[#A8A29E]' : 'text-[#A8A29E]'}`}>{s.label}</p>
                <p className={`text-xl font-bold mt-1 tracking-tight ${i === 0 ? 'text-white' : 'text-[#1C1917]'}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="p-5 bg-white rounded-2xl border border-[#F5F5F4]">
              <p className="text-[11px] text-[#A8A29E]">Parts Revenue</p>
              <p className="text-xl font-bold text-[#1C1917] mt-1 tracking-tight">₱{partsRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-[#D6D3D1] mt-1">From {filteredTx.reduce((s, t) => s + t.items.length, 0)} line items</p>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-[#F5F5F4]">
              <p className="text-[11px] text-[#A8A29E]">Labor Revenue (paid)</p>
              <p className="text-xl font-bold text-[#1C1917] mt-1 tracking-tight">₱{laborRevenueTx.toLocaleString()}</p>
              <p className="text-[10px] text-[#D6D3D1] mt-1">Across linked service+parts transactions</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4">Top Selling Parts</h3>
            {partsUsed.length === 0 ? <p className="text-[12px] text-[#D6D3D1] text-center py-6">No data for this period</p> : (
              <div className="space-y-3">
                {partsUsed.slice(0, 10).map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-[#D6D3D1] w-5 text-right">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1"><span className="text-[12px] font-medium text-[#44403C]">{p.name}</span><span className="text-[11px] text-[#A8A29E]">{p.count} sold — ₱{p.revenue.toLocaleString()}</span></div>
                      <div className="h-[3px] bg-[#F5F5F4] rounded-full overflow-hidden"><div className="h-full bg-[#1C1917] rounded-full transition-all" style={{ width: `${Math.min(100, (p.count / (partsUsed[0]?.count || 1)) * 100)}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {reportType === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Parts', value: parts.length.toString(), accent: 'bg-[#EFF6FF] text-[#3B82F6]' },
              { label: 'Low Stock', value: lowStockItems.length.toString(), accent: 'bg-[#FFFBEB] text-[#F59E0B]' },
              { label: 'Out of Stock', value: parts.filter(p => p.stock === 0).length.toString(), accent: 'bg-red-50 text-[#EF4444]' },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl p-4 ${s.accent.split(' ')[0]}`}>
                <p className="text-[11px] font-medium text-[#A8A29E]">{s.label}</p>
                <p className="text-xl font-bold text-[#1C1917] mt-1 tracking-tight">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4">Inventory by Category</h3>
            <div className="divide-y divide-[#FAFAF9]">
              {Array.from(new Set(parts.map(p => p.category))).sort().map(cat => {
                const catParts = parts.filter(p => p.category === cat);
                const totalStock = catParts.reduce((s, p) => s + p.stock, 0);
                return (
                  <div key={cat} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-medium text-[#78716C] bg-[#F5F5F4] px-2.5 py-[3px] rounded-full">{cat}</span>
                      <span className="text-[11px] text-[#D6D3D1]">{catParts.length} parts</span>
                    </div>
                    <span className="text-[13px] font-semibold text-[#44403C] tabular-nums">{totalStock} units</span>
                  </div>
                );
              })}
            </div>
          </div>

          {lowStockItems.length > 0 && (
            <div className="bg-[#FFFBEB] rounded-2xl border border-[#FEF3C7] p-5">
              <h3 className="text-[13px] font-semibold text-[#92400E] mb-3">Low Stock Items</h3>
              <div className="divide-y divide-[#FEF3C7]/50">
                {lowStockItems.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2.5">
                    <div><p className="text-[12px] font-medium text-[#78350F]">{p.name}</p><p className="text-[10px] text-[#D97706]">{p.category}</p></div>
                    <span className={`text-[13px] font-bold ${p.stock === 0 ? 'text-[#EF4444]' : 'text-[#D97706]'}`}>{p.stock} / {p.minStock}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {reportType === 'services' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4">Service Status Overview</h3>
            <div className="flex items-end gap-6 h-36">
              {Object.entries(serviceStatusCounts).map(([status, count]) => (
                <div key={status} className="flex-1 flex flex-col items-center justify-end gap-2">
                  <span className="text-[11px] font-bold text-[#44403C]">{count}</span>
                  <div className={`w-full rounded-t-xl transition-all ${status === 'Completed' ? 'bg-[#34D399]' : status === 'Ongoing' ? 'bg-[#60A5FA]' : 'bg-[#FBBF24]'}`} style={{ height: `${Math.max(16, (count / maxServiceCount) * 100)}%` }} />
                  <span className="text-[10px] font-medium text-[#A8A29E]">{status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4">Most Requested Services</h3>
            {serviceTypeBreakdown.length === 0 ? <p className="text-[12px] text-[#D6D3D1] text-center py-6">No data for this period</p> : (
              <div className="space-y-3">
                {serviceTypeBreakdown.map(([type, count], i) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-[#D6D3D1] w-5 text-right">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1"><span className="text-[12px] font-medium text-[#44403C]">{type}</span><span className="text-[11px] text-[#A8A29E]">{count} jobs</span></div>
                      <div className="h-[3px] bg-[#F5F5F4] rounded-full overflow-hidden"><div className="h-full bg-[#1C1917] rounded-full" style={{ width: `${Math.min(100, (count / (serviceTypeBreakdown[0]?.[1] || 1)) * 100)}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#F5F5F4] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h3 className="text-[13px] font-semibold text-[#1C1917] mb-4">Income Summary ({PERIOD_LABEL[period]})</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-4 bg-[#FAFAF9] rounded-xl">
                <p className="text-[11px] text-[#A8A29E]">Parts Revenue</p>
                <p className="text-xl font-bold text-[#1C1917] mt-1 tracking-tight">₱{partsRevenue.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-[#FAFAF9] rounded-xl">
                <p className="text-[11px] text-[#A8A29E]">Labor Revenue (paid)</p>
                <p className="text-xl font-bold text-[#1C1917] mt-1 tracking-tight">₱{laborRevenueTx.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-[#FAFAF9] rounded-xl">
                <p className="text-[11px] text-[#A8A29E]">Labor Invoiced</p>
                <p className="text-xl font-bold text-[#1C1917] mt-1 tracking-tight">₱{laborInvoiced.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
