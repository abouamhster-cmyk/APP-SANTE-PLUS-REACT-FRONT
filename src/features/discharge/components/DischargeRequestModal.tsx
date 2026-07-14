// 📁 src/features/discharge/components/DischargeRequestModal.tsx
 
import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { DischargeRequestModalContent } from './DischargeRequestModalContent';

interface DischargeRequestModalProps {
  patients: any[];
  onClose: () => void;
  onSuccess: () => void;
  onPaymentRequired: (visit: any) => void;
  onWizardRequired: (wizardData: any, pendingData: any) => void;  
  colors: any;
}

export const DischargeRequestModal = ({
  patients,
  onClose,
  onSuccess,
  onPaymentRequired,
  onWizardRequired,
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
        onWizardRequired={(wizardData, pendingData) => {
          onWizardRequired(wizardData, pendingData);
          onClose();
        }}
        onCancel={onClose}
        colors={colors}
      />
    </ModalFullScreen>
  );
};

export default DischargeRequestModal;
