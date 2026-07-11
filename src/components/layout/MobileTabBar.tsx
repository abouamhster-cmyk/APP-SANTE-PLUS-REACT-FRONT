// 📁 src/components/layout/MobileTabBar.tsx
// ✅ BARRE D'ONGLETS MOBILE COMPACTE AVEC TOUTES LES ICÔNES DU MENU RESTAURÉES ET COLORIÉES

import { Link, useLocation } from 'react-router-dom';
import { Home, Users, FileText, Calendar, User, Settings, ClipboardList, UserCheck, Briefcase, CreditCard, Bell, MessageCircle, MapPin, History, Award, Package, Menu, BookOpen, Hospital, X, ChevronUp, LayoutDashboard, ShoppingBag, } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useState, useEffect } from 'react';
import { cn } from '@/utils/helpers';

interface MobileTabBarProps {
  colors: any;
}

const getMainItems = (role: string | null) => {
  const base = [
    { icon: <Home size={18} />, label: 'Accueil', path: '/app' },
  ];

  if (role === 'family') {
    return [
      ...base,
      { icon: <Users size={18} />, label: 'Proches', path: '/app/patients' },
      { icon: <Calendar size={18} />, label: 'Visites', path: '/app/visits' },
      { icon: <User size={18} />, label: 'Profil', path: '/app/profile' },
    ];
  }

  if (role === 'aidant') {
    return [
      ...base,
      { icon: <Briefcase size={18} />, label: 'Missions', path: '/app/missions' },
      { icon: <Calendar size={18} />, label: 'Planning', path: '/app/planning' },
      { icon: <User size={18} />, label: 'Profil', path: '/app/profile' },
    ];
  }

  if (role === 'admin' || role === 'coordinator') {
    return [
      ...base,
      { icon: <ClipboardList size={18} />, label: 'Inscriptions', path: '/app/registrations' },
      { icon: <Users size={18} />, label: 'Bénéficiaires', path: '/app/patients' },
      { icon: <Settings size={18} />, label: 'Paramètres', path: '/app/settings' },
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
      { icon: <UserCheck size={16} />, label: 'Aidants', path: '/app/aidants', color: primaryColor, bg: `${primaryColor}12` },
      { icon: <MessageCircle size={16} />, label: 'Messages', path: '/app/messages', color: '#3B82F6', bg: '#3B82F612' },
      { icon: <CreditCard size={16} />, label: 'Abonnement', path: '/app/billing', color: '#10B981', bg: '#10B98112' },
      { icon: <ClipboardList size={16} />, label: 'Journal', path: '/app/journal', color: '#8B5CF6', bg: '#8B5CF612' },
      { icon: <MapPin size={16} />, label: 'Carte', path: '/app/map', color: '#EF4444', bg: '#EF444412' },
      { icon: <Hospital size={16} />, label: 'Sortie', path: '/app/discharge', color: '#EC4899', bg: '#EC489912' },
      { icon: <Bell size={16} />, label: 'Notifications', path: '/app/notifications', color: '#F59E0B', bg: '#F59E0B12' },
    ];
  }

  if (role === 'aidant') {
    return [
      { icon: <ShoppingBag size={16} />, label: 'Commandes', path: '/app/orders', color: primaryColor, bg: `${primaryColor}12` },
      { icon: <MessageCircle size={16} />, label: 'Messages', path: '/app/messages', color: '#3B82F6', bg: '#3B82F612' },
      { icon: <History size={16} />, label: 'Historique', path: '/app/history', color: '#8B5CF6', bg: '#8B5CF612' },
      { icon: <MapPin size={16} />, label: 'Carte', path: '/app/map', color: '#EF4444', bg: '#EF444412' },
      { icon: <Bell size={16} />, label: 'Notifications', path: '/app/notifications', color: '#F59E0B', bg: '#F59E0B12' },
    ];
  }

  if (role === 'admin' || role === 'coordinator') {
    return [
      { icon: <LayoutDashboard size={16} />, label: 'Dashboard', path: '/app/admin', color: primaryColor, bg: `${primaryColor}12` },
      { icon: <UserCheck size={16} />, label: 'Candidatures', path: '/app/aidant-candidates', color: '#3B82F6', bg: '#3B82F612' },
      { icon: <Calendar size={16} />, label: 'Visites', path: '/app/visits', color: '#10B981', bg: '#10B98112' },
      { icon: <FileText size={16} />, label: 'Rapports', path: '/app/admin/visits/validation', color: '#8B5CF6', bg: '#8B5CF612' },
      { icon: <ShoppingBag size={16} />, label: 'Commandes', path: '/app/orders', color: '#F59E0B', bg: '#F59E0B12' },
      { icon: <CreditCard size={16} />, label: 'Paiements', path: '/app/admin-payments', color: '#EC4899', bg: '#EC489912' },
      { icon: <Package size={16} />, label: 'Souscriptions', path: '/app/admin-subscriptions', color: '#6366F1', bg: '#6366F112' },
      { icon: <BookOpen size={16} />, label: 'Offres', path: '/app/offers', color: '#14B8A6', bg: '#14B8A612' },
      { icon: <Bell size={16} />, label: 'Notifications', path: '/app/admin-notifications', color: '#EF4444', bg: '#EF444412' },
      { icon: <MapPin size={16} />, label: 'Carte', path: '/app/map', color: '#06B6D4', bg: '#06B6D412' },
      { icon: <User size={16} />, label: 'Profil', path: '/app/profile', color: '#84CC16', bg: '#84CC1612' },
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
          className="fixed inset-0 bg-black/30 backdrop-blur-md z-40 animate-fadeIn"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* BOTTOM SHEET PLUS */}
      <div 
        className={cn(
          "fixed left-0 right-0 bg-white/95 dark:bg-[#111a15]/95 backdrop-blur-xl border-t z-50 px-5 pt-6 pb-10 rounded-t-[2.5rem] transition-all duration-300 ease-out shadow-[0_-12px_40px_rgba(0,0,0,0.12)]",
          showMore ? "bottom-0" : "-bottom-full"
        )}
        style={{ borderColor: colors.primary + '15' }}
      >
        <div className="w-12 h-1 bg-gray-200 dark:bg-[#2c3f35] rounded-full mx-auto mb-6 shrink-0" />
        
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

      {/* FLOATING DOCK TACTILE */}
      <div 
        className="fixed bottom-4 left-4 right-4 z-40 bg-white/70 dark:bg-[#111a15]/70 backdrop-blur-xl rounded-full px-3.5 py-2.5 flex items-center justify-around border border-gray-100/50 dark:border-gray-800/40 shadow-[0_12px_32px_rgba(0,0,0,0.08)] max-w-md mx-auto"
        style={{ borderColor: colors.primary + '10' }}
      >
        {mainItems.map((item) => {
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleLinkClick}
              className="flex flex-col items-center justify-center min-w-[62px] transition-all relative py-1"
            >
              {/* Icône enveloppée dans un cercle actif de couleur du rôle */}
              <div
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ease-out",
                  active 
                    ? "text-white scale-105 shadow-md shadow-black/10" 
                    : "text-gray-400 dark:text-gray-500 hover:bg-gray-100/50 dark:hover:bg-gray-800/40"
                )}
                style={{
                  backgroundColor: active ? colors.primary : 'transparent',
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
                style={{ color: active ? colors.primary : '#9CA3AF' }}
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

        {/* BOUTON PLUS */}
        {moreItems.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowMore(!showMore)}
              className="flex flex-col items-center justify-center min-w-[62px] transition-all relative py-1"
            >
              <div 
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ease-out",
                  showMore || isMoreActive
                    ? "text-white scale-105 shadow-md shadow-black/10"
                    : "text-gray-400 dark:text-gray-500 hover:bg-gray-100/50 dark:hover:bg-gray-800/40"
                )}
                style={{
                  backgroundColor: showMore || isMoreActive ? colors.primary : 'transparent',
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
                style={{ color: showMore || isMoreActive ? colors.primary : '#9CA3AF' }}
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
    </>
  );
};

export default MobileTabBar;
