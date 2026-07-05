// 📁 src/components/settings/NotificationSoundSelector.tsx

import { useState, useEffect } from 'react';
import { 
  setNotificationSound, 
  NOTIFICATION_SOUNDS, 
  previewNotificationSound,
  getActiveSound,
  saveNotificationSoundPreference 
} from '@/services/notificationService';
import { getThemeColors } from '@/lib/permissions';
import { CheckCircle, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface SoundOption {
  id: string;
  label: string;
  url: string;
  emoji: string;
}

const soundOptions: SoundOption[] = [
  { id: 'default', label: 'Classique', url: NOTIFICATION_SOUNDS.DEFAULT, emoji: '🔔' },
  { id: 'sound1', label: 'Doux', url: NOTIFICATION_SOUNDS.SOUND_1, emoji: '✨' },
  { id: 'sound2', label: 'Moderne', url: NOTIFICATION_SOUNDS.SOUND_2, emoji: '⭐' },
];

export const NotificationSoundSelector = () => {
  const [selectedSound, setSelectedSound] = useState(() => {
    const saved = localStorage.getItem('notification_sound');
    return saved || NOTIFICATION_SOUNDS.SOUND_1;
  });
  
  const colors = getThemeColors('senior');

  useEffect(() => {
    // Charger le son actif
    const active = getActiveSound();
    setSelectedSound(active);
  }, []);

  const handleSelect = async (url: string) => {
    setSelectedSound(url);
    setNotificationSound(url);
    
    // ✅ Sauvegarder dans le backend
    try {
      await saveNotificationSoundPreference(url);
      toast.success('🔔 Son de notification changé !');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handlePreview = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = previewNotificationSound(url);
    if (!success) {
      toast.error('Impossible de jouer l\'aperçu');
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium" style={{ color: colors.text }}>
        Son de notification
      </p>
      
      <div className="grid grid-cols-3 gap-2">
        {soundOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.url)}
            className={`relative p-3 rounded-xl border transition-all ${
              selectedSound === option.url
                ? 'border-[--color-primary] bg-[--color-primary]05 shadow-sm'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">{option.emoji}</span>
              <span className="text-[10px] font-medium" style={{ color: colors.text }}>
                {option.label}
              </span>
              {selectedSound === option.url && (
                <CheckCircle size={14} style={{ color: colors.primary }} />
              )}
            </div>
            
            <button
              onClick={(e) => handlePreview(option.url, e)}
              className="absolute top-1 right-1 p-1 rounded-full hover:bg-gray-100 transition"
              title="Écouter l'aperçu"
            >
              <Volume2 size={12} className="text-gray-400" />
            </button>
          </button>
        ))}
      </div>
    </div>
  );
};
