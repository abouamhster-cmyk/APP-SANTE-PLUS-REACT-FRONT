// 📁 src/components/dashboard/DashboardCard.tsx
// 📌 Carte de statistiques du tableau de bord

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
  // ✅ Jargon dynamique (pour compatibilité)
  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

  return (
    <div
      className={cn(
        'bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border-l-4 cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
        className
      )}
      style={{ borderLeftColor: color }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: color + '99' }}>
            {title}
          </p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: color + '20' }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
    </div>
  );
};