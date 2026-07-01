// 📁 src/features/journal/components/RatingModal.tsx
// 📌 Wrapper pour compatibilité

import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { RatingModalContent } from './RatingModalContent';

interface RatingModalProps {
  visit: any;
  onClose: () => void;
  onSubmit: (visitId: string, rating: number, feedback: string) => Promise<void>;
  colors: any;
}

export const RatingModal = ({
  visit,
  onClose,
  onSubmit,
  colors,
}: RatingModalProps) => {
  return (
    <ModalFullScreen
      isOpen={true}
      onClose={onClose}
      onBack={onClose}
      title="⭐ Évaluer la visite"
    >
      <RatingModalContent
        visit={visit}
        onSuccess={onSubmit}
        onCancel={onClose}
        colors={colors}
      />
    </ModalFullScreen>
  );
};

export default RatingModal;
