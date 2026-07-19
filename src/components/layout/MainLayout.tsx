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

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { profile, role, logout } = useAuthStore();
  const { unreadCount, fetchNotifications, subscribe, unsubscribe } =
    useNotificationStore();
  const { visits } = useVisitStore();
  const { hasActiveSubscription, remainingVisits } = useSubscriptionGuard();

  const { isFamily } = useTerminology();
  const brand = useBranding();
  const colors = brand.colors;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showHeader, setShowHeader] = useState(true);

  const draftCount = visits.filter(v => v.status === 'brouillon').length;
  const showDraftBadge = isFamily && draftCount > 0 && hasActiveSubscription && remainingVisits > 0;

  // =============================================
  // GESTION DU SCROLL
  // =============================================
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    if (currentScrollY <= 20) {
      setShowHeader(true);
    } else {
      setShowHeader(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
  // NOTIFICATIONS TEMPS RÉEL
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
  // NAVIGATION PAR RÔLE (MESSAGES ET CATALOGUE AIDANTS RETIRÉS)
  // =============================================
  const navItems = useMemo(() => {
    const base = [
      { icon: <Home size={20} />, label: "Mon Espace d'Accueil", path: '/app' },
    ];

    if (role === 'family') {
      return [
        ...base,
        { icon: <Users size={20} />, label: 'Mes Proches', path: '/app/patients' },
        { icon: <Calendar size={20} />, label: "Visites d'Accompagnement", path: '/app/visits' },
        { icon: <ShoppingBag size={20} />, label: 'Livraisons & Courses', path: '/app/orders' },
        { icon: <CreditCard size={20} />, label: 'Mon Forfait', path: '/app/billing' },
        { icon: <BookOpen size={20} />, label: 'Journal de Bord', path: '/app/journal' },
        { icon: <MapPin size={20} />, label: 'Carte en Direct', path: '/app/map' },
        { icon: <User size={20} />, label: 'Mon Profil', path: '/app/profile' },
      ];
    }

    if (role === 'aidant') {
      return [
        ...base,
        { icon: <Briefcase size={20} />, label: "Missions d'Accompagnement", path: '/app/missions' },
        { icon: <Calendar size={20} />, label: 'Calendrier des Interventions', path: '/app/planning' },
        { icon: <HistoryIcon size={20} />, label: 'Historique des Visites', path: '/app/history' },
        { icon: <ShoppingBag size={20} />, label: 'Livraisons & Courses', path: '/app/orders' },
        { icon: <MapPin size={20} />, label: 'Carte de Localisation', path: '/app/map' },
        { icon: <User size={20} />, label: 'Mon Profil', path: '/app/profile' },
      ];
    }

    if (role === 'admin' || role === 'coordinator') {
      return [
        ...base,
        { icon: <LayoutDashboard size={20} />, label: "Console d'Administration", path: '/app/admin' },
        { icon: <ClipboardList size={20} />, label: "Demandes d'Inscription", path: '/app/registrations' },
        { icon: <UserCheck size={20} />, label: 'Candidatures Intervenants', path: '/app/aidant-candidates' },
        { icon: <Users size={20} />, label: 'Dossiers Bénéficiaires', path: '/app/patients' },
        { icon: <Calendar size={20} />, label: 'Suivi des Interventions', path: '/app/visits' },
        { icon: <FileCheck size={20} />, label: 'Validation des Rapports', path: '/app/admin/visits/validation' },
        { icon: <ShoppingBag size={20} />, label: 'Livraisons & Courses', path: '/app/orders' },
        { icon: <CreditCard size={20} />, label: 'Suivi Financier', path: '/app/admin-payments' },
        { icon: <Award size={20} />, label: 'Forfaits Actifs', path: '/app/admin-subscriptions' },
        { icon: <Package size={20} />, label: "Catalogue d'Offres", path: '/app/offers' },
        { icon: <Settings size={20} />, label: 'Configuration Système', path: '/app/settings' },
        { icon: <Bell size={20} />, label: 'Alertes Administration', path: '/app/admin-notifications' },
        { icon: <MapPin size={20} />, label: 'Carte en Direct', path: '/app/map' },
        { icon: <User size={20} />, label: 'Mon Profil', path: '/app/profile' },
      ];
    }

    return base;
  }, [role]);

  // =============================================
  // TITRE DE LA PAGE
  // =============================================
  const pageTitle = useMemo(() => {
    const path = location.pathname;

    const exactTitles: Record<string, string> = {
      '/app': "Mon Espace d'Accueil",
      '/app/dashboard': "Mon Espace d'Accueil",
      '/app/orders': 'Livraisons & Courses',
      '/app/patients': role === 'family' ? 'Mes Proches' : 'Dossiers Bénéficiaires',
      '/app/visits': role === 'family' ? "Visites d'Accompagnement" : 'Suivi des Interventions',
      '/app/billing': 'Mon Forfait',
      '/app/profile': 'Mon Profil',
      '/app/notifications': 'Notifications & Alertes',
      '/app/missions': "Missions d'Accompagnement",
      '/app/planning': 'Calendrier des Interventions',
      '/app/history': 'Historique des Visites',
      '/app/map': 'Carte en Direct',
      '/app/journal': 'Journal de Bord',
      '/app/admin': "Console d'Administration",
      '/app/registrations': "Demandes d'Inscription",
      '/app/aidants': 'Réseau Intervenants',
      '/app/aidant-candidates': 'Candidatures Intervenants',
      '/app/users': 'Utilisateurs du Système',
      '/app/offers': "Catalogue d'Offres",
      '/app/settings': 'Configuration Système',
      '/app/admin-payments': 'Suivi Financier',
      '/app/admin-subscriptions': 'Forfaits Actifs',
      '/app/admin-notifications': 'Alertes Administration',
      '/app/admin/visits/validation': 'Validation des Rapports',
    };

    if (exactTitles[path]) return exactTitles[path];

    for (const [key, value] of Object.entries(exactTitles)) {
      if (path.startsWith(key) && key !== '/app') return value;
    }

    if (role === 'aidant') return 'Missions';
    if (role === 'family') return "Mon Espace d'Accueil";
    if (role === 'admin' || role === 'coordinator') return "Console d'Administration";

    return 'Santé Plus Services';
  }, [location.pathname, role]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: colors.background }}> 
      {/* SIDEBAR DESKTOP UNIQUEMENT */}
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
            logoConfig={brand.logo}
            onLogout={() => {
              logout();
              navigate('/login');
            }}
          />
        </aside>
      )}

      <div className="min-h-screen w-full md:pl-72">
        {/* HEADER IMMERSIF */}
        <header
          className={cn(
            "fixed top-0 left-0 right-0 z-30 transition-all duration-300 transform",
            isMobile 
              ? "bg-transparent border-none px-4 py-3" 
              : "bg-white/95 backdrop-blur-lg border-b px-5 md:px-6 py-3.5 md:py-4",
            showHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
          )}
          style={{
            borderColor: isMobile ? 'transparent' : colors.primary + '20',
          }}
        >
          <div className="max-w-full mx-auto">
            <div className="flex items-center justify-between gap-3">
              
              {isMobile ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-sm shrink-0 overflow-hidden"
                    style={{ background: colors.primary }}
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            parent.textContent = profile?.full_name?.charAt(0) || 'U';
                            parent.style.display = 'flex';
                            parent.style.alignItems = 'center';
                            parent.style.justifyContent = 'center';
                          }
                        }}
                      />
                    ) : (
                      profile?.full_name?.charAt(0) || 'U'
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                      {getGreeting()},
                    </p>
                    <p className="text-xs font-black truncate leading-tight mt-0.5" style={{ color: colors.text }}>
                      {profile?.full_name || 'Utilisateur'}
                    </p>
                  </div>
                </div>
              ) : (
                <h2
                  className="text-base sm:text-lg font-bold truncate pl-1 sm:pl-0"
                  style={{ color: colors.text }}
                >
                  {pageTitle}
                </h2>
              )}

              <div className="flex items-center gap-2">
                {showDraftBadge && (
                  <Link
                    to="/app/visits?filter=brouillon"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold hover:opacity-80 transition shrink-0 shadow-sm"
                    style={{
                      backgroundColor: colors.secondary,
                      color: colors.text,
                    }}
                  >
                    <AlertCircle size={11} />
                    <span>{draftCount}</span>
                  </Link>
                )}

                <span
                  className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-gray-100/80"
                  style={{
                    color: colors.primary,
                  }}
                >
                  {role === 'aidant' && <Briefcase size={12} />}
                  {role === 'family' && <Users size={12} />}
                  {role === 'coordinator' && <UserCog size={12} />}
                  {role === 'admin' && <Shield size={12} />}
                  {role === 'aidant' ? ' Intervenant' :
                   role === 'family' ? ' Famille' :
                   role === 'coordinator' ? ' Coord' :
                   role === 'admin' ? ' Admin' : ''}
                </span>

                <Link
                  to="/app/notifications"
                  className={cn(
                    "relative transition flex items-center justify-center shrink-0",
                    isMobile 
                      ? "w-9 h-9 rounded-full bg-white/80 backdrop-blur-md border shadow-sm"
                      : "w-10 h-10 rounded-xl hover:bg-gray-100 border"
                  )}
                  style={{
                    borderColor: colors.primary + '20',
                  }}
                >
                  <Bell size={18} className="text-gray-500" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute top-0 right-0 min-w-4 h-4 px-1 text-[8px] text-white rounded-full flex items-center justify-center font-black animate-pulse"
                      style={{ backgroundColor: '#DC2626' }}
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENU PRINCIPAL */}
        <main className="w-full max-w-full overflow-x-hidden pt-16 md:pt-24 p-3 sm:p-4 md:p-6 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto animate-fadeIn">
            <ReminderBanner />
            <Outlet />
          </div>
        </main>
      </div>

      {/* TABS MOBILE */}
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
  onLogout: () => void;
}

const SidebarContent = ({
  navItems,
  locationPath,
  colors,
  profile,
  role,
  logoConfig,
  onLogout,
}: SidebarContentProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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

  const getAvatarUrl = (avatarUrl: string | null | undefined): string => {
    if (!avatarUrl) return '';
    if (avatarUrl.includes('?v=')) {
      return avatarUrl;
    }
    const separator = avatarUrl.includes('?') ? '&' : '?';
    return `${avatarUrl}${separator}v=${Date.now()}`;
  };

  const isActive = (path: string) => {
    if (path === '/app') {
      return locationPath === '/app' || locationPath === '/app/dashboard';
    }
    return locationPath.startsWith(path);
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: colors.primary + '20' }}>
        <div className="flex items-center gap-2.5">
          <img src={logoConfig.whiteBg} alt="Logo" className="w-8 h-8 object-contain" />
          <div className="min-w-0">
            <p className="font-black text-sm leading-tight truncate" style={{ color: colors.primary }}>
              Santé Plus Services
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 py-4 px-3 space-y-1 scrollbar-none">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const isHovered = hoveredId === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onMouseEnter={() => setHoveredId(item.path)}
              onMouseLeave={() => setHoveredId(null)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 min-w-0 font-medium"
              style={{
                color: active ? colors.primary : colors.textLight,
                backgroundColor: active 
                  ? colors.primary + '18' 
                  : (isHovered ? colors.primary + '08' : 'transparent'),
              }}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="text-sm truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t space-y-2 bg-gray-50/50" style={{ borderColor: colors.primary + '20' }}>
        <Link
          to="/app/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition min-w-0"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm overflow-hidden"
            style={{ background: colors.primary }}
          >
            {profile?.avatar_url ? (
              <img
                src={getAvatarUrl(profile.avatar_url)}
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.textContent = profile?.full_name?.charAt(0) || 'U';
                    parent.style.display = 'flex';
                    parent.style.alignItems = 'center';
                    parent.style.justifyContent = 'center';
                  }
                }}
              />
            ) : (
              profile?.full_name?.charAt(0) || 'U'
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-0.5">
              {getGreeting()}
            </p>
            <p className="text-xs font-bold truncate" style={{ color: colors.text }}>
              {profile?.full_name || 'Utilisateur'}
            </p>
            <p className="text-[10px] font-semibold flex items-center gap-1 mt-0.5" style={{ color: colors.primary }}>
              <span className="shrink-0">{getRoleIcon()}</span>
              <span>{getRoleLabel()}</span>
            </p>
          </div>
        </Link>

        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-50 w-full transition text-red-500 font-bold text-xs"
        >
          <LogOut size={16} className="shrink-0" />
          <span className="truncate">Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

export default MainLayout;
