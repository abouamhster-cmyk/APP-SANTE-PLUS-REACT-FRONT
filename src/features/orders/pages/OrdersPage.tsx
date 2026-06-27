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
} from 'lucide-react';

import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { OrderCard } from '@/components/orders/OrderCard';
import toast from 'react-hot-toast';

// ✅ Filtres simplifiés pour le nouveau cycle de vie
const statusFilters = [
  { key: 'all', label: 'Toutes' },
  { key: 'creee', label: '📝 Créées' },
  { key: 'en_cours', label: '🔄 En cours' },
  { key: 'livree', label: '📦 Livrées' },
  { key: 'validee', label: '✅ Validées' },
  { key: 'annulee', label: '❌ Annulées' },
];

const OrdersPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const { orders, isLoading, fetchOrders, updateOrderStatus } = useOrderStore();

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

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchOrders();
  }, []);

  // ✅ Nettoyer les données en attente au chargement
  useEffect(() => {
    const saved = sessionStorage.getItem('pending_ponctual_order');
    if (saved) {
      console.warn('⚠️ Données de commande en attente trouvées, nettoyage...');
      sessionStorage.removeItem('pending_ponctual_order');
      localStorage.removeItem('pending_ponctual_order');
    }
  }, []);

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

  // ✅ Statistiques avec les nouveaux statuts
  const stats = {
    total: orders.length,
    pending: orders.filter(
      (order) => order.status === 'creee' || order.status === 'en_cours'
    ).length,
    delivery: orders.filter((order) => order.status === 'livree').length,
    completed: orders.filter((order) => order.status === 'validee').length,
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      await updateOrderStatus(id, status as any);

      const statusMessages: Record<string, string> = {
        en_cours: 'Commande acceptée et en cours 🚀',
        livree: 'Commande livrée avec succès 📦',
        annulee: 'Commande annulée ❌',
      };

      toast.success(statusMessages[status] || `Commande ${status}`);

      setTimeout(async () => {
        await fetchOrders();
      }, 500);
    } catch (error: any) {
      console.error('❌ Erreur mise à jour:', error);
      toast.error(error?.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Libellé dynamique
  const getPageTitle = () => {
    if (isFamily) return 'Mes commandes';
    if (isAidant) return 'Commandes à livrer';
    if (isAdminOrCoordinator) return 'Gestion des commandes';
    return 'Commandes';
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
      {/* HEADER */}
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
            </p>
          </div>

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
      </section>

      {/* STATS COMPACTES */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <CompactStat
          icon={<Package size={14} />}
          label="Total"
          value={stats.total}
          color={colors.primary}
        />
        <CompactStat
          icon={<Clock size={14} />}
          label="En cours"
          value={stats.pending}
          color="#FF9800"
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
              placeholder="Rechercher..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-gray-50 outline-none"
              style={{ borderColor: colors.border, color: colors.text }}
            />
          </div>

          <div className="relative min-w-[130px]">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={activeStatus}
              onChange={(e) => setActiveStatus(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-gray-50 outline-none appearance-none"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              {statusFilters.map((filter) => (
                <option key={filter.key} value={filter.key}>
                  {filter.label}
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
              showActions={true}
              compact
            />
          ))}
        </section>
      ) : (
        <section className="bg-white rounded-2xl p-6 text-center shadow-sm border border-black/5">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            {orders.length > 0 ? <Search size={24} /> : <ShoppingBag size={24} />}
          </div>

          <h3 className="text-base font-bold" style={{ color: colors.text }}>
            {orders.length > 0 ? 'Aucun résultat' : 'Aucune commande'}
          </h3>

          <p className="text-xs mt-1 text-gray-500">
            {orders.length > 0
              ? 'Aucune commande ne correspond à votre recherche.'
              : isFamily
                ? 'Créez votre première commande.'
                : isAidant
                  ? 'Aucune commande disponible.'
                  : 'Aucune commande enregistrée.'}
          </p>

          {isFamily && (
            <button
              onClick={() => navigate('/app/orders/create')}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-sm"
              style={{ background: colors.primary }}
            >
              <Plus size={16} />
              Nouvelle commande
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
