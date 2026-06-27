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
  Home,
  History,
  Award,
  FileText,
  Hospital,
  BookOpen,
  Menu,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useTerminology } from '@/hooks/useTerminology';
import { useState } from 'react';

interface MobileTabBarProps {
  colors: any;
}

export const MobileTabBar = ({ colors }: MobileTabBarProps) => {
  const location = useLocation();
  const { role, profile } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { list, isFamily, isAidant, isAdminOrCoordinator } = useTerminology();
  const [showMore, setShowMore] = useState(false);

  // ✅ Items principaux (5 max) - Les plus utilisés
  const getMainItems = () => {
    const base = [
      { icon: <LayoutDashboard size={22} />, label: 'Accueil', path: '/app' },
    ];

    // 👨‍👩‍👦 FAMILLE
    if (role === 'family') {
      return [
        ...base,
        { icon: <Users size={22} />, label: list, path: '/app/patients' },
        { icon: <Calendar size={22} />, label: 'Visites', path: '/app/visits' },
        { icon: <ShoppingBag size={22} />, label: 'Commandes', path: '/app/orders' },
        { icon: <MessageCircle size={22} />, label: 'Messages', path: '/app/messages' },
      ];
    }

    // 🦸 AIDANT
    if (role === 'aidant') {
      return [
        ...base,
        { icon: <Calendar size={22} />, label: 'Missions', path: '/app/missions' },
        { icon: <ShoppingBag size={22} />, label: 'Commandes', path: '/app/orders' },
        { icon: <MessageCircle size={22} />, label: 'Messages', path: '/app/messages' },
        { icon: <User size={22} />, label: 'Profil', path: '/app/profile' },
      ];
    }

    // 👔 COORDINATEUR / ADMIN
    if (role === 'coordinator' || role === 'admin') {
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

  // ✅ Menu "Plus" pour accéder aux autres pages
  const getMoreItems = () => {
    // 👨‍👩‍👦 FAMILLE
    if (role === 'family') {
      return [
        { icon: <CreditCard size={18} />, label: 'Abonnement', path: '/app/billing' },
        { icon: <BookOpen size={18} />, label: 'Journal', path: '/app/journal' },
        { icon: <MapPin size={18} />, label: 'Carte', path: '/app/map' },
        { icon: <Hospital size={18} />, label: 'Sortie hôpital', path: '/app/discharge' },
        { icon: <User size={18} />, label: 'Profil', path: '/app/profile' },
      ];
    }

    // 🦸 AIDANT
    if (role === 'aidant') {
      return [
        { icon: <Briefcase size={18} />, label: 'Planning', path: '/app/planning' },
        { icon: <History size={18} />, label: 'Historique', path: '/app/history' },
        { icon: <CreditCard size={18} />, label: 'Abonnement', path: '/app/billing' },
        { icon: <MapPin size={18} />, label: 'Carte', path: '/app/map' },
      ];
    }

    // 👔 COORDINATEUR / ADMIN
    if (role === 'coordinator' || role === 'admin') {
      return [
        { icon: <LayoutDashboard size={18} />, label: 'Dashboard Admin', path: '/app/admin' },
        { icon: <UserCheck size={18} />, label: 'Candidatures Aidants', path: '/app/aidant-candidates' },
        { icon: <Calendar size={18} />, label: 'Visites', path: '/app/visits' },
        { icon: <ShoppingBag size={18} />, label: 'Commandes', path: '/app/orders' },
        { icon: <CreditCard size={18} />, label: 'Paiements', path: '/app/admin-payments' },
        { icon: <Award size={18} />, label: 'Abonnements', path: '/app/admin-subscriptions' },
        { icon: <Bell size={18} />, label: 'Notifications', path: '/app/admin-notifications' },
        { icon: <ShoppingBag size={18} />, label: 'Offres', path: '/app/offers' },
        { icon: <MapPin size={18} />, label: 'Carte', path: '/app/map' },
        { icon: <User size={18} />, label: 'Profil', path: '/app/profile' },
      ];
    }

    return [];
  };

  const mainItems = getMainItems();
  const moreItems = getMoreItems();

  // ✅ Vérifier si un élément est actif
  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg flex justify-around items-center py-1 px-1"
      style={{
        borderColor: colors.primary + '20',
        paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
      }}
    >
      {mainItems.map((item) => {
        const active = isActive(item.path);

        return (
          <Link
            key={item.path}
            to={item.path}
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

            {/* Badge notifications */}
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

      {/* ✅ Bouton "Plus" si d'autres menus existent */}
      {moreItems.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex flex-col items-center justify-center py-1 px-2 min-w-[48px] transition-all"
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
          </button>

          {/* ✅ Menu déroulant "Plus" */}
          {showMore && (
            <div
              className="absolute bottom-14 right-0 bg-white rounded-2xl shadow-xl border p-2 w-48 max-h-60 overflow-y-auto"
              style={{ borderColor: colors.border }}
            >
              {moreItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setShowMore(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                    isActive(item.path)
                      ? 'text-[--color-primary] bg-[--color-primary]/10'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={{
                    color: isActive(item.path) ? colors.primary : undefined,
                    background: isActive(item.path) ? colors.primary + '10' : undefined,
                  }}
                >
                  <span style={{ color: isActive(item.path) ? colors.primary : '#6B7280' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
