// 📁 src/features/billing/components/PaymentModalContent.tsx
// 📌 Contenu du paiement (sans wrapper modal)

import { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Loader2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

import { usePaymentStore } from '@/stores/paymentStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { Offer } from '@/types';
import toast from 'react-hot-toast';

interface PaymentModalContentProps {
  offer?: Offer | null;
  plan?: any;
  onSuccess: () => void;
  onCancel: () => void;
  redirectPath?: string;
  orderData?: any;
  forcePonctual?: boolean;
}

export const PaymentModalContent = ({
  offer,
  plan,
  onSuccess,
  onCancel,
  redirectPath = '/app/orders',
  orderData,
  forcePonctual = false,
}: PaymentModalContentProps) => {
  const { createPayment } = usePaymentStore();
  const { profile, role } = useAuthStore();

  const {
    singular,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [isLoading, setIsLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedTargetType, setSelectedTargetType] = useState<'personal' | 'patient'>('personal');
  const [selectedTargetName, setSelectedTargetName] = useState<string>('');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const selectedOffer = offer || plan;

  const period = selectedOffer?.period || selectedOffer?.type || 'mois';

  const isPonctual = forcePonctual ||
    period === 'ponctuelle' ||
    period === 'intervention' ||
    selectedOffer?.category === 'ponctuelle' ||
    selectedOffer?.type === 'ponctuelle' ||
    selectedOffer?.id === 'b4b01a84-1b0c-4973-9e58-43945c1c4991' ||
    selectedOffer?.id === '6e4ba26d-98c5-4e29-a129-f33a828f0b44';

  const amount = selectedOffer?.price || 50000;
  const planName = selectedOffer?.name || 'Abonnement Santé Plus';
  const visitsPerWeek = selectedOffer?.visitsPerWeek || selectedOffer?.visits_per_week || null;

  const hasPatients = orderData?.hasPatients || false;

  const getSubscriptionLabel = () => {
    if (isPonctual) return 'ponctuel';
    if (isFamily) return `pour votre proche (/${period})`;
    if (isAidant) return `pour la personne accompagnée (/${period})`;
    if (isAdminOrCoordinator) return `pour le bénéficiaire (/${period})`;
    return `/${period}`;
  };

  const getInfoMessage = () => {
    if (isPonctual) {
      return 'Vous allez payer cette commande ponctuellement. FedaPay ouvrira son formulaire sécurisé pour finaliser le paiement.';
    }
    return 'FedaPay ouvrira son propre formulaire sécurisé pour finaliser le paiement.';
  };

  const handlePayment = async () => {
    setIsLoading(true);

    try {
      if (isPonctual && orderData) {
        sessionStorage.setItem('pending_ponctual_order', JSON.stringify(orderData));
        localStorage.setItem('pending_ponctual_order', JSON.stringify(orderData));
      } else if (isPonctual) {
        sessionStorage.removeItem('pending_ponctual_order');
        localStorage.removeItem('pending_ponctual_order');
      } else {
        sessionStorage.removeItem('pending_ponctual_order');
        localStorage.removeItem('pending_ponctual_order');
      }

      const orderDataForBackend = (isPonctual && orderData) ? {
        patient_id: orderData.patient_id || null,
        type: orderData.type || 'autre',
        description: orderData.description || 'Commande ponctuelle',
        address: orderData.address || 'Adresse non spécifiée',
        items: orderData.items || [],
        prescription_url: orderData.prescription_url || null,
        target_type: selectedTargetType,
        target_name: selectedTargetName || profile?.full_name || 'Client',
      } : null;

      const offerId = selectedOffer?.id || null;
      const subscriptionId = isPonctual ? null : offerId;

      const result = await createPayment({
        plan_id: offerId,
        abonnement_id: subscriptionId,
        amount,
        description: planName,
        email: profile?.email,
        is_ponctual: isPonctual,
        order_data: orderDataForBackend,
        patient_id: orderData?.patient_id || null,
        target_type: selectedTargetType,
        target_name: selectedTargetName || profile?.full_name || 'Client',
      });

      const paymentUrl = result?.payment_url || result?.url || result?.checkout_url;

      if (!paymentUrl) {
        throw new Error("Le lien de paiement FedaPay n'a pas été généré");
      }

      toast.success('Redirection vers FedaPay...');
      window.location.href = paymentUrl;
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      toast.error(error?.message || 'Erreur lors du lancement du paiement');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5 pb-4">
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
              {isPonctual ? `Commande ponctuelle` : planName}
            </p>

            <p className="text-sm text-gray-500 mt-0.5">
              {isPonctual ? 'Paiement unique sans engagement' : `Abonnement ${getSubscriptionLabel()}`}
            </p>

            {visitsPerWeek && !isPonctual && (
              <p className="text-xs text-gray-400 mt-1">
                📅 {visitsPerWeek} visite{visitsPerWeek > 1 ? 's' : ''} par semaine
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {isPonctual ? 'Montant à payer' : 'Montant'}
          </p>
          <p className="text-3xl font-black mt-1" style={{ color: colors.primary }}>
            {amount.toLocaleString()} FCFA
          </p>
        </div>
      </div>

      <div
        className="flex items-start gap-3 p-4 rounded-2xl"
        style={{ background: colors.primary + '10' }}
      >
        <AlertCircle size={19} style={{ color: colors.primary }} className="shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-gray-600">
          {getInfoMessage()}
        </p>
      </div>

      <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
        <button
          type="button"
          onClick={onCancel}
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
              {isPonctual ? `Payer ${amount.toLocaleString()} FCFA` : 'Continuer'}
              <ExternalLink size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PaymentModalContent;
