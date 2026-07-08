// 📁 src/components/layout/MobileTabBar.tsx
 
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
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
  FileText,
  LayoutDashboard,
  ShoppingBag,
  ChevronUp,
  X,
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

const getMoreItems = (role: string | null) => {
  if (role === 'family') {
    return [
      { icon: <UserCheck size={18} />, label: 'Aidants', path: '/app/aidants' },
      { icon: <MessageCircle size={18} />, label: 'Messages', path: '/app/messages' },
      { icon: <CreditCard size={18} />, label: 'Abonnement', path: '/app/billing' },
      { icon: <BookOpen size={18} />, label: 'Journal', path: '/app/journal' },
      { icon: <MapPin size={18} />, label: 'Carte', path: '/app/map' },
      { icon: <Hospital size={18} />, label: 'Sortie', path: '/app/discharge' },
      { icon: <Bell size={18} />, label: 'Notifications', path: '/app/notifications' },
    ];
  }

  if (role === 'aidant') {
    return [
      { icon: <ShoppingBag size={18} />, label: 'Commandes', path: '/app/orders' },
      { icon: <MessageCircle size={18} />, label: 'Messages', path: '/app/messages' },
      { icon: <History size={18} />, label: 'Historique', path: '/app/history' },
      { icon: <MapPin size={18} />, label: 'Carte', path: '/app/map' },
      { icon: <Bell size={18} />, label: 'Notifications', path: '/app/notifications' },
    ];
  }

  if (role === 'admin' || role === 'coordinator') {
    return [
      { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/app/admin' },
      { icon: <UserCheck size={18} />, label: 'Candidatures', path: '/app/aidant-candidates' },
      { icon: <Calendar size={18} />, label: 'Visites', path: '/app/visits' },
      { icon: <FileText size={18} />, label: 'Valider visites', path: '/app/admin/visits/validation' },
      { icon: <ShoppingBag size={18} />, label: 'Commandes', path: '/app/orders' },
      { icon: <CreditCard size={18} />, label: 'Paiements', path: '/app/admin-payments' },
      { icon: <Award size={18} />, label: 'Abonnements', path: '/app/admin-subscriptions' },
      { icon: <Package size={18} />, label: 'Offres', path: '/app/offers' },
      { icon: <Bell size={18} />, label: 'Notifications', path: '/app/admin-notifications' },
      { icon: <MapPin size={18} />, label: 'Carte', path: '/app/map' },
      { icon: <User size={18} />, label: 'Profil', path: '/app/profile' },
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
  const moreItems = getMoreItems(role);

  // ✅ Empêcher le scroll du body quand le menu "Plus" est ouvert
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
      {/* ============================================================
          FOND SOMBRE DERRIÈRE LE PANNEAU "PLUS" COULISSANT
          ============================================================ */}
      {showMore && (
        <div
          className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* ============================================================
          PANNEAU COULISSANT (BOTTOM SHEET) TOTALEMENT SCROLLABLE ET SÉCURISÉ
          ============================================================ */}
      <div
        className={cn(
          "fixed left-0 right-0 z-[48] bg-white dark:bg-[#17231d] rounded-t-[2.5rem] shadow-2xl border-t border-gray-100 dark:border-[#2c3f35] transition-all duration-300 ease-out pb-24 px-5 pt-6",
          showMore ? "bottom-0 translate-y-0" : "bottom-[-100%] translate-y-full"
        )}
        style={{
          boxShadow: '0 -15px 40px -10px rgba(0, 0, 0, 0.12)',
        }}
      >
        <div className="flex items-center justify-between mb-5 border-b pb-3 dark:border-[#2c3f35]">
          <div className="space-y-0.5">
            <h3 className="text-sm font-extrabold text-gray-800 dark:text-gray-100">Plus de services</h3>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Accès rapide</p>
          </div>
          <button
            onClick={() => setShowMore(false)}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#24362d] flex items-center justify-center text-gray-500 hover:text-gray-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* ✅ GRILLE DES ACTIONS COMPLÈTEMENT SCROLLABLE EN CAS D'EXCÈS DE COMPOSANTS */}
        <div className="grid grid-cols-3 gap-3 max-h-[48vh] overflow-y-auto scrollbar-none pr-1 py-1">
          {moreItems.map((item) => {
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={cn(
                  "flex flex-col items-center justify-center text-center p-3.5 rounded-2xl transition-all border",
                  active
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 font-bold"
                    : "bg-gray-50 dark:bg-[#1d2d25] border-transparent hover:bg-gray-100 dark:hover:bg-[#24362d] text-gray-600 dark:text-gray-300"
                )}
              >
                <div
                  className="mb-2 transition-transform duration-200"
                  style={{ color: active ? colors.primary : '#9CA3AF' }}
                >
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold tracking-tight line-clamp-1 leading-snug">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          MAIN TAB BAR (DOCK STYLE GLASSMORPHIC)
          ============================================================ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#17231d]/80 backdrop-blur-lg border-t border-gray-100/50 dark:border-[#2c3f35]/50 shadow-2xl flex justify-around items-center py-2 px-3"
        style={{
          paddingBottom: 'calc(max(6px, env(safe-area-inset-bottom)) + 2px)',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.03)',
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
              className="flex flex-col items-center justify-center min-w-[54px] transition-all relative py-1 px-1.5"
            >
              {/* Point lumineux actif au-dessus de l'icône */}
              <div 
                className={cn(
                  "absolute top-0 w-1.5 h-1.5 rounded-full bg-emerald-500 scale-0 transition-transform duration-300 ease-out",
                  active ? "scale-100" : ""
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
                  "text-[9px] font-black tracking-tight transition-all duration-200",
                  active ? "opacity-100 font-extrabold" : "opacity-55"
                )}
                style={{ color: active ? colors.primary : '#9CA3AF' }}
              >
                {item.label}
              </span>

              {/* Indicateur de notification sur l'Accueil */}
              {item.path === '/app' && unreadCount > 0 && (
                <span
                  className="absolute top-1 right-2 min-w-4.5 h-4 px-1 text-[8px] text-white rounded-full flex items-center justify-center font-black animate-pulse"
                  style={{ background: '#DC2626' }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}

        {/* CONTROLE DU MENU PLUS */}
        {moreItems.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowMore(!showMore)}
              className="flex flex-col items-center justify-center min-w-[54px] transition-all relative py-1 px-1.5"
            >
              {/* Petit chevron dynamique pour l'effet d'ouverture */}
              <div 
                className={cn(
                  "absolute top-0 w-1.5 h-1.5 rounded-full bg-emerald-500 scale-0 transition-transform duration-300 ease-out",
                  showMore || isMoreActive ? "scale-100" : ""
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
                {showMore ? <ChevronUp size={20} /> : <Menu size={20} />}
              </div>
              <span
                className={cn(
                  "text-[9px] font-black tracking-tight transition-all duration-200",
                  showMore || isMoreActive ? "opacity-100 font-extrabold" : "opacity-55"
                )}
                style={{ color: showMore || isMoreActive ? colors.primary : '#9CA3AF' }}
              >
                Plus
              </span>

              {/* Indicateur rouge de notification sur "Plus" */}
              {hasUnreadNotifications && !showMore && (
                <span
                  className="absolute top-1.5 right-3 w-1.5 h-1.5 rounded-full"
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
