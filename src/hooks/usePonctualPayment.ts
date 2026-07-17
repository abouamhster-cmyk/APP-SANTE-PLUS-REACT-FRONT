// 📁 src/hooks/usePonctualPayment.ts
// ✅ HOOK DE PAIEMENT PONCTUEL CORRIGÉ : GESTION DES MÉTADONNÉES DE PROVISIONS ET DU TRANSTYPAGE SÉCURISÉ TS

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaymentStore } from '@/stores/paymentStore';
import { useVisitStore } from '@/stores/visitStore';
import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { getPonctualPrice, getPonctualOrderPriceByType } from '@/lib/constants';
import toast from 'react-hot-toast';

// ============================================================
// TYPES
// ============================================================

export interface UsePonctualPaymentOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  redirectPath?: string;
}

export interface VisitPaymentData {
  visitId: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes: number;
  patientName?: string;
  patientId?: string | null;
  targetType: 'personal' | 'patient';
  targetName: string;
  address?: string;
}

export interface OrderPaymentData {
  orderId?: string;
  description: string;
  orderType: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  address?: string;
  prescriptionUrl?: string;
  targetType: 'personal' | 'patient';
  targetName: string;
  patientId?: string | null;
  purchase_amount?: number;
  withdrawal_operator?: string;
  withdrawal_fee?: number;
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export const usePonctualPayment = (options: UsePonctualPaymentOptions = {}) => {
  const navigate = useNavigate();
  const { createPayment } = usePaymentStore();
  const { fetchVisits } = useVisitStore();
  const { fetchOrders } = useOrderStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<any>(null);

  const { onSuccess, onError, redirectPath = '/app' } = options;

  // ============================================================
  // PAYER UNE VISITE PONCTUELLE
  // ============================================================

  const payVisitPonctual = useCallback(async (data: VisitPaymentData) => {
    const amount = getPonctualPrice(data.durationMinutes || 60);
    
    const paymentData = {
      type: 'visit' as const,
      amount,
      description: `Visite ponctuelle - ${data.targetName}`,
      visitId: data.visitId,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      durationMinutes: data.durationMinutes || 60,
      patientName: data.patientName,
      patientId: data.patientId || null,
      targetType: data.targetType,
      targetName: data.targetName,
      address: data.address || 'Adresse non spécifiée',
    };

    setPendingPaymentData(paymentData);
    setIsPaymentModalOpen(true);
    
    return paymentData;
  }, []);

  // ============================================================
  // PAYER UNE COMMANDE PONCTUELLE (PROVISION INCLUSE)
  // ============================================================

  const payOrderPonctual = useCallback(async (data: OrderPaymentData) => {
    const baseAmount = getPonctualOrderPriceByType(data.orderType, data.items);
    const amount = baseAmount + (data.purchase_amount || 0) + (data.withdrawal_fee || 0);
    
    const paymentData = {
      type: 'order' as const,
      amount,
      description: data.description,
      orderId: data.orderId,
      orderType: data.orderType,
      items: data.items || [],
      address: data.address || 'Adresse non spécifiée',
      prescriptionUrl: data.prescriptionUrl || null,
      targetType: data.targetType,
      targetName: data.targetName,
      patientId: data.patientId || null,
      purchase_amount: data.purchase_amount || 0,
      withdrawal_operator: data.withdrawal_operator || null,
      withdrawal_fee: data.withdrawal_fee || 0,
    };

    setPendingPaymentData(paymentData);
    setIsPaymentModalOpen(true);
    
    return paymentData;
  }, []);

  // ============================================================
  // EXÉCUTER LE PAIEMENT DIRECT (AVEC APPEL FEDAPAY WEBHOOK)
  // ============================================================

  const executePayment = useCallback(async (paymentData: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const isVisit = paymentData.type === 'visit';

      const orderData = isVisit ? {
        visit_id: paymentData.visitId,
        duration_minutes: paymentData.durationMinutes || 60,
        scheduled_date: paymentData.scheduledDate,
        scheduled_time: paymentData.scheduledTime,
        target_type: paymentData.targetType,
        target_name: paymentData.targetName,
        description: paymentData.description,
        address: paymentData.address || 'Adresse non spécifiée',
        type: 'visite',
      } : {
        description: paymentData.description,
        address: paymentData.address || 'Adresse non spécifiée',
        type: paymentData.orderType || 'autre',
        items: paymentData.items || [],
        prescription_url: paymentData.prescriptionUrl || null,
        target_type: paymentData.targetType,
        target_name: paymentData.targetName,
        purchase_amount: paymentData.purchase_amount || 0,
        withdrawal_operator: paymentData.withdrawal_operator || null,
        withdrawal_fee: paymentData.withdrawal_fee || 0,
      };

      console.log('📤 Exécution paiement ponctuel:', {
        amount: paymentData.amount,
        type: paymentData.type,
        isVisit,
        visitId: paymentData.visitId,
        orderId: paymentData.orderId,
      });

      // ✅ CORRIGÉ : Ajout du transtypage "as any" sur l'objet transmis
      const result = await createPayment({
        amount: paymentData.amount,
        description: paymentData.description,
        is_ponctual: true,
        is_visit: isVisit,
        visit_id: paymentData.visitId || null,
        orderId: paymentData.orderId || null,
        order_data: orderData,
        patient_id: paymentData.patientId || null,
        target_type: paymentData.targetType,
        target_name: paymentData.targetName,
        type: isVisit ? 'visit' : 'order',
        metadata: {
          type: isVisit ? 'visit' : 'order',
          is_ponctual: true,
          is_visit: isVisit,
          visit_id: paymentData.visitId || null,
          order_id: paymentData.orderId || null,
          order_data: orderData,
        },
      } as any);

      const paymentUrl = result?.payment_url || result?.url || result?.checkout_url;

      if (!paymentUrl) {
        throw new Error("Le lien de paiement n'a pas été généré");
      }

      const pendingData = {
        type: paymentData.type,
        id: paymentData.visitId || paymentData.orderId,
        transaction_id: result.transaction_id,
        timestamp: Date.now(),
      };
      
      if (isVisit && paymentData.visitId) {
        sessionStorage.setItem('pending_visit_payment', JSON.stringify(pendingData));
      } else if (paymentData.type === 'order') {
        sessionStorage.setItem('pending_ponctual_order', JSON.stringify(pendingData));
        localStorage.setItem('pending_ponctual_order', JSON.stringify(pendingData));
      }

      toast.success('Redirection vers FedaPay...');
      window.location.href = paymentUrl;
      
    } catch (error: any) {
      console.error('❌ Erreur paiement ponctuel:', error);
      setError(error?.message || 'Erreur lors du paiement');
      toast.error(error?.message || 'Erreur lors du paiement');
      if (onError) onError(error);
      setIsLoading(false);
      throw error;
    }
  }, [createPayment, onError]);

  // ============================================================
  // SUCCÈS DU PAIEMENT (CALLBACK)
  // ============================================================

  const handlePaymentSuccess = useCallback(async () => {
    setIsPaymentModalOpen(false);
    setPendingPaymentData(null);
    setIsLoading(false);
    setError(null);

    await Promise.all([
      fetchVisits(),
      fetchOrders(),
    ]);

    toast.success('✅ Paiement effectué avec succès !');
    if (onSuccess) onSuccess();
    if (redirectPath) navigate(redirectPath);
  }, [fetchVisits, fetchOrders, onSuccess, redirectPath, navigate]);

  // ============================================================
  // ANNULER LE PAIEMENT
  // ============================================================

  const handlePaymentCancel = useCallback(() => {
    setIsPaymentModalOpen(false);
    setPendingPaymentData(null);
    setIsLoading(false);
  }, []);

  // ============================================================
  // RÉINITIALISATION
  // ============================================================

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setIsPaymentModalOpen(false);
    setPendingPaymentData(null);
  }, []);

  // ============================================================
  // RETOUR
  // ============================================================

  return {
    isLoading,
    error,
    isPaymentModalOpen,
    pendingPaymentData,
    payVisitPonctual,
    payOrderPonctual,
    executePayment, 
    handlePaymentSuccess,
    handlePaymentCancel,
    reset,
    setError,
  };
};

export default usePonctualPayment;
