// 📁 src/features/layout/MainLayout.tsx

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  User,
  LogOut,
  Settings,
  Users,
  Calendar,
  ShoppingBag,
  LayoutDashboard,
  Briefcase,
  MapPin,
  ClipboardList,
  CreditCard,
  History as HistoryIcon,
  BookOpen,
  Home,
  Shield,
  UserCog,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useVisitStore } from '@/stores/visitStore';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { useTerminology } from '@/hooks/useTerminology';
import { useBranding } from '@/hooks/useBranding';
import { cn, getGreeting } from '@/utils/helpers';
import { ReminderBanner } from '@/components/reminders/ReminderBanner';
import { MobileTabBar } from './MobileTabBar';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { profile, role, logout } = useAuthStore();
  const { fetchNotifications, subscribe, unsubscribe } = useNotificationStore();
  const brand = useBranding();
  const colors = brand.colors;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!profile) return;
    fetchNotifications();
    subscribe();
    return () => unsubscribe();
  }, [profile, fetchNotifications, subscribe, unsubscribe]);

  const navItems = useMemo(() => {
    const base = [{ icon: <Home size={20} />, label: "Mon Espace d'Accueil", path: '/app' }];
    if (role === 'family') return [...base, { icon: <Users size={20} />, label: 'Mes Proches', path: '/app/patients' }, { icon: <Calendar size={20} />, label: "Visites", path: '/app/visits' }, { icon: <ShoppingBag size={20} />, label: 'Commandes', path: '/app/orders' }, { icon: <CreditCard size={20} />, label: 'Mon Forfait', path: '/app/billing' }, { icon: <BookOpen size={20} />, label: 'Journal', path: '/app/journal' }, { icon: <MapPin size={20} />, label: 'Carte', path: '/app/map' }, { icon: <User size={20} />, label: 'Profil', path: '/app/profile' }];
    if (role === 'aidant') return [...base, { icon: <Briefcase size={20} />, label: "Missions", path: '/app/missions' }, { icon: <Calendar size={20} />, label: 'Planning', path: '/app/planning' }, { icon: <HistoryIcon size={20} />, label: 'Historique', path: '/app/history' }, { icon: <ShoppingBag size={20} />, label: 'Commandes', path: '/app/orders' }, { icon: <MapPin size={20} />, label: 'Carte', path: '/app/map' }, { icon: <User size={20} />, label: 'Profil', path: '/app/profile' }];
    if (role === 'admin' || role === 'coordinator') return [...base, { icon: <LayoutDashboard size={20} />, label: "Admin", path: '/app/admin' }, { icon: <ClipboardList size={20} />, label: "Inscriptions", path: '/app/registrations' }, { icon: <Users size={20} />, label: 'Bénéficiaires', path: '/app/patients' }, { icon: <ShoppingBag size={20} />, label: 'Commandes', path: '/app/orders' }, { icon: <Settings size={20} />, label: 'Réglages', path: '/app/settings' }, { icon: <User size={20} />, label: 'Profil', path: '/app/profile' }];
    return base;
  }, [role]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: colors.background }}>
      {!isMobile && (
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-lg border-r flex-col" style={{ borderColor: colors.primary + '20' }}>
          <SidebarContent navItems={navItems} locationPath={location.pathname} colors={colors} profile={profile} role={role} onLogout={() => { logout(); navigate('/login'); }} />
        </aside>
      )}

      <div className="min-h-screen w-full md:pl-72">
        {/* Le Header fixe a été supprimé pour laisser place à la gestion autonome des pages */}
        
        <main className={cn('w-full max-w-full pt-8 p-2', isMobile ? 'pb-28' : 'pb-8')}>
          <ReminderBanner />
          <Outlet />
        </main>
      </div>

      {isMobile && <MobileTabBar colors={colors} />}
      <OnboardingTour />
    </div>
  );
};

// =============================================
// SIDEBAR CONTENT
// =============================================
const SidebarContent = ({ navItems, locationPath, colors, profile, role, onLogout }: any) => {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="p-5 font-black text-lg" style={{ color: colors.primary }}>Santé Plus</div>
      <div className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item: any) => (
          <Link key={item.path} to={item.path} className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm" style={{ color: locationPath === item.path ? colors.primary : '#6b7280' }}>
            {item.icon} {item.label}
          </Link>
        ))}
      </div>

      <div className="p-4 border-t space-y-3">
        <Link to="/app/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: colors.primary }}>
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase text-gray-400">{getGreeting()}</p>
            <p className="text-xs font-bold truncate" style={{ color: colors.text }}>{profile?.full_name || 'Utilisateur'}</p>
          </div>
        </Link>
        <button onClick={onLogout} className="flex items-center gap-2 text-red-500 font-bold text-sm px-3"><LogOut size={16} /> Déconnexion</button>
      </div>
    </div>
  );
};

export default MainLayout;
