// 📁 src/components/auth/ProtectedRoute.tsx

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useContractStore } from '@/stores/contractStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ContractModal } from '@/components/contract/ContractModal';
import { useBranding } from '@/hooks/useBranding';
import { useEffect, useState, useRef } from 'react';
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
  const brand = useBranding();
  const colors = brand.colors;
  
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
    isInitialized: contractInitialized,
  } = useContractStore();

  const [isBlocked, setIsBlocked] = useState(false);
  const hasCheckedContract = useRef(false);

  // ✅ Vérifier le contrat UNE SEULE FOIS
  useEffect(() => {
    if (isAuthenticated && user && profile && !hasCheckedContract.current) {
      console.log('📜 Vérification du contrat (une seule fois)...');
      hasCheckedContract.current = true;
      checkContract();
    }
  }, [isAuthenticated, user, profile]);

  // ✅ Mettre à jour le blocage
  useEffect(() => {
    if (contractInitialized) {
      // ✅ Si le contrat est accepté en cache, ne pas bloquer
      const cachedAccepted = localStorage.getItem('sante_plus_contract_accepted');
      if (cachedAccepted === 'true') {
        setIsBlocked(false);
        return;
      }
      setIsBlocked(needsAcceptance && !hasAccepted);
    }
  }, [needsAcceptance, hasAccepted, contractInitialized]);

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
    contractInitialized,
  });

  // =============================================
  // CHARGEMENT
  // =============================================
  if (!isInitialized || authLoading || (isChecking && !contractInitialized)) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{ background: colors.background }}
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
        style={{ background: colors.background }}
      >
        <div 
          className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-sm border"
          style={{ borderColor: colors.primary + '15' }}
        >
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: colors.primary + '15' }}
          >
            <ShieldAlert size={40} style={{ color: colors.primary }} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: colors.text }}>
            ⛔ Accès non autorisé
          </h2>
          <p className="text-sm mt-2" style={{ color: colors.textLight }}>
            Vous n'avez pas les droits nécessaires pour accéder à cette page.
          </p>
          <button
            onClick={() => window.location.href = '/app'}
            className="mt-4 px-6 py-2 rounded-xl text-white font-bold text-sm transition hover:opacity-90"
            style={{ background: colors.primary }}
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
            console.log('📜 Contrat non accepté - accès refusé');
          }}
        />

        {/* Overlay de fond */}
        <div 
          className="fixed inset-0 z-[99998] flex items-center justify-center pointer-events-none"
          style={{ background: colors.background }}
        >
          <div className="text-center pointer-events-auto">
            <div 
              className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: colors.primary + '15' }}
            >
              <Scale size={48} style={{ color: colors.primary }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>
              📜 Conditions Générales
            </h2>
            <p className="text-sm mt-2" style={{ color: colors.textLight }}>
              Veuillez lire et accepter les conditions générales pour continuer.
            </p>
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
