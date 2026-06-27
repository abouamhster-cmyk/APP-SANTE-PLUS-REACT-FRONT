// 📁 src/features/billing/components/PaymentModal.tsx

import { useState } from 'react';
import {
  X,
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

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer?: Offer | null;
  plan?: any;
  onSuccess: () => void;
  redirectPath?: string;
  orderData?: any;
  forcePonctual?: boolean;
}

export const PaymentModal = ({
  isOpen,
  onClose,
  offer,
  plan,
  onSuccess,
  redirectPath = '/app/orders',
  orderData,
  forcePonctual = false,
}: PaymentModalProps) => {
  const { createPayment } = usePaymentStore();
  const { profile, role } = useAuthStore();

  const {
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [isLoading, setIsLoading] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  if (!isOpen) return null;

  const selectedOffer = offer || plan;

  const period = selectedOffer?.period || selectedOffer?.type || 'mois';

  // Détection des offres ponctuelles
  const isPonctual = forcePonctual ||
    period === 'ponctuelle' ||
    period === 'intervention' ||
    selectedOffer?.category === 'ponctuelle' ||
    selectedOffer?.type === 'ponctuelle' ||
    selectedOffer?.id === 'b4b01a84-1b0c-4973-9e58-43945c1c4991' ||
    selectedOffer?.id === '6e4ba26d-98c5-4e29-a129-f33a828f0b44';

  console.log('🔍 ===== PAYMENT MODAL =====');
  console.log('🔍 forcePonctual:', forcePonctual);
  console.log('🔍 selectedOffer:', selectedOffer);
  console.log('🔍 selectedOffer.id:', selectedOffer?.id);
  console.log('🔍 isPonctual calculé:', isPonctual);
  console.log('🔍 orderData:', orderData);
  console.log('🔍 =========================');

  const amount = selectedOffer?.price || 50000;
  const planName = selectedOffer?.name || 'Abonnement Santé Plus';
  const visitsPerWeek = selectedOffer?.visitsPerWeek || selectedOffer?.visits_per_week || null;

  const getSubscriptionLabel = () => {
    if (isPonctual) return 'ponctuel';
    if (isFamily) return `pour votre proche (/${period})`;
    if (isAidant) return `pour la personne accompagnée (/${period})`;
    if (isAdminOrCoordinator) return `pour le bénéficiaire (/${period})`;
    return `/${period}`;
  };

  const getInfoMessage = () => {
    if (isPonctual) {
      return 'Vous allez payer cette commande ponctuellement. FedaPay ouvrira son formulaire sécurisé pour finaliser le paiement. La commande sera créée automatiquement après confirmation du paiement.';
    }
    if (isFamily) {
      return "FedaPay ouvrira sa passerelle sécurisée pour finaliser la transaction. Vous n'avez pas besoin de saisir vos coordonnées bancaires sur Santé Plus.";
    }
    if (isAidant) {
      return 'FedaPay ouvrira son propre formulaire sécurisé pour finaliser le paiement. Les informations de la personne accompagnée restent confidentielles.';
    }
    if (isAdminOrCoordinator) {
      return 'FedaPay ouvrira son propre formulaire sécurisé pour finaliser le paiement.';
    }
    return 'FedaPay ouvrira son propre formulaire sécurisé pour finaliser le paiement.';
  };

  // VALIDATION des données avant paiement
  const validateOrderData = (): boolean => {
    if (!isPonctual) return true;

    if (!orderData) {
      console.error('❌ orderData est null ou undefined');
      toast.error('Erreur: données de commande manquantes');
      return false;
    }

    if (!orderData.description || orderData.description.trim() === '') {
      console.error('❌ description manquante');
      toast.error('Veuillez ajouter une description');
      return false;
    }

    if (!orderData.address || orderData.address.trim() === '') {
      console.error('❌ address manquante');
      toast.error('Veuillez ajouter une adresse de livraison');
      return false;
    }

    if (!orderData.type) {
      console.error('❌ type manquant');
      toast.error('Veuillez sélectionner un type de commande');
      return false;
    }

    console.log('✅ Données de commande valides:', orderData);
    return true;
  };

  const handlePayment = async () => {
    setIsLoading(true);

    try {
      // VALIDATION des données
      if (isPonctual) {
        if (!validateOrderData()) {
          setIsLoading(false);
          return;
        }

        sessionStorage.setItem('pending_ponctual_order', JSON.stringify(orderData));
        localStorage.setItem('pending_ponctual_order', JSON.stringify(orderData));
        console.log('📦 Données de commande sauvegardées:', orderData);
      } else {
        sessionStorage.removeItem('pending_ponctual_order');
        localStorage.removeItem('pending_ponctual_order');
      }

      console.log('📤 Appel createPayment avec is_ponctual:', isPonctual);

      // Préparer les données pour le backend
      const orderDataForBackend = isPonctual && orderData ? {
        patient_id: orderData.patient_id || null,
        type: orderData.type || 'autre',
        description: orderData.description || 'Commande ponctuelle',
        address: orderData.address || 'Adresse non spécifiée',
        items: orderData.items || [],
        prescription_url: orderData.prescription_url || null,
      } : null;

      // CRITIQUE : abonnement_id = UUID de l'offre (ou null pour ponctuel)
      const offerId = selectedOffer?.id || null;
      const subscriptionId = isPonctual ? null : offerId;

      console.log('📤 abonnement_id envoyé:', subscriptionId);

      const result = await createPayment({
        plan_id: offerId,
        abonnement_id: subscriptionId,
        amount,
        description: planName,
        email: profile?.email,
        is_ponctual: isPonctual,
        order_data: orderDataForBackend,
      });

      const paymentUrl = result?.payment_url || result?.url || result?.checkout_url;

      if (!paymentUrl) {
        throw new Error("Le lien de paiement FedaPay n'a pas été généré");
      }

      console.log('✅ Redirection vers FedaPay:', paymentUrl);
      toast.success('Redirection vers FedaPay...');

      window.location.href = paymentUrl;

    } catch (error: any) {
      console.error('❌ Payment error:', error);
      toast.error(error?.message || 'Erreur lors du lancement du paiement');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
        {/* En-tête de la modale */}
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: colors.primary + '10' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"
                style={{
                  background: colors.primary + '10',
                  color: colors.primary,
                }}
              >
                <ShieldCheck size={12} />
                Paiement sécurisé
              </div>

              <h2
                className="text-lg font-extrabold tracking-tight"
                style={{ color: colors.text }}
              >
                {isPonctual ? '💳 Paiement ponctuel' : 'Confirmer le règlement'}
              </h2>

              <p className="text-xs text-gray-500 leading-relaxed">
                {isPonctual
                  ? 'Règlement de votre commande de services à la demande.'
                  : isFamily
                    ? 'Vous allez être redirigé vers FedaPay pour votre proche.'
                    : isAidant
                      ? 'Vous allez être redirigé vers FedaPay pour la personne accompagnée.'
                      : 'Vous allez être redirigé vers l’espace sécurisé FedaPay.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <X size={18} style={{ color: colors.text }} />
            </button>
          </div>
        </div>

        {/* Corps de la modale */}
        <div className="p-5 space-y-4">
          {/* Fiche récapitulative épurée */}
          <div
            className="rounded-2xl p-4 border transition-all"
            style={{
              background: colors.primary + '04',
              borderColor: colors.primary + '10',
            }}
          >
            <div className="flex items-start gap-3">
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
                <p className="font-bold text-sm" style={{ color: colors.text }}>
                  {isPonctual ? `Prestation ponctuelle` : planName}
                </p>

                <p className="text-xs text-gray-500 mt-0.5">
                  {isPonctual ? 'Paiement unique · sans engagement' : `Formule d’abonnement ${getSubscriptionLabel()}`}
                </p>

                {visitsPerWeek && !isPonctual && (
                  <p className="text-[10px] text-gray-400 font-medium mt-1">
                    📅 {visitsPerWeek} visite{visitsPerWeek > 1 ? 's' : ''} par semaine
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t" style={{ borderColor: colors.primary + '0e' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {isPonctual ? 'Montant à régler' : 'Montant de l’offre'}
              </p>

              <p
                className="text-2xl font-black mt-0.5"
                style={{ color: colors.primary }}
              >
                {amount.toLocaleString()} FCFA
              </p>
            </div>
          </div>

          {/* Message d'information discret */}
          <div
            className="flex items-start gap-2.5 p-3.5 rounded-2xl"
            style={{ background: colors.primary + '08' }}
          >
            <AlertCircle
              size={15}
              style={{ color: colors.primary }}
              className="shrink-0 mt-0.5"
            />

            <p className="text-[11px] leading-relaxed text-gray-600">
              {getInfoMessage()}
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl text-xs font-bold border hover:bg-gray-50 transition-colors disabled:opacity-50"
              style={{
                borderColor: colors.primary + '15',
                color: colors.text,
              }}
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handlePayment}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-95 disabled:opacity-75 flex items-center justify-center gap-1.5 shadow-sm"
              style={{ background: colors.primary }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Préparation...</span>
                </>
              ) : (
                <>
                  <span>{isPonctual ? `Payer` : 'Confirmer'}</span>
                  <ExternalLink size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
