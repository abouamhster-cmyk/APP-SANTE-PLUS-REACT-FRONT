// 📁 src/features/visits/components/VisitModal.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Visit, Patient } from '@/types';
import { Modal } from '@/components/ui/Modal';  
import { VisitModalContent } from './VisitModalContent';
import { VisitWizardModal } from './VisitWizardModal';
import { useVisitStore } from '@/stores/visitStore';
import { getThemeColors } from '@/lib/permissions';
import toast from 'react-hot-toast';

interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  visit: Visit | null;
  patients: Patient[];
  onSuccess: (result?: any) => void; 
}

export const VisitModal = ({
  isOpen,
  onClose,
  mode,
  visit,
  patients,
  onSuccess,
}: VisitModalProps) => {
  const navigate = useNavigate();
  const colors = getThemeColors('senior');

  const [showWizard, setShowWizard] = useState(false);
  const [wizardData, setWizardData] = useState<any>(null);
  const [pendingVisitData, setPendingVisitData] = useState<any>(null);

  const handleOpenWizard = (data: any, wizardDataObj: any) => {
    setPendingVisitData(data);
    setWizardData(wizardDataObj);
    setShowWizard(true);
  };

  const handleWizardSuccess = async (wizardResult: any) => {
    try {
      const { createVisit } = useVisitStore.getState();

      const visitPayload = {
        ...pendingVisitData,
        wizard_choice: wizardResult.wizardChoice,
        selected_aidant_id: wizardResult.aidantId,
        assignment_type: wizardResult.assignmentType || 'ponctuelle',
        aidant_id: wizardResult.aidantId,
      };
      
      const result = await createVisit(visitPayload);
      
      if (result?.status === 'brouillon') {
        toast.success('💳 Visite créée en brouillon. Redirection vers le paiement...');
      } else if (result?.status === 'en_attente_aidant') {
        toast.success('🦸 Visite créée en attente d\'aidant. Administration notifiée.');
      } else {
        toast.success('✅ Visite planifiée avec succès !');
      }
      
      setShowWizard(false);
      setWizardData(null);
      setPendingVisitData(null);

      if (result && result.status !== 'brouillon' && result.id) {
        navigate(`/app/visits/${result.id}`);
      }

      onSuccess(result); 
    } catch (error: any) {
      console.error('❌ Erreur création visite avec wizard:', error);
      toast.error(error.message || 'Erreur lors de la création');
      setShowWizard(false);
    }
  };

  const handleWizardClose = () => {
    setShowWizard(false);
    setWizardData(null);
    setPendingVisitData(null);
  };

  const handleSuccess = (result?: any) => {
    onClose();
    if (result && result.status !== 'brouillon' && result.id) {
      navigate(`/app/visits/${result.id}`);
    }
    onSuccess(result);
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !showWizard}
        onClose={onClose}
        title={mode === 'create' ? 'Planifier une visite' : 'Modifier la visite'}
        maxWidth="xl" // 💡 Ajustement parfait de la largeur pour un formulaire centré
      >
        <VisitModalContent
          mode={mode}
          visit={visit}
          patients={patients}
          onSuccess={handleSuccess} 
          onCancel={onClose}
          onOpenWizard={handleOpenWizard} 
        />
      </Modal>

      {showWizard && wizardData && (
        <VisitWizardModal
          isOpen={showWizard}
          onClose={handleWizardClose}
          onSuccess={handleWizardSuccess}
          targetType={wizardData.targetType}
          targetId={wizardData.targetId}
          targetName={wizardData.targetName}
          familyId={wizardData.familyId}
          scheduledDate={wizardData.scheduledDate}
          scheduledTime={wizardData.scheduledTime}
          colors={colors}
        />
      )}
    </>
  );
};

export default VisitModal;
