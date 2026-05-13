import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Package, Plus, ShoppingCart, Filter } from 'lucide-react';
import { usePaginatedFetch } from '@/shared/hooks/usePaginatedFetch';
import type { Part } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTenantBranding } from '@/shared/contexts/TenantBrandingContext';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

export default function PartsCatalog() {
  const { branding } = useTenantBranding();
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
          <p className="text-muted-foreground mt-2">Browse and find genuine parts for your motorcycle.</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] bg-secondary/20 rounded-3xl animate-pulse" />
          ))
        ) : filteredParts.length > 0 ? (
          filteredParts.map((part, index) => (
            <motion.div
              key={part.id}
              {...fadeUp(index * 0.05)}
              className="group relative bg-secondary/30 rounded-[2.5rem] p-4 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5"
            >
              {/* Image Container */}
              <div className="relative aspect-square rounded-[2rem] bg-secondary/50 dark:bg-zinc-800/50 overflow-hidden flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-500">
                <Package className="w-16 h-16 text-muted-foreground/30 group-hover:text-primary/30 transition-colors duration-500" strokeWidth={1} />
                {/* Available Badge */}
                <div className="absolute top-4 left-4 px-3 py-1 bg-background/80 backdrop-blur-md rounded-full border border-border/50">
                  <p className="text-[10px] font-bold tracking-wider uppercase">
                    {part.stock > 0 ? `${part.stock} IN STOCK` : 'OUT OF STOCK'}
                  </p>
                </div>
              </div>

              {/* Info Area */}
              <div className="mt-6 px-2 pb-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-primary tracking-widest uppercase opacity-60">
                    {part.category}
                  </span>
                  <h3 className="text-lg font-bold text-foreground leading-tight line-clamp-1">
                    {part.name}
                  </h3>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground font-medium">Price</span>
                    <span className="text-xl font-black text-foreground tabular-nums">
                      ₱{part.price.toLocaleString()}
                    </span>
                  </div>

                  <Button
                    size="icon"
                    className="w-12 h-12 rounded-2xl bg-foreground text-background hover:scale-110 active:scale-95 transition-all duration-300"
                    onClick={() => {
                      // Future implementation: Add to cart or inquiry
                    }}
                  >
                    <Plus className="w-6 h-6" />
                  </Button>
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

      {/* Floating Cart Button (Optional Mockup) */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-8 right-8 z-50"
      >
        <Button
          size="lg"
          className="h-16 px-8 rounded-3xl bg-primary text-primary-foreground shadow-2xl shadow-primary/20 flex gap-3 hover:scale-105 active:scale-95 transition-all"
        >
          <ShoppingCart className="w-6 h-6" />
          <span className="font-bold">Cart (0)</span>
        </Button>
      </motion.div>
    </div>
  );
}
