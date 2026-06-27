// 📁 src/features/help/pages/MissionsPage.tsx
// ✅ Version compacte

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime, formatCurrency } from '@/utils/helpers';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type TabType = 'missions' | 'deliveries' | 'available';

const MissionsPage = () => {
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();
  const { visits, fetchVisits, startVisit, isLoading } = useVisitStore();
  const { orders, fetchOrders, acceptOrder, completeDelivery, isLoading: ordersLoading } = useOrderStore();

  const { isAidant } = useTerminology();

  const [activeTab, setActiveTab] = useState<TabType>('missions');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [aidantId, setAidantId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ Vérifier si l'aidant est validé
  useEffect(() => {
    const checkAidantStatus = async () => {
      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        const { data: profile, error: profileError } = await supabase
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

        const isVerified = profile?.is_active === true &&
          profile?.role === 'aidant' &&
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

  // ✅ Récupérer l'ID de l'aidant
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
  }, [isVerified]);

  // ✅ Si l'aidant n'est pas encore vérifié
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={{ color: colors.text }}>Vérification...</p>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: colors.primary + '15' }}>
          <ShieldAlert size={32} style={{ color: colors.primary }} />
        </div>
        <h2 className="text-lg font-bold" style={{ color: colors.text }}>
          ⏳ Compte en attente de validation
        </h2>
        <p className="text-xs max-w-sm" style={{ color: colors.text + '70' }}>
          Votre compte aidant est en cours de vérification. Vous recevrez une notification sous 48h.
        </p>
        <button
          onClick={() => navigate('/app/profile')}
          className="mt-4 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: colors.primary }}
        >
          Voir mon profil
        </button>
      </div>
    );
  }

  // ✅ Filtrer les données
  const myMissions = visits.filter(v => v.aidant_id === aidantId);
  const assignedOrders = orders.filter(o => o.aidant_id === aidantId);
  const availableOrders = orders.filter(o => o.status === 'creee' && !o.aidant_id);
  const deliveryOrders = assignedOrders.filter(o => o.status === 'en_cours' || o.status === 'livree');

  const getFilteredItems = () => {
    if (activeTab === 'missions') {
      return myMissions.filter(v => filterStatus === 'all' || v.status === filterStatus);
    }
    if (activeTab === 'deliveries') {
      return deliveryOrders;
    }
    if (activeTab === 'available') {
      return availableOrders;
    }
    return [];
  };

  const filteredItems = getFilteredItems();

  const stats = {
    missions: {
      total: myMissions.length,
      inProgress: myMissions.filter(v => v.status === 'en_cours').length,
      completed: myMissions.filter(v => v.status === 'terminee' || v.status === 'validee').length,
    },
    deliveries: {
      total: assignedOrders.length,
      inProgress: assignedOrders.filter(o => o.status === 'en_cours').length,
      completed: assignedOrders.filter(o => o.status === 'validee').length,
    },
    available: availableOrders.length,
  };

  const handleStart = async (id: string) => {
    try {
      await startVisit(id);
      toast.success('Mission démarrée 🚀');
      fetchVisits();
    } catch (error) {
      toast.error('Erreur lors du démarrage');
    }
  };

  const handleAcceptOrder = async (id: string) => {
    try {
      await acceptOrder(id);
      toast.success('Commande acceptée ✅');
      fetchOrders();
    } catch (error) {
      toast.error('Erreur lors de l\'acceptation');
    }
  };

  const handleDeliverOrder = async (id: string) => {
    try {
      await completeDelivery(id);
      toast.success('Livraison terminée ✅');
      fetchOrders();
    } catch (error) {
      toast.error('Erreur lors de la livraison');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchVisits(), fetchOrders()]);
    setIsRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      planifiee: '#4CAF50',
      en_cours: '#FF9800',
      terminee: '#2196F3',
      validee: '#9C27B0',
      annulee: '#F44336',
      creee: '#9E9E9E',
      livree: '#2196F3',
    };
    return map[status] || '#9E9E9E';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      planifiee: 'Planifiée',
      en_cours: 'En cours',
      terminee: 'Terminée',
      validee: 'Validée',
      annulee: 'Annulée',
      creee: 'Créée',
      livree: 'Livrée',
    };
    return map[status] || status;
  };

  const isLoading_ = isLoading || ordersLoading;

  if (isLoading_) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

  // ✅ Options de filtre
  const filterOptions = [
    { value: 'all', label: 'Toutes' },
    { value: 'planifiee', label: 'Planifiées' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'terminee', label: 'Terminées' },
    { value: 'annulee', label: 'Annulées' },
  ];

  return (
    <div className="space-y-4 pb-24 sm:pb-10">
      {/* HEADER */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-1.5"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <ClipboardList size={12} />
              Espace aidant
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              🦸 Missions & Livraisons
            </h1>

            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              {stats.missions.total} missions • {stats.deliveries.total} livraisons
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </section>

      {/* STATS COMPACTES */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <CompactStat
          icon={<ClipboardList size={14} />}
          label="Missions"
          value={stats.missions.total}
          color={colors.primary}
          sub={`${stats.missions.inProgress} en cours`}
        />
        <CompactStat
          icon={<Truck size={14} />}
          label="Livraisons"
          value={stats.deliveries.total}
          color="#FF5722"
          sub={`${stats.deliveries.inProgress} en cours`}
        />
        <CompactStat
          icon={<Package size={14} />}
          label="Disponibles"
          value={stats.available}
          color="#4CAF50"
          sub="à prendre"
        />
        <CompactStat
          icon={<CheckCircle size={14} />}
          label="Terminées"
          value={stats.missions.completed + stats.deliveries.completed}
          color="#2196F3"
          sub="terminées"
        />
      </section>

      {/* TABS */}
      <section className="bg-white rounded-2xl p-1 shadow-sm border border-black/5 flex">
        {[
          { key: 'missions', label: `📋 Missions (${stats.missions.total})` },
          { key: 'deliveries', label: `🚚 Livraisons (${stats.deliveries.total})` },
          { key: 'available', label: `📦 Disponibles (${stats.available})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabType)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === tab.key ? 'text-white' : 'text-gray-600'
            }`}
            style={{
              background: activeTab === tab.key ? colors.primary : 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {/* FILTRE (pour missions uniquement) */}
      {activeTab === 'missions' && (
        <section className="bg-white rounded-2xl p-2 shadow-sm border border-black/5">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-2 py-1.5 text-xs rounded-xl border bg-gray-50 outline-none"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({myMissions.filter(v => opt.value === 'all' || v.status === opt.value).length})
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {/* LISTE */}
      {filteredItems.length > 0 ? (
        <section className="space-y-2">
          {filteredItems.map((item) => (
            <MissionItemCompact
              key={item.id}
              item={item}
              type={activeTab}
              colors={colors}
              aidantId={aidantId}
              onStart={() => handleStart(item.id)}
              onAccept={() => handleAcceptOrder(item.id)}
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
        <section className="bg-white rounded-2xl p-6 text-center shadow-sm border border-black/5">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3"
            style={{ background: colors.primary + '10' }}
          >
            {activeTab === 'missions' ? <ClipboardList size={24} style={{ color: colors.primary }} /> :
             activeTab === 'deliveries' ? <Truck size={24} style={{ color: colors.primary }} /> :
             <Package size={24} style={{ color: colors.primary }} />}
          </div>

          <h3 className="text-sm font-bold" style={{ color: colors.text }}>
            {activeTab === 'missions' && 'Aucune mission'}
            {activeTab === 'deliveries' && 'Aucune livraison en cours'}
            {activeTab === 'available' && 'Aucune commande disponible'}
          </h3>

          <p className="text-xs text-gray-400 mt-1">
            {activeTab === 'missions' && 'Revenez plus tard pour de nouvelles missions'}
            {activeTab === 'deliveries' && 'Les livraisons apparaîtront ici quand vous en aurez'}
            {activeTab === 'available' && 'Les commandes disponibles apparaîtront ici'}
          </p>
        </section>
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
  sub?: string;
}

const CompactStat = ({ icon, label, value, color, sub }: CompactStatProps) => {
  return (
    <div className="bg-white rounded-xl p-2.5 shadow-sm border border-black/5">
      <div className="flex items-center justify-between gap-1">
        <div>
          <p className="text-[9px] font-medium text-gray-400">{label}</p>
          <p className="text-base font-bold mt-0.5" style={{ color }}>{value}</p>
          {sub && <p className="text-[8px] text-gray-400">{sub}</p>}
        </div>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + '15', color }}>
          {icon}
        </div>
      </div>
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
  onStart: () => void;
  onAccept: () => void;
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
  onAccept,
  onDeliver,
  onView,
  getStatusColor,
  getStatusLabel,
  formatDate,
  formatTime,
  formatCurrency,
}: MissionItemCompactProps) => {
  const isMission = type === 'missions';
  const isAssignedToMe = item.aidant_id === aidantId;
  const isAvailable = item.status === 'planifiee' && !item.aidant_id;
  const isOrderAvailable = item.status === 'creee' && !item.aidant_id;

  if (isMission) {
    return (
      <div
        className="bg-white rounded-xl p-3 shadow-sm border-l-4 cursor-pointer hover:shadow-md transition"
        style={{ borderLeftColor: getStatusColor(item.status) }}
        onClick={onView}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: colors.text }}>
              {item.patient?.first_name} {item.patient?.last_name}
            </p>
            <div className="flex items-center gap-1.5 text-xs flex-wrap" style={{ color: colors.text + '60' }}>
              <span className="flex items-center gap-0.5">
                <Calendar size={11} /> {formatDate(item.scheduled_date)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Clock size={11} /> {formatTime(item.scheduled_time)}
              </span>
              <span
                className="px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                style={{
                  background: getStatusColor(item.status) + '20',
                  color: getStatusColor(item.status),
                }}
              >
                {getStatusLabel(item.status)}
              </span>
              {item.is_urgent && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium" style={{ background: '#F44336' + '20', color: '#F44336' }}>
                  ⚠️ Urgent
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isAvailable && (
              <button
                onClick={(e) => { e.stopPropagation(); onStart(); }}
                className="px-2 py-1 rounded-lg text-white text-xs font-medium"
                style={{ background: '#4CAF50' }}
              >
                <Play size={12} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onView(); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition"
              style={{ color: colors.primary }}
            >
              <Eye size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Pour les commandes
  const isAccepted = item.status === 'en_cours';
  const isDelivered = item.status === 'livree' || item.status === 'validee';

  return (
    <div
      className="bg-white rounded-xl p-3 shadow-sm border-l-4 cursor-pointer hover:shadow-md transition"
      style={{ borderLeftColor: getStatusColor(item.status) }}
      onClick={onView}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: colors.text }}>
            📦 {item.description || 'Commande'}
          </p>
          <div className="flex items-center gap-1.5 text-xs flex-wrap" style={{ color: colors.text + '60' }}>
            <span className="flex items-center gap-0.5">
              <User size={11} /> {item.patient?.first_name || 'Client'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <Package size={11} /> {formatCurrency(item.estimated_amount || 0)}
            </span>
            <span
              className="px-1.5 py-0.5 rounded-full text-[9px] font-medium"
              style={{
                background: getStatusColor(item.status) + '20',
                color: getStatusColor(item.status),
              }}
            >
              {getStatusLabel(item.status)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isOrderAvailable && (
            <button
              onClick={(e) => { e.stopPropagation(); onAccept(); }}
              className="px-2 py-1 rounded-lg text-white text-xs font-medium"
              style={{ background: '#4CAF50' }}
            >
              <CheckCircle size={12} />
            </button>
          )}
          {isAccepted && (
            <button
              onClick={(e) => { e.stopPropagation(); onDeliver(); }}
              className="px-2 py-1 rounded-lg text-white text-xs font-medium"
              style={{ background: '#2196F3' }}
            >
              <Truck size={12} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition"
            style={{ color: colors.primary }}
          >
            <Eye size={14} />
          </button>
        </div>
      </div>

      {/* ✅ Barre de progression simplifiée */}
      {item.status !== 'annulee' && item.status !== 'validee' && (
        <div className="mt-2 flex items-center gap-1">
          {['creee', 'en_cours', 'livree'].map((status, index) => {
            const statusIndex = ['creee', 'en_cours', 'livree'].indexOf(status);
            const currentIndex = ['creee', 'en_cours', 'livree'].indexOf(item.status);
            const isDone = currentIndex >= statusIndex;

            return (
              <div key={status} className="flex items-center flex-1">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] transition-all ${
                    isDone ? 'text-white' : 'bg-gray-200 text-gray-400'
                  }`}
                  style={{ background: isDone ? colors.primary : '#e5e7eb' }}
                >
                  {isDone ? <CheckCircle size={10} /> : index + 1}
                </div>
                {index < 2 && (
                  <div
                    className={`flex-1 h-0.5 mx-0.5 transition-all ${
                      isDone && currentIndex > statusIndex ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
          <span className="text-[8px] ml-1 text-gray-400">
            {Math.round((['creee', 'en_cours', 'livree'].indexOf(item.status) + 1) / 3 * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default MissionsPage;
