// 📁 src/utils/pwa.ts
// ✅ Utilitaires pour la PWA

/**
 * Vérifie si l'application est installée
 */
export const isAppInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches;
};

/**
 * Force l'affichage de la bannière d'installation
 * (Utile pour le debug)
 */
export const forceInstallPrompt = (): void => {
  localStorage.removeItem('pwa_install_dismissed');
  localStorage.removeItem('pwa_ios_prompt_shown');
  window.location.reload();
};

/**
 * Vérifie si la PWA est supportée
 */
export const isPWASupported = (): boolean => {
  return 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;
};

/**
 * Obtient les informations de l'application
 */
export const getAppInfo = () => {
  return {
    isInstalled: isAppInstalled(),
    isSupported: isPWASupported(),
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    isAndroid: /Android/.test(navigator.userAgent),
    displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
    userAgent: navigator.userAgent,
  };
};
