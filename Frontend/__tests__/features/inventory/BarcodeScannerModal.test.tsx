import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BarcodeScannerModal } from '@/features/inventory/components/BarcodeScannerModal';

describe('BarcodeScannerModal', () => {
  const mockOnBarcodeDetected = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders camera modal when open', () => {
    render(
      <BarcodeScannerModal
        isOpen
        onBarcodeDetected={mockOnBarcodeDetected}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByText('Scan Barcode')).toBeInTheDocument();
  });

  it('shows manual input fallback', () => {
    render(
      <BarcodeScannerModal
        isOpen
        onBarcodeDetected={mockOnBarcodeDetected}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByPlaceholderText('Type barcode...')).toBeInTheDocument();
  });

  it('calls onBarcodeDetected when manual barcode submitted', async () => {
    render(
      <BarcodeScannerModal
        isOpen
        onBarcodeDetected={mockOnBarcodeDetected}
        onClose={mockOnClose}
      />
    );

    const input = screen.getByPlaceholderText('Type barcode...');
    fireEvent.change(input, { target: { value: '4545913123456' } });
    fireEvent.click(screen.getByText('Use Barcode'));

    expect(mockOnBarcodeDetected).toHaveBeenCalledWith('4545913123456');
  });

  it('does not render when closed', () => {
    const { container } = render(
      <BarcodeScannerModal
        isOpen={false}
        onBarcodeDetected={mockOnBarcodeDetected}
        onClose={mockOnClose}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
