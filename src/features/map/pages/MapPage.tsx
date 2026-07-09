// 📁 src/features/map/pages/MapPage.tsx
// 📌 Dashboard Cartographique Professionnel avec Suivi GPS de Trajectoire (Double suivi Visites + Commandes)

import { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Navigation,
  Users,
  RefreshCw,
  Compass,
  Route,
  Clock,
  Eye,
  EyeOff,
  User,
  AlertCircle,
  Car,
  Footprints,
  X,
  Circle,
  UserCircle,
  Dot,
  Loader2,
  ShoppingBag,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useLocationStore } from '@/stores/locationStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, cn } from '@/utils/helpers';
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

// ✅ Dessin d'un marqueur circulaire moderne avec ondes GPS pulsatiles (sans distorsion)
const makeMarkerIcon = (L: any, color: string, label: string, isPulsing = false) => {
  return L.divIcon({
    className: 'custom-gps-marker-node',
    html: `
      <div style="position: relative; display: flex; items-center; justify-content: center;">
        ${isPulsing ? `
          <div style="
            position: absolute;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: ${color};
            opacity: 0.25;
            animation: pulse-gps-node 1.6s ease-in-out infinite;
          "></div>
        ` : ''}
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${color};
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 11px;
          border: 2px solid white;
          box-shadow: 0px 4px 10px rgba(0,0,0,0.18);
        ">
          ${label}
        </div>
      </div>
      <style>
        @keyframes pulse-gps-node {
          0% { transform: scale(0.8); opacity: 0.5; }
          70% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      </style>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

const LegendItem = ({ color, label, icon }: { color: string; label: string; icon?: React.ReactNode }) => (
  <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-white/90 dark:bg-gray-800/90 border border-gray-100 dark:border-gray-700 rounded-lg px-2.5 py-1 shadow-sm shrink-0">
    {icon ? (
      <span style={{ color }}>{icon}</span>
    ) : (
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
    )}
    {label}
  </span>
);

const MapPage = () => {
  const { profile, role } = useAuthStore();

  const {
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const {
    locations,
    activeVisits,
    activeOrders, 
    isLoading, // ✅ CORRECTION: Destructuration ajoutée ici pour résoudre les erreurs TS
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
      zoomControl: false, // Désactivé pour utiliser nos contrôles premium flottants
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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

  // ✅ Marqueurs et Trajectoires temps réel
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;

    if (!L || !map || !markersLayer) return;

    markersLayer.clearLayers();

    // 1️⃣ Ma Position (Moi)
    if (userLocation) {
      const userIcon = makeMarkerIcon(L, colors.primary, '👤', false);
      L.marker(userLocation, { icon: userIcon })
        .addTo(markersLayer)
        .bindPopup(`
          <div style="text-align:center; padding: 2px;">
            <strong style="color:${colors.primary}; font-size:12px;">📍 Ma position</strong>
          </div>
        `);
    }

    // 2️⃣ Marqueurs des bénéficiaires (patients)
    if (showPatients) {
      const patientsToShow = getPatientsToShow();
      patientsToShow.forEach((patient: any) => {
        const lat = Number(patient.latitude || DEFAULT_CENTER[0]);
        const lng = Number(patient.longitude || DEFAULT_CENTER[1]);
        if (!lat || !lng) return;

        const label = patient.first_name?.charAt(0)?.toUpperCase() || 'P';
        const icon = makeMarkerIcon(L, '#4CAF50', label, false);
        const categoryLabel = getCategoryLabel(patient.category);

        L.marker([lat, lng], { icon })
          .addTo(markersLayer)
          .bindPopup(`
            <div style="min-width:160px; font-family: sans-serif;">
              <strong style="font-size:13px; color:#333;">${patient.first_name || ''} ${patient.last_name || ''}</strong>
              <br/>
              <span style="font-size:11px; color:#666;">📍 ${patient.address || ''}</span>
              <br/>
              <span style="font-size:10px; color:#888; font-weight:600; display:inline-block; margin-top:4px;">${categoryLabel}</span>
            </div>
          `)
          .on('click', () => setSelectedPatient(patient));
      });
    }

    // 3️⃣ Marqueurs des aidants actifs en mission
    if (showAidants && (isAdmin || isFamilyRole)) {
      locations?.aidants?.forEach((aidant: any) => {
        const lat = Number(aidant.latitude || DEFAULT_CENTER[0]);
        const lng = Number(aidant.longitude || DEFAULT_CENTER[1]);
        if (!lat || !lng) return;

        const icon = makeMarkerIcon(L, '#FF9800', '🦸', false);
        L.marker([lat, lng], { icon })
          .addTo(markersLayer)
          .bindPopup(`
            <div style="min-width:140px; font-family: sans-serif;">
              <strong style="color:#FF9800; font-size:13px;">🦸 ${aidant.full_name || 'Aidant'}</strong>
              <br/>
              <span style="font-size:11px; color:#666;">📍 En déplacement</span>
            </div>
          `);
      });
    }

    // 4️⃣ Marqueurs des VISITES ACTIVES + Trajectoires GPS (Bleu)
    if (showActiveVisits) {
      const visitsToShow = getActiveVisitsToShow();
      visitsToShow.forEach((visit: any) => {
        const patient = visit.patient;
        const lat = Number(patient?.latitude || DEFAULT_CENTER[0]);
        const lng = Number(patient?.longitude || DEFAULT_CENTER[1]);
        if (!lat || !lng) return;

        // ✅ A. Dessiner le point d'arrivée de la Visite (Maison 🏠)
        const destIcon = makeMarkerIcon(L, '#3B82F6', '🏠', false);
        const aidantName = visit.aidant?.user?.full_name || 'Aidant';
        const patientName = visit.target_name || (patient ? `${patient.first_name || ''} ${patient.last_name || ''}` : 'Patient');

        L.marker([lat, lng], { icon: destIcon })
          .addTo(markersLayer)
          .bindPopup(`
            <div style="min-width:160px; font-family: sans-serif; padding:2px;">
              <strong style="color:#3B82F6; font-size:13px;">🏠 Destination Visite</strong>
              <div style="margin-top:6px; font-size:11px; color:#555; line-height:1.4;">
                <p style="margin:2px 0;"><strong>Bénéficiaire :</strong> ${patientName}</p>
                <p style="margin:2px 0;"><strong>Intervenant :</strong> ${aidantName}</p>
              </div>
            </div>
          `);

        // ✅ B. Tracer le chemin GPS parcouru et placer le marqueur en mouvement (🏃)
        if (visit.location_track && Array.isArray(visit.location_track) && visit.location_track.length > 0) {
          const latlngs = visit.location_track.map((pt: any) => [pt.lat, pt.lng]);
          
          // Tracé bleu pointillé
          L.polyline(latlngs, {
            color: '#3B82F6', 
            weight: 5,
            opacity: 0.85,
            dashArray: '5, 8'
          }).addTo(markersLayer);
          
          // Dessiner l'aidant à sa dernière coordonnée en direct
          const lastPoint = visit.location_track[visit.location_track.length - 1];
          const helperIcon = makeMarkerIcon(L, '#3B82F6', '🏃', true);
          L.marker([lastPoint.lat, lastPoint.lng], { icon: helperIcon })
            .addTo(markersLayer)
            .bindPopup(`
              <div style="text-align:center; padding: 2px;">
                <strong style="color:#3B82F6; font-size:11.5px;">🏃 ${aidantName} est en route</strong>
              </div>
            `);
        }
      });
    }

    // 5️⃣ Marqueurs des LIVRAISONS DE COMMANDES ACTIVES + Trajectoires GPS (Jaune/Orange)
    if (showActiveVisits) {
      const ordersToShow = activeOrders || [];
      ordersToShow.forEach((order: any) => {
        const lat = Number(order.latitude || order.patient?.latitude || DEFAULT_CENTER[0]);
        const lng = Number(order.longitude || order.patient?.longitude || DEFAULT_CENTER[1]);
        if (!lat || !lng) return;

        // ✅ A. Dessiner le point de livraison de la Commande (Paquet 📦)
        const destIcon = makeMarkerIcon(L, '#F59E0B', '📦', false);
        const aidantName = order.aidant?.user?.full_name || 'Livreur';
        const patientName = order.target_name || (order.patient ? `${order.patient.first_name || ''} ${order.patient.last_name || ''}` : 'Bénéficiaire');

        L.marker([lat, lng], { icon: destIcon })
          .addTo(markersLayer)
          .bindPopup(`
            <div style="min-width:160px; font-family: sans-serif; padding:2px;">
              <strong style="color:#F59E0B; font-size:13px;">📦 Destination Livraison</strong>
              <div style="margin-top:6px; font-size:11px; color:#555; line-height:1.4;">
                <p style="margin:2px 0;"><strong>Destinataire :</strong> ${patientName}</p>
                <p style="margin:2px 0;"><strong>Livreur :</strong> ${aidantName}</p>
                <p style="margin:2px 0; font-size:10px; color:#888;"><strong>Adresse :</strong> ${order.address || 'non renseignée'}</p>
              </div>
            </div>
          `);

        // ✅ B. Tracer le chemin GPS du livreur et placer le marqueur de déplacement (🚴)
        const track = order.metadata?.location_track;
        if (track && Array.isArray(track) && track.length > 0) {
          const latlngs = track.map((pt: any) => [pt.lat, pt.lng]);
          
          // Tracé jaune/orange pointillé
          L.polyline(latlngs, {
            color: '#F59E0B', 
            weight: 5,
            opacity: 0.85,
            dashArray: '5, 8'
          }).addTo(markersLayer);

          // Dessiner le livreur à son premier point GPS ou dernier point GPS connu
          const lastPoint = track[track.length - 1];
          const driverIcon = makeMarkerIcon(L, '#F59E0B', '🚴', true);
          L.marker([lastPoint.lat, lastPoint.lng], { icon: driverIcon })
            .addTo(markersLayer)
            .bindPopup(`
              <div style="text-align:center; padding: 2px;">
                <strong style="color:#F59E0B; font-size:11.5px;">🚴 ${aidantName} est en cours de livraison</strong>
              </div>
            `);
        }
      });
    }

  }, [leafletLoaded, userLocation, locations, activeVisits, activeOrders, colors.primary, showPatients, showAidants, showActiveVisits]);

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
      weight: 3.5,
      opacity: 0.8,
      dashArray: '6, 8',
    }).addTo(routeLayer);

    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
  }, [selectedPatient, userLocation, routeInfo, colors.primary]);

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
    return 'Bénéficiaires à proximité';
  };

  const handleRefresh = async () => {
    await fetchActiveVisits();
    toast.success('Positions radar actualisées');
    if (mapInstanceRef.current) setTimeout(() => mapInstanceRef.current.invalidateSize(), 200);
  };

  return (
    <div className="w-full max-w-full overflow-hidden pb-6 animate-fadeIn">
      
      {/* ============================================================
          WIDGET CARTOGRAPHIQUE INTÉGRAL SANS DOUBLE BANDEAU
          ============================================================ */}
      <div className="relative w-full h-[580px] sm:h-[650px] rounded-[2rem] overflow-hidden border border-gray-100 dark:border-[#2c3f35]/50 shadow-md">
        
        {/* LEAFLET CONTAINER */}
        <div ref={mapContainerRef} className="w-full h-full relative z-0" />

        {/* ✅ FILTRE CARTOGRAPHIQUE PREMIUM SAAS (ADOUCISSEMENT OPENSTREETMAP) */}
        <style>{`
          .leaflet-tile-pane {
            filter: grayscale(0.88) brightness(0.96) contrast(1.02) sepia(0.04);
          }
          html.dark .leaflet-tile-pane {
            filter: grayscale(0.75) invert(1) brightness(0.85) contrast(1.1);
          }
          .leaflet-container {
            background-color: #f4f0e6 !important;
          }
          html.dark .leaflet-container {
            background-color: #101612 !important;
          }
        `}</style>

        {/* ============================================================
            1️⃣ FLOATER ACTIONS GAUCHE (CONTRÔLE GPS & ACTUALISATION)
            ============================================================ */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div className="p-1.5 bg-white/90 dark:bg-[#17231d]/90 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-lg flex items-center gap-1.5">
            <button
              onClick={() => {
                setUserTracking((prev) => {
                  const next = !prev;
                  if (userLocation && next) setCenter(userLocation);
                  return next;
                });
              }}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                userTracking ? "text-white" : "text-gray-500 hover:bg-gray-100"
              )}
              style={{
                background: userTracking ? colors.primary : 'transparent',
              }}
              title={userTracking ? "Suivi GPS centré" : "Centrer la position"}
            >
              <Compass size={16} className={cn(userTracking ? "animate-pulse" : "")} />
            </button>

            <button
              onClick={handleRefresh}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all"
              title="Actualiser le radar"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>

          {isLoading && (
            <div className="px-3 py-2 rounded-xl bg-white/90 dark:bg-[#17231d]/90 backdrop-blur-md border border-gray-100 dark:border-gray-800/40 shadow-sm flex items-center gap-1.5">
              <Loader2 className="animate-spin text-emerald-600" size={12} />
              <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Calcul GPS...</span>
            </div>
          )}
        </div>

        {/* ============================================================
            2️⃣ FLOATER CALQUES DROITE (TOGGLES FILTRES DISCRETS)
            ============================================================ */}
        <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
          <div className="p-1.5 bg-white/90 dark:bg-[#17231d]/90 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-lg flex flex-col gap-1.5">
            <button
              onClick={() => setShowPatients(!showPatients)}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                showPatients ? "bg-emerald-600 text-white shadow-sm scale-105" : "text-gray-400 hover:bg-gray-100"
              )}
              title={`Afficher les ${getPatientLabel()}s`}
            >
              <Users size={16} />
            </button>

            {(isAdmin || isFamilyRole) && (
              <button
                onClick={() => setShowAidants(!showAidants)}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                  showAidants ? "bg-amber-500 text-white shadow-sm scale-105" : "text-gray-400 hover:bg-gray-100"
                )}
                title="Afficher les intervenants"
              >
                <UserCircle size={16} />
              </button>
            )}

            <button
              onClick={() => setShowActiveVisits(!showActiveVisits)}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                showActiveVisits ? "bg-blue-600 text-white shadow-sm scale-105" : "text-gray-400 hover:bg-gray-100"
              )}
              title="Afficher les trajets de missions actives"
            >
              <Route size={16} />
            </button>
          </div>
        </div>

        {/* ============================================================
            3️⃣ WIDGET D'ITINÉRAIRE (NATIVE BOTTOM SHEET OVERLAY)
            ============================================================ */}
        {selectedPatient && routeInfo && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-[350px] z-10 p-5 bg-white/95 dark:bg-[#17231d]/95 backdrop-blur-md rounded-[2rem] border border-gray-100 dark:border-gray-800/40 shadow-2xl animate-slideUp space-y-4">
            
            {/* Header Drawer */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800/40">
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block">Itinéraire d'accompagnement</span>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white truncate mt-1">
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{selectedPatient.address || 'Quartier non localisé'}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedPatient(null);
                  setRouteInfo(null);
                  if (routeLayerRef.current) routeLayerRef.current.clearLayers();
                }}
                className="w-7 h-7 rounded-full bg-gray-50 dark:bg-gray-800/40 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
              >
                <X size={14} />
              </button>
            </div>

            {/* Metrics d'estimation d'itinéraires */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100/50 dark:border-gray-800/30">
                <Navigation size={14} className="mx-auto mb-1 text-emerald-500" />
                <p className="text-xs font-black text-gray-800 dark:text-gray-100">
                  {isLoadingRoute ? '...' : `${routeInfo.distance.toFixed(1)} km`}
                </p>
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Distance</p>
              </div>

              <div className="text-center p-2 rounded-xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100/50 dark:border-gray-800/30">
                <Clock size={14} className="mx-auto mb-1 text-emerald-500" />
                <p className="text-xs font-black text-gray-800 dark:text-gray-100">
                  {isLoadingRoute ? '...' : `${routeInfo.duration} min`}
                </p>
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Durée</p>
              </div>

              <div className="text-center p-2 rounded-xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100/50 dark:border-gray-800/30">
                {routeInfo.distance > 5 ? (
                  <Car size={14} className="mx-auto mb-1 text-emerald-500" />
                ) : (
                  <Footprints size={14} className="mx-auto mb-1 text-emerald-500" />
                )}
                <p className="text-xs font-black text-gray-800 dark:text-gray-100">
                  {routeInfo.distance > 5 ? 'Voiture' : 'À pied'}
                </p>
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Moyen</p>
              </div>
            </div>

            {/* Google Maps Direction */}
            <button
              onClick={() => {
                const lat = selectedPatient?.latitude;
                const lng = selectedPatient?.longitude;
                if (lat && lng) {
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                } else {
                  toast.error('Coordonnées non disponibles');
                }
              }}
              className="w-full h-10 rounded-xl text-white font-bold text-xs transition-all hover:opacity-90 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/10"
              style={{ background: colors.primary }}
            >
              <Navigation size={13} strokeWidth={2.5} />
              Lancer Google Maps GPS
            </button>
          </div>
        )}

        {/* ============================================================
            4️⃣ FLOATER LISTE / CAROUSEL PROCHES (SI RIEN DE SÉLECTIONNÉ)
            ============================================================ */}
        {!selectedPatient && userLocation && getPatientsToShow().length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-[350px] z-10 p-4 bg-white/95 dark:bg-[#17231d]/95 backdrop-blur-md rounded-[2rem] border border-gray-100 dark:border-gray-800/40 shadow-2xl space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
              <Users size={12} style={{ color: colors.primary }} />
              {getNearbyTitle()} ({getPatientsToShow().length})
            </h3>

            <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1 select-none">
              {getPatientsToShow().slice(0, 4).map((patient: any) => {
                const patientLat = Number(patient.latitude || DEFAULT_CENTER[0]);
                const patientLng = Number(patient.longitude || DEFAULT_CENTER[1]);

                const distance = calculateDistance(
                  userLocation[0],
                  userLocation[1],
                  patientLat,
                  patientLng
                );

                const hasActiveVisit = activeVisits.some((v: any) =>
                  v.patient_id === patient.id && v.status === 'en_cours'
                );

                return (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className="w-full flex items-center justify-between p-2 rounded-xl transition border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                        style={{ background: hasActiveVisit ? '#DC2626' : colors.primary }}
                      >
                        {patient.first_name?.charAt(0) || 'P'}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-bold truncate text-gray-800 dark:text-gray-100">
                          {patient.first_name} {patient.last_name}
                        </p>
                        <p className="text-[9px] text-gray-400 truncate mt-0.5">{patient.address || 'Quartier non renseigné'}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-black" style={{ color: colors.primary }}>
                        {distance.toFixed(1)} km
                      </p>
                      <p className="text-[9px] text-gray-400 mt-0.5">{calculateEstimatedTime(distance)}m estimé</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================
            5️⃣ FLOATER LÉGENDE RADAR SIMPLIFIÉE SUR DESKTOP
            ============================================================ */}
        <div className="absolute bottom-4 right-4 z-10 p-3 bg-white/95 dark:bg-[#17231d]/95 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-lg hidden md:flex flex-col gap-1.5 min-w-[170px]">
          <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Légende active</span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4CAF50]"></span>
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-300">Domicile Proche</span>
            </div>
            {(showAidants && (isAdmin || isFamilyRole)) && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF9800]"></span>
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-300">Auxiliaire en route</span>
              </div>
            )}
            {showActiveVisits && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-blue-500 border border-dashed border-blue-400"></span>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-300">Trajet de visite active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-amber-500 border border-dashed border-amber-400"></span>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-300">Trajet de livraison</span>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* DISCRET LABEL FOOTER */}
      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold text-center tracking-wider uppercase pt-2">
        🟢 Radar temps réel Santé Plus Services — Double canal Domicile & Livraisons actif
      </p>
    </div>
  );
};

export default MapPage;
