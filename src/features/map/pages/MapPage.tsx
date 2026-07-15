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

    // Initialisation avec un style très fiable
    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [2.3830, 6.3905], // Vos coordonnées GPS actuelles
      zoom: 15
    });

    map.current.addControl(new maplibregl.NavigationControl());

    return () => map.current?.remove();
  }, []);

  // Centrage dynamique quand GPS arrive
  useEffect(() => {
    if (position && map.current) {
      map.current.flyTo({ center: [position[1], position[0]], zoom: 15 });
    }
  }, [position]);

  return (
    <div className="w-full h-[600px] rounded-3xl overflow-hidden border border-gray-200 relative">
      {/* Conteneur avec taille forcée */}
      <div 
        ref={mapContainer} 
        className="w-full h-full" 
      />
    </div>
  );
};

export default MapPage;
