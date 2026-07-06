// 📁 src/features/orders/pages/CreateOrderPage.tsx

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingBag,
  User,
  MapPin,
  Package,
  Camera,
  X,
  Trash2,
  Plus,
  FileImage,
  ShieldCheck,
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
import { ORDER_TYPES, getPonctualOrderPriceByType } from '@/lib/constants';

import { OrderItem } from '@/types';
import { supabase } from '@/lib/supabase';
import { PaymentModal } from '@/features/billing/components/PaymentModal';
import { Illustration } from '@/components/ui/Illustration';
import toast from 'react-hot-toast';

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

const CreateOrderPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const { createOrder, isLoading } = useOrderStore();
  const { patients, fetchPatients } = usePatientStore();

  const {
    singular,
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  // ✅ Utiliser le guard d'abonnement
  const {
    hasActiveSubscription,
    remainingOrders,
    can,
    getActionMessage,
    canUsePonctual: canUsePonctualMode,
  } = useSubscriptionGuard();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRedirecting = useRef(false);

  const [orderType, setOrderType] = useState<'subscription' | 'ponctual'>(
    canUseSubscription() ? 'subscription' : 'ponctual'
  );
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);

  const [targetType, setTargetType] = useState<'personal' | 'patient'>('personal');
  const [targetPatientId, setTargetPatientId] = useState<string>('');

  const [formData, setFormData] = useState({
    patient_id: '',
    type: 'medicaments',
    description: '',
    address: '',
    estimated_amount: '',
    items: [{ name: '', quantity: 1, price: 0, total: 0 }] as OrderItem[],
  });

  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionPreview, setPrescriptionPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ Vérifier si l'utilisateur peut utiliser l'abonnement
  const canUseSubscription = () => {
    return hasActiveSubscription && remainingOrders > 0;
  };

  // ✅ Calcul du prix ponctuel
  const getPonctualPrice = () => {
    return getPonctualOrderPriceByType(formData.type, formData.items);
  };

  // ✅ Message d'information sur l'abonnement
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

  // =============================================
  // EFFETS : CHARGEMENT ET SAUVEGARDE
  // =============================================
  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👀 Onglet caché');
      } else {
        console.log('👀 Onglet visible - pas de rechargement');
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRedirecting.current) return;
      
      if (formData.description.trim() || formData.items.some(item => item.name.trim())) {
        e.preventDefault();
        e.returnValue = 'Vous avez des données non sauvegardées. Voulez-vous vraiment quitter ?';
        return e.returnValue;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formData]);

  // ✅ SAUVEGARDE AUTOMATIQUE
  useEffect(() => {
    const saveFormData = () => {
      try {
        sessionStorage.setItem('create_order_form', JSON.stringify({
          formData,
          prescriptionPreview,
          orderType,
          targetType,
          targetPatientId,
          timestamp: Date.now(),
        }));
      } catch (e) {
        console.warn('Erreur sauvegarde formulaire:', e);
      }
    };

    const interval = setInterval(saveFormData, 5000);
    window.addEventListener('beforeunload', saveFormData);

    const restoreFormData = () => {
      try {
        const saved = sessionStorage.getItem('create_order_form');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
            setFormData(parsed.formData);
            setPrescriptionPreview(parsed.prescriptionPreview || null);
            setOrderType(parsed.orderType || (canUseSubscription() ? 'subscription' : 'ponctual'));
            setTargetType(parsed.targetType || 'personal');
            setTargetPatientId(parsed.targetPatientId || '');
            console.log('📦 Formulaire restauré depuis sessionStorage');
          } else {
            sessionStorage.removeItem('create_order_form');
          }
        }
      } catch (e) {
        console.warn('Erreur restauration formulaire:', e);
      }
    };

    restoreFormData();

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', saveFormData);
    };
  }, []);

  // =============================================
  // GESTION DES FICHIERS ET ARTICLES (inchangé)
  // =============================================
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

  // =============================================
  // VALIDATION DES DONNÉES
  // =============================================
  const validateOrderData = (): boolean => {
    if (!formData.description || formData.description.trim() === '') {
      toast.error('Veuillez ajouter une description');
      return false;
    }

    if (!formData.address || formData.address.trim() === '') {
      toast.error('Veuillez ajouter une adresse de livraison');
      return false;
    }

    if (!formData.type) {
      toast.error('Veuillez sélectionner un type de commande');
      return false;
    }

    const hasValidItems = formData.items.some(item => item.name.trim() !== '');
    if (!hasValidItems) {
      toast.error('Veuillez ajouter au moins un article');
      return false;
    }

    return true;
  };

  // =============================================
  // PRÉPARER LES DONNÉES DE LA COMMANDE
  // =============================================
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

      const {
        data: { publicUrl },
      } = supabase.storage.from('orders').getPublicUrl(filePath);

      prescriptionUrl = publicUrl;
    }

    const validItems = formData.items
      .filter((item) => item.name.trim() !== '')
      .map((item) => ({
        ...item,
        total: item.quantity * item.price,
      }));

    const finalTargetType = targetType;
    const finalTargetName = targetType === 'personal' 
      ? profile?.full_name || 'Personnel'
      : selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Patient';

    return {
      patient_id: targetType === 'patient' ? targetPatientId : null,
      type: formData.type as any,
      description: formData.description.trim(),
      address: formData.address.trim(),
      estimated_amount: finalEstimatedAmount || null,
      items: validItems,
      prescription_url: prescriptionUrl,
      order_type: 'ponctual',
      is_paid: false,
      category: 'ponctuelle',
      target_type: finalTargetType,
      target_name: finalTargetName,
      hasPatients: patients.length > 0,
    };
  };

  // =============================================
  // SOUMISSION DU FORMULAIRE
  // =============================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ CAS 1 : Commande ponctuelle → Paiement
    if (orderType === 'ponctual') {
      const orderData = await prepareOrderData();
      if (!orderData) return;

      sessionStorage.setItem('pending_ponctual_order', JSON.stringify(orderData));
      localStorage.setItem('pending_ponctual_order', JSON.stringify(orderData));
      
      setPendingOrderData(orderData);
      const price = getPonctualPrice();
      setPaymentAmount(price);
      
      isRedirecting.current = true;
      setShowPaymentModal(true);
      return;
    }

    // ✅ CAS 2 : Commande avec abonnement
    if (orderType === 'subscription') {
      if (!canUseSubscription()) {
        const msg = getActionMessage('order');
        toast.error(msg.description);
        return;
      }
      await createOrderWithSubscription();
    }
  };

  // =============================================
  // CRÉER LA COMMANDE AVEC ABONNEMENT
  // =============================================
  const createOrderWithSubscription = async () => {
    if (!validateOrderData()) return;

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
          console.error('Upload error:', error);
          toast.error("Erreur lors de l'upload de la prescription");
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('orders').getPublicUrl(filePath);

        prescriptionUrl = publicUrl;
      }

      const validItems = formData.items
        .filter((item) => item.name.trim() !== '')
        .map((item) => ({
          ...item,
          total: item.quantity * item.price,
        }));

      const finalTargetType = targetType;
      const finalTargetName = targetType === 'personal' 
        ? profile?.full_name || 'Personnel'
        : selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Patient';

      await createOrder({
        patient_id: targetType === 'patient' ? targetPatientId : null,
        type: formData.type as any,
        description: formData.description.trim(),
        address: formData.address.trim(),
        estimated_amount: finalEstimatedAmount || null,
        items: validItems,
        prescription_url: prescriptionUrl,
        order_type: 'subscription',
        is_paid: true,
        target_type: finalTargetType,
        target_name: finalTargetName,
      });

      toast.success('Commande créée avec succès (décomptée de votre abonnement)');
      navigate('/app/orders');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la création');
    } finally {
      setIsUploading(false);
    }
  };

  // =============================================
  // CALLBACK DU MODAL DE PAIEMENT
  // =============================================
  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    isRedirecting.current = false;
    navigate('/app/orders');
  };

  const isLoading_ = isLoading || isUploading;

  // =============================================
  // DONNÉES DÉRIVÉES
  // =============================================
  const selectedPatient = patients.find((p) => p.id === targetPatientId || p.id === formData.patient_id);

  const itemsTotal = formData.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const finalEstimatedAmount = formData.estimated_amount
    ? parseFloat(formData.estimated_amount)
    : itemsTotal;

  const beneficiaryLabel = isFamily ? 'Proche' : isAidant ? 'Personne accompagnée' : 'Bénéficiaire';
  const hasPatients = patients.length > 0;

  // =============================================
  // RENDU
  // =============================================
  return (
    <div className="space-y-6 pb-10">
      {/* HEADER (inchangé) */}
      <section className="bg-white rounded-[1.75rem] p-4 sm:p-5 md:p-6 shadow-sm border border-black/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/app/orders')}
              className="w-11 h-11 rounded-2xl flex items-center justify-center border hover:bg-gray-50 transition shrink-0"
              style={{
                borderColor: colors.border || '#e5e0d8',
                color: colors.text,
              }}
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2"
                style={{
                  background: colors.primary + '12',
                  color: colors.primary,
                }}
              >
                <ShoppingBag size={13} />
                Nouvelle commande
              </div>

              <h1
                className="text-2xl md:text-3xl font-black tracking-tight leading-tight"
                style={{ color: colors.text }}
              >
                Créer une commande
              </h1>

              <p
                className="text-sm mt-1 max-w-xl leading-relaxed"
                style={{ color: colors.text + '75' }}
              >
                Renseignez les informations nécessaires pour envoyer une demande claire à l'équipe.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 md:min-w-[300px]">
            <CompactHeaderStat
              label="Destinataire"
              value={targetType === 'personal' ? 'Personnel' : (selectedPatient ? `${selectedPatient.first_name}` : 'Patient')}
              color={colors.primary}
            />
            <CompactHeaderStat
              label="Articles"
              value={formData.items.filter((i) => i.name.trim()).length || 0}
              color={colors.primary}
            />
            <CompactHeaderStat
              label="Photo"
              value={prescriptionFile ? 'Ajoutée' : 'Non'}
              color={colors.primary}
            />
          </div>
        </div>
      </section>

      {/* ✅ BANDEAU D'INFORMATION ABONNEMENT */}
      {isFamily && subscriptionInfo && (
        <div 
          className={`rounded-xl p-4 border flex items-start gap-3 ${
            subscriptionInfo.type === 'success' ? 'bg-green-50 border-green-200' :
            subscriptionInfo.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
            'bg-blue-50 border-blue-200'
          }`}
        >
          <div className={`mt-0.5 ${
            subscriptionInfo.type === 'success' ? 'text-green-600' :
            subscriptionInfo.type === 'warning' ? 'text-yellow-600' :
            'text-blue-600'
          }`}>
            {subscriptionInfo.icon}
          </div>
          <div>
            <p className={`text-sm font-bold ${
              subscriptionInfo.type === 'success' ? 'text-green-700' :
              subscriptionInfo.type === 'warning' ? 'text-yellow-700' :
              'text-blue-700'
            }`}>
              {subscriptionInfo.title}
            </p>
            <p className={`text-xs ${
              subscriptionInfo.type === 'success' ? 'text-green-600' :
              subscriptionInfo.type === 'warning' ? 'text-yellow-600' :
              'text-blue-600'
            }`}>
              {subscriptionInfo.description}
            </p>
            {!hasActiveSubscription && (
              <p className="text-[10px] text-blue-500 mt-1">
                💳 Prix ponctuel estimé : {getPonctualPrice().toLocaleString()} FCFA
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* COLONNE PRINCIPALE - inchangée */}
        <div className="space-y-6">
          {/* CHOIX DU DESTINATAIRE */}
          {hasPatients && (
            <section className="bg-white rounded-[2rem] p-5 md:p-6 shadow-sm border border-black/5">
              {/* ... contenu inchangé ... */}
            </section>
          )}

          {/* TYPE DE COMMANDE */}
          <section className="bg-white rounded-[2rem] p-5 md:p-6 shadow-sm border border-black/5">
            <div className="flex items-start gap-3 mb-5">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: colors.primary + '14',
                  color: colors.primary,
                }}
              >
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-black tracking-tight text-gray-900">
                  Type de commande
                </h2>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Choisissez comment vous souhaitez payer cette commande.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1 : Avec abonnement */}
              <button
                type="button"
                onClick={() => setOrderType('subscription')}
                disabled={!canUseSubscription()}
                className={`p-5 rounded-2xl border-2 text-left transition-all ${
                  orderType === 'subscription'
                    ? 'border-[--color-primary] bg-[--color-primary]08 shadow-md scale-[1.01]'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!canUseSubscription() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{
                      background: orderType === 'subscription' ? colors.primary + '15' : '#f3f4f6',
                      color: orderType === 'subscription' ? colors.primary : '#9ca3af',
                    }}
                  >
                    <Package size={20} />
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: colors.text }}>
                      Avec abonnement
                    </p>
                    <p className="text-xs" style={{ color: colors.text + '50' }}>
                      {canUseSubscription()
                        ? `${remainingOrders} commande${remainingOrders > 1 ? 's' : ''} restante${remainingOrders > 1 ? 's' : ''}`
                        : hasActiveSubscription
                          ? 'Plus de commandes disponibles'
                          : 'Abonnement requis'}
                    </p>
                  </div>
                </div>
                {orderType === 'subscription' && (
                  <div className="mt-3 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle size={14} />
                    Commandes incluses
                  </div>
                )}
              </button>

              {/* Option 2 : Ponctuelle */}
              <button
                type="button"
                onClick={() => setOrderType('ponctual')}
                className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  orderType === 'ponctual'
                    ? 'border-[--color-primary] bg-[--color-primary]08 shadow-md scale-[1.01]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{
                      background: orderType === 'ponctual' ? colors.primary + '15' : '#f3f4f6',
                      color: orderType === 'ponctual' ? colors.primary : '#9ca3af',
                    }}
                  >
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: colors.text }}>
                      Ponctuelle
                    </p>
                    <p className="text-xs" style={{ color: colors.text + '50' }}>
                      Paiement avant envoi
                    </p>
                  </div>
                </div>
                {orderType === 'ponctual' && (
                  <div className="mt-3 flex items-center gap-3 text-xs">
                    <span className="text-orange-600 flex items-center gap-1">
                      <CreditCard size={14} />
                      {getPonctualPrice().toLocaleString()} FCFA
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-400">Sans engagement</span>
                  </div>
                )}
              </button>
            </div>
          </section>

          {/* Section infos - inchangée */}
          <ModernPanel
            icon={<ClipboardList size={20} />}
            title="Informations principales"
            subtitle={`Renseignez le ${beneficiaryLabel.toLowerCase()}, le type de commande et les détails.`}
            color={colors.primary}
          >
            {/* ... contenu inchangé ... */}
          </ModernPanel>

          {/* Section upload - inchangée */}
          <ModernPanel
            icon={<FileImage size={20} />}
            title="Ordonnance ou photo"
            subtitle="Ajoutez une image si la commande nécessite une preuve visuelle."
            color={colors.secondary || colors.primary}
          >
            {/* ... contenu inchangé ... */}
          </ModernPanel>

          {/* Section articles - inchangée */}
          <ModernPanel
            icon={<ShoppingBag size={20} />}
            title="Articles"
            subtitle="Ajoutez les éléments de la commande pour obtenir un total estimé."
            color={colors.primary}
          >
            {/* ... contenu inchangé ... */}
          </ModernPanel>
        </div>

        {/* RÉSUMÉ - avec affichage du prix ponctuel */}
        <aside className="xl:sticky xl:top-24 h-fit">
          <div className="bg-white rounded-[2rem] p-5 md:p-6 shadow-sm border border-black/5 space-y-5">
            <div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: colors.primary + '15',
                  color: colors.primary,
                }}
              >
                <ShieldCheck size={24} />
              </div>

              <h2 className="text-xl font-black" style={{ color: colors.text }}>
                Résumé
              </h2>

              <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
                Vérifiez les informations avant d'envoyer la demande.
              </p>
            </div>

            <SummaryLine
              label="Destinataire"
              value={targetType === 'personal' ? '👤 Personnel' : `👨‍👩‍👦 ${selectedPatient?.first_name || 'Patient'}`}
            />

            <SummaryLine
              label="Type de commande"
              value={orderType === 'subscription' ? 'Avec abonnement' : 'Ponctuelle'}
            />

            <SummaryLine
              label="Type"
              value={
                ORDER_TYPES.find((type) => type.id === formData.type)?.label ||
                formData.type
              }
            />

            <SummaryLine
              label="Photo"
              value={prescriptionFile ? 'Ajoutée' : 'Non ajoutée'}
            />

            <div className="rounded-[1.5rem] p-4" style={{ background: colors.primary + '10' }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium" style={{ color: colors.text + '70' }}>
                    {orderType === 'subscription' ? 'Commandes restantes' : 'Montant'}
                  </p>
                  <p className="text-2xl font-black mt-1" style={{ color: colors.primary }}>
                    {orderType === 'subscription'
                      ? `${remainingOrders} commande${remainingOrders > 1 ? 's' : ''}`
                      : `${getPonctualPrice().toLocaleString()} FCFA`}
                  </p>
                </div>
                {orderType === 'subscription' ? (
                  <Package size={28} style={{ color: colors.primary }} />
                ) : (
                  <CreditCard size={28} style={{ color: colors.primary }} />
                )}
              </div>
              {orderType === 'subscription' && !canUseSubscription() && (
                <p className="text-xs text-red-500 mt-2">
                  ⚠️ Vous n'avez plus de commandes disponibles dans votre abonnement
                </p>
              )}
              {orderType === 'ponctual' && (
                <p className="text-[10px] text-gray-400 mt-1">
                  💳 Prix calculé automatiquement selon les articles
                </p>
              )}
            </div>

            <Field label="Montant estimé manuel" optional color={colors.text}>
              <input
                type="number"
                value={formData.estimated_amount}
                onChange={(e) =>
                  setFormData({ ...formData, estimated_amount: e.target.value })
                }
                className="w-full px-4 py-3.5 rounded-2xl border outline-none transition focus:ring-2 text-sm bg-gray-50"
                style={{
                  borderColor: colors.border || '#e5e0d8',
                  color: colors.text,
                }}
                placeholder="0"
                min="0"
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                type="submit"
                disabled={isLoading_ || (orderType === 'subscription' && !canUseSubscription())}
                className="w-full py-3.5 rounded-2xl text-white font-bold transition hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-70"
                style={{
                  background: (orderType === 'subscription' && !canUseSubscription())
                    ? '#9CA3AF'
                    : colors.primary,
                }}
              >
                {isLoading_ ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : orderType === 'ponctual' ? (
                  <>
                    <CreditCard size={18} />
                    Payer {getPonctualPrice().toLocaleString()} FCFA
                    <ArrowRight size={17} />
                  </>
                ) : (
                  <>
                    <ShoppingBag size={18} />
                    Créer la commande
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/app/orders')}
                className="w-full py-3.5 rounded-2xl font-semibold border transition hover:bg-gray-50"
                style={{
                  borderColor: colors.border || '#e5e0d8',
                  color: colors.text,
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </aside>
      </form>

      {/* ✅ MODAL DE PAIEMENT */}
      {showPaymentModal && (
        <PaymentModal
          isOpen={true}
          onClose={() => {
            setShowPaymentModal(false);
            setPendingOrderData(null);
            isRedirecting.current = false;
          }}
          offer={{
            id: `ponctual-${formData.type}`,
            name: `Commande ${formData.type} (ponctuelle)`,
            price: paymentAmount,
            period: 'intervention',
            features: ['Commande unique', 'Sans abonnement', 'Livraison rapide'],
            visitsPerWeek: null,
            durationDays: 1,
            badge: 'Ponctuelle',
            category: 'ponctuelle',
          }}
          onSuccess={handlePaymentSuccess}
          orderData={pendingOrderData}
          forcePonctual={true}
        />
      )}
    </div>
  );
};

// =============================================
// SOUS-COMPOSANTS (inchangés)
// =============================================

// ... (ModernPanel, Field, CompactHeaderStat, SummaryLine inchangés)

export default CreateOrderPage;
