import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, UserPlus, CheckCircle2, Eye, EyeOff, LogIn, RefreshCw } from 'lucide-react';
import { apiMutation } from '@/shared/lib/api';

interface RegistrationForm {
 fullName: string;
 email: string;
 password: string;
 confirmPassword: string;
}

interface RegistrationResult {
 message: string;
 userId: string;
 shopName: string;
 requestedRole: string;
 requiresVerification?: boolean;
 email?: string;
}

type RegistrationHint = 'sign_in_first' | 'already_member' | null;

const RESEND_COOLDOWN = 60;

export default function UserRegistrationPage() {
 const navigate = useNavigate();
 const [loading, setLoading] = useState(false);
 const [step, setStep] = useState<'form' | 'verify' | 'success'>('form');
 const [result, setResult] = useState<RegistrationResult | null>(null);
 const [pendingEmail, setPendingEmail] = useState('');
 const [pendingShopName, setPendingShopName] = useState('');
 const [hint, setHint] = useState<RegistrationHint>(null);
 const [showPassword, setShowPassword] = useState(false);
 const [showConfirmPassword, setShowConfirmPassword] = useState(false);

 // OTP state
 const [otp, setOtp] = useState('');
 const [otpError, setOtpError] = useState('');
 const [verifying, setVerifying] = useState(false);
 const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN);
 const [resending, setResending] = useState(false);
 const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

 const [form, setForm] = useState<RegistrationForm>({
 fullName: '',
 email: '',
 password: '',
 confirmPassword: '',
 });

 // Handle ?verify=email query param (coming from login page unverified banner)
 useEffect(() => {
 const params = new URLSearchParams(window.location.search);
 const verifyEmail = params.get('verify');
 if (verifyEmail) {
 setPendingEmail(verifyEmail);
 setStep('verify');
 }
 }, []);

 useEffect(() => {
 if (step === 'verify') {
 setResendCountdown(RESEND_COOLDOWN);
 countdownRef.current = setInterval(() => {
 setResendCountdown(prev => {
 if (prev <= 1) {
 clearInterval(countdownRef.current!);
 return 0;
 }
 return prev - 1;
 });
 }, 1000);
 }
 return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
 }, [step]);

 const updateField = (field: keyof RegistrationForm, value: string) =>
 setForm(prev => ({ ...prev, [field]: value }));

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!form.fullName || !form.email || !form.password) {
 toast.error('Please fill in all required fields');
 return;
 }
 if (form.password !== form.confirmPassword) {
 toast.error('Passwords do not match');
 return;
 }
 if (form.password.length < 8) {
 toast.error('Password must be at least 8 characters');
 return;
 }
 setLoading(true);
 setHint(null);
 try {
 const data = await apiMutation<RegistrationResult & { hint?: RegistrationHint }>(
 '/api/register', 'POST',
 { fullName: form.fullName, email: form.email, password: form.password },
 );
 if (data.requiresVerification) {
 setPendingEmail(data.email ?? form.email);
 setPendingShopName(data.shopName ?? '');
 setStep('verify');
 } else {
 setResult(data);
 setStep('success');
 }
 } catch (error) {
 const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
 toast.error(message);
 try {
 const raw = (error as { hint?: string } | null);
 if (raw?.hint === 'sign_in_first' || raw?.hint === 'already_member') {
 setHint(raw.hint as RegistrationHint);
 } else if (message.toLowerCase().includes('wrong password') || message.toLowerCase().includes('sign in first')) {
 setHint('sign_in_first');
 } else if (message.toLowerCase().includes('already have an account in this shop') || message.toLowerCase().includes('already belong')) {
 setHint('already_member');
 }
 } catch { /* ignore */ }
 } finally {
 setLoading(false);
 }
 };

 const handleVerify = async (e: React.FormEvent) => {
 e.preventDefault();
 if (otp.length !== 6) { setOtpError('Enter the 6-digit code from your email.'); return; }
 setOtpError('');
 setVerifying(true);
 try {
 await apiMutation('/api/verify-email', 'POST', { email: pendingEmail, code: otp });
 setResult({ message: 'Verified', userId: '', shopName: pendingShopName, requestedRole: 'Customer' });
 setStep('success');
 } catch (error) {
 const message = error instanceof Error ? error.message : 'Invalid code. Please try again.';
 setOtpError(message);
 } finally {
 setVerifying(false);
 }
 };

 const handleResend = async () => {
 if (resendCountdown > 0) return;
 setResending(true);
 try {
 await apiMutation('/api/resend-verification', 'POST', { email: pendingEmail });
 toast.success('New code sent — check your email.');
 setResendCountdown(RESEND_COOLDOWN);
 setOtp('');
 setOtpError('');
 countdownRef.current = setInterval(() => {
 setResendCountdown(prev => {
 if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
 return prev - 1;
 });
 }, 1000);
 } catch {
 toast.error('Could not resend code. Please wait and try again.');
 } finally {
 setResending(false);
 }
 };

 // ── Success screen ──────────────────────────────────────────────────────────
 if (step === 'success') {
 return (
 <div className="dark text-foreground min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center relative overflow-hidden">
 <div className="absolute inset-0 pointer-events-none">
 <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(128,128,128,0.1)_0%,transparent_60%)]" />
 <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(128,128,128,0.1)_0%,transparent_60%)]" />
 </div>
 <div className="relative z-10 w-full max-w-md px-6">
 <div className="bg-muted/40 rounded-3xl border border-border/50 shadow-2xl p-10 text-center">
 <div className="flex justify-center mb-6">
 <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
 <CheckCircle2 className="w-8 h-8 text-emerald-400" strokeWidth={2} />
 </div>
 </div>
 <h1 className="text-2xl font-bold text-foreground mb-2">Email Verified!</h1>
 <p className="text-muted-foreground text-sm mb-6">Your account is active. You can now sign in.</p>
 <div className="bg-zinc-800/40 rounded-2xl border border-zinc-700/40 p-5 text-left mb-6 space-y-3">
 <div>
 <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Shop</p>
 <p className="text-sm text-foreground font-medium">{result?.shopName || pendingShopName}</p>
 </div>
 <div>
 <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Account Type</p>
 <p className="text-sm text-foreground font-medium">Customer</p>
 </div>
 <div>
 <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</p>
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
 Active
 </span>
 </div>
 </div>
 <button
 onClick={() => navigate('/login')}
 className="w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-100 active:scale-[0.99] transition-all shadow-lg"
 >
 Go to Login
 </button>
 </div>
 </div>
 </div>
 );
 }

 // ── OTP verification screen ─────────────────────────────────────────────────
 if (step === 'verify') {
 return (
 <div className="dark text-foreground min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center relative overflow-hidden">
 <div className="absolute inset-0 pointer-events-none">
 <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(128,128,128,0.1)_0%,transparent_60%)]" />
 </div>
 <button
 onClick={() => setStep('form')}
 className="absolute top-6 left-6 z-50 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
 >
 <ArrowLeft className="w-4 h-4" strokeWidth={2} />
 <span>Back</span>
 </button>
 <div className="relative z-10 w-full max-w-md px-6 py-10">
 <div className="bg-muted/40 rounded-3xl border border-border/50 shadow-2xl p-10">
 <div className="flex justify-center mb-6">
 <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg overflow-hidden">
 <img src="/images/logo.svg" alt="MoSPAMS" className="w-10 h-10 object-contain" />
 </div>
 </div>
 <div className="text-center mb-8">
 <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
 <p className="text-muted-foreground text-sm">
 We sent a 6-digit code to<br />
 <span className="text-foreground font-medium">{pendingEmail}</span>
 </p>
 </div>
 <form onSubmit={handleVerify} className="space-y-4">
 <div>
 <label className="block text-xs font-medium text-muted-foreground mb-1.5">Verification Code</label>
 <input
 type="text"
 inputMode="numeric"
 maxLength={6}
 value={otp}
 onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
 placeholder="000000"
 className="w-full px-4 py-3 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-foreground placeholder-zinc-500 text-2xl font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
 autoFocus
 disabled={verifying}
 />
 {otpError && (
 <p className="text-xs text-red-400 mt-1.5">{otpError}</p>
 )}
 </div>
 <button
 type="submit"
 disabled={verifying || otp.length !== 6}
 className="w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all shadow-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {verifying ? (
 <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
 ) : (
 <><CheckCircle2 className="w-4 h-4" /> Verify Email</>
 )}
 </button>
 </form>
 <div className="mt-5 text-center">
 {resendCountdown > 0 ? (
 <p className="text-xs text-muted-foreground">
 Resend code in <span className="text-foreground font-medium">{resendCountdown}s</span>
 </p>
 ) : (
 <button
 type="button"
 onClick={handleResend}
 disabled={resending}
 className="text-xs text-foreground font-medium hover:underline flex items-center gap-1.5 mx-auto disabled:opacity-50"
 >
 <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
 {resending ? 'Sending...' : 'Resend code'}
 </button>
 )}
 </div>
 <p className="mt-4 text-center text-xs text-muted-foreground">
 Code expires in 15 minutes
 </p>
 </div>
 </div>
 </div>
 );
 }

 // ── Registration form ───────────────────────────────────────────────────────
 return (
 <div className="dark text-foreground min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center relative overflow-hidden">
 <div className="absolute inset-0 pointer-events-none">
 <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(128,128,128,0.1)_0%,transparent_60%)]" />
 <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-[radial-gradient(circle,rgba(128,128,128,0.1)_0%,transparent_60%)]" />
 </div>
 <button
 onClick={() => navigate('/')}
 className="absolute top-6 left-6 z-50 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
 >
 <ArrowLeft className="w-4 h-4" strokeWidth={2} />
 <span>Back</span>
 </button>
 <div className="relative z-10 w-full max-w-md px-6 py-10">
 <div className="bg-muted/40 rounded-3xl border border-border/50 shadow-2xl p-10">
 <div className="flex justify-center mb-6">
 <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg overflow-hidden">
 <img src="/images/logo.svg" alt="MoSPAMS" className="w-10 h-10 object-contain" />
 </div>
 </div>
 <div className="text-center mb-8">
 <h1 className="text-2xl font-bold text-foreground mb-2">Create an Account</h1>
 <p className="text-muted-foreground text-sm">Sign up to track your motorcycle service and repairs.</p>
 </div>
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full Name</label>
 <input
 type="text"
 value={form.fullName}
 onChange={e => updateField('fullName', e.target.value)}
 placeholder="Juan Dela Cruz"
 className="w-full px-4 py-3 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-foreground placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
 disabled={loading}
 autoFocus
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email Address</label>
 <input
 type="email"
 value={form.email}
 onChange={e => updateField('email', e.target.value)}
 placeholder="you@example.com"
 className="w-full px-4 py-3 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-foreground placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
 disabled={loading}
 />
 </div>
 <div>
 <label className="block text-xs font-medium text-muted-foreground mb-1.5">Password</label>
 <div className="relative">
 <input
 type={showPassword ? 'text' : 'password'}
 value={form.password}
 onChange={e => updateField('password', e.target.value)}
 placeholder="Minimum 8 characters"
 className="w-full px-4 py-3 pr-11 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-foreground placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
 disabled={loading}
 />
 <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-zinc-300 transition-colors" tabIndex={-1}>
 {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </div>
 <div>
 <label className="block text-xs font-medium text-muted-foreground mb-1.5">Confirm Password</label>
 <div className="relative">
 <input
 type={showConfirmPassword ? 'text' : 'password'}
 value={form.confirmPassword}
 onChange={e => updateField('confirmPassword', e.target.value)}
 placeholder="Re-enter password"
 className="w-full px-4 py-3 pr-11 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-foreground placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-transparent transition-all"
 disabled={loading}
 />
 <button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-zinc-300 transition-colors" tabIndex={-1}>
 {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </div>
 <button
 type="submit"
 disabled={loading}
 className="w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all shadow-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {loading ? (
 <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
 ) : (
 <><UserPlus className="w-4 h-4" /> Create Account</>
 )}
 </button>
 </form>

 {hint === 'sign_in_first' && (
 <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
 <LogIn className="mt-0.5 w-4 h-4 shrink-0 text-amber-400" />
 <div className="flex-1">
 <p className="text-xs font-medium text-amber-300">This email already has an account.</p>
 <p className="mt-0.5 text-xs text-amber-400/80">Sign in with your existing credentials, then you will be prompted to join this shop automatically.</p>
 <button type="button" onClick={() => navigate('/login')} className="mt-2 text-xs font-semibold text-foreground underline hover:text-zinc-200 transition-colors">Go to Sign In →</button>
 </div>
 </div>
 )}

 {hint === 'already_member' && (
 <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
 <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0 text-blue-400" />
 <div className="flex-1">
 <p className="text-xs font-medium text-blue-300">You already belong to this shop.</p>
 <button type="button" onClick={() => navigate('/login')} className="mt-2 text-xs font-semibold text-foreground underline hover:text-zinc-200 transition-colors">Sign in instead →</button>
 </div>
 </div>
 )}

 <p className="mt-6 text-center text-xs text-muted-foreground">
 Already have an account?{' '}
 <button type="button" onClick={() => navigate('/login')} className="text-foreground font-medium hover:underline">Sign in</button>
 </p>
 </div>
 </div>
 </div>
 );
}
