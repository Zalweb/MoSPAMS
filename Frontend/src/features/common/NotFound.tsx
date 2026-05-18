import { Link } from 'react-router';

export default function NotFound() {
 return (
 <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
 <p className="text-[11px] font-semibold text-muted-foreground/60 tracking-widest uppercase">404</p>
 <h2 className="text-[22px] font-bold text-foreground mt-2 tracking-tight">Page not found</h2>
 <p className="text-[13px] text-muted-foreground mt-1">The page you're looking for doesn't exist or you don't have access.</p>
 <Link to="/" className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl bg-foreground text-background text-[12px] font-medium hover:bg-foreground/90 transition-colors">Back to Dashboard</Link>
 </div>
 );
}
