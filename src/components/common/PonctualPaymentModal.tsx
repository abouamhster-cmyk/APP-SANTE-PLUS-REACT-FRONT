// 📁 frontend/src/components/common/PonctualPaymentModal.tsx
// ✅ Modal de paiement ponctuel unifié pour Visites et Commandes

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Loader2,
  ExternalLink,
  AlertCircle,
  Calendar,
  Clock,
  User,
  Package,
  ShoppingBag,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import { ModalFullScreen } from '@/components/ui/ModalFullScreen';
import { usePaymentStore } from '@/stores/paymentStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { formatCurrency } from '@/utils/helpers';
import toast from 'react-hot-toast';

// ============================================================
// TYPES
// ============================================================

export interface PonctualPaymentData {
  // Informations générales
  type: 'visit' | 'order';
  amount: number;
  description: string;
  
  // Pour les visites
  visitId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  durationMinutes?: number;
  patientName?: string;
  
  // Pour les commandes
  orderId?: string;
  orderType?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  address?: string;
  prescriptionUrl?: string;
  
  // Cible
  targetType: 'personal' | 'patient';
  targetName: string;
  targetId?: string | null;
  patientId?: string | null;
}

interface PonctualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  paymentData: PonctualPaymentData;
  redirectPath?: string;
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export const PonctualPaymentModal = ({
  isOpen,
  onClose,
  onSuccess,
  paymentData,
  redirectPath = '/app',
}: PonctualPaymentModalProps) => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const { createPayment } = usePaymentStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const isVisit = paymentData.type === 'visit';
  const isOrder = paymentData.type === 'order';

  // ============================================================
  // HANDLER : LANCER LE PAIEMENT
  // ============================================================
  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
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
      };

      console.log('📤 Envoi paiement ponctuel:', {
        amount: paymentData.amount,
        type: paymentData.type,
        isVisit,
        isOrder,
        visitId: paymentData.visitId,
        orderId: paymentData.orderId,
        targetType: paymentData.targetType,
        targetName: paymentData.targetName,
        patientId: paymentData.patientId,
      });

      // ✅ Appeler l'API de paiement
      const result = await createPayment({
        amount: paymentData.amount,
        description: paymentData.description,
        is_ponctual: true,
        is_visit: isVisit,
        visit_id: paymentData.visitId || null,
        order_data: orderData,
        patient_id: paymentData.patientId || null,
        target_type: paymentData.targetType,
        target_name: paymentData.targetName,
        metadata: {
          type: isVisit ? 'visit' : 'order',
          is_ponctual: true,
          is_visit: isVisit,
          visit_id: paymentData.visitId || null,
          order_data: orderData,
        },
      });

      const paymentUrl = result?.payment_url || result?.url || result?.checkout_url;

      if (!paymentUrl) {
        throw new Error("Le lien de paiement n'a pas été généré");
      }

      // ✅ Sauvegarder les données en attente
      const pendingData = {
        type: paymentData.type,
        id: paymentData.visitId || paymentData.orderId,
        transaction_id: result.transaction_id,
        timestamp: Date.now(),
      };
      
      if (isVisit && paymentData.visitId) {
        sessionStorage.setItem('pending_visit_payment', JSON.stringify(pendingData));
      } else if (isOrder && paymentData.orderId) {
        sessionStorage.setItem('pending_ponctual_order', JSON.stringify(pendingData));
        localStorage.setItem('pending_ponctual_order', JSON.stringify(pendingData));
      }

      toast.success('Redirection vers FedaPay...');
      window.location.href = paymentUrl;
      
    } catch (error: any) {
      console.error('❌ Erreur paiement:', error);
      setError(error?.message || 'Erreur lors du lancement du paiement');
      toast.error(error?.message || 'Erreur lors du paiement');
      setIsLoading(false);
    }
  };

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <ModalFullScreen
      isOpen={isOpen}
      onClose={onClose}
      onBack={onClose}
      title={isVisit ? '💳 Paiement visite ponctuelle' : '💳 Paiement commande ponctuelle'}
    >
      <div className="w-full max-w-md mx-auto space-y-5 px-0.5 py-1">

        {/* ============================================================
        RÉSUMÉ DU PAIEMENT
        ============================================================ */}
        <div
          className="rounded-2xl p-5 border shadow-sm space-y-4"
          style={{
            background: colors.primary + '06',
            borderColor: colors.primary + '15',
          }}
        >
          {/* En-tête */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              {isVisit ? <Calendar size={18} /> : <ShoppingBag size={18} />}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.text + '50' }}>
                {isVisit ? 'Visite ponctuelle' : 'Commande ponctuelle'}
              </span>
              <p className="font-bold text-sm truncate" style={{ color: colors.text }}>
                {paymentData.targetName || 'Personnel'}
              </p>
            </div>
          </div>

          {/* Détails */}
          <div className="grid grid-cols-2 gap-3 text-xs border-t pt-3" style={{ borderColor: colors.primary + '20' }}>
            {isVisit ? (
              <>
                <div>
                  <p className="font-semibold text-[9px] uppercase" style={{ color: colors.text + '50' }}>
                    Date & Heure
                  </p>
                  <p className="font-semibold flex items-center gap-1" style={{ color: colors.text }}>
                    <Calendar size={12} className="shrink-0" style={{ color: colors.text + '40' }} />
                    {paymentData.scheduledDate ? new Date(paymentData.scheduledDate).toLocaleDateString('fr-FR') : 'À définir'}
                    {paymentData.scheduledTime && ` à ${paymentData.scheduledTime}`}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[9px] uppercase" style={{ color: colors.text + '50' }}>
                    Durée
                  </p>
                  <p className="font-semibold flex items-center gap-1" style={{ color: colors.text }}>
                    <Clock size={12} className="shrink-0" style={{ color: colors.text + '40' }} />
                    {paymentData.durationMinutes || 60} min
                  </p>
                </div>
                {paymentData.patientName && (
                  <div className="col-span-2">
                    <p className="font-semibold text-[9px] uppercase" style={{ color: colors.text + '50' }}>
                      Patient
                    </p>
                    <p className="font-semibold flex items-center gap-1" style={{ color: colors.text }}>
                      <User size={12} className="shrink-0" style={{ color: colors.text + '40' }} />
                      {paymentData.patientName}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="col-span-2">
                  <p className="font-semibold text-[9px] uppercase" style={{ color: colors.text + '50' }}>
                    Description
                  </p>
                  <p className="font-semibold text-sm" style={{ color: colors.text }}>
                    {paymentData.description}
                  </p>
                </div>
                {paymentData.items && paymentData.items.length > 0 && (
                  <div className="col-span-2">
                    <p className="font-semibold text-[9px] uppercase" style={{ color: colors.text + '50' }}>
                      Articles ({paymentData.items.length})
                    </p>
                    <div className="space-y-0.5 mt-1">
                      {paymentData.items.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex justify-between text-[11px]">
                          <span style={{ color: colors.text + '80' }}>{item.name} × {item.quantity}</span>
                          <span className="font-semibold" style={{ color: colors.primary }}>
                            {(item.quantity * item.price).toLocaleString()} FCFA
                          </span>
                        </div>
                      ))}
                      {paymentData.items.length > 3 && (
                        <span className="text-[10px] text-gray-400">
                          +{paymentData.items.length - 3} autres articles
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {paymentData.address && (
                  <div className="col-span-2">
                    <p className="font-semibold text-[9px] uppercase" style={{ color: colors.text + '50' }}>
                      Livraison
                    </p>
                    <p className="text-xs" style={{ color: colors.text + '70' }}>
                      {paymentData.address}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Montant total */}
          <div className="border-t pt-3" style={{ borderColor: colors.primary + '20' }}>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.text + '50' }}>
                  Total à régler
                </p>
                <p className="text-2xl font-black tracking-tight" style={{ color: colors.primary }}>
                  {formatCurrency(paymentData.amount)}
                </p>
              </div>
              <span className="text-[10px] text-gray-400 font-medium">
                Paiement unique
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================
        BLOC INFORMATIONS
        ============================================================ */}
        <div
          className="flex items-start gap-3 p-4 rounded-xl border"
          style={{ background: colors.primary + '05', borderColor: colors.primary + '12' }}
        >
          <AlertCircle size={15} style={{ color: colors.primary }} className="shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs leading-relaxed font-medium" style={{ color: colors.text + '80' }}>
              💳 Vous allez être redirigé vers FedaPay pour finaliser le paiement.
              <br />
              <span className="text-[10px]" style={{ color: colors.text + '50' }}>
                Moyens acceptés : Mobile Money (MTN, Moov, Wave) ou Carte bancaire.
              </span>
            </p>
          </div>
        </div>

        {/* ============================================================
        ERREUR
        ============================================================ */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
            <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* ============================================================
        BOUTONS
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
            disabled={isLoading}
            className="w-full sm:flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm order-1 sm:order-2"
            style={{ background: isLoading ? '#9CA3AF' : colors.primary }}
          >
            {isLoading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                Payer {formatCurrency(paymentData.amount)}
                <ExternalLink size={13} />
              </>
            )}
          </button>
        </div>

        {/* ============================================================
        FOOTER INFO
        ============================================================ */}
        <p className="text-[9px] text-center" style={{ color: colors.text + '30' }}>
          Paiement sécurisé par FedaPay
        </p>
      </div>
    </ModalFullScreen>
  );
};

export default PonctualPaymentModal;
