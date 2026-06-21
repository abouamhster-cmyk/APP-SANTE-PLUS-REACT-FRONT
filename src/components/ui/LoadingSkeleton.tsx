// 📁 src/components/ui/LoadingSkeleton.tsx

import { cn } from '@/utils/helpers';
import { useAuthStore } from '@/stores/authStore';
import { getLogoByRole } from '@/lib/constants';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingSkeletonProps {
  type?: 'page' | 'card' | 'list' | 'fullscreen';
  count?: number;
  className?: string;
}

export const LoadingSkeleton = ({ type = 'card', count = 1, className }: LoadingSkeletonProps) => {
  const { role, profile } = useAuthStore();
  const logoConfig = getLogoByRole(role, profile?.patient_category);

  // ✅ Skeleton de page avec logo
  if (type === 'page' || type === 'fullscreen') {
    return (
      <div 
        className="flex flex-col items-center justify-center min-h-screen" 
        style={{ background: 'var(--color-background, #f5f0e8)' }}
      >
        <div className="animate-pulse text-center">
          <div className="flex justify-center mb-6">
            <img 
              src={logoConfig.icon}
              alt="Santé Plus" 
              className="w-20 h-20 object-contain"
            />
          </div>
          <div className="h-4 w-48 bg-gray-200 rounded mx-auto mb-2" />
          <div className="h-3 w-32 bg-gray-200 rounded mx-auto" />
          <div className="mt-8 flex flex-col items-center space-y-4">
            <div className="h-12 w-80 bg-gray-200 rounded-xl" />
            <div className="h-12 w-80 bg-gray-200 rounded-xl" />
            <div className="h-12 w-80 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Skeleton de carte
  if (type === 'card') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'animate-pulse rounded-xl bg-white p-6 shadow-sm',
              className || 'h-32 w-full'
            )}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        ))}
      </>
    );
  }

  // Skeleton de liste
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse rounded-xl bg-white p-4 shadow-sm',
            className || 'h-20 w-full'
          )}
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};