 // 📁 src/features/map/pages/MapPage.tsx
import { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { useLocationStore } from '@/stores/locationStore';
import { useLocation } from '@/hooks/useLocation';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

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
      {/* Vérification de la clé API dans la console via import.meta.env */}
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
              position={{ 
                lat: visit.patient?.latitude || 6.3703, 
                lng: visit.patient?.longitude || 2.3912 
              }}
              onClick={() => setSelectedMarker({ type: 'visit', ...visit })}
            >
              <Pin background={"#2196F3"} glyph={"🏠"} />
            </AdvancedMarker>
          ))}

          {/* 📦 Commandes */}
          {activeOrders.map((order: any) => (
            <AdvancedMarker 
              key={order.id} 
              position={{ 
                lat: order.latitude || order.patient?.latitude || 6.3703, 
                lng: order.longitude || order.patient?.longitude || 2.3912 
              }}
              onClick={() => setSelectedMarker({ type: 'order', ...order })}
            >
              <Pin background={"#F59E0B"} glyph={"📦"} />
            </AdvancedMarker>
          ))}

          {/* Info Window */}
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
                  {selectedMarker.type === 'visit' ? 'Visite active' : 
                   selectedMarker.type === 'order' ? 'Livraison' : 'Intervenant'}
                </p>
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
