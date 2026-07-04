// 📁 frontend/src/features/aidants/hooks/useAidantCatalog.ts

import { useCallback, useMemo, useEffect } from 'react';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { useAssignmentStore } from '@/stores/assignmentStore';
import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { 
  AidantFilters, 
  DEFAULT_FILTERS, 
  AssignmentType,
  AidantSpecialty 
} from '@/types';
import { ASSIGNMENT_TYPES } from '@/types/assignment';
import toast from 'react-hot-toast';

export const useAidantCatalog = () => {
  const { user, profile } = useAuthStore();
  const { patients, fetchPatients } = usePatientStore();
  
  // ✅ Utiliser les deux stores
  const {
    aidants,
    selectedAidant,
    isLoading: catalogLoading,
    error,
    filters,
    fetchAidants,
    fetchAidantById,
    setFilters,
    clearError,
    reset: resetCatalog,
  } = useAidantCatalogStore();

  // ✅ Nouveau store d'assignation
  const {
    assignments,
    isLoading: assignmentLoading,
    fetchAssignments,
    assignAidant: assignAidantStore,
    revokeAssignment: revokeAssignmentStore,
    isInitialized,
    reset: resetAssignment,
  } = useAssignmentStore();

  const isFamily = useMemo(() => profile?.role === 'family', [profile]);
  const isAidant = useMemo(() => profile?.role === 'aidant', [profile]);
  const isAdmin = useMemo(() => profile?.role === 'admin' || profile?.role === 'coordinator', [profile]);

  const isLoading = catalogLoading || assignmentLoading;

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

  // ✅ Utiliser le nouveau système d'assignation
  const loadMyAssignments = useCallback(async () => {
    if (!isFamily && !isAidant) return;
    try {
      await fetchAssignments();
    } catch (error) {
      console.error('❌ Erreur chargement assignations:', error);
      toast.error('Impossible de charger vos assignations');
    }
  }, [isFamily, isAidant, fetchAssignments]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const assignAidant = useCallback(async (
    aidantId: string, 
    patientId: string | null = null, 
    assignmentType: AssignmentType = ASSIGNMENT_TYPES.PRIMARY
  ) => {
    if (!isFamily) {
      toast.error('Seules les familles peuvent assigner des aidants');
      return null;
    }

    try {
      // ✅ Utiliser le nouveau système d'assignation
      const result = await assignAidantStore({
        aidantUserId: aidantId,  // L'ID de l'aidant (table aidants)
        targetType: patientId ? 'patient' : 'personal_account',
        targetId: patientId || user?.id || '',
        assignmentType: assignmentType,
        familyId: user?.id || null,
      });
      
      // ✅ Rafraîchir les données
      await loadMyAssignments();
      await loadAidants();
      
      return result;
    } catch (error) {
      console.error('❌ Erreur assignation:', error);
      toast.error('Impossible d\'assigner cet aidant');
      return null;
    }
  }, [isFamily, assignAidantStore, loadMyAssignments, loadAidants, user]);

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
    return assignments.filter(a => a.status === 'active');
  }, [assignments]);

  const isAidantAssigned = useCallback((aidantUserId: string): boolean => {
    return assignments.some(
      a => a.aidant_user_id === aidantUserId && a.status === 'active'
    );
  }, [assignments]);

  const getAssignmentsForPatient = useCallback((patientId: string) => {
    return assignments.filter(
      a => a.target_type === 'patient' && a.target_id === patientId && a.status === 'active'
    );
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
    isInitialized,

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
    isAidantAssigned,
    getAssignmentsForPatient,

    // Nettoyage
    clearError,
    reset: () => {
      resetCatalog();
      resetAssignment();
    },
  };
};

export type UseAidantCatalogReturn = ReturnType<typeof useAidantCatalog>;
