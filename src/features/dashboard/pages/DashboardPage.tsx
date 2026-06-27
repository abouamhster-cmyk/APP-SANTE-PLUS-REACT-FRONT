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
  Plus,
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
  FileText,
  Package,
  LayoutDashboard,
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

const DashboardPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();

  const {
    singular,
    plural,
    list,
    add,
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

  // 📌 Statistiques
  const stats = {
    proches: patients.length,
    upcomingVisits: visits.filter((v) => v.status === 'planifiee').length,
    pendingOrders: orders.filter((o) => o.status === 'creee' || o.status === 'en_cours').length,
    completedVisits: visits.filter((v) => v.status === 'terminee' || v.status === 'validee').length,
  };

  const recentVisits = visits
    .filter((v) => v.status === 'planifiee' || v.status === 'en_cours')
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    .slice(0, 3);

  const recentOrders = orders
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  const isLoading = patientsLoading || visitsLoading || ordersLoading;

  const heroImage = isMaman
    ? '/assets/images/banners/maman-banner.png'
    : '/assets/images/banners/senior-banner.png';

  // ✅ TUILES DE REDIRECTION SELON LE RÔLE
  const getDashboardTiles = () => {
    const tiles = [];

    // 👨‍👩‍👦 FAMILLE
    if (role === 'family') {
      tiles.push(
        { icon: <Users size={24} />, label: list, color: colors.primary, path: '/app/patients', badge: patients.length },
        { icon: <Calendar size={24} />, label: 'Visites', color: colors.accent, path: '/app/visits', badge: stats.upcomingVisits },
        { icon: <ShoppingBag size={24} />, label: 'Commandes', color: colors.secondary, path: '/app/orders', badge: stats.pendingOrders },
        { icon: <MessageCircle size={24} />, label: 'Messages', color: '#2196F3', path: '/app/messages' },
        { icon: <CreditCard size={24} />, label: 'Abonnement', color: '#4CAF50', path: '/app/billing' },
        { icon: <BookOpen size={24} />, label: 'Journal', color: '#9C27B0', path: '/app/journal' },
        { icon: <MapPin size={24} />, label: 'Carte', color: '#FF5722', path: '/app/map' },
        { icon: <Hospital size={24} />, label: 'Sortie hôpital', color: '#E91E63', path: '/app/discharge' },
        { icon: <User size={24} />, label: 'Profil', color: '#607D8B', path: '/app/profile' },
      );
    }

    // 🦸 AIDANT
    if (role === 'aidant') {
      tiles.push(
        { icon: <Calendar size={24} />, label: 'Missions', color: colors.primary, path: '/app/missions', badge: stats.upcomingVisits },
        { icon: <Briefcase size={24} />, label: 'Planning', color: colors.accent, path: '/app/planning' },
        { icon: <History size={24} />, label: 'Historique', color: '#9C27B0', path: '/app/history' },
        { icon: <ShoppingBag size={24} />, label: 'Commandes', color: colors.secondary, path: '/app/orders', badge: stats.pendingOrders },
        { icon: <MessageCircle size={24} />, label: 'Messages', color: '#2196F3', path: '/app/messages' },
        { icon: <CreditCard size={24} />, label: 'Abonnement', color: '#4CAF50', path: '/app/billing' },
        { icon: <MapPin size={24} />, label: 'Carte', color: '#FF5722', path: '/app/map' },
        { icon: <User size={24} />, label: 'Profil', color: '#607D8B', path: '/app/profile' },
      );
    }

    // 👔 COORDINATEUR / ADMIN
    if (role === 'coordinator' || role === 'admin') {
      tiles.push(
        { icon: <LayoutDashboard size={24} />, label: 'Dashboard Admin', color: '#9C27B0', path: '/app/admin' },
        { icon: <ClipboardList size={24} />, label: 'Inscriptions', color: colors.primary, path: '/app/registrations', badge: stats.pendingRegistrations || 0 },
        { icon: <UserCheck size={24} />, label: 'Candidatures', color: '#FF9800', path: '/app/aidant-candidates' },
        { icon: <Users size={24} />, label: 'Aidants', color: '#2196F3', path: '/app/aidants' },
        { icon: <Users size={24} />, label: 'Utilisateurs', color: '#4CAF50', path: '/app/users' },
        { icon: <Calendar size={24} />, label: 'Visites', color: colors.accent, path: '/app/visits' },
        { icon: <ShoppingBag size={24} />, label: 'Commandes', color: colors.secondary, path: '/app/orders' },
        { icon: <CreditCard size={24} />, label: 'Paiements', color: '#4CAF50', path: '/app/admin-payments' },
        { icon: <Award size={24} />, label: 'Abonnements', color: '#9C27B0', path: '/app/admin-subscriptions' },
        { icon: <Bell size={24} />, label: 'Notifications', color: '#FF9800', path: '/app/admin-notifications' },
        { icon: <Package size={24} />, label: 'Offres', color: '#607D8B', path: '/app/offers' },
        { icon: <Settings size={24} />, label: 'Paramètres', color: '#795548', path: '/app/settings' },
        { icon: <MapPin size={24} />, label: 'Carte', color: '#FF5722', path: '/app/map' },
        { icon: <User size={24} />, label: 'Profil', color: '#607D8B', path: '/app/profile' },
      );
    }

    return tiles;
  };

  const tiles = getDashboardTiles();

  // ✅ Raccourcis rapides (4 premiers)
  const quickActions = tiles.slice(0, 4);

  const heroTitle = () => {
    if (isMaman) return 'Votre espace maman & bébé.';
    if (isFamily) return 'Un suivi clair pour votre proche.';
    if (isAidant) return 'Vos missions en un coup d\'œil.';
    if (isAdminOrCoordinator) return 'Vue d\'ensemble de la plateforme.';
    return 'Bienvenue sur Santé Plus Services.';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-white/70 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-32 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 sm:pb-10">
      {/* HERO */}
      <section
        className="relative overflow-hidden rounded-2xl min-h-[140px] shadow-sm border border-black/5"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.55) 42%, rgba(0,0,0,0.15) 100%),
            url('${heroImage}')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="relative z-10 min-h-[140px] p-4 flex flex-col justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/18 border border-white/25 backdrop-blur-md px-3 py-1 text-white text-xs font-semibold w-fit">
            <Sparkles size={12} />
            Santé Plus Services
          </div>

          <div>
            <p className="text-white text-xs font-medium drop-shadow">
              {greeting}, {profile?.full_name || 'Bienvenue'} 👋
            </p>
            <h1 className="text-xl font-black text-white tracking-tight drop-shadow">
              {heroTitle()}
            </h1>
          </div>
        </div>
      </section>

      {/* STATS COMPACTES */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <CompactDashCard
          title={isFamily ? 'Proches' : isAidant ? 'Personnes' : 'Bénéficiaires'}
          value={stats.proches}
          icon={<Users size={16} />}
          color={colors.primary}
          onClick={() => navigate('/app/patients')}
        />
        <CompactDashCard
          title="Visites à venir"
          value={stats.upcomingVisits}
          icon={<Calendar size={16} />}
          color={colors.accent}
          onClick={() => navigate('/app/visits')}
        />
        <CompactDashCard
          title="Commandes"
          value={stats.pendingOrders}
          icon={<ShoppingBag size={16} />}
          color={colors.secondary}
          onClick={() => navigate('/app/orders')}
        />
        <CompactDashCard
          title="Terminées"
          value={stats.completedVisits}
          icon={<CheckCircle size={16} />}
          color={colors.primary}
          onClick={() => navigate('/app/visits')}
        />
      </section>

      {/* TUILES DE REDIRECTION */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: colors.text }}>
            🚀 Accès rapide
          </h2>
          <span className="text-xs text-gray-400">{tiles.length} sections</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {tiles.map((tile, index) => (
            <button
              key={index}
              onClick={() => navigate(tile.path)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-95"
              style={{
                borderColor: colors.border,
                background: tile.color + '06',
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1.5"
                style={{ background: tile.color + '15', color: tile.color }}
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

      {/* PROCHES */}
      {patients.length > 0 && (
        <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold" style={{ color: colors.text }}>
              {isFamily ? 'Mes proches' : isAidant ? 'Mes personnes accompagnées' : 'Bénéficiaires suivis'}
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

      {/* VISITES */}
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
        {recentVisits.length > 0 ? (
          <div className="space-y-2">
            {recentVisits.map((visit) => (
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

      {/* COMMANDES */}
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
        {recentOrders.length > 0 ? (
          <div className="space-y-2">
            {recentOrders.map((order) => (
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

      {/* BANNER FINAL */}
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
// COMPACT DASH CARD
// =============================================

interface CompactDashCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

const CompactDashCard = ({ title, value, icon, color, onClick }: CompactDashCardProps) => {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl p-2.5 shadow-sm border border-black/5 hover:shadow-md transition text-left w-full"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider text-gray-400">
            {title}
          </p>
          <p className="text-lg font-bold mt-0.5" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: color + '14', color }}
        >
          {icon}
        </div>
      </div>
    </button>
  );
};

export default DashboardPage;
