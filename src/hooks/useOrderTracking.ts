// 📁 src/hooks/useOrderTracking.ts
// ✅ SUIVI GPS DE LIVRAISON : WAKE LOCK (ANTI-VEILLE) + BUFFER OFFLINE + FILTRAGE DISTANCE (JSON METADATA)

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

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

  return R * c;
};

export const useOrderTracking = (orderId: string | undefined) => {
  const [trackingActive, setTrackingActive] = useState(false);
  const [route, setRoute] = useState<TrackPoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const routeRef = useRef<TrackPoint[]>([]);
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('🔒 [Order Tracking] Écran actif (le téléphone ne s\'éteindra pas)');
      } catch (err: any) {
        console.warn('⚠️ [Order Tracking] Échec verrouillage écran :', err.message);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
        console.log('🔓 [Order Tracking] Verrouillage écran libéré');
      });
    }
  };

  const startOrderTracking = async () => {
    if (!orderId || watchIdRef.current !== null) return;

    await requestWakeLock();
    setTrackingActive(true);
    routeRef.current = [];
    setRoute([]);

    // 1️⃣ Enregistrer le point de départ de livraison dans metadata
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const startLoc = { lat: latitude, lng: longitude };
        const initialPoint = { ...startLoc, timestamp: new Date().toISOString() };
        
        routeRef.current = [initialPoint];
        setRoute([initialPoint]);

        const { data: order } = await supabase
          .from('commandes')
          .select('metadata')
          .eq('id', orderId)
          .single();

        const updatedMetadata = {
          ...(order?.metadata || {}),
          location_start: startLoc,
          location_track: [initialPoint],
          delivery_started_at: new Date().toISOString(),
        };

        await supabase
          .from('commandes')
          .update({ metadata: updatedMetadata })
          .eq('id', orderId);
      },
      (err) => console.error("Erreur position départ livraison:", err),
      { enableHighAccuracy: true }
    );

    // 2️⃣ Écoute GPS continue (filtrage 15m)
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const newPoint = { lat: latitude, lng: longitude, timestamp: new Date().toISOString() };
        
        const lastPoint = routeRef.current[routeRef.current.length - 1];
        
        if (lastPoint) {
          const dist = getDistanceBetweenPoints(lastPoint.lat, lastPoint.lng, latitude, longitude);
          if (dist < 15) return; // Économie de batterie si trop proche
        }

        const updatedRoute = [...routeRef.current, newPoint];
        routeRef.current = updatedRoute;
        setRoute(updatedRoute);

        try {
          const { data: order } = await supabase
            .from('commandes')
            .select('metadata')
            .eq('id', orderId)
            .single();

          const updatedMetadata = {
            ...(order?.metadata || {}),
            location_track: updatedRoute
          };

          await supabase
            .from('commandes')
            .update({ metadata: updatedMetadata })
            .eq('id', orderId);
        } catch (dbError) {
          console.warn("⚠️ Perte de réseau pendant la livraison. Sauvegarde locale.");
        }
      },
      (err) => console.error("Erreur suivi GPS livraison:", err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    watchIdRef.current = id;
  };

  const stopOrderTracking = async () => {
    releaseWakeLock();
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTrackingActive(false);

    if (!orderId) return;

    // 3️⃣ Enregistrer la position d'arrivée finale de la livraison
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const endLoc = { lat: latitude, lng: longitude };
        
        const { data: order } = await supabase
          .from('commandes')
          .select('metadata')
          .eq('id', orderId)
          .single();

        const updatedMetadata = {
          ...(order?.metadata || {}),
          location_end: endLoc,
          delivery_completed_at: new Date().toISOString(),
        };

        await supabase
          .from('commandes')
          .update({ metadata: updatedMetadata })
          .eq('id', orderId);
        
        console.log(`⏹️ [Order Tracking] Suivi GPS arrêté pour la commande ${orderId}`);
      },
      (err) => console.error("Erreur position fin livraison:", err),
      { enableHighAccuracy: true }
    );
  };

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
    startOrderTracking,
    stopOrderTracking,
  };
};
