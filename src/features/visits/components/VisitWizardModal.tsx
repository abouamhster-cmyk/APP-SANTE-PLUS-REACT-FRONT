// 📁 frontend/src/features/visits/components/VisitWizardModal.tsx

import { useEffect, useState } from 'react';
import {
  X,
  User,
  UserPlus,
  Zap,
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
  Users,
  MapPin,
  Star,
  Briefcase,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

// ============================================================
// TYPES
// ============================================================

interface Aidant {
  id: string;
  user_id: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  specialties: string[];
  available: boolean;
  rating: number;
  total_missions: number;
  is_verified: boolean;
  current_assignments: number;
  max_assignments: number;
  available_slots: number;
  is_available: boolean;
  zones: string[];
  experience_years: number;
}

interface WizardOption {
  type: 'ponctuelle' | 'permanente' | 'without_aidant' | 'force';
  label: string;
  description: string;
  quota: number | string;
  icon?: React.ReactNode;
}

interface WizardData {
  hasAidant: boolean;
  hasAvailableAidants: boolean;
  aidants: Aidant[];
  options: WizardOption[];
  canProceed: boolean;
  allFull: boolean;
  message?: string;
  error?: string;
  isAdmin?: boolean;
}

interface VisitWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: {
    aidantId?: string | null;
    wizardChoice?: string;
    assignmentType?: string;
  }) => void;
  targetType: 'patient' | 'personal_account' | 'personal';
  targetId: string;
  targetName: string;
  familyId?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  colors?: any;
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export const VisitWizardModal = ({
  isOpen,
  onClose,
  onSuccess,
  targetType,
  targetId,
  targetName,
  familyId,
  scheduledDate,
  scheduledTime,
  colors: propColors,
}: VisitWizardModalProps) => {
  const { profile, role } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wizardData, setWizardData] = useState<WizardData | null>(null);
  const [selectedAidantId, setSelectedAidantId] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = propColors || getThemeColors(themeName);

  const isAdmin = role === 'admin' || role === 'coordinator';
  const isFamily = role === 'family';

  // ============================================================
  // CHARGEMENT DES DONNÉES DU WIZARD
  // ============================================================

  useEffect(() => {
    if (isOpen) {
      fetchWizardData();
    }
  }, [isOpen]);

  const fetchWizardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Session expirée');
      }

      const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';
      const params = new URLSearchParams({
        targetType: targetType === 'personal' ? 'personal_account' : targetType,
        targetId,
      });

      if (familyId) {
        params.append('familyId', familyId);
      }

      const response = await fetch(
        `${API_URL}/visits/wizard-options?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du chargement des options');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur inconnue');
      }

      setWizardData(result.data);
      
      // ✅ Sélectionner automatiquement le premier aidant si disponible
      if (result.data.aidants && result.data.aidants.length > 0) {
        setSelectedAidantId(result.data.aidants[0].user_id || result.data.aidants[0].id);
      }

      // ✅ Si un aidant est déjà assigné, sélectionner automatiquement
      if (result.data.hasAidant) {
        setSelectedOption('auto');
      } else if (result.data.allFull) {
        setSelectedOption('without_aidant');
      } else if (result.data.options && result.data.options.length > 0) {
        setSelectedOption(result.data.options[0].type);
      }

    } catch (error: any) {
      console.error('❌ Fetch wizard data error:', error);
      setError(error.message || 'Erreur lors du chargement');
      toast.error(error.message || 'Erreur lors du chargement des options');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // SOUMISSION
  // ============================================================

  const handleSubmit = async () => {
    // ✅ Cas 1: Un aidant est déjà assigné
    if (wizardData?.hasAidant) {
      onSuccess({
        aidantId: null, // Utilisera l'aidant déjà assigné
        wizardChoice: 'auto',
        assignmentType: 'permanente',
      });
      return;
    }

    // ✅ Cas 2: Tous les aidants sont full → Planifier sans aidant
    if (wizardData?.allFull) {
      if (selectedOption === 'without_aidant') {
        onSuccess({
          aidantId: null,
          wizardChoice: 'without_aidant',
          assignmentType: 'ponctuelle',
        });
      } else {
        toast.error('Veuillez choisir "Planifier sans aidant"');
      }
      return;
    }

    // ✅ Cas 3: Aidants disponibles
    if (!selectedAidantId) {
      toast.error('Veuillez sélectionner un aidant');
      return;
    }

    if (!selectedOption) {
      toast.error('Veuillez choisir un type d\'assignation');
      return;
    }

    // ✅ Vérifier si l'option est 'force' et que l'utilisateur est admin
    if (selectedOption === 'force' && !isAdmin) {
      toast.error('Seuls les administrateurs peuvent forcer une assignation');
      return;
    }

    // ✅ Vérifier le quota pour l'option 'permanente'
    if (selectedOption === 'permanente') {
      const selectedAidant = wizardData?.aidants?.find(
        (a) => (a.user_id || a.id) === selectedAidantId
      );
      if (selectedAidant && selectedAidant.current_assignments >= selectedAidant.max_assignments) {
        toast.error(
          `Cet aidant a déjà ${selectedAidant.current_assignments}/${selectedAidant.max_assignments} assignations. Choisissez un autre aidant ou passez en mode ponctuel.`
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      onSuccess({
        aidantId: selectedAidantId,
        wizardChoice: selectedOption,
        assignmentType: selectedOption === 'permanente' ? 'permanente' : 'ponctuelle',
      });
    } catch (error: any) {
      console.error('❌ Submit wizard error:', error);
      toast.error(error.message || 'Erreur lors de la soumission');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // RENDU - CHARGEMENT
  // ============================================================

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-3xl w-full max-w-md p-8 text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: colors.primary }} />
          <p className="text-sm font-medium" style={{ color: colors.text }}>
            Chargement des options...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-3xl w-full max-w-md p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
            <h3 className="text-lg font-bold" style={{ color: colors.text }}>
              Erreur
            </h3>
            <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
              {error}
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-xl text-white font-bold text-sm"
              style={{ background: colors.primary }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDU - CAS 1: AIDANT DÉJÀ ASSIGNÉ
  // ============================================================

  if (wizardData?.hasAidant) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: colors.text }}>
              ✅ Aidant déjà assigné
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-green-50 border border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-green-500 mt-0.5 shrink-0" size={20} />
              <div>
                <p className="text-sm font-bold text-green-700">
                  Un aidant est déjà assigné à ce compte
                </p>
                <p className="text-xs text-green-600 mt-1">
                  La visite sera automatiquement assignée à cet aidant.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full mt-4 py-3 rounded-xl text-white font-bold text-sm transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: colors.primary }}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <CheckCircle size={18} />
                Continuer avec l'aidant assigné
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDU - CAS 2: TOUS LES AIDANTS SONT FULL
  // ============================================================

  if (wizardData?.allFull) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: colors.text }}>
              ⚠️ Tous les aidants sont complets
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-yellow-50 border border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-500 mt-0.5 shrink-0" size={20} />
              <div>
                <p className="text-sm font-bold text-yellow-700">
                  Tous les aidants ont atteint leur quota maximum (4/4)
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Vous pouvez planifier la visite sans aidant. L'administration sera notifiée pour assigner un aidant.
                </p>
                {wizardData.message && (
                  <p className="text-xs text-yellow-700 mt-1 font-medium">
                    {wizardData.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <button
              onClick={() => setSelectedOption('without_aidant')}
              className={`w-full p-3 rounded-2xl border-2 text-left transition-all ${
                selectedOption === 'without_aidant'
                  ? 'border-[--color-primary] bg-[--color-primary]08'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              style={{
                borderColor: selectedOption === 'without_aidant' ? colors.primary : undefined,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: selectedOption === 'without_aidant' ? colors.primary + '15' : '#f3f4f6',
                    color: selectedOption === 'without_aidant' ? colors.primary : '#9ca3af',
                  }}
                >
                  <Zap size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: colors.text }}>
                    ⚡ Planifier sans aidant
                  </p>
                  <p className="text-xs" style={{ color: colors.text + '50' }}>
                    L'admin sera notifié pour assigner un aidant
                  </p>
                </div>
              </div>
              {selectedOption === 'without_aidant' && (
                <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle size={14} />
                  Sélectionné
                </div>
              )}
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  // Admin peut voir la liste des aidants pour forcer
                  setSelectedOption('force');
                }}
                className={`w-full p-3 rounded-2xl border-2 text-left transition-all ${
                  selectedOption === 'force'
                    ? 'border-[--color-primary] bg-[--color-primary]08'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                style={{
                  borderColor: selectedOption === 'force' ? colors.primary : undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: selectedOption === 'force' ? colors.primary + '15' : '#f3f4f6',
                      color: selectedOption === 'force' ? colors.primary : '#9ca3af',
                    }}
                  >
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: colors.text }}>
                      👔 Forcer l'assignation (Admin)
                    </p>
                    <p className="text-xs" style={{ color: colors.text + '50' }}>
                      Ignorer le quota (5/4, 6/4, etc.)
                    </p>
                  </div>
                </div>
                {selectedOption === 'force' && (
                  <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle size={14} />
                    Sélectionné
                  </div>
                )}
              </button>
            )}
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-medium border transition hover:bg-gray-50"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedOption || isSubmitting}
              className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: selectedOption ? colors.primary : '#9CA3AF' }}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <CheckCircle size={18} />
                  {selectedOption === 'without_aidant' ? 'Planifier sans aidant' : 'Continuer'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDU - CAS 3: AIDANTS DISPONIBLES
  // ============================================================

  const availableAidants = wizardData?.aidants || [];
  const options = wizardData?.options || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 p-5 border-b" style={{ borderColor: colors.border }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold" style={{ color: colors.text }}>
                🦸 Choisir un aidant
              </h2>
              <p className="text-xs mt-0.5" style={{ color: colors.text + '50' }}>
                Pour {targetName || 'la visite'} {scheduledDate && `le ${scheduledDate}`}
              </p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Info */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2">
            <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              {isAdmin
                ? '👔 En tant qu\'admin, vous pouvez forcer l\'assignation même si l\'aidant est full.'
                : 'Sélectionnez un aidant et le type d\'assignation souhaité.'}
            </p>
          </div>

          {/* Sélection de l'aidant */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: colors.text }}>
              <User size={14} className="inline mr-1" />
              Sélectionner un aidant
            </label>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {availableAidants.map((aidant) => {
                const isSelected = (aidant.user_id || aidant.id) === selectedAidantId;
                const isFull = aidant.current_assignments >= aidant.max_assignments;
                const name = aidant.user?.full_name || 'Aidant';
                const rating = aidant.rating || 0;
                const missions = aidant.total_missions || 0;

                return (
                  <button
                    key={aidant.id}
                    onClick={() => {
                      if (!isAdmin && isFull) {
                        toast.error(`Cet aidant est complet (${aidant.current_assignments}/${aidant.max_assignments})`);
                        return;
                      }
                      setSelectedAidantId(aidant.user_id || aidant.id);
                    }}
                    disabled={!isAdmin && isFull}
                    className={`w-full p-3 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-[--color-primary] bg-[--color-primary]04'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!isAdmin && isFull ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{
                      borderColor: isSelected ? colors.primary : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate" style={{ color: colors.text }}>
                          {name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-0.5">
                            <Star size={12} className="text-yellow-400 fill-yellow-400" />
                            {rating.toFixed(1)}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Briefcase size={12} />
                            {missions}
                          </span>
                          {aidant.zones && aidant.zones.length > 0 && (
                            <span className="flex items-center gap-0.5">
                              <MapPin size={12} />
                              {aidant.zones[0]}
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              isFull
                                ? 'bg-red-100 text-red-600'
                                : 'bg-green-100 text-green-600'
                            }`}
                          >
                            {isFull ? `${aidant.current_assignments}/${aidant.max_assignments}` : `${aidant.available_slots} place(s)`}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle size={18} style={{ color: colors.primary }} className="shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {availableAidants.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">
                Aucun aidant disponible pour le moment
              </p>
            )}
          </div>

          {/* Type d'assignation */}
          {selectedAidantId && (
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: colors.text }}>
                <Zap size={14} className="inline mr-1" />
                Type d'assignation
              </label>
              <div className="space-y-2">
                {options.map((option) => {
                  // 🔒 Admin peut voir l'option 'force', pas les familles
                  if (option.type === 'force' && !isAdmin) return null;

                  // 🔒 Si l'aidant est full, l'option 'permanente' est bloquée pour les familles
                  const selectedAidant = availableAidants.find(
                    (a) => (a.user_id || a.id) === selectedAidantId
                  );
                  const isFull = selectedAidant
                    ? selectedAidant.current_assignments >= selectedAidant.max_assignments
                    : false;

                  if (!isAdmin && option.type === 'permanente' && isFull) return null;

                  const isSelected = selectedOption === option.type;

                  return (
                    <button
                      key={option.type}
                      onClick={() => setSelectedOption(option.type)}
                      className={`w-full p-3 rounded-2xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-[--color-primary] bg-[--color-primary]04'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{
                        borderColor: isSelected ? colors.primary : undefined,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: isSelected ? colors.primary + '15' : '#f3f4f6',
                            color: isSelected ? colors.primary : '#9ca3af',
                          }}
                        >
                          {option.type === 'ponctuelle' && <Zap size={18} />}
                          {option.type === 'permanente' && <UserPlus size={18} />}
                          {option.type === 'force' && <Shield size={18} />}
                        </div>
                        <div>
                          <p className="font-bold text-sm" style={{ color: colors.text }}>
                            {option.label}
                          </p>
                          <p className="text-xs" style={{ color: colors.text + '50' }}>
                            {option.description}
                          </p>
                          {option.type === 'permanente' && selectedAidant && (
                            <p className="text-[10px] mt-0.5" style={{ color: colors.primary }}>
                              Quota utilisé : {selectedAidant.current_assignments}/{selectedAidant.max_assignments}
                            </p>
                          )}
                          {option.type === 'force' && isAdmin && (
                            <p className="text-[10px] mt-0.5 text-red-500">
                              ⚠️ Ignore le quota (5/4, 6/4, etc.)
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t" style={{ borderColor: colors.border }}>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-medium border transition hover:bg-gray-50"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedAidantId || !selectedOption || isSubmitting}
              className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: (selectedAidantId && selectedOption) ? colors.primary : '#9CA3AF' }}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <CheckCircle size={18} />
                  Confirmer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitWizardModal;
