import { useMemo, useState, useEffect } from 'react';
import { TrendingUp, Package, Wrench, Download } from 'lucide-react';
import { inPeriod, type Period } from '@/shared/lib/period';
import { downloadCSV, toCSV } from '@/shared/lib/csv';
import { apiGet } from '@/shared/lib/api';
import type { Part, ServiceRecord, Transaction } from '@/shared/types';

type ReportType = 'sales' | 'inventory' | 'services';

const PERIOD_LABEL: Record<Period, string> = { daily: 'Today', weekly: 'This week', monthly: 'This month', yearly: 'This year' };

export default function Reports() {
  const [parts, setParts] = useState<Part[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [period, setPeriod] = useState<Period>('daily');

  useEffect(() => {
    void apiGet<{ data: Part[] }>('/api/parts').then(r => setParts(r.data)).catch(() => {});
    void apiGet<{ data: ServiceRecord[] }>('/api/services').then(r => setServices(r.data)).catch(() => {});
    void apiGet<{ data: Transaction[] }>('/api/transactions').then(r => setTransactions(r.data)).catch(() => {});
  }, []);

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
          <h2 className="text-[22px] font-bold text-white tracking-tight">Reports & Analytics</h2>
          <p className="text-[13px] text-zinc-400 mt-0.5">Track your shop's performance — {PERIOD_LABEL[period]}</p>
        </div>
        <button onClick={onExport} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-[12px] font-medium text-zinc-200 hover:bg-zinc-700 transition-colors">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map(r => (
          <button key={r.key} onClick={() => setReportType(r.key)} className={`flex items-center gap-2 px-4 py-[9px] rounded-xl text-[12px] font-medium transition-all ${reportType === r.key ? 'bg-white text-zinc-900 shadow-sm' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'}`}>
            <r.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1 mb-6 flex-wrap">
        {(['daily', 'weekly', 'monthly', 'yearly'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-[6px] rounded-full text-[12px] font-medium capitalize transition-all ${period === p ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>{p}</button>
        ))}
      </div>

      {reportType === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}`, accent: 'bg-white text-zinc-900' },
              { label: 'Transactions', value: filteredTx.length.toString(), accent: 'bg-blue-500/20 text-blue-400' },
              { label: 'Cash', value: `₱${cashTotal.toLocaleString()}`, accent: 'bg-green-500/20 text-green-400' },
              { label: 'GCash', value: `₱${gcashTotal.toLocaleString()}`, accent: 'bg-purple-500/20 text-purple-400' },
            ].map((s, i) => (
              <div key={s.label} className={`rounded-2xl p-4 ${i === 0 ? 'bg-white' : s.accent.split(' ')[0]}`}>
                <p className={`text-[11px] font-medium ${i === 0 ? 'text-zinc-400' : 'text-zinc-400'}`}>{s.label}</p>
                <p className={`text-xl font-bold mt-1 tracking-tight ${i === 0 ? 'text-zinc-900' : 'text-white'}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="p-5 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl">
              <p className="text-[11px] text-zinc-400">Parts Revenue</p>
              <p className="text-xl font-bold text-white mt-1 tracking-tight">₱{partsRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-zinc-500 mt-1">From {filteredTx.reduce((s, t) => s + t.items.length, 0)} line items</p>
            </div>
            <div className="p-5 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl">
              <p className="text-[11px] text-zinc-400">Labor Revenue (paid)</p>
              <p className="text-xl font-bold text-white mt-1 tracking-tight">₱{laborRevenueTx.toLocaleString()}</p>
              <p className="text-[10px] text-zinc-500 mt-1">Across linked service+parts transactions</p>
            </div>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5">
            <h3 className="text-[13px] font-semibold text-white mb-4">Top Selling Parts</h3>
            {partsUsed.length === 0 ? <p className="text-[12px] text-zinc-500 text-center py-6">No data for this period</p> : (
              <div className="space-y-3">
                {partsUsed.slice(0, 10).map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-zinc-500 w-5 text-right">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1"><span className="text-[12px] font-medium text-zinc-200">{p.name}</span><span className="text-[11px] text-zinc-500">{p.count} sold — ₱{p.revenue.toLocaleString()}</span></div>
                      <div className="h-[3px] bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.min(100, (p.count / (partsUsed[0]?.count || 1)) * 100)}%` }} /></div>
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
              { label: 'Total Parts', value: parts.length.toString(), accent: 'bg-blue-500/20 text-blue-400' },
              { label: 'Low Stock', value: lowStockItems.length.toString(), accent: 'bg-yellow-500/20 text-yellow-400' },
              { label: 'Out of Stock', value: parts.filter(p => p.stock === 0).length.toString(), accent: 'bg-red-500/20 text-red-400' },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl p-4 ${s.accent.split(' ')[0]}`}>
                <p className="text-[11px] font-medium text-zinc-400">{s.label}</p>
                <p className="text-xl font-bold text-white mt-1 tracking-tight">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5">
            <h3 className="text-[13px] font-semibold text-white mb-4">Inventory by Category</h3>
            <div className="divide-y divide-zinc-800">
              {Array.from(new Set(parts.map(p => p.category))).sort().map(cat => {
                const catParts = parts.filter(p => p.category === cat);
                const totalStock = catParts.reduce((s, p) => s + p.stock, 0);
                return (
                  <div key={cat} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-medium text-zinc-400 bg-zinc-800 px-2.5 py-[3px] rounded-full">{cat}</span>
                      <span className="text-[11px] text-zinc-500">{catParts.length} parts</span>
                    </div>
                    <span className="text-[13px] font-semibold text-zinc-200 tabular-nums">{totalStock} units</span>
                  </div>
                );
              })}
            </div>
          </div>

          {lowStockItems.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5">
              <h3 className="text-[13px] font-semibold text-yellow-400 mb-3">Low Stock Items</h3>
              <div className="divide-y divide-yellow-500/10">
                {lowStockItems.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2.5">
                    <div><p className="text-[12px] font-medium text-yellow-100">{p.name}</p><p className="text-[10px] text-yellow-500">{p.category}</p></div>
                    <span className={`text-[13px] font-bold ${p.stock === 0 ? 'text-red-400' : 'text-yellow-400'}`}>{p.stock} / {p.minStock}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {reportType === 'services' && (
        <div className="space-y-4">
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5">
            <h3 className="text-[13px] font-semibold text-white mb-4">Service Status Overview</h3>
            <div className="flex items-end gap-6 h-36">
              {Object.entries(serviceStatusCounts).map(([status, count]) => (
                <div key={status} className="flex-1 flex flex-col items-center justify-end gap-2">
                  <span className="text-[11px] font-bold text-zinc-200">{count}</span>
                  <div className={`w-full rounded-t-xl transition-all ${status === 'Completed' ? 'bg-green-400' : status === 'Ongoing' ? 'bg-blue-400' : 'bg-yellow-400'}`} style={{ height: `${Math.max(16, (count / maxServiceCount) * 100)}%` }} />
                  <span className="text-[10px] font-medium text-zinc-500">{status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5">
            <h3 className="text-[13px] font-semibold text-white mb-4">Most Requested Services</h3>
            {serviceTypeBreakdown.length === 0 ? <p className="text-[12px] text-zinc-500 text-center py-6">No data for this period</p> : (
              <div className="space-y-3">
                {serviceTypeBreakdown.map(([type, count], i) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-zinc-500 w-5 text-right">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1"><span className="text-[12px] font-medium text-zinc-200">{type}</span><span className="text-[11px] text-zinc-500">{count} jobs</span></div>
                      <div className="h-[3px] bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, (count / (serviceTypeBreakdown[0]?.[1] || 1)) * 100)}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5">
            <h3 className="text-[13px] font-semibold text-white mb-4">Income Summary ({PERIOD_LABEL[period]})</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-800">
                <p className="text-[11px] text-zinc-500">Parts Revenue</p>
                <p className="text-xl font-bold text-white mt-1 tracking-tight">₱{partsRevenue.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-800">
                <p className="text-[11px] text-zinc-500">Labor Revenue (paid)</p>
                <p className="text-xl font-bold text-white mt-1 tracking-tight">₱{laborRevenueTx.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-800">
                <p className="text-[11px] text-zinc-500">Labor Invoiced</p>
                <p className="text-xl font-bold text-white mt-1 tracking-tight">₱{laborInvoiced.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
