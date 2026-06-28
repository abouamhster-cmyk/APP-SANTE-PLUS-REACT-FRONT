// 📁 src/components/layout/MobileTabBar.tsx

import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  ShoppingBag,
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
  Home,
  FileText,
  Handshake,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useState } from 'react';

interface MobileTabBarProps {
  colors: any;
}

// =============================================
// 5 ÉLÉMENTS MAX PAR RÔLE
// =============================================

const getMainItems = (role: string | null) => {
  const base = [
    { icon: <Home size={22} />, label: 'Accueil', path: '/app' },
  ];

  // 👨‍👩‍👦 FAMILLE (5 items max)
  if (role === 'family') {
    return [
      ...base,
      { icon: <Users size={22} />, label: 'Proches', path: '/app/patients' },
      { icon: <Calendar size={22} />, label: 'Visites', path: '/app/visits' },
      { icon: <ShoppingBag size={22} />, label: 'Commandes', path: '/app/orders' },
      { icon: <User size={22} />, label: 'Profil', path: '/app/profile' },
    ];
  }

  // 🦸 AIDANT (5 items max)
  if (role === 'aidant') {
    return [
      ...base,
      { icon: <Briefcase size={22} />, label: 'Missions', path: '/app/missions' },
      { icon: <Calendar size={22} />, label: 'Planning', path: '/app/planning' },
      { icon: <ShoppingBag size={22} />, label: 'Commandes', path: '/app/orders' },
      { icon: <User size={22} />, label: 'Profil', path: '/app/profile' },
    ];
  }

  // 👔 ADMIN / COORDINATEUR (5 items max)
  if (role === 'admin' || role === 'coordinator') {
    return [
      ...base,
      { icon: <ClipboardList size={22} />, label: 'Inscriptions', path: '/app/registrations' },
      { icon: <UserCheck size={22} />, label: 'Aidants', path: '/app/aidants' },
      { icon: <Users size={22} />, label: 'Utilisateurs', path: '/app/users' },
      { icon: <Settings size={22} />, label: 'Paramètres', path: '/app/settings' },
    ];
  }

  return base;
};

// =============================================
// MENU "PLUS" - TOUS LES AUTRES (déplié dans le menu)
// =============================================

const getMoreItems = (role: string | null) => {
  // 👨‍👩‍👦 FAMILLE
  if (role === 'family') {
    return [
      { icon: <MessageCircle size={18} />, label: 'Messages', path: '/app/messages' },
      { icon: <CreditCard size={18} />, label: 'Abonnement', path: '/app/billing' },
      { icon: <BookOpen size={18} />, label: 'Journal', path: '/app/journal' },
      { icon: <MapPin size={18} />, label: 'Carte', path: '/app/map' },
      { icon: <Hospital size={18} />, label: 'Sortie', path: '/app/discharge' },
      { icon: <Bell size={18} />, label: 'Notifications', path: '/app/notifications' },
    ];
  }

  // 🦸 AIDANT
  if (role === 'aidant') {
    return [
      { icon: <MessageCircle size={18} />, label: 'Messages', path: '/app/messages' },
      { icon: <History size={18} />, label: 'Historique', path: '/app/history' },
      { icon: <CreditCard size={18} />, label: 'Abonnement', path: '/app/billing' },
      { icon: <MapPin size={18} />, label: 'Carte', path: '/app/map' },
      { icon: <Bell size={18} />, label: 'Notifications', path: '/app/notifications' },
    ];
  }

  // 👔 ADMIN / COORDINATEUR
  if (role === 'admin' || role === 'coordinator') {
    return [
      { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/app/admin' },
      { icon: <UserCheck size={18} />, label: 'Candidatures', path: '/app/aidant-candidates' },
      { icon: <Handshake size={18} />, label: 'Assigner', path: '/app/assign-aidants' },
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

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

export const MobileTabBar = ({ colors }: MobileTabBarProps) => {
  const location = useLocation();
  const { role } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [showMore, setShowMore] = useState(false);

  const mainItems = getMainItems(role);
  const moreItems = getMoreItems(role);

  // ✅ Vérifier si le chemin actuel est dans le menu "Plus"
  const isInMoreItems = (path: string) => {
    return moreItems.some(item => item.path === path);
  };

  // ✅ Si la page actuelle est dans "Plus", fermer le menu
  const handleLinkClick = () => {
    setShowMore(false);
  };

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  // ✅ Compter les notifications pour l'icône "Plus"
  const hasUnreadNotifications = unreadCount > 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg flex justify-around items-center py-1 px-1"
      style={{
        borderColor: colors.primary + '20',
        paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
      }}
    >
      {/* ✅ 5 ITEMS PRINCIPAUX */}
      {mainItems.map((item) => {
        const active = isActive(item.path);

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={handleLinkClick}
            className="flex flex-col items-center justify-center py-1 px-2 min-w-[48px] transition-all relative"
          >
            <div
              className={`transition-all ${active ? 'scale-110' : ''}`}
              style={{ color: active ? colors.primary : '#9CA3AF' }}
            >
              {item.icon}
            </div>
            <span
              className={`text-[9px] font-medium mt-0.5 transition-all ${
                active ? 'opacity-100' : 'opacity-60'
              }`}
              style={{ color: active ? colors.primary : '#9CA3AF' }}
            >
              {item.label}
            </span>

            {/* Notification sur l'icône Accueil */}
            {item.path === '/app' && unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 text-[9px] text-white rounded-full flex items-center justify-center"
                style={{ background: colors.primary }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        );
      })}

      {/* ✅ BOUTON "PLUS" avec indicateur de notifications */}
      {moreItems.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex flex-col items-center justify-center py-1 px-2 min-w-[48px] transition-all relative"
          >
            <div style={{ color: showMore ? colors.primary : '#9CA3AF' }}>
              <Menu size={22} />
            </div>
            <span
              className="text-[9px] font-medium mt-0.5"
              style={{ color: showMore ? colors.primary : '#9CA3AF' }}
            >
              Plus
            </span>

            {/* ✅ Indicateur de notification sur "Plus" */}
            {hasUnreadNotifications && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                style={{ background: colors.primary }}
              />
            )}
          </button>

          {/* ✅ MENU DÉROULANT "PLUS" */}
          {showMore && (
            <div
              className="absolute bottom-14 right-0 bg-white rounded-2xl shadow-xl border p-2 w-56 max-h-64 overflow-y-auto"
              style={{ borderColor: colors.border }}
            >
              {moreItems.map((item) => {
                const active = isActive(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                      active
                        ? 'text-[--color-primary] bg-[--color-primary]/10'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    style={{
                      color: active ? colors.primary : undefined,
                      background: active ? colors.primary + '10' : undefined,
                    }}
                  >
                    <span style={{ color: active ? colors.primary : '#6B7280' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {active && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full"
                        style={{ background: colors.primary }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MobileTabBar;
