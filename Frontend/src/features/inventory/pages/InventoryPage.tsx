import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Search, AlertTriangle, Package, ArrowDownToLine, ArrowUpFromLine, History, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useData } from '@/shared/contexts/DataContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { can } from '@/shared/lib/permissions';
import type { Part } from '@/shared/types';

const CATEGORIES = ['Braking', 'Fluids', 'Drivetrain', 'Filtration', 'Ignition', 'Controls', 'Wheels', 'Electrical', 'Engine', 'Body', 'Other'];

const partSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  category: z.string().min(1, 'Required'),
  stock: z.number().int().min(0),
  minStock: z.number().int().min(0),
  price: z.number().min(0),
  barcode: z.string().min(1, 'Barcode required'),
});
type PartForm = z.infer<typeof partSchema>;

const movementSchema = z.object({
  type: z.enum(['in', 'out', 'adjust']),
  qty: z.number().int().min(0),
  reason: z.string().min(1, 'Reason required'),
});
type MovementForm = z.infer<typeof movementSchema>;

export default function Inventory() {
  const { parts, addPart, updatePart, deletePart, recordStockMovement, stockMovements } = useData();
  const { user } = useAuth();
  const role = user?.role;
  const canCreate = can(role, 'inventory', 'create');
  const canDelete = can(role, 'inventory', 'delete');
  const canMove = can(role, 'stock-movements', 'create');

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [stockMoveTarget, setStockMoveTarget] = useState<Part | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Part | null>(null);

  const form = useForm<PartForm>({
    resolver: zodResolver(partSchema),
    defaultValues: { name: '', category: 'Other', stock: 0, minStock: 5, price: 0, barcode: '' },
  });
  const moveForm = useForm<MovementForm>({
    resolver: zodResolver(movementSchema),
    defaultValues: { type: 'in', qty: 0, reason: '' },
  });

  const filtered = parts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search);
    const matchesCat = catFilter === 'All' || p.category === catFilter;
    return matchesSearch && matchesCat;
  });

  const openAdd = () => { setEditing(null); form.reset({ name: '', category: 'Other', stock: 0, minStock: 5, price: 0, barcode: '' }); setModalOpen(true); };
  const openEdit = (part: Part) => { setEditing(part); form.reset({ name: part.name, category: part.category, stock: part.stock, minStock: part.minStock, price: part.price, barcode: part.barcode }); setModalOpen(true); };
  const onSubmit = form.handleSubmit((values) => {
    if (editing) updatePart(editing.id, values); else addPart(values);
    setModalOpen(false);
  });

  const openMovement = (part: Part) => { setStockMoveTarget(part); moveForm.reset({ type: 'in', qty: 0, reason: '' }); };
  const onSubmitMovement = moveForm.handleSubmit((values) => {
    if (!stockMoveTarget) return;
    recordStockMovement(stockMoveTarget.id, values.type, values.qty, values.reason);
    setStockMoveTarget(null);
  });

  const partHistory = useMemo(
    () => historyTarget ? stockMovements.filter(m => m.partId === historyTarget.id) : [],
    [stockMovements, historyTarget],
  );

  const lowCount = parts.filter(p => p.stock <= p.minStock).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
        <div>
          <h2 className="text-[22px] font-bold text-[#1C1917] tracking-tight">Inventory</h2>
          <p className="text-[13px] text-[#D6D3D1] mt-0.5">{parts.length} parts in stock {lowCount > 0 && <span className="text-[#F59E0B]">— {lowCount} low</span>}</p>
        </div>
        {canCreate && (
          <Button onClick={openAdd} size="sm" className="h-9 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[12px] font-medium px-4 shadow-sm">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Part
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D6D3D1]" />
          <Input
            autoFocus
            placeholder="Search parts or scan barcode…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-xl border-[#E7E5E4] bg-white text-[13px] focus:border-[#C4C0BC] focus:ring-0"
          />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="h-9 px-3.5 rounded-xl border border-[#E7E5E4] text-[13px] bg-white text-[#78716C] focus:outline-none focus:border-[#C4C0BC]">
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-[#F5F5F4] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F5F5F4]">
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase tracking-wider">Part</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase tracking-wider">Category</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase tracking-wider">Stock</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase tracking-wider">Price</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase tracking-wider">Barcode</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold text-[#D6D3D1] uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAFAF9]">
              {filtered.map(part => {
                const isLow = part.stock <= part.minStock;
                return (
                  <tr key={part.id} className="hover:bg-[#FAFAF9]/60 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[10px] bg-[#F5F5F4] flex items-center justify-center shrink-0 group-hover:bg-[#EFEDEA] transition-colors">
                          <Package className="w-3.5 h-3.5 text-[#A8A29E]" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-[#44403C]">{part.name}</p>
                          {isLow && <p className="text-[10px] text-[#F59E0B] font-medium flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" />Low stock</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><span className="text-[11px] font-medium text-[#A8A29E] bg-[#F5F5F4] px-2.5 py-[3px] rounded-full">{part.category}</span></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className={`text-[13px] font-semibold tabular-nums ${isLow ? 'text-[#F59E0B]' : 'text-[#44403C]'}`}>{part.stock}</span>
                        <div className="w-12 h-[3px] bg-[#F5F5F4] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isLow ? 'bg-[#FBBF24]' : 'bg-[#34D399]'}`} style={{ width: `${Math.min(100, (part.stock / Math.max(part.minStock * 2, 1)) * 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-[#44403C] tabular-nums">₱{part.price.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-[11px] font-mono text-[#A8A29E]">{part.barcode}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {canMove && (
                          <button title="Stock movement" onClick={() => openMovement(part)} className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#D6D3D1] hover:text-[#10B981] transition-colors">
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button title="History" onClick={() => setHistoryTarget(part)} className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#D6D3D1] hover:text-[#78716C] transition-colors">
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button title="Edit" onClick={() => openEdit(part)} className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#D6D3D1] hover:text-[#78716C] transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {canDelete && (
                          <button title="Delete" onClick={() => setConfirmDelete(part.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-[#D6D3D1] hover:text-[#EF4444] transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-14 text-center text-[13px] text-[#D6D3D1]">No parts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[20px] border-[#F0EFED] p-6">
          <DialogHeader className="pb-1"><DialogTitle className="text-[15px] font-semibold">{editing ? 'Edit Part' : 'Add New Part'}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-3">
            <div>
              <Label className="text-[11px] font-medium text-[#78716C]">Part Name</Label>
              <Input {...form.register('name')} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px] focus:border-[#C4C0BC] focus:ring-0" placeholder="e.g. Brake Pad Set" />
              {form.formState.errors.name && <p className="text-[10px] text-[#EF4444] mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-medium text-[#78716C]">Category</Label>
                <select {...form.register('category')} className="w-full mt-1.5 h-9 px-3 rounded-xl border border-[#E7E5E4] text-[13px] bg-white focus:outline-none focus:border-[#C4C0BC]">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-[#78716C]">Barcode</Label>
                <Input {...form.register('barcode')} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px] font-mono focus:border-[#C4C0BC] focus:ring-0" placeholder="BRK-001" />
                {form.formState.errors.barcode && <p className="text-[10px] text-[#EF4444] mt-1">{form.formState.errors.barcode.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-[11px] font-medium text-[#78716C]">Stock</Label><Input type="number" {...form.register('stock', { valueAsNumber: true })} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px] focus:border-[#C4C0BC] focus:ring-0" /></div>
              <div><Label className="text-[11px] font-medium text-[#78716C]">Min Stock</Label><Input type="number" {...form.register('minStock', { valueAsNumber: true })} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px] focus:border-[#C4C0BC] focus:ring-0" /></div>
              <div><Label className="text-[11px] font-medium text-[#78716C]">Price (₱)</Label><Input type="number" {...form.register('price', { valueAsNumber: true })} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px] focus:border-[#C4C0BC] focus:ring-0" /></div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1 h-9 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[12px] font-medium">{editing ? 'Save Changes' : 'Add Part'}</Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-9 rounded-xl text-[12px] border-[#E7E5E4] text-[#78716C] hover:bg-[#F5F5F4]">Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stockMoveTarget} onOpenChange={(o) => !o && setStockMoveTarget(null)}>
        <DialogContent className="sm:max-w-sm rounded-[20px] border-[#F0EFED] p-6">
          <DialogHeader><DialogTitle className="text-[15px] font-semibold">Stock Movement</DialogTitle></DialogHeader>
          {stockMoveTarget && (
            <form onSubmit={onSubmitMovement} className="mt-2 space-y-3">
              <p className="text-[12px] text-[#A8A29E]">{stockMoveTarget.name} — current: <span className="font-semibold text-[#44403C]">{stockMoveTarget.stock}</span></p>
              <div className="grid grid-cols-3 gap-2">
                {(['in', 'out', 'adjust'] as const).map(t => (
                  <label key={t} className={`flex items-center justify-center gap-1 h-9 rounded-xl border text-[12px] font-medium capitalize cursor-pointer transition-all ${moveForm.watch('type') === t ? 'bg-[#1C1917] border-[#1C1917] text-white' : 'bg-white border-[#E7E5E4] text-[#78716C]'}`}>
                    <input type="radio" value={t} {...moveForm.register('type')} className="hidden" />
                    {t === 'in' ? <ArrowDownToLine className="w-3 h-3" /> : t === 'out' ? <ArrowUpFromLine className="w-3 h-3" /> : null}
                    {t === 'adjust' ? 'Set' : t}
                  </label>
                ))}
              </div>
              <div>
                <Label className="text-[11px] font-medium text-[#78716C]">{moveForm.watch('type') === 'adjust' ? 'New Stock Level' : 'Quantity'}</Label>
                <Input type="number" {...moveForm.register('qty', { valueAsNumber: true })} className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px]" />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-[#78716C]">Reason</Label>
                <Input {...moveForm.register('reason')} placeholder="Restock from supplier" className="mt-1.5 h-9 rounded-xl border-[#E7E5E4] text-[13px]" />
                {moveForm.formState.errors.reason && <p className="text-[10px] text-[#EF4444] mt-1">{moveForm.formState.errors.reason.message}</p>}
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="flex-1 h-9 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-[12px]">Record</Button>
                <Button type="button" variant="outline" onClick={() => setStockMoveTarget(null)} className="h-9 rounded-xl text-[12px] border-[#E7E5E4] text-[#78716C]">Cancel</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {historyTarget && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setHistoryTarget(null)} />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 h-[56px] border-b border-[#F0EFED]">
              <div>
                <p className="text-[10px] font-medium text-[#A8A29E] uppercase tracking-wide">Stock History</p>
                <p className="text-[13px] font-semibold text-[#1C1917]">{historyTarget.name}</p>
              </div>
              <button onClick={() => setHistoryTarget(null)} className="p-1.5 rounded-lg hover:bg-[#F5F5F4] text-[#A8A29E]"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {partHistory.length === 0 && <p className="text-[12px] text-[#D6D3D1] text-center py-12">No movements recorded yet.</p>}
              <ul className="space-y-2">
                {partHistory.map(m => (
                  <li key={m.id} className="bg-[#FAFAF9] rounded-xl p-3 border border-[#F5F5F4]">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase px-2 py-[3px] rounded-full ${m.type === 'in' ? 'bg-[#ECFDF5] text-[#059669]' : m.type === 'out' ? 'bg-red-50 text-[#EF4444]' : 'bg-[#EFF6FF] text-[#3B82F6]'}`}>
                        {m.type} · {m.qty}
                      </span>
                      <span className="text-[10px] text-[#A8A29E] tabular-nums">{new Date(m.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-[12px] text-[#44403C] mt-1.5">{m.reason}</p>
                    <p className="text-[10px] text-[#D6D3D1] mt-0.5">by {m.userName}</p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </>
      )}

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm rounded-[20px] border-[#F0EFED] p-6">
          <DialogHeader><DialogTitle className="text-[15px] font-semibold">Delete Part?</DialogTitle></DialogHeader>
          <p className="text-[13px] text-[#A8A29E] mt-1">This action cannot be undone.</p>
          <div className="flex gap-2 pt-3">
            <Button onClick={() => { if (confirmDelete) { deletePart(confirmDelete); setConfirmDelete(null); } }} variant="destructive" className="flex-1 h-9 rounded-xl text-[12px]">Delete</Button>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="h-9 rounded-xl text-[12px] border-[#E7E5E4]">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
