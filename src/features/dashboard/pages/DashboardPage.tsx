// 📁 src/features/dashboard/pages/DashboardPage.tsx
 
import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  ShoppingBag,
  CheckCircle,
  User,
  ArrowRight,
  CreditCard,
  DollarSign,
  MapPin,
  BookOpen,
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
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { usePaymentStore } from '@/stores/paymentStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { useBranding } from '@/hooks/useBranding';
import { getGreeting } from '@/utils/helpers';
import { useTerminology } from '@/hooks/useTerminology';
import { useRefreshableData } from '@/hooks/useRefreshableData';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

import { VisitCard } from '@/components/visits/VisitCard';
import { OrderCard } from '@/components/orders/OrderCard';
import { PatientCard } from '@/components/patients/PatientCard';

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
      { icon: <Users size={20} />, label: 'Mes Proches', color: colors.primary, path: '/app/patients', badge: patientsCount },
      { icon: <Calendar size={20} />, label: 'Visites', color: colors.gold || '#c9a84c', path: '/app/visits', badge: stats.upcomingVisits },
      { icon: <ShoppingBag size={20} />, label: 'Commandes', color: colors.primaryLight || '#2a6a4a', path: '/app/orders', badge: stats.pendingOrders },
      { icon: <CreditCard size={20} />, label: 'Mon Forfait', color: colors.gold || '#c9a84c', path: '/app/billing' },
      { icon: <BookOpen size={20} />, label: 'Journal', color: colors.primaryLight || '#2a6a4a', path: '/app/journal' },
      { icon: <MapPin size={20} />, label: 'Carte', color: '#ef4444', path: '/app/map' },
      { icon: <User size={20} />, label: 'Profil', color: '#64748b', path: '/app/profile' },
    );
    return tiles;
  }

  if (role === 'aidant') {
    tiles.push(
      { icon: <Users size={20} />, label: 'Bénéficiaires', color: colors.primary, path: '/app/patients', badge: patientsCount },
      { icon: <Calendar size={20} />, label: 'Planning', color: colors.gold || '#c9a84c', path: '/app/planning' },
      { icon: <Clock size={20} />, label: 'Missions', color: colors.primaryLight || '#2a6a4a', path: '/app/missions', badge: stats.pendingVisits },
      { icon: <History size={20} />, label: 'Historique', color: '#78350f', path: '/app/history' },
      { icon: <ShoppingBag size={20} />, label: 'Commandes', color: '#f59e0b', path: '/app/orders', badge: stats.pendingOrders },
      { icon: <MapPin size={20} />, label: 'Carte', color: '#ef4444', path: '/app/map' },
      { icon: <User size={20} />, label: 'Profil', color: '#64748b', path: '/app/profile' },
    );
    return tiles;
  }

  if (role === 'admin' || role === 'coordinator') {
    tiles.push(
      { icon: <LayoutDashboard size={20} />, label: 'Dashboard Admin', color: colors.primary, path: '/app/admin' },
      { icon: <ClipboardList size={20} />, label: 'Inscriptions', color: colors.gold || '#c9a84c', path: '/app/registrations', badge: stats.pendingRegistrations },
      { icon: <UserCheck size={20} />, label: 'Candidatures', color: colors.primaryLight || '#2a6a4a', path: '/app/aidant-candidates', badge: stats.pendingAidants },
      { icon: <Users size={20} />, label: 'Bénéficiaires', color: '#3b82f6', path: '/app/patients', badge: stats.totalBeneficiaires },
      { icon: <Calendar size={20} />, label: 'Visites', color: colors.gold || '#c9a84c', path: '/app/visits', badge: stats.todayVisits },
      { icon: <FileCheck size={20} />, label: 'Valider visites', color: colors.primaryLight || '#2a6a4a', path: '/app/admin/visits/validation', badge: stats.pendingValidations },
      { icon: <ShoppingBag size={20} />, label: 'Commandes', color: '#f59e0b', path: '/app/orders', badge: stats.pendingOrders },
      { icon: <DollarSign size={20} />, label: 'Paiements', color: colors.gold || '#c9a84c', path: '/app/admin-payments', badge: stats.totalPayments },
      { icon: <Award size={20} />, label: 'Abonnements', color: '#78350f', path: '/app/admin-subscriptions', badge: stats.totalSubscriptions },
      { icon: <Package size={20} />, label: 'Offres', color: '#64748b', path: '/app/offers' },
      { icon: <Settings size={20} />, label: 'Paramètres', color: '#475569', path: '/app/settings' },
      { icon: <Bell size={20} />, label: 'Notifications', color: '#ef4444', path: '/app/admin-notifications', badge: stats.unreadCount },
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
  const brand = useBranding();
  const colors = brand.colors;

  const {
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  // Stores
  const { patients, fetchPatients, isLoading: patientsLoading } = usePatientStore();
  const { visits, fetchVisits, isLoading: visitsLoading } = useVisitStore();
  const { orders, fetchOrders, isLoading: ordersLoading } = useOrderStore();
  const { aidants, fetchAidants, isLoading: aidantsLoading } = useAidantCatalogStore();
  const { subscriptions, payments, fetchSubscriptions, fetchPayments, isLoading: paymentsLoading } = usePaymentStore();

  const { hasActiveSubscription, remainingVisits } = useSubscriptionGuard();

  const [greeting, setGreeting] = useState('');
  const [isMaman, setIsMaman] = useState(false);
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoplayActive, setAutoplayActive] = useState(true);
  const [cycleCount, setCycleCount] = useState(0);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  // Stats admin / bénéficiaires
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

  const drafts = visits.filter(v => v.status === 'brouillon');
  const hasDrafts = drafts.length > 0;
  const canConvertDrafts = hasDrafts && hasActiveSubscription && remainingVisits > 0;

  // ============================================================
  // SLIDES DU CARROUSEL AVEC COULEURS DU BRANDING (MESSAGERIES SUPPRIMÉES) [24]
  // ============================================================
  const slides: HeroSlide[] = useMemo(() => {
    const seniorImg = '/assets/images/banners/senior-banner.png';
    const mamanImg = '/assets/images/banners/maman-banner.png';
    const aidantImg = '/assets/images/banners/aidant-banner.png';
    const coordImg = '/assets/images/banners/coord-banner.png';

    // 👔 ADMIN / COORDINATEUR (5 SLIDES)
    if (isAdminOrCoordinator) {
      return [
        {
          title: '👔 Supervision de la Plateforme',
          description: 'Pilotez l\'activité globale de Santé Plus Services, gérez les alertes opérationnelles et supervisez les interventions en cours.',
          image: coordImg,
          actionText: 'Espace Admin',
          actionPath: '/app/admin',
        },
        {
          title: '📝 Inscriptions en attente',
          description: 'Validez les nouvelles fiches d\'inscriptions des familles locales et de la diaspora béninoise pour activer leurs accès.',
          image: coordImg,
          actionText: 'Voir les inscriptions',
          actionPath: '/app/registrations',
        },
        {
          title: '✓ Validation des Visites',
          description: 'Examinez les comptes-rendus, photos et mémos vocaux soumis par les aidants pour finaliser la validation des visites.',
          image: '/assets/images/banners/coord-visit.png',
          actionText: 'Valider visites',
          actionPath: '/app/admin/visits/validation',
        },
        {
          title: '💼 Gestion des Offres & Tarifs',
          description: 'Configurez les forfaits Santé Plus Services (Seniors) et Santé Plus Maman & Bébé (Grossesse, Postpartum, Allaitement).',
          image: coordImg,
          actionText: 'Gérer les offres',
          actionPath: '/app/offers',
        },
        {
          title: '📍 Radar d\'interventions GPS',
          description: 'Suivez la position géographique en temps réel des intervenants sur le terrain pour contrôler le bon déroulement des missions.',
          image: coordImg,
          actionText: 'Ouvrir la carte',
          actionPath: '/app/map',
        }
      ];
    }

    // 🦸 AIDANT (5 SLIDES SÉCURISÉES SANS MESSAGERIE) [24]
    if (isAidant) {
      return [
        {
          title: '🦸 Vos planning de visites',
          description: 'Consultez les dates et heures de vos prochains accompagnements à domicile pour vos bénéficiaires assignés.',
          image: aidantImg,
          actionText: 'Mon planning',
          actionPath: '/app/planning',
        },
        {
          title: '📍 Suivi d\'itinéraire GPS actif',
          description: 'Enregistrez votre départ et arrivée lors des visites pour rassurer la famille et valider la réalité des missions.',
          image: aidantImg,
          actionText: 'Voir la carte',
          actionPath: '/app/map',
        },
        {
          title: '🛒 Courses et livraisons de confort',
          description: 'Consultez les commandes de médicaments, produits bébé ou courses de première nécessité de votre zone.',
          image: '/assets/images/banners/aidant-visit.png',
          actionText: 'Commandes disponibles',
          actionPath: '/app/orders',
        },
        {
          // ✅ ENRICHI SANS MESSAGERIE : Valorise les mémos vocaux et photos de fin de visite 
          title: '🎤 Comptes-rendus immersifs',
          description: 'Ajoutez des mémos vocaux en direct et des photos d’intervention pour justifier l’excellence de vos visites à la coordination.',
          image: aidantImg,
          actionText: 'Mon historique',
          actionPath: '/app/history',
        },
        {
          title: '📋 Historique de vos rapports',
          description: 'Retrouvez l\'ensemble de vos rapports d\'intervention complétés, les mémos vocaux transmis et vos états validés.',
          image: aidantImg,
          actionText: 'Mon historique',
          actionPath: '/app/history',
        }
      ];
    }

    // 👶 MAMAN & BÉBÉ (5 SLIDES SÉCURISÉES SANS MESSAGERIE) [24]
    if (isFamily && isMaman) {
      return [
        {
          title: '👶 Votre univers Maman & Bébé',
          description: 'Consultez vos fiches de présences, de suivis et d\'éveil du nouveau-né directement en temps réel.',
          image: mamanImg,
          actionText: 'Mes Proches',  
          actionPath: '/app/patients',
        },
        {
          title: '🛒 Achats & soins pour le nouveau-né',
          description: 'Commandez des couches, du lait ou des produits de soin pour bébé. Un aidant s\'occupe des courses et de la livraison.',
          image: '/assets/images/banners/maman-visit.png',
          actionText: 'Passer une commande',
          actionPath: '/app/orders/create',
        },
        {
          title: '📖 Cahier de liaison numérique',
          description: 'Consultez le journal d\'éveil de votre bébé, ses rythmes de sommeil et de repas saisis par votre intervenante.',
          image: mamanImg,
          actionText: 'Consulter le journal',
          actionPath: '/app/journal',
        },
        {
          title: '🌸 Soins personnalisés',
          description: 'Renseignez avec précision les habitudes de vie, allergies ou consignes de confort pour guider parfaitement nos intervenants.',
          image: mamanImg,
          actionText: 'Mes Proches',
          actionPath: '/app/patients',
        },
        {
          title: '💳 Formules Maternité Confort et Sérénité',
          description: 'Suivez vos crédits de visites restants, gérez vos factures de forfait ou renouvelez votre formule à l\'acte.',
          image: mamanImg,
          actionText: 'Gérer mon forfait',
          actionPath: '/app/billing',
        }
      ];
    }

    // 👴 FAMILLE / SERVICES SENIORS (5 SLIDES SANS MESSAGERIE SÉCURISÉES) [24]
    return [
      {
        title: '👴 Aide et présence aux seniors',
        description: 'Assurez un suivi continu et complet de nos accompagnements de confort pour votre parent âgé.',
        image: seniorImg,
        actionText: 'Mes Proches', 
        actionPath: '/app/patients',
      },
      {
        title: '🛒 Courses simples & ordonnances livrées',
        description: 'Besoin de récupérer des médicaments ou de faire des provisions ? Confiez la livraison à nos aidants de confiance.',
        image: '/assets/images/banners/senior-visit.png',
        actionText: 'Nouvelle commande',
        actionPath: '/app/orders/create',
      },
      {
        title: '📖 Cahier de liaison et suivi quotidien',
        description: 'Retrouvez l\'humeur, la prise de repas et l\'état général de votre proche après chaque intervention à domicile.',
        image: seniorImg,
        actionText: 'Consulter le cahier',
        actionPath: '/app/journal',
      },
      {
        title: '💳 Forfaits Sérénité Seniors & Privilège',
        description: 'Vérifiez le solde de vos visites d\'abonnements ou choisissez une formule de relais permanent pour votre famille.',
        image: seniorImg,
        actionText: 'Mon abonnement',
        actionPath: '/app/billing',
      },
      {
        title: '🏠 Convalescence après hospitalisation',
        description: 'Organisez sereinement la logistique et l\'installation de confort de votre proche pour son retour à la maison.',
        image: seniorImg,
        actionText: 'Mes Proches', 
        actionPath: '/app/patients',
      }
    ];
  }, [isAdminOrCoordinator, isAidant, isFamily, isMaman]);

  // Autoplay carrousel
  useEffect(() => {
    if (!autoplayActive || slides.length <= 1) return;

    const interval = setInterval(() => {
      setCycleCount((prevCount) => {
        const nextCount = prevCount + 1;
        if (nextCount >= slides.length * 2) {
          setAutoplayActive(false);
          clearInterval(interval);
          return nextCount;
        }
        return nextCount;
      });

      setCurrentSlide((prevIndex) => (prevIndex + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [autoplayActive, slides.length]);

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
    setAutoplayActive(false);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setAutoplayActive(false);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleDotClick = (index: number) => {
    setAutoplayActive(false);
    setCurrentSlide(index);
  };

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

  const { refreshAll, isRefreshing } = useRefreshableData({
    onRefresh: async () => {
      const loaders = [
        fetchPatients(true),
        fetchVisits(),
        fetchOrders(),
      ];

      if (isFamily || isAdminOrCoordinator) {
        loaders.push(fetchSubscriptions());
        loaders.push(fetchPayments());
        loaders.push(fetchAidants());
      }

      await Promise.all(loaders);

      if (isAdminOrCoordinator) {
        await Promise.all([
          fetchBeneficiairesStats(),
          fetchAdminStats()
        ]);
      }
    },
    onError: () => {
      toast.error('Erreur lors du rafraîchissement');
    },
  });

  // ============================================================
  // CHARGEMENT DE DONNÉES
  // ============================================================
  useEffect(() => {
    const loadData = async () => {
      const loaders = [
        fetchPatients(),
        fetchVisits(),
        fetchOrders(),
      ];

      if (isFamily || isAdminOrCoordinator) {
        loaders.push(fetchSubscriptions());
        loaders.push(fetchPayments());
        loaders.push(fetchAidants());
      }

      await Promise.all(loaders);

      if (isAdminOrCoordinator) {
        await Promise.all([
          fetchBeneficiairesStats(),
          fetchAdminStats()
        ]);
      }
    };
    loadData();
    setGreeting(getGreeting());
    setIsMaman(profile?.patient_category === 'maman_bebe');
  }, [isAdminOrCoordinator, isFamily, isAidant, profile?.patient_category]);

  const hasInMemoryData = patients.length > 0 || visits.length > 0 || orders.length > 0;
  const rawLoading = (patientsLoading || visitsLoading || ordersLoading || aidantsLoading || paymentsLoading || isLoadingAdminStats || isLoadingBeneficiaires) && !hasInMemoryData;

  // ============================================================
  // 🧠 STABILISATEUR SÉCURISÉ CONTRE LE CLIGNOTEMENT ASYNCHRONE [23]
  // ============================================================
  const [stabilizedLoading, setStabilizedLoading] = useState(true);

  useEffect(() => {
    if (rawLoading) {
      setStabilizedLoading(true);
    } else {
      // Un buffer de sécurité de 250ms pour stabiliser le chargement [23]
      const timer = setTimeout(() => {
        setStabilizedLoading(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [rawLoading]);

  const stats = useMemo(() => {
    const pendingVisits = visits.filter((v) => v.status === 'planifiee' || v.status === 'en_attente').length;
    const upcomingVisits = visits.filter((v) => v.status === 'planifiee' || v.status === 'acceptee').length;
    const pendingOrders = orders.filter((o) => o.status === 'creee' || o.status === 'en_attente' || o.status === 'disponible').length;
    const completedVisits = visits.filter((v) => v.status === 'terminee' || v.status === 'validee').length;
    const totalAidants = aidants.length;
    const totalSubscriptions = subscriptions.filter(s => s.status === 'actif').length;
    const totalPayments = payments.length;

    return {
      proches: isAdminOrCoordinator ? beneficiairesStats.totalBeneficiaires : patients.length,
      patientsCount: isAdminOrCoordinator ? beneficiairesStats.patientsCount : patients.length,
      personalAccountsCount: isAdminOrCoordinator ? beneficiairesStats.personalAccountsCount : 0,
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
      unreadCount: useNotificationStore.getState().unreadCount,
    };
  }, [patients, visits, orders, aidants, subscriptions, payments, adminStats, beneficiairesStats, drafts.length, isAdminOrCoordinator]);

  const tiles = getTilesForRole(role, colors, stats, stats.proches);

  const getProchesTitle = () => {
    if (isFamily) return 'Mes proches';
    if (isAidant) return 'Personnes accompagnées';
    if (isAdminOrCoordinator) return 'Bénéficiaires suivis';
    return 'Personnes suivies';
  };

  const hasProches = stats.proches > 0;

  // Utiliser stabilizedLoading au lieu de rawLoading pour la transition d'IHM [23]
  if (stabilizedLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
        <div className="h-44 rounded-3xl bg-white shadow-sm" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white rounded-xl shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8 px-2 sm:px-0">
      
      {/* BANNIÈRE BROUILLONS */}
      {isFamily && canConvertDrafts && (
        <div 
          className="border-l-4 p-4 rounded-xl shadow-sm border animate-fadeIn"
          style={{ 
            backgroundColor: colors.gold + '15',
            borderColor: colors.gold,
            border: `1px solid ${colors.gold}30`,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 shrink-0" size={24} style={{ color: colors.gold }} />
              <div>
                <p className="font-bold" style={{ color: colors.text }}>
                  📋 {stats.draftCount} visite{stats.draftCount > 1 ? 's' : ''} en attente de validation
                </p>
                <p className="text-sm font-medium mt-0.5" style={{ color: colors.text + '80' }}>
                  Une ou plusieurs visites sont sauvegardées. Finalisez-les en un clic avec votre abonnement.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/app/visits?filter=brouillon')}
              className="text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm shrink-0 hover:opacity-90 animate-pulse-marker"
              style={{ background: colors.primary }}
            >
              Consulter mes brouillons
            </button>
          </div>
        </div>
      )}

      {/* CARROUSEL INTERACTIF */}
      <section 
        className="relative overflow-hidden rounded-[2.5rem] border shadow-sm animate-fadeIn"
        style={{ backgroundColor: colors.primary, borderColor: colors.primary + '20' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
                    className="inline-flex items-center gap-1.5 text-white text-[11px] sm:text-xs font-black px-4 py-2 rounded-2xl transition-all shadow-lg active:scale-95 hover:opacity-90"
                    style={{ background: colors.gold || '#c9a84c' }}
                  >
                    {slide.actionText}
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-3 left-0 right-0 z-20 flex items-center justify-between px-5 pointer-events-none">
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
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2">
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
              color={colors.gold || '#c9a84c'}
              onClick={() => navigate('/app/visits')}
            />
            <StatCard
              label="Commandes en cours"
              value={stats.pendingOrders}
              icon={<ShoppingBag size={15} />}
              color={colors.primaryDark || '#1a4a3a'}
              onClick={() => navigate('/app/orders')}
            />
            <StatCard
              label="Visites terminées"
              value={stats.completedVisits}
              icon={<CheckCircle size={15} />}
              color={colors.primaryLight || '#2a6a4a'}
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
              color={colors.gold || '#c9a84c'}
              onClick={() => navigate('/app/planning')}
            />
            <StatCard
              label="Commandes"
              value={stats.pendingOrders}
              icon={<ShoppingBag size={15} />}
              color={colors.primaryDark || '#1a4a3a'}
              onClick={() => navigate('/app/orders')}
            />
            <StatCard
              label="Interventions"
              value={stats.completedVisits}
              icon={<History size={15} />}
              color={colors.primaryLight || '#2a6a4a'}
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
              color={colors.gold || '#c9a84c'}
              onClick={() => navigate('/app/registrations')}
            />
            <StatCard
              label="Aidants"
              value={stats.totalAidants}
              icon={<UserCheck size={15} />}
              color={colors.primaryDark || '#1a4a3a'}
              onClick={() => navigate('/app/aidants')}
            />
            <StatCard
              label="Revenus"
              value={`${stats.revenue.toLocaleString()} FCFA`}
              icon={<TrendingUp size={15} />}
              color={colors.gold || '#c9a84c'}
              onClick={() => navigate('/app/admin-payments')}
            />
          </>
        )}
      </section>

      {/* 🟢 GRILLE DE NAVIGATION PRINCIPALE */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border animate-fadeIn" style={{ borderColor: colors.primary + '15' }}>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xs font-black tracking-wider uppercase" style={{ color: colors.textLight }}>
            Menu rapide
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: colors.primary + '10', color: colors.primary }}>
            {tiles.length} outils
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {tiles.map((tile, index) => (
            <button
              key={index}
              onClick={() => navigate(tile.path)}
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.015)] transition-all duration-300 hover:bg-gray-50/70 hover:shadow-md hover:-translate-y-0.5 active:scale-95 group relative overflow-hidden"
              style={{ borderColor: colors.primary + '12' }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mb-2.5 transition-all duration-300 group-hover:scale-105 shadow-inner"
                style={{ background: tile.color + '1a', color: tile.color }}
              >
                {tile.icon}
              </div>
              <span className="text-[11px] font-black text-center leading-tight truncate w-full transition-colors group-hover:text-gray-900" style={{ color: colors.text }}>
                {tile.label}
              </span>
              {tile.badge !== undefined && tile.badge > 0 && (
                <span
                  className="mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all"
                  style={{ background: tile.color + '18', color: tile.color }}
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
        <section className="bg-white rounded-3xl p-5 shadow-sm border animate-fadeIn" style={{ borderColor: colors.primary + '15' }}>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold tracking-wider uppercase" style={{ color: colors.textLight }}>
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
            <section className="bg-white rounded-3xl p-5 shadow-sm border animate-fadeIn" style={{ borderColor: colors.primary + '15' }}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-bold tracking-wider uppercase" style={{ color: colors.textLight }}>
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
            <section className="bg-white rounded-3xl p-5 shadow-sm border animate-fadeIn" style={{ borderColor: colors.primary + '15' }}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-bold tracking-wider uppercase" style={{ color: colors.textLight }}>
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
        <section className="bg-white rounded-3xl p-5 shadow-sm border animate-fadeIn" style={{ borderColor: colors.primary + '15' }}>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold tracking-wider uppercase" style={{ color: colors.textLight }}>
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

      {/* EMPTY STATE PROACTIF (CORRIGÉ : Bouton de planification masqué pour la famille !) [30] */}
      {isFamily && hasProches && stats.upcomingVisits === 0 && stats.pendingOrders === 0 && (
        <section className="bg-white rounded-3xl p-6 text-center border animate-fadeIn" style={{ borderColor: colors.primary + '15' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: colors.primary + '08' }}>
            <Lightbulb size={22} style={{ color: colors.primary }} />
          </div>
          <h3 className="font-extrabold text-sm" style={{ color: colors.text }}>
            Commencez à utiliser Santé Plus
          </h3>
          <p className="text-xs mt-1 text-gray-400 max-w-sm mx-auto leading-relaxed">
            Passez votre première commande de livraison de première nécessité pour découvrir nos services. {/* ✅ CORRECTIF : Pas de mention de planification de visite ! [30] */}
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <button
              onClick={() => navigate('/app/orders/create')}
              className="px-6 py-2.5 rounded-xl text-white font-bold text-xs transition-all hover:opacity-95 shadow-sm flex items-center gap-1.5"
              style={{ background: colors.primary }}
            >
              <ShoppingBag size={13} />
              Nouvelle commande
            </button>
          </div>
        </section>
      )}
 
    </div>
  );
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
      className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.01)] border hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 text-left w-full flex items-center justify-between group"
      style={{ borderColor: color + '15' }}
    >
      <div className="space-y-0.5 min-w-0 pr-1">
        <p className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: '#6b7280' }}>
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

export default DashboardPage;
