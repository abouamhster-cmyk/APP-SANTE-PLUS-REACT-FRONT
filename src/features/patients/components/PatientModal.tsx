// 📁 src/features/patients/components/PatientModal.tsx
// 💡 Wrapper épuré centré utilisant le composant de dialogue classique

import { Patient } from '@/types';
import { Modal } from '@/components/ui/Modal'; // 💡 Remplacement par le Modal classique
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Ajouter un proche' : 'Modifier le proche'}
      maxWidth="xl"  
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
    </Modal>
  );
};

export default PatientModal;
