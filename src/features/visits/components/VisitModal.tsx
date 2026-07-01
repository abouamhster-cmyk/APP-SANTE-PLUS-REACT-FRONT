// 📁 src/features/visits/components/VisitModal.tsx
// 📌 Wrapper pour compatibilité - Redirige vers ModalFullScreen

import { Visit, Patient } from '@/types';
import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { VisitModalContent } from './VisitModalContent';

interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  visit: Visit | null;
  patients: Patient[];
  onSuccess: () => void;
}

export const VisitModal = ({
  isOpen,
  onClose,
  mode,
  visit,
  patients,
  onSuccess,
}: VisitModalProps) => {
  return (
    <ModalFullScreen
      isOpen={isOpen}
      onClose={onClose}
      onBack={onClose}
      title={mode === 'create' ? 'Planifier une visite' : 'Modifier la visite'}
    >
      <VisitModalContent
        mode={mode}
        visit={visit}
        patients={patients}
        onSuccess={() => {
          onSuccess();
          onClose();
        }}
        onCancel={onClose}
      />
    </ModalFullScreen>
  );
};

export default VisitModal;
