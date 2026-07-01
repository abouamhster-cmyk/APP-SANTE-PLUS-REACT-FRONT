// 📁 src/features/discharge/components/DischargeDetailsModal.tsx
// 📌 Wrapper pour compatibilité

import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { DischargeDetailsModalContent } from './DischargeDetailsModalContent';

interface DischargeDetailsModalProps {
  discharge: any;
  onClose: () => void;
  onUpdate: () => void;
  colors: any;
}

export const DischargeDetailsModal = ({
  discharge,
  onClose,
  onUpdate,
  colors,
}: DischargeDetailsModalProps) => {
  return (
    <ModalFullScreen
      isOpen={true}
      onClose={onClose}
      onBack={onClose}
      title="🏥 Détails de la sortie"
    >
      <DischargeDetailsModalContent
        discharge={discharge}
        onClose={onClose}
        onUpdate={onUpdate}
        colors={colors}
      />
    </ModalFullScreen>
  );
};

export default DischargeDetailsModal;
