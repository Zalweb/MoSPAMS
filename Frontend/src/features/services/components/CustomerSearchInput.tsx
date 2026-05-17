import { useState, useEffect, useRef } from 'react';
import { Search, UserCheck, X } from 'lucide-react';
import { getAuthToken } from '@/shared/lib/api';

interface CustomerResult {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

interface Props {
  value: string;
  customerId: string | null;
  onChange: (name: string, id: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function CustomerSearchInput({ value, customerId, onChange, placeholder = 'Customer name…', className = '' }: Props) {
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const handleInput = (raw: string) => {
    onChange(raw, null);
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (raw.trim().length < 1) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const token = getAuthToken();
        const res = await fetch(`/api/customers/search?q=${encodeURIComponent(raw)}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'X-Tenant-Host': window.location.host,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error('Search failed');
        const data: { data: CustomerResult[] } = await res.json();
        setResults(data.data);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
  };

  const select = (r: CustomerResult) => {
    onChange(r.name, r.id);
    setResults([]);
    setOpen(false);
  };

  const clearLink = () => {
    onChange(value, null);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => value.trim().length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full h-10 pl-9 pr-9 rounded-xl bg-background dark:bg-zinc-900 border border-border dark:border-zinc-700 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/10 transition-all"
        />
        {customerId && (
          <button
            type="button"
            onClick={clearLink}
            title="Unlink registered customer"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 hover:text-muted-foreground transition-colors"
          >
            <UserCheck className="w-4 h-4" />
          </button>
        )}
        {!customerId && value && (
          <button
            type="button"
            onClick={() => onChange('', null)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {customerId && (
        <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mt-1 ml-1">
          ✓ Linked to registered customer
        </p>
      )}

      {open && (value.trim().length > 0) && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
          {loading && (
            <p className="text-xs text-muted-foreground text-center py-3">Searching…</p>
          )}
          {!loading && results.length === 0 && (
            <p className="text-xs text-muted-foreground px-4 py-3">
              No registered customer found — will be saved as walk-in.
            </p>
          )}
          {!loading && results.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => select(r)}
              className="w-full text-left px-4 py-2.5 hover:bg-muted dark:hover:bg-zinc-800 transition-colors flex items-center justify-between group"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{r.name}</p>
                {(r.phone || r.email) && (
                  <p className="text-xs text-muted-foreground">{r.phone ?? r.email}</p>
                )}
              </div>
              <UserCheck className="w-3.5 h-3.5 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
