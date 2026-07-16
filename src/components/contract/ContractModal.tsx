// 📁 src/components/contract/ContractModal.tsx
// 💡 Lecture et acceptation des CGU et des chartes de confiance

import { Modal } from '@/components/ui/Modal'; 
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="📜 Conditions Générales d'Utilisation"  
      maxWidth="2xl"  
    >
      <ContractModalContent
        contract={contract}
        onAccept={onAccept}
        onCancel={handleClose}
        isLoading={isLoading}
      />
    </Modal>
  );
};

export default ContractModal;
