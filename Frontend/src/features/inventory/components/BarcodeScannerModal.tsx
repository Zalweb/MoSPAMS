import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Settings, Zap, ZapOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

interface BarcodeScannerModalProps {
 onBarcodeDetected: (barcode: string) => void;
 onClose: () => void;
 isOpen: boolean;
}

const SCAN_HINTS = new Map<DecodeHintType, unknown>([
 [
 DecodeHintType.POSSIBLE_FORMATS,
 [
 BarcodeFormat.EAN_13,
 BarcodeFormat.EAN_8,
 BarcodeFormat.UPC_A,
 BarcodeFormat.UPC_E,
 BarcodeFormat.CODE_128,
 BarcodeFormat.CODE_39,
 BarcodeFormat.QR_CODE,
 BarcodeFormat.DATA_MATRIX,
 ],
 ],
 [DecodeHintType.TRY_HARDER, true],
]);

export function BarcodeScannerModal({ onBarcodeDetected, onClose, isOpen }: BarcodeScannerModalProps) {
 const videoRef = useRef<HTMLVideoElement>(null);
 const controlsRef = useRef<IScannerControls | null>(null);
 const detectionRef = useRef<{ value: string; count: number; time: number } | null>(null);
 const confirmedRef = useRef(false);

 const [cameraReady, setCameraReady] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [showManualInput, setShowManualInput] = useState(false);
 const [manualInput, setManualInput] = useState('');
 const [flashlightOn, setFlashlightOn] = useState(false);
 const [flashlightSupported, setFlashlightSupported] = useState(false);
 const [confirmedBarcode, setConfirmedBarcode] = useState<string | null>(null);

 const stopScanner = useCallback(() => {
 controlsRef.current?.stop();
 controlsRef.current = null;
 setCameraReady(false);
 setFlashlightOn(false);
 }, []);

 const handleConfirmedDetection = useCallback(
 (barcode: string) => {
 if (confirmedRef.current) return;
 confirmedRef.current = true;
 setConfirmedBarcode(barcode);
 setTimeout(() => {
 onBarcodeDetected(barcode);
 stopScanner();
 setConfirmedBarcode(null);
 setManualInput('');
 setShowManualInput(false);
 detectionRef.current = null;
 confirmedRef.current = false;
 onClose();
 }, 500);
 },
 [onBarcodeDetected, onClose, stopScanner],
 );

 useEffect(() => {
 if (!isOpen || showManualInput) return;

 confirmedRef.current = false;
 detectionRef.current = null;

 const codeReader = new BrowserMultiFormatReader(SCAN_HINTS, {
 delayBetweenScanAttempts: 150,
 });

 let mounted = true;

 const startScanning = async () => {
 if (!videoRef.current) return;

 try {
 const controls = await codeReader.decodeFromConstraints(
 {
 video: {
 facingMode: { ideal: 'environment' },
 width: { ideal: 1280 },
 height: { ideal: 720 },
 },
 },
 videoRef.current,
 (result) => {
 if (!result || confirmedRef.current) return;

 const text = result.getText();
 if (!text || text.length < 3) return;

 const now = Date.now();
 const prev = detectionRef.current;

 if (prev && prev.value === text && now - prev.time < 2000) {
 prev.count++;
 prev.time = now;
 if (prev.count >= 2) {
 handleConfirmedDetection(text);
 }
 } else {
 detectionRef.current = { value: text, count: 1, time: now };
 }
 },
 );

 if (!mounted) {
 controls.stop();
 return;
 }

 controlsRef.current = controls;
 setCameraReady(true);
 setError(null);

 // Detect flashlight support after stream initializes
 setTimeout(() => {
 const stream = videoRef.current?.srcObject as MediaStream | null;
 if (stream) {
 const track = stream.getVideoTracks()[0];
 const caps = track?.getCapabilities?.() as { torch?: boolean } | undefined;
 setFlashlightSupported(!!caps?.torch);
 }
 }, 800);
 } catch (err) {
 if (mounted) {
 console.error('Scanner start error:', err);
 setError('Camera unavailable. Use manual input instead.');
 }
 }
 };

 startScanning();

 return () => {
 mounted = false;
 controlsRef.current?.stop();
 controlsRef.current = null;
 };
 }, [isOpen, showManualInput, handleConfirmedDetection]);

 const toggleFlashlight = async () => {
 const stream = videoRef.current?.srcObject as MediaStream | null;
 if (!stream) return;
 const track = stream.getVideoTracks()[0];
 try {
 const next = !flashlightOn;
 await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
 setFlashlightOn(next);
 } catch {
 // Torch not supported on this device
 }
 };

 const handleClose = () => {
 stopScanner();
 setManualInput('');
 setConfirmedBarcode(null);
 setShowManualInput(false);
 detectionRef.current = null;
 confirmedRef.current = false;
 onClose();
 };

 const handleManualSubmit = () => {
 const value = manualInput.trim();
 if (!value) return;
 onBarcodeDetected(value);
 handleClose();
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 bg-black z-50 flex flex-col">
 {/* Header */}
 <div className="pt-6 px-4 pb-3 shrink-0">
 <h2 className="text-white text-center text-lg font-medium">
 {showManualInput ? 'Enter Barcode' : 'Scan Barcode'}
 </h2>
 {!showManualInput && (
 <p className="text-white/40 text-center text-xs mt-0.5">
 EAN-13 · EAN-8 · UPC · Code128 · Code39 · QR · DataMatrix
 </p>
 )}
 </div>

 {/* Camera or Manual Input */}
 {!showManualInput ? (
 <div className="flex-1 relative overflow-hidden">
 <video
 ref={videoRef}
 autoPlay
 playsInline
 muted
 className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
 cameraReady ? 'opacity-100' : 'opacity-0'
 }`}
 />

 {!cameraReady && !error && (
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="text-center">
 <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
 <p className="text-white/60 text-sm">Starting camera...</p>
 </div>
 </div>
 )}

 {error && (
 <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8">
 <p className="text-white/70 text-sm text-center">{error}</p>
 <Button onClick={() => setShowManualInput(true)} className="bg-blue-600 hover:bg-blue-700">
 Enter Manually
 </Button>
 </div>
 )}

 {cameraReady && !error && (
 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
 {/* Scan viewport */}
 <div className="relative" style={{ width: 288, height: 176 }}>
 {/* Corner brackets */}
 <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/90" />
 <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/90" />
 <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/90" />
 <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/90" />

 {/* Animated scan line */}
 {!confirmedBarcode && (
 <motion.div
 className="absolute left-0 right-0 h-px bg-blue-400"
 style={{ boxShadow: '0 0 8px 2px rgba(96,165,250,0.7)' }}
 animate={{ top: ['0%', '100%', '0%'] }}
 transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
 />
 )}

 {/* Detected confirmation overlay */}
 {confirmedBarcode && (
 <motion.div
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 className="absolute inset-0 flex items-center justify-center bg-green-500/20 border border-green-400/60 rounded"
 >
 <div className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-semibold text-center max-w-[260px] truncate">
 ✓ {confirmedBarcode}
 </div>
 </motion.div>
 )}
 </div>

 {/* Hint below scan area */}
 <div className="absolute left-0 right-0 text-center" style={{ top: 'calc(50% + 108px)' }}>
 <p className="text-white/50 text-xs">
 {confirmedBarcode ? 'Barcode confirmed!' : 'Align barcode within the frame'}
 </p>
 </div>
 </div>
 )}
 </div>
 ) : (
 <div className="flex-1 flex items-center justify-center px-4">
 <div className="w-full max-w-sm space-y-3">
 <p className="text-white/50 text-xs text-center mb-1">
 Type or paste the barcode value
 </p>
 <Input
 autoFocus
 placeholder="e.g. 4901301124630"
 value={manualInput}
 onChange={(e) => setManualInput(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
 className="h-14 text-lg text-center font-mono bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-blue-500"
 />
 <Button
 onClick={handleManualSubmit}
 disabled={!manualInput.trim()}
 className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold disabled:opacity-40"
 >
 Use This Barcode
 </Button>
 </div>
 </div>
 )}

 {/* Footer Controls */}
 <div className="px-4 pb-8 pt-4 flex items-center justify-between shrink-0">
 <button
 onClick={handleClose}
 className="text-white hover:bg-white/10 rounded-full p-3 transition-colors"
 aria-label="Close scanner"
 >
 <X size={24} />
 </button>

 <div className="flex items-center gap-2">
 {!showManualInput && cameraReady && flashlightSupported && (
 <button
 onClick={toggleFlashlight}
 className={`rounded-full p-3 transition-colors ${
 flashlightOn
 ? 'bg-yellow-400/20 text-yellow-300'
 : 'text-white hover:bg-white/10'
 }`}
 aria-label={flashlightOn ? 'Turn off flashlight' : 'Turn on flashlight'}
 >
 {flashlightOn ? <ZapOff size={22} /> : <Zap size={22} />}
 </button>
 )}
 <button
 onClick={() => setShowManualInput((v) => !v)}
 className={`rounded-full p-3 transition-colors ${
 showManualInput ? 'bg-white/10 text-white' : 'text-white hover:bg-white/10'
 }`}
 aria-label="Switch to manual input"
 >
 <Settings size={24} />
 </button>
 </div>
 </div>
 </div>
 );
}
