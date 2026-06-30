// 📁 frontend/src/features/aidants/hooks/useAidantCatalog.ts

import { useCallback, useMemo } from 'react';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { 
  AidantFilters, 
  DEFAULT_FILTERS, 
  AssignmentType,
  AidantSpecialty 
} from '@/types';
import toast from 'react-hot-toast';

export const useAidantCatalog = () => {
  const { user, profile } = useAuthStore();
  const { patients, fetchPatients } = usePatientStore();
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
    assignAidant: assignAidantStore,
    revokeAssignment: revokeAssignmentStore,
    setFilters,
    clearError,
    reset,
  } = useAidantCatalogStore();

  const isFamily = useMemo(() => profile?.role === 'family', [profile]);
  const isAidant = useMemo(() => profile?.role === 'aidant', [profile]);
  const isAdmin = useMemo(() => profile?.role === 'admin' || profile?.role === 'coordinator', [profile]);

  // ============================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================

  const loadAidants = useCallback(async (customFilters?: Partial<AidantFilters>) => {
    try {
      await fetchAidants(customFilters);
    } catch (error) {
      console.error('❌ Erreur chargement aidants:', error);
      toast.error('Impossible de charger la liste des aidants');
    }
  }, [fetchAidants]);

  const loadAidantDetails = useCallback(async (aidantId: string) => {
    try {
      await fetchAidantById(aidantId);
    } catch (error) {
      console.error('❌ Erreur chargement détails aidant:', error);
      toast.error('Impossible de charger les détails de l\'aidant');
    }
  }, [fetchAidantById]);

  const loadMyAssignments = useCallback(async () => {
    if (!isFamily) return;
    try {
      await fetchMyAssignments();
    } catch (error) {
      console.error('❌ Erreur chargement assignations:', error);
      toast.error('Impossible de charger vos assignations');
    }
  }, [isFamily, fetchMyAssignments]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const assignAidant = useCallback(async (aidantId: string, patientId: string, assignmentType: AssignmentType = 'permanente') => {
    if (!isFamily) {
      toast.error('Seules les familles peuvent assigner des aidants');
      return null;
    }

    try {
      const result = await assignAidantStore(aidantId, patientId, assignmentType);
      await loadMyAssignments();
      await loadAidants();
      return result;
    } catch (error) {
      console.error('❌ Erreur assignation:', error);
      toast.error('Impossible d\'assigner cet aidant');
      return null;
    }
  }, [isFamily, assignAidantStore, loadMyAssignments, loadAidants]);

  const revokeAssignment = useCallback(async (assignmentId: string) => {
    if (!isFamily) {
      toast.error('Seules les familles peuvent révoquer des assignations');
      return false;
    }

    try {
      await revokeAssignmentStore(assignmentId);
      await loadMyAssignments();
      await loadAidants();
      return true;
    } catch (error) {
      console.error('❌ Erreur révocation:', error);
      toast.error('Impossible de révoquer cette assignation');
      return false;
    }
  }, [isFamily, revokeAssignmentStore, loadMyAssignments, loadAidants]);

  // ============================================================
  // UTILITAIRES
  // ============================================================

  const getAidantById = useCallback((aidantId: string) => {
    return aidants.find(a => a.id === aidantId) || null;
  }, [aidants]);

  const getAvailableAidants = useCallback(() => {
    return aidants.filter(a => a.is_available);
  }, [aidants]);

  const getAidantsBySpecialty = useCallback((specialty: AidantSpecialty) => {
    return aidants.filter(a => a.specialties.includes(specialty));
  }, [aidants]);

  const getAidantsByZone = useCallback((zone: string) => {
    return aidants.filter(a => a.zones.includes(zone));
  }, [aidants]);

  const getActiveAssignments = useCallback(() => {
    return assignments.filter(a => a.relationship !== 'cancelled');
  }, [assignments]);

  // ============================================================
  // RETOUR
  // ============================================================

  return {
    // État
    aidants,
    selectedAidant,
    assignments,
    isLoading,
    error,
    filters,
    patients,
    isFamily,
    isAidant,
    isAdmin,

    // Actions principales
    loadAidants,
    loadAidantDetails,
    loadMyAssignments,
    assignAidant,
    revokeAssignment,

    // Filtres
    setFilters,
    DEFAULT_FILTERS,

    // Utilitaires
    getAidantById,
    getAvailableAidants,
    getAidantsBySpecialty,
    getAidantsByZone,
    getActiveAssignments,

    // Nettoyage
    clearError,
    reset,
  };
};

export type UseAidantCatalogReturn = ReturnType<typeof useAidantCatalog>;
