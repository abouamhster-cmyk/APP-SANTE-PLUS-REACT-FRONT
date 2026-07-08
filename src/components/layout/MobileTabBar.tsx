// 📁 src/components/layout/MobileTabBar.tsx
 
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  FileText,
  Calendar,
  User,
  Settings,
  ClipboardList,
  UserCheck,
  Briefcase,
  CreditCard,
  Bell,
  MessageCircle,
  MapPin,
  History,
  Award,
  Package,
  Menu,
  BookOpen,
  Hospital,
  X,
  ChevronUp,
  LayoutDashboard,
  ShoppingBag,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useState, useEffect } from 'react';
import { cn } from '@/utils/helpers';

interface MobileTabBarProps {
  colors: any;
}

const getMainItems = (role: string | null) => {
  const base = [
    { icon: <Home size={22} />, label: 'Accueil', path: '/app' },
  ];

  if (role === 'family') {
    return [
      ...base,
      { icon: <Users size={22} />, label: 'Proches', path: '/app/patients' },
      { icon: <Calendar size={22} />, label: 'Visites', path: '/app/visits' },
      { icon: <User size={22} />, label: 'Profil', path: '/app/profile' },
    ];
  }

  if (role === 'aidant') {
    return [
      ...base,
      { icon: <Briefcase size={22} />, label: 'Missions', path: '/app/missions' },
      { icon: <Calendar size={22} />, label: 'Planning', path: '/app/planning' },
      { icon: <User size={22} />, label: 'Profil', path: '/app/profile' },
    ];
  }

  if (role === 'admin' || role === 'coordinator') {
    return [
      ...base,
      { icon: <ClipboardList size={22} />, label: 'Inscriptions', path: '/app/registrations' },
      { icon: <Users size={22} />, label: 'Bénéficiaires', path: '/app/patients' },
      { icon: <Settings size={22} />, label: 'Paramètres', path: '/app/settings' },
    ];
  }

  return base;
};

// ============================================================
// ÉLÉMENTS DU MENU PLUS AVEC COULEURS COMPATIBLES DU BRANDING
// ============================================================
const getMoreItems = (role: string | null, colors: any) => {
  const primaryColor = colors.primary;

  if (role === 'family') {
    return [
      { icon: <UserCheck size={18} />, label: 'Aidants', path: '/app/aidants', color: primaryColor, bg: `${primaryColor}12` },
      { icon: <MessageCircle size={18} />, label: 'Messages', path: '/app/messages', color: '#3B82F6', bg: '#3B82F612' },
      { icon: <CreditCard size={18} />, label: 'Abonnement', path: '/app/billing', color: '#10B981', bg: '#10B98112' },
      { icon: <BookOpen size={18} />, label: 'Journal', path: '/app/journal', color: '#8B5CF6', bg: '#8B5CF612' },
      { icon: <MapPin size={18} />, label: 'Carte', path: '/app/map', color: '#EF4444', bg: '#EF444412' },
      { icon: <Hospital size={18} />, label: 'Sortie', path: '/app/discharge', color: '#EC4899', bg: '#EC489912' },
      { icon: <Bell size={18} />, label: 'Notifications', path: '/app/notifications', color: '#F59E0B', bg: '#F59E0B12' },
    ];
  }

  if (role === 'aidant') {
    return [
      { icon: <ShoppingBag size={18} />, label: 'Commandes', path: '/app/orders', color: primaryColor, bg: `${primaryColor}12` },
      { icon: <MessageCircle size={18} />, label: 'Messages', path: '/app/messages', color: '#3B82F6', bg: '#3B82F612' },
      { icon: <History size={18} />, label: 'Historique', path: '/app/history', color: '#8B5CF6', bg: '#8B5CF612' },
      { icon: <MapPin size={18} />, label: 'Carte', path: '/app/map', color: '#EF4444', bg: '#EF444412' },
      { icon: <Bell size={18} />, label: 'Notifications', path: '/app/notifications', color: '#F59E0B', bg: '#F59E0B12' },
    ];
  }

  if (role === 'admin' || role === 'coordinator') {
    return [
      { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/app/admin', color: primaryColor, bg: `${primaryColor}12` },
      { icon: <UserCheck size={18} />, label: 'Candidatures', path: '/app/aidant-candidates', color: '#3B82F6', bg: '#3B82F612' },
      { icon: <Calendar size={18} />, label: 'Visites', path: '/app/visits', color: '#10B981', bg: '#10B98112' },
      { icon: <FileText size={18} />, label: 'Rapports', path: '/app/admin/visits/validation', color: '#8B5CF6', bg: '#8B5CF612' },
      { icon: <ShoppingBag size={18} />, label: 'Commandes', path: '/app/orders', color: '#F59E0B', bg: '#F59E0B12' },
      { icon: <CreditCard size={18} />, label: 'Paiements', path: '/app/admin-payments', color: '#EC4899', bg: '#EC489912' },
      { icon: <Award size={18} />, label: 'Souscriptions', path: '/app/admin-subscriptions', color: '#6366F1', bg: '#6366F112' },
      { icon: <Package size={18} />, label: 'Offres', path: '/app/offers', color: '#14B8A6', bg: '#14B8A612' },
      { icon: <Bell size={18} />, label: 'Notifications', path: '/app/admin-notifications', color: '#EF4444', bg: '#EF444412' },
      { icon: <MapPin size={18} />, label: 'Carte', path: '/app/map', color: '#06B6D4', bg: '#06B6D412' },
      { icon: <User size={18} />, label: 'Profil', path: '/app/profile', color: '#84CC16', bg: '#84CC1612' },
    ];
  }

  return [];
};

export const MobileTabBar = ({ colors }: MobileTabBarProps) => {
  const location = useLocation();
  const { role } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [showMore, setShowMore] = useState(false);

  const mainItems = getMainItems(role);
  const moreItems = getMoreItems(role, colors);

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
      {/* Fond flouté sombre derrière le BottomSheet */}
      {showMore && (
        <div
          className="fixed inset-0 z-[45] bg-black/30 backdrop-blur-md transition-opacity duration-300 animate-fadeIn"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* ============================================================
          BOTTOM SHEET PLUS (Totalement arrondi, scrollable, avec icônes colorées)
          ============================================================ */}
      <div
        className={cn(
          "fixed left-4 right-4 z-[48] bg-white/95 dark:bg-[#121c16]/95 backdrop-blur-xl rounded-[2.5rem] border border-gray-100/50 dark:border-[#2c3f35]/50 shadow-2xl transition-all duration-300 ease-out p-6",
          showMore ? "bottom-24 translate-y-0 opacity-100" : "bottom-[-100%] translate-y-full opacity-0 pointer-events-none"
        )}
        style={{
          boxShadow: '0 -10px 40px -15px rgba(0, 0, 0, 0.15), 0 15px 40px rgba(0,0,0,0.1)',
        }}
      >
        <div className="flex items-center justify-between mb-5 border-b pb-3.5 dark:border-[#2c3f35]">
          <div className="space-y-0.5">
            <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-100">Plus d'outils</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Services et utilitaires</p>
          </div>
          <button
            onClick={() => setShowMore(false)}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#24362d] flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-100 transition shadow-sm"
          >
            <X size={16} />
          </button>
        </div>

        {/* Grille scrollable sécurisée et colorée */}
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
                    ? "bg-white dark:bg-[#1d2d25] border-gray-100 dark:border-[#2c3f35] shadow-md font-bold"
                    : "bg-gray-50/50 dark:bg-[#111a15]/30 border-transparent hover:bg-gray-50 dark:hover:bg-[#1c2a21]/50 text-gray-600 dark:text-gray-300"
                )}
                style={{
                  borderColor: active ? colors.primary : undefined,
                }}
              >
                {/* Icône avec couleur branding et rond de fond translucide */}
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
                    active ? "text-gray-800 dark:text-white font-extrabold" : "text-gray-600 dark:text-gray-300 font-medium"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          DOCK GLOBAL "FLOATING ISLAND" GLASSMORPHISM (Arrondi, flottant, transparent)
          ============================================================ */}
      <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none flex justify-center">
        <div
          className="w-full max-w-lg bg-white/75 dark:bg-[#121c16]/75 backdrop-blur-xl border border-white/20 dark:border-[#2c3f35]/20 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.15)] rounded-[2rem] flex justify-around items-center py-2.5 px-3 pointer-events-auto"
          style={{
            boxShadow: '0 20px 40px -15px rgba(15,31,25,0.2), 0 0 1px 1px rgba(255,255,255,0.2) inset',
          }}
        >
          {/* BOUTONS PRINCIPAUX */}
          {mainItems.map((item) => {
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className="flex flex-col items-center justify-center min-w-[56px] transition-all relative py-1 px-1"
              >
                {/* Petite capsule lumineuse dynamique active */}
                <div 
                  className={cn(
                    "absolute -top-1 w-5 h-1 rounded-full bg-emerald-500 scale-x-0 transition-transform duration-300 ease-out",
                    active ? "scale-x-100" : ""
                  )}
                  style={{ backgroundColor: colors.primary }}
                />

                <div
                  className={cn(
                    "transition-all duration-300 ease-in-out py-0.5",
                    active ? "scale-110 -translate-y-0.5" : "scale-100 text-gray-400"
                  )}
                  style={{ color: active ? colors.primary : '#9CA3AF' }}
                >
                  {item.icon}
                </div>
                
                <span
                  className={cn(
                    "text-[9px] font-black tracking-tight transition-all duration-200 mt-0.5",
                    active ? "opacity-100 font-extrabold" : "opacity-55"
                  )}
                  style={{ color: active ? colors.primary : '#9CA3AF' }}
                >
                  {item.label}
                </span>

                {/* Indicateur de notifications rouge */}
                {item.path === '/app' && unreadCount > 0 && (
                  <span
                    className="absolute top-0 right-1.5 min-w-4.5 h-4 px-1 text-[8px] text-white rounded-full flex items-center justify-center font-black animate-pulse"
                    style={{ background: '#DC2626' }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}

          {/* CONTROLLER DU MENU PLUS */}
          {moreItems.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMore(!showMore)}
                className="flex flex-col items-center justify-center min-w-[56px] transition-all relative py-1 px-1"
              >
                <div 
                  className={cn(
                    "absolute -top-1 w-5 h-1 rounded-full bg-emerald-500 scale-x-0 transition-transform duration-300 ease-out",
                    showMore || isMoreActive ? "scale-x-100" : ""
                  )}
                  style={{ backgroundColor: colors.primary }}
                />

                <div 
                  className={cn(
                    "transition-all duration-300 ease-in-out py-0.5",
                    showMore || isMoreActive ? "scale-110 -translate-y-0.5 rotate-180" : "scale-100 text-gray-400"
                  )}
                  style={{ color: showMore || isMoreActive ? colors.primary : '#9CA3AF' }}
                >
                  {showMore ? <X size={20} /> : <Menu size={20} />}
                </div>
                <span
                  className={cn(
                    "text-[9px] font-black tracking-tight transition-all duration-200 mt-0.5",
                    showMore || isMoreActive ? "opacity-100 font-extrabold" : "opacity-55"
                  )}
                  style={{ color: showMore || isMoreActive ? colors.primary : '#9CA3AF' }}
                >
                  {showMore ? 'Fermer' : 'Plus'}
                </span>

                {/* Bulle de notifications sur le "Plus" */}
                {hasUnreadNotifications && !showMore && (
                  <span
                    className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-red-500"
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
