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
  UserPlus, // ✅ AJOUTÉ
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
      { icon: <Users size={22} />, label: 'Proches', color: colors.primary, path: '/app/patients', badge: patientsCount },
      { icon: <Calendar size={22} />, label: 'Visites', color: '#4CAF50', path: '/app/visits', badge: stats.upcomingVisits },
      { icon: <ShoppingBag size={22} />, label: 'Commandes', color: '#FF9800', path: '/app/orders', badge: stats.pendingOrders },
      { icon: <MessageCircle size={22} />, label: 'Messages', color: '#2196F3', path: '/app/messages' },
      { icon: <CreditCard size={22} />, label: 'Abonnement', color: '#9C27B0', path: '/app/billing' },
      { icon: <BookOpen size={22} />, label: 'Journal', color: '#795548', path: '/app/journal' },
      { icon: <MapPin size={22} />, label: 'Carte', color: '#FF5722', path: '/app/map' },
      { icon: <Hospital size={22} />, label: 'Sortie', color: '#E91E63', path: '/app/discharge' },
      { icon: <User size={22} />, label: 'Profil', color: '#607D8B', path: '/app/profile' },
    );
    return tiles;
  }

  // 🦸 AIDANT
  if (role === 'aidant') {
    tiles.push(
      { icon: <Calendar size={22} />, label: 'Missions', color: colors.primary, path: '/app/missions', badge: stats.upcomingVisits },
      { icon: <Briefcase size={22} />, label: 'Planning', color: '#4CAF50', path: '/app/planning' },
      { icon: <History size={22} />, label: 'Historique', color: '#795548', path: '/app/history' },
      { icon: <ShoppingBag size={22} />, label: 'Commandes', color: '#FF9800', path: '/app/orders', badge: stats.pendingOrders },
      { icon: <MessageCircle size={22} />, label: 'Messages', color: '#2196F3', path: '/app/messages' },
      { icon: <CreditCard size={22} />, label: 'Abonnement', color: '#9C27B0', path: '/app/billing' },
      { icon: <MapPin size={22} />, label: 'Carte', color: '#FF5722', path: '/app/map' },
      { icon: <User size={22} />, label: 'Profil', color: '#607D8B', path: '/app/profile' },
    );
    return tiles;
  }

  // 👔 ADMIN / COORDINATEUR
  if (role === 'admin' || role === 'coordinator') {
    tiles.push(
      { icon: <LayoutDashboard size={22} />, label: 'Dashboard Admin', color: '#9C27B0', path: '/app/admin' },
      { icon: <ClipboardList size={22} />, label: 'Inscriptions', color: colors.primary, path: '/app/registrations' },
      { icon: <UserCheck size={22} />, label: 'Candidatures Aidants', color: '#FF9800', path: '/app/aidant-candidates' },
      { icon: <Users size={22} />, label: 'Aidants', color: '#2196F3', path: '/app/aidants' },
      { icon: <Handshake size={22} />, label: 'Assigner aidant', color: '#00BCD4', path: '/app/assign-aidants' },
      { icon: <Users size={22} />, label: 'Utilisateurs', color: '#4CAF50', path: '/app/users' },
      { icon: <Calendar size={22} />, label: 'Visites', color: '#4CAF50', path: '/app/visits' },
      { icon: <FileCheck size={22} />, label: 'Valider visites', color: '#8BC34A', path: '/app/admin/visits/validation' },
      { icon: <ShoppingBag size={22} />, label: 'Commandes', color: '#FF9800', path: '/app/orders' },
      { icon: <CreditCard size={22} />, label: 'Paiements', color: '#9C27B0', path: '/app/admin-payments' },
      { icon: <Award size={22} />, label: 'Abonnements', color: '#795548', path: '/app/admin-subscriptions' },
      { icon: <Package size={22} />, label: 'Offres', color: '#607D8B', path: '/app/offers' },
      { icon: <Settings size={22} />, label: 'Paramètres', color: '#455A64', path: '/app/settings' },
      { icon: <Bell size={22} />, label: 'Notifications Admin', color: '#FF5722', path: '/app/admin-notifications' },
      { icon: <MapPin size={22} />, label: 'Carte', color: '#FF5722', path: '/app/map' },
      { icon: <User size={22} />, label: 'Profil', color: '#607D8B', path: '/app/profile' },
    );
    return tiles;
  }

  tiles.push(
    { icon: <LayoutDashboard size={22} />, label: 'Accueil', color: colors.primary, path: '/app' },
    { icon: <User size={22} />, label: 'Profil', color: '#607D8B', path: '/app/profile' },
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

  useEffect(() => {
    fetchPatients();
    fetchVisits();
    fetchOrders();
    setGreeting(getGreeting());
  }, []);

  useEffect(() => {
    const hasMamanPatient = patients.some((p) => p.category === 'maman_bebe');
    setIsMaman(hasMamanPatient);
  }, [patients]);

  // 📌 STATISTIQUES
  const stats = {
    proches: patients.length,
    upcomingVisits: visits.filter((v) => v.status === 'planifiee').length,
    pendingOrders: orders.filter((o) => o.status === 'creee' || o.status === 'en_cours').length,
    completedVisits: visits.filter((v) => v.status === 'terminee' || v.status === 'validee').length,
  };

  const tiles = getTilesForRole(role, colors, stats, patients.length);

  const isLoading = patientsLoading || visitsLoading || ordersLoading;

  const heroImage = isMaman
    ? '/assets/images/banners/maman-banner.png'
    : '/assets/images/banners/senior-banner.png';

  const heroTitle = () => {
    if (isMaman) return 'Votre espace maman & bébé.';
    if (isFamily) return 'Un suivi clair pour votre proche.';
    if (isAidant) return 'Vos missions en un coup d\'œil.';
    if (isAdminOrCoordinator) return 'Gestion complète de la plateforme.';
    return 'Bienvenue sur Santé Plus Services.';
  };

  const heroDescription = () => {
    if (isMaman) return 'Visites, messages et commandes réunis dans un espace simple.';
    if (isFamily) return 'Gardez une vue rapide sur les visites, commandes et messages importants.';
    if (isAidant) return 'Retrouvez vos missions, livraisons et communications en un seul endroit.';
    if (isAdminOrCoordinator) return 'Supervisez l\'ensemble des activités de la plateforme.';
    return 'Gérez vos accompagnements en toute simplicité.';
  };

  const getProchesTitle = () => {
    if (isFamily) return 'Mes proches';
    if (isAidant) return 'Mes personnes accompagnées';
    if (isAdminOrCoordinator) return 'Bénéficiaires suivis';
    return 'Personnes suivies';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 rounded-2xl bg-white/70 animate-pulse" />
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-square bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ========================================== */}
      {/* HERO - Bannière avec image dynamique */}
      {/* ========================================== */}
      <section
        className="relative overflow-hidden rounded-2xl min-h-[170px] md:min-h-[185px] shadow-sm border border-black/5"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.62) 42%, rgba(0,0,0,0.18) 100%),
            url('${heroImage}')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/10" />
        <div
          className="absolute -top-24 -right-24 w-56 h-56 rounded-full blur-3xl opacity-30"
          style={{ background: colors.secondary }}
        />

        <div className="relative z-10 min-h-[170px] md:min-h-[185px] p-5 md:p-6 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/18 border border-white/25 backdrop-blur-md px-3 py-1.5 text-white text-xs font-semibold">
              <Sparkles size={14} />
              Santé Plus Services
            </div>
          </div>

          <div className="max-w-xl">
            <p className="text-white text-sm mb-1.5 font-medium drop-shadow">
              {greeting}, {profile?.full_name || 'Bienvenue'} 👋
            </p>

            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight drop-shadow">
              {heroTitle()}
            </h1>

            <p className="text-white mt-2 text-sm max-w-lg leading-relaxed drop-shadow-sm">
              {heroDescription()}
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => navigate('/app/visits')}
                className="inline-flex items-center gap-2 bg-white text-sm font-bold px-4 py-2.5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition"
                style={{ color: colors.primary }}
              >
                Voir les visites
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => navigate('/app/messages')}
                className="inline-flex items-center gap-2 bg-white/18 text-white border border-white/25 backdrop-blur-md text-sm font-bold px-4 py-2.5 rounded-2xl hover:bg-white/25 transition"
              >
                Messages
                <MessageCircle size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* MESSAGE - Compte sans proche */}
      {/* ========================================== */}
      {(isFamily || isAidant) && patients.length === 0 && (
        <section
          className="bg-white rounded-2xl p-4 border shadow-sm"
          style={{ borderColor: colors.primary + '18' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <User size={24} />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-black text-lg" style={{ color: colors.text }}>
                Bienvenue {profile?.full_name || ''} 👋
              </h3>
              <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
                {isFamily 
                  ? 'Vous avez créé un compte sans proche. Ajoutez une personne à accompagner ou consultez les offres disponibles pour commencer.'
                  : 'Vous avez créé un compte aidant. Les personnes à accompagner vous seront assignées prochainement.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            {isFamily && (
              <button
                onClick={() => navigate('/app/patients')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90"
                style={{ background: colors.primary }}
              >
                <UserPlus size={16} />
                Ajouter un proche
              </button>
            )}
            <button
              onClick={() => navigate('/app/billing')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition hover:bg-gray-50"
              style={{ borderColor: colors.border || '#e5e0d8', color: colors.text }}
            >
              Voir les offres
            </button>
          </div>
        </section>
      )}

      {/* ========================================== */}
      {/* STATS */}
      {/* ========================================== */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard
          label={isFamily ? 'Proches' : isAidant ? 'Personnes' : 'Bénéficiaires'}
          value={stats.proches}
          icon={<Users size={18} />}
          color={colors.primary}
          onClick={() => navigate('/app/patients')}
        />
        <StatCard
          label="Visites"
          value={stats.upcomingVisits}
          icon={<Calendar size={18} />}
          color="#4CAF50"
          onClick={() => navigate('/app/visits')}
        />
        <StatCard
          label="Commandes"
          value={stats.pendingOrders}
          icon={<ShoppingBag size={18} />}
          color="#FF9800"
          onClick={() => navigate('/app/orders')}
        />
        <StatCard
          label="Terminées"
          value={stats.completedVisits}
          icon={<CheckCircle size={18} />}
          color="#2196F3"
          onClick={() => navigate('/app/visits')}
        />
      </section>

      {/* ========================================== */}
      {/* TUILES STYLE UNPIX */}
      {/* ========================================== */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: colors.text }}>
            🚀 Menu rapide
          </h2>
          <span className="text-[10px] text-gray-400">{tiles.length} services</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {tiles.map((tile, index) => (
            <button
              key={index}
              onClick={() => navigate(tile.path)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-95 bg-white"
              style={{ borderColor: colors.border }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1.5"
                style={{ background: tile.color + '12', color: tile.color }}
              >
                {tile.icon}
              </div>
              <span className="text-[10px] font-medium text-center leading-tight" style={{ color: colors.text }}>
                {tile.label}
              </span>
              {tile.badge !== undefined && tile.badge > 0 && (
                <span
                  className="mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: tile.color + '20', color: tile.color }}
                >
                  {tile.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ========================================== */}
      {/* PROCHES */}
      {/* ========================================== */}
      {patients.length > 0 && (
        <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold" style={{ color: colors.text }}>
              {getProchesTitle()}
            </h2>
            <button
              onClick={() => navigate('/app/patients')}
              className="text-xs font-medium flex items-center gap-1"
              style={{ color: colors.primary }}
            >
              Voir tout <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {patients.slice(0, 2).map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                compact
                onClick={() => navigate(`/app/patients/${patient.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ========================================== */}
      {/* VISITES */}
      {/* ========================================== */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold" style={{ color: colors.text }}>
            Prochaines visites
          </h2>
          <button
            onClick={() => navigate('/app/visits')}
            className="text-xs font-medium flex items-center gap-1"
            style={{ color: colors.primary }}
          >
            Voir tout <ArrowRight size={12} />
          </button>
        </div>
        {stats.upcomingVisits > 0 ? (
          <div className="space-y-2">
            {visits
              .filter((v) => v.status === 'planifiee' || v.status === 'en_cours')
              .slice(0, 3)
              .map((visit) => (
                <VisitCard key={visit.id} visit={visit} compact onClick={() => navigate(`/app/visits/${visit.id}`)} />
              ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <Calendar size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs text-gray-400">Aucune visite planifiée</p>
          </div>
        )}
      </section>

      {/* ========================================== */}
      {/* COMMANDES */}
      {/* ========================================== */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold" style={{ color: colors.text }}>
            Commandes récentes
          </h2>
          <button
            onClick={() => navigate('/app/orders')}
            className="text-xs font-medium flex items-center gap-1"
            style={{ color: colors.primary }}
          >
            Voir tout <ArrowRight size={12} />
          </button>
        </div>
        {stats.pendingOrders > 0 ? (
          <div className="space-y-2">
            {orders
              .filter((o) => o.status === 'creee' || o.status === 'en_cours')
              .slice(0, 3)
              .map((order) => (
                <OrderCard key={order.id} order={order} compact onClick={() => navigate(`/app/orders/${order.id}`)} />
              ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <ShoppingBag size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs text-gray-400">Aucune commande récente</p>
          </div>
        )}
      </section>

      {/* ========================================== */}
      {/* BANNER FINAL */}
      {/* ========================================== */}
      <section
        className="rounded-2xl p-4 text-center border"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}10, ${colors.secondary}18)`,
          borderColor: colors.primary + '14',
        }}
      >
        <div
          className="w-10 h-10 rounded-2xl mx-auto flex items-center justify-center mb-2"
          style={{ background: colors.primary + '12', color: colors.primary }}
        >
          {isMaman ? <Heart size={22} /> : <Home size={22} />}
        </div>
        <h3 className="text-sm font-bold" style={{ color: colors.text }}>
          {isMaman
            ? 'Un espace doux pour suivre maman et bébé'
            : isAidant
              ? 'Un espace pour accompagner en toute confiance'
              : 'Un espace pour rester proche, même à distance'}
        </h3>
        <p className="text-xs mt-1" style={{ color: colors.text + '70' }}>
          Santé Plus rend le suivi plus humain, plus clair et plus rassurant.
        </p>
      </section>
    </div>
  );
};

// =============================================
// STAT CARD
// =============================================

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

const StatCard = ({ label, value, icon, color, onClick }: StatCardProps) => {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl p-2.5 shadow-sm border border-black/5 hover:shadow-md transition text-left w-full"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className="text-lg font-bold mt-0.5" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: color + '14', color }}
        >
          {icon}
        </div>
      </div>
    </button>
  );
};

export default DashboardPage;
