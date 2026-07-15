// 📁 src/features/map/pages/MapPage.tsx
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css'; 
import { useLocationStore } from '@/stores/locationStore';
import { useLocation } from '@/hooks/useLocation';

const MapPage = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { fetchActiveVisits } = useLocationStore();
  const { position, startWatching } = useLocation();

  useEffect(() => {
    startWatching();
    fetchActiveVisits();

    // Initialisation
    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [2.3835, 6.3903], // Vos coordonnées GPS actuelles
      zoom: 15
    });

     map.current.on('load', () => {
      map.current?.resize();
    });

    return () => map.current?.remove();
  }, []);

  return (
     <div className="w-full h-[600px] rounded-3xl overflow-hidden shadow-xl border border-gray-100 relative">
      <div 
        ref={mapContainer} 
        className="w-full h-full" 
        style={{ position: 'absolute', top: 0, bottom: 0, width: '100%', height: '100%' }} 
      />
    </div>
  );
};

export default MapPage;
