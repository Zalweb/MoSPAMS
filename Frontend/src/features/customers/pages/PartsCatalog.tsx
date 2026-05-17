import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Package, Filter } from 'lucide-react';
import { usePaginatedFetch } from '@/shared/hooks/usePaginatedFetch';
import type { Part } from '@/shared/types';
import { Input } from '@/components/ui/input';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

export default function PartsCatalog() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const { data: parts, loading } = usePaginatedFetch<Part>('/api/parts');

  const categories = useMemo(() => {
    const cats = new Set(parts.map(p => p.category));
    return ['All', ...Array.from(cats)];
  }, [parts]);

  const filteredParts = useMemo(() => {
    return parts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCat = category === 'All' || p.category === category;
      return matchesSearch && matchesCat;
    });
  }, [parts, search, category]);

  return (
    <div className="space-y-8">
      {/* Header & Search */}
      <motion.div {...fadeUp(0)} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Parts Catalog</h2>
          <p className="text-muted-foreground mt-2">Check availability and pricing for genuine motorcycle parts.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search parts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Parts Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-secondary/20 rounded-3xl animate-pulse" />
          ))
        ) : filteredParts.length > 0 ? (
          filteredParts.map((part, index) => (
            <motion.div
              key={part.id}
              {...fadeUp(index * 0.05)}
              className="group relative aspect-square brand-card backdrop-blur-xl rounded-3xl border overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300"
              style={{ background: 'var(--brand-surface-gradient)', borderColor: 'var(--brand-border)' }}
            >
              {/* Image — top 58% */}
              <div className="relative h-[58%] bg-secondary/50 dark:bg-zinc-800/50 overflow-hidden flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-500">
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

              {/* Info — bottom 42% */}
              <div className="h-[42%] px-3 py-2 flex flex-col justify-between">
                <div>
                  <span className="text-[8px] font-bold text-primary tracking-widest uppercase opacity-60 block">
                    {part.category}
                  </span>
                  <h3 className="text-xs font-bold text-foreground leading-tight line-clamp-2 mt-0.5">
                    {part.name}
                  </h3>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-foreground tabular-nums leading-none">
                    ₱{part.price.toLocaleString()}
                  </span>
                  <div className={`px-2 py-0.5 rounded-full text-[8px] font-bold tracking-tight ${part.stock > 0 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
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
    </div>
  );
}
