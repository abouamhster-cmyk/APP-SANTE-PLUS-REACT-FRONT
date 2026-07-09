// 📁 frontend/src/features/visits/pages/VisitsPage.tsx
 
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  XCircle,
  AlertCircle,
  CreditCard,
  CheckCircle,
  UserPlus,
  Sparkles,
  Users,
  User,
  Clock,
  Eye,
  Heart,
} from 'lucide-react';

import { useVisitStore } from '@/stores/visitStore';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { usePonctualPayment } from '@/hooks/usePonctualPayment';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { VisitCard } from '@/components/visits/VisitCard';
import { VisitModal } from '../components/VisitModal';
import { VisitWizardModal } from '../components/VisitWizardModal';
import { PonctualPaymentModal } from '@/components/common/PonctualPaymentModal';
import { AssignAidantModal } from '@/features/aidants/components/AssignAidantModal';
import { getPonctualPrice } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// ✅ URL UNIQUE
const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

// ============================================================
// TYPES
// ============================================================

interface VisitWizardData {
  aidantId?: string | null;
  wizardChoice?: string;
  assignmentType?: string;
}

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

const VisitsPage = () => {
  const navigate = useNavigate();

  const { profile, role, user } = useAuthStore();
  const { visits, isLoading, fetchVisits, startVisit, cancelVisit, createVisit } = useVisitStore();
  const { patients, fetchPatients } = usePatientStore();

  // ✅ Utiliser le guard d'abonnement
  const {
    hasActiveSubscription,
    remainingVisits,
    can,
    getActionMessage,
    isFamily,
    isAidant: isAidantRole,
    isAdminOrCoordinator,
    isLoading: subLoading,
  } = useSubscriptionGuard();

  const {
    singular,
  } = useTerminology();

  // ✅ Hook de paiement ponctuel unifié
  const {
    isPaymentModalOpen,
    pendingPaymentData,
    payVisitPonctual,
    handlePaymentSuccess,
    handlePaymentCancel,
    isLoading: isPaymentLoading,
  } = usePonctualPayment({
    onSuccess: () => {
      fetchVisits();
      // ✅ UN SEUL TOAST
      toast.success('Visite planifiée après paiement !');
    },
    redirectPath: '/app/visits',
  });

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // ✅ États pour le Wizard
  const [showWizard, setShowWizard] = useState(false);
  const [wizardData, setWizardData] = useState<{
    targetType: 'patient' | 'personal_account' | 'personal';
    targetId: string;
    targetName: string;
    familyId?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    visitData?: any;
  } | null>(null);
  const [isWizardLoading, setIsWizardLoading] = useState(false);

  // ✅ États pour la conversion
  const [isConverting, setIsConverting] = useState(false);

  // ✅ États pour l'assignation d'aidant
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedVisitForAssign, setSelectedVisitForAssign] = useState<any>(null);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const canPlanify = isAdminOrCoordinator || isFamily;
  const canStartVisit = isAidantRole || isAdminOrCoordinator;
  const canCancelVisit = isAdminOrCoordinator || isFamily;

  // ✅ Déterminer si l'utilisateur peut créer des visites avec abonnement
  const canCreateWithSubscription = isFamily && hasActiveSubscription && remainingVisits > 0;

  // =============================================
  // EFFETS : CHARGEMENT DES DONNÉES
  // =============================================
  useEffect(() => {
    fetchVisits();
    fetchPatients();
  }, []);

  // =============================================
  // ✅ FILTRES SIMPLIFIÉS AVEC MODE PONCTUEL + EN_ATTENTE_AIDANT
  // =============================================
  const statusFilterOptions = useMemo(() => {
    if (isAidantRole) {
      return [
        { value: 'all', label: 'Tout' },
        { value: 'planifiee', label: 'À valider' },
        { value: 'acceptee', label: 'Confirmées' },
        { value: 'en_cours', label: 'En cours' },
        { value: 'terminee', label: 'Terminées' },
      ];
    }
    return [
      { value: 'all', label: 'Toutes les visites' },
      { value: 'planifiee', label: '📅 Planifiées' },
      { value: 'acceptee', label: '✅ Confirmées' },
      { value: 'en_cours', label: '🔄 En cours' },
      { value: 'terminee', label: '📋 Terminées' },
      { value: 'brouillon', label: '💳 En attente paiement' },
      { value: 'ponctuel', label: '⚡ Mode ponctuel' },
      { value: 'en_attente_aidant', label: '🦸 En attente d\'aidant' },
    ];
  }, [isAidantRole]);

  // =============================================
  // ✅ TRI ET FILTRAGE DES VISITES
  // =============================================
  const sortedVisits = useMemo(() => {
    return visits
      .filter((visit) => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'ponctuel') {
          return visit.metadata?.ponctual_mode === true || 
                 visit.metadata?.is_ponctual === true ||
                 visit.visit_type === 'ponctuelle';
        }
        return visit.status === filterStatus;
      })
      .sort(
        (a, b) =>
          new Date(a.scheduled_date).getTime() -
          new Date(b.scheduled_date).getTime()
      );
  }, [visits, filterStatus]);

  // =============================================
  // ✅ STATISTIQUES
  // =============================================
  const draftCount = visits.filter(v => v.status === 'brouillon').length;
  const ponctualCount = visits.filter(v => 
    v.metadata?.ponctual_mode === true || 
    v.metadata?.is_ponctual === true ||
    v.visit_type === 'ponctuelle'
  ).length;
  const waitingForAidantCount = visits.filter(v => v.status === 'en_attente_aidant').length;
  const canConvertDrafts = draftCount > 0 && hasActiveSubscription && remainingVisits > 0;

  // ✅ Message d'information sur l'abonnement
  const subscriptionInfo = useMemo(() => {
    if (isAidantRole || isAdminOrCoordinator) return null;
    
    if (!hasActiveSubscription) {
      return {
        type: 'info',
        icon: <Sparkles size={18} />,
        title: '💡 Option Mode Ponctuel disponible',
        description: 'Planifiez vos visites à l\'acte ou souscrivez à un forfait pour des tarifs d\'accompagnement préférentiels.',
        action: 'Découvrir nos offres',
        actionLink: '/app/billing',
        color: colors.primary,
      };
    }
    
    if (remainingVisits === 0) {
      return {
        type: 'warning',
        icon: <AlertCircle size={18} />,
        title: '⚠️ Votre forfait d\'heures est épuisé',
        description: 'Vous pouvez continuer à réserver vos visites au tarif ponctuel ou recharger votre abonnement.',
        action: 'Recharger',
        actionLink: '/app/billing',
        color: '#F59E0B',
      };
    }
    
    return {
      type: 'success',
      icon: <CheckCircle size={18} />,
      title: `✅ Solde actif : ${remainingVisits} visite${remainingVisits > 1 ? 's' : ''} disponible${remainingVisits > 1 ? 's' : ''}`,
      description: `Vous disposez de ${remainingVisits} crédit${remainingVisits > 1 ? 's' : ''} pour planifier l'accompagnement de vos proches.`,
      action: null,
      actionLink: null,
      color: '#10B981',
    };
  }, [hasActiveSubscription, remainingVisits, isAidantRole, isAdminOrCoordinator, colors.primary]);

  // =============================================
  // ✅ GESTION DU WIZARD - CRÉATION DE VISITE
  // =============================================

  const handleCreateVisitWithWizard = async (visitData: any) => {
    let targetType: 'patient' | 'personal_account' | 'personal' = 'personal';
    let targetId = user?.id || '';
    let targetName = profile?.full_name || 'Personnel';
    let familyId = user?.id || '';

    if (visitData.patient_id) {
      targetType = 'patient';
      targetId = visitData.patient_id;
      const patient = patients.find(p => p.id === visitData.patient_id);
      targetName = patient ? `${patient.first_name} ${patient.last_name}` : 'Patient';
    } else if (visitData.target_user_id) {
      targetType = 'personal_account';
      targetId = visitData.target_user_id;
      targetName = visitData.target_name || 'Compte personnel';
    }

    setWizardData({
      targetType,
      targetId,
      targetName,
      familyId,
      scheduledDate: visitData.scheduled_date,
      scheduledTime: visitData.scheduled_time,
      visitData,
    });
    setShowWizard(true);
  };

  // ✅ SUCCÈS DU WIZARD - UN SEUL TOAST PAR CAS
  const handleWizardSuccess = async (data: VisitWizardData) => {
    if (!wizardData) return;

    setIsWizardLoading(true);
    setShowWizard(false);

    try {
      const visitPayload = {
        ...wizardData.visitData,
        wizard_choice: data.wizardChoice,
        selected_aidant_id: data.aidantId,
        assignment_type: data.assignmentType || 'ponctuelle',
      };

      const result = await createVisit(visitPayload);

      // ✅ UN SEUL TOAST PAR CAS
      if (result?.status === 'en_attente_aidant') {
        toast.success('Visite créée en attente d\'aidant. L\'administration a été notifiée.');
      } else if (result?.status === 'brouillon') {
        const price = getPonctualPrice(result.duration_minutes || 60);
        toast.success(`💳 Visite créée en brouillon. Paiement de ${price.toLocaleString()} FCFA requis.`);
        handlePonctualPayment(result);
      } else {
        toast.success('Visite planifiée avec succès !');
      }

      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur création visite:', error);
      // ✅ UN SEUL TOAST D'ERREUR
      toast.error(error.message || 'Erreur lors de la création de la visite');
    } finally {
      setIsWizardLoading(false);
      setWizardData(null);
    }
  };

  const handleWizardClose = () => {
    setShowWizard(false);
    setWizardData(null);
  };

  // =============================================
  // ✅ CONVERTIR UN BROUILLON EN VISITE PLANIFIÉE
  // =============================================
  const handleConvertToSubscription = async (visitId: string) => {
    if (isConverting) return;

    setIsConverting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error('Session expirée, veuillez vous reconnecter');
        return;
      }

      const response = await fetch(`${API_URL}/visits/${visitId}/convert-to-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la conversion');
      }

      // ✅ UN SEUL TOAST
      toast.success(`Visite validée avec votre abonnement ! Il vous reste ${result.remaining_visits || 0} visite(s).`);
      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur conversion:', error);
      // ✅ UN SEUL TOAST D'ERREUR
      toast.error(error.message || 'Erreur lors de la conversion');
    } finally {
      setIsConverting(false);
    }
  };

  // =============================================
  // ✅ PAIEMENT PONCTUEL
  // =============================================
  const handlePonctualPayment = (visit: any) => {
    const patientName = visit.patient 
      ? `${visit.patient.first_name} ${visit.patient.last_name}` 
      : visit.target_name || 'Personnel';

    payVisitPonctual({
      visitId: visit.id,
      scheduledDate: visit.scheduled_date,
      scheduledTime: visit.scheduled_time,
      durationMinutes: visit.duration_minutes || 60,
      patientName: patientName,
      patientId: visit.patient_id || null,
      targetType: visit.target_type || 'personal',
      targetName: visit.target_name || 'Personnel',
      address: visit.patient?.address || 'Adresse non spécifiée',
    });
  };

  // =============================================
  // ✅ ASSIGNATION D'AIDANT (ADMIN)
  // =============================================
  const handleShowAssignAidantModal = (visit: any) => {
    setSelectedVisitForAssign(visit);
    setShowAssignModal(true);
  };

  const handleAssignAidantSuccess = async () => {
    useVisitStore.getState().invalidateCache();
    await fetchVisits();
    // ✅ UN SEUL TOAST
    toast.success('Aidant assigné avec succès');
  };

  const handleAdminAssignAidant = async (visitId: string, aidantId: string, assignmentType: string = 'permanente') => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error('Session expirée');
        return;
      }

      const response = await fetch(`${API_URL}/visits/admin/assign-aidant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          visitId,
          aidantId,
          assignmentType,
          force: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'assignation');
      }

      // ✅ UN SEUL TOAST
      toast.success(result.message || 'Aidant assigné avec succès');
      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur assignation:', error);
      // ✅ UN SEUL TOAST D'ERREUR
      toast.error(error.message || 'Erreur lors de l\'assignation');
    }
  };

  const handleAdd = () => {
    if (!canPlanify) {
      toast.error('Vous n\'avez pas les droits pour planifier une visite');
      return;
    }
    setSelectedVisit(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  // =============================================
  // ✅ SUCCÈS DU MODAL (SANS DOUBLE TOAST)
  // =============================================
  const handleModalSuccess = (newVisit?: any) => {
    fetchVisits();
    setIsModalOpen(false);

    if (newVisit && newVisit.metadata?.requires_payment) {
      // ✅ Redirection vers FedaPay si paiement ponctuel requis
      handlePonctualPayment(newVisit);
    }
  };

  // ✅ START VISIT - UN SEUL TOAST
  const handleStartVisit = async (visitId: string) => {
    try {
      await startVisit(visitId);
      // ✅ UN SEUL TOAST
      toast.success('Visite démarrée');
      fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur démarrage:', error);
      // ✅ UN SEUL TOAST D'ERREUR
      toast.error(error.message || 'Erreur lors du démarrage');
    }
  };

  // ✅ CANCEL VISIT - UN SEUL TOAST
  const handleCancelVisit = async (visitId: string) => {
    if (!window.confirm('Annuler cette visite ?')) return;

    try {
      await cancelVisit(visitId);
      // ✅ UN SEUL TOAST
      toast.success('Visite annulée');
      fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur annulation:', error);
      // ✅ UN SEUL TOAST D'ERREUR
      toast.error(error.message || 'Erreur lors de l\'annulation');
    }
  };

  // =============================================
  // SKELETON / LOADING STATE ÉLÉGANT
  // =============================================
  if (isLoading || subLoading) {
    return (
      <div className="space-y-6 max-w-full overflow-hidden">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#2c3f35]">
          <div className="space-y-2 w-full sm:w-2/3">
            <div className="h-6 bg-white dark:bg-[#17231d] rounded-2xl animate-pulse w-3/4 shimmer" />
            <div className="h-4 bg-white dark:bg-[#17231d] rounded-2xl animate-pulse w-1/2 shimmer" />
          </div>
          <div className="h-10 bg-white dark:bg-[#17231d] rounded-2xl animate-pulse w-32 shrink-0 shimmer" />
        </div>
        {/* Pills Skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-24 shrink-0 bg-white dark:bg-[#17231d] rounded-full animate-pulse shimmer" />
          ))}
        </div>
        {/* Cards Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-32 bg-white dark:bg-[#17231d] rounded-3xl animate-pulse border border-gray-100 dark:border-[#2c3f35] p-5 shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden space-y-6 pb-28 sm:pb-12 px-1 sm:px-0">

      {/* ============================================================
      EN-TÊTE ÉDITORIAL & HUMAIN
      ============================================================ */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#2c3f35]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
              <Calendar size={18} className="animate-pulse" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
              {isAidantRole ? 'Mes missions d\'accompagnement' : 'Planning des visites'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {isAidantRole 
              ? 'Retrouvez vos accompagnements programmés et passés auprès de nos bénéficiaires.' 
              : 'Suivez et planifiez en toute sérénité la venue d\'un auxiliaire de vie qualifié.'}
            {isFamily && (
              <span className="inline-flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                {hasActiveSubscription ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {remainingVisits} crédit(s) restants
                  </>
                ) : (
                  '💡 Mode ponctuel actif'
                )}
              </span>
            )}
            {isAdminOrCoordinator && waitingForAidantCount > 0 && (
              <span className="inline-flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                ⚠️ {waitingForAidantCount} visites sans aidant
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {canPlanify && (
            <button
              onClick={handleAdd}
              className="hidden sm:inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-white font-black text-xs transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md hover:opacity-95"
              style={{ background: colors.primary }}
            >
              <Plus size={16} strokeWidth={2.5} />
              {isFamily && !canCreateWithSubscription ? 'Visite ponctuelle' : 'Planifier un accompagnement'}
            </button>
          )}
        </div>
      </section>

      {/* ============================================================
      ✅ WIDGET D'INFORMATION ET FORFAITS (ABONNEMENT)
      ============================================================ */}
      {isFamily && subscriptionInfo && (
        <div 
          className={`relative overflow-hidden rounded-3xl p-5 border transition-all duration-300 shadow-sm ${
            subscriptionInfo.type === 'success' 
              ? 'bg-gradient-to-r from-emerald-50/50 to-teal-50/20 border-emerald-100/80 dark:from-emerald-950/10 dark:to-teal-950/5 dark:border-emerald-900/30' :
            subscriptionInfo.type === 'warning' 
              ? 'bg-gradient-to-r from-amber-50/50 to-orange-50/20 border-amber-100/80 dark:from-amber-950/10 dark:to-orange-950/5 dark:border-amber-900/30' :
              'bg-gradient-to-r from-blue-50/50 to-indigo-50/20 border-blue-100/80 dark:from-blue-950/10 dark:to-indigo-950/5 dark:border-blue-900/30'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-2xl shrink-0 ${
                subscriptionInfo.type === 'success' ? 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' :
                subscriptionInfo.type === 'warning' ? 'bg-amber-100/50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' :
                'bg-blue-100/50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
              }`}>
                {subscriptionInfo.icon}
              </div>
              <div className="space-y-1">
                <p className={`text-sm font-extrabold tracking-tight ${
                  subscriptionInfo.type === 'success' ? 'text-emerald-950 dark:text-emerald-50' :
                  subscriptionInfo.type === 'warning' ? 'text-amber-950 dark:text-amber-50' :
                  'text-blue-950 dark:text-blue-50'
                }`}>
                  {subscriptionInfo.title}
                </p>
                <p className={`text-xs leading-relaxed font-medium ${
                  subscriptionInfo.type === 'success' ? 'text-emerald-700/95 dark:text-emerald-300' :
                  subscriptionInfo.type === 'warning' ? 'text-amber-700/95 dark:text-amber-300' :
                  'text-blue-700/95 dark:text-blue-300'
                }`}>
                  {subscriptionInfo.description}
                </p>
              </div>
            </div>
            {subscriptionInfo.action && subscriptionInfo.actionLink && (
              <button
                onClick={() => navigate(subscriptionInfo.actionLink!)}
                className="px-5 py-2.5 rounded-xl text-white text-xs font-black transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 shadow-sm"
                style={{ background: subscriptionInfo.color }}
              >
                {subscriptionInfo.action}
              </button>
            )}
          </div>
          <div className="absolute right-0 top-0 w-32 h-32 rounded-full opacity-[0.03] pointer-events-none transform translate-x-12 -translate-y-12 border-4 border-current" />
        </div>
      )}

      {/* ============================================================
      ✅ ASSISTANT : VALIDER LES BROUILLONS EXISTANTS
      ============================================================ */}
      {isFamily && canConvertDrafts && (
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-50/70 to-yellow-50/30 dark:from-amber-950/10 dark:to-yellow-950/5 border border-amber-100/80 dark:border-amber-900/30 p-5 rounded-3xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-2xl bg-amber-100/50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 shrink-0">
                <AlertCircle size={22} className="animate-bounce" />
              </div>
              <div className="space-y-1">
                <p className="font-extrabold text-sm tracking-tight text-amber-950 dark:text-amber-50">
                  📋 {draftCount} visite{draftCount > 1 ? 's' : ''} en attente de validation
                </p>
                <p className="text-xs text-amber-700/95 dark:text-amber-300 leading-relaxed font-medium">
                  Vous disposez de {remainingVisits} visite(s) sur votre forfait d'heures. 
                  Débloquez et confirmez ces interventions immédiatement.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  setFilterStatus('brouillon');
                  document.querySelector('.visits-list')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm shadow-amber-500/10"
              >
                ✅ Confirmer maintenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
      ✅ ASSISTANT : VISITES EN ATTENTE D'AIDANTS (ADMIN & COORD)
      ============================================================ */}
      {isAdminOrCoordinator && waitingForAidantCount > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-50/70 to-red-50/30 dark:from-orange-950/10 dark:to-red-950/5 border border-orange-100/80 dark:border-orange-900/30 p-5 rounded-3xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-2xl bg-orange-100/50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400 shrink-0">
                <Users size={22} />
              </div>
              <div className="space-y-1">
                <p className="font-extrabold text-sm tracking-tight text-orange-950 dark:text-orange-50">
                  🦸 {waitingForAidantCount} visite{waitingForAidantCount > 1 ? 's' : ''} sans auxiliaire assigné
                </p>
                <p className="text-xs text-orange-700/95 dark:text-orange-300 leading-relaxed font-medium">
                  Aucun aidant n'est actuellement rattaché à ces créneaux. Assignez rapidement un professionnel qualifié.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFilterStatus('en_attente_aidant');
                document.querySelector('.visits-list')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              👔 Choisir les aidants
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
      BARRE DE FILTRES PILLS ÉLÉGANTE (TABS HORIZONTALES)
      ============================================================ */}
      <section className="w-full overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 py-1">
        <div className="flex items-center gap-2">
          {statusFilterOptions.map((option) => {
            const isActive = filterStatus === option.value;
            const hasBadge = option.value === 'brouillon' && draftCount > 0;
            const hasPonctualBadge = option.value === 'ponctuel' && ponctualCount > 0;
            const hasWaitingBadge = option.value === 'en_attente_aidant' && waitingForAidantCount > 0;

            return (
              <button
                key={option.value}
                onClick={() => setFilterStatus(option.value)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 select-none ${
                  isActive
                    ? 'text-white shadow-sm shadow-emerald-950/10 scale-[1.02]'
                    : 'bg-white hover:bg-gray-50 dark:bg-[#17231d] dark:hover:bg-[#24362d] text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-[#2c3f35]'
                } ${hasBadge || hasPonctualBadge || hasWaitingBadge ? 'relative' : ''}`}
                style={{
                  backgroundColor: isActive ? colors.primary : undefined,
                }}
              >
                <span className="flex items-center gap-1.5">
                  {option.label}
                  {hasBadge && (
                    <span className="bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full text-[9px] font-black leading-none shrink-0 animate-pulse">
                      {draftCount}
                    </span>
                  )}
                  {hasPonctualBadge && option.value === 'ponctuel' && (
                    <span className="bg-blue-400 text-white px-2 py-0.5 rounded-full text-[9px] font-black leading-none shrink-0">
                      {ponctualCount}
                    </span>
                  )}
                  {hasWaitingBadge && option.value === 'en_attente_aidant' && (
                    <span className="bg-orange-400 text-white px-2 py-0.5 rounded-full text-[9px] font-black leading-none shrink-0">
                      {waitingForAidantCount}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ============================================================
      LISTE DE VISITES CHRONOLOGIQUES ET STYLISÉES
      ============================================================ */}
      {sortedVisits.length > 0 ? (
        <section className="space-y-4 min-w-0 max-w-full visits-list">
          {sortedVisits.map((visit) => (
            <div 
              key={visit.id} 
              className="group relative min-w-0 max-w-full overflow-hidden rounded-3xl transition-all duration-300 hover:shadow-lg hover:shadow-gray-100/40 dark:hover:shadow-none border border-gray-100 dark:border-[#2c3f35] bg-white dark:bg-[#17231d]"
            >
              {/* Liseré dynamique en fonction du statut de l'intervention */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1.5 z-10"
                style={{ 
                  background: visit.status === 'en_cours' ? '#3B82F6' : 
                              visit.status === 'terminee' ? '#10B981' : 
                              visit.status === 'brouillon' ? '#F59E0B' :
                              visit.status === 'en_attente_aidant' ? '#F97316' : colors.primary 
                }}
              />
              <div className="pl-1.5">
                <VisitCard
                  visit={visit}
                  onClick={() => navigate(`/app/visits/${visit.id}`)}
                  showActions={true}
                  onStart={
                    canStartVisit && (visit.status === 'acceptee' || visit.status === 'planifiee')
                      ? () => handleStartVisit(visit.id)
                      : undefined
                  }
                  onCancel={
                    canCancelVisit && (visit.status === 'planifiee' || visit.status === 'en_attente' || visit.status === 'brouillon')
                      ? () => handleCancelVisit(visit.id)
                      : undefined
                  }
                  onConvertToSubscription={
                    visit.status === 'brouillon' && hasActiveSubscription && remainingVisits > 0
                      ? () => handleConvertToSubscription(visit.id)
                      : undefined
                  }
                  onPonctualPayment={
                    visit.status === 'brouillon'
                      ? () => handlePonctualPayment(visit)
                      : undefined
                  }
                  onShowAssignAidantModal={
                    isAdminOrCoordinator ? () => handleShowAssignAidantModal(visit) : undefined
                  }
                  onView={() => navigate(`/app/visits/${visit.id}`)}
                  compact
                />
              </div>
            </div>
          ))}
        </section>
      ) : (
        /* ============================================================
        ÉCRAN VIDE CHALEUREUX ET ENGAGEANT
        ============================================================ */
        <section className="bg-gradient-to-br from-white to-gray-50/50 dark:from-[#17231d] dark:to-[#17231d]/60 rounded-3xl py-14 px-6 text-center border border-gray-100 dark:border-[#2c3f35] shadow-sm max-w-2xl mx-auto space-y-5">
          <div
            className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-inner transition-transform duration-300 hover:rotate-6"
            style={{
              background: colors.primary + '12',
              color: colors.primary,
            }}
          >
            {filterStatus === 'brouillon' ? <CreditCard size={28} className="animate-pulse" /> : 
             filterStatus === 'ponctuel' ? <Sparkles size={28} /> :
             filterStatus === 'en_attente_aidant' ? <Users size={28} /> :
             <Calendar size={28} />}
          </div>

          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-black text-gray-800 dark:text-gray-100">
              {filterStatus !== 'all' ? 'Aucun accompagnement trouvé' : 'Aucun accompagnement planifié'}
            </h3>

            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
              {filterStatus === 'ponctuel' 
                ? 'Vous n\'avez pas encore réservé de visite en mode ponctuel. Idéal pour répondre à un besoin d\'accompagnement ponctuel ou d\'urgence.'
                : filterStatus === 'en_attente_aidant'
                  ? 'Toutes les visites d\'accompagnement ont été pourvues par un aidant qualifié.'
                  : filterStatus !== 'all' 
                    ? 'Aucune intervention ne correspond à ce filtre pour le moment.' 
                    : 'Planifiez la venue d\'un auxiliaire de vie qualifié pour l\'aide au repas, à la promenade ou à la toilette.'}
            </p>
          </div>

          {canPlanify && filterStatus === 'all' && (
            <div className="pt-2">
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-black text-xs transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md hover:opacity-95"
                style={{ background: colors.primary }}
              >
                <Plus size={16} strokeWidth={2.5} />
                {isFamily && !canCreateWithSubscription ? 'Réserver une visite ponctuelle' : 'Planifier une première intervention'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ============================================================
      ACCÈS RAPIDE FLOUTÉ (TACTILE & ERGONOMIQUE SUR MOBILE)
      ============================================================ */}
      {canPlanify && (
        <button
          onClick={handleAdd}
          className="sm:hidden fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200"
          style={{ 
            background: colors.primary,
            boxShadow: `0 10px 25px -5px ${colors.primary}60`
          }}
          aria-label="Planifier un nouvel accompagnement"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      )}

      {/* ============================================================
      MODALES ET WIZARDS DE L'APPLICATION
      ============================================================ */}
      <VisitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        visit={selectedVisit}
        patients={patients}
        onSuccess={(newVisit?: any) => {
          handleModalSuccess(newVisit);
        }}
      />

      {/* ✅ MODAL WIZARD */}
      {showWizard && wizardData && (
        <VisitWizardModal
          isOpen={showWizard}
          onClose={handleWizardClose}
          onSuccess={handleWizardSuccess}
          targetType={wizardData.targetType}
          targetId={wizardData.targetId}
          targetName={wizardData.targetName}
          familyId={wizardData.familyId}
          scheduledDate={wizardData.scheduledDate}
          scheduledTime={wizardData.scheduledTime}
          colors={colors}
        />
      )}

      {/* MODAL DE PAIEMENT PONCTUEL UNIFIÉ */}
      {isPaymentModalOpen && pendingPaymentData && (
        <PonctualPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={handlePaymentCancel}
          onSuccess={handlePaymentSuccess}
          paymentData={pendingPaymentData}
          redirectPath="/app/visits"
        />
      )}

      {/* MODAL D'ASSIGNATION D'AIDANT (ADMIN) */}
      {showAssignModal && selectedVisitForAssign && (
        <AssignAidantModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedVisitForAssign(null);
          }}
          targetType="visit"
          targetId={selectedVisitForAssign.id}
          targetName={selectedVisitForAssign.target_name || 
            `${selectedVisitForAssign.patient?.first_name || ''} ${selectedVisitForAssign.patient?.last_name || ''}`.trim() || 'Visite'}
          onSuccess={handleAssignAidantSuccess}
          currentAidantId={selectedVisitForAssign.aidant_id}
          colors={colors}
          allowForce={isAdminOrCoordinator}
          onAssignAidant={async (aidantId: string, assignmentType: string, force?: boolean) => { 
            await handleAdminAssignAidant(selectedVisitForAssign.id, aidantId, assignmentType); 
          }}
        />
      )}
    </div>
  );
};

export default VisitsPage;
