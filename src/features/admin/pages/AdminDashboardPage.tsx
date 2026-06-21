// 📁 src/features/admin/pages/AdminDashboardPage.tsx

import { useEffect, useState } from 'react';
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
  AlertCircle,
  RefreshCw,
  Eye,
  Package,
  DollarSign,
  PieChart,
  BarChart3,
  Activity,
  UserPlus,
  UserMinus,
  Award,
  Bell,
  MessageSquare,
  FileText,
  Home,
  MapPin,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatCurrency } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalPatients: number;
  totalAidants: number;
  totalVisits: number;
  visitsToday: number;
  visitsInProgress: number;
  pendingRegistrations: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
  growth: number;
}

interface RecentActivity {
  id: string;
  type: 'user' | 'visit' | 'order' | 'payment' | 'registration';
  title: string;
  description: string;
  time: string;
  user: string;
  status?: string;
}

const AdminDashboardPage = () => {
  const { profile, role } = useAuthStore();
  
  // ✅ Jargon dynamique selon le rôle
  const {
    plural,          // "proches" / "personnes accompagnées" / "bénéficiaires"
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
    isAdminOrCoordinator,
    getCountLabel,
  } = useTerminology();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalPatients: 0,
    totalAidants: 0,
    totalVisits: 0,
    visitsToday: 0,
    visitsInProgress: 0,
    pendingRegistrations: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    growth: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // 1. Récupérer les statistiques utilisateurs
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

      // 2. Récupérer les statistiques des visites
      const today = new Date().toISOString().split('T')[0];
      const [
        { count: totalVisits },
        { count: visitsToday },
        { count: visitsInProgress },
      ] = await Promise.all([
        supabase.from('visites').select('*', { count: 'exact', head: true }),
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('scheduled_date', today),
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('status', 'en_cours'),
      ]);

      // 3. Récupérer les statistiques des commandes
      const [
        { count: totalOrders },
        { count: pendingOrders },
      ] = await Promise.all([
        supabase.from('commandes').select('*', { count: 'exact', head: true }),
        supabase.from('commandes').select('*', { count: 'exact', head: true }).in('status', ['creee', 'en_attente']),
      ]);

      // 4. Récupérer les revenus
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: payments } = await supabase
        .from('paiements')
        .select('amount, created_at')
        .eq('status', 'valide');

      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

      const monthlyPayments = payments?.filter(p => 
        new Date(p.created_at) >= startOfMonth
      ) || [];
      const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      // 5. Calculer la croissance
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
        totalVisits: totalVisits || 0,
        visitsToday: visitsToday || 0,
        visitsInProgress: visitsInProgress || 0,
        pendingRegistrations: pendingRegistrations || 0,
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        totalRevenue,
        monthlyRevenue,
        growth,
      });

      await fetchRecentActivities();

    } catch (error) {
      console.error('Fetch dashboard error:', error);
      toast.error('Erreur lors du chargement du tableau de bord');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const activities: RecentActivity[] = [];

      // Dernières inscriptions
      const { data: registrations } = await supabase
        .from('inscriptions')
        .select('id, user_id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (registrations) {
        const userIds = registrations.map(r => r.user_id).filter(Boolean);
        let profileMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
          if (profiles) {
            profileMap = profiles.reduce((acc, p) => {
              acc[p.id] = p;
              return acc;
            }, {} as Record<string, any>);
          }
        }

        registrations.forEach((reg) => {
          activities.push({
            id: reg.id,
            type: 'registration',
            title: 'Nouvelle inscription',
            description: `${profileMap[reg.user_id]?.full_name || 'Utilisateur'} s'est inscrit`,
            time: formatDate(reg.created_at),
            user: profileMap[reg.user_id]?.full_name || 'Utilisateur',
            status: reg.status,
          });
        });
      }

      // Dernières visites
      const { data: visits } = await supabase
        .from('visites')
        .select('id, patient_id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (visits) {
        const patientIds = visits.map(v => v.patient_id).filter(Boolean);
        let patientMap: Record<string, any> = {};
        if (patientIds.length > 0) {
          const { data: patients } = await supabase
            .from('patients')
            .select('id, first_name, last_name')
            .in('id', patientIds);
          if (patients) {
            patientMap = patients.reduce((acc, p) => {
              acc[p.id] = p;
              return acc;
            }, {} as Record<string, any>);
          }
        }

        visits.forEach((visit) => {
          const patient = patientMap[visit.patient_id];
          activities.push({
            id: visit.id,
            type: 'visit',
            title: 'Visite planifiée',
            description: `Visite pour ${patient?.first_name || ''} ${patient?.last_name || ''}`,
            time: formatDate(visit.created_at),
            user: `${patient?.first_name || ''} ${patient?.last_name || ''}`,
            status: visit.status,
          });
        });
      }

      // Derniers paiements
      const { data: payments } = await supabase
        .from('paiements')
        .select('id, user_id, amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (payments) {
        const userIds = payments.map(p => p.user_id).filter(Boolean);
        let profileMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
          if (profiles) {
            profileMap = profiles.reduce((acc, p) => {
              acc[p.id] = p;
              return acc;
            }, {} as Record<string, any>);
          }
        }

        payments.forEach((payment) => {
          activities.push({
            id: payment.id,
            type: 'payment',
            title: 'Nouveau paiement',
            description: `${formatCurrency(payment.amount)} - ${profileMap[payment.user_id]?.full_name || 'Utilisateur'}`,
            time: formatDate(payment.created_at),
            user: profileMap[payment.user_id]?.full_name || 'Utilisateur',
            status: payment.status,
          });
        });
      }

      setRecentActivities(activities.slice(0, 10));
    } catch (error) {
      console.error('Fetch activities error:', error);
    }
  };

  // ✅ Libellé dynamique pour les statistiques
  const getPatientLabel = () => {
    if (isAdminOrCoordinator) return 'Bénéficiaires';
    return 'Patients';
  };

  const statCards = [
    {
      label: 'Utilisateurs',
      value: stats.totalUsers,
      sub: `${stats.activeUsers} actifs`,
      icon: <Users size={22} />,
      color: colors.primary,
    },
    {
      label: getPatientLabel(),
      value: stats.totalPatients,
      sub: `${stats.totalAidants} aidants`,
      icon: <UserCheck size={22} />,
      color: '#4CAF50',
    },
    {
      label: 'Visites aujourd\'hui',
      value: stats.visitsToday,
      sub: `${stats.visitsInProgress} en cours`,
      icon: <Calendar size={22} />,
      color: '#2196F3',
    },
    {
      label: 'Commandes',
      value: stats.totalOrders,
      sub: `${stats.pendingOrders} en attente`,
      icon: <ShoppingBag size={22} />,
      color: '#FF9800',
    },
    {
      label: 'Revenu mensuel',
      value: formatCurrency(stats.monthlyRevenue),
      sub: `Total: ${formatCurrency(stats.totalRevenue)}`,
      icon: <DollarSign size={22} />,
      color: '#4CAF50',
    },
    {
      label: 'Inscriptions en attente',
      value: stats.pendingRegistrations,
      sub: `À traiter`,
      icon: <UserPlus size={22} />,
      color: '#F44336',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black" style={{ color: colors.text }}>
              📊 Tableau de bord Admin
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
              Vue d'ensemble de l'activité de la plateforme
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
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
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, index) => (
          <StatCard
            key={index}
            label={card.label}
            value={card.value}
            sub={card.sub}
            icon={card.icon}
            color={card.color}
          />
        ))}
      </section>

      {/* Croissance et revenus */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} style={{ color: colors.primary }} />
            <h2 className="font-bold" style={{ color: colors.text }}>
              Croissance des revenus
            </h2>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-3xl font-black" style={{ color: colors.primary }}>
                {stats.growth > 0 ? '+' : ''}{stats.growth.toFixed(1)}%
              </p>
              <p className="text-sm" style={{ color: colors.text + '60' }}>
                vs mois précédent
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${
              stats.growth >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              {stats.growth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {stats.growth >= 0 ? 'En hausse' : 'En baisse'}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: colors.text + '60' }}>Revenu mensuel</span>
              <span className="font-bold" style={{ color: colors.primary }}>
                {formatCurrency(stats.monthlyRevenue)}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span style={{ color: colors.text + '60' }}>Revenu total</span>
              <span className="font-bold" style={{ color: colors.primary }}>
                {formatCurrency(stats.totalRevenue)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={20} style={{ color: colors.primary }} />
            <h2 className="font-bold" style={{ color: colors.text }}>
              Activité rapide
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <QuickStat
              label="Visites aujourd'hui"
              value={stats.visitsToday}
              color="#2196F3"
              icon={<Calendar size={18} />}
            />
            <QuickStat
              label="En attente"
              value={stats.pendingOrders + stats.pendingRegistrations}
              color="#FF9800"
              icon={<Clock size={18} />}
            />
            <QuickStat
              label="Aidants actifs"
              value={stats.totalAidants}
              color="#4CAF50"
              icon={<Award size={18} />}
            />
            <QuickStat
              label="Utilisateurs actifs"
              value={stats.activeUsers}
              color="#9C27B0"
              icon={<UserCheck size={18} />}
            />
          </div>
        </div>
      </section>

      {/* Activités récentes */}
      <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
        <div className="p-6 border-b" style={{ borderColor: colors.border }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={20} style={{ color: colors.primary }} />
              <h2 className="font-bold" style={{ color: colors.text }}>
                Activités récentes
              </h2>
            </div>
            <span className="text-xs" style={{ color: colors.text + '40' }}>
              {recentActivities.length} activités
            </span>
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: colors.border }}>
          {recentActivities.length === 0 ? (
            <div className="p-8 text-center">
              <Activity size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm" style={{ color: colors.text + '50' }}>
                Aucune activité récente
              </p>
            </div>
          ) : (
            recentActivities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                colors={colors}
              />
            ))
          )}
        </div>
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
  sub: string;
  icon: React.ReactNode;
  color: string;
}

const StatCard = ({ label, value, sub, icon, color }: StatCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: color + '80' }}>
            {label}
          </p>
          <p className="text-2xl font-black truncate" style={{ color }}>
            {value}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-light, #6b7280)' }}>
            {sub}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: color + '15', color }}
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
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: color + '08' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '20', color }}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-black" style={{ color }}>{value}</p>
        <p className="text-xs" style={{ color: color + '70' }}>{label}</p>
      </div>
    </div>
  );
};

// =============================================
// ACTIVITY ITEM
// =============================================

interface ActivityItemProps {
  activity: RecentActivity;
  colors: any;
}

const ActivityItem = ({ activity, colors }: ActivityItemProps) => {
  const getIcon = () => {
    switch (activity.type) {
      case 'user': return <Users size={18} />;
      case 'visit': return <Calendar size={18} />;
      case 'order': return <ShoppingBag size={18} />;
      case 'payment': return <CreditCard size={18} />;
      case 'registration': return <UserPlus size={18} />;
      default: return <Bell size={18} />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'valide':
      case 'validee':
      case 'approved':
      case 'active':
        return '#4CAF50';
      case 'en_attente':
      case 'pending':
        return '#FF9800';
      case 'refusee':
      case 'rejected':
      case 'annule':
      case 'cancelled':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'valide':
      case 'validee':
        return '✅ Validé';
      case 'approved':
        return '✅ Approuvé';
      case 'active':
        return '🟢 Actif';
      case 'en_attente':
      case 'pending':
        return '⏳ En attente';
      case 'refusee':
      case 'rejected':
        return '❌ Refusé';
      case 'annule':
      case 'cancelled':
        return '🚫 Annulé';
      default:
        return status || '';
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: colors.primary + '12', color: colors.primary }}
      >
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm" style={{ color: colors.text }}>
          {activity.title}
        </p>
        <p className="text-sm" style={{ color: colors.text + '60' }}>
          {activity.description}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs" style={{ color: colors.text + '40' }}>
            {activity.time}
          </span>
          {activity.status && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: getStatusColor(activity.status) + '15',
                color: getStatusColor(activity.status),
              }}
            >
              {getStatusLabel(activity.status)}
            </span>
          )}
        </div>
      </div>
      <Eye size={16} style={{ color: colors.text + '30' }} className="shrink-0" />
    </div>
  );
};

export default AdminDashboardPage;