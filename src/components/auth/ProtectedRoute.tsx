// 📁 src/components/auth/ProtectedRoute.tsx

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useContractStore } from '@/stores/contractStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ContractModal } from '@/components/contract/ContractModal';
import { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
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

  console.log('🛡️ ProtectedRoute:', {
    isAuthenticated,
    isInitialized,
    authLoading,
    userId: user?.id,
    path: location.pathname,
    needsAcceptance,
    hasAccepted,
    isBlocked,
    isChecking,
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
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // =============================================
  // CONTRAT À ACCEPTER (BLOQUANT)
  // =============================================
  if (isBlocked && contract) {
    return (
      <>
        {/* Modal du contrat - bloquant */}
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
            // Déconnexion si l'utilisateur refuse
            useAuthStore.getState().logout();
          }}
        />

        {/* Fond bloquant */}
        <div 
          className="fixed inset-0 z-[150] flex items-center justify-center pointer-events-none"
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
