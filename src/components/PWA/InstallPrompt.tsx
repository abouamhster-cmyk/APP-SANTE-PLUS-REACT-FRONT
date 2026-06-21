import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { getThemeColors } from '@/lib/permissions';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    
    if (result.outcome === 'accepted') {
      console.log('App installée');
      setIsVisible(false);
    } else {
      console.log('Installation refusée');
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  const colors = getThemeColors('senior');

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 card p-4 shadow-lg">
      <div className="flex items-start space-x-3">
        <div className="flex-1">
          <h4 className="font-semibold" style={{ color: colors.text }}>Installer l'application</h4>
          <p className="text-sm" style={{ color: colors.text + '60' }}>
            Installez Santé Plus Services pour un accès rapide
          </p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-gray-100 rounded transition"
        >
          <X size={18} />
        </button>
      </div>
      <button
        onClick={handleInstall}
        className="mt-3 w-full flex items-center justify-center space-x-2 py-2 rounded-xl text-white font-medium transition"
        style={{ background: colors.primary }}
      >
        <Download size={18} />
        <span>Installer</span>
      </button>
    </div>
  );
};