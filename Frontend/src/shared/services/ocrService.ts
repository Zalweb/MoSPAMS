export interface OCRExtractionResult {
  text: string;
  confidence: number;
  lines: Array<{
    text: string;
    confidence: number;
  }>;
}

export async function extractTextFromImage(
  image: HTMLImageElement | HTMLCanvasElement
): Promise<OCRExtractionResult | null> {
  try {
    // Use native Text Detection API if available
    if ('TextDetector' in window) {
      const detector = new (window as any).TextDetector();
      const textDetections = await detector.detect(image);

      if (!textDetections || textDetections.length === 0) {
        return null;
      }

      const allText = textDetections.map((t: any) => t.rawValue).join('\n');

      return {
        text: allText,
        confidence: 0.9,
        lines: textDetections.map((t: any) => ({
          text: t.rawValue || '',
          confidence: 0.9,
        })),
      };
    }

    console.warn('TextDetector not available in this browser');
    return null;
  } catch (error) {
    console.error('OCR error:', error);
    return null;
  }
}

export function suggestPartsFromOCR(
  extractedText: string
): { brand?: string; partCode?: string; description?: string } {
  const lines = extractedText.split('\n').filter((l) => l.trim());

  const result: {
    brand?: string;
    partCode?: string;
    description?: string;
  } = {};

  const uppercaseLines = lines.filter((l) => /^[A-Z][A-Z0-9\s-]+$/.test(l.trim()));
  const codeLines = lines.filter((l) => /[\d-]{5,}/.test(l));

  if (uppercaseLines.length > 0) {
    result.brand = uppercaseLines[0].trim();
  }

  if (codeLines.length > 0) {
    result.partCode = codeLines[0].trim();
  }

  const longestLine = lines.reduce((a, b) => (a.length > b.length ? a : b), '');
  if (longestLine.length > 10) {
    result.description = longestLine.trim();
  }

  return result;
}
