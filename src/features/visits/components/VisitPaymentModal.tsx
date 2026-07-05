// 📁 src/features/visits/components/VisitPaymentModal.tsx
 

import { useState } from 'react';
import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { usePaymentStore } from '@/stores/paymentStore';
import { useVisitStore } from '@/stores/visitStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { Loader2, CreditCard, ExternalLink, Calendar, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// ✅ IMPORTER LES HELPERS
import {
  getPonctualPrice,
  getVisitPaymentAmount,
  getDraftExpiryTime,
  isDraftExpired,
} from '@/lib/constants';
import {
  isVisitDraft,
  isVisitPonctual,
  requiresVisitPayment,
} from '@/utils/helpers';

interface VisitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: any;
  onSuccess: () => void;
}

export const VisitPaymentModal = ({
  isOpen,
  onClose,
  visit,
  onSuccess,
}: VisitPaymentModalProps) => {
  const { createPayment } = usePaymentStore();
  const { confirmPayment } = useVisitStore();
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Récupérer le thème dynamique
  const { profile, role } = useAuthStore();
  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ Calcul du montant avec les helpers
  const amount = getVisitPaymentAmount(visit) || getPonctualPrice(visit.duration_minutes || 60);
  const isDraft = isVisitDraft(visit);
  const isExpired = isDraftExpired(visit);
  const expiryTime = getDraftExpiryTime(visit);

  const handlePayment = async () => {
    // ✅ Vérifier si le brouillon n'est pas expiré
    if (isExpired) {
      toast.error('Ce brouillon a expiré. Veuillez recréer la visite.');
      return;
    }

    setIsLoading(true);
    try {
      const visitId = visit.id;

      const result = await createPayment({
        amount,
        description: `Visite ponctuelle - ${visit.target_name || 'Personnel'}`,
        is_ponctual: true,
        is_visit: true,
        visit_id: visitId,
        patient_id: visit.patient_id || null,
        target_type: visit.target_type || 'personal',
        target_name: visit.target_name || 'Personnel',
        order_data: {
          visit_id: visitId,
          description: `Visite pour ${visit.target_name || 'le patient'}`,
          address: visit.patient?.address || 'Adresse non spécifiée',
          type: 'visite',
          duration_minutes: visit.duration_minutes,
          scheduled_date: visit.scheduled_date,
          scheduled_time: visit.scheduled_time,
          target_type: visit.target_type || 'personal',
          target_name: visit.target_name || 'Personnel',
        },
      });

      const paymentUrl = result?.payment_url || result?.url;

      if (!paymentUrl) {
        throw new Error("Le lien de paiement n'a pas été généré");
      }

      sessionStorage.setItem('pending_visit_payment', JSON.stringify({
        visit_id: visitId,
        transaction_id: result.transaction_id,
      }));

      toast.success('Redirection vers FedaPay...');
      window.location.href = paymentUrl;
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      toast.error(error?.message || 'Erreur lors du paiement');
      setIsLoading(false);
    }
  };

  const getTargetName = () => {
    if (visit.target_name) return visit.target_name;
    if (visit.patient) return `${visit.patient.first_name} ${visit.patient.last_name}`;
    return 'Personnel';
  };

  const getTargetTypeLabel = () => {
    if (visit.target_type === 'patient') return 'Proche';
    if (visit.target_type === 'personal') return 'Personnel';
    return 'Visite';
  };

  return (
    <ModalFullScreen
      isOpen={isOpen}
      onClose={onClose}
      onBack={onClose}
      title="💳 Validation et paiement"
    >
      <div className="w-full max-w-md mx-auto space-y-5 px-0.5 py-1">
        
        {/* ============================================================
        RÉSUMÉ DU TICKET DE PAIEMENT
        ============================================================ */}
        <div
          className={`rounded-2xl p-5 border shadow-sm space-y-4 ${
            isExpired ? 'border-red-300 bg-red-50' : ''
          }`}
          style={{
            background: isExpired ? '#FEF2F2' : colors.primary + '06',
            borderColor: isExpired ? '#FECACA' : colors.primary + '15',
          }}
        >
          {/* ✅ BANDEAU D'EXPIRATION */}
          {isExpired && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-100 border border-red-200">
              <AlertCircle size={16} className="text-red-600" />
              <span className="text-xs font-bold text-red-700">
                ⚠️ Ce brouillon a expiré. Veuillez recréer la visite.
              </span>
            </div>
          )}

          {/* En-tête du ticket */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: isExpired ? '#FECACA' : colors.primary + '12',
                color: isExpired ? '#DC2626' : colors.primary,
              }}
            >
              <CreditCard size={18} />
            </div>

            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.text + '50' }}>
                Bénéficiaire ({getTargetTypeLabel()})
              </span>
              <p className="font-bold text-sm truncate" style={{ color: colors.text }}>
                {getTargetName()}
              </p>
            </div>
          </div>

          {/* Grille détails planification */}
          <div 
            className="grid grid-cols-2 gap-4 text-xs border-t pt-4 border-dashed" 
            style={{ borderColor: colors.primary + '20' }}
          >
            <div className="space-y-0.5">
              <p className="font-semibold text-[10px] uppercase" style={{ color: colors.text + '50' }}>
                Date de visite
              </p>
              <p className="font-semibold flex items-center gap-1.5" style={{ color: colors.text }}>
                <Calendar size={13} style={{ color: colors.text + '40' }} className="shrink-0" />
                {new Date(visit.scheduled_date).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold text-[10px] uppercase" style={{ color: colors.text + '50' }}>
                Horaire & Durée
              </p>
              <p className="font-semibold flex items-center gap-1.5" style={{ color: colors.text }}>
                <Clock size={13} style={{ color: colors.text + '40' }} className="shrink-0" />
                {visit.scheduled_time} ({visit.duration_minutes || 60} min)
              </p>
            </div>
          </div>

          {/* ✅ Section Montant final avec expiration */}
          <div 
            className="border-t pt-4 border-dashed" 
            style={{ borderColor: colors.primary + '20' }}
          >
            <div className="flex justify-between items-end">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.text + '50' }}>
                  Total à régler
                </p>
                <p className={`text-2xl font-black tracking-tight ${isExpired ? 'text-gray-400' : ''}`} 
                   style={{ color: isExpired ? '#9CA3AF' : colors.primary }}>
                  {amount.toLocaleString()} FCFA
                </p>
                {expiryTime && !isExpired && (
                  <p className="text-[10px] text-yellow-600 font-medium">
                    ⏳ Expire dans {expiryTime}
                  </p>
                )}
              </div>
              
              {visit.is_urgent && (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 bg-red-50 text-red-500 border border-red-100 shrink-0">
                  <AlertCircle size={12} />
                  Urgent
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================
        BLOC INFORMATIONS ET SÉCURITÉ
        ============================================================ */}
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border ${
            isExpired ? 'bg-red-50 border-red-200' : ''
          }`}
          style={{ 
            background: isExpired ? '#FEF2F2' : colors.primary + '05', 
            borderColor: isExpired ? '#FECACA' : colors.primary + '12'
          }}
        >
          <AlertCircle size={15} style={{ color: isExpired ? '#DC2626' : colors.primary }} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs leading-relaxed font-medium" style={{ color: isExpired ? '#DC2626' : colors.text + '80' }}>
              {isExpired 
                ? '⚠️ Ce brouillon a expiré. Vous ne pouvez plus effectuer de paiement.'
                : 'Le paiement est requis pour confirmer la planification. Vous allez être redirigé vers l\'interface de paiement sécurisée de FedaPay.'
              }
            </p>
            {!isExpired && (
              <span className="text-[10px] block font-medium" style={{ color: colors.text + '50' }}>
                💡 Moyens acceptés : Mobile Money (MTN, Moov, Wave, etc.) ou Carte bancaire.
              </span>
            )}
          </div>
        </div>

        {/* ============================================================
        BOUTONS D'ACTIONS (RESPONSIVE STACKABLE)
        ============================================================ */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t" style={{ borderColor: colors.border }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:flex-1 py-2.5 rounded-xl text-xs font-bold border hover:bg-gray-50 transition disabled:opacity-50 text-center order-2 sm:order-1"
            style={{ borderColor: colors.primary + '25', color: colors.text }}
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handlePayment}
            disabled={isLoading || isExpired}
            className={`w-full sm:flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition ${
              isExpired ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
            } flex items-center justify-center gap-1.5 shadow-sm order-1 sm:order-2`}
            style={{ 
              background: isExpired ? '#9CA3AF' : colors.primary,
              cursor: isExpired ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={13} className="animate-spin" style={{ color: 'white' }} />
                Traitement en cours...
              </>
            ) : isExpired ? (
              <>
                <AlertCircle size={13} />
                Brouillon expiré
              </>
            ) : (
              <>
                Procéder au paiement
                <ExternalLink size={13} />
              </>
            )}
          </button>
        </div>
      </div>
    </ModalFullScreen>
  );
};

export default VisitPaymentModal;
