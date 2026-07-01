// 📁 src/features/journal/components/VisitDetailsModal.tsx
// 📌 Wrapper pour compatibilité

import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { VisitDetailsModalContent } from './VisitDetailsModalContent';

interface VisitDetailsModalProps {
  visit: any;
  onClose: () => void;
  colors: any;
}

export const VisitDetailsModal = ({ visit, onClose, colors }: VisitDetailsModalProps) => {
  return (
    <ModalFullScreen
      isOpen={true}
      onClose={onClose}
      onBack={onClose}
      title="📋 Détails de la visite"
    >
      <VisitDetailsModalContent
        visit={visit}
        onClose={onClose}
        colors={colors}
      />
    </ModalFullScreen>
  );
};

export default VisitDetailsModal;
