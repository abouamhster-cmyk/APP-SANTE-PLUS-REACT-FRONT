// 📁 src/components/contract/ContractModalContent.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scale,
  ChevronDown,
  FileText,
  AlertTriangle,
  ThumbsUp,
  Loader2,
  ArrowLeft,
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
    <div className="w-full h-[2px] bg-black/5 rounded-full overflow-hidden mt-2">
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

  const getRoleLabel = (role: string) => {
    const roles: Record<string, { label: string; icon: string }> = {
      family: { label: 'Famille/Bénéficiaire', icon: '👨‍👩‍👦' },
      aidant: { label: 'Intervenant Aidant', icon: '🦸' },
      coordinator: { label: 'Coordinateur', icon: '👔' },
      admin: { label: 'Administrateur', icon: '👑' },
    };
    return roles[role] || { label: role, icon: '👤' };
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isBottom =
      Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 30;
    if (isBottom) setScrolledToBottom(true);
  }, []);

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

  const roleInfo = getRoleLabel(contract.role);
  const progress = scrolledToBottom ? 100 : Math.min((readTime / 15) * 100, 95);

  return (
    <div className="flex flex-col h-full max-w-full overflow-hidden">
      
      {/* HEADER */}
      <div className="flex-shrink-0 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-gray-50 rounded-xl transition-colors shrink-0 text-gray-500"
            aria-label="Retour"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: colors.primary + '10', color: colors.primary }}
              >
                <Scale size={15} />
              </div>
              
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold truncate text-gray-800">
                  {contract.title}
                </h2>
                
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-semibold mt-0.5">
                  <span>{roleInfo.icon} {roleInfo.label}</span>
                  <span>•</span>
                  <span>Version {contract.version}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <ProgressBar progress={progress} />
      </div>

      {/* BODY */}
      <div
        ref={contentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-3 space-y-4 pr-1 scrollbar-thin"
        style={{ color: colors.text }}
      >
        {contract.summary && (
          <div className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 flex gap-2.5 items-start">
            <FileText size={15} className="shrink-0 mt-0.5" style={{ color: colors.primary }} />
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Résumé</p>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                {contract.summary}
              </p>
            </div>
          </div>
        )}

        <div
          className="prose prose-sm max-w-none text-xs sm:text-sm text-gray-700 leading-relaxed font-medium"
          dangerouslySetInnerHTML={{ __html: contract.content }}
        />

        {!scrolledToBottom && (
          <div className="text-center py-2">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-xl bg-gray-50 text-gray-400">
              <ChevronDown size={12} className="animate-bounce" />
              Lire jusqu'au bas pour valider
            </div>
          </div>
        )}

        {scrolledToBottom && (
          <div className="text-center py-2 text-green-600 text-xs font-bold animate-pulse">
            ✓ Contrat lu entièrement
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="flex-shrink-0 pt-3 border-t border-gray-100">
        <div className="flex flex-col gap-3">
          
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              id="accept_terms"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              disabled={!scrolledToBottom}
              className="w-4 h-4 mt-0.5 rounded border border-gray-200 cursor-pointer disabled:cursor-not-allowed"
              style={{ accentColor: colors.primary }}
            />
            <label htmlFor="accept_terms" className="text-xs font-semibold text-gray-700 cursor-pointer select-none">
              J'accepte sans réserve les présentes conditions
              <span className="block text-[10px] text-gray-400 font-medium">
                Validation définitive, non révocable.
              </span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50 transition-colors"
            >
              Refuser
            </button>
            
            <button
              onClick={onAccept}
              disabled={!isChecked || !scrolledToBottom || isLoading}
              className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-opacity disabled:opacity-40"
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
