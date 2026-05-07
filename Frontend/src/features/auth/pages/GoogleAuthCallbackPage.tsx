import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { setAuthToken } from '@/shared/lib/api';
import { useAuth } from '@/features/auth/context/AuthContext';
import { defaultRouteForUser } from '@/shared/lib/roles';

/**
 * GoogleAuthCallbackPage — Rendered on tenant subdomains at /auth/callback
 *
 * This page receives the auth token from the centralized Google OAuth proxy
 * (mospams.shop/auth/google) and completes the login on the tenant subdomain.
 *
 * Flow:
 *  1. User authenticated via Google on mospams.shop
 *  2. Proxy redirects to: shopname.mospams.shop/auth/callback?token=xyz
 *  3. This page stores the token, hydrates the user, and navigates to dashboard
 */
export default function GoogleAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [error, setError] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No authentication token received. Please try signing in again.');
      return;
    }

    // Store the token — this triggers AuthContext to re-hydrate via /api/me
    setAuthToken(token);

    // Force a page reload so AuthProvider picks up the new token from localStorage
    // This is the simplest reliable approach since we're arriving from an external redirect
    window.location.replace('/');
  }, [token]);

  // If already logged in (e.g., after reload), navigate to dashboard
  useEffect(() => {
    if (ready && user) {
      navigate(defaultRouteForUser(user), { replace: true });
    }
  }, [ready, user, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-white font-semibold mb-2">Sign-in Failed</h2>
          <p className="text-zinc-400 text-sm mb-4">{error}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition-colors"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-400 text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}
