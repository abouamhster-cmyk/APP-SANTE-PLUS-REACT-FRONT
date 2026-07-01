// 📁 src/features/visits/components/VisitPaymentModal.tsx

import { useState } from 'react';
import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { usePaymentStore } from '@/stores/paymentStore';
import { useVisitStore } from '@/stores/visitStore';
import { getThemeColors } from '@/lib/permissions';
import { Loader2, CreditCard, ExternalLink } from 'lucide-react';
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

  const amount = visit.duration_minutes <= 60 ? 7500 : 7500 * Math.ceil(visit.duration_minutes / 60);

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      // ✅ Créer le paiement
      const result = await createPayment({
        amount,
        description: `Visite ponctuelle - ${visit.target_name || 'Personnel'}`,
        is_ponctual: true,
        patient_id: visit.patient_id || null,
        target_type: visit.target_type || 'personal',
        target_name: visit.target_name || 'Personnel',
        order_data: {
          visit_id: visit.id,
          description: `Visite pour ${visit.target_name || 'le patient'}`,
          address: visit.patient?.address || 'Adresse non spécifiée',
          type: 'visite',
          duration_minutes: visit.duration_minutes,
          scheduled_date: visit.scheduled_date,
          scheduled_time: visit.scheduled_time,
        },
      });

      const paymentUrl = result?.payment_url || result?.url;

      if (!paymentUrl) {
        throw new Error("Le lien de paiement n'a pas été généré");
      }

      toast.success('Redirection vers FedaPay...');
      
      // ✅ Rediriger vers FedaPay
      window.location.href = paymentUrl;
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      toast.error(error?.message || 'Erreur lors du paiement');
      setIsLoading(false);
    }
  };

  return (
    <ModalFullScreen
      isOpen={isOpen}
      onClose={onClose}
      onBack={onClose}
      title="💳 Paiement requis pour la visite"
    >
      <div className="space-y-6">
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
                Visite ponctuelle
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {visit.target_name || 'Personnel'} • {visit.duration_minutes} min
              </p>
              <p className="text-xs text-gray-400 mt-1">
                📅 {new Date(visit.scheduled_date).toLocaleDateString('fr-FR')} à {visit.scheduled_time}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Montant à payer
            </p>
            <p className="text-2xl font-black mt-1" style={{ color: colors.primary }}>
              {amount.toLocaleString()} FCFA
            </p>
          </div>
        </div>

        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{ background: colors.primary + '10' }}
        >
          <p className="text-xs leading-relaxed text-gray-600">
            💡 Le paiement est requis pour planifier cette visite. 
            Vous serez redirigé vers FedaPay pour finaliser le paiement.
          </p>
        </div>

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
              <Loader2 size={18} className="animate-spin" />
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
