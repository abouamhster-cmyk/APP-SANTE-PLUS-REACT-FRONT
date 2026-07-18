// 📁 src/features/help/pages/MissionsPage.tsx
// ✅ PAGE HUB DE L'INTERVENANT : CLASSIFICATION RÉELLE ET ADAPTATIVE DES BÉNÉFICIAIRES EN DIRECT SANS DOUBLONS

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
  Mic,
  ChevronRight,
  Phone,
  Mail,
  Star,
  Camera,
  X,
  Stethoscope,
  Pill,
  FileText,
  Check,
  Loader2,
  Navigation
} from 'lucide-react';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { usePatientStore } from '@/stores/patientStore'; // ✅ Chargement des dossiers cliniques
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime, formatCurrency, cn } from '@/utils/helpers';
import { VISIT_ACTIONS_SENIOR, VISIT_ACTIONS_MAMAN } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type TabType = 'missions' | 'deliveries' | 'available';

// ============================================================
// ✅ DÉCODEUR SÉMANTIQUE DE ROLES ET CATÉGORIES REELLES BÉNIN
// ============================================================

const getBeneficiaryBadgeInfo = (link: any, patientData: any) => {
  const isPersonal = link.target_type === 'personal_account' || link.is_personal;
  
  // Récupérer la vraie catégorie clinique unifiée (senior, maman_bebe, etc.)
  const category = patientData?.category || (isPersonal ? (link.family?.patient_category || 'senior') : 'senior');
  
  const isMaman = category === 'maman_bebe';
  const categoryLabel = isMaman ? 'Maman & Bébé' : 'Senior';
  const emoji = isMaman ? '👶' : '👴';
  
  if (isPersonal) {
    return {
      text: `👤 Compte Personnel (${emoji} ${categoryLabel})`,
      bg: '#3B82F615',
      color: '#3B82F6',
    };
  }
  
  return {
    text: `👵 Proche (${emoji} ${categoryLabel})`,
    bg: '#10B98115',
    color: '#10B981',
  };
};

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

const MissionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;
  
  // Stores
  const { visits, fetchVisits, startVisit, startAdHocVisit, completeVisit, isLoading } = useVisitStore();
  const { orders, fetchOrders, takeOrder, completeDelivery, isLoading: ordersLoading } = useOrderStore();
  const { assignments, fetchMyAssignments, isLoading: isAssignmentsLoading } = useAidantCatalogStore();
  const { patients, fetchPatients } = usePatientStore(); // ✅ Utilisation du store de dossiers cliniques

  const { isAidant, getCategoryLabel } = useTerminology();

  // États locaux
  const [activeTab, setActiveTab] = useState<TabType>('missions');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [aidantId, setSetAidantId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [selectedBeneficiary, setSelectedBeneficiary] = useState<any | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [isActionPending, setIsActionPending] = useState(false);
  
  // Modals de rapports
  const [showVisitReportModal, setShowVisitReportModal] = useState(false);
  const [showDeliveryReportModal, setShowDeliveryReportModal] = useState(false);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<any | null>(null);

  // Formulaires de rapports
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [reportNotes, setReportNotes] = useState('');
  
  const [deliveryFeeInput, setDeliveryFeeInput] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');
  const [cashReceivedInput, setCashReceivedInput] = useState<number>(0);

  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startTouchY = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Mappings mémorisés
  const myMissions = useMemo(() => visits.filter(v => v.aidant_id === aidantId), [visits, aidantId]);
  const assignedOrders = useMemo(() => orders.filter(o => o.aidant_id === aidantId), [orders, aidantId]);
  const availableOrders = useMemo(() => orders.filter(o => o.status === 'en_attente' || o.status === 'disponible'), [orders]);
  const deliveryOrders = useMemo(() => assignedOrders.filter(o => o.status === 'en_cours' || o.status === 'livree'), [assignedOrders]);

  // Détection intervention active
  const activeIntervention = useMemo(() => {
    return visits.find(v => v.status === 'en_cours');
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

  // ✅ RÉSOUDEUR DE DOSSIER CLINIQUE EN DIRECT (SÉCURITÉ DE SECOURS ET DE COHÉRENCE)
  const realPatientData = useMemo(() => {
    if (!selectedBeneficiary) return null;

    // Cas A : Il s'agit d'un proche (Patient) [24]
    if (selectedBeneficiary.target_type === 'patient' && selectedBeneficiary.patient_id) {
      return patients.find(p => p.id === selectedBeneficiary.patient_id) || selectedBeneficiary.patient;
    }

    // Cas B : Il s'agit d'un compte personnel (S'accompagne lui-même) [24]
    const accountId = selectedBeneficiary.family_id || selectedBeneficiary.family?.id;
    if (accountId) {
      return patients.find(p => p.id === accountId || p.created_by === accountId);
    }

    return null;
  }, [selectedBeneficiary, patients]);

  const stats = useMemo(() => {
    const pendingMissionsCount = myMissions.filter(v => v.status === 'planifiee' || v.status === 'en_attente').length;
    const acceptedMissionsCount = myMissions.filter(v => v.status === 'acceptee').length;
    const inProgressMissionsCount = myMissions.filter(v => v.status === 'en_cours').length;
    const completedMissionsCount = myMissions.filter(v => ['terminee', 'validee'].includes(v.status)).length;

    const inProgressDeliveriesCount = assignedOrders.filter(o => o.status === 'en_cours').length;
    const completedDeliveriesCount = assignedOrders.filter(o => ['livree', 'validee'].includes(o.status)).length;

    return {
      missions: {
        total: myMissions.length,
        pending: pendingMissionsCount,
        accepted: acceptedMissionsCount,
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

  const isLoading_ = isLoading || ordersLoading || isAssignmentsLoading;

  const missionSubFilters = useMemo(() => [
    { key: 'all', label: 'Toutes' },
    { key: 'beneficiaires', label: `👥 Bénéficiaires (${assignments.length})` },
    { key: 'pending', label: `📅 Programmées (${stats.missions.pending})` },
    { key: 'history', label: `📝 Historique (${stats.missions.completed})` }
  ], [stats.missions, assignments.length]);

  const deliverySubFilters = useMemo(() => [
    { key: 'active', label: `🔄 En cours (${stats.deliveries.inProgress})` },
    { key: 'history', label: `📦 Livrées (${stats.deliveries.completed})` }
  ], [stats.deliveries]);

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

  useEffect(() => {
    const getAidantId = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('aidants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (error) return;
      setSetAidantId(data?.id || null);
    };

    getAidantId();
  }, [user]);

  useEffect(() => {
    if (isVerified) {
      fetchVisits();
      fetchOrders();
      fetchMyAssignments();
      fetchPatients(); // ✅ Charger tous les dossiers cliniques en même temps [24]
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
        Promise.all([fetchVisits(), fetchOrders(), fetchMyAssignments(), fetchPatients()]),
        {
          loading: 'Actualisation des plannings...',
          success: 'Missions à jour !',
          error: 'Échec de synchronisation.',
        }
      );
    }
    setPullY(0);
  };

  const getFilteredItems = () => {
    if (activeTab === 'missions') {
      if (filterStatus === 'all') return myMissions.filter(v => v.status !== 'brouillon');
      if (filterStatus === 'beneficiaires') return []; 
      if (filterStatus === 'pending') {
        return myMissions.filter(v => v.status === 'planifiee' || v.status === 'en_attente');
      }
      if (filterStatus === 'history') {
        return myMissions.filter(v => ['terminee', 'validee', 'annulee', 'refusee'].includes(v.status));
      }
    }
    if (activeTab === 'deliveries') {
      if (filterStatus === 'active') {
        return deliveryOrders.filter(o => o.status === 'en_cours');
      }
      if (filterStatus === 'history') {
        return assignedOrders.filter(o => ['livree', 'validee', 'annulee'].includes(o.status));
      }
      return deliveryOrders;
    }
    if (activeTab === 'available') {
      return availableOrders;
    }
    return [];
  };

  const filteredItems = getFilteredItems();

  // ✅ ACTIONS DE DÉMARRAGE AD-HOC (À LA VOLÉE)
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
    } catch {
      console.warn("⚠️ Géolocalisation non capturée.");
    }

    try {
      const targetId = beneficiary.target_type === 'patient' ? beneficiary.patient_id : beneficiary.family_id;
      const result = await startAdHocVisit(beneficiary.target_type, targetId, startLat, startLng);

      if (result) {
        toast.success(`🚀 Intervention commencée pour ${beneficiary.target_name} !`);
        setSelectedBeneficiary(null); // fermer la fiche
      }
    } catch (error: any) {
      console.error('❌ Erreur de démarrage ad-hoc:', error);
      toast.error(error.message || 'Impossible de démarrer l’intervention');
    } finally {
      setIsActionPending(false);
    }
  };

  // ✅ DEPARTS DE MISSIONS PROGRAMMÉES
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
      console.warn("⚠️ Pas de GPS");
    }

    try {
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
    } catch {
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
      setShowVisitReportModal(false);
      setSelectedActions([]);
      setReportNotes('');
    } catch (error: any) {
      toast.error('Erreur de transmission du rapport');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleTakeOrder = async (id: string) => {
    try {
      await takeOrder(id);
      fetchOrders();
      toast.success('Commande prise en charge !');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la prise de commande');
    }
  };

  const handleDeliverOrder = async () => {
    if (!selectedOrderForDelivery) return;
    if (deliveryFeeInput <= 0 && !selectedOrderForDelivery.subscription_id) {
      toast.error('Veuillez renseigner les frais de transport');
      return;
    }
    if (paymentMethod === 'cash' && cashReceivedInput <= 0) {
      toast.error('Veuillez spécifier la somme reçue en espèces');
      return;
    }

    setIsUpdating(true);
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
    } catch {
      console.warn("GPS non capturé.");
    }

    try {
      await completeDelivery(selectedOrderForDelivery.id, {
        proof_url: null,
        delivery_fee: selectedOrderForDelivery.subscription_id ? 0 : Number(deliveryFeeInput || 0),
        payment_method: paymentMethod,
        cash_amount_received: paymentMethod === 'cash' ? Number(cashReceivedInput || 0) : 0,
        lat: endLat,
        lng: endLng,
      });

      toast.success('Livraison validée avec succès !');
      setShowDeliveryReportModal(false);
      setDeliveryFeeInput(0);
      setCashReceivedInput(0);
      setPaymentMethod('online');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la livraison');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'missions') {
      setFilterStatus('all');
    } else if (tab === 'deliveries') {
      setFilterStatus('active');
    } else {
      setFilterStatus('all');
    }
  };

  const toggleActionSelection = (id: string) => {
    setSelectedActions(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const getActionOptions = () => {
    if (!activeIntervention) return [];
    const isMaman = activeIntervention.patient?.category === 'maman_bebe';
    return isMaman ? VISIT_ACTIONS_MAMAN : VISIT_ACTIONS_SENIOR;
  };

  const getStatusColor = (status: string) => {
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

  const getStatusLabel = (status: string) => {
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

  return (
    <div 
      className="space-y-6 pb-6 px-2 sm:px-0"
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

      {/* HEADER HERO */}
      <section className="relative overflow-hidden bg-white/60 border rounded-2xl p-6 text-center shadow-sm backdrop-blur-md" style={{ borderColor: colors.primary + '15' }}>
        <div className="space-y-1.5 relative z-10">
          <h1 className="text-base sm:text-lg font-black tracking-tight" style={{ color: colors.text }}>
            Espace Intervenant à domicile
          </h1>
          <p className="text-xs max-w-sm mx-auto leading-relaxed" style={{ color: colors.textLight }}>
            Accédez aux fiches de vos patients assignés, démarrez des visites en direct ou gérez vos courses et livraisons.
          </p>
        </div>

        <button
          onClick={async () => {
            setIsRefreshing(true);
            await Promise.all([fetchVisits(), fetchOrders(), fetchMyAssignments(), fetchPatients()]);
            setIsRefreshing(false);
          }}
          disabled={isRefreshing || isLoading_}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
          title="Actualiser"
        >
          <RefreshCw size={13} className={isRefreshing || isLoading_ ? 'animate-spin' : ''} />
        </button>
      </section>

      {/* BANDEAU INTERVENTION ACTIVE */}
      {activeIntervention && (
        <div className="bg-white rounded-3xl p-5 border shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fadeIn" style={{ borderColor: colors.primary + '20' }}>
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-green-50 text-green-500 animate-pulse border border-green-200">
              <Clock size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-green-600 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
                Intervention active
              </span>
              <h2 className="text-sm sm:text-base font-black truncate text-gray-800 mt-0.5">
                Accompagnement de {activeIntervention.target_name}
              </h2>
              <p className="text-xs text-gray-500 truncate mt-0.5">📍 {activeIntervention.address || "Lieu d'intervention"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <div className="px-4 py-2 bg-gray-50 border rounded-2xl text-center shrink-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Temps écoulé</p>
              <p className="text-sm font-mono font-black text-gray-800 mt-0.5">{elapsedTime}</p>
            </div>
            <button
              onClick={() => setShowVisitReportModal(true)}
              className="flex-1 md:flex-none h-11 px-5 rounded-2xl text-white font-bold text-xs shadow-md transition-all hover:opacity-90 flex items-center justify-center gap-1.5"
              style={{ background: colors.primary }}
            >
              <CheckCircle size={15} />
              Finaliser (Rapport)
            </button>
          </div>
        </div>
      )}

      {/* STATS BENTO */}
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
              {stats.missions.pending} prévues
            </p>
          </div>
        </div>

        <div className="bg-white p-3 rounded-2xl border shadow-sm flex flex-col justify-between h-24" style={{ borderColor: colors.primary + '15' }}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider truncate mr-1" style={{ color: colors.textLight }}>Courses</span>
            <ShoppingBag size={13} className="text-blue-500 shrink-0" />
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
            <span className="text-[9px] font-bold uppercase tracking-wider truncate mr-1" style={{ color: colors.textLight }}>Urgentes</span>
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

      {/* NAVIGATION TABS */}
      <section className="w-full overflow-x-auto scrollbar-none py-1">
        <div className="inline-flex p-1 bg-gray-100/80 rounded-2xl border gap-1" style={{ borderColor: colors.primary + '10' }}>
          {[
            { key: 'missions', label: `📋 Accompagnements (${stats.missions.total})` },
            { key: 'deliveries', label: `🚚 Livraisons (${stats.deliveries.total})` },
            { key: 'available', label: `📦 Disponibles (${stats.available})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key as TabType)}
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

      {/* SOUS FILTRES */}
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

      {/* AFFICHAGES LISTES */}
      {activeTab === 'missions' && filterStatus === 'beneficiaires' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.length > 0 ? (
            assignments.map((link: any) => {
              const isPersonal = link.target_type === 'personal_account' || link.is_personal;
              const name = link.target_name || 'Bénéficiaire';
              
              // ✅ RESOLVEUR D'UNICATION DIRECTE DANS LA LISTE POUR L'IHM [24]
              const accountId = link.family_id || link.family?.id;
              const patientData = link.target_type === 'patient' && link.patient_id
                ? (patients.find(p => p.id === link.patient_id) || link.patient)
                : (accountId ? patients.find(p => p.id === accountId || p.created_by === accountId) : null);
                
              const badgeInfo = getBeneficiaryBadgeInfo(link, patientData); // ✅ Résolution de l'IHM réelle en direct ! [23, 24]
              const address = patientData?.address || (isPersonal ? link.family?.address : link.patient?.address) || 'Adresse non renseignée';

              return (
                <div
                  key={link.id}
                  onClick={() => setSelectedBeneficiary(link)}
                  className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition duration-200 cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-sm" 
                      style={{ background: badgeInfo.color }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      {/* ✅ BADGE DIFFÉRENCIÉ DYNAMIQUE SANS DOUBLONS NI FORÇAGE DE CLASSE ! [23, 24] */}
                      <span 
                        className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full" 
                        style={{ backgroundColor: badgeInfo.bg, color: badgeInfo.color }}
                      >
                        {badgeInfo.text}
                      </span>
                      <h3 className="font-extrabold text-sm sm:text-base text-gray-800 truncate mt-1">{name}</h3>
                      <p className="text-xs text-gray-400 truncate mt-0.5">📍 {address}</p>
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
        <section className="space-y-3 animate-fadeIn">
          {filteredItems.map((item) => (
            <MissionItemCompact
              key={item.id}
              item={item}
              type={activeTab}
              colors={colors}
              aidantId={aidantId}
              onStart={() => handleStartPlannedIntervention(item.id)}
              onTakeOrder={() => handleTakeOrder(item.id)}
              onDeliver={() => {
                setSelectedOrderForDelivery(item);
                setShowDeliveryReportModal(true);
              }}
              onView={() => {
                if (activeTab === 'missions' && item?.id) {
                  navigate(`/app/visits/${item.id}`);
                } else if (item?.id) {
                  navigate(`/app/orders/${item.id}`);
                }
              }}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
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
              Aucun résultat
            </h3>
            <p className="text-xs max-w-xs leading-relaxed" style={{ color: colors.textLight }}>
              Aucun élément ne correspond à ce filtre actuellement.
            </p>
          </div>
        </section>
      )}

      {/* ============================================================
          MODAL 1 : FICHE CLINIQUE / DOSSIER PATIENT (DÉMARRAGE VOLÉE)
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
                {/* ✅ BADGE COMPTE RENDU ADAPTATIF INTELLIGENT DU BÉNÉFICIAIRE SÉLECTIONNÉ ! [23, 24] */}
                <span 
                  className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: getBeneficiaryBadgeInfo(selectedBeneficiary, realPatientData).bg, 
                    color: getBeneficiaryBadgeInfo(selectedBeneficiary, realPatientData).color 
                  }}
                >
                  {getBeneficiaryBadgeInfo(selectedBeneficiary, realPatientData).text}
                </span>
                <h2 className="text-lg md:text-xl font-black text-gray-800 truncate mt-1">
                  {selectedBeneficiary.target_name}
                </h2>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  📍 {realPatientData?.address || (selectedBeneficiary.target_type === 'patient' ? selectedBeneficiary.patient?.address : selectedBeneficiary.family?.address) || "Adresse non spécifiée"}
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
                      {/* ✅ CORRECTIF CLINIQUE : Résolution de l'âge réel du compte ou proche ! [23, 24] */}
                      {realPatientData?.age ? `${realPatientData.age} ans` : (realPatientData ? 'Majeur (Non renseigné)' : 'Compte majeur')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold">Sexe / Genre</span>
                    <span className="font-extrabold text-gray-700 uppercase">
                      {/* ✅ CORRECTIF CLINIQUE : Résolution du genre réel de la fiche unifiée ! [23, 24] */}
                      {realPatientData?.gender === 'male' ? 'Homme' : (realPatientData?.gender === 'female' ? 'Femme' : 'Non précisé')}
                    </span>
                  </div>
                </div>
              </div>

              {/* ✅ SÉCURISÉ : Les informations cliniques réelles d'intervention s'affichent d'office si le dossier réel existe */}
              {realPatientData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                      <Stethoscope size={14} className="text-red-500" /> Diagnostics & Pathologies
                    </h4>
                    <div className="p-3 bg-red-50/20 border border-red-100 rounded-xl min-h-[58px]">
                      <p className="font-semibold text-red-900 leading-normal text-xs">
                        {realPatientData.conditions || "Aucune pathologie chronique signalée."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                      <Pill size={14} className="text-blue-500" /> Traitements
                    </h4>
                    <div className="p-3 bg-blue-50/20 border border-blue-100 rounded-xl min-h-[58px]">
                      <p className="font-semibold text-blue-900 leading-normal text-xs">
                        {realPatientData.treatments || "Pas de traitement médical en cours."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                  <FileText size={14} style={{ color: colors.primary }} /> Notes d'aide
                </h4>
                <div className="p-4 bg-gray-50/50 rounded-2xl border space-y-3">
                  {realPatientData?.allergies && (
                    <div>
                      <span className="text-[10px] text-red-600 font-extrabold block uppercase tracking-wider">⚠️ Allergies signalées</span>
                      <p className="font-bold text-red-700 mt-0.5">{realPatientData.allergies}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-gray-400 font-extrabold block uppercase tracking-wider">📝 Confort</span>
                    <p className="font-medium text-gray-600 mt-1 leading-relaxed">
                      {realPatientData?.notes || "Accompagnement de confort personnel."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBeneficiary(null)}
                  className="flex-1 h-12 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition border"
                >
                  Fermer
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

      {/* MODAL RAPPORT DE VISITE */}
      {showVisitReportModal && activeIntervention && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm overflow-y-auto">
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
                onClick={() => setShowVisitReportModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">
                Cochez les actions accomplies *
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
                        isChecked ? "border-emerald-500 bg-emerald-50/30 text-emerald-950" : "bg-white hover:bg-gray-50 text-gray-600"
                      )}
                    >
                      <span className="truncate">{action.icon} {action.label}</span>
                      {isChecked && <Check size={14} className="text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">
                Observations & Rapport
              </label>
              <textarea
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                rows={3}
                placeholder="Décrivez comment s'est déroulé l'accompagnement..."
                className="w-full px-3 py-2.5 border rounded-2xl text-xs sm:text-sm font-semibold outline-none resize-none bg-gray-50/50 focus:bg-white transition"
              />
            </div>

            <div className="flex gap-2.5 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowVisitReportModal(false)}
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

      {/* MODAL RAPPORT LIVRAISON */}
      {showDeliveryReportModal && selectedOrderForDelivery && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-6 shadow-2xl my-8 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-sm sm:text-base font-black">🏁 Clôturer la livraison</h2>
              <button onClick={() => setShowDeliveryReportModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>

            <p className="text-xs text-gray-500">Renseignez les détails de transport et de règlement.</p>

            {!selectedOrderForDelivery.subscription_id ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Frais de livraison réels (FCFA)</label>
                  <input
                    type="number"
                    value={deliveryFeeInput || ''}
                    onChange={(e) => setDeliveryFeeInput(Number(e.target.value))}
                    className="w-full h-10 px-3.5 border rounded-xl text-xs font-bold bg-white mt-1 outline-none"
                    placeholder="Ex: 1500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Règlement client</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setPaymentMethod('online')} className={cn("p-2 rounded-xl text-[10px] font-black uppercase border", paymentMethod === 'online' ? 'border-emerald-500 bg-emerald-50/10 text-emerald-950' : 'bg-white')}>💳 En ligne (Momo)</button>
                    <button type="button" onClick={() => setPaymentMethod('cash')} className={cn("p-2 rounded-xl text-[10px] font-black uppercase border", paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50/10 text-emerald-950' : 'bg-white')}>💵 Espèces (Main)</button>
                  </div>
                </div>

                {paymentMethod === 'cash' && (
                  <div className="animate-fadeIn">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Montant exact reçu (FCFA)</label>
                    <input
                      type="number"
                      value={cashReceivedInput || ''}
                      onChange={(e) => setCashReceivedInput(Number(e.target.value))}
                      className="w-full h-10 px-3.5 border rounded-xl text-xs font-bold bg-white mt-1 outline-none"
                      placeholder="Ex: 1500"
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                ✅ Livraison gratuite (couverte par abonnement).
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 pt-3 border-t">
              <button onClick={() => setShowDeliveryReportModal(false)} className="h-11 rounded-xl font-bold text-gray-500 border">Annuler</button>
              <button onClick={handleDeliverOrder} disabled={isUpdating} className="h-11 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5">
                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Valider
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

const MissionItemCompact = ({
  item,
  type,
  colors,
  onStart,
  onTakeOrder,
  onDeliver,
  onView,
  getStatusColor,
  getStatusLabel,
  formatDate,
  formatTime,
  formatCurrency,
}: any) => {
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
          <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: getStatusColor(item.status) }} />
          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: colors.textLight }}>Accompagnement d'aide</span>
            <p className="font-extrabold text-sm truncate" style={{ color: colors.text }}>
              {getPatientName()}
            </p>
            <div className="flex items-center gap-2 text-[11px] flex-wrap" style={{ color: colors.textLight }}>
              <span className="flex items-center gap-0.5"><Calendar size={11} className="text-gray-400" /> {formatDate(item.scheduled_date)}</span>
              <span>•</span>
              <span className="flex items-center gap-0.5"><Clock size={11} className="text-gray-400" /> {formatTime(item.scheduled_time)}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: getStatusColor(item.status) + '12', color: getStatusColor(item.status) }}>
                {getStatusLabel(item.status)}
              </span>
              {item.is_urgent && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100/35">⚠️ Urgent</span>}
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
              <Play size={12} fill="#ffffff" /> <span>Démarrer</span>
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onView(); }} className="w-8 h-8 rounded-xl bg-gray-50 border text-gray-400 hover:text-gray-700 flex items-center justify-center transition-all" style={{ borderColor: colors.primary + '10' }}>
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
          <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: getStatusColor(item.status) }} />
          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: colors.textLight }}>Livraison active</span>
            <p className="font-extrabold text-sm truncate" style={{ color: colors.text }}>
              📦 {item.description || 'Commande'}
            </p>
            <div className="flex items-center gap-2 text-[11px] flex-wrap" style={{ color: colors.textLight }}>
              <span className="flex items-center gap-0.5"><User size={11} className="text-gray-400" /> {getPatientName()}</span>
              <span>•</span>
              <span className="flex items-center gap-0.5"><Package size={11} className="text-gray-400" /> {formatCurrency(item.estimated_amount || 0)}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: getStatusColor(item.status) + '12', color: getStatusColor(item.status) }}>
                {getStatusLabel(item.status)}
              </span>
              {item.status === 'disponible' && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 animate-pulse">🚨 Urgent</span>}
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
              <Package size={12} /> <span>Prendre</span>
            </button>
          )}

          {isAcceptedOrder && (
            <button
              onClick={(e) => { e.stopPropagation(); onDeliver(); }}
              className="px-3.5 h-8 rounded-xl text-white text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm hover:opacity-90 transition-all bg-blue-500"
            >
              <Truck size={12} /> <span>Livrer</span>
            </button>
          )}

          <button onClick={(e) => { e.stopPropagation(); onView(); }} className="w-8 h-8 rounded-xl bg-gray-50 border text-gray-400 hover:text-gray-800 flex items-center justify-center transition-all" style={{ borderColor: colors.primary + '10' }}>
            <Eye size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissionsPage;
