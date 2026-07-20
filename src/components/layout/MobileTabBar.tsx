// 📁 src/components/layout/MobileTabBar.tsx
 
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Calendar,
  User,
  X,
  Menu,
  CreditCard,
  BookOpen,
  MapPin,
  Bell,
  Briefcase,
  History,
  LayoutDashboard,
  ClipboardList,
  UserCheck,
  FileCheck,
  ShoppingBag,
  Award,
  Package,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useState, useEffect } from 'react';
import { cn } from '@/utils/helpers';
import { useBranding } from '@/hooks/useBranding';

// ============================================================
// TYPAGE STRICT DES ÉLÉMENTS DE MENU
// ============================================================

interface MainItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface MoreItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  color: string;
  bg: string;
}

interface MobileTabBarProps {
  colors?: any;
}

const getMainItems = (role: string | null): MainItem[] => {
  const base: MainItem[] = [
    { icon: <Home size={20} />, label: 'Accueil', path: '/app' },
  ];

  if (role === 'family') {
    return [
      ...base,
      { icon: <Users size={20} />, label: 'Proches', path: '/app/patients' },
      { icon: <Calendar size={20} />, label: 'Visites', path: '/app/visits' },
      { icon: <User size={20} />, label: 'Profil', path: '/app/profile' },
    ];
  }

  if (role === 'aidant') {
    return [
      ...base,
      { icon: <Briefcase size={20} />, label: 'Missions', path: '/app/missions' },
      { icon: <Calendar size={20} />, label: 'Planning', path: '/app/planning' },
      { icon: <User size={20} />, label: 'Profil', path: '/app/profile' },
    ];
  }

  if (role === 'admin' || role === 'coordinator') {
    return [
      ...base,
      { icon: <ClipboardList size={20} />, label: 'Inscriptions', path: '/app/registrations' },
      { icon: <Users size={20} />, label: 'Bénéficiaires', path: '/app/patients' },
      { icon: <Settings size={20} />, label: 'Paramètres', path: '/app/settings' },
    ];
  }

  return base;
};

const getMoreItems = (role: string | null, brand: any): MoreItem[] => {
  const colors = brand.colors;
  const primaryColor = colors.primary;
  const goldColor = colors.gold;

  if (role === 'family') {
    return [
      { icon: <CreditCard size={20} />, label: 'Abonnement', path: '/app/billing', color: goldColor, bg: `${goldColor}20` },
      { icon: <BookOpen size={20} />, label: 'Journal', path: '/app/journal', color: colors.primaryLight, bg: `${colors.primaryLight}15` },
      { icon: <MapPin size={20} />, label: 'Carte', path: '/app/map', color: colors.primary, bg: `${colors.primary}10` },
      { icon: <Bell size={20} />, label: 'Notifications', path: '/app/notifications', color: colors.accent || primaryColor, bg: `${colors.accent || primaryColor}20` },
    ];
  }

  if (role === 'aidant') {
    return [
      { icon: <ShoppingBag size={20} />, label: 'Commandes', path: '/app/orders', color: primaryColor, bg: `${primaryColor}12` },
      { icon: <History size={20} />, label: 'Historique', path: '/app/history', color: colors.primaryLight, bg: `${colors.primaryLight}15` },
      { icon: <MapPin size={20} />, label: 'Carte', path: '/app/map', color: colors.primary, bg: `${colors.primary}10` },
      { icon: <Bell size={20} />, label: 'Notifications', path: '/app/notifications', color: colors.accent || primaryColor, bg: `${colors.accent || primaryColor}20` },
    ];
  }

  if (role === 'admin' || role === 'coordinator') {
    return [
      { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/app/admin', color: primaryColor, bg: `${primaryColor}12` },
      { icon: <ClipboardList size={20} />, label: 'Candidatures', path: '/app/aidant-candidates', color: colors.accent || primaryColor, bg: `${colors.accent || primaryColor}18` },
      { icon: <Calendar size={20} />, label: 'Visites', path: '/app/visits', color: goldColor, bg: `${goldColor}20` },
      { icon: <FileCheck size={20} />, label: 'Rapports', path: '/app/admin/visits/validation', color: colors.primaryLight, bg: `${colors.primaryLight}15` },
      { icon: <ShoppingBag size={20} />, label: 'Commandes', path: '/app/orders', color: colors.accent || primaryColor, bg: `${colors.accent || primaryColor}20` },
      { icon: <CreditCard size={20} />, label: 'Paiements', path: '/app/admin-payments', color: goldColor, bg: `${goldColor}20` },
      { icon: <Award size={20} />, label: 'Souscriptions', path: '/app/admin-subscriptions', color: colors.primary, bg: `${colors.primary}12` },
      { icon: <Package size={20} />, label: 'Offres', path: '/app/offers', color: colors.accent || primaryColor, bg: `${colors.accent || primaryColor}20` },
      { icon: <Bell size={20} />, label: 'Notifications', path: '/app/admin-notifications', color: colors.primary, bg: `${colors.primary}10` },
      { icon: <MapPin size={20} />, label: 'Carte', path: '/app/map', color: colors.primaryLight, bg: `${colors.primaryLight}12` },
      { icon: <User size={20} />, label: 'Profil', path: '/app/profile', color: colors.gold, bg: `${colors.gold}20` },
    ];
  }

  return [];
};

export const MobileTabBar = ({ colors: propColors }: MobileTabBarProps) => {
  const location = useLocation();
  const { role } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const brand = useBranding();
  const colors = propColors || brand.colors;
  
  const [showMore, setShowMore] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const mainItems = getMainItems(role);
  const moreItems = getMoreItems(role, brand);

  useEffect(() => {
    if (showMore) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMore]);

  const handleLinkClick = () => {
    setShowMore(false);
  };

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const hasUnreadNotifications = unreadCount > 0;
  const isMoreActive = moreItems.some(item => isActive(item.path));

  return (
    <>
      {showMore && (
        <div 
          className="fixed inset-0 z-[45] bg-black/25 backdrop-blur-sm transition-opacity duration-300 ease-out animate-fadeIn" 
          onClick={() => setShowMore(false)} 
        />
      )}

      {/* ============================================================
          BOTTOM SHEET PLUS (MESSAGES ET CATALOGUE AIDANTS RETIRÉS)
          ============================================================ */}
      <div
        className={cn(
          /* ✅ CORRECTIF D'ARRIÈRE-PLAN : Fond beige/crème constant FCFAF6 (avec support dark mode) au lieu de transparent/dynamique [24] */
          "fixed left-4 right-4 z-[48] bg-[#FCFAF6] dark:bg-[#151c18] rounded-[2.5rem] border shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] p-6 bottom-24 origin-bottom",
          showMore 
            ? "scale-100 opacity-100 translate-y-0 blur-none pointer-events-auto" 
            : "scale-90 opacity-0 translate-y-4 blur-sm pointer-events-none"
        )}
        style={{
          borderColor: colors.primary + '20',
          boxShadow: '0 -10px 40px -15px rgba(0, 0, 0, 0.12), 0 15px 40px rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex items-center justify-between mb-5 border-b pb-3" style={{ borderColor: colors.primary + '15' }}>
          <div className="space-y-0.5">
            <h3 className="text-sm font-extrabold" style={{ color: colors.text }}>Plus d'outils</h3>
          </div>
          <button
            onClick={() => setShowMore(false)}
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center transition shadow-sm"
            style={{ color: colors.text + '80' }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3.5 max-h-[42vh] overflow-y-auto pr-1 py-1 scrollbar-none">
          {moreItems.map((item) => {
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={cn(
                  "flex flex-col items-center justify-center text-center p-4 rounded-3xl transition-all border",
                  active
                    ? "bg-white shadow-md font-bold"
                    : "bg-white/40 border-transparent hover:bg-gray-50/50"
                )}
                style={{
                  borderColor: active ? colors.primary : 'transparent',
                  color: active ? colors.text : colors.textLight,
                }}
              >
                {/* L'icône de l'outil et son fond restent magnifiquement dynamiques [24] */}
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2 transition-transform duration-200"
                  style={{ 
                    background: item.bg,
                    color: item.color 
                  }}
                >
                  {item.icon}
                </div>
                <span 
                  className={cn(
                    "text-[10px] tracking-tight line-clamp-1 leading-snug",
                    active ? "font-extrabold" : "font-medium"
                  )}
                  style={{ color: active ? colors.text : colors.textLight }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          FLOATING DOCK
          ============================================================ */}
      <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none flex justify-center">
        <div
          /* ✅ CORRECTIF D'ARRIÈRE-PLAN : Fond beige/crème constant FCFAF6 (avec support dark mode) au lieu de transparent/dynamique [24] */
          className="w-full max-w-lg bg-[#FCFAF6]/95 dark:bg-[#151c18]/95 border shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12)] rounded-[2rem] flex justify-around items-center py-2 px-3 pointer-events-auto"
          style={{
            borderColor: colors.primary + '20',
            boxShadow: '0 20px 40px -15px rgba(15,31,25,0.15), 0 0 1px 1px rgba(255,255,255,0.15) inset',
          }}
        >
          {mainItems.map((item) => {
            const active = isActive(item.path);
            const isHovered = hoveredPath === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                onMouseEnter={() => setHoveredPath(item.path)}
                onMouseLeave={() => setHoveredPath(null)}
                className="flex flex-col items-center justify-center min-w-[62px] transition-all relative py-1"
              >
                {/* L'icône de l'outil actif et son fond de surbrillance au survol (Hover) restent magnifiquement dynamiques [24, 30] */}
                <div
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ease-out",
                    active 
                      ? "text-white scale-105 shadow-md shadow-black/10" 
                      : ""
                  )}
                  style={{
                    backgroundColor: active 
                      ? colors.primary // ✅ S'accorde dynamiquement sur la couleur primaire du rôle [30]
                      : (isHovered ? colors.primary + '15' : 'transparent'), // ✅ S'accorde dynamiquement sur le hover du rôle [30]
                    color: active ? '#ffffff' : colors.textLight,
                  }}
                >
                  <div className="transition-transform duration-200">
                    {item.icon}
                  </div>
                </div>
                
                <span
                  className={cn(
                    "text-[9px] font-bold tracking-tight transition-all duration-200 mt-1",
                    active ? "opacity-100 font-extrabold" : "opacity-60"
                  )}
                  style={{ color: active ? colors.primary : colors.textLight }}
                >
                  {item.label}
                </span>

                {item.path === '/app' && unreadCount > 0 && (
                  <span
                    className="absolute top-1 right-3 min-w-4 h-4 px-1 text-[8px] text-white rounded-full flex items-center justify-center font-black animate-pulse shadow-sm"
                    style={{ background: '#DC2626' }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}

          {moreItems.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMore(!showMore)}
                className="flex flex-col items-center justify-center min-w-[62px] transition-all relative py-1"
              >
                {/* L'icône de l'outil d'ouverture "Plus" et son fond d'activation restent 100% dynamiques [24, 30] */}
                <div 
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ease-out",
                    showMore || isMoreActive
                      ? "text-white scale-105 shadow-md shadow-black/10"
                      : ""
                  )}
                  style={{
                    backgroundColor: showMore || isMoreActive ? colors.primary : 'transparent',
                    color: showMore || isMoreActive ? '#ffffff' : colors.textLight,
                  }}
                >
                  <div className={cn("transition-transform duration-300", showMore ? "rotate-90" : "")}>
                    {showMore ? <X size={18} /> : <Menu size={18} />}
                  </div>
                </div>
                
                <span
                  className={cn(
                    "text-[9px] font-bold tracking-tight transition-all duration-200 mt-1",
                    showMore || isMoreActive ? "opacity-100 font-extrabold" : "opacity-60"
                  )}
                  style={{ color: showMore || isMoreActive ? colors.primary : colors.textLight }}
                >
                  {showMore ? 'Fermer' : 'Plus'}
                </span>

                {hasUnreadNotifications && !showMore && (
                  <span
                    className="absolute top-1.5 right-4.5 w-1.5 h-1.5 rounded-full bg-red-500"
                    style={{ background: '#DC2626' }}
                  />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MobileTabBar;
