interface TenantBootstrapScreenProps {
  statusCode?: number | null;
  title: string;
  message: string;
}

export default function TenantBootstrapScreen({ statusCode, title, message }: TenantBootstrapScreenProps) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-white/50">Tenant Bootstrap</p>
        <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-white/80">{message}</p>
        {statusCode ? <p className="mt-4 text-xs text-white/50">HTTP {statusCode}</p> : null}
      </div>
    </div>
  );
}
