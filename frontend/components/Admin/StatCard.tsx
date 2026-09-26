import { motion } from 'motion/react';
import { Shield } from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  shadow: string;
  trend?: string;
  onClick?: () => void;
}

export function StatCard({ label, value, icon: Icon, gradient, shadow, trend, onClick }: StatCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, scale: 1.02 }}
      onClick={onClick}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-6 group ${onClick ? 'cursor-pointer hover:border-brand-200' : 'cursor-default'}`}
      style={{ boxShadow: `0 4px 24px -4px ${shadow}` }}
    >
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${gradient} opacity-[0.07] group-hover:opacity-[0.15] transition-opacity duration-500`} />
      <div className={`absolute bottom-0 left-0 w-full h-1 ${gradient} opacity-60`} />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-4xl font-black text-gray-800 mt-1 tabular-nums">{value.toLocaleString()}</p>
          {trend && (
            <span className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <Shield size={11} strokeWidth={2.5} /> {trend}
            </span>
          )}
        </div>
        <div className={`p-3.5 rounded-2xl ${gradient} shadow-lg`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </motion.div>
  );
}