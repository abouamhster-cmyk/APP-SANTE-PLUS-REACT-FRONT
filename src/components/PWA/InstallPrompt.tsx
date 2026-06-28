// 📁 src/components/PWA/InstallPrompt.tsx
 
import { useState, useEffect } from 'react';
import { Download, X, Smartphone, CheckCircle, ArrowRight, Shield, Zap } from 'lucide-react';
import { getThemeColors } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt = () => {
  const { isAuthenticated } = useAuthStore();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const colors = getThemeColors('senior');

  // ✅ Détection de la plateforme
  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
    const isAndroidDevice = /Android/.test(ua);
    const isDesktopDevice = !isIOSDevice && !isAndroidDevice;

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsDesktop(isDesktopDevice);

    // ✅ Vérifier si l'app est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // ✅ Vérifier si l'utilisateur a déjà refusé
    const hasDismissed = localStorage.getItem('pwa_install_dismissed');
    if (hasDismissed) {
      setIsDismissed(true);
      return;
    }

    // ✅ Pour iOS, afficher un message personnalisé
    if (isIOSDevice) {
      const hasShownIOSPrompt = localStorage.getItem('pwa_ios_prompt_shown');
      if (!hasShownIOSPrompt) {
        setTimeout(() => setIsVisible(true), 3000);
        localStorage.setItem('pwa_ios_prompt_shown', 'true');
      }
      return;
    }
  }, []);

  // ✅ Écouter l'événement beforeinstallprompt (Android/Desktop)
  useEffect(() => {
    if (isIOS) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      const hasDismissed = localStorage.getItem('pwa_install_dismissed');
      if (!hasDismissed && !isInstalled) {
        setTimeout(() => setIsVisible(true), 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // ✅ Détecter si l'app a été installée
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsVisible(false);
      localStorage.setItem('pwa_install_dismissed', 'true');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [isIOS, isInstalled]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    try {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      
      if (result.outcome === 'accepted') {
        console.log('✅ App installée avec succès');
        setIsVisible(false);
        localStorage.setItem('pwa_install_dismissed', 'true');
      } else {
        console.log('❌ Installation refusée');
        setIsVisible(false);
        localStorage.setItem('pwa_install_dismissed', 'true');
      }
    } catch (error) {
      console.error('Erreur installation:', error);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  // ✅ Ne rien afficher si déjà installé, masqué ou non authentifié
  if (isInstalled || isDismissed || !isAuthenticated || !isVisible) return null;

  // ✅ Affichage pour iOS
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slideUp">
        <div 
          className="bg-white rounded-2xl p-4 shadow-xl border border-black/5"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        >
          <div className="flex items-start gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: colors.primary + '15', color: colors.primary }}
            >
              <Smartphone size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm" style={{ color: colors.text }}>
                📱 Installez l'application
              </h4>
              <p className="text-xs mt-0.5" style={{ color: colors.text + '60' }}>
                Sur iOS : <strong>Partager</strong> → <strong>Sur l'écran d'accueil</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition"
              style={{ color: colors.text + '50' }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Affichage standard (Android/Desktop)
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slideUp">
      <div 
        className="bg-white rounded-2xl p-4 shadow-xl border border-black/5"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-lg hover:bg-gray-100 transition"
        >
          <X size={16} style={{ color: colors.text + '40' }} />
        </button>

        <div className="flex items-start gap-3">
          {/* ICONE */}
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: colors.primary + '15', color: colors.primary }}
          >
            <Smartphone size={24} />
          </div>

          {/* CONTENU */}
          <div className="flex-1 min-w-0 pr-6">
            <h4 className="font-bold text-sm" style={{ color: colors.text }}>
              📱 Installez Santé Plus
            </h4>
            <p className="text-xs mt-0.5" style={{ color: colors.text + '60' }}>
              Accédez en 1 clic depuis votre écran d'accueil
            </p>
            
            {/* AVANTAGES */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-[10px] flex items-center gap-1" style={{ color: colors.text + '50' }}>
                <CheckCircle size={10} style={{ color: colors.primary }} />
                Accès rapide
              </span>
              <span className="text-[10px] flex items-center gap-1" style={{ color: colors.text + '50' }}>
                <CheckCircle size={10} style={{ color: colors.primary }} />
                Hors ligne
              </span>
              <span className="text-[10px] flex items-center gap-1" style={{ color: colors.text + '50' }}>
                <CheckCircle size={10} style={{ color: colors.primary }} />
                Notifications
              </span>
            </div>
          </div>
        </div>

        {/* BOUTONS */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition"
            style={{ color: colors.text + '50' }}
          >
            Plus tard
          </button>
          
          <button
            onClick={handleInstall}
            className="flex-1 px-4 py-2 rounded-xl text-white text-xs font-bold transition hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: colors.primary }}
          >
            <Download size={14} />
            Installer
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* ANIMATION */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default InstallPrompt;
