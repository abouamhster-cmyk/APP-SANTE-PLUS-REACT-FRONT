// 📁 src/hooks/useBranding.ts

import { useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getBrandConfigByRole, BrandConfig } from '@/lib/branding';

export const useBranding = (): BrandConfig => {
  const { role, profile } = useAuthStore();
  
  return useMemo(() => {
    return getBrandConfigByRole(role, profile?.patient_category);
  }, [role, profile?.patient_category]);
};

export default useBranding;
