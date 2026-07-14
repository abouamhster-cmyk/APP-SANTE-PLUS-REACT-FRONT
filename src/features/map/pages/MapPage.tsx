// 📁 src/features/map/pages/MapPage.tsx
import { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { useLocationStore } from '@/stores/locationStore';
import { useAuthStore } from '@/stores/authStore';
import { RefreshCw, MapPin } from 'lucide-react';

const MapPage = () => {
  const { locations, activeVisits, activeOrders, isLoading, fetchActiveVisits } = useLocationStore();
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  // Remplacez par votre MAP_ID dans la console Google Cloud (Style personnalisé)
  const MAP_ID = "c656911226768652"; 

  return (
    <div className="w-full h-[600px] rounded-3xl overflow-hidden shadow-xl border border-gray-100 relative">
      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <Map
          defaultZoom={13}
          defaultCenter={{ lat: 6.3703, lng: 2.3912 }}
          mapId={MAP_ID}
          disableDefaultUI={false}
        >
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

          {/* Info Window */}
          {selectedMarker && (
            <InfoWindow 
              position={{ lat: selectedMarker.latitude || 6.3703, lng: selectedMarker.longitude || 2.3912 }} 
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div className="p-2 text-xs">
                <p className="font-bold">{selectedMarker.target_name || selectedMarker.full_name}</p>
                <p className="text-gray-500">{selectedMarker.type === 'visit' ? 'Visite en cours' : 'Livraison'}</p>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

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
