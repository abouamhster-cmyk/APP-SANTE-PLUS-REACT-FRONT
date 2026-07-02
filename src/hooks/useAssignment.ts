// 📁 frontend/src/hooks/useAssignment.ts

import { useEffect, useCallback, useMemo } from 'react';
import { useAssignmentStore } from '@/stores/assignmentStore';
import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { 
  TargetType, 
  AssignmentType, 
  AssignmentStatus,
  TARGET_TYPES,
  ASSIGNMENT_TYPES,
} from '@/types/assignment';
import toast from 'react-hot-toast';

interface UseAssignmentOptions {
  targetType?: TargetType;
  targetId?: string;
  familyId?: string;
  autoFetch?: boolean;
}

export const useAssignment = (options: UseAssignmentOptions = {}) => {
  const { 
    targetType = TARGET_TYPES.PATIENT,
    targetId,
    familyId,
    autoFetch = true,
  } = options;

  const { user, profile } = useAuthStore();
  const { patients, fetchPatients } = usePatientStore();
  
  const {
    assignments,
    activeAidant,
    allAidants,
    isLoading,
    error,
    isInitialized,
    fetchAssignments,
    fetchActiveAidant,
    fetchAllAidants,
    assignAidant,
    revokeAssignment,
    checkAssignment,
    clearError,
    reset,
  } = useAssignmentStore();

  const isAdmin = useMemo(() => 
    profile?.role === 'admin' || profile?.role === 'coordinator',
    [profile]
  );

  const isFamily = useMemo(() => 
    profile?.role === 'family',
    [profile]
  );

  const isAidant = useMemo(() => 
    profile?.role === 'aidant',
    [profile]
  );

  // ============================================================
  // CHARGEMENT AUTOMATIQUE
  // ============================================================

  useEffect(() => {
    if (autoFetch && targetId && isInitialized) {
      fetchActiveAidant(targetType, targetId, familyId);
      fetchAllAidants(targetType, targetId, familyId);
    }
  }, [autoFetch, targetId, targetType, familyId, isInitialized]);

  // ============================================================
  // FONCTIONS
  // ============================================================

  /**
   * Récupère l'aidant actif pour la cible courante
   */
  const getActiveAidant = useCallback(async () => {
    if (!targetId) {
      toast.error('targetId est requis');
      return null;
    }
    
    await fetchActiveAidant(targetType, targetId, familyId);
    return activeAidant;
  }, [targetId, targetType, familyId, fetchActiveAidant, activeAidant]);

  /**
   * Récupère tous les aidants pour la cible courante
   */
  const getAllAidants = useCallback(async () => {
    if (!targetId) {
      toast.error('targetId est requis');
      return [];
    }
    
    await fetchAllAidants(targetType, targetId, familyId);
    return allAidants;
  }, [targetId, targetType, familyId, fetchAllAidants, allAidants]);

  /**
   * Assigne un aidant à une cible
   */
  const assign = useCallback(async (
    aidantUserId: string,
    assignmentType: AssignmentType = ASSIGNMENT_TYPES.PRIMARY,
    reason?: string,
    expiresAt?: string
  ) => {
    if (!targetId) {
      toast.error('targetId est requis');
      return null;
    }

    try {
      const result = await assignAidant({
        aidantUserId,
        targetType,
        targetId,
        familyId: familyId || null,
        assignmentType,
        reason: reason || null,
        expiresAt: expiresAt || null,
      });

      // Rafraîchir les données
      await getActiveAidant();
      await getAllAidants();
      
      return result;
    } catch (error) {
      console.error('❌ Assign error:', error);
      return null;
    }
  }, [targetId, targetType, familyId, assignAidant, getActiveAidant, getAllAidants]);

  /**
   * Révoque une assignation
   */
  const revoke = useCallback(async (
    assignmentId: string,
    reason?: string
  ) => {
    try {
      await revokeAssignment(assignmentId, reason);
      
      // Rafraîchir les données
      await getActiveAidant();
      await getAllAidants();
      
      return true;
    } catch (error) {
      console.error('❌ Revoke error:', error);
      return false;
    }
  }, [revokeAssignment, getActiveAidant, getAllAidants]);

  /**
   * Vérifie si un aidant est assigné à la cible
   */
  const check = useCallback(async (
    aidantUserId: string
  ): Promise<boolean> => {
    if (!targetId) return false;
    return checkAssignment(aidantUserId, targetType, targetId);
  }, [targetId, targetType, checkAssignment]);

  /**
   * Récupère l'aidant principal (primary) pour la cible
   */
  const getPrimaryAidant = useCallback(() => {
    const primary = allAidants.find(a => a.assignment_type === ASSIGNMENT_TYPES.PRIMARY);
    return primary || null;
  }, [allAidants]);

  /**
   * Récupère les aidants secondaires pour la cible
   */
  const getSecondaryAidants = useCallback(() => {
    return allAidants.filter(a => a.assignment_type === ASSIGNMENT_TYPES.SECONDARY);
  }, [allAidants]);

  /**
   * Vérifie si la cible a un aidant assigné
   */
  const hasAidant = useCallback(() => {
    return activeAidant?.aidant_id !== null;
  }, [activeAidant]);

  /**
   * Vérifie si un aidant spécifique est le principal
   */
  const isPrimary = useCallback((aidantUserId: string) => {
    const primary = getPrimaryAidant();
    return primary?.aidant_user_id === aidantUserId;
  }, [getPrimaryAidant]);

  // ============================================================
  // RETOUR
  // ============================================================

  return {
    // État
    assignments,
    activeAidant,
    allAidants,
    isLoading,
    error,
    isInitialized,
    isAdmin,
    isFamily,
    isAidant,

    // Fonctions principales
    getActiveAidant,
    getAllAidants,
    assign,
    revoke,
    check,

    // Fonctions utilitaires
    getPrimaryAidant,
    getSecondaryAidants,
    hasAidant,
    isPrimary,

    // Nettoyage
    clearError,
    reset,
  };
};

export default useAssignment;
