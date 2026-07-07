// 📁 frontend/src/App.tsx

import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { InstallPrompt } from '@/components/PWA/InstallPrompt';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import MainLayout from '@/components/layout/MainLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';

import { supabase } from '@/lib/supabase';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuthStore } from '@/stores/authStore';
import { useOfferStore } from '@/stores/offerStore';
import { useContractStore } from '@/stores/contractStore';

// Pages importées...
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage';
import AdminSetupPage from '@/features/admin/pages/AdminSetupPage';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import PatientsPage from '@/features/patients/pages/PatientsPage';
import PatientDetailPage from '@/features/patients/pages/PatientDetailPage';
import VisitsPage from '@/features/visits/pages/VisitsPage';
import VisitDetailPage from '@/features/visits/pages/VisitDetailPage';
import OrdersPage from '@/features/orders/pages/OrdersPage';
import CreateOrderPage from '@/features/orders/pages/CreateOrderPage';
import OrderDetailPage from '@/features/orders/pages/OrderDetailPage';
import EducationPage from '@/features/education/pages/EducationPage';
import MessagesPage from '@/features/messages/pages/MessagesPage';
import BillingPage from '@/features/billing/pages/BillingPage';
import PaymentConfirmPage from '@/features/billing/pages/PaymentConfirmPage';
import MapPage from '@/features/map/pages/MapPage';
import NotificationsPage from '@/features/notifications/pages/NotificationsPage';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import MissionsPage from '@/features/help/pages/MissionsPage';
import PlanningPage from '@/features/help/pages/PlanningPage';
import HistoryPage from '@/features/help/pages/HistoryPage';
import AdminDashboardPage from '@/features/admin/pages/AdminDashboardPage';
import AdminPaymentsPage from '@/features/admin/pages/AdminPaymentsPage';
import AdminSubscriptionsPage from '@/features/admin/pages/AdminSubscriptionsPage';
import AdminNotificationsPage from '@/features/admin/pages/AdminNotificationsPage';
import AdminVisitValidationPage from '@/features/admin/pages/AdminVisitValidationPage';
import RegistrationsPage from '@/features/admin/pages/RegistrationsPage';
import RegistrationDetailsPage from '@/features/admin/pages/RegistrationDetailsPage';
import AidantsPage from '@/features/admin/pages/AidantsPage';
import AidantCandidatesPage from '@/features/admin/pages/AidantCandidatesPage';
import UsersPage from '@/features/admin/pages/UsersPage';
import OffersPage from '@/features/admin/pages/OffersPage';
import SettingsPage from '@/features/admin/pages/SettingsPage';
import JournalPage from '@/features/journal/pages/JournalPage';
import DischargePage from '@/features/discharge/pages/DischargePage';
import AidantCatalogPage from '@/features/aidants/pages/AidantCatalogPage';
import AidantDetailPage from '@/features/aidants/pages/AidantDetailPage';

const APP_VERSION = "1.0.3"; // ✅ Incrémentez ce numéro à chaque build important

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

function App() {
  // ✅ VÉRIFICATION DE VERSION (AUTO-CLEANUP)
  useEffect(() => {
    const savedVersion = localStorage.getItem('app_version');
    if (savedVersion !== APP_VERSION) {
      console.log(`🔄 Mise à jour détectée (${savedVersion} -> ${APP_VERSION}). Nettoyage...`);
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('app_version', APP_VERSION);
      window.location.reload();
    }
  }, []);

  const { initialize, isLoading: isAuthLoading, isAuthenticated, isInitialized: isAuthInitialized } = useAuthStore();
  const { fetchNotifications, subscribe, unsubscribe, unreadCount, fetchNotifications: fetchNotifsGlobal } = useNotificationStore();
  const { fetchOffers, isInitialized: isOffersInitialized } = useOfferStore();
  const { checkContract } = useContractStore();

  const hasInitialized = useRef(false);
  const hasLoadedOffers = useRef(false);
  const realtimeInitialized = useRef(false);

  // Auto-refresh notifications visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchNotifications(true);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchNotifications]);

  // ✅ REALTIME AUTO-REFRESH
  useEffect(() => {
    if (!isAuthenticated || !isAuthInitialized) return;

    const visitsChannel = supabase
      .channel('realtime_visites')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visites' }, () => {
        useVisitStore.getState().invalidateCache();
        useVisitStore.getState().fetchVisits(true);
      })
      .subscribe();

    const ordersChannel = supabase
      .channel('realtime_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commandes' }, () => {
        useOrderStore.getState().invalidateCache();
        useOrderStore.getState().fetchOrders(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(visitsChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [isAuthenticated, isAuthInitialized]);

  // Auth Init
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initialize();
    }
  }, [initialize]);

  // Notifications Init
  useEffect(() => {
    if (!isAuthenticated || !isAuthInitialized) return;
    if (realtimeInitialized.current) return;

    realtimeInitialized.current = true;
    subscribe();
    fetchNotifications();

    return () => {
      unsubscribe();
      realtimeInitialized.current = false;
    };
  }, [isAuthenticated, isAuthInitialized, subscribe, fetchNotifications, unsubscribe]);

  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) Santé Plus Services` : 'Santé Plus Services';
  }, [unreadCount]);

  useEffect(() => {
    if (isAuthInitialized && !isOffersInitialized && !hasLoadedOffers.current) {
      hasLoadedOffers.current = true;
      fetchOffers();
    }
  }, [isAuthInitialized, isOffersInitialized, fetchOffers]);

  useEffect(() => {
    if (isAuthenticated && isAuthInitialized) checkContract();
  }, [isAuthenticated, isAuthInitialized, checkContract]);

  if (!isAuthInitialized || isAuthLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: 'var(--color-background, #f5f0e8)' }}>
        <LoadingSpinner size="lg" text="Chargement..." fullScreen={false} />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/admin-setup" element={<AdminSetupPage />} />
              <Route path="/payment/confirm" element={<PaymentConfirmPage />} />
            </Route>

            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/app" element={<DashboardPage />} />
              <Route path="/app/dashboard" element={<DashboardPage />} />
              <Route path="/app/patients" element={<PatientsPage />} />
              <Route path="/app/patients/:id" element={<PatientDetailPage />} />
              <Route path="/app/visits" element={<VisitsPage />} />
              <Route path="/app/visits/:id" element={<VisitDetailPage />} />
              <Route path="/app/orders" element={<OrdersPage />} />
              <Route path="/app/orders/create" element={<CreateOrderPage />} />
              <Route path="/app/orders/:id" element={<OrderDetailPage />} />
              <Route path="/app/messages" element={<MessagesPage />} />
              <Route path="/app/billing" element={<BillingPage />} />
              <Route path="/app/map" element={<MapPage />} />
              <Route path="/app/notifications" element={<NotificationsPage />} />
              <Route path="/app/profile" element={<ProfilePage />} />
              <Route path="/app/missions" element={<MissionsPage />} />
              <Route path="/app/planning" element={<PlanningPage />} />
              <Route path="/app/history" element={<HistoryPage />} />
              <Route path="/app/education" element={<EducationPage />} />
              <Route path="/app/journal" element={<JournalPage />} />
              <Route path="/app/discharge" element={<DischargePage />} />
              <Route path="/app/aidants" element={<AidantCatalogPage />} />
              <Route path="/app/aidants/:id" element={<AidantDetailPage />} />
              
              {/* Admin */}
              <Route path="/app/admin" element={<RoleGuard allowedRoles={['admin', 'coordinator']}><AdminDashboardPage /></RoleGuard>} />
              <Route path="/app/admin-payments" element={<RoleGuard allowedRoles={['admin', 'coordinator']}><AdminPaymentsPage /></RoleGuard>} />
              <Route path="/app/admin-subscriptions" element={<RoleGuard allowedRoles={['admin', 'coordinator']}><AdminSubscriptionsPage /></RoleGuard>} />
              <Route path="/app/admin-notifications" element={<RoleGuard allowedRoles={['admin', 'coordinator']}><AdminNotificationsPage /></RoleGuard>} />
              <Route path="/app/admin/visits/validation" element={<RoleGuard allowedRoles={['admin', 'coordinator']}><AdminVisitValidationPage /></RoleGuard>} />
              <Route path="/app/registrations" element={<RoleGuard allowedRoles={['admin', 'coordinator']}><RegistrationsPage /></RoleGuard>} />
              <Route path="/app/registrations/:id" element={<RoleGuard allowedRoles={['admin', 'coordinator']}><RegistrationDetailsPage /></RoleGuard>} />
              <Route path="/app/aidants" element={<RoleGuard allowedRoles={['admin', 'coordinator']}><AidantsPage /></RoleGuard>} />
              <Route path="/app/aidant-candidates" element={<RoleGuard allowedRoles={['admin', 'coordinator']}><AidantCandidatesPage /></RoleGuard>} />
              <Route path="/app/users" element={<RoleGuard allowedRoles={['admin', 'coordinator']}><UsersPage /></RoleGuard>} />
              <Route path="/app/offers" element={<RoleGuard allowedRoles={['admin', 'coordinator']}><OffersPage /></RoleGuard>} />
              <Route path="/app/settings" element={<RoleGuard allowedRoles={['admin']}><SettingsPage /></RoleGuard>} />
            </Route>

            <Route path="/" element={<Navigate to={isAuthenticated ? '/app' : '/login'} replace />} />
            <Route path="*" element={<Navigate to={isAuthenticated ? '/app' : '/login'} replace />} />
          </Routes>
          <InstallPrompt />
          <OnboardingTour />
          <Toaster />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
