import { Button } from '@/components/ui/button';

interface PartLookupResultProps {
  status: 'found' | 'not_found';
  part?: {
    id: number;
    brand: string;
    part_code: string;
    description: string;
    category: string;
    price: number;
    stock_quantity: number;
  };
  onQuickAdd?: () => void;
  onReviewFirst?: () => void;
  onUseOCR?: () => void;
  onManualEntry?: () => void;
  onBack?: () => void;
}

export function PartLookupResult({
  status,
  part,
  onQuickAdd,
  onReviewFirst,
  onUseOCR,
  onManualEntry,
  onBack,
}: PartLookupResultProps) {
  if (status === 'found' && part) {
    return (
      <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
        <h3 className="text-2xl font-bold text-green-600 mb-4">✓ Part Found</h3>

        <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded">
          <div>
            <label className="text-sm font-medium text-gray-600">Brand</label>
            <p className="text-lg font-semibold">{part.brand}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Part Code</label>
            <p className="text-lg font-semibold">{part.part_code}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Description</label>
            <p className="text-base">{part.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Category</label>
              <p className="text-base">{part.category}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Price</label>
              <p className="text-base">${part.price.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Stock</label>
              <p className="text-base">{part.stock_quantity} units</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={onQuickAdd} className="flex-1 bg-green-600 hover:bg-green-700">
            Quick Add
          </Button>
          <Button onClick={onReviewFirst} variant="outline" className="flex-1">
            Review First
          </Button>
        </div>

        {onBack && (
          <Button onClick={onBack} variant="ghost" className="w-full mt-2">
            Back
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
      <h3 className="text-2xl font-bold text-orange-600 mb-4">✗ Part Not Found</h3>

      <p className="text-gray-700 mb-6">
        This barcode is not in the system yet. Would you like to add it?
      </p>

      <div className="flex flex-col gap-2">
        <Button onClick={onUseOCR} className="bg-blue-600 hover:bg-blue-700">
          Use OCR to Extract Details
        </Button>
        <Button onClick={onManualEntry} variant="outline">
          Enter Details Manually
        </Button>
      </div>

      {onBack && (
        <Button onClick={onBack} variant="ghost" className="w-full mt-4">
          Scan Another Barcode
        </Button>
      )}
    </div>
  );
}
