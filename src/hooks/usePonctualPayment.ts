// 📁 src/hooks/usePonctualPayment.ts
// ✅ HOOK DE PAIEMENT PONCTUEL CORRIGÉ : GESTION DES MÉTADONNÉES DE PROVISIONS ET CALCUL DE DOUBLE COURSES

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
  // ✅ AJOUT DES PROVISIONS POUR ENVOI AU WEBHOOK
  purchase_amount?: number;
  withdrawal_operator?: string;
  withdrawal_fee?: number;
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export const usePonctualPayment = (options: UsePonctualPaymentOptions = {}) => {
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
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

    // ✅ Ouvrir le modal de paiement
    setPendingPaymentData(paymentData);
    setIsPaymentModalOpen(true);
    
    return paymentData;
  }, []);

  // ============================================================
  // PAYER UNE COMMANDE PONCTUELLE (PROVISION INCLUSE)
  // ============================================================

  const payOrderPonctual = useCallback(async (data: OrderPaymentData) => {
    const baseAmount = getPonctualOrderPriceByType(data.orderType, data.items);
    const amount = baseAmount + (data.purchase_amount || 0) + (data.withdrawal_fee || 0); // ✅ Calcul cumulé de l'avance
    
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
      // ✅ TRANSMISSION DES PROVISIONS
      purchase_amount: data.purchase_amount || 0,
      withdrawal_operator: data.withdrawal_operator || null,
      withdrawal_fee: data.withdrawal_fee || 0,
    };

    // ✅ Ouvrir le modal de paiement
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
      const isOrder = paymentData.type === 'order';

      // ✅ Préparer les données pour le backend
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
        // ✅ TRANSMISSION DANS LA CHAINE DE CRÉATION DE COMMANDE PONCTUELLE
        purchase_amount: paymentData.purchase_amount || 0,
        withdrawal_operator: paymentData.withdrawal_operator || null,
        withdrawal_fee: paymentData.withdrawal_fee || 0,
      };

      console.log('📤 Exécution paiement ponctuel:', {
        amount: paymentData.amount,
        type: paymentData.type,
        isVisit,
        isOrder,
        visitId: paymentData.visitId,
        orderId: paymentData.orderId,
      });

      const result = await createPayment({
        amount: paymentData.amount,
        description: paymentData.description,
        is_ponctual: true,
        is_visit: isVisit,
        visit_id: paymentData.visitId || null,
        orderId: paymentData.orderId || null, // Relier la commande existante si frais finaux
        order_data: orderData,
        patient_id: paymentData.patientId || null,
        target_type: paymentData.targetType,
        target_name: paymentData.targetName,
        type: isVisit ? 'visit' : 'order', // type de transaction
        metadata: {
          type: isVisit ? 'visit' : 'order',
          is_ponctual: true,
          is_visit: isVisit,
          visit_id: paymentData.visitId || null,
          order_id: paymentData.orderId || null, // Relier la commande existante si frais finaux
          order_data: orderData,
        },
      });

      const paymentUrl = result?.payment_url || result?.url || result?.checkout_url;

      if (!paymentUrl) {
        throw new Error("Le lien de paiement n'a pas été généré");
      }

      // ✅ Sauvegarder les données de suivi locales
      const pendingData = {
        type: paymentData.type,
        id: paymentData.visitId || paymentData.orderId,
        transaction_id: result.transaction_id,
        timestamp: Date.now(),
      };
      
      if (isVisit && paymentData.visitId) {
        sessionStorage.setItem('pending_visit_payment', JSON.stringify(pendingData));
      } else if (isOrder) {
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

    // ✅ Rafraîchir les données
    await Promise.all([
      fetchVisits(),
      fetchOrders(),
    ]);

    toast.success('✅ Paiement effectué avec succès !');
    
    if (onSuccess) onSuccess();
    
    // ✅ Rediriger si spécifié
    if (redirectPath) {
      navigate(redirectPath);
    }
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
    // États
    isLoading,
    error,
    isPaymentModalOpen,
    pendingPaymentData,
    
    // Actions principales
    payVisitPonctual,
    payOrderPonctual,
    executePayment,  
    handlePaymentSuccess,
    handlePaymentCancel,
    
    // Utilitaires
    reset,
    setError,
  };
};

export default usePonctualPayment;
