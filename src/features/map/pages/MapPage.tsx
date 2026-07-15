// 📁 src/features/map/pages/MapPage.tsx
import { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { useLocationStore } from '@/stores/locationStore';
import { useLocation } from '@/hooks/useLocation';
import { RefreshCw } from 'lucide-react';

const MapPage = () => {
  const { locations, activeVisits, activeOrders, isLoading, fetchActiveVisits } = useLocationStore();
  const { position, startWatching } = useLocation();
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  // ✅ INITIALISATION UNIQUE
  useEffect(() => {
    startWatching();
    fetchActiveVisits();
  }, []); // [] garantit que cela ne s'exécute qu'une fois au montage

  return (
    <div className="w-full h-[600px] rounded-3xl overflow-hidden shadow-xl border border-gray-100 relative">
      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <Map
          defaultZoom={14}
          defaultCenter={{ lat: 6.3703, lng: 2.3912 }}
          disableDefaultUI={false}
        >
          {/* Position utilisateur */}
          {position && (
            <AdvancedMarker position={{ lat: position[0], lng: position[1] }}>
              <Pin background={"#2563eb"} glyphColor={"white"} borderColor={"#1e40af"} />
            </AdvancedMarker>
          )}

          {/* Marqueurs Visites */}
          {activeVisits.map((visit: any) => (
            <AdvancedMarker 
              key={visit.id} 
              position={{ lat: visit.patient?.latitude || 6.3703, lng: visit.patient?.longitude || 2.3912 }}
              onClick={() => setSelectedMarker({ type: 'visit', ...visit })}
            >
              <Pin background={"#2196F3"} glyph={"🏠"} />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>

      {/* Bouton manuel de rafraîchissement au lieu de l'intervalle infini */}
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
