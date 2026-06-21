// 📁 src/components/patients/PatientCard.tsx

import { Patient } from '@/types';
import { MapPin, Phone, Edit2, Trash2 } from 'lucide-react';
import { getThemeColors } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';

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
  
  // ✅ Jargon dynamique selon le rôle
  const {
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

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
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: colors.primary + '15', color: colors.primary }}>
                {getCategoryLabelText()}
              </span>
              {patient.age && (
                <span className="text-xs" style={{ color: colors.text + '60' }}>🎂 {patient.age} ans</span>
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
    </div>
  );
};