export default function ShopNotFoundPage() {
  const publicHome = import.meta.env.VITE_PUBLIC_HOSTS?.split(',')[0]
    ? `https://${import.meta.env.VITE_PUBLIC_HOSTS.split(',')[0]}`
    : 'https://mospams.shop';

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-zinc-700 mb-6">404</p>
        <h1 className="text-2xl font-semibold text-white mb-3">Shop not found</h1>
        <p className="text-zinc-400 mb-8">
          This shop doesn't exist or has been removed. Check the URL and try again.
        </p>
        <a
          href={publicHome}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors"
        >
          Go to MoSPAMS
        </a>
      </div>
    </div>
  );
}
