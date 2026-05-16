import { useMemo, useState, useEffect } from 'react';
import { TrendingUp, Package, Wrench, Download } from 'lucide-react';
import { inPeriod, type Period } from '@/shared/lib/period';
import { downloadCSV, toCSV } from '@/shared/lib/csv';
import { apiGet } from '@/shared/lib/api';
import type { Part, ServiceRecord, Transaction } from '@/shared/types';

type ReportType = 'sales' | 'inventory' | 'services';

const PERIOD_LABEL: Record<Period | 'custom', string> = { daily: 'Today', weekly: 'This week', monthly: 'This month', yearly: 'This year', custom: 'Custom' };

export default function Reports() {
  const [parts, setParts] = useState<Part[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [period, setPeriod] = useState<Period | 'custom'>('daily');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    void apiGet<{ data: Part[] }>('/api/parts').then(r => setParts(r.data)).catch(() => {});
    void apiGet<{ data: ServiceRecord[] }>('/api/services').then(r => setServices(r.data)).catch(() => {});
    void apiGet<{ data: Transaction[] }>('/api/transactions').then(r => setTransactions(r.data)).catch(() => {});
  }, []);

  const filteredTx = transactions.filter(t => {
    if (period === 'custom') {
      if (customFrom && t.createdAt < customFrom) return false;
      if (customTo && t.createdAt > customTo + 'T23:59:59') return false;
      return true;
    }
    return inPeriod(t.createdAt, period);
  });
  const filteredServices = services.filter(s => {
    if (period === 'custom') {
      if (customFrom && s.createdAt < customFrom) return false;
      if (customTo && s.createdAt > customTo + 'T23:59:59') return false;
      return true;
    }
    return inPeriod(s.createdAt, period);
  });

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
          <h2 className="text-[22px] font-bold text-foreground tracking-tight">Reports & Analytics</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">Track your shop's performance — {PERIOD_LABEL[period]}</p>
        </div>
        <button onClick={onExport} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-secondary dark:bg-zinc-800 border border-border dark:border-zinc-700 text-[12px] font-medium text-foreground dark:text-zinc-200 hover:bg-muted dark:bg-zinc-700 transition-colors">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map(r => (
          <button
            key={r.key}
            onClick={() => setReportType(r.key)}
            className={`flex items-center gap-2 px-4 py-[9px] rounded-xl text-[12px] font-medium transition-all ${reportType === r.key ? 'shadow-lg' : 'bg-muted text-muted-foreground border border-border hover:border-border dark:border-zinc-700 hover:text-foreground dark:text-zinc-200'}`}
            style={reportType === r.key ? { background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' } : undefined}
          >
            <r.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1 flex-wrap items-center mb-3">
        {(['daily', 'weekly', 'monthly', 'yearly', 'custom'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-[6px] rounded-full text-[12px] font-medium capitalize transition-all ${period === p ? '' : 'text-muted-foreground hover:text-foreground dark:text-zinc-300'}`}
            style={period === p ? { background: 'var(--brand-surface-gradient)', color: 'var(--brand-mixed)', border: '1px solid var(--brand-border)' } : undefined}
          >{p}</button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex items-center gap-2 mb-6">
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-8 px-3 bg-muted border border-border rounded-lg text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-zinc-700" />
          <span className="text-muted-foreground text-xs">to</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-8 px-3 bg-muted border border-border rounded-lg text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-zinc-700" />
        </div>
      )}
      {period !== 'custom' && <div className="mb-3" />}

      {reportType === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}`, accent: 'bg-blue-500/20 text-blue-400', primary: true },
              { label: 'Transactions', value: filteredTx.length.toString(), accent: 'bg-blue-500/20 text-blue-400' },
              { label: 'Cash', value: `₱${cashTotal.toLocaleString()}`, accent: 'bg-green-500/20 text-green-400' },
              { label: 'GCash', value: `₱${gcashTotal.toLocaleString()}`, accent: 'bg-purple-500/20 text-purple-400' },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-2xl p-4 shadow-sm border backdrop-blur-md ${s.primary ? 'border-transparent' : 'border-border/50 bg-card dark:bg-zinc-900/40 ' + s.accent.split(' ')[0]}`}
                style={s.primary ? { background: 'var(--brand-gradient)', boxShadow: 'var(--brand-glow)', borderColor: 'transparent' } : undefined}
              >
                <p className={`text-[11px] font-medium ${s.primary ? '' : 'text-muted-foreground'}`} style={s.primary ? { color: 'var(--brand-text-on-primary)', opacity: 0.8 } : undefined}>{s.label}</p>
                <p className={`text-xl font-bold mt-1 tracking-tight ${s.primary ? '' : 'text-foreground'}`} style={s.primary ? { color: 'var(--brand-text-on-primary)' } : undefined}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="p-5 bg-card shadow-soft dark:shadow-none dark:bg-zinc-900/40 backdrop-blur-sm border border-border rounded-2xl">
              <p className="text-[11px] text-muted-foreground">Parts Revenue</p>
              <p className="text-xl font-bold text-foreground mt-1 tracking-tight">₱{partsRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-1">From {filteredTx.reduce((s, t) => s + t.items.length, 0)} line items</p>
            </div>
            <div className="p-5 bg-card shadow-soft dark:shadow-none dark:bg-zinc-900/40 backdrop-blur-sm border border-border rounded-2xl">
              <p className="text-[11px] text-muted-foreground">Labor Revenue (paid)</p>
              <p className="text-xl font-bold text-foreground mt-1 tracking-tight">₱{laborRevenueTx.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Across linked service+parts transactions</p>
            </div>
          </div>

          <div className="bg-card shadow-soft dark:shadow-none dark:bg-zinc-900/40 backdrop-blur-sm border border-border rounded-2xl p-5">
            <h3 className="text-[13px] font-semibold text-foreground mb-4">Top Selling Parts</h3>
            {partsUsed.length === 0 ? <p className="text-[12px] text-muted-foreground text-center py-6">No data for this period</p> : (
              <div className="space-y-3">
                {partsUsed.slice(0, 10).map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-muted-foreground w-5 text-right">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1"><span className="text-[12px] font-medium text-foreground dark:text-zinc-200">{p.name}</span><span className="text-[11px] text-muted-foreground">{p.count} sold — ₱{p.revenue.toLocaleString()}</span></div>
                      <div className="h-[3px] bg-secondary dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (p.count / (partsUsed[0]?.count || 1)) * 100)}%`, background: 'var(--brand-gradient)' }} /></div>
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
                <p className="text-[11px] font-medium text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold text-foreground mt-1 tracking-tight">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-card shadow-soft dark:shadow-none dark:bg-zinc-900/40 backdrop-blur-sm border border-border rounded-2xl p-5">
            <h3 className="text-[13px] font-semibold text-foreground mb-4">Inventory by Category</h3>
            <div className="divide-y divide-border dark:divide-zinc-800">
              {Array.from(new Set(parts.map(p => p.category))).sort().map(cat => {
                const catParts = parts.filter(p => p.category === cat);
                const totalStock = catParts.reduce((s, p) => s + p.stock, 0);
                return (
                  <div key={cat} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-medium text-muted-foreground bg-secondary dark:bg-zinc-800 px-2.5 py-[3px] rounded-full">{cat}</span>
                      <span className="text-[11px] text-muted-foreground">{catParts.length} parts</span>
                    </div>
                    <span className="text-[13px] font-semibold text-foreground dark:text-zinc-200 tabular-nums">{totalStock} units</span>
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
          <div className="bg-card shadow-soft dark:shadow-none dark:bg-zinc-900/40 backdrop-blur-sm border border-border rounded-2xl p-5">
            <h3 className="text-[13px] font-semibold text-foreground mb-4">Service Status Overview</h3>
            <div className="flex items-end gap-6 h-36">
              {Object.entries(serviceStatusCounts).map(([status, count]) => (
                <div key={status} className="flex-1 flex flex-col items-center justify-end gap-2">
                  <span className="text-[11px] font-bold text-foreground dark:text-zinc-200">{count}</span>
                  <div className={`w-full rounded-t-xl transition-all ${status === 'Completed' ? 'bg-green-400' : status === 'Ongoing' ? 'bg-blue-400' : 'bg-yellow-400'}`} style={{ height: `${Math.max(16, (count / maxServiceCount) * 100)}%` }} />
                  <span className="text-[10px] font-medium text-muted-foreground">{status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card shadow-soft dark:shadow-none dark:bg-zinc-900/40 backdrop-blur-sm border border-border rounded-2xl p-5">
            <h3 className="text-[13px] font-semibold text-foreground mb-4">Most Requested Services</h3>
            {serviceTypeBreakdown.length === 0 ? <p className="text-[12px] text-muted-foreground text-center py-6">No data for this period</p> : (
              <div className="space-y-3">
                {serviceTypeBreakdown.map(([type, count], i) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-muted-foreground w-5 text-right">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1"><span className="text-[12px] font-medium text-foreground dark:text-zinc-200">{type}</span><span className="text-[11px] text-muted-foreground">{count} jobs</span></div>
                      <div className="h-[3px] bg-secondary dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (count / (serviceTypeBreakdown[0]?.[1] || 1)) * 100)}%`, background: 'var(--brand-gradient)' }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card shadow-soft dark:shadow-none dark:bg-zinc-900/40 backdrop-blur-sm border border-border rounded-2xl p-5">
            <h3 className="text-[13px] font-semibold text-foreground mb-4">Income Summary ({PERIOD_LABEL[period]})</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-4 bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 rounded-xl border border-border">
                <p className="text-[11px] text-muted-foreground">Parts Revenue</p>
                <p className="text-xl font-bold text-foreground mt-1 tracking-tight">₱{partsRevenue.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 rounded-xl border border-border">
                <p className="text-[11px] text-muted-foreground">Labor Revenue (paid)</p>
                <p className="text-xl font-bold text-foreground mt-1 tracking-tight">₱{laborRevenueTx.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 rounded-xl border border-border">
                <p className="text-[11px] text-muted-foreground">Labor Invoiced</p>
                <p className="text-xl font-bold text-foreground mt-1 tracking-tight">₱{laborInvoiced.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
