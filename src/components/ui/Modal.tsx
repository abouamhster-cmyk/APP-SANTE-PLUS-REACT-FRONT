// 📁 src/components/ui/Modal.tsx

import { ReactNode, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/helpers';

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
  const bodyRef = useRef<HTMLDivElement>(null);

  // ✅ Empêcher le scroll du body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // ✅ Fermer avec Echap
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // ✅ Tailles
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    full: 'max-w-4xl',
  };

  const colors = {
    primary: 'var(--color-primary, #1a4a3a)',
    text: 'var(--color-text, #2d2d2d)',
    border: 'var(--color-border, #e5e0d8)',
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={closeOnOverlayClick ? onClose : undefined}>
          {/* Modal */}
          <motion.div
            ref={modalRef}
            className={cn(
              'modal-card',
              maxWidthClasses[maxWidth],
              className
            )}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ============================================ */}
            {/* HEADER - FIXE */}
            {/* ============================================ */}
            <div className="modal-header" style={{ borderColor: colors.border }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {icon && (
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: colors.primary + '12', color: colors.primary }}
                    >
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold truncate" style={{ color: colors.text }}>
                      {title}
                    </h2>
                    {description && (
                      <p className="text-xs truncate" style={{ color: colors.text + '50' }}>
                        {description}
                      </p>
                    )}
                  </div>
                </div>
                {showClose && (
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl hover:bg-gray-100 transition shrink-0 flex items-center justify-center"
                    aria-label="Fermer"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* ============================================ */}
            {/* CONTENT - SCROLLABLE */}
            {/* ============================================ */}
            <div ref={bodyRef} className="modal-body">
              {children}
            </div>

            {/* ============================================ */}
            {/* FOOTER - FIXE */}
            {/* ============================================ */}
            {actions && (
              <div className="modal-footer" style={{ borderColor: colors.border }}>
                {actions}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// =============================================
// MODAL ACTIONS
// =============================================

interface ModalActionsProps {
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  isLoading?: boolean;
  confirmColor?: string;
  children?: ReactNode;
  confirmIcon?: ReactNode;
  className?: string;
}

export const ModalActions = ({
  onCancel,
  onConfirm,
  cancelLabel = 'Annuler',
  confirmLabel = 'Confirmer',
  isLoading = false,
  confirmColor,
  children,
  confirmIcon,
  className,
}: ModalActionsProps) => {
  const colors = {
    primary: 'var(--color-primary, #1a4a3a)',
    border: 'var(--color-border, #e5e0d8)',
    text: 'var(--color-text, #2d2d2d)',
  };

  return (
    <div className={cn('flex flex-col sm:flex-row gap-2.5', className)}>
      {children ? (
        children
      ) : (
        <>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 py-2.5 sm:py-3 rounded-xl font-medium border transition hover:bg-gray-50 disabled:opacity-50 text-sm"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              {cancelLabel}
            </button>
          )}
          {onConfirm && (
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 py-2.5 sm:py-3 rounded-xl text-white font-bold transition hover:opacity-80 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              style={{ background: confirmColor || colors.primary }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {confirmIcon || <CheckCircle size={18} />}
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

// =============================================
// MODAL WITH CONFIRM
// =============================================

interface ModalWithConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  icon?: ReactNode;
  type?: 'info' | 'warning' | 'danger' | 'success';
}

export const ModalWithConfirm = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  isLoading = false,
  icon,
  type = 'info',
}: ModalWithConfirmProps) => {
  const colors = {
    primary: 'var(--color-primary, #1a4a3a)',
    text: 'var(--color-text, #2d2d2d)',
    border: 'var(--color-border, #e5e0d8)',
  };

  const getTypeColor = () => {
    switch (type) {
      case 'warning': return '#FF9800';
      case 'danger': return '#F44336';
      case 'success': return '#4CAF50';
      default: return colors.primary;
    }
  };

  const getTypeIcon = () => {
    if (icon) return icon;
    switch (type) {
      case 'warning': return <AlertCircle size={24} />;
      case 'danger': return <AlertCircle size={24} />;
      case 'success': return <CheckCircle size={24} />;
      default: return <AlertCircle size={24} />;
    }
  };

  const typeColor = getTypeColor();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={getTypeIcon()}
      maxWidth="md"
      actions={
        <ModalActions
          onCancel={onClose}
          onConfirm={onConfirm}
          cancelLabel={cancelLabel}
          confirmLabel={confirmLabel}
          isLoading={isLoading}
          confirmColor={typeColor}
        />
      }
    >
      <div className="py-3 sm:py-4">
        <p className="text-center text-sm sm:text-base" style={{ color: colors.text }}>
          {message}
        </p>
      </div>
    </Modal>
  );
};

// =============================================
// MODAL WITH FORM
// =============================================

interface ModalWithFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
}

export const ModalWithForm = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  icon,
  confirmLabel = 'Enregistrer',
  cancelLabel = 'Annuler',
  isLoading = false,
  maxWidth = '2xl',
}: ModalWithFormProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icon}
      maxWidth={maxWidth}
      actions={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => {}}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          isLoading={isLoading}
        />
      }
    >
      <form id="modal-form" onSubmit={onSubmit} className="space-y-4">
        {children}
      </form>
    </Modal>
  );
};

export default Modal;
