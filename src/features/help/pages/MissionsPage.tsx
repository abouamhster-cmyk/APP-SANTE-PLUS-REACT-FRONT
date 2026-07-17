// 📁 src/features/help/pages/MissionsPage.tsx
 
import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Clock,
  User,
  Play,
  CheckCircle,
  XCircle,
  RefreshCw,
  ShoppingBag,
  Truck,
  Package,
  Eye,
  ClipboardList,
  ShieldAlert,
  AlertCircle,
  Users,
  Phone,
  Mail,
  Heart,
  Stethoscope,
  Pill,
  Mic,
  ChevronRight,
  ChevronDown,
  X,
  FileText,  
  Check,     
  Loader2,  
} from 'lucide-react';

import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime, formatCurrency, cn } from '@/utils/helpers';
import { VISIT_ACTIONS_SENIOR, VISIT_ACTIONS_MAMAN } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type TabType = 'missions' | 'deliveries' | 'available';

export const MissionsPage = () => {
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;

  const { getCategoryLabel } = useTerminology();

  // Stores
  const { 
    visits, 
    fetchVisits, 
    startVisit, 
    startAdHocVisit, 
    completeVisit, 
    isLoading: isVisitsLoading 
  } = useVisitStore();

  const { 
    orders, 
    fetchOrders, 
    takeOrder, 
    completeDelivery, 
    isLoading: ordersLoading 
  } = useOrderStore();

  const { 
    assignments, 
    fetchMyAssignments, 
    isLoading: isAssignmentsLoading 
  } = useAidantCatalogStore();

  // États locaux
  const [activeTab, setActiveTab] = useState<TabType>('missions');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [aidantId, setAidantId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const [selectedBeneficiary, setSelectedBeneficiary] = useState<any | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [isActionPending, setIsActionPending] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false); // ✅ Corrigé de setShowCompleteModal

  // Formulaire de Rapport de visite
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [reportNotes, setReportNotes] = useState('');

  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startTouchY = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Mappings mémorisés avec typage explicite
  const myMissions = useMemo(() => visits.filter((v: any) => v.aidant_id === aidantId), [visits, aidantId]);
  const assignedOrders = useMemo(() => orders.filter((o: any) => o.aidant_id === aidantId), [orders, aidantId]);
  const availableOrders = useMemo(() => orders.filter((o: any) => o.status === 'en_attente' || o.status === 'disponible'), [orders]);
  const deliveryOrders = useMemo(() => assignedOrders.filter((o: any) => o.status === 'en_cours' || o.status === 'livree'), [assignedOrders]);

  // Intervention en cours
  const activeIntervention = useMemo(() => {
    return visits.find((v: any) => v.status === 'en_cours');
  }, [visits]);

  // Chronomètre
  useEffect(() => {
    if (activeIntervention?.start_time) {
      const startTime = new Date(activeIntervention.start_time).getTime();

      const updateTimer = () => {
        const now = new Date().getTime();
        const difference = now - startTime;

        if (difference > 0) {
          const hours = Math.floor(difference / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);

          setElapsedTime(
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          );
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime('00:00:00');
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeIntervention]);

  const stats = useMemo(() => {
    const plannedMissionsCount = myMissions.filter((v: any) => v.status === 'planifiee').length;
    const inProgressMissionsCount = myMissions.filter((v: any) => v.status === 'en_cours').length;
    const completedMissionsCount = myMissions.filter((v: any) => ['terminee', 'validee'].includes(v.status)).length;

    const inProgressDeliveriesCount = assignedOrders.filter((o: any) => o.status === 'en_cours').length;
    const completedDeliveriesCount = assignedOrders.filter((o: any) => ['livree', 'validee'].includes(o.status)).length;

    return {
      missions: {
        total: myMissions.length,
        planned: plannedMissionsCount,
        inProgress: inProgressMissionsCount,
        completed: completedMissionsCount,
      },
      deliveries: {
        total: assignedOrders.length,
        inProgress: inProgressDeliveriesCount,
        completed: completedDeliveriesCount,
      },
      available: availableOrders.length,
    };
  }, [myMissions, assignedOrders, availableOrders]);

  const isLoading_ = isVisitsLoading || ordersLoading || isAssignmentsLoading; // ✅ Corrigé isLoading non défini

  const missionSubFilters = useMemo(() => [
    { key: 'all', label: 'Toutes' },
    { key: 'beneficiaires', label: `👥 Assignés (${assignments.length})` },
    { key: 'planned', label: `📅 Programmées (${stats.missions.planned})` },
    { key: 'history', label: `📝 Historique (${stats.missions.completed})` }
  ], [stats.missions, assignments.length]);

  const deliverySubFilters = useMemo(() => [
    { key: 'active', label: `🔄 En cours (${stats.deliveries.inProgress})` },
    { key: 'history', label: `📦 Livrées (${stats.deliveries.completed})` }
  ], [stats.deliveries]);

  // Vérification de l'homologation
  useEffect(() => {
    const checkAidantStatus = async () => {
      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_active, role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          setIsVerified(false);
          return;
        }

        const { data: aidant, error: aidantError } = await supabase
          .from('aidants')
          .select('is_verified, status')
          .eq('user_id', user.id)
          .single();

        if (aidantError) {
          setIsVerified(false);
          return;
        }

        const isVerified = profileData?.is_active === true &&
          profileData?.role === 'aidant' &&
          aidant?.is_verified === true &&
          aidant?.status === 'approved';

        setIsVerified(isVerified);
      } catch (error) {
        setIsVerified(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAidantStatus();
  }, [user]);

  // Récupération de l'aidant ID
  useEffect(() => {
    const getAidantId = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('aidants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) return;
      setAidantId(data?.id || null);
    };

    getAidantId();
  }, [user]);

  useEffect(() => {
    if (isVerified) {
      fetchVisits();
      fetchOrders();
      fetchMyAssignments();
    }
  }, [isVerified, fetchVisits, fetchOrders, fetchMyAssignments]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startTouchY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - startTouchY.current;

    if (diffY > 0 && window.scrollY === 0) {
      const resistance = Math.min(diffY * 0.38, 72);
      setPullY(resistance);
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    setIsPulling(false);
    if (pullY >= 50) {
      toast.promise(
        Promise.all([fetchVisits(), fetchOrders(), fetchMyAssignments()]),
        {
          loading: 'Actualisation...',
          success: 'Plannings synchronisés !',
          error: 'Échec de synchronisation.',
        }
      );
    }
    setPullY(0);
  };

  // ✅ DÉMARRAGE À LA VOLÉE (AD-HOC) AVEC POINT GPS DE DÉPART
  const handleStartAdHocIntervention = async (beneficiary: any) => {
    if (isActionPending) return;

    if (activeIntervention) {
      toast.error('Vous avez déjà une autre intervention en cours. Veuillez d’abord la clore.');
      return;
    }

    setIsActionPending(true);
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
      }
    } catch (e) {
      console.warn("⚠️ Géolocalisation non capturée.");
    }

    try {
      const targetId = beneficiary.target_type === 'patient' ? beneficiary.patient_id : beneficiary.family_id;
      const result = await startAdHocVisit(beneficiary.target_type, targetId, startLat, startLng);

      if (result) {
        toast.success(`🚀 Intervention commencée pour ${beneficiary.target_name} !`);
        setSelectedBeneficiary(null); 
      }
    } catch (error: any) {
      toast.error(error.message || 'Impossible de démarrer l’intervention');
    } finally {
      setIsActionPending(false);
    }
  };

  // ✅ DEPARTS DE MISSIONS PROGRAMMÉES (checkpoint nulled si déjà démarré)
  const handleStartPlannedIntervention = async (id: string) => {
    if (isActionPending) return;
    setIsActionPending(true);
    
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
      }
    } catch (e) {
      console.warn("⚠️ Géolocalisation non capturée.");
    }

    try {
      // ✅ Sécurisation de l'appel à startVisit avec passage d'arguments fallbacks
      await startVisit(id, startLat, startLng);
      toast.success('🚀 Intervention commencée !');
      await fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du démarrage');
    } finally {
      setIsActionPending(false);
    }
  };

  // ✅ TRANSMISSION DU RAPPORT ET POINT GPS D'ARRIVÉE
  const handleCompleteIntervention = async () => {
    if (!activeIntervention) return;
    if (selectedActions.length === 0) {
      toast.error('Veuillez cocher au moins une action d’accompagnement effectuée.');
      return;
    }

    setIsActionPending(true);
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
      }
    } catch (e) {
      console.warn("⚠️ Géolocalisation non capturée.");
    }

    try {
      await completeVisit(activeIntervention.id, {
        actions: selectedActions,
        notes: reportNotes.trim(),
        photos: [], 
        lat: endLat,
        lng: endLng,
      });

      toast.success('🎉 Rapport transmis ! Intervention archivée.');
      setShowReportModal(false); // ✅ Corrigé de setShowCompleteModal
      setSelectedActions([]);
      setReportNotes('');
    } catch (error: any) {
      toast.error('Erreur de transmission du rapport');
    } finally {
      setIsActionPending(false);
    }
  };

  const getFilteredItems = () => {
    if (activeTab === 'missions') {
      if (filterStatus === 'all') return myMissions.filter((v: any) => v.status !== 'brouillon');
      if (filterStatus === 'beneficiaires') return []; 
      if (filterStatus === 'planned') {
        return myMissions.filter((v: any) => v.status === 'planifiee' || v.status === 'en_attente' || v.status === 'acceptee');
      }
      if (filterStatus === 'history') {
        return myMissions.filter((v: any) => ['terminee', 'validee', 'annulee', 'refusee'].includes(v.status));
      }
    }
    if (activeTab === 'deliveries') {
      if (filterStatus === 'active') {
        return deliveryOrders.filter((o: any) => o.status === 'en_cours');
      }
      if (filterStatus === 'history') {
        return assignedOrders.filter((o: any) => ['livree', 'validee', 'annulee'].includes(o.status));
      }
      return deliveryOrders;
    }
    if (activeTab === 'available') {
      return availableOrders;
    }
    return [];
  };

  const filteredItems = getFilteredItems();

  const handleTakeOrder = async (id: string) => {
    try {
      await takeOrder(id);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la prise de commande');
    }
  };

  const handleDeliverOrder = async (id: string) => {
    try {
      await completeDelivery(id);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la livraison');
    }
  };

  const getActionOptions = () => {
    if (!activeIntervention) return [];
    const isMaman = activeIntervention.patient?.category === 'maman_bebe';
    return isMaman ? VISIT_ACTIONS_MAMAN : VISIT_ACTIONS_SENIOR;
  };

  const toggleActionSelection = (id: string) => {
    setSelectedActions(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleTabChangeLocal = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'missions') {
      setFilterStatus('all');
    } else if (tab === 'deliveries') {
      setFilterStatus('active');
    } else {
      setFilterStatus('all');
    }
  };

  const getStatusColorLocal = (status: string) => {
    const map: Record<string, string> = {
      planifiee: '#10B981',
      en_attente: '#F59E0B',
      acceptee: '#3B82F6',
      en_cours: '#3B82F6',
      terminee: '#8B5CF6',
      validee: '#10B981',
      annulee: '#6B7280',
      refusee: '#EF4444',
      creee: '#6B7280',
      disponible: '#EF4444',
      livree: '#3B82F6',
    };
    return map[status] || '#9E9E9E';
  };

  const getStatusLabelLocal = (status: string) => {
    const map: Record<string, string> = {
      planifiee: 'Prévue',
      en_attente: 'En attente',
      acceptee: 'Confirmée',
      en_cours: 'En cours',
      terminee: 'Terminée (Rapport)',
      validee: 'Validée',
      annulee: 'Annulée',
      refusee: 'Refusée',
      creee: 'Créée',
      disponible: 'Disponible (urgent)',
      livree: 'Livrée',
    };
    return map[status] || status;
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: colors.primary, borderTopColor: 'transparent' }} />
          <p className="text-sm font-semibold" style={{ color: colors.text }}>Vérification des droits...</p>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-amber-50 border border-amber-100">
          <ShieldAlert size={30} className="text-amber-600" />
        </div>
        <h2 className="text-base font-black" style={{ color: colors.text }}>
          ⏳ Compte en cours d'homologation
        </h2>
        <p className="text-xs max-w-sm mt-1 leading-relaxed" style={{ color: colors.textLight }}>
          Votre dossier d'intervenant est actuellement examiné par nos coordinateurs. Vous serez alerté dès sa validation.
        </p>
        <button
          onClick={() => navigate('/app/profile')}
          className="mt-4 px-5 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-sm hover:opacity-95"
          style={{ background: colors.primary }}
        >
          Consulter mon profil
        </button>
      </div>
    );
  }

  if (isLoading_) {
    return (
      <div className="space-y-6">
        <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="space-y-6 pb-6"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="w-full flex justify-center overflow-hidden transition-all duration-300 ease-out"
        style={{ 
          height: pullY > 0 ? `${pullY}px` : '0px',
          opacity: pullY > 0 ? Math.min(pullY / 45, 1) : 0
        }}
      >
        <div className="flex items-center gap-1.5 py-1 text-emerald-600">
          <RefreshCw 
            size={13} 
            className={cn("transition-all", pullY >= 50 ? "rotate-180 animate-spin" : "")} 
            style={{ transform: pullY < 50 ? `rotate(${pullY * 3.6}deg)` : undefined }}
          />
          <span className="text-[10px] font-black uppercase tracking-wider">
            {pullY >= 50 ? 'Relâcher pour actualiser' : 'Tirer pour rafraîchir'}
          </span>
        </div>
      </div>

      <section className="relative overflow-hidden bg-white/60 border rounded-2xl p-6 text-center shadow-sm backdrop-blur-md" style={{ borderColor: colors.primary + '15' }}>
        <div className="space-y-1.5 relative z-10">
          <h1 className="text-base sm:text-lg font-black tracking-tight" style={{ color: colors.text }}>
            Espace Intervenant à domicile
          </h1>
          <p className="text-xs max-w-sm mx-auto leading-relaxed" style={{ color: colors.textLight }}>
            Accédez aux fiches cliniques de vos patients rattachés, démarrez l'aide en direct ou gérez vos courses de livraisons.
          </p>
        </div>

        <button
          onClick={async () => {
            toast.promise(
              Promise.all([fetchVisits(), fetchOrders(), fetchMyAssignments()]),
              {
                loading: 'Mise à jour...',
                success: 'Données actualisées !',
                error: 'Échec de la mise à jour',
              }
            );
          }}
          disabled={isLoading_} // ✅ Remplacé isLoading par isLoading_
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition shadow-inner"
          title="Actualiser"
        >
          <RefreshCw size={13} className={isLoading_ ? 'animate-spin' : ''} />
        </button>
      </section>

      {/* BENTO STATS COMPACT */}
      <section className="grid grid-cols-3 gap-2.5 w-full">
        <div className="bg-white p-3 rounded-2xl border shadow-sm flex flex-col justify-between h-24" style={{ borderColor: colors.primary + '15' }}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider truncate mr-1" style={{ color: colors.textLight }}>Visites</span>
            <Calendar size={13} className="text-emerald-500 shrink-0" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black leading-none truncate" style={{ color: colors.text }}>
              {stats.missions.total} total
            </p>
            <p className="text-[9px] mt-1" style={{ color: colors.textLight }}>
              {stats.missions.planned} prévues
            </p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border shadow-sm flex flex-col justify-between h-24" style={{ borderColor: colors.primary + '15' }}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider truncate mr-1" style={{ color: colors.textLight }}>Courses</span>
            <ShoppingBag size={13} className="text-blue-500 shrink-0 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black leading-none truncate" style={{ color: colors.text }}>
              {stats.deliveries.inProgress} en cours
            </p>
            <p className="text-[9px] mt-1" style={{ color: colors.textLight }}>
              {stats.deliveries.completed} livrées
            </p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border shadow-sm flex flex-col justify-between h-24" style={{ borderColor: colors.primary + '15' }}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider truncate mr-1" style={{ color: colors.textLight }}>Dispos</span>
            <AlertCircle size={13} className="text-amber-500 shrink-0 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black leading-none truncate" style={{ color: colors.text }}>
              {stats.available} disponibles
            </p>
            <p className="text-[9px] mt-1" style={{ color: colors.textLight }}>
              À prendre
            </p>
          </div>
        </div>
      </section>

      {/* TABS PRINCIPAUX */}
      <section className="w-full overflow-x-auto scrollbar-none py-1">
        <div className="inline-flex p-1 bg-gray-100/80 rounded-2xl border gap-1" style={{ borderColor: colors.primary + '10' }}>
          {[
            { key: 'missions', label: `📋 Accompagnements (${stats.missions.total})` },
            { key: 'deliveries', label: `🚚 Livraisons (${stats.deliveries.total})` },
            { key: 'available', label: `📦 Disponibles (${stats.available})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChangeLocal(tab.key as TabType)} // ✅ Remplacé handleTabChange par handleTabChangeLocal
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap select-none",
                activeTab === tab.key ? "bg-white shadow-sm font-extrabold" : "hover:opacity-80"
              )}
              style={{
                color: activeTab === tab.key ? colors.primary : colors.textLight,
                backgroundColor: activeTab === tab.key ? '#ffffff' : 'transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* SOUS-ONGLETS VISITES (INCLUS LES ASSIGNÉS DIRECTS) */}
      {activeTab === 'missions' && (
        <section className="w-full overflow-x-auto scrollbar-none py-1">
          <div className="inline-flex p-0.5 bg-gray-100/40 rounded-xl border gap-1" style={{ borderColor: colors.primary + '5' }}>
            {missionSubFilters.map((sub) => {
              const isActive = filterStatus === sub.key;
              return (
                <button
                  key={sub.key}
                  onClick={() => setFilterStatus(sub.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all select-none",
                    isActive ? "bg-white shadow-sm" : "hover:opacity-80"
                  )}
                  style={{
                    color: isActive ? colors.primary : colors.textLight,
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                  }}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === 'deliveries' && (
        <section className="w-full overflow-x-auto scrollbar-none py-1">
          <div className="inline-flex p-0.5 bg-gray-100/40 rounded-xl border gap-1" style={{ borderColor: colors.primary + '5' }}>
            {deliverySubFilters.map((sub) => {
              const isActive = filterStatus === sub.key;
              return (
                <button
                  key={sub.key}
                  onClick={() => setFilterStatus(sub.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all select-none",
                    isActive ? "bg-white shadow-sm" : "hover:opacity-80"
                  )}
                  style={{
                    color: isActive ? colors.primary : colors.textLight,
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                  }}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* RENDU DES LISTES */}
      {activeTab === 'missions' && filterStatus === 'beneficiaires' ? (
        /* ✅ RENDU DIRECT DES BÉNÉFICIAIRES ASSIGNÉS (DOSSIERS PATIENTS) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.length > 0 ? (
            assignments.map((link: any) => {
              // ✅ Cast explicite 'any' du paramètre link pour éviter les erreurs TS de type non défini
              const isPersonal = (link as any).target_type === 'personal_account' || (link as any).is_personal;
              const name = (link as any).target_name || 'Bénéficiaire';
              const address = isPersonal ? (link as any).family?.address : (link as any).patient?.address;
              const category = isPersonal ? 'senior' : (link as any).patient?.category;

              return (
                <div
                  key={link.id}
                  onClick={() => setSelectedBeneficiary(link)}
                  className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition duration-200 cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-sm" style={{ background: colors.primary }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.primary + '10', color: colors.primary }}>
                        {isPersonal ? '👤 Compte direct' : `👵 Proche (${getCategoryLabel(category || 'senior')})`}
                      </span>
                      <h3 className="font-extrabold text-sm sm:text-base text-gray-800 truncate mt-1">{name}</h3>
                      <p className="text-xs text-gray-400 truncate mt-0.5">📍 {address || 'Adresse non renseignée'}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-400 shrink-0" />
                </div>
              );
            })
          ) : (
            <div className="col-span-2 bg-white rounded-3xl p-10 text-center border border-gray-100">
              <User size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-bold text-gray-700">Aucun bénéficiaire rattaché</p>
              <p className="text-xs text-gray-400 mt-1">Vous serez mis au courant dès que l'administration vous assignera un bénéficiaire.</p>
            </div>
          )}
        </div>
      ) : filteredItems.length > 0 ? (
        <section className="space-y-3">
          {filteredItems.map((item: any) => (
            <MissionItemCompact
              key={item.id}
              item={item}
              type={activeTab}
              colors={colors}
              aidantId={aidantId}
              onStart={() => handleStartPlannedIntervention(item.id)}
              onTakeOrder={() => handleTakeOrder(item.id)}
              onDeliver={() => handleDeliverOrder(item.id)}
              onView={() => {
                if (activeTab === 'missions' && item?.id) {
                  navigate(`/app/visits/${item.id}`);
                } else if (item?.id) {
                  navigate(`/app/orders/${item.id}`);
                }
              }}
              getStatusColor={getStatusColorLocal}
              getStatusLabel={getStatusLabelLocal}
              formatDate={formatDate}
              formatTime={formatTime}
              formatCurrency={formatCurrency}
            />
          ))}
        </section>
      ) : (
        <section className="bg-white/40 rounded-2xl py-16 px-6 text-center border max-w-sm mx-auto flex flex-col items-center justify-center gap-4 backdrop-blur-sm shadow-sm" style={{ borderColor: colors.primary + '15' }}>
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
            {activeTab === 'missions' ? <ClipboardList size={20} /> :
             activeTab === 'deliveries' ? <Truck size={20} /> :
             <Package size={20} />}
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-sm" style={{ color: colors.text }}>
              {activeTab === 'missions' && 'Aucune mission planifiée'}
              {activeTab === 'deliveries' && 'Aucune livraison en cours'}
              {activeTab === 'available' && 'Aucune commande disponible'}
            </h3>
            <p className="text-xs max-w-xs leading-relaxed" style={{ color: colors.textLight }}>
              {activeTab === 'missions' && 'Revenez plus tard ou contactez la coordination pour de nouveaux accompagnements.'}
              {activeTab === 'deliveries' && 'Vos livraisons en cours s\'afficheront ici pour un suivi GPS réactif.'}
              {activeTab === 'available' && 'Toutes les courses d\'urgences ont été pourvues par nos équipes de confiance.'}
            </p>
          </div>
        </section>
      )}

      {/* ============================================================
          MODAL 1 : FICHE CLINIQUE / DOSSIER PATIENT (LECTURE SEULE + DÉMARRAGE VOLÉE)
          ============================================================ */}
      {selectedBeneficiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-xl max-h-[88vh] overflow-y-auto shadow-2xl p-6 md:p-8 space-y-6 relative animate-fadeIn scrollbar-none">
            
            <button
              onClick={() => setSelectedBeneficiary(null)}
              className="absolute top-4 right-4 w-9 h-9 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-400"
            >
              <X size={18} />
            </button>

            {/* En-tête Dossier */}
            <div className="flex items-center gap-4 border-b pb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-base font-black shadow-md shrink-0" style={{ background: colors.primary }}>
                {selectedBeneficiary.target_name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  📁 DOSSIER PATIENT SÉCURISÉ
                </span>
                <h2 className="text-lg md:text-xl font-black text-gray-800 truncate mt-1">
                  {selectedBeneficiary.target_name}
                </h2>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  📍 {selectedBeneficiary.target_type === 'patient' ? selectedBeneficiary.patient?.address : selectedBeneficiary.family?.address}
                </p>
              </div>
            </div>

            {/* Corps du Dossier Bénéficiaire */}
            <div className="space-y-5 text-xs sm:text-sm">
              
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                  <User size={14} style={{ color: colors.primary }} /> Informations Générales
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-3 rounded-2xl border">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Âge</span>
                    <span className="font-extrabold text-gray-700">
                      {selectedBeneficiary.target_type === 'patient' 
                        ? (selectedBeneficiary.patient?.age ? `${selectedBeneficiary.patient.age} ans` : 'Non renseigné') 
                        : 'Compte majeur'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Sexe / Genre</span>
                    <span className="font-extrabold text-gray-700 uppercase">
                      {selectedBeneficiary.target_type === 'patient' 
                        ? (selectedBeneficiary.patient?.gender === 'male' ? 'Homme' : 'Femme') 
                        : 'Non spécifié'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pathologies & Traitements */}
              {selectedBeneficiary.target_type === 'patient' && selectedBeneficiary.patient && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                      <Stethoscope size={14} className="text-red-500" /> Diagnostics & Pathologies
                    </h4>
                    <div className="p-3 bg-red-50/20 border border-red-100 rounded-xl min-h-[58px]">
                      <p className="font-semibold text-red-900 leading-normal">
                        {selectedBeneficiary.patient.conditions || "Aucune pathologie chronique signalée."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                      <Pill size={14} className="text-blue-500" /> Traitements réguliers
                    </h4>
                    <div className="p-3 bg-blue-50/20 border border-blue-100 rounded-xl min-h-[58px]">
                      <p className="font-semibold text-blue-900 leading-normal">
                        {selectedBeneficiary.patient.treatments || "Pas de traitement médical en cours."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Allergies & Notes de Confort */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                  <FileText size={14} style={{ color: colors.primary }} /> Allergies et Notes d'aide
                </h4>
                <div className="p-4 bg-gray-50/50 rounded-2xl border space-y-3">
                  {selectedBeneficiary.target_type === 'patient' && selectedBeneficiary.patient?.allergies && (
                    <div>
                      <span className="text-[10px] text-red-600 font-extrabold block uppercase tracking-wider">⚠️ Allergies signalées</span>
                      <p className="font-bold text-red-700 mt-0.5">{selectedBeneficiary.patient.allergies}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-gray-400 font-extrabold block uppercase tracking-wider">📝 Notes de confort du proche</span>
                    <p className="font-medium text-gray-600 mt-1 leading-relaxed">
                      {selectedBeneficiary.target_type === 'patient' 
                        ? (selectedBeneficiary.patient?.notes || "Pas de note complémentaire spécifiée.") 
                        : "Accompagnement de confort personnel."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bouton d'action principal */}
              <div className="pt-4 border-t flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBeneficiary(null)}
                  className="flex-1 h-12 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition border"
                >
                  Fermer le dossier
                </button>
                <button
                  type="button"
                  onClick={() => handleStartAdHocIntervention(selectedBeneficiary)}
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black transition flex items-center justify-center gap-2"
                >
                  <Play size={16} fill="white" />
                  Démarrer l'accompagnement
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 2 : SOUMETTRE LE RAPPORT CLASSIQUE DE VISITE
          ============================================================ */}
      {showReportModal && activeIntervention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-xl p-6 md:p-8 space-y-6 relative animate-fadeIn scrollbar-none my-8">
            
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">
                  🏁 Rapport de fin de mission
                </span>
                <h2 className="text-base sm:text-lg font-black text-gray-800 mt-1">
                  Accompagnement de {activeIntervention.target_name}
                </h2>
              </div>
              <button
                onClick={() => setShowReportModal(false)} // ✅ Corrigé de setShowCompleteModal
                className="p-1.5 hover:bg-gray-100 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Actions d'accompagnement sous forme de checkbox */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">
                Cochez les actions d'aide accomplies *
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {getActionOptions().map((action) => {
                  const isChecked = selectedActions.includes(action.label);
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => toggleActionSelection(action.label)}
                      className={cn(
                        "p-3 rounded-xl border text-left flex items-center justify-between transition-all text-xs font-semibold",
                        isChecked ? "border-emerald-500 bg-emerald-50/30 text-emerald-900" : "bg-white hover:bg-gray-50 text-gray-600"
                      )}
                    >
                      <span className="truncate">{action.icon} {action.label}</span>
                      {isChecked && <Check size={14} className="text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observations textuelles */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">
                Observations de visite & Rapport
              </label>
              <textarea
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                rows={3}
                placeholder="Décrivez comment s'est déroulé l'accompagnement, observations importantes..."
                className="w-full px-3 py-2.5 border rounded-2xl text-xs sm:text-sm font-semibold outline-none resize-none bg-gray-50/50 focus:bg-white transition"
              />
            </div>

            {/* Controles de soumission */}
            <div className="flex gap-2.5 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowReportModal(false)} // ✅ Corrigé de setShowCompleteModal
                className="flex-1 h-12 font-bold text-gray-500 hover:bg-gray-50 transition border rounded-2xl"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleCompleteIntervention}
                disabled={selectedActions.length === 0 || isActionPending}
                className="flex-1 h-12 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-1.5 transition"
                style={{ 
                  background: selectedActions.length > 0 ? colors.primary : '#9CA3AF',
                  cursor: selectedActions.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                {isActionPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Transmettre
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

// =============================================
// MISSION ITEM COMPACT
// =============================================

interface MissionItemCompactProps {
  item: any;
  type: TabType;
  colors: any;
  aidantId: string | null;
  onApprove: () => void;
  onRefuse: () => void;
  onStart: () => void;
  onTakeOrder: () => void;
  onDeliver: () => void;
  onView: () => void;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  formatCurrency: (amount: number) => string;
}

const MissionItemCompact = ({
  item,
  type,
  colors,
  aidantId,
  onStart,
  onTakeOrder,
  onDeliver,
  onView,
  getStatusColor,
  getStatusLabel,
  formatDate,
  formatTime,
  formatCurrency,
}: MissionItemCompactProps) => {
  const isMission = type === 'missions';
  const isAccepted = item.status === 'acceptee' || item.status === 'planifiee';

  const getPatientName = () => {
    if (item.patient) {
      return `${item.patient.first_name} ${item.patient.last_name}`;
    }
    if (item.family?.full_name) {
      return item.family.full_name;
    }
    return item.target_name || 'Bénéficiaire';
  };

  if (isMission) {
    return (
      <div
        className="bg-white rounded-2xl p-4 shadow-sm border cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ borderColor: colors.primary + '15' }}
        onClick={onView}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div 
            className="w-1 h-10 rounded-full shrink-0" 
            style={{ backgroundColor: getStatusColor(item.status) }} 
          />

          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: colors.textLight }}>Accompagnement d'aide</span>
            <p className="font-extrabold text-sm truncate" style={{ color: colors.text }}>
              {getPatientName()}
            </p>
            <div className="flex items-center gap-2 text-[11px] flex-wrap" style={{ color: colors.textLight }}>
              <span className="flex items-center gap-0.5">
                <Calendar size={11} className="text-gray-400" /> {formatDate(item.scheduled_date)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Clock size={11} className="text-gray-400" /> {formatTime(item.scheduled_time)}
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{
                  background: getStatusColor(item.status) + '12',
                  color: getStatusColor(item.status),
                }}
              >
                {getStatusLabel(item.status)}
              </span>
              {item.is_urgent && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100/35">
                  ⚠️ Urgent
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          {isAccepted && (
            <button
              onClick={(e) => { e.stopPropagation(); onStart(); }}
              className="px-3.5 h-8 rounded-xl text-white flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-wider shadow-sm hover:opacity-90 transition-all bg-emerald-500"
              title="Démarrer l'itinéraire"
            >
              <Play size={12} fill="#ffffff" />
              <span>Démarrer</span>
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="w-8 h-8 rounded-xl bg-gray-50 border text-gray-400 hover:text-gray-700 flex items-center justify-center transition-all"
            style={{ borderColor: colors.primary + '10' }}
          >
            <Eye size={13} />
          </button>
        </div>
      </div>
    );
  }

  const isAvailable = item.status === 'en_attente' || item.status === 'disponible';
  const isAcceptedOrder = item.status === 'en_cours';

  return (
    <div
      className="bg-white rounded-2xl p-4 shadow-sm border cursor-pointer hover:shadow-md transition-all duration-200"
      style={{ borderColor: colors.primary + '15' }}
      onClick={onView}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div 
            className="w-1 h-10 rounded-full shrink-0" 
            style={{ backgroundColor: getStatusColor(item.status) }} 
          />

          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: colors.textLight }}>Livraison active</span>
            <p className="font-extrabold text-sm truncate" style={{ color: colors.text }}>
              📦 {item.description || 'Commande'}
            </p>
            <div className="flex items-center gap-2 text-[11px] flex-wrap" style={{ color: colors.textLight }}>
              <span className="flex items-center gap-0.5">
                <User size={11} className="text-gray-400" /> {getPatientName()}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Package size={11} className="text-gray-400" /> {formatCurrency(item.estimated_amount || 0)}
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{
                  background: getStatusColor(item.status) + '12',
                  color: getStatusColor(item.status),
                }}
              >
                {getStatusLabel(item.status)}
              </span>
              {item.status === 'disponible' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 animate-pulse">
                  🚨 Urgent
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isAvailable && (
            <button
              onClick={(e) => { e.stopPropagation(); onTakeOrder(); }}
              className="px-3.5 h-8 rounded-xl text-white text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm hover:opacity-90 transition-all"
              style={{ background: item.status === 'disponible' ? '#EF4444' : '#F59E0B' }}
            >
              <Package size={12} />
              <span>Prendre</span>
            </button>
          )}

          {isAcceptedOrder && (
            <button
              onClick={(e) => { e.stopPropagation(); onDeliver(); }}
              className="px-3.5 h-8 rounded-xl text-white text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm hover:opacity-90 transition-all bg-blue-500"
            >
              <Truck size={12} />
              <span>Livrer</span>
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="w-8 h-8 rounded-xl bg-gray-50 border text-gray-400 hover:text-gray-850 flex items-center justify-center transition-all"
            style={{ borderColor: colors.primary + '10' }}
          >
            <Eye size={13} />
          </button>
        </div>
      </div>

      {item.status !== 'annulee' && item.status !== 'validee' && item.status !== 'attente_paiement' && (
        <div className="mt-4 flex items-center gap-2 pl-4">
          {['creee', 'en_cours', 'livree'].map((status, index) => {
            const statusIndex = ['creee', 'en_cours', 'livree'].indexOf(status);
            const currentIndex = ['creee', 'en_cours', 'livree'].indexOf(item.status);
            const isDone = currentIndex >= statusIndex;

            return (
              <div key={status} className="flex items-center flex-1">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                    isDone ? "text-white" : "bg-gray-100 text-gray-400"
                  }`}
                  style={{ background: isDone ? colors.primary : undefined }}
                >
                  {isDone ? <CheckCircle size={10} /> : index + 1}
                </div>
                {index < 2 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 transition-all ${
                      isDone && currentIndex > statusIndex ? "bg-green-500" : "bg-gray-100"
                    }`}
                  />
                )}
              </div>
            );
          })}
          <span className="text-[10px] ml-1.5 font-bold shrink-0" style={{ color: colors.textLight }}>
            {Math.round((['creee', 'en_cours', 'livree'].indexOf(item.status) + 1) / 3 * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default MissionsPage;
