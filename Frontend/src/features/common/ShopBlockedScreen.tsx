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

 const iconClass = code === 'SUSPENDED'
 ? 'bg-red-500/10 text-red-500'
 : code === 'PENDING'
 ? 'bg-amber-500/10 text-amber-500'
 : 'bg-muted text-muted-foreground';

 return (
 <div className="min-h-screen bg-background flex items-center justify-center px-4">
 <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 text-center">
 <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${iconClass}`}>
 <Icon className="w-6 h-6" />
 </div>
 <h1 className="text-[22px] font-bold text-foreground tracking-tight">{title}</h1>
 <p className="text-[13px] text-muted-foreground mt-2">{description}</p>
 <p className="text-[11px] text-muted-foreground/50 mt-4">Status code: {code}</p>
 </div>
 </div>
 );
}
