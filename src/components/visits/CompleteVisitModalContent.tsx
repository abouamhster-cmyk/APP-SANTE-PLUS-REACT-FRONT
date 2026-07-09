// 📁 src/components/visits/CompleteVisitModalContent.tsx
 
import { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Mic, 
  MicOff, 
  Play, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  X
} from 'lucide-react';
import { getThemeColors } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { VISIT_ACTIONS_SENIOR, VISIT_ACTIONS_MAMAN } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface CompleteVisitModalContentProps {
  visit: any;
  visitId: string;
  patientCategory: 'senior' | 'maman_bebe';
  onSubmit: (data: {
    actions: string[];
    notes: string;
    audio_url?: string;
    photos: string[];
  }) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export const CompleteVisitModalContent = ({
  visit,
  visitId,
  patientCategory,
  onSubmit,
  onCancel,
  isLoading: externalLoading,
}: CompleteVisitModalContentProps) => {
  const { isFamily, isAidant } = useTerminology();

  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // ✅ VARIABLE DE CHARGEMENT UNIFIÉE
  const isLoadingState = externalLoading || isUploading;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const colors = getThemeColors('senior');

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      photoPreviews.forEach(preview => {
        if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
      });
    };
  }, []);

  const availableActions = patientCategory === 'maman_bebe' 
    ? VISIT_ACTIONS_MAMAN 
    : VISIT_ACTIONS_SENIOR;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
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
      toast.error('Impossible d\'accéder au microphone.');
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
    toast.success('🗑️ Enregistrement supprimé');
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/'));

    if (photos.length + validFiles.length > 5) {
      toast.error('Maximum 5 photos');
      return;
    }

    setPhotos([...photos, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreviews(prev => [...prev, e.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (selectedActions.length === 0) {
      toast.error('Veuillez sélectionner au moins une action réalisée');
      return;
    }

    if (!visitId) {
      toast.error('❌ Identifiant de la visite introuvable.');
      return;
    }

    setIsUploading(true);
    try {
      let audioUrlUploaded = undefined;
      if (audioBlob) {
        const fileName = `visits/${visitId}/audio_${Date.now()}.webm`;
        const { data, error } = await supabase.storage.from('visits').upload(fileName, audioBlob);

        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage.from('visits').getPublicUrl(fileName);
          audioUrlUploaded = publicUrl;
        }
      }

      const photoUrls: string[] = [];
      for (const photo of photos) {
        const fileName = `visits/${visitId}/${Date.now()}_${photo.name}`;
        const { data, error } = await supabase.storage.from('visits').upload(fileName, photo);

        if (!error && data) {
          const { data: { publicUrl } } = supabase.storage.from('visits').getPublicUrl(fileName);
          photoUrls.push(publicUrl);
        }
      }

      await onSubmit({
        actions: selectedActions,
        notes: notes.trim(),
        audio_url: audioUrlUploaded,
        photos: photoUrls,
      });

    } catch (error) {
      console.error('Erreur soumission:', error);
      toast.error('Erreur lors de l\'envoi du rapport');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-5 pb-4">
      {/* 1. ACTIONS */}
      <div>
        <label className="block text-sm font-bold mb-2" style={{ color: colors.text }}>
          Actions réalisées *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {availableActions.map((action) => (
            <label
              key={action.id}
              className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
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
      </div>

      {/* 2. NOTES */}
      <div>
        <label className="block text-sm font-bold mb-1.5" style={{ color: colors.text }}>
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl border outline-none transition focus:ring-2 resize-none text-sm"
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
        <label className="block text-sm font-bold mb-2" style={{ color: colors.text }}>
          Enregistrement audio
          <span className="text-xs ml-2" style={{ color: colors.text + '40' }}>(optionnel)</span>
        </label>
        <div className="p-4 rounded-2xl border" style={{ borderColor: colors.border }}>
          {!audioUrl ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                    isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-100'
                  }`}
                >
                  {isRecording ? <div className="w-4 h-4 bg-white rounded-full" /> : <Mic size={24} className="text-gray-500" />}
                </div>
                <div>
                  <p className="font-medium" style={{ color: colors.text }}>{isRecording ? 'Enregistrement...' : 'Cliquez pour enregistrer'}</p>
                </div>
              </div>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`px-4 py-2 rounded-xl text-white font-medium transition ${isRecording ? 'bg-red-500' : 'bg-[--color-primary]'}`}
              >
                {isRecording ? 'Arrêter' : 'Enregistrer'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <audio ref={audioRef} controls src={audioUrl} className="h-10" />
              <button onClick={deleteRecording} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={20} /></button>
            </div>
          )}
        </div>
      </div>

      {/* 4. PHOTOS */}
      <div>
        <label className="block text-sm font-bold mb-2" style={{ color: colors.text }}>
          Photos (Max 5)
        </label>
        <div className="flex flex-wrap gap-3">
          {photoPreviews.map((preview, index) => (
            <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border">
              <img src={preview} alt="Preuve" className="w-full h-full object-cover" />
              <button onClick={() => removePhoto(index)} className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"><X size={14} /></button>
            </div>
          ))}
          {photos.length < 5 && (
            <label className="w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
              <Camera size={24} className="text-gray-400" />
              <input type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* BOUTONS */}
      <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl font-medium border transition hover:bg-gray-50"
          style={{ borderColor: colors.border, color: colors.text }}
          disabled={isLoadingState}
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoadingState || selectedActions.length === 0}
          className="flex-1 py-3 rounded-xl text-white font-bold transition hover:opacity-80 flex items-center justify-center gap-2"
          style={{ background: isLoadingState || selectedActions.length === 0 ? '#9CA3AF' : colors.primary }}
        >
          {isLoadingState ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
          {isLoadingState ? 'Envoi...' : 'Terminer'}
        </button>
      </div>
    </div>
  );
};
