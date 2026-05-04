import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface TenantBootstrapScreenProps {
  statusCode?: number | null;
  title: string;
  message: string;
}

export default function TenantBootstrapScreen({ statusCode, title, message }: TenantBootstrapScreenProps) {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const isLocalhost = currentUrl.includes('localhost');
  
  const handleRetry = () => {
    window.location.reload();
  };
  
  const handleGoHome = () => {
    window.location.href = 'http://localhost:5173';
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-sm p-8 shadow-2xl">
          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" strokeWidth={2} />
          </div>
          
          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">{title}</h1>
          
          {/* Message */}
          <p className="text-base text-zinc-400 leading-relaxed mb-6">{message}</p>
          
          {/* Status Code */}
          {statusCode && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold mb-6">
              HTTP {statusCode}
            </div>
          )}
          
          {/* Troubleshooting Steps */}
          {statusCode === 404 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
              <h2 className="text-sm font-semibold text-white mb-3">Troubleshooting Steps:</h2>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-zinc-500 mt-0.5">1.</span>
                  <span>Check if the shop subdomain is correct in the URL</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-500 mt-0.5">2.</span>
                  <span>Verify the shop exists and is ACTIVE in the database</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-500 mt-0.5">3.</span>
                  <span>Ensure backend is running on <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs">localhost:8000</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-500 mt-0.5">4.</span>
                  <span>Check if <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs">TENANCY_BASE_DOMAIN</code> is set to <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs">mospams.shop</code></span>
                </li>
                {!isLocalhost && (
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-500 mt-0.5">5.</span>
                    <span>Add this domain to your hosts file: <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs">127.0.0.1 {window.location.hostname}</code></span>
                  </li>
                )}
              </ul>
            </div>
          )}
          
          {/* Current URL Info */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 mb-6">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Current URL</p>
            <p className="text-sm text-zinc-300 font-mono break-all">{currentUrl}</p>
          </div>
          
          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={2} />
              Retry
            </button>
            
            {isLocalhost && (
              <button
                onClick={handleGoHome}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-semibold text-sm hover:bg-zinc-800 transition-all duration-200"
              >
                <Home className="w-4 h-4" strokeWidth={2} />
                Go to Home
              </button>
            )}
          </div>
          
          {/* Help Text */}
          <p className="mt-6 text-xs text-zinc-500">
            Need help? Run the diagnostic script: <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">scripts\diagnose-tenant-bootstrap.ps1</code>
          </p>
        </div>
      </div>
    </div>
  );
}
