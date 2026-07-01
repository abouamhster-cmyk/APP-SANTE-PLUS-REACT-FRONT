// 📁 src/hooks/useKeepAlive.ts

import { useEffect, useState } from 'react';
import { keepAliveService } from '@/services/keepalive.service';

export const useKeepAlive = () => {
  const [isActive, setIsActive] = useState(keepAliveService.isActive());
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [pingStatus, setPingStatus] = useState<'ok' | 'error' | 'pending'>('pending');
  // ✅ Utiliser la méthode publique isBackendAwake()
  const [isBackendAwake, setIsBackendAwake] = useState(keepAliveService.isBackendAwake());   

  useEffect(() => {
    // Démarrer le service (si pas déjà fait)
    if (!keepAliveService.isActive()) {
      keepAliveService.start();
    }

    // Mettre à jour l'état
    setIsActive(keepAliveService.isActive());
    // ✅ Utiliser la méthode publique
    setIsBackendAwake(keepAliveService.isBackendAwake());

    // Callbacks pour suivre les pings
    const onPing = (endpoint: string, status: number) => {
      setLastPing(new Date());
      setPingStatus(status >= 200 && status < 300 ? 'ok' : 'error');
      // ✅ Utiliser la méthode publique
      setIsBackendAwake(keepAliveService.isBackendAwake());
    };

    const onError = (endpoint: string, error: any) => {
      setPingStatus('error');
      setIsBackendAwake(false);
    };

    const onWakeUp = () => {
      setPingStatus('ok');
      setIsBackendAwake(true);
      setLastPing(new Date());
    };

    // Enregistrer les callbacks
    keepAliveService.updateConfig({
      onPing,
      onError,
      onWakeUp,
    });

    // Vérifier l'état toutes les 10 secondes
    const interval = setInterval(() => {
      // ✅ Utiliser la méthode publique
      setIsBackendAwake(keepAliveService.isBackendAwake());
    }, 10000);

    // Nettoyer à la fin
    return () => {
      clearInterval(interval);
      keepAliveService.updateConfig({
        onPing: undefined,
        onError: undefined,
        onWakeUp: undefined,
      });
    };
  }, []);

  return {
    isActive,
    lastPing,
    pingStatus,
    isBackendAwake,
    interval: keepAliveService.getConfig().interval,
    pingNow: () => keepAliveService.pingNow(),
  };
};

export default useKeepAlive;
