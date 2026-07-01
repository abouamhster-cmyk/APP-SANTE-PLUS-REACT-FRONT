// 📁 src/components/ui/LoadingSkeleton.tsx

import { cn } from '@/utils/helpers';
import { useAuthStore } from '@/stores/authStore';
import { getLogoByRole } from '@/lib/constants';

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
  const { role, profile } = useAuthStore();
  const logoConfig = getLogoByRole(role, profile?.patient_category);

  // =========================================
  // PAGE / FULLSCREEN
  // =========================================
  if (type === 'page' || type === 'fullscreen') {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen"
        style={{
          background: 'rgba(245,240,232,0.9)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div className="animate-pulse text-center">
          
          <div className="flex justify-center mb-6">
            <img
              src={logoConfig.icon}
              alt="logo"
              className="w-20 h-20 object-contain opacity-80"
            />
          </div>

          <div className="space-y-2">
            <div className="h-4 w-40 rounded-full bg-neutral-200 mx-auto shimmer" />
            <div className="h-3 w-24 rounded-full bg-neutral-200 mx-auto shimmer" />
          </div>

          <div className="mt-8 space-y-4">
            <div className="h-12 w-72 rounded-xl bg-neutral-200 shimmer" />
            <div className="h-12 w-72 rounded-xl bg-neutral-200 shimmer" />
            <div className="h-12 w-72 rounded-xl bg-neutral-200 shimmer" />
          </div>
        </div>
      </div>
    );
  }

  // =========================================
  // CARD
  // =========================================
  if (type === 'card') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-2xl bg-white p-6 shadow-sm space-y-4',
              className
            )}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-neutral-200 shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded-full bg-neutral-200 shimmer" />
                <div className="h-3 w-1/2 rounded-full bg-neutral-200 shimmer" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-3 w-full rounded-full bg-neutral-200 shimmer" />
              <div className="h-3 w-2/3 rounded-full bg-neutral-200 shimmer" />
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
            'rounded-xl bg-white p-4 shadow-sm',
            className
          )}
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-neutral-200 shimmer" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded-full bg-neutral-200 shimmer" />
              <div className="h-3 w-1/3 rounded-full bg-neutral-200 shimmer" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
