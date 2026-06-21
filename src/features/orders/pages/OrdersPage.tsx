// 📁 src/features/orders/pages/OrdersPage.tsx
// 📌 Page : Gestion des commandes - Cycle de vie simplifié

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
  Play,
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

  // ✅ Jargon dynamique selon le rôle
  const {
    singular,
    plural,
    getCountLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ Charger les commandes au montage
  useEffect(() => {
    fetchOrders();
  }, []);

  // ✅ Nettoyer les données en attente au chargement de la page
  useEffect(() => {
    // ✅ Si des données de commande ponctuelle sont en attente,
    // c'est qu'il y a eu un problème, on les nettoie
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

  // ✅ Gestion du changement de statut avec protection contre les appels en boucle
  const handleStatusChange = async (id: string, status: string) => {
    // ✅ Éviter les appels en boucle
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
      
      // ✅ Petit délai avant de rafraîchir pour éviter les conflits
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

  if (isLoading) {
    return (
      <div className="w-full max-w-full overflow-hidden space-y-4">
        <div className="h-24 bg-white rounded-3xl animate-pulse" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-20 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-32 bg-white rounded-3xl animate-pulse" />
      </div>
    );
  }

  // ✅ Libellé dynamique pour le titre
  const getPageTitle = () => {
    if (isFamily) return 'Mes commandes';
    if (isAidant) return 'Commandes à livrer';
    if (isAdminOrCoordinator) return 'Gestion des commandes';
    return 'Commandes';
  };

  // ✅ Libellé dynamique pour le bouton "Nouvelle"
  const getNewButtonLabel = () => {
    if (isFamily) return 'Nouvelle commande';
    return 'Nouvelle';
  };

  return (
    <div className="w-full max-w-full overflow-hidden space-y-4 pb-24 sm:pb-10">
      {/* HEADER */}
      <section className="w-full bg-white rounded-3xl p-4 shadow-sm border border-black/5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold mb-2"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <ShoppingBag size={12} />
              {isAdminOrCoordinator ? 'Gestion des commandes' : 'Mes commandes'}
            </div>

            <h1
              className="text-2xl font-black tracking-tight leading-tight"
              style={{ color: colors.text }}
            >
              {getPageTitle()}
            </h1>

            <p className="text-sm mt-1" style={{ color: colors.text + '75' }}>
              {orders.length} commande{orders.length > 1 ? 's' : ''} au total
            </p>
          </div>

          <button
            onClick={() => navigate('/app/orders/create')}
            className="hidden sm:inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-white font-bold"
            style={{ background: colors.primary }}
          >
            <Plus size={18} />
            {getNewButtonLabel()}
          </button>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatBox
          icon={<Package size={18} />}
          label="Total"
          value={stats.total}
          color={colors.primary}
        />

        <StatBox
          icon={<Clock size={18} />}
          label="À traiter"
          value={stats.pending}
          color="#FF9800"
        />

        <StatBox
          icon={<Truck size={18} />}
          label="En livraison"
          value={stats.delivery}
          color="#2196F3"
        />

        <StatBox
          icon={<CheckCircle size={18} />}
          label="Validées"
          value={stats.completed}
          color="#4CAF50"
        />
      </section>

      {/* RECHERCHE */}
      <section className="bg-white rounded-3xl p-3 sm:p-4 shadow-sm border border-black/5 space-y-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: colors.text + '60' }}
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une commande..."
            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-gray-50 border border-black/5 outline-none text-sm"
            style={{ color: colors.text }}
          />

          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl hover:bg-gray-200 flex items-center justify-center"
            >
              <X size={15} className="text-gray-500" />
            </button>
          )}
        </div>

        <div className="-mx-3 sm:mx-0 overflow-x-auto px-3 sm:px-0 pb-1">
          <div className="flex gap-2 min-w-max">
            {statusFilters.map((filter) => {
              const active = activeStatus === filter.key;

              return (
                <button
                  key={filter.key}
                  onClick={() => setActiveStatus(filter.key)}
                  className="shrink-0 px-3 py-2 rounded-full text-xs font-bold border whitespace-nowrap"
                  style={{
                    background: active ? colors.primary : '#f9fafb',
                    color: active ? '#ffffff' : colors.text,
                    borderColor: active ? colors.primary : 'rgba(0,0,0,0.06)',
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* LISTE */}
      {filteredOrders.length > 0 ? (
        <section className="space-y-3 min-w-0">
          {filteredOrders.map((order) => (
            <div key={order.id} className="min-w-0 max-w-full overflow-hidden">
              <OrderCard
                order={order}
                onClick={() => navigate(`/app/orders/${order.id}`)}
                onStatusChange={(status) => handleStatusChange(order.id, status)}
                showActions={true}
                compact
              />
            </div>
          ))}
        </section>
      ) : (
        <section className="bg-white rounded-3xl p-6 text-center shadow-sm border border-black/5">
          <div
            className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
            style={{
              background: colors.primary + '12',
              color: colors.primary,
            }}
          >
            {orders.length > 0 ? <Search size={28} /> : <ShoppingBag size={28} />}
          </div>

          <h3 className="text-lg font-black" style={{ color: colors.text }}>
            {orders.length > 0 ? 'Aucun résultat' : 'Aucune commande'}
          </h3>

          <p
            className="mt-2 text-sm max-w-sm mx-auto leading-relaxed"
            style={{ color: colors.text + '75' }}
          >
            {orders.length > 0
              ? 'Aucune commande ne correspond à votre recherche.'
              : isFamily
                ? 'Créez votre première commande pour commencer.'
                : isAidant
                  ? 'Aucune commande disponible pour le moment.'
                  : 'Aucune commande enregistrée.'}
          </p>

          {isFamily && (
            <button
              onClick={() => navigate('/app/orders/create')}
              className="mt-5 inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-white font-bold"
              style={{ background: colors.primary }}
            >
              <Plus size={18} />
              Nouvelle commande
            </button>
          )}
        </section>
      )}

      {/* BOUTON MOBILE */}
      {isFamily && (
        <button
          onClick={() => navigate('/app/orders/create')}
          className="sm:hidden fixed bottom-5 right-5 z-40 w-14 h-14 rounded-2xl text-white shadow-xl flex items-center justify-center active:scale-95 transition"
          style={{ background: colors.primary }}
          aria-label="Nouvelle commande"
        >
          <Plus size={26} />
        </button>
      )}
    </div>
  );
};

// =============================================
// STAT BOX
// =============================================

interface StatBoxProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

const StatBox = ({ icon, label, value, color }: StatBoxProps) => {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm border border-black/5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-gray-500 truncate">{label}</p>
          <p className="text-xl font-black leading-tight mt-1" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: color + '14', color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;