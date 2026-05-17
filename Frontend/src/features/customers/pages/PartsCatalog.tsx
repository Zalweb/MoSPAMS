import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Package, Filter, Tag, Layers, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePaginatedFetch } from '@/shared/hooks/usePaginatedFetch';
import { apiGet } from '@/shared/lib/api';
import type { Part } from '@/shared/types';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

const PER_PAGE = 24;

export default function PartsCatalog() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState<Part | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  // Fetch categories list once
  useEffect(() => {
    apiGet<{ data: { id: string; name: string }[] }>('/api/categories')
      .then(res => setCategories(res.data.map(c => c.name).sort()))
      .catch(() => {});
  }, []);

  const extraParams: Record<string, string> = {};
  if (debouncedSearch) extraParams.search = debouncedSearch;
  if (category) extraParams.category = category;

  const { data: parts, loading, meta, page, setPage } = usePaginatedFetch<Part>(
    '/api/parts',
    PER_PAGE,
    extraParams,
  );

  // Reset to page 1 when filters change
  const prevSearch = useRef(debouncedSearch);
  const prevCategory = useRef(category);
  useEffect(() => {
    if (debouncedSearch !== prevSearch.current || category !== prevCategory.current) {
      setPage(1);
      prevSearch.current = debouncedSearch;
      prevCategory.current = category;
    }
  }, [debouncedSearch, category, setPage]);

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <motion.div {...fadeUp(0)} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Parts Catalog</h2>
          <p className="text-muted-foreground mt-2">
            Check availability and pricing for genuine motorcycle parts.
            {meta && <span className="text-muted-foreground/60 text-sm ml-2">({meta.total} parts)</span>}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search parts..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-11 h-12 w-full sm:w-64 rounded-2xl bg-secondary/30 border-border focus:ring-primary/20"
            />
          </div>
          <div className="relative group">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="pl-11 pr-4 h-12 w-full sm:w-48 rounded-2xl bg-secondary/30 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Parts Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: PER_PAGE }).map((_, i) => (
            <div key={i} className="aspect-square bg-secondary/20 rounded-3xl animate-pulse" />
          ))
        ) : parts.length > 0 ? (
          parts.map((part, index) => (
            <motion.div
              key={part.id}
              {...fadeUp(index * 0.03)}
              onClick={() => setSelected(part)}
              className="group relative flex flex-col brand-card backdrop-blur-xl rounded-3xl border overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
              style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}
            >
              {/* Image */}
              <div className="relative aspect-square w-full bg-secondary/50 dark:bg-zinc-800/50 overflow-hidden flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-500 shrink-0">
                {part.imageUrl ? (
                  <img src={part.imageUrl} alt={part.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-10 h-10 text-muted-foreground/30 group-hover:text-primary/30 transition-colors duration-500" strokeWidth={1} />
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-background/80 backdrop-blur-md rounded-full border border-border/50">
                  <p className="text-[8px] font-bold tracking-wider uppercase">
                    {part.stock > 0 ? `${part.stock} in stock` : 'Out of stock'}
                  </p>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 px-3 py-3 flex flex-col justify-between bg-card/95 dark:bg-zinc-900/80 gap-2">
                <div>
                  <span className="text-[9px] font-bold text-primary tracking-widest uppercase block leading-none mb-1">
                    {part.category}
                  </span>
                  <h3 className="text-xs font-bold text-foreground leading-tight line-clamp-1">
                    {part.name}
                  </h3>
                  {part.brand && (
                    <p className="text-[9px] text-muted-foreground truncate mt-0.5">{part.brand}</p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="text-sm font-black text-foreground tabular-nums leading-none">
                    ₱{part.price.toLocaleString()}
                  </span>
                  <div className={`px-2 py-0.5 rounded-full text-[8px] font-bold tracking-tight shrink-0 ${part.stock > 0 ? 'bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'}`}>
                    {part.stock > 0 ? 'AVAIL' : 'N/A'}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 mx-auto bg-secondary/20 rounded-3xl flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold">No parts found</h3>
            <p className="text-muted-foreground mt-2">Try adjusting your search or category filter.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.lastPage > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {meta.currentPage} of {meta.lastPage} — {meta.total} parts
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded-xl hover:bg-secondary/50 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: meta.lastPage }, (_, i) => i + 1)
              .filter(p => p === 1 || p === meta.lastPage || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-8 h-8 rounded-xl text-xs font-semibold transition-colors ${
                      p === page
                        ? 'bg-foreground text-background'
                        : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= meta.lastPage}
              className="p-2 rounded-xl hover:bg-secondary/50 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Part Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="p-0 overflow-hidden rounded-[2rem] border-border w-[calc(100vw-32px)] sm:w-full max-w-sm max-h-[calc(100vh-120px)] overflow-y-auto bg-background dark:bg-zinc-950 shadow-2xl z-[60]">
          {selected && (
            <>
              {/* Full Image */}
              <div className="relative w-full aspect-[4/3] sm:aspect-video bg-secondary/50 dark:bg-zinc-800/50 flex items-center justify-center overflow-hidden shrink-0">
                {selected.imageUrl ? (
                  <img src={selected.imageUrl} alt={selected.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-20 h-20 text-muted-foreground/20" strokeWidth={1} />
                )}
                <div className={`absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${selected.stock > 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {selected.stock > 0
                    ? <><CheckCircle2 className="w-3 h-3" /> In Stock</>
                    : <><XCircle className="w-3 h-3" /> Out of Stock</>}
                </div>
              </div>

              {/* Details */}
              <div className="px-6 py-5 space-y-4">
                <div>
                  <span className="text-[9px] font-bold text-primary tracking-widest uppercase opacity-60">{selected.category}</span>
                  <h2 className="text-xl font-bold text-foreground leading-tight mt-0.5">{selected.name}</h2>
                  {selected.brand && (
                    <p className="text-sm text-muted-foreground mt-0.5">{selected.brand}</p>
                  )}
                </div>

                <div className="space-y-2">
                  {selected.partCode && (
                    <div className="flex items-center gap-2.5">
                      <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={2} />
                      <span className="text-xs text-muted-foreground">Part No.</span>
                      <span className="ml-auto text-xs font-semibold text-foreground font-mono">{selected.partCode}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={2} />
                    <span className="text-xs text-muted-foreground">Category</span>
                    <span className="ml-auto text-xs font-semibold text-foreground">{selected.category}</span>
                  </div>
                </div>

                <div className="flex items-end justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground font-medium">Price</span>
                  <span className="text-2xl font-black text-foreground tabular-nums">₱{selected.price.toLocaleString()}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
