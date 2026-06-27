// 📁 src/components/dashboard/DashboardCard.tsx
 
import { ReactNode } from 'react';
import { cn } from '@/utils/helpers';
import { useTerminology } from '@/hooks/useTerminology';

interface DashboardCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  color: string;
  className?: string;
  onClick?: () => void;
}

export const DashboardCard = ({ 
  title, 
  value, 
  icon, 
  color, 
  className,
  onClick 
}: DashboardCardProps) => {
  // ✅ Jargon dynamique disponible si besoin
  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all text-left w-full flex items-center justify-between cursor-pointer hover:scale-[1.01] active:scale-[0.99] border-none outline-none",
        className
      )}
    >
      <div className="space-y-0.5 min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">
          {title}
        </p>
        <p className="text-xl font-extrabold truncate" style={{ color }}>
          {value}
        </p>
      </div>
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ml-3"
        style={{ background: color + '0d', color }}
      >
        {icon}
      </div>
    </button>
  );
};
