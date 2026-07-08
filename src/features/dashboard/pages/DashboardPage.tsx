// 📁 src/features/dashboard/pages/DashboardPage.tsx
 
import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  FileCheck,
  UserPlus,
  Rocket,
  DollarSign,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
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
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

import { VisitCard } from '@/components/visits/VisitCard';
import { OrderCard } from '@/components/orders/OrderCard';

// =============================================
// TYPES ET INTERFACES INTERNES
// =============================================

interface Tile {
  icon: React.ReactNode;
  label: string;
  color: string;
  path: string;
  badge?: number;
}

interface HeroSlide {
  title: string;
  description: string;
  image: string;
  actionText: string;
  actionPath: string;
}

// =============================================
// DÉFINITION DES TUILES PAR RÔLE
// =============================================
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
      { icon: <Users size={20} />, label: 'Bénéficiaires', color: colors.primary, path: '/app/patients', badge: patientsCount },
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
  const { profile, role } = useAuthStore();

  const {
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  // ✅ STORES
  const { patients, fetchPatients, isLoading: patientsLoading } = usePatientStore();
  const { visits, fetchVisits, isLoading: visitsLoading } = useVisitStore();
  const { orders, fetchOrders, isLoading: ordersLoading } = useOrderStore();
  const { aidants, fetchAidants, isLoading: aidantsLoading } = useAidantCatalogStore();
  const { subscriptions, payments, fetchSubscriptions, fetchPayments, isLoading: paymentsLoading } = usePaymentStore();

  // ✅ ABONNEMENT GUARD
  const { hasActiveSubscription, remainingVisits } = useSubscriptionGuard();

  const [greeting, setGreeting] = useState('');
  const [isMaman, setIsMaman] = useState(false);
  
  // ✅ CARROUSEL INTERACTIF ÉTATS
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoplayActive, setAutoplayActive] = useState(true);
  const [cycleCount, setCycleCount] = useState(0);

  // Pour le contrôle tactile (Swipe)
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  // ✅ STATS ADMIN / BENEFICIAIRES
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

  const [beneficiairesStats, setBeneficiairesStats] = useState({
    patientsCount: 0,
    personalAccountsCount: 0,
    totalBeneficiaires: 0,
  });
  const [isLoadingBeneficiaires, setIsLoadingBeneficiaires] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const drafts = visits.filter(v => v.status === 'brouillon');
  const hasDrafts = drafts.length > 0;
  const canConvertDrafts = hasDrafts && hasActiveSubscription && remainingVisits > 0;

  // =============================================
  // DÉFINITION CARROUSEL DYNAMIQUE PAR RÔLE
  // =============================================
  const slides: HeroSlide[] = useMemo(() => {
    const seniorImg = '/assets/images/banners/senior-banner.png';
    const mamanImg = '/assets/images/banners/maman-banner.png';
    const aidantImg = '/assets/images/banners/aidant-banner.png';
    const coordImg = '/assets/images/banners/coord-banner.png';

    if (isAdminOrCoordinator) {
      return [
        {
          title: '👔 Supervision de la plateforme',
          description: 'Surveillez les activités en direct, validez les fiches d’inscriptions et supervisez les interventions.',
          image: coordImg,
          actionText: 'Espace Admin',
          actionPath: '/app/admin',
        },
        {
          title: '📋 Inscriptions en attente',
          description: 'De nouveaux candidats attendent votre validation. Rapprochez les familles de nos aidants qualifiés.',
          image: coordImg,
          actionText: 'Inscriptions',
          actionPath: '/app/registrations',
        },
        {
          title: '💳 Validation des visites',
          description: 'Consultez les rapports soumis par les intervenants et validez-les pour décompter les abonnements.',
          image: coordImg,
          actionText: 'Valider visites',
          actionPath: '/app/admin/visits/validation',
        }
      ];
    }

    if (isAidant) {
      return [
        {
          title: '🦸 Vos missions du jour',
          description: 'Accédez en un clic à votre planning d\'interventions, à la carte radar et aux fiches d\'accompagnements.',
          image: aidantImg,
          actionText: 'Mon planning',
          actionPath: '/app/planning',
        },
        {
          title: '📍 Suivi GPS de livraison',
          description: 'Lancez l\'itinéraire GPS de livraison en direct pour rassurer les familles sur le trajet.',
          image: aidantImg,
          actionText: 'Voir la carte',
          actionPath: '/app/map',
        },
        {
          title: '💬 Messagerie centralisée',
          description: 'Besoin d\'un conseil ou d\'un rapport à envoyer ? Communiquez directement avec le coordinateur.',
          image: aidantImg,
          actionText: 'Mes messages',
          actionPath: '/app/messages',
        }
      ];
    }

    // Cas Maman & Bébé spécifique (Famille)
    if (isFamily && isMaman) {
      return [
        {
          title: '👶 Votre espace Maman & Bébé',
          description: 'Organisez sereinement la garde, les sorties et les commandes de soins pour vous et votre nouveau-né.',
          image: mamanImg,
          actionText: 'Planifier une visite',
          actionPath: '/app/visits',
        },
        {
          title: '🛒 Commandes urgentes Bébé',
          description: 'Faites livrer des couches, du lait infantile ou des soins en pharmacie en quelques clics.',
          image: mamanImg,
          actionText: 'Passer commande',
          actionPath: '/app/orders/create',
        },
        {
          title: '💬 Discussion en direct',
          description: 'Échangez à tout moment avec l\'assistante maternelle ou l\'aidant assigné à votre bébé.',
          image: mamanImg,
          actionText: 'Contacter l\'aidant',
          actionPath: '/app/messages',
        }
      ];
    }

    // Famille classique (Senior par défaut)
    return [
      {
        title: '👨‍👩‍👦 Un suivi clair pour votre proche',
        description: 'Planifiez ses visites d\'accompagnement et supervisez son bien-être à domicile depuis votre mobile.',
        image: seniorImg,
        actionText: 'Planifier une visite',
        actionPath: '/app/visits',
      },
      {
        title: '🛒 Commande de courses & soins',
        description: 'Livraison de médicaments, de repas équilibrés ou de courses directement chez votre proche.',
        image: seniorImg,
        actionText: 'Nouvelle commande',
        actionPath: '/app/orders/create',
      },
      {
        title: '⭐ Formules d\'abonnements Confort',
        description: 'Souscrivez à un accompagnement régulier pour bénéficier de tarifs dégressifs et d\'un aidant permanent.',
        image: seniorImg,
        actionText: 'Voir les abonnements',
        actionPath: '/app/billing',
      }
    ];
  }, [isAdminOrCoordinator, isAidant, isFamily, isMaman]);

  // =============================================
  // AUTOPLAY LIMITÉ À 2 CYCLES COMPLETS SANS TOUCHES
  // =============================================
  useEffect(() => {
    if (!autoplayActive || slides.length <= 1) return;

    const interval = setInterval(() => {
      setCycleCount((prevCount) => {
        const nextCount = prevCount + 1;
        // Arrêt de la rotation après 2 cycles complets (ex: 3 slides * 2 = 6 transitions)
        if (nextCount >= slides.length * 2) {
          setAutoplayActive(false);
          clearInterval(interval);
          return nextCount;
        }
        return nextCount;
      });

      setCurrentSlide((prevIndex) => (prevIndex + 1) % slides.length);
    }, 4000); // Défilement toutes les 4 secondes

    return () => clearInterval(interval);
  }, [autoplayActive, slides.length]);

  // =============================================
  // GESTION DU BALAYAGE TACTILE (SWIPABLE DOCK CARDS)
  // =============================================
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNextSlide();
    } else if (isRightSwipe) {
      handlePrevSlide();
    }
  };

  const handleNextSlide = () => {
    setAutoplayActive(false); // Désactive l'autoplay lors d'une action manuelle
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setAutoplayActive(false); // Désactive l'autoplay lors d'une action manuelle
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleDotClick = (index: number) => {
    setAutoplayActive(false); // Désactive l'autoplay
    setCurrentSlide(index);
  };

  // ✅ CHARGER LES STATS BENEFICIAIRES
  const fetchBeneficiairesStats = async () => {
    setIsLoadingBeneficiaires(true);
    try {
      const { count: patientsCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      const { data: familyLinks } = await supabase
        .from('patient_family_links')
        .select('family_id');

      const familyIdsWithPatients = new Set(familyLinks?.map(l => l.family_id) || []);

      const { data: allFamilies, error: familiesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'family');

      if (familiesError) {
        console.error('❌ Erreur familles:', familiesError);
      }

      const totalFamilies = allFamilies?.length || 0;
      const personalAccountsCount = (allFamilies || []).filter(
        (f: any) => !familyIdsWithPatients.has(f.id)
      ).length;

      const totalBeneficiaires = totalFamilies + (patientsCount || 0);

      setBeneficiairesStats({
        patientsCount: patientsCount || 0,
        personalAccountsCount: personalAccountsCount,
        totalBeneficiaires: totalBeneficiaires,
      });
    } catch (error) {
      console.error('❌ Erreur stats bénéficiaires:', error);
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
      console.error('❌ Erreur stats admin:', error);
    } finally {
      setIsLoadingAdminStats(false);
    }
  };

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
    onError: () => {
      toast.error('Erreur lors du rafraîchissement');
    },
  });

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

  useEffect(() => {
    const hasMamanPatient = patients.some((p) => p.category === 'maman_bebe');
    setIsMaman(hasMamanPatient);
  }, [patients]);

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
      
      {/* BANNIÈRE BROUILLONS */}
      {isFamily && canConvertDrafts && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-xl shadow-sm border border-yellow-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-500 mt-0.5" size={24} />
              <div>
                <p className="font-bold text-yellow-800">
                  📋 {stats.draftCount} visite{stats.draftCount > 1 ? 's' : ''} en attente de validation
                </p>
                <p className="text-sm text-yellow-700 font-medium mt-0.5">
                  Une ou plusieurs visites sont sauvegardées. Finalisez-les en un clic avec votre abonnement.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/app/visits?filter=brouillon')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm shrink-0"
            >
              Consulter mes brouillons
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          🆕 HERO BANNER : DIAPORAMA DE CARTES PAR RÔLES ET PAR AMBIANCES (GLASSMORPHIC & BOUTONS DIRECTS)
          ============================================================ */}
      <section 
        className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 border border-white/10"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Rail de translation horizontal fluide */}
        <div 
          className="flex transition-transform duration-500 ease-out h-[210px] sm:h-[185px] w-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div 
              key={index}
              className="w-full shrink-0 h-full relative"
              style={{
                backgroundImage: `
                  linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.25) 100%),
                  url('${slide.image}')
                `,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="relative z-10 flex flex-col justify-between h-full p-5 sm:p-6 pb-9 sm:pb-7">
                <div className="space-y-1.5 min-w-0">
                  <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight uppercase flex items-center gap-1.5 opacity-95">
                    {slide.title}
                  </h1>
                  <p className="text-white/85 text-xs sm:text-sm font-medium leading-relaxed max-w-lg">
                    {slide.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(slide.actionPath)}
                    className="inline-flex items-center gap-1.5 text-white text-[11px] sm:text-xs font-black px-4 py-2 rounded-2xl transition-all shadow-lg active:scale-95"
                    style={{ background: colors.primary }}
                  >
                    {slide.actionText}
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ✅ INDICATEURS PAGINATION (PILLS LUMINEUSES) ET CONTRÔLES COMPACTES */}
        <div className="absolute bottom-3 left-0 right-0 z-20 flex items-center justify-between px-5 pointer-events-none">
          {/* Points */}
          <div className="flex gap-1.5 pointer-events-auto">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  currentSlide === index ? "w-6 bg-white" : "w-1.5 bg-white/40"
                )}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Fleches compactes */}
          <div className="flex items-center gap-1 pointer-events-auto">
            <button 
              onClick={handlePrevSlide}
              className="w-6 h-6 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition active:scale-90"
            >
              <ChevronLeft size={14} />
            </button>
            <button 
              onClick={handleNextSlide}
              className="w-6 h-6 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition active:scale-90"
            >
              <ChevronRight size={14} />
            </button>
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

      {/* MENU DE NAVIGATION GRILLE */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/50">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xs font-bold tracking-wider uppercase text-gray-400">
            Menu rapide
          </h2>
          <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full font-semibold">{tiles.length} outils</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {tiles.map((tile, index) => (
            <button
              key={index}
              onClick={() => navigate(tile.path)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 hover:bg-gray-50/70 hover:shadow-sm active:scale-95 group relative overflow-hidden"
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mb-2 transition-all duration-300 group-hover:scale-105 shadow-inner"
                style={{ background: tile.color + '0a', color: tile.color }}
              >
                {tile.icon}
              </div>
              <span className="text-[11px] font-semibold text-center leading-tight text-gray-600 truncate w-full transition-colors group-hover:text-gray-900">
                {tile.label}
              </span>
              {tile.badge !== undefined && tile.badge > 0 && (
                <span
                  className="mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all"
                  style={{ background: tile.color + '12', color: tile.color }}
                >
                  {tile.badge}
                </span>
              )}
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
