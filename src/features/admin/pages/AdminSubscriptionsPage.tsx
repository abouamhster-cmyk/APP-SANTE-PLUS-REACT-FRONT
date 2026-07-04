// 📁 src/features/admin/pages/AdminSubscriptionsPage.tsx
//  - StatCardProps définie

import { useEffect, useState } from 'react';
import {
  Package,
  Search,
  Filter,
  RefreshCw,
  Eye,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
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

// ✅ Interface StatCardProps
interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    en_attente: 'En attente ⏳',
    actif: 'Actif 🟢',
    expire: 'Expiré 🔴',
    annule: 'Annulé 🚫',
    suspendu: 'Suspendu ⏸️',
    en_cours_de_renouvellement: 'Renouvellement 🔄',
  };
  return labels[status] || status;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    en_attente: '#f59e0b',
    actif: '#10b981',
    expire: '#ef4444',
    annule: '#94a3b8',
    suspendu: '#f59e0b',
    en_cours_de_renouvellement: '#3b82f6',
  };
  return colors[status] || '#94a3b8';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'actif': return <CheckCircle size={14} className="text-green-500" />;
    case 'en_attente': return <Clock size={14} className="text-yellow-500" />;
    case 'expire': return <XCircle size={14} className="text-red-500" />;
    case 'suspendu': return <AlertCircle size={14} className="text-yellow-500" />;
    default: return <Clock size={14} className="text-gray-400" />;
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
      const { data: subsData, error: subsError } = await supabase
        .from('abonnements')
        .select('*')
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;

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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <section 
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all"
        style={{ background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.primary}12 100%)` }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: colors.text }}>
              📋 Abonnements clients
            </h1>
            <p className="text-xs" style={{ color: colors.textLight }}>
              Gestion des formules souscrites par les familles
            </p>
          </div>
          <button
            onClick={fetchSubscriptions}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border bg-white hover:bg-gray-50"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} color={colors.primary} icon={<Package size={16} />} />
        <StatCard label="Actifs" value={stats.active} color="#10b981" icon={<CheckCircle size={16} />} />
        <StatCard label="En attente" value={stats.pending} color="#f59e0b" icon={<Clock size={16} />} />
        <StatCard label="Expirés" value={stats.expired} color="#ef4444" icon={<XCircle size={16} />} />
        <StatCard label="Revenus" value={formatCurrency(stats.totalRevenue)} color="#3b82f6" icon={<DollarSign size={16} />} />
      </section>

      {/* Filtres */}
      <section className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par client ou abonnement..."
          className="flex-1 px-3.5 py-2 rounded-xl border outline-none text-xs"
          style={{ borderColor: colors.border, background: 'var(--color-background)' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl border outline-none text-xs"
          style={{ borderColor: colors.border, background: 'var(--color-background)', color: colors.text }}
        >
          <option value="all">Tous les statuts</option>
          <option value="actif">🟢 Actifs</option>
          <option value="en_attente">⏳ En attente</option>
          <option value="expire">🔴 Expirés</option>
        </select>
      </section>

      {/* Grille de cartes épurées */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 text-center"><RefreshCw size={24} className="animate-spin mx-auto text-gray-300" /></div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400">Aucun abonnement enregistré</div>
        ) : (
          filteredSubscriptions.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              colors={colors}
              onView={() => handleViewDetails(sub)}
              onUpdateStatus={handleUpdateStatus}
              onToggleRenew={handleToggleRenew}
            />
          ))
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
// SUBSCRIPTION CARD
// =============================================

const SubscriptionCard = ({
  subscription,
  colors,
  onView,
  onUpdateStatus,
  onToggleRenew,
}: {
  subscription: Subscription;
  colors: any;
  onView: () => void;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onToggleRenew: (id: string, currentValue: boolean) => Promise<void>;
}) => {
  const statusColor = getStatusColor(subscription.status);
  const isActive = subscription.status === 'actif';
  const progress = subscription.total_visits > 0 ? (subscription.used_visits / subscription.total_visits) * 100 : 0;

  return (
    <div
      className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition duration-300 flex flex-col justify-between min-h-[220px] border"
      style={{ borderColor: isActive ? `${colors.primary}20` : colors.border }}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-xs" style={{ color: colors.text }}>{subscription.offre?.name || 'Abonnement'}</h3>
            <p className="text-[10px] text-gray-400">{subscription.user?.full_name || 'N/A'}</p>
          </div>
          <span className="text-[10px] font-semibold shrink-0" style={{ color: statusColor }}>{getStatusLabel(subscription.status)}</span>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-lg font-black" style={{ color: colors.primary }}>{formatCurrency(subscription.offre?.price || 0)}</span>
          <span className="text-[10px] text-gray-400">/{subscription.offre?.category || 'm'}</span>
        </div>

        <div>
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>Visites consommées</span>
            <span>{subscription.used_visits}/{subscription.total_visits}</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%`, background: colors.primary }} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t" style={{ borderColor: colors.border }}>
        <button onClick={onView} className="flex-1 py-2 rounded-xl text-xs font-bold border bg-gray-50/50 hover:bg-gray-100 transition-colors" style={{ color: colors.text }}>Détails</button>
        {isActive && (
          <button onClick={() => onToggleRenew(subscription.id, subscription.auto_renew)} className="px-3 rounded-xl border hover:bg-gray-50 flex items-center justify-center transition-colors" style={{ color: subscription.auto_renew ? '#10b981' : '#94a3b8' }}>
            <RefreshCw size={12} className={subscription.auto_renew ? 'animate-spin-slow' : ''} />
          </button>
        )}
        {subscription.status === 'en_attente' && (
          <button onClick={() => onUpdateStatus(subscription.id, 'actif')} className="px-3 rounded-xl text-white text-xs font-bold hover:opacity-90" style={{ background: '#10b981' }}>Activer</button>
        )}
      </div>
    </div>
  );
};

// =============================================
// SUBSCRIPTION DETAILS MODAL
// =============================================

const SubscriptionDetailsModal = ({ subscription, onClose, colors }: { subscription: Subscription; onClose: () => void; colors: any }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-xl">
      <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: colors.border }}>
        <div>
          <h2 className="font-bold text-sm uppercase tracking-wider text-gray-400">📋 Détails Abonnement</h2>
          <p className="text-xs text-gray-500 mt-0.5">{subscription.offre?.name}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-lg"><X size={16} /></button>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-gray-50"><p className="text-gray-400 text-[10px]">Client</p><p className="font-bold">{subscription.user?.full_name || 'N/A'}</p></div>
          <div className="p-2.5 rounded-xl bg-gray-50"><p className="text-gray-400 text-[10px]">Statut</p><p className="font-bold" style={{ color: getStatusColor(subscription.status) }}>{getStatusLabel(subscription.status)}</p></div>
        </div>
        <div className="space-y-2 text-xs divide-y" style={{ borderColor: colors.border }}>
          <div className="flex justify-between py-1.5"><span className="text-gray-400">Patient</span><span className="font-semibold">{subscription.patient ? `${subscription.patient.first_name} ${subscription.patient.last_name}` : 'Non assigné'}</span></div>
          <div className="flex justify-between py-1.5"><span className="text-gray-400">Prix</span><span className="font-semibold">{formatCurrency(subscription.offre?.price || 0)}</span></div>
          <div className="flex justify-between py-1.5"><span className="text-gray-400">Début</span><span className="font-semibold">{formatDate(subscription.start_date)}</span></div>
          <div className="flex justify-between py-1.5"><span className="text-gray-400">Fin</span><span className="font-semibold">{formatDate(subscription.end_date)}</span></div>
        </div>
      </div>
    </div>
  </div>
);

// =============================================
// STAT CARD - Avec StatCardProps
// =============================================

const StatCard = ({ label, value, color, icon }: StatCardProps) => (
  <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex items-center justify-between">
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-extrabold" style={{ color }}>{value}</p>
    </div>
    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '0d', color }}>{icon}</div>
  </div>
);

export default AdminSubscriptionsPage;
