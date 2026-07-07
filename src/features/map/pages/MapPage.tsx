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
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useLocationStore } from '@/stores/locationStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate } from '@/utils/helpers';
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

// ✅ Dessin d'un véritable marqueur de carte moderne (Cercle + pointeur vers le bas)
const makeMarkerIcon = (L: any, color: string, label: string, isPulsing = false, iconType: 'user' | 'patient' | 'aidant' | 'visit' = 'patient') => {
  return L.divIcon({
    className: 'custom-map-marker-wrapper',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.18));">
        <div style="
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: ${color};
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 11px;
          border: 2.5px solid white;
          ${isPulsing ? `animation: pulse-marker 1.6s ease-in-out infinite;` : ''}
        ">
          ${label}
        </div>
        <!-- Pointeur triangulaire vers les coordonnées -->
        <div style="
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 7px solid ${color};
          margin-top: -1.5px;
        "></div>
      </div>
      ${isPulsing ? `
        <style>
          @keyframes pulse-marker {
            0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.6); }
            70% { box-shadow: 0 0 0 14px rgba(220, 38, 38, 0); }
            100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
          }
        </style>
      ` : ''}
    `,
    iconSize: [34, 41],
    iconAnchor: [17, 41],
    popupAnchor: [0, -41],
  });
};

const LegendItem = ({ color, label, icon }: { color: string; label: string; icon?: React.ReactNode }) => (
  <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 shadow-sm shrink-0">
    {icon ? (
      <span style={{ color }}>{icon}</span>
    ) : (
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
    )}
    {label}
  </span>
);

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
    activeOrders, // ✅ Destructurer les commandes actives récupérées par le store unifié
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

  // ✅ Marqueurs et Trajectoires temps réel
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;

    if (!L || !map || !markersLayer) return;

    markersLayer.clearLayers();

    // 1️⃣ Ma Position
    if (userLocation) {
      const userIcon = makeMarkerIcon(L, colors.primary, '👤', false, 'user');
      L.marker(userLocation, { icon: userIcon })
        .addTo(markersLayer)
        .bindPopup(`
          <div style="text-align:center; padding: 2px;">
            <strong style="color:${colors.primary}; font-size:12px;">📍 Ma position</strong>
          </div>
        `);
    }

    // 2️⃣ Marqueurs des patients
    if (showPatients) {
      const patientsToShow = getPatientsToShow();
      patientsToShow.forEach((patient: any) => {
        const lat = Number(patient.latitude || DEFAULT_CENTER[0]);
        const lng = Number(patient.longitude || DEFAULT_CENTER[1]);
        if (!lat || !lng) return;

        const label = patient.first_name?.charAt(0)?.toUpperCase() || 'P';
        const icon = makeMarkerIcon(L, '#4CAF50', label, false, 'patient');
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

    // 3️⃣ Marqueurs des aidants actifs
    if (showAidants && (isAdmin || isFamilyRole)) {
      locations?.aidants?.forEach((aidant: any) => {
        const lat = Number(aidant.latitude || DEFAULT_CENTER[0]);
        const lng = Number(aidant.longitude || DEFAULT_CENTER[1]);
        if (!lat || !lng) return;

        const icon = makeMarkerIcon(L, '#FF9800', '🦸', false, 'aidant');
        L.marker([lat, lng], { icon })
          .addTo(markersLayer)
          .bindPopup(`
            <div style="min-width:140px; font-family: sans-serif;">
              <strong style="color:#FF9800; font-size:13px;">🦸 ${aidant.full_name || 'Aidant'}</strong>
              <br/>
              <span style="font-size:11px; color:#666;">📍 En mission</span>
            </div>
          `);
      });
    }

    // 4️⃣ Marqueurs des visites actives ET tracé de trajectoire (Bleu)
    if (showActiveVisits) {
      const visitsToShow = getActiveVisitsToShow();
      visitsToShow.forEach((visit: any) => {
        const patient = visit.patient;
        const lat = Number(patient?.latitude || DEFAULT_CENTER[0]);
        const lng = Number(patient?.longitude || DEFAULT_CENTER[1]);
        if (!lat || !lng) return;

        const icon = makeMarkerIcon(L, '#DC2626', '📍', true, 'visit');
        const aidantName = visit.aidant?.user?.full_name || 'Aidant';
        const patientName = patient ? `${patient.first_name || ''} ${patient.last_name || ''}` : 'Patient';

        L.marker([lat, lng], { icon })
          .addTo(markersLayer)
          .bindPopup(`
            <div style="min-width:160px; font-family: sans-serif; padding:2px;">
              <strong style="color:#DC2626; font-size:13px;">🔴 Visite en cours</strong>
              <div style="margin-top:6px; font-size:11px; color:#555; line-height:1.4;">
                <p style="margin:2px 0;"><strong>Bénéficiaire :</strong> ${patientName}</p>
                <p style="margin:2px 0;"><strong>Intervenant :</strong> ${aidantName}</p>
              </div>
            </div>
          `);

        // ============================================================
        // 🔵 TRACER LA TRAJECTOIRE DE LA VISITE EN TEMPS RÉEL (BLEU)
        // ============================================================
        if (visit.location_track && Array.isArray(visit.location_track) && visit.location_track.length > 1) {
          const latlngs = visit.location_track.map((pt: any) => [pt.lat, pt.lng]);
          
          L.polyline(latlngs, {
            color: '#3B82F6', // Ligne bleue
            weight: 5,
            opacity: 0.85,
            dashArray: '5, 8'
          }).addTo(markersLayer);
          
          const startPt = visit.location_track[0];
          L.circleMarker([startPt.lat, startPt.lng], {
            radius: 6,
            color: '#10B981',
            fillColor: '#10B981',
            fillOpacity: 1,
            weight: 2
          }).addTo(markersLayer).bindPopup("🟢 Point de départ de la visite");
        }
      });
    }

    // 5️⃣ Marqueurs des commandes actives ET tracé de trajectoire (Jaune)
    if (showActiveVisits) {
      activeOrders.forEach((order: any) => {
        const patient = order.patient;
        const lat = Number(patient?.latitude || order.latitude || DEFAULT_CENTER[0]);
        const lng = Number(patient?.longitude || order.longitude || DEFAULT_CENTER[1]);
        if (!lat || !lng) return;

        // Si trajectoire de livraison disponible dans le JSON des metadata
        if (order.metadata?.location_track && Array.isArray(order.metadata.location_track) && order.metadata.location_track.length > 1) {
          const latlngs = order.metadata.location_track.map((pt: any) => [pt.lat, pt.lng]);
          
          // Tracé jaune pointillé pour la livraison de commande
          L.polyline(latlngs, {
            color: '#EAB308', // Ligne jaune
            weight: 5,
            opacity: 0.85,
            dashArray: '5, 8'
          }).addTo(markersLayer);
          
          const startPt = order.metadata.location_track[0];
          L.circleMarker([startPt.lat, startPt.lng], {
            radius: 6,
            color: '#EAB308',
            fillColor: '#EAB308',
            fillOpacity: 1,
            weight: 2
          }).addTo(markersLayer).bindPopup("🟡 Point de départ de la livraison");
        }
      });
    }
  }, [leafletLoaded, userLocation, locations, activeVisits, activeOrders, colors.primary, showPatients, showAidants, showActiveVisits]);

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
    return 'Bénéficiaires à proximité';
  };

  const handleRefresh = async () => {
    await fetchActiveVisits();
    toast.success('Carte actualisée');
    if (mapInstanceRef.current) setTimeout(() => mapInstanceRef.current.invalidateSize(), 200);
  };

  return (
    <div className="w-full max-w-full overflow-hidden space-y-4 pb-24 sm:pb-10">
      
      {/* HEADER PRINCIPAL */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black mb-1.5"
            style={{
              background: colors.primary + '12',
              color: colors.primary,
            }}
          >
            <MapPin size={12} />
            Carte / Radar
          </div>
          <h1 className="text-lg sm:text-xl font-black text-gray-800" style={{ color: colors.text }}>
            Localisation et Radar
          </h1>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
            Suivi en direct de vos {getPatientLabel().toLowerCase()}s et des visites actives.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              setUserTracking((prev) => {
                const next = !prev;
                if (userLocation && next) setCenter(userLocation);
                return next;
              });
            }}
            className={`p-2 rounded-xl text-xs font-bold transition flex items-center justify-center ${
              userTracking ? 'text-white' : 'text-gray-600'
            }`}
            style={{
              background: userTracking ? colors.primary : 'var(--color-background, #f5f0e8)',
            }}
            title={userTracking ? "Suivi GPS actif" : "Suivi GPS désactivé"}
          >
            <Compass size={16} />
          </button>

          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl flex items-center justify-center transition hover:opacity-85"
            style={{ background: colors.primary + '15', color: colors.primary }}
            title="Rafraîchir les positions"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </section>

      {/* DISPOSITION EN GRILLE (MODÈLE DASHBOARD) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 w-full min-w-0">
        
        {/* PANNEAU DE CONTROLE GAUCHE (LETTRES, FILTRES, ITINÉRAIRES) */}
        <div className="md:col-span-4 space-y-4 flex flex-col justify-start">
          
          {/* CARTE FILTRES COMPACTS ET LÉGENDE UNIFIÉE */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">👀 Filtres d'affichage</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setShowPatients(!showPatients)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition flex items-center gap-1.5 ${
                  showPatients ? 'text-white' : 'bg-gray-50 text-gray-500 border hover:bg-gray-100'
                }`}
                style={{
                  background: showPatients ? '#4CAF50' : undefined,
                  borderColor: showPatients ? '#4CAF50' : 'rgba(0,0,0,0.06)',
                }}
              >
                {showPatients ? <Eye size={12} /> : <EyeOff size={12} />}
                {getPatientLabel()}s
              </button>

              {(isAdmin || isFamilyRole) && (
                <button
                  onClick={() => setShowAidants(!showAidants)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition flex items-center gap-1.5 ${
                    showAidants ? 'text-white' : 'bg-gray-50 text-gray-500 border hover:bg-gray-100'
                  }`}
                  style={{
                    background: showAidants ? '#FF9800' : undefined,
                    borderColor: showAidants ? '#FF9800' : 'rgba(0,0,0,0.06)',
                  }}
                >
                  {showAidants ? <Eye size={12} /> : <EyeOff size={12} />}
                  Aidants
                </button>
              )}

              <button
                onClick={() => setShowActiveVisits(!showActiveVisits)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition flex items-center gap-1.5 ${
                  showActiveVisits ? 'text-white' : 'bg-gray-50 text-gray-500 border hover:bg-gray-100'
                }`}
                style={{
                  background: showActiveVisits ? '#DC2626' : undefined,
                  borderColor: showActiveVisits ? '#DC2626' : 'rgba(0,0,0,0.06)',
                }}
              >
                {showActiveVisits ? <Eye size={12} /> : <EyeOff size={12} />}
                Missions en cours
              </button>
            </div>
            
            <div className="border-t pt-3" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Légende</p>
              <div className="flex flex-wrap gap-1.5">
                <LegendItem color="#4CAF50" label={getPatientLabel()} icon={<User size={11} />} />
                {(showAidants && (isAdmin || isFamilyRole)) && (
                  <LegendItem color="#FF9800" label="Aidant" icon={<UserCircle size={11} />} />
                )}
                <LegendItem color={colors.primary} label="Moi" icon={<Dot size={12} />} />
                {showActiveVisits && (
                  <>
                    <LegendItem color="#3B82F6" label="Trajet Visite (Bleu)" icon={<Circle size={8} fill="#3B82F6" />} />
                    <LegendItem color="#EAB308" label="Trajet Livraison (Jaune)" icon={<Circle size={8} fill="#EAB308" />} />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* DÉTAILS DE L'ITINÉRAIRE SÉLECTIONNÉ */}
          {selectedPatient && routeInfo && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-gray-400">📍 Itinéraire actif</p>
                  <p className="text-sm font-black text-gray-800 truncate mt-1 flex items-center gap-1.5">
                    {selectedPatient.first_name} {selectedPatient.last_name}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate mt-0.5">{selectedPatient.address || ''}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedPatient(null);
                    setRouteInfo(null);
                    if (routeLayerRef.current) routeLayerRef.current.clearLayers();
                  }}
                  className="p-1 rounded-lg hover:bg-gray-100 transition shrink-0"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-xl" style={{ background: colors.primary + '08' }}>
                  <Navigation size={16} className="mx-auto mb-1" style={{ color: colors.primary }} />
                  <p className="text-xs font-black" style={{ color: colors.primary }}>
                    {isLoadingRoute ? '...' : `${routeInfo.distance.toFixed(1)} km`}
                  </p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Distance</p>
                </div>

                <div className="text-center p-2 rounded-xl" style={{ background: colors.primary + '08' }}>
                  <Clock size={16} className="mx-auto mb-1" style={{ color: colors.primary }} />
                  <p className="text-xs font-black" style={{ color: colors.primary }}>
                    {isLoadingRoute ? '...' : `${routeInfo.duration} min`}
                  </p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Temps</p>
                </div>

                <div className="text-center p-2 rounded-xl" style={{ background: colors.primary + '08' }}>
                  {routeInfo.distance > 5 ? (
                    <Car size={16} className="mx-auto mb-1" style={{ color: colors.primary }} />
                  ) : (
                    <Footprints size={16} className="mx-auto mb-1" style={{ color: colors.primary }} />
                  )}
                  <p className="text-xs font-black" style={{ color: colors.primary }}>
                    {routeInfo.distance > 5 ? 'Voiture' : 'À pied'}
                  </p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Moyen</p>
                </div>
              </div>

              <button
                onClick={() => {
                  const lat = selectedPatient?.latitude;
                  const lng = selectedPatient?.longitude;
                  if (lat && lng) {
                    window.open(`https://www.openstreetmap.org/directions?from=&to=${lat}%2C${lng}`, '_blank');
                  } else {
                    toast.error('Coordonnées non disponibles');
                  }
                }}
                className="w-full py-2.5 rounded-xl text-white text-xs font-black flex items-center justify-center gap-1.5 transition hover:opacity-90 shadow-sm"
                style={{ background: colors.primary }}
              >
                <Navigation size={14} />
                Ouvrir dans Google Maps / GPS
              </button>
            </div>
          )}

          {/* BÉNÉFICIAIRES À PROXIMITÉ (Si aucun itinéraire sélectionné) */}
          {userLocation && getPatientsToShow().length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <Users size={14} style={{ color: colors.primary }} />
                {getNearbyTitle()} ({getPatientsToShow().length})
              </h3>

              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {getPatientsToShow().slice(0, 5).map((patient: any) => {
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
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl transition ${
                        selectedPatient?.id === patient.id
                          ? 'border-2'
                          : 'border border-gray-100 hover:bg-gray-50'
                      }`}
                      style={{
                        borderColor: selectedPatient?.id === patient.id ? colors.primary : 'transparent',
                        background: selectedPatient?.id === patient.id ? colors.primary + '05' : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: hasActiveVisit ? '#DC2626' : colors.primary }}
                        >
                          {patient.first_name?.charAt(0) || 'P'}
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="text-xs font-black truncate flex items-center gap-1 text-gray-800">
                            {patient.first_name} {patient.last_name}
                          </p>
                          <p className="text-[9px] text-gray-400 truncate mt-0.5">{patient.address || ''}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-black" style={{ color: colors.primary }}>
                          {distance.toFixed(1)} km
                        </p>
                        <p className="text-[9px] text-gray-400">~{calculateEstimatedTime(distance)} min</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* CONTENEUR DE LA CARTE À DROITE (8 Colonnes) */}
        <div className="md:col-span-8">
          <div className="map-page-shell bg-white rounded-3xl overflow-hidden shadow-sm h-[480px] relative z-0 border border-black/5">
            {!leafletLoaded && !mapError && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
                <div className="text-center p-4">
                  <MapPin size={32} className="mx-auto mb-2 opacity-30 animate-bounce" style={{ color: colors.primary }} />
                  <p className="text-xs text-gray-400 font-bold">Initialisation de la carte en cours...</p>
                </div>
              </div>
            )}

            {mapError && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
                <div className="text-center p-4">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-30 text-red-500 animate-pulse" />
                  <p className="text-sm font-bold text-gray-800">{mapError}</p>
                  <p className="text-xs text-gray-400 mt-1">Vérifiez votre connexion internet ou vos permissions GPS.</p>
                </div>
              </div>
            )}

            <div ref={mapContainerRef} className="w-full h-full relative z-0" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default MapPage;
