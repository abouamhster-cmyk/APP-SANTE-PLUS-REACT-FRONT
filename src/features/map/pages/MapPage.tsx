// 📁 src/features/map/pages/MapPage.tsx
 
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useLocationStore } from '@/stores/locationStore';
import { useLocation } from '@/hooks/useLocation';
import { useAuthStore } from '@/stores/authStore';
import { useBranding } from '@/hooks/useBranding';
import { RefreshCw, Locate } from 'lucide-react'; // 💡 Ajout de Locate pour le bouton GPS
import toast from 'react-hot-toast';

// Coordonnées par défaut (Cotonou) pour initialiser la caméra si pas de GPS disponible
const DEFAULT_CENTER: [number, number] = [2.3912, 6.3703];

// Helper pour dessiner des marqueurs HTML "Squircle" modernes
const createHtmlMarker = (emoji: string, color: string) => {
  const el = document.createElement('div');
  el.className = 'custom-checkpoint-marker';
  el.innerHTML = `
    <div style="
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: white;
      border: 2px solid ${color};
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    " onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
      ${emoji}
    </div>
  `;
  return el;
};

const MapPage = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const activeMarkersRef = useRef<maplibregl.Marker[]>([]);
  const hasCenteredRef = useRef(false); // 💡 Verrou pour ne recentrer automatiquement qu'une seule fois au départ

  const brand = useBranding();
  const colors = brand.colors;
  const { locations, activeVisits, activeOrders, isLoading, fetchActiveVisits } = useLocationStore();
  const { position, startWatching } = useLocation();
  const { profile, role } = useAuthStore();

  const isAidantRole = role === 'aidant';

  // 1. Initialisation unique au montage
  useEffect(() => {
    startWatching();
    fetchActiveVisits();

    map.current = new maplibregl.Map({
      container: mapContainer.current!,
      style: 'https://tiles.openfreemap.org/styles/liberty', 
      center: DEFAULT_CENTER,
      zoom: 13,
      dragRotate: true,
      touchZoomRotate: true
    });

    map.current.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.current.on('load', () => {
      map.current?.resize();
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // 💡 Recentrage automatique UNIQUEMENT au premier signal GPS reçu
  useEffect(() => {
    if (position && map.current && !hasCenteredRef.current) {
      map.current.flyTo({ center: [position[1], position[0]], zoom: 14, duration: 1500 });
      hasCenteredRef.current = true;
    }
  }, [position]);

  // 💡 Fonction de recentrage manuel à la demande
  const handleCenterOnMe = () => {
    if (position && map.current) {
      map.current.flyTo({ center: [position[1], position[0]], zoom: 15, duration: 1200 });
      toast.success('Recentré sur votre position GPS 📍');
    } else {
      toast.error('Coordonnées GPS non disponibles pour le moment');
    }
  };

  // Rendu dynamique des Checkpoints GPS réels
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap) return;

    activeMarkersRef.current.forEach(m => m.remove());
    activeMarkersRef.current = [];

    const newMarkersList: maplibregl.Marker[] = [];

    // 1️⃣ Ma position actuelle
    if (position) {
      const el = createHtmlMarker('👤', '#3b82f6');
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([position[1], position[0]])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
          <div style="font-family: sans-serif; padding: 2px;">
            <p style="font-weight: 800; margin: 0; font-size: 11px; color: #1e40af;">👤 Ma position</p>
          </div>
        `))
        .addTo(currentMap);
      newMarkersList.push(marker);
    }

    // 2️⃣ Fiches des bénéficiaires (Patients)
    locations.patients.forEach((patient: any) => {
      const lat = Number(patient.latitude);
      const lng = Number(patient.longitude);
      if (!lat || !lng) return;

      const el = createHtmlMarker('👵', colors.primary);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
          <div style="min-width: 140px; font-family: sans-serif;">
            <p style="font-weight: 800; margin: 0; font-size: 11px; color: ${colors.primary};">👵 Proche accompagné</p>
            <p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px; color: ${colors.text};">${patient.first_name} ${patient.last_name}</p>
            <p style="margin: 3px 0 0 0; font-size: 9px; color: #9ca3af; line-height: 1.2;">📍 ${patient.address || 'Adresse'}</p>
          </div>
        `))
        .addTo(currentMap);
      newMarkersList.push(marker);
    });

    // 3️⃣ Positions de connexion des Foyers Familles
    if (locations.families && locations.families.length > 0) {
      locations.families.forEach((family: any) => {
        const lat = Number(family.latitude);
        const lng = Number(family.longitude);
        if (!lat || !lng) return;

        const el = createHtmlMarker('🏠', '#8b5cf6');
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
            <div style="min-width: 150px; font-family: sans-serif;">
              <p style="font-weight: 800; margin: 0; font-size: 10px; color: #7c3aed; text-transform: uppercase;">🏠 Foyer de confiance</p>
              <p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px; color: ${colors.text};">Famille ${family.full_name}</p>
              <p style="margin: 3.5px 0 0 0; font-size: 10px; color: #4b5563;">📧 ${family.email}</p>
              <p style="margin: 2px 0 0 0; font-size: 9px; color: #9ca3af; line-height: 1.2;">📍 ${family.address}</p>
            </div>
          `))
          .addTo(currentMap);
        newMarkersList.push(marker);
      });
    }

    // 4️⃣ Marqueurs Aidants
    locations.aidants.forEach((aidant: any) => {
      const lat = Number(aidant.latitude);
      const lng = Number(aidant.longitude);
      if (!lat || !lng) return;

      const activeVisit = activeVisits.find((v: any) => v.status === 'en_cours' && (v.aidant_id === aidant.id || v.aidant?.user_id === aidant.id));
      const activeOrder = activeOrders.find((o: any) => o.status === 'en_cours' && (o.aidant_id === aidant.id || o.aidant?.user_id === aidant.id));

      if (activeVisit || activeOrder) {
        return;
      }

      let statusEmoji = '🟢';
      let statusText = 'Disponible (En attente)';
      let statusColor = '#10b981';

      if (aidant.available === false) {
        statusEmoji = '🔴';
        statusText = 'Inactif';
        statusColor = '#ef4444';
      }

      const el = createHtmlMarker(statusEmoji, statusColor);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
          <div style="min-width: 160px; font-family: sans-serif;">
            <p style="font-weight: 800; margin: 0; font-size: 10px; color: ${statusColor}; text-transform: uppercase;">🦸 Intervenant</p>
            <p style="font-weight: 700; margin: 4px 0 0 0; font-size: 12px; color: ${colors.text};">${aidant.full_name}</p>
            <p style="margin: 3.5px 0 0 0; font-size: 10px; color: #4b5563; font-weight: 650;">Statut : ${statusText}</p>
          </div>
        `))
        .addTo(currentMap);
      newMarkersList.push(marker);
    });

    // 5️⃣ Checkpoints de Démarrage (🟢) et d'Arrivée (🏁) des visites actives
    activeVisits.forEach((visit: any) => {
      const targetLabel = visit.target_name || (visit.patient ? `${visit.patient.first_name} ${visit.patient.last_name}` : 'Patient');
      const aidantName = visit.aidant?.user?.full_name || 'Intervenant';
      const isMyVisit = visit.aidant_id === profile?.id || visit.aidant?.user_id === profile?.id;

      if (visit.location_start && typeof visit.location_start === 'object') {
        const lat = Number(visit.location_start.lat);
        const lng = Number(visit.location_start.lng);
        
        if (lat && lng) {
          const el = createHtmlMarker('🟢', '#10B981');
          const titleText = isAidantRole && isMyVisit ? "🚀 Vous avez démarré la visite" : "🚀 Début de l'accompagnement";
          const detailsHtml = isAidantRole && isMyVisit
            ? `<p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px;">Bénéficiaire : ${targetLabel}</p>`
            : `<p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px;">Bénéficiaire : ${targetLabel}</p>
               <p style="margin: 2px 0 0 0; font-size: 10px; color: #6b7280;">Intervenant : ${aidantName}</p>`;

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
              <div style="min-width: 150px; font-family: sans-serif;">
                <p style="font-weight: 800; margin: 0; font-size: 10px; color: #047857; text-transform: uppercase;">${titleText}</p>
                ${detailsHtml}
              </div>
            `))
            .addTo(currentMap);
          newMarkersList.push(marker);
        }
      }

      if (visit.location_end && typeof visit.location_end === 'object') {
        const lat = Number(visit.location_end.lat);
        const lng = Number(visit.location_end.lng);
        
        if (lat && lng) {
          const el = createHtmlMarker('🏁', '#9C27B0');
          const titleText = isAidantRole && isMyVisit ? "🏁 Vous avez terminé la visite" : "🏁 Fin de l'accompagnement";
          const detailsHtml = isAidantRole && isMyVisit
            ? `<p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px;">Bénéficiaire : ${targetLabel}</p>`
            : `<p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px;">Bénéficiaire : ${targetLabel}</p>
               <p style="margin: 2px 0 0 0; font-size: 10px; color: #6b7280;">Intervenant : ${aidantName}</p>`;

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
              <div style="min-width: 150px; font-family: sans-serif;">
                <p style="font-weight: 800; margin: 0; font-size: 10px; color: #7b1fa2; text-transform: uppercase;">${titleText}</p>
                ${detailsHtml}
              </div>
            `))
            .addTo(currentMap);
          newMarkersList.push(marker);
        }
      }
    });

    // 6️⃣ Checkpoints de Prise (📦) et de Livraison (🚚) des commandes actives
    activeOrders.forEach((order: any) => {
      const targetLabel = order.target_name || (order.patient ? `${order.patient.first_name} ${order.patient.last_name}` : 'Bénéficiaire');
      const aidantName = order.aidant?.user?.full_name || 'Livreur';
      const metadataObj = order.metadata || {};
      const isMyOrder = order.aidant_id === profile?.id || order.aidant?.user_id === profile?.id;

      if (metadataObj.location_start && typeof metadataObj.location_start === 'object') {
        const lat = Number(metadataObj.location_start.lat);
        const lng = Number(metadataObj.location_start.lng);

        if (lat && lng) {
          const el = createHtmlMarker('📦', '#F59E0B');
          const titleText = isAidantRole && isMyOrder ? "📦 Vous avez pris en charge la commande" : "📦 Commande prise en charge";
          const detailsHtml = isAidantRole && isMyOrder
            ? `<p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px;">Destinataire : ${targetLabel}</p>`
            : `<p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px;">Livreur : ${aidantName}</p>
               <p style="margin: 2px 0 0 0; font-size: 10px; color: #6b7280;">Destinataire : ${targetLabel}</p>`;

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
              <div style="min-width: 150px; font-family: sans-serif;">
                <p style="font-weight: 800; margin: 0; font-size: 10px; color: #b45309; text-transform: uppercase;">${titleText}</p>
                ${detailsHtml}
              </div>
            `))
            .addTo(currentMap);
          newMarkersList.push(marker);
        }
      }

      if (metadataObj.location_end && typeof metadataObj.location_end === 'object') {
        const lat = Number(metadataObj.location_end.lat);
        const lng = Number(metadataObj.location_end.lng);

        if (lat && lng) {
          const el = createHtmlMarker('🚚', '#2563EB');
          const titleText = isAidantRole && isMyOrder ? "🚚 Vous avez livré la commande" : "🚚 Commande livrée";
          const detailsHtml = isAidantRole && isMyOrder
            ? `<p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px;">Destinataire : ${targetLabel}</p>`
            : `<p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px;">Livreur : ${aidantName}</p>
               <p style="margin: 2px 0 0 0; font-size: 10px; color: #6b7280;">Destinataire : ${targetLabel}</p>`;

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
              <div style="min-width: 150px; font-family: sans-serif;">
                <p style="font-weight: 800; margin: 0; font-size: 10px; color: #1d4ed8; text-transform: uppercase;">${titleText}</p>
                ${detailsHtml}
              </div>
            `))
            .addTo(currentMap);
          newMarkersList.push(marker);
        }
      }
    });

    activeMarkersRef.current = newMarkersList;

  }, [position, locations, activeVisits, activeOrders]);

  return (
    <div 
      className="map-container-wrapper w-full h-[calc(100vh-170px)] min-h-[400px] max-h-[750px] rounded-3xl overflow-hidden shadow-xl border relative" 
      style={{ borderColor: colors.primary + '15' }}
    >
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* BOUTONS FLOTTANTS D'INTERACTION SÉCURISÉS */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2.5 z-10">
        {/* Recentrer sur ma position GPS */}
        <button 
          onClick={handleCenterOnMe}
          className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition border flex items-center justify-center"
          style={{ borderColor: colors.primary + '10' }}
          title="Recentrer sur moi"
        >
          <Locate size={20} style={{ color: colors.primary }} />
        </button>

        {/* Rafraîchir le radar */}
        <button 
          onClick={() => {
            fetchActiveVisits();
            toast.success('Radar de géolocalisation actualisé 📡');
          }}
          className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition border flex items-center justify-center"
          style={{ borderColor: colors.primary + '10' }}
          title="Actualiser la carte"
        >
          <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} style={{ color: colors.primary }} />
        </button>
      </div>
    </div>
  );
};

export default MapPage;
