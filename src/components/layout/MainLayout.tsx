// 📁 src/features/layout/MainLayout.tsx
 
import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  User, LogOut, Settings, Users, Calendar, ShoppingBag, LayoutDashboard,
  Briefcase, MapPin, ClipboardList, CreditCard, History as HistoryIcon,
  BookOpen, Home, Shield, UserCog, Package,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useBranding } from '@/hooks/useBranding';
import { cn, getGreeting } from '@/utils/helpers';
import { ReminderBanner } from '@/components/reminders/ReminderBanner';
import { MobileTabBar } from './MobileTabBar';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { Logo } from '@/components/ui/Logo';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, role, logout } = useAuthStore();
  const { fetchNotifications, subscribe, unsubscribe } = useNotificationStore();
  const brand = useBranding();
  const colors = brand.colors;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!profile) return;
    fetchNotifications();
    subscribe();
    return () => unsubscribe();
  }, [profile, fetchNotifications, subscribe, unsubscribe]);

  const navItems = useMemo(() => {
    const allItems = [
      { icon: <Home size={20} />, label: "Mon Espace d'Accueil", path: '/app', roles: ['family', 'aidant', 'admin', 'coordinator'] },
      { icon: <LayoutDashboard size={20} />, label: "Admin", path: '/app/admin', roles: ['admin', 'coordinator'] },
      { icon: <ClipboardList size={20} />, label: "Inscriptions", path: '/app/registrations', roles: ['admin', 'coordinator'] },
      { icon: <Users size={20} />, label: 'Bénéficiaires', path: '/app/patients', roles: ['family', 'admin', 'coordinator'] },
      { icon: <Briefcase size={20} />, label: "Missions", path: '/app/missions', roles: ['aidant'] },
      { icon: <Calendar size={20} />, label: role === 'aidant' ? 'Planning' : "Visites", path: role === 'aidant' ? '/app/planning' : '/app/visits', roles: ['family', 'aidant', 'admin', 'coordinator'] },
      { icon: <ShoppingBag size={20} />, label: 'Commandes', path: '/app/orders', roles: ['family', 'aidant', 'admin', 'coordinator'] },
      { icon: <CreditCard size={20} />, label: 'Forfaits', path: '/app/billing', roles: ['family'] },
      { icon: <Package size={20} />, label: 'Offres', path: '/app/offers', roles: ['admin', 'coordinator'] },
      { icon: <BookOpen size={20} />, label: 'Journal', path: '/app/journal', roles: ['family'] },
      { icon: <HistoryIcon size={20} />, label: 'Historique', path: '/app/history', roles: ['aidant'] },
      { icon: <MapPin size={20} />, label: 'Carte', path: '/app/map', roles: ['family', 'aidant', 'admin', 'coordinator'] },
      { icon: <Settings size={20} />, label: 'Réglages', path: '/app/settings', roles: ['admin', 'coordinator'] },
      { icon: <User size={20} />, label: 'Profil', path: '/app/profile', roles: ['family', 'aidant', 'admin', 'coordinator'] },
    ];

    return allItems.filter(item => item.roles.includes(role || ''));
  }, [role]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden transition-colors duration-200" style={{ backgroundColor: 'var(--color-background)' }}>
      {!isMobile && (
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#14221b] shadow-lg border-r border-black/5 dark:border-[#283c32] flex-col">
          <SidebarContent navItems={navItems} locationPath={location.pathname} colors={colors} profile={profile} onLogout={() => { logout(); navigate('/login'); }} />
        </aside>
      )}

      <div className="min-h-screen w-full md:pl-72">
        <main className={cn('w-full max-w-full pt-8 p-2', isMobile ? 'pb-28' : 'pb-8')}>
          <ReminderBanner />
          <Outlet />
        </main>
      </div>

      {isMobile && <MobileTabBar colors={colors} />}
      <OnboardingTour />
    </div>
  );
};

const SidebarContent = ({ navItems, locationPath, colors, profile, onLogout }: any) => {
  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#14221b]">
      <div className="px-6 py-8">
        <Logo size="md" variant="dark" showIcon={false} showText={true} className="justify-start" />
      </div>
      
      <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item: any) => {
          const isActive = locationPath === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all" 
              style={{ 
                color: isActive ? colors.primary : colors.textLight, 
                backgroundColor: isActive ? `${colors.primary}20` : 'transparent' 
              }}
            >
              <span style={{ color: isActive ? colors.primary : colors.textLight }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-black/5 dark:border-[#283c32] space-y-3 bg-gray-50 dark:bg-[#1e2e26]">
        <Link to="/app/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white dark:hover:bg-[#14221b] transition">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: colors.primary }}>
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase text-gray-400 dark:text-gray-300">{getGreeting()}</p>
            <p className="text-xs font-bold truncate" style={{ color: colors.text }}>{profile?.full_name || 'Utilisateur'}</p>
          </div>
        </Link>
        <button onClick={onLogout} className="flex items-center gap-2 text-red-500 dark:text-red-400 font-bold text-sm px-3 w-full">
          <LogOut size={16} /> Déconnexion
        </button>
      </div>
    </div>
  );
};

export default MainLayout;
