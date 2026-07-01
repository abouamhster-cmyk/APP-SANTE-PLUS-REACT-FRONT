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

  // 🔒 Lock scroll body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  // ⌨️ ESC close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    full: 'max-w-5xl',
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="modal-overlay"
        onClick={closeOnOverlayClick ? onClose : undefined}
      >
        <motion.div
          ref={modalRef}
          className={cn('modal-card', maxWidthClasses[maxWidth], className)}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="modal-header">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-black/5">
                    {icon}
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold truncate">
                    {title}
                  </h2>
                  {description && (
                    <p className="text-xs text-black/50 truncate">
                      {description}
                    </p>
                  )}
                </div>
              </div>

              {showClose && (
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full hover:bg-black/5 transition flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {/* BODY */}
          <div className="modal-body">
            {children}
          </div>

          {/* FOOTER */}
          {actions && (
            <div className="modal-footer">
              {actions}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};



// =============================================
// ACTIONS
// =============================================

interface ModalActionsProps {
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  isLoading?: boolean;
  confirmColor?: string;
  children?: ReactNode;
}

export const ModalActions = ({
  onCancel,
  onConfirm,
  cancelLabel = 'Annuler',
  confirmLabel = 'Confirmer',
  isLoading = false,
  confirmColor,
  children,
}: ModalActionsProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2.5">
      {children ? (
        children
      ) : (
        <>
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border text-sm hover:bg-black/5 transition"
            >
              {cancelLabel}
            </button>
          )}

          {onConfirm && (
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition hover:opacity-90"
              style={{ background: confirmColor || '#1a4a3a' }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle size={18} />
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
// CONFIRM MODAL
// =============================================

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
  const color = {
    info: '#1a4a3a',
    warning: '#FF9800',
    danger: '#F44336',
    success: '#4CAF50',
  }[type];

  const icon = {
    warning: <AlertCircle size={24} />,
    danger: <AlertCircle size={24} />,
    success: <CheckCircle size={24} />,
    info: <AlertCircle size={24} />,
  }[type];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icon}
      maxWidth="md"
      actions={
        <ModalActions
          onCancel={onClose}
          onConfirm={onConfirm}
          confirmColor={color}
        />
      }
    >
      <div className="py-4 text-center text-sm sm:text-base">
        {message}
      </div>
    </Modal>
  );
};
