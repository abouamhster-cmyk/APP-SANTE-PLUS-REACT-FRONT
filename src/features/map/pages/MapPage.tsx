// 📁 src/features/map/pages/MapPage.tsx
import { useState, useCallback, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { useLocationStore } from '@/stores/locationStore';
import { useLocation } from '@/hooks/useLocation'; // Votre hook de géolocalisation
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const MapPage = () => {
  const { locations, activeVisits, activeOrders, isLoading, fetchActiveVisits } = useLocationStore();
  const { position, startWatching, permissionStatus } = useLocation(); // ✅ Hook pour demander la position
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  // 1. Démarrer la géolocalisation dès le montage
  useEffect(() => {
    startWatching();
    fetchActiveVisits();
  }, []);

  return (
    <div className="w-full h-[600px] rounded-3xl overflow-hidden shadow-xl border border-gray-100 relative">
      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <Map
          defaultZoom={14}
          defaultCenter={{ 
            lat: position?.[0] || 6.3703, 
            lng: position?.[1] || 2.3912 
          }}
          disableDefaultUI={false}
        >
          {/* ✅ Position de l'utilisateur (bleue) */}
          {position && (
            <AdvancedMarker position={{ lat: position[0], lng: position[1] }}>
              <Pin background={"#2563eb"} glyphColor={"white"} borderColor={"#1e40af"} />
            </AdvancedMarker>
          )}

          {/* 🦸 Aidants */}
          {locations.aidants.map((aidant: any) => (
            <AdvancedMarker 
              key={aidant.id} 
              position={{ lat: aidant.latitude || 6.3703, lng: aidant.longitude || 2.3912 }}
              onClick={() => setSelectedMarker({ type: 'aidant', ...aidant })}
            >
              <Pin background={"#FF9800"} glyphColor={"white"} borderColor={"#FF9800"} />
            </AdvancedMarker>
          ))}

          {/* 🏠 Visites */}
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

      {/* ✅ Indicateur de permission */}
      {permissionStatus === 'denied' && (
        <div className="absolute top-4 left-4 bg-red-500 text-white p-2 rounded-lg text-xs">
          Géolocalisation bloquée par le navigateur.
        </div>
      )}
    </div>
  );
};

export default MapPage;
