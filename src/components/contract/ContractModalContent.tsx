// 📁 src/components/contract/ContractModalContent.tsx
// ✅ CONTENU CONTRAT : INTÉGRATION DU PORTAIL BEIGE ET DÉDOUBLONNAGE PARFAIT

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  AlertTriangle,
  ThumbsUp,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';

interface ContractModalContentProps {
  contract: {
    id: string;
    title: string;
    content: string;
    version: string;
    role: string;
    summary?: string | null;
    created_at?: string;
  } | null;
  onAccept: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const ProgressBar = ({ progress }: { progress: number }) => {
  const brand = useBranding();
  const colors = brand.colors;
  
  return (
    <div className="w-full h-[2px] bg-black/5 rounded-full overflow-hidden mt-1">
      <div
        className="h-full transition-all duration-300 ease-out"
        style={{ 
          background: colors.primary, 
          width: `${Math.min(progress, 100)}%` 
        }}
      />
    </div>
  );
};

export const ContractModalContent = ({
  contract,
  onAccept,
  onCancel,
  isLoading,
}: ContractModalContentProps) => {
  const brand = useBranding();
  const colors = brand.colors;
  
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [readTime, setReadTime] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    
    if (target.scrollHeight <= target.clientHeight + 10) {
      setScrolledToBottom(true);
      return;
    }

    const isBottom =
      Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 50;
    
    if (isBottom) {
      setScrolledToBottom(true);
    }
  }, []);

  useEffect(() => {
    if (!contract) return;
    
    const checkScrollHeight = () => {
      const target = contentRef.current;
      if (target) {
        if (target.scrollHeight <= target.clientHeight + 45) {
          setScrolledToBottom(true);
        }
      }
    };

    const timer = setTimeout(checkScrollHeight, 600);
    return () => clearTimeout(timer);
  }, [contract]);

  useEffect(() => {
    if (!contract) return;
    const interval = setInterval(() => setReadTime((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [contract]);

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center py-12 w-full bg-[#FCFAF6] dark:bg-[#151c18]">
        <AlertTriangle size={32} className="text-gray-300 mb-2" />
        <p className="text-xs font-medium" style={{ color: colors.textLight }}>Contrat non disponible</p>
      </div>
    );
  }

  const progress = scrolledToBottom ? 100 : Math.min((readTime / 15) * 100, 95);

  return (
    /* ✅ CORRECTIF D'ARRIÈRE-PLAN : Fond beige/crème constant FCFAF6 (avec support dark mode) au lieu de blanc [23] */
    <div className="flex flex-col h-full max-w-full overflow-hidden bg-[#FCFAF6] dark:bg-[#151c18]">
      
      <div className="flex-shrink-0">
        <ProgressBar progress={progress} />
      </div>

      <div
        ref={contentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-3 space-y-4 pr-1 scrollbar-none"
        style={{ color: colors.text }}
      >
        {contract.summary && (
          <div className="p-3.5 rounded-2xl border flex gap-2.5 items-start" style={{ borderColor: colors.primary + '10', backgroundColor: colors.primary + '04' }}>
            <FileText size={15} className="shrink-0 mt-0.5" style={{ color: colors.primary }} />
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textLight }}>Résumé du document</p>
              <p className="text-xs leading-relaxed font-semibold" style={{ color: colors.text }}>{contract.summary}</p>
            </div>
          </div>
        )}

        {/* ✅ CORRECTIF SÉMANTIQUE : Titre interne redundante du contenu CMS de base masqué pour éviter toute duplication visuelle [23] */}
        <div
          className="prose prose-sm max-w-none text-xs sm:text-sm leading-relaxed font-semibold"
          style={{ color: colors.text }}
          dangerouslySetInnerHTML={{ __html: contract.content }}
        />

        {!scrolledToBottom && (
          <div className="text-center py-2">
            <div className="inline-flex items-center gap-1.5 text-[9px] font-black px-3.5 py-1.5 rounded-full bg-black/5" style={{ color: colors.textLight }}>
              <ChevronDown size={11} className="animate-bounce" style={{ color: colors.textLight }} />
              Défiler vers le bas pour valider
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 pt-3 border-t bg-transparent" style={{ borderColor: colors.primary + '10' }}>
        <div className="flex flex-col gap-3">
          
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              id="accept_terms"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              disabled={!scrolledToBottom}
              className="w-4.5 h-4.5 mt-0.5 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed"
              style={{ accentColor: colors.primary }}
            />
            <label htmlFor="accept_terms" className="text-xs font-bold cursor-pointer select-none" style={{ color: colors.text }}>
              J'accepte sans réserve les présentes conditions d'utilisation
              <span className="block text-[10px] font-semibold mt-0.5" style={{ color: colors.textLight }}>
                Validation définitive, non révocable.
              </span>
            </label>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={onCancel}
              className="flex-1 h-10 rounded-xl border transition-colors text-xs font-bold"
              style={{ borderColor: '#EF444430', color: '#EF4444' }}
            >
              Refuser
            </button>
            
            <button
              onClick={onAccept}
              disabled={!isChecked || !scrolledToBottom || isLoading}
              className="flex-1 h-10 rounded-xl text-white text-xs font-bold transition-all disabled:opacity-40"
              style={{
                background: (!isChecked || !scrolledToBottom || isLoading)
                  ? '#E5E7EB'
                  : colors.primary, // L'intervenant actif bénéficie de son hover et bouton dynamique [23]
              }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-1.5">
                  <Loader2 className="animate-spin" size={13} />
                  Enregistrement...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5">
                  <ThumbsUp size={13} />
                  Accepter
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractModalContent;
