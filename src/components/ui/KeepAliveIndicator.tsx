// 📁 src/components/ui/KeepAliveIndicator.tsx

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Zap } from 'lucide-react';
import { useKeepAlive } from '@/hooks/useKeepAlive';
import { cn } from '@/utils/helpers';

interface KeepAliveIndicatorProps {
  className?: string;
  showLabel?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showOnLogin?: boolean;
}

export const KeepAliveIndicator = ({
  className,
  showLabel = false,
  position = 'bottom-right',
  showOnLogin = true,
}: KeepAliveIndicatorProps) => {
  const { isActive, lastPing, pingStatus, isBackendAwake } = useKeepAlive();
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/';

  if (!isVisible) return null;
  if (isLoginPage && !showOnLogin) return null;

  const positionClasses = {
    'bottom-right': 'bottom-20 right-4 sm:bottom-24 sm:right-6',
    'bottom-left': 'bottom-20 left-4 sm:bottom-24 sm:left-6',
    'top-right': 'top-20 right-4 sm:top-24 sm:right-6',
    'top-left': 'top-20 left-4 sm:top-24 sm:left-6',
  };

  const getStatusColor = () => {
    if (pingStatus === 'ok' && isBackendAwake) return 'text-green-500';
    if (pingStatus === 'ok' && !isBackendAwake) return 'text-yellow-500';
    if (pingStatus === 'error') return 'text-red-500';
    return 'text-yellow-500';
  };

  const getStatusIcon = () => {
    if (pingStatus === 'ok' && isBackendAwake) return <Wifi size={14} className="animate-pulse" />;
    if (pingStatus === 'ok' && !isBackendAwake) return <RefreshCw size={14} className="animate-spin" />;
    if (pingStatus === 'error') return <WifiOff size={14} />;
    return <Zap size={14} className="animate-pulse" />;
  };

  return (
    <div
      className={cn(
        'fixed z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm border border-black/5 text-xs font-medium transition-all duration-300',
        positionClasses[position],
        className,
        isActive ? 'opacity-100' : 'opacity-50',
        isHovered ? 'scale-105 shadow-md' : ''
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ color: 'var(--color-text)' }}
    >
      <span className={getStatusColor()}>
        {getStatusIcon()}
      </span>
      {showLabel && (
        <span>
          {pingStatus === 'ok' && isBackendAwake ? '🟢 Connecté' :
           pingStatus === 'ok' && !isBackendAwake ? '🟡 Réveil en cours...' :
           pingStatus === 'error' ? '🔴 Déconnecté' : '🟡 Connexion...'}
        </span>
      )}
      {lastPing && showLabel && (
        <span className="text-[9px] text-gray-400 border-l border-gray-200 pl-2">
          {lastPing.toLocaleTimeString()}
        </span>
      )}
      {!showLabel && (
        <span className="text-[8px] text-gray-400 font-mono">
          {isBackendAwake ? '●' : '○'}
        </span>
      )}
    </div>
  );
};

export default KeepAliveIndicator;
