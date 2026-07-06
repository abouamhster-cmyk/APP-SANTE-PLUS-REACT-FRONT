// 📁 src/features/visits/components/VisitPaymentModal.tsx
 
import { useState } from 'react';
import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { usePaymentStore } from '@/stores/paymentStore';
import { useVisitStore } from '@/stores/visitStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { Loader2, CreditCard, ExternalLink, Calendar, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { getPonctualPrice } from '@/lib/constants';
import {
  isVisitDraft,
  isVisitPonctual,
  requiresVisitPayment,
  getVisitPaymentAmount,
  getDraftExpiryTime,
  isDraftExpired,
} from '@/utils/helpers';

// ============================================================
// TYPES
// ============================================================

interface VisitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: any;
  onSuccess: () => void;
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export const VisitPaymentModal = ({
  isOpen,
  onClose,
  visit,
  onSuccess,
}: VisitPaymentModalProps) => {
  const { profile, role } = useAuthStore();
  const { fetchVisits, invalidateCache } = useVisitStore();
  const [isInternalLoading, setIsInternalLoading] = useState(false);

  // ✅ Calcul du montant
  const amount = getVisitPaymentAmount(visit) || getPonctualPrice(visit.duration_minutes || 60);

  // ✅ Préparer les données pour le paiement ponctuel
  const paymentData = {
    type: 'visit' as const,
    amount,
    description: `Visite ponctuelle - ${visit.target_name || 'Personnel'}`,
    visitId: visit.id,
    scheduledDate: visit.scheduled_date,
    scheduledTime: visit.scheduled_time,
    durationMinutes: visit.duration_minutes || 60,
    patientName: visit.patient ? `${visit.patient.first_name} ${visit.patient.last_name}` : visit.target_name,
    patientId: visit.patient_id || null,
    targetType: visit.target_type || 'personal',
    targetName: visit.target_name || 'Personnel',
    address: visit.patient?.address || 'Adresse non spécifiée',
  };

  // ✅ Handler succès du paiement
  const handlePaymentSuccess = async () => {
    setIsInternalLoading(true);
    try {
      // ✅ Invalider le cache et recharger les visites
      invalidateCache();
      await fetchVisits();
      
      toast.success('✅ Visite planifiée après paiement !');
      onSuccess();
    } catch (error) {
      console.error('❌ Erreur après paiement:', error);
      toast.error('Erreur lors du rechargement des données');
    } finally {
      setIsInternalLoading(false);
      onClose();
    }
  };

  // ✅ Handler annulation du paiement
  const handlePaymentCancel = () => {
    toast.success('Paiement annulé');
    onClose();
  };

  // ✅ Si la visite est déjà planifiée, ne pas afficher le modal
  if (visit && visit.status !== 'brouillon') {
    return null;
  }

  // ✅ Si la visite est expirée, afficher un message
  const isExpired = visit?.draft_expires_at && new Date(visit.draft_expires_at) < new Date();
  if (isExpired) {
    toast.error('Ce brouillon a expiré. Veuillez recréer la visite.');
    onClose();
    return null;
  }

  return (
    <PonctualPaymentModal
      isOpen={isOpen}
      onClose={handlePaymentCancel}
      onSuccess={handlePaymentSuccess}
      paymentData={paymentData}
      redirectPath={`/app/visits/${visit?.id}`}
    />
  );
};

export default VisitPaymentModal;
