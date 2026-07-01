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

  // ✅ Suppression des icônes WiFi - Affichage simplifié
  const getStatusIcon = () => {
    if (pingStatus === 'ok' && isBackendAwake) return '🟢';
    if (pingStatus === 'ok' && !isBackendAwake) return '🟡';
    if (pingStatus === 'error') return '🔴';
    return '🟡';
  };

  // ✅ NE RIEN AFFICHER DU TOUT  
  return null;
};

export default KeepAliveIndicator;
