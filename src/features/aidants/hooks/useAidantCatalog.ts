// 📁 src/features/aidants/hooks/useAidantCatalog.ts

import { useEffect, useState } from 'react';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { useAuthStore } from '@/stores/authStore';

export const useAidantCatalog = () => {
  const { isAuthenticated, profile } = useAuthStore();
  const {
    aidants,
    selectedAidant,
    assignments,
    isLoading,
    error,
    filters,
    fetchAidants,
    fetchAidantById,
    fetchMyAssignments,
    assignAidant,
    revokeAssignment,
    setFilters,
    clearError,
    reset,
  } = useAidantCatalogStore();

  const [isFamily, setIsFamily] = useState(false);

  useEffect(() => {
    if (isAuthenticated && profile?.role === 'family') {
      setIsFamily(true);
    }
  }, [isAuthenticated, profile]);

  // Charger les aidants au montage
  useEffect(() => {
    if (isAuthenticated) {
      fetchAidants();
      if (isFamily) {
        fetchMyAssignments();
      }
    }
  }, [isAuthenticated, isFamily]);

  return {
    // État
    aidants,
    selectedAidant,
    assignments,
    isLoading,
    error,
    filters,
    isFamily,

    // Actions
    fetchAidants,
    fetchAidantById,
    fetchMyAssignments,
    assignAidant,
    revokeAssignment,
    setFilters,
    clearError,
    reset,
  };
};
