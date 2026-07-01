// 📁 src/components/auth/ProtectedRoute.tsx

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useContractStore } from '@/stores/contractStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
// ✅ Importer ContractModal transformé en page
import { ContractModal } from '@/components/contract/ContractModal';
import { useEffect, useState } from 'react';
import { Scale, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'coordinator' | 'family' | 'aidant')[];
  redirectTo?: string;
}

export const ProtectedRoute = ({ 
  children, 
  allowedRoles = ['admin', 'coordinator', 'family', 'aidant'],
  redirectTo = '/login'
}: ProtectedRouteProps) => {
  const location = useLocation();
  const { 
    isAuthenticated, 
    isInitialized, 
    isLoading: authLoading, 
    user,
    profile,
  } = useAuthStore();
  
  const { 
    contract, 
    needsAcceptance, 
    hasAccepted, 
    isLoading: contractLoading,
    checkContract,
    acceptContract,
    isChecking,
  } = useContractStore();

  const [isBlocked, setIsBlocked] = useState(false);

  // ✅ Vérifier le contrat dès que l'utilisateur est authentifié
  useEffect(() => {
    if (isAuthenticated && user && profile) {
      checkContract();
    }
  }, [isAuthenticated, user, profile]);

  // ✅ Gérer l'état de blocage
  useEffect(() => {
    if (needsAcceptance && !hasAccepted) {
      setIsBlocked(true);
    } else {
      setIsBlocked(false);
    }
  }, [needsAcceptance, hasAccepted]);

  // ✅ Vérifier les permissions par rôle
  const hasRequiredRole = () => {
    if (!profile) return false;
    return allowedRoles.includes(profile.role as any);
  };

  console.log('🛡️ ProtectedRoute:', {
    isAuthenticated,
    isInitialized,
    authLoading,
    userId: user?.id,
    role: profile?.role,
    path: location.pathname,
    allowedRoles,
    hasRequiredRole: hasRequiredRole(),
    needsAcceptance,
    hasAccepted,
    isBlocked,
  });

  // =============================================
  // CHARGEMENT
  // =============================================
  if (!isInitialized || authLoading || isChecking) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{ background: 'var(--color-background, #f5f0e8)' }}
      >
        <LoadingSpinner size="lg" text="Chargement..." />
      </div>
    );
  }

  // =============================================
  // NON AUTHENTIFIÉ
  // =============================================
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // =============================================
  // RÔLE NON AUTORISÉ
  // =============================================
  if (!hasRequiredRole()) {
    return (
      <div 
        className="min-h-screen w-full flex items-center justify-center p-4"
        style={{ background: 'var(--color-background, #f5f0e8)' }}
      >
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-sm border border-black/5">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--color-primary)15' }}
          >
            <ShieldAlert size={40} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            ⛔ Accès non autorisé
          </h2>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-light)' }}>
            Vous n'avez pas les droits nécessaires pour accéder à cette page.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-light)' }}>
            Rôle actuel : <strong>{profile?.role || 'Inconnu'}</strong>
          </p>
          <button
            onClick={() => window.location.href = '/app'}
            className="mt-4 px-6 py-2 rounded-xl text-white font-bold text-sm transition hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            Retourner au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  // =============================================
  // CONTRAT À ACCEPTER (BLOQUANT)
  // =============================================
  if (isBlocked && contract) {
    return (
      <>
        {/* ✅ ContractModal en plein écran via le wrapper */}
        <ContractModal
          isOpen={true}
          contract={{
            id: contract.id,
            title: contract.title,
            content: contract.content,
            version: contract.version,
            role: contract.role,
            summary: contract.summary,
          }}
          isLoading={contractLoading}
          onAccept={async () => {
            await acceptContract(contract.id);
            setIsBlocked(false);
          }}
          onClose={() => {
            useAuthStore.getState().logout();
          }}
        />

        {/* Overlay de fond pour l'effet de blocage */}
        <div 
          className="fixed inset-0 z-[99998] flex items-center justify-center pointer-events-none"
          style={{ background: 'var(--color-background, #f5f0e8)' }}
        >
          <div className="text-center pointer-events-auto">
            <div 
              className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-primary)15' }}
            >
              <Scale size={48} style={{ color: 'var(--color-primary)' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              📜 Conditions Générales
            </h2>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-light)' }}>
              Veuillez lire et accepter les conditions générales pour continuer.
            </p>
            <div className="mt-4 animate-pulse-slow">
              <span className="text-xs" style={{ color: 'var(--color-text-light)' }}>
                ⏳ En attente de votre acceptation...
              </span>
            </div>
          </div>
        </div>
      </>
    );
  }

  // =============================================
  // ACCÈS AUTORISÉ
  // =============================================
  return <>{children}</>;
};
