// 📁 src/components/layout/MainLayout.tsx

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Bell,
  User,
  LogOut,
  Settings,
  Users,
  Calendar,
  ShoppingBag,
  MessageCircle,
  LayoutDashboard,
  Briefcase,
  MapPin,
  ClipboardList,
  UserCheck,
  CreditCard,
  Award,
  History as HistoryIcon,
  Hospital,
  BookOpen,
  Handshake,
  FileCheck,
  Package,
  Home,
  Shield,
  UserCog,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { getLogoByRole } from '@/lib/constants';
import { cn } from '@/utils/helpers';
import { ReminderBanner } from '@/components/reminders/ReminderBanner';
import { MobileTabBar } from './MobileTabBar';

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { profile, role, logout } = useAuthStore();
  const { unreadCount, fetchNotifications, subscribe, unsubscribe } =
    useNotificationStore();

  const { isFamily, isAdminOrCoordinator } = useTerminology();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);
  const logoConfig = getLogoByRole(role, profile?.patient_category);

  // =============================================
  // DÉTECTION MOBILE
  // =============================================
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // =============================================
  // NOTIFICATIONS
  // =============================================
  const isSubscribed = useRef(false);

  useEffect(() => {
    if (!profile) return;
    if (isSubscribed.current) return;

    fetchNotifications();
    subscribe();
    isSubscribed.current = true;

    return () => {
      if (isSubscribed.current) {
        unsubscribe();
        isSubscribed.current = false;
      }
    };
  }, [profile, fetchNotifications, subscribe, unsubscribe]);

  // =============================================
  // NAVIGATION PAR RÔLE
  // =============================================
  const navItems = useMemo(() => {
    const base = [
      { icon: <LayoutDashboard size={20} />, label: 'Tableau de bord', path: '/app' },
    ];

    // 👨‍👩‍👦 FAMILLE
    if (role === 'family') {
      return [
        ...base,
        { icon: <Users size={20} />, label: 'Proches', path: '/app/patients' },
        { icon: <Calendar size={20} />, label: 'Visites', path: '/app/visits' },
        { icon: <ShoppingBag size={20} />, label: 'Commandes', path: '/app/orders' },
        { icon: <MessageCircle size={20} />, label: 'Messages', path: '/app/messages' },
        { icon: <CreditCard size={20} />, label: 'Abonnement', path: '/app/billing' },
        { icon: <BookOpen size={20} />, label: 'Journal', path: '/app/journal' },
        { icon: <MapPin size={20} />, label: 'Carte', path: '/app/map' },
        { icon: <Hospital size={20} />, label: 'Sortie hôpital', path: '/app/discharge' },
        { icon: <User size={20} />, label: 'Profil', path: '/app/profile' },
      ];
    }

    // 🦸 AIDANT
    if (role === 'aidant') {
      return [
        ...base,
        { icon: <Briefcase size={20} />, label: 'Missions', path: '/app/missions' },
        { icon: <Calendar size={20} />, label: 'Planning', path: '/app/planning' },
        { icon: <HistoryIcon size={20} />, label: 'Historique', path: '/app/history' },
        { icon: <ShoppingBag size={20} />, label: 'Commandes', path: '/app/orders' },
        { icon: <MessageCircle size={20} />, label: 'Messages', path: '/app/messages' },
        { icon: <CreditCard size={20} />, label: 'Abonnement', path: '/app/billing' },
        { icon: <MapPin size={20} />, label: 'Carte', path: '/app/map' },
        { icon: <User size={20} />, label: 'Profil', path: '/app/profile' },
      ];
    }

    // 👔 ADMIN / COORDINATEUR
    if (role === 'admin' || role === 'coordinator') {
      return [
        ...base,
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard Admin', path: '/app/admin' },
        { icon: <ClipboardList size={20} />, label: 'Inscriptions', path: '/app/registrations' },
        { icon: <UserCheck size={20} />, label: 'Candidatures Aidants', path: '/app/aidant-candidates' },
        { icon: <Users size={20} />, label: 'Aidants', path: '/app/aidants' },
        { icon: <Handshake size={20} />, label: 'Assigner aidant', path: '/app/assign-aidants' },
        { icon: <Users size={20} />, label: 'Utilisateurs', path: '/app/users' },
        { icon: <Calendar size={20} />, label: 'Visites', path: '/app/visits' },
        { icon: <FileCheck size={20} />, label: 'Valider visites', path: '/app/admin/visits/validation' },
        { icon: <ShoppingBag size={20} />, label: 'Commandes', path: '/app/orders' },
        { icon: <CreditCard size={20} />, label: 'Paiements', path: '/app/admin-payments' },
        { icon: <Award size={20} />, label: 'Abonnements', path: '/app/admin-subscriptions' },
        { icon: <Package size={20} />, label: 'Offres', path: '/app/offers' },
        { icon: <Settings size={20} />, label: 'Paramètres', path: '/app/settings' },
        { icon: <Bell size={20} />, label: 'Notifications Admin', path: '/app/admin-notifications' },
        { icon: <MapPin size={20} />, label: 'Carte', path: '/app/map' },
        { icon: <User size={20} />, label: 'Profil', path: '/app/profile' },
      ];
    }

    return base;
  }, [role]);

  // =============================================
  // TITRE DE LA PAGE
  // =============================================
  const pageTitle = useMemo(() => {
    const path = location.pathname;

    const titles: Record<string, string> = {
      '/app/orders': 'Commandes',
      '/app/patients': 'Proches',
      '/app/visits': 'Visites',
      '/app/messages': 'Messages',
      '/app/billing': 'Abonnement',
      '/app/profile': 'Profil',
      '/app/notifications': 'Notifications',
      '/app/missions': 'Missions',
      '/app/planning': 'Planning',
      '/app/history': 'Historique',
      '/app/map': 'Carte',
      '/app/journal': 'Journal',
      '/app/discharge': 'Sortie hôpital',
      '/app/admin': 'Administration',
      '/app/registrations': 'Inscriptions',
      '/app/aidants': 'Aidants',
      '/app/aidant-candidates': 'Candidatures Aidants',
      '/app/users': 'Utilisateurs',
      '/app/offers': 'Offres',
      '/app/settings': 'Paramètres',
      '/app/admin-payments': 'Paiements',
      '/app/admin-subscriptions': 'Abonnements',
      '/app/admin-notifications': 'Notifications Admin',
      '/app/admin/visits/validation': 'Validation visites',
    };

    for (const [key, value] of Object.entries(titles)) {
      if (path.startsWith(key)) return value;
    }

    if (role === 'family') return 'Tableau de bord';
    if (role === 'aidant') return 'Missions';
    if (role === 'admin' || role === 'coordinator') return 'Administration';

    return 'Santé Plus Services';
  }, [location.pathname, role]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // =============================================
  // RENDU
  // =============================================
  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ backgroundColor: colors.background }}
    >
      {/* ========================================== */}
      {/* SIDEBAR DESKTOP */}
      {/* ========================================== */}
      {!isMobile && (
        <aside
          className="hidden md:flex fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-lg border-r flex-col"
          style={{ borderColor: colors.primary + '20' }}
        >
          <SidebarContent
            navItems={navItems}
            locationPath={location.pathname}
            colors={colors}
            profile={profile}
            role={role}
            logoConfig={logoConfig}
            onClose={closeSidebar}
            onLogout={() => {
              logout();
              navigate('/login');
            }}
            showClose={false}
          />
        </aside>
      )}

      {/* ========================================== */}
      {/* SIDEBAR MOBILE */}
      {/* ========================================== */}
      {isMobile && (
        <>
          <aside
            className={cn(
              'md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-xl border-r transition-transform duration-300 ease-in-out',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}
            style={{ borderColor: colors.primary + '20' }}
          >
            <SidebarContent
              navItems={navItems}
              locationPath={location.pathname}
              colors={colors}
              profile={profile}
              role={role}
              logoConfig={logoConfig}
              onClose={closeSidebar}
              onLogout={() => {
                logout();
                navigate('/login');
              }}
              showClose
            />
          </aside>

          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/45 z-40 md:hidden"
              onClick={closeSidebar}
            />
          )}
        </>
      )}

      {/* ========================================== */}
      {/* PAGE CONTENT */}
      {/* ========================================== */}
      <div className="min-h-screen w-full md:pl-72">
        {/* HEADER */}
        <header
          className="fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-b px-4 md:px-6 py-3 md:py-4"
          style={{
            borderColor: colors.primary + '20',
            backgroundColor: 'rgba(255,255,255,0.95)',
          }}
        >
          <div className="max-w-full mx-auto">
            <div className="flex items-center justify-between gap-3">
              <h2
                className="text-base md:text-lg font-bold truncate"
                style={{ color: colors.text }}
              >
                {pageTitle}
              </h2>

              <div className="flex items-center gap-2">
                {/* Badge rôle */}
                <span
                  className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: colors.primary + '15',
                    color: colors.primary,
                  }}
                >
                  {role === 'aidant' && <Briefcase size={12} />}
                  {role === 'family' && <Users size={12} />}
                  {role === 'coordinator' && <UserCog size={12} />}
                  {role === 'admin' && <Shield size={12} />}
                  {role === 'aidant' ? ' Aidant' :
                   role === 'family' ? ' Famille' :
                   role === 'coordinator' ? ' Coord' :
                   role === 'admin' ? ' Admin' : ''}
                </span>

                <Link
                  to="/app/notifications"
                  className="relative w-10 h-10 rounded-xl hover:bg-gray-100 transition flex items-center justify-center shrink-0"
                >
                  <Bell size={22} className="text-gray-600" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 min-w-5 h-5 px-1 text-xs text-white rounded-full flex items-center justify-center"
                      style={{ backgroundColor: colors.primary }}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main className="w-full max-w-full overflow-x-hidden pt-20 md:pt-24 p-3 sm:p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <ReminderBanner />
            <Outlet />
          </div>
        </main>
      </div>

      {/* TAB BAR MOBILE */}
      {isMobile && <MobileTabBar colors={colors} />}
    </div>
  );
};

// =============================================
// SIDEBAR CONTENT
// =============================================

interface SidebarContentProps {
  navItems: { icon: React.ReactNode; label: string; path: string }[];
  locationPath: string;
  colors: any;
  profile: any;
  role: any;
  logoConfig: { icon: string; text: string; whiteBg: string };
  onClose: () => void;
  onLogout: () => void;
  showClose: boolean;
}

const SidebarContent = ({
  navItems,
  locationPath,
  colors,
  profile,
  role,
  logoConfig,
  onClose,
  onLogout,
  showClose,
}: SidebarContentProps) => {
  const getRoleIcon = () => {
    if (role === 'aidant') return <Briefcase size={14} />;
    if (role === 'family') return <Users size={14} />;
    if (role === 'coordinator') return <UserCog size={14} />;
    if (role === 'admin') return <Shield size={14} />;
    return <User size={14} />;
  };

  const getRoleLabel = () => {
    if (role === 'aidant') return 'Aidant';
    if (role === 'family') return 'Famille';
    if (role === 'coordinator') return 'Coordinateur';
    if (role === 'admin') return 'Administrateur';
    return 'Utilisateur';
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: colors.primary + '20' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoConfig.icon}
              alt="Santé Plus Services"
              className="w-10 h-10 object-contain shrink-0"
            />
            <div className="min-w-0">
              <p className="font-black leading-tight truncate" style={{ color: colors.primary }}>
                Santé Plus
              </p>
              <p className="text-xs text-gray-500 truncate">Services</p>
            </div>
          </div>
          {showClose && (
            <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-gray-100">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            item.path === '/app'
              ? locationPath === '/app' || locationPath === '/app/dashboard'
              : locationPath.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 min-w-0"
              style={{
                color: active ? colors.primary : '#6B7280',
                backgroundColor: active ? colors.primary + '10' : 'transparent',
              }}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="font-medium truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Utilisateur */}
      <div className="p-4 border-t space-y-2" style={{ borderColor: colors.primary + '20' }}>
        <Link
          to="/app/profile"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition min-w-0"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: colors.primary }}
          >
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name || 'Utilisateur'}</p>
            <p className="text-xs flex items-center gap-1.5" style={{ color: colors.primary }}>
              <span className="shrink-0">{getRoleIcon()}</span>
              <span>{getRoleLabel()}</span>
            </p>
          </div>
        </Link>

        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 w-full transition text-red-500"
        >
          <LogOut size={20} className="shrink-0" />
          <span className="truncate">Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

export default MainLayout;
