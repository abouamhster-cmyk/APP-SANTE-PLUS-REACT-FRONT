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
  const scrollYRef = useRef(0);

  // 🔒 Lock scroll body - version améliorée pour mobile
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

  // ⌨️ ESC close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

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
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          overflow: 'hidden',
          pointerEvents: 'auto',
        }}
      >
        <motion.div
          ref={modalRef}
          className={cn(
            'modal-card',
            maxWidthClasses[maxWidth],
            className
          )}
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: maxWidth === 'full' ? '96%' : '560px',
            maxHeight: '92vh',
            background: 'white',
            borderRadius: '24px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'modalSlideUp 0.3s ease-out',
            pointerEvents: 'auto',
          }}
        >
          {/* HEADER */}
          <div 
            className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100/50 bg-white sticky top-0 z-10"
            style={{ borderBottom: '1px solid #e5e7eb' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-black/5 shrink-0">
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold truncate text-gray-900">
                    {title}
                  </h2>
                  {description && (
                    <p className="text-xs text-gray-500 truncate">
                      {description}
                    </p>
                  )}
                </div>
              </div>

              {showClose && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-gray-100 transition flex items-center justify-center shrink-0"
                  aria-label="Fermer"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              )}
            </div>
          </div>

          {/* BODY */}
          <div 
            className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 overscroll-contain"
            style={{
              maxHeight: 'calc(92vh - 140px)',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {children}
          </div>

          {/* FOOTER */}
          {actions && (
            <div 
              className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100/50 bg-white sticky bottom-0 z-10"
              style={{ 
                borderTop: '1px solid #e5e7eb',
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
              }}
            >
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
              className="flex-1 py-2.5 sm:py-3 rounded-xl border text-sm font-medium hover:bg-gray-50 transition text-gray-700"
              style={{ borderColor: '#e5e7eb' }}
            >
              {cancelLabel}
            </button>
          )}

          {onConfirm && (
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 sm:py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition hover:opacity-90 text-sm disabled:opacity-60"
              style={{ background: confirmColor || '#1a4a3a' }}
              disabled={isLoading}
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
      <div className="py-4 text-center text-sm sm:text-base text-gray-700">
        {message}
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
    <form onSubmit={onSubmit}>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        icon={icon}
        maxWidth={maxWidth}
        className={className}
        actions={
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 sm:py-3 rounded-xl font-medium border transition hover:bg-gray-50 text-sm disabled:opacity-50"
              style={{ borderColor: '#e5e7eb', color: '#2d2d2d' }}
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 sm:py-3 rounded-xl text-white font-bold transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              style={{ background: 'var(--color-primary, #1a4a3a)' }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        }
      >
        {children}
      </Modal>
    </form>
  );
};

// ✅ EXPORT PAR DÉFAUT
export default Modal;
