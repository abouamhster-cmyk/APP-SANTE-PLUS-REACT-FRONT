// 📁 src/components/layout/MainLayout.tsx
// ✅ MAQUETTE DE NAVIGATION PRINCIPALE : GREETING DYNAMIQUE SELON L'HEURE ET COULEURS EXPLICITES CONTEXTUELLES PAR RÔLE

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Bell, User, LogOut, Settings, Users, Calendar, ShoppingBag,
MessageCircle, LayoutDashboard, Briefcase, MapPin, ClipboardList, UserCheck,
CreditCard, Award, History as HistoryIcon, Hospital, BookOpen, FileCheck,
Package, Home, Shield, UserCog, AlertCircle, } from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { usePatientStore } from '@/stores/patientStore';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { getLogoByRole } from '@/lib/constants';
import { cn, getGreeting, getInitials } from '@/utils/helpers';
import { ReminderBanner } from '@/components/reminders/ReminderBanner';
import { MobileTabBar } from './MobileTabBar';

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { profile, role, logout } = useAuthStore();
  const { unreadCount, fetchNotifications, subscribe, unsubscribe } = useNotificationStore();
  const { visits } = useVisitStore();
  const { orders } = useOrderStore();
  const { patients } = usePatientStore();
  const { hasActiveSubscription, remainingVisits } = useSubscriptionGuard();

  const { isFamily } = useTerminology();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // ============================================================
  // ✅ ADAPTATION DYNAMIQUE ET CONTEXTUELLE DE LA COULEUR DE RÔLE (Résout définitivement le vert résiduel)
  // ============================================================
  const themeName = useMemo(() => {
    if (role !== 'family') {
      return getThemeByRole(role, profile?.patient_category as any);
    }

    const path = location.pathname;

    // 1️⃣ Si l'on consulte la fiche d'un proche spécifique, on adopte ses couleurs
    if (path.startsWith('/app/patients/')) {
      const patientId = path.split('/').pop();
      const patient = patients.find(p => p.id === patientId);
      if (patient?.category === 'maman_bebe') return 'maman';
      if (patient?.category === 'senior') return 'senior';
    }

    // 2️⃣ Si l'on consulte une visite spécifique, on l'adapte
    if (path.startsWith('/app/visits/')) {
      const visitId = path.split('/').pop();
      const visit = visits.find(v => v.id === visitId);
      if (visit?.patient?.category === 'maman_bebe') return 'maman';
      if (visit?.patient?.category === 'senior') return 'senior';
    }

    // 3️⃣ Si l'on consulte une commande spécifique, on l'adapte
    if (path.startsWith('/app/orders/')) {
      const orderId = path.split('/').pop();
      const order = orders.find(o => o.id === orderId);
      if (order?.patient?.category === 'maman_bebe') return 'maman';
      if (order?.patient?.category === 'senior') return 'senior';
    }

    // 4️⃣ Si l'utilisateur a uniquement des proches maternité, on passe l'application en Rose
    const hasMamanBebe = patients.some(p => p.category === 'maman_bebe');
    const hasSenior = patients.some(p => p.category === 'senior');

    if (hasMamanBebe && !hasSenior) {
      return 'maman';
    }
    if (hasSenior && !hasMamanBebe) {
      return 'senior';
    }

    // 5️⃣ Repli par défaut sur la catégorie du profil enregistré
    return getThemeByRole(role, profile?.patient_category as any);
  }, [role, profile?.patient_category, location.pathname, patients, visits, orders]);

  const colors = getThemeColors(themeName);
  const logoConfig = getLogoByRole(role, profile?.patient_category);

  // ✅ MISE À JOUR DE LA RACINE DU DOCUMENT POUR APPLIQUER LA COULEUR DE RÔLE GLOBALE
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-senior', 'theme-maman', 'theme-aidant', 'theme-coordinator');
    root.classList.add(`theme-${themeName}`);
  }, [themeName]);

  const draftCount = visits.filter(v => v.status === 'brouillon').length;
  const showDraftBadge = isFamily && draftCount > 0 && hasActiveSubscription && remainingVisits > 0;

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
  // NOTIFICATIONS TEMPS RÉEL (Canaux)
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
  // NAVIGATION PAR RÔLE ET ICÔNES SÉCURISÉES RESTAURÉES
  // =============================================
  const navItems = useMemo(() => {
    const base = [{ icon: <LayoutDashboard size={18} />, label: 'Tableau de bord', path: '/app' }];

    if (role === 'family') {
      return [
        ...base,
        { icon: <Users size={18} />, label: 'Proches', path: '/app/patients' },
        { icon: <UserCheck size={18} />, label: 'Aidants', path: '/app/aidants' },
        { icon: <Calendar size={18} />, label: 'Visites', path: '/app/visits' },
        { icon: <ShoppingBag size={18} />, label: 'Commandes', path: '/app/orders' },
        { icon: <MessageCircle size={18} />, label: 'Messages', path: '/app/messages' },
        { icon: <CreditCard size={18} />, label: 'Abonnement', path: '/app/billing' },
        { icon: <ClipboardList size={18} />, label: 'Journal', path: '/app/journal' },
        { icon: <MapPin size={18} />, label: 'Carte', path: '/app/map' },
        { icon: <Hospital size={18} />, label: 'Sortie hôpital', path: '/app/discharge' },
        { icon: <User size={18} />, label: 'Profil', path: '/app/profile' },
      ];
    }

    if (role === 'aidant') {
      return [
        ...base,
        { icon: <Briefcase size={18} />, label: 'Missions', path: '/app/missions' },
        { icon: <Calendar size={18} />, label: 'Planning', path: '/app/planning' },
        { icon: <HistoryIcon size={18} />, label: 'Historique', path: '/app/history' },
        { icon: <ShoppingBag size={18} />, label: 'Commandes', path: '/app/orders' },
        { icon: <MessageCircle size={18} />, label: 'Messages', path: '/app/messages' },
        { icon: <MapPin size={18} />, label: 'Carte', path: '/app/map' },
        { icon: <User size={18} />, label: 'Profil', path: '/app/profile' },
      ];
    }

    if (role === 'admin' || role === 'coordinator') {
      return [
        ...base,
        { icon: <LayoutDashboard size={18} />, label: 'Dashboard Admin', path: '/app/admin' },
        { icon: <ClipboardList size={18} />, label: 'Inscriptions', path: '/app/registrations' },
        { icon: <UserCheck size={18} />, label: 'Candidatures Aidants', path: '/app/aidant-candidates' },
        { icon: <Users size={18} />, label: 'Bénéficiaires', path: '/app/patients' },
        { icon: <Calendar size={18} />, label: 'Visites', path: '/app/visits' },
        { icon: <FileCheck size={18} />, label: 'Valider visites', path: '/app/admin/visits/validation' },
        { icon: <ShoppingBag size={18} />, label: 'Commandes', path: '/app/orders' },
        { icon: <CreditCard size={18} />, label: 'Paiements', path: '/app/admin-payments' },
        { icon: <Package size={18} />, label: 'Abonnements', path: '/app/admin-subscriptions' },
        { icon: <BookOpen size={18} />, label: 'Offres', path: '/app/offers' },
        { icon: <Settings size={18} />, label: 'Paramètres', path: '/app/settings' },
        { icon: <Bell size={18} />, label: 'Notifications Admin', path: '/app/admin-notifications' },
        { icon: <MapPin size={18} />, label: 'Carte', path: '/app/map' },
        { icon: <User size={18} />, label: 'Profil', path: '/app/profile' },
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
      '/app': 'Tableau de bord',
      '/app/dashboard': 'Tableau de bord',
      '/app/orders': 'Commandes',
      '/app/patients': 'Bénéficiaires',
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

    if (exactTitles[path]) return exactTitles[path];

    for (const [key, value] of Object.entries(exactTitles)) {
      if (path.startsWith(key) && key !== '/app') return value;
    }

    if (role === 'aidant') return 'Missions';
    if (role === 'family') return 'Tableau de bord';
    if (role === 'admin' || role === 'coordinator') return 'Administration';

    return 'Santé Plus Services';
  }, [location.pathname, role]);

  return (
    <div className={cn("min-h-screen w-full overflow-x-hidden", `theme-${themeName}`)} style={{ backgroundColor: colors.background }}>
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
            logoConfig={logoConfig}
            onLogout={() => {
              logout();
              navigate('/login');
            }}
          />
        </aside>
      )}

      {/* HEADER IMMERSIF */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-30 transition-all duration-300",
          isMobile 
            ? "bg-transparent border-none px-4 py-3" 
            : "bg-white/95 dark:bg-[#17231d]/95 backdrop-blur-lg border-b px-5 md:px-6 py-3.5 md:py-4"
        )}
        style={{
          borderColor: isMobile ? 'transparent' : colors.primary + '20',
        }}
      >
        <div className="max-w-full mx-auto">
          <div className="flex items-center justify-between gap-3">
            
            {isMobile ? (
              <div className="flex items-center gap-2 min-w-0">
                {/* Avatar mobile */}
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
                  {/* SALUTATION DYNAMIQUE SELON L'HEURE */}
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
                  className="flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-[10px] font-bold hover:bg-yellow-200 transition shrink-0 shadow-sm"
                >
                  <AlertCircle size={11} />
                  <span>{draftCount}</span>
                </Link>
              )}

              <span
                className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-gray-100/80 dark:bg-[#1d2d25]/80"
                style={{
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
                className={cn(
                  "relative transition flex items-center justify-center shrink-0",
                  isMobile 
                    ? "w-9 h-9 rounded-full bg-white/80 dark:bg-[#17231d]/80 backdrop-blur-md border border-gray-100 dark:border-gray-800/40 shadow-sm"
                    : "w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-[#1d2d25] border"
                )}
              >
                <Bell size={18} className="text-gray-500 dark:text-gray-300" />
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
      <main className="w-full max-w-full overflow-x-hidden pt-16 md:pt-24 p-3 sm:p-4 md:p-6 pb-24 md:pb-8 animate-fadeIn">
        <div className="max-w-7xl mx-auto">
          <ReminderBanner />
          <Outlet />
        </div>
      </main>

      {/* TABS MOBILE COMPACT */}
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

  const getAvatarUrl = (avatarUrl: string | null | undefined): string => {
    if (!avatarUrl) return '';
    if (avatarUrl.includes('?v=')) {
      return avatarUrl;
    }
    const separator = avatarUrl.includes('?') ? '&' : '?';
    return `${avatarUrl}${separator}v=${Date.now()}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-5 py-4 border-b dark:border-[#2c3f35]"
        style={{ borderColor: colors.primary + '20' }}
      >
        <p className="font-black text-sm leading-tight truncate" style={{ color: colors.primary }}>
          Santé Plus Services
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActivePath(item.path, locationPath);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 min-w-0 font-medium hover:bg-gray-50 dark:hover:bg-[#1c2a21]/50"
              style={{
                color: active ? colors.primary : '#6B7280',
                backgroundColor: active ? colors.primary + '10' : 'transparent',
              }}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="text-sm truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Profil de bas de page */}
      <div className="p-4 border-t dark:border-[#2c3f35]" style={{ borderColor: colors.primary + '20' }}>
        <Link
          to="/app/profile"
          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-[#1c2a21]/50 transition group border border-transparent hover:border-gray-100/50 mb-3"
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0 overflow-hidden"
            style={{ background: colors.primary }}
          >
            {profile?.avatar_url ? (
              <img
                src={getAvatarUrl(profile.avatar_url)}
                alt="Avatar"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.textContent = getInitials(profile?.full_name || '');
                    parent.style.display = 'flex';
                    parent.style.alignItems = 'center';
                    parent.style.justifyContent = 'center';
                  }
                }}
              />
            ) : (
              getInitials(profile?.full_name || '')
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate text-gray-800 dark:text-gray-100">
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
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 w-full transition text-red-500 font-bold text-xs"
        >
          <LogOut size={16} className="shrink-0" />
          <span className="truncate">Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

const isActivePath = (itemPath: string, currentPath: string): boolean => {
  if (itemPath === '/app') {
    return currentPath === '/app' || currentPath === '/app/dashboard';
  }
  return currentPath.startsWith(itemPath);
};

export default MainLayout;
