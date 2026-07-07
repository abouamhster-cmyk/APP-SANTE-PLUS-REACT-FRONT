// 📁 src/features/dashboard/pages/DashboardPage.tsx
 
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  ShoppingBag,
  MessageCircle,
  CheckCircle,
  Heart,
  User,
  ArrowRight,
  CreditCard,
  MapPin,
  BookOpen,
  Hospital,
  History,
  Settings,
  ClipboardList,
  UserCheck,
  Award,
  Bell,
  Package,
  LayoutDashboard,
  Handshake,
  FileCheck,
  UserPlus,
  TrendingUp,
  Lightbulb,
  Compass,
  Rocket,
  DollarSign,
  Clock,
  AlertCircle,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { usePaymentStore } from '@/stores/paymentStore';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { getGreeting } from '@/utils/helpers';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { useRefreshableData } from '@/hooks/useRefreshableData';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

import { VisitCard } from '@/components/visits/VisitCard';
import { OrderCard } from '@/components/orders/OrderCard';
import { PatientCard } from '@/components/patients/PatientCard';

// =============================================
// DÉFINITION DES TUILES PAR RÔLE
// =============================================

interface Tile {
  icon: React.ReactNode;
  label: string;
  color: string;
  path: string;
  badge?: number;
}

const getTilesForRole = (role: string | null, colors: any, stats: any, patientsCount: number): Tile[] => {
  const tiles: Tile[] = [];

  if (role === 'family') {
    tiles.push(
      { icon: <Users size={20} />, label: 'Proches', color: colors.primary, path: '/app/patients', badge: patientsCount },
      { icon: <Calendar size={20} />, label: 'Visites', color: '#10b981', path: '/app/visits', badge: stats.upcomingVisits },
      { icon: <ShoppingBag size={20} />, label: 'Commandes', color: '#f59e0b', path: '/app/orders', badge: stats.pendingOrders },
      { icon: <MessageCircle size={20} />, label: 'Messages', color: '#3b82f6', path: '/app/messages' },
      { icon: <CreditCard size={20} />, label: 'Abonnement', color: '#8b5cf6', path: '/app/billing' },
      { icon: <BookOpen size={20} />, label: 'Journal', color: '#b45309', path: '/app/journal' },
      { icon: <MapPin size={20} />, label: 'Carte', color: '#ef4444', path: '/app/map' },
      { icon: <Hospital size={20} />, label: 'Sortie', color: '#ec4899', path: '/app/discharge' },
      { icon: <User size={20} />, label: 'Profil', color: '#64748b', path: '/app/profile' },
    );
    return tiles;
  }

  if (role === 'aidant') {
    tiles.push(
      { icon: <Users size={20} />, label: 'Personnes accompagnées', color: colors.primary, path: '/app/patients', badge: patientsCount },
      { icon: <Calendar size={20} />, label: 'Planning', color: '#10b981', path: '/app/planning' },
      { icon: <Clock size={20} />, label: 'Missions', color: '#8b5cf6', path: '/app/missions', badge: stats.pendingVisits },
      { icon: <History size={20} />, label: 'Historique', color: '#78350f', path: '/app/history' },
      { icon: <ShoppingBag size={20} />, label: 'Commandes', color: '#f59e0b', path: '/app/orders', badge: stats.pendingOrders },
      { icon: <MessageCircle size={20} />, label: 'Messages', color: '#3b82f6', path: '/app/messages' },
      { icon: <MapPin size={20} />, label: 'Carte', color: '#ef4444', path: '/app/map' },
      { icon: <User size={20} />, label: 'Profil', color: '#64748b', path: '/app/profile' },
    );
    return tiles;
  }

  if (role === 'admin' || role === 'coordinator') {
    tiles.push(
      { icon: <LayoutDashboard size={20} />, label: 'Dashboard Admin', color: '#8b5cf6', path: '/app/admin' },
      { icon: <ClipboardList size={20} />, label: 'Inscriptions', color: colors.primary, path: '/app/registrations', badge: stats.pendingRegistrations },
      { icon: <UserCheck size={20} />, label: 'Candidatures', color: '#f59e0b', path: '/app/aidant-candidates', badge: stats.pendingAidants },
      { icon: <Users size={20} />, label: 'Bénéficiaires', color: '#3b82f6', path: '/app/patients', badge: stats.totalBeneficiaires },
      { icon: <Calendar size={20} />, label: 'Visites', color: '#10b981', path: '/app/visits', badge: stats.todayVisits },
      { icon: <FileCheck size={20} />, label: 'Valider visites', color: '#84cc16', path: '/app/admin/visits/validation', badge: stats.pendingValidations },
      { icon: <ShoppingBag size={20} />, label: 'Commandes', color: '#f59e0b', path: '/app/orders', badge: stats.pendingOrders },
      { icon: <DollarSign size={20} />, label: 'Paiements', color: '#8b5cf6', path: '/app/admin-payments', badge: stats.totalPayments },
      { icon: <Award size={20} />, label: 'Abonnements', color: '#78350f', path: '/app/admin-subscriptions', badge: stats.totalSubscriptions },
      { icon: <Package size={20} />, label: 'Offres', color: '#64748b', path: '/app/offers' },
      { icon: <Settings size={20} />, label: 'Paramètres', color: '#475569', path: '/app/settings' },
      { icon: <Bell size={20} />, label: 'Notifications', color: '#ef4444', path: '/app/admin-notifications' },
      { icon: <MapPin size={20} />, label: 'Carte', color: '#ef4444', path: '/app/map' },
      { icon: <User size={20} />, label: 'Profil', color: '#64748b', path: '/app/profile' },
    );
    return tiles;
  }

  tiles.push(
    { icon: <LayoutDashboard size={20} />, label: 'Accueil', color: colors.primary, path: '/app' },
    { icon: <User size={20} />, label: 'Profil', color: '#64748b', path: '/app/profile' },
  );
  return tiles;
};

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

const DashboardPage = () => {
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();

  const {
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  // ✅ STORES
  const {
    patients,
    fetchPatients,
    isLoading: patientsLoading,
  } = usePatientStore();

  const {
    visits,
    fetchVisits,
    isLoading: visitsLoading,
  } = useVisitStore();

  const {
    orders,
    fetchOrders,
    isLoading: ordersLoading,
  } = useOrderStore();

  const {
    aidants,
    fetchAidants,
    isLoading: aidantsLoading,
  } = useAidantCatalogStore();

  const {
    subscriptions,
    payments,
    fetchSubscriptions,
    fetchPayments,
    isLoading: paymentsLoading,
  } = usePaymentStore();

  // ✅ ABONNEMENT GUARD
  const { hasActiveSubscription, remainingVisits } = useSubscriptionGuard();

  const [greeting, setGreeting] = useState('');
  const [isMaman, setIsMaman] = useState(false);
  
  // ✅ STATS ADMIN
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    pendingRegistrations: 0,
    pendingAidants: 0,
    totalAidants: 0,
    totalPayments: 0,
    totalSubscriptions: 0,
    todayVisits: 0,
    pendingValidations: 0,
    revenue: 0,
  });
  const [isLoadingAdminStats, setIsLoadingAdminStats] = useState(false);

  // ✅ STATS BENEFICIAIRES (patients + comptes personnels)
  const [beneficiairesStats, setBeneficiairesStats] = useState({
    patientsCount: 0,
    personalAccountsCount: 0,
    totalBeneficiaires: 0,
  });
  const [isLoadingBeneficiaires, setIsLoadingBeneficiaires] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ Compter les brouillons
  const drafts = visits.filter(v => v.status === 'brouillon');
  const hasDrafts = drafts.length > 0;
  const canConvertDrafts = hasDrafts && hasActiveSubscription && remainingVisits > 0;

  // ✅ CHARGER LES STATS BENEFICIAIRES - CORRIGÉ
  const fetchBeneficiairesStats = async () => {
    setIsLoadingBeneficiaires(true);
    try {
      // 1. Compter les patients
      const { count: patientsCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // 2. Récupérer les familles (comptes)
      const { data: familyLinks } = await supabase
        .from('patient_family_links')
        .select('family_id');

      const familyIdsWithPatients = new Set(familyLinks?.map(l => l.family_id) || []);

      const { data: allFamilies, error: familiesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'family');

      if (familiesError) {
        console.error('❌ Erreur récupération familles:', familiesError);
      }

      //  Compter TOUTES les familles, pas seulement celles sans patient
      const totalFamilies = allFamilies?.length || 0;
      const personalAccountsCount = (allFamilies || []).filter(
        (f: any) => !familyIdsWithPatients.has(f.id)
      ).length;

      //  Total bénéficiaires = TOUS les comptes + TOUS les patients
      const totalBeneficiaires = totalFamilies + (patientsCount || 0);

      console.log('📊 Stats bénéficiaires:', {
        totalFamilies,
        patientsCount: patientsCount || 0,
        personalAccountsCount,
        totalBeneficiaires,
        familyIdsWithPatients: familyIdsWithPatients.size,
      });

      setBeneficiairesStats({
        patientsCount: patientsCount || 0,
        personalAccountsCount: personalAccountsCount,
        totalBeneficiaires: totalBeneficiaires,
      });
    } catch (error) {
      console.error('❌ Erreur récupération stats bénéficiaires:', error);
    } finally {
      setIsLoadingBeneficiaires(false);
    }
  };

  // ✅ CHARGER LES STATS ADMIN
  const fetchAdminStats = async () => {
    if (!isAdminOrCoordinator) return;
    
    setIsLoadingAdminStats(true);
    try {
      const [
        { count: totalUsers },
        { count: pendingRegistrations },
        { count: pendingAidants },
        { count: totalAidants },
        { count: todayVisits },
        { count: pendingValidations },
        { count: totalPayments },
        { count: totalSubscriptions },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('status', 'en_attente'),
        supabase.from('aidants').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('aidants').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('scheduled_date', new Date().toISOString().split('T')[0]),
        supabase.from('visites').select('*', { count: 'exact', head: true }).eq('status', 'terminee'),
        supabase.from('paiements').select('*', { count: 'exact', head: true }),
        supabase.from('abonnements').select('*', { count: 'exact', head: true }).eq('status', 'actif'),
      ]);

      const { data: paymentsData } = await supabase
        .from('paiements')
        .select('amount')
        .eq('status', 'valide');

      const revenue = paymentsData?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

      setAdminStats({
        totalUsers: totalUsers || 0,
        pendingRegistrations: pendingRegistrations || 0,
        pendingAidants: pendingAidants || 0,
        totalAidants: totalAidants || 0,
        totalPayments: totalPayments || 0,
        totalSubscriptions: totalSubscriptions || 0,
        todayVisits: todayVisits || 0,
        pendingValidations: pendingValidations || 0,
        revenue,
      });
    } catch (error) {
      console.error('❌ Erreur chargement stats admin:', error);
    } finally {
      setIsLoadingAdminStats(false);
    }
  };

  // ✅ REFRESH - UN SEUL TOAST D'ERREUR
  const { refreshAll, isRefreshing } = useRefreshableData({
    onRefresh: async () => {
      await Promise.all([
        fetchPatients(true),
        fetchVisits(),
        fetchOrders(),
        fetchAidants(),
        fetchSubscriptions(),
        fetchPayments(),
        fetchBeneficiairesStats(),
      ]);
      if (isAdminOrCoordinator) {
        await fetchAdminStats();
      }
    },
    onError: (error) => {
      console.error('❌ Erreur rafraîchissement:', error);
      // ✅ UN SEUL TOAST D'ERREUR
      toast.error('Erreur lors du rafraîchissement');
    },
  });

  // ✅ CHARGEMENT INITIAL
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchPatients(),
        fetchVisits(),
        fetchOrders(),
        fetchAidants(),
        fetchSubscriptions(),
        fetchPayments(),
        fetchBeneficiairesStats(),
      ]);
      if (isAdminOrCoordinator) {
        await fetchAdminStats();
      }
    };
    loadData();
    setGreeting(getGreeting());
  }, []);

  // ✅ Mettre à jour isMaman quand les patients changent
  useEffect(() => {
    const hasMamanPatient = patients.some((p) => p.category === 'maman_bebe');
    setIsMaman(hasMamanPatient);
  }, [patients]);

  // ✅ STATISTIQUES
  const stats = useMemo(() => {
    const pendingVisits = visits.filter((v) => v.status === 'planifiee' || v.status === 'en_attente').length;
    const upcomingVisits = visits.filter((v) => v.status === 'planifiee' || v.status === 'acceptee').length;
    const pendingOrders = orders.filter((o) => o.status === 'creee' || o.status === 'en_attente' || o.status === 'disponible').length;
    const completedVisits = visits.filter((v) => v.status === 'terminee' || v.status === 'validee').length;
    const totalAidants = aidants.length;
    const totalSubscriptions = subscriptions.filter(s => s.status === 'actif').length;
    const totalPayments = payments.length;

    return {
      proches: beneficiairesStats.totalBeneficiaires || patients.length,
      patientsCount: beneficiairesStats.patientsCount || patients.length,
      personalAccountsCount: beneficiairesStats.personalAccountsCount || 0,
      pendingVisits,
      upcomingVisits,
      pendingOrders,
      completedVisits,
      totalAidants,
      totalSubscriptions,
      totalPayments,
      totalUsers: adminStats.totalUsers,
      pendingRegistrations: adminStats.pendingRegistrations,
      pendingAidants: adminStats.pendingAidants,
      todayVisits: adminStats.todayVisits,
      pendingValidations: adminStats.pendingValidations,
      revenue: adminStats.revenue,
      draftCount: drafts.length,
    };
  }, [patients, visits, orders, aidants, subscriptions, payments, adminStats, beneficiairesStats, drafts.length]);

  const tiles = getTilesForRole(role, colors, stats, stats.proches);
  const isLoading = patientsLoading || visitsLoading || ordersLoading || aidantsLoading || paymentsLoading || isLoadingAdminStats || isLoadingBeneficiaires;

  // ✅ DÉTERMINER L'IMAGE DE LA BANNIÈRE SELON LE RÔLE ET LA CATÉGORIE
  const getHeroImage = () => {
    if (isAdminOrCoordinator) {
      return '/assets/images/banners/coord-banner.png';
    }
    if (isAidant) {
      return '/assets/images/banners/aidant-banner.png';
    }
    if (isFamily) {
      if (isMaman) {
        return '/assets/images/banners/maman-banner.png';
      }
      return '/assets/images/banners/senior-banner.png';
    }
    return '/assets/images/banners/senior-banner.png';
  };

  const heroImage = getHeroImage();

  const heroTitle = () => {
    if (isAdminOrCoordinator) {
      return '👔 Supervision de la plateforme';
    }
    if (isAidant) {
      return '🦸 Vos missions en un coup d\'œil';
    }
    if (isMaman) {
      return '🌸 Votre espace Maman & Bébé';
    }
    if (isFamily && stats.proches > 0) {
      return '👨‍👩‍👦 Un suivi clair pour votre proche';
    }
    if (isFamily && stats.proches === 0) {
      return '🌱 Bienvenue sur Santé Plus Services';
    }
    return 'Bienvenue sur Santé Plus.';
  };

  const heroDescription = () => {
    if (isAdminOrCoordinator) {
      return 'Supervisez l\'ensemble des activités et gérez les utilisateurs.';
    }
    if (isAidant) {
      return 'Retrouvez vos missions, planning et communications au même endroit.';
    }
    if (isMaman) {
      return 'Visites, messages et commandes réunis dans un espace simple pour vous et votre bébé.';
    }
    if (isFamily && stats.proches > 0) {
      return 'Gardez une vue rapide sur les visites et commandes de votre proche.';
    }
    if (isFamily && stats.proches === 0) {
      return 'Gérez vos services d\'accompagnement en toute simplicité.';
    }
    return 'Gérez vos accompagnements en toute simplicité.';
  };

  const getProchesTitle = () => {
    if (isFamily) return 'Mes proches';
    if (isAidant) return 'Personnes accompagnées';
    if (isAdminOrCoordinator) return 'Bénéficiaires suivis';
    return 'Personnes suivies';
  };

  const hasProches = stats.proches > 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-44 rounded-3xl bg-white animate-pulse shadow-sm" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white rounded-xl animate-pulse shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8 px-4 sm:px-0">
      
      {/* ✅ BANNIÈRE D'ALERTE POUR BROUILLONS */}
      {isFamily && canConvertDrafts && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-xl shadow-sm border border-yellow-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-500 mt-0.5" size={24} />
              <div>
                <p className="font-bold text-yellow-800">
                  📋 {stats.draftCount} visite{stats.draftCount > 1 ? 's' : ''} en attente de validation
                </p>
                <p className="text-sm text-yellow-700">
                  Vous avez {remainingVisits} visite(s) restante(s) sur votre abonnement.
                  Validez vos visites en brouillon maintenant !
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                to="/app/visits"
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition"
              >
                ✅ Valider maintenant
              </Link>
              <button
                onClick={() => {
                  // ✅ UN SEUL TOAST
                  toast.success('Les visites en brouillon sont disponibles dans l\'onglet Visites');
                }}
                className="bg-white hover:bg-gray-50 text-yellow-700 px-3 py-2 rounded-xl text-sm font-bold border border-yellow-300 transition"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
      HERO BANNER
      ============================================================ */}
      <section 
        className="relative overflow-hidden rounded-3xl min-h-[180px] sm:min-h-[200px] transition-all shadow-sm hover:shadow-md"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.25) 100%),
            url('${heroImage}')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/5 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 min-h-[180px] sm:min-h-[200px]">
          <div className="space-y-1.5 min-w-0">
            <div
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/90 backdrop-blur-sm border shrink-0"
              style={{
                borderColor: colors.primary + '18',
                color: colors.primary,
              }}
            >
              <ActivityIcon role={role} />
              <span className="text-gray-700">{isAidant ? 'Espace Intervenant' : 'Espace Accompagnement'}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight drop-shadow-md">
              {heroTitle()}
            </h1>

            <p className="text-white/85 text-xs sm:text-sm font-semibold leading-relaxed max-w-md drop-shadow">
              {heroDescription()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center mt-2 sm:mt-0">
            <RefreshButton 
              size="sm" 
              showText={false}
              onRefresh={refreshAll}
            />

            {isFamily && (
              <button
                onClick={() => navigate('/app/visits')}
                className="group inline-flex items-center gap-1.5 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all hover:opacity-95 active:scale-[0.97] shadow-lg shadow-black/20"
                style={{ background: colors.primary }}
              >
                Gérer les visites
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
            
            {isAidant && (
              <button
                onClick={() => navigate('/app/planning')}
                className="group inline-flex items-center gap-1.5 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all hover:opacity-95 active:scale-[0.97] shadow-lg shadow-black/20"
                style={{ background: colors.primary }}
              >
                Mon planning
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            )}

            {isAdminOrCoordinator && (
              <button
                onClick={() => navigate('/app/admin')}
                className="group inline-flex items-center gap-1.5 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all hover:opacity-95 active:scale-[0.97] shadow-lg shadow-black/20"
                style={{ background: colors.primary }}
              >
                Espace Admin
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* METRIQUES DE SYNTHÈSE */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isFamily && (
          <>
            <StatCard
              label={hasProches ? 'Proches suivis' : 'Compte'}
              value={hasProches ? stats.proches : '✓'}
              icon={hasProches ? <Users size={15} /> : <CheckCircle size={15} />}
              color={hasProches ? colors.primary : '#10b981'}
              onClick={() => navigate(hasProches ? '/app/patients' : '/app/profile')}
            />
            <StatCard
              label="Visites à venir"
              value={stats.upcomingVisits}
              icon={<Calendar size={15} />}
              color="#10b981"
              onClick={() => navigate('/app/visits')}
            />
            <StatCard
              label="Commandes en cours"
              value={stats.pendingOrders}
              icon={<ShoppingBag size={15} />}
              color="#f59e0b"
              onClick={() => navigate('/app/orders')}
            />
            <StatCard
              label="Visites terminées"
              value={stats.completedVisits}
              icon={<CheckCircle size={15} />}
              color="#3b82f6"
              onClick={() => navigate('/app/visits')}
            />
          </>
        )}

        {isAidant && (
          <>
            <StatCard
              label="Bénéficiaires"
              value={stats.proches}
              icon={<Users size={15} />}
              color={colors.primary}
              onClick={() => navigate('/app/patients')}
            />
            <StatCard
              label="Missions"
              value={stats.pendingVisits}
              icon={<Calendar size={15} />}
              color="#10b981"
              onClick={() => navigate('/app/planning')}
            />
            <StatCard
              label="Commandes"
              value={stats.pendingOrders}
              icon={<ShoppingBag size={15} />}
              color="#f59e0b"
              onClick={() => navigate('/app/orders')}
            />
            <StatCard
              label="Interventions"
              value={stats.completedVisits}
              icon={<History size={15} />}
              color="#78350f"
              onClick={() => navigate('/app/history')}
            />
          </>
        )}

        {isAdminOrCoordinator && (
          <>
            <StatCard
              label="Bénéficiaires"
              value={stats.proches}
              icon={<Users size={15} />}
              color={colors.primary}
              onClick={() => navigate('/app/patients')}
            />
            <StatCard
              label="Inscriptions"
              value={stats.pendingRegistrations}
              icon={<ClipboardList size={15} />}
              color="#f59e0b"
              onClick={() => navigate('/app/registrations')}
            />
            <StatCard
              label="Aidants"
              value={stats.totalAidants}
              icon={<UserCheck size={15} />}
              color="#3b82f6"
              onClick={() => navigate('/app/aidants')}
            />
            <StatCard
              label="Revenus"
              value={`${stats.revenue.toLocaleString()} FCFA`}
              icon={<TrendingUp size={15} />}
              color="#10b981"
              onClick={() => navigate('/app/admin-payments')}
            />
          </>
        )}
      </section>

      {/* SUGGESTIONS D'ONBOARDING */}
      {isFamily && !hasProches && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SuggestionCard
            icon={<CreditCard size={20} />}
            title="Découvrir les offres"
            description="Choisissez la formule d'abonnement la plus adaptée à vos besoins d'accompagnement."
            color={colors.primary}
            onClick={() => navigate('/app/billing')}
            buttonText="Voir les offres"
          />
          <SuggestionCard
            icon={<UserPlus size={20} />}
            title="Enregistrer un proche"
            description="Renseignez le profil de la personne pour initier son premier accompagnement à domicile."
            color={colors.primary}
            onClick={() => navigate('/app/patients')}
            buttonText="Enregistrer"
          />
        </section>
      )}

     {/* Nouveau design Menu Rapide */}
<section className="mt-6">
  <div className="flex items-center justify-between mb-4 px-1">
    <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Services</h2>
  </div>

  <div className="grid grid-cols-2 gap-3">
    {tiles.map((tile, index) => (
      <button
        key={index}
        onClick={() => navigate(tile.path)}
        className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-[var(--color-primary)]/30 transition-all active:scale-[0.98]"
      >
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: tile.color + '10', color: tile.color }}
        >
          {tile.icon}
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-gray-800">{tile.label}</p>
        </div>
      </button>
    ))}
  </div>
</section>

      {/* PROCHES / BENEFICIAIRES RECENTES */}
      {(isFamily || isAidant) && hasProches && (
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/50">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold tracking-wider uppercase text-gray-400">
              {getProchesTitle()}
            </h2>
            <button
              onClick={() => navigate('/app/patients')}
              className="group text-xs font-bold flex items-center gap-1 hover:underline"
              style={{ color: colors.primary }}
            >
              Voir tout <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {patients.slice(0, 2).map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                compact
                onClick={() => navigate(`/app/patients/${patient.id}`)}
              />
            ))}
          </div>
          {patients.length > 2 && (
            <div className="mt-3 text-center">
              <button
                onClick={() => navigate('/app/patients')}
                className="text-xs font-bold hover:underline"
                style={{ color: colors.primary }}
              >
                Voir les {patients.length} proches
              </button>
            </div>
          )}
        </section>
      )}

      {/* PROCHAINES ACTIONS */}
      {isFamily && (stats.upcomingVisits > 0 || stats.pendingOrders > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.upcomingVisits > 0 && (
            <section className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/50">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-bold tracking-wider uppercase text-gray-400">
                  Prochaines visites
                </h2>
                <button
                  onClick={() => navigate('/app/visits')}
                  className="text-xs font-bold hover:underline"
                  style={{ color: colors.primary }}
                >
                  Tout voir
                </button>
              </div>
              <div className="space-y-2.5">
                {visits
                  .filter((v) => v.status === 'planifiee' || v.status === 'acceptee' || v.status === 'en_cours')
                  .slice(0, 2)
                  .map((visit) => (
                    <VisitCard key={visit.id} visit={visit} compact onClick={() => navigate(`/app/visits/${visit.id}`)} />
                  ))}
              </div>
            </section>
          )}

          {stats.pendingOrders > 0 && (
            <section className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/50">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-bold tracking-wider uppercase text-gray-400">
                  Commandes récentes
                </h2>
                <button
                  onClick={() => navigate('/app/orders')}
                  className="text-xs font-bold hover:underline"
                  style={{ color: colors.primary }}
                >
                  Tout voir
                </button>
              </div>
              <div className="space-y-2.5">
                {orders
                  .filter((o) => o.status === 'creee' || o.status === 'en_attente' || o.status === 'en_cours' || o.status === 'disponible')
                  .slice(0, 2)
                  .map((order) => (
                    <OrderCard key={order.id} order={order} compact onClick={() => navigate(`/app/orders/${order.id}`)} />
                  ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* PLANIFICATION POUR LES AIDANTS */}
      {isAidant && stats.pendingVisits > 0 && (
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/50">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold tracking-wider uppercase text-gray-400">
              📋 Missions à venir
            </h2>
            <button
              onClick={() => navigate('/app/planning')}
              className="text-xs font-bold hover:underline"
              style={{ color: colors.primary }}
            >
              Tout voir
            </button>
          </div>
          <div className="space-y-2.5">
            {visits
              .filter((v) => v.status === 'planifiee' || v.status === 'acceptee')
              .slice(0, 3)
              .map((visit) => (
                <VisitCard key={visit.id} visit={visit} compact onClick={() => navigate(`/app/visits/${visit.id}`)} />
              ))}
          </div>
        </section>
      )}

      {/* EMPTY STATE PROACTIF */}
      {isFamily && hasProches && stats.upcomingVisits === 0 && stats.pendingOrders === 0 && (
        <section className="bg-white rounded-3xl p-6 text-center border border-gray-100/50">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: colors.primary + '08' }}>
            <Lightbulb size={22} style={{ color: colors.primary }} />
          </div>
          <h3 className="font-extrabold text-sm" style={{ color: colors.text }}>
            Commencez à utiliser Santé Plus
          </h3>
          <p className="text-xs mt-1 text-gray-400 max-w-sm mx-auto leading-relaxed">
            Planifiez votre première visite ou passez une commande de fournitures de santé pour découvrir nos services.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <button
              onClick={() => navigate('/app/visits')}
              className="px-4 py-2 rounded-xl text-white font-bold text-xs transition-all hover:opacity-90 flex items-center gap-1.5 shadow-sm shadow-purple-50"
              style={{ background: colors.primary }}
            >
              <Calendar size={13} />
              Planifier une visite
            </button>
            <button
              onClick={() => navigate('/app/orders/create')}
              className="px-4 py-2 rounded-xl font-bold text-xs border transition-all hover:bg-gray-50 flex items-center gap-1.5"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              <ShoppingBag size={13} />
              Nouvelle commande
            </button>
          </div>
        </section>
      )}

      <footer className="text-center py-4">
         <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1 font-medium">
          <Heart size={10} className="text-red-400 fill-red-400" />
          Santé Plus Services — Votre accompagnement de confiance
         </p>
      </footer>
    </div>
  );
};

// =============================================
// COMPOSANT COMPLEMENTAIRE INTERNE
// =============================================
interface ActivityIconProps {
  role: string | null;
}

const ActivityIcon = ({ role }: ActivityIconProps) => {
  if (role === 'family') return <Compass size={11} />;
  if (role === 'aidant') return <Rocket size={11} />;
  return <LayoutDashboard size={11} />;
};

// =============================================
// STAT CARD ÉPURÉ
// =============================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

const StatCard = ({ label, value, icon, color, onClick }: StatCardProps) => {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.01)] border border-gray-100 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 text-left w-full flex items-center justify-between group"
    >
      <div className="space-y-0.5 min-w-0 pr-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
          {label}
        </p>
        <p className="text-lg sm:text-xl font-extrabold truncate" style={{ color }}>
          {value}
        </p>
      </div>
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
        style={{ background: color + '0d', color }}
      >
        {icon}
      </div>
    </button>
  );
};

// =============================================
// SUGGESTION CARD
// =============================================

interface SuggestionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
  buttonText: string;
}

const SuggestionCard = ({ icon, title, description, color, onClick, buttonText }: SuggestionCardProps) => {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-4.5 border border-gray-100 text-left hover:shadow-sm transition-all duration-300 group flex items-start gap-3 w-full"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-300 shadow-inner" style={{ background: color + '10', color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <h4 className="font-extrabold text-xs" style={{ color }}>{title}</h4>
        <p className="text-[11px] text-gray-400 leading-normal">{description}</p>
        <span className="inline-flex items-center gap-0.5 mt-1.5 text-[11px] font-bold group-hover:underline" style={{ color }}>
          {buttonText} <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
};

export default DashboardPage;
