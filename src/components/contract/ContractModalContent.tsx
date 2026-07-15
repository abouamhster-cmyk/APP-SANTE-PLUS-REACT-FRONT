// 📁 src/components/contract/ContractModalContent.tsx
// ✅ CONTENU CONTRAT : ALGORITHME D'AUTO-DÉBLOCAGE DE SCROLL ET SUPPRESSION DE LA DUPLICATION DE TITRE

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scale,
  ChevronDown,
  FileText,
  ThumbsUp,
  Loader2,
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
    <div className="w-full h-[3px] bg-black/5 rounded-full overflow-hidden mt-2">
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
      family: { label: 'Famille / Bénéficiaire', icon: '👨‍👩‍👦' },
      aidant: { label: 'Intervenant Aidant', icon: '🦸' },
      coordinator: { label: 'Coordinateur de santé', icon: '👔' },
      admin: { label: 'Administrateur', icon: '👑' },
    };
    return roles[role] || { label: role, icon: '👤' };
  };

  // ✅ ACCÉLÉRATEUR ET SÉCURISATION DU SCROLL SUR RETINA ET ZOOM
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    // Seuil de tolérance augmenté à 50px pour éviter les blocages liés au zoom ou à l'arrondi des pixels
    const isBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight <= 50;
    if (isBottom) setScrolledToBottom(true);
  }, []);

  // ✅ SÉCURISATION CRITIQUE : Détection automatique des textes courts ne nécessitant pas de défilement
  useEffect(() => {
    if (!contract) return;

    const checkScrollRequirement = () => {
      const target = contentRef.current;
      if (!target) return;

      // Si le contenu textuel tient entièrement dans la zone de lecture sans barre de défilement,
      // on débloque automatiquement la validation immédiatement
      const isScrollable = target.scrollHeight > target.clientHeight;
      if (!isScrollable) {
        console.log('📜 Texte court détecté - Validation débloquée automatiquement');
        setScrolledToBottom(true);
      }
    };

    // Laisser 250ms à l'injection HTML de se finaliser avant la mesure géométrique
    const timer = setTimeout(checkScrollRequirement, 250);
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
        <AlertCircle size={32} className="text-gray-300 mb-2" />
        <p className="text-xs text-gray-500 font-medium">Contrat non disponible</p>
      </div>
    );
  }

  const roleInfo = getRoleLabel(contract.role);
  const progress = scrolledToBottom ? 100 : Math.min((readTime / 12) * 100, 95);

  return (
    <div className="flex flex-col h-full max-w-full overflow-hidden">
      
      {/* BARRE DE PROGRESSION VISUELLE */}
      <div className="flex-shrink-0 pb-3">
        <ProgressBar progress={progress} />
      </div>

      {/* BODY DE LECTURE */}
      <div
        ref={contentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-2 space-y-4 pr-1 scrollbar-none"
        style={{ color: colors.text }}
      >
        {/* ✅ DESIGN OPTIMISÉ : Carte de Métadonnées contractuelle (Évite le double en-tête en haut de page) */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100/50">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            <Scale size={16} />
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-xs text-gray-800 truncate">
              {contract.title}
            </p>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
              👥 {roleInfo.label} • 📌 Version {contract.version}
            </p>
          </div>
        </div>

        {contract.summary && (
          <div className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 flex gap-2.5 items-start">
            <FileText size={15} className="shrink-0 mt-0.5" style={{ color: colors.primary }} />
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Résumé explicatif</p>
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
              Défilez jusqu'au bas du contrat pour valider
            </div>
          </div>
        )}

        {scrolledToBottom && (
          <div className="text-center py-2 text-green-600 text-xs font-bold animate-pulse">
            ✓ Conditions Générales lues en entier
          </div>
        )}
      </div>

      {/* FOOTER DES ACTIONS */}
      <div className="flex-shrink-0 pt-3 border-t border-gray-100">
        <div className="flex flex-col gap-3">
          
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              id="accept_terms"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              disabled={!scrolledToBottom}
              className="w-4 h-4 mt-0.5 rounded border border-gray-200 cursor-pointer disabled:cursor-not-allowed shrink-0"
              style={{ accentColor: colors.primary }}
            />
            <label htmlFor="accept_terms" className="text-xs font-semibold text-gray-700 cursor-pointer select-none">
              J'accepte sans réserve les présentes conditions d'utilisation
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
