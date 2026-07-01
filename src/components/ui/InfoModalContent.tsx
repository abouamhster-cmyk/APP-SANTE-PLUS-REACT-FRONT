// 📁 src/components/ui/InfoModalContent.tsx
// 📌 Contenu des informations (sans wrapper modal)

import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface InfoModalContentProps {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  onClose: () => void;
  colors: any;
}

export const InfoModalContent = ({
  title,
  children,
  icon,
  onClose,
  colors,
}: InfoModalContentProps) => {
  return (
    <div className="space-y-5 pb-4">
      {/* Header avec retour */}
      <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: colors.border }}>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          aria-label="Retour"
        >
          <X size={22} className="text-gray-700" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          {icon && (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: colors.primary + '12', color: colors.primary }}
            >
              {icon}
            </div>
          )}
          <h2 className="text-lg font-bold truncate" style={{ color: colors.text }}>
            {title}
          </h2>
        </div>
      </div>

      {/* Contenu */}
      <div className="prose prose-sm max-w-none" style={{ color: colors.text }}>
        {children}
      </div>

      {/* Bouton fermer */}
      <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl font-bold transition hover:opacity-80 text-sm"
          style={{ background: colors.primary + '12', color: colors.primary }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

export default InfoModalContent;
