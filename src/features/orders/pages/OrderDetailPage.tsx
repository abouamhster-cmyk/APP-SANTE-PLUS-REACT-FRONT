// 📁 src/features/orders/pages/OrderDetailPage.tsx
// 📌 Détails d'une commande - Cycle de vie simplifié

import { useEffect, useState } from 'react';
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
} from 'lucide-react';

import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatCurrency, formatDateTime } from '@/utils/helpers';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { profile, role } = useAuthStore();
  const { currentOrder, fetchOrderById, updateOrderStatus, isLoading } = useOrderStore();

  // ✅ Jargon dynamique selon le rôle
  const {
    singular,
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [isUpdating, setIsUpdating] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    if (id) fetchOrderById(id);
  }, [id]);

  // ✅ Cycle de vie simplifié - Statuts
  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      creee: '#9E9E9E',      // Gris - Créée
      en_cours: '#FF9800',   // Orange - En cours
      livree: '#2196F3',     // Bleu - Livrée
      validee: '#4CAF50',    // Vert - Validée
      annulee: '#F44336',    // Rouge - Annulée
    };
    return map[status] || '#9E9E9E';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      creee: '📝 Créée',
      en_cours: '🔄 En cours',
      livree: '📦 Livrée',
      validee: '✅ Validée',
      annulee: '❌ Annulée',
    };
    return map[status] || status;
  };

  // ✅ Actions simplifiées
  const handleStatusChange = async (status: string) => {
    if (!id) return;

    setIsUpdating(true);

    try {
      await updateOrderStatus(id, status as any);
      toast.success(`Commande ${getStatusLabel(status)}`);
      fetchOrderById(id);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsUpdating(false);
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

      // ✅ Passer directement à livree
      await updateOrderStatus(id, 'livree');

      await supabase
        .from('commandes')
        .update({ proof_url: publicUrl })
        .eq('id', id);

      toast.success('Livraison confirmée avec preuve');

      setShowProofModal(false);
      setProofFile(null);
      setProofPreview(null);

      fetchOrderById(id);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'upload de la preuve");
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

  if (isLoading || !currentOrder) {
    return (
      <div className="min-h-[420px] flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{
              borderColor: colors.primary,
              borderTopColor: 'transparent',
            }}
          />
          <p style={{ color: colors.text }}>Chargement...</p>
        </div>
      </div>
    );
  }

  const order = currentOrder;
  const statusColor = getStatusColor(order.status);

  // ✅ Libellé dynamique pour le bénéficiaire
  const beneficiaryLabel = isFamily ? 'Proche' : isAidant ? 'Personne accompagnée' : 'Bénéficiaire';

  // ✅ Vérifier si l'utilisateur peut agir
  const canAccept = order.status === 'creee' && (isAidant || isAdminOrCoordinator);
  const canDeliver = order.status === 'en_cours' && (isAidant || isAdminOrCoordinator);
  const canCancel = (order.status === 'creee' || order.status === 'en_cours') && isAdminOrCoordinator;

  return (
    <div className="space-y-5 pb-10">
      {/* HEADER */}
      <div className="bg-white rounded-[1.75rem] p-5 shadow-sm border border-black/5">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-2xl border flex items-center justify-center hover:bg-gray-50 shrink-0"
            style={{
              borderColor: colors.border || '#e5e0d8',
              color: colors.text,
            }}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2"
              style={{
                background: statusColor + '15',
                color: statusColor,
              }}
            >
              <Clock size={14} />
              {getStatusLabel(order.status)}
            </div>

            <h1
              className="text-xl md:text-2xl font-black leading-tight break-words"
              style={{ color: colors.text }}
            >
              {order.description || 'Détail de commande'}
            </h1>

            <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
              #{order.id.slice(0, 8)} • {formatDateTime(order.created_at)}
            </p>
          </div>
        </div>

        {/* ✅ ACTIONS SIMPLIFIÉES */}
        <div className="mt-4 flex flex-wrap gap-2">
          {/* 📝 Créée → Accepter (passe en cours) */}
          {canAccept && (
            <ActionButton
              label="Accepter"
              color="#4CAF50"
              icon={<Play size={17} />}
              disabled={isUpdating}
              onClick={() => handleStatusChange('en_cours')}
            />
          )}

          {/* 🔄 En cours → Livrer (passe en livrée) */}
          {canDeliver && (
            <ActionButton
              label="Livrer"
              color="#2196F3"
              icon={<Truck size={17} />}
              disabled={isUpdating}
              onClick={() => setShowProofModal(true)}
            />
          )}

          {/* ❌ Annuler */}
          {canCancel && (
            <ActionButton
              label="Annuler"
              color="#F44336"
              icon={<XCircle size={17} />}
              disabled={isUpdating}
              onClick={() => handleStatusChange('annulee')}
            />
          )}

          {/* ✅ Validée - afficher un badge */}
          {order.status === 'validee' && (
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-green-600 font-bold text-sm bg-green-50 border border-green-200">
              <CheckCircle size={17} />
              Validée automatiquement
            </span>
          )}
        </div>
      </div>

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
          color={colors.secondary || colors.primary}
        />

        <MiniCard
          icon={<Clock size={20} />}
          label="Statut"
          value={getStatusLabel(order.status)}
          color={statusColor}
        />
      </div>

      {/* PERSONNES */}
      <div className="bg-white rounded-[1.75rem] p-5 shadow-sm border border-black/5">
        <h2 className="font-black mb-4" style={{ color: colors.text }}>
          Personnes concernées
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PersonBox
            icon={<User size={18} />}
            title={beneficiaryLabel}
            name={
              order.patient
                ? `${order.patient.first_name} ${order.patient.last_name}`
                : 'Non spécifié'
            }
            detail={order.patient?.phone || 'Aucun téléphone'}
          />

          <PersonBox
            icon={<Users size={18} />}
            title="Famille"
            name={order.family?.full_name || 'Non spécifiée'}
            detail={order.family?.email || 'Aucun email'}
          />

          <PersonBox
            icon={<User size={18} />}
            title="Aidant"
            name={order.aidant?.user?.full_name || 'Non assigné'}
            detail={
              order.aidant
                ? `${order.aidant.rating || 0} ⭐ • ${order.aidant.total_missions || 0} missions`
                : 'En attente'
            }
          />
        </div>
      </div>

      {/* ARTICLES */}
      {order.items && order.items.length > 0 && (
        <div className="bg-white rounded-[1.75rem] p-5 shadow-sm border border-black/5">
          <h2 className="font-black mb-4" style={{ color: colors.text }}>
            Articles
          </h2>

          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-3"
              >
                <div>
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    Qté : {item.quantity}
                  </p>
                </div>

                <p className="font-black" style={{ color: colors.primary }}>
                  {formatCurrency(item.total || item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DOCUMENTS */}
      {(order.prescription_url || order.proof_url) && (
        <div className="bg-white rounded-[1.75rem] p-5 shadow-sm border border-black/5">
          <h2 className="font-black mb-4" style={{ color: colors.text }}>
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

      {/* ✅ SUIVI SIMPLIFIÉ (3 étapes) */}
      <div className="bg-white rounded-[1.75rem] p-5 shadow-sm border border-black/5">
        <h2 className="font-black mb-4" style={{ color: colors.text }}>
          Suivi de la commande
        </h2>

        <div className="flex flex-wrap gap-2">
          {['creee', 'en_cours', 'livree', 'validee'].map((status) => {
            const statusIndex = ['creee', 'en_cours', 'livree', 'validee'].indexOf(status);
            const currentIndex = ['creee', 'en_cours', 'livree', 'validee'].indexOf(order.status);
            const isDone = currentIndex >= statusIndex;
            const isCurrent = order.status === status;

            // Si la commande est annulée, on n'affiche pas la suite
            if (order.status === 'annulee') {
              return (
                <span
                  key={status}
                  className="px-3 py-2 rounded-full text-xs font-semibold bg-red-100 text-red-600 border border-red-200"
                >
                  ❌ Annulée
                </span>
              );
            }

            return (
              <span
                key={status}
                className={`px-3 py-2 rounded-full text-xs font-semibold transition-all ${
                  isDone
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-400'
                } ${isCurrent ? 'ring-2 ring-offset-2' : ''}`}
                style={{
                  background: isDone ? colors.primary : '#f3f4f6',
                  color: isDone ? 'white' : '#9ca3af',
                }}
              >
                {isDone ? '✅' : '○'} {getStatusLabel(status)}
              </span>
            );
          })}
        </div>

        {/* ✅ Barre de progression */}
        {order.status !== 'annulee' && order.status !== 'validee' && (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              {['creee', 'en_cours', 'livree'].map((status, index) => {
                const statusIndex = ['creee', 'en_cours', 'livree'].indexOf(status);
                const currentIndex = ['creee', 'en_cours', 'livree'].indexOf(order.status);
                const isDone = currentIndex >= statusIndex;

                return (
                  <div key={status} className="flex items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isDone ? 'text-white' : 'bg-gray-200 text-gray-400'
                      }`}
                      style={{ background: isDone ? colors.primary : '#e5e7eb' }}
                    >
                      {isDone ? <CheckCircle size={16} /> : index + 1}
                    </div>
                    {index < 2 && (
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
            <div className="flex justify-between mt-1 text-xs text-gray-400">
              <span>Créée</span>
              <span>En cours</span>
              <span>Livrée</span>
            </div>
          </div>
        )}

        <p className="text-sm mt-4 text-gray-500">
          Dernière mise à jour : {formatDateTime(order.updated_at)}
        </p>

        {/* ✅ Info validation automatique */}
        {order.status === 'livree' && (
          <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700 flex items-center gap-2">
              <Clock size={18} />
              <span>Cette commande sera automatiquement validée dans 12h.</span>
            </p>
          </div>
        )}

        {/* ✅ Info commande ponctuelle payée */}
        {order.order_type === 'ponctual' && order.is_paid && (
          <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle size={18} />
              <span>Commande ponctuelle - Paiement effectué</span>
            </p>
          </div>
        )}
      </div>

      {/* MODAL PREUVE LIVRAISON */}
      {showProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-5 shadow-2xl">
            <h2 className="text-xl font-black mb-1" style={{ color: colors.text }}>
              Confirmer la livraison
            </h2>

            <p className="text-sm mb-4 text-gray-500">
              Ajoutez une photo comme preuve de livraison.
            </p>

            <div className="relative min-h-[220px] border-2 border-dashed rounded-[1.5rem] p-5 flex items-center justify-center bg-gray-50 overflow-hidden">
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
                    className="absolute top-3 right-3 w-10 h-10 rounded-2xl bg-red-500 text-white flex items-center justify-center"
                  >
                    <XCircle size={20} />
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <Camera size={42} className="mx-auto mb-3" style={{ color: colors.primary }} />
                    <p className="font-semibold" style={{ color: colors.text }}>
                      Sélectionner une photo
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
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
                className="py-3 rounded-2xl font-semibold border hover:bg-gray-50"
                style={{
                  borderColor: colors.border || '#e5e0d8',
                  color: colors.text,
                }}
              >
                Annuler
              </button>

              <button
                onClick={handleProofUpload}
                disabled={!proofFile || isUpdating}
                className="py-3 rounded-2xl text-white font-bold disabled:opacity-50"
                style={{ background: colors.primary }}
              >
                {isUpdating ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
}

const ActionButton = ({ label, icon, color, disabled, onClick }: ActionButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold disabled:opacity-50"
      style={{ background: color }}
    >
      {icon}
      {label}
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
  return (
    <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-black/5 min-w-0">
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: color + '14', color }}
      >
        {icon}
      </div>
      <p className="text-xs text-gray-500">{label}</p>
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
}

const PersonBox = ({ icon, title, name, detail }: PersonBoxProps) => {
  return (
    <div className="rounded-2xl bg-gray-50 p-4 border border-black/5">
      <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
        {icon}
        {title}
      </div>
      <p className="font-bold text-gray-900 break-words">{name}</p>
      <p className="text-sm text-gray-500 mt-1 break-words">{detail}</p>
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
  return (
    <button
      onClick={onClick}
      className="rounded-2xl bg-gray-50 p-4 border border-black/5 text-left hover:bg-gray-100 transition"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: color + '14', color }}
          >
            {icon}
          </div>
          <p className="font-bold text-gray-900">{title}</p>
        </div>
        <Eye size={20} style={{ color }} />
      </div>
    </button>
  );
};

function getStatusIndex(status: string): number {
  const order = ['creee', 'en_cours', 'livree', 'validee'];
  return order.indexOf(status);
}

export default OrderDetailPage;