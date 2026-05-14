import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  detectBarcode,
  requestCameraPermission,
} from '@/shared/services/barcodeScanner';

interface BarcodeScannerModalProps {
  onBarcodeDetected: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function BarcodeScannerModal({
  onBarcodeDetected,
  onClose,
  isOpen,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        setError('Camera access required. Please grant permission in settings.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraEnabled(true);
        }
      } catch (err) {
        setError('Unable to access camera');
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!cameraEnabled || !videoRef.current) return;

    const interval = setInterval(async () => {
      if (videoRef.current && canvasRef.current) {
        const result = await detectBarcode(videoRef.current);
        if (result) {
          setDetectedBarcode(result.barcode);
          onBarcodeDetected(result.barcode);
          handleClose();
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [cameraEnabled, onBarcodeDetected]);

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onBarcodeDetected(manualInput.trim());
      handleClose();
    }
  };

  const handleClose = () => {
    setManualInput('');
    setDetectedBarcode(null);
    setCameraEnabled(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Scan Barcode</h2>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

        {cameraEnabled && !error && (
          <div className="mb-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full aspect-square bg-gray-900 rounded border-2 border-gray-400"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {detectedBarcode && (
              <p className="mt-2 text-green-600 font-semibold">
                Detected: {detectedBarcode}
              </p>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Or enter manually:</label>
          <Input
            placeholder="Type barcode..."
            value={manualInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualInput(e.target.value)}
            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleManualSubmit()}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleManualSubmit}
            disabled={!manualInput.trim()}
            className="flex-1"
          >
            Use Barcode
          </Button>
          <Button onClick={handleClose} variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
