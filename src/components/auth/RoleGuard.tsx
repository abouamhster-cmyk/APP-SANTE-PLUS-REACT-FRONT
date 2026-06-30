// 📁 src/components/auth/RoleGuard.tsx

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ShieldAlert } from 'lucide-react';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: ('admin' | 'coordinator' | 'family' | 'aidant')[];
  fallbackPath?: string;
  showMessage?: boolean;
}

export const RoleGuard = ({ 
  children, 
  allowedRoles, 
  fallbackPath = '/app',
  showMessage = true 
}: RoleGuardProps) => {
  const { profile, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !profile) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = allowedRoles.includes(profile.role as any);

  if (!hasAccess) {
    if (!showMessage) {
      return <Navigate to={fallbackPath} replace />;
    }

    return (
      <div className="min-h-[400px] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-sm border border-black/5">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--color-primary)15' }}
          >
            <ShieldAlert size={40} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            ⛔ Accès restreint
          </h2>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-light)' }}>
            Cette page est réservée aux : <strong>{allowedRoles.join(', ')}</strong>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-light)' }}>
            Votre rôle actuel : <strong>{profile.role}</strong>
          </p>
          <button
            onClick={() => window.location.href = fallbackPath}
            className="mt-4 px-6 py-2 rounded-xl text-white font-bold text-sm transition hover:opacity-90"
            style={{ background: 'var(--color-primary)' }}
          >
            Retourner au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
