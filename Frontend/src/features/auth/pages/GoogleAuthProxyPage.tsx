import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import GoogleSignUpModal from '@/features/auth/components/GoogleSignUpModal';
import type { GoogleData } from '@/shared/types';
import { apiMutation } from '@/shared/lib/api';

interface ProxyLoginResponse {
  token?: string;
  return_to?: string;
  needs_registration?: boolean;
  google_data?: GoogleData;
  tenant_host?: string;
}

/**
 * GoogleAuthProxyPage — Rendered on mospams.shop/auth/google
 *
 * This page acts as a centralized Google OAuth proxy for all tenant subdomains.
 * Since Google OAuth requires registered JavaScript origins, and we can't add
 * every tenant subdomain, ALL Google Sign-In flows route through this page on
 * the main domain (mospams.shop) which IS a registered origin.
 *
 * Flow:
 *  1. Tenant frontend redirects here with ?tenant=shopname&return_to=https://shopname.mospams.shop/auth/callback
 *  2. User authenticates with Google (GIS works because mospams.shop is registered)
 *  3. We POST the id_token + tenant context to /api/auth/google/proxy
 *  4. On success, redirect back to the tenant with the auth token
 */
export default function GoogleAuthProxyPage() {
  const [searchParams] = useSearchParams();
  const tenant = searchParams.get('tenant') || '';
  const returnTo = searchParams.get('return_to') || '';

  const [status, setStatus] = useState<'idle' | 'loading' | 'redirecting' | 'error'>('idle');
  const [error, setError] = useState('');
  const [signUpData, setSignUpData] = useState<{
    googleData: GoogleData;
    returnTo: string;
    tenantHost: string;
  } | null>(null);

  // Validate required params
  const isValid = tenant && returnTo;

  useEffect(() => {
    if (!isValid) {
      setError('Missing required parameters. Please try signing in again from your shop.');
      setStatus('error');
    }
  }, [isValid]);

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential || !returnTo) return;

    setStatus('loading');
    setError('');

    try {
      const result = await apiMutation<ProxyLoginResponse>('/api/auth/google/proxy', 'POST', {
        credential: response.credential,
        tenant_host: `${tenant}.mospams.shop`,
        return_to: returnTo,
      });

      if (result.needs_registration && result.google_data) {
        // Show registration modal
        setSignUpData({
          googleData: result.google_data,
          returnTo: result.return_to || returnTo,
          tenantHost: result.tenant_host || `${tenant}.mospams.shop`,
        });
        setStatus('idle');
        return;
      }

      if (result.token && result.return_to) {
        setStatus('redirecting');
        // Redirect back to tenant with token
        const separator = result.return_to.includes('?') ? '&' : '?';
        window.location.href = `${result.return_to}${separator}token=${encodeURIComponent(result.token)}`;
        return;
      }

      setError('Unexpected response. Please try again.');
      setStatus('error');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
      setError(message);
      setStatus('error');
    }
  };

  const handleRegistrationSuccess = (token: string) => {
    // Redirect to the tenant callback with the new token so the user
    // is authenticated immediately without having to sign in again.
    if (returnTo) {
      setStatus('redirecting');
      const separator = returnTo.includes('?') ? '&' : '?';
      window.location.href = `${returnTo}${separator}token=${encodeURIComponent(token)}`;
    }
  };

  if (status === 'redirecting') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400 text-sm">Signing you in…</p>
          <p className="text-zinc-600 text-xs mt-1">Redirecting back to your shop</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-transparent flex items-center justify-center overflow-hidden mx-auto mb-4">
            <img src="/images/logo.svg" alt="MoSPAMS" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold text-white">Sign in with Google</h1>
          {tenant && (
            <p className="text-zinc-400 text-sm mt-2">
              Signing in to <span className="text-blue-400 font-medium">{tenant}.mospams.shop</span>
            </p>
          )}
        </div>

        {/* Content */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
          {!isValid ? (
            <div className="text-center">
              <p className="text-red-400 text-sm">{error}</p>
              <p className="text-zinc-500 text-xs mt-2">
                Go back to your shop and try "Sign in with Google" again.
              </p>
            </div>
          ) : (
            <>
              <p className="text-zinc-400 text-sm text-center mb-6">
                Click below to continue with your Google account
              </p>

              {/* Google Sign-In Button */}
              <div className={`flex justify-center transition-opacity ${status === 'loading' ? 'opacity-50 pointer-events-none' : ''}`}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {
                    setError('Google sign-in failed. Please try again.');
                    setStatus('error');
                  }}
                  useOneTap={false}
                  shape="rectangular"
                  theme="outline"
                  size="large"
                  width="320"
                  text="signin_with"
                />
              </div>

              {/* Loading indicator */}
              {status === 'loading' && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="w-4 h-4 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
                  <span className="text-zinc-500 text-xs">Authenticating…</span>
                </div>
              )}

              {/* Error message */}
              {error && status === 'error' && (
                <p className="text-red-400 text-sm text-center mt-4">{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          MoSPAMS — Motorcycle Service & Parts Management
        </p>
      </div>

      {/* Registration Modal */}
      {signUpData && (
        <GoogleSignUpModal
          open={true}
          googleData={signUpData.googleData}
          onClose={() => setSignUpData(null)}
          onSuccess={handleRegistrationSuccess}
        />
      )}
    </div>
  );
}
