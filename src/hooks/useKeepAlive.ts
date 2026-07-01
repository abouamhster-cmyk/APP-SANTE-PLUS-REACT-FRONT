// 📁 src/hooks/useKeepAlive.ts

import { useEffect, useState } from 'react';
import { keepAliveService } from '@/services/keepalive.service';

export const useKeepAlive = () => {
  const [isActive, setIsActive] = useState(keepAliveService.isActive());
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [pingStatus, setPingStatus] = useState<'ok' | 'error' | 'pending'>('pending');

  useEffect(() => {
    // Démarrer le service
    keepAliveService.start();

    // Mettre à jour l'état
    setIsActive(keepAliveService.isActive());

    // Callbacks pour suivre les pings
    const onPing = (endpoint: string, status: number) => {
      setLastPing(new Date());
      setPingStatus(status >= 200 && status < 300 ? 'ok' : 'error');
    };

    const onError = (endpoint: string, error: any) => {
      setPingStatus('error');
    };

    // Enregistrer les callbacks
    keepAliveService.updateConfig({
      onPing,
      onError,
    });

    // Nettoyer à la fin
    return () => {
      // Ne pas arrêter le service, mais nettoyer les callbacks
      keepAliveService.updateConfig({
        onPing: undefined,
        onError: undefined,
      });
    };
  }, []);

  return {
    isActive,
    lastPing,
    pingStatus,
    pingCount: 0, // À implémenter si besoin
    interval: keepAliveService.getConfig().interval,
  };
};

export default useKeepAlive;
