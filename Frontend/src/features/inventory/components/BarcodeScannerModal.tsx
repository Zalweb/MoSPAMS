import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Settings } from 'lucide-react';
import {
  detectBarcode,
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
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const startCamera = async () => {
      try {
        // Try with rear camera first, fallback to any camera
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints as any);

        if (isMounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraEnabled(true);
          setError(null);
        } else if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Camera error:', err);
          setError('Camera access denied or unavailable. Tap the settings icon to enter barcode manually.');
          setCameraEnabled(false);
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
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
    setShowManualInput(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="pt-6 px-4 pb-4">
        <h2 className="text-white text-center text-lg font-medium">
          {showManualInput ? 'Enter Barcode' : 'Scan Barcode/QR'}
        </h2>
      </div>

      {/* Camera View or Manual Input */}
      {!showManualInput ? (
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
          {error ? (
            <div className="text-white text-center p-4">
              <p className="mb-4">{error}</p>
              <Button onClick={() => setShowManualInput(true)} className="bg-blue-600 hover:bg-blue-700">
                Enter Manually
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraEnabled ? 'opacity-100' : 'opacity-0'}`}
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {!cameraEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-white text-center">
                    <p className="mb-4">Starting camera...</p>
                  </div>
                </div>
              )}

              {cameraEnabled && (
                <>
                  {/* Corner Markers */}
                  <div className="absolute inset-0 pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 400 400" preserveAspectRatio="none">
                      {/* Top Left */}
                      <line x1="20" y1="20" x2="80" y2="20" stroke="white" strokeWidth="3" />
                      <line x1="20" y1="20" x2="20" y2="80" stroke="white" strokeWidth="3" />

                      {/* Top Right */}
                      <line x1="380" y1="20" x2="320" y2="20" stroke="white" strokeWidth="3" />
                      <line x1="380" y1="20" x2="380" y2="80" stroke="white" strokeWidth="3" />

                      {/* Bottom Left */}
                      <line x1="20" y1="380" x2="80" y2="380" stroke="white" strokeWidth="3" />
                      <line x1="20" y1="380" x2="20" y2="320" stroke="white" strokeWidth="3" />

                      {/* Bottom Right */}
                      <line x1="380" y1="380" x2="320" y2="380" stroke="white" strokeWidth="3" />
                      <line x1="380" y1="380" x2="380" y2="320" stroke="white" strokeWidth="3" />
                    </svg>
                  </div>

                  {detectedBarcode && (
                    <div className="absolute top-1/2 -translate-y-1/2 bg-green-500 text-white px-4 py-2 rounded-lg font-semibold">
                      ✓ Detected
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm">
            <Input
              autoFocus
              placeholder="Enter barcode..."
              value={manualInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualInput(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleManualSubmit()}
              className="h-14 text-lg"
            />
          </div>
        </div>
      )}

      {/* Footer Buttons */}
      <div className="px-4 pb-6 pt-4 flex justify-between items-center">
        <button
          onClick={handleClose}
          className="text-white hover:bg-white/10 rounded-full p-3 transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        <div className="flex gap-2">
          {showManualInput ? (
            <Button
              onClick={handleManualSubmit}
              disabled={!manualInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 h-12 px-6"
            >
              Use Barcode
            </Button>
          ) : (
            <button
              onClick={() => setShowManualInput(true)}
              className="text-white hover:bg-white/10 rounded-full p-3 transition-colors"
              aria-label="Manual input"
            >
              <Settings size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
