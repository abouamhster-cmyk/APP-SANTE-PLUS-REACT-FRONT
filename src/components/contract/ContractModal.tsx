// 📁 src/components/contract/ContractModal.tsx
// 📌 Wrapper pour compatibilité

import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { ContractModalContent } from './ContractModalContent';

interface ContractModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onClose?: () => void;
  contract: {
    id: string;
    title: string;
    content: string;
    version: string;
    role: string;
    summary?: string | null;
    created_at?: string;
  } | null;
  isLoading: boolean;
}

export const ContractModal = ({
  isOpen,
  onAccept,
  onClose,
  contract,
  isLoading,
}: ContractModalProps) => {
  const handleClose = () => {
    if (onClose) onClose();
  };

  return (
    <ModalFullScreen
      isOpen={isOpen}
      onClose={handleClose}
      onBack={handleClose}
      title="📜 Conditions Générales"
    >
      <ContractModalContent
        contract={contract}
        onAccept={onAccept}
        onCancel={handleClose}
        isLoading={isLoading}
      />
    </ModalFullScreen>
  );
};

export default ContractModal;
