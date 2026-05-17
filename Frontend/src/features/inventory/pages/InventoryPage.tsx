import { useMemo, useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, AlertTriangle, Package, ArrowDownToLine, ArrowUpFromLine, History, X, ChevronLeft, ChevronRight, ImagePlus, Loader2, Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useData } from '@/shared/contexts/DataContext';
import { usePaginatedFetch } from '@/shared/hooks/usePaginatedFetch';
import { apiGet, apiMutation } from '@/shared/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/context/AuthContext';
import { can } from '@/shared/lib/permissions';
import { PartFormWithScanning } from '@/features/inventory/components/PartFormWithScanning';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import type { Part, StockMovement } from '@/shared/types';

const partSchema = z.object({
  brand: z.string().min(0),
  name: z.string().min(2, 'Name is too short'),
  partCode: z.string().min(0),
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
  const { addPart, updatePart, uploadPartImage, deletePart, recordStockMovement, categories, addCategory } = useData();
  const { user } = useAuth();
  const role = user?.role;
  const canCreate = can(role, 'inventory', 'create');
  const canDelete = can(role, 'inventory', 'delete');
  const canMove = can(role, 'stock-movements', 'create');
  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [stockMoveTarget, setStockMoveTarget] = useState<Part | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Part | null>(null);
  const [partHistory, setPartHistory] = useState<StockMovement[]>([]);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

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
    defaultValues: { brand: '', name: '', partCode: '', category: defaultCategory, stock: 0, minStock: 5, price: 0, barcode: '' },
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

  const openAdd = () => { setShowAddForm(true); };
  const openAddFormManually = (ocrData?: { brand: string; partCode: string; description: string; rawText: string; barcode?: string }) => {
    setEditing(null);
    setPendingImage(null);
    setImagePreview(null);
    form.reset({ brand: ocrData?.brand || '', name: ocrData?.description || '', partCode: ocrData?.partCode || '', category: defaultCategory, stock: 0, minStock: 5, price: 0, barcode: ocrData?.barcode || '' });
    setModalOpen(true);
    setShowAddForm(false);
  };
  const openEdit = (part: Part) => {
    setEditing(part);
    setPendingImage(null);
    setImagePreview(part.imageUrl ?? null);
    form.reset({ brand: part.brand || '', name: part.name, partCode: part.partCode || '', category: part.category, stock: part.stock, minStock: part.minStock, price: part.price, barcode: part.barcode });
    setModalOpen(true);
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    const form = new FormData();
    form.append('csv', file);
    try {
      const data = await apiMutation<{ message: string }>('/api/parts/import-csv', 'POST', form);
      toast.success(data.message ?? 'Import complete');
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };
  const handlePartAdded = () => { setShowAddForm(false); setPage(1); };

  const compressImage = (file: File): Promise<File> =>
    new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const MAX = 1920;
        let { width, height } = img;
        if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(new File([blob!], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
          'image/jpeg', 0.85
        );
      };
      img.src = objectUrl;
    });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    const toUpload = file.size > 500 * 1024 ? await compressImage(file) : file;
    setPendingImage(toUpload);
  };

  const clearImage = () => {
    setPendingImage(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const onSubmit = form.handleSubmit(async (values) => {
    let savedPart: Part;
    if (editing) {
      savedPart = await updatePart(editing.id, values);
      updateItem(editing.id, 'id', savedPart);
    } else {
      savedPart = await addPart(values);
      prependItem(savedPart);
    }

    if (pendingImage) {
      setImageUploading(true);
      try {
        const withImage = await uploadPartImage(savedPart.id, pendingImage);
        updateItem(savedPart.id, 'id', withImage);
      } finally {
        setImageUploading(false);
        setPendingImage(null);
        setImagePreview(null);
      }
    }

    setModalOpen(false);
  });

  const onSubmitCategory = categoryForm.handleSubmit(async (values) => {
    await addCategory(values);
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
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Inventory</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {meta ? `${meta.total} parts` : `${parts.length} parts`} in stock
            {lowCount > 0 && <span className="text-amber-400"> — {lowCount} low</span>}
          </p>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={handleCsvImport}
            />
            <button
              onClick={() => csvInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 h-10 px-4 rounded-xl border border-border/50 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importing…' : 'Import CSV'}
            </button>
            <Button onClick={openAdd} size="sm" className="h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-foreground text-sm font-semibold px-5 transition-opacity">
              <Plus className="w-4 h-4 mr-2" /> Add Part
            </Button>
          </div>
        )}
      </motion.div>

      <motion.div {...fadeUp(0.1)} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search parts or scan barcode…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border dark:border-zinc-700 focus:ring-2 focus:ring-white/10"
          />
        </div>
        <div className="flex gap-2">
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="h-11 px-4 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground focus:outline-none focus:border-border dark:border-zinc-700">
            <option value="All">All Categories</option>
            {categoryNames.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {canCreate && (
            <Button onClick={() => setCategoryModalOpen(true)} size="sm" variant="outline" className="h-11 rounded-xl border-border text-muted-foreground hover:bg-secondary dark:bg-zinc-800 hover:text-foreground">
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.2)} className="brand-card backdrop-blur-sm border rounded-2xl overflow-hidden" style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}>
        {loading && isMobile ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-muted/50 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-muted/50 animate-pulse rounded w-32" />
                  <div className="h-3 bg-muted/50 animate-pulse rounded w-20" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="h-4 bg-muted/50 animate-pulse rounded w-10" />
                  <div className="h-5 bg-muted/50 animate-pulse rounded-full w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Part</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stock</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Barcode</th>
                <th className="text-right px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-zinc-800/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted/50 animate-pulse shrink-0" />
                        <div className="space-y-1.5">
                          <div className="h-4 bg-muted/50 animate-pulse rounded w-28" />
                          <div className="h-3 bg-muted/50 animate-pulse rounded w-16" />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><div className="h-5 bg-muted/50 animate-pulse rounded-full w-16" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-muted/50 animate-pulse rounded w-10" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-muted/50 animate-pulse rounded w-14" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-muted/50 animate-pulse rounded w-20" /></td>
                    <td className="px-5 py-4"></td>
                  </tr>
                ))
              ) : filtered.map(part => {
                const isLow = part.stock <= part.minStock;
                return (
                  <tr key={part.id} className="hover:bg-foreground/5 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted shrink-0 overflow-hidden flex items-center justify-center transition-colors">
                          {part.imageUrl ? (
                            <img src={part.imageUrl} alt={part.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{part.name}</p>
                          {isLow && <p className="text-xs text-amber-400 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Low stock</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className="whitespace-nowrap text-xs font-medium text-foreground/80 bg-foreground/10 px-3 py-1.5 rounded-full">{part.category}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold tabular-nums ${isLow ? 'text-amber-400' : 'text-foreground'}`}>{part.stock}</span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isLow ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, (part.stock / Math.max(part.minStock * 2, 1)) * 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-foreground tabular-nums">₱{part.price.toLocaleString()}</td>
                    <td className="px-5 py-4 text-xs font-mono text-muted-foreground">{part.barcode}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {canMove && (
                          <button title="Stock movement" onClick={() => openMovement(part)} className="p-2 rounded-lg hover:bg-foreground/10 text-muted-foreground hover:text-green-500 transition-colors">
                            <ArrowDownToLine className="w-4 h-4" />
                          </button>
                        )}
                        <button title="History" onClick={() => setHistoryTarget(part)} className="p-2 rounded-lg hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors">
                          <History className="w-4 h-4" />
                        </button>
                        <button title="Edit" onClick={() => openEdit(part)} className="p-2 rounded-lg hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button title="Delete" onClick={() => setConfirmDelete(part.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-muted-foreground">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                    <Package className="w-8 h-8 text-muted-foreground dark:text-zinc-600" />
                  </div>
                  No parts found
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}

        {meta && meta.lastPage > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">Page {meta.currentPage} of {meta.lastPage} — {meta.total} total</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= meta.lastPage}
                className="p-1.5 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border bg-card dark:bg-zinc-950 p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-foreground">{editing ? 'Edit Part' : 'Add New Part'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Brand</Label>
                <Input {...form.register('brand')} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-border dark:border-zinc-600" placeholder="e.g. Yamaha" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Part Code</Label>
                <Input {...form.register('partCode')} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-border dark:border-zinc-600" placeholder="e.g. 1LB-H3912-00" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Part Name</Label>
              <Input {...form.register('name')} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-border dark:border-zinc-600" placeholder="e.g. Brake Pad Set" />
              {form.formState.errors.name && <p className="text-xs text-red-400 mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                <select {...form.register('category')} className="w-full mt-1.5 h-10 px-3 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border border-border dark:border-zinc-700 text-sm text-foreground focus:outline-none focus:border-border dark:border-zinc-600">
                  {categoryNames.length > 0 ? (
                    categoryNames.map(c => <option key={c} value={c}>{c}</option>)
                  ) : (
                    <option value="Other">Other</option>
                  )}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Barcode</Label>
                <Input {...form.register('barcode')} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:border-border dark:border-zinc-600" placeholder="BRK-001" />
                {form.formState.errors.barcode && <p className="text-xs text-red-400 mt-1">{form.formState.errors.barcode.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs font-medium text-muted-foreground">Stock</Label><Input type="number" {...form.register('stock', { valueAsNumber: true })} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground focus:border-border dark:border-zinc-600" /></div>
              <div><Label className="text-xs font-medium text-muted-foreground">Min Stock</Label><Input type="number" {...form.register('minStock', { valueAsNumber: true })} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground focus:border-border dark:border-zinc-600" /></div>
              <div><Label className="text-xs font-medium text-muted-foreground">Price (₱)</Label><Input type="number" {...form.register('price', { valueAsNumber: true })} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground focus:border-border dark:border-zinc-600" /></div>
            </div>

            {/* Part Image */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Part Image</Label>
              {/* sr-only (not display:none) so iOS Safari allows label-triggered click */}
              <input
                ref={imageInputRef}
                id="part-image-input"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleImageSelect}
              />
              {imagePreview ? (
                <div className="mt-1.5 space-y-2">
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border dark:border-zinc-700 bg-secondary/50 dark:bg-zinc-800/50">
                    <img src={imagePreview} alt="Part preview" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex gap-2">
                    <label
                      htmlFor="part-image-input"
                      className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border dark:border-zinc-700 text-xs text-muted-foreground hover:bg-secondary dark:hover:bg-zinc-800 transition-colors select-none"
                    >
                      <Camera className="w-3.5 h-3.5" /> Change Photo
                    </label>
                    <button
                      type="button"
                      onClick={clearImage}
                      className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-red-500/30 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="part-image-input"
                  className="mt-1.5 block cursor-pointer"
                >
                  <div className="w-full rounded-xl border-2 border-dashed border-border dark:border-zinc-700 hover:border-muted-foreground active:border-muted-foreground transition-colors p-6 flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="w-12 h-12 rounded-full bg-secondary/50 dark:bg-zinc-800 flex items-center justify-center">
                      <ImagePlus className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Add product photo</p>
                      <p className="text-xs opacity-60 mt-0.5">Tap to take a photo or choose from library</p>
                    </div>
                    <p className="text-[10px] opacity-40">JPG · PNG · WEBP · Max 2MB</p>
                  </div>
                </label>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={imageUploading} className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-foreground text-sm font-semibold transition-opacity disabled:opacity-60">
                {imageUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading…</> : editing ? 'Save Changes' : 'Add Part'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="h-10 rounded-xl text-sm border-border dark:border-zinc-700 text-muted-foreground hover:bg-secondary dark:bg-zinc-800">Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border bg-card dark:bg-zinc-950 p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-foreground">Add New Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmitCategory} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Category Name</Label>
              <Input {...categoryForm.register('name')} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-border dark:border-zinc-600" placeholder="e.g. Brake Parts" />
              {categoryForm.formState.errors.name && <p className="text-xs text-red-400 mt-1">{categoryForm.formState.errors.name.message}</p>}
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Description (Optional)</Label>
              <Input {...categoryForm.register('description')} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-border dark:border-zinc-600" placeholder="Brief description" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-foreground text-sm font-semibold transition-opacity">Add Category</Button>
              <Button type="button" variant="outline" onClick={() => setCategoryModalOpen(false)} className="h-10 rounded-xl text-sm border-border dark:border-zinc-700 text-muted-foreground hover:bg-secondary dark:bg-zinc-800">Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stockMoveTarget} onOpenChange={(o) => !o && setStockMoveTarget(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-border bg-card dark:bg-zinc-950 p-6">
          <DialogHeader><DialogTitle className="text-base font-semibold text-foreground">Stock Movement</DialogTitle></DialogHeader>
          {stockMoveTarget && (
            <form onSubmit={onSubmitMovement} className="mt-2 space-y-3">
              <p className="text-sm text-muted-foreground">{stockMoveTarget.name} — current: <span className="font-semibold text-foreground">{stockMoveTarget.stock}</span></p>
              <div className="grid grid-cols-3 gap-2">
                {(['in', 'out', 'adjust'] as const).map(t => (
                  <label key={t} className={`flex items-center justify-center gap-1 h-10 rounded-xl border text-sm font-medium capitalize cursor-pointer transition-all ${moveForm.watch('type') === t ? 'border-transparent' : 'bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-muted-foreground'}`} style={moveForm.watch('type') === t ? { background: 'var(--brand-gradient)', color: 'var(--brand-text-on-primary)', boxShadow: 'var(--brand-glow)' } : undefined}>
                    <input type="radio" value={t} {...moveForm.register('type')} className="hidden" />
                    {t === 'in' ? <ArrowDownToLine className="w-3.5 h-3.5" /> : t === 'out' ? <ArrowUpFromLine className="w-3.5 h-3.5" /> : null}
                    {t === 'adjust' ? 'Set' : t}
                  </label>
                ))}
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">{moveForm.watch('type') === 'adjust' ? 'New Stock Level' : 'Quantity'}</Label>
                <Input type="number" {...moveForm.register('qty', { valueAsNumber: true })} className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground focus:border-border dark:border-zinc-600" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Reason</Label>
                <Input {...moveForm.register('reason')} placeholder="Restock from supplier" className="mt-1.5 h-10 rounded-xl bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:border-border dark:border-zinc-600" />
                {moveForm.formState.errors.reason && <p className="text-xs text-red-400 mt-1">{moveForm.formState.errors.reason.message}</p>}
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="submit" className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] hover:opacity-90 text-foreground text-sm font-semibold transition-opacity">Record</Button>
                <Button type="button" variant="outline" onClick={() => setStockMoveTarget(null)} className="h-10 rounded-xl text-sm border-border dark:border-zinc-700 text-muted-foreground">Cancel</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {historyTarget && (
        <>
          <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40" onClick={() => setHistoryTarget(null)} />
          <aside className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-card dark:bg-zinc-950 border-l border-border z-50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 h-16 border-b border-border">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stock History</p>
                <p className="text-sm font-semibold text-foreground">{historyTarget.name}</p>
              </div>
              <button onClick={() => setHistoryTarget(null)} className="p-2 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {partHistory.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No movements recorded yet.</p>}
              <ul className="space-y-2">
                {partHistory.map(m => (
                  <li key={m.id} className="bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 rounded-xl p-4 border border-border">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${m.type === 'in' ? 'bg-green-500/10 text-green-400' : m.type === 'out' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {m.type} · {m.qty}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">{new Date(m.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-foreground mt-2">{m.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">by {m.userName}</p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </>
      )}

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl border-border bg-card dark:bg-zinc-950 p-6">
          <DialogHeader><DialogTitle className="text-base font-semibold text-foreground">Delete Part?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-1">This action cannot be undone.</p>
          <div className="flex gap-3 pt-3">
            <Button onClick={async () => { if (confirmDelete) { await deletePart(confirmDelete); removeItem(confirmDelete, 'id'); setConfirmDelete(null); } }} variant="destructive" className="flex-1 h-10 rounded-xl text-sm font-semibold">Delete</Button>
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="h-10 rounded-xl text-sm border-border dark:border-zinc-700 text-muted-foreground">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {showAddForm && (
        <PartFormWithScanning
          onClose={() => setShowAddForm(false)}
          onManualEntry={openAddFormManually}
          onPartAdded={handlePartAdded}
        />
      )}
    </div>
  );
}
