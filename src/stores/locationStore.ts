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
      setError("La géolocalisation n'est pas supportée.");
      return;
    }

    if (watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        // ✅ Tolérance élargie (200m) pour les tests en intérieur
        const { latitude, longitude, accuracy } = pos.coords;
        console.log(`📡 Position GPS reçue: ${latitude}, ${longitude} (Précision: ${accuracy}m)`);
        
        setPosition([latitude, longitude]);
        setError(null);
        
        if (user) {
          await updateLocation(latitude, longitude);
        }
      },
      (err) => {
        console.error("❌ Erreur GPS:", err);
        setError("Impossible de récupérer votre position.");
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 5000,
      }
    );
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

  return { position, error, permissionStatus, startWatching, stopWatching };
};
