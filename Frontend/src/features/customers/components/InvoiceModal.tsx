import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt, Loader2 } from 'lucide-react';
import { apiGet } from '@/shared/lib/api';

interface InvoiceModalProps {
  paymentId: string | null;
  onClose: () => void;
}

interface InvoiceDetails {
  sale: {
    sale_id: string;
    sale_type: string;
    total_amount: number;
    discount: number;
    net_amount: number;
    sale_date: string;
  };
  payment: {
    payment_method: string;
    payment_status: string;
    payment_date: string;
  };
  items: Array<{
    part_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  labor: Array<{
    service_name: string;
    labor_cost: number;
  }>;
}

export default function InvoiceModal({ paymentId, onClose }: InvoiceModalProps) {
  const [details, setDetails] = useState<InvoiceDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!paymentId) {
      setDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const data = await apiGet<InvoiceDetails>(`/api/customer/payments/${paymentId}`);
        setDetails(data);
      } catch (error) {
        console.error('Failed to load invoice details');
      } finally {
        setLoading(false);
      }
    };

    void fetchDetails();
  }, [paymentId]);

  if (!paymentId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#F5F5F4] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] flex items-center justify-center">
                <Receipt className="w-5 h-5 text-[#8B5CF6]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#1C1917]">Payment Details</h3>
                <p className="text-[12px] text-[#A8A29E]">Invoice #{paymentId.toString().padStart(6, '0')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#A8A29E] hover:text-[#1C1917] hover:bg-[#F5F5F4] rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-8 h-8 text-[#D6D3D1] animate-spin" />
              </div>
            ) : details ? (
              <div className="space-y-6">
                {/* Meta */}
                <div className="flex items-center justify-between p-4 bg-[#FAFAF9] rounded-2xl border border-[#F5F5F4]">
                  <div>
                    <p className="text-[11px] font-medium text-[#A8A29E] uppercase tracking-wider">Date</p>
                    <p className="text-[13px] font-semibold text-[#1C1917] mt-1">
                      {new Date(details.payment.payment_date || details.sale.sale_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-medium text-[#A8A29E] uppercase tracking-wider">Method</p>
                    <p className="text-[13px] font-semibold text-[#1C1917] mt-1">{details.payment.payment_method}</p>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="text-[12px] font-bold text-[#1C1917] uppercase tracking-wider mb-3">Itemized Bill</h4>
                  <div className="space-y-3">
                    {details.labor.map((lab, i) => (
                      <div key={`lab-${i}`} className="flex justify-between items-center pb-3 border-b border-[#F5F5F4] border-dashed">
                        <div>
                          <p className="text-[13px] font-medium text-[#44403C]">{lab.service_name} (Labor)</p>
                        </div>
                        <p className="text-[13px] font-semibold text-[#1C1917]">₱{Number(lab.labor_cost).toLocaleString()}</p>
                      </div>
                    ))}
                    
                    {details.items.map((item, i) => (
                      <div key={`item-${i}`} className="flex justify-between items-center pb-3 border-b border-[#F5F5F4] border-dashed">
                        <div>
                          <p className="text-[13px] font-medium text-[#44403C]">{item.part_name}</p>
                          <p className="text-[11px] text-[#A8A29E]">Qty: {item.quantity} × ₱{Number(item.unit_price).toLocaleString()}</p>
                        </div>
                        <p className="text-[13px] font-semibold text-[#1C1917]">₱{Number(item.subtotal).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[13px] text-[#78716C]">Subtotal</p>
                    <p className="text-[13px] font-medium text-[#1C1917]">₱{Number(details.sale.total_amount).toLocaleString()}</p>
                  </div>
                  {Number(details.sale.discount) > 0 && (
                    <div className="flex justify-between items-center mb-2 text-green-600">
                      <p className="text-[13px]">Discount</p>
                      <p className="text-[13px] font-medium">-₱{Number(details.sale.discount).toLocaleString()}</p>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#E7E5E4]">
                    <p className="text-[15px] font-bold text-[#1C1917]">Total Paid</p>
                    <p className="text-[18px] font-black text-[#1C1917]">₱{Number(details.sale.net_amount).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-[13px] text-[#A8A29E] py-10">Details not available.</p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
