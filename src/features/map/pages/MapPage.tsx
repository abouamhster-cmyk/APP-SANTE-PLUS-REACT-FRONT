// 📁 src/features/map/pages/MapPage.tsx
import { useState, useEffect } from 'react';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { useLocationStore } from '@/stores/locationStore';
import { useLocation } from '@/hooks/useLocation';
import { RefreshCw } from 'lucide-react';

const MapPage = () => {
  const { locations, activeVisits, activeOrders, isLoading, fetchActiveVisits } = useLocationStore();
  const { position, startWatching } = useLocation();
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  useEffect(() => {
    startWatching();
    fetchActiveVisits();
  }, [startWatching, fetchActiveVisits]);

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
          {/* ✅ Position utilisateur */}
          {position && (
            <Marker 
              position={{ lat: position[0], lng: position[1] }} 
              title="Ma position"
            />
          )}

          {/* 🦸 Aidants */}
          {locations.aidants.map((aidant: any) => (
            <Marker 
              key={aidant.id} 
              position={{ lat: aidant.latitude || 6.3703, lng: aidant.longitude || 2.3912 }}
              onClick={() => setSelectedMarker({ type: 'aidant', ...aidant })}
              title={aidant.full_name}
            />
          ))}

          {/* 🏠 Visites */}
          {activeVisits.map((visit: any) => (
            <Marker 
              key={visit.id} 
              position={{ 
                lat: visit.patient?.latitude || 6.3703, 
                lng: visit.patient?.longitude || 2.3912 
              }}
              onClick={() => setSelectedMarker({ type: 'visit', ...visit })}
              title={visit.target_name || "Visite"}
            />
          ))}

          {/* Info Window dynamique */}
          {selectedMarker && (
            <InfoWindow 
              position={{ 
                lat: selectedMarker.latitude || selectedMarker.patient?.latitude || 6.3703, 
                lng: selectedMarker.longitude || selectedMarker.patient?.longitude || 2.3912 
              }} 
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div className="p-2 text-xs">
                <p className="font-bold">
                  {selectedMarker.type === 'aidant' ? selectedMarker.full_name : 
                   selectedMarker.target_name || (selectedMarker.patient?.first_name + ' ' + selectedMarker.patient?.last_name)}
                </p>
                <p className="text-gray-500 mt-1">
                  {selectedMarker.type === 'visit' ? 'Visite active' : 'Intervenant'}
                </p>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* Bouton rafraîchir flottant */}
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
