import React, { useRef, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { extractTextFromImage, suggestPartsFromOCR } from '@/shared/services/ocrService';

interface OCRPreviewModalProps {
  onExtracted: (data: {
    brand: string;
    partCode: string;
    description: string;
    rawText: string;
  }) => void;
  onCancel: () => void;
  barcode: string;
}

export function OCRPreviewModal({ onExtracted, onCancel, barcode }: OCRPreviewModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brand: '',
    partCode: '',
    description: '',
  });

  const handleImageUpload = async (file: File) => {
    setLoading(true);
    try {
      const url = URL.createObjectURL(file);
      setImageUrl(url);

      const img = new Image();
      img.src = url;
      img.onload = async () => {
        const result = await extractTextFromImage(img);

        if (result) {
          setExtractedText(result.text);
          setConfidence(result.confidence);

          const suggestions = suggestPartsFromOCR(result.text);
          setFormData({
            brand: suggestions.brand || '',
            partCode: suggestions.partCode || '',
            description: suggestions.description || '',
          });
        } else {
          setExtractedText('No text detected. Please enter details manually.');
        }
      };
    } catch (error) {
      console.error('Error processing image:', error);
      setExtractedText('Error reading image. Please try another photo.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleSubmit = () => {
    onExtracted({
      brand: formData.brand,
      partCode: formData.partCode,
      description: formData.description,
      rawText: extractedText,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Extract Part Details from Image</h2>

        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Upload Photo'}
          </Button>
        </div>

        {imageUrl && (
          <div className="mb-4">
            <img src={imageUrl} alt="Packaging" className="w-full rounded border" />
          </div>
        )}

        {extractedText && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <p className="text-sm font-medium text-gray-600">
              Detected Text (Confidence: {(confidence * 100).toFixed(0)}%)
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{extractedText}</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Brand</label>
            <Input
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="e.g., Yamaha"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Part Code</label>
            <Input
              value={formData.partCode}
              onChange={(e) => setFormData({ ...formData, partCode: e.target.value })}
              placeholder="e.g., 1LB-H3912-00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Lever LH"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSubmit} className="flex-1 bg-green-600 hover:bg-green-700">
            Use These Details
          </Button>
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
