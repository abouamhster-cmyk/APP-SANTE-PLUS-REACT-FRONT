// 📁 src/components/patients/PatientCard.tsx
// ✅ PATIENT CARD COMPACT & COMPLETE : RESOLUTION DES TARGETS DYNAMIQUE ET RESPONSIVE

import { useEffect, useState } from 'react';
import { Patient } from '@/types';
import { MapPin, Phone, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { useAssignmentStore } from '@/stores/assignmentStore';
import { useAuthStore } from '@/stores/authStore';

interface PatientCardProps {
  patient: Patient;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export const PatientCard = ({ 
  patient, 
  onEdit, 
  onDelete, 
  onClick,
  showActions = false, 
  compact = false 
}: PatientCardProps) => {
  const brand = useBranding();
  const colors = brand.colors;
  const { user } = useAuthStore();
  const { fetchActiveAidant, activeAidant } = useAssignmentStore();
  
  const [assignedAidant, setAssignedAidant] = useState<any>(null);
  const [isLoadingAidant, setIsLoadingAidant] = useState(false);

  const {
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  useEffect(() => {
    const getAidant = async () => {
      if (!patient?.id || !user) return;
      
      setIsLoadingAidant(true);
      try {
        const familyId = user.id;
        
        // ✅ AIGUILLAGE COHÉRENT : Si le bénéficiaire est un compte personnel mappé en mémoire, interroger avec la bonne clé
        const isPersonal = patient.last_name === '(Compte Personnel)';
        const targetType = isPersonal ? 'personal_account' : 'patient';
        
        await fetchActiveAidant(targetType, patient.id, familyId);
        
        const freshActiveAidant = useAssignmentStore.getState().activeAidant;
        if (freshActiveAidant?.aidant) {
          setAssignedAidant(freshActiveAidant.aidant);
        } else {
          setAssignedAidant(null);
        }
      } catch (error) {
        console.error('❌ Erreur récupération aidant assigné:', error);
        setAssignedAidant(null);
      } finally {
        setIsLoadingAidant(false);
      }
    };

    getAidant();
  }, [patient?.id, user?.id]);

  const getCategoryLabelText = () => {
    if (patient.category === 'maman_bebe') {
      return '👶 Maman & Bébé';
    }
    return '👴 Senior';
  };

  // ✅ VERSION COMPACTE MOBILE-FIRST
  if (compact) {
    return (
      <div
        className="bg-white rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all border cursor-pointer hover:border-[var(--color-primary)]/30 w-full overflow-hidden"
        style={{ borderColor: colors.primary + '20' }}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0" 
            style={{ background: colors.primary }}
          >
            {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="font-bold text-xs sm:text-sm truncate" style={{ color: colors.text }}>
              {patient.first_name} {patient.last_name !== '(Compte Personnel)' ? patient.last_name : ''}
            </h4>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-neutral-50 border border-neutral-100 shrink-0">
                {getCategoryLabelText()}
              </span>
              {patient.age && (
                <span className="text-[9px] sm:text-[10px] font-bold" style={{ color: colors.textLight }}>🎂 {patient.age} ans</span>
              )}
              {assignedAidant && !isLoadingAidant && (
                <span className="text-[9px] sm:text-[10px] font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: colors.primary + '10', color: colors.primary }}>
                  <UserCheck size={10} />
                  {assignedAidant.full_name?.split(' ')[0] || 'Aidant'}
                </span>
              )}
            </div>
          </div>
          {showActions && onEdit && (
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }} 
              className="p-1.5 hover:bg-gray-100 rounded-lg transition shrink-0"
              style={{ color: colors.primary }}
            >
              <Edit2 size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ✅ VERSION COMPLÈTE ADAPTATIVE
  return (
    <div
      className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all border cursor-pointer hover:border-[var(--color-primary)]/30 w-full overflow-hidden"
      style={{ borderColor: colors.primary + '20' }}
      onClick={onClick}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center space-x-4 min-w-0">
          <div 
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-semibold text-lg sm:text-xl flex-shrink-0" 
            style={{ background: colors.primary }}
          >
            {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold truncate" style={{ color: colors.text }}>
              {patient.first_name} {patient.last_name !== '(Compte Personnel)' ? patient.last_name : ''}
            </h3>
            <div className="flex items-center flex-wrap gap-1.5 mt-1">
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold bg-neutral-50 border border-neutral-100">
                {getCategoryLabelText()}
              </span>
              {patient.age && (
                <span className="text-[10px] sm:text-xs font-bold" style={{ color: colors.textLight }}>🎂 {patient.age} ans</span>
              )}
              {assignedAidant && !isLoadingAidant && (
                <span className="text-[10px] sm:text-xs font-bold flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: colors.primary + '10', color: colors.primary }}>
                  <UserCheck size={12} />
                  Aidant: {assignedAidant.full_name}
                </span>
              )}
              {!assignedAidant && !isLoadingAidant && isAdminOrCoordinator && (
                <span className="text-[10px] sm:text-xs font-bold flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: '#EF444410', color: '#EF4444' }}>
                  <UserX size={12} />
                  Non assigné
                </span>
              )}
              {isLoadingAidant && (
                <span className="text-[10px] sm:text-xs animate-pulse" style={{ color: colors.textLight }}>⏳ Chargement...</span>
              )}
            </div>
          </div>
        </div>
        
        {showActions && (
          <div className="flex space-x-1.5 self-end sm:self-auto shrink-0">
            {onEdit && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                style={{ color: colors.primary }}
              >
                <Edit2 size={16} />
              </button>
            )}
            {onDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                className="p-2 hover:bg-red-50 rounded-lg transition text-red-500"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2 text-xs sm:text-sm font-semibold" style={{ color: colors.text + 'b0' }}>
        <div className="flex items-start space-x-2">
          <MapPin size={16} className="shrink-0 mt-0.5 text-gray-400" />
          <span className="leading-relaxed">{patient.address}</span>
        </div>
        {patient.phone && (
          <div className="flex items-center space-x-2">
            <Phone size={16} className="shrink-0 text-gray-400" />
            <span>{patient.phone}</span>
          </div>
        )}
        {patient.emergency_contact && (
          <div className="flex items-center space-x-2">
            <span className="text-sm shrink-0">🆘</span>
            <span>Urgence: {patient.emergency_contact}</span>
          </div>
        )}
      </div>

      {patient.notes && (
        <div className="mt-3.5 p-3 rounded-xl bg-gray-50/50 border border-gray-100/30">
          <p className="text-xs sm:text-sm font-medium leading-relaxed" style={{ color: colors.text + '90' }}>{patient.notes}</p>
        </div>
      )}

      {isAdminOrCoordinator && (
        <div className="mt-4 pt-3 border-t" style={{ borderColor: colors.primary + '15' }}>
          <div className="flex items-center justify-between text-xs font-bold">
            <span style={{ color: colors.text + '50' }}>
              {assignedAidant ? (
                <span className="flex items-center gap-1" style={{ color: colors.primary }}>
                  <UserCheck size={14} />
                  Aidant: {assignedAidant.full_name}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-400">
                  <UserX size={14} />
                  Aucun aidant assigné
                </span>
              )}
            </span>
            {isAdminOrCoordinator && (
              <button
                onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                className="text-[10px] font-bold hover:underline"
                style={{ color: colors.primary }}
              >
                Gérer les assignations
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientCard;
