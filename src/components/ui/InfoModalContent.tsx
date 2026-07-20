// 📁 src/components/ui/InfoModalContent.tsx
 
import { ReactNode } from 'react';

interface InfoModalContentProps {
  children: ReactNode;
  onClose: () => void;
  colors: any;
}

export const InfoModalContent = ({
  children,
  onClose,
  colors,
}: InfoModalContentProps) => {
  return (
    /* ✅ CORRECTIF D'ARRIÈRE-PLAN : Fond beige/crème constant FCFAF6 (avec support dark mode) au lieu de blanc [23] */
    <div className="space-y-5 pb-2 bg-[#FCFAF6] dark:bg-[#151c18] p-1 sm:p-2 rounded-2xl">
      
 

      {/* Zone de lecture du contenu */}
      <div className="prose prose-sm max-w-none text-xs sm:text-sm font-semibold leading-relaxed text-gray-700 dark:text-gray-300">
        {children}
      </div>

      {/* Bouton fermer de bas de page */}
      <div className="flex gap-3 pt-4 border-t" style={{ borderColor: colors.border || 'rgba(0,0,0,0.06)' }}>
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
