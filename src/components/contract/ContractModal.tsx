// 📁 src/components/contract/ContractModal.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  CheckCircle,
  Scale,
  ShieldCheck,
  ChevronDown,
  Clock,
  Eye,
  FileText,
  UserCheck,
  AlertTriangle,
  ThumbsUp,
  Loader2,
} from 'lucide-react';
import { getThemeColors } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

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
// SOUS-COMPOSANT : PROGRESS BAR
// =============================================
const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ background: 'var(--color-primary, #1a4a3a)' }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(progress, 100)}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );
};

// =============================================
// SOUS-COMPOSANT : STEP INDICATOR
// =============================================
const StepIndicator = ({ current, total }: { current: number; total: number }) => {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            index < current ? 'w-6' : 'w-2'
          }`}
          style={{
            background: index < current 
              ? 'var(--color-primary, #1a4a3a)' 
              : 'var(--color-border, #e5e0d8)',
          }}
        />
      ))}
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
  const [hasInteracted, setHasInteracted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const colors = getThemeColors('senior');
  const { profile } = useAuthStore();

  // =============================================
  // HELPERS
  // =============================================
  const getRoleLabel = (role: string) => {
    const roles: Record<string, { label: string; icon: string; color: string }> = {
      family: { label: 'Famille', icon: '👨‍👩‍👦', color: '#4CAF50' },
      aidant: { label: 'Aidant', icon: '🦸', color: '#2196F3' },
      coordinator: { label: 'Coordinateur', icon: '👔', color: '#FF9800' },
      admin: { label: 'Administrateur', icon: '👑', color: '#9C27B0' },
    };
    return roles[role] || { label: role, icon: '👤', color: '#9E9E9E' };
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      family: '#4CAF50',
      aidant: '#2196F3',
      coordinator: '#FF9800',
      admin: '#9C27B0',
    };
    return colors[role] || '#9E9E9E';
  };

  // =============================================
  // SCROLL DETECTION
  // =============================================
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 15;
    if (isBottom && !scrolledToBottom) {
      setScrolledToBottom(true);
      setHasInteracted(true);
    }
  }, [scrolledToBottom]);

  // =============================================
  // TIMER
  // =============================================
  useEffect(() => {
    if (!isOpen) {
      setReadTime(0);
      setIsChecked(false);
      setScrolledToBottom(false);
      setHasInteracted(false);
      return;
    }

    const interval = setInterval(() => {
      setReadTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // =============================================
  // AUTO-DETECT SCROLL ON MOUNT
  // =============================================
  useEffect(() => {
    if (contentRef.current && isOpen) {
      const el = contentRef.current;
      const isBottom = Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 15;
      if (isBottom || el.scrollHeight <= el.clientHeight + 50) {
        setScrolledToBottom(true);
      }
    }
  }, [isOpen, contract]);

  // =============================================
  // HANDLERS
  // =============================================
  const handleAccept = () => {
    if (!isChecked) {
      toast.error('Veuillez cocher la case d\'acceptation');
      return;
    }
    if (!scrolledToBottom) {
      toast.error('Veuillez lire l\'intégralité du contrat');
      return;
    }
    onAccept();
  };

  const handleRefuse = () => {
    if (onClose) onClose();
    useAuthStore.getState().logout();
    toast.error('Vous devez accepter les conditions pour utiliser l\'application');
  };

  // =============================================
  // RENDER
  // =============================================
  if (!isOpen || !contract) return null;

  const roleInfo = getRoleLabel(contract.role);
  const roleColor = getRoleColor(contract.role);
  const readMinutes = Math.floor(readTime / 60);
  const readSeconds = readTime % 60;
  const progress = scrolledToBottom ? 100 : Math.min((readTime / 15) * 100, 95);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <div className="sticky top-0 bg-white z-10 border-b shrink-0" style={{ borderColor: colors.primary + '15' }}>
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4 min-w-0">
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: colors.primary + '12', color: colors.primary }}
              >
                <Scale size={24} />
              </div>

              {/* Title */}
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-black truncate" style={{ color: colors.text }}>
                    {contract.title}
                  </h2>
                  <span
                    className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                    style={{ background: roleColor }}
                  >
                    {roleInfo.icon} {roleInfo.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: colors.text + '50' }}>
                  <span>Version {contract.version}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {readMinutes > 0 ? `${readMinutes}m` : ''}{readSeconds}s de lecture
                  </span>
                  {contract.created_at && (
                    <>
                      <span>•</span>
                      <span>📅 {new Date(contract.created_at).toLocaleDateString('fr-FR')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleRefuse}
              className="p-2 hover:bg-gray-100 rounded-xl transition shrink-0"
              disabled={isLoading}
            >
              <X size={22} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-5 pb-3">
            <div className="flex items-center gap-3">
              <ProgressBar progress={progress} />
              <span className="text-xs font-bold" style={{ color: scrolledToBottom ? '#4CAF50' : colors.primary }}>
                {scrolledToBottom ? '✅ Lu' : `${Math.round(progress)}%`}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* CONTENU SCROLLABLE */}
        {/* ============================================ */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto p-6 scroll-smooth"
          onScroll={handleScroll}
          style={{
            maxHeight: 'calc(55vh)',
            minHeight: '250px',
            color: colors.text,
            scrollBehavior: 'smooth',
          }}
        >
          {/* Résumé */}
          {contract.summary && showSummary && (
            <motion.div
              className="mb-5 p-4 rounded-xl border-l-4"
              style={{
                background: colors.primary + '06',
                borderLeftColor: colors.primary,
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-start gap-3">
                <FileText size={18} style={{ color: colors.primary }} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium" style={{ color: colors.primary }}>
                    📋 Résumé du contrat
                  </p>
                  <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
                    {contract.summary}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Contenu */}
          <div
            className="prose prose-sm max-w-none"
            style={{ color: colors.text }}
            dangerouslySetInnerHTML={{ __html: contract.content }}
          />

          {/* Indicateur de lecture */}
          {!scrolledToBottom && (
            <motion.div
              className="sticky bottom-0 py-5 text-center -mx-6 px-6 mt-4"
              style={{
                background: 'linear-gradient(transparent, white 30%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full text-sm font-bold animate-pulse" style={{
                background: colors.primary + '12',
                color: colors.primary,
                border: `1px solid ${colors.primary + '20'}`,
              }}>
                <ChevronDown size={16} className="animate-bounce" />
                Scrollez pour lire l'intégralité du contrat
                <ChevronDown size={16} className="animate-bounce" />
              </div>
            </motion.div>
          )}

          {/* Confirmation de lecture */}
          {scrolledToBottom && (
            <motion.div
              className="mt-4 p-3 rounded-xl text-center"
              style={{ background: '#4CAF5010', border: '1px solid #4CAF5020' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p className="text-sm font-medium text-green-600">
                ✅ Vous avez lu l'intégralité du contrat
              </p>
            </motion.div>
          )}
        </div>

        {/* ============================================ */}
        {/* FOOTER - FIXE */}
        {/* ============================================ */}
        <div className="sticky bottom-0 bg-white border-t p-5 shrink-0" style={{ borderColor: colors.border }}>
          <div className="flex flex-col gap-4">
            {/* Checkbox */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="accept-check"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-2 shrink-0 cursor-pointer transition-all"
                style={{
                  accentColor: colors.primary,
                  borderColor: isChecked ? colors.primary : colors.border,
                }}
                disabled={!scrolledToBottom || isLoading}
              />
              <label htmlFor="accept-check" className="text-sm cursor-pointer select-none" style={{ color: colors.text }}>
                <span className="font-bold">
                  J'ai lu, compris et j'accepte les conditions générales
                </span>
                <br />
                <span className="text-xs" style={{ color: colors.text + '50' }}>
                  En acceptant, vous vous engagez à respecter l'intégralité des conditions décrites ci-dessus.
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleRefuse}
                className="flex-1 py-3 rounded-xl font-medium border transition hover:bg-red-50 flex items-center justify-center gap-2"
                style={{ borderColor: '#F4433630', color: '#F44336' }}
                disabled={isLoading}
              >
                <AlertTriangle size={18} />
                Refuser et se déconnecter
              </button>
              <button
                onClick={handleAccept}
                disabled={!isChecked || isLoading || !scrolledToBottom}
                className="flex-1 py-3 rounded-xl text-white font-bold transition hover:opacity-85 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: (!isChecked || !scrolledToBottom || isLoading) ? '#9CA3AF' : colors.primary,
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <ThumbsUp size={18} />
                    Accepter et continuer
                  </>
                )}
              </button>
            </div>

            {/* Messages d'erreur / info */}
            {!scrolledToBottom && (
              <p className="text-xs text-center" style={{ color: colors.text + '40' }}>
                📄 Veuillez lire l'intégralité du contrat avant de l'accepter
              </p>
            )}
            {scrolledToBottom && !isChecked && (
              <p className="text-xs text-center" style={{ color: colors.text + '40' }}>
                ☑️ Cochez la case pour accepter les conditions
              </p>
            )}
            {isChecked && scrolledToBottom && !isLoading && (
              <motion.p
                className="text-xs text-center text-green-600 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                ✅ Prêt à accepter - Cliquez sur "Accepter et continuer"
              </motion.p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ContractModal;