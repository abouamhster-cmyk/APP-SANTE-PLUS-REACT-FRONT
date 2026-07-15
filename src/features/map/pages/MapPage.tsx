// 📁 src/features/map/pages/MapPage.tsx
// ✅ PAGE CARTE : AFFICHAGE DYNAMIQUE ET PERSONNALISÉ SELON LE RÔLE DE L'UTILISATEUR CONNECTÉ

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useLocationStore } from '@/stores/locationStore';
import { useLocation } from '@/hooks/useLocation';
import { useAuthStore } from '@/stores/authStore';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// Coordonnées par défaut (Cotonou)
const DEFAULT_CENTER: [number, number] = [2.3912, 6.3703];

// Helper pour dessiner des marqueurs HTML élégants avec des emojis
const createHtmlMarker = (emoji: string, color: string) => {
  const el = document.createElement('div');
  el.className = 'custom-checkpoint-marker';
  el.innerHTML = `
    <div style="
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: white;
      border: 3px solid ${color};
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      cursor: pointer;
      transition: transform 0.2s;
    " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
      ${emoji}
    </div>
  `;
  return el;
};

const MapPage = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const activeMarkersRef = useRef<maplibregl.Marker[]>([]); // Tracker pour vider proprement les anciens marqueurs

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
      zoom: 13
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      map.current?.resize();
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Centrage automatique sur le GPS de l'appareil
  useEffect(() => {
    if (position && map.current) {
      map.current.flyTo({ center: [position[1], position[0]], zoom: 15 });
    }
  }, [position]);

  // ✅ CALCUL ET RENDU DYNAMIQUE DES CHECKPOINTS GPS SUR LA CARTE
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap) return;

    // A. Supprimer tous les marqueurs précédents de la mémoire
    activeMarkersRef.current.forEach(m => m.remove());
    activeMarkersRef.current = [];

    const newMarkersList: maplibregl.Marker[] = [];

    // 1️⃣ Afficher ma position actuelle (Moi)
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

    // 2️⃣ Afficher les positions des fiches des bénéficiaires (Patients)
    locations.patients.forEach((patient: any) => {
      const lat = Number(patient.latitude);
      const lng = Number(patient.longitude);
      if (!lat || !lng) return;

      const el = createHtmlMarker('👵', '#10b981');
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
          <div style="min-width: 140px; font-family: sans-serif;">
            <p style="font-weight: 800; margin: 0; font-size: 11px; color: #047857;">👵 Proche accompagné</p>
            <p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px; color: #374151;">${patient.first_name} ${patient.last_name}</p>
            <p style="margin: 3px 0 0 0; font-size: 9px; color: #9ca3af; line-height: 1.2;">📍 ${patient.address || 'Adresse'}</p>
          </div>
        `))
        .addTo(currentMap);
      newMarkersList.push(marker);
    });

    // 3️⃣ Afficher les checkpoints de Démarrage et Arrivée des VISITES en cours
    activeVisits.forEach((visit: any) => {
      const targetLabel = visit.target_name || (visit.patient ? `${visit.patient.first_name} ${visit.patient.last_name}` : 'Patient');
      const aidantName = visit.aidant?.user?.full_name || 'Intervenant';
      const isMyVisit = visit.aidant_id === profile?.id || visit.aidant?.user_id === profile?.id;

      // 🟢 Checkpoint Départ (location_start)
      if (visit.location_start && typeof visit.location_start === 'object') {
        const lat = Number(visit.location_start.lat);
        const lng = Number(visit.location_start.lng);
        
        if (lat && lng) {
          const el = createHtmlMarker('🟢', '#10B981');
          
          // ✅ ADAPTATION COMPORTEMENT DU MESSAGE SELON L'AIDANT OU LE CLIENT
          const titleText = isAidantRole && isMyVisit
            ? "🚀 Vous avez démarré la visite"
            : "🚀 Début de l'accompagnement";

          const detailsHtml = isAidantRole && isMyVisit
            ? `<p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px;">Bénéficiaire : ${targetLabel}</p>`
            : `<p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px;">Bénéficiaire : ${targetLabel}</p>
               <p style="margin: 2px 0 0 0; font-size: 10px; color: #6b7280;">Intervenant : ${aidantName}</p>`;

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
              <div style="min-width: 150px; font-family: sans-serif;">
                <p style="font-weight: 800; margin: 0; font-size: 10px; color: #047857; uppercase">${titleText}</p>
                ${detailsHtml}
              </div>
            `))
            .addTo(currentMap);
          newMarkersList.push(marker);
        }
      }

      // 🏁 Checkpoint Arrivée (location_end)
      if (visit.location_end && typeof visit.location_end === 'object') {
        const lat = Number(visit.location_end.lat);
        const lng = Number(visit.location_end.lng);
        
        if (lat && lng) {
          const el = createHtmlMarker('🏁', '#9C27B0');
          
          // ✅ ADAPTATION COMPORTEMENT DU MESSAGE SELON L'AIDANT OU LE CLIENT
          const titleText = isAidantRole && isMyVisit
            ? "🏁 Vous avez terminé la visite"
            : "🏁 Fin de l'accompagnement";

          const detailsHtml = isAidantRole && isMyVisit
            ? `<p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px;">Bénéficiaire : ${targetLabel}</p>`
            : `<p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px;">Bénéficiaire : ${targetLabel}</p>
               <p style="margin: 2px 0 0 0; font-size: 10px; color: #6b7280;">Intervenant : ${aidantName}</p>`;

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
              <div style="min-width: 150px; font-family: sans-serif;">
                <p style="font-weight: 800; margin: 0; font-size: 10px; color: #7b1fa2; uppercase">${titleText}</p>
                ${detailsHtml}
              </div>
            `))
            .addTo(currentMap);
          newMarkersList.push(marker);
        }
      }
    });

    // 4️⃣ Afficher les checkpoints de Prise et Livraison des COMMANDES en cours
    activeOrders.forEach((order: any) => {
      const targetLabel = order.target_name || (order.patient ? `${order.patient.first_name} ${order.patient.last_name}` : 'Bénéficiaire');
      const aidantName = order.aidant?.user?.full_name || 'Livreur';
      const metadataObj = order.metadata || {};
      const isMyOrder = order.aidant_id === profile?.id || order.aidant?.user_id === profile?.id;

      // 📦 Checkpoint Prise (location_start stocké en metadata)
      if (metadataObj.location_start && typeof metadataObj.location_start === 'object') {
        const lat = Number(metadataObj.location_start.lat);
        const lng = Number(metadataObj.location_start.lng);

        if (lat && lng) {
          const el = createHtmlMarker('📦', '#F59E0B');

          // ✅ ADAPTATION COMPORTEMENT DU MESSAGE SELON L'AIDANT OU LE CLIENT
          const titleText = isAidantRole && isMyOrder
            ? "📦 Vous avez pris en charge la commande"
            : "📦 Commande prise en charge";

          const detailsHtml = isAidantRole && isMyOrder
            ? `<p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px;">Destinataire : ${targetLabel}</p>`
            : `<p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px;">Livreur : ${aidantName}</p>
               <p style="margin: 2px 0 0 0; font-size: 10px; color: #6b7280;">Destinataire : ${targetLabel}</p>`;

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
              <div style="min-width: 150px; font-family: sans-serif;">
                <p style="font-weight: 800; margin: 0; font-size: 10px; color: #b45309; uppercase">${titleText}</p>
                ${detailsHtml}
              </div>
            `))
            .addTo(currentMap);
          newMarkersList.push(marker);
        }
      }

      // 🚚 Checkpoint Arrivée (location_end stocké en metadata)
      if (metadataObj.location_end && typeof metadataObj.location_end === 'object') {
        const lat = Number(metadataObj.location_end.lat);
        const lng = Number(metadataObj.location_end.lng);

        if (lat && lng) {
          const el = createHtmlMarker('🚚', '#2563EB');

          // ✅ ADAPTATION COMPORTEMENT DU MESSAGE SELON L'AIDANT OU LE CLIENT
          const titleText = isAidantRole && isMyOrder
            ? "🚚 Vous avez livré la commande"
            : "🚚 Commande livrée";

          const detailsHtml = isAidantRole && isMyOrder
            ? `<p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px;">Destinataire : ${targetLabel}</p>`
            : `<p style="font-weight: 700; margin: 4px 0 0 0; font-size: 11px;">Livreur : ${aidantName}</p>
               <p style="margin: 2px 0 0 0; font-size: 10px; color: #6b7280;">Destinataire : ${targetLabel}</p>`;

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`
              <div style="min-width: 150px; font-family: sans-serif;">
                <p style="font-weight: 800; margin: 0; font-size: 10px; color: #1d4ed8; uppercase">${titleText}</p>
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
    <div className="map-container-wrapper w-full h-[600px] rounded-3xl overflow-hidden shadow-xl border border-gray-100 relative">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Bouton manuel de rafraîchissement */}
      <button 
        onClick={() => {
          fetchActiveVisits();
          toast.success('Positions radar actualisées');
        }}
        className="absolute bottom-6 right-6 p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition z-10"
      >
        <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
      </button>
    </div>
  );
};

export default MapPage;
