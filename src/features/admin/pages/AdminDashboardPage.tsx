// 📁 frontend/src/features/admin/pages/AdminDashboardPage.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,  
  Calendar,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Award,
  AlertCircle,
  UserCircle,
  UserPlus,
  Shield,
  Package,
  Bell,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { useTerminology } from '@/hooks/useTerminology';
import { formatCurrency } from '@/utils/helpers';
import { useRefreshableData } from '@/hooks/useRefreshableData';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { AdminStats } from '@/components/admin/AdminStats';
import toast from 'react-hot-toast';

// ✅ toast CONSERVÉ - C'est une page, c'est ici qu'on affiche les toasts

// ============================================================
// TYPES
// ============================================================

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalPatients: number;
  personalAccounts: number;
  totalBeneficiaires: number;
  totalAidants: number;
  visitsToday: number;
  visitsInProgress: number;
  pendingRegistrations: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
  growth: number;
  visitsWaitingApproval: number;
  visitsExpired: number;
  ordersWaiting: number;
  ordersAvailable: number;
  visitsPendingPayment: number;
  ordersPendingPayment: number;
  assignedCount: number;
  unassignedCount: number;
  // ✅ NOUVEAU : Visites en attente d'aidant
  pendingAidantVisits: number;
  // ✅ NOUVEAU : Commandes disponibles
  availableOrders: number;
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalPatients: 0,
    personalAccounts: 0,
    totalBeneficiaires: 0,
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
    assignedCount: 0,
    unassignedCount: 0,
    pendingAidantVisits: 0,
    availableOrders: 0,
  });

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ Chargement des données globales
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

      // ✅ Récupérer TOUTES les familles (comptes)
      const { data: allFamilies, error: familiesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'family');

      if (familiesError) {
        console.error('❌ Erreur récupération familles:', familiesError);
      }

      // ✅ Récupérer les liens famille-patient
      const { data: familyLinks, error: linksError } = await supabase
        .from('patient_family_links')
        .select('family_id');

      if (linksError) {
        console.error('❌ Erreur récupération liens famille:', linksError);
      }

      const familyIdsWithPatients = new Set(familyLinks?.map(l => l.family_id) || []);
      
      const totalFamilies = allFamilies?.length || 0;
      const personalAccountsCount = (allFamilies || []).filter(
        (f: any) => !familyIdsWithPatients.has(f.id)
      ).length;

      const totalBeneficiaires = totalFamilies + (totalPatients || 0);

      // ✅ Récupérer les assignations actives
      const { count: assignedCount } = await supabase
        .from('aidant_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const unassignedCount = totalBeneficiaires - (assignedCount || 0);

      const today = new Date().toISOString().split('T')[0];
      const [
        { count: visitsToday },
        { count: visitsInProgress },
        { count: visitsWaitingApproval },
        { count: visitsExpired },
        { count: visitsPendingPayment },
        // ✅ NOUVEAU : Visites en attente d'aidant
        { count: pendingAidantVisits },
      ] = await Promise.all([
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('scheduled_date', today),
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('status', 'en_cours'),
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('status', 'planifiee').is('approved_at', null).is('refused_at', null),
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('status', 'expire'),
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('status', 'attente_paiement'),
        // ✅ NOUVEAU
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('status', 'en_attente_aidant'),
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
        personalAccounts: personalAccountsCount,
        totalBeneficiaires: totalBeneficiaires,
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
        assignedCount: assignedCount || 0,
        unassignedCount: unassignedCount,
        // ✅ NOUVEAUX
        pendingAidantVisits: pendingAidantVisits || 0,
        availableOrders: ordersAvailable || 0,
      });
      
      // ✅ UN SEUL TOAST DE SUCCÈS
      toast.success('✅ Données du tableau de bord actualisées');
      
    } catch (error) {
      console.error('Fetch dashboard error:', error);
      // ✅ UN SEUL TOAST D'ERREUR
      toast.error('Erreur lors du chargement du tableau de bord');
    } finally {
      setIsLoading(false);
    }
  };

  useRefreshableData({
    onRefresh: fetchDashboardData,
    onError: () => {
      // ✅ UN SEUL TOAST D'ERREUR
      toast.error('Erreur lors du rafraîchissement des données');
    },
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ✅ handleRefresh - UN SEUL TOAST DE SUCCÈS
  const handleRefresh = () => {
    fetchDashboardData();
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto p-4 sm:p-6">
        <div className="h-16 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="h-20 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-32 bg-white rounded-2xl animate-pulse" />
          <div className="h-32 bg-white rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  // ✅ Statistiques pour les cartes
  const statCards = [
    {
      label: 'Utilisateurs',
      value: stats.totalUsers,
      sub: `${stats.activeUsers} actifs`,
      icon: <Users size={15} />,
      color: colors.primary,
      onClick: () => navigate('/app/users'),
    },
    {
      label: 'Bénéficiaires',
      value: stats.totalBeneficiaires,
      sub: `${stats.totalPatients} patients • ${stats.personalAccounts} comptes • ${stats.unassignedCount} non assignés`,
      icon: <UserCheck size={15} />,
      color: '#10b981',
      onClick: () => navigate('/app/patients'),
    },
    {
      label: 'Aidants',
      value: stats.totalAidants,
      sub: `${stats.assignedCount} assignés`,
      icon: <UserCheck size={15} />,
      color: '#3b82f6',
      onClick: () => navigate('/app/aidants'),
    },
    {
      label: 'Visites ce jour',
      value: stats.visitsToday,
      sub: `${stats.visitsInProgress} en cours`,
      icon: <Calendar size={15} />,
      color: '#4CAF50',
      onClick: () => navigate('/app/visits'),
    },
    {
      label: 'Commandes',
      value: stats.totalOrders,
      sub: `${stats.pendingOrders} en attente`,
      icon: <ShoppingBag size={15} />,
      color: '#f59e0b',
      onClick: () => navigate('/app/orders'),
    },
    {
      label: 'Revenu mensuel',
      value: formatCurrency(stats.monthlyRevenue),
      sub: `Cumul : ${formatCurrency(stats.totalRevenue)}`,
      icon: <DollarSign size={15} />,
      color: '#10b981',
      onClick: () => navigate('/app/admin-payments'),
    },
  ];

  // ✅ NOUVELLES CARTES D'ALERTE
  const alertCards = [
    {
      label: 'Visites en attente d\'aidant',
      value: stats.pendingAidantVisits,
      icon: <UserPlus size={18} />,
      color: '#FF5722',
      bg: '#FF572215',
      onClick: () => navigate('/app/admin/notifications'),
      badge: '⚠️ Urgent',
      isAlert: stats.pendingAidantVisits > 0,
    },
    {
      label: 'Commandes disponibles',
      value: stats.availableOrders,
      icon: <Package size={18} />,
      color: '#F44336',
      bg: '#F4433615',
      onClick: () => navigate('/app/orders'),
      badge: '🚨 À prendre',
      isAlert: stats.availableOrders > 0,
    },
    {
      label: 'Visites en attente validation',
      value: stats.visitsWaitingApproval,
      icon: <Clock size={18} />,
      color: '#FF9800',
      bg: '#FF980015',
      onClick: () => navigate('/app/admin/visits/validation'),
      badge: '⏳ En attente',
      isAlert: stats.visitsWaitingApproval > 0,
    },
    {
      label: 'Visites expirées',
      value: stats.visitsExpired,
      icon: <AlertCircle size={18} />,
      color: '#F44336',
      bg: '#F4433615',
      onClick: () => navigate('/app/admin/visits/validation'),
      badge: '❌ Expirées',
      isAlert: stats.visitsExpired > 0,
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 px-4 sm:px-6">
      
      {/* ============================================================
      EN-TÊTE SUPERVISION SIMPLE
      ============================================================ */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-xl font-black text-gray-800" style={{ color: colors.text }}>
            Tableau de bord Admin
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Supervision de l'activité globale, de la trésorerie et des interventions à domicile.
            {stats.pendingAidantVisits > 0 && (
              <span className="ml-2 text-orange-500 font-bold">
                ⚠️ {stats.pendingAidantVisits} visite(s) sans aidant
              </span>
            )}
          </p>
        </div>

        <RefreshButton 
          onRefresh={handleRefresh}
        />
      </section>

      {/* ✅ CARTES D'ALERTE (NOUVEAU) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {alertCards.map((card) => (
          <AlertCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            color={card.color}
            bg={card.bg}
            onClick={card.onClick}
            badge={card.badge}
            isAlert={card.isAlert}
          />
        ))}
      </section>

      {/* AdminStats existant */}
      <AdminStats colors={colors} />

      {/* ============================================================
      METRIQUES COMPACTES CLÉS
      ============================================================ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card, index) => (
          <CompactStat
            key={index}
            label={card.label}
            value={card.value}
            sub={card.sub}
            icon={card.icon}
            color={card.color}
            onClick={card.onClick}
          />
        ))}
      </section>

      {/* ============================================================
      ALERTES ET ACTIONS REQUISES (INTERACTIF)
      ============================================================ */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
          ⚠️ Actions requises
        </h2>
        
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <AlertCard
            label="Visites sans aidant"
            value={stats.pendingAidantVisits}
            icon={<UserPlus size={15} />}
            color="#FF5722"
            onClick={() => navigate('/app/admin/notifications')}
            badge="🚨 Urgent"
            isAlert={stats.pendingAidantVisits > 0}
          />
          <AlertCard
            label="Bénéficiaires non assignés"
            value={stats.unassignedCount}
            icon={<UserX size={15} />}
            color="#F59E0B"
            onClick={() => navigate('/app/patients')}
            badge="À assigner"
            isAlert={stats.unassignedCount > 0}
          />
          <AlertCard
            label="Visites à valider"
            value={stats.visitsWaitingApproval}
            icon={<Clock size={15} />}
            color="#FF9800"
            onClick={() => navigate('/app/visits')}
            badge="En attente"
            isAlert={stats.visitsWaitingApproval > 0}
          />
          <AlertCard
            label="Commandes disponibles"
            value={stats.availableOrders}
            icon={<Package size={15} />}
            color="#F44336"
            onClick={() => navigate('/app/orders')}
            badge="🚨 Urgentes"
            isAlert={stats.availableOrders > 0}
          />
        </section>
      </div>

      {/* ============================================================
      SECTION CROISSANCE ET SYNTHÈSE
      ============================================================ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Taux de croissance mensuel */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={15} style={{ color: colors.primary }} />
            <h2 className="font-bold text-[10px] tracking-wider uppercase text-gray-400">
              Croissance des revenus
            </h2>
          </div>
          
          <div className="flex items-end justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-2xl font-black" style={{ color: colors.primary }}>
                {stats.growth > 0 ? '+' : ''}{stats.growth.toFixed(1)}%
              </p>
              <p className="text-[10px] text-gray-400">Par rapport au mois dernier</p>
            </div>
            
            <div
              className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                stats.growth >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}
            >
              {stats.growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {stats.growth >= 0 ? 'En hausse' : 'En baisse'}
            </div>
          </div>
        </div>

        {/* Synthèse rapide de la plateforme */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Award size={15} style={{ color: colors.primary }} />
            <h2 className="font-bold text-[10px] tracking-wider uppercase text-gray-400">
              Activité de la communauté
            </h2>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-gray-50 flex flex-col justify-center">
              <span className="text-sm font-bold text-gray-800">{stats.activeUsers}</span>
              <span className="text-[9px] text-gray-400">Profils actifs</span>
            </div>
            <div className="p-2 rounded-xl bg-gray-50 flex flex-col justify-center">
              <span className="text-sm font-bold text-gray-800">{stats.totalAidants}</span>
              <span className="text-[9px] text-gray-400">Aidants inscrits</span>
            </div>
            <div className="p-2 rounded-xl bg-gray-50 flex flex-col justify-center">
              <span className="text-sm font-bold text-gray-800">{stats.visitsToday}</span>
              <span className="text-[9px] text-gray-400">Visites aujourd'hui</span>
            </div>
            <div className="p-2 rounded-xl bg-gray-50 flex flex-col justify-center">
              <span className="text-sm font-bold text-gray-800">
                {stats.pendingAidantVisits > 0 ? (
                  <span className="text-orange-500">{stats.pendingAidantVisits}</span>
                ) : (
                  stats.pendingAidantVisits
                )}
              </span>
              <span className="text-[9px] text-gray-400">
                Visites sans aidant
                {stats.pendingAidantVisits > 0 && ' ⚠️'}
              </span>
            </div>
          </div>
        </div>

      </section>

      {/* ✅ BANDEAU D'ALERTE VISITES SANS AIDANT */}
      {stats.pendingAidantVisits > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-xl shadow-sm border border-orange-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <UserPlus size={20} className="text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-orange-800">
                  🦸 {stats.pendingAidantVisits} visite{stats.pendingAidantVisits > 1 ? 's' : ''} en attente d'aidant
                </p>
                <p className="text-sm text-orange-700">
                  Tous les aidants sont complets (4/4). Assignez un aidant à ces visites depuis la page des notifications.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/app/admin/notifications')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition"
            >
              👔 Voir et assigner
            </button>
          </div>
        </div>
      )}

      <footer className="text-center py-4">
        <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1 font-medium">
          <Shield size={10} className="text-green-400" />
          Santé Plus Services — Administration
        </p>
      </footer>
    </div>
  );
};

// =============================================
// CARTE ALERTE (INTERACTIVE)
// =============================================

interface AlertCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg?: string;
  onClick: () => void;
  badge?: string;
  isAlert?: boolean;
}

const AlertCard = ({ 
  label, 
  value, 
  icon, 
  color, 
  bg = `${color}15`,
  onClick, 
  badge, 
  isAlert = false 
}: AlertCardProps) => {
  const hasValue = value > 0;
  const isActive = isAlert && hasValue;
  
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 transition hover:shadow-md text-left w-full flex items-center justify-between ${
        isActive ? 'hover:scale-[1.01]' : 'opacity-60'
      }`}
      style={{ 
        borderLeftColor: isActive ? color : '#e5e7eb',
        background: isActive ? bg : 'transparent',
      }}
    >
      <div className="space-y-0.5 min-w-0 pr-1">
        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 truncate">
          {icon}
          {label}
        </p>
        <p className="text-lg font-extrabold" style={{ color: isActive ? color : '#9ca3af' }}>
          {value}
        </p>
      </div>
      
      {badge && isActive && (
        <span
          className="px-2 py-0.5 rounded-full text-[8px] font-bold text-white shrink-0 animate-pulse"
          style={{ background: color }}
        >
          {badge}
        </span>
      )}
    </button>
  );
};

// =============================================
// CARTES KPI COMPACTES
// =============================================

interface CompactStatProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}

const CompactStat = ({ label, value, sub, icon, color, onClick }: CompactStatProps) => {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 flex flex-col justify-between min-h-[100px] hover:shadow-md transition text-left"
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 truncate">
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
        <p className="text-sm sm:text-base font-extrabold truncate" style={{ color }}>
          {value}
        </p>
        <p className="text-[9px] font-medium text-gray-400 truncate">{sub}</p>
      </div>
    </button>
  );
};

export default AdminDashboardPage;
