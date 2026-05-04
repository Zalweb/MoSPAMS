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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Add Part to Job</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Search Parts
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
              />
            </div>
          </div>

          {/* Parts List */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Select Part
            </label>
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-zinc-800 animate-pulse" />
                <p className="text-xs text-zinc-500">Loading parts...</p>
              </div>
            ) : filteredParts.length === 0 ? (
              <div className="text-center py-8 bg-zinc-800/50 rounded-xl border border-zinc-800">
                <Package className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                <p className="text-sm text-zinc-500">
                  {searchQuery ? 'No parts found' : 'No parts available in stock'}
                </p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 bg-zinc-800/30 rounded-xl p-2">
                {filteredParts.map((part) => (
                  <button
                    key={part.id}
                    onClick={() => {
                      setSelectedPart(part);
                      setQuantity(1);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedPart?.id === part.id
                        ? 'bg-zinc-700 border-zinc-600'
                        : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-750 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{part.name}</p>
                        <p className="text-xs text-zinc-500">{part.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">₱{part.price.toLocaleString()}</p>
                        <p className={`text-xs ${part.stock < 10 ? 'text-amber-400' : 'text-zinc-500'}`}>
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
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedPart.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(selectedPart.stock, parseInt(e.target.value) || 1)))}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
                />
                {quantity > selectedPart.stock && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Only {selectedPart.stock} units available</span>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Selected Part</span>
                  <span className="text-sm font-medium text-white">{selectedPart.name}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Unit Price</span>
                  <span className="text-sm font-medium text-white">₱{selectedPart.price.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Quantity</span>
                  <span className="text-sm font-medium text-white">{quantity}</span>
                </div>
                <div className="pt-2 border-t border-zinc-700 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Subtotal</span>
                  <span className="text-lg font-bold text-white">₱{subtotal.toLocaleString()}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedPart || submitting || quantity > selectedPart.stock}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-[rgb(var(--color-primary-rgb))] to-[rgb(var(--color-secondary-rgb))] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding...' : 'Add Part'}
          </button>
        </div>
      </div>
    </div>
  );
}
