// 📁 src/features/visits/pages/VisitDetailPage.tsx
 
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  Play,
  Phone,
  Heart,
  AlertCircle,
  Image,
  CreditCard,
  Users,
  UserPlus,
  X,
  Award,
  Clock,
  Bell,
  UserCheck,
  Briefcase,
  Compass,
  Navigation as NavIcon,
} from 'lucide-react';

import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { 
  formatDate, 
  getVisitDisplayName,
  getVisitDisplayAddress,
  getVisitDisplayAidant
} from '@/utils/helpers';

// ✅ IMPORTER LES UTILS DE TRACKING GPS EN DIRECT
import { useVisitTracking } from '@/hooks/useVisitTracking';

// ✅ IMPORTER LES HELPERS DEPUIS CONSTANTS
import {
  getPonctualPrice,
  getVisitStatusForCreation,
  requiresPonctualPayment,
} from '@/lib/constants';

import { CompleteVisitModal } from '@/components/visits/CompleteVisitModal';
import { VisitPaymentModal } from '@/features/visits/components/VisitPaymentModal';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const VisitDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const {
    currentVisit,
    fetchVisitById,
    startVisit,
    completeVisit,
    cancelVisit,
    approveVisit,
    refuseVisit,
    isLoading,
    fetchVisits,
    reassignVisit,
  } = useVisitStore();

  const {
    getCategoryLabel,
    isAidant,
    isAdminOrCoordinator,
    isFamily,
  } = useTerminology();

  const { aidants, fetchAidants, isLoading: aidantsLoading } = useAidantCatalogStore();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // États pour l'assignation d'aidant
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAidantId, setSelectedAidantId] = useState<string>('');
  const [assignmentType, setAssignmentType] = useState<'permanente' | 'temporaire' | 'ponctuelle'>('ponctuelle');

  // ============================================================
  // ✅ ÉTATS & HOOKS DE GÉOLOCALISATION ET CARTOGRAPHIE
  // ============================================================
  const { startVisitTracking, stopVisitTracking, trackingActive, route } = useVisitTracking(id);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    if (id) {
      fetchVisitById(id);
    }
  }, [id]);

  useEffect(() => {
    if (showCompleteModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCompleteModal]);

  // Charger les aidants disponibles quand l'admin ouvre le modal
  useEffect(() => {
    if (showAssignModal) {
      fetchAidants({ onlyAvailable: true });
    }
  }, [showAssignModal, fetchAidants]);

  // ============================================================
  // ✅ CHARGEMENT DYNAMIQUE DE LEAFLET (SANS ERREUR SSR/BUILD)
  // ============================================================
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');
        leafletRef.current = L;
        setLeafletLoaded(true);
      } catch (error) {
        console.error('Erreur de chargement de Leaflet:', error);
      }
    };
    loadLeaflet();
  }, []);

  // ============================================================
  // ✅ AUTO-REPRISE DU SUIVI GPS SI L'AIDANT RAFRAÎCHIT LA PAGE
  // ============================================================
  useEffect(() => {
    if (currentVisit && currentVisit.status === 'en_cours' && isAidant && currentVisit.aidant_id) {
      console.log('🔄 [Suivi GPS] Visite active détectée, réinitialisation du Wake Lock et tracking...');
      startVisitTracking();
    }
    return () => {
      stopVisitTracking();
    };
  }, [currentVisit?.status]);

  // ============================================================
  // ✅ RENDU CARTOGRAPHIQUE EN DIRECT (TRAJECTOIRES ET POINTS)
  // ============================================================
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || !currentVisit) return;
    const L = leafletRef.current;
    if (!L) return;

    const destLat = Number(currentVisit.latitude || currentVisit.patient?.latitude);
    const destLng = Number(currentVisit.longitude || currentVisit.patient?.longitude);

    if (!destLat || !destLng) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [destLat, destLng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const routeLayer = routeLayerRef.current;
    routeLayer.clearLayers();

    // Marqueur de Domicile Cible (Maison 🏠)
    const destIcon = L.divIcon({
      className: 'custom-dest-icon',
      html: `<div style="background:#3B82F6; color:white; width:30px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3)">🏠</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    L.marker([destLat, destLng], { icon: destIcon }).addTo(routeLayer).bindPopup("<b>Lieu de l'intervention</b>");

    // Trajectoire en direct
    const trackPoints = currentVisit.location_track || route || [];
    if (trackPoints.length > 0) {
      const coords = trackPoints.map((p: any) => [p.lat, p.lng]);
      
      // Ligne de tracé pointillée bleue
      L.polyline(coords, {
        color: '#3B82F6',
        weight: 4,
        opacity: 0.8,
        dashArray: '5, 8'
      }).addTo(routeLayer);

      // Marqueur live de l'intervenant (🏃)
      const currentPos = coords[coords.length - 1];
      const helperIcon = L.divIcon({
        className: 'custom-helper-icon',
        html: `<div style="background:#4CAF50; color:white; width:30px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3)">🏃</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      L.marker(currentPos, { icon: helperIcon }).addTo(routeLayer).bindPopup("<b>Position en direct</b>");

      // Auto-zoom adaptatif contenant le trajet
      map.fitBounds(L.polyline([currentPos, [destLat, destLng]]).getBounds(), { padding: [40, 40] });
    } else {
      map.setView([destLat, destLng], 14);
    }
  }, [leafletLoaded, currentVisit, route]);

  // =============================================
  // ✅ OUVERTURE DU MODAL DE PAIEMENT
  // =============================================
  const handleOpenPayment = () => {
    if (!currentVisit) return;
    if (currentVisit.status === 'brouillon' && currentVisit.metadata?.requires_payment) {
      setShowPaymentModal(true);
    }
  };

  // =============================================
  // ✅ SUCCÈS DU PAIEMENT - UN SEUL TOAST
  // =============================================
  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    toast.success('✅ Visite planifiée après paiement !');
    if (id) {
      useVisitStore.getState().invalidateCache();
      fetchVisitById(id);
      fetchVisits();
    }
  };

  // =============================================
  // ✅ APPROUVER UNE VISITE - UN SEUL TOAST
  // =============================================
  const handleApprove = async () => {
    if (!id) return;
    setIsUpdating(true);
    try {
      await approveVisit(id);
      toast.success('✅ Visite approuvée');
      useVisitStore.getState().invalidateCache();
      await fetchVisitById(id);
      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur approbation:', error);
      toast.error(error.message || 'Erreur lors de l\'approbation');
    } finally {
      setIsUpdating(false);
    }
  };

  // =============================================
  // ✅ REFUSER UNE VISITE - UN SEUL TOAST
  // =============================================
  const handleRefuse = async () => {
    if (!id) return;
    const reason = prompt('Motif du refus :');
    if (!reason) return;

    setIsUpdating(true);
    try {
      await refuseVisit(id, reason);
      toast.error('❌ Visite refusée');
      useVisitStore.getState().invalidateCache();
      await fetchVisitById(id);
      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur refus:', error);
      toast.error(error.message || 'Erreur lors du refus');
    } finally {
      setIsUpdating(false);
    }
  };

  // =============================================
  // ✅ DÉMARRER UNE VISITE - UN SEUL TOAST & TRACKING ACQUISITION
  // =============================================
  const handleStart = async () => {
    setIsUpdating(true);
    try {
      await startVisit(id!);
      await startVisitTracking(); // ✅ Déclenchement de l'écriture GPS et Wake Lock
      toast.success('🚀 Visite démarrée et liaison GPS activée !');
      useVisitStore.getState().invalidateCache();
      await fetchVisitById(id!);
      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur démarrage:', error);
      toast.error(error.message || 'Erreur lors du démarrage');
    } finally {
      setIsUpdating(false);
    }
  };

  // =============================================
  // ✅ TERMINER UNE VISITE - UN SEUL TOAST & ARRÊT GPS
  // =============================================
  const handleComplete = async (data: {
    actions: string[];
    notes: string;
    audio_url?: string;
    photos: string[];
  }) => {
    const actions = data?.actions || [];
    const notes = data?.notes || '';
    const photoUrls = data?.photos || [];

    if (actions.length === 0) {
      toast.error('Veuillez sélectionner au moins une action');
      return;
    }

    setIsUploading(true);

    try {
      await completeVisit(id!, {
        actions,
        notes,
        photos: photoUrls,
      });

      if (data?.audio_url) {
        await supabase
          .from('visites')
          .update({
            metadata: {
              audio_url: data.audio_url,
              photos: photoUrls,
              actions,
              notes,
            }
          })
          .eq('id', id);
      }

      await stopVisitTracking(); // ✅ Arrêt propre du Wake Lock et tracking
      toast.success('✅ Visite terminée avec succès !');
      setShowCompleteModal(false);
      useVisitStore.getState().invalidateCache();
      await fetchVisitById(id!);
      await fetchVisits();
    } catch (error) {
      console.error('❌ Erreur finalisation:', error);
      toast.error('Erreur lors de la finalisation');
    } finally {
      setIsUploading(false);
    }
  };

  // =============================================
  // ✅ ANNULER UNE VISITE - UN SEUL TOAST
  // =============================================
  const handleCancel = async () => {
    if (window.confirm('Annuler cette visite ?')) {
      setIsUpdating(true);
      try {
        await cancelVisit(id!);
        toast.success('Visite annulée');
        useVisitStore.getState().invalidateCache();
        await fetchVisitById(id!);
        await fetchVisits();
      } catch (error: any) {
        console.error('❌ Erreur annulation:', error);
        toast.error(error.message || 'Erreur lors de l\'annulation');
      } finally {
        setIsUpdating(false);
      }
    }
  };

  // =============================================
  // ✅ ASSIGNER UN AIDANT - UN SEUL TOAST
  // =============================================
  const handleAssignAidant = async () => {
    if (!selectedAidantId) {
      toast.error('Veuillez sélectionner un aidant');
      return;
    }

    setIsUpdating(true);
    try {
      await reassignVisit(id!, selectedAidantId, assignmentType);
      toast.success(`✅ Aidant assigné avec succès (${assignmentType})`);
      setShowAssignModal(false);
      setSelectedAidantId('');
      useVisitStore.getState().invalidateCache();
      await fetchVisitById(id!);
      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur assignation:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation');
    } finally {
      setIsUpdating(false);
    }
  };

  // =============================================
  // ✅ FONCTIONS D'AFFICHAGE
  // =============================================
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      planifiee: '#4CAF50',
      en_attente: '#FF9800',
      acceptee: '#2196F3',
      en_cours: '#2196F3',
      terminee: '#9C27B0',
      validee: '#4CAF50',
      annulee: '#F44336',
      refusee: '#F44336',
      expire: '#795548',
      replanifiee: '#FF5722',
      no_show: '#795548',
      attente_paiement: '#8b5cf6',
      brouillon: '#F59E0B',
    };
    return statusColors[status] || '#9E9E9E';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planifiee: 'Planifiée',
      en_attente: 'En attente',
      acceptee: 'Acceptée',
      en_cours: 'En cours',
      terminee: 'Terminée',
      validee: 'Validée',
      annulee: 'Annulée',
      refusee: 'Refusée',
      expire: 'Expirée',
      replanifiee: 'Replanifiée',
      no_show: 'Absent',
      attente_paiement: 'Paiement en attente',
      brouillon: '💳 Paiement requis',
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planifiee': return <Calendar size={13} />;
      case 'en_attente': return <AlertCircle size={13} />;
      case 'acceptee': return <CheckCircle size={13} />;
      case 'en_cours': return <Play size={13} />;
      case 'terminee': return <CheckCircle size={13} />;
      case 'validee': return <CheckCircle size={13} />;
      case 'annulee': return <XCircle size={13} />;
      case 'refusee': return <XCircle size={13} />;
      case 'expire': return <AlertCircle size={13} />;
      case 'attente_paiement': return <CreditCard size={13} />;
      case 'brouillon': return <CreditCard size={13} />;
      default: return <AlertCircle size={13} />;
    }
  };

  const getDraftExpiryText = () => {
    if (!currentVisit?.draft_expires_at) return null;
    const expiry = new Date(currentVisit.draft_expires_at);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    if (diff <= 0) return 'Expiré';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  const getAidantDisplayStatus = () => {
    const aidantName = currentVisit?.aidant?.user?.full_name || 'Non assigné';
    
    if (isAidant) {
      return {
        label: 'Moi',
        sub: `${profile?.full_name || 'Vous'} • ${currentVisit?.aidant?.rating || 0} ⭐ • ${currentVisit?.aidant?.total_missions || 0} missions`,
        color: colors.primary,
        icon: <UserCheck size={15} />
      };
    }
    
    if (currentVisit?.aidant) {
      return {
        label: aidantName,
        sub: `${currentVisit.aidant.rating || 0} ⭐ • ${currentVisit.aidant.total_missions || 0} missions`,
        color: colors.primary,
        icon: <Heart size={15} />
      };
    }
    
    if (currentVisit?.aidant_id) {
      return {
        label: 'En attente de validation',
        sub: `⏳ ${aidantName} doit approuver la visite`,
        color: '#FF9800',
        icon: <Clock size={15} />
      };
    }
    
    return {
      label: 'Non assigné',
      sub: 'En attente d\'assignation',
      color: '#FF5722',
      icon: <User size={15} />
    };
  };

  const isDraft = currentVisit?.status === 'brouillon';
  const isPendingApproval = currentVisit?.status === 'planifiee' || currentVisit?.status === 'en_attente';
  const isAccepted = currentVisit?.status === 'acceptee';
  const isInProgress = currentVisit?.status === 'en_cours';
  const isCompleted = currentVisit?.status === 'terminee';
  const isExpired = currentVisit?.status === 'expire';
  const isRefused = currentVisit?.status === 'refusee';
  const hasNoAidant = !currentVisit?.aidant_id;
  
  const isOwner = currentVisit?.user_id === profile?.id;
  const requiresPayment = isDraft && currentVisit?.metadata?.requires_payment && isOwner;
  const canAssignAidant = isAdminOrCoordinator && (hasNoAidant || isExpired || isRefused);

  const aidantStatus = getAidantDisplayStatus();
  const draftExpiry = getDraftExpiryText();
  const paymentAmount = currentVisit?.metadata?.payment_amount || getPonctualPrice(currentVisit?.duration_minutes || 60);

  if (isLoading || !currentVisit) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500">Chargement des détails...</p>
        </div>
      </div>
    );
  }

  const visit = currentVisit;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 pb-12 px-4 sm:px-6">
      
      {/* ============================================================
      EN-TÊTE DE LA PAGE
      ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: colors.border }}>
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-100 rounded-xl transition flex-shrink-0"
          >
            <ArrowLeft size={20} style={{ color: colors.text }} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold truncate" style={{ color: colors.text }}>
              Visite du {formatDate(visit.scheduled_date)}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 shrink-0"
                style={{
                  background: getStatusColor(visit.status) + '15',
                  color: getStatusColor(visit.status),
                }}
              >
                {getStatusIcon(visit.status)}
                <span>{getStatusLabel(visit.status)}</span>
              </span>
              {visit.is_urgent && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 shrink-0"
                  style={{ background: '#F44336' + '15', color: '#F44336' }}
                >
                  <AlertCircle size={11} />
                  <span>Urgent</span>
                </span>
              )}
              <span className="text-[10px] text-gray-400 font-mono">
                #{visit.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        {/* ACTIONS STATUTS */}
        <div className="flex flex-wrap gap-1.5">
          {isPendingApproval && isAidant && (
            <>
              <button
                onClick={handleApprove}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
                style={{ background: '#4CAF50' }}
              >
                <CheckCircle size={14} />
                <span>Approuver</span>
              </button>
              <button
                onClick={handleRefuse}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
                style={{ background: '#F44336' }}
              >
                <XCircle size={14} />
                <span>Refuser</span>
              </button>
            </>
          )}

          {isAccepted && isAidant && (
            <button
              onClick={handleStart}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ background: '#4CAF50' }}
            >
              <Play size={14} />
              <span>Démarrer</span>
            </button>
          )}

          {isInProgress && isAidant && (
            <button
              onClick={() => setShowCompleteModal(true)}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ background: '#2196F3' }}
            >
              <CheckCircle size={14} />
              <span>Terminer</span>
            </button>
          )}

          {(isPendingApproval || isAccepted) && (isAdminOrCoordinator || isFamily) && (
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ background: '#F44336' }}
            >
              <XCircle size={14} />
              <span>Annuler</span>
            </button>
          )}

          {isCompleted && isAdminOrCoordinator && (
            <button
              onClick={async () => {
                try {
                  await supabase.from('visites').update({ status: 'validee' }).eq('id', id);
                  toast.success('✅ Visite validée');
                  useVisitStore.getState().invalidateCache();
                  await fetchVisitById(id!);
                  await fetchVisits();
                } catch (error: any) {
                  console.error('❌ Erreur validation:', error);
                  toast.error(error.message || 'Erreur lors de la validation');
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold transition hover:opacity-90"
              style={{ background: '#9C27B0' }}
            >
              <CheckCircle size={14} />
              <span>Valider</span>
            </button>
          )}

          {canAssignAidant && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold transition hover:opacity-90"
              style={{ background: '#FF5722' }}
            >
              <UserPlus size={14} />
              <span>Assigner un aidant</span>
            </button>
          )}

          {(isExpired || isRefused) && isAdminOrCoordinator && (
            <button
              onClick={() => {
                const newAidantId = prompt('ID du nouvel aidant :');
                if (!newAidantId) return;
                toast('Réassignation à implémenter', { icon: 'ℹ️' });
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold transition hover:opacity-90"
              style={{ background: '#FF5722' }}
            >
              <AlertCircle size={14} />
              <span>Réassigner</span>
            </button>
          )}
        </div>
      </div>

      {/* BANDEAU D'INFORMATION AIDANT */}
      {isAidant && visit.aidant_id && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <UserCheck size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-blue-800">✅ Vous êtes assigné à cette visite</p>
              <p className="text-sm text-blue-600">
                {visit.status === 'planifiee' 
                  ? '👆 Approuvez cette visite pour confirmer votre présence.' 
                  : visit.status === 'acceptee' 
                    ? '✅ La visite est confirmée. Préparez-vous à intervenir.' 
                    : visit.status === 'en_cours'
                      ? '🔄 Vous êtes actuellement en visite.'
                      : '📋 Visite en cours de traitement.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* BANDEAU DE PAIEMENT */}
      {requiresPayment && (
        <div 
          className="rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={{ 
            background: colors.primary + '08',
            borderColor: colors.primary + '20',
          }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div 
              className="p-2 rounded-xl shrink-0"
              style={{ 
                background: colors.primary + '15',
                color: colors.primary,
              }}
            >
              <CreditCard size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold" style={{ color: colors.text }}>
                💳 Paiement requis pour valider la visite
              </p>
              <p className="text-[11px] font-medium mt-0.5 flex flex-wrap items-center gap-1" style={{ color: colors.text + '70' }}>
                <span>Montant : <strong style={{ color: colors.primary }}>{paymentAmount.toLocaleString()} FCFA</strong></span>
                <span>•</span>
                <span>{draftExpiry ? `Expire dans : ${draftExpiry}` : 'Expire bientôt'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenPayment}
            className="w-full sm:w-auto px-5 py-2 rounded-xl text-white font-bold text-xs transition hover:opacity-90 shadow-sm text-center shrink-0"
            style={{ background: colors.primary }}
          >
            Payer maintenant
          </button>
        </div>
      )}

      {/* ============================================================
      ✅ NEW : BANDEAU CARTO DE TÉLÉSUIVI EN DIRECT (SI VISITE EN COURS)
      ============================================================ */}
      {visit.status === 'en_cours' && (
        <div className="bg-white rounded-3xl p-5 border border-blue-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-1 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Suivi GPS Actif
              </span>
              <h3 className="text-base font-black text-gray-800 mt-1">Intervenant en déplacement</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {isAidant 
                  ? '🔒 Gardez votre écran allumé. Votre itinéraire est partagé en direct avec la famille.' 
                  : '📍 Suivez la progression de l’auxiliaire vers le domicile du proche.'}
              </p>
            </div>

            <div className="bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100/50 text-center">
              <Compass size={18} className="mx-auto text-blue-500 animate-spin" style={{ animationDuration: '8s' }} />
              <p className="text-xs text-blue-600 font-extrabold mt-1.5">Liaison Satellite Sécurisée</p>
            </div>

            <button
              onClick={() => {
                const lat = visit.latitude || visit.patient?.latitude;
                const lng = visit.longitude || visit.patient?.longitude;
                if (lat && lng) {
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                } else {
                  toast.error('Coordonnées non disponibles');
                }
              }}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-900/10"
            >
              <NavIcon size={14} />
              Ouvrir l'itinéraire GPS
            </button>
          </div>

          <div className="md:col-span-2 relative h-[250px] md:h-full min-h-[220px] rounded-2xl overflow-hidden border border-gray-100">
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>
        </div>
      )}

      {/* ============================================================
      GRID LAYOUT PRINCIPAL
      ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* COLONNE DE GAUCHE : Compte-rendu et Informations (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* CARTES D'INFORMATIONS RAPIDES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoCard
              icon={<User size={15} />}
              label="Bénéficiaire"
              value={getVisitDisplayName(visit)}
              sub={getCategoryLabel(visit.patient?.category || 'senior')}
              color={colors.text}
            />
            <InfoCard
              icon={<Calendar size={15} />}
              label="Planification"
              value={formatDate(visit.scheduled_date)}
              sub={`${visit.scheduled_time} (${visit.duration_minutes} min)`}
              color={colors.text}
            />
            <InfoCard
              icon={aidantStatus.icon}
              label="Intervenant"
              value={aidantStatus.label}
              sub={aidantStatus.sub}
              color={aidantStatus.color}
            />
          </div>

          {/* STATS AIDANT - UNIQUEMENT POUR L'AIDANT */}
          {isAidant && visit.aidant && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard 
                icon={<Award size={14} />} 
                label="Ma note" 
                value={visit.aidant.rating || 0} 
                sub={`${visit.aidant.total_missions || 0} missions`}
                color={colors.primary}
              />
              <StatCard 
                icon={<Clock size={14} />} 
                label="Durée estimée" 
                value={`${visit.duration_minutes || 60} min`} 
                sub="Intervention"
                color={colors.primary}
              />
              <StatCard 
                icon={<Calendar size={14} />} 
                label="Date" 
                value={formatDate(visit.scheduled_date)} 
                sub={visit.scheduled_time}
                color={colors.primary}
              />
              <StatCard 
                icon={<MapPin size={14} />} 
                label="Adresse" 
                value={getVisitDisplayAddress(visit)} 
                sub="Lieu d'intervention"
                color={colors.primary}
              />
            </div>
          )}

          {/* COMPTE-RENDU DE VISITE GROUPÉ */}
          {(visit.actions?.length > 0 || visit.notes || (visit.photos && visit.photos.length > 0) || visit.report) ? (
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-black/5 space-y-5">
              <h3 className="font-bold text-sm sm:text-base border-b pb-2.5" style={{ color: colors.text }}>
                📊 Compte-rendu de la visite
              </h3>

              {/* Actions complétées */}
              {visit.actions && visit.actions.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-green-500" />
                    Actions complétées
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {visit.actions.map((action, index) => (
                      <span
                        key={index}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{ background: colors.primary + '10', color: colors.primary }}
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes de préparation & Rapport */}
              {(visit.notes || visit.report) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visit.notes && (
                    <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Notes de préparation
                      </h4>
                      <p className="text-xs text-gray-700 leading-relaxed font-medium">
                        {visit.notes}
                      </p>
                    </div>
                  )}
                  {visit.report && (
                    <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Rapport d'intervention
                      </h4>
                      <p className="text-xs text-gray-700 leading-relaxed font-medium">
                        {visit.report}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Photos jointes */}
              {visit.photos && visit.photos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Photos jointes
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {visit.photos.map((photo: any, index: number) => {
                      const url = photo.photo_url || photo;
                      return (
                        <div
                          key={index}
                          className="relative aspect-square rounded-xl overflow-hidden border cursor-pointer hover:opacity-90 transition group"
                          style={{ borderColor: colors.border }}
                          onClick={() => window.open(url, '_blank')}
                        >
                          <img
                            src={url}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/60 text-center">
                              <p className="text-white text-[9px] truncate">{photo.caption}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 text-center border border-black/5">
              <p className="text-xs text-gray-400 font-medium">
                {isAidant 
                  ? '📝 Une fois la visite terminée, vous pourrez ajouter un compte-rendu, des photos et un rapport.'
                  : 'Le compte-rendu, les photos et les rapports de visite apparaîtront ici une fois complétés par l\'aidant.'}
              </p>
            </div>
          )}
        </div>

        {/* COLONNE DE DROITE : Localisation et Contact (1/3) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2 border-b pb-2" style={{ color: colors.text }}>
              <MapPin size={16} />
              Localisation
            </h3>
            
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Adresse de visite</p>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
                {getVisitDisplayAddress(visit)}
              </p>
            </div>

            {visit.patient?.phone && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Contact bénéficiaire</p>
                <a
                  href={`tel:${visit.patient.phone}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold transition hover:opacity-80"
                  style={{ color: colors.primary }}
                >
                  <Phone size={13} />
                  {visit.patient.phone}
                </a>
              </div>
            )}

            {/* Informations complémentaires pour l'aidant */}
            {isAidant && visit.aidant_id && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Informations</p>
                <div className="space-y-1 text-xs text-gray-600">
                  <p className="flex items-center gap-1.5">
                    <Clock size={12} className="text-gray-400" />
                    Visite de {visit.duration_minutes || 60} minutes
                  </p>
                  {visit.is_urgent && (
                    <p className="flex items-center gap-1.5 text-red-500">
                      <AlertCircle size={12} />
                      Visite urgente
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ============================================================
      MODALS
      ============================================================ */}
      {showPaymentModal && currentVisit && (
        <VisitPaymentModal
          isOpen={true}
          onClose={() => setShowPaymentModal(false)}
          visit={currentVisit}
          onSuccess={handlePaymentSuccess}
        />
      )}

       {showCompleteModal && (
        <CompleteVisitModal
          isOpen={true}
          onClose={() => setShowCompleteModal(false)}
          visit={{ patient: visit.patient }}
          visitId={visit.id}
          patientCategory={visit.patient?.category || 'senior'}
          onSubmit={handleComplete}
          isLoading={isUploading}
        />
      )}
    </div>
  );
};

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

const InfoCard = ({ icon, label, value, sub, color }: InfoCardProps) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 flex flex-col justify-between">
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <p className="font-bold text-xs sm:text-sm mt-1.5 line-clamp-1" style={{ color: color || 'var(--color-text, #2d2d2d)' }}>
        {value}
      </p>
    </div>
    {sub && (
      <p className="text-[11px] text-gray-400 mt-1 truncate font-medium">
        {sub}
      </p>
    )}
  </div>
);

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}

const StatCard = ({ icon, label, value, sub, color }: StatCardProps) => (
  <div className="bg-white rounded-xl p-3 shadow-sm border border-black/5">
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '12', color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold" style={{ color }}>{value}</p>
        <p className="text-[9px] text-gray-400 truncate">{label}</p>
        {sub && <p className="text-[8px] text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  </div>
);

export default VisitDetailPage;
