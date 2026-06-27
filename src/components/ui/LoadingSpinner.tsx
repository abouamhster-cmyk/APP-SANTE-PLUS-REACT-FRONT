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

  const borderWidth = {
    sm: '2px',
    md: '3px',
    lg: '4px',
    xl: '5px',
  };

  const insetSize = {
    sm: 'inset-0.5',
    md: 'inset-1',
    lg: 'inset-1.5',
    xl: 'inset-2',
  };

  const border = borderWidth[size];
  const inset = insetSize[size];
  const textSize = textSizes[size];

  const spinnerContent = (
    <div className={`text-center ${className}`}>
      <div className={`relative ${sizes[size]} mx-auto mb-4`}>
        <div 
          className="absolute inset-0 rounded-full animate-spin"
          style={{ 
            border: `${border} solid var(--color-primary, #1a4a3a)`,
            borderLeftColor: 'transparent',
            borderBottomColor: 'transparent',
            borderRadius: '50%',
          }}
        />
        
        <div className={`absolute ${inset} flex items-center justify-center`}>
          <img 
            src={logoConfig.icon}
            alt="Santé Plus" 
            className="w-full h-full object-contain rounded-full"
          />
        </div>
      </div>
      {text && (
        <p className={`font-medium ${textSize}`} style={{ color: 'var(--color-text, #2d2d2d)' }}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: 'var(--color-background, #f5f0e8)' }}
      >
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

// ✅ Export default pour compatibilité avec l'import dans index.ts
export default LoadingSpinner;
