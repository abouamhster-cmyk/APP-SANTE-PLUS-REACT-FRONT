// 📁 src/components/ui/KeepAliveIndicator.tsx

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useKeepAlive } from '@/hooks/useKeepAlive';
import { cn } from '@/utils/helpers';

interface KeepAliveIndicatorProps {
  className?: string;
  showLabel?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const KeepAliveIndicator = ({
  className,
  showLabel = false,
  position = 'bottom-right',
}: KeepAliveIndicatorProps) => {
  const { isActive, lastPing, pingStatus } = useKeepAlive();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Afficher l'indicateur après 5 secondes
    const timer = setTimeout(() => setIsVisible(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const positionClasses = {
    'bottom-right': 'bottom-20 right-4 sm:bottom-24 sm:right-6',
    'bottom-left': 'bottom-20 left-4 sm:bottom-24 sm:left-6',
    'top-right': 'top-20 right-4 sm:top-24 sm:right-6',
    'top-left': 'top-20 left-4 sm:top-24 sm:left-6',
  };

  const getStatusColor = () => {
    if (pingStatus === 'ok') return 'text-green-500';
    if (pingStatus === 'error') return 'text-red-500';
    return 'text-yellow-500';
  };

  const getStatusIcon = () => {
    if (pingStatus === 'ok') return <Wifi size={14} className="animate-pulse" />;
    if (pingStatus === 'error') return <WifiOff size={14} />;
    return <RefreshCw size={14} className="animate-spin" />;
  };

  return (
    <div
      className={cn(
        'fixed z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm border border-black/5 text-xs font-medium transition-all duration-300',
        positionClasses[position],
        className,
        isActive ? 'opacity-100' : 'opacity-50'
      )}
    >
      <span className={getStatusColor()}>
        {getStatusIcon()}
      </span>
      {showLabel && (
        <span style={{ color: 'var(--color-text)' }}>
          {pingStatus === 'ok' ? 'Connecté' : pingStatus === 'error' ? 'Déconnecté' : 'Connexion...'}
        </span>
      )}
      {lastPing && showLabel && (
        <span className="text-[9px] text-gray-400">
          {lastPing.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

export default KeepAliveIndicator;
