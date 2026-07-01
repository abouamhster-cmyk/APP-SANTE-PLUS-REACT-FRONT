// 📁 src/components/ui/RefreshButton.tsx

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRefreshableData } from '@/hooks/useRefreshableData';
import { cn } from '@/utils/helpers';

interface RefreshButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  showText?: boolean;
  onRefresh?: () => void;
}

export const RefreshButton = ({
  className,
  size = 'md',
  variant = 'primary',
  showText = true,
  onRefresh,
}: RefreshButtonProps) => {
  const { isRefreshing, refreshAll, lastRefresh } = useRefreshableData({
    onRefresh: onRefresh,
  });

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-[var(--color-primary)] text-white hover:opacity-90',
    secondary: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-500 hover:bg-gray-100',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <button
      onClick={() => refreshAll()}
      disabled={isRefreshing}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <RefreshCw
        size={iconSizes[size]}
        className={cn(
          'transition-transform duration-500',
          isRefreshing && 'animate-spin'
        )}
      />
      {showText && (
        <span>
          {isRefreshing ? 'Actualisation...' : 'Actualiser'}
        </span>
      )}
      {lastRefresh && (
        <span className="text-[10px] opacity-60 ml-1">
          {formatTime(lastRefresh)}
        </span>
      )}
    </button>
  );
};

export default RefreshButton;
