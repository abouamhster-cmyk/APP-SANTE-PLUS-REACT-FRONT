// 📁 src/components/ui/ModalFullScreen.tsx
// ✅ ENVELOPPE MODAL PLEIN ÉCRAN COMPLET : STYLE COHÉRENT AVEC LE THÈME BRANDING ET EFFETS GLASSMORPHISM FLUIDES

import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';

interface ModalFullScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  title: string;
  children: ReactNode;
  showClose?: boolean;
  showBack?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footer?: ReactNode;
}

export const ModalFullScreen = ({
  isOpen,
  onClose,
  onBack,
  title,
  children,
  showClose = false,
  showBack = true,
  className,
  headerClassName,
  bodyClassName,
  footer,
}: ModalFullScreenProps) => {
  const { profile, role } = useAuthStore();

  // ✅ RÉCUPÉRATION DYNAMIQUE DU THÈME DE COULEUR BRANDING CONFORME À MAINLAYOUT
  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // 🔒 Lock scroll body (Anti-saccade lors du défilement)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isOpen]);

  // ⌨️ Fermeture par la touche Échap
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (onBack) onBack();
        else onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, onBack]);

  if (!isOpen) return null;

  const handleBack = () => {
    if (onBack) onBack();
    else onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          // ✅ TRANSITION AVEC EFFET RESSORT DE NIVEAU PRODUCTION (SPRING DAMPING)
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className={cn(
            'fixed inset-0 z-[99999] flex flex-col',
            className
          )}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.background, // ✅ Le fond du modal prend la couleur dynamique (ex: #f5f0e8 ou #0f1713)
          }}
        >
          {/* ============================================================
              HEADER GLASSMORPHIC (Totalement aligné avec l'en-tête de MainLayout)
              ============================================================ */}
          <div
            className={cn(
              'flex-shrink-0 px-5 py-4 bg-white/80 dark:bg-[#17231d]/80 backdrop-blur-xl sticky top-0 z-10',
              'flex items-center gap-3 border-b',
              headerClassName
            )}
            style={{
              borderColor: colors.primary + '20',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.015)',
            }}
          >
            {showBack && (
              <button
                onClick={handleBack}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#24362d] transition flex items-center justify-center shrink-0 border border-gray-100/30"
                aria-label="Retour"
              >
                <ArrowLeft size={18} style={{ color: colors.primary }} />
              </button>
            )}

            <h2 
              className="flex-1 text-sm sm:text-base font-extrabold truncate"
              style={{ color: colors.text }}
            >
              {title}
            </h2>

            {showClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#24362d] transition flex items-center justify-center shrink-0 border border-gray-100/30"
                aria-label="Fermer"
              >
                <X size={18} className="text-gray-500" />
              </button>
            )}
          </div>

          {/* ============================================================
              BODY CONTENT (Avec marge basse de sécurité contre le chevauchement)
              ============================================================ */}
          <div
            className={cn(
              'flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 sm:py-6',
              bodyClassName
            )}
            style={{
              WebkitOverflowScrolling: 'touch',
              paddingBottom: 'calc(max(24px, env(safe-area-inset-bottom)) + 16px)',
            }}
          >
            <div className="max-w-4xl mx-auto w-full">
              {children}
            </div>
          </div>

          {/* ============================================================
              FOOTER GLASSMORPHIC (Optionnel)
              ============================================================ */}
          {footer && (
            <div
              className="flex-shrink-0 px-5 py-4 bg-white/80 dark:bg-[#17231d]/80 backdrop-blur-xl sticky bottom-0 z-10 border-t"
              style={{
                borderColor: colors.primary + '15',
                boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.015)',
                paddingBottom: 'calc(max(16px, env(safe-area-inset-bottom)) + 4px)',
              }}
            >
              <div className="max-w-4xl mx-auto w-full">
                {footer}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModalFullScreen;
