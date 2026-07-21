// 📁 src/features/layout/MainLayout.tsx
 
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  Bell,
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
  UserCheck,
  CreditCard,
  Award,
  History as HistoryIcon,
  BookOpen,
  FileCheck,
  Package,
  Home,
  Shield,
  UserCog,
  AlertCircle,
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
  const { unreadCount, fetchNotifications, subscribe, unsubscribe } = useNotificationStore();
  const { visits } = useVisitStore();
  const { hasActiveSubscription, remainingVisits } = useSubscriptionGuard();
  const { isFamily } = useTerminology();
  const brand = useBranding();
  const colors = brand.colors;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showHeader, setShowHeader] = useState(true);

  const draftCount = visits.filter(v => v.status === 'brouillon').length;
  const showDraftBadge = isFamily && draftCount > 0 && hasActiveSubscription && remainingVisits > 0;

  const handleScroll = useCallback(() => {
    setShowHeader(window.scrollY <= 20);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
          <SidebarContent navItems={navItems} locationPath={location.pathname} colors={colors} profile={profile} role={role} logoConfig={brand.logo} onLogout={() => { logout(); navigate('/login'); }} />
        </aside>
      )}

      <div className="min-h-screen w-full md:pl-60">
        <header className={cn("fixed top-0 left-0 right-0 z-30 transition-all duration-300", isMobile ? "bg-transparent px-4 py-3" : "bg-white/95 backdrop-blur-lg border-b px-6 py-4", showHeader ? "translate-y-0" : "-translate-y-full")}>
              <div className="flex items-center">
                 {/* Titre desktop uniquement : sur mobile, le dashboard porte déjà l'en-tête complet (avatar + salutation + date) */}
                 {!isMobile && (
                   <h2 className="text-sm font-black truncate" style={{ color: colors.text }}>
                     Santé Plus Services
                   </h2>
                 )}
                 <Link
                   to="/app/notifications"
                   className="relative p-2 rounded-xl border ml-auto bg-white/80 backdrop-blur-sm"
                   style={{ borderColor: colors.primary + '20' }}
                 >
                   <Bell size={18} />
                   {unreadCount > 0 && (
                     <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[8px] flex items-center justify-center rounded-full font-bold">
                       {unreadCount}
                     </span>
                   )}
                 </Link>
              </div>
        </header>

        <main className="w-full max-w-full pt-20 p-2">
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
// SIDEBAR CONTENT AVEC RÉINTÉGRATION PROFIL
// =============================================
const SidebarContent = ({ navItems, locationPath, colors, profile, role, logoConfig, onLogout }: any) => {
  const getRoleIcon = () => {
    if (role === 'aidant') return <Briefcase size={14} />;
    if (role === 'family') return <Users size={14} />;
    if (role === 'coordinator') return <UserCog size={14} />;
    if (role === 'admin') return <Shield size={14} />;
    return <User size={14} />;
  };

  const getRoleLabel = () => {
    if (role === 'aidant') return 'Intervenant';
    if (role === 'family') return 'Famille';
    if (role === 'coordinator') return 'Coordinateur';
    if (role === 'admin') return 'Administrateur';
    return 'Utilisateur';
  };

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
      
      {/* Bloc Profil Réintégré */}
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
