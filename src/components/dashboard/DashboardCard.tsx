// 📁 src/components/dashboard/DashboardCard.tsx

import { ReactNode } from 'react';
import { cn } from '@/utils/helpers';
import { useBranding } from '@/hooks/useBranding';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
  className?: string;
  onClick?: () => void;
}

export const DashboardCard = ({ 
  title, 
  value, 
  icon, 
  color: propColor, 
  className,
  onClick 
}: DashboardCardProps) => {
  const brand = useBranding();
  const colors = brand.colors;
  const color = propColor || colors.primary;

  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.01)] border hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 text-left w-full flex items-center justify-between active:scale-[0.97] outline-none group",
        className
      )}
      style={{ borderColor: colors.primary + '15' }}
    >
      <div className="space-y-1 min-w-0">
        <p 
          className="text-[10px] font-bold uppercase tracking-wider truncate"
          style={{ color: colors.textLight }}
        >
          {title}
        </p>
        <p 
          className="text-2xl font-black transition-all truncate"
          style={{ color }}
        >
          {value}
        </p>
      </div>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ml-3 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-inner"
        style={{ background: color + '0d', color }}
      >
        {icon}
      </div>
    </button>
  );
};
