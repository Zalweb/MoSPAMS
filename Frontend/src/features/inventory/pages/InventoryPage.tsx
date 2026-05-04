import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, AlertTriangle, Package, ArrowDownToLine, ArrowUpFromLine, History, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useData } from '@/shared/contexts/DataContext';
import { usePaginatedFetch } from '@/shared/hooks/usePaginatedFetch';
import { apiGet } from '@/shared/lib/api';
import { useAuth } from '@/features/auth/context/AuthContext';
import { can } from '@/shared/lib/permissions';
import type { Part, StockMovement } from '@/shared/types';

const partSchema = z.object({
  name: z.string().min(2, 'Name is too short'),
  category: z.string().min(1, 'Required'),
  stock: z.number().int().min(0),
  minStock: z.number().int().min(0),
  price: z.number().min(0),
  barcode: z.string().min(1, 'Barcode required'),
});
type PartForm = z.infer<typeof partSchema>;

const categorySchema = z.object({
  name: z.string().min(2, 'Category name is too short'),
  description: z.string().optional(),
});
type CategoryForm = z.infer<typeof categorySchema>;

const movementSchema = z.object({
  type: z.enum(['in', 'out', 'adjust']),
  qty: z.number().int().min(0),
  reason: z.string().min(1, 'Reason required'),
});
type MovementForm = z.infer<typeof movementSchema>;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

export default function Inventory() {
  const { addPart, updatePart, deletePart, recordStockMovement, categories, addCategory } = useData();
  const { user } = useAuth();
  const role = user?.role;
  const canCreate = can(role, 'inventory', 'create');
  const canDelete = can(role, 'inventory', 'delete');
  const canMove = can(role, 'stock-movements', 'create');

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [stockMoveTarget, setStockMoveTarget] = useState<Part | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Part | null>(null);
  const [partHistory, setPartHistory] = useState<StockMovement[]>([]);

  const { data: parts, loading, meta, page, setPage, prependItem, updateItem, removeItem } = usePaginatedFetch<Part>('/api/parts');

  useEffect(() => {
    if (!historyTarget) { setPartHistory([]); return; }
    void apiGet<{ data: StockMovement[] }>('/api/stock-movements').then(r => {
      setPartHistory(r.data.filter(m => m.partId === historyTarget.id));
    }).catch(() => setPartHistory([]));
  }, [historyTarget]);

  const categoryNames = useMemo(() => categories.map(c => c.name), [categories]);
  const defaultCategory = categoryNames.length > 0 ? categoryNames[0] : 'Other';

  const form = useForm<PartForm>({
    resolver: zodResolver(partSchema),
    defaultValues: { name: '', category: defaultCategory, stock: 0, minStock: 5, price: 0, barcode: '' },
  });
  const categoryForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '' },
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

  const openAdd = () => { setEditing(null); form.reset({ name: '', category: defaultCategory, stock: 0, minStock: 5, price: 0, barcode: '' }); setModalOpen(true); };
  const openEdit = (part: Part) => { setEditing(part); form.reset({ name: part.name, category: part.category, stock: part.stock, minStock: part.minStock, price: part.price, barcode: part.barcode }); setModalOpen(true); };

  const onSubmit = form.handleSubmit(async (values) => {
    if (editing) {
      const updated = await updatePart(editing.id, values);
      updateItem(editing.id, 'id', updated);
    } else {
      const created = await addPart(values);
      prependItem(created);
    }
    setModalOpen(false);
  });

  const onSubmitCategory = categoryForm.handleSubmit(async (values) => {
    await addCategory(values.name, values.description || '');
    categoryForm.reset();
    setCategoryModalOpen(false);
  });

  const openMovement = (part: Part) => { setStockMoveTarget(part); moveForm.reset({ type: 'in', qty: 0, reason: '' }); };
  const onSubmitMovement = moveForm.handleSubmit(async (values) => {
    if (!stockMoveTarget) return;
    await recordStockMovement(stockMoveTarget.id, values.type, values.qty, values.reason);
    // Optimistically update the stock count on the current item
    const delta = values.type === 'in' ? values.qty : values.type === 'out' ? -values.qty : null;
    const newStock = delta !== null
      ? Math.max(0, stockMoveTarget.stock + delta)
      : values.qty;
    updateItem(stockMoveTarget.id, 'id', { ...stockMoveTarget, stock: newStock });
    setStockMoveTarget(null);
  });

  const lowCount = parts.filter(p => p.stock <= p.minStock).length;

  return (
    <div className="space-y-6">
      <motion.div {...fadeUp(0)} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Inventory</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {meta ? `${meta.total} parts` : `${parts.length} parts`} in stock
            {lowCount > 0 && <span className="text-amber-400"> — {lowCount} low</span>}
          </p>
        </div>
        {canCreate && (
          <Button onClick={openAdd} size="sm" className="h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-white text-sm font-semibold px-5 transition-opacity">
            <Plus className="w-4 h-4 mr-2" /> Add Part
          </Button>
        )}
      </motion.div>

      <motion.div {...fadeUp(0.1)} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            autoFocus
            placeholder="Search parts or scan barcode…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-2 focus:ring-white/10"
          />
        </div>
        <div className="flex gap-2">
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="h-11 px-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-400 focus:outline-none focus:border-zinc-700">
            <option value="All">All Categories</option>
            {categoryNames.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {canCreate && (
            <Button onClick={() => setCategoryModalOpen(true)} size="sm" variant="outline" className="h-11 rounded-xl border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white">
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.2)} className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-5 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Part</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Category</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Stock</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Price</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Barcode</th>
                <th className="text-right px-5 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-5 py-4">
                      <div className="h-4 bg-zinc-800/60 rounded animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.map(part => {
                const isLow = part.stock <= part.minStock;
                return (
                  <tr key={part.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center shrink-0 group-hover:bg-zinc-800 transition-colors">
                          <Package className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{part.name}</p>
                          {isLow && <p className="text-xs text-amber-400 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Low stock</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className="text-xs font-medium text-zinc-400 bg-zinc-800/50 px-3 py-1.5 rounded-full">{part.category}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold tabular-nums ${isLow ? 'text-amber-400' : 'text-white'}`}>{part.stock}</span>
                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isLow ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, (part.stock / Math.max(part.minStock * 2, 1)) * 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-white tabular-nums">₱{part.price.toLocaleString()}</td>
                    <td className="px-5 py-4 text-xs font-mono text-zinc-500">{part.barcode}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {canMove && (
                          <button title="Stock movement" onClick={() => openMovement(part)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-green-400 transition-colors">
                            <ArrowDownToLine className="w-4 h-4" />
                          </button>
                        )}
                        <button title="History" onClick={() => setHistoryTarget(part)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
                          <History className="w-4 h-4" />
                        </button>
                        <button title="Edit" onClick={() => openEdit(part)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button title="Delete" onClick={() => setConfirmDelete(part.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-zinc-500">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 flex items-center justify-center">
                    <Package className="w-8 h-8 text-zinc-600" />
                  </div>
                  No parts found
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {meta && meta.lastPage > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">Page {meta.currentPage} of {meta.lastPage} — {meta.total} total</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= meta.lastPage}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-zinc-800 bg-zinc-900 p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-white">{editing ? 'Edit Part' : 'Add New Part'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium text-zinc-400">Part Name</Label>
              <Input {...form.register('name')} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600" placeholder="e.g. Brake Pad Set" />
              {form.formState.errors.name && <p className="text-xs text-red-400 mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-zinc-400">Category</Label>
                <select {...form.register('category')} className="w-full mt-1.5 h-10 px-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-sm text-white focus:outline-none focus:border-zinc-600">
                  {categoryNames.length > 0 ? (
                    categoryNames.map(c => <option key={c} value={c}>{c}</option>)
                  ) : (
                    <option value="Other">Other</option>
                  )}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium text-zinc-400">Barcode</Label>
                <Input {...form.register('barcode')} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white font-mono placeholder:text-zinc-500 focus:border-zinc-600" placeholder="BRK-001" />
                {form.formState.errors.barcode && <p className="text-xs text-red-400 mt-1">{form.formState.errors.barcode.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs font-medium text-zinc-400">Stock</Label><Input type="number" {...form.register('stock', { valueAsNumber: true })} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white focus:border-zinc-600" /></div>
              <div><Label className="text-xs font-medium text-zinc-400">Min Stock</Label><Input type="number" {...form.register('minStock', { valueAsNumber: true })} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white focus:border-zinc-600" /></div>
              <div><Label className="text-xs font-medium text-zinc-400">Price (₱)</Label><Input type="number" {...form.register('price', { valueAsNumber: true })} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white focus:border-zinc-600" /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-white text-sm font-semibold transition-opacity">{editing ? 'Save Changes' : 'Add Part'}</Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-10 rounded-xl text-sm border-zinc-700 text-zinc-400 hover:bg-zinc-800">Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-zinc-800 bg-zinc-900 p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-white">Add New Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmitCategory} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium text-zinc-400">Category Name</Label>
              <Input {...categoryForm.register('name')} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600" placeholder="e.g. Brake Parts" />
              {categoryForm.formState.errors.name && <p className="text-xs text-red-400 mt-1">{categoryForm.formState.errors.name.message}</p>}
            </div>
            <div>
              <Label className="text-xs font-medium text-zinc-400">Description (Optional)</Label>
              <Input {...categoryForm.register('description')} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600" placeholder="Brief description" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-white text-sm font-semibold transition-opacity">Add Category</Button>
              <Button type="button" variant="outline" onClick={() => setCategoryModalOpen(false)} className="h-10 rounded-xl text-sm border-zinc-700 text-zinc-400 hover:bg-zinc-800">Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stockMoveTarget} onOpenChange={(o) => !o && setStockMoveTarget(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-zinc-800 bg-zinc-900 p-6">
          <DialogHeader><DialogTitle className="text-base font-semibold text-white">Stock Movement</DialogTitle></DialogHeader>
          {stockMoveTarget && (
            <form onSubmit={onSubmitMovement} className="mt-2 space-y-3">
              <p className="text-sm text-zinc-400">{stockMoveTarget.name} — current: <span className="font-semibold text-white">{stockMoveTarget.stock}</span></p>
              <div className="grid grid-cols-3 gap-2">
                {(['in', 'out', 'adjust'] as const).map(t => (
                  <label key={t} className={`flex items-center justify-center gap-1 h-10 rounded-xl border text-sm font-medium capitalize cursor-pointer transition-all ${moveForm.watch('type') === t ? 'bg-white border-white text-black' : 'bg-zinc-800/50 border-zinc-700 text-zinc-400'}`}>
                    <input type="radio" value={t} {...moveForm.register('type')} className="hidden" />
                    {t === 'in' ? <ArrowDownToLine className="w-3.5 h-3.5" /> : t === 'out' ? <ArrowUpFromLine className="w-3.5 h-3.5" /> : null}
                    {t === 'adjust' ? 'Set' : t}
                  </label>
                ))}
              </div>
              <div>
                <Label className="text-xs font-medium text-zinc-400">{moveForm.watch('type') === 'adjust' ? 'New Stock Level' : 'Quantity'}</Label>
                <Input type="number" {...moveForm.register('qty', { valueAsNumber: true })} className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white focus:border-zinc-600" />
              </div>
              <div>
                <Label className="text-xs font-medium text-zinc-400">Reason</Label>
                <Input {...moveForm.register('reason')} placeholder="Restock from supplier" className="mt-1.5 h-10 rounded-xl bg-zinc-800/50 border-zinc-700 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-600" />
                {moveForm.formState.errors.reason && <p className="text-xs text-red-400 mt-1">{moveForm.formState.errors.reason.message}</p>}
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="submit" className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-white text-sm font-semibold transition-opacity">Record</Button>
                <Button type="button" variant="outline" onClick={() => setStockMoveTarget(null)} className="h-10 rounded-xl text-sm border-zinc-700 text-zinc-400">Cancel</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {historyTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setHistoryTarget(null)} />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-zinc-900 border-l border-zinc-800 z-50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 h-16 border-b border-zinc-800">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Stock History</p>
                <p className="text-sm font-semibold text-white">{historyTarget.name}</p>
              </div>
              <button onClick={() => setHistoryTarget(null)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {partHistory.length === 0 && <p className="text-sm text-zinc-500 text-center py-12">No movements recorded yet.</p>}
              <ul className="space-y-2">
                {partHistory.map(m => (
                  <li key={m.id} className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${m.type === 'in' ? 'bg-green-500/10 text-green-400' : m.type === 'out' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {m.type} · {m.qty}
                      </span>
                      <span className="text-xs text-zinc-500 tabular-nums">{new Date(m.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-white mt-2">{m.reason}</p>
                    <p className="text-xs text-zinc-500 mt-1">by {m.userName}</p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </>
      )}

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-zinc-800 bg-zinc-900 p-6">
          <DialogHeader><DialogTitle className="text-base font-semibold text-white">Delete Part?</DialogTitle></DialogHeader>
          <p className="text-sm text-zinc-400 mt-1">This action cannot be undone.</p>
          <div className="flex gap-3 pt-3">
            <Button onClick={async () => { if (confirmDelete) { await deletePart(confirmDelete); removeItem(confirmDelete, 'id'); setConfirmDelete(null); } }} variant="destructive" className="flex-1 h-10 rounded-xl text-sm font-semibold">Delete</Button>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="h-10 rounded-xl text-sm border-zinc-700 text-zinc-400">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
