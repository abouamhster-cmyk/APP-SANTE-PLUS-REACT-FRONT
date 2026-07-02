// 📁 src/features/visits/components/VisitPaymentModal.tsx

import { useState } from 'react';
import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { usePaymentStore } from '@/stores/paymentStore';
import { useVisitStore } from '@/stores/visitStore';
import { getThemeColors } from '@/lib/permissions';
import { getPonctualPrice } from '@/stores/visitStore';
import { Loader2, CreditCard, ExternalLink, Calendar, Clock, User, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

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

  const colors = getThemeColors('senior');

  // ✅ Calcul du montant
  const amount = visit.metadata?.payment_amount || getPonctualPrice(visit.duration_minutes || 60);

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      // ✅ Récupérer l'ID de la visite
      const visitId = visit.id;

      // ✅ Créer le paiement avec les bonnes données
      const result = await createPayment({
        amount,
        description: `Visite ponctuelle - ${visit.target_name || 'Personnel'}`,
        is_ponctual: true,
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

      // ✅ Sauvegarder l'ID de la visite pour le webhook
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

  // ✅ Récupérer le nom du destinataire
  const getTargetName = () => {
    if (visit.target_name) return visit.target_name;
    if (visit.patient) return `${visit.patient.first_name} ${visit.patient.last_name}`;
    return 'Personnel';
  };

  // ✅ Récupérer le type de visite
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
      title="💳 Paiement requis pour la visite"
    >
      <div className="space-y-6">
        {/* Résumé de la visite */}
        <div
          className="rounded-2xl p-4 border"
          style={{
            background: colors.primary + '08',
            borderColor: colors.primary + '18',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: colors.primary + '14',
                color: colors.primary,
              }}
            >
              <CreditCard size={22} />
            </div>

            <div className="min-w-0">
              <p className="font-black" style={{ color: colors.text }}>
                {getTargetTypeLabel()} - {getTargetName()}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {visit.duration_minutes || 60} min • {visit.visit_type || 'ponctuelle'}
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(visit.scheduled_date).toLocaleDateString('fr-FR')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {visit.scheduled_time}
                </span>
                {visit.is_urgent && (
                  <span className="flex items-center gap-1 text-red-500">
                    <AlertCircle size={12} />
                    Urgent
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Montant */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Montant à payer
            </p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-3xl font-black" style={{ color: colors.primary }}>
                {amount.toLocaleString()} FCFA
              </p>
              <p className="text-xs text-gray-400 mb-1">
                💳 Paiement unique sans engagement
              </p>
            </div>
          </div>
        </div>

        {/* Info supplémentaire */}
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{ background: colors.primary + '10' }}
        >
          <AlertCircle size={19} style={{ color: colors.primary }} className="shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-gray-600">
            💡 Le paiement est requis pour planifier cette visite. 
            Vous serez redirigé vers FedaPay pour finaliser le paiement en toute sécurité.
            <br />
            <span className="text-[10px] text-gray-400 mt-1 block">
              ⏰ Une fois le paiement effectué, la visite sera automatiquement planifiée.
            </span>
          </p>
        </div>

        {/* Boutons */}
        <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 rounded-2xl font-bold border hover:bg-gray-50 transition disabled:opacity-50"
            style={{ borderColor: colors.primary + '20', color: colors.text }}
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handlePayment}
            disabled={isLoading}
            className="flex-1 py-3 rounded-2xl text-white font-bold transition hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: colors.primary }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                Payer {amount.toLocaleString()} FCFA
                <ExternalLink size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </ModalFullScreen>
  );
};

export default VisitPaymentModal;
