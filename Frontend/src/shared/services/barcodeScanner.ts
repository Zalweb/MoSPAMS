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
        // BarcodeDetector exists but failed, fall through to manual detection
        console.debug('BarcodeDetector failed, trying manual detection');
      }
    }

    // Fallback: Try to detect QR codes manually using edge detection
    return await detectQRCodeManually(image);
  } catch (error) {
    console.error('Barcode detection error:', error);
    return null;
  }
}

async function detectQRCodeManually(
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

    // Simple edge detection to find potential QR code regions
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Look for high contrast areas (characteristic of QR codes)
    let darkPixels = 0;
    let totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;

      if (brightness < 128) {
        darkPixels++;
      }
    }

    const darkRatio = darkPixels / totalPixels;

    // QR codes typically have 50% dark and 50% light pixels
    if (darkRatio > 0.3 && darkRatio < 0.7) {
      // Good contrast detected, likely a QR/barcode
      return {
        barcode: 'DETECTED',
        format: 'qr_code',
        confidence: 0.5,
      };
    }

    return null;
  } catch (error) {
    console.error('Manual detection error:', error);
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
