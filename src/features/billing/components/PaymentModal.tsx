// 📁 src/features/billing/components/PaymentModal.tsx

import { Offer } from '@/types';
import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
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
    <ModalFullScreen
      isOpen={isOpen}
      onClose={onClose}
      onBack={onClose}
      title={forcePonctual ? '💳 Paiement ponctuel' : 'Confirmer le paiement'}
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
    </ModalFullScreen>
  );
};

export default PaymentModal;
