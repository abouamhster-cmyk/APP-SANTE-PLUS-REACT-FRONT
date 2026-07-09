// 📁 frontend/src/features/visits/pages/VisitsPage.tsx

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  AlertCircle,
  CreditCard,
  CheckCircle,
  Users,
  Clock,
  ChevronRight,
  Sparkles,
  Search,
  CalendarDays,
  HeartHandshake,
  UserCheck
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

// URL UNIQUE
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
    isFamily,
    isAidant: isAidantRole,
    isAdminOrCoordinator,
    isLoading: subLoading,
  } = useSubscriptionGuard();

  const { singular } = useTerminology();

  const {
    isPaymentModalOpen,
    pendingPaymentData,
    payVisitPonctual,
    handlePaymentSuccess,
    handlePaymentCancel,
  } = usePonctualPayment({
    onSuccess: () => {
      fetchVisits();
      toast.success('Visite planifiée après paiement !');
    },
    redirectPath: '/app/visits',
  });

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // États pour le Wizard
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

  // États pour la conversion / assignation
  const [isConverting, setIsConverting] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedVisitForAssign, setSelectedVisitForAssign] = useState<any>(null);

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

  // Filtres simplifiés
  const statusFilterOptions = useMemo(() => {
    if (isAidantRole) {
      return [
        { value: 'all', label: 'Toutes', icon: <Calendar size={14} /> },
        { value: 'planifiee', label: 'À valider', icon: <Clock size={14} /> },
        { value: 'acceptee', label: 'Confirmées', icon: <CheckCircle size={14} /> },
        { value: 'en_cours', label: 'En cours', icon: <HeartHandshake size={14} /> },
        { value: 'terminee', label: 'Terminées', icon: <UserCheck size={14} /> },
      ];
    }
    return [
      { value: 'all', label: 'Tout le planning', icon: <CalendarDays size={14} /> },
      { value: 'planifiee', label: 'Planifiées', icon: <Clock size={14} /> },
      { value: 'acceptee', label: 'Confirmées', icon: <CheckCircle size={14} /> },
      { value: 'en_cours', label: 'En cours', icon: <HeartHandshake size={14} /> },
      { value: 'brouillon', label: 'À valider / payer', icon: <CreditCard size={14} /> },
      { value: 'en_attente_aidant', label: 'Recherche d’aidant', icon: <Users size={14} /> },
    ];
  }, [isAidantRole]);

  // Tri et filtrage des visites
  const filteredVisits = useMemo(() => {
    return visits
      .filter((visit) => {
        // Filtrage par statut de l'onglet
        const matchesStatus = () => {
          if (filterStatus === 'all') return true;
          if (filterStatus === 'ponctuel') {
            return visit.metadata?.ponctual_mode === true || 
                   visit.metadata?.is_ponctual === true ||
                   visit.visit_type === 'ponctuelle';
          }
          return visit.status === filterStatus;
        };

        // Filtrage de recherche textuelle (Nom du bénéficiaire, aidant ou adresse)
        const matchesSearch = () => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          const patientName = visit.patient 
            ? `${visit.patient.first_name} ${visit.patient.last_name}`.toLowerCase()
            : '';
          const targetName = (visit.target_name || '').toLowerCase();
          const aidantName = visit.aidant ? `${visit.aidant.first_name} ${visit.aidant.last_name}`.toLowerCase() : '';
          const address = (visit.patient?.address || '').toLowerCase();

          return patientName.includes(query) || targetName.includes(query) || aidantName.includes(query) || address.includes(query);
        };

        return matchesStatus() && matchesSearch();
      });
  }, [visits, filterStatus, searchQuery]);

  // Groupement chronologique pour une meilleure lisibilité UX
  const groupedVisits = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const groups: { today: any[]; upcoming: any[]; past: any[] } = {
      today: [],
      upcoming: [],
      past: [],
    };

    filteredVisits.forEach((visit) => {
      const visitDate = visit.scheduled_date;
      if (visitDate === todayStr) {
        groups.today.push(visit);
      } else if (new Date(visitDate) > new Date()) {
        groups.upcoming.push(visit);
      } else {
        groups.past.push(visit);
      }
    });

    // Tri temporel
    groups.today.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
    groups.upcoming.sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
    groups.past.sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()); // Plus récentes en premier dans le passé

    return groups;
  }, [filteredVisits]);

  // Statistiques d'attention requise
  const draftCount = visits.filter(v => v.status === 'brouillon').length;
  const waitingForAidantCount = visits.filter(v => v.status === 'en_attente_aidant').length;
  const canConvertDrafts = draftCount > 0 && hasActiveSubscription && remainingVisits > 0;

  // GESTION DU WIZARD
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

      if (result?.status === 'en_attente_aidant') {
        toast.success("Visite créée, nous recherchons le meilleur aidant disponible.");
      } else if (result?.status === 'brouillon') {
        const price = getPonctualPrice(result.duration_minutes || 60);
        toast.success(`💳 Visite enregistrée. Règlement de ${price.toLocaleString()} FCFA requis.`);
        handlePonctualPayment(result);
      } else {
        toast.success('Visite planifiée avec succès !');
      }

      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur création visite:', error);
      toast.error(error.message || 'Impossible de planifier la visite');
    } finally {
      setIsWizardLoading(false);
      setWizardData(null);
    }
  };

  const handleWizardClose = () => {
    setShowWizard(false);
    setWizardData(null);
  };

  // CONVERTIR UN BROUILLON
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

      toast.success(`Visite validée sur votre abonnement ! (${result.remaining_visits || 0} restants)`);
      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur conversion:', error);
      toast.error(error.message || 'Une erreur est survenue lors de la validation');
    } finally {
      setIsConverting(false);
    }
  };

  // PAIEMENT PONCTUEL
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

  // ASSIGNATION D'AIDANT (ADMIN)
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
        throw new Error(result.error || "Impossible d'attribuer l'aidant");
      }

      toast.success(result.message || 'Aidant assigné avec succès');
      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur assignation:', error);
      toast.error(error.message || "Erreur de traitement");
    }
  };

  const handleAdd = () => {
    if (!canPlanify) {
      toast.error("Permissions insuffisantes pour planifier une visite");
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
    try {
      await startVisit(visitId);
      toast.success('Visite démarrée !');
      fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur démarrage:', error);
      toast.error(error.message || 'Impossible de démarrer');
    }
  };

  const handleCancelVisit = async (visitId: string) => {
    if (!window.confirm('Souhaitez-vous vraiment annuler cet accompagnement ?')) return;

    try {
      await cancelVisit(visitId);
      toast.success('Visite annulée');
      fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur annulation:', error);
      toast.error(error.message || "Erreur lors de l'annulation");
    }
  };

  if (isLoading || subLoading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-white dark:bg-[#17231d] rounded-2xl animate-pulse" />
        <div className="h-10 bg-white dark:bg-[#17231d] rounded-2xl animate-pulse w-2/3" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 bg-white dark:bg-[#17231d] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden space-y-6 pb-24 sm:pb-10">
      
      {/* ============================================================
      EN-TÊTE CHALEUREUX
      ============================================================ */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#2c3f35]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: colors.primary }}>
            {isAidantRole ? 'Mon activité' : 'Accompagnements'}
          </span>
          <h1 className="text-2xl font-black tracking-tight text-gray-800 dark:text-white">
            {isAidantRole ? 'Mes visites d’aide' : 'Planning & Suivi de vie'}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isAidantRole 
              ? 'Retrouvez vos missions et soutiens programmés auprès de nos bénéficiaires.' 
              : 'Gérez et facilitez le quotidien de vos proches dépendants.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canPlanify && (
            <button
              onClick={handleAdd}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-xs transition-all hover:scale-[1.02] shadow-md hover:shadow-lg"
              style={{ background: colors.primary }}
            >
              <Plus size={16} />
              {isFamily && !canCreateWithSubscription ? 'Créer un accompagnement libre' : 'Planifier une visite'}
            </button>
          )}
        </div>
      </section>

      {/* ============================================================
      DYNAMIC HUB / WIDGETS INTERACTIFS (Remplacent les bannières agressives)
      ============================================================ */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Widget 1 : Abonnement ou Info Rôle */}
        {isFamily && (
          <div className="bg-white dark:bg-[#17231d] border border-gray-100 dark:border-[#2c3f35] rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-[#1d2d25] text-emerald-600 dark:text-emerald-400">
                <Sparkles size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Abonnement</h4>
                <p className="text-sm font-black text-gray-800 dark:text-white mt-1">
                  {hasActiveSubscription ? `${remainingVisits} visite(s) incluse(s)` : 'Mode ponctuel (libre)'}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {hasActiveSubscription ? 'Prêtes à être planifiées pour vos proches.' : 'Payez uniquement les visites réservées.'}
                </p>
              </div>
            </div>
            {!hasActiveSubscription && (
              <button
                onClick={() => navigate('/app/billing')}
                className="mt-3 text-xs font-bold flex items-center justify-end text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 gap-1"
              >
                Découvrir nos offres <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* Widget 2 : Brouillons en attente de validation (Famille) */}
        {isFamily && (
          <div className={`border rounded-2xl p-4 flex flex-col justify-between shadow-sm transition ${
            draftCount > 0 
              ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/40' 
              : 'bg-white dark:bg-[#17231d] border-gray-100 dark:border-[#2c3f35]'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${
                draftCount > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' : 'bg-gray-100 text-gray-500 dark:bg-[#1d2d25]'
              }`}>
                <CreditCard size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">À confirmer</h4>
                <p className="text-sm font-black text-gray-800 dark:text-white mt-1">
                  {draftCount} visite{draftCount > 1 ? 's' : ''} en attente
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {draftCount > 0 
                    ? 'Validez-les avec votre forfait ou réglez le montant.' 
                    : 'Aucun enregistrement en attente de validation.'}
                </p>
              </div>
            </div>
            {draftCount > 0 && (
              <button
                onClick={() => {
                  setFilterStatus('brouillon');
                  document.querySelector('.visits-list')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-3 text-xs font-black flex items-center justify-end text-amber-700 dark:text-amber-400 gap-1"
              >
                Voir et valider <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* Widget 3 : Alerte Administrateur / Coordinateur (Recherche d'aidant) */}
        {isAdminOrCoordinator && (
          <div className={`border rounded-2xl p-4 flex flex-col justify-between shadow-sm transition ${
            waitingForAidantCount > 0 
              ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/40' 
              : 'bg-white dark:bg-[#17231d] border-gray-100 dark:border-[#2c3f35]'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${
                waitingForAidantCount > 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30' : 'bg-gray-100 text-gray-500 dark:bg-[#1d2d25]'
              }`}>
                <AlertCircle size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Demandes d’aidants</h4>
                <p className="text-sm font-black text-gray-800 dark:text-white mt-1">
                  {waitingForAidantCount} visite{waitingForAidantCount > 1 ? 's' : ''} sans aidant
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {waitingForAidantCount > 0 
                    ? 'Des bénéficiaires attendent une attribution.' 
                    : 'Toutes les visites d’accompagnement sont pourvues.'}
                </p>
              </div>
            </div>
            {waitingForAidantCount > 0 && (
              <button
                onClick={() => {
                  setFilterStatus('en_attente_aidant');
                  document.querySelector('.visits-list')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-3 text-xs font-black flex items-center justify-end text-rose-700 dark:text-rose-400 gap-1"
              >
                Assigner un aidant <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}
      </section>

      {/* ============================================================
      RECHERCHE ET FILTRES ERGONOMIQUES
      ============================================================ */}
      <section className="bg-white dark:bg-[#17231d] rounded-2xl border border-gray-100 dark:border-[#2c3f35] p-3 sm:p-4 space-y-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          
          {/* Barre de recherche */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Rechercher par proche, aidant, adresse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#2c3f35] bg-gray-50/50 dark:bg-[#111a15]/50 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': colors.primary } as React.CSSProperties}
            />
          </div>

          {/* Sélecteur de filtres de statut (Défilant sur mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            {statusFilterOptions.map((option) => {
              const isActive = filterStatus === option.value;
              const hasBadge = option.value === 'brouillon' && draftCount > 0;
              const hasWaitingBadge = option.value === 'en_attente_aidant' && waitingForAidantCount > 0;

              return (
                <button
                  key={option.value}
                  onClick={() => setFilterStatus(option.value)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'bg-gray-50 hover:bg-gray-100 dark:bg-[#24362d] dark:hover:bg-[#1d2d25] text-gray-500 dark:text-gray-400'
                  }`}
                  style={{
                    backgroundColor: isActive ? colors.primary : undefined,
                  }}
                >
                  {option.icon}
                  <span>{option.label}</span>
                  {hasBadge && (
                    <span className="ml-1 bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-full text-[9px] font-black">
                      {draftCount}
                    </span>
                  )}
                  {hasWaitingBadge && (
                    <span className="ml-1 bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded-full text-[9px] font-black">
                      {waitingForAidantCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
      TIMELINE / LISTE CHRONOLOGIQUE DES VISITES
      ============================================================ */}
      <div className="visits-list space-y-6">
        
        {/* Section: Aujourd'hui */}
        {groupedVisits.today.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Aujourd’hui
              </h2>
              <span className="text-xs text-gray-400">({groupedVisits.today.length})</span>
            </div>
            <div className="grid grid-cols-1 gap-3.5">
              {groupedVisits.today.map((visit) => (
                <VisitCard
                  key={visit.id}
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
              ))}
            </div>
          </div>
        )}

        {/* Section: À Venir */}
        {groupedVisits.upcoming.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Prochains accompagnements
            </h2>
            <div className="grid grid-cols-1 gap-3.5">
              {groupedVisits.upcoming.map((visit) => (
                <VisitCard
                  key={visit.id}
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
              ))}
            </div>
          </div>
        )}

        {/* Section: Historique */}
        {groupedVisits.past.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-gray-400">
              Historique des interventions
            </h2>
            <div className="grid grid-cols-1 gap-3.5">
              {groupedVisits.past.map((visit) => (
                <VisitCard
                  key={visit.id}
                  visit={visit}
                  onClick={() => navigate(`/app/visits/${visit.id}`)}
                  showActions={false}
                  onView={() => navigate(`/app/visits/${visit.id}`)}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {/* ÉCRAN DE VIDE / AUCUNE DONNÉE */}
        {filteredVisits.length === 0 && (
          <section className="bg-white dark:bg-[#17231d] rounded-2xl py-14 px-6 text-center border border-gray-100 dark:border-[#2c3f35] shadow-sm">
            <div
              className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
              style={{
                background: colors.primary + '10',
                color: colors.primary,
              }}
            >
              <Calendar size={26} />
            </div>

            <h3 className="text-base font-bold text-gray-700 dark:text-gray-100">
              Aucun accompagnement trouvé
            </h3>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-sm mx-auto">
              {filterStatus !== 'all' 
                ? "Il n'y a pas de visites correspondantes au filtre sélectionné actuellement." 
                : "Planifiez une première intervention pour simplifier le quotidien de vos proches."}
            </p>

            {canPlanify && filterStatus === 'all' && (
              <button
                onClick={handleAdd}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs transition hover:scale-[1.02]"
                style={{ background: colors.primary }}
              >
                <Plus size={16} />
                Planifier ma première visite
              </button>
            )}
          </section>
        )}
      </div>

      {/* Bouton d'accès rapide flottant (Mobile) */}
      {canPlanify && (
        <button
          onClick={handleAdd}
          className="sm:hidden fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full text-white shadow-xl flex items-center justify-center active:scale-95 transition"
          style={{ background: colors.primary }}
          aria-label="Nouvelle planification"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Modales configurées */}
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
