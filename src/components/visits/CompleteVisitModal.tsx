// 📁 src/components/visits/CompleteVisitModal.tsx

import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
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
    <ModalFullScreen
      isOpen={isOpen}
      onClose={onClose}
      onBack={onClose}
      title="✅ Terminer la visite"
    >
      <CompleteVisitModalContent
        visit={visit}
        visitId={visitId}  
        patientCategory={patientCategory}
        onSubmit={onSubmit}
        onCancel={onClose}
        isLoading={isLoading}
      />
    </ModalFullScreen>
  );
};
