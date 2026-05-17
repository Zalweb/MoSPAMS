import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Loader2, Banknote, Smartphone, Wrench, User, Package, Printer } from 'lucide-react';
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
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-400 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right">{value}</span>
    </div>
  );
}

const FOOTER_BG = '#F2E8D8';

const scallopMask = {
  maskImage: 'radial-gradient(circle at 50% 100%, transparent 8px, black 8.5px)',
  WebkitMaskImage: 'radial-gradient(circle at 50% 100%, transparent 8px, black 8.5px)',
  maskSize: '18px 12px',
  WebkitMaskSize: '18px 12px',
  maskRepeat: 'repeat-x',
  WebkitMaskRepeat: 'repeat-x',
} as React.CSSProperties;

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
    return (
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' | ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
    );
  };

  const txnNumber = details
    ? `#${details.sale.sale_id.toString().padStart(10, '0')}`
    : `#${paymentId.toString().padStart(10, '0')}`;
  const shopName = details?.shopName ?? branding?.shopName ?? 'MoSPAMS';

  const nets = details?.sale.net_amount ?? 0;
  const intPart = Math.floor(nets).toLocaleString();
  const centPart = String(Math.round((nets % 1) * 100)).padStart(2, '0');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="relative w-full max-w-sm"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 z-20 w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Receipt card — always light themed */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 pt-8 pb-6 text-center">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-3 shadow-sm shadow-green-200">
                <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <p className="text-sm font-bold text-gray-800">Transaction Success</p>
              <h2 className="text-[22px] font-black text-gray-900 uppercase tracking-tight mt-4 leading-tight">
                {shopName}
              </h2>
              <p className="text-xs text-gray-400 mt-1.5">
                Transaction number <span className="font-mono">{txnNumber}</span>
              </p>
            </div>

            {/* Dashed divider */}
            <div className="mx-6 border-t-[1.5px] border-dashed border-gray-200" />

            {/* Scrollable details */}
            <div className="px-6 max-h-[42vh] overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-green-500" />
                  <p className="text-xs text-gray-400 font-medium">Loading receipt…</p>
                </div>
              ) : details ? (
                <div className="pt-1 pb-2">
                  <Row
                    label="Date & time"
                    value={formatDateTime(details.payment.payment_date || details.sale.sale_date)}
                  />
                  {details.payment.reference_number && (
                    <Row
                      label="Reference number"
                      value={<span className="font-mono text-[13px]">{details.payment.reference_number}</span>}
                    />
                  )}
                  {details.customer && (
                    <Row
                      label="Customer"
                      value={
                        <span className="flex items-center gap-1.5 justify-end">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {details.customer.name}
                        </span>
                      }
                    />
                  )}
                  <Row
                    label="Payment"
                    value={
                      <span className="flex items-center gap-1.5 justify-end">
                        {details.payment.payment_method === 'GCash'
                          ? <Smartphone className="w-3.5 h-3.5 text-violet-500" />
                          : <Banknote className="w-3.5 h-3.5 text-green-500" />}
                        {details.payment.payment_method ?? '—'}
                      </span>
                    }
                  />
                  {details.processedBy && (
                    <Row label="Processed by" value={details.processedBy} />
                  )}
                  {details.mechanics.length > 0 && (
                    <Row
                      label={details.mechanics.length === 1 ? 'Mechanic' : 'Mechanics'}
                      value={
                        <span className="flex flex-col items-end gap-1">
                          {details.mechanics.map((m, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <Wrench className="w-3 h-3 text-gray-400" />{m}
                            </span>
                          ))}
                        </span>
                      }
                    />
                  )}

                  {/* Parts & Services */}
                  {(details.items.length > 0 || details.labor.length > 0) && (
                    <>
                      <div className="pt-3 pb-1">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
                          <Package className="w-3 h-3" /> Parts & Services
                        </p>
                      </div>
                      {details.labor.map((l, i) => (
                        <Row
                          key={`l-${i}`}
                          label={l.service_name}
                          value={`₱${Number(l.labor_cost).toLocaleString()}`}
                        />
                      ))}
                      {details.items.map((item, i) => (
                        <Row
                          key={`i-${i}`}
                          label={`${item.part_name} ×${item.quantity}`}
                          value={`₱${Number(item.subtotal).toLocaleString()}`}
                        />
                      ))}
                    </>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm text-gray-400">Receipt details unavailable.</p>
                </div>
              )}
            </div>

            {/* Dashed divider before total */}
            <div className="mx-6 border-t-[1.5px] border-dashed border-gray-200" />

            {/* Total */}
            <div className="px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total transaction</p>
                {details && Number(details.sale.discount) > 0 && (
                  <p className="text-xs text-green-500 mt-0.5">
                    -₱{Number(details.sale.discount).toLocaleString()} discount
                  </p>
                )}
              </div>
              <span className="text-4xl font-black text-gray-900 tracking-tight">
                {details ? (
                  <>₱{intPart}<span className="text-2xl font-bold text-gray-300">.{centPart}</span></>
                ) : (
                  <span className="text-2xl text-gray-200">—</span>
                )}
              </span>
            </div>

            {/* Scalloped edge — white card with beige showing through cutouts */}
            <div style={{ height: 12, background: FOOTER_BG, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'white', ...scallopMask }} />
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-3 flex gap-3" style={{ background: FOOTER_BG }}>
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-300/70 bg-white/70 text-gray-500 text-sm font-bold hover:bg-white transition-colors"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-sm font-bold"
                style={{ background: 'var(--brand-gradient)' }}
              >
                Done →
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
