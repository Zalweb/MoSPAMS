import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, Banknote, Smartphone, Receipt, Search, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useData } from '@/shared/contexts/DataContext';
import { inPeriod, type Period } from '@/shared/lib/period';
import type { Transaction } from '@/shared/types';

interface CartItem { partId: string; name: string; price: number; quantity: number }

type PaymentFilter = 'All' | 'Cash' | 'GCash';

const PERIOD_LABEL: Record<Period | 'all', string> = { daily: 'Today', weekly: 'This week', monthly: 'This month', yearly: 'This year', all: 'All time' };

export default function Sales() {
  const { transactions, parts, services, addTransaction } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [receiptTx, setReceiptTx] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'GCash'>('Cash');
  const [selectedService, setSelectedService] = useState('');
  const [serviceLabor, setServiceLabor] = useState(0);

  const [period, setPeriod] = useState<Period | 'all'>('daily');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('All');

  const filteredTx = useMemo(() => {
    return transactions
      .filter(t => period === 'all' || inPeriod(t.createdAt, period))
      .filter(t => paymentFilter === 'All' || t.paymentMethod === paymentFilter);
  }, [transactions, period, paymentFilter]);

  const totalRevenue = filteredTx.reduce((s, t) => s + t.total, 0);
  const cashTotal = filteredTx.filter(t => t.paymentMethod === 'Cash').reduce((s, t) => s + t.total, 0);
  const gcashTotal = filteredTx.filter(t => t.paymentMethod === 'GCash').reduce((s, t) => s + t.total, 0);

  const pendingServices = services.filter(s => s.status !== 'Completed');

  const addToCart = (part: typeof parts[number]) => {
    const existing = cart.find(c => c.partId === part.id);
    setCart(existing
      ? cart.map(c => c.partId === part.id ? { ...c, quantity: c.quantity + 1 } : c)
      : [...cart, { partId: part.id, name: part.name, price: part.price, quantity: 1 }]);
  };
  const removeFromCart = (partId: string) => setCart(cart.filter(c => c.partId !== partId));
  const updateQty = (partId: string, qty: number) => qty <= 0 ? removeFromCart(partId) : setCart(cart.map(c => c.partId === partId ? { ...c, quantity: qty } : c));

  const partsTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const grandTotal = partsTotal + (selectedService ? serviceLabor : 0);

  const handleCheckout = () => {
    if (cart.length === 0 && !selectedService) return;
    addTransaction({
      type: selectedService ? 'service+parts' : 'parts-only',
      items: cart.map(c => ({ partId: c.partId, name: c.name, quantity: c.quantity, price: c.price })),
      serviceId: selectedService || undefined,
      serviceLaborCost: selectedService ? serviceLabor : undefined,
      paymentMethod,
      total: grandTotal,
    });
    setModalOpen(false); setCart([]); setSelectedService(''); setServiceLabor(0); setPaymentMethod('Cash');
  };

  const filteredParts = parts.filter(p => (p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)) && p.stock > 0);
  const selectedTx: Transaction | undefined = transactions.find(t => t.id === receiptTx);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
        <div>
          <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Sales</h2>
          <p className="text-[13px] text-[#D6D3D1] mt-0.5">{transactions.length} transactions total</p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm" className="h-9 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[12px] font-medium px-4">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> New Transaction
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {(['daily', 'weekly', 'monthly', 'yearly', 'all'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-[6px] rounded-full text-[12px] font-medium capitalize transition-all ${period === p ? 'bg-[#1C1917] text-white' : 'bg-white text-[#A8A29E] border border-[#F0EFED] hover:text-[#78716C]'}`}>
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {(['All', 'Cash', 'GCash'] as PaymentFilter[]).map(p => (
          <button key={p} onClick={() => setPaymentFilter(p)} className={`px-3 py-[6px] rounded-full text-[11px] font-medium transition-all ${paymentFilter === p ? 'bg-[#44403C] text-white' : 'bg-white text-[#A8A29E] border border-[#F0EFED]'}`}>
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: `${PERIOD_LABEL[period]} Revenue`, value: `₱${totalRevenue.toLocaleString()}`, accent: 'bg-[#1C1917] text-white' },
          { label: 'Transactions', value: filteredTx.length.toString(), accent: 'bg-[#EFF6FF] text-[#3B82F6]' },
          { label: 'Cash', value: `₱${cashTotal.toLocaleString()}`, accent: 'bg-[#ECFDF5] text-[#10B981]' },
          { label: 'GCash', value: `₱${gcashTotal.toLocaleString()}`, accent: 'bg-[#F5F3FF] text-[#8B5CF6]' },
        ].map((s, i) => (
          <div key={s.label} className={`rounded-2xl p-4 ${i === 0 ? 'bg-[#1C1917] text-white' : s.accent.split(' ')[0]}`}>
            <p className={`text-[11px] font-medium ${i === 0 ? 'text-[#A8A29E]' : 'text-[#A8A29E]'}`}>{s.label}</p>
            <p className={`text-xl font-bold mt-1 tracking-tight ${i === 0 ? 'text-white' : 'text-[#1C1917]'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F5F5F4] flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[#1C1917]">Transactions ({filteredTx.length})</h3>
          <span className="text-[11px] text-[#A8A29E]">{PERIOD_LABEL[period]}{paymentFilter !== 'All' && ` · ${paymentFilter}`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[#F5F5F4]">
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase">Date</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase">Type</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase">Items</th>
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase">Payment</th>
              <th className="text-right px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase">Total</th>
              <th className="text-right px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase"></th>
            </tr></thead>
            <tbody className="divide-y divide-[#FAFAF9]">
              {filteredTx.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(tx => (
                <tr key={tx.id} className="hover:bg-[#FAFAF9]/60 transition-colors">
                  <td className="px-5 py-3.5 text-[11px] text-[#A8A29E] tabular-nums whitespace-nowrap">{new Date(tx.createdAt).toLocaleDateString()} <span className="text-[#D6D3D1]">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                  <td className="px-5 py-3.5"><span className={`text-[10px] font-semibold px-2 py-[3px] rounded-full ${tx.type === 'service+parts' ? 'bg-[#F5F3FF] text-[#7C3AED]' : 'bg-[#EFF6FF] text-[#3B82F6]'}`}>{tx.type}</span></td>
                  <td className="px-5 py-3.5 text-[12px] text-[#78716C] max-w-[200px] truncate">{tx.items.map(i => i.name).join(', ') || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-1 text-[12px] text-[#78716C]">
                      {tx.paymentMethod === 'GCash' ? <Smartphone className="w-3 h-3 text-[#8B5CF6]" /> : <Banknote className="w-3 h-3 text-[#10B981]" />}
                      {tx.paymentMethod}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-[13px] font-semibold text-[#44403C] tabular-nums">₱{tx.total.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => setReceiptTx(tx.id)} className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#D6D3D1] hover:text-[#78716C] transition-colors"><Receipt className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {filteredTx.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-[12px] text-[#D6D3D1]">No transactions for this filter</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[20px] border-[#F0EFED] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-1"><DialogTitle className="text-[15px] font-semibold">New Transaction</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-3">
            <div>
              <Label className="text-[11px] font-medium text-[#78716C]">Search Parts (or scan barcode)</Label>
              <div className="relative mt-1.5 mb-3">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D6D3D1]" />
                <Input autoFocus value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 rounded-xl border-[#E7E5E4] text-[13px]" placeholder="Search…" />
              </div>
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {filteredParts.map(part => (
                  <button key={part.id} onClick={() => addToCart(part)} className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FAFAF9] border border-transparent hover:border-[#F5F5F4] transition-all text-left group">
                    <div><p className="text-[12px] font-medium text-[#44403C]">{part.name}</p><p className="text-[10px] text-[#D6D3D1]">{part.category} — {part.stock} in stock</p></div>
                    <div className="flex items-center gap-2"><span className="text-[12px] font-semibold text-[#78716C]">₱{part.price.toLocaleString()}</span><Plus className="w-3.5 h-3.5 text-[#D6D3D1] group-hover:text-[#78716C]" /></div>
                  </button>
                ))}
                {filteredParts.length === 0 && <p className="text-[12px] text-[#D6D3D1] text-center py-6">No parts available</p>}
              </div>
              <div className="mt-4 pt-4 border-t border-[#F5F5F4]">
                <Label className="text-[11px] font-medium text-[#78716C]">Link Service (optional)</Label>
                <select value={selectedService} onChange={e => { setSelectedService(e.target.value); const s = services.find(sv => sv.id === e.target.value); if (s) setServiceLabor(s.laborCost); else setServiceLabor(0); }} className="w-full mt-1.5 h-9 px-3 rounded-xl border border-[#E7E5E4] text-[13px] bg-white">
                  <option value="">No service</option>
                  {pendingServices.map(s => <option key={s.id} value={s.id}>{s.customerName} — {s.serviceType}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-[#FAFAF9] rounded-2xl p-4">
              <h4 className="text-[13px] font-semibold text-[#1C1917] mb-3">Cart</h4>
              <AnimatePresence>
                {cart.length === 0 && !selectedService ? (
                  <p className="text-[12px] text-[#D6D3D1] text-center py-10">Add parts or select a service</p>
                ) : (
                  <div className="space-y-2">
                    {cart.map(item => (
                      <motion.div key={item.partId} layout initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="flex items-center justify-between bg-white rounded-xl p-2.5 border border-[#F5F5F4]">
                        <div className="flex-1 min-w-0"><p className="text-[12px] font-medium text-[#44403C] truncate">{item.name}</p><p className="text-[10px] text-[#D6D3D1]">₱{item.price.toLocaleString()} each</p></div>
                        <div className="flex items-center gap-1.5 ml-2">
                          <button onClick={() => updateQty(item.partId, item.quantity - 1)} className="w-6 h-6 rounded-md bg-[#FAFAF9] flex items-center justify-center text-[#78716C] text-xs font-bold hover:bg-[#F5F5F4]">-</button>
                          <span className="text-[12px] font-semibold w-4 text-center tabular-nums">{item.quantity}</span>
                          <button onClick={() => updateQty(item.partId, item.quantity + 1)} className="w-6 h-6 rounded-md bg-[#FAFAF9] flex items-center justify-center text-[#78716C] text-xs font-bold hover:bg-[#F5F5F4]">+</button>
                          <button onClick={() => removeFromCart(item.partId)} className="p-1 text-[#D6D3D1] hover:text-[#EF4444] ml-1"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </motion.div>
                    ))}
                    {selectedService && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#F5F3FF] rounded-xl p-3 border border-[#EDE9FE]">
                        <p className="text-[12px] font-medium text-[#5B21B6]">Service Labor</p>
                        <p className="text-[10px] text-[#7C3AED]">{services.find(s => s.id === selectedService)?.serviceType}</p>
                        <p className="text-[13px] font-semibold text-[#5B21B6] mt-0.5">₱{serviceLabor.toLocaleString()}</p>
                      </motion.div>
                    )}
                  </div>
                )}
              </AnimatePresence>

              <div className="mt-4 pt-4 border-t border-[#E7E5E4]">
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setPaymentMethod('Cash')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-medium transition-all ${paymentMethod === 'Cash' ? 'bg-[#059669] text-white' : 'bg-white text-[#78716C] border border-[#E7E5E4]'}`}><Banknote className="w-3.5 h-3.5" />Cash</button>
                  <button onClick={() => setPaymentMethod('GCash')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-medium transition-all ${paymentMethod === 'GCash' ? 'bg-[#2563EB] text-white' : 'bg-white text-[#78716C] border border-[#E7E5E4]'}`}><Smartphone className="w-3.5 h-3.5" />GCash</button>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[13px] text-[#A8A29E]">Total</span>
                  <span className="text-2xl font-bold text-[#1C1917] tracking-tight tabular-nums">₱{grandTotal.toLocaleString()}</span>
                </div>
                <Button onClick={handleCheckout} disabled={grandTotal === 0} className="w-full h-10 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[13px] font-medium disabled:opacity-40">Complete Transaction</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receiptTx} onOpenChange={() => setReceiptTx(null)}>
        <DialogContent className="sm:max-w-sm rounded-[20px] border-[#F0EFED] p-6">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold text-center flex items-center justify-center gap-2">
              Receipt
              <button onClick={() => window.print()} className="p-1 rounded hover:bg-[#F5F5F4] text-[#A8A29E]" title="Print"><Printer className="w-3.5 h-3.5" /></button>
            </DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-3 mt-1">
              <div className="text-center border-b border-dashed border-[#E7E5E4] pb-3">
                <p className="text-[12px] text-[#A8A29E]">MoSPAMS Motorcycle Shop</p>
                <p className="text-[10px] text-[#D6D3D1] mt-1">{new Date(selectedTx.createdAt).toLocaleString()}</p>
                <p className="text-[10px] font-mono text-[#D6D3D1] mt-0.5">TXN-{selectedTx.id.slice(-8).toUpperCase()}</p>
              </div>
              {selectedTx.items.map((item, i) => (
                <div key={i} className="flex justify-between text-[12px]"><span className="text-[#78716C]">{item.name} x{item.quantity}</span><span className="font-medium text-[#44403C] tabular-nums">₱{(item.price * item.quantity).toLocaleString()}</span></div>
              ))}
              {selectedTx.serviceLaborCost && <div className="flex justify-between text-[12px] font-medium text-[#7C3AED]"><span>Service Labor</span><span className="tabular-nums">₱{selectedTx.serviceLaborCost.toLocaleString()}</span></div>}
              <div className="border-t border-dashed border-[#E7E5E4] pt-3">
                <div className="flex justify-between text-[14px] font-bold text-[#1C1917]"><span>Total</span><span className="tabular-nums">₱{selectedTx.total.toLocaleString()}</span></div>
                <div className="flex justify-between text-[11px] text-[#A8A29E] mt-1"><span>Payment</span><span className="flex items-center gap-1">{selectedTx.paymentMethod === 'GCash' ? <Smartphone className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}{selectedTx.paymentMethod}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
