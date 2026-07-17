// 📁 src/features/orders/pages/CreateOrderPage.tsx
// ✅ PAGE CRÉATION COMMANDE : FORMULAIRE ÉPURÉ AVEC CALCUL DE PROVISION EN LOCAL (BÉNIN) SANS ERREURS TS

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingBag,
  MapPin,
  Camera,
  X,
  ArrowRight,
  CheckCircle,
  Loader2,
  Sparkles
} from 'lucide-react';

import { useOrderStore } from '@/stores/orderStore';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { usePonctualPayment } from '@/hooks/usePonctualPayment';
import { supabase } from '@/lib/supabase';
import { PonctualPaymentModal } from '@/components/common/PonctualPaymentModal';
import { cn } from '@/utils/helpers'; 
import toast from 'react-hot-toast';

// ✅ ALGORITHME DE CALCUL DES FRAIS DE RETRAIT LOCAL (BÉNIN) SÉCURISÉ ET AUTONOME
const calculateWithdrawalFee = (amount: number, operator: 'mtn_moov' | 'celtiis'): number => {
  if (amount <= 0) return 0;
  const amt = Math.round(amount);

  if (operator === 'celtiis') {
    if (amt <= 500) return 50;
    if (amt <= 5000) return 120;
    if (amt <= 10000) return 200;
    if (amt <= 20000) return 300;
    if (amt <= 50000) return 600;
    if (amt <= 75000) return 900;
    if (amt <= 100000) return 1000;
    if (amt <= 200000) return 2000;
    if (amt <= 300000) return 3000;
    if (amt <= 500000) return 3500;
    if (amt <= 750000) return 5000;
    if (amt <= 1000000) return 5800;
    if (amt <= 1500000) return 7800;
    return 9800;
  } else {
    // MTN & Moov
    if (amt <= 500) return 50;
    if (amt <= 5000) return 125;
    if (amt <= 10000) return 225;
    if (amt <= 20000) return 375;
    if (amt <= 50000) return 700;
    if (amt <= 100000) return 1000;
    if (amt <= 200000) return 2000;
    if (amt <= 300000) return 3000;
    if (amt <= 500000) return 3500;
    if (amt <= 750000) return 5000;
    if (amt <= 1000000) return 6000;
    if (amt <= 1500000) return 8000;
    return 9900;
  }
};

const CreateOrderPage = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;
  const { createOrder, isLoading } = useOrderStore();
  const { patients, fetchPatients } = usePatientStore();

  const { getCategoryLabel, isFamily, isAidant, isAdminOrCoordinator } = useTerminology();
  
  // ✅ CORRIGÉ : subLoading a été retiré de la déstructuration car il n'existe pas dans le hook
  const { hasActiveSubscription, remainingOrders } = useSubscriptionGuard();

  const {
    isPaymentModalOpen,
    pendingPaymentData,
    payOrderPonctual,
    handlePaymentSuccess,
    handlePaymentCancel,
    isLoading: isPaymentLoading,
  } = usePonctualPayment({
    onSuccess: () => {
      isRedirecting.current = true;
      sessionStorage.removeItem('create_order_form');
      navigate('/app/orders');
      toast.success('Commande créée avec sa provision !');
    },
    redirectPath: '/app/orders',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRedirecting = useRef(false);
  const isSubmittingRef = useRef(false);

  const [targetType, setTargetType] = useState<'personal' | 'patient'>('personal');
  const [targetPatientId, setTargetPatientId] = useState<string>('');

  // Nouveaux états de provision
  const [needsPurchase, setNeedsPurchase] = useState<boolean>(false);
  const [purchaseAmount, setPurchaseAmount] = useState<number>(0);
  const [operator, setOperator] = useState<'mtn_moov' | 'celtiis'>('mtn_moov');

  const [formData, setFormData] = useState({
    patient_id: '',
    type: 'autre', // ✅ Type par défaut unifié sur 'autre' pour la compatibilité base de données
    description: '',
    address: '',
    latitude: null as number | null,
    longitude: null as number | null,
    estimated_amount: '',
  });

  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionPreview, setPrescriptionPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const canUseSubscription = (): boolean => {
    return hasActiveSubscription && remainingOrders > 0;
  };

  const [aidantQuota, setAidantQuota] = useState<{
    current: number;
    max: number;
    available: number;
    canTake: boolean;
  } | null>(null);

  useEffect(() => {
    if (isAidant && user) {
      fetchAidantQuota();
    }
  }, [isAidant, user]);

  const fetchAidantQuota = async () => {
    try {
      const result = await useOrderStore.getState().checkOrderQuota();
      setAidantQuota(result);
    } catch (error) {
      console.error('❌ fetchAidantQuota error:', error);
    }
  };

  const withdrawalFee = useMemo(() => {
    if (!needsPurchase || purchaseAmount <= 0) return 0;
    return calculateWithdrawalFee(purchaseAmount, operator);
  }, [needsPurchase, purchaseAmount, operator]);

  const totalAdvanceAmount = purchaseAmount + withdrawalFee;

  const subscriptionInfo = (() => {
    if (isAidant || isAdminOrCoordinator) return null;
    
    if (canUseSubscription()) {
      return {
        type: 'success',
        icon: <CheckCircle size={18} />,
        title: `✅ ${remainingOrders} commande${remainingOrders > 1 ? 's' : ''} disponible${remainingOrders > 1 ? 's' : ''}`,
        description: 'Votre abonnement couvre les frais de livraison de cette course.',
      };
    }
    
    return {
      type: 'info',
      icon: <Sparkles size={18} />,
      title: '💡 Mode ponctuel',
      description: 'Prestation à la carte. Les frais de transport seront payables à la livraison.',
    };
  })();

  const canTakeOrder = (): boolean => {
    if (!isAidant) return true;
    if (!aidantQuota) return true;
    return aidantQuota.canTake;
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (targetType === 'patient' && targetPatientId) {
      const selectedPatient = patients.find(p => p.id === targetPatientId);
      if (selectedPatient) {
        const phoneSuffix = selectedPatient.phone ? ` (Tél: ${selectedPatient.phone})` : '';
        setFormData(prev => ({
          ...prev,
          address: `${selectedPatient.address || ''}${phoneSuffix}`,
        }));
      }
    } else {
      const currentPhone = profile?.phone;
      const phoneSuffix = currentPhone ? ` (Tél: ${currentPhone})` : '';
      setFormData(prev => ({
        ...prev,
        address: phoneSuffix ? `Mon adresse ${phoneSuffix}`.trim() : '',
      }));
    }
  }, [targetPatientId, targetType, patients, profile]);

  const handleAddressChange = (value: string) => {
    setFormData(prev => ({ ...prev, address: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPrescriptionFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setPrescriptionPreview(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removePrescription = () => {
    setPrescriptionFile(null);
    setPrescriptionPreview(null);
  };

  const validateOrderData = (): boolean => {
    if (!formData.description.trim()) {
      toast.error('Veuillez ajouter une description de votre besoin');
      return false;
    }
    if (!formData.address.trim()) {
      toast.error('Veuillez ajouter une adresse de livraison');
      return false;
    }
    return true;
  };

  const prepareOrderData = async () => {
    if (!validateOrderData()) return null;

    let prescriptionUrl = null;

    if (prescriptionFile) {
      const fileExt = prescriptionFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `prescriptions/${fileName}`;

      const { error } = await supabase.storage
        .from('orders')
        .upload(filePath, prescriptionFile);

      if (error) {
        toast.error("Erreur lors de l'upload de la prescription");
        return null;
      }

      const { data: { publicUrl } } = supabase.storage.from('orders').getPublicUrl(filePath);
      prescriptionUrl = publicUrl;
    }

    const selectedPatientObj = patients.find((p) => p.id === targetPatientId);
    const finalTargetType = targetType;
    const finalTargetName = targetType === 'personal' 
      ? profile?.full_name || 'Personnel'
      : selectedPatientObj ? `${selectedPatientObj.first_name} ${selectedPatientObj.last_name}` : 'Patient';

    return {
      patient_id: targetType === 'patient' ? targetPatientId : null,
      type: formData.type as any,
      description: formData.description.trim(),
      address: formData.address.trim(),
      latitude: null,  
      longitude: null, 
      purchase_amount: needsPurchase ? purchaseAmount : 0,
      withdrawal_operator: needsPurchase ? operator : null,
      prescription_url: prescriptionUrl,
      target_type: finalTargetType,
      target_name: finalTargetName,
    };
  };

  const handlePonctualPayment = async () => {
    const orderData = await prepareOrderData();
    if (!orderData) {
      isSubmittingRef.current = false;
      return;
    }

    try {
      // ✅ SÉCURITÉ TRANSMISSION PROVISION : Passage des paramètres requis pour le Webhook
      await payOrderPonctual({
        description: orderData.description,
        orderType: orderData.type,
        items: [],
        address: orderData.address,
        prescriptionUrl: orderData.prescription_url || undefined,
        targetType: orderData.target_type as 'personal' | 'patient',
        targetName: orderData.target_name,
        patientId: orderData.patient_id,
        purchase_amount: orderData.purchase_amount,
        withdrawal_operator: orderData.withdrawal_operator || undefined,
        withdrawal_fee: withdrawalFee,
      });
    } catch {
      isSubmittingRef.current = false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingRef.current) return;

    if (isAidant && !canTakeOrder()) {
      toast.error(`Vous avez déjà ${aidantQuota?.current || 0} commande(s) en cours`);
      return;
    }

    // S'il y a achat physique d'avance, rediriger d'office vers FedaPay (indépendant du forfait)
    if (needsPurchase) {
      isSubmittingRef.current = true;
      await handlePonctualPayment();
      isSubmittingRef.current = false;
      return;
    }

    // Simple course de récupération
    isSubmittingRef.current = true;
    await createOrderWithSubscription();
  };

  const createOrderWithSubscription = async () => {
    const orderData = await prepareOrderData();
    if (!orderData) {
      isSubmittingRef.current = false;
      return;
    }

    setIsUploading(true);
    try {
      const isSubUsed = canUseSubscription();
      const result = await createOrder({
        ...orderData,
        order_type: isSubUsed ? 'subscription' : 'ponctual',
        is_paid: true, // Pas de provision attendue
      });

      toast.success('Commande créée avec succès !');
      sessionStorage.removeItem('create_order_form');
      isRedirecting.current = true;

      if (result?.id) {
        navigate(`/app/orders/${result.id}`);
      } else {
        navigate('/app/orders');
      }
    } catch {
      toast.error('Erreur lors de la création de la commande');
      isSubmittingRef.current = false;
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading_ = isLoading || isUploading || isPaymentLoading; // ✅ subLoading retiré
  const hasPatients = patients.length > 0;

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <section className="bg-white rounded-[1.75rem] p-4 sm:p-5 md:p-6 shadow-sm border" style={{ borderColor: colors.primary + '15' }}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/app/orders')}
              className="w-11 h-11 rounded-2xl flex items-center justify-center border hover:bg-gray-50 transition shrink-0"
              style={{ borderColor: colors.primary + '20', color: colors.text }}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black leading-tight" style={{ color: colors.text }}>
                Créer une commande ou course
              </h1>
              <p className="text-xs text-gray-500 mt-1">Saisissez les informations de livraison et de provision d'achats.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BANDEAU FORFAIT */}
      {isFamily && subscriptionInfo && (
        <div className={`rounded-xl p-4 border flex items-start gap-3 ${subscriptionInfo.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="mt-0.5">{subscriptionInfo.icon}</div>
          <div>
            <p className="text-sm font-bold">{subscriptionInfo.title}</p>
            <p className="text-xs">{subscriptionInfo.description}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          
          {/* CIBLE */}
          {hasPatients && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Pour qui ?</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => { setTargetType('personal'); setTargetPatientId(''); }} className={cn("p-4 rounded-2xl border text-center transition font-bold text-xs", targetType === 'personal' ? 'border-emerald-500 bg-emerald-50/10 text-emerald-950 shadow-sm' : 'bg-white')}>👤 Pour moi</button>
                <button type="button" onClick={() => { setTargetType('patient'); if (patients.length > 0) setTargetPatientId(patients[0].id); }} className={cn("p-4 rounded-2xl border text-center transition font-bold text-xs", targetType === 'patient' ? 'border-emerald-500 bg-emerald-50/10 text-emerald-950 shadow-sm' : 'bg-white')}>👥 Pour un proche</button>
              </div>
              {targetType === 'patient' && patients.length > 0 && (
                <div className="mt-2">
                  <select value={targetPatientId} onChange={(e) => setTargetPatientId(e.target.value)} className="w-full px-3.5 h-11 border rounded-xl text-xs font-semibold outline-none bg-white">
                    {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* SÉLECTION ACHAT VS SIMPLE RÉCUPÉRATION */}
          <div className="space-y-2 pt-4 border-t">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Type d'opération</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setNeedsPurchase(false)} className={cn("p-4 rounded-2xl border text-center transition font-bold text-xs", !needsPurchase ? 'border-emerald-500 bg-emerald-50/10 text-emerald-950 shadow-sm' : 'bg-white')}>📦 Course de récupération (Simple)</button>
              <button type="button" onClick={() => setNeedsPurchase(true)} className={cn("p-4 rounded-2xl border text-center transition font-bold text-xs", needsPurchase ? 'border-emerald-500 bg-emerald-50/10 text-emerald-950 shadow-sm' : 'bg-white')}>🛒 Achat de marchandises (Courses / Pharmacie)</button>
            </div>
          </div>

          {/* CALCUL DE PROVISION SÉCURISÉ BÉNIN */}
          {needsPurchase && (
            <div className="p-4 rounded-2xl bg-gray-50 border space-y-4 animate-fadeIn">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">💰 Évaluation financière des achats</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500">Montant d'achat estimé (FCFA)</label>
                  <input
                    type="number"
                    value={purchaseAmount || ''}
                    onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                    className="w-full h-10 px-3.5 border rounded-xl text-xs font-bold bg-white mt-1.5 outline-none"
                    placeholder="Ex: 15000"
                    required={needsPurchase}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500">Réseau GSM pour le retrait</label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as any)}
                    className="w-full h-10 px-3 border rounded-xl text-xs font-bold bg-white mt-1.5 outline-none"
                  >
                    <option value="mtn_moov">MTN / Moov Bénin</option>
                    <option value="celtiis">Celtiis Cash Bénin</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between border-t pt-3.5 text-xs text-gray-600 font-semibold">
                <span>Frais de retrait Mobile Money :</span>
                <span className="text-gray-900">{withdrawalFee.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 font-semibold">
                <span>Total de la provision exigée d'avance :</span>
                <span className="text-emerald-600 font-extrabold">{totalAdvanceAmount.toLocaleString()} FCFA</span>
              </div>
            </div>
          )}

          {/* DESCRIPTION */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Description du besoin</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Précisez les détails de l'achat ou de la course..." className="w-full px-3.5 py-2.5 border rounded-2xl text-xs sm:text-sm font-semibold outline-none resize-none bg-gray-50/50" required />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Adresse de livraison</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
                <input type="text" value={formData.address} onChange={(e) => handleAddressChange(e.target.value)} placeholder="Quartier, indications de rue..." className="w-full pl-9 pr-3.5 h-11 border rounded-2xl text-xs font-semibold outline-none bg-gray-50/50" required />
              </div>
            </div>
          </div>

          {/* PHOTO */}
          <div className="pt-4 border-t">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Photo d'ordonnance ou de l'objet</label>
            {!prescriptionPreview ? (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full min-h-[120px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition">
                <Camera size={20} className="text-gray-400 mb-1" />
                <span className="text-[10px] font-bold text-gray-400">Ajouter une photo (Max 5MB)</span>
              </button>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border">
                <img src={prescriptionPreview} alt="Aperçu" className="max-h-52 w-full object-cover" />
                <button type="button" onClick={removePrescription} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full"><X size={14} /></button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>
        </div>

        {/* SUMMARY COL */}
        <aside className="xl:sticky xl:top-24 h-fit">
          <div className="bg-white rounded-3xl p-5 border shadow-sm space-y-4">
            <h2 className="text-base font-black">Résumé</h2>
            <SummaryLine label="Opération" value={needsPurchase ? '🛒 Achat' : '📦 Récupération'} />
            <SummaryLine label="Facturation" value={needsPurchase ? 'Provision d\'avance' : (canUseSubscription() ? 'Abonnement' : 'Ponctuel')} />
            
            <div className="rounded-2xl p-4 bg-gray-50 text-center">
              <span className="text-[10px] text-gray-400 block font-bold">Total provision d'avance</span>
              <span className="text-xl font-black mt-1 block" style={{ color: colors.primary }}>
                {needsPurchase ? `${totalAdvanceAmount.toLocaleString()} FCFA` : '0 FCFA'}
              </span>
            </div>

            <button type="submit" disabled={isLoading_} className="w-full h-11 text-white text-xs font-black rounded-2xl flex items-center justify-center gap-1" style={{ background: colors.primary }}>
              {isLoading_ ? <Loader2 size={16} className="animate-spin" /> : needsPurchase ? `Payer ${totalAdvanceAmount.toLocaleString()} FCFA` : 'Créer la commande'}
              <ArrowRight size={13} />
            </button>
          </div>
        </aside>
      </form>

      {/* FEDAPAY MODAL */}
      {isPaymentModalOpen && pendingPaymentData && (
        <PonctualPaymentModal isOpen={isPaymentModalOpen} onClose={handlePaymentCancel} onSuccess={handlePaymentSuccess} paymentData={pendingPaymentData} redirectPath="/app/orders" />
      )}
    </div>
  );
};

// =============================================
// SUB-COMPONENTS
// =============================================

const SummaryLine = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between border-b pb-2 text-xs">
    <span className="text-gray-400">{label}</span>
    <span className="font-bold">{value}</span>
  </div>
);

export default CreateOrderPage;
