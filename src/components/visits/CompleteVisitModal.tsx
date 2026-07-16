// 📁 src/components/visits/CompleteVisitModal.tsx
// 💡 Soumission du rapport de visite par l'intervenant

import { Modal } from '@/components/ui/Modal';  
import { CompleteVisitModalContent } from './CompleteVisitModalContent';

interface CompleteVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: any;
  visitId: string;  
  patientCategory: 'senior' | 'maman_bebe';
  onSubmit: (data: {
    actions: string[];
    notes: string;
    audio_url?: string;
    photos: string[];
  }) => Promise<void>;
  isLoading: boolean;
}

export const CompleteVisitModal = ({
  isOpen,
  onClose,
  visit,
  visitId,  
  patientCategory,
  onSubmit,
  isLoading,
}: CompleteVisitModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="✅ Terminer la visite"
      maxWidth="xl" 
    >
      <CompleteVisitModalContent
        visit={visit}
        visitId={visitId}  
        patientCategory={patientCategory}
        onSubmit={onSubmit}
        onCancel={onClose}
        isLoading={isLoading}
      />
    </Modal>
  );
};

export default CompleteVisitModal;
