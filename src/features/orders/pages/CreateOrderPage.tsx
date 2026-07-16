// 📁 frontend/src/features/orders/pages/CreateOrderPage.tsx
// ✅ CRÉATION DE COMMANDE SÉCURISÉE - MODE SIMPLIFIÉ (Sans liste d'articles)

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingBag,
  User,
  MapPin,
  Camera,
  X,
  ClipboardList,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Loader2,
  AlertCircle,
  Users,
  FileImage,
} from 'lucide-react';

import { useOrderStore } from '@/stores/orderStore';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { usePonctualPayment } from '@/hooks/usePonctualPayment';
import { getPonctualOrderPriceByType } from '@/lib/constants';

import { supabase } from '@/lib/supabase';
import { PonctualPaymentModal } from '@/components/common/PonctualPaymentModal';
import toast from 'react-hot-toast';

const CreateOrderPage = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;
  const { createOrder, isLoading } = useOrderStore();
  const { patients, fetchPatients } = usePatientStore();

  const { getCategoryLabel, isFamily, isAidant, isAdminOrCoordinator } = useTerminology();

  const {
    hasActiveSubscription,
    remainingOrders,
    getActionMessage,
    isLoading: subLoading,
  } = useSubscriptionGuard();

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
      toast.success('Commande créée après paiement !');
    },
    redirectPath: '/app/orders',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRedirecting = useRef(false);
  const isSubmittingRef = useRef(false);

  const [orderType, setOrderType] = useState<'subscription' | 'ponctual'>('subscription');
  const [targetType, setTargetType] = useState<'personal' | 'patient'>('personal');
  const [targetPatientId, setTargetPatientId] = useState<string>('');

  const [formData, setFormData] = useState({
    patient_id: '',
    type: 'courses', // Type par défaut
    description: '',
    address: '',
    estimated_amount: '',
  });

  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionPreview, setPrescriptionPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const canUseSubscription = (): boolean => hasActiveSubscription && remainingOrders > 0;

  const [aidantQuota, setAidantQuota] = useState<{ current: number; max: number; available: number; canTake: boolean; } | null>(null);

  useEffect(() => {
    fetchPatients();
    if (isAidant && user) fetchAidantQuota();
  }, [isAidant, user]);

  const fetchAidantQuota = async () => {
    try {
      const result = await useOrderStore.getState().checkOrderQuota();
      setAidantQuota(result);
    } catch (error) {
      console.error('❌ fetchAidantQuota error:', error);
    }
  };

  const subscriptionInfo = (() => {
    if (isAidant || isAdminOrCoordinator) return null;
    if (canUseSubscription()) {
      return { type: 'success', icon: <CheckCircle size={18} />, title: `✅ ${remainingOrders} commande${remainingOrders > 1 ? 's' : ''} disponible${remainingOrders > 1 ? 's' : ''}`, description: 'Utilisez votre abonnement.' };
    }
    if (hasActiveSubscription && remainingOrders === 0) {
      return { type: 'warning', icon: <AlertCircle size={18} />, title: '⚠️ Plus de commandes disponibles', description: 'Passez en mode ponctuel ou renouvelez votre abonnement.' };
    }
    return { type: 'info', icon: <Sparkles size={18} />, title: '💡 Mode ponctuel', description: 'Utilisez le mode ponctuel pour payer à l\'acte.' };
  })();

  const getPonctualPrice = (): number => getPonctualOrderPriceByType(formData.type);

  useEffect(() => {
    if (targetType === 'patient' && targetPatientId) {
      const selectedPatient = patients.find(p => p.id === targetPatientId);
      if (selectedPatient) {
        const phoneSuffix = selectedPatient.phone ? ` (Tél: ${selectedPatient.phone})` : '';
        setFormData(prev => ({ ...prev, address: `${selectedPatient.address || ''}${phoneSuffix}`.trim() }));
      }
    } else {
      const currentPhone = profile?.phone;
      const phoneSuffix = currentPhone ? ` (Tél: ${currentPhone})` : '';
      setFormData(prev => ({ ...prev, address: phoneSuffix ? `Mon adresse ${phoneSuffix}`.trim() : '' }));
    }
  }, [targetPatientId, targetType, patients, profile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("L'image ne doit pas dépasser 5MB"); return; }
    setPrescriptionFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setPrescriptionPreview(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removePrescription = () => {
    setPrescriptionFile(null);
    setPrescriptionPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateOrderData = (): boolean => {
    if (!formData.description || formData.description.trim() === '') {
      toast.error('Veuillez ajouter une description de votre besoin');
      return false;
    }
    if (!formData.address || formData.address.trim() === '') {
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
      const { error } = await supabase.storage.from('orders').upload(filePath, prescriptionFile);
      if (error) { toast.error("Erreur d'upload"); return null; }
      const { data: { publicUrl } } = supabase.storage.from('orders').getPublicUrl(filePath);
      prescriptionUrl = publicUrl;
    }

    const selectedPatientObj = patients.find((p) => p.id === targetPatientId);
    return {
      patient_id: targetType === 'patient' ? targetPatientId : null,
      type: formData.type as any,
      description: formData.description.trim(),
      address: formData.address.trim(),
      estimated_amount: formData.estimated_amount || null,
      items: [], // Vide par défaut
      prescription_url: prescriptionUrl,
      order_type: 'ponctual',
      category: 'ponctuelle',
      target_type: targetType,
      target_name: targetType === 'personal' ? profile?.full_name || 'Personnel' : selectedPatientObj ? `${selectedPatientObj.first_name} ${selectedPatientObj.last_name}` : 'Patient',
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (orderType === 'ponctual') {
      const data = await prepareOrderData();
      if (data) await payOrderPonctual(data);
      isSubmittingRef.current = false;
    } else {
      if (!canUseSubscription()) {
        const msg = getActionMessage('order');
        toast.error(msg.description);
        isSubmittingRef.current = false;
        return;
      }
      await createOrderWithSubscription();
    }
  };

  const createOrderWithSubscription = async () => {
    const data = await prepareOrderData();
    if (!data) { isSubmittingRef.current = false; return; }

    setIsUploading(true);
    try {
      await createOrder({ ...data, order_type: 'subscription', is_paid: true });
      toast.success('Commande créée avec succès !');
      navigate('/app/orders');
    } catch (e) {
      toast.error('Erreur lors de la création');
    } finally {
      setIsUploading(false);
      isSubmittingRef.current = false;
    }
  };

  const isLoading_ = isLoading || isUploading || isPaymentLoading || subLoading;
  const selectedPatientObj = patients.find((p) => p.id === targetPatientId || p.id === formData.patient_id);
  const hasPatients = patients.length > 0;

  return (
    <div className="space-y-6 pb-10">
      <section className="bg-white rounded-[1.75rem] p-4 sm:p-5 md:p-6 shadow-sm border" style={{ borderColor: colors.primary + '15' }}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/app/orders')} className="w-11 h-11 rounded-2xl flex items-center justify-center border hover:bg-gray-50 transition shrink-0" style={{ borderColor: colors.primary + '20', color: colors.text }}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2" style={{ background: colors.primary + '12', color: colors.primary }}><ShoppingBag size={13} /> Nouvelle commande</div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: colors.text }}>Créer une commande</h1>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:min-w-[200px]">
            <CompactHeaderStat label="Destinataire" value={targetType === 'personal' ? 'Personnel' : (selectedPatientObj ? `${selectedPatientObj.first_name}` : 'Patient')} color={colors.primary} />
            <CompactHeaderStat label="Photo" value={prescriptionFile ? 'Ajoutée' : 'Non'} color={colors.primary} />
          </div>
        </div>
      </section>

      {isFamily && subscriptionInfo && (
        <div className={`rounded-xl p-4 border flex items-start gap-3 ${subscriptionInfo.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className={subscriptionInfo.type === 'success' ? 'text-green-600' : 'text-blue-600'}>{subscriptionInfo.icon}</div>
          <div>
            <p className={`text-sm font-bold ${subscriptionInfo.type === 'success' ? 'text-green-700' : 'text-blue-700'}`}>{subscriptionInfo.title}</p>
            <p className="text-xs">{subscriptionInfo.description}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {hasPatients && (
            <section className="bg-white rounded-[2rem] p-5 md:p-6 shadow-sm border" style={{ borderColor: colors.primary + '15' }}>
              <h2 className="text-lg font-black mb-4">Pour qui ?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button type="button" onClick={() => { setTargetType('personal'); setTargetPatientId(''); }} className={`p-5 rounded-2xl border-2 text-left ${targetType === 'personal' ? 'border-[--color-primary] bg-[--color-primary]08' : 'border-gray-200'}`}>👤 Personnel</button>
                <button type="button" onClick={() => { setTargetType('patient'); if(patients.length > 0) setTargetPatientId(patients[0].id); }} className={`p-5 rounded-2xl border-2 text-left ${targetType === 'patient' ? 'border-[--color-primary] bg-[--color-primary]08' : 'border-gray-200'}`}>👨‍👩‍👦 Patient</button>
              </div>
            </section>
          )}

          <section className="bg-white rounded-[2rem] p-5 md:p-6 shadow-sm border" style={{ borderColor: colors.primary + '15' }}>
            <h2 className="text-lg font-black mb-4">Type de commande</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button type="button" onClick={() => setOrderType('subscription')} className={`p-5 rounded-2xl border-2 ${orderType === 'subscription' ? 'border-[--color-primary] bg-[--color-primary]08' : 'border-gray-200'}`}>Abonnement</button>
              <button type="button" onClick={() => setOrderType('ponctual')} className={`p-5 rounded-2xl border-2 ${orderType === 'ponctual' ? 'border-[--color-primary] bg-[--color-primary]08' : 'border-gray-200'}`}>Ponctuelle</button>
            </div>
          </section>

          <ModernPanel icon={<ClipboardList size={20} />} title="Informations" subtitle="Détaillez votre besoin" color={colors.primary}>
            <div className="space-y-4">
              <Field label="Description" required color={colors.text}>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 rounded-2xl border bg-gray-50 resize-none" rows={4} placeholder="Détaillez ce que vous attendez..." required />
              </Field>
              <Field label="Adresse" required color={colors.text}>
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-3 rounded-2xl border bg-gray-50" placeholder="Adresse complète" required />
              </Field>
            </div>
          </ModernPanel>

          <ModernPanel icon={<FileImage size={20} />} title="Ordonnance ou photo" subtitle="Chargez une image" color={colors.primary}>
            {!prescriptionPreview ? (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full min-h-[140px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center bg-gray-50">
                <Camera size={24} className="text-gray-400 mb-2" />
                <span className="text-xs font-bold">Ajouter une photo</span>
              </button>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border">
                <img src={prescriptionPreview} alt="Aperçu" className="max-h-60 w-full object-cover" />
                <button type="button" onClick={removePrescription} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full"><X size={16} /></button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </ModernPanel>
        </div>

        <aside className="xl:sticky xl:top-24 h-fit">
          <div className="bg-white rounded-[2rem] p-5 shadow-sm border space-y-4" style={{ borderColor: colors.primary + '15' }}>
            <h2 className="text-lg font-black">Résumé</h2>
            <div className="rounded-2xl p-4" style={{ background: colors.primary + '10' }}>
              <p className="text-2xl font-black" style={{ color: colors.primary }}>
                {orderType === 'subscription' ? `${remainingOrders} restantes` : `${getPonctualPrice().toLocaleString()} FCFA`}
              </p>
            </div>
            <button type="submit" disabled={isLoading_} className="w-full py-3 rounded-2xl text-white font-bold flex items-center justify-center gap-2" style={{ background: colors.primary }}>
              {isLoading_ ? <Loader2 className="animate-spin" /> : (orderType === 'ponctual' ? 'Payer' : 'Créer la commande')}
            </button>
          </div>
        </aside>
      </form>

      {isPaymentModalOpen && pendingPaymentData && (
        <PonctualPaymentModal isOpen={isPaymentModalOpen} onClose={handlePaymentCancel} onSuccess={handlePaymentSuccess} paymentData={pendingPaymentData} />
      )}
    </div>
  );
};

const ModernPanel = ({ icon, title, subtitle, color, children }: any) => (
  <section className="bg-white rounded-[2rem] p-5 md:p-6 shadow-sm border" style={{ borderColor: color + '15' }}>
    <div className="flex items-start gap-3 mb-5">
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: color + '14', color }}>{icon}</div>
      <div>
        <h2 className="text-lg font-black">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
    {children}
  </section>
);

const Field = ({ label, required, color, children }: any) => (
  <div>
    <label className="block text-sm font-semibold mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
    {children}
  </div>
);

const CompactHeaderStat = ({ label, value, color }: any) => (
  <div className="rounded-2xl bg-gray-50 border p-3 text-center">
    <p className="text-[10px] text-gray-500 uppercase">{label}</p>
    <p className="text-sm font-bold truncate">{value}</p>
  </div>
);

const SummaryLine = ({ label, value }: any) => (
  <div className="flex justify-between text-sm py-2">
    <span className="text-gray-500">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

export default CreateOrderPage;
