// 📁 src/components/ui/Modal.tsx
// ✅ LOGIQUE DE MODAL INTERACTIF RESTUCTURÉE : TRANSITIONS FLUIDES, BOUTONS UNIFIÉS ET SCROLL ACCÈS MOBILE SÉCURISÉ

import { ReactNode, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Loader2  } from 'lucide-react';
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
  const scrollYRef = useRef(0);

  // Verrouillage intelligent du défilement d'arrière-plan (Anti-saccade iOS/Android)
  useEffect(() => {
    if (isOpen) {
      scrollYRef.current = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollYRef.current}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      window.scrollTo(0, scrollYRef.current);
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-sm overflow-hidden pointer-events-auto"
        onClick={closeOnOverlayClick ? onClose : undefined}
      >
        <motion.div
          ref={modalRef}
          className={cn(
            'modal-card relative w-full bg-white dark:bg-[#17231d] rounded-[1.75rem] shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-[#2c3f35] max-h-[92vh]',
            MAX_WIDTH_CLASSES[maxWidth],
            className
          )}
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.97 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-[#2c3f35] bg-white dark:bg-[#17231d] sticky top-0 z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-[#24362d] text-gray-500 dark:text-gray-300 shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-extrabold truncate text-gray-900 dark:text-gray-50">
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
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-[#24362d] dark:hover:bg-[#1d2d25] transition flex items-center justify-center shrink-0 border"
                aria-label="Fermer"
              >
                <X size={16} className="text-gray-500 dark:text-gray-300" />
              </button>
            )}
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5 overscroll-contain dark:text-gray-200">
            {children}
          </div>

          {/* FOOTER */}
          {actions && (
            <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-[#2c3f35] bg-white dark:bg-[#17231d] sticky bottom-0 z-10 pb-safe">
              {actions}
            </div>
          )}
        </motion.div>
      </div>
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
  confirmButtonType?: 'button' | 'submit'; // ✅ Réutilisation pour les formulaires !
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
    <div className="flex flex-col sm:flex-row gap-2.5 w-full">
      {children ? (
        children
      ) : (
        <>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 py-2.5 sm:py-3 rounded-xl border text-sm font-bold bg-white hover:bg-gray-50 transition text-gray-600 dark:text-gray-300 dark:bg-transparent dark:hover:bg-[#24362d] disabled:opacity-50"
              style={{ borderColor: 'rgba(0,0,0,0.08)' }}
            >
              {cancelLabel}
            </button>
          )}

          {onConfirm && (
            <button
              type={confirmButtonType}
              onClick={confirmButtonType === 'button' ? onConfirm : undefined}
              className="flex-1 py-2.5 sm:py-3 rounded-xl text-white font-black flex items-center justify-center gap-2 transition hover:opacity-95 text-sm disabled:opacity-55 shadow-md shadow-black/5"
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
      <div className="py-4 text-center text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 leading-relaxed">
        {message}
      </div>
    </Modal>
  );
};

// ============================================================
// 4️⃣ SPECIALISATION : MODAL FORMULAIRE (SANS RÉPÉTITION DE BOUTONS)
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
          /* ✅ RÉUTILISATION DES ACTIONS UNIFIÉES AVEC FORM SUBMISSION */
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
