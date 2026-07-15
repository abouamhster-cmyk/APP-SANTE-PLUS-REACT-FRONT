// 📁 src/features/map/pages/MapPage.tsx
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useLocationStore } from '@/stores/locationStore';
import { useLocation } from '@/hooks/useLocation';
import { RefreshCw } from 'lucide-react';

const MapPage = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { locations, activeVisits, isLoading, fetchActiveVisits } = useLocationStore();
  const { position, startWatching } = useLocation();

  useEffect(() => {
    startWatching();
    fetchActiveVisits();

    // Initialisation MapLibre (OpenStreetMap)
    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [2.3912, 6.3703], // Longitude, Latitude (Attention: MapLibre inverse)
      zoom: 14
    });

    return () => map.current?.remove();
  }, []);

  // Centrer la carte sur la position GPS réelle
  useEffect(() => {
    if (position && map.current) {
      map.current.flyTo({ center: [position[1], position[0]], zoom: 15 });
    }
  }, [position]);

  return (
    <div className="w-full h-[600px] rounded-3xl overflow-hidden shadow-xl border border-gray-100 relative">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Bouton refresh */}
      <button 
        onClick={() => fetchActiveVisits()}
        className="absolute bottom-6 right-6 p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition z-10"
      >
        <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
      </button>
    </div>
  );
};

export default MapPage;
