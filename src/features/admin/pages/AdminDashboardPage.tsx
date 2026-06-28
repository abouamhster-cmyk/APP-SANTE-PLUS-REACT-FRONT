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
  RefreshCw,
  DollarSign,
  Activity,
  UserPlus,
  Award,
  AlertCircle,
  Package,
  Truck,
  CheckCircle,
  XCircle,
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
    visitsWaitingApproval: 0,
    visitsExpired: 0,
    ordersWaiting: 0,
    ordersAvailable: 0,
    visitsPendingPayment: 0,
    ordersPendingPayment: 0,
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
        { count: visitsWaitingApproval },
        { count: visitsExpired },
        { count: visitsPendingPayment },
      ] = await Promise.all([
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('scheduled_date', today),
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('status', 'en_cours'),
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('status', 'planifiee').is('approved_at', null).is('refused_at', null),
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('status', 'expire'),
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('status', 'attente_paiement'),
      ]);

      const [
        { count: totalOrders },
        { count: pendingOrders },
        { count: ordersWaiting },
        { count: ordersAvailable },
        { count: ordersPendingPayment },
      ] = await Promise.all([
        supabase.from('commandes').select('*', { count: 'exact', head: true }),
        supabase.from('commandes').select('*', { count: 'exact', head: true }).in('status', ['creee', 'en_attente']),
        supabase.from('commandes').select('*', { count: 'exact', head: true }).eq('status', 'en_attente'),
        supabase.from('commandes').select('*', { count: 'exact', head: true }).eq('status', 'disponible'),
        supabase.from('commandes').select('*', { count: 'exact', head: true }).eq('status', 'attente_paiement'),
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
        visitsWaitingApproval: visitsWaitingApproval || 0,
        visitsExpired: visitsExpired || 0,
        ordersWaiting: ordersWaiting || 0,
        ordersAvailable: ordersAvailable || 0,
        visitsPendingPayment: visitsPendingPayment || 0,
        ordersPendingPayment: ordersPendingPayment || 0,
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

  const hasAlerts = stats.visitsExpired > 0 || stats.ordersAvailable > 0 || stats.visitsWaitingApproval > 0;

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
      {/* HEADER AVEC ALERTE */}
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

        {/* BANDEAU D'ALERTES */}
        {hasAlerts && (
          <div className="relative z-10 mt-4 flex flex-wrap gap-2">
            {stats.visitsExpired > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                <AlertCircle size={14} />
                {stats.visitsExpired} visite(s) expirée(s)
              </div>
            )}
            {stats.ordersAvailable > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                <AlertCircle size={14} />
                {stats.ordersAvailable} commande(s) urgente(s)
              </div>
            )}
            {stats.visitsWaitingApproval > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                <Clock size={14} />
                {stats.visitsWaitingApproval} visite(s) en attente
              </div>
            )}
            {stats.visitsPendingPayment > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                <CreditCard size={14} />
                {stats.visitsPendingPayment} visite(s) en attente de paiement
              </div>
            )}
            {stats.ordersPendingPayment > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                <CreditCard size={14} />
                {stats.ordersPendingPayment} commande(s) en attente de paiement
              </div>
            )}
          </div>
        )}
      </section>

      {/* STATS COMPACTES */}
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

      {/* ALERTES DÉTAILLÉES */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AlertCard
          label="Visites en attente"
          value={stats.visitsWaitingApproval}
          icon={<Clock size={16} />}
          color="#FF9800"
          onClick={() => navigate('/app/visits')}
          badge="24-48h"
        />
        <AlertCard
          label="Visites expirées"
          value={stats.visitsExpired}
          icon={<AlertCircle size={16} />}
          color="#F44336"
          onClick={() => navigate('/app/admin/visits/validation')}
          badge="À réassigner"
        />
        <AlertCard
          label="Commandes en attente"
          value={stats.ordersWaiting}
          icon={<Clock size={16} />}
          color="#FF9800"
          onClick={() => navigate('/app/orders')}
          badge="30min"
        />
        <AlertCard
          label="Commandes urgentes"
          value={stats.ordersAvailable}
          icon={<AlertCircle size={16} />}
          color="#F44336"
          onClick={() => navigate('/app/orders')}
          badge="Disponibles"
        />
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

        {/* ACTIVITÉ RAPIDE */}
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
              label="En attente"
              value={stats.visitsWaitingApproval + stats.ordersWaiting}
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
              label="Alertes"
              value={stats.visitsExpired + stats.ordersAvailable}
              color="#ef4444"
              icon={<AlertCircle size={16} />}
            />
          </div>
        </div>
      </section>

      {/* ACTIVITÉ RÉCENTE - VISITES ET COMMANDES */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentActivityCard
          title="Visites récentes"
          type="visits"
          count={stats.visitsToday}
          color={colors.primary}
          onClick={() => navigate('/app/visits')}
        />
        <RecentActivityCard
          title="Commandes récentes"
          type="orders"
          count={stats.totalOrders}
          color={colors.primary}
          onClick={() => navigate('/app/orders')}
        />
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
// ALERT CARD
// =============================================

interface AlertCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  badge?: string;
}

const AlertCard = ({ label, value, icon, color, onClick, badge }: AlertCardProps) => {
  const isUrgent = value > 0;
  
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] border-l-4 transition hover:shadow-md text-left w-full ${
        isUrgent ? 'hover:scale-[1.01]' : ''
      }`}
      style={{ borderLeftColor: isUrgent ? color : '#e5e7eb' }}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            {icon}
            {label}
          </p>
          <p className={`text-xl font-extrabold ${isUrgent ? 'animate-pulse' : ''}`} style={{ color: isUrgent ? color : '#9ca3af' }}>
            {value}
          </p>
        </div>
        {badge && isUrgent && (
          <span
            className="px-2 py-1 rounded-full text-[8px] font-bold text-white"
            style={{ background: color }}
          >
            {badge}
          </span>
        )}
      </div>
    </button>
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

// =============================================
// RECENT ACTIVITY CARD
// =============================================

interface RecentActivityCardProps {
  title: string;
  type: 'visits' | 'orders';
  count: number;
  color: string;
  onClick: () => void;
}

const RecentActivityCard = ({ title, type, count, color, onClick }: RecentActivityCardProps) => {
  const getIcon = () => {
    if (type === 'visits') return <Calendar size={18} />;
    return <ShoppingBag size={18} />;
  };

  const getStatuses = () => {
    if (type === 'visits') {
      return [
        { label: 'Planifiées', icon: <Calendar size={12} />, color: '#4CAF50' },
        { label: 'En cours', icon: <Clock size={12} />, color: '#FF9800' },
        { label: 'Terminées', icon: <CheckCircle size={12} />, color: '#2196F3' },
      ];
    }
    return [
      { label: 'Créées', icon: <Package size={12} />, color: '#9E9E9E' },
      { label: 'En cours', icon: <Clock size={12} />, color: '#FF9800' },
      { label: 'Livrées', icon: <Truck size={12} />, color: '#2196F3' },
    ];
  };

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.025)] text-left w-full hover:shadow-md transition"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '14', color }}>
          {getIcon()}
        </div>
        <h2 className="font-bold text-xs tracking-wider uppercase text-gray-400">{title}</h2>
        <span className="ml-auto text-xs font-bold text-gray-400">{count} total</span>
      </div>
      <div className="flex justify-between">
        {getStatuses().map((status, index) => (
          <div key={index} className="text-center">
            <p className="text-sm font-extrabold" style={{ color: status.color }}>{0}</p>
            <p className="text-[8px] text-gray-400 flex items-center gap-0.5 justify-center">
              {status.icon}
              {status.label}
            </p>
          </div>
        ))}
      </div>
    </button>
  );
};

export default AdminDashboardPage;
