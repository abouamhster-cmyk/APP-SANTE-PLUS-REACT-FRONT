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
  ListOrdered,
  Receipt,
  Clock,
  AlertCircle,
  Wallet,
  Image as ImageIcon,
} from 'lucide-react';

import { useOrderStore } from '@/stores/orderStore';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { ORDER_TYPES } from '@/lib/constants';
import { OrderItem } from '@/types';
import { supabase } from '@/lib/supabase';
import { PaymentModal } from '@/features/billing/components/PaymentModal';
import { Illustration } from '@/components/ui/Illustration';
import toast from 'react-hot-toast';

// =============================================
// ICÔNES PAR TYPE DE COMMANDE
// =============================================

const TYPE_ICONS: Record<string, React.ReactNode> = {
  medicaments: <Package size={16} />,
  produits_bebe: <Package size={16} />,
  produits_hygiene: <Package size={16} />,
  courses: <ShoppingBag size={16} />,
  repas: <Package size={16} />,
  autre: <ListOrdered size={16} />,
};

const TYPE_LABELS: Record<string, string> = {
  medicaments: 'Médicaments',
  produits_bebe: 'Produits bébé',
  produits_hygiene: "Produits d'hygiène",
  courses: 'Courses',
  repas: 'Repas',
  autre: 'Autre',
};

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

  const {
    hasActiveSubscription,
    remainingOrders,
    can,
    getBlockMessage,
    isLoading: subLoading,
  } = useSubscriptionGuard();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRedirecting = useRef(false);

  const [orderType, setOrderType] = useState<'subscription' | 'ponctual'>('subscription');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);

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

  // ✅ Charger les patients
  useEffect(() => {
    fetchPatients();
  }, []);

  // ✅ EMPÊCHER LE RECHARGEMENT AUTOMATIQUE
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👀 Onglet caché');
      } else {
        console.log('👀 Onglet visible - pas de rechargement');
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRedirecting.current) {
        return;
      }
      
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

  // ✅ SAUVEGARDE AUTOMATIQUE EN SESSIONSTORAGE
  useEffect(() => {
    const saveFormData = () => {
      try {
        sessionStorage.setItem('create_order_form', JSON.stringify({
          formData,
          prescriptionPreview,
          orderType,
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
            setOrderType(parsed.orderType || 'subscription');
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

  const selectedPatient = patients.find((p) => p.id === formData.patient_id);

  const itemsTotal = formData.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const finalEstimatedAmount = formData.estimated_amount
    ? parseFloat(formData.estimated_amount)
    : itemsTotal;

  const beneficiaryLabel = isFamily ? 'Proche' : isAidant ? 'Personne accompagnée' : 'Bénéficiaire';

  const getPonctualPrice = () => {
    const prices: Record<string, number> = {
      medicaments: 100,
      produits_bebe: 100,
      produits_hygiene: 100,
      courses: 100,
      repas: 100,
      autre: 100,
    };
    return prices[formData.type] || 2500;
  };

  const canUseSubscription = () => {
    return hasActiveSubscription && remainingOrders > 0;
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

  // ✅ VALIDATION des données avant préparation
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

  // ✅ Préparer les données de la commande sans la créer
  const prepareOrderData = async () => {
    if (!validateOrderData()) {
      return null;
    }

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

    return {
      patient_id: formData.patient_id || null,
      type: formData.type as any,
      description: formData.description.trim(),
      address: formData.address.trim(),
      estimated_amount: finalEstimatedAmount || null,
      items: validItems,
      prescription_url: prescriptionUrl,
      order_type: 'ponctual',
      is_paid: false,
      category: 'ponctuelle',
    };
  };

  // ✅ Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (orderType === 'ponctual') {
      const orderData = await prepareOrderData();
      if (!orderData) return;

      console.log('📦 Commande ponctuelle préparée:', orderData);

      sessionStorage.setItem('pending_ponctual_order', JSON.stringify(orderData));
      localStorage.setItem('pending_ponctual_order', JSON.stringify(orderData));
      
      setPendingOrderData(orderData);
      const price = getPonctualPrice();
      setPaymentAmount(price);
      
      isRedirecting.current = true;
      setShowPaymentModal(true);
      return;
    }

    if (orderType === 'subscription') {
      if (!canUseSubscription()) {
        const msg = getBlockMessage('order');
        toast.error(msg.description);
        return;
      }
      await createOrderWithSubscription();
    }
  };

  // ✅ Créer la commande avec abonnement (direct)
  const createOrderWithSubscription = async () => {
    if (!validateOrderData()) {
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

      await createOrder({
        patient_id: formData.patient_id || null,
        type: formData.type as any,
        description: formData.description.trim(),
        address: formData.address.trim(),
        estimated_amount: finalEstimatedAmount || null,
        items: validItems,
        prescription_url: prescriptionUrl,
        order_type: 'subscription',
        is_paid: true,
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

  // ✅ Callback du modal de paiement
  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    isRedirecting.current = false;
  };

  const isLoading_ = isLoading || isUploading;

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
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
              label={beneficiaryLabel}
              value={selectedPatient ? 'Choisi' : 'Optionnel'}
              color={colors.primary}
              icon={<User size={14} />}
            />
            <CompactHeaderStat
              label="Articles"
              value={formData.items.filter((i) => i.name.trim()).length || 0}
              color={colors.primary}
              icon={<ListOrdered size={14} />}
            />
            <CompactHeaderStat
              label="Photo"
              value={prescriptionFile ? 'Ajoutée' : 'Non'}
              color={colors.primary}
              icon={<ImageIcon size={14} />}
            />
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* COLONNE PRINCIPALE */}
        <div className="space-y-6">
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
                        ? `${remainingOrders} commande(s) restante(s)`
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

          {/* Section infos */}
          <ModernPanel
            icon={<ClipboardList size={20} />}
            title="Informations principales"
            subtitle={`Renseignez le ${beneficiaryLabel.toLowerCase()}, le type de commande et les détails.`}
            color={colors.primary}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={beneficiaryLabel} optional color={colors.text}>
                <div className="relative">
                  <User
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5"
                    style={{ color: colors.text + '60' }}
                  />
                  <select
                    value={formData.patient_id}
                    onChange={(e) =>
                      setFormData({ ...formData, patient_id: e.target.value })
                    }
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border outline-none transition focus:ring-2 text-sm bg-gray-50"
                    style={{
                      borderColor: colors.border || '#e5e0d8',
                      color: colors.text,
                    }}
                  >
                    <option value="">Sans {beneficiaryLabel.toLowerCase()}</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name} —{' '}
                        {getCategoryLabel(patient.category)}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field label="Type de commande" color={colors.text}>
                <div className="relative">
                  <Package
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5"
                    style={{ color: colors.text + '60' }}
                  />
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border outline-none transition focus:ring-2 text-sm bg-gray-50"
                    style={{
                      borderColor: colors.border || '#e5e0d8',
                      color: colors.text,
                    }}
                  >
                    {ORDER_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {TYPE_ICONS[type.id]} {TYPE_LABELS[type.id]}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Description" required color={colors.text}>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-3.5 rounded-2xl border outline-none transition focus:ring-2 resize-none text-sm bg-gray-50"
                  style={{
                    borderColor: colors.border || '#e5e0d8',
                    color: colors.text,
                  }}
                  rows={4}
                  placeholder="Exemple : Doliprane 1000mg, couches taille 3, lait bébé, produits de soin..."
                  required
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Adresse de livraison" required color={colors.text}>
                <div className="relative">
                  <MapPin
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5"
                    style={{ color: colors.text + '60' }}
                  />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border outline-none transition focus:ring-2 text-sm bg-gray-50"
                    style={{
                      borderColor: colors.border || '#e5e0d8',
                      color: colors.text,
                    }}
                    placeholder="Adresse complète de livraison"
                    required
                  />
                </div>
              </Field>
            </div>
          </ModernPanel>

          {/* Section upload */}
          <ModernPanel
            icon={<FileImage size={20} />}
            title="Ordonnance ou photo"
            subtitle="Ajoutez une image si la commande nécessite une preuve visuelle."
            color={colors.secondary || colors.primary}
          >
            {!prescriptionPreview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full min-h-[150px] rounded-[1.5rem] border-2 border-dashed bg-gray-50 hover:bg-gray-100 transition flex flex-col items-center justify-center text-center p-6"
                style={{ borderColor: colors.primary + '35' }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: colors.primary + '15',
                    color: colors.primary,
                  }}
                >
                  <Camera size={26} />
                </div>

                <p className="font-semibold" style={{ color: colors.text }}>
                  Ajouter une photo
                </p>

                <p className="text-sm mt-1 max-w-sm" style={{ color: colors.text + '70' }}>
                  Ordonnance, boîte de médicament, liste écrite ou capture.
                  PNG, JPG, JPEG — Max 5MB.
                </p>
              </button>
            ) : (
              <div className="relative overflow-hidden rounded-[1.5rem] border bg-gray-50">
                <img
                  src={prescriptionPreview}
                  alt="Prescription"
                  className="w-full max-h-[320px] object-cover"
                />

                <button
                  type="button"
                  onClick={removePrescription}
                  className="absolute top-3 right-3 w-10 h-10 rounded-2xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition shadow-lg"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </ModernPanel>

          {/* Section articles */}
          <ModernPanel
            icon={<ShoppingBag size={20} />}
            title="Articles"
            subtitle="Ajoutez les éléments de la commande pour obtenir un total estimé."
            color={colors.primary}
          >
            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div
                  key={index}
                  className="rounded-[1.5rem] bg-gray-50 border p-3 md:p-4"
                  style={{ borderColor: colors.border || '#e5e0d8' }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_100px_130px_90px_40px] gap-3 md:items-center">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border outline-none text-sm bg-white"
                      style={{
                        borderColor: colors.border || '#e5e0d8',
                        color: colors.text,
                      }}
                      placeholder="Nom de l'article"
                    />

                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, 'quantity', parseInt(e.target.value) || 0)
                      }
                      className="w-full px-4 py-3 rounded-2xl border outline-none text-sm bg-white"
                      style={{
                        borderColor: colors.border || '#e5e0d8',
                        color: colors.text,
                      }}
                      placeholder="Qté"
                      min="1"
                    />

                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) =>
                        updateItem(index, 'price', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-4 py-3 rounded-2xl border outline-none text-sm bg-white"
                      style={{
                        borderColor: colors.border || '#e5e0d8',
                        color: colors.text,
                      }}
                      placeholder="Prix"
                      min="0"
                    />

                    <div className="text-left md:text-right">
                      <p className="text-[11px] uppercase tracking-wide text-gray-400">
                        Total
                      </p>
                      <p className="font-bold" style={{ color: colors.primary }}>
                        {(item.quantity * item.price).toLocaleString()} F
                      </p>
                    </div>

                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-10 h-10 rounded-xl text-red-500 hover:bg-red-50 flex items-center justify-center transition"
                      >
                        <Trash2 size={17} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItem}
              className="mt-4 inline-flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm transition hover:opacity-90"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <Plus size={17} />
              Ajouter un article
            </button>
          </ModernPanel>
        </div>

        {/* RÉSUMÉ */}
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
              label="Type de commande"
              value={
                <span className="flex items-center gap-1.5">
                  {orderType === 'subscription' ? (
                    <>
                      <Package size={14} />
                      Avec abonnement
                    </>
                  ) : (
                    <>
                      <CreditCard size={14} />
                      Ponctuelle
                    </>
                  )}
                </span>
              }
            />

            <SummaryLine
              label={beneficiaryLabel}
              value={
                selectedPatient
                  ? `${selectedPatient.first_name} ${selectedPatient.last_name}`
                  : `Sans ${beneficiaryLabel.toLowerCase()}`
              }
            />

            <SummaryLine
              label="Type"
              value={TYPE_LABELS[formData.type] || formData.type}
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
                      ? `${remainingOrders} commande(s)`
                      : `${getPonctualPrice().toLocaleString()} FCFA`}
                  </p>
                </div>
                {orderType === 'subscription' ? (
                  <Package size={28} style={{ color: colors.primary }} />
                ) : (
                  <Wallet size={28} style={{ color: colors.primary }} />
                )}
              </div>
              {orderType === 'subscription' && !canUseSubscription() && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Vous n'avez plus de commandes disponibles dans votre abonnement
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
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                onClick
