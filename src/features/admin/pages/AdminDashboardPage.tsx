// 📁 src/features/admin/pages/AdminDashboardPage.tsx
 
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Calendar,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  DollarSign,
  Activity,
  UserPlus,
  Award,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { useTerminology } from '@/hooks/useTerminology';
import { formatCurrency } from '@/utils/helpers';
import toast from 'react-hot-toast';

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const { isAdminOrCoordinator } = useTerminology();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalPatients: 0,
    totalAidants: 0,
    visitsToday: 0,
    visitsInProgress: 0,
    pendingRegistrations: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    growth: 0,
  });

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: totalPatients },
        { count: totalAidants },
        { count: pendingRegistrations },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('patients').select('*', { count: 'exact', head: true }),
        supabase.from('aidants').select('*', { count: 'exact', head: true }),
        supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('status', 'en_attente'),
      ]);

      const today = new Date().toISOString().split('T')[0];
      const [
        { count: visitsToday },
        { count: visitsInProgress },
      ] = await Promise.all([
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('scheduled_date', today),
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('status', 'en_cours'),
      ]);

      const [
        { count: totalOrders },
        { count: pendingOrders },
      ] = await Promise.all([
        supabase.from('commandes').select('*', { count: 'exact', head: true }),
        supabase.from('commandes').select('*', { count: 'exact', head: true }).in('status', ['creee', 'en_attente']),
      ]);

      const { data: payments } = await supabase
        .from('paiements')
        .select('amount, created_at')
        .eq('status', 'valide');

      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyPayments = payments?.filter(p => new Date(p.created_at) >= startOfMonth) || [];
      const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      lastMonth.setHours(0, 0, 0, 0);

      const lastMonthPayments = payments?.filter(p => {
        const d = new Date(p.created_at);
        return d >= lastMonth && d < startOfMonth;
      }) || [];
      const lastMonthRevenue = lastMonthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const growth = lastMonthRevenue > 0
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : monthlyRevenue > 0 ? 100 : 0;

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalPatients: totalPatients || 0,
        totalAidants: totalAidants || 0,
        visitsToday: visitsToday || 0,
        visitsInProgress: visitsInProgress || 0,
        pendingRegistrations: pendingRegistrations || 0,
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        totalRevenue,
        monthlyRevenue,
        growth,
      });
    } catch (error) {
      console.error('Fetch dashboard error:', error);
      toast.error('Erreur lors du chargement du tableau de bord');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-16 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-32 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Utilisateurs',
      value: stats.totalUsers,
      sub: `${stats.activeUsers} actifs`,
      icon: <Users size={16} />,
      color: colors.primary,
    },
    {
      label: 'Bénéficiaires',
      value: stats.totalPatients,
      sub: `${stats.totalAidants} aidants`,
      icon: <UserCheck size={16} />,
      color: '#4CAF50',
    },
    {
      label: 'Visites aujourd\'hui',
      value: stats.visitsToday,
      sub: `${stats.visitsInProgress} en cours`,
      icon: <Calendar size={16} />,
      color: '#2196F3',
    },
    {
      label: 'Commandes',
      value: stats.totalOrders,
      sub: `${stats.pendingOrders} en attente`,
      icon: <ShoppingBag size={16} />,
      color: '#FF9800',
    },
    {
      label: 'Revenu mensuel',
      value: formatCurrency(stats.monthlyRevenue),
      sub: `Total: ${formatCurrency(stats.totalRevenue)}`,
      icon: <DollarSign size={16} />,
      color: '#4CAF50',
    },
    {
      label: 'Inscriptions en attente',
      value: stats.pendingRegistrations,
      sub: `À traiter`,
      icon: <UserPlus size={16} />,
      color: '#F44336',
    },
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
              <Activity size={12} />
              Admin
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              📊 Tableau de bord Admin
            </h1>

            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              Vue d'ensemble de la plateforme
            </p>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </section>

      {/* STATS COMPACTES */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {statCards.map((card, index) => (
          <CompactStat
            key={index}
            label={card.label}
            value={card.value}
            sub={card.sub}
            icon={card.icon}
            color={card.color}
          />
        ))}
      </section>

      {/* CROISSANCE */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} style={{ color: colors.primary }} />
            <h2 className="font-bold text-sm" style={{ color: colors.text }}>
              Croissance des revenus
            </h2>
          </div>
          <div className="flex items-end gap-3">
            <div>
              <p className="text-2xl font-black" style={{ color: colors.primary }}>
                {stats.growth > 0 ? '+' : ''}{stats.growth.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400">vs mois précédent</p>
            </div>
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                stats.growth >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}
            >
              {stats.growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {stats.growth >= 0 ? 'En hausse' : 'En baisse'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={18} style={{ color: colors.primary }} />
            <h2 className="font-bold text-sm" style={{ color: colors.text }}>
              Activité rapide
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <QuickStat
              label="Visites aujourd'hui"
              value={stats.visitsToday}
              color="#2196F3"
              icon={<Calendar size={16} />}
            />
            <QuickStat
              label="En attente"
              value={stats.pendingOrders + stats.pendingRegistrations}
              color="#FF9800"
              icon={<Clock size={16} />}
            />
            <QuickStat
              label="Aidants actifs"
              value={stats.totalAidants}
              color="#4CAF50"
              icon={<Award size={16} />}
            />
            <QuickStat
              label="Utilisateurs actifs"
              value={stats.activeUsers}
              color="#9C27B0"
              icon={<UserCheck size={16} />}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

// =============================================
// COMPACT STAT
// =============================================

interface CompactStatProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  color: string;
}

const CompactStat = ({ label, value, sub, icon, color }: CompactStatProps) => {
  return (
    <div className="bg-white rounded-xl p-2.5 shadow-sm border border-black/5">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="text-[9px] font-medium uppercase tracking-wider text-gray-400 truncate">
            {label}
          </p>
          <p className="text-base font-bold mt-0.5 truncate" style={{ color }}>
            {value}
          </p>
          <p className="text-[8px] text-gray-400 truncate">{sub}</p>
        </div>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: color + '14', color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

// =============================================
// QUICK STAT
// =============================================

interface QuickStatProps {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

const QuickStat = ({ label, value, color, icon }: QuickStatProps) => {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: color + '08' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + '20', color }}>
        {icon}
      </div>
      <div>
        <p className="text-base font-bold" style={{ color }}>{value}</p>
        <p className="text-[9px] text-gray-400 truncate">{label}</p>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
