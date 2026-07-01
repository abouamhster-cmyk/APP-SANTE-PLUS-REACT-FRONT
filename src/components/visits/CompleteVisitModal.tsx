// 📁 src/components/visits/CompleteVisitModal.tsx
// 📌 Wrapper pour compatibilité

import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { CompleteVisitModalContent } from './CompleteVisitModalContent';

interface CompleteVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: any;
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
        patientCategory={patientCategory}
        onSubmit={onSubmit}
        onCancel={onClose}
        isLoading={isLoading}
      />
    </ModalFullScreen>
  );
};

export default CompleteVisitModal;
