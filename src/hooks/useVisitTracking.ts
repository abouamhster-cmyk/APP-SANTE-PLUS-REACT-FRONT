// 📁 src/hooks/useVisitTracking.ts
// ✅ SUIVI GPS ROBUSTE : WAKE LOCK (ANTI-VEILLE) + BUFFER OFFLINE + FILTRAGE DISTANCE

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

// Fonction de calcul de distance entre deux points (Haversine formule)
const getDistanceBetweenPoints = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance en mètres
};

export const useVisitTracking = (visitId: string | undefined) => {
  const [trackingActive, setTrackingActive] = useState(false);
  const [route, setRoute] = useState<TrackPoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const routeRef = useRef<TrackPoint[]>([]);
  const wakeLockRef = useRef<any>(null); // ✅ Référence pour l'anti-veille

  // ============================================================
  // GESTION DU WAKE LOCK (Empêcher le téléphone de s'éteindre)
  // ============================================================
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('🔒 [Wake Lock] Écran verrouillé actif (le téléphone ne s\'éteindra pas)');
      } catch (err: any) {
        console.warn('⚠️ [Wake Lock] Échec verrouillage écran :', err.message);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
        console.log('🔓 [Wake Lock] Verrouillage écran libéré');
      });
    }
  };

  // ============================================================
  // ENREGISTREMENT ET FILTRAGE GPS
  // ============================================================
  const startVisitTracking = async () => {
    if (!visitId || watchIdRef.current !== null) return;

    await requestWakeLock(); // Bloquer la mise en veille
    setTrackingActive(true);
    routeRef.current = [];
    setRoute([]);

    // 1️⃣ Enregistrer la position de départ (location_start)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const startLoc = { lat: latitude, lng: longitude };
        const initialPoint = { ...startLoc, timestamp: new Date().toISOString() };
        
        routeRef.current = [initialPoint];
        setRoute([initialPoint]);

        await supabase
          .from('visites')
          .update({
            location_start: startLoc,
            location_track: [initialPoint]
          })
          .eq('id', visitId);
      },
      (err) => console.error("Erreur position de départ:", err),
      { enableHighAccuracy: true }
    );

    // 2️⃣ Écoute GPS continue avec filtrage de distance de 15m (Économie de batterie)
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const newPoint = { lat: latitude, lng: longitude, timestamp: new Date().toISOString() };
        
        const lastPoint = routeRef.current[routeRef.current.length - 1];
        
        // ✅ FILTRE : On n'enregistre le point que si l'aidant a bougé de plus de 15 mètres !
        if (lastPoint) {
          const dist = getDistanceBetweenPoints(lastPoint.lat, lastPoint.lng, latitude, longitude);
          if (dist < 15) {
            console.log(`⏳ [GPS] Déplacement trop faible (${dist.toFixed(1)}m), point ignoré pour économiser la batterie.`);
            return; 
          }
        }

        const updatedRoute = [...routeRef.current, newPoint];
        routeRef.current = updatedRoute;
        setRoute(updatedRoute);

        // ✅ ROBUSTESSE EN ZONE BLANCHE : Sauvegarde locale de secours
        try {
          localStorage.setItem(`pending_track_${visitId}`, JSON.stringify(updatedRoute));
          
          const { error } = await supabase
            .from('visites')
            .update({
              location_track: updatedRoute
            })
            .eq('id', visitId);

          if (!error) {
            // Si la requête réussit, on peut nettoyer la sauvegarde temporaire locale
            localStorage.removeItem(`pending_track_${visitId}`);
          }
        } catch (dbError) {
          console.warn("⚠️ Perte de réseau détectée. Position sauvegardée localement (Offline-first).");
        }
      },
      (err) => console.error("Erreur de suivi GPS:", err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    watchIdRef.current = id;
  };

  const stopVisitTracking = async () => {
    releaseWakeLock(); // Autoriser à nouveau le téléphone à s'éteindre
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTrackingActive(false);

    if (!visitId) return;

    // Enregistrer le point d'arrivée (location_end)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const endLoc = { lat: latitude, lng: longitude };
        
        await supabase
          .from('visites')
          .update({
            location_end: endLoc,
          })
          .eq('id', visitId);
        
        // Nettoyage final du cache de suivi local
        localStorage.removeItem(`pending_track_${visitId}`);
        console.log(`⏹️ [Tracking] Suivi GPS arrêté pour la visite ${visitId}`);
      },
      (err) => console.error("Erreur position de fin d'arrivée:", err),
      { enableHighAccuracy: true }
    );
  };

  // ✅ Nettoyer les écoutes à la destruction du composant
  useEffect(() => {
    return () => {
      releaseWakeLock();
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    trackingActive,
    route,
    startVisitTracking,
    stopVisitTracking,
  };
};
