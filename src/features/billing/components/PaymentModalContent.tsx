// 📁 src/features/billing/components/PaymentModalContent.tsx

import { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Loader2,
  ExternalLink,
  AlertCircle,
  Calendar,
} from 'lucide-react';

import { usePaymentStore } from '@/stores/paymentStore';
import { useAuthStore } from '@/stores/authStore';
import { usePatientStore } from '@/stores/patientStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { Offer } from '@/types';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface PaymentModalContentProps {
  offer?: Offer | null;
  plan?: any;
  onSuccess: () => void;
  onCancel: () => void;
  redirectPath?: string;
  orderData?: any;
  forcePonctual?: boolean;
  patientId?: string | null;
}

export const PaymentModalContent = ({
  offer,
  plan,
  onSuccess,
  onCancel,
  redirectPath = '/app/orders',
  orderData,
  forcePonctual = false,
  patientId: propPatientId = null,
}: PaymentModalContentProps) => {
  const brand = useBranding();
  const colors = brand.colors;
  const { createPayment } = usePaymentStore();
  const { profile } = useAuthStore();
  const { patients, fetchPatients } = usePatientStore();

  const { isFamily } = useTerminology();

  const selectedOffer = offer || plan;
  const period = selectedOffer?.period || selectedOffer?.type || 'mois';

  const isPonctual = forcePonctual ||
    period === 'ponctuelle' ||
    period === 'intervention' ||
    selectedOffer?.category === 'ponctuelle' ||
    selectedOffer?.type === 'ponctuelle' ||
    selectedOffer?.name?.toLowerCase().includes('ponctuel') ||
    selectedOffer?.name?.toLowerCase().includes('intervention');

  const baseAmount = selectedOffer?.price || 50000;
  const planName = selectedOffer?.name || 'Abonnement Santé Plus';
  const baseVisits = selectedOffer?.total_visits || selectedOffer?.visits_per_month || 0;

  const isVisit = isPonctual && !!orderData?.visit_id;
  const isOrder = isPonctual && !!orderData?.description && !orderData?.visit_id;

  const [isLoading, setIsLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(propPatientId || orderData?.patient_id || null);
  const [selectedTargetType, setSelectedTargetType] = useState<'personal' | 'patient'>(
    (propPatientId || orderData?.patient_id) ? 'patient' : 'personal'
  );
  const [selectedTargetName, setSelectedTargetName] = useState<string>('');
  
  // Sélecteur dynamique de mois d'abonnement (uniquement pour les forfaits récurrents)
  const [durationMonths, setDurationMonths] = useState<number>(1);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const compatiblePatients = useMemo(() => {
    if (!selectedOffer || isPonctual) return [];
    return patients.filter((p) => p.category === selectedOffer.category);
  }, [patients, selectedOffer, isPonctual]);

  useEffect(() => {
    if (compatiblePatients.length > 0 && !isPonctual && !selectedPatientId) {
      setSelectedTargetType('patient');
      setSelectedPatientId(compatiblePatients[0].id);
      setSelectedTargetName(`${compatiblePatients[0].first_name} ${compatiblePatients[0].last_name}`);
    } else if (!selectedPatientId) {
      setSelectedTargetType('personal');
      setSelectedPatientId(null);
      setSelectedTargetName(profile?.full_name || 'Client');
    }
  }, [compatiblePatients, isPonctual, selectedPatientId, profile]);

  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setSelectedTargetType('patient');
      setSelectedTargetName(`${patient.first_name} ${patient.last_name}`);
    } else {
      setSelectedTargetType('personal');
      setSelectedTargetName(profile?.full_name || 'Client');
      setSelectedPatientId(null);
    }
  };

  // Calcul du montant et des prestations proportionnels
  const currentAmount = isPonctual ? baseAmount : baseAmount * durationMonths;
  const currentVisits = isPonctual ? 0 : baseVisits * durationMonths;

  const getSubscriptionLabel = () => {
    if (isPonctual) return 'ponctuel';
    if (selectedTargetType === 'patient') return `pour votre proche (/${period})`;
    return `pour votre compte personnel (/${period})`;
  };

  const getInfoMessage = () => {
    if (isVisit) {
      return 'Vous allez payer cette visite ponctuellement. FedaPay ouvrira son formulaire sécurisé pour finaliser le paiement. Une fois le paiement effectué, la visite sera planifiée.';
    }
    if (isOrder) {
      return 'Vous allez payer cette commande ponctuellement. FedaPay ouvrira son formulaire sécurisé pour finaliser le paiement. Une fois le paiement effectué, la commande sera créée.';
    }
    return `FedaPay ouvrira son propre formulaire sécurisé pour finaliser le paiement. Après confirmation, l'abonnement d'une durée de ${durationMonths} mois sera immédiatement activé.`;
  };

  const handlePayment = async () => {
    setIsLoading(true);

    try {
      if (isPonctual && orderData) {
        sessionStorage.setItem('pending_ponctual_order', JSON.stringify(orderData));
        localStorage.setItem('pending_ponctual_order', JSON.stringify(orderData));
      }

      const orderDataForBackend = (isPonctual && orderData) ? {
        patient_id: orderData.patient_id || selectedPatientId || null,
        type: orderData.type || 'autre',
        description: orderData.description || (isVisit ? 'Visite ponctuelle' : 'Commande ponctuelle'),
        address: orderData.address || 'Adresse non spécifiée',
        items: orderData.items || [],
        prescription_url: orderData.prescription_url || null,
        target_type: selectedTargetType,
        target_name: selectedTargetName || profile?.full_name || 'Client',
        ...(isVisit ? {
          visit_id: orderData.visit_id,
          duration_minutes: orderData.duration_minutes || 60,
          scheduled_date: orderData.scheduled_date,
          scheduled_time: orderData.scheduled_time,
        } : {}),
      } : null;

      const offerId = selectedOffer?.id || null;
      const subscriptionId = isPonctual ? null : offerId;
      const finalPatientId = selectedPatientId || orderData?.patient_id || null;

      const result = await createPayment({
        plan_id: offerId,
        abonnement_id: subscriptionId,
        amount: currentAmount,
        description: `${planName} (${durationMonths} mois)`,
        email: profile?.email,
        is_ponctual: isPonctual,
        is_visit: isVisit,
        visit_id: orderData?.visit_id || null,
        order_data: orderDataForBackend,
        patient_id: finalPatientId,
        target_type: selectedTargetType,
        target_name: selectedTargetName || profile?.full_name || 'Client',
        duration_months: durationMonths,
        metadata: {
          type: isVisit ? 'visit' : (isOrder ? 'order' : 'subscription'),
          is_ponctual: isPonctual,
          is_visit: isVisit,
          visit_id: orderData?.visit_id || null,
          order_data: orderDataForBackend,
          duration_months: durationMonths,
        },
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
      {/* CADRE TARIF */}
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

          <div className="min-w-0 flex-1">
            <p className="font-black" style={{ color: colors.text }}>
              {isVisit ? 'Visite ponctuelle' : isOrder ? 'Commande ponctuelle' : planName}
            </p>

            <p className="text-sm mt-0.5" style={{ color: colors.textLight }}>
              {isPonctual ? (orderData?.description || 'Service ponctuel') : `Abonnement ${getSubscriptionLabel()}`}
            </p>

            {!isPonctual && currentVisits > 0 && (
              <p className="text-xs mt-1 font-bold text-emerald-600">
                📅 Contient {currentVisits} visites au total
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textLight }}>
            Montant à payer
          </p>
          <p className="text-3xl font-black mt-1" style={{ color: colors.primary }}>
            {currentAmount.toLocaleString()} FCFA
          </p>
        </div>
      </div>

      {/* SÉLECTEUR PERSONNALISÉ DE DURÉE (Uniquement si ce n'est pas un service ponctuel) */}
      {!isPonctual && (
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: colors.textLight }}>
            Durée de l'engagement souhaitée
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 6, 12].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDurationMonths(m)}
                className={cn(
                  "py-2.5 rounded-xl border text-xs font-extrabold transition-all",
                  durationMonths === m
                    ? "text-white"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                )}
                style={{
                  backgroundColor: durationMonths === m ? colors.primary : 'transparent',
                  borderColor: durationMonths === m ? colors.primary : colors.primary + '20',
                }}
              >
                {m} {m === 1 ? 'Mois' : 'Mois'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SÉLECTEUR DE BÉNÉFICIAIRE */}
      {compatiblePatients.length > 0 && !isPonctual && (
        <div className="space-y-2.5">
          <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: colors.textLight }}>
            Bénéficiaire du forfait
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedTargetType('personal');
                setSelectedPatientId(null);
                setSelectedTargetName(profile?.full_name || 'Client');
              }}
              className={cn(
                "p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5",
                selectedTargetType === 'personal'
                  ? "text-white"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              )}
              style={{
                background: selectedTargetType === 'personal' ? colors.primary : 'transparent',
                borderColor: selectedTargetType === 'personal' ? colors.primary : colors.primary + '20',
              }}
            >
              👤 Compte Personnel
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedTargetType('patient');
                if (compatiblePatients.length > 0) {
                  handlePatientChange(compatiblePatients[0].id);
                }
              }}
              className={cn(
                "p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5",
                selectedTargetType === 'patient'
                  ? "text-white"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              )}
              style={{
                background: selectedTargetType === 'patient' ? colors.primary : 'transparent',
                borderColor: selectedTargetType === 'patient' ? colors.primary : colors.primary + '20',
              }}
            >
              Un proche ({compatiblePatients.length})
            </button>
          </div>

          {selectedTargetType === 'patient' && (
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textLight }}>
                Sélectionner le proche
              </label>
              <select
                value={selectedPatientId || ''}
                onChange={(e) => handlePatientChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none bg-gray-50/50"
                style={{ borderColor: colors.primary + '20', color: colors.text }}
              >
                {compatiblePatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* MESSAGE INFO */}
      <div
        className="flex items-start gap-3 p-4 rounded-2xl"
        style={{ background: colors.primary + '10' }}
      >
        <AlertCircle size={19} style={{ color: colors.primary }} className="shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs leading-relaxed" style={{ color: colors.textLight }}>
            {getInfoMessage()}
          </p>
          <p className="text-[10px] font-medium" style={{ color: colors.textLight }}>
            💳 Paiement sécurisé via FedaPay
          </p>
        </div>
      </div>

      {/* BOUTONS */}
      <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.primary + '15' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-3 rounded-2xl font-bold border hover:bg-gray-50 transition disabled:opacity-50 text-xs sm:text-sm"
          style={{ borderColor: colors.primary + '20', color: colors.text }}
        >
          Annuler
        </button>

        <button
          type="button"
          onClick={handlePayment}
          disabled={isLoading}
          className="flex-1 py-3 rounded-2xl text-white font-bold transition hover:opacity-95 disabled:opacity-60 flex items-center justify-center gap-2 text-xs sm:text-sm"
          style={{ background: colors.primary }}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              Payer {currentAmount.toLocaleString()} FCFA
              <ExternalLink size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PaymentModalContent;
