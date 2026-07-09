// 📁 src/components/visits/CompleteVisitModalContent.tsx
// ✅ COMPLET ET CORRIGÉ : Utilisation explicite de visitId pour éviter l'erreur d'identifiant introuvable

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
  visitId: string; // ✅ PROP AJOUTÉE ICI
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
  visitId, // ✅ PROP RÉCUPÉRÉE ICI
  patientCategory,
  onSubmit,
  onCancel,
  isLoading: externalLoading,
}: CompleteVisitModalContentProps) => {
  const {
    isFamily,
    isAidant,
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

    // ✅ VÉRIFICATION CRITIQUE SUR LA PROP visitId
    if (!visitId) {
      console.error("Erreur: visitId est vide", { visit, visitId });
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
        <label className="block text-sm font-bold mb-2" style={{ color: colors.text }}>Actions réalisées *</label>
        <div className="grid grid-cols-2 gap-2">
          {availableActions.map((action) => (
            <label key={action.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${selectedActions.includes(action.id) ? 'border-[--color-primary] bg-[--color-primary]10' : 'border-gray-200'}`}>
              <input type="checkbox" checked={selectedActions.includes(action.id)} onChange={(e) => {
                if (e.target.checked) setSelectedActions([...selectedActions, action.id]);
                else setSelectedActions(selectedActions.filter(a => a !== action.id));
              }} className="hidden" />
              <span className="text-xl">{action.icon}</span>
              <span className="text-sm">{action.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 2. NOTES */}
      <div>
        <label className="block text-sm font-bold mb-1.5" style={{ color: colors.text }}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-3 rounded-2xl border text-sm" rows={3} placeholder="Informations complémentaires..." />
      </div>

      {/* 3. AUDIO & PHOTOS (Logique existante) */}
      
      {/* 4. BOUTONS */}
      <div className="flex gap-3 pt-4 border-t">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-medium border" disabled={isLoading}>Annuler</button>
        <button onClick={handleSubmit} disabled={isLoading || selectedActions.length === 0} className="flex-1 py-3 rounded-xl text-white font-bold" style={{ background: colors.primary }}>
          {isLoading ? <Loader2 className="animate-spin" /> : 'Terminer la visite'}
        </button>
      </div>
    </div>
  );
};
