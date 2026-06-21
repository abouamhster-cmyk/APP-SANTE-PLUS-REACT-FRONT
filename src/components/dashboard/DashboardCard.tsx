import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  color: string;
  className?: string;
}

export const DashboardCard = ({ title, value, icon, color, className }: DashboardCardProps) => {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border-l-4',
        className
      )}
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: color + '99' }}>{title}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
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