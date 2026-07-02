// 📁 src/components/patients/PatientCard.tsx

import { useEffect, useState } from 'react';
import { Patient } from '@/types';
import { MapPin, Phone, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';
import { getThemeColors } from '@/lib/permissions';
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
  const colors = getThemeColors('senior');
  const { user, profile } = useAuthStore();
  const { fetchActiveAidant, activeAidant, isLoading } = useAssignmentStore();
  
  const [assignedAidant, setAssignedAidant] = useState<any>(null);
  const [isLoadingAidant, setIsLoadingAidant] = useState(false);

  // ✅ Jargon dynamique selon le rôle
  const {
    singular,
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  // ✅ Récupérer l'aidant assigné au patient
  useEffect(() => {
    const getAidant = async () => {
      if (!patient?.id || !user) return;
      
      setIsLoadingAidant(true);
      try {
        const familyId = user.id;
        await fetchActiveAidant('patient', patient.id, familyId);
        
        if (activeAidant?.aidant) {
          setAssignedAidant(activeAidant.aidant);
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
  }, [patient?.id, user, fetchActiveAidant, activeAidant]);

  // ✅ Libellé dynamique pour le patient
  const getPatientLabel = () => {
    if (isFamily) return 'Proche';
    if (isAidant) return 'Personne accompagnée';
    if (isAdminOrCoordinator) return 'Bénéficiaire';
    return 'Patient';
  };

  const getCategoryLabelText = () => {
    if (patient.category === 'maman_bebe') {
      return '👶 Maman & Bébé';
    }
    return '👴 Senior';
  };

  // ✅ Version compacte
  if (compact) {
    return (
      <div
        className="bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-all border cursor-pointer hover:border-[var(--color-primary)]/30"
        style={{ borderColor: colors.border }}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0" style={{ background: colors.primary }}>
            {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate" style={{ color: colors.text }}>
              {patient.first_name} {patient.last_name}
            </h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: colors.primary + '15', color: colors.primary }}>
                {getCategoryLabelText()}
              </span>
              {patient.age && (
                <span className="text-[10px]" style={{ color: colors.text + '60' }}>🎂 {patient.age} ans</span>
              )}
              {/* ✅ Afficher l'aidant assigné */}
              {assignedAidant && !isLoadingAidant && (
                <span className="text-[10px] flex items-center gap-0.5 text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                  <UserCheck size={10} />
                  {assignedAidant.full_name?.split(' ')[0] || 'Aidant'}
                </span>
              )}
              {!assignedAidant && !isLoadingAidant && isAdminOrCoordinator && (
                <span className="text-[10px] flex items-center gap-0.5 text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
                  <UserX size={10} />
                  Non assigné
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
              <Edit2 size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ✅ Version complète
  return (
    <div
      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border cursor-pointer hover:border-[var(--color-primary)]/30"
      style={{ borderColor: colors.border }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-xl flex-shrink-0" style={{ background: colors.primary }}>
            {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
              {patient.first_name} {patient.last_name}
            </h3>
            <div className="flex items-center flex-wrap gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: colors.primary + '15', color: colors.primary }}>
                {getCategoryLabelText()}
              </span>
              {patient.age && (
                <span className="text-xs" style={{ color: colors.text + '60' }}>🎂 {patient.age} ans</span>
              )}
              {/* ✅ Afficher l'aidant assigné */}
              {assignedAidant && !isLoadingAidant && (
                <span className="text-xs flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <UserCheck size={12} />
                  Aidant: {assignedAidant.full_name}
                </span>
              )}
              {!assignedAidant && !isLoadingAidant && isAdminOrCoordinator && (
                <span className="text-xs flex items-center gap-1 text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                  <UserX size={12} />
                  Non assigné
                </span>
              )}
              {isLoadingAidant && (
                <span className="text-xs text-gray-400 animate-pulse">⏳ Chargement...</span>
              )}
            </div>
          </div>
        </div>
        {showActions && (
          <div className="flex space-x-2">
            {onEdit && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                style={{ color: colors.primary }}
              >
                <Edit2 size={18} />
              </button>
            )}
            {onDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                className="p-2 hover:bg-red-50 rounded-lg transition text-red-500"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center space-x-2 text-sm" style={{ color: colors.text + '70' }}>
          <MapPin size={16} />
          <span>{patient.address}</span>
        </div>
        {patient.phone && (
          <div className="flex items-center space-x-2 text-sm" style={{ color: colors.text + '70' }}>
            <Phone size={16} />
            <span>{patient.phone}</span>
          </div>
        )}
        {patient.emergency_contact && (
          <div className="flex items-center space-x-2 text-sm" style={{ color: colors.text + '70' }}>
            <span>🆘</span>
            <span>Urgence: {patient.emergency_contact}</span>
          </div>
        )}
      </div>

      {patient.notes && (
        <div className="mt-3 p-3 rounded-xl" style={{ background: colors.primary + '05' }}>
          <p className="text-sm" style={{ color: colors.text + '60' }}>{patient.notes}</p>
        </div>
      )}

      {/* ✅ Footer avec info d'assignation */}
      {isAdminOrCoordinator && (
        <div className="mt-4 pt-3 border-t" style={{ borderColor: colors.border }}>
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: colors.text + '50' }}>
              {assignedAidant ? (
                <span className="flex items-center gap-1 text-green-600">
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
                className="text-[10px] font-medium hover:underline"
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
