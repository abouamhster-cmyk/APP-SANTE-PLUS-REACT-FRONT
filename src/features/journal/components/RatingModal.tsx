// 📁 src/features/journal/components/RatingModal.tsx
// 💡 Wrapper épuré centré pour l'évaluation des visites

import { Modal } from '@/components/ui/Modal'; 
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
    <Modal
      isOpen={true}
      onClose={onClose}
      title="⭐ Évaluer la visite"
      maxWidth="lg"  
    >
      <RatingModalContent
        visit={visit}
        onSuccess={onSubmit}
        onCancel={onClose}
        colors={colors}
      />
    </Modal>
  );
};

export default RatingModal;
