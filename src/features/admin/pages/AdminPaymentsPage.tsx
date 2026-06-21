// 📁 src/features/admin/pages/AdminPaymentsPage.tsx

import { useEffect, useState } from 'react';
import {
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Search,
  Filter,
  Download,
  RefreshCw,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, formatCurrency } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface PaymentWithUser {
  id: string;
  user_id: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
  amount: number;
  method: string | null;
  reference: string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
  metadata: any;
}

const AdminPaymentsPage = () => {
  const { profile, role } = useAuthStore();
  const [payments, setPayments] = useState<PaymentWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    validated: 0,
    failed: 0,
    revenue: 0,
  });

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ Récupérer les paiements avec les profils
  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);

      // 1. Récupérer tous les paiements
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('paiements')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // 2. Récupérer les profils des utilisateurs
      const userIds = [...new Set(paymentsData?.map(p => p.user_id).filter(Boolean))];
      let profileMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, role')
          .in('id', userIds);

        if (!profilesError && profiles) {
          profileMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // 3. Fusionner les données
      const paymentsWithUser = (paymentsData || []).map(payment => ({
        ...payment,
        user: payment.user_id ? profileMap[payment.user_id] || null : null,
      }));

      setPayments(paymentsWithUser);

      // 4. Calculer les statistiques
      const total = paymentsWithUser.length;
      const pending = paymentsWithUser.filter(p => p.status === 'en_attente').length;
      const validated = paymentsWithUser.filter(p => p.status === 'valide').length;
      const failed = paymentsWithUser.filter(p => p.status === 'echoue' || p.status === 'annule').length;
      const revenue = paymentsWithUser
        .filter(p => p.status === 'valide')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      setStats({ total, pending, validated, failed, revenue });

    } catch (error: any) {
      console.error('Fetch payments error:', error);
      toast.error('Erreur lors du chargement des paiements');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Filtrer les paiements
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // ✅ Obtenir la couleur du statut
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valide': return '#4CAF50';
      case 'en_attente': return '#FF9800';
      case 'echoue': return '#F44336';
      case 'annule': return '#9E9E9E';
      case 'rembourse': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'valide': return '✅ Validé';
      case 'en_attente': return '⏳ En attente';
      case 'echoue': return '❌ Échoué';
      case 'annule': return '🚫 Annulé';
      case 'rembourse': return '🔄 Remboursé';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valide': return <CheckCircle size={16} className="text-green-500" />;
      case 'en_attente': return <Clock size={16} className="text-yellow-500" />;
      case 'echoue': return <XCircle size={16} className="text-red-500" />;
      case 'annule': return <XCircle size={16} className="text-gray-400" />;
      case 'rembourse': return <RefreshCw size={16} className="text-blue-500" />;
      default: return <Clock size={16} className="text-gray-400" />;
    }
  };

  // ✅ Voir les détails du paiement
  const handleViewDetails = (payment: PaymentWithUser) => {
    toast.success(
      `💰 Paiement #${payment.reference || payment.id}\n` +
      `Montant: ${formatCurrency(payment.amount)}\n` +
      `Statut: ${getStatusLabel(payment.status)}\n` +
      `Date: ${formatDate(payment.created_at)}`,
      { duration: 5000 }
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black" style={{ color: colors.text }}>
              💳 Gestion des paiements
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
              Suivez et gérez tous les paiements effectués sur la plateforme
            </p>
          </div>
          <button
            onClick={fetchPayments}
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
          icon={<CreditCard size={20} />}
        />
        <StatCard
          label="En attente"
          value={stats.pending}
          color="#FF9800"
          icon={<Clock size={20} />}
        />
        <StatCard
          label="Validés"
          value={stats.validated}
          color="#4CAF50"
          icon={<CheckCircle size={20} />}
        />
        <StatCard
          label="Échoués"
          value={stats.failed}
          color="#F44336"
          icon={<XCircle size={20} />}
        />
        <StatCard
          label="Revenu total"
          value={formatCurrency(stats.revenue)}
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
              placeholder="Rechercher par nom, email ou référence..."
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
              <option value="valide">✅ Validés</option>
              <option value="en_attente">⏳ En attente</option>
              <option value="echoue">❌ Échoués</option>
              <option value="annule">🚫 Annulés</option>
              <option value="rembourse">🔄 Remboursés</option>
            </select>
          </div>
        </div>
      </section>

      {/* Liste des paiements */}
      <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-t-transparent" style={{ borderColor: colors.primary }} />
            <p className="mt-2 text-sm" style={{ color: colors.text + '60' }}>Chargement des paiements...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard size={48} className="mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-bold" style={{ color: colors.text }}>
              Aucun paiement trouvé
            </h3>
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              {searchTerm || statusFilter !== 'all' 
                ? 'Aucun paiement ne correspond à vos critères'
                : 'Aucun paiement n\'a encore été effectué'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: colors.primary + '04' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Utilisateur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Montant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Méthode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: colors.text + '60' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: colors.border }}>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: colors.primary }}
                        >
                          {payment.user?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-sm" style={{ color: colors.text }}>
                            {payment.user?.full_name || 'Utilisateur inconnu'}
                          </p>
                          <p className="text-xs" style={{ color: colors.text + '40' }}>
                            {payment.user?.email || 'Email inconnu'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-sm" style={{ color: colors.primary }}>
                        {formatCurrency(payment.amount)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full" style={{ 
                        background: colors.primary + '10', 
                        color: colors.primary 
                      }}>
                        {payment.method || 'Non spécifié'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(payment.status)}
                        <span className="text-xs font-medium" style={{ color: getStatusColor(payment.status) }}>
                          {getStatusLabel(payment.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: colors.text + '50' }}>
                        {formatDate(payment.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="p-2 rounded-lg hover:bg-gray-100 transition"
                        style={{ color: colors.primary }}
                        onClick={() => handleViewDetails(payment)}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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

export default AdminPaymentsPage;