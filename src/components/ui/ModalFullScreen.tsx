// 📁 src/components/ui/ModalFullScreen.tsx

import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { cn } from '@/utils/helpers';

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
  // 🔒 Lock scroll body - CORRIGÉ
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
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isOpen]);

  // ⌨️ ESC close - CORRIGÉ
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
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'fixed inset-0 z-[99999] flex flex-col bg-white',
            'top-0 left-0 right-0 bottom-0',
            className
          )}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          {/* HEADER */}
          <div
            className={cn(
              'flex-shrink-0 px-4 py-3 border-b border-gray-100/80 bg-white/95 backdrop-blur-sm sticky top-0 z-10',
              'flex items-center gap-3',
              headerClassName
            )}
            style={{
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: 'rgba(255,255,255,0.95)',
            }}
          >
            {showBack && (
              <button
                onClick={handleBack}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                aria-label="Retour"
              >
                <ArrowLeft size={22} className="text-gray-700" />
              </button>
            )}

            <h2 className="flex-1 text-base sm:text-lg font-bold truncate text-gray-900">
              {title}
            </h2>

            {showClose && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                aria-label="Fermer"
              >
                <X size={20} className="text-gray-500" />
              </button>
            )}
          </div>

          {/* BODY */}
          <div
            className={cn(
              'flex-1 overflow-y-auto overscroll-contain',
              'px-4 sm:px-6 py-4 sm:py-6',
              bodyClassName
            )}
            style={{
              WebkitOverflowScrolling: 'touch',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            }}
          >
            {children}
          </div>

          {/* FOOTER */}
          {footer && (
            <div
              className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100/80 bg-white/95 backdrop-blur-sm sticky bottom-0 z-10"
              style={{
                borderTop: '1px solid #e5e7eb',
                backgroundColor: 'rgba(255,255,255,0.95)',
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
              }}
            >
              {footer}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModalFullScreen;
