// 📁 src/components/visits/CompleteVisitModal.tsx
// 📌 Modal de fin de visite

import { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  Mic, 
  MicOff, 
  Image, 
  Play, 
  Pause,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Upload
} from 'lucide-react';
import { getThemeColors } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { VISIT_ACTIONS_SENIOR, VISIT_ACTIONS_MAMAN } from '@/lib/constants';
import toast from 'react-hot-toast';

interface CompleteVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: any;
  patientCategory: 'senior' | 'maman_bebe';
  onSubmit: (data: {
    actions: string[];
    notes: string;
    audio_url?: string;
    photos: string[];
  }) => Promise<void>;
  isLoading: boolean;
}

export const CompleteVisitModal = ({
  isOpen,
  onClose,
  visit,
  patientCategory,
  onSubmit,
  isLoading: externalLoading,
}: CompleteVisitModalProps) => {
  // ✅ Jargon dynamique selon le rôle
  const {
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const colors = getThemeColors('senior');

  // ✅ Libellé dynamique pour le patient
  const getPatientLabel = () => {
    if (isFamily) return 'proche';
    if (isAidant) return 'personne accompagnée';
    if (isAdminOrCoordinator) return 'bénéficiaire';
    return 'patient';
  };

  // ✅ Actions disponibles selon la catégorie
  const availableActions = patientCategory === 'maman_bebe' 
    ? VISIT_ACTIONS_MAMAN 
    : VISIT_ACTIONS_SENIOR;

  // ✅ Réinitialiser le formulaire quand le modal se ferme
  useEffect(() => {
    if (!isOpen) {
      setSelectedActions([]);
      setNotes('');
      setAudioUrl(null);
      setAudioBlob(null);
      setPhotos([]);
      setPhotoPreviews([]);
      setIsRecording(false);
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    }
  }, [isOpen]);

  // ✅ Nettoyer les URLs objets quand le composant est démonté
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      photoPreviews.forEach(preview => {
        if (preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, []);

  // ✅ Enregistrement audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('🎙️ Enregistrement démarré');
    } catch (error) {
      console.error('Erreur accès microphone:', error);
      toast.error('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success('⏹️ Enregistrement arrêté');
    }
  };

  const deleteRecording = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    audioChunksRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    toast.success('🗑️ Enregistrement supprimé');
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

  // ✅ Soumission
  const handleSubmit = async () => {
    if (selectedActions.length === 0) {
      toast.error('Veuillez sélectionner au moins une action réalisée');
      return;
    }

    setIsUploading(true);
    try {
      // ✅ Upload audio si présent
      let audioUrlUploaded = undefined;
      if (audioBlob) {
        // TODO: Upload audio vers Supabase Storage
        audioUrlUploaded = `audio_${Date.now()}`;
        console.log('🎙️ Audio à uploader:', audioBlob.size, 'bytes');
      }

      // ✅ Upload photos
      const photoUrls: string[] = [];
      for (const photo of photos) {
        photoUrls.push(`photo_${Date.now()}_${photo.name}`);
        console.log('📷 Photo à uploader:', photo.name, photo.size, 'bytes');
      }

      await onSubmit({
        actions: selectedActions,
        notes: notes.trim(),
        audio_url: audioUrlUploaded,
        photos: photoUrls,
      });

      // ✅ Réinitialiser après soumission réussie
      setSelectedActions([]);
      setNotes('');
      setAudioUrl(null);
      setAudioBlob(null);
      setPhotos([]);
      setPhotoPreviews([]);

    } catch (error) {
      console.error('Erreur soumission:', error);
      toast.error('Erreur lors de l\'envoi du rapport');
    } finally {
      setIsUploading(false);
    }
  };

  const isLoading = externalLoading || isUploading;

  if (!isOpen) return null;

  // ✅ Libellé dynamique pour le titre du modal
  const getModalTitle = () => {
    const label = getPatientLabel();
    return `✅ Terminer la visite de ${visit?.patient?.first_name || ''} ${visit?.patient?.last_name || ''} (${label})`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b" style={{ borderColor: colors.primary + '20' }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>
              {getModalTitle()}
            </h2>
            <p className="text-sm" style={{ color: colors.text + '60' }}>
              {visit?.patient?.first_name} {visit?.patient?.last_name} • {visit?.scheduled_date}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        {/* CONTENU */}
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

          {/* 3. MODE AUDIO */}
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
                        <Pause size={18} />
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
                      <audio 
                        ref={audioRef} 
                        src={audioUrl} 
                        controls 
                        className="w-full h-10"
                        controlsList="nodownload"
                      />
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
            {audioUrl && (
              <p className="text-xs mt-1" style={{ color: colors.text + '40' }}>
                ✅ Enregistrement prêt à être envoyé
              </p>
            )}
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
                  <img 
                    src={preview} 
                    alt={`Photo ${index + 1}`} 
                    className="w-full h-full object-cover" 
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition shadow-lg"
                    type="button"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
                  <Camera size={24} className="text-gray-400" />
                  <span className="text-xs text-gray-400 mt-1">Ajouter</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {photos.length === 0 && (
              <p className="text-xs mt-1" style={{ color: colors.text + '40' }}>
                📷 Vous pouvez ajouter jusqu'à 5 photos
              </p>
            )}
          </div>

          {/* Info : Statut de la visite */}
          <div className="p-4 rounded-xl" style={{ background: colors.primary + '08' }}>
            <div className="flex items-start gap-3">
              <AlertCircle size={20} style={{ color: colors.primary }} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium" style={{ color: colors.text }}>
                  La visite sera mise en attente de validation
                </p>
                <p className="text-xs" style={{ color: colors.text + '50' }}>
                  Un administrateur devra valider les informations avant que la visite ne soit considérée comme terminée.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-white border-t p-6 flex gap-3" style={{ borderColor: colors.border }}>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-medium border transition hover:bg-gray-50"
            style={{ borderColor: colors.border, color: colors.text }}
            disabled={isLoading}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || selectedActions.length === 0}
            className="flex-1 py-3 rounded-xl text-white font-medium transition hover:opacity-80 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: isLoading || selectedActions.length === 0 ? '#9CA3AF' : colors.primary }}
          >
            {isLoading ? (
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
  );
};

export default CompleteVisitModal;