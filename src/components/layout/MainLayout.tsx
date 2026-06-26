// 📁 src/components/layout/MainLayout.tsx

import { useEffect, useState, useRef } from 'react';
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
  AlertCircle,
  CreditCard,
  Award,
  History as HistoryIcon,
  Hospital,
  BookOpen,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { getLogoByRole } from '@/lib/constants';
import { cn } from '@/utils/helpers';
import { ReminderBanner } from '@/components/reminders/ReminderBanner';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { profile, role, logout } = useAuthStore();
  const { unreadCount, fetchNotifications, subscribe, unsubscribe } =
    useNotificationStore();

  // ✅ Jargon dynamique selon le rôle
  const {
    plural,          // "proches" / "personnes accompagnées" / "bénéficiaires"
    list,            // "Mes proches" / "Mes personnes accompagnées" / "Bénéficiaires"
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const logoConfig = getLogoByRole(role, profile?.patient_category);

  const isFamilyWithoutPatient = role === 'family' && !profile?.patient_category;

  // ✅ Référence pour éviter les doublons de subscription
  const isSubscribed = useRef(false);

  // ✅ Gestion des notifications
  useEffect(() => {
    if (!profile) return;

    // ✅ Éviter les subscriptions multiples
    if (isSubscribed.current) {
      console.log('ℹ️ Notifications déjà abonnées');
      return;
    }

    console.log('🔔 Initialisation des notifications...');
    fetchNotifications();
    subscribe();
    isSubscribed.current = true;

    return () => {
      if (isSubscribed.current) {
        console.log('🔔 Nettoyage des notifications...');
        unsubscribe();
        isSubscribed.current = false;
      }
    };
  }, [profile, fetchNotifications, subscribe, unsubscribe]);

  // ✅ EMPÊCHER LE RECHARGEMENT AUTOMATIQUE QUAND L'UTILISATEUR CHANGE D'ONGLET
  useEffect(() => {
    let isMounted = true;
    let lastFetchTime = 0;

    const handleVisibilityChange = () => {
      // ✅ Ne rien faire si le composant est démonté
      if (!isMounted) return;

      if (!document.hidden) {
        console.log('👀 Retour sur la page - pas de rechargement');

        // ✅ Rafraîchir les notifications en arrière-plan sans recharger la page
        // Seulement si 30 secondes se sont écoulées depuis le dernier fetch
        const now = Date.now();
        if (now - lastFetchTime > 30000 && profile) {
          console.log('🔔 Rafraîchissement des notifications en arrière-plan');
          fetchNotifications().catch(console.error);
          lastFetchTime = now;
        }
      }
    };

    // ✅ Empêcher le rechargement automatique au focus de la fenêtre
    const handleFocus = () => {
      if (!isMounted) return;
      console.log('👀 Fenêtre focus - pas de rechargement automatique');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [profile, fetchNotifications]);

  // ✅ Navigation selon le rôle avec jargon dynamique
  const getNavItems = () => {
    const base = [
      {
        icon: <LayoutDashboard size={20} />,
        label: 'Tableau de bord',
        path: '/app',
      },
    ];

    // 👨‍👩‍👦 FAMILLE
    if (role === 'family') {
      return [
        ...base,
        { icon: <Users size={20} />, label: list, path: '/app/patients' },
        { icon: <Calendar size={20} />, label: 'Visites', path: '/app/visits' },
        { icon: <ShoppingBag size={20} />, label: 'Commandes', path: '/app/orders' },
        { icon: <MessageCircle size={20} />, label: 'Messages', path: '/app/messages' },
        { icon: <CreditCard size={20} />, label: 'Abonnement', path: '/app/billing' },
        { icon: <BookOpen size={20} />, label: 'Journal', path: '/app/journal' },
        { icon: <MapPin size={20} />, label: 'Carte', path: '/app/map' },
        { icon: <User size={20} />, label: 'Profil', path: '/app/profile' },
        { icon: <Hospital size={20} />, label: 'Sortie hôpital', path: '/app/discharge' },
      ];
    }

    // 🦸 AIDANT
    if (role === 'aidant') {
      return [
        ...base,
        { icon: <Briefcase size={20} />, label: 'Mes missions', path: '/app/missions' },
        { icon: <Calendar size={20} />, label: 'Planning', path: '/app/planning' },
        { icon: <HistoryIcon size={20} />, label: 'Historique', path: '/app/history' },
        { icon: <ShoppingBag size={20} />, label: 'Commandes', path: '/app/orders' },
        { icon: <MessageCircle size={20} />, label: 'Messages', path: '/app/messages' },
        { icon: <MapPin size={20} />, label: 'Carte', path: '/app/map' },
        { icon: <User size={20} />, label: 'Profil', path: '/app/profile' },
        { icon: <Users size={20} />, label: 'Assigner aidants', path: '/app/assign-aidants' },
      ];
    }

    // 👔 COORDINATEUR / ADMIN
    if (role === 'coordinator' || role === 'admin') {
      return [
        ...base,
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard Admin', path: '/app/admin' },
        { icon: <ClipboardList size={20} />, label: 'Inscriptions', path: '/app/registrations' },
        { icon: <UserCheck size={20} />, label: 'Candidatures Aidants', path: '/app/aidant-candidates' },
        { icon: <Users size={20} />, label: 'Assigner aidants', path: '/app/assign-aidants' },
        { icon: <Users size={20} />, label: 'Aidants', path: '/app/aidants' },
        { icon: <Users size={20} />, label: 'Utilisateurs', path: '/app/users' },
        { icon: <Calendar size={20} />, label: 'Visites', path: '/app/visits' },
        { icon: <ShoppingBag size={20} />, label: 'Commandes', path: '/app/orders' },
        { icon: <CreditCard size={20} />, label: 'Paiements', path: '/app/admin-payments' },
        { icon: <Award size={20} />, label: 'Abonnements', path: '/app/admin-subscriptions' },
        { icon: <Bell size={20} />, label: 'Notifications', path: '/app/admin-notifications' },
        { icon: <ShoppingBag size={20} />, label: 'Offres', path: '/app/offers' },
        { icon: <Settings size={20} />, label: 'Paramètres', path: '/app/settings' },
        { icon: <MapPin size={20} />, label: 'Carte / Radar', path: '/app/map' },
        { icon: <User size={20} />, label: 'Profil', path: '/app/profile' },
      ];
    }

    return base;
  };

  const navItems = getNavItems();

  // ✅ Titre de la page selon le rôle
  const getPageTitle = () => {
    const path = location.pathname;
    
    if (path.startsWith('/app/orders')) return 'Commandes';
    if (path.startsWith('/app/patients')) return list;
    if (path.startsWith('/app/visits')) return 'Visites';
    if (path.startsWith('/app/messages')) return 'Messages';
    if (path.startsWith('/app/billing')) return 'Abonnement';
    if (path.startsWith('/app/profile')) return 'Profil';
    if (path.startsWith('/app/notifications')) return 'Notifications';
    if (path.startsWith('/app/missions')) return 'Mes missions';
    if (path.startsWith('/app/planning')) return 'Planning';
    if (path.startsWith('/app/history')) return 'Historique';
    if (path.startsWith('/app/map')) return 'Carte / Radar';
    if (path.startsWith('/app/journal')) return 'Journal de bord';
    if (path.startsWith('/app/discharge')) return 'Sortie hôpital';
    if (path.startsWith('/app/admin')) return 'Administration';
    if (path.startsWith('/app/registrations')) return 'Inscriptions';
    if (path.startsWith('/app/aidants')) return 'Aidants';
    if (path.startsWith('/app/aidant-candidates')) return 'Candidatures Aidants';
    if (path.startsWith('/app/users')) return 'Utilisateurs';
    if (path.startsWith('/app/offers')) return 'Offres';
    if (path.startsWith('/app/settings')) return 'Paramètres';
    if (path.startsWith('/app/admin-payments')) return 'Paiements';
    if (path.startsWith('/app/admin-subscriptions')) return 'Abonnements';
    if (path.startsWith('/app/admin-notifications')) return 'Notifications';

    if (role === 'family') return 'Tableau de bord';
    if (role === 'aidant') return 'Mes missions';
    if (role === 'coordinator') return 'Supervision';
    if (role === 'admin') return 'Administration';

    return 'Santé Plus Services';
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // ✅ Message pour "pas de proche"
  const getNoProcheMessage = () => {
    if (isFamily) return '💡 Vous n\'avez pas encore de proche associé.';
    if (isAidant) return '💡 Vous n\'avez pas encore de personne accompagnée.';
    return '💡 Aucun bénéficiaire associé.';
  };

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ backgroundColor: colors.background }}
    >
      {/* SIDEBAR DESKTOP */}
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

      {/* SIDEBAR MOBILE */}
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

      {/* OVERLAY MOBILE */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/45 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* PAGE CONTENT avec HEADER FIXE */}
      <div className="min-h-screen w-full md:pl-72">
        {/* HEADER FIXE */}
        <header
          className="fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-b px-4 md:px-6 py-3 md:py-4"
          style={{ 
            borderColor: colors.primary + '20',
            backgroundColor: 'rgba(255,255,255,0.95)',
          }}
        >
          <div className="max-w-full mx-auto md:ml-0">
            <div className="flex flex-col gap-2">
              {/* Ligne 1 : Titre + Notifications */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="md:hidden w-10 h-10 rounded-xl hover:bg-gray-100 transition flex items-center justify-center shrink-0"
                  >
                    <Menu size={22} />
                  </button>

                  <h2
                    className="text-base md:text-lg font-bold truncate"
                    style={{ color: colors.text }}
                  >
                    {getPageTitle()}
                  </h2>

                  {/* Badge rôle */}
                  <span
                    className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: colors.primary + '15',
                      color: colors.primary,
                    }}
                  >
                    {role === 'aidant' ? '🦸 Aidant' : 
                     role === 'family' ? '👨‍👩‍👦 Famille' :
                     role === 'coordinator' ? '👔 Coord' : 
                     role === 'admin' ? '👑 Admin' : ''}
                  </span>
                </div>

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

              {/* Ligne 2 : Notification "Pas de proche" */}
              {isFamilyWithoutPatient && (
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm"
                  style={{
                    background: colors.primary + '10',
                    border: `1px solid ${colors.primary + '20'}`,
                  }}
                >
                  <AlertCircle size={16} style={{ color: colors.primary }} />
                  <span style={{ color: colors.text + '80' }}>
                    {getNoProcheMessage()}
                    <button
                      onClick={() => navigate('/app/patients')}
                      className="font-medium hover:underline ml-1"
                      style={{ color: colors.primary }}
                    >
                      {isFamily ? 'Ajouter un proche' : isAidant ? 'Ajouter une personne' : 'Ajouter un bénéficiaire'}
                    </button>
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ESPACE POUR LE HEADER FIXE */}
        <main className="w-full max-w-full overflow-x-hidden pt-20 md:pt-24 p-3 sm:p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <ReminderBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

// =============================================
// SIDEBAR CONTENT
// =============================================

interface SidebarContentProps {
  navItems: {
    icon: React.ReactNode;
    label: string;
    path: string;
  }[];
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
  const getRoleEmoji = () => {
    if (role === 'aidant') return '🦸';
    if (role === 'family') return '👨‍👩‍👦';
    if (role === 'coordinator') return '👔';
    if (role === 'admin') return '👑';
    return '👤';
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
      {/* LOGO */}
      <div
        className="p-5 border-b"
        style={{ borderColor: colors.primary + '20' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoConfig.icon}
              alt="Santé Plus Services"
              className="w-10 h-10 object-contain shrink-0"
            />

            <div className="min-w-0">
              <p
                className="font-black leading-tight truncate"
                style={{ color: colors.primary }}
              >
                Santé Plus
              </p>
              <p className="text-xs text-gray-500 truncate">Services</p>
            </div>
          </div>

          {showClose && (
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* NAV */}
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

      {/* USER */}
      <div
        className="p-4 border-t space-y-2"
        style={{ borderColor: colors.primary + '20' }}
      >
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
            <p className="text-sm font-medium truncate">
              {profile?.full_name || 'Utilisateur'}
            </p>
            <p className="text-xs flex items-center gap-1" style={{ color: colors.primary }}>
              <span>{getRoleEmoji()}</span>
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
