// 📁 src/features/aidants/components/AssignAidantModal.tsx
// ✅ ENVELOPPE DE MODALE ASSIGNATION : TÉLÉPORTATION PAR PORTAIL POUR UN RECOUVREMENT PLEIN ÉCRAN OPAQUE SANS GAP (z-100)

import { createPortal } from 'react-dom'; 
import { X } from 'lucide-react';
import { AssignAidantModalContent } from './AssignAidantModalContent';

interface AssignAidantModalProps {
  isOpen: boolean;
  onClose: () => void;
  aidant?: any;
  patients?: any[];
  onSuccess: () => void;
  colors: any;
  targetType?: 'visit' | 'patient' | 'personal_account' | 'order';
  targetId?: string;
  targetName?: string;
  currentAidantId?: string | null;
  allowForce?: boolean;
  onAssignAidant?: (aidantId: string, assignmentType: string, force?: boolean) => Promise<void>;
  isAdmin?: boolean;
}

export const AssignAidantModal = ({
  isOpen,
  onClose,
  aidant,
  patients = [],
  onSuccess,
  colors,
  targetType = 'patient',
  targetId,
  targetName,
  currentAidantId,
  allowForce = false,
  onAssignAidant,
  isAdmin = false,
}: AssignAidantModalProps) => {
  if (!isOpen) return null;

  // ✅ CONSTITUTION DE L'IHM MODALE ÉPURÉE ET PARFAITEMENT CENTRÉE SANS ENCOMBREMENT
  const modalHTML = (
    <div 
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl relative space-y-4 animate-slideUp sm:animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête de la modale */}
        <div className="flex items-center justify-between border-b pb-3.5">
          <h2 className="text-sm sm:text-base font-black text-gray-800">
            {isAdmin ? '👔 Assigner un aidant' : '🦸 Choisir un aidant'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-gray-100 rounded-xl transition text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenu */}
        <AssignAidantModalContent
          aidant={aidant}
          patients={patients}
          onSuccess={() => {
            onSuccess();
            onClose();
          }}
          onCancel={onClose}
          colors={colors}
          targetType={targetType}
          targetId={targetId}
          targetName={targetName}
          currentAidantId={currentAidantId}
          allowForce={allowForce}
          onAssignAidant={onAssignAidant}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );

   return createPortal(modalHTML, document.body);
};

export default AssignAidantModal;
