import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Loader2, Banknote, Smartphone, Wrench, User, Package } from 'lucide-react';
import { apiGet } from '@/shared/lib/api';
import { useTenantBranding } from '@/shared/contexts/TenantBrandingContext';

interface InvoiceModalProps {
  paymentId: string | null;
  onClose: () => void;
  /** Override the API endpoint. Defaults to /api/customer/payments/{paymentId} */
  apiEndpoint?: string;
}

interface InvoiceDetails {
  shopName: string;
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
    reference_number: string | null;
  };
  customer: { name: string } | null;
  processedBy: string | null;
  mechanics: string[];
  items: Array<{ part_name: string; quantity: number; unit_price: number; subtotal: number }>;
  labor: Array<{ service_name: string; labor_cost: number }>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-semibold text-foreground text-right">{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t-2 border-dashed border-border/60 my-1" />;
}

export default function InvoiceModal({ paymentId, onClose, apiEndpoint }: InvoiceModalProps) {
  const [details, setDetails] = useState<InvoiceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const { branding } = useTenantBranding();

  useEffect(() => {
    if (!paymentId) { setDetails(null); return; }
    const endpoint = apiEndpoint ?? `/api/customer/payments/${paymentId}`;
    setLoading(true);
    apiGet<InvoiceDetails>(endpoint)
      .then(setDetails)
      .catch(() => setDetails(null))
      .finally(() => setLoading(false));
  }, [paymentId, apiEndpoint]);

  if (!paymentId) return null;

  const formatDateTime = (iso: string | null | undefined) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' | ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const txnNumber = details ? `#${details.sale.sale_id.toString().padStart(10, '0')}` : `#${paymentId.toString().padStart(10, '0')}`;
  const shopName = details?.shopName ?? branding?.shopName ?? 'MoSPAMS';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/70 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-lg"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Receipt card */}
          <div className="bg-card rounded-[28px] border border-border shadow-2xl overflow-hidden">

            {/* Top success section */}
            <div className="px-6 pt-7 pb-5 text-center" style={{ background: 'var(--brand-surface-gradient)' }}>
              <div className="flex items-center justify-center gap-2 mb-4">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--brand-gradient)' }}
                >
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--brand-text-on-primary)' }} strokeWidth={2.5} />
                </div>
                <span className="text-sm font-bold text-foreground">Transaction Success</span>
              </div>
              <p className="text-2xl font-black text-foreground tracking-tight uppercase leading-tight">
                {shopName}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">Transaction number {txnNumber}</p>
            </div>

            {/* Perforated edge */}
            <div className="relative h-4 flex items-center" style={{ background: 'var(--brand-surface-gradient)' }}>
              <div className="absolute -left-3 w-6 h-6 rounded-full bg-background border border-border" />
              <div className="flex-1 mx-3 border-t-2 border-dashed border-border/60" />
              <div className="absolute -right-3 w-6 h-6 rounded-full bg-background border border-border" />
            </div>

            {/* Details section */}
            <div className="px-6 pb-2 max-h-[55vh] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'rgb(var(--color-primary-rgb))' }} />
                  <p className="text-xs text-muted-foreground font-medium">Loading receipt…</p>
                </div>
              ) : details ? (
                <div>
                  {/* Transaction meta rows */}
                  <div className="divide-y divide-border/50">
                    <Row label="Date & time" value={formatDateTime(details.payment.payment_date || details.sale.sale_date)} />
                    {details.payment.reference_number && (
                      <Row label="Reference number" value={<span className="font-mono">{details.payment.reference_number}</span>} />
                    )}
                    {details.customer && (
                      <Row
                        label="Customer"
                        value={
                          <span className="flex items-center gap-1.5 justify-end">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            {details.customer.name}
                          </span>
                        }
                      />
                    )}
                    <Row
                      label="Payment method"
                      value={
                        <span className="flex items-center gap-1.5 justify-end">
                          {details.payment.payment_method === 'GCash'
                            ? <Smartphone className="w-3.5 h-3.5 text-violet-400" />
                            : <Banknote className="w-3.5 h-3.5 text-green-400" />}
                          {details.payment.payment_method ?? '—'}
                        </span>
                      }
                    />
                    {details.processedBy && (
                      <Row label="Processed by" value={details.processedBy} />
                    )}
                  </div>

                  {/* Parts & Labor */}
                  {(details.labor.length > 0 || details.items.length > 0) && (
                    <>
                      <Divider />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-2 pb-1 flex items-center gap-1.5">
                        <Package className="w-3 h-3" /> Parts & Services
                      </p>
                      <div className="divide-y divide-border/50">
                        {details.labor.map((l, i) => (
                          <div key={`l-${i}`} className="flex justify-between items-center py-2.5">
                            <div>
                              <p className="text-sm font-medium text-foreground">{l.service_name}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Service Labor</p>
                            </div>
                            <p className="text-sm font-bold text-foreground">₱{Number(l.labor_cost).toLocaleString()}</p>
                          </div>
                        ))}
                        {details.items.map((item, i) => (
                          <div key={`i-${i}`} className="flex justify-between items-center py-2.5">
                            <div>
                              <p className="text-sm font-medium text-foreground">{item.part_name}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {item.quantity} × ₱{Number(item.unit_price).toLocaleString()}
                              </p>
                            </div>
                            <p className="text-sm font-bold text-foreground">₱{Number(item.subtotal).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Mechanics */}
                  {details.mechanics.length > 0 && (
                    <>
                      <Divider />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-2 pb-1 flex items-center gap-1.5">
                        <Wrench className="w-3 h-3" /> Mechanics
                      </p>
                      <div className="pb-1 space-y-1">
                        {details.mechanics.map((name, i) => (
                          <p key={i} className="text-sm text-foreground font-medium">{name}</p>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Total */}
                  <Divider />
                  <div className="flex items-end justify-between py-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total transaction</p>
                      {Number(details.sale.discount) > 0 && (
                        <p className="text-xs text-green-500 mt-0.5">-₱{Number(details.sale.discount).toLocaleString()} discount</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black text-foreground tracking-tight">
                        ₱{Math.floor(details.sale.net_amount).toLocaleString()}
                        <span className="text-base font-bold text-muted-foreground">
                          .{String(Math.round((details.sale.net_amount % 1) * 100)).padStart(2, '0')}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">Receipt details unavailable.</p>
                </div>
              )}
            </div>

            {/* Footer perforated edge */}
            <div className="relative h-4 flex items-center bg-muted/30">
              <div className="absolute -left-3 w-6 h-6 rounded-full bg-background border border-border" />
              <div className="flex-1 mx-3 border-t-2 border-dashed border-border/60" />
              <div className="absolute -right-3 w-6 h-6 rounded-full bg-background border border-border" />
            </div>

            {/* Footer */}
            <div className="bg-muted/30 px-6 py-4 text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Thank you for your business
              </p>
              <p
                className="text-xs font-bold mt-0.5"
                style={{ color: 'rgb(var(--color-primary-rgb))' }}
              >
                {shopName}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
