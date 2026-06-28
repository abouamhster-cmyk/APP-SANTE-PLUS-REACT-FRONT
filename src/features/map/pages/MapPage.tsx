// 📁 src/features/map/pages/MapPage.tsx
 
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
  User,
  Heart,
  Baby,
  AlertCircle,
  Car,
  Footprints,
  X,
  Circle,
  UserCircle,
  Dot,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useLocationStore } from '@/stores/locationStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { supabase } from '@/lib/supabase';
import { Illustration } from '@/components/ui/Illustration';
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

// ✅ Marqueur avec icônes
const makeMarkerIcon = (L: any, color: string, label: string, isPulsing = false, iconType: 'user' | 'patient' | 'aidant' | 'visit' = 'patient') => {
  const getEmoji = () => {
    switch (iconType) {
      case 'user': return '👤';
      case 'patient': return '👤';
      case 'aidant': return '🦸';
      case 'visit': return '📍';
      default: return '📍';
    }
  };

  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${color};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 12px;
        box-shadow: 0 4px 14px rgba(0,0,0,0.15);
        border: 2.5px solid white;
        ${isPulsing ? `animation: pulse-marker 1.5s ease-in-out infinite;` : ''}
      ">
        ${label}
      </div>
      ${isPulsing ? `
        <style>
          @keyframes pulse-marker {
            0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5); }
            70% { box-shadow: 0 0 0 16px rgba(220, 38, 38, 0); }
            100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
          }
        </style>
      ` : ''}
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

// ✅ Composant de légende
const LegendItem = ({ color, label, icon }: { color: string; label: string; icon?: React.ReactNode }) => (
  <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
    {icon ? (
      <span style={{ color }}>{icon}</span>
    ) : (
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
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
      const userIcon = makeMarkerIcon(L, colors.primary, 'Moi', false, 'user');
      L.marker(userLocation, { icon: userIcon })
        .addTo(markersLayer)
        .bindPopup(`
          <div style="min-width:120px; text-align:center;">
            <strong style="color:${colors.primary};">📍 Ma position</strong>
          </div>
        `);
    }

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
            <div style="min-width:150px;">
              <strong>${patient.first_name || ''} ${patient.last_name || ''}</strong>
              <br/>
              <span style="font-size:11px; color:#666;">📍 ${patient.address || ''}</span>
              <br/>
              <span style="font-size:10px; color:#999;">${categoryLabel}</span>
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

        const icon = makeMarkerIcon(L, '#FF9800', 'A', false, 'aidant');
        L.marker([lat, lng], { icon })
          .addTo(markersLayer)
          .bindPopup(`
            <div style="min-width:140px;">
              <strong style="color:#FF9800;">🦸 ${aidant.full_name || 'Aidant'}</strong>
              <br/>
              <span style="font-size:11px; color:#666;">📍 En mission</span>
            </div>
          `);
      });
    }

    if (showActiveVisits) {
      const visitsToShow = getActiveVisitsToShow();
      visitsToShow.forEach((visit: any) => {
        const patient = visit.patient;
        const lat = Number(patient?.latitude || DEFAULT_CENTER[0]);
        const lng = Number(patient?.longitude || DEFAULT_CENTER[1]);
        if (!lat || !lng) return;

        const icon = makeMarkerIcon(L, '#DC2626', 'V', true, 'visit');
        const aidantName = visit.aidant?.user?.full_name || 'Aidant';
        const patientName = patient ? `${patient.first_name || ''} ${patient.last_name || ''}` : 'Patient';

        L.marker([lat, lng], { icon })
          .addTo(markersLayer)
          .bindPopup(`
            <div style="min-width:160px;">
              <strong style="color:#DC2626;">🔴 Visite en cours</strong>
              <br/>
              <span style="font-size:12px;">🧑‍🤝‍🧑 ${patientName}</span>
              <br/>
              <span style="font-size:11px; color:#666;">🦸 ${aidantName}</span>
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

            <h1 className="text-xl font-black flex items-center gap-2" style={{ color: colors.text }}>
              <MapPin size={22} style={{ color: colors.primary }} />
              Carte / Radar
            </h1>

            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              {activeVisits.length} visite(s) en cours
              {isAdmin && <span className="ml-1 text-[10px] text-gray-400">• Admin</span>}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setUserTracking((prev) => {
                  const next = !prev;
                  if (userLocation && next) setCenter(userLocation);
                  return next;
                });
              }}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                userTracking ? 'text-white' : 'text-gray-600'
              }`}
              style={{
                background: userTracking ? colors.primary : 'transparent',
              }}
            >
              <Compass size={16} />
            </button>

            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-lg text-xs font-bold"
              style={{ background: colors.primary + '12', color: colors.primary }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* FILTRES COMPACTS */}
      <section className="bg-white rounded-2xl p-2 shadow-sm border border-black/5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPatients(!showPatients)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
              showPatients ? 'text-white' : 'text-gray-600'
            }`}
            style={{
              background: showPatients ? colors.primary : 'transparent',
            }}
          >
            {showPatients ? <Eye size={12} /> : <EyeOff size={12} />}
            {getPatientLabel()}s
          </button>

          {(isAdmin || isFamilyRole) && (
            <button
              onClick={() => setShowAidants(!showAidants)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                showAidants ? 'text-white' : 'text-gray-600'
              }`}
              style={{
                background: showAidants ? colors.primary : 'transparent',
              }}
            >
              {showAidants ? <Eye size={12} /> : <EyeOff size={12} />}
              Aidants
            </button>
          )}

          <button
            onClick={() => setShowActiveVisits(!showActiveVisits)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
              showActiveVisits ? 'text-white' : 'text-gray-600'
            }`}
            style={{
              background: showActiveVisits ? '#DC2626' : 'transparent',
            }}
          >
            {showActiveVisits ? <Eye size={12} /> : <EyeOff size={12} />}
            Actives
          </button>
        </div>
      </section>

      {/* CARTE */}
      <div className="map-page-shell bg-white rounded-2xl overflow-hidden shadow-sm h-[320px] relative z-0 border border-black/5">
        {!leafletLoaded && !mapError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="text-center p-4">
              <MapPin size={32} className="mx-auto mb-2 opacity-30" style={{ color: colors.primary }} />
              <p className="text-xs text-gray-400">Chargement de la carte...</p>
            </div>
          </div>
        )}

        {mapError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="text-center p-4">
              <AlertCircle size={32} className="mx-auto mb-2 opacity-30" style={{ color: '#EF4444' }} />
              <p className="text-sm font-bold" style={{ color: colors.text }}>{mapError}</p>
              <p className="text-xs text-gray-400">Vérifiez votre connexion internet.</p>
            </div>
          </div>
        )}

        <div ref={mapContainerRef} className="w-full h-full relative z-0" />
      </div>

      {/* ITINÉRAIRE */}
      {selectedPatient && routeInfo && (
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate flex items-center gap-1.5" style={{ color: colors.text }}>
                <User size={14} style={{ color: colors.primary }} />
                {selectedPatient.first_name} {selectedPatient.last_name}
              </p>
              <p className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                <MapPin size={10} />
                {selectedPatient.address || ''}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedPatient(null);
                setRouteInfo(null);
                if (routeLayerRef.current) routeLayerRef.current.clearLayers();
              }}
              className="p-1 rounded-lg hover:bg-gray-100 transition"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="text-center p-2 rounded-lg" style={{ background: colors.primary + '08' }}>
              <Navigation size={16} className="mx-auto mb-0.5" style={{ color: colors.primary }} />
              <p className="text-sm font-bold" style={{ color: colors.primary }}>
                {isLoadingRoute ? '...' : `${routeInfo.distance.toFixed(1)} km`}
              </p>
              <p className="text-[8px] text-gray-400">Distance</p>
            </div>

            <div className="text-center p-2 rounded-lg" style={{ background: colors.primary + '08' }}>
              <Clock size={16} className="mx-auto mb-0.5" style={{ color: colors.primary }} />
              <p className="text-sm font-bold" style={{ color: colors.primary }}>
                {isLoadingRoute ? '...' : `${routeInfo.duration} min`}
              </p>
              <p className="text-[8px] text-gray-400">Temps</p>
            </div>

            <div className="text-center p-2 rounded-lg" style={{ background: colors.primary + '08' }}>
              <Route size={16} className="mx-auto mb-0.5" style={{ color: colors.primary }} />
              <p className="text-sm font-bold" style={{ color: colors.primary }}>
                {routeInfo.distance > 5 ? (
                  <Car size={16} className="mx-auto" />
                ) : (
                  <Footprints size={16} className="mx-auto" />
                )}
              </p>
              <p className="text-[8px] text-gray-400">
                {routeInfo.distance > 5 ? 'Voiture' : 'À pied'}
              </p>
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
            className="w-full mt-2 py-1.5 rounded-lg text-white text-xs font-medium flex items-center justify-center gap-1.5 transition hover:opacity-90"
            style={{ background: colors.primary }}
          >
            <Navigation size={14} />
            Ouvrir l'itinéraire
          </button>
        </div>
      )}

      {/* PROCHES À PROXIMITÉ */}
      {userLocation && getPatientsToShow().length > 0 && (
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
          <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: colors.text }}>
            <Users size={14} style={{ color: colors.primary }} />
            {getNearbyTitle()} ({getPatientsToShow().length})
          </h3>

          <div className="space-y-1.5 max-h-40 overflow-y-auto">
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
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition ${
                    selectedPatient?.id === patient.id
                      ? 'border-2'
                      : 'border hover:bg-gray-50'
                  }`}
                  style={{
                    borderColor: selectedPatient?.id === patient.id ? colors.primary : 'transparent',
                    background: selectedPatient?.id === patient.id ? colors.primary + '05' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
                      style={{ background: hasActiveVisit ? '#DC2626' : colors.primary }}
                    >
                      {patient.first_name?.charAt(0) || 'P'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate flex items-center gap-1" style={{ color: colors.text }}>
                        {patient.first_name} {patient.last_name}
                        {hasActiveVisit && (
                          <span className="text-[8px] text-red-500 flex items-center gap-0.5">
                            <Circle size={6} fill="#DC2626" />
                          </span>
                        )}
                      </p>
                      <p className="text-[8px] text-gray-400 truncate">{patient.address || ''}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold" style={{ color: colors.primary }}>
                      {distance.toFixed(1)} km
                    </p>
                    <p className="text-[8px] text-gray-400">~{calculateEstimatedTime(distance)} min</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* LÉGENDE */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-black/5">
        <div className="flex flex-wrap gap-3 justify-center">
          <LegendItem color="#4CAF50" label={getPatientLabel()} icon={<User size={12} />} />
          {(showAidants && (isAdmin || isFamilyRole)) && (
            <LegendItem color="#FF9800" label="Aidant" icon={<UserCircle size={12} />} />
          )}
          <LegendItem color={colors.primary} label="Ma position" icon={<Dot size={12} />} />
          {showActiveVisits && (
            <LegendItem color="#DC2626" label="Visite en cours" icon={<Circle size={10} fill="#DC2626" />} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPage;
