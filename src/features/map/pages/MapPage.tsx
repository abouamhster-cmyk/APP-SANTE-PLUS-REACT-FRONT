// 📁 src/features/map/pages/MapPage.tsx
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useLocationStore } from '@/stores/locationStore';
import { useLocation } from '@/hooks/useLocation';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const MapPage = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { locations, activeVisits, activeOrders, isLoading, fetchActiveVisits } = useLocationStore();
  const { position, startWatching } = useLocation();

  useEffect(() => {
    // 1. Initialiser le suivi GPS et les données
    startWatching();
    fetchActiveVisits();

    // 2. Initialisation de MapLibre
    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [2.3830, 6.3905], // Longitude, Latitude pour Cotonou
      zoom: 14
    });

    // 3. Ajouter les contrôles de navigation
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // 4. Forcer le redimensionnement une fois chargé
    map.current.on('load', () => {
      map.current?.resize();
    });

    return () => map.current?.remove();
  }, [fetchActiveVisits, startWatching]);

  // Centrage dynamique dès réception de la position GPS
  useEffect(() => {
    if (position && map.current) {
      map.current.flyTo({ center: [position[1], position[0]], zoom: 15 });
    }
  }, [position]);

  // Mise à jour des marqueurs quand les données changent
  useEffect(() => {
    if (!map.current) return;

     if (position) {
        new maplibregl.Marker({ color: '#2563eb' })
        .setLngLat([position[1], position[0]])
        .setPopup(new maplibregl.Popup().setText('Votre position'))
        .addTo(map.current);
    }

    // Marqueurs Aidants
    locations.aidants.forEach((a: any) => {
      new maplibregl.Marker({ color: '#FF9800' })
        .setLngLat([a.longitude || 2.39, a.latitude || 6.37])
        .setPopup(new maplibregl.Popup().setText(a.full_name || 'Aidant'))
        .addTo(map.current!);
    });

    // Marqueurs Visites
    activeVisits.forEach((v: any) => {
      new maplibregl.Marker({ color: '#2196F3' })
        .setLngLat([v.patient?.longitude || 2.39, v.patient?.latitude || 6.37])
        .setPopup(new maplibregl.Popup().setText(`Visite: ${v.target_name || 'Patient'}`))
        .addTo(map.current!);
    });

  }, [locations, activeVisits, position]);

  return (
    <div className="map-container-wrapper w-full h-[600px] rounded-3xl overflow-hidden shadow-xl border border-gray-100 relative">
      <div 
        ref={mapContainer} 
        className="w-full h-full" 
      />
      
      {/* Bouton manuel de rafraîchissement */}
      <button 
        onClick={() => {
            fetchActiveVisits();
            toast.success('Radar actualisé');
        }}
        className="absolute bottom-6 right-6 p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition z-10"
      >
        <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
      </button>
    </div>
  );
};

export default MapPage;
