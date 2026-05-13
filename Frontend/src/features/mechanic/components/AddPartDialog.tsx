import { useState, useEffect } from 'react';
import { X, Search, Package, AlertTriangle } from 'lucide-react';
import { apiGet, apiMutation } from '@/shared/lib/api';
import { toast } from 'sonner';

interface Part {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
}

interface AddPartDialogProps {
  jobId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPartDialog({ jobId, onClose, onSuccess }: AddPartDialogProps) {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadParts();
  }, []);

  async function loadParts() {
    try {
      setLoading(true);
      const response = await apiGet<{ data: Part[] }>('/api/parts');
      setParts(response.data.filter(p => p.stock > 0)); // Only show parts with stock
    } catch (error) {
      console.error('Failed to load parts', error);
      toast.error('Failed to load parts inventory');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!selectedPart) {
      toast.error('Please select a part');
      return;
    }

    if (quantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    if (quantity > selectedPart.stock) {
      toast.error(`Only ${selectedPart.stock} units available`);
      return;
    }

    try {
      setSubmitting(true);
      await apiMutation(`/api/mechanic/jobs/${jobId}/parts`, 'POST', {
        partId: parseInt(selectedPart.id),
        quantity,
      });
      toast.success(`Added ${quantity}x ${selectedPart.name} to job`);
      onSuccess();
    } catch (error: any) {
      console.error('Failed to add part', error);
      if (error.message?.includes('Insufficient stock')) {
        toast.error('Insufficient stock available');
      } else {
        toast.error('Failed to add part to job');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const filteredParts = parts.filter(part =>
    part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subtotal = selectedPart ? selectedPart.price * quantity : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-muted border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <h2 className="text-xl font-bold text-foreground">Add Part to Job</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Search Parts
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-secondary dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
              />
            </div>
          </div>

          {/* Parts List */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Select Part
            </label>
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-secondary dark:bg-zinc-800 animate-pulse" />
                <p className="text-xs text-muted-foreground">Loading parts...</p>
              </div>
            ) : filteredParts.length === 0 ? (
              <div className="text-center py-8 bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 rounded-xl border border-border">
                <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground dark:text-zinc-600" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No parts found' : 'No parts available in stock'}
                </p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 bg-secondary dark:bg-zinc-800/30 rounded-xl p-2">
                {filteredParts.map((part) => (
                  <button
                    key={part.id}
                    onClick={() => {
                      setSelectedPart(part);
                      setQuantity(1);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedPart?.id === part.id
                        ? 'bg-muted dark:bg-zinc-700 border-border dark:border-zinc-600'
                        : 'bg-secondary dark:bg-zinc-800 border-border dark:border-zinc-700 hover:bg-zinc-750 hover:border-border dark:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{part.name}</p>
                        <p className="text-xs text-muted-foreground">{part.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">₱{part.price.toLocaleString()}</p>
                        <p className={`text-xs ${part.stock < 10 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                          {part.stock} in stock
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantity */}
          {selectedPart && (
            <>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedPart.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(selectedPart.stock, parseInt(e.target.value) || 1)))}
                  className="w-full px-4 py-2.5 bg-secondary dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-zinc-600"
                />
                {quantity > selectedPart.stock && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Only {selectedPart.stock} units available</span>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="p-4 bg-secondary/50 dark:bg-secondary dark:bg-zinc-800/50 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Selected Part</span>
                  <span className="text-sm font-medium text-foreground">{selectedPart.name}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Unit Price</span>
                  <span className="text-sm font-medium text-foreground">₱{selectedPart.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Quantity</span>
                  <span className="text-sm font-medium text-foreground">{quantity}</span>
                </div>
                <div className="pt-2 border-t border-border dark:border-zinc-700 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Subtotal</span>
                  <span className="text-lg font-bold text-foreground">₱{subtotal.toLocaleString()}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-secondary dark:bg-zinc-800 text-foreground text-sm font-semibold hover:bg-muted dark:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedPart || submitting || quantity > selectedPart.stock}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] text-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding...' : 'Add Part'}
          </button>
        </div>
      </div>
    </div>
  );
}
