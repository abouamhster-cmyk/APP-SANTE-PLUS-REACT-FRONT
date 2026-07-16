// 📁 src/components/ui/LoadingSpinner.tsx

import { useBranding } from '@/hooks/useBranding';
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
  const brand = useBranding();
  const colors = brand.colors;

  const sizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40',
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

  const spinnerContent = (
    <div className={cn('text-center', className)}>
      <div className={cn('relative mx-auto mb-5', sizes[size])}>
        {/* Cercle animé */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            border: `${borderWidth[size]} solid ${colors.primary}`,
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
          }}
        />

        {/* Cercle interne premium avec logo */}
        <div className="absolute inset-2 rounded-full bg-white shadow-inner flex items-center justify-center">
          <div className="w-3/4 h-3/4 rounded-full overflow-hidden flex items-center justify-center bg-white">
            <img
              src={brand.logo.icon}
              alt="Santé Plus"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>

      {text && (
        <p
          className={cn('font-medium tracking-wide', textSizes[size])}
          style={{ color: colors.text }}
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
        style={{ background: colors.background }}
      >
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default LoadingSpinner;
