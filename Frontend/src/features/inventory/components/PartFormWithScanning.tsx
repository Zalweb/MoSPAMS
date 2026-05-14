import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/shared/lib/api';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { PartLookupResult } from './PartLookupResult';
import { OCRPreviewModal } from './OCRPreviewModal';

interface PartFormWithScanningProps {
  onClose: () => void;
  onManualEntry: (ocrData?: { brand: string; partCode: string; description: string; rawText: string }) => void;
  onPartAdded?: () => void;
}

type FormStep = 'choice' | 'scanner' | 'lookup' | 'ocr';

interface ScannedBarcode {
  value: string;
  partCode?: string;
}

export function PartFormWithScanning({
  onClose,
  onManualEntry,
  onPartAdded,
}: PartFormWithScanningProps) {
  const [step, setStep] = useState<FormStep>('choice');
  const [scannedBarcode, setScannedBarcode] = useState<ScannedBarcode | null>(null);
  const [lookupResult, setLookupResult] = useState<any>(null);

  const handleScanBarcode = async (barcode: string) => {
    setScannedBarcode({ value: barcode });

    try {
      const data = await apiGet<{ status: string; part?: any }>(`/inventory/barcode/${barcode}`);
      setLookupResult(data);
      setStep('lookup');
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
      onClose();
      onPartAdded?.();
    }
  };

  const handleOCRExtracted = (data: {
    brand: string;
    partCode: string;
    description: string;
    rawText: string;
  }) => {
    // Include the scanned barcode with OCR data
    onManualEntry({
      ...data,
      barcode: scannedBarcode?.value || '',
    } as any);
    onClose();
  };

  const resetForm = () => {
    setScannedBarcode(null);
    setLookupResult(null);
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
              onClick={() => {
                onClose();
                onManualEntry();
              }}
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
        onClose={() => {
          resetForm();
          setStep('choice');
        }}
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
          onUseOCR={() => {
            console.log('OCR clicked, scannedBarcode:', scannedBarcode);
            setStep('ocr');
          }}
          onManualEntry={() => {
            onClose();
            onManualEntry();
          }}
          onBack={() => {
            resetForm();
            setStep('scanner');
          }}
        />
      </div>
    );
  }

  if (step === 'ocr') {
    if (!scannedBarcode) {
      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            <p className="text-gray-700 mb-6">No barcode was scanned. Please try scanning again.</p>
            <button
              onClick={() => setStep('lookup')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return (
      <OCRPreviewModal
        barcode={scannedBarcode.value}
        onExtracted={handleOCRExtracted}
        onCancel={() => setStep('lookup')}
      />
    );
  }

  return null;
}
