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
    singular,
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
  
  const isPonctual = forcePonctual || 
    period === 'ponctuelle' || 
    period === 'intervention' || 
    selectedOffer?.category === 'ponctuelle' ||
    selectedOffer?.id?.startsWith('ponctual-') ||
    (selectedOffer?.price === 100 && selectedOffer?.period === 'intervention');

  console.log('🔍 ===== PAYMENT MODAL =====');
  console.log('🔍 forcePonctual:', forcePonctual);
  console.log('🔍 selectedOffer:', selectedOffer);
  console.log('🔍 selectedOffer.category:', selectedOffer?.category);
  console.log('🔍 selectedOffer.id:', selectedOffer?.id);
  console.log('🔍 period:', period);
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
      return 'FedaPay ouvrira son propre formulaire sécurisé pour finaliser le paiement. Vous n\'avez pas besoin de renseigner vos informations ici.';
    }
    if (isAidant) {
      return 'FedaPay ouvrira son propre formulaire sécurisé pour finaliser le paiement. Les informations de la personne accompagnée restent confidentielles.';
    }
    if (isAdminOrCoordinator) {
      return 'FedaPay ouvrira son propre formulaire sécurisé pour finaliser le paiement.';
    }
    return 'FedaPay ouvrira son propre formulaire sécurisé pour finaliser le paiement.';
  };

  // ✅ VALIDATION des données avant paiement
  const validateOrderData = (): boolean => {
    if (!isPonctual) return true;
    
    if (!orderData) {
      console.error('❌ orderData est null ou undefined');
      toast.error('Erreur: données de commande manquantes');
      return false;
    }

    // ✅ Vérifier que patient_id est présent (sauf si c'est une commande sans proche)
    // Note : selon votre logique métier, patient_id peut être null si la commande est sans proche
    // Dans ce cas, supprimez cette validation
    if (!orderData.patient_id) {
      console.warn('⚠️ patient_id est null - commande sans proche');
      // ✅ Pour les commandes sans proche, on continue
      // Si vous voulez forcer un proche, décommentez les lignes ci-dessous :
      // toast.error('Veuillez sélectionner un proche');
      // return false;
    }

    // ✅ Vérifier la description
    if (!orderData.description || orderData.description.trim() === '') {
      console.error('❌ description manquante');
      toast.error('Veuillez ajouter une description');
      return false;
    }

    // ✅ Vérifier l'adresse
    if (!orderData.address || orderData.address.trim() === '') {
      console.error('❌ address manquante');
      toast.error('Veuillez ajouter une adresse de livraison');
      return false;
    }

    // ✅ Vérifier le type
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
      // ✅ VALIDATION des données
      if (isPonctual) {
        if (!validateOrderData()) {
          setIsLoading(false);
          return;
        }

        // ✅ Sauvegarder les données pour la page de confirmation (fallback)
        sessionStorage.setItem('pending_ponctual_order', JSON.stringify(orderData));
        localStorage.setItem('pending_ponctual_order', JSON.stringify(orderData));
        console.log('📦 Données de commande sauvegardées:', orderData);
      } else {
        // ✅ Si ce n'est pas ponctuel, on s'assure qu'il n'y a pas de données en attente
        sessionStorage.removeItem('pending_ponctual_order');
        localStorage.removeItem('pending_ponctual_order');
      }

      console.log('📤 Appel createPayment avec is_ponctual:', isPonctual);

      // ✅ Préparer les données pour le backend
      const orderDataForBackend = isPonctual && orderData ? {
        patient_id: orderData.patient_id || null,
        type: orderData.type || 'autre',
        description: orderData.description || 'Commande ponctuelle',
        address: orderData.address || 'Adresse non spécifiée',
        items: orderData.items || [],
        prescription_url: orderData.prescription_url || null,
      } : null;

      console.log('📤 Données envoyées au backend:', orderDataForBackend);

      // ✅ Appeler createPayment
      const result = await createPayment({
        plan_id: selectedOffer?.id,
        abonnement_id: selectedOffer?.id,
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
      
      // ✅ Redirection vers FedaPay
      window.location.href = paymentUrl;
      
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      toast.error(error?.message || 'Erreur lors du lancement du paiement');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: colors.primary + '15' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-2"
                style={{
                  background: colors.primary + '12',
                  color: colors.primary,
                }}
              >
                <ShieldCheck size={13} />
                Paiement sécurisé
              </div>

              <h2
                className="text-xl font-black leading-tight"
                style={{ color: colors.text }}
              >
                {isPonctual ? '💳 Paiement ponctuel' : 'Confirmer le paiement'}
              </h2>

              <p className="text-sm mt-1 text-gray-500">
                {isPonctual 
                  ? 'Vous allez payer cette commande ponctuellement.'
                  : isFamily 
                    ? 'Vous allez être redirigé vers le checkout sécurisé FedaPay pour votre proche.'
                    : isAidant
                      ? 'Vous allez être redirigé vers le checkout sécurisé FedaPay pour la personne accompagnée.'
                      : 'Vous allez être redirigé vers le checkout sécurisé FedaPay.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-gray-100 transition disabled:opacity-50"
            >
              <X size={22} style={{ color: colors.text }} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
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

              <p
                className="text-3xl font-black mt-1"
                style={{ color: colors.primary }}
              >
                {amount.toLocaleString()} FCFA
              </p>
            </div>
          </div>

          <div
            className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: colors.primary + '10' }}
          >
            <AlertCircle
              size={19}
              style={{ color: colors.primary }}
              className="shrink-0 mt-0.5"
            />

            <p className="text-xs leading-relaxed text-gray-600">
              {getInfoMessage()}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full py-3 rounded-2xl font-bold border hover:bg-gray-50 transition disabled:opacity-50"
              style={{
                borderColor: colors.primary + '20',
                color: colors.text,
              }}
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handlePayment}
              disabled={isLoading}
              className="w-full py-3 rounded-2xl text-white font-bold transition hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: colors.primary }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Préparation...
                </>
              ) : (
                <>
                  {isPonctual ? `Payer ${amount.toLocaleString()} FCFA` : 'Continuer'}
                  <ExternalLink size={18} />
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