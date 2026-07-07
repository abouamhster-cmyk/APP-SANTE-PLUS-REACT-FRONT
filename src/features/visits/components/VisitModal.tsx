// 📁 src/features/visits/components/VisitModal.tsx

import { useState } from 'react';
import { Visit, Patient } from '@/types';
import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
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
  onSuccess: () => void;
}

export const VisitModal = ({
  isOpen,
  onClose,
  mode,
  visit,
  patients,
  onSuccess,
}: VisitModalProps) => {
  const colors = getThemeColors('senior');
  
  // ✅ ÉTATS POUR LE WIZARD
  const [showWizard, setShowWizard] = useState(false);
  const [wizardData, setWizardData] = useState<any>(null);
  const [pendingVisitData, setPendingVisitData] = useState<any>(null);

  // ✅ OUVERTURE DU WIZARD
  const handleOpenWizard = (data: any, wizardDataObj: any) => {
    console.log('🔄 [VisitModal] Ouverture du wizard avec:', wizardDataObj);
    setPendingVisitData(data);
    setWizardData(wizardDataObj);
    setShowWizard(true);
  };

  // ✅ SUCCÈS DU WIZARD
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
      
      console.log('📤 Wizard - Création visite avec aidant:', visitPayload);
      
      const result = await createVisit(visitPayload);
      
      if (result?.status === 'brouillon') {
        toast.success('💳 Visite créée en brouillon. Paiement requis pour la planifier.');
      } else if (result?.status === 'en_attente_aidant') {
        toast.success('🦸 Visite créée en attente d\'aidant. Administration notifiée.');
      } else if (result?.id) {
        toast.success('✅ Visite planifiée avec succès !');
      } else {
        toast.success('✅ Visite planifiée avec succès !');
      }
      
      setShowWizard(false);
      setWizardData(null);
      setPendingVisitData(null);
      onSuccess();
    } catch (error: any) {
      console.error('❌ Erreur création visite avec wizard:', error);
      toast.error(error.message || 'Erreur lors de la création');
      setShowWizard(false);
    }
  };

  // ✅ FERMETURE DU WIZARD
  const handleWizardClose = () => {
    console.log('🔄 [VisitModal] Fermeture du wizard');
    setShowWizard(false);
    setWizardData(null);
    setPendingVisitData(null);
  };

  return (
    <>
      {/* Modal de planification */}
      <ModalFullScreen
        isOpen={isOpen && !showWizard}
        onClose={onClose}
        onBack={onClose}
        title={mode === 'create' ? 'Planifier une visite' : 'Modifier la visite'}
      >
        <VisitModalContent
          mode={mode}
          visit={visit}
          patients={patients}
          onSuccess={onSuccess}
          onCancel={onClose}
          onOpenWizard={handleOpenWizard}
        />
      </ModalFullScreen>

      {/* ✅ Wizard en dehors du modal (plein écran) */}
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
