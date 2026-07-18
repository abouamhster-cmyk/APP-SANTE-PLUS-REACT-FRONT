// 📁 frontend/src/features/visits/pages/VisitDetailPage.tsx
// ✅ PAGE DÉTAIL VISITE : AGENDA ÉPURÉ (SANS DOUBLONS SÉMANTIQUES), ACCOMPAGNEMENT DIRECT ET TERMINOLOGIE "DÉBUT / FIN"

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  Play,
  CreditCard,
  Phone,
  Heart,
  AlertCircle,
  UserPlus,
  Clock,
  UserCheck,
  Navigation as NavIcon,
  Mic,
  Hospital,
  Stethoscope,
  Home,
} from 'lucide-react';

import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import {
  formatDate,
  getVisitDisplayName,
  getVisitDisplayAddress,
} from '@/utils/helpers';
import { CompleteVisitModal } from '@/components/visits/CompleteVisitModal';
import { AssignAidantModal } from '@/features/aidants/components/AssignAidantModal';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

const VisitDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;

  const {
    currentVisit,
    fetchVisitById,
    startVisit,
    completeVisit,
    cancelVisit,
    isLoading,
    fetchVisits,
  } = useVisitStore();

  const {
    getCategoryLabel,
    isAidant,
    isAdminOrCoordinator,
    isFamily,
  } = useTerminology();

  const { fetchAidants } = useAidantCatalogStore();

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const isActionPending = useRef(false);

  // Récupération sécurisée et hybride des photos de la visite
  const photosList = useMemo(() => {
    if (!currentVisit) return [];
    const visitObj = currentVisit as any;
    if (visitObj.photos && visitObj.photos.length > 0) {
      return visitObj.photos;
    }
    if (visitObj.metadata?.photos && Array.isArray(visitObj.metadata.photos)) {
      return visitObj.metadata.photos;
    }
    return [];
  }, [currentVisit]);

  // Récupération sécurisée et hybride du mémo vocal de la visite
  const audioUrl = useMemo(() => {
    if (!currentVisit) return null;
    const visitObj = currentVisit as any;
    if (visitObj.metadata?.audio_url) {
      return visitObj.metadata.audio_url;
    }
    if (visitObj.audios && visitObj.audios.length > 0) {
      return visitObj.audios[0].audio_url;
    }
    return null;
  }, [currentVisit]);

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

  useEffect(() => {
    if (showAssignModal) {
      fetchAidants({ onlyAvailable: true });
    }
  }, [showAssignModal, fetchAidants]);

  // ✅ CAPTURE DU POINT DE DÉPART DE MISSION EN DIRECT (CHECKPOINT)
  const handleStart = async () => {
    if (!id || isActionPending.current) return;
    isActionPending.current = true;
    setIsUpdating(true);

    let startLat: number | null = null;
    let startLng: number | null = null;

    try {
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
          });
        });
        startLat = position.coords.latitude;
        startLng = position.coords.longitude;
        console.log(`📍 Checkpoint Départ GPS capturé: ${startLat}, ${startLng}`);
      }
    } catch (geoError) {
      console.warn('⚠️ Impossible de capturer le GPS au démarrage');
    }

    try {
      await startVisit(id!, startLat, startLng);
      toast.success('🚀 Visite démarrée avec succès (GPS enregistré) !');
      useVisitStore.getState().invalidateCache();
      await fetchVisitById(id!);
      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur démarrage:', error);
      toast.error(error.message || 'Erreur lors du démarrage');
    } finally {
      setIsUpdating(false);
      isActionPending.current = false;
    }
  };

  // ✅ CAPTURE DU POINT D'ARRIVÉE DE MISSION EN DIRECT (CHECKPOINT)
  const handleComplete = async (data: {
    actions: string[];
    notes: string;
    audio_url?: string;
    photos: string[];
  }) => {
    if (isActionPending.current) return;

    const actions = data?.actions || [];
    const notes = data?.notes || '';
    const photoUrls = data?.photos || [];
    const audio_url = data?.audio_url || '';

    if (actions.length === 0) {
      toast.error('Veuillez sélectionner au moins une action');
      return;
    }

    isActionPending.current = true;
    setIsUploading(true);

    let endLat: number | null = null;
    let endLng: number | null = null;

    try {
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
          });
        });
        endLat = position.coords.latitude;
        endLng = position.coords.longitude;
        console.log(`📍 Checkpoint Arrivée GPS capturé: ${endLat}, ${endLng}`);
      }
    } catch (geoError) {
      console.warn('⚠️ Impossible de capturer le GPS à la finalisation');
    }

    try {
      await completeVisit(id!, {
        actions,
        notes,
        photos: photoUrls,
        audio_url,
        lat: endLat,
        lng: endLng,
      });

      toast.success('✅ Visite terminée avec succès (GPS enregistré) !');
      setShowCompleteModal(false);
      useVisitStore.getState().invalidateCache();
      await fetchVisitById(id!);
      await fetchVisits();
    } catch (error) {
      console.error('❌ Erreur finalisation:', error);
      toast.error('Erreur lors de la finalisation');
    } finally {
      setIsUploading(false);
      isActionPending.current = false;
    }
  };

  const handleCancel = async () => {
    if (isActionPending.current) return;

    if (window.confirm('Annuler cette visite ?')) {
      isActionPending.current = true;
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
        isActionPending.current = false;
      }
    }
  };

  // ✅ LOGIQUE D'ASSIGNATION ADMINISTRATIVE DE L'AIDANT
  const handleAssignAidant = async (aidantUserId: string, type: string, force: boolean = false) => {
    isActionPending.current = true;
    setIsUpdating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) throw new Error('Token de session manquant');

      const assignmentType = type === 'permanente' ? 'permanente' : (type === 'temporaire' ? 'temporaire' : 'ponctuelle');

      const response = await fetch(`${API_URL}/assignments/admin/assign-to-visit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          visitId: id,
          aidantId: aidantUserId,
          assignmentType: assignmentType,
          force: force,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'assignation de l\'aidant');
      }

      toast.success(result.message || 'Aidant assigné à la visite !');
      await handleAssignSuccess();
    } catch (error: any) {
      console.error('❌ Erreur assignation:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation');
    } finally {
      setIsUpdating(false);
      isActionPending.current = false;
    }
  };

  const handleAssignSuccess = async () => {
    setShowAssignModal(false);
    useVisitStore.getState().invalidateCache();
    await fetchVisitById(id!);
    await fetchVisits();
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      planifiee: '#4CAF50',
      en_attente: '#F59E0B',
      acceptee: '#3B82F6',
      en_cours: '#3B82F6',
      terminee: '#8B5CF6',
      validee: '#4CAF50',
      annulee: '#EF4444',
      refusee: '#EF4444',
      expire: '#795548',
      replanifiee: '#F59E0B',
      no_show: '#795548',
      attente_paiement: '#8B5CF6',
      brouillon: '#F59E0B',
      en_attente_aidant: '#FF5722',
    };
    return statusColors[status] || '#9E9E9E';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planifiee: 'Planifiée',
      en_attente: 'En attente',
      acceptee: 'Prête',
      en_cours: 'En cours',
      terminee: 'Terminée (Rapport)',
      validee: 'Validée',
      annulee: 'Annulée',
      refusee: 'Refusée',
      expire: 'Expirée',
      replanifiee: 'Replanifiée',
      no_show: 'Absent',
      attente_paiement: 'Paiement en attente',
      brouillon: '💳 Paiement requis',
      en_attente_aidant: '🦸 En attente aidant',
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
      case 'en_attente_aidant': return <UserPlus size={13} />;
      default: return <AlertCircle size={13} />;
    }
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

    return {
      label: 'Non assigné',
      sub: 'En attente d\'assignation',
      color: '#FF5722',
      icon: <User size={15} />
    };
  };

  // ✅ BADGE DYNAMIQUE D'INTERVENTION
  const getPrestationBadge = () => {
    if (!currentVisit) return null;
    const visitObj = currentVisit as any;
    if (visitObj.metadata?.is_discharge) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 bg-[#FCE4EC] text-[#D81B60] border border-[#F8BBD0]">
          <Hospital size={11} />
          Sortie d'hôpital
        </span>
      );
    }
    if (visitObj.metadata?.is_medical_appointment) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 bg-[#E3F2FD] text-[#1565C0] border border-[#BBDEFB]">
          <Stethoscope size={11} />
          Rendez-vous médical
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1" style={{ backgroundColor: colors.primary + '10', color: colors.primary, border: `1px solid ${colors.primary + '20'}` }}>
        <Home size={11} />
        Aide à domicile
      </span>
    );
  };

  const isPendingApproval = currentVisit?.status === 'planifiee';
  const isInProgress = currentVisit?.status === 'en_cours';
  const isCompleted = currentVisit?.status === 'terminee';
  const isWaitingAidant = currentVisit?.status === 'en_attente_aidant';
  const hasNoAidant = !currentVisit?.aidant_id;

  const canAssignAidant = isAdminOrCoordinator && (hasNoAidant || isWaitingAidant);

  const aidantStatus = getAidantDisplayStatus();

  // RETOUR ANTICIPÉ DE CHARGEMENT
  if (isLoading || !currentVisit) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: colors.primary, borderTopColor: 'transparent' }} />
          <p className="text-xs" style={{ color: colors.textLight }}>Chargement des détails...</p>
        </div>
      </div>
    );
  }

  const visit = currentVisit as any;
  const isAdHoc = visit.metadata?.ad_hoc === true; // ✅ Détection dynamique de visite lancée en direct [23]

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 pb-12 px-4 sm:px-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: colors.primary + '15' }}>
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-100 rounded-xl transition flex-shrink-0"
          >
            <ArrowLeft size={20} style={{ color: colors.text }} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold truncate" style={{ color: colors.text }}>
              {isAdHoc ? `Visite en direct de ${visit.target_name}` : `Visite du ${formatDate(visit.scheduled_date)}`}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {getPrestationBadge()}
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
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 shrink-0 animate-pulse"
                  style={{ background: '#EF444415', color: '#EF4444' }}
                >
                  <AlertCircle size={11} />
                  <span>Urgent</span>
                </span>
              )}
              <span className="text-[10px] font-mono" style={{ color: colors.textLight }}>
                #{visit.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        {/* ACTIONS STATUTS */}
        <div className="flex flex-wrap gap-1.5">
          {isPendingApproval && isAidant && (
            <button
              onClick={handleStart}
              disabled={isUpdating || isActionPending.current}
              className="flex items-center gap-1.5 px-4 h-10 rounded-xl text-white text-xs font-bold transition hover:opacity-90 disabled:opacity-50"
              style={{ background: '#4CAF50' }}
            >
              <Play size={14} />
              <span>Démarrer</span>
            </button>
          )}

          {isInProgress && isAidant && (
            <button
              onClick={() => setShowCompleteModal(true)}
              disabled={isUpdating || isActionPending.current}
              className="flex items-center gap-1.5 px-4 h-10 rounded-xl text-white text-xs font-bold transition hover:opacity-90 disabled:opacity-50"
              style={{ background: colors.primary }}
            >
              <CheckCircle size={14} />
              <span>Terminer</span>
            </button>
          )}

          {/* Annulation exclusive à l'administration */}
          {isAdminOrCoordinator && (visit.status === 'planifiee' || visit.status === 'acceptee') && (
            <button
              onClick={handleCancel}
              disabled={isUpdating || isActionPending.current}
              className="flex items-center gap-1.5 px-3.5 h-10 rounded-xl text-white text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ background: '#EF4444' }}
            >
              <XCircle size={14} />
              <span>Annuler</span>
            </button>
          )}

          {isCompleted && isAdminOrCoordinator && (
            <button
              onClick={async () => {
                if (isActionPending.current) return;
                isActionPending.current = true;
                try {
                  await supabase.from('visites').update({ status: 'validee' }).eq('id', id);
                  toast.success('✅ Visite validée');
                  useVisitStore.getState().invalidateCache();
                  await fetchVisitById(id!);
                  await fetchVisits();
                } catch (error: any) {
                  console.error('❌ Erreur validation:', error);
                  toast.error(error.message || 'Erreur lors de la validation');
                } finally {
                  isActionPending.current = false;
                }
              }}
              className="flex items-center gap-1.5 px-3.5 h-10 rounded-xl text-white text-xs font-semibold transition hover:opacity-90"
              style={{ background: '#8B5CF6' }}
            >
              <CheckCircle size={14} />
              <span>Valider</span>
            </button>
          )}

          {canAssignAidant && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-1.5 px-3.5 h-10 rounded-xl text-white text-xs font-semibold transition hover:opacity-90"
              style={{ background: '#FF5722' }}
            >
              <UserPlus size={14} />
              <span>Assigner un aidant</span>
            </button>
          )}
        </div>
      </div>

      {/* BANDEAU D'INFORMATION AIDANT */}
      {isAidant && visit.aidant_id && (
        <div className="p-4 rounded-xl shadow-sm border border-blue-100" style={{ backgroundColor: '#E3F2FD', borderLeft: '4px solid #3B82F6' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full" style={{ backgroundColor: '#BBDEFB' }}>
              <UserCheck size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-blue-800 text-xs sm:text-sm">✅ Vous êtes assigné à cette visite</p>
              <p className="text-xs text-blue-600 mt-0.5">
                {visit.status === 'planifiee'
                  ? '👆 Appuyez sur démarrer lors de votre arrivée sur place.'
                  : visit.status === 'en_cours'
                    ? '🔄 Vous êtes actuellement en intervention.'
                    : '📋 Visite terminée.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* NAVIGATION GPS */}
      {visit.status === 'en_cours' && (
        <div className="bg-white rounded-3xl p-5 border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ borderColor: '#3B82F620' }}>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-blue-600">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Accompagnement actif
            </span>
            <h3 className="text-base font-black text-gray-800 mt-1">Adresse de l'intervention</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              📍 {getVisitDisplayAddress(visit)}
            </p>
            {visit.patient?.phone && (
              <p className="text-[11px] text-gray-400 mt-0.5 font-medium">
                (Téléphone : {visit.patient.phone})
              </p>
            )}
          </div>

          <button
            onClick={() => {
              const query = visit.latitude && visit.longitude
                ? `${visit.latitude},${visit.longitude}`
                : encodeURIComponent(getVisitDisplayAddress(visit));
              window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
            }}
            className="w-full sm:w-auto h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0"
          >
            <NavIcon size={14} />
            Lancer Google Maps GPS
          </button>
        </div>
      )}

      {/* GRID LAYOUT PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* COLONNE DE GAUCHE */}
        <div className="lg:col-span-2 space-y-6">

          {/* CARTES D'INFORMATIONS RAPIDES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoCard
              icon={<User size={15} />}
              label="Bénéficiaire"
              value={getVisitDisplayName(visit)}
              sub={visit.patient_id ? getCategoryLabel(visit.patient?.category || 'senior') : 'Compte Personnel'}
              color={colors.text}
            />
            
            {/*   Afficher le démarrage live si visite en direct, sinon planification standard [23] */}
            {isAdHoc ? (
              <InfoCard
                icon={<Clock size={15} />}
                label="Démarrage en direct"
                value={visit.start_time ? `Débuté à ${new Date(visit.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'En direct'}
                sub={formatDate(visit.scheduled_date)}
                color={colors.primary}
              />
            ) : (
              <InfoCard
                icon={<Calendar size={15} />}
                label="Planification"
                value={formatDate(visit.scheduled_date)}
                sub={`${visit.scheduled_time} (${visit.duration_minutes} min)`}
                color={colors.text}
              />
            )}

            {/*  Afficher la durée réelle si ad-hoc, sinon l'id aidant (Boutons superflus du bas supprimés !) [23] */}
            <InfoCard
              icon={<Clock size={15} />}
              label="Durée d'accompagnement"
              value={visit.actual_duration_minutes ? `${visit.actual_duration_minutes} minutes` : `${visit.duration_minutes || 60} minutes`}
              sub={isAdHoc ? 'Session à la volée' : 'Planifiée'}
              color={colors.primary}
            />
          </div>

          {/* ✅ COMPTE-RENDU DE VISITE GROUPÉ (TOUS LES CHAMPS SUPERFLUS DE GAUCHE ONT ÉTÉ ENLEVÉS !) [23] */}
          {(visit.actions?.length > 0 || visit.notes || (photosList && photosList.length > 0) || visit.report || audioUrl) ? (
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border space-y-5" style={{ borderColor: colors.primary + '10' }}>
              <h3 className="font-bold text-sm sm:text-base border-b pb-2.5" style={{ borderColor: colors.primary + '10', color: colors.text }}>
                📊 Compte-rendu de la visite
              </h3>

              {/* Actions complétées */}
              {visit.actions && visit.actions.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: colors.textLight }}>
                    <CheckCircle size={14} className="text-green-500" />
                    Actions complétées
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {visit.actions.map((action: string, index: number) => (
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
                  {/* Ne pas dupliquer si les notes et le rapport sont identiques (cas ad-hoc) [23] */}
                  {visit.notes && visit.notes !== visit.report && (
                    <div className="bg-gray-50/60 p-4 rounded-xl border" style={{ borderColor: colors.primary + '10' }}>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: colors.textLight }}>
                        Notes de préparation
                      </h4>
                      <p className="text-xs leading-relaxed font-medium" style={{ color: colors.text + '80' }}>
                        {visit.notes}
                      </p>
                    </div>
                  )}
                  {visit.report && (
                    <div className="bg-gray-50/60 p-4 rounded-xl border" style={{ borderColor: colors.primary + '10' }}>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: colors.textLight }}>
                        Rapport d'intervention
                      </h4>
                      <p className="text-xs leading-relaxed font-medium" style={{ color: colors.text + '80' }}>
                        {visit.report}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* COMPTE-RENDU AUDIO */}
              {audioUrl && (
                <div className="pt-3 border-t animate-fadeIn" style={{ borderColor: colors.primary + '10' }}>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: colors.textLight }}>
                    <Mic size={14} className="text-blue-500 animate-pulse" />
                    Note vocale de l'intervenant
                  </h4>
                  {/*  Lecteur audio responsive 100% étirable sans débordement sur mobiles [23] */}
                  <div className="bg-gray-50/80 p-4 rounded-2xl border space-y-2.5" style={{ borderColor: colors.primary + '10' }}>
                    <div className="flex items-center gap-2">
                      <Play size={14} className="text-blue-500" />
                      <span className="text-xs font-bold text-gray-700">Enregistrement audio en direct</span>
                    </div>
                    <audio
                      src={audioUrl}
                      controls
                      className="w-full h-10 outline-none bg-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Photos jointes */}
              {photosList && photosList.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textLight }}>
                    Photos jointes
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {photosList.map((photo: any, index: number) => {
                      const url = photo.photo_url || photo;
                      return (
                        <div
                          key={index}
                          className="relative aspect-square rounded-xl overflow-hidden border cursor-pointer hover:opacity-90 transition group"
                          style={{ borderColor: colors.primary + '15' }}
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
            <div className="bg-white rounded-2xl p-6 text-center border" style={{ borderColor: colors.primary + '10' }}>
              <p className="text-xs font-medium" style={{ color: colors.textLight }}>
                Le compte-rendu, les photos et les rapports de visite apparaîtront ici une fois complétés par l'aidant.
              </p>
            </div>
          )}
        </div>

        {/* COLONNE DE DROITE */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border space-y-4" style={{ borderColor: colors.primary + '10' }}>
            <h3 className="font-bold text-sm flex items-center gap-2 border-b pb-2" style={{ borderColor: colors.primary + '10', color: colors.text }}>
              <MapPin size={16} />
              Localisation
            </h3>

            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: colors.textLight }}>
                {visit.metadata?.is_discharge
                  ? "Adresse de retour (domicile)"
                  : (visit.metadata?.is_medical_appointment ? "Destination (Cabinet / Clinique)" : "Adresse de visite")}
              </p>
              <p className="text-xs sm:text-sm leading-relaxed font-medium" style={{ color: colors.text }}>
                {getVisitDisplayAddress(visit)}
              </p>
            </div>

            {/* ✅ CORRECTIF SÉMANTIQUE : "Début et Fin" au lieu de "Départ et Arrivée" [23] */}
            {(visit.location_start || visit.location_end) && (
              <div className="p-3.5 rounded-xl bg-gray-50 border space-y-2.5" style={{ borderColor: colors.primary + '10' }}>
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: colors.textLight }}>
                  📍 Checkpoints GPS Figés
                </p>
                <div className="text-xs space-y-2 font-medium">
                  {visit.location_start && (
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                      <span className="text-gray-600">
                        {/* ✅ CORRIGÉ : Sémantique unifiée début/fin */}
                        <strong>Début de l'accompagnement</strong> à {new Date(visit.start_time || visit.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  {visit.location_end && (
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                      <span className="text-gray-600">
                        {/* ✅ CORRIGÉ : Sémantique unifiée début/fin */}
                        <strong>Fin de l'accompagnement</strong> à {new Date(visit.end_time || visit.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {visit.patient?.phone && (
              <div className="pt-2 border-t" style={{ borderColor: colors.primary + '10' }}>
                <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: colors.textLight }}>Contact bénéficiaire</p>
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
          </div>
        </div>

      </div>

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

      {/* ✅ MODAL D'ASSIGNATION D'AIDANT PREMIUM HARMONISÉ */}
      {showAssignModal && (
        <AssignAidantModal
          isOpen={showAssignModal}
          onClose={handleAssignSuccess}
          targetType="visit"
          targetId={visit.id}
          targetName={visit.target_name || `${visit.patient?.first_name || ''} ${visit.patient?.last_name || ''}`.trim()}
          onSuccess={handleAssignSuccess}
          currentAidantId={visit.aidant_id}
          colors={colors}
          allowForce={true}
          onAssignAidant={handleAssignAidant}
          isAdmin={true}
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
  <div className="bg-white rounded-2xl p-4 shadow-sm border flex flex-col justify-between" style={{ borderColor: 'var(--color-border, #e5e7eb)' }}>
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6b7280' }}>
        {icon}
        {label}
      </div>
      <p className="font-bold text-xs sm:text-sm mt-1.5 line-clamp-1" style={{ color: color || 'var(--color-text, #2d2d2d)' }}>
        {value}
      </p>
    </div>
    {sub && (
      <p className="text-[11px] mt-1 truncate font-medium" style={{ color: '#6b7280' }}>
        {sub}
      </p>
    )}
  </div>
);

export default VisitDetailPage;
