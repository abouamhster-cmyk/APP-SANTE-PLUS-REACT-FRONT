// 📁 src/features/visits/components/VisitPaymentModal.tsx

import { useState } from 'react';
import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { usePaymentStore } from '@/stores/paymentStore';
import { useVisitStore } from '@/stores/visitStore';
import { getThemeColors } from '@/lib/permissions';
import { getPonctualPrice } from '@/stores/visitStore';
import { Loader2, CreditCard, ExternalLink, Calendar, Clock, AlertCircle } from 'lucide-react';
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
      title="💳 Validation et paiement"
    >
      <div className="w-full max-w-md mx-auto space-y-5 px-0.5 py-1">
        
        {/* ============================================================
        RÉSUMÉ DU TICKET DE PAIEMENT
        ============================================================ */}
        <div
          className="rounded-2xl p-5 border shadow-sm space-y-4"
          style={{
            background: colors.primary + '05',
            borderColor: colors.primary + '12',
          }}
        >
          {/* En-tête du ticket */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: colors.primary + '10',
                color: colors.primary,
              }}
            >
              <CreditCard size={18} />
            </div>

            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
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
            style={{ borderColor: colors.primary + '18' }}
          >
            <div className="space-y-0.5">
              <p className="text-gray-400 font-semibold text-[10px] uppercase">Date de visite</p>
              <p className="font-semibold text-gray-700 flex items-center gap-1.5">
                <Calendar size={13} className="text-gray-400 shrink-0" />
                {new Date(visit.scheduled_date).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-gray-400 font-semibold text-[10px] uppercase">Horaire & Durée</p>
              <p className="font-semibold text-gray-700 flex items-center gap-1.5">
                <Clock size={13} className="text-gray-400 shrink-0" />
                {visit.scheduled_time} ({visit.duration_minutes || 60} min)
              </p>
            </div>
          </div>

          {/* Section Montant final */}
          <div 
            className="border-t pt-4 border-dashed" 
            style={{ borderColor: colors.primary + '18' }}
          >
            <div className="flex justify-between items-end">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Total à régler
                </p>
                <p className="text-2xl font-black tracking-tight" style={{ color: colors.primary }}>
                  {amount.toLocaleString()} FCFA
                </p>
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
          className="flex items-start gap-3 p-4 rounded-xl border"
          style={{ 
            background: colors.primary + '05', 
            borderColor: colors.primary + '10' 
          }}
        >
          <AlertCircle size={15} style={{ color: colors.primary }} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs leading-relaxed text-gray-600 font-medium">
              Le paiement est requis pour confirmer la planification. Vous allez être redirigé vers l'interface de paiement sécurisée de FedaPay.
            </p>
            <span className="text-[10px] text-gray-400 block font-medium">
              💡 Moyens acceptés : Mobile Money (MTN, Moov, Wave, etc.) ou Carte bancaire.
            </span>
          </div>
        </div>

        {/* ============================================================
        BOUTONS D'ACTIONS (RESPONSIVE STACKABLE)
        ============================================================ */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:flex-1 py-2.5 rounded-xl text-xs font-bold border hover:bg-gray-50 transition disabled:opacity-50 text-center order-2 sm:order-1"
            style={{ borderColor: colors.primary + '20', color: colors.text }}
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handlePayment}
            disabled={isLoading}
            className="w-full sm:flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-sm order-1 sm:order-2"
            style={{ background: colors.primary }}
          >
            {isLoading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Traitement en cours...
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
