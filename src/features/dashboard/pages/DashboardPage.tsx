// 📁 src/features/dashboard/pages/DashboardPage.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  ShoppingBag,
  MessageCircle,
  CheckCircle,
  Heart,
  Home,
  User,
  ArrowRight,
  Sparkles,
  CreditCard,
  MapPin,
  BookOpen,
  Hospital,
  Briefcase,
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
  Rocket,
  Compass,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { getGreeting } from '@/utils/helpers';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';

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

  // 👨‍👩‍👦 FAMILLE
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

  // 🦸 AIDANT
  if (role === 'aidant') {
    tiles.push(
      { icon: <Users size={20} />, label: 'Personnes accompagnées', color: colors.primary, path: '/app/patients', badge: patientsCount },
      { icon: <Calendar size={20} />, label: 'Planning', color: '#10b981', path: '/app/planning' },
      { icon: <History size={20} />, label: 'Historique', color: '#78350f', path: '/app/history' },
      { icon: <ShoppingBag size={20} />, label: 'Commandes', color: '#f59e0b', path: '/app/orders', badge: stats.pendingOrders },
      { icon: <MessageCircle size={20} />, label: 'Messages', color: '#3b82f6', path: '/app/messages' },
      { icon: <MapPin size={20} />, label: 'Carte', color: '#ef4444', path: '/app/map' },
      { icon: <User size={20} />, label: 'Profil', color: '#64748b', path: '/app/profile' },
    );
    return tiles;
  }

  // 👔 ADMIN / COORDINATEUR
  if (role === 'admin' || role === 'coordinator') {
    tiles.push(
      { icon: <LayoutDashboard size={20} />, label: 'Dashboard Admin', color: '#8b5cf6', path: '/app/admin' },
      { icon: <ClipboardList size={20} />, label: 'Inscriptions', color: colors.primary, path: '/app/registrations' },
      { icon: <UserCheck size={20} />, label: 'Candidatures', color: '#f59e0b', path: '/app/aidant-candidates' },
      { icon: <Users size={20} />, label: 'Aidants', color: '#3b82f6', path: '/app/aidants' },
      { icon: <Handshake size={20} />, label: 'Assigner aidant', color: '#06b6d4', path: '/app/assign-aidants' },
      { icon: <Users size={20} />, label: 'Utilisateurs', color: '#10b981', path: '/app/users' },
      { icon: <Calendar size={20} />, label: 'Visites', color: '#10b981', path: '/app/visits' },
      { icon: <FileCheck size={20} />, label: 'Valider visites', color: '#84cc16', path: '/app/admin/visits/validation' },
      { icon: <ShoppingBag size={20} />, label: 'Commandes', color: '#f59e0b', path: '/app/orders' },
      { icon: <CreditCard size={20} />, label: 'Paiements', color: '#8b5cf6', path: '/app/admin-payments' },
      { icon: <Award size={20} />, label: 'Abonnements', color: '#78350f', path: '/app/admin-subscriptions' },
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

  const [greeting, setGreeting] = useState('');
  const [isMaman, setIsMaman] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ Charger les données au montage
  useEffect(() => {
    console.log('🔍 Dashboard - Rôle:', role);
    console.log('🔍 Dashboard - Patients (avant fetch):', patients.length);
    console.log('🔍 Dashboard - Visites (avant fetch):', visits.length);
    console.log('🔍 Dashboard - Commandes (avant fetch):', orders.length);
    
    const loadData = async () => {
      await Promise.all([
        fetchPatients(),
        fetchVisits(),
        fetchOrders(),
      ]);
      console.log('✅ Dashboard - Données chargées');
      console.log('🔍 Dashboard - Patients (après fetch):', patients.length);
    };
    
    loadData();
    setGreeting(getGreeting());
  }, []);

  // ✅ Mettre à jour isMaman quand les patients changent
  useEffect(() => {
    const hasMamanPatient = patients.some((p) => p.category === 'maman_bebe');
    setIsMaman(hasMamanPatient);
    console.log('🔍 Dashboard - hasMamanPatient:', hasMamanPatient);
    console.log('🔍 Dashboard - patients.length:', patients.length);
  }, [patients]);

  // 📌 STATISTIQUES
  const stats = {
    proches: patients.length,
    upcomingVisits: visits.filter((v) => v.status === 'planifiee' || v.status === 'acceptee').length,
    pendingOrders: orders.filter((o) => o.status === 'creee' || o.status === 'en_attente' || o.status === 'disponible').length,
    completedVisits: visits.filter((v) => v.status === 'terminee' || v.status === 'validee').length,
  };

  console.log('📊 Stats Dashboard:', stats);

  const tiles = getTilesForRole(role, colors, stats, patients.length);

  const isLoading = patientsLoading || visitsLoading || ordersLoading;

  // ✅ DÉTERMINER L'IMAGE DE LA BANNIÈRE
  const heroImage = isMaman
    ? '/assets/images/banners/maman-banner.png'
    : '/assets/images/banners/senior-banner.png';

  // ✅ DÉTERMINER LE TITRE DE LA BANNIÈRE - NEUTRE
  const heroTitle = () => {
    if (isMaman) return 'Bienvenue dans votre espace maman & bébé.';
    if (isFamily && patients.length === 0) return 'Bienvenue sur Santé Plus Services.';
    if (isFamily) return 'Un suivi clair pour votre proche.';
    if (isAidant) return 'Vos missions en un coup d\'œil.';
    if (isAdminOrCoordinator) return 'Gestion de la plateforme.';
    return 'Bienvenue sur Santé Plus.';
  };

  // ✅ DESCRIPTION DE LA BANNIÈRE - NEUTRE
  const heroDescription = () => {
    if (isMaman) return 'Visites, messages et commandes réunis dans un espace simple.';
    if (isFamily && patients.length === 0) return 'Gérez vos services d\'accompagnement en toute simplicité.';
    if (isFamily) return 'Gardez une vue rapide sur les visites et commandes.';
    if (isAidant) return 'Retrouvez vos missions et communications au même endroit.';
    if (isAdminOrCoordinator) return 'Supervisez l\'ensemble des activités.';
    return 'Gérez vos accompagnements en toute simplicité.';
  };

  const getProchesTitle = () => {
    if (isFamily) return 'Mes proches';
    if (isAidant) return 'Personnes accompagnées';
    if (isAdminOrCoordinator) return 'Bénéficiaires suivis';
    return 'Personnes suivies';
  };

  // ✅ VÉRIFIER SI L'UTILISATEUR A DES PROCHES
  const hasProches = patients.length > 0;

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
      {/* ========================================== */}
      {/* HERO - Bannière NEUTRE */}
      {/* ========================================== */}
      <section
        className="relative overflow-hidden rounded-3xl min-h-[190px] md:min-h-[210px] shadow-sm transition-all duration-300 hover:shadow-md"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.25) 100%),
            url('${heroImage}')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/5" />
        
        <div className="relative z-10 min-h-[190px] md:min-h-[210px] p-6 sm:p-8 flex flex-col justify-between">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-semibold drop-shadow-sm">
                {greeting}, {profile?.full_name?.split(' ')[0] || 'Bienvenue'} 👋
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                {heroTitle()}
              </h1>

              <p className="text-white/80 text-sm leading-relaxed drop-shadow max-w-md">
                {heroDescription()}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 shrink-0 self-start md:self-end mt-2 md:mt-0">
              <button
                onClick={() => navigate('/app/visits')}
                className="group inline-flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all hover:opacity-95 active:scale-[0.97] shadow-lg"
                style={{ background: colors.primary }}
              >
                Voir les visites
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => navigate('/app/messages')}
                className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-white/20 transition-colors hover:bg-white/30 active:scale-[0.97]"
              >
                Messages
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* MESSAGE D'ACCUEIL - UNIQUEMENT POUR LES FAMILLES SANS PATIENT */}
      {/* ========================================== */}
      {isFamily && !hasProches && (
        <section className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-black/5 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3" style={{ background: colors.primary + '10', color: colors.primary }}>
                <Compass size={14} />
                Découvrez nos services
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold" style={{ color: colors.text }}>
                🌱 Bienvenue dans votre espace
              </h2>
              <p className="text-sm mt-2 max-w-lg" style={{ color: colors.textLight }}>
                Vous pouvez consulter nos offres d'accompagnement, planifier des visites 
                ou passer des commandes. Si vous le souhaitez, vous pouvez également ajouter un proche.
              </p>
              <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                <button
                  onClick={() => navigate('/app/billing')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.97] shadow-sm"
                  style={{ background: colors.primary }}
                >
                  <CreditCard size={16} />
                  Voir les offres
                </button>
                <button
                  onClick={() => navigate('/app/patients')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:bg-gray-50 border active:scale-[0.97]"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  <UserPlus size={16} />
                  Ajouter un proche (optionnel)
                </button>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-300" style={{ background: colors.primary + '08' }}>
                <Compass size={40} style={{ color: colors.primary }} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================== */}
      {/* STATS - Épurées et légères */}
      {/* ========================================== */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={isFamily ? (hasProches ? 'Proches suivis' : 'Compte') : isAidant ? 'Personnes accompagnées' : 'Bénéficiaires'}
          value={hasProches ? stats.proches : '✓'}
          icon={hasProches ? <Users size={16} /> : <CheckCircle size={16} />}
          color={hasProches ? colors.primary : '#10b981'}
          onClick={() => navigate(hasProches ? '/app/patients' : '/app/profile')}
        />
        <StatCard
          label="Visites"
          value={stats.upcomingVisits}
          icon={<Calendar size={16} />}
          color="#10b981"
          onClick={() => navigate('/app/visits')}
        />
        <StatCard
          label="Commandes"
          value={stats.pendingOrders}
          icon={<ShoppingBag size={16} />}
          color="#f59e0b"
          onClick={() => navigate('/app/orders')}
        />
        <StatCard
          label="Interventions"
          value={stats.completedVisits}
          icon={<CheckCircle size={16} />}
          color="#3b82f6"
          onClick={() => navigate('/app/visits')}
        />
      </section>

      {/* ========================================== */}
      {/* SUGGESTIONS - UNIQUEMENT POUR LES FAMILLES SANS PATIENT */}
      {/* ========================================== */}
      {isFamily && !hasProches && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SuggestionCard
            icon={<CreditCard size={24} />}
            title="Découvrir les offres"
            description="Choisissez la formule d'abonnement adaptée"
            color={colors.primary}
            onClick={() => navigate('/app/billing')}
            buttonText="Voir les offres"
          />
          <SuggestionCard
            icon={<UserPlus size={24} />}
            title="Ajouter un proche"
            description="Si vous souhaitez accompagner quelqu'un"
            color={colors.primary}
            onClick={() => navigate('/app/patients')}
            buttonText="Ajouter (optionnel)"
          />
          <SuggestionCard
            icon={<MessageCircle size={24} />}
            title="Contacter l'équipe"
            description="Une question ? Nous sommes là pour vous aider"
            color={colors.primary}
            onClick={() => navigate('/app/messages')}
            buttonText="Écrire un message"
          />
        </section>
      )}

      {/* ========================================== */}
      {/* GRILLE D'ACTIONS RAPIDES */}
      {/* ========================================== */}
      <section className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] border border-gray-100/50">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xs font-bold tracking-wider uppercase text-gray-400">
            Menu rapide
          </h2>
          <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full font-semibold">{tiles.length} outils disponibles</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {tiles.map((tile, index) => (
            <button
              key={index}
              onClick={() => navigate(tile.path)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 hover:bg-gray-50/70 hover:shadow-sm active:scale-95 group relative overflow-hidden"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-inner"
                style={{ background: tile.color + '0a', color: tile.color }}
              >
                {tile.icon}
              </div>
              <span className="text-[11px] font-semibold text-center leading-tight text-gray-600 truncate w-full transition-colors group-hover:text-gray-900">
                {tile.label}
              </span>
              {tile.badge !== undefined && tile.badge > 0 && (
                <span
                  className="mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all group-hover:scale-105"
                  style={{ background: tile.color + '12', color: tile.color }}
                >
                  {tile.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ========================================== */}
      {/* PROCHES - S'AFFICHE TOUJOURS POUR LES FAMILLES AVEC PATIENT */}
      {/* ========================================== */}
      {isFamily && hasProches && (
        <section className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] border border-gray-100/50">
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

      {/* ========================================== */}
      {/* CONTENU DOUBLE COLONNE : VISITES / COMMANDES */}
      {/* ========================================== */}
      {(stats.upcomingVisits > 0 || stats.pendingOrders > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* VISITES */}
          {stats.upcomingVisits > 0 && (
            <section className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] border border-gray-100/50">
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

          {/* COMMANDES */}
          {stats.pendingOrders > 0 && (
            <section className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] border border-gray-100/50">
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

      {/* ========================================== */}
      {/* MESSAGE SI AUCUNE ACTIVITÉ MAIS AVEC PROCHES */}
      {/* ========================================== */}
      {isFamily && hasProches && stats.upcomingVisits === 0 && stats.pendingOrders === 0 && (
        <section className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-black/5 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm transition-transform hover:scale-105 duration-300" style={{ background: colors.primary + '08' }}>
            <Lightbulb size={28} style={{ color: colors.primary }} />
          </div>
          <h3 className="font-extrabold text-base" style={{ color: colors.text }}>
            💡 Commencez à utiliser Santé Plus
          </h3>
          <p className="text-xs mt-1 text-gray-400 max-w-sm mx-auto leading-relaxed">
            Planifiez votre première visite ou passez votre première commande pour découvrir nos services.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            <button
              onClick={() => navigate('/app/visits')}
              className="px-5 py-2.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.97] shadow-sm flex items-center gap-1.5"
              style={{ background: colors.primary }}
            >
              <Calendar size={14} />
              Planifier une visite
            </button>
            <button
              onClick={() => navigate('/app/orders/create')}
              className="px-5 py-2.5 rounded-xl font-bold text-sm border transition-all hover:bg-gray-50 active:scale-[0.97] flex items-center gap-1.5"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              <ShoppingBag size={14} />
              Passer une commande
            </button>
          </div>
        </section>
      )}

      {/* ========================================== */}
      {/* FOOTER DISCRET */}
      {/* ========================================== */}
      <footer className="text-center py-6">
         <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
          <Heart size={10} className="text-red-400 fill-red-400" />
          Santé Plus Services — Votre accompagnement de confiance
         </p>
      </footer>
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
      className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.01)] border border-gray-100/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 text-left w-full flex items-center justify-between group"
    >
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-black transition-all" style={{ color }}>
          {value}
        </p>
      </div>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
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
      className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.015)] border border-gray-100 text-left hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300 group"
    >
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-300 shadow-inner" style={{ background: color + '10', color }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-extrabold text-sm" style={{ color }}>{title}</h4>
          <p className="text-xs mt-1 text-gray-500 leading-relaxed">{description}</p>
          <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold transition-all group-hover:translate-x-1" style={{ color }}>
            {buttonText} <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </button>
  );
};

export default DashboardPage;
