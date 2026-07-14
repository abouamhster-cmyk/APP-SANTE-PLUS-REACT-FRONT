// 📁 src/hooks/useLocation.ts
// ✅ HOOK DE GÉOLOCALISATION PROFESSIONNEL : WAKE LOCK + FILTRAGE PRÉCISION

import { useState, useEffect, useRef } from 'react';
import { useLocationStore } from '@/stores/locationStore';
import { useAuthStore } from '@/stores/authStore';

export const useLocation = () => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
  
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null); // Référence pour empêcher la mise en veille
  
  const { updateLocation } = useLocationStore();
  const { user } = useAuthStore();

  // Initialisation des permissions
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as any }).then((status) => {
        setPermissionStatus(status.state);
        status.onchange = () => setPermissionStatus(status.state);
      });
    }
  }, []);

  // Demander le verrouillage de l'écran pour le suivi continu
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn("⚠️ Wake Lock non disponible ou refusé");
      }
    }
  };

  const startWatching = () => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    if (watchIdRef.current !== null) return;

    requestWakeLock();

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        // ✅ FILTRE DE PRÉCISION : Ignorer les positions trop imprécises (ex: > 50m)
        if (pos.coords.accuracy > 50) {
          console.warn("⏳ Position ignorée : précision trop faible", pos.coords.accuracy);
          return;
        }

        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        setError(null);
        
        // Mettre à jour profiles.last_latitude / last_longitude via le store
        if (user) {
          await updateLocation(latitude, longitude);
        }
      },
      (err) => {
        console.error("❌ Erreur GPS:", err);
        setError("Impossible de récupérer votre position GPS.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000, // Accepter une position de 5sec max
      }
    );
  };

  const stopWatching = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    // Libérer le verrouillage écran
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      });
    }
  };

  // Nettoyage au démontage
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
