// 📁 src/features/admin/pages/RegistrationDetailsPage.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash2,
  Save,
  X,
  AlertCircle,
  Users,
  Baby,
  Home,
  MapPin,
  CreditCard,
  Award,
  ShieldCheck,
  Loader2,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { InfoRow } from '@/components/ui/InfoRow';
import toast from 'react-hot-toast';

interface Registration {
  id: string;
  user_id: string | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
  } | null;
  patient_data: any;
  offre_id: string | null;
  offre?: {
    id: string;
    name: string;
    price: number;
    category: string;
  } | null;
  status: 'en_attente' | 'validee' | 'refusee' | 'info_requise' | 'en_cours_de_traitement';
  comments: string | null;
  processed_by: string | null;
  processed_at: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

// ✅ Fonctions de statut
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    en_attente: '⏳ En attente',
    validee: '✅ Validée',
    refusee: '❌ Refusée',
    info_requise: 'ℹ️ Info requise',
    en_cours_de_traitement: '🔄 En cours',
  };
  return labels[status] || status;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    en_attente: '#FF9800',
    validee: '#4CAF50',
    refusee: '#F44336',
    info_requise: '#2196F3',
    en_cours_de_traitement: '#9C27B0',
  };
  return colors[status] || '#9E9E9E';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'validee': return <CheckCircle size={20} className="text-green-500" />;
    case 'en_attente': return <Clock size={20} className="text-yellow-500" />;
    case 'refusee': return <XCircle size={20} className="text-red-500" />;
    case 'info_requise': return <AlertCircle size={20} className="text-blue-500" />;
    case 'en_cours_de_traitement': return <Loader2 size={20} className="animate-spin text-purple-500" />;
    default: return <Clock size={20} className="text-gray-400" />;
  }
};

const RegistrationDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processAction, setProcessAction] = useState<'validate' | 'reject' | null>(null);
  const [comment, setComment] = useState('');
  const [editComment, setEditComment] = useState('');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    if (id) {
      fetchRegistration(id);
    }
  }, [id]);

  const fetchRegistration = async (registrationId: string) => {
    try {
      setIsLoading(true);

      const { data: registrationData, error: registrationError } = await supabase
        .from('inscriptions')
        .select('*')
        .eq('id', registrationId)
        .single();

      if (registrationError) throw registrationError;

      let user = null;
      if (registrationData.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, role')
          .eq('id', registrationData.user_id)
          .single();
        user = profileData;
      }

      let offre = null;
      if (registrationData.offre_id) {
        const { data: offreData } = await supabase
          .from('offres')
          .select('id, name, price, category')
          .eq('id', registrationData.offre_id)
          .single();
        offre = offreData;
      }

      setRegistration({
        ...registrationData,
        user,
        offre,
      });

    } catch (error: any) {
      console.error('Fetch registration error:', error);
      toast.error('Erreur lors du chargement de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

 

const handleProcess = async () => {
  if (!registration || !processAction) return;

  setIsProcessing(true);
  try {
    const status = processAction === 'validate' ? 'validee' : 'refusee';
    
    // ✅ Récupérer le token
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      throw new Error('Token manquant');
    }

    console.log('📤 Traitement inscription (détail):', {
      registrationId: registration.id,
      status,
      comments: comment,
    });

    // ✅ Appeler le backend
    const response = await fetch('/api/auth/admin/process-registration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        registrationId: registration.id,
        status,
        comments: comment || null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors du traitement');
    }

    console.log('✅ Réponse backend:', data);

    toast.success(data.message || `Inscription ${status === 'validee' ? 'validée' : 'refusée'} avec succès`);
    
    if (data.email_sent === false) {
      toast.warning('⚠️ L\'email n\'a pas pu être envoyé, mais l\'inscription a été traitée');
    }
    
    setShowProcessModal(false);
    setProcessAction(null);
    setComment('');
    fetchRegistration(registration.id);
    
  } catch (error: any) {
    console.error('❌ Erreur traitement:', error);
    toast.error(error.message || 'Erreur lors du traitement');
  } finally {
    setIsProcessing(false);
  }
};
  
  const handleUpdateComment = async () => {
    if (!registration) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('inscriptions')
        .update({
          comments: editComment || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', registration.id);

      if (error) throw error;

      toast.success('Commentaire mis à jour');
      setShowEditModal(false);
      fetchRegistration(registration.id);
    } catch (error) {
      console.error('Update comment error:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={48} className="animate-spin mx-auto" style={{ color: colors.primary }} />
        <p className="mt-4" style={{ color: colors.text + '60' }}>Chargement...</p>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={48} className="mx-auto mb-4 opacity-30" />
        <h2 className="text-xl font-bold" style={{ color: colors.text }}>
          Inscription non trouvée
        </h2>
        <button
          onClick={() => navigate('/app/registrations')}
          className="mt-4 px-6 py-2 rounded-xl text-white font-bold"
          style={{ background: colors.primary }}
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  const isPending = registration.status === 'en_attente';
  const statusColor = getStatusColor(registration.status);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/app/registrations')}
              className="p-2 hover:bg-gray-100 rounded-xl transition"
            >
              <ArrowLeft size={24} style={{ color: colors.primary }} />
            </button>
            <div>
              <h1 className="text-2xl font-black" style={{ color: colors.text }}>
                📋 Détails de l'inscription
              </h1>
              <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
                #{registration.id.slice(0, 8)} • {registration.user?.full_name || 'Utilisateur inconnu'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {isPending && (
              <>
                <button
                  onClick={() => {
                    setProcessAction('validate');
                    setShowProcessModal(true);
                  }}
                  className="px-4 py-2 rounded-xl text-white font-bold transition hover:opacity-80 flex items-center gap-2"
                  style={{ background: '#4CAF50' }}
                >
                  <ThumbsUp size={18} />
                  Valider
                </button>
                <button
                  onClick={() => {
                    setProcessAction('reject');
                    setShowProcessModal(true);
                  }}
                  className="px-4 py-2 rounded-xl text-white font-bold transition hover:opacity-80 flex items-center gap-2"
                  style={{ background: '#F44336' }}
                >
                  <ThumbsDown size={18} />
                  Refuser
                </button>
              </>
            )}
            <button
              onClick={() => {
                setEditComment(registration.comments || '');
                setShowEditModal(true);
              }}
              className="px-4 py-2 rounded-xl font-medium transition hover:bg-gray-50 flex items-center gap-2 border"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              <Edit size={18} />
              Commentaire
            </button>
          </div>
        </div>
      </section>

      {/* Statut */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: statusColor + '15' }}
          >
            {getStatusIcon(registration.status)}
          </div>
          <div>
            <p className="text-sm" style={{ color: colors.text + '50' }}>Statut actuel</p>
            <p className="text-xl font-bold" style={{ color: statusColor }}>
              {getStatusLabel(registration.status)}
            </p>
          </div>
        </div>
      </section>

      {/* Informations générales */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <h2 className="text-lg font-bold mb-4" style={{ color: colors.text }}>
          👤 Informations générales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="ID" value={registration.id} />
          <InfoRow label="Statut" value={getStatusLabel(registration.status)} color={statusColor} />
          <InfoRow label="Source" value={registration.source || 'Web'} />
          <InfoRow label="Date d'inscription" value={formatDate(registration.created_at)} />
          {registration.processed_at && (
            <InfoRow label="Traitée le" value={formatDate(registration.processed_at)} />
          )}
        </div>
      </section>

      {/* Informations utilisateur */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <h2 className="text-lg font-bold mb-4" style={{ color: colors.text }}>
          👤 Utilisateur
        </h2>
        {registration.user ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="Nom complet" value={registration.user.full_name || 'N/A'} />
            <InfoRow label="Email" value={registration.user.email || 'N/A'} />
            <InfoRow label="Téléphone" value={registration.user.phone || 'N/A'} />
            <InfoRow 
              label="Rôle" 
              value={registration.user.role === 'aidant' ? '🦸 Aidant' : '👨‍👩‍👦 Famille'} 
              highlight 
            />
          </div>
        ) : (
          <p className="text-sm" style={{ color: colors.text + '50' }}>Utilisateur non trouvé</p>
        )}
      </section>

      {/* Informations offre */}
      {registration.offre && (
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
          <h2 className="text-lg font-bold mb-4" style={{ color: colors.text }}>
            📦 Offre choisie
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="Nom" value={registration.offre.name || 'N/A'} />
            <InfoRow label="Prix" value={formatCurrency(registration.offre.price || 0)} />
            <InfoRow label="Catégorie" value={registration.offre.category || 'N/A'} />
          </div>
        </section>
      )}

      {/* Données patient */}
      {registration.patient_data && (
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
          <h2 className="text-lg font-bold mb-4" style={{ color: colors.text }}>
            👤 Données du patient
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(registration.patient_data).map(([key, value]) => (
              <InfoRow 
                key={key} 
                label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                value={String(value || 'N/A')} 
              />
            ))}
          </div>
        </section>
      )}

      {/* Commentaires */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <h2 className="text-lg font-bold mb-4" style={{ color: colors.text }}>
          💬 Commentaires
        </h2>
        {registration.comments ? (
          <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
            <p className="text-sm" style={{ color: colors.text + '70' }}>
              {registration.comments}
            </p>
            {registration.processed_at && (
              <p className="text-xs mt-2" style={{ color: colors.text + '40' }}>
                Ajouté le {formatDate(registration.processed_at)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm" style={{ color: colors.text + '40' }}>
            Aucun commentaire
          </p>
        )}
      </section>

      {/* ============================================ */}
      {/* MODAL DE TRAITEMENT */}
      {/* ============================================ */}
      {showProcessModal && processAction && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowProcessModal(false);
            setProcessAction(null);
            setComment('');
          }}
          title={processAction === 'validate' ? '✅ Valider l\'inscription' : '❌ Refuser l\'inscription'}
          icon={processAction === 'validate' ? <CheckCircle size={24} /> : <XCircle size={24} />}
          maxWidth="md"
          actions={
            <ModalActions
              onCancel={() => {
                setShowProcessModal(false);
                setProcessAction(null);
                setComment('');
              }}
              onConfirm={handleProcess}
              confirmLabel={processAction === 'validate' ? 'Valider' : 'Refuser'}
              isLoading={isProcessing}
              confirmColor={processAction === 'validate' ? '#4CAF50' : '#F44336'}
            />
          }
        >
          <div className="space-y-4">
            <p className="text-center" style={{ color: colors.text }}>
              {processAction === 'validate'
                ? `Confirmez-vous la validation de l'inscription de ${registration.user?.full_name || 'cet utilisateur'} ?`
                : `Confirmez-vous le refus de l'inscription de ${registration.user?.full_name || 'cet utilisateur'} ?`
              }
            </p>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>
                Commentaire (optionnel)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="w-full px-4 py-3 rounded-xl border outline-none text-sm resize-none"
                style={{
                  borderColor: colors.border,
                  background: 'var(--color-background)',
                  color: colors.text,
                }}
                rows={3}
              />
            </div>

            {processAction === 'validate' ? (
              <div className="p-3 rounded-xl" style={{ background: '#4CAF5010', border: '1px solid #4CAF5020' }}>
                <p className="text-sm text-green-600">✅ L'utilisateur recevra une notification de validation par email.</p>
              </div>
            ) : (
              <div className="p-3 rounded-xl" style={{ background: '#F4433610', border: '1px solid #F4433620' }}>
                <p className="text-sm text-red-600">⚠️ L'utilisateur recevra une notification de refus par email.</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ============================================ */}
      {/* MODAL ÉDITION COMMENTAIRE */}
      {/* ============================================ */}
      {showEditModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowEditModal(false)}
          title="✏️ Modifier le commentaire"
          icon={<Edit size={24} />}
          maxWidth="md"
          actions={
            <ModalActions
              onCancel={() => setShowEditModal(false)}
              onConfirm={handleUpdateComment}
              confirmLabel="Enregistrer"
              isLoading={isProcessing}
            />
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: colors.text }}>
                Commentaire
              </label>
              <textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="w-full px-4 py-3 rounded-xl border outline-none text-sm resize-none"
                style={{
                  borderColor: colors.border,
                  background: 'var(--color-background)',
                  color: colors.text,
                }}
                rows={4}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default RegistrationDetailsPage;
