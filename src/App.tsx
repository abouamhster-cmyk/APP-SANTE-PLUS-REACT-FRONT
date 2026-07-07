// 📁 frontend/src/App.tsx
// ✅ CONTROLEUR DE NAVIGATION PRINCIPAL AVEC ECOUTE REALTIME DES MODIFICATIONS EN TÂCHE DE FOND

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

// ✅ IMPORTER le client de base de données et les stores pour le temps réel
import { supabase } from '@/lib/supabase';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';

// ✅ IMPORTER le service Keep-Alive
import { initKeepAlive, keepAliveService } from '@/services/keepalive.service';

// ✅ IMPORTER le service de notifications
import { 
  requestNotificationPermission,
  loadNotificationSoundPreference
} from '@/services/notificationService';

// ✅ IMPORTER le store de notifications
import { useNotificationStore } from '@/stores/notificationStore';

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
// PATIENTS (PROCHES) - UNIFIÉ
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
// ÉDUCATION
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

  const {
    fetchNotifications,
    subscribe,
    unsubscribe,
    unreadCount,
    notificationsEnabled,
    toggleNotifications,
    addNotification,
  } = useNotificationStore();

  const { fetchOffers, isInitialized: isOffersInitialized } = useOfferStore();
  const { checkContract } = useContractStore();

  // ============================================================
  // REFS
  // ============================================================
  const hasInitialized = useRef(false);
  const hasLoadedOffers = useRef(false);
  const keepAliveStarted = useRef(false);
  const notificationInitialized = useRef(false);
  const realtimeInitialized = useRef(false);
  const soundInitialized = useRef(false);

  // ============================================================
  // EFFETS - GESTION DU RECHARGEMENT
  // ============================================================
 
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👀 Page visible - Rafraîchissement automatique des notifications...');
        
        // ✅ Force la synchronisation en tâche de fond avec la base de données
        useNotificationStore.getState().fetchNotifications(true);
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
  // ✅ EFFET - REALTIME AUTO-REFRESH DES VISITES ET DES COMMANDES
  // ============================================================
  useEffect(() => {
    if (!isAuthenticated || !isAuthInitialized) return;

    console.log('📡 [Realtime] Initialisation de l\'auto-refresh en arrière-plan...');

    // 1️⃣ S’abonner aux changements de la table "visites" (Validation, Refus, etc.)
    const visitsChannel = supabase
      .channel('realtime_visites_refresh')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visites' },
        () => {
          console.log('🔄 [Realtime] Changement sur les visites, rechargement...');
          const { fetchVisits } = useVisitStore.getState();
          fetchVisits(true); // Recharger en direct
        }
      )
      .subscribe();

    // 2️⃣ S’abonner aux changements de la table "commandes" (Prise en charge, livraison, etc.)
    const ordersChannel = supabase
      .channel('realtime_commandes_refresh')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'commandes' },
        () => {
          console.log('🔄 [Realtime] Changement sur les commandes, rechargement...');
          const { fetchOrders } = useOrderStore.getState();
          fetchOrders(true); // Recharger en direct
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(visitsChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [isAuthenticated, isAuthInitialized]);

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
  // EFFETS - INITIALISATION DE L'AUTHENTIFICATION ET DES NOTIFS
  // ============================================================
  useEffect(() => {
    if (!isAuthenticated || !isAuthInitialized) return;

    if (realtimeInitialized.current) {
      console.log('ℹ️ Realtime déjà connecté');
      return;
    }

    const initNotifications = async () => {
      realtimeInitialized.current = true;
      try {
        console.log('🔔 [Realtime] Initialisation du canal Realtime...');
        subscribe();
        await fetchNotifications();
      } catch (error) {
        console.error('❌ Erreur initialisation Realtime:', error);
        realtimeInitialized.current = false;
      }
    };

    initNotifications();

    return () => {
      if (realtimeInitialized.current) {
        console.log('🔔 [Realtime] Fermeture du canal...');
        unsubscribe();
        realtimeInitialized.current = false;
      }
    };
  }, [isAuthenticated, isAuthInitialized, subscribe, fetchNotifications, unsubscribe]);

  // ============================================================
  // EFFET - MISE À JOUR DU BADGE
  // ============================================================
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Santé Plus Services`;
    } else {
      document.title = 'Santé Plus Services';
    }
  }, [unreadCount]);

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
        <ThemePropsProvider value={{ theme: themeName }}>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/admin-setup" element={<AdminSetupPage />} />
              <Route path="/payment/confirm" element={<PaymentConfirmPage />} />
            </Route>

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

              <Route path="/app/aidants" element={<AidantCatalogPage />} />
              <Route path="/app/aidants/:id" element={<AidantDetailPage />} />

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
                  </Route>
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
                    <Navigate to="/app/patients" replace />
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

            <Route
              path="/"
              element={<Navigate to={isAuthenticated ? '/app' : '/login'} replace />}
            />
            <Route
              path="*"
              element={<Navigate to={isAuthenticated ? '/app' : '/login'} replace />}
            />
          </Routes>

          <button
            onClick={() => navigate('/app/orders/create')}
            className="sm:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-2xl text-white shadow-lg flex items-center justify-center active:scale-95 transition"
            style={{ background: colors.primary }}
            aria-label="Nouvelle commande"
          >
            <Plus size={22} />
          </button>

        </div>
      </div>
    );
  }
};

export default App;
