// 📁 src/features/help/pages/MissionsPage.tsx
// 📌 Missions et commandes pour les aidants

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
  Filter,
  RefreshCw,
  ShoppingBag,
  Truck,
  Package,
  Navigation,
  AlertCircle,
  Phone,
  Mail,
  Eye,
  ClipboardList,
  Camera,
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

// ✅ Types pour les onglets
type TabType = 'missions' | 'deliveries' | 'available';

const MissionsPage = () => {
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();
  const { visits, fetchVisits, startVisit, isLoading } = useVisitStore();
  const { 
    orders, 
    fetchOrders, 
    acceptOrder, 
    completeDelivery,  // ✅ Pas de paramètres supplémentaires
    isLoading: ordersLoading,
  } = useOrderStore();

  // ✅ Jargon dynamique selon le rôle
  const {
    singular,
    getCategoryLabel,
    isAidant,
  } = useTerminology();

  const [activeTab, setActiveTab] = useState<TabType>('missions');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [aidantId, setAidantId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProofModal, setShowProofModal] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
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
      // ✅ Ne pas utiliser is_active sur la table aidants
      // ✅ Récupérer le profil utilisateur à la place
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

      // ✅ Vérifier si l'utilisateur est actif ET a le rôle aidant
      const isActiveAndAidant = profile?.is_active === true && profile?.role === 'aidant';

      // ✅ Vérifier aussi dans la table aidants
      const { data: aidant, error: aidantError } = await supabase
        .from('aidants')
        .select('is_verified, status')
        .eq('user_id', user.id)
        .single();

      if (aidantError) {
        console.error('Error checking aidant status:', aidantError);
        // Si l'aidant n'existe pas encore, c'est normal
        setIsVerified(false);
        return;
      }

      // ✅ L'aidant est vérifié si :
      // - Le profil est actif ET a le rôle aidant
      // - L'aidant est vérifié ET approuvé
      const isVerified = isActiveAndAidant && aidant?.is_verified === true && aidant?.status === 'approved';
      
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

  // ✅ Si l'aidant n'est pas encore vérifié, afficher un message
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: colors.text }}>Vérification...</p>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: colors.primary + '15' }}>
          <ShieldAlert size={48} style={{ color: colors.primary }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: colors.text }}>
          ⏳ Compte en attente de validation
        </h2>
        <p className="text-sm max-w-md" style={{ color: colors.text + '70' }}>
          Votre compte aidant est en cours de vérification par notre équipe. 
          Vous recevrez une notification dès que votre compte sera activé.
        </p>
        <p className="text-xs mt-4" style={{ color: colors.text + '40' }}>
          Cette opération peut prendre jusqu'à 48h.
        </p>
        <button
          onClick={() => navigate('/app/profile')}
          className="mt-6 px-6 py-3 rounded-xl text-white font-medium transition hover:opacity-80"
          style={{ background: colors.primary }}
        >
          Voir mon profil
        </button>
      </div>
    );
  }

  // ✅ Filtrer les missions de l'aidant
  const myMissions = visits.filter(v => v.aidant_id === aidantId);
  
  // ✅ Commandes assignées à l'aidant
  const assignedOrders = orders.filter(o => o.aidant_id === aidantId);
  
  // ✅ Commandes disponibles (sans aidant)
  const availableOrders = orders.filter(o => 
    (o.status === 'creee') && !o.aidant_id
  );

  // ✅ Commandes en cours de livraison
  const deliveryOrders = assignedOrders.filter(o => 
    o.status === 'en_cours' || o.status === 'livree'
  );

  // ✅ Filtrer selon l'onglet
  const getFilteredItems = () => {
    if (activeTab === 'missions') {
      return myMissions.filter(v => {
        if (filterStatus === 'all') return true;
        return v.status === filterStatus;
      });
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

  // ✅ Stats
  const stats = {
    missions: {
      total: myMissions.length,
      available: myMissions.filter(v => v.status === 'planifiee').length,
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

  // ✅ Accepter une commande
  const handleAcceptOrder = async (id: string) => {
    try {
      await acceptOrder(id);
      toast.success('Commande acceptée ✅');
      fetchOrders();
    } catch (error) {
      toast.error('Erreur lors de l\'acceptation');
    }
  };

  // ✅ Livrer une commande (simplifié)
  const handleDeliverOrder = async (id: string) => {
    try {
      // ✅ completeDelivery attend un string (id) ou un objet avec proof_url
      await completeDelivery(id);
      toast.success('Livraison terminée ✅');
      fetchOrders();
    } catch (error) {
      toast.error('Erreur lors de la livraison');
    }
  };

  // ✅ Livrer une commande avec preuve (photo)
  const handleDeliverOrderWithProof = async (id: string, proofUrl: string) => {
    try {
      // ✅ Si tu veux ajouter une preuve, tu peux passer un objet
      await completeDelivery(id, proofUrl);
      toast.success('Livraison terminée avec preuve ✅');
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

  // ✅ Statuts simplifiés
  const getStatusColor = (status: string) => {
    const colorsMap: Record<string, string> = {
      // Visites
      planifiee: '#4CAF50',
      en_cours: '#FF9800',
      terminee: '#2196F3',
      validee: '#9C27B0',
      annulee: '#F44336',
      // Commandes simplifiées
      creee: '#9E9E9E',
      livree: '#2196F3',
    };
    return colorsMap[status] || '#9E9E9E';
  };

  const getStatusLabel = (status: string) => {
    const labelsMap: Record<string, string> = {
      // Visites
      planifiee: 'Planifiée',
      en_cours: 'En cours',
      terminee: 'Terminée',
      validee: 'Validée',
      annulee: 'Annulée',
      // Commandes simplifiées
      creee: 'Créée',
      livree: 'Livrée',
    };
    return labelsMap[status] || status;
  };

  const isLoading_ = isLoading || ordersLoading;

  if (isLoading_) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: colors.text }}>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
            🦸 Mon espace aidant
          </h1>
          <p className="mt-1" style={{ color: colors.text + '99' }}>
            {stats.missions.total} missions • {stats.deliveries.total} livraisons
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition hover:opacity-80"
          style={{ background: colors.primary + '15', color: colors.primary }}
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Missions"
          value={stats.missions.total}
          color={colors.primary}
          icon={<ClipboardList size={18} />}
          subtext={`${stats.missions.inProgress} en cours`}
        />
        <StatCard
          label="Livraisons"
          value={stats.deliveries.total}
          color="#FF5722"
          icon={<Truck size={18} />}
          subtext={`${stats.deliveries.inProgress} en cours`}
        />
        <StatCard
          label="Commandes dispo"
          value={stats.available}
          color="#4CAF50"
          icon={<Package size={18} />}
          subtext="à prendre en charge"
        />
        <StatCard
          label="Terminées"
          value={stats.missions.completed + stats.deliveries.completed}
          color="#2196F3"
          icon={<CheckCircle size={18} />}
          subtext="missions + livraisons"
        />
      </div>

      {/* TABS */}
      <div className="bg-white rounded-2xl p-1 shadow-sm border border-black/5 flex">
        <button
          onClick={() => setActiveTab('missions')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
            activeTab === 'missions' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
          style={{
            background: activeTab === 'missions' ? colors.primary : 'transparent',
          }}
        >
          📋 Missions ({stats.missions.total})
        </button>
        <button
          onClick={() => setActiveTab('deliveries')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
            activeTab === 'deliveries' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
          style={{
            background: activeTab === 'deliveries' ? colors.primary : 'transparent',
          }}
        >
          🚚 Livraisons ({stats.deliveries.total})
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
            activeTab === 'available' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
          style={{
            background: activeTab === 'available' ? colors.primary : 'transparent',
          }}
        >
          📦 Disponibles ({stats.available})
        </button>
      </div>

      {/* FILTRE pour les missions */}
      {activeTab === 'missions' && (
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
          <div className="flex flex-wrap gap-2">
            {['all', 'planifiee', 'en_cours', 'terminee', 'annulee'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  filterStatus === status ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
                style={{
                  background: filterStatus === status ? colors.primary : 'transparent',
                }}
              >
                {status === 'all' ? 'Toutes' : getStatusLabel(status)} (
                {myMissions.filter(v => status === 'all' ? true : v.status === status).length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LISTE DES ITEMS */}
      {filteredItems.length > 0 ? (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <ItemCard
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
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: colors.primary + '10' }}>
            {activeTab === 'missions' ? <ClipboardList size={40} style={{ color: colors.primary }} /> :
             activeTab === 'deliveries' ? <Truck size={40} style={{ color: colors.primary }} /> :
             <Package size={40} style={{ color: colors.primary }} />}
          </div>
          <h3 className="text-lg font-medium" style={{ color: colors.text }}>
            {activeTab === 'missions' && 'Aucune mission'}
            {activeTab === 'deliveries' && 'Aucune livraison en cours'}
            {activeTab === 'available' && 'Aucune commande disponible'}
          </h3>
          <p className="mt-1" style={{ color: colors.text + '80' }}>
            {activeTab === 'missions' && 'Revenez plus tard pour de nouvelles missions'}
            {activeTab === 'deliveries' && 'Les livraisons apparaîtront ici quand vous en aurez'}
            {activeTab === 'available' && 'Les commandes disponibles apparaîtront ici'}
          </p>
        </div>
      )}
    </div>
  );
};

// =============================================
// STAT CARD
// =============================================

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  subtext?: string;
}

const StatCard = ({ label, value, color, icon, subtext }: StatCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '15', color }}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// =============================================
// ITEM CARD - Affiche mission ou commande
// =============================================

interface ItemCardProps {
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

const ItemCard = ({
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
}: ItemCardProps) => {
  const isMission = type === 'missions';
  const isAssignedToMe = item.aidant_id === aidantId;
  const isAvailable = item.status === 'planifiee' && !item.aidant_id;
  const isOrderAvailable = item.status === 'creee' && !item.aidant_id;

  // ✅ Pour les missions
  if (isMission) {
    return (
      <div
        className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border-l-4 cursor-pointer"
        style={{ borderLeftColor: getStatusColor(item.status) }}
        onClick={onView}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
                {item.patient?.first_name} {item.patient?.last_name}
              </h3>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
                style={{
                  background: getStatusColor(item.status) + '20',
                  color: getStatusColor(item.status),
                }}
              >
                {getStatusLabel(item.status)}
              </span>
              {item.is_urgent && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#F44336' + '20', color: '#F44336' }}>
                  ⚠️ Urgent
                </span>
              )}
              {isAvailable && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#4CAF50' + '20', color: '#4CAF50' }}>
                  📌 Disponible
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm" style={{ color: colors.text + '60' }}>
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(item.scheduled_date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {formatTime(item.scheduled_time)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {item.patient?.address || 'Adresse non précisée'}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {item.duration_minutes} min
              </span>
            </div>

            {item.notes && (
              <div className="mt-2 p-2 rounded-xl" style={{ background: colors.primary + '05' }}>
                <p className="text-sm" style={{ color: colors.text + '70' }}>{item.notes}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {isAvailable && (
              <button
                onClick={(e) => { e.stopPropagation(); onStart(); }}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-white font-medium text-sm transition hover:opacity-80"
                style={{ background: '#4CAF50' }}
              >
                <Play size={16} />
                Démarrer
              </button>
            )}
            {isAssignedToMe && item.status === 'planifiee' && (
              <button
                onClick={(e) => { e.stopPropagation(); onStart(); }}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-white font-medium text-sm transition hover:opacity-80"
                style={{ background: '#FF9800' }}
              >
                <Play size={16} />
                Démarrer
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onView(); }}
              className="flex items-center gap-1 px-4 py-2 rounded-xl font-medium text-sm transition hover:bg-gray-50"
              style={{ color: colors.text, background: 'transparent', border: `1px solid ${colors.primary + '20'}` }}
            >
              <Eye size={16} />
              Détails
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Pour les commandes simplifiées
  const isAccepted = item.status === 'en_cours';
  const isDelivered = item.status === 'livree' || item.status === 'validee';

  return (
    <div
      className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border-l-4 cursor-pointer"
      style={{ borderLeftColor: getStatusColor(item.status) }}
      onClick={onView}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
              📦 {item.description || 'Commande'}
            </h3>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
              style={{
                background: getStatusColor(item.status) + '20',
                color: getStatusColor(item.status),
              }}
            >
              {getStatusLabel(item.status)}
            </span>
            {isOrderAvailable && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#4CAF50' + '20', color: '#4CAF50' }}>
                📌 À prendre
              </span>
            )}
            {item.order_type === 'ponctual' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                💳 Ponctuelle
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm" style={{ color: colors.text + '60' }}>
            <span className="flex items-center gap-1">
              <User size={14} />
              {item.patient?.first_name || 'Client'}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={14} />
              {item.address || 'Adresse non précisée'}
            </span>
            <span className="flex items-center gap-1">
              <Package size={14} />
              {formatCurrency(item.estimated_amount || 0)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {formatDate(item.created_at)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {isOrderAvailable && (
            <button
              onClick={(e) => { e.stopPropagation(); onAccept(); }}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-white font-medium text-sm transition hover:opacity-80"
              style={{ background: '#4CAF50' }}
            >
              <CheckCircle size={16} />
              Accepter
            </button>
          )}
          {isAccepted && (
            <button
              onClick={(e) => { e.stopPropagation(); onDeliver(); }}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-white font-medium text-sm transition hover:opacity-80"
              style={{ background: '#2196F3' }}
            >
              <Truck size={16} />
              Livrer
            </button>
          )}
          {isDelivered && (
            <span className="flex items-center gap-1 px-4 py-2 rounded-xl text-green-600 font-medium text-sm" style={{ background: '#4CAF50' + '15' }}>
              <CheckCircle size={16} />
              Livrée ✓
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="flex items-center gap-1 px-4 py-2 rounded-xl font-medium text-sm transition hover:bg-gray-50"
            style={{ color: colors.text, background: 'transparent', border: `1px solid ${colors.primary + '20'}` }}
          >
            <Eye size={16} />
            Détails
          </button>
        </div>
      </div>

      {/* ✅ Barre de progression simplifiée (3 étapes) */}
      {item.status !== 'annulee' && item.status !== 'validee' && (
        <div className="mt-4 flex items-center gap-2">
          {['creee', 'en_cours', 'livree'].map((status, index) => {
            const statusIndex = ['creee', 'en_cours', 'livree'].indexOf(status);
            const currentIndex = ['creee', 'en_cours', 'livree'].indexOf(item.status);
            const isDone = currentIndex >= statusIndex;
            const isCurrent = item.status === status;

            return (
              <div key={status} className="flex items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                    isDone ? 'text-white' : 'bg-gray-200 text-gray-400'
                  }`}
                  style={{ background: isDone ? colors.primary : '#e5e7eb' }}
                >
                  {isDone ? <CheckCircle size={14} /> : index + 1}
                </div>
                {index < 2 && (
                  <div
                    className={`w-6 h-0.5 mx-1 transition-all ${
                      isDone && currentIndex > statusIndex ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
          <span className="text-xs ml-2" style={{ color: colors.text + '40' }}>
            {Math.round((['creee', 'en_cours', 'livree'].indexOf(item.status) + 1) / 3 * 100)}%
          </span>
        </div>
      )}

      {/* ✅ Info de validation automatique */}
      {item.status === 'livree' && (
        <div className="mt-3 text-xs text-blue-600 flex items-center gap-1">
          <Clock size={14} />
          <span>En attente de validation automatique (dans 12h)</span>
        </div>
      )}
    </div>
  );
};

export default MissionsPage;
