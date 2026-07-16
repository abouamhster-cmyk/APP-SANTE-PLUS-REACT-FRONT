// 📁 src/features/visits/components/VisitPaymentModal.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBranding } from '@/hooks/useBranding';
import { useAuthStore } from '@/stores/authStore';
import { useVisitStore } from '@/stores/visitStore';
import { getPonctualPrice } from '@/lib/constants';
import {
  getVisitPaymentAmount,
} from '@/utils/helpers';
import { PonctualPaymentModal } from '@/components/common/PonctualPaymentModal';
import toast from 'react-hot-toast';

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
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;
  const { fetchVisits, invalidateCache } = useVisitStore();
  const [isInternalLoading, setIsInternalLoading] = useState(false);

  // ✅ Si la visite n'est pas en brouillon, ne pas afficher le modal
  if (visit && visit.status !== 'brouillon') {
    return null;
  }

  // ✅ Vérifier si le brouillon est expiré
  const isExpired = visit?.draft_expires_at && new Date(visit.draft_expires_at) < new Date();
  if (isExpired) {
    toast.error('Ce brouillon a expiré. Veuillez recréer la visite.');
    onClose();
    return null;
  }

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
