// 📁 src/features/map/pages/MapPage.tsx
// ✅ PAGE CARTE : INTEGRATION DES DONNÉES RÉELLES (AIDANTS & VISITES)

import { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { useLocationStore } from '@/stores/locationStore';
import { RefreshCw } from 'lucide-react';

const MapPage = () => {
  const { locations, activeVisits, activeOrders, isLoading, fetchActiveVisits } = useLocationStore();
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  // Remplacez par votre Map ID (ou supprimez la prop mapId si vous n'en avez pas encore)
  const MAP_ID = "DEMO_MAP_ID"; 

  useEffect(() => {
    fetchActiveVisits();
    // Rafraîchissement automatique toutes les 30 secondes pour le temps réel
    const interval = setInterval(fetchActiveVisits, 30000);
    return () => clearInterval(interval);
  }, [fetchActiveVisits]);

  return (
    <div className="w-full h-[600px] rounded-3xl overflow-hidden shadow-xl border border-gray-100 relative">
      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <Map
          defaultZoom={13}
          defaultCenter={{ lat: 6.3703, lng: 2.3912 }} // Cotonou
          mapId={MAP_ID}
          disableDefaultUI={false}
        >
          {/* 🦸 AIDANTS (Marqueurs Orange) */}
          {locations.aidants.map((aidant: any) => (
            <AdvancedMarker 
              key={aidant.id} 
              position={{ lat: aidant.latitude, lng: aidant.longitude }}
              onClick={() => setSelectedMarker({ type: 'aidant', ...aidant })}
            >
              <Pin background={"#FF9800"} glyphColor={"white"} borderColor={"#FF9800"} />
            </AdvancedMarker>
          ))}

          {/* 🏠 VISITES (Marqueurs Bleus) */}
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

          {/* 📦 COMMANDES (Marqueurs Jaunes) */}
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

          {/* Info Window dynamique */}
          {selectedMarker && (
            <InfoWindow 
              position={{ 
                lat: selectedMarker.latitude || selectedMarker.patient?.latitude || 6.3703, 
                lng: selectedMarker.longitude || selectedMarker.patient?.longitude || 2.3912 
              }} 
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div className="p-2 text-xs min-w-[150px]">
                <p className="font-bold text-gray-900">
                  {selectedMarker.type === 'aidant' ? selectedMarker.full_name : 
                   selectedMarker.target_name || (selectedMarker.patient?.first_name + ' ' + selectedMarker.patient?.last_name)}
                </p>
                <p className="text-gray-500 mt-1">
                  {selectedMarker.type === 'visit' ? 'Visite active' : 
                   selectedMarker.type === 'order' ? 'Livraison active' : 'Intervenant en route'}
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
