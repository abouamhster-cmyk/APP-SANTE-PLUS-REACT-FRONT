// 📁 src/features/map/pages/MapPage.tsx
// ✅ Version compacte

import { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Navigation,
  Users,
  Activity,
  RefreshCw,
  Compass,
  Route,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useLocationStore } from '@/stores/locationStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type LatLngTuple = [number, number];

const DEFAULT_CENTER: LatLngTuple = [6.3703, 2.3912];

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calculateEstimatedTime = (distance: number): number => {
  const avgSpeed = 15;
  return Math.max(Math.round((distance / avgSpeed) * 60), 1);
};

// ✅ Marqueur plus compact
const makeMarkerIcon = (L: any, color: string, label: string, isPulsing = false) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: ${color};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 11px;
        box-shadow: 0 4px 12px rgba(0,0,0,.2);
        border: 2px solid white;
        ${isPulsing ? `animation: pulse-marker 1.5s ease-in-out infinite;` : ''}
      ">
        ${label}
      </div>
      ${isPulsing ? `
        <style>
          @keyframes pulse-marker {
            0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); }
            70% { box-shadow: 0 0 0 15px rgba(255, 0, 0, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
          }
        </style>
      ` : ''}
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const MapPage = () => {
  const { profile, role, user } = useAuthStore();

  const {
    singular,
    plural,
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const {
    locations,
    activeVisits,
    fetchActiveVisits,
    subscribeToLocations,
    unsubscribeFromLocations,
  } = useLocationStore();

  const [userLocation, setUserLocation] = useState<LatLngTuple | null>(null);
  const [center, setCenter] = useState<LatLngTuple>(DEFAULT_CENTER);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
    coordinates: any[];
  } | null>(null);

  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [userTracking, setUserTracking] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  const [showPatients, setShowPatients] = useState(true);
  const [showAidants, setShowAidants] = useState(true);
  const [showActiveVisits, setShowActiveVisits] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

  const markersLayerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const isAdmin = isAdminOrCoordinator;
  const isAidantRole = isAidant;
  const isFamilyRole = isFamily;

  // ✅ Chargement Leaflet
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');
        leafletRef.current = L;
        setLeafletLoaded(true);
      } catch (error) {
        console.error('❌ Leaflet not available:', error);
        setMapError('Impossible de charger la carte');
      }
    };
    loadLeaflet();
  }, []);

  // ✅ Données
  useEffect(() => {
    fetchActiveVisits();
    subscribeToLocations();
    return () => unsubscribeFromLocations();
  }, []);

  // ✅ Géolocalisation
  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n\'est pas disponible');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
        setCenter([latitude, longitude]);
      },
      () => {
        console.warn('Geolocation not available');
        toast.error('Activez votre géolocalisation');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
        if (userTracking) setCenter([latitude, longitude]);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [userTracking]);

  // ✅ Initialisation de la carte
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = leafletRef.current;
    if (!L) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    setTimeout(() => map.invalidateSize(), 300);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leafletLoaded]);

  // ✅ Centrage
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(center, mapInstanceRef.current.getZoom() || 13, { animate: true });
  }, [center]);

  // ✅ Marqueurs
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;

    if (!L || !map || !markersLayer) return;

    markersLayer.clearLayers();

    if (userLocation) {
      const userIcon = makeMarkerIcon(L, colors.primary, 'Moi');
      L.marker(userLocation, { icon: userIcon })
        .addTo(markersLayer)
        .bindPopup('<strong>📍 Ma position</strong>');
    }

    if (showPatients) {
      const patientsToShow = getPatientsToShow();
      patientsToShow.forEach((patient: any) => {
        const lat = Number(patient.latitude || DEFAULT_CENTER[0]);
        const lng = Number(patient.longitude || DEFAULT_CENTER[1]);
        if (!lat || !lng) return;

        const label = patient.first_name?.charAt(0)?.toUpperCase() || 'P';
        const icon = makeMarkerIcon(L, '#4CAF50', label);
        const categoryLabel = getCategoryLabel(patient.category);

        L.marker([lat, lng], { icon })
          .addTo(markersLayer)
          .bindPopup(`
            <div style="min-width: 150px;">
              <strong>${patient.first_name || ''} ${patient.last_name || ''}</strong>
              <br/>
              <span style="font-size: 11px; color: #666;">📍 ${patient.address || ''}</span>
              <br/>
              <span style="font-size: 10px; color: #999;">${categoryLabel}</span>
            </div>
          `)
          .on('click', () => setSelectedPatient(patient));
      });
    }

    if (showAidants && (isAdmin || isFamilyRole)) {
      locations?.aidants?.forEach((aidant: any) => {
        const lat = Number(aidant.latitude || DEFAULT_CENTER[0]);
        const lng = Number(aidant.longitude || DEFAULT_CENTER[1]);
        if (!lat || !lng) return;

        const icon = makeMarkerIcon(L, '#FF9800', 'A');
        L.marker([lat, lng], { icon })
          .addTo(markersLayer)
          .bindPopup(`<strong>🦸 ${aidant.full_name || 'Aidant'}</strong><br/><span style="font-size: 11px; color: #666;">📍 En mission</span>`);
      });
    }

    if (showActiveVisits) {
      const visitsToShow = getActiveVisitsToShow();
      visitsToShow.forEach((visit: any) => {
        const patient = visit.patient;
        const lat = Number(patient?.latitude || DEFAULT_CENTER[0]);
        const lng = Number(patient?.longitude || DEFAULT_CENTER[1]);
        if (!lat || !lng) return;

        const icon = makeMarkerIcon(L, '#FF0000', 'V', true);
        const aidantName = visit.aidant?.user?.full_name || 'Aidant';
        const patientName = patient ? `${patient.first_name || ''} ${patient.last_name || ''}` : 'Patient';

        L.marker([lat, lng], { icon })
          .addTo(markersLayer)
          .bindPopup(`
            <div style="min-width: 160px;">
              <strong>🔴 Visite en cours</strong>
              <br/>
              <span style="font-size: 12px;">🧑‍🤝‍🧑 ${patientName}</span>
              <br/>
              <span style="font-size: 11px; color: #666;">🦸 ${aidantName}</span>
            </div>
          `);
      });
    }
  }, [leafletLoaded, userLocation, locations, activeVisits, colors.primary, showPatients, showAidants, showActiveVisits]);

  // ✅ Filtrage
  const getPatientsToShow = () => {
    if (isAdmin) return locations?.patients || [];
    if (isFamilyRole) return locations?.patients || [];
    if (isAidantRole) {
      return locations?.patients?.filter((p: any) =>
        activeVisits.some((v: any) => v.patient_id === p.id && v.aidant_id === profile?.id)
      ) || [];
    }
    return [];
  };

  const getActiveVisitsToShow = () => {
    if (isAdmin) return activeVisits || [];
    if (isFamilyRole) {
      const familyPatientIds = locations?.patients?.map((p: any) => p.id) || [];
      return activeVisits?.filter((v: any) => familyPatientIds.includes(v.patient_id)) || [];
    }
    if (isAidantRole) {
      return activeVisits?.filter((v: any) => v.aidant_id === profile?.id) || [];
    }
    return [];
  };

  // ✅ Itinéraire
  useEffect(() => {
    const calculateRoute = async () => {
      if (!selectedPatient || !userLocation) return;

      const patientLat = Number(selectedPatient.latitude || DEFAULT_CENTER[0]);
      const patientLng = Number(selectedPatient.longitude || DEFAULT_CENTER[1]);

      setIsLoadingRoute(true);

      try {
        const directDistance = calculateDistance(userLocation[0], userLocation[1], patientLat, patientLng);
        setRouteInfo({
          distance: directDistance,
          duration: calculateEstimatedTime(directDistance),
          coordinates: [],
        });
      } catch (error) {
        console.error('Erreur calcul itinéraire:', error);
        const distance = calculateDistance(userLocation[0], userLocation[1], patientLat, patientLng);
        setRouteInfo({ distance, duration: calculateEstimatedTime(distance), coordinates: [] });
      } finally {
        setIsLoadingRoute(false);
      }
    };
    calculateRoute();
  }, [selectedPatient, userLocation]);

  // ✅ Affichage itinéraire
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    const routeLayer = routeLayerRef.current;

    if (!L || !map || !routeLayer) return;
    routeLayer.clearLayers();

    if (!selectedPatient || !userLocation || !routeInfo) return;

    const patientLat = Number(selectedPatient.latitude || DEFAULT_CENTER[0]);
    const patientLng = Number(selectedPatient.longitude || DEFAULT_CENTER[1]);

    const polyline = L.polyline([userLocation, [patientLat, patientLng]], {
      color: colors.primary,
      weight: 3,
      opacity: 0.7,
      dashArray: '8, 8',
    }).addTo(routeLayer);

    map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
  }, [selectedPatient, userLocation, routeInfo, colors.primary]);

  // ✅ Libellés dynamiques
  const getPatientLabel = () => {
    if (isFamily) return 'Proche';
    if (isAidant) return 'Personne accompagnée';
    if (isAdmin) return 'Bénéficiaire';
    return 'Patient';
  };

  const getNearbyTitle = () => {
    if (isFamily) return 'Mes proches';
    if (isAidant) return 'Mes personnes accompagnées';
    if (isAdmin) return 'Bénéficiaires suivis';
    return 'Patients à proximité';
  };

  const handleRefresh = async () => {
    await fetchActiveVisits();
    toast.success('Carte actualisée');
    if (mapInstanceRef.current) setTimeout(() => mapInstanceRef.current.invalidateSize(), 200);
  };

  return (
    <div className="space-y-4 pb-24 sm:pb-10">
      {/* HEADER */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-1.5"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <MapPin size={12} />
              Carte / Radar
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              🗺️ Carte / Radar
            </h1>

            <p className="text-xs mt-0.5" style={{ color
