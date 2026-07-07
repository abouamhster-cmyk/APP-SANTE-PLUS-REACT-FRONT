// 📁 src/hooks/useLocation.ts

import { useState, useEffect, useRef } from 'react';
import { useLocationStore } from '@/stores/locationStore';
import { useAuthStore } from '@/stores/authStore';

export const useLocation = () => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const { updateLocation } = useLocationStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as any }).then((status) => {
        setPermissionStatus(status.state);
        status.onchange = () => setPermissionStatus(status.state);
      });
    }
  }, []);

  const startWatching = () => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    if (watchIdRef.current !== null) return;

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        setError(null);
        
        // Mettre à jour profiles.last_latitude / last_longitude
        await updateLocation(latitude, longitude);
      },
      (err) => {
        console.error("Erreur GPS:", err);
        setError("Impossible de récupérer votre position GPS.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    watchIdRef.current = id;
  };

  const stopWatching = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopWatching();
  }, []);

  return {
    position,
    error,
    permissionStatus,
    startWatching,
    stopWatching,
  };
};
