import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/shared/lib/api';

interface Mechanic { id: string; name: string }

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (mechanicIds: string[]) => Promise<void>;
}

export function StartServiceModal({ open, onClose, onConfirm }: Props) {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) { setSelected([]); return; }
    apiGet<{ data: Mechanic[] }>('/api/mechanics?limit=100')
      .then(r => setMechanics(r.data))
      .catch(() => {});
  }, [open]);

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);

  const handleConfirm = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      await onConfirm(selected);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm rounded-2xl border-border bg-card dark:bg-zinc-950 p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-foreground">Confirm Booking</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-3">Select at least one mechanic to assign.</p>
        {mechanics.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No mechanics available.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {mechanics.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  selected.includes(m.id)
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'bg-secondary/50 dark:bg-zinc-800/50 border-border dark:border-zinc-700 text-muted-foreground hover:bg-secondary dark:hover:bg-zinc-800'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={selected.length === 0 || loading}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Confirming…' : 'Confirm Booking'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
