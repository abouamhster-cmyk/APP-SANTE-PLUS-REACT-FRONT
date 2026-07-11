// 📁 frontend/src/features/orders/pages/CreateOrderPage.tsx
// ✅ CRÉATION DE COMMANDE SÉCURISÉE AVEC VERROU ANTI DOUBLE-CLIC SYNCHRONE

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingBag,
  User,
  MapPin,
  Camera,
  X,
  Package, 
  Trash2,
  Plus,
  FileImage,
  ClipboardList,
  ArrowRight,
  CreditCard,
  Sparkles,
  CheckCircle,
  Loader2,
  AlertCircle,
  Users,
} from 'lucide-react';

import { useOrderStore } from '@/stores/orderStore';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { usePonctualPayment } from '@/hooks/usePonctualPayment';
import { getPonctualOrderPriceByType } from '@/lib/constants';

import { OrderItem } from '@/types';
import { supabase } from '@/lib/supabase';
import { PonctualPaymentModal } from '@/components/common/PonctualPaymentModal';
import toast from 'react-hot-toast';

const CreateOrderPage = () => {
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();
  const { createOrder, isLoading } = useOrderStore();
  const { patients, fetchPatients } = usePatientStore();

  const {
    singular,
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

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
  
  // ✅ VERROU DE SÉCURITÉ SYNCHRONE (Bloque instantanément les doubles clics)
  const isSubmittingRef = useRef(false);

  const [orderType, setOrderType] = useState<'subscription' | 'ponctual'>('subscription');
  const [targetType, setTargetType] = useState<'personal' | 'patient'>('personal');
  const [targetPatientId, setTargetPatientId] = useState<string>('');

  const [formData, setFormData] = useState({
    patient_id: '',
    type: 'medicaments',
    description: '',
    address: '',
    latitude: null as number | null,
    longitude: null as number | null,
    estimated_amount: '',
    items: [{ name: '', quantity: 1, price: 0, total: 0 }] as OrderItem[],
  });

  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionPreview, setPrescriptionPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

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

  const subscriptionInfo = (() => {
    if (isAidant || isAdminOrCoordinator) return null;
    
    if (canUseSubscription()) {
      return {
        type: 'success',
        icon: <CheckCircle size={18} />,
        title: `✅ ${remainingOrders} commande${remainingOrders > 1 ? 's' : ''} disponible${remainingOrders > 1 ? 's' : ''}`,
        description: 'Utilisez votre abonnement pour ne pas payer de frais supplémentaires.',
      };
    }
    
    if (hasActiveSubscription && remainingOrders === 0) {
      return {
        type: 'warning',
        icon: <AlertCircle size={18} />,
        title: '⚠️ Plus de commandes disponibles',
        description: 'Vous avez utilisé toutes vos commandes. Passez en mode ponctuel ou renouvelez votre abonnement.',
      };
    }
    
    return {
      type: 'info',
      icon: <Sparkles size={18} />,
      title: '💡 Mode ponctuel',
      description: 'Vous n\'avez pas d\'abonnement actif. Utilisez le mode ponctuel pour payer à l\'acte.',
    };
  })();

  const getPonctualPrice = (): number => {
    return getPonctualOrderPriceByType(formData.type, formData.items);
  };

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
          address: `${selectedPatient.address || ''}${phoneSuffix}`.trim(),
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

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRedirecting.current) return;
      if (formData.description.trim() || formData.items.some(item => item.name.trim())) {
        e.preventDefault();
        e.returnValue = 'Vous avez des données non sauvegardées. Voulez-vous vraiment quitter ?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData]);

  const handleAddressChange = (value: string) => {
    setFormData(prev => ({ ...prev, address: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setPrescriptionFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPrescriptionPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removePrescription = () => {
    setPrescriptionFile(null);
    setPrescriptionPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', quantity: 1, price: 0, total: 0 }],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    const updatedItem = {
      ...newItems[index],
      [field]: value,
    };
    if (field === 'price' || field === 'quantity') {
      updatedItem.total = updatedItem.quantity * updatedItem.price;
    }
    newItems[index] = updatedItem;
    setFormData({
      ...formData,
      items: newItems,
    });
  };

  const validateOrderData = (): boolean => {
    if (!formData.description || formData.description.trim() === '') {
      toast.error('Veuillez ajouter une description');
      return false;
    }

    if (!formData.address || formData.address.trim() === '') {
      toast.error('Veuillez ajouter une adresse de livraison');
      return false;
    }

    const hasValidItems = formData.items.some(item => item.name.trim() !== '');
    if (!hasValidItems) {
      toast.error('Veuillez ajouter au moins un article');
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
        console.error('Upload error:', error);
        toast.error("Erreur lors de l'upload de la prescription");
        return null;
      }

      const { data: { publicUrl } } = supabase.storage.from('orders').getPublicUrl(filePath);
      prescriptionUrl = publicUrl;
    }

    const validItems = formData.items
      .filter((item) => item.name.trim() !== '')
      .map((item) => ({
        ...item,
        total: item.quantity * item.price,
      }));

    const selectedPatientObj = patients.find((p) => p.id === targetPatientId);
    const finalTargetType = targetType;
    const finalTargetName = targetType === 'personal' 
      ? profile?.full_name || 'Personnel'
      : selectedPatientObj ? `${selectedPatientObj.first_name} ${selectedPatientObj.last_name}` : 'Patient';

    const finalPatientId = targetType === 'patient' ? targetPatientId : null;

    return {
      patient_id: finalPatientId,
      type: formData.type as any,
      description: formData.description.trim(),
      address: formData.address.trim(),
      latitude: null,  
      longitude: null, 
      estimated_amount: finalEstimatedAmount || null,
      items: validItems,
      prescription_url: prescriptionUrl,
      order_type: 'ponctual',
      is_paid: false,
      category: 'ponctuelle',
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
      await payOrderPonctual({
        description: orderData.description,
        orderType: orderData.type,
        items: orderData.items,
        address: orderData.address,
        prescriptionUrl: orderData.prescription_url || undefined,
        targetType: orderData.target_type as 'personal' | 'patient',
        targetName: orderData.target_name,
        patientId: orderData.patient_id,
      });
    } catch (err) {
      isSubmittingRef.current = false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Bloquer immédiatement si soumis
    if (isSubmittingRef.current) return;

    if (isAidant && !canTakeOrder()) {
      toast.error(`Vous avez déjà ${aidantQuota?.current || 0} commande(s) en cours`);
      return;
    }

    if (orderType === 'ponctual') {
      isSubmittingRef.current = true;
      await handlePonctualPayment();
      // On libère le verrou car le modal FedaPay va s'occuper de la suite, ou en cas de fermeture
      isSubmittingRef.current = false;
      return;
    }

    if (orderType === 'subscription') {
      if (!canUseSubscription()) {
        const msg = getActionMessage('order');
        toast.error(msg.description);
        return;
      }
      isSubmittingRef.current = true;
      await createOrderWithSubscription();
    }
  };

  const createOrderWithSubscription = async () => {
    if (!validateOrderData()) {
      isSubmittingRef.current = false;
      return;
    }

    setIsUploading(true);
    try {
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
          isSubmittingRef.current = false;
          return;
        }

        const { data: { publicUrl } } = supabase.storage.from('orders').getPublicUrl(filePath);
        prescriptionUrl = publicUrl;
      }

      const validItems = formData.items
        .filter((item) => item.name.trim() !== '')
        .map((item) => ({
          ...item,
          total: item.quantity * item.price,
        }));

      const selectedPatientObj = patients.find((p) => p.id === targetPatientId);
      const finalTargetType = targetType;
      const finalTargetName = targetType === 'personal' 
        ? profile?.full_name || 'Personnel'
        : selectedPatientObj ? `${selectedPatientObj.first_name} ${selectedPatientObj.last_name}` : 'Patient';

      const result = await createOrder({
        patient_id: targetType === 'patient' ? targetPatientId : null,
        type: formData.type as any,
        description: formData.description.trim(),
        address: formData.address.trim(),
        latitude: null, 
        longitude: null, 
        estimated_amount: finalEstimatedAmount || null,
        items: validItems,
        prescription_url: prescriptionUrl,
        order_type: 'subscription',
        is_paid: true,
        target_type: finalTargetType,
        target_name: finalTargetName,
      });

      toast.success('Commande créée avec succès !');
      sessionStorage.removeItem('create_order_form');
      isRedirecting.current = true;

      if (result?.id) {
        navigate(`/app/orders/${result.id}`);
      } else {
        navigate('/app/orders');
      }
    } catch (error) {
      console.error('❌ Erreur création:', error);
      toast.error('Erreur lors de la création de la commande');
      isSubmittingRef.current = false; // Libérer le verrou en cas d'erreur
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading_ = isLoading || isUploading || isPaymentLoading || subLoading;
  const selectedPatientObj = patients.find((p) => p.id === targetPatientId || p.id === formData.patient_id);
  const itemsTotal = formData.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const finalEstimatedAmount = formData.estimated_amount ? parseFloat(formData.estimated_amount) : itemsTotal;
  const hasPatients = patients.length > 0;

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <section className="bg-white rounded-[1.75rem] p-4 sm:p-5 md:p-6 shadow-sm border border-black/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/app/orders')}
              className="w-11 h-11 rounded-2xl flex items-center justify-center border hover:bg-gray-50 transition shrink-0"
              style={{ borderColor: colors.border || '#e5e0d8', color: colors.text }}
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2" style={{ background: colors.primary + '12', color: colors.primary }}>
                <ShoppingBag size={13} />
                Nouvelle commande
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight" style={{ color: colors.text }}>
                Créer une commande
              </h1>
              <p className="text-sm mt-1 max-w-xl leading-relaxed" style={{ color: colors.text + '75' }}>
                Renseignez les informations nécessaires pour envoyer une demande claire à l'équipe.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 md:min-w-[300px]">
            <CompactHeaderStat label="Destinataire" value={targetType === 'personal' ? 'Personnel' : (selectedPatientObj ? `${selectedPatientObj.first_name}` : 'Patient')} color={colors.primary} />
            <CompactHeaderStat label="Articles" value={formData.items.filter((i) => i.name.trim()).length || 0} color={colors.primary} />
            <CompactHeaderStat label="Photo" value={prescriptionFile ? 'Ajoutée' : 'Non'} color={colors.primary} />
          </div>
        </div>
      </section>

      {/* BANDEAU D'ABONNEMENT */}
      {isFamily && subscriptionInfo && (
        <div className={`rounded-xl p-4 border flex items-start gap-3 ${subscriptionInfo.type === 'success' ? 'bg-green-50 border-green-200' : subscriptionInfo.type === 'warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className={`mt-0.5 ${subscriptionInfo.type === 'success' ? 'text-green-600' : subscriptionInfo.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'}`}>{subscriptionInfo.icon}</div>
          <div>
            <p className={`text-sm font-bold ${subscriptionInfo.type === 'success' ? 'text-green-700' : subscriptionInfo.type === 'warning' ? 'text-yellow-700' : 'text-blue-700'}`}>{subscriptionInfo.title}</p>
            <p className={`text-xs ${subscriptionInfo.type === 'success' ? 'text-green-600' : subscriptionInfo.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'}`}>{subscriptionInfo.description}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* POUR QUI ? */}
          {hasPatients && (
            <section className="bg-white rounded-[2rem] p-5 md:p-6 shadow-sm border border-black/5">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: colors.primary + '14', color: colors.primary }}><Users size={20} /></div>
                <div>
                  <h2 className="text-lg md:text-xl font-black tracking-tight text-gray-900">Pour qui ?</h2>
                  <p className="text-sm text-gray-500 mt-1">Choisissez le destinataire de cette commande.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button type="button" onClick={() => { setTargetType('personal'); setTargetPatientId(''); }} className={`p-5 rounded-2xl border-2 text-left transition-all ${targetType === 'personal' ? 'border-[--color-primary] bg-[--color-primary]08 shadow-md' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: targetType === 'personal' ? colors.primary + '15' : '#f3f4f6', color: targetType === 'personal' ? colors.primary : '#9ca3af' }}><User size={20} /></div>
                    <div>
                      <p className="font-bold">👤 Personnel</p>
                      <p className="text-xs text-gray-400">Pour vous-même</p>
                    </div>
                  </div>
                </button>

                <button type="button" onClick={() => { setTargetType('patient'); if (patients.length > 0) setTargetPatientId(patients[0].id); }} className={`p-5 rounded-2xl border-2 text-left transition-all ${targetType === 'patient' ? 'border-[--color-primary] bg-[--color-primary]08 shadow-md' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: targetType === 'patient' ? colors.primary + '15' : '#f3f4f6', color: targetType === 'patient' ? colors.primary : '#9ca3af' }}><Users size={20} /></div>
                    <div>
                      <p className="font-bold">👨‍👩‍👦 Patient</p>
                      <p className="text-xs text-gray-400">Pour un proche</p>
                    </div>
                  </div>
                </button>
              </div>

              {targetType === 'patient' && patients.length > 0 && (
                <div className="mt-4">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: colors.text }}>Sélectionner le proche</label>
                  <select value={targetPatientId} onChange={(e) => setTargetPatientId(e.target.value)} className="w-full px-3.5 py-2.5 rounded-2xl border outline-none text-sm" style={{ borderColor: colors.border, color: colors.text }}>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name} — {getCategoryLabel(patient.category)}</option>
                    ))}
                  </select>
                </div>
              )}
            </section>
          )}

          {/* TYPE DE COMMANDE */}
          <section className="bg-white rounded-[2rem] p-5 md:p-6 shadow-sm border border-black/5">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: colors.primary + '14', color: colors.primary }}><Sparkles size={20} /></div>
              <div>
                <h2 className="text-lg md:text-xl font-black tracking-tight text-gray-900">Type de commande</h2>
                <p className="text-sm text-gray-500 mt-1">Choisissez votre méthode de facturation.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button type="button" onClick={() => setOrderType('subscription')} disabled={!canUseSubscription()} className={`p-5 rounded-2xl border-2 text-left transition-all ${orderType === 'subscription' ? 'border-[--color-primary] bg-[--color-primary]08 shadow-md' : 'border-gray-200'} ${!canUseSubscription() ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: orderType === 'subscription' ? colors.primary + '15' : '#f3f4f6', color: orderType === 'subscription' ? colors.primary : '#9ca3af' }}><Package size={20} /></div>
                  <div>
                    <p className="font-bold">Avec abonnement</p>
                    <p className="text-xs text-gray-400">{canUseSubscription() ? `${remainingOrders} restantes` : 'Abonnement requis/vide'}</p>
                  </div>
                </div>
              </button>

              <button type="button" onClick={() => setOrderType('ponctual')} className={`p-5 rounded-2xl border-2 text-left transition-all ${orderType === 'ponctual' ? 'border-[--color-primary] bg-[--color-primary]08 shadow-md' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: orderType === 'ponctual' ? colors.primary + '15' : '#f3f4f6', color: orderType === 'ponctual' ? colors.primary : '#9ca3af' }}><CreditCard size={20} /></div>
                  <div>
                    <p className="font-bold">Ponctuelle</p>
                    <p className="text-xs text-gray-400">Paiement à la demande</p>
                  </div>
                </div>
              </button>
            </div>
          </section>

          {/* INFOS COMPLEMENTAIRES */}
          <ModernPanel icon={<ClipboardList size={20} />} title="Informations complémentaires" subtitle="Renseignez l'adresse de livraison et la description." color={colors.primary}>
            <div className="space-y-4">
              <Field label="Description" required color={colors.text}>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 rounded-2xl border outline-none text-sm bg-gray-50 resize-none" style={{ borderColor: colors.border || '#e5e0d8' }} rows={3} placeholder="Détaillez votre commande..." required />
              </Field>

              <Field label="Adresse de livraison" required color={colors.text}>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                  <input 
                    type="text" 
                    value={formData.address} 
                    onChange={(e) => handleAddressChange(e.target.value)} 
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border outline-none text-sm bg-gray-50" 
                    style={{ borderColor: colors.border || '#e5e0d8' }} 
                    placeholder="Quartier, indications de rue pour le livreur..." 
                    required 
                  />
                </div>
              </Field>
            </div>
          </ModernPanel>

          {/* PHOTO / ORDONNANCE */}
          <ModernPanel icon={<FileImage size={20} />} title="Ordonnance ou photo" subtitle="Chargez un document ou une boîte en photo." color={colors.primary}>
            {!prescriptionPreview ? (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full min-h-[140px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition" style={{ borderColor: colors.primary + '35' }}>
                <Camera size={24} className="text-gray-400 mb-2" />
                <span className="text-xs font-bold">Ajouter une photo (Max 5MB)</span>
              </button>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border">
                <img src={prescriptionPreview} alt="Aperçu" className="max-h-60 w-full object-cover" />
                <button type="button" onClick={removePrescription} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition"><X size={16} /></button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </ModernPanel>

          {/* SÉLECTEUR ARTICLES */}
          <ModernPanel icon={<ShoppingBag size={20} />} title="Articles de la commande" subtitle="Renseignez les lignes d'achats." color={colors.primary}>
            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2 items-center rounded-2xl bg-gray-50 border p-3" style={{ borderColor: colors.border || '#e5e0d8' }}>
                  <input type="text" value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} className="w-full sm:flex-1 px-3 py-2 rounded-xl border text-sm" placeholder="Nom de l'article" />
                  <input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} className="w-20 px-3 py-2 rounded-xl border text-sm" min="1" />
                  <input type="number" value={item.price} onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)} className="w-28 px-3 py-2 rounded-xl border text-sm" min="0" placeholder="Prix" />
                  {formData.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="text-red-500 p-2 hover:bg-red-50 rounded-xl"><Trash2 size={16} /></button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addItem} className="text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-xl border" style={{ color: colors.primary, borderColor: colors.border }}><Plus size={14} /> Ajouter une ligne</button>
            </div>
          </ModernPanel>
        </div>

        {/* COLONNE COMPACTE DROITE (RÉSUMÉ) */}
        <aside className="xl:sticky xl:top-24 h-fit">
          <div className="bg-white rounded-[2rem] p-5 md:p-6 shadow-sm border border-black/5 space-y-4">
            <h2 className="text-lg font-black" style={{ color: colors.text }}>Résumé</h2>
            <SummaryLine label="Destinataire" value={targetType === 'personal' ? '👤 Personnel' : `👨‍👩‍👦 ${selectedPatientObj?.first_name || 'Patient'}`} />
            <SummaryLine label="Mode" value={orderType === 'subscription' ? 'Abonnement' : 'Ponctuel'} />
            
            <div className="rounded-2xl p-4" style={{ background: colors.primary + '10' }}>
              <p className="text-xs font-medium text-gray-500">Estimation totale</p>
              <p className="text-2xl font-black mt-1" style={{ color: colors.primary }}>
                {orderType === 'subscription' ? `${remainingOrders} restantes` : `${getPonctualPrice().toLocaleString()} FCFA`}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button type="submit" disabled={isLoading_} className="w-full py-3 rounded-2xl text-white font-bold flex items-center justify-center gap-2" style={{ background: colors.primary }}>
                {isLoading_ ? <Loader2 size={18} className="animate-spin" /> : orderType === 'ponctual' ? `Payer ${getPonctualPrice().toLocaleString()} FCFA` : 'Créer la commande'}
                <ArrowRight size={16} />
              </button>
              <button type="button" onClick={() => navigate('/app/orders')} className="w-full py-3 rounded-2xl border text-center text-sm font-semibold" style={{ borderColor: colors.border }}>Annuler</button>
            </div>
          </div>
        </aside>
      </form>

      {/* MODAL FEDAPAY */}
      {isPaymentModalOpen && pendingPaymentData && (
        <PonctualPaymentModal isOpen={isPaymentModalOpen} onClose={handlePaymentCancel} onSuccess={handlePaymentSuccess} paymentData={pendingPaymentData} redirectPath="/app/orders" />
      )}
    </div>
  );
};

// =============================================
// SOUS-COMPOSANTS
// =============================================

interface ModernPanelProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  children: React.ReactNode;
}

const ModernPanel = ({ icon, title, subtitle, color, children }: ModernPanelProps) => {
  return (
    <section className="bg-white rounded-[2rem] p-5 md:p-6 shadow-sm border border-black/5">
      <div className="flex items-start gap-3 mb-5">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: color + '14',
            color,
          }}
        >
          {icon}
        </div>

        <div>
          <h2 className="text-lg md:text-xl font-black tracking-tight text-gray-900">
            {title}
          </h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            {subtitle}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
};

interface FieldProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  color: string;
  children: React.ReactNode;
}

const Field = ({ label, required, optional, color, children }: FieldProps) => {
  return (
    <div className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold" style={{ color }}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>

        {optional && (
          <span className="text-[11px] uppercase tracking-wide text-gray-400">
            Optionnel
          </span>
        )}
      </div>

      {children}
    </div>
  );
};

interface CompactHeaderStatProps {
  label: string;
  value: string | number;
  color: string;
}

const CompactHeaderStat = ({ label, value, color }: CompactHeaderStatProps) => {
  return (
    <div className="rounded-2xl bg-gray-50 border border-black/5 px-3 py-2.5 text-center">
      <p className="text-[11px] text-gray-500 leading-tight">
        {label}
      </p>
      <p className="text-sm font-bold mt-0.5 truncate" style={{ color }}>
        {value}
      </p>
    </div>
  );
};

interface SummaryLineProps {
  label: string;
  value: string;
  color?: string;
}

const SummaryLine = ({ label, value, color }: SummaryLineProps) => {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right" style={{ color }}>
        {value}
      </span>
    </div>
  );
};

export default CreateOrderPage;
