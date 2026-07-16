// 📁 src/components/ui/LoadingSkeleton.tsx
// ✅ SQUELETTES DE CHARGEMENT : UNIFICATION PREMIUM DE TRANSITION AVEC LE LOADING SPINNER

import { cn } from '@/utils/helpers';
import { LoadingSpinner } from './LoadingSpinner';
import { useBranding } from '@/hooks/useBranding';

interface LoadingSkeletonProps {
  type?: 'page' | 'card' | 'list' | 'fullscreen';
  count?: number;
  className?: string;
}

export const LoadingSkeleton = ({
  type = 'card',
  count = 1,
  className,
}: LoadingSkeletonProps) => {
  const brand = useBranding();
  const colors = brand.colors;

  // =========================================
  // ✅ UNIFICATION UNIQUE : Rendu du spinner premium
  // =========================================
  if (type === 'page' || type === 'fullscreen') {
    return <LoadingSpinner fullScreen />;
  }

  // =========================================
  // CARD (PULSATION TRÈS DOUCE SANS CLIGNOTEMENT AGRESSIF)
  // =========================================
  if (type === 'card') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-2xl bg-white p-6 border shadow-sm space-y-4 animate-pulse',
              className
            )}
            style={{ 
              borderColor: colors.primary + '15',
            }}
          >
            <div className="flex items-center space-x-4">
              <div 
                className="w-12 h-12 rounded-full"
                style={{ backgroundColor: colors.primary + '15' }}
              />
              <div className="flex-1 space-y-2">
                <div 
                  className="h-4 w-3/4 rounded-full"
                  style={{ backgroundColor: colors.primary + '10' }}
                />
                <div 
                  className="h-3 w-1/2 rounded-full"
                  style={{ backgroundColor: colors.primary + '8' }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div 
                className="h-3 w-full rounded-full"
                style={{ backgroundColor: colors.primary + '8' }}
              />
              <div 
                className="h-3 w-2/3 rounded-full"
                style={{ backgroundColor: colors.primary + '8' }}
              />
            </div>
          </div>
        ))}
      </>
    );
  }

  // =========================================
  // LIST
  // =========================================
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-xl bg-white p-4 border shadow-sm animate-pulse',
            className
          )}
          style={{ 
            borderColor: colors.primary + '15',
          }}
        >
          <div className="flex items-center space-x-4">
            <div 
              className="w-10 h-10 rounded-full"
              style={{ backgroundColor: colors.primary + '15' }}
            />
            <div className="flex-1 space-y-2">
              <div 
                className="h-4 w-3/4 rounded-full"
                style={{ backgroundColor: colors.primary + '10' }}
              />
              <div 
                className="h-3 w-1/3 rounded-full"
                style={{ backgroundColor: colors.primary + '8' }}
              />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default LoadingSkeleton;
