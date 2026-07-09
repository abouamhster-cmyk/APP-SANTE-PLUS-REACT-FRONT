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
  Filter,
  Eye,
  ClipboardList,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime, formatCurrency, cn } from '@/utils/helpers';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type TabType = 'missions' | 'deliveries' | 'available';

const MissionsPage = () => {
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();
  const { visits, fetchVisits, startVisit, approveVisit, refuseVisit, isLoading } = useVisitStore();
  const { orders, fetchOrders, takeOrder, completeDelivery, isLoading: ordersLoading } = useOrderStore();

  const { isAidant } = useTerminology();

  const [activeTab, setActiveTab] = useState<TabType>('missions');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [aidantId, setAidantId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // ÉTATS DE PULL-TO-REFRESH MOBILE
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startTouchY = useRef(0);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ============================================================
  // 🔥 DÉFINITIONS INCONDITIONNELLES DES HOOKS AU SOMMET
  // ============================================================
  const myMissions = useMemo(() => visits.filter(v => v.aidant_id === aidantId), [visits, aidantId]);
  const assignedOrders = useMemo(() => orders.filter(o => o.aidant_id === aidantId), [orders, aidantId]);
  const availableOrders = useMemo(() => orders.filter(o => o.status === 'en_attente' || o.status === 'disponible'), [orders]);
  const deliveryOrders = useMemo(() => assignedOrders.filter(o => o.status === 'en_cours' || o.status === 'livree'), [assignedOrders]);

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
      canTakeCount: availableOrders.length,
    };
  }, [myMissions, assignedOrders, availableOrders]);

  // COMBINAISON DES CHARGEMENTS POUR SÉCURISER L'ÉTAT CONTEXTUEL
  const isLoading_ = isLoading || ordersLoading;

  // FILTRES SECONDAIRES DYNAMIQUES EN HARMONIE AVEC LE CYCLE DE VIE
  const missionSubFilters = useMemo(() => [
    { key: 'all', label: 'Toutes' },
    { key: 'pending', label: `⏳ À valider (${stats.missions.pending})` },
    { key: 'upcoming', label: `📅 Confirmées (${stats.missions.accepted})` },
    { key: 'en_cours', label: `🔄 En cours (${stats.missions.inProgress})` },
    { key: 'history', label: `📝 Historique (${stats.missions.completed})` }
  ], [stats.missions]);

  const deliverySubFilters = useMemo(() => [
    { key: 'active', label: `🔄 En cours (${stats.deliveries.inProgress})` },
    { key: 'history', label: `📦 Livrées (${stats.deliveries.completed})` }
  ], [stats.deliveries]);

  // ✅ Fonction pour obtenir le nom de l'aidant
  const getAidantName = (visit: any) => {
    if (visit.aidant?.user?.full_name) {
      return visit.aidant.user.full_name;
    }
    return 'Non assigné';
  };

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
          console.error('Error checking profile status:', profileError);
          setIsVerified(false);
          return;
        }

        const { data: aidant, error: aidantError } = await supabase
          .from('aidants')
          .select('is_verified, status')
          .eq('user_id', user.id)
          .single();

        if (aidantError) {
          console.error('Error checking aidant status:', aidantError);
          setIsVerified(false);
          return;
        }

        const isVerified = profileData?.is_active === true &&
          profileData?.role === 'aidant' &&
          aidant?.is_verified === true &&
          aidant?.status === 'approved';

        setIsVerified(isVerified);
      } catch (error) {
        console.error('Error:', error);
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

      if (error) {
        console.error('Error fetching aidant:', error);
        return;
      }

      setAidantId(data?.id || null);
    };

    getAidantId();
  }, [user]);

  useEffect(() => {
    if (isVerified) {
      fetchVisits();
      fetchOrders();
    }
  }, [isVerified, fetchVisits, fetchOrders]);

  // GESTION DU RAFAICHISSEMENT EN COULISSES (TACTILE & GLISSANT)
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
        Promise.all([fetchVisits(), fetchOrders()]),
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
      if (filterStatus === 'all') return myMissions;
      if (filterStatus === 'pending') {
        return myMissions.filter(v => v.status === 'planifiee' || v.status === 'en_attente');
      }
      if (filterStatus === 'upcoming') {
        return myMissions.filter(v => v.status === 'acceptee');
      }
      if (filterStatus === 'en_cours') {
        return myMissions.filter(v => v.status === 'en_cours');
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

  const handleApprove = async (id: string) => {
    try {
      await approveVisit(id);
      fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'approbation');
    }
  };

  const handleRefuse = async (id: string) => {
    const reason = prompt('Motif du refus :');
    if (!reason) return;

    try {
      await refuseVisit(id, reason);
      fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du refus');
    }
  };

  const handleStart = async (id: string) => {
    try {
      await startVisit(id);
      fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du démarrage');
    }
  };

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchVisits(), fetchOrders()]);
    setIsRefreshing(false);
  };

  // ✅ Mutation de l'onglet et réalignement du statut par défaut
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

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      planifiee: '#10B981',
      en_attente: '#F59E0B',
      acceptee: '#3B82F6',
      en_cours: '#3B82F6',
      terminee: '#8B5CF6',
      validee: '#10B981',
      annulee: '#EF4444',
      refusee: '#EF4444',
      expire: '#6B7280',
      creee: '#6B7280',
      disponible: '#EF4444',
      livree: '#3B82F6',
      attente_paiement: '#8b5cf6',
    };
    return map[status] || '#9E9E9E';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      planifiee: 'À valider',
      en_attente: 'En attente',
      acceptee: 'Acceptée',
      en_cours: 'En cours',
      terminee: 'Terminée',
      validee: 'Validée',
      annulee: 'Annulée',
      refusee: 'Refusée',
      expire: 'Expirée',
      creee: 'Créée',
      disponible: 'Disponible (urgent)',
      livree: 'Livrée',
      attente_paiement: 'En attente paiement',
    };
    return map[status] || status;
  };

  // ============================================================
  // RENDUS SÉCURISÉS
  // ============================================================

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold" style={{ color: colors.text }}>Vérification des droits...</p>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100">
          <ShieldAlert size={30} className="text-amber-600" />
        </div>
        <h2 className="text-base font-black text-gray-800 dark:text-gray-100">
          ⏳ Compte en cours d'homologation
        </h2>
        <p className="text-xs text-gray-500 max-w-sm mt-1 leading-relaxed">
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
        <div className="h-28 bg-gray-100 dark:bg-gray-850 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-100 dark:bg-gray-850 rounded-2xl animate-pulse" />
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
      {/* 🆕 INDICATEUR DE PULL-TO-REFRESH MOBILE (EXPANSION ÉLASTIQUE) */}
      <div 
        className="w-full flex justify-center overflow-hidden transition-all duration-300 ease-out"
        style={{ 
          height: pullY > 0 ? `${pullY}px` : '0px',
          opacity: pullY > 0 ? Math.min(pullY / 45, 1) : 0
        }}
      >
        <div className="flex items-center gap-1.5 py-1 text-emerald-600 dark:text-emerald-400">
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

      {/* HEADER ÉDITORIAL DANS UN CADRE GLASSMORPHIC */}
      <section className="relative overflow-hidden bg-white/60 dark:bg-[#17231d]/60 border border-gray-100/80 dark:border-gray-800/40 rounded-2xl p-6 text-center shadow-sm backdrop-blur-md">
        <div className="space-y-1.5 relative z-10">
          <h1 className="text-base sm:text-lg font-black tracking-tight text-gray-800 dark:text-gray-100">
            Espace Intervenant à domicile
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm mx-auto leading-relaxed">
            Consultez votre planning d’interventions et gérez vos courses de livraisons d'urgence auprès de vos bénéficiaires.
          </p>
        </div>

        <button
          onClick={async () => {
            toast.promise(
              Promise.all([fetchVisits(), fetchOrders()]),
              {
                loading: 'Mise à jour...',
                success: 'Planning actualisé !',
                error: 'Échec de la mise à jour',
              }
            );
          }}
          disabled={isRefreshing}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-gray-50 dark:bg-[#24362d] flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
          title="Actualiser"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </section>

      {/* ============================================================
          WIDGET BENTO D'ACTIVITÉ MODERNE DE L'INTERVENANT
          ============================================================ */}
      <section className="grid grid-cols-3 gap-2.5 w-full">
        {/* Bento Card 1 : Accompagnements */}
        <div className="bg-white dark:bg-[#17231d] p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800/60 shadow-sm flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 truncate mr-1">Visites</span>
            <Calendar size={13} className="text-emerald-500 shrink-0" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-800 dark:text-gray-100 leading-none truncate">
              {stats.missions.total} planifiées
            </p>
            <p className="text-[10px] text-gray-500 leading-tight mt-1 truncate">
              {stats.missions.pending} à valider
            </p>
          </div>
        </div>

        {/* Bento Card 2 : Livraisons rattachées */}
        <div className="bg-white dark:bg-[#17231d] p-3.5 rounded-2xl border border-gray-100/80 dark:border-gray-800/60 shadow-sm flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 truncate mr-1">Courses</span>
            <ShoppingBag size={13} className="text-blue-500 shrink-0" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-800 dark:text-gray-100 leading-none truncate">
              {stats.deliveries.inProgress} en cours
            </p>
            <p className="text-[10px] text-gray-500 leading-tight mt-1 truncate">
              {stats.deliveries.completed} livrées
            </p>
          </div>
        </div>

        {/* Bento Card 3 : Courses urgentes disponibles */}
        <div className="bg-white dark:bg-[#17231d] p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800/60 shadow-sm flex flex-col justify-between h-28">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 truncate mr-1">Dispos</span>
            <AlertCircle size={13} className="text-amber-500 shrink-0 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-950 dark:text-white leading-none truncate">
              {stats.canTakeCount} urgentes
            </p>
            <p className="text-[10px] text-gray-500 leading-tight mt-1 truncate">
              À prendre
            </p>
          </div>
        </div>
      </section>

      {/* TABS DE SEGMENTATION PREMIER NIVEAU */}
      <section className="w-full overflow-x-auto scrollbar-none py-1">
        <div className="inline-flex p-1 bg-gray-100/80 dark:bg-[#1c2a21]/50 rounded-2xl border border-gray-200/10 dark:border-[#2c3f35]/20 gap-1">
          {[
            { key: 'missions', label: `📋 Missions (${stats.missions.total})` },
            { key: 'deliveries', label: `🚚 Livraisons (${stats.deliveries.total})` },
            { key: 'available', label: `📦 Disponibles (${stats.available})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key as TabType)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap select-none",
                activeTab === tab.key
                  ? "bg-white dark:bg-[#17231d] text-gray-900 dark:text-white shadow-sm font-extrabold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              )}
              style={activeTab === tab.key ? { color: colors.primary } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* FILTRES SECONDAIRES DYNAMIQUES */}
      {activeTab === 'missions' && (
        <section className="w-full overflow-x-auto scrollbar-none py-1">
          <div className="inline-flex p-0.5 bg-gray-100/40 dark:bg-[#111a15]/30 rounded-xl border border-gray-200/5 dark:border-[#2c3f35]/15 gap-1">
            {missionSubFilters.map((sub) => {
              const isActive = filterStatus === sub.key;
              return (
                <button
                  key={sub.key}
                  onClick={() => setFilterStatus(sub.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all select-none",
                    isActive
                      ? "bg-white dark:bg-[#17231d] text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-600"
                  )}
                  style={isActive ? { color: colors.primary } : undefined}
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
          <div className="inline-flex p-0.5 bg-gray-100/40 dark:bg-[#111a15]/30 rounded-xl border border-gray-200/5 dark:border-[#2c3f35]/15 gap-1">
            {deliverySubFilters.map((sub) => {
              const isActive = filterStatus === sub.key;
              return (
                <button
                  key={sub.key}
                  onClick={() => setFilterStatus(sub.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all select-none",
                    isActive
                      ? "bg-white dark:bg-[#17231d] text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-600"
                  )}
                  style={isActive ? { color: colors.primary } : undefined}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* LISTE DES MISSIONS ET COMMANDES */}
      {filteredItems.length > 0 ? (
        <section className="space-y-3">
          {filteredItems.map((item) => (
            <MissionItemCompact
              key={item.id}
              item={item}
              type={activeTab}
              colors={colors}
              aidantId={aidantId}
              onApprove={() => handleApprove(item.id)}
              onRefuse={() => handleRefuse(item.id)}
              onStart={() => handleStart(item.id)}
              onTakeOrder={() => handleTakeOrder(item.id)}
              onDeliver={() => handleDeliverOrder(item.id)}
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
        <section className="bg-white/40 dark:bg-[#17231d]/40 rounded-2xl py-16 px-6 text-center border border-gray-100 dark:border-gray-800/40 max-w-sm mx-auto flex flex-col items-center justify-center gap-4 backdrop-blur-sm shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-[#24362d] flex items-center justify-center text-gray-400">
            {activeTab === 'missions' ? <ClipboardList size={20} /> :
             activeTab === 'deliveries' ? <Truck size={20} /> :
             <Package size={20} />}
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-gray-800 dark:text-gray-100">
              {activeTab === 'missions' && 'Aucune mission planifiée'}
              {activeTab === 'deliveries' && 'Aucune livraison en cours'}
              {activeTab === 'available' && 'Aucune commande disponible'}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed">
              {activeTab === 'missions' && 'Revenez plus tard ou contactez la coordination pour de nouveaux accompagnements.'}
              {activeTab === 'deliveries' && 'Vos livraisons en cours s\'afficheront ici pour un suivi GPS réactif.'}
              {activeTab === 'available' && 'Toutes les courses d\'urgences ont été pourvues par nos équipes de confiance.'}
            </p>
          </div>
        </section>
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
  onApprove,
  onRefuse,
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
  const isPending = item.status === 'planifiee' || item.status === 'en_attente';
  const isAccepted = item.status === 'acceptee';

  const getAidantName = () => {
    if (item.aidant?.user?.full_name) {
      return item.aidant.user.full_name;
    }
    return 'Non assigné';
  };

  if (isMission) {
    return (
      <div
        className="bg-white dark:bg-[#17231d] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800/60 cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        onClick={onView}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Liseré vertical dynamique épuré au lieu d'une bordure brute */}
          <div 
            className="w-1 h-10 rounded-full shrink-0" 
            style={{ backgroundColor: getStatusColor(item.status) }} 
          />

          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Accompagnement d'aide</span>
            <p className="font-extrabold text-sm text-gray-900 dark:text-gray-100 truncate">
              {item.patient?.first_name} {item.patient?.last_name}
            </p>
            <div className="flex items-center gap-2 text-[11px] flex-wrap text-gray-500 dark:text-gray-400">
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
          {isPending && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onApprove(); }}
                className="w-8 h-8 rounded-xl text-white flex items-center justify-center shadow-sm hover:opacity-90 transition-all bg-emerald-500"
                title="Approuver"
              >
                <CheckCircle size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRefuse(); }}
                className="w-8 h-8 rounded-xl text-white flex items-center justify-center shadow-sm hover:opacity-90 transition-all bg-red-500"
                title="Refuser"
              >
                <XCircle size={14} />
              </button>
            </>
          )}

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
            className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-850 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center justify-center transition-all"
          >
            <Eye size={13} />
          </button>
        </div>
      </div>
    );
  }

  const isAvailable = item.status === 'en_attente' || item.status === 'disponible';
  const isAcceptedOrder = item.status === 'en_cours';

  const getPatientName = () => {
    if (item.patient) {
      return `${item.patient.first_name} ${item.patient.last_name}`;
    }
    if (item.family?.full_name) {
      return item.family.full_name;
    }
    return 'Client';
  };

  return (
    <div
      className="bg-white dark:bg-[#17231d] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800/60 cursor-pointer hover:shadow-md transition-all duration-200"
      onClick={onView}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Liseré vertical dynamique épuré */}
          <div 
            className="w-1 h-10 rounded-full shrink-0" 
            style={{ backgroundColor: getStatusColor(item.status) }} 
          />

          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Livraison active</span>
            <p className="font-extrabold text-sm text-gray-900 dark:text-gray-100 truncate">
              📦 {item.description || 'Commande'}
            </p>
            <div className="flex items-center gap-2 text-[11px] flex-wrap text-gray-500 dark:text-gray-400">
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
            className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-850 text-gray-400 hover:text-gray-800 flex items-center justify-center transition-all"
          >
            <Eye size={13} />
          </button>
        </div>
      </div>

      {/* Barre de progression simplifiée */}
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
                    isDone ? "text-white" : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                  }`}
                  style={{ background: isDone ? colors.primary : undefined }}
                >
                  {isDone ? <CheckCircle size={10} /> : index + 1}
                </div>
                {index < 2 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 transition-all ${
                      isDone && currentIndex > statusIndex ? "bg-green-500" : "bg-gray-100 dark:bg-gray-800"
                    }`}
                  />
                )}
              </div>
            );
          })}
          <span className="text-[10px] ml-1.5 text-gray-400 font-bold shrink-0">
            {Math.round((['creee', 'en_cours', 'livree'].indexOf(item.status) + 1) / 3 * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default MissionsPage;
