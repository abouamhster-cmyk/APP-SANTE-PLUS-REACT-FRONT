// 📁 src/components/contract/ContractModal.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Scale,
  ChevronDown,
  Clock,
  FileText,
  AlertTriangle,
  ThumbsUp,
  Loader2,
} from 'lucide-react';
import { getThemeColors } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface ContractModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onClose?: () => void;
  contract: {
    id: string;
    title: string;
    content: string;
    version: string;
    role: string;
    summary?: string | null;
    created_at?: string;
  } | null;
  isLoading: boolean;
}

// =============================================
// PROGRESS BAR
// =============================================
const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <div className="w-full h-[2px] bg-black/5 rounded-full overflow-hidden">
      <motion.div
        className="h-full"
        style={{ background: 'var(--color-primary, #1a4a3a)' }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(progress, 100)}%` }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
};

// =============================================
// COMPOSANT PRINCIPAL
// =============================================
export const ContractModal = ({
  isOpen,
  onAccept,
  onClose,
  contract,
  isLoading,
}: ContractModalProps) => {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [readTime, setReadTime] = useState(0);
  const [showSummary, setShowSummary] = useState(true);

  const contentRef = useRef<HTMLDivElement>(null);
  const colors = getThemeColors('senior');

  // =============================================
  // ROLE LABEL
  // =============================================
  const getRoleLabel = (role: string) => {
    const roles: Record<string, { label: string; icon: string }> = {
      family: { label: 'Famille', icon: '👨‍👩‍👦' },
      aidant: { label: 'Aidant', icon: '🦸' },
      coordinator: { label: 'Coordinateur', icon: '👔' },
      admin: { label: 'Administrateur', icon: '👑' },
    };
    return roles[role] || { label: role, icon: '👤' };
  };

  // =============================================
  // SCROLL DETECTION
  // =============================================
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isBottom =
      Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 20;

    if (isBottom) setScrolledToBottom(true);
  }, []);

  // =============================================
  // TIMER DE LECTURE
  // =============================================
  useEffect(() => {
    if (!isOpen) {
      setReadTime(0);
      setIsChecked(false);
      setScrolledToBottom(false);
      return;
    }

    const interval = setInterval(() => {
      setReadTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // =============================================
  // HANDLERS
  // =============================================
  const handleAccept = () => {
    if (!isChecked) {
      toast.error("Veuillez cocher la case d'acceptation");
      return;
    }
    if (!scrolledToBottom) {
      toast.error("Veuillez lire l'intégralité du contrat");
      return;
    }
    onAccept();
  };

  const handleRefuse = () => {
    if (onClose) onClose();
    useAuthStore.getState().logout();
    toast.error("Vous devez accepter les conditions pour continuer");
  };

  if (!isOpen || !contract) return null;

  const roleInfo = getRoleLabel(contract.role);
  const readMinutes = Math.floor(readTime / 60);
  const readSeconds = readTime % 60;
  const progress = scrolledToBottom ? 100 : Math.min((readTime / 15) * 100, 95);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        className="bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-black/5 flex flex-col"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        {/* ================= HEADER ================= */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-black/5 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: colors.primary + '10', color: colors.primary }}
              >
                <Scale size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate" style={{ color: colors.text }}>
                  {contract.title}
                </h2>
                <div className="flex items-center gap-2 text-[11px] mt-1 opacity-60">
                  <span>{roleInfo.icon} {roleInfo.label}</span>
                  <span>•</span>
                  <span>v{contract.version}</span>
                  <span>•</span>
                  <span>{readMinutes > 0 ? `${readMinutes}m` : ''}{readSeconds}s</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleRefuse}
              className="p-2 rounded-lg hover:bg-black/5 transition"
            >
              <X size={18} />
            </button>
          </div>
          <div className="px-6 pb-2">
            <ProgressBar progress={progress} />
          </div>
        </div>

        {/* ================= CONTENT ================= */}
        <div
          ref={contentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-5"
          style={{ color: colors.text }}
        >
          {/* SUMMARY */}
          {contract.summary && showSummary && (
            <div className="mb-5 p-4 rounded-xl border border-black/5 bg-black/[0.02]">
              <div className="flex gap-3">
                <FileText size={18} style={{ color: colors.primary }} />
                <div>
                  <p className="text-sm font-medium">Résumé</p>
                  <p className="text-sm opacity-70 mt-1">
                    {contract.summary}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CONTENT - Rendu HTML sécurisé */}
          <div
            className="prose prose-sm max-w-none"
            style={{
              fontSize: '14.5px',
              lineHeight: '1.7',
              color: colors.text,
            }}
            dangerouslySetInnerHTML={{ __html: contract.content }}
          />

          {/* SCROLL INDICATOR */}
          {!scrolledToBottom && (
            <div className="text-center mt-6">
              <div className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-full bg-black/5">
                <ChevronDown size={14} />
                Lire jusqu'en bas pour continuer
              </div>
            </div>
          )}

          {/* DONE */}
          {scrolledToBottom && (
            <motion.div
              className="mt-6 text-center text-green-600 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ✅ Contrat entièrement lu
            </motion.div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-black/5 px-6 py-4">
          <div className="flex flex-col gap-4">
            {/* CHECKBOX */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                disabled={!scrolledToBottom}
                className="w-4 h-4 mt-1 rounded border border-black/20"
                style={{ accentColor: colors.primary }}
              />
              <p className="text-sm">
                <span className="font-medium">
                  J'accepte les conditions
                </span>
                <br />
                <span className="text-xs opacity-60">
                  Vous confirmez avoir lu et compris le contrat.
                </span>
              </p>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-3">
              <button
                onClick={handleRefuse}
                className="flex-1 py-3 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition flex items-center justify-center gap-2"
              >
                <AlertTriangle size={16} />
                Refuser
              </button>
              <button
                onClick={handleAccept}
                disabled={!isChecked || !scrolledToBottom || isLoading}
                className="flex-1 py-3 rounded-lg text-white font-medium transition-all duration-200 hover:scale-[1.01] flex items-center justify-center gap-2 disabled:opacity-40"
                style={{
                  background: (!isChecked || !scrolledToBottom || isLoading)
                    ? '#E5E7EB'
                    : colors.primary,
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Traitement...
                  </>
                ) : (
                  <>
                    <ThumbsUp size={16} />
                    Accepter
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ContractModal;
