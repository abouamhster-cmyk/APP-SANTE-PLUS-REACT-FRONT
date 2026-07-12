// 📁 src/components/ui/Modal.tsx
// ✅ LOGIQUE DE MODAL INTERACTIF PREMIUM : ANIMATIONS FLUIDES, TIRETTE MOBILE NATIVE ET BOUTONS UNIFIÉS SANS CONFLITS DE BORDURE

import { ReactNode, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/helpers';

// ============================================================
// TYPES ET PROTOCOLES
// ============================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  actions?: ReactNode;
  showClose?: boolean;
  closeOnOverlayClick?: boolean;
  description?: string;
  className?: string;
}

const MAX_WIDTH_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  full: 'max-w-5xl w-[96%]',
};

// ============================================================
// 1️⃣ COMPOSANT CORE : MODAL BASE
// ============================================================

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  icon,
  maxWidth = 'lg',
  actions,
  showClose = true,
  closeOnOverlayClick = true,
  description,
  className,
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Verrouillage propre du défilement d'arrière-plan
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fermeture à l'appui sur la touche Échap
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md overflow-hidden pointer-events-auto"
          onClick={closeOnOverlayClick ? onClose : undefined}
        >
          <motion.div
            ref={modalRef}
            className={cn(
              'relative w-full bg-white dark:bg-[#17231d] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-gray-100/80 dark:border-[#2c3f35] max-h-[90vh]',
              MAX_WIDTH_CLASSES[maxWidth],
              className
            )}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* INDICATION DE GLISSEMENT MOBILE (POIGNÉE NATIVE) */}
            <div className="w-12 h-1 bg-gray-200 dark:bg-gray-700/50 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

            {/* HEADER */}
            <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-[#2c3f35] bg-white/90 dark:bg-[#17231d]/90 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-50 dark:bg-[#24362d] text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-100/50 shadow-inner">
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black tracking-tight truncate text-gray-900 dark:text-gray-50">
                    {title}
                  </h2>
                  {description && (
                    <p className="text-xs text-gray-400 truncate font-semibold mt-0.5">
                      {description}
                    </p>
                  )}
                </div>
              </div>

              {showClose && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-[#24362d] dark:hover:bg-[#1d2d25] transition flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-800/40"
                  aria-label="Fermer"
                >
                  <X size={16} className="text-gray-500 dark:text-gray-300" />
                </button>
              )}
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 overscroll-contain dark:text-gray-200">
              {children}
            </div>

            {/* FOOTER */}
            {actions && (
              <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-[#2c3f35] bg-white/90 dark:bg-[#17231d]/90 backdrop-blur-md sticky bottom-0 z-10 pb-safe">
                {actions}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ============================================================
// 2️⃣ SOUS-COMPOSANT CORE : ACTIONS BOUTONS UNIFIÉS
// ============================================================

interface ModalActionsProps {
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  isLoading?: boolean;
  confirmColor?: string;
  confirmButtonType?: 'button' | 'submit';
  children?: ReactNode;
}

export const ModalActions = ({
  onCancel,
  onConfirm,
  cancelLabel = 'Annuler',
  confirmLabel = 'Confirmer',
  isLoading = false,
  confirmColor,
  confirmButtonType = 'button',
  children,
}: ModalActionsProps) => {
  return (
    <div className="flex flex-col-reverse sm:flex-row gap-2.5 w-full">
      {children ? (
        children
      ) : (
        <>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              // 🟢 CORRECTIF : Bordure visible border-gray-200 et transition d'opacité propre
              className="flex-1 h-11 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-bold bg-white hover:bg-gray-50 transition active:scale-[0.98] text-gray-700 dark:text-gray-200 dark:bg-transparent dark:hover:bg-[#24362d] disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          )}

          {onConfirm && (
            <button
              type={confirmButtonType}
              onClick={confirmButtonType === 'button' ? onConfirm : undefined}
              className="flex-1 h-11 rounded-2xl text-white font-extrabold flex items-center justify-center gap-2 transition hover:opacity-95 active:scale-[0.98] text-xs sm:text-sm disabled:opacity-55 shadow-md shadow-emerald-900/10"
              style={{ background: confirmColor || 'var(--color-primary, #1a4a3a)' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : (
                <>
                  <CheckCircle size={16} />
                  {confirmLabel}
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
};

// ============================================================
// 3️⃣ SPECIALISATION : MODAL CONFIRMATION DIALOG
// ============================================================

const DIALOG_CONFIG = {
  info: { color: '#1a4a3a', label: 'Information' },
  warning: { color: '#F59E0B', label: 'Attention' },
  danger: { color: '#EF4444', label: 'Danger' },
  success: { color: '#10B981', label: 'Succès' },
};

interface ModalWithConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
}

export const ModalWithConfirm = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
}: ModalWithConfirmProps) => {
  const config = DIALOG_CONFIG[type];

  const getDialogIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-emerald-500" />;
      case 'danger':
        return <AlertCircle size={20} className="text-red-500" />;
      case 'warning':
        return <AlertCircle size={20} className="text-amber-500" />;
      default:
        return <AlertCircle size={20} style={{ color: config.color }} />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || config.label}
      icon={getDialogIcon()}
      maxWidth="md"
      actions={
        <ModalActions
          onCancel={onClose}
          onConfirm={onConfirm}
          confirmColor={config.color}
        />
      }
    >
      <div className="py-2 text-center text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 leading-relaxed">
        {message}
      </div>
    </Modal>
  );
};

// ============================================================
// 4️⃣ SPECIALISATION : MODAL FORMULAIRE
// ============================================================

interface ModalWithFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  className?: string;
}

export const ModalWithForm = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  icon,
  maxWidth = 'lg',
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  isLoading = false,
  className,
}: ModalWithFormProps) => {
  if (!isOpen) return null;

  return (
    <form onSubmit={onSubmit} className="contents">
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        icon={icon}
        maxWidth={maxWidth}
        className={className}
        actions={
          <ModalActions
            onCancel={onClose}
            onConfirm={onSubmit as any}
            confirmButtonType="submit"
            confirmLabel={confirmLabel}
            cancelLabel={cancelLabel}
            isLoading={isLoading}
          />
        }
      >
        {children}
      </Modal>
    </form>
  );
};

export default Modal;
