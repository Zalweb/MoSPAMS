import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { PartLookupResult } from './PartLookupResult';
import { OCRPreviewModal } from './OCRPreviewModal';

interface PartFormWithScanningProps {
  onClose: () => void;
  onManualEntry: () => void;
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
      onClose();
      onPartAdded?.();
    }
  };

  const handleOCRExtracted = () => {
    onClose();
    onManualEntry();
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
          onUseOCR={() => setStep('ocr')}
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

  if (step === 'ocr' && scannedBarcode) {
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
