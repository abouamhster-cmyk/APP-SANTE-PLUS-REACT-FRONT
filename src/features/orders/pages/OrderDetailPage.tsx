// 📁 frontend/src/features/orders/pages/OrderDetailPage.tsx
 
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
  Check,
} from 'lucide-react';

import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { formatCurrency, formatDateTime, cn } from '@/utils/helpers';
import { usePonctualPayment } from '@/hooks/usePonctualPayment';
import { PonctualPaymentModal } from '@/components/common/PonctualPaymentModal';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// =============================================
// COMPOSANTS INTERNES COMPACTS
// =============================================

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
      livree: { icon: <Truck size={14} />, color: '#3B82F6', bg: '#3B82F615', label: 'Livrée (En attente)' },
      validee: { icon: <CheckCircle size={14} />, color: '#4CAF50', bg: '#4CAF5015', label: 'Validée' },
      annulee: { icon: <XCircle size={14} />, color: '#EF4444', bg: '#EF444415', label: 'Annulée' },
      attente_paiement: { icon: <CreditCard size={14} />, color: '#8B5CF6', bg: '#8B5CF615', label: 'Provision en attente' },
    };
    return map[status] || map['creee'];
  };

  const config = getStatusConfig(status);

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
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

  const { profile, role, user } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;
  const { currentOrder, fetchOrderById, updateOrderStatus, takeOrder, completeDelivery, confirmCashPayment, isLoading } = useOrderStore();

  const { isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

  const [isUpdating, setIsUpdating] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  // Formulaire final livreur
  const [deliveryFeeInput, setDeliveryFeeInput] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');
  const [cashReceivedInput, setCashReceivedInput] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paiement en ligne exclusif des frais de transport
  const {
    isPaymentModalOpen,
    pendingPaymentData,
    payOrderPonctual,
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

  const handleTakeOrder = async () => {
    if (!id || isUpdating) return;
    setIsUpdating(true);
    let lat: number | null = null;
    let lng: number | null = null;

    try {
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      }
    } catch {
      console.warn("Pas de position");
    }

    try {
      await takeOrder(id, lat, lng);
      toast.success('Commande prise en charge !');
      fetchOrderById(id);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProofSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setProofPreview(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ✅ ENREGISTREMENT DE LA LIVRAISON AVEC DOUBLE MODALITE SÉCURISÉE
  const handleCompleteDelivery = async () => {
    if (!id || isUpdating) return;
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
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
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

      toast.success('Livraison validée avec succès !');
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
      await payOrderPonctual({
        description: `Frais de transport - Commande #${order.id.slice(0, 8)}`,
        orderType: 'delivery',
        items: [{ name: 'Prestation de livraison', quantity: 1, price: order.delivery_fee, total: order.delivery_fee }],
        address: order.address,
        targetType: order.target_type as any,
        targetName: order.target_name || 'Personnel',
        patientId: order.patient_id,
        orderId: order.id,
      });
    } catch {
      toast.error('Erreur lancement paiement');
    }
  };

  const isPendingAdvancePayment = order.status === 'attente_paiement';
  const isMyActiveDelivery = isAidant && order.status === 'en_cours' && order.current_aidant_id === aidantId;
  const isFamilyUser = profile?.role === 'family';

  // Sécurité cash : En attente d'approbation espèces par la famille
  const isPendingCashConfirmation = order.status === 'livree' && order.delivery_payment_method === 'cash' && order.cash_confirmation_status === 'pending';

  if (isLoading || !currentOrder) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="animate-spin" style={{ color: colors.primary }} />
      </div>
    );
  }

  const isPonctual = order.order_type === 'ponctual' || order.is_ponctual === true;
  const isPaid = order.is_paid === true;

  const canTake = (order.status === 'creee' || order.status === 'en_attente' || order.status === 'disponible') && (isAidant || isAdminOrCoordinator);
  const canAccept = order.status === 'creee' && isAdminOrCoordinator;
  const canDeliver = order.status === 'en_cours' && (isAidant || isAdminOrCoordinator);
  const canCancel = (order.status === 'creee' || order.status === 'en_attente' || order.status === 'en_cours') && isAdminOrCoordinator;
  const isUrgent = order.status === 'disponible' || order.status === 'en_attente';

  return (
    <div className="space-y-6 pb-12 px-2 sm:px-0">
      {/* HEADER CARD */}
      <div className="bg-white rounded-3xl p-5 border shadow-sm" style={{ borderColor: colors.primary + '15' }}>
        <div className="flex items-start gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-2xl border flex items-center justify-center hover:bg-gray-50"><ArrowLeft size={18} /></button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={order.status} colors={colors} />
              {isUrgent && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                  <AlertCircle size={14} /> Urgent
                </span>
              )}
              {isPonctual && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                  <ShoppingBag size={14} /> Ponctuelle
                </span>
              )}
              {isPaid && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                  <CheckCircle size={14} /> Provision Payée
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-black text-gray-800 mt-2 truncate">{order.description}</h1>
            <p className="text-xs text-gray-400 mt-0.5">#{order.id.slice(0, 8)} • Crée le {formatDateTime(order.created_at)}</p>
          </div>
        </div>

        {/* CONTROLES D'ACTION */}
        <div className="mt-4 flex flex-wrap gap-2">
          {canTake && (
            <button onClick={handleTakeOrder} disabled={isUpdating} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition">
              Accepter la livraison
            </button>
          )}

          {isMyActiveDelivery && (
            <button onClick={() => setShowProofModal(true)} disabled={isUpdating} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition">
              Déclarer le dépôt & Finaliser
            </button>
          )}

          {canCancel && (
            <button onClick={() => handleStatusChange('annulee')} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition">
              Annuler
            </button>
          )}
        </div>
      </div>

      {/* ✅ BLOC SÉCURITÉ CASH (ÉCRAN CLIENT SÉCURISÉ) */}
      {isPendingCashConfirmation && isFamilyUser && (
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
      {order.status === 'livree' && order.delivery_payment_method === 'online' && isFamilyUser && (
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

      {/* GÉOLOCALISATION */}
      {order.status === 'en_cours' && (
        <div className="bg-white rounded-3xl p-5 border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ borderColor: '#F59E0B30' }}>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Livraison active
            </span>
            <h3 className="text-base font-black text-gray-800 mt-1">Adresse de livraison</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">📍 {order.address}</p>
          </div>
          <button
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`, '_blank')}
            className="w-full sm:w-auto h-11 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0"
          >
            <NavIcon size={14} /> Lancer Google Maps GPS
          </button>
        </div>
      )}

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
          <span className="text-sm font-extrabold text-emerald-600">{order.delivery_fee > 0 ? `${order.delivery_fee.toLocaleString()} FCFA (${order.delivery_payment_method === 'cash' ? 'Espèces' : 'En ligne'})` : 'Gratuit (Abonnement)'}</span>
        </div>
      </div>

      {/* PERSONNES */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-gray-800">👥 Personnes concernées</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PersonBox icon={<User size={18} />} title={beneficiaryLabel} name={order.target_name || 'Bénéficiaire'} detail={order.patient?.phone || 'Aucun téléphone'} detailIcon={<Phone size={12} />} />
          <PersonBox icon={<Users size={18} />} title="Famille" name={order.family?.full_name || 'Non spécifiée'} detail={order.family?.email || 'Aucun email'} detailIcon={<Mail size={12} />} />
          <PersonBox icon={<User size={18} />} title="Aidant" name={order.aidant?.user?.full_name || 'Non assigné'} detail={order.aidant ? `${order.aidant.rating || 0} • ${order.aidant.total_missions || 0} missions` : 'En attente'} detailIcon={order.aidant ? <Star size={12} /> : undefined} />
        </div>
      </div>

      {/* PIECES JOINTES */}
      {(order.prescription_url || order.proof_url) && (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-gray-800">📂 Pièces Jointes</h3>
          <div className="grid grid-cols-2 gap-3 text-xs font-bold">
            {order.prescription_url && (
              <button onClick={() => window.open(order.prescription_url, '_blank')} className="p-3 bg-gray-50 rounded-xl text-left hover:bg-gray-100 border">🖼️ Voir l'Ordonnance</button>
            )}
            {order.proof_url && (
              <button onClick={() => window.open(order.proof_url, '_blank')} className="p-3 bg-gray-50 rounded-xl text-left hover:bg-gray-100 border">📸 Preuve de livraison</button>
            )}
          </div>
        </div>
      )}

      {/* MODAL FIN DE LIVRAISON SÉCURISÉ (ÉCRAN LIVREUR) */}
      {showProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) setShowProofModal(false); }}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-6 shadow-2xl my-8 space-y-5" ref={modalRef}>
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-sm sm:text-base font-black">🏁 Clôturer la livraison</h2>
              <button onClick={() => setShowProofModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><XCircle size={18} /></button>
            </div>

            <p className="text-xs text-gray-500">Ajoutez une preuve photo pour clore la livraison.</p>

            <div className="relative min-h-[140px] border-2 border-dashed rounded-2xl p-4 flex items-center justify-center bg-gray-50 overflow-hidden">
              {proofPreview ? (
                <>
                  <img src={proofPreview} alt="Preuve" className="max-h-40 w-full object-cover rounded-xl" />
                  <button onClick={() => { setProofFile(null); setProofPreview(null); }} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full"><XCircle size={16} /></button>
                </>
              ) : (
                <div className="text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Camera size={24} className="text-gray-400 mx-auto mb-1" />
                  <span className="text-[10px] font-bold text-gray-400">Preuve photo</span>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProofSelect} className="hidden" />
                </div>
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

            <div className="grid grid-cols-2 gap-2 pt-3 border-t">
              <button onClick={() => setShowProofModal(false)} className="h-11 rounded-xl font-bold text-gray-500 border">Annuler</button>
              <button onClick={handleCompleteDelivery} disabled={isUpdating} className="h-11 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5">
                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEDAPAY MODAL */}
      {isPaymentModalOpen && pendingPaymentData && (
        <PonctualPaymentModal isOpen={isPaymentModalOpen} onClose={handlePaymentCancel} onSuccess={handlePaymentSuccess} paymentData={pendingPaymentData} redirectPath={`/app/orders/${id}`} />
      )}
    </div>
  );
};

// =============================================
// HELPER COMPONENTS
// =============================================

const MiniCard = ({ icon, label, value, color }: any) => (
  <div className="bg-white rounded-2xl p-4 border flex flex-col justify-between h-24">
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider truncate mr-1">{label}</span>
      <div className="shrink-0" style={{ color }}>{icon}</div>
    </div>
    <span className="font-black text-xs sm:text-sm truncate mt-1" style={{ color }}>{value}</span>
  </div>
);

const PersonBox = ({ icon, title, name, detail, detailIcon }: any) => (
  <div className="p-3 bg-gray-50 rounded-xl text-xs flex flex-col justify-between">
    <div>
      <span className="text-[10px] text-gray-400 font-bold block flex items-center gap-1">
        {icon} {title}
      </span>
      <span className="font-extrabold text-gray-700 block mt-1">{name}</span>
    </div>
    {detail && (
      <span className="text-[10px] text-gray-400 block mt-1.5 flex items-center gap-1">
        {detailIcon} {detail}
      </span>
    )}
  </div>
);

const DocButton = ({ icon, title, color, onClick }: any) => (
  <button onClick={onClick} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl border text-left text-xs font-bold flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '15', color }}>
        {icon}
      </div>
      <span>{title}</span>
    </div>
  </button>
);

export default OrderDetailPage;
