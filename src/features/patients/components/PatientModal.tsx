// 📁 src/features/patients/components/PatientModal.tsx
// 📌 Wrapper pour compatibilité - Redirige vers ModalFullScreen

import { Patient } from '@/types';
import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { PatientModalContent } from './PatientModalContent';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  patient: Patient | null;
  onSuccess: () => void;
}

export const PatientModal = ({
  isOpen,
  onClose,
  mode,
  patient,
  onSuccess,
}: PatientModalProps) => {
  return (
    <ModalFullScreen
      isOpen={isOpen}
      onClose={onClose}
      onBack={onClose}
      title={mode === 'create' ? 'Ajouter un proche' : 'Modifier le proche'}
    >
      <PatientModalContent
        mode={mode}
        patient={patient}
        onSuccess={() => {
          onSuccess();
          onClose();
        }}
        onCancel={onClose}
      />
    </ModalFullScreen>
  );
};

export default PatientModal;
