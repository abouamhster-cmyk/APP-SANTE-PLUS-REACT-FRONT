// 📁 src/features/visits/pages/VisitDetailPage.tsx
// 📌 Détails d'une visite

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, Clock, MapPin, User, 
  CheckCircle, XCircle, Play, Edit2, Phone, 
  Mail, Heart, Baby, AlertCircle, Camera, Image,
  Mic, MicOff, Trash2, Loader2
} from 'lucide-react';
import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime, formatDateTime } from '@/utils/helpers';
import { VISIT_ACTIONS_SENIOR, VISIT_ACTIONS_MAMAN } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const VisitDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const { currentVisit, fetchVisitById, startVisit, completeVisit, cancelVisit, isLoading } = useVisitStore();

  // ✅ Jargon dynamique selon le rôle
  const {
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
    getCategoryLabel,
    isAidant,
    isCoordinator,
    isAdmin,
    isAdminOrCoordinator,
    isFamily,
  } = useTerminology();

  // ✅ États pour le modal de fin de visite
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

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const fileInputRef = useState<HTMLInputElement | null>(null);
  const audioRef = useState<HTMLAudioElement | null>(null);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ Actions disponibles selon la catégorie du proche
  const availableActions = currentVisit?.patient?.category === 'maman_bebe' 
    ? VISIT_ACTIONS_MAMAN 
    : VISIT_ACTIONS_SENIOR;

  useEffect(() => {
    if (id) {
      fetchVisitById(id);
    }
  }, [id]);

  // ✅ Réinitialiser le formulaire à la fermeture
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

  const handleStart = async () => {
    setIsUpdating(true);
    try {
      await startVisit(id!);
      toast.success('Visite démarrée');
      fetchVisitById(id!);
    } catch (error) {
      toast.error('Erreur lors du démarrage');
    } finally {
      setIsUpdating(false);
    }
  };

  // ✅ Enregistrement audio
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
    } catch (error) {
      console.error('Erreur accès microphone:', error);
      toast.error('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const deleteRecording = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setAudioChunks([]);
  };

  // ✅ Photos
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

  // ✅ Soumission du formulaire de fin de visite
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
      } catch (error) {
        toast.error('Erreur lors de l\'annulation');
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planifiee: '#4CAF50',
      en_cours: '#FF9800',
      terminee: '#2196F3',
      validee: '#9C27B0',
      annulee: '#F44336',
      replanifiee: '#FF5722',
      no_show: '#795548',
    };
    return colors[status] || '#9E9E9E';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planifiee: 'Planifiée',
      en_cours: 'En cours',
      terminee: 'Terminée',
      validee: 'Validée',
      annulee: 'Annulée',
      replanifiee: 'Replanifiée',
      no_show: 'Absent',
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planifiee': return <Calendar size={20} />;
      case 'en_cours': return <Clock size={20} />;
      case 'terminee': return <CheckCircle size={20} />;
      case 'validee': return <CheckCircle size={20} />;
      case 'annulee': return <XCircle size={20} />;
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

  return (
    <div className="space-y-6">
      {/* En-tête */}
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
                className="px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1"
                style={{ 
                  background: getStatusColor(visit.status) + '20',
                  color: getStatusColor(visit.status),
                }}
              >
                {getStatusIcon(visit.status)}
                <span>{getStatusLabel(visit.status)}</span>
              </span>
              {visit.is_urgent && (
                <span className="px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1" style={{ background: '#F44336' + '20', color: '#F44336' }}>
                  <AlertCircle size={14} />
                  <span>⚠️ Urgent</span>
                </span>
              )}
              <span className="text-xs" style={{ color: colors.text + '60' }}>
                #{visit.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions selon le rôle */}
        <div className="flex flex-wrap gap-2">
          {visit.status === 'planifiee' && (isAidant || isAdminOrCoordinator) && (
            <button
              onClick={handleStart}
              disabled={isUpdating}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white font-medium transition hover:opacity-80 disabled:opacity-50"
              style={{ background: '#4CAF50' }}
            >
              <Play size={18} />
              <span>Démarrer</span>
            </button>
          )}
          {visit.status === 'en_cours' && (isAidant || isAdminOrCoordinator) && (
            <button
              onClick={() => setShowCompleteModal(true)}
              disabled={isUpdating}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white font-medium transition hover:opacity-80 disabled:opacity-50"
              style={{ background: '#2196F3' }}
            >
              <CheckCircle size={18} />
              <span>Terminer</span>
            </button>
          )}
          {visit.status === 'planifiee' && isAdminOrCoordinator && (
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white font-medium transition hover:opacity-80 disabled:opacity-50"
              style={{ background: '#F44336' }}
            >
              <XCircle size={18} />
              <span>Annuler</span>
            </button>
          )}
          {visit.status === 'terminee' && isAdminOrCoordinator && (
            <button
              onClick={async () => {
                try {
                  await supabase.from('visites').update({ status: 'validee' }).eq('id', id);
                  toast.success('Visite validée');
                  fetchVisitById(id!);
                } catch (error) {
                  toast.error('Erreur lors de la validation');
                }
              }}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white font-medium transition hover:opacity-80"
              style={{ background: '#9C27B0' }}
            >
              <CheckCircle size={18} />
              <span>Valider</span>
            </button>
          )}
        </div>
      </div>

      {/* Informations principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm" style={{ color: colors.text + '60' }}>
            {isFamily ? 'Proche' : isAidant ? 'Personne accompagnée' : 'Bénéficiaire'}
          </p>
          <p className="font-semibold flex items-center space-x-2" style={{ color: colors.text }}>
            <User size={18} />
            <span>{visit.patient?.first_name} {visit.patient?.last_name}</span>
          </p>
          <p className="text-sm" style={{ color: colors.text + '60' }}>
            {getCategoryLabel(visit.patient?.category || 'senior')}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm" style={{ color: colors.text + '60' }}>Date & Heure</p>
          <p className="font-semibold flex items-center space-x-2" style={{ color: colors.text }}>
            <Calendar size={18} />
            <span>{formatDate(visit.scheduled_date)}</span>
          </p>
          <p className="text-sm" style={{ color: colors.text + '60' }}>
            <Clock size={14} className="inline mr-1" />
            {visit.scheduled_time} ({visit.duration_minutes} min)
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm" style={{ color: colors.text + '60' }}>Aidant</p>
          {visit.aidant ? (
            <div>
              <p className="font-semibold" style={{ color: colors.text }}>
                {visit.aidant.user?.full_name || 'Aidant'}
              </p>
              <p className="text-sm" style={{ color: colors.text + '60' }}>
                ⭐ {visit.aidant.rating || 0} • {visit.aidant.total_missions || 0} missions
              </p>
            </div>
          ) : (
            <p className="text-sm" style={{ color: colors.text + '40' }}>Non assigné</p>
          )}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm" style={{ color: colors.text + '60' }}>Durée</p>
          <p className="font-semibold" style={{ color: colors.text }}>
            {visit.duration_minutes || 60} minutes
          </p>
          {visit.start_time && (
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              Début: {formatTime(visit.start_time)}
            </p>
          )}
          {visit.end_time && (
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              Fin: {formatTime(visit.end_time)}
            </p>
          )}
        </div>
      </div>

      {/* Adresse */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-semibold mb-3 flex items-center space-x-2" style={{ color: colors.text }}>
          <MapPin size={20} />
          <span>📍 Adresse</span>
        </h3>
        <p style={{ color: colors.text + '80' }}>{visit.patient?.address}</p>
        {visit.patient?.phone && (
          <p className="mt-2 text-sm" style={{ color: colors.text + '60' }}>
            📞 {visit.patient.phone}
          </p>
        )}
      </div>

      {/* Actions réalisées */}
      {visit.actions && visit.actions.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold mb-3 flex items-center space-x-2" style={{ color: colors.text }}>
            <CheckCircle size={20} style={{ color: '#4CAF50' }} />
            <span>✅ Actions réalisées</span>
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

      {/* Notes */}
      {visit.notes && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold mb-3 flex items-center space-x-2" style={{ color: colors.text }}>
            <Edit2 size={20} />
            <span>📝 Notes</span>
          </h3>
          <p style={{ color: colors.text + '80' }}>{visit.notes}</p>
        </div>
      )}

      {/* Photos */}
      {visit.photos && visit.photos.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold mb-3 flex items-center space-x-2" style={{ color: colors.text }}>
            <Image size={20} />
            <span>📸 Photos</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {visit.photos.map((photo: any, index: number) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border" style={{ borderColor: colors.border }}>
                <img
                  src={photo.photo_url || photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => window.open(photo.photo_url || photo, '_blank')}
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

      {/* Rapport */}
      {visit.report && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold mb-3 flex items-center space-x-2" style={{ color: colors.text }}>
            <Edit2 size={20} />
            <span>📄 Rapport</span>
          </h3>
          <p style={{ color: colors.text + '80' }}>{visit.report}</p>
        </div>
      )}

      {/* MODAL DE FIN DE VISITE */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b" style={{ borderColor: colors.primary + '20' }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: colors.text }}>
                  ✅ Terminer la visite
                </h2>
                <p className="text-sm" style={{ color: colors.text + '60' }}>
                  {visit.patient?.first_name} {visit.patient?.last_name} • {formatDate(visit.scheduled_date)}
                </p>
              </div>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                disabled={isUploading}
              >
                <XCircle size={24} style={{ color: colors.text }} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 1. ACTIONS RÉALISÉES */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Actions réalisées *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableActions.map((action) => (
                    <label
                      key={action.id}
                      className={`flex items-center space-x-2 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                        selectedActions.includes(action.id)
                          ? 'border-[--color-primary] bg-[--color-primary]10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedActions.includes(action.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedActions([...selectedActions, action.id]);
                          } else {
                            setSelectedActions(selectedActions.filter(a => a !== action.id));
                          }
                        }}
                        className="hidden"
                      />
                      <span className="text-xl">{action.icon}</span>
                      <span className="text-sm" style={{ color: colors.text }}>
                        {action.label}
                      </span>
                    </label>
                  ))}
                </div>
                {selectedActions.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">* Sélectionnez au moins une action</p>
                )}
              </div>

              {/* 2. NOTES */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border outline-none transition focus:ring-2 resize-none text-sm"
                  style={{
                    borderColor: colors.border || '#e5e0d8',
                    background: 'var(--color-background, #f5f0e8)',
                    color: colors.text,
                  }}
                  rows={3}
                  placeholder="Informations complémentaires sur la visite..."
                />
              </div>

              {/* 3. AUDIO */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Enregistrement audio
                  <span className="text-xs ml-2" style={{ color: colors.text + '40' }}>
                    (optionnel - pour les non-francophones)
                  </span>
                </label>
                <div className="p-4 rounded-xl border" style={{ borderColor: colors.border }}>
                  {!audioUrl ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                            isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-200'
                          }`}
                        >
                          {isRecording ? (
                            <div className="w-4 h-4 bg-white rounded-full" />
                          ) : (
                            <Mic size={24} className="text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: colors.text }}>
                            {isRecording ? 'Enregistrement en cours...' : 'Cliquez pour enregistrer'}
                          </p>
                          <p className="text-xs" style={{ color: colors.text + '40' }}>
                            {isRecording ? 'Parlez pour décrire la visite' : 'Max 5 minutes'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`px-4 py-2 rounded-xl text-white font-medium transition ${
                          isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-[--color-primary] hover:opacity-80'
                        }`}
                      >
                        {isRecording ? (
                          <span className="flex items-center gap-2">
                            <MicOff size={18} />
                            Arrêter
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Mic size={18} />
                            Enregistrer
                          </span>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle size={24} className="text-green-500" />
                        </div>
                        <div className="flex-1">
                          <audio controls className="w-full h-10">
                            <source src={audioUrl} type="audio/webm" />
                            Votre navigateur ne supporte pas la lecture audio.
                          </audio>
                        </div>
                      </div>
                      <button
                        onClick={deleteRecording}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. PHOTOS */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Photos
                  <span className="text-xs ml-2" style={{ color: colors.text + '40' }}>
                    (optionnel - {photos.length}/5)
                  </span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border">
                      <img src={preview} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  ))}
                  {photos.length < 5 && (
                    <label className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-gray-50 transition">
                      <Camera size={24} className="text-gray-400" />
                      <input
                        ref={fileInputRef[1]}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t p-6 flex gap-3" style={{ borderColor: colors.border }}>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 py-3 rounded-xl font-medium border transition hover:bg-gray-50"
                style={{ borderColor: colors.border, color: colors.text }}
                disabled={isUploading}
              >
                Annuler
              </button>
              <button
                onClick={handleComplete}
                disabled={isUploading || selectedActions.length === 0}
                className="flex-1 py-3 rounded-xl text-white font-medium transition hover:opacity-80 flex items-center justify-center gap-2"
                style={{ background: colors.primary }}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Terminer la visite
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitDetailPage;