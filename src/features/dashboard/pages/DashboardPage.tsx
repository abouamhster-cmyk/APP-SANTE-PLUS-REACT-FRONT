// 📁 src/features/dashboard/pages/DashboardPage.tsx
 
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Calendar, ShoppingBag, CheckCircle, User, ArrowRight, CreditCard,
  DollarSign, MapPin, BookOpen, History, Settings, ClipboardList, UserCheck,
  Award, Bell, Package, LayoutDashboard, FileCheck, Clock, AlertCircle,
  ChevronRight, ChevronLeft, TrendingUp, Lightbulb,
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

const CARD_RADIUS = 'rounded-[28px]';
const CARD_SHADOW = 'shadow-[0_1px_2px_rgba(16,24,20,0.04),0_8px_24px_-12px_rgba(16,24,20,0.08)]';

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

const DashboardPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;

  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

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
  const [, setCycleCount] = useState(0);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const [adminStats, setAdminStats] = useState({
    totalUsers: 0, pendingRegistrations: 0, pendingAidants: 0, totalAidants: 0,
    totalPayments: 0, totalSubscriptions: 0, todayVisits: 0, pendingValidations: 0, revenue: 0,
  });
  const [isLoadingAdminStats, setIsLoadingAdminStats] = useState(false);

  const [beneficiairesStats, setBeneficiairesStats] = useState({
    patientsCount: 0, personalAccountsCount: 0, totalBeneficiaires: 0,
  });
  const [isLoadingBeneficiaires, setIsLoadingBeneficiaires] = useState(false);

  const drafts = visits.filter(v => v.status === 'brouillon');
  const hasDrafts = drafts.length > 0;
  const canConvertDrafts = hasDrafts && hasActiveSubscription && remainingVisits > 0;

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    []
  );

  const roleLabel = useMemo(() => {
    if (isAidant) return 'Intervenant';
    if (isAdminOrCoordinator) return role === 'admin' ? 'Administrateur' : 'Coordinateur';
    if (isFamily) return isMaman ? 'Maman & Bébé' : 'Famille';
    return 'Utilisateur';
  }, [isAidant, isAdminOrCoordinator, isFamily, isMaman, role]);

  const slides: HeroSlide[] = useMemo(() => {
    const seniorImg = '/assets/images/banners/senior-banner.png';
    const mamanImg = '/assets/images/banners/maman-banner.png';
    const aidantImg = '/assets/images/banners/aidant-banner.png';
    const coordImg = '/assets/images/banners/coord-banner.png';

    if (isAdminOrCoordinator) {
      return [
        { title: '👔 Supervision de la Plateforme', description: 'Pilotez l\'activité globale de Santé Plus Services, gérez les alertes opérationnelles et supervisez les interventions en cours.', image: coordImg, actionText: 'Espace Admin', actionPath: '/app/admin' },
        { title: '📝 Inscriptions en attente', description: 'Validez les nouvelles fiches d\'inscriptions des familles locales et de la diaspora béninoise pour activer leurs accès.', image: coordImg, actionText: 'Voir les inscriptions', actionPath: '/app/registrations' },
        { title: '✓ Validation des Visites', description: 'Examinez les comptes-rendus, photos et mémos vocaux soumis par les aidants pour finaliser la validation des visites.', image: '/assets/images/banners/coord-visit.png', actionText: 'Valider visites', actionPath: '/app/admin/visits/validation' },
        { title: '💼 Gestion des Offres & Tarifs', description: 'Configurez les forfaits Santé Plus Services (Seniors) et Santé Plus Maman & Bébé (Grossesse, Postpartum, Allaitement).', image: coordImg, actionText: 'Gérer les offres', actionPath: '/app/offers' },
        { title: '📍 Radar d\'interventions GPS', description: 'Suivez la position géographique en temps réel des intervenants sur le terrain pour contrôler le bon déroulement des missions.', image: coordImg, actionText: 'Ouvrir la carte', actionPath: '/app/map' },
      ];
    }

    if (isAidant) {
      return [
        { title: '🦸 Vos planning de visites', description: 'Consultez les dates et heures de vos prochains accompagnements à domicile pour vos bénéficiaires assignés.', image: aidantImg, actionText: 'Mon planning', actionPath: '/app/planning' },
        { title: '📍 Suivi d\'itinéraire GPS actif', description: 'Enregistrez votre départ et arrivée lors des visites pour rassurer la famille et valider la réalité des missions.', image: aidantImg, actionText: 'Voir la carte', actionPath: '/app/map' },
        { title: '🛒 Courses et livraisons de confort', description: 'Consultez les commandes de médicaments, produits bébé ou courses de première nécessité de votre zone.', image: '/assets/images/banners/aidant-visit.png', actionText: 'Commandes disponibles', actionPath: '/app/orders' },
        { title: '🎤 Comptes-rendus immersifs', description: 'Ajoutez des mémos vocaux en direct et des photos d’intervention pour justifier l’excellence de vos visites à la coordination.', image: aidantImg, actionText: 'Mon historique', actionPath: '/app/history' },
        { title: '📋 Historique de vos rapports', description: 'Retrouvez l\'ensemble de vos rapports d\'intervention complétés, les mémos vocaux transmis et vos états validés.', image: aidantImg, actionText: 'Mon historique', actionPath: '/app/history' },
      ];
    }

    if (isFamily && isMaman) {
      return [
        { title: '👶 Votre univers Maman & Bébé', description: 'Consultez vos fiches de présences, de suivis et d\'éveil du nouveau-né directement en temps réel.', image: mamanImg, actionText: 'Mes Proches', actionPath: '/app/patients' },
        { title: '🛒 Achats & soins pour le nouveau-né', description: 'Commandez des couches, du lait ou des produits de soin pour bébé. Un aidant s\'occupe des courses et de la livraison.', image: '/assets/images/banners/maman-visit.png', actionText: 'Passer une commande', actionPath: '/app/orders/create' },
        { title: '📖 Cahier de liaison numérique', description: 'Consultez le journal d\'éveil de votre bébé, ses rythmes de sommeil et de repas saisis par votre intervenante.', image: mamanImg, actionText: 'Consulter le journal', actionPath: '/app/journal' },
        { title: '🌸 Soins personnalisés', description: 'Renseignez avec précision les habitudes de vie, allergies ou consignes de confort pour guider parfaitement nos intervenants.', image: mamanImg, actionText: 'Mes Proches', actionPath: '/app/patients' },
        { title: '💳 Formules Maternité Confort et Sérénité', description: 'Suivez vos crédits de visites restants, gérez vos factures de forfait ou renouvelez votre formule à l\'acte.', image: mamanImg, actionText: 'Gérer mon forfait', actionPath: '/app/billing' },
      ];
    }

    return [
      { title: '👴 Aide et présence aux seniors', description: 'Assurez un suivi continu et complet de nos accompagnements de confort pour votre parent âgé.', image: seniorImg, actionText: 'Mes Proches', actionPath: '/app/patients' },
      { title: '🛒 Courses simples & ordonnances livrées', description: 'Besoin de récupérer des médicaments ou de faire des provisions ? Confiez la livraison à nos aidants de confiance.', image: '/assets/images/banners/senior-visit.png', actionText: 'Nouvelle commande', actionPath: '/app/orders/create' },
      { title: '📖 Cahier de liaison et suivi quotidien', description: 'Retrouvez l\'humeur, la prise de repas et l\'état général de votre proche après chaque intervention à domicile.', image: seniorImg, actionText: 'Consulter le cahier', actionPath: '/app/journal' },
      { title: '💳 Forfaits Sérénité Seniors & Privilège', description: 'Vérifiez le solde de vos visites d\'abonnements ou choisissez une formule de relais permanent pour votre famille.', image: seniorImg, actionText: 'Mon abonnement', actionPath: '/app/billing' },
      { title: '🏠 Convalescence après hospitalisation', description: 'Organisez sereinement la logistique et l\'installation de confort de votre proche pour son retour à la maison.', image: seniorImg, actionText: 'Mes Proches', actionPath: '/app/patients' },
    ];
  }, [isAdminOrCoordinator, isAidant, isFamily, isMaman]);

  useEffect(() => {
    if (!autoplayActive || slides.length <= 1) return;
    const interval = setInterval(() => {
      setCycleCount((prevCount) => {
        const nextCount = prevCount + 1;
        if (nextCount >= slides.length * 2) { setAutoplayActive(false); clearInterval(interval); return nextCount; }
        return nextCount;
      });
      setCurrentSlide((prevIndex) => (prevIndex + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [autoplayActive, slides.length]);

  const handleTouchStart = (e: React.TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const handleTouchMove = (e: React.TouchEvent) => { setTouchEnd(e.targetTouches[0].clientX); };
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) handleNextSlide();
    else if (distance < -minSwipeDistance) handlePrevSlide();
  };
  const handleNextSlide = () => { setAutoplayActive(false); setCurrentSlide((prev) => (prev + 1) % slides.length); };
  const handlePrevSlide = () => { setAutoplayActive(false); setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length); };
  const handleDotClick = (index: number) => { setAutoplayActive(false); setCurrentSlide(index); };

  const fetchBeneficiairesStats = async () => {
    setIsLoadingBeneficiaires(true);
    try {
      const { count: patientsCount } = await supabase.from('patients').select('*', { count: 'exact', head: true });
      const { data: familyLinks } = await supabase.from('patient_family_links').select('family_id');
      const familyIdsWithPatients = new Set(familyLinks?.map(l => l.family_id) || []);
      const { data: allFamilies, error: familiesError } = await supabase.from('profiles').select('id').eq('role', 'family');
      if (familiesError) console.error('❌ Erreur familles:', familiesError);
      const totalFamilies = allFamilies?.length || 0;
      const personalAccountsCount = (allFamilies || []).filter((f: any) => !familyIdsWithPatients.has(f.id)).length;
      const totalBeneficiaires = totalFamilies + (patientsCount || 0);
      setBeneficiairesStats({ patientsCount: patientsCount || 0, personalAccountsCount, totalBeneficiaires });
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
        { count: totalUsers }, { count: pendingRegistrations }, { count: pendingAidants },
        { count: totalAidants }, { count: todayVisits }, { count: pendingValidations },
        { count: totalPayments }, { count: totalSubscriptions },
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
      const { data: paymentsData } = await supabase.from('paiements').select('amount').eq('status', 'valide');
      const revenue = paymentsData?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
      setAdminStats({
        totalUsers: totalUsers || 0, pendingRegistrations: pendingRegistrations || 0,
        pendingAidants: pendingAidants || 0, totalAidants: totalAidants || 0,
        totalPayments: totalPayments || 0, totalSubscriptions: totalSubscriptions || 0,
        todayVisits: todayVisits || 0, pendingValidations: pendingValidations || 0, revenue,
      });
    } catch (error) {
      console.error('❌ Erreur chargement stats admin:', error);
    } finally {
      setIsLoadingAdminStats(false);
    }
  };

  useRefreshableData({
    onRefresh: async () => {
      const loaders = [fetchPatients(true), fetchVisits(), fetchOrders()];
      if (isFamily || isAdminOrCoordinator) {
        loaders.push(fetchSubscriptions()); loaders.push(fetchPayments()); loaders.push(fetchAidants());
      }
      await Promise.all(loaders);
      if (isAdminOrCoordinator) await Promise.all([fetchBeneficiairesStats(), fetchAdminStats()]);
    },
    onError: () => { toast.error('Erreur lors du rafraîchissement'); },
  });

  useEffect(() => {
    const loadData = async () => {
      const loaders = [fetchPatients(), fetchVisits(), fetchOrders()];
      if (isFamily || isAdminOrCoordinator) {
        loaders.push(fetchSubscriptions()); loaders.push(fetchPayments()); loaders.push(fetchAidants());
      }
      await Promise.all(loaders);
      if (isAdminOrCoordinator) await Promise.all([fetchBeneficiairesStats(), fetchAdminStats()]);
    };
    loadData();
    setGreeting(getGreeting());
    setIsMaman(profile?.patient_category === 'maman_bebe');
  }, [isAdminOrCoordinator, isFamily, isAidant, profile?.patient_category]);

  const hasInMemoryData = patients.length > 0 || visits.length > 0 || orders.length > 0;
  const rawLoading = (patientsLoading || visitsLoading || ordersLoading || aidantsLoading || paymentsLoading || isLoadingAdminStats || isLoadingBeneficiaires) && !hasInMemoryData;

  const [stabilizedLoading, setStabilizedLoading] = useState(true);
  useEffect(() => {
    if (rawLoading) { setStabilizedLoading(true); }
    else {
      const timer = setTimeout(() => setStabilizedLoading(false), 250);
      return () => clearTimeout(timer);
    }
  }, [rawLoading]);

  const stats = useMemo(() => {
    const pendingVisits = visits.filter((v) => v.status === 'planifiee' || v.status === 'en_attente').length;
    const upcomingVisits = visits.filter((v) => v.status === 'planifiee' || v.status === 'acceptee').length;
    const pendingOrders = orders.filter((o) => o.status === 'creee' || o.status === 'en_attente' || o.status === 'disponible').length;
    const completedVisits = visits.filter((v) => v.status === 'terminee' || v.status === 'validee').length;
    return {
      proches: isAdminOrCoordinator ? beneficiairesStats.totalBeneficiaires : patients.length,
      patientsCount: isAdminOrCoordinator ? beneficiairesStats.patientsCount : patients.length,
      personalAccountsCount: isAdminOrCoordinator ? beneficiairesStats.personalAccountsCount : 0,
      pendingVisits, upcomingVisits, pendingOrders, completedVisits,
      totalAidants: aidants.length,
      totalSubscriptions: subscriptions.filter(s => s.status === 'actif').length,
      totalPayments: payments.length,
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
  const initial = profile?.full_name?.charAt(0)?.toUpperCase() || 'U';

  if (stabilizedLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto px-3 sm:px-0 pb-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-black/5" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 rounded-full bg-black/5" />
            <div className="h-4 w-40 rounded-full bg-black/10" />
          </div>
        </div>
        <div className="h-[200px] rounded-[28px] bg-black/5" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (<div key={i} className="h-24 rounded-[24px] bg-black/5" />))}
        </div>
        <div className="h-52 rounded-[28px] bg-black/5" />
      </div>
    );
  }

  return (
    // ✅ REMBOURRAGE CORRIGÉ : pb-4 au lieu de pb-32 md:pb-10
    <div className="space-y-4 max-w-5xl mx-auto px-3 sm:px-0 pb-4">

      {/* EN-TÊTE PERSONNEL */}
      <header className="flex items-center justify-between pt-1 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/app/profile')}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-sm transition-transform active:scale-95"
            style={{ background: colors.gradient || colors.primary }}
            aria-label="Mon profil"
          >
            {initial}
          </button>
          <div className="min-w-0">
            <p className="text-lg font-black leading-tight truncate" style={{ color: colors.text }}>
              {greeting}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
            </p>
            <p className="text-[11px] font-semibold capitalize mt-0.5" style={{ color: colors.textLight }}>
              {todayLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className="hidden xs:inline-flex text-[10px] font-bold px-3 py-1.5 rounded-full"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            {roleLabel}
          </span>
          <button
            onClick={() => navigate('/app/notifications')}
            className="relative w-10 h-10 rounded-2xl flex items-center justify-center border bg-white/70 transition-transform active:scale-95"
            style={{ borderColor: colors.primary + '20', color: colors.text }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {stats.unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[9px] font-black flex items-center justify-center rounded-full">
                {stats.unreadCount > 99 ? '99+' : stats.unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* BANNIÈRE BROUILLONS */}
      {isFamily && canConvertDrafts && (
        <div className={cn('p-4 border animate-fadeIn', CARD_RADIUS)} style={{ backgroundColor: colors.gold + '12', borderColor: colors.gold + '30' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: colors.gold + '20' }}>
                <AlertCircle size={18} style={{ color: colors.gold }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: colors.text }}>
                  {stats.draftCount} visite{stats.draftCount > 1 ? 's' : ''} en attente de validation
                </p>
                <p className="text-xs font-medium mt-0.5" style={{ color: colors.text + '99' }}>
                  Finalisez-les en un clic avec votre abonnement actif.
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/app/visits?filter=brouillon')} className="text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition shrink-0 hover:opacity-90 active:scale-95" style={{ background: colors.primary }}>
              Voir mes brouillons
            </button>
          </div>
        </div>
      )}

      {/* CARROUSEL */}
      <section className={cn('relative overflow-hidden animate-fadeIn', CARD_RADIUS, CARD_SHADOW)} style={{ backgroundColor: colors.primary }} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div className="flex transition-transform duration-500 ease-out h-[200px] sm:h-[190px] w-full" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
          {slides.map((slide, index) => (
            <div key={index} className="w-full shrink-0 h-full relative" style={{ backgroundImage: `linear-gradient(100deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.15) 100%), url('${slide.image}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <div className="relative z-10 flex flex-col h-full p-6 pb-14">
                <div className="space-y-2 min-w-0 max-w-md">
                  <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">{slide.title}</h1>
                  <p className="text-white/80 text-xs sm:text-[13px] font-medium leading-relaxed line-clamp-3">{slide.description}</p>
                </div>
                <button
                  onClick={() => navigate(slide.actionPath)}
                  className="inline-flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2.5 rounded-2xl w-fit transition-all shadow-lg active:scale-95 hover:opacity-90 mt-4"
                  style={{ background: colors.gold || '#c9a84c' }}
                >
                  {slide.actionText}<ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute bottom-3 left-0 right-0 z-20 flex items-center justify-between px-6 pointer-events-none">
          <div className="flex gap-1.5 pointer-events-auto">
            {slides.map((_, index) => (
              <button key={index} onClick={() => handleDotClick(index)} className={cn('h-1.5 rounded-full transition-all duration-300', currentSlide === index ? 'w-6 bg-white' : 'w-1.5 bg-white/40')} aria-label={`Slide ${index + 1}`} />
            ))}
          </div>
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button onClick={handlePrevSlide} className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white/90 hover:bg-white/25 transition active:scale-90" aria-label="Précédent"><ChevronLeft size={15} /></button>
            <button onClick={handleNextSlide} className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white/90 hover:bg-white/25 transition active:scale-90" aria-label="Suivant"><ChevronRight size={15} /></button>
          </div>
        </div>
      </section>

      {/* MÉTRIQUES */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isFamily && (<>
          <StatCard label={hasProches ? 'Proches suivis' : 'Mon compte'} value={hasProches ? stats.proches : '✓'} icon={hasProches ? <Users size={16} /> : <CheckCircle size={16} />} color={hasProches ? colors.primary : '#10b981'} onClick={() => navigate(hasProches ? '/app/patients' : '/app/profile')} />
          <StatCard label="Visites à venir" value={stats.upcomingVisits} icon={<Calendar size={16} />} color={colors.gold || '#c9a84c'} onClick={() => navigate('/app/visits')} />
          <StatCard label="Commandes en cours" value={stats.pendingOrders} icon={<ShoppingBag size={16} />} color={colors.primaryDark || '#1a4a3a'} onClick={() => navigate('/app/orders')} />
          <StatCard label="Visites terminées" value={stats.completedVisits} icon={<CheckCircle size={16} />} color={colors.primaryLight || '#2a6a4a'} onClick={() => navigate('/app/visits')} />
        </>)}
        {isAidant && (<>
          <StatCard label="Bénéficiaires" value={stats.proches} icon={<Users size={16} />} color={colors.primary} onClick={() => navigate('/app/patients')} />
          <StatCard label="Missions" value={stats.pendingVisits} icon={<Calendar size={16} />} color={colors.gold || '#c9a84c'} onClick={() => navigate('/app/planning')} />
          <StatCard label="Commandes" value={stats.pendingOrders} icon={<ShoppingBag size={16} />} color={colors.primaryDark || '#1a4a3a'} onClick={() => navigate('/app/orders')} />
          <StatCard label="Interventions" value={stats.completedVisits} icon={<History size={16} />} color={colors.primaryLight || '#2a6a4a'} onClick={() => navigate('/app/history')} />
        </>)}
        {isAdminOrCoordinator && (<>
          <StatCard label="Bénéficiaires" value={stats.proches} icon={<Users size={16} />} color={colors.primary} onClick={() => navigate('/app/patients')} />
          <StatCard label="Inscriptions" value={stats.pendingRegistrations} icon={<ClipboardList size={16} />} color={colors.gold || '#c9a84c'} onClick={() => navigate('/app/registrations')} />
          <StatCard label="Aidants" value={stats.totalAidants} icon={<UserCheck size={16} />} color={colors.primaryDark || '#1a4a3a'} onClick={() => navigate('/app/aidants')} />
          <StatCard label="Revenus" value={`${stats.revenue.toLocaleString()} FCFA`} icon={<TrendingUp size={16} />} color={colors.gold || '#c9a84c'} onClick={() => navigate('/app/admin-payments')} />
        </>)}
      </section>

      {/* MENU RAPIDE */}
      <section className={cn('bg-white p-5 border animate-fadeIn', CARD_RADIUS, CARD_SHADOW)} style={{ borderColor: colors.primary + '10' }}>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xs font-black tracking-wider uppercase" style={{ color: colors.textLight }}>Menu rapide</h2>
          <span className="text-[10px] px-2.5 py-1 rounded-full font-bold" style={{ backgroundColor: colors.primary + '0d', color: colors.primary }}>{tiles.length} outils</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
          {tiles.map((tile, index) => (
            <button key={index} onClick={() => navigate(tile.path)} className="flex flex-col items-center justify-start pt-3.5 pb-3 px-1.5 rounded-2xl bg-white transition-all duration-300 hover:bg-gray-50 active:scale-95 group relative">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-all duration-300 group-hover:scale-105" style={{ background: tile.color + '14', color: tile.color }}>{tile.icon}</div>
              <span className="text-[10px] font-bold text-center leading-tight line-clamp-2 w-full" style={{ color: colors.text }}>{tile.label}</span>
              {tile.badge !== undefined && tile.badge > 0 && (
                <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 text-[9px] font-black rounded-full flex items-center justify-center text-white" style={{ background: tile.color }}>{tile.badge > 99 ? '99+' : tile.badge}</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* PROCHES / BÉNÉFICIAIRES RÉCENTS */}
      {(isFamily || isAidant) && hasProches && (
        <section className={cn('bg-white p-5 border animate-fadeIn', CARD_RADIUS, CARD_SHADOW)} style={{ borderColor: colors.primary + '10' }}>
          <div className="flex items-center justify-between mb-3.5 px-1">
            <h2 className="text-xs font-black tracking-wider uppercase" style={{ color: colors.textLight }}>{getProchesTitle()}</h2>
            <button onClick={() => navigate('/app/patients')} className="group text-xs font-bold flex items-center gap-1 hover:underline" style={{ color: colors.primary }}>
              Voir tout <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {patients.slice(0, 2).map((patient) => (
              <PatientCard key={patient.id} patient={patient} compact onClick={() => navigate(`/app/patients/${patient.id}`)} />
            ))}
          </div>
          {patients.length > 2 && (
            <div className="mt-3.5 text-center">
              <button onClick={() => navigate('/app/patients')} className="text-xs font-bold hover:underline" style={{ color: colors.primary }}>Voir les {patients.length} proches</button>
            </div>
          )}
        </section>
      )}

      {/* PROCHAINES ACTIONS (famille) */}
      {isFamily && (stats.upcomingVisits > 0 || stats.pendingOrders > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.upcomingVisits > 0 && (
            <section className={cn('bg-white p-5 border animate-fadeIn', CARD_RADIUS, CARD_SHADOW)} style={{ borderColor: colors.primary + '10' }}>
              <div className="flex items-center justify-between mb-3.5 px-1">
                <h2 className="text-xs font-black tracking-wider uppercase" style={{ color: colors.textLight }}>Prochaines visites</h2>
                <button onClick={() => navigate('/app/visits')} className="text-xs font-bold hover:underline" style={{ color: colors.primary }}>Tout voir</button>
              </div>
              <div className="space-y-2.5">
                {visits.filter((v) => v.status === 'planifiee' || v.status === 'acceptee' || v.status === 'en_cours').slice(0, 2).map((visit) => (
                  <VisitCard key={visit.id} visit={visit} compact onClick={() => navigate(`/app/visits/${visit.id}`)} />
                ))}
              </div>
            </section>
          )}
          {stats.pendingOrders > 0 && (
            <section className={cn('bg-white p-5 border animate-fadeIn', CARD_RADIUS, CARD_SHADOW)} style={{ borderColor: colors.primary + '10' }}>
              <div className="flex items-center justify-between mb-3.5 px-1">
                <h2 className="text-xs font-black tracking-wider uppercase" style={{ color: colors.textLight }}>Commandes récentes</h2>
                <button onClick={() => navigate('/app/orders')} className="text-xs font-bold hover:underline" style={{ color: colors.primary }}>Tout voir</button>
              </div>
              <div className="space-y-2.5">
                {orders.filter((o) => o.status === 'creee' || o.status === 'en_attente' || o.status === 'en_cours' || o.status === 'disponible').slice(0, 2).map((order) => (
                  <OrderCard key={order.id} order={order} compact onClick={() => navigate(`/app/orders/${order.id}`)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* PLANIFICATION (aidant) */}
      {isAidant && stats.pendingVisits > 0 && (
        <section className={cn('bg-white p-5 border animate-fadeIn', CARD_RADIUS, CARD_SHADOW)} style={{ borderColor: colors.primary + '10' }}>
          <div className="flex items-center justify-between mb-3.5 px-1">
            <h2 className="text-xs font-black tracking-wider uppercase" style={{ color: colors.textLight }}>Missions à venir</h2>
            <button onClick={() => navigate('/app/planning')} className="text-xs font-bold hover:underline" style={{ color: colors.primary }}>Tout voir</button>
          </div>
          <div className="space-y-2.5">
            {visits.filter((v) => v.status === 'planifiee' || v.status === 'acceptee').slice(0, 3).map((visit) => (
              <VisitCard key={visit.id} visit={visit} compact onClick={() => navigate(`/app/visits/${visit.id}`)} />
            ))}
          </div>
        </section>
      )}

      {/* EMPTY STATE (famille) */}
      {isFamily && hasProches && stats.upcomingVisits === 0 && stats.pendingOrders === 0 && (
        <section className={cn('bg-white p-7 text-center border animate-fadeIn', CARD_RADIUS, CARD_SHADOW)} style={{ borderColor: colors.primary + '10' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: colors.primary + '0d' }}>
            <Lightbulb size={24} style={{ color: colors.primary }} />
          </div>
          <h3 className="font-black text-sm" style={{ color: colors.text }}>Commencez avec Santé Plus</h3>
          <p className="text-xs mt-1.5 max-w-sm mx-auto leading-relaxed" style={{ color: colors.textLight }}>
            Passez votre première commande de livraison de première nécessité pour découvrir nos services.
          </p>
          <button onClick={() => navigate('/app/orders/create')} className="mt-5 px-6 py-3 rounded-2xl text-white font-bold text-xs transition-all hover:opacity-95 inline-flex items-center gap-1.5 active:scale-95" style={{ background: colors.primary }}>
            <ShoppingBag size={14} />Nouvelle commande
          </button>
        </section>
      )}

    </div>
  );
};

// STAT CARD
interface StatCardProps { label: string; value: string | number; icon: React.ReactNode; color: string; onClick: () => void; }

const StatCard = ({ label, value, icon, color, onClick }: StatCardProps) => (
  <button
    onClick={onClick}
    className="bg-white p-4 border hover:-translate-y-0.5 transition-all duration-300 text-left w-full group rounded-[24px] shadow-[0_1px_2px_rgba(16,24,20,0.04)] hover:shadow-[0_8px_24px_-12px_rgba(16,24,20,0.12)]"
    style={{ borderColor: color + '18' }}
  >
    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-105" style={{ background: color + '12', color }}>
      {icon}
    </div>
    <p className="text-xl font-black leading-none truncate" style={{ color }}>{value}</p>
    <p className="text-[10px] font-bold uppercase tracking-wider mt-1.5 truncate" style={{ color: '#6b7280' }}>{label}</p>
  </button>
);

export default DashboardPage;
