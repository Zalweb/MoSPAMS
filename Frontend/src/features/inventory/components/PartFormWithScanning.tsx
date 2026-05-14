import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { PartLookupResult } from './PartLookupResult';
import { OCRPreviewModal } from './OCRPreviewModal';
import { Input } from '@/components/ui/input';

interface PartFormWithScanningProps {
  onClose: () => void;
  onPartAdded?: () => void;
}

type FormStep = 'choice' | 'scanner' | 'lookup' | 'ocr' | 'manual' | 'form';

interface ScannedBarcode {
  value: string;
  partCode?: string;
}

export function PartFormWithScanning({
  onClose,
  onPartAdded,
}: PartFormWithScanningProps) {
  const [step, setStep] = useState<FormStep>('choice');
  const [scannedBarcode, setScannedBarcode] = useState<ScannedBarcode | null>(null);
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    brand: '',
    part_code: '',
    description: '',
    category_id_fk: '',
    price: 0,
    stock_quantity: 1,
    barcode_value: '',
    barcode_type: 'EAN-13',
  });

  const handleScanBarcode = async (barcode: string) => {
    setScannedBarcode({ value: barcode });
    setFormData((prev) => ({ ...prev, barcode_value: barcode }));

    try {
      const response = await fetch(`/api/inventory/barcode/${barcode}`);
      if (response.ok) {
        const data = await response.json();
        setLookupResult(data);
        setStep('lookup');
      } else {
        setLookupResult({ status: 'not_found' });
        setStep('lookup');
      }
    } catch (error) {
      console.error('Barcode lookup failed:', error);
      setLookupResult({ status: 'not_found' });
      setStep('lookup');
    }
  };

  const handleQuickAdd = async () => {
    if (!lookupResult?.part) return;

    const quantity = prompt('How many units?', '1');
    if (quantity) {
      onPartAdded?.();
      onClose();
    }
  };

  const handleReviewFirst = () => {
    if (lookupResult?.part) {
      setFormData((prev) => ({
        ...prev,
        brand: lookupResult.part.brand,
        part_code: lookupResult.part.part_code,
        description: lookupResult.part.description,
      }));
      setStep('form');
    }
  };

  const handleOCRExtracted = (data: {
    brand: string;
    partCode: string;
    description: string;
    rawText: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      brand: data.brand,
      part_code: data.partCode,
      description: data.description,
    }));
    setStep('form');
  };

  const handleSaveForm = async () => {
    if (
      !formData.brand ||
      !formData.part_code ||
      !formData.description ||
      !formData.category_id_fk ||
      formData.price <= 0
    ) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const response = await fetch('/api/inventory/parts/with-barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: formData.brand,
          part_code: formData.part_code,
          description: formData.description,
          category_id_fk: formData.category_id_fk,
          price: formData.price,
          stock_quantity: parseInt(formData.stock_quantity.toString()),
          barcode_value: formData.barcode_value,
          barcode_type: formData.barcode_type,
        }),
      });

      if (response.ok) {
        onPartAdded?.();
        onClose();
      } else {
        alert('Failed to create part');
      }
    } catch (error) {
      console.error('Error creating part:', error);
      alert('Failed to create part');
    }
  };

  if (step === 'choice') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6">Add Part to Inventory</h2>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setStep('scanner')}
              className="bg-blue-600 hover:bg-blue-700 h-12 text-lg"
            >
              📱 Scan Barcode/QR
            </Button>
            <Button
              onClick={() => setStep('manual')}
              variant="outline"
              className="h-12 text-lg"
            >
              ⌨️ Enter Manually
            </Button>
          </div>
          <Button onClick={onClose} variant="ghost" className="w-full mt-4">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'scanner') {
    return (
      <BarcodeScannerModal
        isOpen
        onBarcodeDetected={handleScanBarcode}
        onClose={() => setStep('choice')}
      />
    );
  }

  if (step === 'lookup' && lookupResult) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <PartLookupResult
          status={lookupResult.status}
          part={lookupResult.part}
          onQuickAdd={handleQuickAdd}
          onReviewFirst={handleReviewFirst}
          onUseOCR={() => setStep('ocr')}
          onManualEntry={() => setStep('manual')}
          onBack={() => {
            setStep('scanner');
            setLookupResult(null);
          }}
        />
      </div>
    );
  }

  if (step === 'ocr' && scannedBarcode) {
    return (
      <OCRPreviewModal
        barcode={scannedBarcode.value}
        onExtracted={handleOCRExtracted}
        onCancel={() => setStep('lookup')}
      />
    );
  }

  if (step === 'manual' || step === 'form') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6">Add New Part</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Brand *</label>
              <Input
                value={formData.brand}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., Yamaha"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Part Code *</label>
              <Input
                value={formData.part_code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, part_code: e.target.value })}
                placeholder="e.g., 1LB-H3912-00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description *</label>
              <Input
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Lever LH"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select
                value={formData.category_id_fk}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, category_id_fk: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select category</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Price ($) *</label>
              <Input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Stock Quantity</label>
              <Input
                type="number"
                value={formData.stock_quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })
                }
              />
            </div>

            {scannedBarcode && (
              <div>
                <label className="block text-sm font-medium mb-1">Barcode</label>
                <Input disabled value={scannedBarcode.value} />
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <Button onClick={handleSaveForm} className="flex-1 bg-green-600 hover:bg-green-700">
              Save Part
            </Button>
            <Button
              onClick={() => (step === 'form' ? setStep('lookup') : setStep('choice'))}
              variant="outline"
              className="flex-1"
            >
              Back
            </Button>
          </div>

          <Button onClick={onClose} variant="ghost" className="w-full mt-2">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
