// 📁 src/App.tsx

import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { InstallPrompt } from '@/components/PWA/InstallPrompt';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

import MainLayout from '@/components/layout/MainLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';

// ✅ Auth Pages
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage';

// ✅ Dashboard & Main
import DashboardPage from '@/features/dashboard/pages/DashboardPage';

// ✅ Patients
import PatientsPage from '@/features/patients/pages/PatientsPage';
import PatientDetailPage from '@/features/patients/pages/PatientDetailPage';

// ✅ Visits
import VisitsPage from '@/features/visits/pages/VisitsPage';
import VisitDetailPage from '@/features/visits/pages/VisitDetailPage';

// ✅ Orders
import OrdersPage from '@/features/orders/pages/OrdersPage';
import CreateOrderPage from '@/features/orders/pages/CreateOrderPage';
import OrderDetailPage from '@/features/orders/pages/OrderDetailPage';

// ✅ Education
import EducationPage from '@/features/education/pages/EducationPage';

// ✅ Messages
import MessagesPage from '@/features/messages/pages/MessagesPage';

// ✅ Billing
import BillingPage from '@/features/billing/pages/BillingPage';

// ✅ Map
import MapPage from '@/features/map/pages/MapPage';

// ✅ Notifications
import NotificationsPage from '@/features/notifications/pages/NotificationsPage';

// ✅ Profile
import ProfilePage from '@/features/profile/pages/ProfilePage';

// ✅ Help (Aidant)
import MissionsPage from '@/features/help/pages/MissionsPage';
import PlanningPage from '@/features/help/pages/PlanningPage';
import HistoryPage from '@/features/help/pages/HistoryPage';

// ✅ Admin
import AdminDashboardPage from '@/features/admin/pages/AdminDashboardPage';
import AdminPaymentsPage from '@/features/admin/pages/AdminPaymentsPage';
import AdminSubscriptionsPage from '@/features/admin/pages/AdminSubscriptionsPage';
import AdminNotificationsPage from '@/features/admin/pages/AdminNotificationsPage';
import RegistrationsPage from '@/features/admin/pages/RegistrationsPage';
import AidantsPage from '@/features/admin/pages/AidantsPage';
import AidantCandidatesPage from '@/features/admin/pages/AidantCandidatesPage';
import UsersPage from '@/features/admin/pages/UsersPage';
import OffersPage from '@/features/admin/pages/OffersPage';
import SettingsPage from '@/features/admin/pages/SettingsPage';
import RegistrationDetailsPage from '@/features/admin/pages/RegistrationDetailsPage';
import AdminSetupPage from '@/features/admin/pages/AdminSetupPage';

// ✅ Journal
import JournalPage from '@/features/journal/pages/JournalPage';

// ✅ Payment Confirm
import PaymentConfirmPage from '@/features/billing/pages/PaymentConfirmPage';

// ✅ Discharge
import DischargePage from '@/features/discharge/pages/DischargePage';

import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';

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
  const {
    initialize,
    isLoading,
    isAuthenticated,
    isInitialized,
  } = useAuthStore();

  const { fetchNotifications, subscribe, unsubscribe } = useNotificationStore();

  // ✅ Référence pour suivre si l'initialisation a déjà été faite
  const hasInitialized = useRef(false);

  // ✅ Empêcher le rechargement automatique de la page
  useEffect(() => {
    // ✅ Désactiver le rechargement automatique au focus
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👀 Page visible - pas de rechargement automatique');
      }
    };

    // ✅ Empêcher le rechargement par défaut (Ctrl+R, F5)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) && 
        (e.key === 'r' || e.key === 'R' || e.key === 'f5')
      ) {
        // Laisser l'utilisateur recharger manuellement
        console.log('🔄 Rechargement manuel');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // ✅ Initialisation de l'auth au montage (une seule fois)
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // ✅ Éviter les doubles initialisations
      if (hasInitialized.current) {
        console.log('ℹ️ Auth déjà initialisé, skip...');
        return;
      }

      console.log('🔄 App mount - initializing auth once...');
      hasInitialized.current = true;

      if (mounted) {
        await initialize();
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [initialize]);

  // ✅ Logging de l'état
  useEffect(() => {
    console.log('🔍 App state:', {
      isLoading,
      isInitialized,
      isAuthenticated,
    });
  }, [isLoading, isInitialized, isAuthenticated]);

  // ✅ Notifications si connecté
  useEffect(() => {
    if (!isAuthenticated || !isInitialized) return;

    console.log('🔔 Fetching notifications...');
    fetchNotifications();
    subscribe();

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, isInitialized, fetchNotifications, subscribe, unsubscribe]);

  // ✅ Écran de chargement - utilise le logo dynamique
  if (!isInitialized || isLoading) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{ background: 'var(--color-background, #f5f0e8)' }}
      >
        <LoadingSpinner 
          size="lg" 
          text="Chargement..." 
          fullScreen={false}
        />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <Routes>
            {/* Routes publiques */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/admin-setup" element={<AdminSetupPage />} />
              <Route path="/payment/confirm" element={<PaymentConfirmPage />} />
            </Route>

            {/* Routes protégées */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
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
              
              {/* Admin */}
              <Route path="/app/admin" element={<AdminDashboardPage />} />
              <Route path="/app/admin-payments" element={<AdminPaymentsPage />} />
              <Route path="/app/admin-subscriptions" element={<AdminSubscriptionsPage />} />
              <Route path="/app/admin-notifications" element={<AdminNotificationsPage />} />
              <Route path="/app/registrations" element={<RegistrationsPage />} />
              <Route path="/app/registrations/:id" element={<RegistrationDetailsPage />} />
              <Route path="/app/aidants" element={<AidantsPage />} />
              <Route path="/app/aidant-candidates" element={<AidantCandidatesPage />} />
              <Route path="/app/users" element={<UsersPage />} />
              <Route path="/app/offers" element={<OffersPage />} />
              <Route path="/app/settings" element={<SettingsPage />} />
            </Route>

            {/* Redirections */}
            <Route
              path="/"
              element={<Navigate to={isAuthenticated ? '/app' : '/login'} replace />}
            />
            <Route
              path="*"
              element={<Navigate to={isAuthenticated ? '/app' : '/login'} replace />}
            />
          </Routes>

          <InstallPrompt />
          <OnboardingTour />

          <Toaster
            position="top-center"
            reverseOrder={false}
            gutter={8}
            containerStyle={{
              top: 76,
              zIndex: 999999,
            }}
            toastOptions={{
              duration: 3800,
              style: {
                width: 'min(420px, calc(100vw - 28px))',
                maxWidth: '420px',
                minHeight: '62px',
                background: 'linear-gradient(135deg, rgba(17,43,34,.98), rgba(21,54,43,.98))',
                color: '#fff4dc',
                border: '1px solid rgba(255,255,255,.12)',
                borderRadius: '22px',
                padding: '14px 16px',
                boxShadow: '0 18px 40px rgba(15,31,25,.28), 0 4px 12px rgba(16,185,129,.08)',
                backdropFilter: 'blur(18px)',
                fontSize: '13px',
                fontWeight: 700,
                lineHeight: 1.35,
              },
              success: {
                icon: '✅',
                style: {
                  border: '1px solid rgba(16,185,129,.38)',
                  background: 'linear-gradient(135deg, rgba(17,43,34,.98), rgba(21,54,43,.98))',
                  color: '#fff4dc',
                },
              },
              error: {
                icon: '❌',
                duration: 4800,
                style: {
                  border: '1px solid rgba(239,68,68,.42)',
                  background: 'linear-gradient(135deg, rgba(79,18,18,.98), rgba(127,29,29,.98))',
                  color: '#fff4dc',
                },
              },
              loading: {
                icon: '⏳',
                style: {
                  border: '1px solid rgba(245,158,11,.38)',
                  background: 'linear-gradient(135deg, rgba(17,43,34,.98), rgba(21,54,43,.98))',
                  color: '#fff4dc',
                },
              },
            }}
          />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;