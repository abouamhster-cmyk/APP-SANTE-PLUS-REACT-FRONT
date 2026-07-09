// 📁 frontend/src/features/visits/pages/VisitsPage.tsx
 
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  AlertCircle,
  CreditCard,
  CheckCircle,
  Sparkles,
  Users,
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
      { value: 'planifiee', label: 'Planifiées' },
      { value: 'acceptee', label: 'Confirmées' },
      { value: 'en_cours', label: 'En cours' },
      { value: 'terminee', label: 'Terminées' },
      { value: 'brouillon', label: 'En attente' },
      { value: 'ponctuel', label: 'Mode ponctuel' },
      { value: 'en_attente_aidant', label: 'Attente d\'aidant' },
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

  // =============================================
  // ✅ METRICS ET STATS DE SYNTHÈSE (Suppression des alertes redondantes)
  // =============================================
  const statsOverview = useMemo(() => {
    const list = [];
    
    if (isFamily) {
      list.push({
        id: 'sub',
        label: hasActiveSubscription ? 'Forfait disponible' : 'Tarification',
        value: hasActiveSubscription ? `${remainingVisits} visite${remainingVisits > 1 ? 's' : ''}` : 'Mode Ponctuel',
        subtext: hasActiveSubscription ? 'Crédits d\'intervention actifs' : 'Accompagnement à l\'acte',
        icon: <Sparkles size={16} className="text-emerald-500" />,
        bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100/50 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-200',
        onClick: () => navigate('/app/billing')
      });

      if (draftCount > 0) {
        list.push({
          id: 'drafts',
          label: 'Interventions en attente',
          value: `${draftCount} à valider`,
          subtext: canConvertDrafts ? 'Valider via votre forfait' : 'Régler par carte',
          icon: <CreditCard size={16} className="text-amber-500 animate-pulse" />,
          bgColor: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-100/50 dark:border-amber-900/30 text-amber-800 dark:text-amber-200',
          onClick: () => setFilterStatus('brouillon')
        });
      }
    }

    if (isAdminOrCoordinator) {
      list.push({
        id: 'total_visits',
        label: 'Visites enregistrées',
        value: `${visits.length} intervention${visits.length > 1 ? 's' : ''}`,
        subtext: 'Toutes périodes confondues',
        icon: <Calendar size={16} className="text-blue-500" />,
        bgColor: 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100/50 dark:border-blue-900/30 text-blue-800 dark:text-blue-200',
      });

      if (waitingForAidantCount > 0) {
        list.push({
          id: 'waiting_aidant',
          label: 'Attributions requises',
          value: `${waitingForAidantCount} sans aidant`,
          subtext: 'Assignation manuelle requise',
          icon: <AlertCircle size={16} className="text-orange-500 animate-pulse" />,
          bgColor: 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-100/50 dark:border-orange-900/30 text-orange-800 dark:text-orange-200',
          onClick: () => setFilterStatus('en_attente_aidant')
        });
      }
    }

    if (isAidantRole) {
      const upcoming = visits.filter(v => v.status === 'acceptee' || v.status === 'planifiee').length;
      list.push({
        id: 'missions',
        label: 'Accompagnements à venir',
        value: `${upcoming} mission${upcoming > 1 ? 's' : ''}`,
        subtext: 'Sur votre planning actif',
        icon: <CheckCircle size={16} className="text-emerald-500" />,
        bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100/50 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-200',
      });
    }

    return list;
  }, [isFamily, isAdminOrCoordinator, isAidantRole, hasActiveSubscription, remainingVisits, draftCount, canConvertDrafts, visits.length, waitingForAidantCount]);

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
      handlePonctualPayment(newVisit);
    }
  };

  // ✅ START VISIT - UN SEUL TOAST
  const handleStartVisit = async (visitId: string) => {
    try {
      await startVisit(visitId);
      toast.success('Visite démarrée');
      fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur démarrage:', error);
      toast.error(error.message || 'Erreur lors du démarrage');
    }
  };

  // ✅ CANCEL VISIT - UN SEUL TOAST
  const handleCancelVisit = async (visitId: string) => {
    if (!window.confirm('Annuler cette visite ?')) return;

    try {
      await cancelVisit(visitId);
      toast.success('Visite annulée');
      fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur annulation:', error);
      toast.error(error.message || 'Erreur lors de l\'annulation');
    }
  };

  // =============================================
  // ÉCRAN DE CHARGEMENT SQUELETTE
  // =============================================
  if (isLoading || subLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-white dark:bg-[#17231d] rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-20 bg-white dark:bg-[#17231d] rounded-2xl animate-pulse" />
          <div className="h-20 bg-white dark:bg-[#17231d] rounded-2xl animate-pulse" />
        </div>
        <div className="h-10 bg-white dark:bg-[#17231d] rounded-full animate-pulse w-2/3" />
        <div className="space-y-3">
          {[1, 2].map((item) => (
            <div key={item} className="h-28 bg-white dark:bg-[#17231d] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden space-y-6 pb-24 sm:pb-10">

      {/* ============================================================
      EN-TÊTE ÉPURÉ SANS LOGOS DE COMPTABILITÉ
      ============================================================ */}
      <section className="flex items-center justify-between gap-4 pb-3 border-b border-gray-100 dark:border-[#2c3f35]">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: colors.text }}>
            {isAidantRole ? 'Mes missions d\'accompagnement' : 'Planning des visites'}
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {isAidantRole 
              ? 'Consultez et validez vos interventions programmées à domicile.' 
              : 'Planification simplifiée de l\'accompagnement de vos proches.'}
          </p>
        </div>

        {canPlanify && (
          <button
            onClick={handleAdd}
            className="hidden sm:inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs transition hover:opacity-90 shadow-sm"
            style={{ background: colors.primary }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Planifier une visite
          </button>
        )}
      </section>

      {/* ============================================================
      SYNTHÈSE ET METRICS (Pas d'alertes géantes, intégration naturelle)
      ============================================================ */}
      {statsOverview.length > 0 && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {statsOverview.map((item) => (
            <div
              key={item.id}
              onClick={item.onClick}
              className={`flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                item.onClick ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : ''
              } ${item.bgColor}`}
            >
              <div className="p-2 rounded-xl bg-white/70 dark:bg-black/20 shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">
                  {item.label}
                </span>
                <span className="text-base font-extrabold block tracking-tight mt-0.5">
                  {item.value}
                </span>
                <span className="text-[11px] opacity-80 block mt-0.5">
                  {item.subtext}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ============================================================
      CONTRÔLEUR DE FILTRES SEGMENTÉ (SANS ACCUMULATION DE BOUTONS)
      ============================================================ */}
      <section className="w-full overflow-x-auto scrollbar-none py-1">
        <div className="inline-flex p-1 bg-gray-100/80 dark:bg-[#1c2a21]/50 rounded-2xl border border-gray-200/10 dark:border-[#2c3f35]/20 gap-1">
          {statusFilterOptions.map((option) => {
            const isActive = filterStatus === option.value;
            const hasDraftBadge = option.value === 'brouillon' && draftCount > 0;
            const hasWaitingBadge = option.value === 'en_attente_aidant' && waitingForAidantCount > 0;

            return (
              <button
                key={option.value}
                onClick={() => setFilterStatus(option.value)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap select-none flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white dark:bg-[#17231d] text-gray-900 dark:text-white shadow-sm font-extrabold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
                style={isActive ? { color: colors.primary } : undefined}
              >
                <span>{option.label}</span>
                {hasDraftBadge && (
                  <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold">
                    {draftCount}
                  </span>
                )}
                {hasWaitingBadge && (
                  <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold">
                    {waitingForAidantCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ============================================================
      LISTE DE VISITES
      ============================================================ */}
      {sortedVisits.length > 0 ? (
        <section className="space-y-3.5 visits-list">
          {sortedVisits.map((visit) => (
            <div key={visit.id} className="transition-all duration-200 hover:translate-y-[-1px]">
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
          ))}
        </section>
      ) : (
        /* ============================================================
        ÉCRAN VIDE DESIGN ET ÉPURÉ
        ============================================================ */
        <section className="bg-white dark:bg-[#17231d] rounded-2xl py-14 px-4 text-center border border-gray-100 dark:border-[#2c3f35] max-w-md mx-auto space-y-4">
          <div
            className="w-11 h-11 rounded-2xl mx-auto flex items-center justify-center"
            style={{
              background: colors.primary + '10',
              color: colors.primary,
            }}
          >
            <Calendar size={18} />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              Aucun accompagnement trouvé
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-400 max-w-xs mx-auto">
              {filterStatus !== 'all' 
                ? 'Essayez de changer les filtres pour afficher d\'autres status.'
                : 'Planifiez vos interventions d\'aide et d\'accompagnement à domicile.'}
            </p>
          </div>

          {canPlanify && filterStatus === 'all' && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs transition hover:opacity-90"
              style={{ background: colors.primary }}
            >
              <Plus size={14} />
              Planifier une visite
            </button>
          )}
        </section>
      )}

      {/* ============================================================
      ACCÈS RAPIDE MOBILES (PLACEMENT PRÉCIS ET TACTILE)
      ============================================================ */}
      {canPlanify && (
        <button
          onClick={handleAdd}
          className="sm:hidden fixed bottom-24 right-5 z-40 w-12 h-12 rounded-full text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          style={{ 
            background: colors.primary,
            boxShadow: `0 8px 24px -6px ${colors.primary}`
          }}
          aria-label="Planifier une visite d'accompagnement"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      )}

      {/* ============================================================
      MODALES ET INTERFACES SECONDAIRES
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

      {isPaymentModalOpen && pendingPaymentData && (
        <PonctualPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={handlePaymentCancel}
          onSuccess={handlePaymentSuccess}
          paymentData={pendingPaymentData}
          redirectPath="/app/visits"
        />
      )}

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
