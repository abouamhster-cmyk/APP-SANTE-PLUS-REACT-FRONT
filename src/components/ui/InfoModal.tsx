// 📁 src/components/ui/InfoModal.tsx

import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const InfoModal = ({
  isOpen,
  onClose,
  title,
  children,
  icon,
  maxWidth = 'lg',
}: InfoModalProps) => {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  const colors = {
    primary: 'var(--color-primary, #1a4a3a)',
    text: 'var(--color-text, #2d2d2d)',
    border: 'var(--color-border, #e5e0d8)',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`bg-white rounded-3xl w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] overflow-hidden shadow-2xl`}>
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b" style={{ borderColor: colors.border }}>
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: colors.primary + '15', color: colors.primary }}
              >
                {icon}
              </div>
            )}
            <h2 className="text-xl font-black truncate" style={{ color: colors.text }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition shrink-0"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-gray-200">
          {children}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-4" style={{ borderColor: colors.border }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold transition hover:opacity-80"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};