import { useMemo, useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, Banknote, Smartphone, Receipt, Search, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useData } from '@/shared/contexts/DataContext';
import { usePaginatedFetch } from '@/shared/hooks/usePaginatedFetch';
import { apiGet } from '@/shared/lib/api';
import { inPeriod, type Period } from '@/shared/lib/period';
import type { Part, ServiceRecord, Transaction } from '@/shared/types';

interface CartItem { partId: string; name: string; price: number; quantity: number }

type PaymentFilter = 'All' | 'Cash' | 'GCash';

const PERIOD_LABEL: Record<Period | 'all', string> = { daily: 'Today', weekly: 'This week', monthly: 'This month', yearly: 'This year', all: 'All time' };

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

export default function Sales() {
  const { addTransaction } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'GCash'>('Cash');
  const [selectedService, setSelectedService] = useState('');
  const [serviceLabor, setServiceLabor] = useState(0);
  const [period, setPeriod] = useState<Period | 'all'>('daily');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('All');
  const [modalParts, setModalParts] = useState<Part[]>([]);
  const [modalServices, setModalServices] = useState<ServiceRecord[]>([]);

  const { data: transactions, loading, meta, page, setPage, prependItem } = usePaginatedFetch<Transaction>('/api/transactions');
  const selectedServiceRef = useRef<ServiceRecord | undefined>(undefined);

  useEffect(() => {
    if (!modalOpen) return;
    void apiGet<{ data: Part[] }>('/api/parts?limit=100').then(r => setModalParts(r.data)).catch(() => {});
    void apiGet<{ data: ServiceRecord[] }>('/api/services?limit=100').then(r => setModalServices(r.data)).catch(() => {});
  }, [modalOpen]);

  useEffect(() => {
    selectedServiceRef.current = modalServices.find(s => s.id === selectedService);
  }, [selectedService, modalServices]);

  const filteredTx = useMemo(() => {
    return transactions
      .filter(t => period === 'all' || inPeriod(t.createdAt, period))
      .filter(t => paymentFilter === 'All' || t.paymentMethod === paymentFilter);
  }, [transactions, period, paymentFilter]);

  const totalRevenue = filteredTx.reduce((s, t) => s + t.total, 0);
  const cashTotal = filteredTx.filter(t => t.paymentMethod === 'Cash').reduce((s, t) => s + t.total, 0);
  const gcashTotal = filteredTx.filter(t => t.paymentMethod === 'GCash').reduce((s, t) => s + t.total, 0);

  const pendingServices = modalServices.filter(s => s.status !== 'Completed');

  const addToCart = (part: Part) => {
    const existing = cart.find(c => c.partId === part.id);
    setCart(existing
      ? cart.map(c => c.partId === part.id ? { ...c, quantity: c.quantity + 1 } : c)
      : [...cart, { partId: part.id, name: part.name, price: part.price, quantity: 1 }]);
  };
  const removeFromCart = (partId: string) => setCart(cart.filter(c => c.partId !== partId));
  const updateQty = (partId: string, qty: number) => qty <= 0 ? removeFromCart(partId) : setCart(cart.map(c => c.partId === partId ? { ...c, quantity: qty } : c));

  const partsTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const grandTotal = partsTotal + (selectedService ? serviceLabor : 0);

  const handleCheckout = async () => {
    if (cart.length === 0 && !selectedService) return;
    const newTx = await addTransaction({
      type: selectedService ? 'service+parts' : 'parts-only',
      items: cart.map(c => ({ partId: c.partId, name: c.name, quantity: c.quantity, price: c.price })),
      serviceId: selectedService || undefined,
      serviceLaborCost: selectedService ? serviceLabor : undefined,
      paymentMethod,
      total: grandTotal,
    });
    prependItem(newTx);
    setModalOpen(false); setCart([]); setSelectedService(''); setServiceLabor(0); setPaymentMethod('Cash');
  };

  const filteredParts = modalParts.filter(p => (p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)) && p.stock > 0);

  return (
    <div className="space-y-6">
      <motion.div {...fadeUp(0)} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sales</h2>
          <p className="text-sm text-zinc-500 mt-1">{meta ? meta.total : transactions.length} transactions total</p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm" className="h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-white text-sm font-semibold px-5 transition-opacity">
          <Plus className="w-4 h-4 mr-2" /> New Transaction
        </Button>
      </motion.div>

      <motion.div {...fadeUp(0.1)} className="flex flex-wrap gap-2">
        {(['daily', 'weekly', 'monthly', 'yearly', 'all'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${period === p ? 'bg-white text-black' : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white'}`}>
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </motion.div>

      <motion.div {...fadeUp(0.15)} className="flex flex-wrap gap-2">
        {(['All', 'Cash', 'GCash'] as PaymentFilter[]).map(p => (
          <button key={p} onClick={() => setPaymentFilter(p)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${paymentFilter === p ? 'bg-zinc-700 text-white' : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800'}`}>
            {p}
          </button>
        ))}
      </motion.div>

      <motion.div {...fadeUp(0.2)} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: `${PERIOD_LABEL[period]} Revenue`, value: `₱${totalRevenue.toLocaleString()}`, dark: true },
          { label: 'Transactions', value: filteredTx.length.toString(), color: 'blue' },
          { label: 'Cash', value: `₱${cashTotal.toLocaleString()}`, color: 'green' },
          { label: 'GCash', value: `₱${gcashTotal.toLocaleString()}`, color: 'purple' },
        ].map((s, i) => (
          <div key={s.label} className={`rounded-2xl p-5 ${s.dark ? 'bg-zinc-900/50 border border-zinc-800' : s.color === 'blue' ? 'bg-blue-500/10 border border-blue-500/20' : s.color === 'green' ? 'bg-green-500/10 border border-green-500/20' : 'bg-violet-500/10 border border-violet-500/20'}`}>
            <p className="text-xs font-medium text-zinc-400">{s.label}</p>
            <p className="text-2xl font-bold text-white mt-1 tracking-tight">{s.value}</p>
          </div>
        ))}
      </motion.div>

      <motion.div {...fadeUp(0.25)} className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Transactions ({filteredTx.length})</h3>
          <span className="text-xs text-zinc-500">{PERIOD_LABEL[period]}{paymentFilter !== 'All' && ` · ${paymentFilter}`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-zinc-800">
              <th className="text-left px-5 py-4 text-xs font-semibold text-zinc-500 uppercase">Date</th>
              <th className="text-left px-5 py-4 text-xs font-semibold text-zinc-500 uppercase">Type</th>
              <th className="text-left px-5 py-4 text-xs font-semibold text-zinc-500 uppercase">Items</th>
              <th className="text-left px-5 py-4 text-xs font-semibold text-zinc-500 uppercase">Payment</th>
              <th className="text-right px-5 py-4 text-xs font-semibold text-zinc-500 uppercase">Total</th>
              <th className="text-right px-5 py-4 text-xs font-semibold text-zinc-500 uppercase"></th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-4 bg-zinc-800/60 rounded animate-pulse" /></td></tr>
                ))
              ) : filteredTx.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(tx => (
                <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-5 py-4 text-xs text-zinc-500 tabular-nums whitespace-nowrap">{new Date(tx.createdAt).toLocaleDateString()} <span className="text-zinc-600">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                  <td className="px-5 py-4"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tx.type === 'service+parts' ? 'bg-violet-500/10 text-violet-400' : 'bg-blue-500/10 text-blue-400'}`}>{tx.type}</span></td>
                  <td className="px-5 py-4 text-sm text-zinc-400 max-w-[200px] truncate">{tx.items.map(i => i.name).join(', ') || '—'}</td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-sm text-zinc-400">
                      {tx.paymentMethod === 'GCash' ? <Smartphone className="w-4 h-4 text-violet-400" /> : <Banknote className="w-4 h-4 text-green-400" />}
                      {tx.paymentMethod}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-sm font-semibold text-white tabular-nums">₱{tx.total.toLocaleString()}</td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => setReceiptTx(tx)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"><Receipt className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {!loading && filteredTx.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-zinc-500">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
                    <Receipt className="w-8 h-8 text-zinc-600" />
                  </div>
                  No transactions for this filter
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.lastPage > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">Page {meta.currentPage} of {meta.lastPage} — {meta.total} total</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(page + 1)} disabled={page >= meta.lastPage} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl border-zinc-800 bg-zinc-900 p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2"><DialogTitle className="text-base font-semibold text-white">New Transaction</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-3">
            <div>
              <Label className="text-xs font-medium text-zinc-400">Search Parts (or scan barcode)</Label>
              <div className="relative mt-1.5 mb-3">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input autoFocus value={search} onChange={e => setSearch(e.target.value)} className="pl-11 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600" placeholder="Search…" />
              </div>
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {filteredParts.map(part => (
                  <button key={part.id} onClick={() => addToCart(part)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/50 border border-transparent hover:border-zinc-700 transition-all text-left group">
                    <div><p className="text-sm font-medium text-white">{part.name}</p><p className="text-xs text-zinc-500">{part.category} — {part.stock} in stock</p></div>
                    <div className="flex items-center gap-2"><span className="text-sm font-semibold text-zinc-400">₱{part.price.toLocaleString()}</span><Plus className="w-4 h-4 text-zinc-500 group-hover:text-white" /></div>
                  </button>
                ))}
                {filteredParts.length === 0 && <p className="text-sm text-zinc-500 text-center py-8">No parts available</p>}
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <Label className="text-xs font-medium text-zinc-400">Link Service (optional)</Label>
                <select value={selectedService} onChange={e => {
                  setSelectedService(e.target.value);
                  const s = modalServices.find(sv => sv.id === e.target.value);
                  if (s) setServiceLabor(s.laborCost); else setServiceLabor(0);
                }} className="w-full mt-1.5 h-10 px-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-sm text-white">
                  <option value="">No service</option>
                  {pendingServices.map(s => <option key={s.id} value={s.id}>{s.customerName} — {s.serviceType}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-zinc-800/30 rounded-2xl p-4 border border-zinc-800">
              <h4 className="text-sm font-semibold text-white mb-3">Cart</h4>
              <AnimatePresence>
                {cart.length === 0 && !selectedService ? (
                  <p className="text-sm text-zinc-500 text-center py-10">Add parts or select a service</p>
                ) : (
                  <div className="space-y-2">
                    {cart.map(item => (
                      <motion.div key={item.partId} layout initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="flex items-center justify-between bg-zinc-800/50 rounded-xl p-3 border border-zinc-700">
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{item.name}</p><p className="text-xs text-zinc-500">₱{item.price.toLocaleString()} each</p></div>
                        <div className="flex items-center gap-2 ml-3">
                          <button onClick={() => updateQty(item.partId, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-zinc-700/50 flex items-center justify-center text-zinc-400 text-xs font-bold hover:bg-zinc-700">-</button>
                          <span className="text-sm font-semibold w-5 text-center tabular-nums text-white">{item.quantity}</span>
                          <button onClick={() => updateQty(item.partId, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-zinc-700/50 flex items-center justify-center text-zinc-400 text-xs font-bold hover:bg-zinc-700">+</button>
                          <button onClick={() => removeFromCart(item.partId)} className="p-1 text-zinc-500 hover:text-red-400 ml-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </motion.div>
                    ))}
                    {selectedService && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-violet-500/10 rounded-xl p-3 border border-violet-500/20">
                        <p className="text-sm font-medium text-violet-300">Service Labor</p>
                        <p className="text-xs text-violet-400">{modalServices.find(s => s.id === selectedService)?.serviceType}</p>
                        <p className="text-sm font-semibold text-violet-300 mt-0.5">₱{serviceLabor.toLocaleString()}</p>
                      </motion.div>
                    )}
                  </div>
                )}
              </AnimatePresence>

              <div className="mt-4 pt-4 border-t border-zinc-700">
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setPaymentMethod('Cash')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${paymentMethod === 'Cash' ? 'bg-green-500 text-white' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700'}`}><Banknote className="w-4 h-4" />Cash</button>
                  <button onClick={() => setPaymentMethod('GCash')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${paymentMethod === 'GCash' ? 'bg-violet-500 text-white' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700'}`}><Smartphone className="w-4 h-4" />GCash</button>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-zinc-400">Total</span>
                  <span className="text-2xl font-bold text-white tracking-tight tabular-nums">₱{grandTotal.toLocaleString()}</span>
                </div>
                <Button onClick={handleCheckout} disabled={grandTotal === 0} className="w-full h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-white text-sm font-semibold disabled:opacity-40 transition-opacity">Complete Transaction</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receiptTx} onOpenChange={() => setReceiptTx(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-zinc-800 bg-zinc-900 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-center flex items-center justify-center gap-2 text-white">
              Receipt
              <button onClick={() => window.print()} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500" title="Print"><Printer className="w-4 h-4" /></button>
            </DialogTitle>
          </DialogHeader>
          {receiptTx && (
            <div className="space-y-3 mt-2">
              <div className="text-center border-b border-dashed border-zinc-700 pb-4">
                <p className="text-sm text-zinc-400">MoSPAMS Motorcycle Shop</p>
                <p className="text-xs text-zinc-500 mt-1">{new Date(receiptTx.createdAt).toLocaleString()}</p>
                <p className="text-xs font-mono text-zinc-500 mt-0.5">TXN-{receiptTx.id.slice(-8).toUpperCase()}</p>
              </div>
              {receiptTx.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm"><span className="text-zinc-400">{item.name} x{item.quantity}</span><span className="font-medium text-white tabular-nums">₱{(item.price * item.quantity).toLocaleString()}</span></div>
              ))}
              {receiptTx.serviceLaborCost && <div className="flex justify-between text-sm font-medium text-violet-400"><span>Service Labor</span><span className="tabular-nums">₱{receiptTx.serviceLaborCost.toLocaleString()}</span></div>}
              <div className="border-t border-dashed border-zinc-700 pt-4">
                <div className="flex justify-between text-base font-bold text-white"><span>Total</span><span className="tabular-nums">₱{receiptTx.total.toLocaleString()}</span></div>
                <div className="flex justify-between text-xs text-zinc-400 mt-2"><span>Payment</span><span className="flex items-center gap-1">{receiptTx.paymentMethod === 'GCash' ? <Smartphone className="w-3.5 h-3.5" /> : <Banknote className="w-3.5 h-3.5" />}{receiptTx.paymentMethod}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
