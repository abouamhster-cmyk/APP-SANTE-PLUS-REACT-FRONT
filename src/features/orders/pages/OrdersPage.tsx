// 📁 frontend/src/features/orders/pages/OrdersPage.tsx
// ✅ PAGE DES COMMANDES COMPLETE : INTÉGRATION DE LA SÉCURITÉ DE QUOTA ILLIMITÉ ET DU VERROU SYNCHRONE CONTRE LES DOUBLES CLICS

import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  ShoppingBag,
  Search,
  Package,
  Clock,
  CheckCircle,
  Truck,
  X,
  Filter,
  List,
  AlertCircle,
  CreditCard,
  Sparkles,
  UserCheck,
  RefreshCw,
} from 'lucide-react';

import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { Illustration } from '@/components/ui/Illustration';
import { OrderCard } from '@/components/orders/OrderCard';
import { AssignAidantModal } from '@/features/aidants/components/AssignAidantModal';
import { isOrderPonctual, cn } from '@/utils/helpers';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const statusFilters = [
  { key: 'all', label: 'Toutes', icon: <List size={12} /> },
  { key: 'creee', label: '📝 Créées', icon: <Package size={12} /> },
  { key: 'en_attente', label: '⏳ En attente', icon: <Clock size={12} /> },
  { key: 'disponible', label: '🚨 Disponibles', icon: <AlertCircle size={12} /> },
  { key: 'en_cours', label: '🔄 En cours', icon: <Clock size={12} /> },
  { key: 'livree', label: '📦 Livrées', icon: <Truck size={12} /> },
  { key: 'validee', label: '✅ Validées', icon: <CheckCircle size={12} /> },
  { key: 'annulee', label: '❌ Annulées', icon: <X size={12} /> },
  { key: 'attente_paiement', label: '💳 En attente', icon: <CreditCard size={12} /> },
  { key: 'ponctual', label: '⚡ Ponctuelles', icon: <Sparkles size={12} /> },
];

interface AidantQuota {
  current: number;
  max: number;
  available: number;
  canTake: boolean;
}

const OrdersPage = () => {
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();
  const { orders, isLoading, fetchOrders, updateOrderStatus, takeOrder } = useOrderStore();

  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();
  const { hasActiveSubscription, remainingOrders } = useSubscriptionGuard();

  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<any>(null);

  const [aidantQuota, setAidantQuota] = useState<AidantQuota | null>(null);
  const [isLoadingQuota, setIsLoadingQuota] = useState(false);

  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startTouchY = useRef(0);

  // ✅ VERROU DE SÉCURITÉ CONTRE LES CLICS CONSECUTIFS RAPIDES
  const isActionPending = useRef(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    if (isAidant && user) {
      fetchAidantQuota();
    }
  }, [isAidant, user, orders]);

  const fetchAidantQuota = async () => {
    setIsLoadingQuota(true);
    try {
      const result = await useOrderStore.getState().checkOrderQuota();
      setAidantQuota(result);
    } catch (error) {
      console.error('❌ fetchAidantQuota error:', error);
    } finally {
      setIsLoadingQuota(false);
    }
  };

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((order) => order.status === 'en_attente').length,
    available: orders.filter((order) => order.status === 'disponible').length,
    inProgress: orders.filter((order) => order.status === 'en_cours').length,
    delivery: orders.filter((order) => order.status === 'livree').length,
    completed: orders.filter((order) => order.status === 'validee').length,
    pendingPayment: orders.filter((order) => order.status === 'attente_paiement').length,
    ponctual: orders.filter((order) => isOrderPonctual(order)).length,
    canTakeCount: orders.filter((order) => 
      ['creee', 'en_attente', 'disponible'].includes(order.status)
    ).length,
  }), [orders]);

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
        (async () => {
          await fetchOrders();
          if (isAidant) await fetchAidantQuota();
        })(),
        {
          loading: 'Actualisation des commandes...',
          success: 'Commandes à jour !',
          error: 'Échec de synchronisation.',
        }
      );
    }
    setPullY(0);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('pending_ponctual_order');
    if (saved) {
      sessionStorage.removeItem('pending_ponctual_order');
      localStorage.removeItem('pending_ponctual_order');
    }
  }, []);

  const handleShowAssignAidantModal = (order: any) => {
    setSelectedOrderForAssign(order);
    setShowAssignModal(true);
  };

  const handleAssignAidantSuccess = async () => {
    useOrderStore.getState().invalidateCache();
    await fetchOrders(true);
    toast.success('Aidant assigné avec succès');
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      let matchStatus = true;
      const isMyActiveOrder = isAidant && order.aidant?.user_id === user?.id;

      if (activeStatus === 'ponctual') {
        matchStatus = isOrderPonctual(order);
      } else if (activeStatus !== 'all') {
        matchStatus = order.status === activeStatus;
      } else {
        matchStatus = true;
      }

      if (isMyActiveOrder && ['all', 'ponctual', 'en_cours', 'livree'].includes(activeStatus)) {
        if (activeStatus === 'ponctual') {
          matchStatus = isOrderPonctual(order);
        } else if (activeStatus === 'en_cours') {
          matchStatus = order.status === 'en_cours';
        } else if (activeStatus === 'livree') {
          matchStatus = order.status === 'livree';
        } else {
          matchStatus = true;
        }
      }

      const query = search.trim().toLowerCase();
      const matchSearch =
        !query ||
        order.description?.toLowerCase().includes(query) ||
        order.address?.toLowerCase().includes(query) ||
        order.type?.toLowerCase().includes(query) ||
        order.patient?.first_name?.toLowerCase().includes(query) ||
        order.patient?.last_name?.toLowerCase().includes(query);

      return matchStatus && matchSearch;
    });
  }, [orders, search, activeStatus, isAidant, user?.id]);

  const handleStatusChange = async (id: string, status: string) => {
    if (isProcessing || isActionPending.current) return;
    
    isActionPending.current = true;
    setIsProcessing(true);

    try {
      const validStatuses = ['creee', 'en_attente', 'en_cours', 'livree', 'validee', 'annulee', 'disponible', 'attente_paiement'];
      if (!validStatuses.includes(status)) {
        toast.error(`Statut "${status}" invalide`);
        setIsProcessing(false);
        isActionPending.current = false;
        return;
      }

      await updateOrderStatus(id, status as any);

      const statusMessages: Record<string, string> = {
        en_cours: 'Commande acceptée et en cours',
        livree: 'Commande livrée avec succès',
        annulee: 'Commande annulée',
        disponible: 'Commande disponible pour tous les aidants',
        attente_paiement: 'Commande en attente de paiement',
      };

      toast.success(statusMessages[status] || `Commande ${status}`);
      
      if (isAidant) {
        await fetchAidantQuota();
      }
    } catch (error: any) {
      console.error('❌ Erreur mise à jour:', error);
      toast.error(error?.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsProcessing(false);
      isActionPending.current = false; // Libérer le verrou
    }
  };

  const handleTakeOrder = async (id: string) => {
    if (isProcessing || isActionPending.current) return;
    
    isActionPending.current = true;
    setIsProcessing(true);

    try {
      await takeOrder(id);
      toast.success('Commande prise en charge ✅');
      
      if (isAidant) {
        await fetchAidantQuota();
      }
    } catch (error: any) {
      console.error('❌ Erreur prise commande:', error);
      toast.error(error?.message || 'Erreur lors de la prise de commande');
    } finally {
      setIsProcessing(false);
      isActionPending.current = false; // Libérer le verrou
    }
  };

  const getPageTitle = () => {
    if (isFamily) return 'Mes commandes & courses';
    if (isAidant) return 'Commandes à livrer';
    if (isAdminOrCoordinator) return 'Gestion des commandes';
    return 'Commandes';
  };

  const getEmptyMessage = () => {
    if (isFamily) return 'Créez votre première commande.';
    if (isAidant) return 'Aucune commande disponible pour le moment.';
    if (isAdminOrCoordinator) return 'Aucune commande enregistrée.';
    return 'Aucune commande.';
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-28 bg-gray-100 dark:bg-gray-800/50 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 bg-gray-100 dark:bg-gray-850 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2].map((item) => (
            <div key={item} className="h-20 bg-gray-100 dark:bg-gray-850 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="space-y-6 pb-6 animate-fadeIn"
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

      {/* HEADER */}
      <section className="relative overflow-hidden bg-white/60 dark:bg-[#17231d]/60 border border-gray-100/80 dark:border-gray-800/40 rounded-2xl p-6 text-center shadow-sm backdrop-blur-md flex flex-col items-center gap-4">
        <div className="space-y-1 relative z-10">
          <h1 className="text-base sm:text-lg font-black tracking-tight text-gray-800 dark:text-gray-100">
            {getPageTitle()}
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm mx-auto leading-relaxed">
            Gérez, payez vos commissions ou suivez en direct l'intervenant en cours de livraison.
          </p>
        </div>

        {isAidant && aidantQuota && (
          <div className="px-5 py-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 text-center max-w-xs w-full relative z-10">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Mon Activité Livraisons
            </p>
            <p className="text-sm font-black text-emerald-800 dark:text-emerald-100 mt-0.5 leading-none">
              {aidantQuota.current} active(s) en cours
            </p>
            <p className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 font-medium mt-1">
              Suivi de mes livraisons actives
            </p>
          </div>
        )}

        {stats.pendingPayment > 0 && isFamily && (
          <button
            onClick={() => setActiveStatus('attente_paiement')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50/50 dark:bg-[#20112c] border border-purple-100/50 dark:border-purple-900/30 text-[10px] font-extrabold text-purple-800 dark:text-purple-300 transition hover:bg-purple-100/40 relative z-10"
          >
            <CreditCard size={12} className="text-purple-500 animate-pulse" />
            <span>{stats.pendingPayment} commande(s) en attente de paiement</span>
          </button>
        )}

        {isFamily && (
          <button
            onClick={() => navigate('/app/orders/create')}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shadow-sm relative z-10"
            style={{ background: colors.primary }}
          >
            <Plus size={13} strokeWidth={2.5} />
            <span>Créer une commande</span>
          </button>
        )}

        <button
          onClick={async () => {
            toast.promise(
              (async () => {
                await fetchOrders();
                if (isAidant) await fetchAidantQuota();
              })(),
              {
                loading: 'Mise à jour...',
                success: 'Données synchronisées !',
                error: 'Échec de la mise à jour',
              }
            );
          }}
          disabled={isLoading}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-gray-50 dark:bg-[#24362d] flex items-center justify-center text-gray-400 hover:text-gray-600 transition shadow-inner"
          title="Rafraîchir"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </section>

      {/* BENTO D'ACTIVITÉ */}
      <section className="grid grid-cols-3 gap-2.5 w-full">
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-24">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate">Demandes</span>
            <ShoppingBag size={13} className="text-emerald-500 shrink-0" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-black text-gray-800 leading-none">{stats.total}</p>
            <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1 leading-none truncate">{stats.pending} en attente</p>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-24">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate">Livraisons</span>
            <Truck size={13} className="text-blue-500 shrink-0" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-black text-gray-800 leading-none">{stats.inProgress}</p>
            <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1 leading-none truncate">{stats.delivery} livrées</p>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-24">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate">Urgentes</span>
            <AlertCircle size={13} className="text-amber-500 shrink-0" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-black text-gray-800 leading-none">{stats.available}</p>
            <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1 leading-none truncate">{stats.ponctual} à l'acte</p>
          </div>
        </div>
      </section>

      {/* FILTRES PAR TABS */}
      <section className="w-full overflow-x-auto scrollbar-none py-1">
        <div className="inline-flex p-1 bg-gray-100/80 rounded-2xl border border-gray-200/10 gap-1">
          {statusFilters.map((filter) => {
            const isActive = activeStatus === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => setActiveStatus(filter.key)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap select-none flex items-center gap-1.5",
                  isActive
                    ? "bg-white text-gray-900 shadow-sm font-extrabold"
                    : "text-gray-500 hover:text-gray-700"
                )}
                style={isActive ? { color: colors.primary } : undefined}
              >
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* RECHERCHE */}
      <section className="w-full">
        <div className="relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par article, adresse, bénéficiaire..."
            className="w-full h-11 pl-11 pr-4 rounded-xl border outline-none bg-white border-gray-100 text-xs font-semibold focus:border-emerald-500/50 transition-all shadow-sm"
            style={{ color: colors.text }}
          />
        </div>
      </section>

      {/* LISTE DES COMMANDES */}
      {filteredOrders.length > 0 ? (
        <section className="space-y-3">
          {filteredOrders.map((order) => (
            <div key={order.id} className="transition-all duration-200 hover:translate-y-[-1px]">
              <OrderCard
                order={order}
                onClick={() => navigate(`/app/orders/${order.id}`)}
                onStatusChange={(status) => handleStatusChange(order.id, status)}
                onTakeOrder={isAidant || isAdminOrCoordinator ? () => handleTakeOrder(order.id) : undefined}
                onShowAssignAidantModal={
                  isAdminOrCoordinator ? () => handleShowAssignAidantModal(order) : undefined
                }
                showActions={true}
                compact
              />
            </div>
          ))}
        </section>
      ) : (
        <section className="bg-white/40 rounded-2xl py-16 px-6 text-center border border-gray-100 max-w-sm mx-auto flex flex-col items-center justify-center gap-4 backdrop-blur-sm shadow-sm">
          <Illustration 
            type={orders.length > 0 ? 'search' : 'order'} 
            size="md" 
            className="mx-auto opacity-35" 
          />
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-gray-800">
              {orders.length > 0 ? 'Aucun résultat' : 'Aucune commande'}
            </h3>
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
              {orders.length > 0
                ? 'Aucune commande ne correspond à votre recherche.'
                : getEmptyMessage()}
            </p>
          </div>

          {isFamily && (
            <button
              onClick={() => navigate('/app/orders/create')}
              className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-white font-bold text-xs transition hover:opacity-90 shadow-sm"
              style={{ background: colors.primary }}
            >
              <Plus size={13} strokeWidth={2.5} />
              Créer une commande
            </button>
          )}
        </section>
      )}

      {/* BOUTON FLOTTANT MOBILE */}
      {isFamily && (
        <button
          onClick={() => navigate('/app/orders/create')}
          className="sm:hidden fixed bottom-24 right-5 z-40 w-12 h-12 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          style={{ 
            background: colors.primary,
            boxShadow: `0 8px 24px -6px ${colors.primary}`
          }}
          aria-label="Créer une commande"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      )}

      {showAssignModal && selectedOrderForAssign && (
        <AssignAidantModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedOrderForAssign(null);
          }}
          targetType="patient"
          targetId={selectedOrderForAssign.id}
          targetName={selectedOrderForAssign.target_name || `Commande ${selectedOrderForAssign.id.slice(0, 8)}`}
          onSuccess={handleAssignAidantSuccess}
          currentAidantId={selectedOrderForAssign.aidant_id}
          allowForce={isAdminOrCoordinator}
          colors={colors} 
        />
      )}
    </div>
  );
};

export default OrdersPage;
