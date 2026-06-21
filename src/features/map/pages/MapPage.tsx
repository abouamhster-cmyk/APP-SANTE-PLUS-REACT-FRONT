// 📁 src/features/map/pages/MapPage.tsx
// 📌 Carte / Radar - Visualisation des positions

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

const DEFAULT_CENTER: LatLngTuple = [6.3703, 2.3912]; // Cotonou

// =============================================
// CALCUL DE DISTANCE
// =============================================
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
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
  const timeInHours = distance / avgSpeed;
  const timeInMinutes = Math.round(timeInHours * 60);
  return Math.max(timeInMinutes, 1);
};

// =============================================
// ROUTE OSRM
// =============================================
const getRoute = async (
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
) => {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
    );

    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        coordinates: route.geometry.coordinates,
        distance: route.distance / 1000,
        duration: Math.round(route.duration / 60),
      };
    }

    return null;
  } catch (error) {
    console.error('Erreur récupération itinéraire:', error);
    return null;
  }
};

// =============================================
// MARQUEUR
// =============================================
const makeMarkerIcon = (L: any, color: string, label: string, isPulsing = false) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        width: 34px;
        height: 34px;
        border-radius: 999px;
        background: ${color};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
        box-shadow: 0 10px 22px rgba(0,0,0,.22);
        border: 3px solid white;
        ${isPulsing ? `
          animation: pulse-marker 1.5s ease-in-out infinite;
        ` : ''}
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
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });
};

// =============================================
// COMPOSANT PRINCIPAL
// =============================================
const MapPage = () => {
  const { profile, role, user } = useAuthStore();

  // ✅ Jargon dynamique selon le rôle
  const {
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
    plural,          // "proches" / "personnes accompagnées" / "bénéficiaires"
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

  // ✅ États pour les filtres de la carte
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

  // =============================================
  // CHARGEMENT LEAFLET
  // =============================================
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

  // =============================================
  // RÉCUPÉRATION DES DONNÉES
  // =============================================
  useEffect(() => {
    fetchActiveVisits();
    subscribeToLocations();

    return () => {
      unsubscribeFromLocations();
    };
  }, []);

  // =============================================
  // GÉOLOCALISATION
  // =============================================
  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n’est pas disponible sur ce navigateur');
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
        toast.error('Activez votre géolocalisation pour voir les distances');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000,
      }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);

        if (userTracking) {
          setCenter([latitude, longitude]);
        }
      },
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [userTracking]);

  // =============================================
  // INITIALISATION DE LA CARTE
  // =============================================
  useEffect(() => {
    if (!leafletLoaded) return;
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

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

    setTimeout(() => {
      map.invalidateSize();
    }, 300);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      routeLayerRef.current = null;
    };
  }, [leafletLoaded]);

  // =============================================
  // CENTRAGE DE LA CARTE
  // =============================================
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.setView(center, mapInstanceRef.current.getZoom() || 13, {
      animate: true,
    });
  }, [center]);

  // =============================================
  // AFFICHAGE DES MARQUEURS (FILTRÉS PAR RÔLE)
  // =============================================
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;

    if (!L || !map || !markersLayer) return;

    markersLayer.clearLayers();

    // 1. POSITION DE L'UTILISATEUR
    if (userLocation) {
      const userIcon = makeMarkerIcon(L, colors.primary, 'Moi');
      L.marker(userLocation, { icon: userIcon })
        .addTo(markersLayer)
        .bindPopup('<strong>📍 Ma position</strong>');
    }

    // 2. PROCHES / BÉNÉFICIAIRES - FILTRÉ SELON LE RÔLE
    if (showPatients) {
      const patientsToShow = getPatientsToShow();
      patientsToShow.forEach((patient: any) => {
        const lat = Number(patient.latitude || DEFAULT_CENTER[0]);
        const lng = Number(patient.longitude || DEFAULT_CENTER[1]);

        if (!lat || !lng) return;

        const label = patient.first_name?.charAt(0)?.toUpperCase() || 'P';
        const icon = makeMarkerIcon(L, '#4CAF50', label);

        const categoryLabel = getCategoryLabel(patient.category);

        const marker = L.marker([lat, lng], { icon })
          .addTo(markersLayer)
          .bindPopup(`
            <div style="min-width: 180px;">
              <strong>${patient.first_name || ''} ${patient.last_name || ''}</strong>
              <br/>
              <span style="font-size: 12px; color: #666;">
                📍 ${patient.address || 'Adresse non précisée'}
              </span>
              <br/>
              <span style="font-size: 11px; color: #999;">
                ${categoryLabel}
              </span>
            </div>
          `);

        marker.on('click', () => {
          setSelectedPatient(patient);
        });
      });
    }

    // 3. AIDANTS EN MISSION - UNIQUEMENT POUR ADMIN ET FAMILLE
    if (showAidants && (isAdmin || isFamilyRole)) {
      locations?.aidants?.forEach((aidant: any) => {
        const lat = Number(aidant.latitude || DEFAULT_CENTER[0]);
        const lng = Number(aidant.longitude || DEFAULT_CENTER[1]);

        if (!lat || !lng) return;

        const icon = makeMarkerIcon(L, '#FF9800', 'A');

        L.marker([lat, lng], { icon })
          .addTo(markersLayer)
          .bindPopup(`
            <div style="min-width: 180px;">
              <strong>🦸 ${aidant.full_name || 'Aidant'}</strong>
              <br/>
              <span style="font-size: 12px; color: #666;">
                📍 En mission
              </span>
            </div>
          `);
      });
    }

    // 4. VISITES EN COURS - AVEC ANIMATION POUR TOUS
    if (showActiveVisits) {
      const visitsToShow = getActiveVisitsToShow();
      visitsToShow.forEach((visit: any) => {
        const patient = visit.patient;
        const lat = Number(patient?.latitude || DEFAULT_CENTER[0]);
        const lng = Number(patient?.longitude || DEFAULT_CENTER[1]);

        if (!lat || !lng) return;

        // ✅ Marqueur avec pulsation pour les visites en cours
        const icon = makeMarkerIcon(L, '#FF0000', 'V', true);

        const aidantName = visit.aidant?.user?.full_name || 'Aidant inconnu';
        const patientName = patient ? `${patient.first_name || ''} ${patient.last_name || ''}` : 'Patient';

        L.marker([lat, lng], { icon })
          .addTo(markersLayer)
          .bindPopup(`
            <div style="min-width: 200px;">
              <strong>🔴 Visite en cours</strong>
              <br/>
              <span style="font-size: 13px; color: #333;">
                🧑‍🤝‍🧑 ${patientName}
              </span>
              <br/>
              <span style="font-size: 12px; color: #666;">
                🦸 ${aidantName}
              </span>
              <br/>
              <span style="font-size: 11px; color: #FF5722;">
                ⏱️ Démarrée à ${visit.start_time ? new Date(visit.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
              </span>
            </div>
          `);
      });
    }

  }, [
    leafletLoaded,
    userLocation,
    locations,
    activeVisits,
    colors.primary,
    showPatients,
    showAidants,
    showActiveVisits,
    role,
    profile,
    getCategoryLabel,
  ]);

  // =============================================
  // FILTRAGE DES PATIENTS SELON LE RÔLE
  // =============================================
  const getPatientsToShow = () => {
    if (isAdmin) {
      // ✅ Admin voit TOUS les bénéficiaires
      return locations?.patients || [];
    }

    if (isFamilyRole) {
      // ✅ Famille voit SES proches uniquement
      return locations?.patients || [];
    }

    if (isAidantRole) {
      // ✅ Aidant voit SES personnes accompagnées uniquement
      return locations?.patients?.filter((p: any) => 
        activeVisits.some((v: any) => 
          v.patient_id === p.id && v.aidant_id === profile?.id
        )
      ) || [];
    }

    return [];
  };

  // =============================================
  // FILTRAGE DES VISITES SELON LE RÔLE
  // =============================================
  const getActiveVisitsToShow = () => {
    if (isAdmin) {
      // ✅ Admin voit TOUTES les visites en cours
      return activeVisits || [];
    }

    if (isFamilyRole) {
      // ✅ Famille voit SES visites uniquement
      const familyPatientIds = locations?.patients?.map((p: any) => p.id) || [];
      return activeVisits?.filter((v: any) => 
        familyPatientIds.includes(v.patient_id)
      ) || [];
    }

    if (isAidantRole) {
      // ✅ Aidant voit SES visites uniquement
      return activeVisits?.filter((v: any) => 
        v.aidant_id === profile?.id
      ) || [];
    }

    return [];
  };

  // =============================================
  // CALCUL D'ITINÉRAIRE
  // =============================================
  useEffect(() => {
    const calculateRoute = async () => {
      if (!selectedPatient || !userLocation) return;

      const patientLat = Number(selectedPatient.latitude || DEFAULT_CENTER[0]);
      const patientLng = Number(selectedPatient.longitude || DEFAULT_CENTER[1]);

      setIsLoadingRoute(true);

      try {
        const directDistance = calculateDistance(
          userLocation[0],
          userLocation[1],
          patientLat,
          patientLng
        );

        const route = await getRoute(
          userLocation[0],
          userLocation[1],
          patientLat,
          patientLng
        );

        if (route) {
          setRouteInfo({
            distance: route.distance,
            duration: route.duration,
            coordinates: route.coordinates,
          });
        } else {
          setRouteInfo({
            distance: directDistance,
            duration: calculateEstimatedTime(directDistance),
            coordinates: [],
          });
        }
      } catch (error) {
        console.error('Erreur calcul itinéraire:', error);
        const distance = calculateDistance(
          userLocation[0],
          userLocation[1],
          patientLat,
          patientLng
        );
        setRouteInfo({
          distance,
          duration: calculateEstimatedTime(distance),
          coordinates: [],
        });
      } finally {
        setIsLoadingRoute(false);
      }
    };

    calculateRoute();
  }, [selectedPatient, userLocation]);

  // =============================================
  // AFFICHAGE DE L'ITINÉRAIRE
  // =============================================
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    const routeLayer = routeLayerRef.current;

    if (!L || !map || !routeLayer) return;

    routeLayer.clearLayers();

    if (!selectedPatient || !userLocation || !routeInfo) return;

    const patientLat = Number(selectedPatient.latitude || DEFAULT_CENTER[0]);
    const patientLng = Number(selectedPatient.longitude || DEFAULT_CENTER[1]);

    if (routeInfo.coordinates.length > 0) {
      const latLngs = routeInfo.coordinates.map((coord: any) => [
        coord[1],
        coord[0],
      ]);

      const polyline = L.polyline(latLngs, {
        color: colors.primary,
        weight: 5,
        opacity: 0.85,
      }).addTo(routeLayer);

      map.fitBounds(polyline.getBounds(), {
        padding: [40, 40],
      });
    } else {
      const polyline = L.polyline([userLocation, [patientLat, patientLng]], {
        color: colors.primary,
        weight: 4,
        opacity: 0.7,
        dashArray: '8, 8',
      }).addTo(routeLayer);

      map.fitBounds(polyline.getBounds(), {
        padding: [40, 40],
      });
    }
  }, [selectedPatient, userLocation, routeInfo, colors.primary]);

  // =============================================
  // RAFRAÎCHIR
  // =============================================
  const handleRefresh = async () => {
    await fetchActiveVisits();
    toast.success('Carte actualisée');

    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 200);
    }
  };

  // ✅ Libellé dynamique pour la légende
  const getPatientLabel = () => {
    if (isFamily) return 'Proche';
    if (isAidant) return 'Personne accompagnée';
    if (isAdmin) return 'Bénéficiaire';
    return 'Patient';
  };

  // ✅ Libellé dynamique pour le titre des patients à proximité
  const getNearbyTitle = () => {
    if (isFamily) return 'Mes proches';
    if (isAidant) return 'Mes personnes accompagnées';
    if (isAdmin) return 'Bénéficiaires suivis';
    return 'Patients à proximité';
  };

  // ✅ Message vide pour les patients
  const getEmptyMessage = () => {
    if (isFamily) return 'Aucun proche enregistré';
    if (isAidant) return 'Aucune personne accompagnée assignée';
    if (isAdmin) return 'Aucun bénéficiaire enregistré';
    return 'Aucun patient enregistré';
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
            🗺️ Carte / Radar
          </h1>

          <p className="mt-1" style={{ color: colors.text + '99' }}>
            {activeVisits.length} visite(s) en cours
            {isAdmin && <span className="ml-2 text-xs">• Vue administrateur</span>}
            {isAidantRole && <span className="ml-2 text-xs">• Vue aidant</span>}
            {isFamilyRole && <span className="ml-2 text-xs">• Vue famille</span>}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Filtres */}
          <button
            onClick={() => setShowPatients(!showPatients)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
              showPatients ? 'text-white' : 'text-gray-600'
            }`}
            style={{
              background: showPatients ? colors.primary : colors.primary + '20',
            }}
          >
            {showPatients ? <Eye size={16} /> : <EyeOff size={16} />}
            {getPatientLabel()}s
          </button>

          {(isAdmin || isFamilyRole) && (
            <button
              onClick={() => setShowAidants(!showAidants)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                showAidants ? 'text-white' : 'text-gray-600'
              }`}
              style={{
                background: showAidants ? colors.primary : colors.primary + '20',
              }}
            >
              {showAidants ? <Eye size={16} /> : <EyeOff size={16} />}
              Aidants
            </button>
          )}

          <button
            onClick={() => setShowActiveVisits(!showActiveVisits)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
              showActiveVisits ? 'text-white' : 'text-gray-600'
            }`}
            style={{
              background: showActiveVisits ? '#FF0000' : colors.primary + '20',
            }}
          >
            {showActiveVisits ? <Eye size={16} /> : <EyeOff size={16} />}
            Visites actives
          </button>

          <button
            onClick={() => {
              setUserTracking((prev) => {
                const next = !prev;
                if (userLocation && next) {
                  setCenter(userLocation);
                }
                return next;
              });
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
              userTracking ? 'text-white' : 'text-gray-600'
            }`}
            style={{
              background: userTracking ? colors.primary : colors.primary + '20',
            }}
          >
            <Compass size={16} />
            {userTracking ? 'Suivi' : 'Libre'}
          </button>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition"
            style={{
              background: colors.primary + '20',
              color: colors.primary,
            }}
          >
            <RefreshCw size={16} />
            Actualiser
          </button>
        </div>
      </div>

      {/* CARTE */}
      <div className="map-page-shell bg-white rounded-2xl overflow-hidden shadow-sm h-[450px] relative z-0 border border-black/5">
        {!leafletLoaded && !mapError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="text-center p-8">
              <MapPin size={64} className="mx-auto mb-4 opacity-30" style={{ color: colors.primary }} />
              <h3 className="text-lg font-medium" style={{ color: colors.text }}>
                Chargement de la carte...
              </h3>
              <p className="mt-1" style={{ color: colors.text + '80' }}>
                Préparation de la carte OpenStreetMap
              </p>
            </div>
          </div>
        )}

        {mapError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="text-center p-8">
              <MapPin size={64} className="mx-auto mb-4 opacity-30" style={{ color: colors.primary }} />
              <h3 className="text-lg font-medium" style={{ color: colors.text }}>
                {mapError}
              </h3>
              <p className="mt-1" style={{ color: colors.text + '80' }}>
                Vérifiez votre connexion internet.
              </p>
            </div>
          </div>
        )}

        <div ref={mapContainerRef} className="w-full h-full relative z-0" />
      </div>

      {/* PANEL ITINÉRAIRE */}
      {selectedPatient && routeInfo && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold" style={{ color: colors.text }}>
                {selectedPatient.first_name} {selectedPatient.last_name}
              </h3>
              <p className="text-sm" style={{ color: colors.text + '60' }}>
                {selectedPatient.address || 'Adresse non précisée'}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedPatient(null);
                setRouteInfo(null);
                if (routeLayerRef.current) {
                  routeLayerRef.current.clearLayers();
                }
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center p-3 rounded-xl" style={{ background: colors.primary + '08' }}>
              <Navigation size={20} className="mx-auto mb-1" style={{ color: colors.primary }} />
              <p className="text-sm font-bold" style={{ color: colors.primary }}>
                {isLoadingRoute ? '...' : `${routeInfo.distance.toFixed(1)} km`}
              </p>
              <p className="text-xs text-gray-400">Distance</p>
            </div>

            <div className="text-center p-3 rounded-xl" style={{ background: colors.primary + '08' }}>
              <Clock size={20} className="mx-auto mb-1" style={{ color: colors.primary }} />
              <p className="text-sm font-bold" style={{ color: colors.primary }}>
                {isLoadingRoute ? '...' : `${routeInfo.duration} min`}
              </p>
              <p className="text-xs text-gray-400">Temps</p>
            </div>

            <div className="text-center p-3 rounded-xl" style={{ background: colors.primary + '08' }}>
              <Route size={20} className="mx-auto mb-1" style={{ color: colors.primary }} />
              <p className="text-sm font-bold" style={{ color: colors.primary }}>
                {routeInfo.distance > 5 ? '🚗' : '🚶'}
              </p>
              <p className="text-xs text-gray-400">
                {routeInfo.distance > 5 ? 'Voiture' : 'À pied'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const lat = selectedPatient?.latitude;
              const lng = selectedPatient?.longitude;
              if (lat && lng) {
                const url = `https://www.openstreetmap.org/directions?from=&to=${lat}%2C${lng}`;
                window.open(url, '_blank');
              } else {
                toast.error(`Coordonnées du ${isFamily ? 'proche' : isAidant ? 'personne accompagnée' : 'bénéficiaire'} non disponibles`);
              }
            }}
            className="w-full mt-3 py-3 rounded-xl text-white font-medium transition hover:opacity-80 flex items-center justify-center gap-2"
            style={{ background: colors.primary }}
          >
            <Navigation size={18} />
            Ouvrir l’itinéraire
          </button>
        </div>
      )}

      {/* LÉGENDE */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 justify-center">
          <LegendDot color="#4CAF50" label={getPatientLabel()} />
          {showAidants && (isAdmin || isFamilyRole) && (
            <LegendDot color="#FF9800" label="Aidant en mission" />
          )}
          <LegendDot color={colors.primary} label="Ma position" />
          {showActiveVisits && (
            <LegendDot color="#FF0000" label="🔴 Visite en cours" isPulsing />
          )}
        </div>
      </div>

      {/* VISITES ACTIVES */}
      {showActiveVisits && activeVisits.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-medium mb-3 flex items-center gap-2" style={{ color: colors.text }}>
            <Activity size={18} style={{ color: '#FF0000' }} />
            Visites en cours ({activeVisits.length})
          </h3>

          <div className="space-y-2">
            {getActiveVisitsToShow().map((visit: any) => (
              <div
                key={visit.id}
                className="flex items-center justify-between p-3 rounded-xl border-l-4"
                style={{ 
                  borderLeftColor: '#FF0000',
                  background: colors.primary + '05',
                }}
              >
                <div>
                  <p className="font-medium" style={{ color: colors.text }}>
                    {visit.patient?.first_name} {visit.patient?.last_name}
                  </p>
                  <p className="text-sm" style={{ color: colors.text + '60' }}>
                    🦸 {visit.aidant?.user?.full_name || 'Aidant'}
                  </p>
                  {visit.start_time && (
                    <p className="text-xs" style={{ color: colors.text + '40' }}>
                      ⏱️ Démarrée à {new Date(visit.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-medium text-red-500">En cours</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROCHES / BÉNÉFICIAIRES À PROXIMITÉ */}
      {userLocation && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
          <h3 className="font-medium mb-3 flex items-center gap-2" style={{ color: colors.text }}>
            <Users size={18} />
            {getNearbyTitle()}
            {getPatientsToShow().length > 0 && ` (${getPatientsToShow().length})`}
          </h3>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {getPatientsToShow().map((patient: any) => {
              const patientLat = Number(patient.latitude || DEFAULT_CENTER[0]);
              const patientLng = Number(patient.longitude || DEFAULT_CENTER[1]);

              const distance = calculateDistance(
                userLocation[0],
                userLocation[1],
                patientLat,
                patientLng
              );

              const time = calculateEstimatedTime(distance);

              // ✅ Vérifier si une visite est en cours pour ce patient
              const hasActiveVisit = activeVisits.some((v: any) => 
                v.patient_id === patient.id && v.status === 'en_cours'
              );

              return (
                <button
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition ${
                    selectedPatient?.id === patient.id
                      ? 'border-2'
                      : 'border hover:bg-gray-50'
                  }`}
                  style={{
                    borderColor:
                      selectedPatient?.id === patient.id
                        ? colors.primary
                        : hasActiveVisit 
                          ? '#FF000050' 
                          : 'transparent',
                    background:
                      selectedPatient?.id === patient.id
                        ? colors.primary + '05'
                        : hasActiveVisit
                          ? '#FF000005'
                          : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ 
                        background: hasActiveVisit ? '#FF0000' : colors.primary,
                      }}
                    >
                      {patient.first_name?.charAt(0) || 'P'}
                    </div>

                    <div className="text-left">
                      <p className="font-medium text-sm" style={{ color: colors.text }}>
                        {patient.first_name} {patient.last_name}
                        {hasActiveVisit && (
                          <span className="ml-2 text-xs text-red-500 font-bold">🔴 En cours</span>
                        )}
                      </p>
                      <p className="text-xs" style={{ color: colors.text + '60' }}>
                        📍 {patient.address || 'Adresse non précisée'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: colors.primary }}>
                      {distance.toFixed(1)} km
                    </p>
                    <p className="text-xs" style={{ color: colors.text + '40' }}>
                      ~{time} min
                    </p>
                  </div>
                </button>
              );
            })}

            {getPatientsToShow().length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                {getEmptyMessage()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* DISTANCE TOTALE */}
      {userLocation && getPatientsToShow().length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Route size={20} style={{ color: colors.primary }} />
              <span className="text-sm" style={{ color: colors.text + '60' }}>
                Distance totale pour visiter tous les {getPatientLabel().toLowerCase()}s
              </span>
            </div>

            <span className="font-bold" style={{ color: colors.primary }}>
              {getPatientsToShow()
                .reduce((total: number, p: any) => {
                  return (
                    total +
                    calculateDistance(
                      userLocation[0],
                      userLocation[1],
                      Number(p.latitude || DEFAULT_CENTER[0]),
                      Number(p.longitude || DEFAULT_CENTER[1])
                    )
                  );
                }, 0)
                .toFixed(1)}{' '}
              km
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================
// LÉGENDE DOT
// =============================================
interface LegendDotProps {
  color: string;
  label: string;
  isPulsing?: boolean;
}

const LegendDot = ({ color, label, isPulsing }: LegendDotProps) => {
  return (
    <div className="flex items-center space-x-2">
      <div 
        className={`w-4 h-4 rounded-full ${isPulsing ? 'animate-pulse' : ''}`} 
        style={{ background: color }}
      />
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
};

export default MapPage;