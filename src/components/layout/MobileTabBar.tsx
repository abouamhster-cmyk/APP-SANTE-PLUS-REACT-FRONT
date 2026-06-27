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
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useTerminology } from '@/hooks/useTerminology';

interface MobileTabBarProps {
  colors: any;
}

export const MobileTabBar = ({ colors }: MobileTabBarProps) => {
  const location = useLocation();
  const { role, profile } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  
  // ✅ Jargon dynamique
  const { list, isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

  // ✅ Items du menu mobile selon le rôle (max 5)
  const getMobileItems = () => {
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
        { icon: <User size={22} />, label: 'Profil', path: '/app/profile' },
      ];
    }

    // 🦸 AIDANT
    if (role === 'aidant') {
      return [
        ...base,
        { icon: <Calendar size={22} />, label: 'Missions', path: '/app/missions' },
        { icon: <ShoppingBag size={22} />, label: 'Commandes', path: '/app/orders' },
        { icon: <CreditCard size={22} />, label: 'Abonnement', path: '/app/billing' },
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

  const items = getMobileItems();

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
      {items.map((item) => {
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

            {/* ✅ Badge de notifications sur l'icône Accueil */}
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
    </div>
  );
};
