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

// ✅ IMPORTER le service Keep-Alive
import { initKeepAlive, keepAliveService } from '@/services/keepalive.service';
// ✅ IMPORTER l'indicateur Keep-Alive
import { KeepAliveIndicator } from '@/components/ui/KeepAliveIndicator';

// ============================================================
// AUTH PAGES
// ============================================================
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage';
import AdminSetupPage from '@/features/admin/pages/AdminSetupPage';

// ============================================================
// DASHBOARD & MAIN
// ============================================================
import DashboardPage from '@/features/dashboard/pages/DashboardPage';

// ============================================================
// PATIENTS (PROCHES)
// ============================================================
import PatientsPage from '@/features/patients/pages/PatientsPage';
import PatientDetailPage from '@/features/patients/pages/PatientDetailPage';

// ============================================================
// VISITS
// ============================================================
import VisitsPage from '@/features/visits/pages/VisitsPage';
import VisitDetailPage from '@/features/visits/pages/VisitDetailPage';

// ============================================================
// ORDERS
// ============================================================
import OrdersPage from '@/features/orders/pages/OrdersPage';
import CreateOrderPage from '@/features/orders/pages/CreateOrderPage';
import OrderDetailPage from '@/features/orders/pages/OrderDetailPage';

// ============================================================
// EDUCATION
// ============================================================
import EducationPage from '@/features/education/pages/EducationPage';

// ============================================================
// MESSAGES
// ============================================================
import MessagesPage from '@/features/messages/pages/MessagesPage';

// ============================================================
// BILLING / PAYMENTS
// ============================================================
import BillingPage from '@/features/billing/pages/BillingPage';
import PaymentConfirmPage from '@/features/billing/pages/PaymentConfirmPage';

// ============================================================
// MAP
// ============================================================
import MapPage from '@/features/map/pages/MapPage';

// ============================================================
// NOTIFICATIONS
// ============================================================
import NotificationsPage from '@/features/notifications/pages/NotificationsPage';

// ============================================================
// PROFILE
// ============================================================
import ProfilePage from '@/features/profile/pages/ProfilePage';

// ============================================================
// HELP / AIDANT
// ============================================================
import MissionsPage from '@/features/help/pages/MissionsPage';
import PlanningPage from '@/features/help/pages/PlanningPage';
import HistoryPage from '@/features/help/pages/HistoryPage';

// ============================================================
// ADMIN PAGES - AVEC ROLE GUARD
// ============================================================
import AdminDashboardPage from '@/features/admin/pages/AdminDashboardPage';
import AdminPaymentsPage from '@/features/admin/pages/AdminPaymentsPage';
import AdminSubscriptionsPage from '@/features/admin/pages/AdminSubscriptionsPage';
import AdminNotificationsPage from '@/features/admin/pages/AdminNotificationsPage';
import AdminVisitValidationPage from '@/features/admin/pages/AdminVisitValidationPage';
import RegistrationsPage from '@/features/admin/pages/RegistrationsPage';
import RegistrationDetailsPage from '@/features/admin/pages/RegistrationDetailsPage';
import AidantsPage from '@/features/admin/pages/AidantsPage';
import AidantCandidatesPage from '@/features/admin/pages/AidantCandidatesPage';
import AssignAidantPage from '@/features/admin/pages/AssignAidantPage';
import UsersPage from '@/features/admin/pages/UsersPage';
import OffersPage from '@/features/admin/pages/OffersPage';
import SettingsPage from '@/features/admin/pages/SettingsPage';

// ============================================================
// JOURNAL
// ============================================================
import JournalPage from '@/features/journal/pages/JournalPage';

// ============================================================
// DISCHARGE (SORTIE HÔPITAL)
// ============================================================
import DischargePage from '@/features/discharge/pages/DischargePage';

// ============================================================
// 🦸 AIDANTS CATALOG
// ============================================================
import AidantCatalogPage from '@/features/aidants/pages/AidantCatalogPage';
import AidantDetailPage from '@/features/aidants/pages/AidantDetailPage';

// ============================================================
// STORES
// ============================================================
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useOfferStore } from '@/stores/offerStore';
import { useContractStore } from '@/stores/contractStore';

// ============================================================
// QUERY CLIENT
// ============================================================
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

// ============================================================
// APP COMPONENT
// ============================================================
function App() {
  // ============================================================
  // STORES
  // ============================================================
  const {
    initialize,
    isLoading: isAuthLoading,
    isAuthenticated,
    isInitialized: isAuthInitialized,
  } = useAuthStore();

  const { fetchNotifications, subscribe, unsubscribe } = useNotificationStore();
  const { fetchOffers, isInitialized: isOffersInitialized } = useOfferStore();
  const { checkContract } = useContractStore();

  // ============================================================
  // REFS
  // ============================================================
  const hasInitialized = useRef(false);
  const hasLoadedOffers = useRef(false);
  const keepAliveStarted = useRef(false);

  // ============================================================
  // EFFETS - GESTION DU RECHARGEMENT
  // ============================================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👀 Page visible - pas de rechargement automatique');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R' || e.key === 'f5')) {
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

  // ============================================================
  // EFFETS - INITIALISATION DE L'AUTH
  // ============================================================
  useEffect(() => {
    let mounted = true;

    const init = async () => {
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

  // ============================================================
  // ✅ EFFET - INITIALISATION KEEP-ALIVE
  // ============================================================
  useEffect(() => {
    // Démarrer Keep-Alive seulement si authentifié et en production
    if (isAuthenticated && isAuthInitialized && !keepAliveStarted.current) {
      console.log('🚀 [App] Initialisation Keep-Alive après authentification');
      keepAliveStarted.current = true;
      
      // Démarrer le service
      initKeepAlive();
      
      // Vérifier que le service est actif
      if (keepAliveService.isActive()) {
        console.log('✅ Keep-Alive actif');
      } else {
        console.warn('⚠️ Keep-Alive non démarré');
      }
    }

    // Arrêter Keep-Alive à la déconnexion
    if (!isAuthenticated && isAuthInitialized && keepAliveStarted.current) {
      console.log('🚪 [App] Déconnexion - Arrêt Keep-Alive');
      keepAliveStarted.current = false;
      keepAliveService.stop();
    }
  }, [isAuthenticated, isAuthInitialized]);

  // ============================================================
  // EFFETS - CHARGEMENT DES OFFRES
  // ============================================================
  useEffect(() => {
    if (isAuthInitialized && !isOffersInitialized && !hasLoadedOffers.current) {
      console.log('🔄 Chargement des offres...');
      hasLoadedOffers.current = true;
      fetchOffers();
    }
  }, [isAuthInitialized, isOffersInitialized, fetchOffers]);

  // ============================================================
  // EFFETS - NOTIFICATIONS
  // ============================================================
  useEffect(() => {
    if (!isAuthenticated || !isAuthInitialized) return;

    console.log('🔔 Fetching notifications...');
    fetchNotifications();
    subscribe();

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, isAuthInitialized, fetchNotifications, subscribe, unsubscribe]);

  // ============================================================
  // EFFETS - VÉRIFICATION DU CONTRAT
  // ============================================================
  useEffect(() => {
    if (isAuthenticated && isAuthInitialized) {
      console.log('📜 Vérification du contrat...');
      checkContract();
    }
  }, [isAuthenticated, isAuthInitialized, checkContract]);

  // ============================================================
  // ÉCRAN DE CHARGEMENT
  // ============================================================
  if (!isAuthInitialized || isAuthLoading) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{ background: 'var(--color-background, #f5f0e8)' }}
      >
        <LoadingSpinner size="lg" text="Chargement..." fullScreen={false} />
      </div>
    );
  }

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <Routes>
            {/* ============================================================
                ROUTES PUBLIQUES
                ============================================================ */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/admin-setup" element={<AdminSetupPage />} />
              <Route path="/payment/confirm" element={<PaymentConfirmPage />} />
            </Route>

            {/* ============================================================
                ROUTES PROTÉGÉES
                ============================================================ */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* 📊 DASHBOARD */}
              <Route path="/app" element={<DashboardPage />} />
              <Route path="/app/dashboard" element={<DashboardPage />} />

              {/* 👨‍👩‍👦 PATIENTS / PROCHES */}
              <Route path="/app/patients" element={<PatientsPage />} />
              <Route path="/app/patients/:id" element={<PatientDetailPage />} />

              {/* 📅 VISITES */}
              <Route path="/app/visits" element={<VisitsPage />} />
              <Route path="/app/visits/:id" element={<VisitDetailPage />} />

              {/* 🛒 COMMANDES */}
              <Route path="/app/orders" element={<OrdersPage />} />
              <Route path="/app/orders/create" element={<CreateOrderPage />} />
              <Route path="/app/orders/:id" element={<OrderDetailPage />} />

              {/* 💬 MESSAGES */}
              <Route path="/app/messages" element={<MessagesPage />} />

              {/* 💳 BILLING / ABONNEMENT */}
              <Route path="/app/billing" element={<BillingPage />} />

              {/* 🗺️ MAP / RADAR */}
              <Route path="/app/map" element={<MapPage />} />

              {/* 🔔 NOTIFICATIONS */}
              <Route path="/app/notifications" element={<NotificationsPage />} />

              {/* 👤 PROFIL */}
              <Route path="/app/profile" element={<ProfilePage />} />

              {/* 🦸 AIDANT - MISSIONS */}
              <Route path="/app/missions" element={<MissionsPage />} />
              <Route path="/app/planning" element={<PlanningPage />} />
              <Route path="/app/history" element={<HistoryPage />} />

              {/* 📚 ÉDUCATION */}
              <Route path="/app/education" element={<EducationPage />} />

              {/* 📖 JOURNAL DE BORD */}
              <Route path="/app/journal" element={<JournalPage />} />

              {/* 🏥 SORTIE D'HÔPITAL */}
              <Route path="/app/discharge" element={<DischargePage />} />

              {/* 🦸 AIDANTS CATALOG */}
              <Route path="/app/aidants" element={<AidantCatalogPage />} />
              <Route path="/app/aidants/:id" element={<AidantDetailPage />} />

              {/* ============================================================
                  👔 ROUTES ADMIN - PROTÉGÉES PAR RÔLE
                  ============================================================ */}
              <Route 
                path="/app/admin" 
                element={
                  <RoleGuard allowedRoles={['admin', 'coordinator']}>
                    <AdminDashboardPage />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/app/admin-payments" 
                element={
                  <RoleGuard allowedRoles={['admin', 'coordinator']}>
                    <AdminPaymentsPage />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/app/admin-subscriptions" 
                element={
                  <RoleGuard allowedRoles={['admin', 'coordinator']}>
                    <AdminSubscriptionsPage />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/app/admin-notifications" 
                element={
                  <RoleGuard allowedRoles={['admin', 'coordinator']}>
                    <AdminNotificationsPage />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/app/admin/visits/validation" 
                element={
                  <RoleGuard allowedRoles={['admin', 'coordinator']}>
                    <AdminVisitValidationPage />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/app/registrations" 
                element={
                  <RoleGuard allowedRoles={['admin', 'coordinator']}>
                    <RegistrationsPage />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/app/registrations/:id" 
                element={
                  <RoleGuard allowedRoles={['admin', 'coordinator']}>
                    <RegistrationDetailsPage />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/app/aidants" 
                element={
                  <RoleGuard allowedRoles={['admin', 'coordinator']}>
                    <AidantsPage />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/app/aidant-candidates" 
                element={
                  <RoleGuard allowedRoles={['admin', 'coordinator']}>
                    <AidantCandidatesPage />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/app/assign-aidants" 
                element={
                  <RoleGuard allowedRoles={['admin', 'coordinator']}>
                    <AssignAidantPage />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/app/users" 
                element={
                  <RoleGuard allowedRoles={['admin', 'coordinator']}>
                    <UsersPage />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/app/offers" 
                element={
                  <RoleGuard allowedRoles={['admin', 'coordinator']}>
                    <OffersPage />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/app/settings" 
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <SettingsPage />
                  </RoleGuard>
                } 
              />
            </Route>

            {/* ============================================================
                REDIRECTIONS
                ============================================================ */}
            <Route
              path="/"
              element={<Navigate to={isAuthenticated ? '/app' : '/login'} replace />}
            />
            <Route
              path="*"
              element={<Navigate to={isAuthenticated ? '/app' : '/login'} replace />}
            />
          </Routes>

          {/* ============================================================
              COMPOSANTS GLOBAUX
              ============================================================ */}
          <InstallPrompt />
          <OnboardingTour />

          {/* ============================================================
              TOASTER
              ============================================================ */}
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
