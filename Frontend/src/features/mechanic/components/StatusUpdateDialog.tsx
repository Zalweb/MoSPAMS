import { useState } from 'react';
import { X, Wrench, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiMutation } from '@/shared/lib/api';
import { toast } from 'sonner';

interface StatusUpdateDialogProps {
 jobId: string;
 statusCode: string;
 onClose: () => void;
 onSuccess: () => void;
}

export function StatusUpdateDialog({ jobId, statusCode, onClose, onSuccess }: StatusUpdateDialogProps) {
 const [laborCost, setLaborCost] = useState<string>('');
 const [submitting, setSubmitting] = useState(false);

 if (statusCode !== 'booked_confirmed' && statusCode !== 'in_progress') {
 return null;
 }

 const isStart = statusCode === 'booked_confirmed';

 async function handleSubmit() {
 try {
 setSubmitting(true);
 if (isStart) {
 await apiMutation(`/api/mechanic/jobs/${jobId}/status`, 'PATCH', { action: 'start' });
 toast.success('Service started. Customer has been notified.');
 } else {
 const cost = parseFloat(laborCost);
 if (isNaN(cost) || cost < 0) {
 toast.error('Please enter a valid labor cost.');
 return;
 }
 await apiMutation(`/api/mechanic/jobs/${jobId}/status`, 'PATCH', { action: 'complete', laborCost: cost });
 toast.success('Job marked as complete. Customer has been notified.');
 }
 onSuccess();
 } catch (error) {
 console.error('Failed to update job status', error);
 toast.error('Failed to update job status');
 } finally {
 setSubmitting(false);
 }
 }

 return (
 <AnimatePresence>
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="absolute inset-0 bg-background/60 "
 onClick={onClose}
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 className="relative w-full max-w-md bg-muted border border-border rounded-2xl shadow-2xl"
 >
 {/* Header */}
 <div className="flex items-center justify-between p-6 border-b border-border">
 <div className="flex items-center gap-3">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
 isStart
 ? 'bg-green-500/10 border-green-500/20'
 : 'bg-blue-500/10 border-blue-500/20'
 }`}>
 {isStart
 ? <Wrench className="w-5 h-5 text-green-400" strokeWidth={2} />
 : <CheckCircle2 className="w-5 h-5 text-blue-400" strokeWidth={2} />
 }
 </div>
 <h2 className="text-xl font-bold text-foreground">
 {isStart ? 'Start Service' : 'Mark as Complete'}
 </h2>
 </div>
 <button
 onClick={onClose}
 className="p-2 rounded-lg hover:bg-secondary dark:bg-zinc-800 text-muted-foreground hover:text-foreground transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Content */}
 <div className="p-6 space-y-4">
 {isStart ? (
 <p className="text-sm text-muted-foreground">
 Start working on this job? The customer will be notified.
 </p>
 ) : (
 <div className="space-y-4">
 <p className="text-sm text-muted-foreground">
 Enter the final labor cost to complete this job. The customer will be notified.
 </p>
 <div className="space-y-2">
 <label htmlFor="laborCost" className="text-sm font-semibold text-foreground">
 Final Labor Cost (₱)
 </label>
 <input
 id="laborCost"
 type="number"
 min="0"
 step="0.01"
 value={laborCost}
 onChange={(e) => setLaborCost(e.target.value)}
 placeholder="0.00"
 required
 className="w-full px-4 py-2.5 rounded-xl bg-secondary dark:bg-zinc-800 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
 />
 </div>
 </div>
 )}
 </div>

 {/* Footer */}
 <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
 <button
 onClick={onClose}
 className="px-4 py-2 rounded-xl bg-secondary dark:bg-zinc-800 text-foreground text-sm font-semibold hover:bg-muted dark:bg-zinc-700 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={handleSubmit}
 disabled={submitting || (!isStart && laborCost === '')}
 className={`px-6 py-2 rounded-xl text-foreground text-sm font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${
 isStart
 ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90'
 : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90'
 }`}
 >
 {submitting
 ? (isStart ? 'Starting...' : 'Completing...')
 : (isStart ? 'Start Service' : 'Mark as Complete')
 }
 </button>
 </div>
 </motion.div>
 </div>
 </AnimatePresence>
 );
}
