// 📁 frontend/src/features/orders/pages/OrderDetailPage.tsx
// ✅ PAGE DÉTAIL COMMANDE COMPLETE : CAPTURE DU CHECKPOINT GPS DE DEPART ET D'ARRIVÉE DES LIVRAISONS

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
  Image,
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
} from 'lucide-react';

import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { formatCurrency, formatDateTime } from '@/utils/helpers';

import {
  isOrderPendingPayment,
  isOrderPonctual,
  requiresOrderPayment,
} from '@/utils/helpers';

import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// ============================================================
// HELPERS LOCAUX
// ============================================================

const getStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    creee: 'Créée',
    en_attente: 'En attente',
    disponible: 'Disponible (urgent)',
    en_cours: 'En cours',
    livree: 'Livrée',
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

// =============================================
// SOUS-COMPOSANTS
// =============================================

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

interface StatusBadgeProps {
  status: string;
  colors: any;
}

const StatusBadge = ({ status, colors }: StatusBadgeProps) => {
  const getStatusConfig = (status: string) => {
    const map: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
      creee: { 
        icon: <Package size={14} />, 
        color: '#9E9E9E', 
        bg: '#9E9E9E15', 
        label: 'Créée' 
      },
      en_attente: { 
        icon: <Clock size={14} />, 
        color: '#F59E0B', 
        bg: '#F59E0B15', 
        label: 'En attente' 
      },
      disponible: { 
        icon: <AlertCircle size={14} />, 
        color: '#EF4444', 
        bg: '#EF444415', 
        label: 'Disponible' 
      },
      en_cours: { 
        icon: <Clock size={14} />, 
        color: '#3B82F6', 
        bg: '#3B82F615', 
        label: 'En cours' 
      },
      livree: { 
        icon: <Truck size={14} />, 
        color: '#3B82F6', 
        bg: '#3B82F615', 
        label: 'Livrée' 
      },
      validee: { 
        icon: <CheckCircle size={14} />, 
        color: '#4CAF50', 
        bg: '#4CAF5015', 
        label: 'Validée' 
      },
      annulee: { 
        icon: <XCircle size={14} />, 
        color: '#EF4444', 
        bg: '#EF444415', 
        label: 'Annulée' 
      },
      attente_paiement: { 
        icon: <CreditCard size={14} />, 
        color: '#8B5CF6', 
        bg: '#8B5CF615', 
        label: 'En attente paiement' 
      },
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

  const { profile, role } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;
  const { currentOrder, fetchOrderById, updateOrderStatus, takeOrder, isLoading } = useOrderStore();

  const {
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [isUpdating, setIsUpdating] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const isActionPending = useRef(false);

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

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    if (isActionPending.current) return;
    
    isActionPending.current = true;
    setIsUpdating(true);

    try {
      await updateOrderStatus(id, status as any);
      toast.success(`Commande ${getStatusLabel(status)}`);
      await fetchOrderById(id);
    } catch (error: any) {
      console.error('❌ Erreur mise à jour statut:', error);
      toast.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setIsUpdating(false);
      isActionPending.current = false;
    }
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

  // ✅ CAPTURE DU POINT D'ARRIVÉE LORS DE LA LIVRAISON AVEC PREUVE (CHECKPOINT)
  const handleProofUpload = async () => {
    if (!id || !proofFile) {
      toast.error('Veuillez sélectionner une photo');
      return;
    }

    setIsUpdating(true);

    try {
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `proofs/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('orders')
        .upload(fileName, proofFile);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('orders').getPublicUrl(fileName);

      const { completeDelivery } = useOrderStore.getState();
      await completeDelivery(id, publicUrl);

      toast.success('Livraison confirmée avec preuve (GPS enregistré)');

      setShowProofModal(false);
      setProofFile(null);
      setProofPreview(null);

      fetchOrderById(id);
    } catch (error: any) {
      console.error('❌ Erreur upload preuve:', error);
      toast.error(error.message || "Erreur lors de l'upload de la preuve");
    } finally {
      setIsUpdating(false);
    }
  };

  const openUrl = (url: string | null) => {
    if (!url) {
      toast.error('URL non disponible');
      return;
    }
    window.open(url, '_blank');
  };

  const isPendingPayment = currentOrder?.status === 'attente_paiement';
  const isPonctual = isOrderPonctual(currentOrder);
  const isPaid = currentOrder?.is_paid === true;

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

  const order = currentOrder as any;

  const beneficiaryLabel = isFamily ? 'Proche' : 'Destinataire';

  const canTake = (order.status === 'creee' || order.status === 'en_attente' || order.status === 'disponible') && (isAidant || isAdminOrCoordinator);
  const canAccept = order.status === 'creee' && isAdminOrCoordinator;
  
  const canDeliver = order.status === 'en_cours' && (isAidant || isAdminOrCoordinator);
  const canCancel = (order.status === 'creee' || order.status === 'en_attente' || order.status === 'en_cours') && isAdminOrCoordinator;
  const isUrgent = order.status === 'disponible' || order.status === 'en_attente';

  return (
    <div className="space-y-5 pb-10">
      {/* HEADER */}
      <div className="bg-white rounded-[1.75rem] p-5 shadow-sm border" style={{ borderColor: colors.primary + '15' }}>
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-2xl border flex items-center justify-center hover:bg-gray-50 shrink-0"
            style={{
              borderColor: colors.primary + '20',
              color: colors.text,
            }}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="min-w-0 flex-1">
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
              {isPonctual && isPaid && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                  <CheckCircle size={14} />
                  Payée
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
              className="text-xl md:text-2xl font-black leading-tight break-words"
              style={{ color: colors.text }}
            >
              {order.description || 'Détail de commande'}
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
            <ActionButton
              label={order.status === 'disponible' ? 'Prendre (Urgent)' : 'Prendre'}
              color={order.status === 'disponible' ? '#EF4444' : '#F59E0B'}
              icon={order.status === 'disponible' ? <AlertCircle size={17} /> : <Play size={17} />}
              disabled={isUpdating}
              onClick={handleTakeOrder}
              isLoading={isUpdating}
            />
          )}

          {canAccept && (
            <ActionButton
              label="Accepter"
              color="#4CAF50"
              icon={<Play size={17} />}
              disabled={isUpdating}
              onClick={() => handleStatusChange('en_cours')}
              isLoading={isUpdating}
            />
          )}

          {canDeliver && (
            <ActionButton
              label="Livrer"
              color="#3B82F6"
              icon={<Truck size={17} />}
              disabled={isUpdating}
              onClick={() => setShowProofModal(true)}
              isLoading={isUpdating}
            />
          )}

          {canCancel && (
            <ActionButton
              label="Annuler"
              color="#EF4444"
              icon={<XCircle size={17} />}
              disabled={isUpdating}
              onClick={() => handleStatusChange('annulee')}
              isLoading={isUpdating}
            />
          )}

          {order.status === 'validee' && (
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-green-600 font-bold text-sm bg-green-50 border border-green-200">
              <CheckCircle size={17} />
              Validée automatiquement
            </span>
          )}
        </div>
      </div>

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

      {/* RÉSUMÉ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniCard
          icon={<Package size={20} />}
          label="Type"
          value={order.type || 'Non précisé'}
          color={colors.primary}
        />
        <MiniCard
          icon={<Banknote size={20} />}
          label="Montant"
          value={formatCurrency(order.estimated_amount || 0)}
          color={colors.primary}
        />
        <MiniCard
          icon={<MapPin size={20} />}
          label="Adresse"
          value={order.address || 'Non précisée'}
          color={colors.gold || '#c9a84c'}
        />
        <MiniCard
          icon={<Clock size={20} />}
          label="Statut"
          value={getStatusLabel(order.status)}
          color={getStatusColor(order.status)}
        />
      </div>

      {/* BANDEAU PAIEMENT EN ATTENTE */}
      {isPendingPayment && (
        <div 
          className="rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={{ 
            background: colors.primary + '08',
            borderColor: colors.primary + '20',
          }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div 
              className="p-2 rounded-xl shrink-0"
              style={{ 
                background: colors.primary + '15',
                color: colors.primary,
              }}
            >
              <CreditCard size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold" style={{ color: colors.text }}>
                💳 Paiement requis pour finaliser la commande
              </p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: colors.textLight }}>
                Montant : <strong style={{ color: colors.primary }}>{formatCurrency(order.estimated_amount || 0)}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              navigate('/app/billing');
            }}
            className="w-full sm:w-auto px-5 py-2 rounded-xl text-white font-bold text-xs transition hover:opacity-90 shadow-sm text-center shrink-0"
            style={{ background: colors.primary }}
          >
            Payer maintenant
          </button>
        </div>
      )}

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
                icon={<Image size={19} />}
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
              <p className="text-xs text-blue-600">Cette commande sera automatiquement validée dans 12h.</p>
            </div>
          </div>
        )}

        {isPonctual && isPaid && (
          <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200 flex items-start gap-2">
            <CheckCircle size={18} style={{ color: '#4CAF50' }} className="mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-700">Paiement effectué</p>
              <p className="text-xs text-green-600">Commande ponctuelle - Paiement confirmé.</p>
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
            className="bg-white rounded-[2rem] w-full max-w-md p-5 shadow-2xl my-8"
            ref={modalRef}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black" style={{ color: colors.text }}>
                Confirmer la livraison
              </h2>
              <button
                onClick={() => setShowProofModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition"
              >
                <XCircle size={20} />
              </button>
            </div>

            <p className="text-sm mb-4" style={{ color: colors.textLight }}>
              Ajoutez une photo comme preuve de livraison.
            </p>

            <div className="relative min-h-[220px] border-2 border-dashed rounded-[1.5rem] p-5 flex items-center justify-center bg-gray-50 overflow-hidden" style={{ borderColor: colors.primary + '30' }}>
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
                    className="absolute top-3 right-3 w-10 h-10 rounded-2xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition"
                  >
                    <XCircle size={20} />
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: colors.primary + '10' }}>
                      <Camera size={32} style={{ color: colors.primary }} />
                    </div>
                    <p className="font-semibold" style={{ color: colors.text }}>
                      Sélectionner une photo
                    </p>
                    <p className="text-sm mt-1" style={{ color: colors.textLight }}>
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

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                onClick={() => setShowProofModal(false)}
                className="py-3 rounded-2xl font-semibold border hover:bg-gray-50 transition"
                style={{
                  borderColor: colors.primary + '20',
                  color: colors.text,
                }}
              >
                Annuler
              </button>

              <button
                onClick={handleProofUpload}
                disabled={!proofFile || isUpdating}
                className="py-3 rounded-2xl text-white font-bold transition hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: colors.primary }}
              >
                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
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
