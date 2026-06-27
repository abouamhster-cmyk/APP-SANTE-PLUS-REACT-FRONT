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
  } else if (role === 'aidant') {
    tiles.push(
      { icon: <Calendar size={20} />, label: 'Missions', color: colors.primary, path: '/app/missions', badge: stats.upcomingVisits },
      { icon: <Briefcase size={20} />, label: 'Planning', color: '#10b981', path: '/app/planning' },
      { icon: <History size={20} />, label: 'Historique', color: '#78350f', path: '/app/history' },
      { icon: <ShoppingBag size={20} />, label: 'Commandes', color: '#f59e0b', path: '/app/orders', badge: stats.pendingOrders },
      { icon: <MessageCircle size={20} />, label: 'Messages', color: '#3b82f6', path: '/app/messages' },
      { icon: <CreditCard size={20} />, label: 'Abonnement', color: '#8b5cf6', path: '/app/billing' },
      { icon: <MapPin size={20} />, label: 'Carte', color: '#ef4444', path: '/app/map' },
      { icon: <User size={20} />, label: 'Profil', color: '#64748b', path: '/app/profile' },
    );
  } else if (role === 'admin' || role === 'coordinator') {
    tiles.push(
      { icon: <LayoutDashboard size={20} />, label: 'Admin', color: '#8b5cf6', path: '/app/admin' },
      { icon: <ClipboardList size={20} />, label: 'Inscriptions', color: colors.primary, path: '/app/registrations' },
      { icon: <UserCheck size={20} />, label: 'Candidatures', color: '#f59e0b', path: '/app/aidant-candidates' },
      { icon: <Users size={20} />, label: 'Aidants', color: '#3b82f6', path: '/app/aidants' },
      { icon: <Handshake size={20} />, label: 'Assigner', color: '#06b6d4', path: '/app/assign-aidants' },
      { icon: <Users size={20} />, label: 'Utilisateurs', color: '#10b981', path: '/app/users' },
      { icon: <Calendar size={20} />, label: 'Visites', color: '#10b981', path: '/app/visits' },
      { icon: <FileCheck size={20} />, label: 'Validation', color: '#84cc16', path: '/app/admin/visits/validation' },
      { icon: <ShoppingBag size={20} />, label: 'Commandes', color: '#f59e0b', path: '/app/orders' },
      { icon: <CreditCard size={20} />, label: 'Paiements', color: '#8b5cf6', path: '/app/admin-payments' },
      { icon: <Award size={20} />, label: 'Offres', color: '#64748b', path: '/app/offers' },
      { icon: <User size={20} />, label: 'Profil', color: '#64748b', path: '/app/profile' },
    );
  } else {
    tiles.push(
      { icon: <LayoutDashboard size={20} />, label: 'Accueil', color: colors.primary, path: '/app' },
      { icon: <User size={20} />, label: 'Profil', color: '#64748b', path: '/app/profile' },
    );
  }
  return tiles;
};

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

const DashboardPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();
  const { patients, fetchPatients, isLoading: patientsLoading } = usePatientStore();
  const { visits, fetchVisits, isLoading: visitsLoading } = useVisitStore();
  const { orders, fetchOrders, isLoading: ordersLoading } = useOrderStore();

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
    setIsMaman(patients.some((p) => p.category === 'maman_bebe'));
  }, [patients]);

  const stats = {
    proches: patients.length,
    upcomingVisits: visits.filter((v) => v.status === 'planifiee').length,
    pendingOrders: orders.filter((o) => o.status === 'creee' || o.status === 'en_cours').length,
    completedVisits: visits.filter((v) => v.status === 'terminee' || v.status === 'validee').length,
  };

  const tiles = getTilesForRole(role, colors, stats, patients.length);
  const isLoading = patientsLoading || visitsLoading || ordersLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-8">
        <div className="h-44 rounded-3xl bg-white animate-pulse shadow-sm" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse shadow-sm" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* BANNIÈRE HERO */}
      <section 
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 transition-all"
        style={{ background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.primary}15 100%)` }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase" style={{ background: colors.primary + '12', color: colors.primary }}>
              <Sparkles size={11} /> Santé Plus
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: colors.text }}>
              {greeting}, {profile?.full_name?.split(' ')[0] || 'Bienvenue'} 👋
            </h1>
            <p className="text-sm opacity-70 max-w-md">Gérez vos accompagnements et services en toute simplicité.</p>
          </div>
          <button onClick={() => navigate('/app/visits')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-transform hover:opacity-95 shadow-sm" style={{ background: colors.primary }}>
            Voir les visites <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={isFamily ? 'Proches' : 'Missions'} value={stats.proches} icon={<Users size={16} />} color={colors.primary} onClick={() => navigate('/app/patients')} />
        <StatCard label="Visites" value={stats.upcomingVisits} icon={<Calendar size={16} />} color="#10b981" onClick={() => navigate('/app/visits')} />
        <StatCard label="Commandes" value={stats.pendingOrders} icon={<ShoppingBag size={16} />} color="#f59e0b" onClick={() => navigate('/app/orders')} />
        <StatCard label="Validées" value={stats.completedVisits} icon={<CheckCircle size={16} />} color="#3b82f6" onClick={() => navigate('/app/visits')} />
      </section>

      {/* MENU RAPIDE */}
      <section className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <h2 className="text-xs font-bold tracking-wider uppercase text-gray-400 mb-4">Menu rapide</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {tiles.map((tile, i) => (
            <button key={i} onClick={() => navigate(tile.path)} className="flex flex-col items-center justify-center p-3 rounded-2xl transition-all hover:bg-gray-50 group">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-2" style={{ background: tile.color + '0a', color: tile.color }}>{tile.icon}</div>
              <span className="text-[10px] font-medium text-center text-gray-600 truncate w-full">{tile.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* LISTES VISITES/COMMANDES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <h2 className="text-xs font-bold tracking-wider uppercase text-gray-400 mb-3">Visites</h2>
          {visits.filter(v => v.status === 'planifiee').slice(0, 2).map(v => <VisitCard key={v.id} visit={v} compact onClick={() => navigate(`/app/visits/${v.id}`)} />)}
        </section>
        <section className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <h2 className="text-xs font-bold tracking-wider uppercase text-gray-400 mb-3">Commandes</h2>
          {orders.filter(o => o.status === 'creee').slice(0, 2).map(o => <OrderCard key={o.id} order={o} compact onClick={() => navigate(`/app/orders/${o.id}`)} />)}
        </section>
      </div>
    </div>
  );
};

interface StatCardProps { label: string; value: number; icon: React.ReactNode; color: string; onClick: () => void; }
const StatCard = ({ label, value, icon, color, onClick }: StatCardProps) => (
  <button onClick={onClick} className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex items-center justify-between transition hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
    <div className="space-y-0.5 text-left">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-extrabold" style={{ color }}>{value}</p>
    </div>
    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '0d', color }}>{icon}</div>
  </button>
);

export default DashboardPage;
