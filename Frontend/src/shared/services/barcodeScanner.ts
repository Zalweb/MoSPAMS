export interface BarcodeDetectionResult {
  barcode: string;
  format: string;
  confidence: number;
}

export async function initializeMLKit(): Promise<void> {
  // Barcode detection initialization
}

export async function detectBarcode(
  image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<BarcodeDetectionResult | null> {
  try {
    // Use native Barcode Detection API if available
    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'code_128', 'qr_code'],
      });
      const barcodes = await detector.detect(image);

      if (barcodes.length === 0) {
        return null;
      }

      const firstBarcode = barcodes[0];
      return {
        barcode: firstBarcode.rawValue || '',
        format: firstBarcode.format || 'UNKNOWN',
        confidence: 0.95,
      };
    }

    console.warn('BarcodeDetector not available in this browser');
    return null;
  } catch (error) {
    console.error('Barcode detection error:', error);
    return null;
  }
}

export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    console.error('Camera permission denied:', error);
    return false;
  }
}
