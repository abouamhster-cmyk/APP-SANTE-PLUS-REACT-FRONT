// 📁 src/features/discharge/components/DischargeRequestModal.tsx
// 📌 Wrapper pour compatibilité

import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { DischargeRequestModalContent } from './DischargeRequestModalContent';

interface DischargeRequestModalProps {
  patients: any[];
  onClose: () => void;
  onSuccess: () => void;
  colors: any;
}

export const DischargeRequestModal = ({
  patients,
  onClose,
  onSuccess,
  colors,
}: DischargeRequestModalProps) => {
  return (
    <ModalFullScreen
      isOpen={true}
      onClose={onClose}
      onBack={onClose}
      title="🏥 Demande de sortie"
    >
      <DischargeRequestModalContent
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

export default DischargeRequestModal;
