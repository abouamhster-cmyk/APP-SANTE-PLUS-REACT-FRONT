// 📁 src/components/ui/InfoModalContent.tsx
// ✅ CONTENU INFORMATIONNEL : CORRECTION D'EXPORTATION ET NETTOYAGE DES BOUTONS DE FERMETURE

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
    <div className="space-y-5 pb-2">
      {/* Header avec bouton retour */}
      <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: colors.border }}>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
          aria-label="Fermer"
        >
          <X size={20} className="text-gray-700 dark:text-gray-300" />
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          {icon && (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
              style={{ background: colors.primary + '12', color: colors.primary }}
            >
              {icon}
            </div>
          )}
          <h2 className="text-base sm:text-lg font-black truncate" style={{ color: colors.text }}>
            {title}
          </h2>
        </div>
      </div>

      {/* Contenu */}
      <div className="prose prose-sm max-w-none text-xs sm:text-sm font-medium leading-relaxed" style={{ color: colors.text }}>
        {children}
      </div>

      {/* Bouton fermer */}
      <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
        <button
          onClick={onClose}
          className="flex-1 h-11 rounded-2xl font-bold transition hover:opacity-90 text-xs sm:text-sm"
          style={{ background: colors.primary + '15', color: colors.primary }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

export default InfoModalContent;
