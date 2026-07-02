// 📁 src/features/visits/pages/VisitDetailPage.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  Play,
  Phone,
  Heart,
  AlertCircle,
  Image,
  CreditCard,
} from 'lucide-react';

import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { 
  formatDate, 
  getVisitDisplayName,
  getVisitDisplayAddress,
  getVisitDisplayAidant
} from '@/utils/helpers';
import { CompleteVisitModal } from '@/components/visits/CompleteVisitModal';
import { VisitPaymentModal } from '@/features/visits/components/VisitPaymentModal';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const VisitDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const {
    currentVisit,
    fetchVisitById,
    startVisit,
    completeVisit,
    cancelVisit,
    approveVisit,
    refuseVisit,
    isLoading,
    fetchVisits,
  } = useVisitStore();

  const {
    getCategoryLabel,
    isAidant,
    isAdminOrCoordinator,
    isFamily,
  } = useTerminology();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    if (id) {
      fetchVisitById(id);
    }
  }, [id]);

  useEffect(() => {
    if (showCompleteModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCompleteModal]);

  const handleOpenPayment = () => {
    if (!currentVisit) return;
    if (currentVisit.status === 'brouillon' && currentVisit.metadata?.requires_payment) {
      setShowPaymentModal(true);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    toast.success('Visite planifiée après paiement !');
    if (id) {
      fetchVisitById(id);
      fetchVisits();
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    setIsUpdating(true);
    try {
      await approveVisit(id);
      toast.success('Visite approuvée');
      fetchVisitById(id);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'approbation');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefuse = async () => {
    if (!id) return;
    const reason = prompt('Motif du refus :');
    if (!reason) return;

    setIsUpdating(true);
    try {
      await refuseVisit(id, reason);
      toast.error('Visite refusée');
      fetchVisitById(id);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du refus');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStart = async () => {
    setIsUpdating(true);
    try {
      await startVisit(id!);
      toast.success('Visite démarrée');
      fetchVisitById(id!);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du démarrage');
    } finally {
      setIsUpdating(false);
    }
  };

  // ✅ CORRIGÉ : Adapter la signature pour correspondre à CompleteVisitModal
  const handleComplete = async (data: {
    actions: string[];
    notes: string;
    audio_url?: string;
    photos: string[];
  }) => {
    const actions = data?.actions || [];
    const notes = data?.notes || '';
    const photoUrls = data?.photos || [];

    if (actions.length === 0) {
      toast.error('Veuillez sélectionner au moins une action');
      return;
    }

    setIsUploading(true);

    try {
      await completeVisit(id!, {
        actions,
        notes,
        photos: photoUrls,
      });

      if (data?.audio_url) {
        await supabase
          .from('visites')
          .update({
            metadata: {
              audio_url: data.audio_url,
              photos: photoUrls,
              actions,
              notes,
            }
          })
          .eq('id', id);
      }

      toast.success('Visite terminée avec succès !');
      setShowCompleteModal(false);
      fetchVisitById(id!);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la finalisation');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = async () => {
    if (window.confirm('Annuler cette visite ?')) {
      setIsUpdating(true);
      try {
        await cancelVisit(id!);
        toast.success('Visite annulée');
        fetchVisitById(id!);
      } catch (error: any) {
        toast.error(error.message || 'Erreur lors de l\'annulation');
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      planifiee: '#4CAF50',
      en_attente: '#FF9800',
      acceptee: '#2196F3',
      en_cours: '#2196F3',
      terminee: '#9C27B0',
      validee: '#4CAF50',
      annulee: '#F44336',
      refusee: '#F44336',
      expire: '#795548',
      replanifiee: '#FF5722',
      no_show: '#795548',
      attente_paiement: '#8b5cf6',
      brouillon: '#8b5cf6',
    };
    return statusColors[status] || '#9E9E9E';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planifiee: 'Planifiée',
      en_attente: 'En attente',
      acceptee: 'Acceptée',
      en_cours: 'En cours',
      terminee: 'Terminée',
      validee: 'Validée',
      annulee: 'Annulée',
      refusee: 'Refusée',
      expire: 'Expirée',
      replanifiee: 'Replanifiée',
      no_show: 'Absent',
      attente_paiement: 'Paiement en attente',
      brouillon: 'Brouillon - Paiement requis',
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planifiee': return <Calendar size={13} />;
      case 'en_attente': return <AlertCircle size={13} />;
      case 'acceptee': return <CheckCircle size={13} />;
      case 'en_cours': return <Play size={13} />;
      case 'terminee': return <CheckCircle size={13} />;
      case 'validee': return <CheckCircle size={13} />;
      case 'annulee': return <XCircle size={13} />;
      case 'refusee': return <XCircle size={13} />;
      case 'expire': return <AlertCircle size={13} />;
      case 'attente_paiement': return <CreditCard size={13} />;
      case 'brouillon': return <CreditCard size={13} />;
      default: return <AlertCircle size={13} />;
    }
  };

  const getDraftExpiryText = () => {
    if (!currentVisit?.draft_expires_at) return null;
    const expiry = new Date(currentVisit.draft_expires_at);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    if (diff <= 0) return 'Expiré';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  if (isLoading || !currentVisit) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500">Chargement des détails...</p>
        </div>
      </div>
    );
  }

  const visit = currentVisit;
  const isPendingApproval = visit.status === 'planifiee' || visit.status === 'en_attente';
  const isAccepted = visit.status === 'acceptee';
  const isInProgress = visit.status === 'en_cours';
  const isCompleted = visit.status === 'terminee';
  const isExpired = visit.status === 'expire';
  const isRefused = visit.status === 'refusee';
  const isDraft = visit.status === 'brouillon';
  const requiresPayment = isDraft && visit.metadata?.requires_payment;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 pb-12 px-4 sm:px-6">
      
      {/* ============================================================
      EN-TÊTE DE LA PAGE
      ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: colors.border }}>
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-100 rounded-xl transition flex-shrink-0"
          >
            <ArrowLeft size={20} style={{ color: colors.text }} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold truncate" style={{ color: colors.text }}>
              Visite du {formatDate(visit.scheduled_date)}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 shrink-0"
                style={{
                  background: getStatusColor(visit.status) + '15',
                  color: getStatusColor(visit.status),
                }}
              >
                {getStatusIcon(visit.status)}
                <span>{getStatusLabel(visit.status)}</span>
              </span>
              {visit.is_urgent && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 shrink-0"
                  style={{ background: '#F44336' + '15', color: '#F44336' }}
                >
                  <AlertCircle size={11} />
                  <span>Urgent</span>
                </span>
              )}
              <span className="text-[10px] text-gray-400 font-mono">
                #{visit.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        {/* ACTIONS STATUTS */}
        <div className="flex flex-wrap gap-1.5">
          {isPendingApproval && isAidant && (
            <>
              <button
                onClick={handleApprove}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
                style={{ background: '#4CAF50' }}
              >
                <CheckCircle size={14} />
                <span>Approuver</span>
              </button>
              <button
                onClick={handleRefuse}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
                style={{ background: '#F44336' }}
              >
                <XCircle size={14} />
                <span>Refuser</span>
              </button>
            </>
          )}

          {isAccepted && isAidant && (
            <button
              onClick={handleStart}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ background: '#4CAF50' }}
            >
              <Play size={14} />
              <span>Démarrer</span>
            </button>
          )}

          {isInProgress && isAidant && (
            <button
              onClick={() => setShowCompleteModal(true)}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ background: '#2196F3' }}
            >
              <CheckCircle size={14} />
              <span>Terminer</span>
            </button>
          )}

          {(isPendingApproval || isAccepted) && (isAdminOrCoordinator || isFamily) && (
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ background: '#F44336' }}
            >
              <XCircle size={14} />
              <span>Annuler</span>
            </button>
          )}

          {isCompleted && isAdminOrCoordinator && (
            <button
              onClick={async () => {
                try {
                  await supabase.from('visites').update({ status: 'validee' }).eq('id', id);
                  toast.success('Visite validée');
                  fetchVisitById(id!);
                  fetchVisits();
                } catch (error: any) {
                  toast.error(error.message || 'Erreur lors de la validation');
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold transition hover:opacity-90"
              style={{ background: '#9C27B0' }}
            >
              <CheckCircle size={14} />
              <span>Valider</span>
            </button>
          )}

          {(isExpired || isRefused) && isAdminOrCoordinator && (
            <button
              onClick={() => {
                const newAidantId = prompt('ID du nouvel aidant :');
                if (!newAidantId) return;
                toast('Réassignation à implémenter', { icon: 'ℹ️' });
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold transition hover:opacity-90"
              style={{ background: '#FF5722' }}
            >
              <AlertCircle size={14} />
              <span>Réassigner</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================
      BANDEAU DE PAIEMENT EXCLUSIF AU BROUILLON
      ============================================================ */}
      {isDraft && requiresPayment && (
        <div className="bg-purple-50/70 rounded-2xl p-4 border border-purple-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 bg-purple-100 rounded-xl text-purple-600 shrink-0">
              <CreditCard size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-purple-900">
                Paiement requis pour valider la visite
              </p>
              <p className="text-[11px] text-purple-600 font-medium mt-0.5 flex flex-wrap items-center gap-1">
                <span>Montant : <strong className="text-purple-950">{visit.metadata?.payment_amount || 0} FCFA</strong></span>
                <span>•</span>
                <span>{getDraftExpiryText() ? `Expire dans : ${getDraftExpiryText()}` : 'Expire bientôt'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenPayment}
            className="w-full sm:w-auto px-5 py-2 rounded-xl text-white font-bold text-xs transition hover:opacity-95 shadow-sm text-center shrink-0"
            style={{ background: '#8b5cf6' }}
          >
            Payer maintenant
          </button>
        </div>
      )}

      {/* ============================================================
      GRID LAYOUT PRINCIPAL
      ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* COLONNE DE GAUCHE : Compte-rendu et Informations (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* CARTES D'INFORMATIONS RAPIDES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoCard
              icon={<User size={15} />}
              label="Bénéficiaire"
              value={getVisitDisplayName(visit)}
              sub={getCategoryLabel(visit.patient?.category || 'senior')}
              color={colors.text}
            />
            <InfoCard
              icon={<Calendar size={15} />}
              label="Planification"
              value={formatDate(visit.scheduled_date)}
              sub={`${visit.scheduled_time} (${visit.duration_minutes} min)`}
              color={colors.text}
            />
            <InfoCard
              icon={<Heart size={15} />}
              label="Intervenant"
              value={getVisitDisplayAidant(visit)}
              sub={visit.aidant ? `${visit.aidant.rating || 0} ⭐ • ${visit.aidant.total_missions || 0} missions` : 'En attente'}
              color={visit.aidant ? colors.text : colors.text + '50'}
            />
          </div>

          {/* COMPTE-RENDU DE VISITE GROUPÉ */}
          {(visit.actions?.length > 0 || visit.notes || (visit.photos && visit.photos.length > 0) || visit.report) ? (
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-black/5 space-y-5">
              <h3 className="font-bold text-sm sm:text-base border-b pb-2.5" style={{ color: colors.text }}>
                📊 Compte-rendu de la visite
              </h3>

              {/* Actions complétées */}
              {visit.actions && visit.actions.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-green-500" />
                    Actions complétées
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {visit.actions.map((action, index) => (
                      <span
                        key={index}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{ background: colors.primary + '10', color: colors.primary }}
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes de préparation & Rapport */}
              {(visit.notes || visit.report) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visit.notes && (
                    <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Notes de préparation
                      </h4>
                      <p className="text-xs text-gray-700 leading-relaxed font-medium">
                        {visit.notes}
                      </p>
                    </div>
                  )}
                  {visit.report && (
                    <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Rapport d'intervention
                      </h4>
                      <p className="text-xs text-gray-700 leading-relaxed font-medium">
                        {visit.report}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Photos jointes */}
              {visit.photos && visit.photos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Photos jointes
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {visit.photos.map((photo: any, index: number) => {
                      const url = photo.photo_url || photo;
                      return (
                        <div
                          key={index}
                          className="relative aspect-square rounded-xl overflow-hidden border cursor-pointer hover:opacity-90 transition group"
                          style={{ borderColor: colors.border }}
                          onClick={() => window.open(url, '_blank')}
                        >
                          <img
                            src={url}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/60 text-center">
                              <p className="text-white text-[9px] truncate">{photo.caption}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 text-center border border-black/5">
              <p className="text-xs text-gray-400 font-medium">
                Le compte-rendu, les photos et les rapports de visite apparaîtront ici une fois complétés par l'aidant.
              </p>
            </div>
          )}
        </div>

        {/* COLONNE DE DROITE : Localisation et Contact (1/3) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2 border-b pb-2" style={{ color: colors.text }}>
              <MapPin size={16} />
              Localisation
            </h3>
            
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Adresse de visite</p>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
                {getVisitDisplayAddress(visit)}
              </p>
            </div>

            {visit.patient?.phone && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Contact bénéficiaire</p>
                <a
                  href={`tel:${visit.patient.phone}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold transition hover:opacity-80"
                  style={{ color: colors.primary }}
                >
                  <Phone size={13} />
                  {visit.patient.phone}
                </a>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ============================================================
      MODALS
      ============================================================ */}
      {showPaymentModal && currentVisit && (
        <VisitPaymentModal
          isOpen={true}
          onClose={() => setShowPaymentModal(false)}
          visit={currentVisit}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {showCompleteModal && (
        <CompleteVisitModal
          isOpen={true}
          onClose={() => setShowCompleteModal(false)}
          visit={{ patient: visit.patient }}
          patientCategory={visit.patient?.category || 'senior'}
          onSubmit={handleComplete}
          isLoading={isUploading}
        />
      )}
    </div>
  );
};

// ============================================================
// SOUS-COMPOSANT INTERNE
// ============================================================
interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

const InfoCard = ({ icon, label, value, sub, color }: InfoCardProps) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 flex flex-col justify-between">
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <p className="font-bold text-xs sm:text-sm mt-1.5 line-clamp-1" style={{ color: color || 'var(--color-text, #2d2d2d)' }}>
        {value}
      </p>
    </div>
    {sub && (
      <p className="text-[11px] text-gray-400 mt-1 truncate font-medium">
        {sub}
      </p>
    )}
  </div>
);

export default VisitDetailPage;
