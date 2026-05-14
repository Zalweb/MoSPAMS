import jsQR from 'jsqr';

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
      try {
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
      } catch (detectorError) {
        // BarcodeDetector exists but failed, fall through to jsQR detection
        console.debug('BarcodeDetector failed, trying jsQR detection');
      }
    }

    // Fallback: Try jsQR for QR code detection
    return await detectQRCodeWithJsQR(image);
  } catch (error) {
    console.error('Barcode detection error:', error);
    return null;
  }
}

async function detectQRCodeWithJsQR(
  image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<BarcodeDetectionResult | null> {
  try {
    // Create canvas for image analysis
    let canvas: HTMLCanvasElement;

    if (image instanceof HTMLCanvasElement) {
      canvas = image;
    } else if (image instanceof HTMLVideoElement) {
      canvas = document.createElement('canvas');
      canvas.width = image.videoWidth;
      canvas.height = image.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(image, 0, 0);
      }
    } else {
      canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(image, 0, 0);
      }
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Use jsQR to detect QR codes in the image
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

    if (qrCode) {
      return {
        barcode: qrCode.data,
        format: 'qr_code',
        confidence: 0.95,
      };
    }

    return null;
  } catch (error) {
    console.error('jsQR detection error:', error);
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
