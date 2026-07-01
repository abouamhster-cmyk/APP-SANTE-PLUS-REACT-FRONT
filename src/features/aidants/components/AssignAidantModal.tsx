// 📁 src/features/aidants/components/AssignAidantModal.tsx
// 📌 Wrapper pour compatibilité - Redirige vers ModalFullScreen

import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { AssignAidantModalContent } from './AssignAidantModalContent';

interface AssignAidantModalProps {
  isOpen: boolean;
  onClose: () => void;
  aidant: any;
  patients: any[];
  onSuccess: () => void;
  colors: any;
}

export const AssignAidantModal = ({
  isOpen,
  onClose,
  aidant,
  patients,
  onSuccess,
  colors,
}: AssignAidantModalProps) => {
  return (
    <ModalFullScreen
      isOpen={isOpen}
      onClose={onClose}
      onBack={onClose}
      title="Assigner un aidant"
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
      />
    </ModalFullScreen>
  );
};

export default AssignAidantModal;
