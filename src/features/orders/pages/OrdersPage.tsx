// 📁 frontend/src/features/orders/pages/OrdersPage.tsx
// ✅ PAGE DES COMMANDES COMPLETE : INTÉGRATION DE LA SÉCURITÉ DE QUOTA DE LIVRAISON SANS COUPLAGE D'ABONNEMENTS

import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ShoppingBag, Search, Package, Clock, CheckCircle, Truck, X, Filter, List, AlertCircle, CreditCard, Sparkles, UserCheck, RefreshCw } from 'lucide-react';

import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { Illustration } from '@/components/ui/Illustration';
import { OrderCard } from '@/components/orders/OrderCard';
import { AssignAidantModal } from '@/features/aidants/components/AssignAidantModal';
import { isOrderPonctual, cn } from '@/utils/helpers';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const statusFilters = [
  { key: 'all', label: 'Toutes', icon: null },
  { key: 'creee', label: '📝 Créées', icon: null },
  { key: 'en_attente', label: '⏳ En attente', icon: null },
  { key: 'disponible', label: '🚨 Disponibles', icon: null },
  { key: 'en_cours', label: '🔄 En cours', icon: null },
  { key: 'livree', label: '📦 Livrées', icon: null },
  { key: 'validee', label: '✅ Validées', icon: null },
  { key: 'annulee', label: '❌ Annulées', icon: null },
  { key: 'attente_paiement', label: '💳 En attente', icon: null },
];

interface AidantQuota { current: number; max: number; available: number; canTake: boolean; }

const OrdersPage = () => {
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;
  const { orders, isLoading, fetchOrders, updateOrderStatus, takeOrder } = useOrderStore();

  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

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

  const isActionPending = useRef(false);

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
    canTakeCount: orders.filter((order) => ['creee', 'en_attente', 'disponible'].includes(order.status)).length,
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
          error: 'Échec de la synchronisation.',
        }
      );
    }
    setPullY(0);
  };

  useEffect(() => {
    fetchOrders();
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

      if (activeStatus !== 'all') {
        matchStatus = order.status === activeStatus;
      }

      if (isMyActiveOrder && ['all', 'en_cours', 'livree'].includes(activeStatus)) {
        if (activeStatus === 'en_cours') {
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
      isActionPending.current = false;
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
      isActionPending.current = false;
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
      <div className="space-y-6 max-w-5xl mx-auto pb-6">
        <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="space-y-6 max-w-5xl mx-auto pb-6"
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

      {/* HEADER */}
      <section className="relative overflow-hidden bg-white/60 border rounded-2xl p-6 text-center shadow-sm backdrop-blur-md flex flex-col items-center gap-4" style={{ borderColor: colors.primary + '15' }}>
        <div className="space-y-1 relative z-10">
          <h1 className="text-base sm:text-lg font-black tracking-tight" style={{ color: colors.text }}>
            {getPageTitle()}
          </h1>
          <p className="text-xs max-w-sm mx-auto leading-relaxed" style={{ color: colors.textLight }}>
            Gérez, payez vos commissions ou suivez en direct l'intervenant en cours de livraison.
          </p>
        </div>

        {isAidant && aidantQuota && (
          <div className="px-5 py-2.5 rounded-xl text-center max-w-xs w-full relative z-10" style={{ backgroundColor: colors.primary + '10', border: `1px solid ${colors.primary + '20'}` }}>
            <p className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: colors.primary }}>
              Mon Activité Livraisons
            </p>
            <p className="text-sm font-black mt-0.5 leading-none" style={{ color: colors.primary }}>
              {aidantQuota.current} active(s) en cours
            </p>
            <p className="text-[9px] font-medium mt-1" style={{ color: colors.primary + '80' }}>
              Suivi de mes livraisons actives
            </p>
          </div>
        )}

        {stats.pendingPayment > 0 && isFamily && (
          <button
            onClick={() => setActiveStatus('attente_paiement')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-extrabold transition relative z-10"
            style={{ backgroundColor: '#8b5cf615', color: '#8b5cf6', border: '1px solid #8b5cf630' }}
          >
            <CreditCard size={12} className="animate-pulse" style={{ color: '#8b5cf6' }} />
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
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition shadow-inner"
          title="Rafraîchir"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </section>

      {/* BENTO D'ACTIVITÉ */}
      <section className="grid grid-cols-3 gap-2.5 w-full">
        <div className="bg-white p-3 sm:p-4 rounded-2xl border shadow-sm flex flex-col justify-between h-24" style={{ borderColor: colors.primary + '15' }}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: colors.textLight }}>Demandes</span>
            <ShoppingBag size={13} className="text-emerald-500 shrink-0" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-black leading-none" style={{ color: colors.text }}>{stats.total}</p>
            <p className="text-[9px] sm:text-[10px] mt-1 leading-none truncate" style={{ color: colors.textLight }}>{stats.pending} en attente</p>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-2xl border shadow-sm flex flex-col justify-between h-24" style={{ borderColor: colors.primary + '15' }}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: colors.textLight }}>Livraisons</span>
            <Truck size={13} className="text-blue-500 shrink-0" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-black leading-none" style={{ color: colors.text }}>{stats.inProgress}</p>
            <p className="text-[9px] sm:text-[10px] mt-1 leading-none truncate" style={{ color: colors.textLight }}>{stats.delivery} livrées</p>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-2xl border shadow-sm flex flex-col justify-between h-24" style={{ borderColor: colors.primary + '15' }}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: colors.textLight }}>Urgentes</span>
            <AlertCircle size={13} className="text-amber-500 shrink-0" />
          </div>
          <div>
            <p className="text-base sm:text-lg font-black leading-none" style={{ color: colors.text }}>{stats.available}</p>
            <p className="text-[9px] sm:text-[10px] mt-1 leading-none truncate" style={{ color: colors.textLight }}>{stats.ponctual} à l'acte</p>
          </div>
        </div>
      </section>

      {/* FILTRES PAR TABS */}
      <section className="w-full overflow-x-auto scrollbar-none py-1">
        <div className="inline-flex p-1 bg-gray-100/80 rounded-2xl border gap-1" style={{ borderColor: colors.primary + '10' }}>
          {statusFilters.map((filter) => {
            const isActive = activeStatus === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => setActiveStatus(filter.key)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap select-none flex items-center gap-1.5",
                  isActive
                    ? "bg-white shadow-sm font-extrabold"
                    : "hover:opacity-80"
                )}
                style={{
                  color: isActive ? colors.primary : colors.textLight,
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                }}
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
            className="w-full h-11 pl-11 pr-4 rounded-xl border outline-none bg-white text-xs font-semibold focus:border-emerald-500/50 transition-all shadow-sm"
            style={{ borderColor: colors.primary + '20', color: colors.text }}
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
                onStatusChange={(status: string) => handleStatusChange(order.id, status)} 
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
        <section className="bg-white/40 rounded-2xl py-16 px-6 text-center border max-w-sm mx-auto flex flex-col items-center justify-center gap-4 backdrop-blur-sm shadow-sm" style={{ borderColor: colors.primary + '15' }}>
          <Illustration 
            type={orders.length > 0 ? 'search' : 'order'} 
            size="md" 
            className="mx-auto opacity-35" 
          />
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm" style={{ color: colors.text }}>
              {orders.length > 0 ? 'Aucun résultat' : 'Aucune commande'}
            </h3>
            <p className="text-xs max-w-xs leading-relaxed" style={{ color: colors.textLight }}>
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
          targetType="order"
          targetId={selectedOrderForAssign.id}
          targetName={selectedOrderForAssign.target_name || `Commande ${selectedOrderForAssign.id.slice(0, 8)}`}
          onSuccess={handleAssignAidantSuccess}
          currentAidantId={selectedOrderForAssign.aidant_id}
          colors={colors} 
        />
      )}
    </div>
  );
};

export default OrdersPage;
