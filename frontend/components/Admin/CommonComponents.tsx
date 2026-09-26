import { motion } from 'motion/react';
import { Shield, Clock } from 'lucide-react';

const VIVID_PALETTE = [
  '#ef4444', '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
  '#e11d48', '#0ea5e9', '#a855f7', '#84cc16', '#d946ef',
];

const KNOWN_ROLE_COLORS: Record<string, string> = {
  Admin: '#ef4444',
  Director: '#8b5cf6',
  Manager: '#3b82f6',
  Employee: '#22c55e',
  'Giám đốc': '#8b5cf6',
};

let _colorCache: Record<string, string> = {};
let _nextIdx = 0;

export function getColor(key: string): string {
  if (KNOWN_ROLE_COLORS[key]) return KNOWN_ROLE_COLORS[key];
  if (_colorCache[key]) return _colorCache[key];
  const usedColors = new Set(Object.values(KNOWN_ROLE_COLORS));
  while (usedColors.has(VIVID_PALETTE[_nextIdx % VIVID_PALETTE.length])) _nextIdx++;
  _colorCache[key] = VIVID_PALETTE[_nextIdx % VIVID_PALETTE.length];
  _nextIdx++;
  return _colorCache[key];
}

interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}

export function SectionHeader({ icon: Icon, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl">
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <h3 className="text-base font-bold text-gray-800">{title}</h3>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
}

export function MetricRow({ label, value, icon: Icon, color, onClick }: MetricRowProps) {
  return (
    <div
      className={`flex items-center justify-between py-3 border-b border-gray-50 last:border-0 ${onClick ? 'cursor-pointer hover:bg-gray-50/80 rounded-lg px-2 -mx-2 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15`, color }}>
          <Icon size={16} />
        </div>
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-bold text-gray-800">{value}</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-xl rounded-xl p-3 text-sm">
        {label && <p className="font-bold text-gray-700 mb-1">{label}</p>}
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: <span className="font-bold">{p.value}</span></p>
        ))}
      </div>
    );
  }
  return null;
};

export { CustomTooltip, Clock };
export type { MetricRowProps };