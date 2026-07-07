// 📁 src/features/admin/pages/AdminPaymentsPage.tsx

import { useEffect, useState } from 'react';
import {
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
  DollarSign,
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

  useEffect(() => {
    fetchPayments();
  }, []);

  // ✅ fetchPayments - UN SEUL TOAST D'ERREUR (pas de toast de succès pour le chargement)
  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('paiements')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

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

      const paymentsWithUser = (paymentsData || []).map(payment => ({
        ...payment,
        user: payment.user_id ? profileMap[payment.user_id] || null : null,
      }));

      setPayments(paymentsWithUser);

      const total = paymentsWithUser.length;
      const pending = paymentsWithUser.filter(p => p.status === 'en_attente').length;
      const validated = paymentsWithUser.filter(p => p.status === 'valide').length;
      const failed = paymentsWithUser.filter(p => p.status === 'echoue' || p.status === 'annule').length;
      const revenue = paymentsWithUser
        .filter(p => p.status === 'valide')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      setStats({ total, pending, validated, failed, revenue });
      
      // ✅ SUPPRIMÉ : toast.success('Paiements chargés avec succès'); (pas nécessaire)
    } catch (error: any) {
      console.error('Fetch payments error:', error);
      // ✅ UN SEUL TOAST D'ERREUR
      toast.error('Erreur lors du chargement des paiements');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valide': return '#10b981';
      case 'en_attente': return '#f59e0b';
      case 'echoue': return '#ef4444';
      case 'annule': return '#94a3b8';
      case 'rembourse': return '#3b82f6';
      default: return '#94a3b8';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'valide': return 'Validé';
      case 'en_attente': return 'En attente';
      case 'echoue': return 'Échoué';
      case 'annule': return 'Annulé';
      case 'rembourse': return 'Remboursé';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valide': return <CheckCircle size={14} className="text-green-500" />;
      case 'en_attente': return <Clock size={14} className="text-yellow-500" />;
      case 'echoue': return <XCircle size={14} className="text-red-500" />;
      default: return <Clock size={14} className="text-gray-400" />;
    }
  };

  // ✅ handleViewDetails - UN SEUL TOAST D'INFORMATION
  const handleViewDetails = (payment: PaymentWithUser) => {
    toast.success(
      `Référence: ${payment.reference || payment.id}\n` +
      `Montant: ${formatCurrency(payment.amount)}\n` +
      `Statut: ${getStatusLabel(payment.status)}`,
      { duration: 4000 }
    );
  };

  // ✅ handleRefresh - UN SEUL TOAST DE SUCCÈS
  const handleRefresh = async () => {
    await fetchPayments();
    toast.success('✅ Paiements actualisés');
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
              💳 Flux financiers
            </h1>
            <p className="text-xs" style={{ color: colors.textLight }}>
              Suivi transparent et gestion des paiements clients de la plateforme
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors bg-white hover:bg-gray-50 shrink-0 self-start sm:self-center flex items-center gap-1.5"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </section>

      {/* Statistiques épurées */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} color={colors.primary} icon={<CreditCard size={16} />} />
        <StatCard label="En attente" value={stats.pending} color="#f59e0b" icon={<Clock size={16} />} />
        <StatCard label="Validés" value={stats.validated} color="#10b981" icon={<CheckCircle size={16} />} />
        <StatCard label="Échoués" value={stats.failed} color="#ef4444" icon={<XCircle size={16} />} />
        <StatCard label="Revenu total" value={formatCurrency(stats.revenue)} color="#3b82f6" icon={<DollarSign size={16} />} />
      </section>

      {/* Filtres épurés */}
      <section className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par nom, email ou référence..."
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
          <option value="valide">✅ Validés</option>
          <option value="en_attente">⏳ En attente</option>
          <option value="echoue">❌ Échoués</option>
        </select>
      </section>

      {/* Liste épurée */}
      <section className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center"><RefreshCw size={24} className="animate-spin mx-auto text-gray-300" /></div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Aucun paiement trouvé</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Montant</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Méthode</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-400 uppercase tracking-wider">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: colors.border }}>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-800">{payment.user?.full_name || 'Anonyme'}</p>
                      <p className="text-[10px] text-gray-400">{payment.user?.email || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{payment.method || 'Non spécifié'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(payment.status)}
                        <span className="font-semibold" style={{ color: getStatusColor(payment.status) }}>{getStatusLabel(payment.status)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(payment.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleViewDetails(payment)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Eye size={14} /></button>
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

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}

const StatCard = ({ label, value, color, icon }: StatCardProps) => (
  <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex items-center justify-between">
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-extrabold" style={{ color }}>{value}</p>
    </div>
    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '0d', color }}>{icon}</div>
  </div>
);

export default AdminPaymentsPage;
