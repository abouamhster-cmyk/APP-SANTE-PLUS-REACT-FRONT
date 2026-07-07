// 📁 src/hooks/useVisitTracking.ts

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

export const useVisitTracking = (visitId: string | undefined) => {
  const [trackingActive, setTrackingActive] = useState(false);
  const [route, setRoute] = useState<TrackPoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const routeRef = useRef<TrackPoint[]>([]);

  const startVisitTracking = async () => {
    if (!visitId || watchIdRef.current !== null) return;

    console.log(`🚀 [Tracking] Démarrage du suivi GPS pour la visite ${visitId}`);
    setTrackingActive(true);
    routeRef.current = [];
    setRoute([]);

    // 1️⃣ Enregistrer le point de départ (location_start)
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

    // 2️⃣ Enregistrer le tracé en continu toutes les 10 secondes (location_track)
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const newPoint = { lat: latitude, lng: longitude, timestamp: new Date().toISOString() };
        
        const updatedRoute = [...routeRef.current, newPoint];
        routeRef.current = updatedRoute;
        setRoute(updatedRoute);

        await supabase
          .from('visites')
          .update({
            location_track: updatedRoute
          })
          .eq('id', visitId);
      },
      (err) => console.error("Erreur de suivi GPS:", err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000, // Enregistre un point toutes les 10 secondes max
      }
    );

    watchIdRef.current = id;
  };

  const stopVisitTracking = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTrackingActive(false);

    if (!visitId) return;

    // 3️⃣ Enregistrer le point final d'arrivée (location_end)
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
        
        console.log(`⏹️ [Tracking] Suivi GPS arrêté pour la visite ${visitId}`);
      },
      (err) => console.error("Erreur position de fin d'arrivée:", err),
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    return () => {
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
