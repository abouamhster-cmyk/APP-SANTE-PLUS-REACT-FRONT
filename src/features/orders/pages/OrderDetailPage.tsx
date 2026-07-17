// 📁 frontend/src/features/orders/pages/OrderDetailPage.tsx
// ✅ PAGE DÉTAIL COMMANDE COMPLETE : CLOTURE SÉCURISÉE CASH, REDIRECTION DIRECTE ET FILTRAGE DE RÔLE SÉCURISÉ

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  MapPin,
  User,
  Users,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Camera,
  Image as ImageIcon,
  Banknote,
  Play,
  ShoppingBag,
  FileText,
  Calendar,
  Phone,
  Mail,
  Star,
  AlertCircle,
  Loader2,
  CreditCard,
  Navigation as NavIcon,
  Info, // ✅ Utilisé pour les alertes de rôle
} from 'lucide-react';

import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { useBranding } from '@/hooks/useBranding'; 
import { useTerminology } from '@/hooks/useTerminology';
import { formatCurrency, formatDateTime, cn } from '@/utils/helpers'; 

import {
  isOrderPendingPayment,
  isOrderPonctual,
  requiresOrderPayment,
} from '@/utils/helpers';

import { supabase } from '@/lib/supabase';
import { usePonctualPayment } from '@/hooks/usePonctualPayment'; 
import { PonctualPaymentModal } from '@/components/common/PonctualPaymentModal';
import toast from 'react-hot-toast';

// ============================================================
// HELPERS LOCAUX
// ============================================================

interface MiniCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

const MiniCard = ({ icon, label, value, color }: MiniCardProps) => {
  const brand = useBranding();
  const colors = brand.colors;

  return (
    <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border min-w-0" style={{ borderColor: colors.primary + '15' }}>
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: color + '14', color }}
      >
        {icon}
      </div>
      <p className="text-xs" style={{ color: colors.textLight }}>{label}</p>
      <p className="font-black text-sm mt-1 break-words" style={{ color }}>
        {value}
      </p>
    </div>
  );
};

interface PersonBoxProps {
  icon: React.ReactNode;
  title: string;
  name: string;
  detail: string;
  detailIcon?: React.ReactNode;
}

const PersonBox = ({ icon, title, name, detail, detailIcon }: PersonBoxProps) => {
  const brand = useBranding();
  const colors = brand.colors;

  return (
    <div className="rounded-2xl bg-gray-50 p-4 border" style={{ borderColor: colors.primary + '15' }}>
      <div className="flex items-center gap-2 text-sm mb-2" style={{ color: colors.textLight }}>
        {icon}
        {title}
      </div>
      <p className="font-bold break-words" style={{ color: colors.text }}>{name}</p>
      <p className="text-sm mt-1 break-words flex items-center gap-1" style={{ color: colors.textLight }}>
        {detailIcon}
        {detail}
      </p>
    </div>
  );
};

interface DocButtonProps {
  icon: React.ReactNode;
  title: string;
  color: string;
  onClick: () => void;
}

const DocButton = ({ icon, title, color, onClick }: DocButtonProps) => {
  const brand = useBranding();
  const colors = brand.colors;

  return (
    <button
      onClick={onClick}
      className="rounded-2xl bg-gray-50 p-4 border text-left hover:bg-gray-100 transition group" style={{ borderColor: colors.primary + '15' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-105 transition"
            style={{ background: color + '14', color }}
          >
            {icon}
          </div>
          <p className="font-bold" style={{ color: colors.text }}>{title}</p>
        </div>
        <Eye size={20} style={{ color }} className="opacity-50 group-hover:opacity-100 transition" />
      </div>
    </button>
  );
};

const getStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    creee: 'Créée',
    en_attente: 'En attente',
    disponible: 'Disponible (urgent)',
    en_cours: 'En cours',
    livree: 'Livrée (En attente)',
    validee: 'Validée',
    annulee: 'Annulée',
    attente_paiement: 'En attente paiement',
  };
  return map[status] || status;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    creee: '#9E9E9E',
    en_attente: '#F59E0B',
    disponible: '#EF4444',
    en_cours: '#3B82F6',
    livree: '#3B82F6',
    validee: '#4CAF50',
    annulee: '#9E9E9E',
    attente_paiement: '#8B5CF6',
  };
  return colors[status] || '#9E9E9E';
};

interface ActionButtonProps {
  label: string;
  icon: React.ReactNode;
  color: string;
  disabled?: boolean;
  onClick: () => void;
  isLoading?: boolean;
}

const ActionButton = ({ label, icon, color, disabled, onClick, isLoading }: ActionButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold transition hover:opacity-80 disabled:opacity-50 text-center"
      style={{ background: color }}
    >
      {isLoading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {isLoading ? 'Chargement...' : label}
    </button>
  );
};

interface StatusBadgeProps {
  status: string;
  colors: any;
}

const StatusBadge = ({ status, colors }: StatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    const map: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
      creee: { icon: <Package size={14} />, color: '#9E9E9E', bg: '#9E9E9E15', label: 'Créée' },
      en_attente: { icon: <Clock size={14} />, color: '#F59E0B', bg: '#F59E0B15', label: 'En attente' },
      disponible: { icon: <AlertCircle size={14} />, color: '#EF4444', bg: '#EF444415', label: 'Disponible' },
      en_cours: { icon: <Clock size={14} />, color: '#3B82F6', bg: '#3B82F615', label: 'En cours' },
      livree: { icon: <Truck size={14} />, color: '#3B82F6', bg: '#3B82F615', label: 'Livrée' },
      validee: { icon: <CheckCircle size={14} />, color: '#4CAF50', bg: '#4CAF5015', label: 'Validée' },
      annulee: { icon: <XCircle size={14} />, color: '#EF4444', bg: '#EF444415', label: 'Annulée' },
      attente_paiement: { icon: <CreditCard size={14} />, color: '#8B5CF6', bg: '#8B5CF615', label: 'En attente paiement' },
    };
    return map[status] || map['creee'];
  };

  const config = getStatusConfig(status);

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: config.bg, color: config.color }}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { role, user } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;
  const { currentOrder, fetchOrderById, updateOrderStatus, takeOrder, completeDelivery, confirmCashPayment, isLoading } = useOrderStore();

  const {
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const order = currentOrder as any;

  const [isUpdating, setIsUpdating] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  // Formulaire final livreur
  const [deliveryFeeInput, setDeliveryFeeInput] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');
  const [cashReceivedInput, setCashReceivedInput] = useState<number>(0);

  const modalRef = useRef<HTMLDivElement>(null); 
  const isActionPending = useRef(false);
  const beneficiaryLabel = isFamily ? 'Proche' : 'Destinataire';

  const openUrl = (url: string | null) => { 
    if (!url) {
      toast.error('URL non disponible');
      return;
    }
    window.open(url, '_blank');
  };

  // ✅ REDIRECTION DIRECTE SANS ETAPE INTERMEDIAIRE (MODAL SHUNTE !)
  const {
    executePayment,
    isPaymentModalOpen,
    pendingPaymentData,
    handlePaymentSuccess,
    handlePaymentCancel,
    isLoading: isPaymentLoading,
  } = usePonctualPayment({
    onSuccess: () => {
      fetchOrderById(id!);
      toast.success('Frais de livraison réglés !');
    },
    redirectPath: `/app/orders/${id}`,
  });

  useEffect(() => {
    if (id) fetchOrderById(id);
  }, [id]);

  useEffect(() => {
    if (showProofModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showProofModal]);

  const handleStatusChange = (status: string) => {
    if (!id) return;
    updateOrderStatus(id, status as any)
      .then(() => {
        toast.success(`Commande ${getStatusLabel(status)}`);
        fetchOrderById(id);
      })
      .catch((error: any) => {
        toast.error(error.message || 'Erreur lors de la mise à jour');
      });
  };

  // ✅ CAPTURE DU POINT DE DÉPART DE MISSION LORS DE LA PRISE EN CHARGE (CHECKPOINT)
  const handleTakeOrder = async () => {
    if (!id) return;
    if (isActionPending.current) return;
    
    isActionPending.current = true;
    setIsUpdating(true);

    let takeLat: number | null = null;
    let takeLng: number | null = null;

    try {
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 6000,
          });
        });
        takeLat = position.coords.latitude;
        takeLng = position.coords.longitude;
        console.log(`📍 Checkpoint Prise de Commande GPS capturé: ${takeLat}, ${takeLng}`);
      }
    } catch (e) {
      console.warn("⚠️ Impossible de récupérer la position GPS au moment d'accepter la commande");
    }
    
    try {
      await takeOrder(id, takeLat, takeLng);
      toast.success('Commande prise en charge ✅ (GPS enregistré)');
      await fetchOrderById(id);
    } catch (error: any) {
      console.error('❌ Erreur prise commande:', error);
      toast.error(error.message || 'Erreur lors de la prise de commande');
    } finally {
      setIsUpdating(false);
      isActionPending.current = false;
    }
  };

  const handleProofSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5MB");
      return;
    }

    setProofFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setProofPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // ✅ ENREGISTREMENT COMPLET DE LA LIVRAISON (AVEC PARAMETRAGE METHODE ET CHECKPOINT GPS)
  const handleCompleteDelivery = async () => {
    if (!id) return;
    if (deliveryFeeInput <= 0 && !order.subscription_id) {
      toast.error('Veuillez renseigner les frais de transport');
      return;
    }
    if (paymentMethod === 'cash' && cashReceivedInput <= 0) {
      toast.error('Veuillez renseigner le montant perçu en mains propres');
      return;
    }

    setIsUpdating(true);
    let lat: number | null = null;
    let lng: number | null = null;

    try {
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 6000,
          });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      }
    } catch {
      console.warn("Pas de position");
    }

    try {
      let proofUrl = null;

      if (proofFile) {
        const fileExt = proofFile.name.split('.').pop();
        const filePath = `proofs/${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage.from('orders').upload(filePath, proofFile);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('orders').getPublicUrl(filePath);
        proofUrl = publicUrl;
      }

      await completeDelivery(id, {
        proof_url: proofUrl,
        delivery_fee: order.subscription_id ? 0 : Number(deliveryFeeInput || 0),
        payment_method: paymentMethod,
        cash_amount_received: paymentMethod === 'cash' ? Number(cashReceivedInput || 0) : 0,
        lat,
        lng,
      });

      toast.success('Livraison enregistrée avec succès !');
      setShowProofModal(false);
      setProofFile(null);
      setProofPreview(null);
      fetchOrderById(id);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // ✅ CONFIRMER OU CONTESTER LE CASH REÇU PAR LE LIVREUR
  const handleConfirmCash = async (isConfirmed: boolean) => {
    if (!id || isUpdating) return;
    setIsUpdating(true);
    try {
      await confirmCashPayment(id, isConfirmed);
      if (isConfirmed) {
        toast.success('Merci ! Paiement espèces validé.');
      } else {
        toast.error('Signalement enregistré. La coordination va vous contacter.');
      }
      fetchOrderById(id);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePayDeliveryOnline = async () => {
    try {
      await executePayment({
        type: 'order',
        amount: order.delivery_fee,
        description: `Frais de transport - Commande #${order.id.slice(0, 8)}`,
        orderId: order.id,
        orderType: 'delivery',
        items: [{ name: 'Prestation de livraison', quantity: 1, price: order.delivery_fee, total: order.delivery_fee }], 
        address: order.address,
        targetType: order.target_type,
        targetName: order.target_name || 'Personnel',
        patientId: order.patient_id,
      });
    } catch {
      toast.error('Erreur lancement paiement');
    }
  };

  if (isLoading || !currentOrder) {
    return (
      <div className="min-h-[420px] flex items-center justify-center">
        <div className="text-center">
          <Loader2
            className="w-12 h-12 animate-spin mx-auto mb-4"
            style={{ color: colors.primary }}
          />
          <p style={{ color: colors.text }}>Chargement...</p>
        </div>
      </div>
    );
  }

  const isPendingPayment = order.status === 'attente_paiement';
  const isPonctual = order.order_type === 'ponctual' || order.is_ponctual === true;
  const isPaid = order.is_paid === true;

  const canTake = (order.status === 'creee' || order.status === 'en_attente' || order.status === 'disponible') && (isAidant || isAdminOrCoordinator);
  const canAccept = order.status === 'creee' && isAdminOrCoordinator;
  
  // ✅ RAPPROCHEMENT PAR TOKENS UTILISATEURS POUR DEBLOQUER LA LIVRAISON DE L'INTERVENANT ACTIF
  const isMyActiveDelivery = isAidant && order.status === 'en_cours' && (order.taken_by === user?.id);

  const canDeliver = order.status === 'en_cours' && (isAidant || isAdminOrCoordinator);
  const canCancel = (order.status === 'creee' || order.status === 'en_attente' || order.status === 'en_cours') && isAdminOrCoordinator;
  const isUrgent = order.status === 'disponible' || order.status === 'en_attente';

  // Sécurité cash : En attente d'approbation espèces par la famille
  const isPendingCashConfirmation = order.status === 'livree' && order.delivery_payment_method === 'cash' && order.cash_confirmation_status === 'pending';

  return (
    <div className="space-y-5 pb-10">
      {/* HEADER */}
      <div className="bg-white rounded-[1.75rem] p-5 shadow-sm border" style={{ borderColor: colors.primary + '15' }}>
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl border flex items-center justify-center hover:bg-gray-50"><ArrowLeft size={18} /></button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge status={order.status} colors={colors} />
              {isUrgent && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                  <AlertCircle size={14} />
                  Urgent
                </span>
              )}
              {isPonctual && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                  <ShoppingBag size={14} />
                  Ponctuelle
                </span>
              )}
              {/* ✅ SÉCURISÉ : N'afficher "Provision payée" que s'il s'agit d'un achat réel pour éviter la confusion sur les courses de livraison simples ! */}
              {isPaid && order.purchase_amount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                  <CheckCircle size={14} />
                  Provision Payée
                </span>
              )}
              {isPendingPayment && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                  <CreditCard size={14} />
                  En attente paiement
                </span>
              )}
            </div>

            <h1
              className="text-xl md:text-2xl font-black leading-tight break-words mt-1"
              style={{ color: colors.text }}
            >
              {order.target_name}
            </h1>

            <p className="text-sm mt-1 flex items-center gap-2" style={{ color: colors.textLight }}>
              <span>#{order.id.slice(0, 8)}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDateTime(order.created_at)}
              </span>
            </p>
          </div>
        </div>

        {/* ACTIONS STATUTS */}
        <div className="mt-4 flex flex-wrap gap-2">
          {canTake && (
            <button 
              onClick={handleTakeOrder} 
              disabled={isUpdating} 
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <CheckCircle size={14} /> Accepter la livraison
            </button>
          )}

          {canAccept && (
            <button
              onClick={() => handleStatusChange('en_cours')}
              disabled={isUpdating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold transition hover:opacity-80 disabled:opacity-50 text-center bg-emerald-500"
            >
              {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Play size={17} />}
              <span>Accepter</span>
            </button>
          )}

          {isMyActiveDelivery && (
            <button 
              onClick={() => setShowProofModal(true)} 
              disabled={isUpdating} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Truck size={14} /> Déclarer le dépôt & Finaliser
            </button>
          )}

          {canCancel && (
            <button
              onClick={() => handleStatusChange('annulee')}
              disabled={isUpdating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold transition hover:opacity-80 disabled:opacity-50 text-center bg-red-500"
            >
              {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={17} />}
              <span>Annuler</span>
            </button>
          )}

          {order.status === 'validee' && (
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-green-600 font-bold text-sm bg-green-50 border-green-200">
              <CheckCircle size={17} />
              Validée automatiquement
            </span>
          )}
        </div>
      </div>

      {/* ✅ BLOC SÉCURITÉ CASH (ÉCRAN CLIENT SÉCURISÉ) */}
      {isPendingCashConfirmation && isFamily && ( 
        <div className="p-5 rounded-3xl bg-amber-50/50 border border-amber-200 space-y-4 animate-fadeIn">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-sm font-black text-amber-800">💵 Validation de la remise en main propre (Espèces)</p>
              <p className="text-xs text-amber-700 leading-relaxed mt-1">
                L'intervenant déclare avoir reçu la somme de <strong>{order.cash_amount_received} FCFA</strong> en mains propres pour clore la livraison. 
                Veuillez confirmer si cette information est exacte.
              </p>
              <p className="text-[10px] text-amber-600 italic mt-1.5">
                * Sans réponse de votre part sous 48h, cette livraison sera validée automatiquement.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleConfirmCash(true)}
              className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle size={14} /> Oui, je confirme
            </button>
            <button
              onClick={() => handleConfirmCash(false)}
              className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <XCircle size={14} /> Non, je conteste
            </button>
          </div>
        </div>
      )}

      {/* ✅ FRAIS DE PORT EN ATTENTE - MODALITÉ EN LIGNE (ÉCRAN CLIENT) */}
      {order.status === 'livree' && order.delivery_payment_method === 'online' && isFamily && ( 
        <div className="p-5 rounded-3xl bg-purple-50 border border-purple-200 space-y-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <CreditCard size={18} className="text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-purple-700">💳 Règlement des frais de transport requis</p>
              <p className="text-xs text-purple-600 leading-normal mt-0.5">
                Votre colis a été livré par notre intervenant. Veuillez régler les frais de transport de{' '}
                <strong>{order.delivery_fee} FCFA</strong> en ligne afin de clore définitivement le ticket.
              </p>
            </div>
          </div>
          <button
            onClick={handlePayDeliveryOnline}
            className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition"
          >
            Régler les frais de livraison en ligne ({order.delivery_fee} FCFA)
          </button>
        </div>
      )}

      {/* WIDGET DE NAVIGATION DE LIVRAISON */}
      {order.status === 'en_cours' && (
        <div className="bg-white rounded-3xl p-5 border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ borderColor: '#F59E0B30' }}>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Livraison active
            </span>
            <h3 className="text-base font-black text-gray-800 mt-1">Adresse de livraison</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              📍 {order.address || 'Adresse non précisée'}
            </p>
            {order.patient?.phone && (
              <p className="text-[11px] text-gray-400 mt-0.5 font-medium">
                (Téléphone : {order.patient.phone})
              </p>
            )}
          </div>

          <button
            onClick={() => {
              const query = order.latitude && order.longitude
                ? `${order.latitude},${order.longitude}`
                : encodeURIComponent(order.address || '');
              window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
            }}
            className="w-full sm:w-auto h-11 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0"
          >
            <NavIcon size={14} />
            Lancer Google Maps GPS
          </button>
        </div>
      )}

      {/* ✅ DESCRIPTION VISIBLE DÉDIÉE SANS TRONCATURE */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-2">
        <span className="text-[10px] text-gray-400 font-bold uppercase block">📝 Description détaillée du besoin</span>
        <p className="text-xs sm:text-sm font-semibold text-gray-800 leading-relaxed whitespace-pre-wrap">{order.description || "Aucun détail complémentaire."}</p>
      </div>

      {/* RÉSUMÉ - ✅ FILTRÉ À 3 COLONNES DÉSORMAIS (CARTE TYPE ÉLIMINÉE !) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* ✅ Affiche désormais estimated_amount si payé d'avance, ou purchase_amount + MM */}
        <MiniCard
          icon={<Banknote size={20} />}
          label="Provision Totale Payée"
          value={formatCurrency(order.estimated_amount || 0)}
          color={colors.primary}
        />
        <MiniCard
          icon={<MapPin size={20} />}
          label="Adresse de livraison"
          value={order.address || 'Non précisée'}
          color={colors.gold || '#c9a84c'}
        />
        <MiniCard
          icon={<Clock size={20} />}
          label="Statut actuel"
          value={getStatusLabel(order.status)}
          color={getStatusColor(order.status)}
        />
      </div>

      {/* CARTE FINANCIERE DÉTAILLÉE */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-3 bg-gray-50 rounded-2xl">
          <span className="text-[10px] text-gray-400 font-bold block">🛒 Provision Articles</span>
          <span className="text-sm font-extrabold text-gray-750">{order.purchase_amount > 0 ? `${order.purchase_amount.toLocaleString()} FCFA` : 'Aucun achat'}</span>
        </div>
        <div className="p-3 bg-gray-50 rounded-2xl">
          <span className="text-[10px] text-gray-400 font-bold block">💵 Frais de retrait MM</span>
          <span className="text-sm font-extrabold text-gray-750">{order.withdrawal_fee > 0 ? `${order.withdrawal_fee.toLocaleString()} FCFA (${order.withdrawal_operator?.toUpperCase()})` : '0 FCFA'}</span>
        </div>
        <div className="p-3 bg-gray-50 rounded-2xl">
          <span className="text-[10px] text-gray-400 font-bold block">🚚 Frais de livraison (Transport)</span>
          <span className="text-sm font-extrabold text-emerald-600">
            {/* ✅ CORRIGÉ : Ajustement dynamique de l'affichage du transport selon l'abonnement et l'état de facturation à l'arrivée ! */}
            {order.subscription_id 
              ? 'Gratuit (Abonnement)' 
              : (order.delivery_fee > 0 
                  ? `${order.delivery_fee.toLocaleString()} FCFA (${order.delivery_payment_method === 'cash' ? 'Espèces' : 'En ligne'})` 
                  : 'À payer à la livraison')}
          </span>
        </div>
      </div>

      {/* PERSONNES */}
      <div className="bg-white rounded-[1.75rem] p-5 shadow-sm border" style={{ borderColor: colors.primary + '15' }}>
        <h2 className="font-black mb-4 flex items-center gap-2" style={{ color: colors.text }}>
          <Users size={18} style={{ color: colors.primary }} />
          Personnes concernées
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PersonBox
            icon={<User size={18} />}
            title={beneficiaryLabel}
            name={
              order.patient
                ? `${order.patient.first_name} ${order.patient.last_name}`
                : order.target_name || 'Non spécifié'
            }
            detail={order.patient?.phone || 'Aucun téléphone'}
            detailIcon={<Phone size={12} />}
          />

          <PersonBox
            icon={<Users size={18} />}
            title="Famille"
            name={order.family?.full_name || 'Non spécifiée'}
            detail={order.family?.email || 'Aucun email'}
            detailIcon={<Mail size={12} />}
          />

          <PersonBox
            icon={<User size={18} />}
            title="Aidant"
            name={order.aidant?.user?.full_name || 'Non assigné'}
            detail={
              order.aidant
                ? `${order.aidant.rating || 0} • ${order.aidant.total_missions || 0} missions`
                : 'En attente'
            }
            detailIcon={order.aidant ? <Star size={12} /> : undefined}
          />
        </div>
      </div>

    

      {/* DOCUMENTS */}
      {(order.prescription_url || order.proof_url) && (
        <div className="bg-white rounded-[1.75rem] p-5 shadow-sm border" style={{ borderColor: colors.primary + '15' }}>
          <h2 className="font-black mb-4 flex items-center gap-2" style={{ color: colors.text }}>
            <FileText size={18} style={{ color: colors.primary }} />
            Documents
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {order.prescription_url && (
              <DocButton
                icon={<ImageIcon size={19} />}
                title="Ordonnance"
                color={colors.primary}
                onClick={() => openUrl(order.prescription_url)}
              />
            )}

            {order.proof_url && (
              <DocButton
                icon={<CheckCircle size={19} />}
                title="Preuve de livraison"
                color="#4CAF50"
                onClick={() => openUrl(order.proof_url)}
              />
            )}
          </div>
        </div>
      )}

      {/* SUIVI */}
      <div className="bg-white rounded-[1.75rem] p-5 shadow-sm border" style={{ borderColor: colors.primary + '15' }}>
        <h2 className="font-black mb-4 flex items-center gap-2" style={{ color: colors.text }}>
          <Clock size={18} style={{ color: colors.primary }} />
          Suivi de la commande
        </h2>

        {order.status === 'annulee' ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
            <XCircle size={24} style={{ color: '#EF4444' }} />
            <div>
              <p className="font-bold text-red-600">Commande annulée</p>
              <p className="text-sm text-red-500">Cette commande a été annulée.</p>
            </div>
          </div>
        ) : order.status === 'disponible' ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
            <AlertCircle size={24} style={{ color: '#EF4444' }} />
            <div>
              <p className="font-bold text-red-600">🚨 Commande urgente</p>
              <p className="text-sm text-red-500">Cette commande est disponible pour tous les aidants. Premier arrivé, premier servi !</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {['creee', 'en_cours', 'livree', 'validee'].map((status, index) => {
                const statusIndex = ['creee', 'en_cours', 'livree', 'validee'].indexOf(status);
                const currentIndex = ['creee', 'en_cours', 'livree', 'validee'].indexOf(order.status);
                const isDone = currentIndex >= statusIndex;
                const isCurrent = order.status === status;

                return (
                  <div key={status} className="flex items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isDone ? 'text-white' : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-2 ring-offset-2' : ''}`}
                      style={{ 
                        background: isDone ? colors.primary : '#e5e7eb',
                        ...(isCurrent && { '--tw-ring-color': colors.primary } as React.CSSProperties),
                      }}
                    >
                      {isDone ? <CheckCircle size={14} /> : index + 1}
                    </div>
                    {index < 3 && (
                      <div
                        className={`flex-1 h-1 mx-1 transition-all ${
                          isDone && currentIndex > statusIndex ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1 text-xs" style={{ color: colors.textLight }}>
              <span>Créée</span>
              <span>En cours</span>
              <span>Livrée</span>
              <span>Validée</span>
            </div>
          </>
        )}

        <p className="text-sm mt-4 flex items-center gap-1" style={{ color: colors.textLight }}>
          <Clock size={14} />
          Dernière mise à jour : {formatDateTime(order.updated_at)}
        </p>

        {order.status === 'en_attente' && (
          <div className="mt-3 p-3 rounded-xl bg-yellow-50 border border-yellow-200 flex items-start gap-2">
            <Clock size={18} style={{ color: '#F59E0B' }} className="mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-700">En attente de prise</p>
              <p className="text-xs text-yellow-600">L'aidant assigné a 30 minutes pour prendre la commande.</p>
            </div>
          </div>
        )}

        {order.status === 'livree' && (
          <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2">
            <Clock size={18} style={{ color: '#3B82F6' }} className="mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-700">Validation automatique</p>
              <p className="text-xs text-blue-600">Cette commande sera automatiquement validée dans 48h.</p>
            </div>
          </div>
        )}

        {/* ✅ CORRECTIF DE SÉCURITÉ DE RÔLE : Masquer les bannières d'instructions de paiement client sur la fiche de l'aidant/livreur ! */}
        {isPonctual && isPaid && order.purchase_amount > 0 && isFamily && (
          <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200 flex items-start gap-2">
            <CheckCircle size={18} style={{ color: '#4CAF50' }} className="mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-700">Paiement effectué</p>
              <p className="text-xs text-green-600">Commande ponctuelle - Paiement de provision validé.</p>
            </div>
          </div>
        )}

        {/* ✅ CORRECTIF DE SÉCURITÉ DE RÔLE : Masquer le rappel de paiement à la livraison sur l'écran du livreur ! */}
        {isPonctual && !order.subscription_id && order.purchase_amount === 0 && order.status !== 'validee' && isFamily && (
          <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2 animate-fadeIn">
            <Info size={18} style={{ color: colors.primary }} className="mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-700">Prestation payable à la livraison</p>
              <p className="text-xs text-blue-600">
                Paiement de transport à l'arrivée. L'intervenant saisira les frais de livraison lors du dépôt, et vous réglerez directement en ligne ou en espèces.
              </p>
            </div>
          </div>
        )}

        {isPendingPayment && (
          <div className="mt-3 p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-start gap-2">
            <CreditCard size={18} style={{ color: '#8B5CF6' }} className="mt-0.5" />
            <div>
              <p className="text-sm font-medium text-purple-700">Paiement requis</p>
              <p className="text-xs text-purple-600">Effectuez le paiement pour finaliser votre commande.</p>
            </div>
          </div>
        )}
      </div>

      {/* MODAL PREUVE LIVRAISON */}
      {showProofModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowProofModal(false);
          }}
        >
          <div 
            className="bg-white rounded-[2rem] w-full max-w-md p-5 shadow-2xl my-8 space-y-4"
            ref={modalRef} 
          >
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <h2 className="text-base sm:text-lg font-black" style={{ color: colors.text }}>
                Confirmer la livraison
              </h2>
              <button
                onClick={() => setShowProofModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition"
              >
                <XCircle size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Ajoutez une photo comme preuve de livraison.
            </p>

            <div className="relative min-h-[140px] border-2 border-dashed rounded-[1.5rem] p-4 flex items-center justify-center bg-gray-50 overflow-hidden" style={{ borderColor: colors.primary + '30' }}>
              {proofPreview ? (
                <>
                  <img
                    src={proofPreview}
                    alt="Preuve"
                    className="max-h-[280px] w-full object-cover rounded-2xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProofFile(null);
                      setProofPreview(null);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition"
                  >
                    <XCircle size={18} />
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: colors.primary + '10' }}>
                      <Camera size={24} style={{ color: colors.primary }} />
                    </div>
                    <p className="font-semibold text-xs" style={{ color: colors.text }}>
                      Sélectionner une photo
                    </p>
                    <p className="text-[10px] mt-0.5 text-gray-400">
                      PNG, JPG, JPEG — Max 5MB
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </>
              )}
            </div>

            {/* Saisie des frais de transport et du mode de règlement s'il n'y a pas d'abonnement */}
            {!order.subscription_id && (
              <div className="space-y-3 pt-3 border-t">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Frais de livraison réels (FCFA)</label>
                  <input
                    type="number"
                    value={deliveryFeeInput || ''}
                    onChange={(e) => setDeliveryFeeInput(Number(e.target.value))}
                    className="w-full h-10 px-3.5 border rounded-xl text-xs font-bold bg-white mt-1 outline-none"
                    placeholder="Ex: 1500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Règlement client</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setPaymentMethod('online')} className={cn("p-2 rounded-xl text-[10px] font-black uppercase border", paymentMethod === 'online' ? 'border-emerald-500 bg-emerald-50/10 text-emerald-950' : 'bg-white')}>💳 En ligne (Momo)</button>
                    <button type="button" onClick={() => setPaymentMethod('cash')} className={cn("p-2 rounded-xl text-[10px] font-black uppercase border", paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50/10 text-emerald-950' : 'bg-white')}>💵 En Espèces (Main)</button>
                  </div>
                </div>

                {paymentMethod === 'cash' && (
                  <div className="animate-fadeIn">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Montant exact reçu (FCFA)</label>
                    <input
                      type="number"
                      value={cashReceivedInput || ''}
                      onChange={(e) => setCashReceivedInput(Number(e.target.value))}
                      className="w-full h-10 px-3.5 border rounded-xl text-xs font-bold bg-white mt-1 outline-none"
                      placeholder="Ex: 1500"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                onClick={() => setShowProofModal(false)}
                className="py-2.5 rounded-2xl font-semibold border hover:bg-gray-50 transition text-xs"
                style={{
                  borderColor: colors.primary + '20',
                  color: colors.text,
                }}
              >
                Annuler
              </button>

              <button
                onClick={handleCompleteDelivery}
                disabled={isUpdating}
                className="py-2.5 rounded-2xl text-white font-bold transition hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                style={{ background: colors.primary }}
              >
                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {isUpdating ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;
