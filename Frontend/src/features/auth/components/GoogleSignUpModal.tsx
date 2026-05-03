import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import type { GoogleData } from '@/shared/types';

type RequestedRole = 'customer' | 'staff' | 'mechanic';

interface Props {
  open: boolean;
  googleData: GoogleData;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLE_OPTIONS: { value: RequestedRole; label: string; desc: string; instant: boolean }[] = [
  { value: 'customer', label: 'Customer',  desc: 'Book services and track your repairs.',   instant: true  },
  { value: 'staff',    label: 'Staff',     desc: 'Manage inventory, services, and sales.',  instant: false },
  { value: 'mechanic', label: 'Mechanic',  desc: 'Handle assigned service jobs.',           instant: false },
];

export default function GoogleSignUpModal({ open, googleData, onClose, onSuccess }: Props) {
  const { googleRegister } = useAuth();
  const [name, setName]             = useState(googleData.name);
  const [phone, setPhone]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [role, setRole]             = useState<RequestedRole>('customer');
  const [error, setError]           = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setSubmitting(true);
    const ok = await googleRegister({
      google_id:      googleData.google_id,
      name:           name.trim(),
      email:          googleData.email,
      phone:          phone.trim() || undefined,
      password,
      requested_role: role,
    });
    setSubmitting(false);

    if (!ok) { setError('Registration failed. Please try again.'); return; }
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md rounded-xl border border-neutral-200 bg-neutral-100 p-0 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 overflow-y-auto max-h-[90vh]">
        <div className="p-6 sm:p-7">
          <DialogHeader className="mb-5 text-center">
            <DialogTitle className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
              Complete Sign Up
            </DialogTitle>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Signed in as <span className="font-medium text-orange-400">{googleData.email}</span>
            </p>
          </DialogHeader>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600 mb-4">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-y-4">
            <div>
              <Label className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200">Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:ring-3 focus:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-700/30 dark:text-neutral-300"
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200">Email</Label>
              <Input
                value={googleData.email}
                readOnly
                className="block w-full rounded-lg border border-neutral-200 bg-neutral-100 px-4 py-3 text-sm text-neutral-500 cursor-not-allowed dark:border-neutral-600 dark:bg-neutral-700/30"
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200">
                Phone <span className="text-neutral-400 font-normal">(optional)</span>
              </Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+63 912 345 6789"
                className="block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:ring-3 focus:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-700/30 dark:text-neutral-300"
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="8+ characters"
                className="block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:ring-3 focus:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-700/30 dark:text-neutral-300"
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200">Confirm Password</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Repeat your password"
                className="block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700 focus:ring-3 focus:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-700/30 dark:text-neutral-300"
              />
            </div>

            <div>
              <Label className="mb-2 block text-sm text-neutral-800 dark:text-neutral-200">I am signing up as</Label>
              <div className="grid gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
                      role === opt.value
                        ? 'border-neutral-800 bg-white shadow-sm dark:border-neutral-400 dark:bg-neutral-700'
                        : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white dark:border-neutral-700 dark:bg-neutral-800/50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{opt.label}</span>
                        {opt.instant ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-neutral-800">
                            <CheckCircle className="w-2.5 h-2.5" /> Instant access
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-600 dark:text-neutral-300">
                            <Clock className="w-2.5 h-2.5" /> Pending approval
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{opt.desc}</p>
                      {!opt.instant && role === opt.value && (
                        <p className="mt-1 text-xs text-orange-400">You'll start with Customer access while your request is reviewed.</p>
                      )}
                    </div>
                    <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      role === opt.value ? 'border-neutral-800 dark:border-neutral-300' : 'border-neutral-300 dark:border-neutral-600'
                    }`}>
                      {role === opt.value && <div className="w-2 h-2 rounded-full bg-neutral-800 dark:bg-neutral-300" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 inline-flex w-full items-center justify-center gap-x-2 rounded-lg border border-transparent bg-yellow-400 px-4 py-3 text-sm font-bold text-neutral-700 transition duration-300 hover:bg-yellow-500 disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
