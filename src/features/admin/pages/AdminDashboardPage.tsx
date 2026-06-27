// 📁 src/features/admin/pages/AdminDashboardPage.tsx
 
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Calendar,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Clock,
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
      <div className="space-y-6 max-w-5xl mx-auto pb-8">
        <div className="h-28 bg-white rounded-3xl animate-pulse shadow-sm" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="h-20 bg-white rounded-2xl animate-pulse shadow-sm" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-32 bg-white rounded-3xl animate-pulse shadow-sm" />
          <div className="h-32 bg-white rounded-3xl animate-pulse shadow-sm" />
        </div>
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
      color: '#10b981',
    },
    {
      label: "Visites d'aujourd'hui",
      value: stats.visitsToday,
      sub: `${stats.visitsInProgress} en cours`,
      icon: <Calendar size={16} />,
      color: '#3b82f6',
    },
    {
      label: 'Commandes',
      value: stats.totalOrders,
      sub: `${stats.pendingOrders} en attente`,
      icon: <ShoppingBag size={16} />,
      color: '#f59e0b',
    },
    {
      label: 'Revenu mensuel',
      value: formatCurrency(stats.monthlyRevenue),
      sub: `Total : ${formatCurrency(stats.totalRevenue)}`,
      icon: <DollarSign size={16} />,
      color: '#10b981',
    },
    {
      label: 'Inscriptions en attente',
      value: stats.pendingRegistrations,
      sub: 'À traiter rapidement',
      icon: <UserPlus size={16} />,
      color: '#ef4444',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 sm:pb-8">
      {/* HEADER DE STYLE BANNIÈRE DOUCE */}
      <section 
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.primary}12 100%)`,
        }}
      >
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <Activity size={11} />
              Supervision
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: colors.text }}>
              Tableau de bord Admin
            </h1>

            <p className="text-xs" style={{ color: colors.textLight }}>
              Vue d'ensemble de l'activité et de la croissance de la plateforme
            </p>
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors hover:bg-white/40"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </section>

      {/* STATS COMPACTES ÉPURÉES */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

      {/* CROISSANCE ET ACTIVITÉ RAPIDE */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* CROISSANCE DES REVENUS */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.025)] flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} style={{ color: colors.primary }} />
            <h2 className="font-bold text-xs tracking-wider uppercase text-gray-400">
              Croissance des revenus
            </h2>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-2xl font-black" style={{ color: colors.primary }}>
                {stats.growth > 0 ? '+' : ''}{stats.growth.toFixed(1)}%
              </p>
              <p className="text-[11px] text-gray-400">par rapport au mois précédent</p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                stats.growth >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}
            >
              {stats.growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {stats.growth >= 0 ? 'En hausse' : 'En baisse'}
            </div>
          </div>
        </div>

        {/* ACTIVITÉ RAPIDE EN GRID PILL */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.025)]">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} style={{ color: colors.primary }} />
            <h2 className="font-bold text-xs tracking-wider uppercase text-gray-400">
              Activité rapide
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <QuickStat
              label="Visites aujourd'hui"
              value={stats.visitsToday}
              color="#3b82f6"
              icon={<Calendar size={16} />}
            />
            <QuickStat
              label="Tâches en attente"
              value={stats.pendingOrders + stats.pendingRegistrations}
              color="#f59e0b"
              icon={<Clock size={16} />}
            />
            <QuickStat
              label="Aidants actifs"
              value={stats.totalAidants}
              color="#10b981"
              icon={<Award size={16} />}
            />
            <QuickStat
              label="Membres actifs"
              value={stats.activeUsers}
              color="#8b5cf6"
              icon={<UserCheck size={16} />}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

// =============================================
// COMPACT STAT COMPONENT
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
    <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col justify-between min-h-[105px]">
      <div className="flex items-start justify-between gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 truncate">
          {label}
        </p>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: color + '0a', color }}
        >
          {icon}
        </div>
      </div>
      <div className="space-y-0.5 mt-2">
        <p className="text-base font-extrabold truncate" style={{ color }}>
          {value}
        </p>
        <p className="text-[9px] font-medium text-gray-400 truncate">{sub}</p>
      </div>
    </div>
  );
};

// =============================================
// QUICK STAT COMPONENT
// =============================================

interface QuickStatProps {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

const QuickStat = ({ label, value, color, icon }: QuickStatProps) => {
  return (
    <div className="flex items-center gap-2.5 p-2 rounded-2xl transition-colors hover:bg-gray-50/50" style={{ background: color + '06' }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '14', color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-extrabold" style={{ color }}>{value}</p>
        <p className="text-[9px] text-gray-400 font-medium truncate">{label}</p>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
