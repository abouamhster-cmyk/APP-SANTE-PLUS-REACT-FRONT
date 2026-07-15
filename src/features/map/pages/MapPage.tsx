// 📁 src/features/map/pages/MapPage.tsx
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useLocationStore } from '@/stores/locationStore';
import { RefreshCw } from 'lucide-react';

const MapPage = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { locations, activeVisits, activeOrders, isLoading, fetchActiveVisits } = useLocationStore();

  useEffect(() => {
    fetchActiveVisits();
    
    // Initialisation de la carte
    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: 'https://demotiles.maplibre.org/style.json', // Style gratuit
      center: [2.3912, 6.3703], // Cotonou
      zoom: 13
    });

    return () => map.current?.remove();
  }, []);

  // Mise à jour des marqueurs quand les données changent
  useEffect(() => {
    if (!map.current) return;

    // Ajouter les marqueurs dynamiquement ici (on peut utiliser des .marker() classiques)
    locations.aidants.forEach((a) => {
      new maplibregl.Marker({ color: '#FF9800' })
        .setLngLat([a.longitude, a.latitude])
        .setPopup(new maplibregl.Popup().setText(a.full_name))
        .addTo(map.current!);
    });

    activeVisits.forEach((v) => {
      new maplibregl.Marker({ color: '#2196F3' })
        .setLngLat([v.patient?.longitude || 2.39, v.patient?.latitude || 6.37])
        .setPopup(new maplibregl.Popup().setText('Visite: ' + v.target_name))
        .addTo(map.current!);
    });
  }, [locations, activeVisits, activeOrders]);

  return (
    <div className="relative w-full h-[600px] rounded-3xl overflow-hidden shadow-xl border border-gray-100">
      <div ref={mapContainer} className="w-full h-full" />
      
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
