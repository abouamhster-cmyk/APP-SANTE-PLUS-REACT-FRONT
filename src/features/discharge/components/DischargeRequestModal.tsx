// 📁 src/features/discharge/components/DischargeRequestModal.tsx
// ✅ WRAPPER DEMANDE SORTIE : PRISE EN COMPTE DU PAIEMENT PONCTUEL DE COMMANDE

import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { DischargeRequestModalContent } from './DischargeRequestModalContent';

interface DischargeRequestModalProps {
  patients: any[];
  onClose: () => void;
  onSuccess: () => void;
  onPaymentRequired: (visit: any) => void; // ✅ Canalisation du paiement
  colors: any;
}

export const DischargeRequestModal = ({
  patients,
  onClose,
  onSuccess,
  onPaymentRequired,
  colors,
}: DischargeRequestModalProps) => {
  return (
    <ModalFullScreen
      isOpen={true}
      onClose={onClose}
      onBack={onClose}
      title="🏥 Demande de sortie d'hôpital"
    >
      <DischargeRequestModalContent
        patients={patients}
        onSuccess={() => {
          onSuccess();
          onClose();
        }}
        onPaymentRequired={(visit) => {
          onPaymentRequired(visit);
          onClose();
        }}
        onCancel={onClose}
        colors={colors}
      />
    </ModalFullScreen>
  );
};

export default DischargeRequestModal;
