// 📁 src/components/PWA/NotificationPermission.tsx

import { Bell, BellOff, BellRing, AlertCircle, Loader2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { getThemeColors } from '@/lib/permissions';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface NotificationPermissionProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const NotificationPermission = ({ 
  className = '', 
  showLabel = true,
  size = 'md'
}: NotificationPermissionProps) => {
  const { isEnabled, permission, isSupported, requestPermission, enable } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const colors = getThemeColors('senior');

  const sizeClasses = {
    sm: 'text-xs gap-1.5 px-2 py-1',
    md: 'text-sm gap-2 px-3 py-1.5',
    lg: 'text-base gap-2.5 px-4 py-2',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  // ✅ Si les notifications ne sont pas supportées
  if (!isSupported) {
    return (
      <div className={`flex items-center gap-2 text-gray-400 ${className}`}>
        <AlertCircle size={iconSizes[size]} />
        {showLabel && <span className="text-xs">Notifications non supportées</span>}
      </div>
    );
  }

  // ✅ Si la permission est refusée
  if (permission === 'denied') {
    return (
      <button
        onClick={() => {
          toast.error(
            'Veuillez autoriser les notifications dans les paramètres de votre navigateur.',
            { duration: 4000 }
          );
        }}
        className={`flex items-center gap-2 text-red-500 hover:text-red-600 transition ${sizeClasses[size]} ${className}`}
      >
        <BellOff size={iconSizes[size]} />
        {showLabel && <span>Notifications bloquées</span>}
      </button>
    );
  }

  // ✅ Si les notifications sont activées
  if (isEnabled) {
    return (
      <div className={`flex items-center gap-2 ${className}`} style={{ color: colors.primary }}>
        <BellRing size={iconSizes[size]} className="animate-pulse" />
        {showLabel && <span className="font-medium">Notifications actives</span>}
      </div>
    );
  }

  // ✅ Sinon, bouton pour activer
  return (
    <button
      onClick={async () => {
        setIsLoading(true);
        try {
          await enable();
          toast.success('🔔 Notifications activées !');
        } catch (error) {
          toast.error('Erreur lors de l\'activation des notifications');
        } finally {
          setIsLoading(false);
        }
      }}
      disabled={isLoading}
      className={`flex items-center gap-2 text-gray-500 hover:text-gray-700 transition ${sizeClasses[size]} ${className}`}
    >
      {isLoading ? (
        <Loader2 size={iconSizes[size]} className="animate-spin" />
      ) : (
        <Bell size={iconSizes[size]} />
      )}
      {showLabel && <span>{isLoading ? 'Activation...' : 'Activer les notifications'}</span>}
    </button>
  );
};
