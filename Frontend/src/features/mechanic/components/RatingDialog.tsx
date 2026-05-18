import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { apiMutation } from '@/shared/lib/api';
import { toast } from 'sonner';

interface RatingDialogProps {
 jobId: string;
 mechanicName: string;
 serviceType: string;
 isOpen: boolean;
 onClose: () => void;
 onSubmit?: () => void;
}

export default function RatingDialog({ jobId, mechanicName, serviceType, isOpen, onClose, onSubmit }: RatingDialogProps) {
 const [rating, setRating] = useState(0);
 const [hovered, setHovered] = useState(0);
 const [comment, setComment] = useState('');
 const [loading, setLoading] = useState(false);

 const handleSubmit = async () => {
 if (rating === 0) {
 toast.error('Please select a rating');
 return;
 }
 try {
 setLoading(true);
 await apiMutation('/api/ratings', 'POST', {
 job_id: Number(jobId),
 rating,
 comment: comment.trim() || null,
 });
 toast.success('Rating submitted!');
 onSubmit?.();
 onClose();
 } catch (error) {
 console.error('Failed to submit rating', error);
 toast.error('Failed to submit rating');
 } finally {
 setLoading(false);
 }
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
 <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-md w-full">
 <div className="flex items-center justify-between p-6 border-b border-border">
 <h3 className="text-lg font-semibold text-foreground">Rate Your Service</h3>
 <button onClick={onClose} disabled={loading} className="p-1 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="p-6 space-y-5">
 <div>
 <p className="text-sm text-muted-foreground">Service completed by:</p>
 <p className="font-semibold text-foreground">{mechanicName}</p>
 <p className="text-sm text-muted-foreground">{serviceType}</p>
 </div>

 <div>
 <label className="text-sm font-medium text-foreground block mb-3">How was your experience?</label>
 <div className="flex gap-2">
 {[1, 2, 3, 4, 5].map((star) => (
 <button
 key={star}
 onMouseEnter={() => setHovered(star)}
 onMouseLeave={() => setHovered(0)}
 onClick={() => setRating(star)}
 disabled={loading}
 className="focus:outline-none disabled:opacity-50 transition-transform hover:scale-110"
 >
 <Star
 className="w-8 h-8 transition-colors"
 fill={star <= (hovered || rating) ? '#FBBF24' : 'none'}
 color={star <= (hovered || rating) ? '#FBBF24' : 'currentColor'}
 strokeWidth={1.5}
 />
 </button>
 ))}
 </div>
 </div>

 <div>
 <label htmlFor="comment" className="text-sm font-medium text-foreground block mb-2">
 Comments <span className="text-muted-foreground font-normal">(optional)</span>
 </label>
 <textarea
 id="comment"
 value={comment}
 onChange={(e) => setComment(e.target.value)}
 placeholder="Share your feedback..."
 disabled={loading}
 maxLength={500}
 rows={3}
 className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 resize-none text-sm"
 />
 <p className="text-xs text-muted-foreground mt-1 text-right">{comment.length}/500</p>
 </div>
 </div>

 <div className="flex gap-3 p-6 border-t border-border">
 <button
 onClick={onClose}
 disabled={loading}
 className="flex-1 px-4 py-2.5 border border-border rounded-lg text-foreground hover:bg-secondary transition-colors disabled:opacity-50 text-sm font-medium"
 >
 Cancel
 </button>
 <button
 onClick={handleSubmit}
 disabled={loading || rating === 0}
 className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium text-sm"
 >
 {loading ? 'Submitting...' : 'Submit Rating'}
 </button>
 </div>
 </div>
 </div>
 );
}
