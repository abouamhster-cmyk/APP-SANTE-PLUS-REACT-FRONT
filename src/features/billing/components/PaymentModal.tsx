// 📁 src/features/billing/components/PaymentModal.tsx
// 💡 Confirmation et redirection de paiement FedaPay

import { Offer } from '@/types';
import { Modal } from '@/components/ui/Modal';  
import { PaymentModalContent } from './PaymentModalContent';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer?: Offer | null;
  plan?: any;
  onSuccess: () => void;
  redirectPath?: string;
  orderData?: any;
  forcePonctual?: boolean;
  patientId?: string | null; 
}

export const PaymentModal = ({
  isOpen,
  onClose,
  offer,
  plan,
  onSuccess,
  redirectPath = '/app/orders',
  orderData,
  forcePonctual = false,
  patientId = null, 
}: PaymentModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={forcePonctual ? '💳 Paiement ponctuel' : 'Confirmer le paiement'}
      maxWidth="xl"  
    >
      <PaymentModalContent
        offer={offer}
        plan={plan}
        onSuccess={() => {
          onSuccess();
          onClose();
        }}
        onCancel={onClose}
        redirectPath={redirectPath}
        orderData={orderData}
        forcePonctual={forcePonctual}
        patientId={patientId} 
      />
    </Modal>
  );
};

export default PaymentModal;
