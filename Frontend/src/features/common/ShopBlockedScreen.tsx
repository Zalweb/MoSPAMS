import { AlertTriangle, Clock3 } from 'lucide-react';

export default function ShopBlockedScreen({ shopStatus }: { shopStatus?: string | null }) {
  const code = (shopStatus ?? 'INACTIVE').toUpperCase();

  const title = code === 'SUSPENDED'
    ? 'Shop Suspended'
    : code === 'PENDING'
    ? 'Shop Pending Activation'
    : 'Shop Inactive';

  const description = code === 'SUSPENDED'
    ? 'Your shop was suspended by the platform administrator. Contact SuperAdmin for reactivation.'
    : code === 'PENDING'
    ? 'Your shop is pending subscription activation. Access will be available after activation.'
    : 'Your shop is currently inactive. Contact the platform administrator for assistance.';

  const Icon = code === 'PENDING' ? Clock3 : AlertTriangle;

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#F5F5F4] p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center mb-4">
          <Icon className="w-6 h-6" />
        </div>
        <h1 className="text-[22px] font-bold text-[#1C1917] tracking-tight">{title}</h1>
        <p className="text-[13px] text-[#A8A29E] mt-2">{description}</p>
        <p className="text-[11px] text-[#D6D3D1] mt-4">Status code: {code}</p>
      </div>
    </div>
  );
}
