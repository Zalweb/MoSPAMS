import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/features/auth/context/AuthContext';

export function DashboardHeader() {
 const { user } = useAuth();
 const navigate = useNavigate();

 return (
 <motion.div
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
 className="flex items-center justify-between mb-8"
 >
 <div>
 <div className="flex items-center gap-2 mb-2">
 <h1 className="text-2xl font-bold text-foreground tracking-tight">
 Welcome back, {user?.name?.split(' ')[0] || 'User'}
 </h1>
 </div>
 <p className="text-sm text-muted-foreground">Dashboard Overview</p>
 </div>

 <div className="flex items-center gap-3">
 <button
 onClick={() => navigate('/dashboard/reports')}
 className="h-10 px-4 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all duration-200 bg-foreground text-background shadow-lg"
 >
 <FileText className="w-4 h-4" />
 <span className="hidden sm:inline">Create Report</span>
 </button>
 </div>
 </motion.div>
 );
}
