import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt, Loader2, Printer } from 'lucide-react';
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
          className="absolute inset-0 bg-background/60 backdrop-blur-md"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-card dark:bg-zinc-950 rounded-[32px] border border-border shadow-2xl overflow-hidden print-target"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Receipt className="w-6 h-6 text-purple-500" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Invoice</h3>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">#{paymentId.toString().padStart(6, '0')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {details && (
                <button
                  onClick={() => window.print()}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
                  title="Print invoice"
                >
                  <Printer className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-[rgb(var(--color-primary-rgb))] animate-spin" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Generating Bill...</p>
              </div>
            ) : details ? (
              <div className="space-y-8">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-4 p-5 bg-muted/30 rounded-2xl border border-border/50">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Billing Date</p>
                    <p className="text-sm font-bold text-foreground mt-1">
                      {new Date(details.payment.payment_date || details.sale.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Method</p>
                    <p className="text-sm font-bold text-foreground mt-1">{details.payment.payment_method}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Itemized Summary</h4>
                  <div className="space-y-3">
                    {details.labor.map((lab, i) => (
                      <div key={`lab-${i}`} className="flex justify-between items-center pb-3 border-b border-border/30 border-dashed">
                        <div>
                          <p className="text-sm font-bold text-foreground">{lab.service_name}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5">Service Labor</p>
                        </div>
                        <p className="text-sm font-bold text-foreground">₱{Number(lab.labor_cost).toLocaleString()}</p>
                      </div>
                    ))}
                    
                    {details.items.map((item, i) => (
                      <div key={`item-${i}`} className="flex justify-between items-center pb-3 border-b border-border/30 border-dashed">
                        <div>
                          <p className="text-sm font-bold text-foreground">{item.part_name}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5">Qty: {item.quantity} × ₱{Number(item.unit_price).toLocaleString()}</p>
                        </div>
                        <p className="text-sm font-bold text-foreground">₱{Number(item.subtotal).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center px-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Subtotal</p>
                    <p className="text-sm font-bold text-foreground">₱{Number(details.sale.total_amount).toLocaleString()}</p>
                  </div>
                  {Number(details.sale.discount) > 0 && (
                    <div className="flex justify-between items-center px-1 text-green-500">
                      <p className="text-xs font-bold uppercase tracking-widest">Loyalty Discount</p>
                      <p className="text-sm font-bold">-₱{Number(details.sale.discount).toLocaleString()}</p>
                    </div>
                  )}
                  <div className="mt-6 p-6 bg-[rgb(var(--color-primary-rgb))]/5 rounded-2xl border border-[rgb(var(--color-primary-rgb))]/10">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold text-[rgb(var(--color-primary-rgb))] uppercase tracking-widest">Final Amount Paid</p>
                        <p className="text-2xl font-black text-foreground mt-1">₱{Number(details.sale.net_amount).toLocaleString()}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center">
                <Receipt className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm font-bold text-muted-foreground">Details not available.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
