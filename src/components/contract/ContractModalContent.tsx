// 📁 src/components/contract/ContractModalContent.tsx
// ✅ CONTENU CONTRAT : DESIGN PREMIUM ÉPURÉ, SANS BANDEAU CLIGNOTANT ET AVEC BAS DE PAGE SANS CASSURE

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  AlertTriangle,
  ThumbsUp,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { getThemeColors } from '@/lib/permissions';

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
  const colors = getThemeColors('senior');
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
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [readTime, setReadTime] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);
  const colors = getThemeColors('senior');

  // Détection du bas de page avec une tolérance de confort de 50px
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

  // Déblocage automatique si le contrat est court et ne nécessite pas de scroll
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
      <div className="flex flex-col items-center justify-center py-12 w-full">
        <AlertTriangle size={32} className="text-gray-300 mb-2" />
        <p className="text-xs text-gray-500 font-medium">Contrat non disponible</p>
      </div>
    );
  }

  const progress = scrolledToBottom ? 100 : Math.min((readTime / 15) * 100, 95);

  return (
    <div className="flex flex-col h-full max-w-full overflow-hidden">
      
      {/* BARRE DE PROGRESSION DE LECTURE MINIMALISTE */}
      <div className="flex-shrink-0">
        <ProgressBar progress={progress} />
      </div>

      {/* ZONE DE LECTURE FLUIDE */}
      <div
        ref={contentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-3 space-y-4 pr-1 scrollbar-none"
        style={{ color: colors.text }}
      >
        {contract.summary && (
          <div className="p-3.5 rounded-2xl border border-gray-100/50 bg-white/40 backdrop-blur-sm flex gap-2.5 items-start">
            <FileText size={15} className="shrink-0 mt-0.5" style={{ color: colors.primary }} />
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Résumé</p>
              <p className="text-xs text-gray-600 leading-relaxed font-semibold">
                {contract.summary}
              </p>
            </div>
          </div>
        )}

        <div
          className="prose prose-sm max-w-none text-xs sm:text-sm text-gray-700 leading-relaxed font-semibold"
          dangerouslySetInnerHTML={{ __html: contract.content }}
        />

        {/* GUIDE DE DÉFILEMENT SOBRE (S'efface en silence à la fin de la lecture) */}
        {!scrolledToBottom && (
          <div className="text-center py-2">
            <div className="inline-flex items-center gap-1.5 text-[9px] font-black px-3.5 py-1.5 rounded-full bg-black/5 text-gray-400">
              <ChevronDown size={11} className="animate-bounce text-gray-400" />
              Défiler vers le bas pour valider
            </div>
          </div>
        )}
      </div>

      {/* FOOTER ÉPURÉ TRANSPARENT SANS EFFET DE BLOC */}
      <div className="flex-shrink-0 pt-3 border-t border-black/5 bg-transparent">
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
            <label htmlFor="accept_terms" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
              J'accepte sans réserve les présentes conditions d'utilisation
              <span className="block text-[10px] text-gray-400 font-semibold mt-0.5">
                Validation définitive, non révocable.
              </span>
            </label>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={onCancel}
              className="flex-1 h-10 rounded-xl border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50 transition-colors"
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
                  : colors.primary,
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
