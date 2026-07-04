// 📁 src/features/orders/pages/OrdersPage.tsx

import { useEffect, useMemo, useState } from 'react';
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
  ClipboardList,
  AlertCircle,
  UserPlus,
} from 'lucide-react';

import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { Illustration } from '@/components/ui/Illustration';
import { OrderCard } from '@/components/orders/OrderCard';
import { AssignAidantModal } from '@/components/common/AssignAidantModal';
import { useRefreshableData } from '@/hooks/useRefreshableData';
import { RefreshButton } from '@/components/ui/RefreshButton';
import toast from 'react-hot-toast';

// ✅ FILTRES AVEC NOUVEAUX STATUTS
const statusFilters = [
  { key: 'all', label: 'Toutes', icon: <List size={12} /> },
  { key: 'creee', label: '📝 Créées', icon: <Package size={12} /> },
  { key: 'en_attente', label: '⏳ En attente (30min)', icon: <Clock size={12} /> },
  { key: 'disponible', label: '🚨 Disponibles (urgent)', icon: <AlertCircle size={12} /> },
  { key: 'en_cours', label: '🔄 En cours', icon: <Clock size={12} /> },
  { key: 'livree', label: '📦 Livrées', icon: <Truck size={12} /> },
  { key: 'validee', label: '✅ Validées', icon: <CheckCircle size={12} /> },
  { key: 'annulee', label: '❌ Annulées', icon: <X size={12} /> },
];

const OrdersPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const { orders, isLoading, fetchOrders, updateOrderStatus, takeOrder } = useOrderStore();

  const {
    singular,
    plural,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ États pour l'assignation d'aidant
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState<any>(null);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ UTILISER le hook de rafraîchissement
  const { refreshAll, isRefreshing } = useRefreshableData({
    onRefresh: fetchOrders,
    onError: (error) => toast.error('Erreur lors du rafraîchissement des commandes'),
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('pending_ponctual_order');
    if (saved) {
      console.warn('⚠️ Données de commande en attente trouvées, nettoyage...');
      sessionStorage.removeItem('pending_ponctual_order');
      localStorage.removeItem('pending_ponctual_order');
    }
  }, []);

  // ✅ HANDLER D'ASSIGNATION
  const handleShowAssignAidantModal = (order: any) => {
    setSelectedOrderForAssign(order);
    setShowAssignModal(true);
  };

  const handleAssignAidantSuccess = async () => {
    await fetchOrders();
    toast.success('Aidant assigné avec succès');
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchStatus = activeStatus === 'all' || order.status === activeStatus;
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
  }, [orders, search, activeStatus]);

  const stats = {
    total: orders.length,
    pending: orders.filter((order) => order.status === 'en_attente').length,
    available: orders.filter((order) => order.status === 'disponible').length,
    inProgress: orders.filter((order) => order.status === 'en_cours').length,
    delivery: orders.filter((order) => order.status === 'livree').length,
    completed: orders.filter((order) => order.status === 'validee').length,
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // ✅ Vérifier que le statut est valide
      const validStatuses = ['creee', 'en_attente', 'en_cours', 'livree', 'validee', 'annulee', 'disponible'];
      if (!validStatuses.includes(status)) {
        toast.error(`Statut "${status}" invalide pour une commande`);
        setIsProcessing(false);
        return;
      }

      await updateOrderStatus(id, status as any);

      const statusMessages: Record<string, string> = {
        en_cours: 'Commande acceptée et en cours',
        livree: 'Commande livrée avec succès',
        annulee: 'Commande annulée',
        disponible: 'Commande disponible pour tous les aidants',
      };

      toast.success(statusMessages[status] || `Commande ${status}`);

      // ✅ Recharger après mise à jour
      await fetchOrders();
    } catch (error: any) {
      console.error('❌ Erreur mise à jour:', error);
      toast.error(error?.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTakeOrder = async (id: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      await takeOrder(id);
      toast.success('Commande prise en charge');
      await fetchOrders();
    } catch (error: any) {
      console.error('❌ Erreur prise commande:', error);
      toast.error(error?.message || 'Erreur lors de la prise de commande');
    } finally {
      setIsProcessing(false);
    }
  };

  const getPageTitle = () => {
    if (isFamily) return 'Mes commandes';
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-16 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-12 bg-white rounded-xl animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-20 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden space-y-4 pb-24 sm:pb-10">
      {/* HEADER AVEC BOUTON DE RAFRAÎCHISSEMENT */}
      <section className="w-full bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-1.5"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <ShoppingBag size={12} />
              {isAdminOrCoordinator ? 'Gestion' : 'Mes commandes'}
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              {getPageTitle()}
            </h1>

            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              {orders.length} commande{orders.length > 1 ? 's' : ''}
              {stats.available > 0 && (
                <span className="ml-2 text-red-500">🚨 {stats.available} urgente(s)</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <RefreshButton 
              size="sm" 
              showText={false}
              onRefresh={() => {
                fetchOrders();
                toast.success('Commandes actualisées');
              }}
            />

            {isFamily && (
              <button
                onClick={() => navigate('/app/orders/create')}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white font-bold text-sm"
                style={{ background: colors.primary }}
              >
                <Plus size={16} />
                Nouvelle
              </button>
            )}
          </div>
        </div>
      </section>

      {/* STATS COMPACTES - AVEC NOUVEAUX STATUTS */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <CompactStat
          icon={<Package size={14} />}
          label="Total"
          value={stats.total}
          color={colors.primary}
        />
        <CompactStat
          icon={<Clock size={14} />}
          label="En attente"
          value={stats.pending}
          color="#FF9800"
        />
        <CompactStat
          icon={<AlertCircle size={14} />}
          label="Urgentes"
          value={stats.available}
          color="#F44336"
        />
        <CompactStat
          icon={<Truck size={14} />}
          label="Livrées"
          value={stats.delivery}
          color="#2196F3"
        />
        <CompactStat
          icon={<CheckCircle size={14} />}
          label="Validées"
          value={stats.completed}
          color="#4CAF50"
        />
      </section>

      {/* RECHERCHE + FILTRE */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une commande..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-gray-50 outline-none"
              style={{ borderColor: colors.border, color: colors.text }}
            />
          </div>

          <div className="relative min-w-[140px]">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={activeStatus}
              onChange={(e) => setActiveStatus(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-gray-50 outline-none appearance-none"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              {statusFilters.map((filter) => (
                <option key={filter.key} value={filter.key}>
                  {filter.icon} {filter.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* LISTE */}
      {filteredOrders.length > 0 ? (
        <section className="space-y-2">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
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
          ))}
        </section>
      ) : (
        <section className="bg-white rounded-2xl p-8 text-center shadow-sm border border-black/5">
          <Illustration 
            type={orders.length > 0 ? 'search' : 'order'} 
            size="lg" 
            className="mx-auto mb-4 opacity-30" 
          />
          <h3 className="text-base font-bold" style={{ color: colors.text }}>
            {orders.length > 0 ? 'Aucun résultat' : 'Aucune commande'}
          </h3>
          <p className="text-xs mt-1 text-gray-400 max-w-sm mx-auto">
            {orders.length > 0
              ? 'Aucune commande ne correspond à votre recherche.'
              : getEmptyMessage()}
          </p>

          {isFamily && orders.length === 0 && (
            <button
              onClick={() => navigate('/app/orders/create')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-sm"
              style={{ background: colors.primary }}
            >
              <Plus size={16} />
              Nouvelle commande
            </button>
          )}

          {isFamily && orders.length > 0 && (
            <button
              onClick={() => setSearch('')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border transition hover:bg-gray-50"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              <Search size={16} />
              Réinitialiser la recherche
            </button>
          )}
        </section>
      )}

      {/* BOUTON MOBILE */}
      {isFamily && (
        <button
          onClick={() => navigate('/app/orders/create')}
          className="sm:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-2xl text-white shadow-lg flex items-center justify-center active:scale-95 transition"
          style={{ background: colors.primary }}
          aria-label="Nouvelle commande"
        >
          <Plus size={22} />
        </button>
      )}

      {/* MODAL D'ASSIGNATION D'AIDANT */}
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
        />
      )}
    </div>
  );
};

// =============================================
// COMPACT STAT
// =============================================

interface CompactStatProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

const CompactStat = ({ icon, label, value, color }: CompactStatProps) => {
  return (
    <div className="bg-white rounded-xl p-2.5 shadow-sm border border-black/5">
      <div className="flex items-center justify-between gap-1">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className="text-lg font-bold mt-0.5" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: color + '14', color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
