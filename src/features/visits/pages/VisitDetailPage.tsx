// 📁 src/features/visits/pages/VisitDetailPage.tsx
 
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  Play,
  Edit2,
  Phone,
  Mail,
  Heart,
  Baby,
  AlertCircle,
  Camera,
  Image,
  Mic,
  MicOff,
  Trash2,
  Loader2,
} from 'lucide-react';

import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { 
  formatDate, 
  formatTime, 
  formatDateTime,
  getVisitDisplayName,
  getVisitDisplayAddress,
  getVisitDisplayCategory,
  getVisitDisplayType,
  getVisitDisplayAidant
} from '@/utils/helpers';
import { VISIT_ACTIONS_SENIOR, VISIT_ACTIONS_MAMAN } from '@/lib/constants';
import { Illustration } from '@/components/ui/Illustration';
import { CompleteVisitModal } from '@/components/visits/CompleteVisitModal';
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
    isLoading
  } = useVisitStore();

  const {
    singular,
    getCategoryLabel,
    isAidant,
    isCoordinator,
    isAdmin,
    isAdminOrCoordinator,
    isFamily,
  } = useTerminology();

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const modalContentRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const availableActions = currentVisit?.patient?.category === 'maman_bebe'
    ? VISIT_ACTIONS_MAMAN
    : VISIT_ACTIONS_SENIOR;

  useEffect(() => {
    if (id) {
      fetchVisitById(id);
    }
  }, [id]);

  useEffect(() => {
    if (!showCompleteModal) {
      setSelectedActions([]);
      setNotes('');
      setAudioUrl(null);
      setAudioBlob(null);
      setPhotos([]);
      setPhotoPreviews([]);
      setIsRecording(false);
    }
  }, [showCompleteModal]);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setAudioChunks([]);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      toast.success('🎙️ Enregistrement démarré');
    } catch (error) {
      console.error('Erreur accès microphone:', error);
      toast.error('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      toast.success('⏹️ Enregistrement arrêté');
    }
  };

  const deleteRecording = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setAudioChunks([]);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    toast.success('🗑️ Enregistrement supprimé');
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/'));

    if (validFiles.length === 0) {
      toast.error('Veuillez sélectionner des images');
      return;
    }

    if (photos.length + validFiles.length > 5) {
      toast.error('Maximum 5 photos');
      return;
    }

    setPhotos([...photos, ...validFiles]);

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    if (selectedActions.length === 0) {
      toast.error('Veuillez sélectionner au moins une action');
      return;
    }

    setIsUploading(true);

    try {
      let audioUrlUploaded = null;
      if (audioBlob) {
        const fileExt = 'webm';
        const fileName = `visits/${id}/audio_${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from('visits')
          .upload(fileName, audioBlob);

        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage
            .from('visits')
            .getPublicUrl(fileName);
          audioUrlUploaded = publicUrl;
        }
      }

      let photoUrls: string[] = [];
      for (const photo of photos) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `visits/${id}/${Date.now()}_${photo.name}`;
        const { data, error } = await supabase.storage
          .from('visits')
          .upload(fileName, photo);

        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage
            .from('visits')
            .getPublicUrl(fileName);
          photoUrls.push(publicUrl);
        }
      }

      await completeVisit(id!, {
        actions: selectedActions,
        notes: notes,
        photos: photoUrls,
      });

      if (audioUrlUploaded) {
        await supabase
          .from('visites')
          .update({
            metadata: {
              audio_url: audioUrlUploaded,
              photos: photoUrls,
              actions: selectedActions,
              notes: notes,
            }
          })
          .eq('id', id);
      }

      toast.success('Visite terminée avec succès ! En attente de validation.');
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
    const colors: Record<string, string> = {
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
    };
    return colors[status] || '#9E9E9E';
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
      attente_paiement: '💳 En attente paiement',
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planifiee': return <Calendar size={20} />;
      case 'en_attente': return <Clock size={20} />;
      case 'acceptee': return <CheckCircle size={20} />;
      case 'en_cours': return <Play size={20} />;
      case 'terminee': return <CheckCircle size={20} />;
      case 'validee': return <CheckCircle size={20} />;
      case 'annulee': return <XCircle size={20} />;
      case 'refusee': return <XCircle size={20} />;
      case 'expire': return <AlertCircle size={20} />;
      case 'attente_paiement': return <Clock size={20} />;
      default: return <Clock size={20} />;
    }
  };

  if (isLoading || !currentVisit) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: colors.text }}>Chargement...</p>
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

  return (
    <div className="space-y-6 pb-24 sm:pb-10">
      {/* EN-TÊTE */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
          >
            <ArrowLeft size={24} style={{ color: colors.text }} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate" style={{ color: colors.text }}>
              Visite du {formatDate(visit.scheduled_date)}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span
                className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5"
                style={{
                  background: getStatusColor(visit.status) + '20',
                  color: getStatusColor(visit.status),
                }}
              >
                {getStatusIcon(visit.status)}
                <span>{getStatusLabel(visit.status)}</span>
              </span>
              {visit.is_urgent && (
                <span
                  className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5"
                  style={{ background: '#F44336' + '20', color: '#F44336' }}
                >
                  <AlertCircle size={14} />
                  <span>Urgent</span>
                </span>
              )}
              <span className="text-xs" style={{ color: colors.text + '60' }}>
                #{visit.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        {/* ACTIONS SELON LE STATUT ET LE RÔLE */}
        <div className="flex flex-wrap gap-2">
          {/* AIDANT : Approuver/Refuser */}
          {isPendingApproval && isAidant && (
            <>
              <button
                onClick={handleApprove}
                disabled={isUpdating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition hover:opacity-80 disabled:opacity-50"
                style={{ background: '#4CAF50' }}
              >
                <CheckCircle size={18} />
                <span>Approuver</span>
              </button>
              <button
                onClick={handleRefuse}
                disabled={isUpdating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition hover:opacity-80 disabled:opacity-50"
                style={{ background: '#F44336' }}
              >
                <XCircle size={18} />
                <span>Refuser</span>
              </button>
            </>
          )}

          {/* AIDANT : Démarrer une visite acceptée */}
          {isAccepted && isAidant && (
            <button
              onClick={handleStart}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition hover:opacity-80 disabled:opacity-50"
              style={{ background: '#4CAF50' }}
            >
              <Play size={18} />
              <span>Démarrer</span>
            </button>
          )}

          {/* AIDANT : Terminer une visite en cours */}
          {isInProgress && isAidant && (
            <button
              onClick={() => setShowCompleteModal(true)}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition hover:opacity-80 disabled:opacity-50"
              style={{ background: '#2196F3' }}
            >
              <CheckCircle size={18} />
              <span>Terminer</span>
            </button>
          )}

          {/* ADMIN/FAMILLE : Annuler (si planifiée ou en attente) */}
          {(isPendingApproval || isAccepted) && (isAdminOrCoordinator || isFamily) && (
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition hover:opacity-80 disabled:opacity-50"
              style={{ background: '#F44336' }}
            >
              <XCircle size={18} />
              <span>Annuler</span>
            </button>
          )}

          {/* ADMIN : Valider une visite terminée */}
          {isCompleted && isAdminOrCoordinator && (
            <button
              onClick={async () => {
                try {
                  await supabase.from('visites').update({ status: 'validee' }).eq('id', id);
                  toast.success('Visite validée');
                  fetchVisitById(id!);
                } catch (error: any) {
                  toast.error(error.message || 'Erreur lors de la validation');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition hover:opacity-80"
              style={{ background: '#9C27B0' }}
            >
              <CheckCircle size={18} />
              <span>Valider</span>
            </button>
          )}

          {/* ADMIN : Réassigner une visite expirée ou refusée */}
          {(isExpired || isRefused) && isAdminOrCoordinator && (
            <button
              onClick={() => {
                const newAidantId = prompt('ID du nouvel aidant :');
                if (!newAidantId) return;
                toast('Réassignation à implémenter', { icon: 'ℹ️' });
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition hover:opacity-80"
              style={{ background: '#FF5722' }}
            >
              <AlertCircle size={18} />
              <span>Réassigner</span>
            </button>
          )}
        </div>
      </div>

      {/* INFORMATIONS PRINCIPALES - ✅ CORRIGÉ AVEC getVisitDisplayName */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard
          icon={<User size={18} />}
          label={getVisitDisplayType(visit)}
          value={getVisitDisplayName(visit)}
          sub={getVisitDisplayCategory(visit)}
          color={colors.text}
        />
        <InfoCard
          icon={<Calendar size={18} />}
          label="Date & Heure"
          value={formatDate(visit.scheduled_date)}
          sub={`${visit.scheduled_time} (${visit.duration_minutes} min)`}
          color={colors.text}
        />
        <InfoCard
          icon={<User size={18} />}
          label="Aidant"
          value={getVisitDisplayAidant(visit)}
          sub={visit.aidant ? `${visit.aidant.rating || 0} ⭐ • ${visit.aidant.total_missions || 0} missions` : 'En attente'}
          color={visit.aidant ? colors.text : colors.text + '40'}
        />
        <InfoCard
          icon={<Clock size={18} />}
          label="Statut"
          value={getStatusLabel(visit.status)}
          sub={visit.start_time ? `Début: ${formatTime(visit.start_time)}` : 'Non démarrée'}
          color={getStatusColor(visit.status)}
        />
      </div>

      {/* ADRESSE - ✅ CORRIGÉ AVEC getVisitDisplayAddress */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
          <MapPin size={20} />
          Adresse
        </h3>
        <p style={{ color: colors.text + '80' }}>{getVisitDisplayAddress(visit)}</p>
        {visit.patient?.phone && (
          <p className="mt-2 text-sm flex items-center gap-2" style={{ color: colors.text + '60' }}>
            <Phone size={14} />
            {visit.patient.phone}
          </p>
        )}
      </div>

      {/* ACTIONS RÉALISÉES */}
      {visit.actions && visit.actions.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
            <CheckCircle size={20} style={{ color: '#4CAF50' }} />
            Actions réalisées
          </h3>
          <div className="flex flex-wrap gap-2">
            {visit.actions.map((action, index) => (
              <span
                key={index}
                className="px-3 py-1 rounded-full text-sm"
                style={{ background: colors.primary + '15', color: colors.primary }}
              >
                {action}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* NOTES */}
      {visit.notes && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
            <Edit2 size={20} />
            Notes
          </h3>
          <p style={{ color: colors.text + '80' }}>{visit.notes}</p>
        </div>
      )}

      {/* PHOTOS */}
      {visit.photos && visit.photos.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
            <Image size={20} />
            Photos
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {visit.photos.map((photo: any, index: number) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden border cursor-pointer"
                style={{ borderColor: colors.border }}
                onClick={() => window.open(photo.photo_url || photo, '_blank')}
              >
                <img
                  src={photo.photo_url || photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/50">
                    <p className="text-white text-xs truncate">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RAPPORT */}
      {visit.report && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
          <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: colors.text }}>
            <Edit2 size={20} />
            Rapport
          </h3>
          <p style={{ color: colors.text + '80' }}>{visit.report}</p>
        </div>
      )}

      {/* MODAL COMPLETE VISIT */}
      {showCompleteModal && (
        <CompleteVisitModal
          isOpen={true}
          onClose={() => {
            setShowCompleteModal(false);
          }}
          visit={{ patient: visit.patient }}
          patientCategory={visit.patient?.category || 'senior'}
          onSubmit={handleComplete}
          isLoading={isUploading}
        />
      )}
    </div>
  );
};

// SOUS-COMPOSANTS
interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

const InfoCard = ({ icon, label, value, sub, color }: InfoCardProps) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text, #6b7280)' + '60' }}>
      {icon}
      {label}
    </div>
    <p className="font-semibold mt-1" style={{ color: color || 'var(--color-text, #2d2d2d)' }}>
      {value}
    </p>
    {sub && (
      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text, #6b7280)' + '50' }}>
        {sub}
      </p>
    )}
  </div>
);

export default VisitDetailPage;
