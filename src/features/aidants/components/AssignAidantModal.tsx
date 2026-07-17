// 📁 src/features/aidants/components/AssignAidantModal.tsx
// ✅ ENVELOPPE DE MODALE ASSIGNATION : SUPPORT TYPÉ DE LA CIBLE COMMANDE 'ORDER'

import { Modal } from '@/components/ui/Modal'; 
import { AssignAidantModalContent } from './AssignAidantModalContent';

interface AssignAidantModalProps {
  isOpen: boolean;
  onClose: () => void;
  aidant?: any;
  patients?: any[];
  onSuccess: () => void;
  colors: any;
  targetType?: 'visit' | 'patient' | 'personal_account' | 'order'; // ✅ AJOUTÉ : 'order' supporté
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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdmin ? '👔 Assigner un aidant' : '🦸 Choisir un aidant'}
      maxWidth="xl"  
    >
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
    </Modal>
  );
};

export default AssignAidantModal;
