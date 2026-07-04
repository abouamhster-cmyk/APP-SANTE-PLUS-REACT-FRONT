// 📁 src/app/Router.tsx

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleGuard } from '@/components/auth/RoleGuard';
import MainLayout from '@/components/layout/MainLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';

// Pages
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import PatientsPage from '@/features/patients/pages/PatientsPage';
import VisitsPage from '@/features/visits/pages/VisitsPage';
import OrdersPage from '@/features/orders/pages/OrdersPage';
import MessagesPage from '@/features/messages/pages/MessagesPage';
import BillingPage from '@/features/billing/pages/BillingPage';
import MapPage from '@/features/map/pages/MapPage';
import NotificationsPage from '@/features/notifications/pages/NotificationsPage';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import AidantCatalogPage from '@/features/aidants/pages/AidantCatalogPage';
import AidantDetailPage from '@/features/aidants/pages/AidantDetailPage';

export const AppRouter = () => {
  const { user, role } = useAuthStore();

  return (
    <Routes>
      {/* Routes publiques */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Routes protégées */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/app" element={<DashboardPage />} />
        <Route path="/app/dashboard" element={<DashboardPage />} />
        
        {/* ✅ UNIFICATION : Bénéficiaires (comptes + patients) */}
        <Route path="/app/patients" element={<PatientsPage />} />
        
        {/* ✅ Redirection de l'ancienne route d'assignation vers /app/patients */}
        <Route path="/app/assign-aidants" element={<Navigate to="/app/patients" replace />} />
        
        <Route path="/app/visits" element={<VisitsPage />} />
        <Route path="/app/orders" element={<OrdersPage />} />
        <Route path="/app/messages" element={<MessagesPage />} />
        <Route path="/app/billing" element={<BillingPage />} />
        <Route path="/app/map" element={<MapPage />} />
        <Route path="/app/notifications" element={<NotificationsPage />} />
        <Route path="/app/profile" element={<ProfilePage />} />
        
        {/* 🦸 AIDANTS CATALOG - UNIQUEMENT POUR LES FAMILLES */}
        <Route 
          path="/app/aidants" 
          element={
            <RoleGuard allowedRoles={['family']}>
              <AidantCatalogPage />
            </RoleGuard>
          } 
        />
        <Route 
          path="/app/aidants/:id" 
          element={
            <RoleGuard allowedRoles={['family']}>
              <AidantDetailPage />
            </RoleGuard>
          } 
        />
      </Route>

      {/* Redirections */}
      <Route path="/" element={<Navigate to={user ? '/app' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={user ? '/app' : '/login'} replace />} />
    </Routes>
  );
};
