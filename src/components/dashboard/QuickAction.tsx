import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface QuickActionProps {
  icon: ReactNode;
  label: string;
  path?: string;
  color: string;
  onClick?: () => void;
}

export const QuickAction = ({ icon, label, path, color, onClick }: QuickActionProps) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border hover:border-[var(--color-primary)]/30 cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-2" style={{ background: color + '15' }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <span className="text-sm font-medium text-center" style={{ color }}>{label}</span>
    </div>
  );

  if (onClick) {
    return <button onClick={onClick} className="w-full">{content}</button>;
  }

  if (path) {
    return <Link to={path} className="w-full">{content}</Link>;
  }

  return <div className="w-full">{content}</div>;
};