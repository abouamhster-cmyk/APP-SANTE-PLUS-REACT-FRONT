// 📁 src/App.tsx

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
import { useAuthStore } from '@/stores/authStore';
import { useOfferStore } from '@/stores/offerStore';
import { useContractStore } from '@/stores/contractStore';
import { useNotificationStore } from '@/stores/notificationStore';

// Imports Pages
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false },
  },
});

function App() {
  const { initialize, isLoading: isAuthLoading, isAuthenticated, isInitialized: isAuthInitialized } = useAuthStore();
  const { fetchNotifications, subscribe, unsubscribe, unreadCount } = useNotificationStore();
  const { fetchOffers, isInitialized: isOffersInitialized } = useOfferStore();
  const { checkContract } = useContractStore();

  const hasInitialized = useRef(false);
  const realtimeInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      initialize();
      hasInitialized.current = true;
    }
  }, [initialize]);

  // Realtime
  useEffect(() => {
    if (!isAuthenticated || !isAuthInitialized || realtimeInitialized.current) return;

    realtimeInitialized.current = true;
    subscribe();
    fetchNotifications();
    
    const visitsChannel = supabase.channel('realtime_visites_refresh').on('postgres_changes', { event: '*', schema: 'public', table: 'visites' }, () => useVisitStore.getState().fetchVisits(true)).subscribe();
    const ordersChannel = supabase.channel('realtime_commandes_refresh').on('postgres_changes', { event: '*', schema: 'public', table: 'commandes' }, () => useOrderStore.getState().fetchOrders(true)).subscribe();

    return () => {
      unsubscribe();
      supabase.removeChannel(visitsChannel);
      supabase.removeChannel(ordersChannel);
      realtimeInitialized.current = false;
    };
  }, [isAuthenticated, isAuthInitialized, subscribe, unsubscribe, fetchNotifications]);

  if (!isAuthInitialized || isAuthLoading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/payment/confirm" element={<PaymentConfirmPage />} />
            </Route>

            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/app" element={<DashboardPage />} />
              <Route path="/app/patients" element={<PatientsPage />} />
              <Route path="/app/patients/:id" element={<PatientDetailPage />} />
              <Route path="/app/visits" element={<VisitsPage />} />
              <Route path="/app/visits/:id" element={<VisitDetailPage />} />
              <Route path="/app/orders" element={<OrdersPage />} />
              <Route path="/app/orders/create" element={<CreateOrderPage />} />
              <Route path="/app/orders/:id" element={<OrderDetailPage />} />
              <Route path="/app/aidants" element={<AidantCatalogPage />} />
              <Route path="/app/aidants/:id" element={<AidantDetailPage />} />
              <Route path="/app/map" element={<MapPage />} />
              
              {/* Admin Routes */}
              <Route path="/app/admin" element={<RoleGuard allowedRoles={['admin', 'coordinator']}><AdminDashboardPage /></RoleGuard>} />
              <Route path="/app/users" element={<RoleGuard allowedRoles={['admin', 'coordinator']}><UsersPage /></RoleGuard>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
          <InstallPrompt />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
