// 📁 src/components/ui/LoadingSpinner.tsx
// ✅ SPINNER DE CHARGEMENT : CENTRAGE ABSOLU SANS VERROU DE CONTENEUR NI OMBRES SOMBRES

import { cn } from '@/utils/helpers';
import { useAuthStore } from '@/stores/authStore';
import { getLogoByRole } from '@/lib/constants';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner = ({
  size = 'md',
  text = 'Chargement...',
  className = '',
  fullScreen = false,
}: LoadingSpinnerProps) => {
  const { role, profile } = useAuthStore();
  const logoConfig = getLogoByRole(role, profile?.patient_category);

  const sizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40',
  };

  const textSizes = {
    sm: 'text-xs sm:text-sm',
    md: 'text-sm sm:text-base',
    lg: 'text-base sm:text-lg',
    xl: 'text-lg sm:text-xl',
  };

  const borderWidth = {
    sm: '2px',
    md: '3px',
    lg: '4px',
    xl: '5px',
  };

  const spinnerContent = (
    <div className={cn('text-center flex flex-col items-center justify-center', className)}>
      
      {/* Spinner */}
      <div className={cn('relative mx-auto mb-5 shrink-0', sizes[size])}>
        
        {/* Cercle animé */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            border: `${borderWidth[size]} solid var(--color-primary, #1a4a3a)`,
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
          }}
        />

        {/* 💎 Cercle interne premium épuré sans ombres */}
        <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
          
          {/* 🟢 Logo parfaitement circulaire */}
          <div className="w-3/4 h-3/4 rounded-full overflow-hidden flex items-center justify-center bg-white">
            <img
              src={logoConfig.icon}
              alt="Santé Plus"
              className="w-full h-full object-cover"
            />
          </div>

        </div>
      </div>

      {/* Texte */}
      {text && (
        <p
          className={cn('font-bold tracking-wide mt-2', textSizes[size])}
          style={{ color: 'var(--color-text, #2d2d2d)' }}
        >
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center"
        style={{
          backgroundColor: '#f5f0e8', // 🟢 Utilisation de la couleur crème claire officielle pour le fond complet
        }}
      >
        {/* ✅ CENTRAGE ABSOLU PHYSIQUE (Garantit le centrage horizontal et vertical exact sur tous les mobiles) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xs px-4">
          {spinnerContent}
        </div>
      </div>
    );
  }

  return spinnerContent;
};

export default LoadingSpinner;
