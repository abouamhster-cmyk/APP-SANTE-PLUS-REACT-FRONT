// 📁 src/features/help/pages/MissionsPage.tsx
 
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
  AlertCircle,
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
  const { visits, fetchVisits, startVisit, approveVisit, refuseVisit, isLoading } = useVisitStore();
  const { orders, fetchOrders, takeOrder, completeDelivery, isLoading: ordersLoading } = useOrderStore();

  const { isAidant } = useTerminology();

  const [activeTab, setActiveTab] = useState<TabType>('missions');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [aidantId, setAidantId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

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

  const myMissions = visits.filter(v => v.aidant_id === aidantId);
  const assignedOrders = orders.filter(o => o.aidant_id === aidantId);
  const availableOrders = orders.filter(o => o.status === 'en_attente' || o.status === 'disponible');
  const deliveryOrders = assignedOrders.filter(o => o.status === 'en_cours' || o.status === 'livree');

  const pendingVisits = myMissions.filter(v => v.status === 'planifiee' || v.status === 'en_attente');
  const acceptedVisits = myMissions.filter(v => v.status === 'acceptee');

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
      pending: pendingVisits.length,
      accepted: acceptedVisits.length,
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

  const handleApprove = async (id: string) => {
    try {
      await approveVisit(id);
      toast.success('Visite approuvée');
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
      toast.error('Visite refusée');
      fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du refus');
    }
  };

  const handleStart = async (id: string) => {
    try {
      await startVisit(id);
      toast.success('Mission démarrée 🚀');
      fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du démarrage');
    }
  };

  const handleTakeOrder = async (id: string) => {
    try {
      await takeOrder(id);
      toast.success('Commande prise en charge ✅');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la prise de commande');
    }
  };

  const handleDeliverOrder = async (id: string) => {
    try {
      await completeDelivery(id);
      toast.success('Livraison terminée ✅');
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

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      planifiee: '#4CAF50',
      en_attente: '#FF9800',
      acceptee: '#2196F3',
      en_cours: '#2196F3',
      terminee: '#9C27B0',
      validee: '#4CAF50',
      annulee: '#F44336',
      refusee: '#F44336',
      expire: '#795548',
      creee: '#9E9E9E',
      disponible: '#F44336',
      livree: '#2196F3',
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

  const filterOptions = [
    { value: 'all', label: 'Toutes' },
    { value: 'planifiee', label: '📋 À valider' },
    { value: 'en_attente', label: '⏳ En attente' },
    { value: 'acceptee', label: '✅ Acceptées' },
    { value: 'en_cours', label: '🔄 En cours' },
    { value: 'terminee', label: '📝 Terminées' },
    { value: 'validee', label: '✔️ Validées' },
    { value: 'annulee', label: '❌ Annulées' },
    { value: 'refusee', label: '🚫 Refusées' },
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
              {stats.missions.pending > 0 && (
                <span className="ml-2 text-yellow-500">⏳ {stats.missions.pending} à valider</span>
              )}
              {stats.available > 0 && (
                <span className="ml-2 text-red-500">🚨 {stats.available} commandes urgentes</span>
              )}
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
          sub={`${stats.missions.pending} à valider`}
        />
        <CompactStat
          icon={<Truck size={14} />}
          label="Livraisons"
          value={stats.deliveries.total}
          color="#FF5722"
          sub={`${stats.deliveries.inProgress} en cours`}
        />
        <CompactStat
          icon={stats.available > 0 ? <AlertCircle size={14} /> : <Package size={14} />}
          label="Disponibles"
          value={stats.available}
          color={stats.available > 0 ? '#F44336' : '#4CAF50'}
          sub={stats.available > 0 ? '🚨 Urgentes' : 'à prendre'}
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
  const isInProgress = item.status === 'en_cours';

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
            {/* ✅ AIDANT : Approuver/Refuser */}
            {isPending && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onApprove(); }}
                  className="px-2 py-1 rounded-lg text-white text-xs font-medium"
                  style={{ background: '#4CAF50' }}
                >
                  <CheckCircle size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRefuse(); }}
                  className="px-2 py-1 rounded-lg text-white text-xs font-medium"
                  style={{ background: '#F44336' }}
                >
                  <XCircle size={12} />
                </button>
              </>
            )}

            {/* ✅ AIDANT : Démarrer une visite acceptée */}
            {isAccepted && (
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
  const isAvailable = item.status === 'en_attente' || item.status === 'disponible';
  const isAcceptedOrder = item.status === 'en_cours';
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
            {item.status === 'disponible' && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-red-100 text-red-600">
                🚨 Urgent
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* ✅ AIDANT : Prendre une commande disponible */}
          {isAvailable && (
            <button
              onClick={(e) => { e.stopPropagation(); onTakeOrder(); }}
              className={`px-2 py-1 rounded-lg text-white text-xs font-medium ${
                item.status === 'disponible' ? 'animate-pulse' : ''
              }`}
              style={{ background: item.status === 'disponible' ? '#F44336' : '#FF9800' }}
            >
              <Package size={12} />
            </button>
          )}

          {/* ✅ AIDANT : Livrer une commande en cours */}
          {isAcceptedOrder && (
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
