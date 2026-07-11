// 📁 frontend/src/features/visits/pages/VisitsPage.tsx
// ✅ PAGE DES VISITES COMPLETE : PLANIFICATION ET COMPATIBILITÉ SANS RESTRICTION ET SÉCURISATION ANTI DOUBLE-CLIC

import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  AlertCircle,
  CreditCard,
  CheckCircle,
  Sparkles,
  Users,
  RefreshCw,
  X,
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
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

interface VisitWizardData {
  aidantId?: string | null;
  wizardChoice?: string;
  assignmentType?: string;
}

const VisitsPage = () => {
  const navigate = useNavigate();

  const { profile, role, user } = useAuthStore();
  const { visits, isLoading, fetchVisits, startVisit, cancelVisit, createVisit } = useVisitStore();
  const { patients, fetchPatients } = usePatientStore();

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
      toast.success('Visite planifiée après paiement !');
    },
    redirectPath: '/app/visits',
  });

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

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

  const [isConverting, setIsConverting] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedVisitForAssign, setSelectedVisitForAssign] = useState<any>(null);

  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startTouchY = useRef(0);

  // ✅ VERROU DE SÉCURITÉ CONTRE LES DOUBLES-CLICS SUR LES LISTES D'ACTIONS
  const isActionPending = useRef(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const canPlanify = isAdminOrCoordinator || isFamily;
  const canStartVisit = isAidantRole || isAdminOrCoordinator;
  const canCancelVisit = isAdminOrCoordinator || isFamily;

  const canCreateWithSubscription = isFamily && hasActiveSubscription && remainingVisits > 0;

  useEffect(() => {
    fetchVisits();
    fetchPatients();
  }, []);

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

  const draftCount = visits.filter(v => v.status === 'brouillon').length;
  const ponctualCount = visits.filter(v => 
    v.metadata?.ponctual_mode === true || 
    v.metadata?.is_ponctual === true ||
    v.visit_type === 'ponctuelle'
  ).length;
  const waitingForAidantCount = visits.filter(v => v.status === 'en_attente_aidant').length;
  const canConvertDrafts = draftCount > 0 && hasActiveSubscription && remainingVisits > 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startTouchY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - startTouchY.current;

    if (diffY > 0 && window.scrollY === 0) {
      const resistance = Math.min(diffY * 0.38, 72);
      setPullY(resistance);
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    setIsPulling(false);
    if (pullY >= 50) {
      toast.promise(
        (async () => {
          await fetchVisits();
          await fetchPatients();
        })(),
        {
          loading: 'Actualisation des visites...',
          success: 'Planning synchronisé !',
          error: 'Échec de synchronisation.',
        }
      );
    }
    setPullY(0);
  };

  const handleCreateVisitWithWizard = async (visitData: any) => {
    if (isActionPending.current) return;
    
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

  const handleWizardSuccess = async (data: VisitWizardData) => {
    if (!wizardData || isActionPending.current) return;

    isActionPending.current = true;
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
      toast.error(error.message || 'Erreur lors de la création de la visite');
    } finally {
      setIsWizardLoading(false);
      setWizardData(null);
      isActionPending.current = false;
    }
  };

  const handleWizardClose = () => {
    setShowWizard(false);
    setWizardData(null);
  };

  const handleConvertToSubscription = async (visitId: string) => {
    if (isConverting || isActionPending.current) return;

    isActionPending.current = true;
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

      toast.success(`Visite validée avec votre abonnement ! Il vous reste ${result.remaining_visits || 0} visite(s).`);
      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur conversion:', error);
      toast.error(error.message || 'Erreur lors de la conversion');
    } finally {
      setIsConverting(false);
      isActionPending.current = false;
    }
  };

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

  const handleShowAssignAidantModal = (visit: any) => {
    setSelectedVisitForAssign(visit);
    setShowAssignModal(true);
  };

  const handleAssignAidantSuccess = async () => {
    useVisitStore.getState().invalidateCache();
    await fetchVisits();
    toast.success('Aidant assigné avec succès');
  };

  const handleAdminAssignAidant = async (visitId: string, aidantId: string, assignmentType: string = 'permanente') => {
    if (isActionPending.current) return;
    
    isActionPending.current = true;
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

      toast.success(result.message || 'Aidant assigné avec succès');
      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur assignation:', error);
      toast.error(error.message || 'Erreur lors de l\'assignation');
    } finally {
      isActionPending.current = false;
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

  const handleModalSuccess = (newVisit?: any) => {
    fetchVisits();
    setIsModalOpen(false);

    if (newVisit && newVisit.metadata?.requires_payment) {
      handlePonctualPayment(newVisit);
    }
  };

  const handleStartVisit = async (visitId: string) => {
    if (isActionPending.current) return;
    
    isActionPending.current = true;
    try {
      await startVisit(visitId);
      toast.success('Visite démarrée');
      fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur démarrage:', error);
      toast.error(error.message || 'Erreur lors du démarrage');
    } finally {
      isActionPending.current = false;
    }
  };

  const handleCancelVisit = async (visitId: string) => {
    if (isActionPending.current) return;
    if (!window.confirm('Annuler cette visite ?')) return;

    isActionPending.current = true;
    try {
      await cancelVisit(visitId);
      toast.success('Visite annulée');
      fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur annulation:', error);
      toast.error(error.message || 'Erreur lors de l\'annulation');
    } finally {
      isActionPending.current = false;
    }
  };

  if (isLoading || subLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 bg-gray-100 dark:bg-gray-800/50 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 bg-gray-100 dark:bg-gray-800/30 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full max-w-5xl mx-auto space-y-6 pb-6 px-1 sm:px-0" 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      
      {/* INDICATEUR DE PULL-TO-REFRESH MOBILE */}
      <div 
        className="w-full flex justify-center overflow-hidden transition-all duration-300 ease-out"
        style={{ 
          height: pullY > 0 ? `${pullY}px` : '0px',
          opacity: pullY > 0 ? Math.min(pullY / 45, 1) : 0
        }}
      >
        <div className="flex items-center gap-1.5 py-1 text-emerald-600 dark:text-emerald-400">
          <RefreshCw 
            size={13} 
            className={cn("transition-all", pullY >= 50 ? "rotate-180 animate-spin" : "")} 
            style={{ transform: pullY < 50 ? `rotate(${pullY * 3.6}deg)` : undefined }}
          />
          <span className="text-[10px] font-black uppercase tracking-wider">
            {pullY >= 50 ? 'Relâcher pour actualiser' : 'Tirer pour rafraîchir'}
          </span>
        </div>
      </div>

      {/* CADRE UNIQUE ÉPURÉ */}
      <section className="relative overflow-hidden bg-white/60 dark:bg-[#17231d]/60 border border-gray-100/80 dark:border-gray-800/40 rounded-2xl p-6 flex flex-col items-center text-center gap-4 shadow-sm backdrop-blur-md">
        
        <div className="space-y-1 relative z-10">
          <h1 className="text-base sm:text-lg font-black tracking-tight text-gray-800 dark:text-gray-100">
            {isAidantRole ? 'Mes missions d\'accompagnement' : 'Planning des visites'}
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm mx-auto leading-relaxed">
            {isAidantRole 
              ? 'Consultez et validez vos interventions programmées à domicile.' 
              : 'Planification simplifiée de l\'accompagnement de vos proches.'}
          </p>
        </div>

        {isFamily && (
          <div className="px-5 py-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 text-center max-w-xs w-full relative z-10">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 leading-none">
              {hasActiveSubscription ? 'Forfait disponible' : 'Tarification'}
            </p>
            <p className="text-base font-black text-emerald-800 dark:text-emerald-100 mt-1 leading-none">
              {hasActiveSubscription ? `${remainingVisits} visite${remainingVisits > 1 ? 's' : ''}` : 'Mode Ponctuel'}
            </p>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium mt-1 leading-none">
              {hasActiveSubscription ? 'Crédits d\'interventions actifs' : 'Accompagnement à l\'acte'}
            </p>
          </div>
        )}

        {isFamily && draftCount > 0 && (
          <button
            onClick={() => setFilterStatus('brouillon')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/50 dark:bg-[#2c2211] border border-amber-100/50 dark:border-amber-900/30 text-[10px] font-extrabold text-amber-800 dark:text-amber-300 transition hover:bg-amber-100/40 relative z-10"
          >
            <AlertCircle size={12} className="text-amber-500 animate-pulse" />
            <span>{draftCount} intervention{draftCount > 1 ? 's' : ''} en attente de paiement</span>
          </button>
        )}

        {isAdminOrCoordinator && waitingForAidantCount > 0 && (
          <button
            onClick={() => setFilterStatus('en_attente_aidant')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50/50 dark:bg-[#2c1d11] border border-orange-100/50 dark:border-orange-900/30 text-[10px] font-extrabold text-orange-800 dark:text-orange-300 transition hover:bg-orange-100/40 relative z-10"
          >
            <AlertCircle size={12} className="text-orange-500 animate-pulse" />
            <span>{waitingForAidantCount} visite{waitingForAidantCount > 1 ? 's' : ''} sans auxiliaire rattaché</span>
          </button>
        )}

        {canPlanify && (
          <button
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shadow-sm relative z-10"
            style={{ background: colors.primary }}
          >
            <Plus size={13} strokeWidth={2.5} />
            <span>Planifier une visite</span>
          </button>
        )}

        <button
          onClick={async () => {
            toast.promise(
              (async () => {
                await fetchVisits();
                await fetchPatients();
              })(),
              {
                loading: 'Mise à jour...',
                success: 'Planning actualisé !',
                error: 'Échec de la mise à jour',
              }
            );
          }}
          disabled={isLoading}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-gray-50 dark:bg-[#24362d] flex items-center justify-center text-gray-400 hover:text-gray-600 transition shadow-inner"
          title="Rafraîchir"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
        </button>

      </section>

      {/* FILTRES */}
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
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap select-none flex items-center gap-1.5",
                  isActive
                    ? "bg-white dark:bg-[#17231d] text-gray-900 dark:text-white shadow-sm font-extrabold"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                )}
                style={isActive ? { color: colors.primary } : undefined}
              >
                <span>{option.label}</span>
                {hasDraftBadge && (
                  <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold leading-none">
                    {draftCount}
                  </span>
                )}
                {hasWaitingBadge && (
                  <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold leading-none">
                    {waitingForAidantCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* LISTE DES VISITES */}
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
        /* ÉCRAN VIDE */
        <section className="bg-white/40 dark:bg-[#17231d]/40 rounded-2xl py-16 px-6 text-center border border-gray-100 dark:border-gray-800/40 max-w-sm mx-auto flex flex-col items-center justify-center gap-4 backdrop-blur-sm shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-[#24362d] flex items-center justify-center text-gray-400">
            <Calendar size={20} />
          </div>

          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-gray-800 dark:text-gray-100">
              Aucun accompagnement trouvé
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed">
              {filterStatus !== 'all' 
                ? 'Essayez de changer les filtres pour afficher d\'autres status.'
                : 'Planifiez vos interventions d\'aide et d\'accompagnement à domicile.'}
            </p>
          </div>

          {canPlanify && filterStatus === 'all' && (
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-white font-bold text-xs transition hover:opacity-90 shadow-sm"
              style={{ background: colors.primary }}
            >
              <Plus size={13} strokeWidth={2.5} />
              Planifier une visite
            </button>
          )}
        </section>
      )}

      {/* BOUTON FLOATING MOBILE */}
      {canPlanify && (
        <button
          onClick={handleAdd}
          className="sm:hidden fixed bottom-24 right-5 z-40 w-12 h-12 rounded-full text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          style={{ 
            background: colors.primary,
            boxShadow: `0 8px 24px -6px ${colors.primary}`
          }}
          aria-label="Planifier un nouvel accompagnement"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      )}

      {/* MODALES */}
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
