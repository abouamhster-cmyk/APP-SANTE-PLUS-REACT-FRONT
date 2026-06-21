// 📁 src/features/admin/pages/AdminSubscriptionsPage.tsx

import { useEffect, useState } from 'react';
import {
  Package,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  User,
  DollarSign,
  Award,
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, formatCurrency } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface Subscription {
  id: string;
  user_id: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
  patient_id: string | null;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  offre_id: string | null;
  offre?: {
    id: string;
    name: string;
    price: number;
    category: string;
  } | null;
  status: 'en_attente' | 'actif' | 'expire' | 'annule' | 'suspendu' | 'en_cours_de_renouvellement';
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  total_visits: number;
  used_visits: number;
  remaining_visits: number;
  total_orders: number;
  used_orders: number;
  remaining_orders: number;
  created_at: string;
  updated_at: string;
}

// ✅ Fonctions en dehors du composant
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    en_attente: '⏳ En attente',
    actif: '🟢 Actif',
    expire: '🔴 Expiré',
    annule: '🚫 Annulé',
    suspendu: '⏸️ Suspendu',
    en_cours_de_renouvellement: '🔄 Renouvellement',
  };
  return labels[status] || status;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    en_attente: '#FF9800',
    actif: '#4CAF50',
    expire: '#F44336',
    annule: '#9E9E9E',
    suspendu: '#FF9800',
    en_cours_de_renouvellement: '#2196F3',
  };
  return colors[status] || '#9E9E9E';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'actif': return <CheckCircle size={16} className="text-green-500" />;
    case 'en_attente': return <Clock size={16} className="text-yellow-500" />;
    case 'expire': return <XCircle size={16} className="text-red-500" />;
    case 'annule': return <XCircle size={16} className="text-gray-400" />;
    case 'suspendu': return <AlertCircle size={16} className="text-yellow-500" />;
    case 'en_cours_de_renouvellement': return <RefreshCw size={16} className="text-blue-500" />;
    default: return <Clock size={16} className="text-gray-400" />;
  }
};

const AdminSubscriptionsPage = () => {
  const { profile, role } = useAuthStore();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setIsLoading(true);

      // 1. Récupérer les abonnements
      const { data: subsData, error: subsError } = await supabase
        .from('abonnements')
        .select('*')
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;

      // 2. Récupérer les profils
      const userIds = [...new Set(subsData?.map(s => s.user_id).filter(Boolean))];
      let profileMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone')
          .in('id', userIds);

        if (!profilesError && profiles) {
          profileMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // 3. Récupérer les patients
      const patientIds = [...new Set(subsData?.map(s => s.patient_id).filter(Boolean))];
      let patientMap: Record<string, any> = {};

      if (patientIds.length > 0) {
        const { data: patients, error: patientsError } = await supabase
          .from('patients')
          .select('id, first_name, last_name')
          .in('id', patientIds);

        if (!patientsError && patients) {
          patientMap = patients.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // 4. Récupérer les offres
      const offreIds = [...new Set(subsData?.map(s => s.offre_id).filter(Boolean))];
      let offreMap: Record<string, any> = {};

      if (offreIds.length > 0) {
        const { data: offres, error: offresError } = await supabase
          .from('offres')
          .select('id, name, price, category')
          .in('id', offreIds);

        if (!offresError && offres) {
          offreMap = offres.reduce((acc, o) => {
            acc[o.id] = o;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // 5. Fusionner les données
      const subsWithData = (subsData || []).map(sub => ({
        ...sub,
        user: sub.user_id ? profileMap[sub.user_id] || null : null,
        patient: sub.patient_id ? patientMap[sub.patient_id] || null : null,
        offre: sub.offre_id ? offreMap[sub.offre_id] || null : null,
      }));

      setSubscriptions(subsWithData);

    } catch (error: any) {
      console.error('Fetch subscriptions error:', error);
      toast.error('Erreur lors du chargement des abonnements');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch =
      sub.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.offre?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'actif').length,
    pending: subscriptions.filter(s => s.status === 'en_attente').length,
    expired: subscriptions.filter(s => s.status === 'expire').length,
    cancelled: subscriptions.filter(s => s.status === 'annule').length,
    totalRevenue: subscriptions
      .filter(s => s.status === 'actif' || s.status === 'en_attente')
      .reduce((sum, s) => sum + (s.offre?.price || 0), 0),
  };

  const handleViewDetails = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setShowDetailsModal(true);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('abonnements')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Abonnement mis à jour`);
      fetchSubscriptions();
    } catch (error) {
      console.error('Update subscription error:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleToggleRenew = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('abonnements')
        .update({ auto_renew: !currentValue })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Renouvellement ${!currentValue ? 'activé' : 'désactivé'}`);
      fetchSubscriptions();
    } catch (error) {
      console.error('Toggle renew error:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black" style={{ color: colors.text }}>
              📋 Gestion des abonnements
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
              Gérez tous les abonnements de la plateforme
            </p>
          </div>
          <button
            onClick={fetchSubscriptions}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl font-medium transition hover:opacity-80 flex items-center gap-2"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </section>

      {/* Statistiques */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label="Total"
          value={stats.total}
          color={colors.primary}
          icon={<Package size={20} />}
        />
        <StatCard
          label="Actifs"
          value={stats.active}
          color="#4CAF50"
          icon={<CheckCircle size={20} />}
        />
        <StatCard
          label="En attente"
          value={stats.pending}
          color="#FF9800"
          icon={<Clock size={20} />}
        />
        <StatCard
          label="Expirés"
          value={stats.expired}
          color="#F44336"
          icon={<XCircle size={20} />}
        />
        <StatCard
          label="Revenus"
          value={formatCurrency(stats.totalRevenue)}
          color="#2196F3"
          icon={<DollarSign size={20} />}
        />
      </section>

      {/* Filtres */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, email ou offre..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border outline-none text-sm"
              style={{
                borderColor: colors.border,
                background: 'var(--color-background)',
                color: colors.text,
              }}
            />
          </div>
          <div className="relative min-w-[180px]">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5" style={{ color: colors.text + '40' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border outline-none text-sm appearance-none"
              style={{
                borderColor: colors.border,
                background: 'var(--color-background)',
                color: colors.text,
              }}
            >
              <option value="all">Tous les statuts</option>
              <option value="actif">🟢 Actifs</option>
              <option value="en_attente">⏳ En attente</option>
              <option value="expire">🔴 Expirés</option>
              <option value="annule">🚫 Annulés</option>
              <option value="suspendu">⏸️ Suspendus</option>
              <option value="en_cours_de_renouvellement">🔄 Renouvellement</option>
            </select>
          </div>
        </div>
      </section>

      {/* Liste des abonnements */}
      <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-t-transparent" style={{ borderColor: colors.primary }} />
            <p className="mt-2 text-sm" style={{ color: colors.text + '60' }}>Chargement des abonnements...</p>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-bold" style={{ color: colors.text }}>
              Aucun abonnement trouvé
            </h3>
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              {searchTerm || statusFilter !== 'all'
                ? 'Aucun abonnement ne correspond à vos critères'
                : 'Aucun abonnement n\'a encore été enregistré'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredSubscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                colors={colors}
                onView={() => handleViewDetails(subscription)}
                onUpdateStatus={handleUpdateStatus}
                onToggleRenew={handleToggleRenew}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal Détails */}
      {showDetailsModal && selectedSubscription && (
        <SubscriptionDetailsModal
          subscription={selectedSubscription}
          onClose={() => setShowDetailsModal(false)}
          colors={colors}
        />
      )}
    </div>
  );
};

// =============================================
// STAT CARD
// =============================================

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}

const StatCard = ({ label, value, color, icon }: StatCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-black" style={{ color }}>{value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: color + '15', color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

// =============================================
// SUBSCRIPTION CARD
// =============================================

interface SubscriptionCardProps {
  subscription: Subscription;
  colors: any;
  onView: () => void;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onToggleRenew: (id: string, currentValue: boolean) => Promise<void>;
}

const SubscriptionCard = ({
  subscription,
  colors,
  onView,
  onUpdateStatus,
  onToggleRenew,
}: SubscriptionCardProps) => {
  const statusColor = getStatusColor(subscription.status);
  const isActive = subscription.status === 'actif';
  const progress = subscription.total_visits > 0
    ? (subscription.used_visits / subscription.total_visits) * 100
    : 0;

  return (
    <div
      className="bg-white rounded-2xl p-5 border transition hover:shadow-md"
      style={{ borderColor: isActive ? colors.primary + '30' : colors.border }}
    >
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold" style={{ color: colors.text }}>
            {subscription.offre?.name || 'Abonnement'}
          </h3>
          <p className="text-sm" style={{ color: colors.text + '60' }}>
            {subscription.user?.full_name || 'Utilisateur inconnu'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {getStatusIcon(subscription.status)}
          <span className="text-xs font-medium" style={{ color: statusColor }}>
            {getStatusLabel(subscription.status)}
          </span>
        </div>
      </div>

      {/* Prix */}
      <div className="mt-2">
        <span className="text-xl font-black" style={{ color: colors.primary }}>
          {formatCurrency(subscription.offre?.price || 0)}
        </span>
        <span className="text-xs ml-1" style={{ color: colors.text + '40' }}>
          / {subscription.offre?.category || 'mois'}
        </span>
      </div>

      {/* Progression */}
      <div className="mt-3">
        <div className="flex justify-between text-xs" style={{ color: colors.text + '50' }}>
          <span>Visites</span>
          <span>{subscription.used_visits} / {subscription.total_visits}</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-200 mt-1 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%`, background: colors.primary }}
          />
        </div>
      </div>

      {/* Infos */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs" style={{ color: colors.text + '40' }}>
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {formatDate(subscription.start_date)}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {formatDate(subscription.end_date)}
        </span>
        {subscription.auto_renew && (
          <span className="flex items-center gap-1 text-green-500">
            <RefreshCw size={12} />
            Auto
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 pt-3 border-t" style={{ borderColor: colors.border }}>
        <button
          onClick={onView}
          className="flex-1 py-2 rounded-xl text-sm font-medium transition hover:bg-gray-50 flex items-center justify-center gap-1.5"
          style={{ border: `1px solid ${colors.border}`, color: colors.text }}
        >
          <Eye size={14} />
          Détails
        </button>
        {isActive && (
          <button
            onClick={() => onToggleRenew(subscription.id, subscription.auto_renew)}
            className="p-2 rounded-xl transition hover:bg-gray-50"
            style={{ border: `1px solid ${colors.border}`, color: subscription.auto_renew ? '#4CAF50' : '#9E9E9E' }}
          >
            <RefreshCw size={16} />
          </button>
        )}
        {subscription.status === 'en_attente' && (
          <button
            onClick={() => onUpdateStatus(subscription.id, 'actif')}
            className="p-2 rounded-xl text-white transition hover:opacity-80"
            style={{ background: '#4CAF50' }}
          >
            <CheckCircle size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

// =============================================
// SUBSCRIPTION DETAILS MODAL
// =============================================

interface SubscriptionDetailsModalProps {
  subscription: Subscription;
  onClose: () => void;
  colors: any;
}

const SubscriptionDetailsModal = ({ subscription, onClose, colors }: SubscriptionDetailsModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b" style={{ borderColor: colors.border }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>
              📋 Détails de l'abonnement
            </h2>
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              {subscription.offre?.name || 'Abonnement'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={24} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <InfoBox
              label="Statut"
              value={getStatusLabel(subscription.status)}
              color={getStatusColor(subscription.status)}
            />
            <InfoBox
              label="Utilisateur"
              value={subscription.user?.full_name || 'N/A'}
              color={colors.primary}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoBox
              label="Email"
              value={subscription.user?.email || 'N/A'}
              color={colors.text}
            />
            <InfoBox
              label="Offre"
              value={subscription.offre?.name || 'N/A'}
              color={colors.primary}
            />
          </div>

          <InfoRow label="Patient" value={subscription.patient ? `${subscription.patient.first_name} ${subscription.patient.last_name}` : 'Non assigné'} />
          <InfoRow label="Prix" value={formatCurrency(subscription.offre?.price || 0)} />
          <InfoRow label="Date de début" value={formatDate(subscription.start_date)} />
          <InfoRow label="Date de fin" value={formatDate(subscription.end_date)} />
          <InfoRow label="Renouvellement automatique" value={subscription.auto_renew ? '✅ Actif' : '❌ Inactif'} />

          <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
            <p className="text-sm font-medium" style={{ color: colors.text }}>📊 Utilisation</p>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs" style={{ color: colors.text + '50' }}>Visites</p>
                <p className="font-bold" style={{ color: colors.primary }}>
                  {subscription.used_visits} / {subscription.total_visits}
                </p>
                <p className="text-xs" style={{ color: colors.text + '40' }}>
                  Restantes : {subscription.remaining_visits}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: colors.text + '50' }}>Commandes</p>
                <p className="font-bold" style={{ color: colors.primary }}>
                  {subscription.used_orders} / {subscription.total_orders}
                </p>
                <p className="text-xs" style={{ color: colors.text + '40' }}>
                  Restantes : {subscription.remaining_orders}
                </p>
              </div>
            </div>
          </div>

          <InfoRow label="Date de création" value={formatDate(subscription.created_at)} />
          <InfoRow label="Dernière mise à jour" value={formatDate(subscription.updated_at)} />
        </div>
      </div>
    </div>
  );
};

// =============================================
// INFO BOX
// =============================================

interface InfoBoxProps {
  label: string;
  value: string;
  color: string;
}

const InfoBox = ({ label, value, color }: InfoBoxProps) => {
  return (
    <div className="p-3 rounded-xl" style={{ background: color + '08' }}>
      <p className="text-xs" style={{ color: color + '60' }}>{label}</p>
      <p className="font-bold" style={{ color }}>{value}</p>
    </div>
  );
};

// =============================================
// INFO ROW
// =============================================

interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow = ({ label, value }: InfoRowProps) => {
  return (
    <div className="flex justify-between py-2 border-b last:border-b-0" style={{ borderColor: 'var(--color-border, #e5e0d8)' }}>
      <span className="text-sm font-medium" style={{ color: 'var(--color-text-light, #6b7280)' }}>{label}</span>
      <span className="text-sm" style={{ color: 'var(--color-text, #2d2d2d)' }}>{value}</span>
    </div>
  );
};

export default AdminSubscriptionsPage;