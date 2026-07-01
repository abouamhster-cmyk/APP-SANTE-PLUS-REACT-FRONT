// 📁 src/components/ui/LoadingSpinner.tsx

import { useAuthStore } from '@/stores/authStore';
import { getLogoByRole } from '@/lib/constants';
import { cn } from '@/utils/helpers';

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
    sm: 'w-14 h-14',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
    xl: 'w-36 h-36',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const spinner = (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      
      {/* SPINNER */}
      <div className={cn('relative', sizes[size])}>
        
        {/* ring principal */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            border: '3px solid rgba(0,0,0,0.08)',
            borderTopColor: 'var(--color-primary, #1a4a3a)',
          }}
        />

        {/* ring secondaire (luxe effect) */}
        <div
          className="absolute inset-1 rounded-full animate-spin"
          style={{
            border: '2px solid transparent',
            borderTopColor: 'var(--color-primary, #1a4a3a)',
            animationDuration: '1.8s',
            opacity: 0.5,
          }}
        />

        {/* LOGO */}
        <div className="absolute inset-3 flex items-center justify-center">
          <img
            src={logoConfig.icon}
            alt="logo"
            className="w-full h-full object-contain opacity-90"
          />
        </div>
      </div>

      {/* TEXT */}
      {text && (
        <p
          className={cn('mt-4 font-medium tracking-tight', textSizes[size])}
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
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{
          background: 'rgba(245, 240, 232, 0.85)',
          backdropFilter: 'blur(6px)',
        }}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
