// 📁 src/features/visits/pages/VisitsPage.tsx

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
import { PonctualPaymentModal } from '@/components/common/PonctualPaymentModal';
import { AssignAidantModal } from '@/components/common/AssignAidantModal';
import { getPonctualPrice } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// ✅ URL UNIQUE
const API_URL = import.meta.env.VITE_API_URL || 'https://app-react-back.onrender.com/api';

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

const VisitsPage = () => {
  const navigate = useNavigate();

  const { profile, role } = useAuthStore();
  const { visits, isLoading, fetchVisits, startVisit, cancelVisit } = useVisitStore();
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
  // ✅ FILTRES SIMPLIFIÉS AVEC MODE PONCTUEL
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
      { value: 'brouillon', label: '💳 En attente paiement' },
      { value: 'ponctuel', label: '⚡ Mode ponctuel' },
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
  const canConvertDrafts = draftCount > 0 && hasActiveSubscription && remainingVisits > 0;

  // ✅ Message d'information sur l'abonnement
  const subscriptionInfo = useMemo(() => {
    if (isAidantRole || isAdminOrCoordinator) return null;
    
    if (!hasActiveSubscription) {
      return {
        type: 'info',
        icon: <Sparkles size={18} />,
        title: '💡 Pas d\'abonnement ?',
        description: 'Utilisez le mode ponctuel pour planifier vos visites à l\'acte.',
        action: 'Voir les offres',
        actionLink: '/app/billing',
        color: colors.primary,
      };
    }
    
    if (remainingVisits === 0) {
      return {
        type: 'warning',
        icon: <AlertCircle size={18} />,
        title: '⚠️ Plus de visites disponibles',
        description: 'Vous avez utilisé toutes vos visites. Passez en mode ponctuel ou renouvelez votre abonnement.',
        action: 'Renouveler',
        actionLink: '/app/billing',
        color: '#F59E0B',
      };
    }
    
    return {
      type: 'success',
      icon: <CheckCircle size={18} />,
      title: `✅ ${remainingVisits} visite${remainingVisits > 1 ? 's' : ''} disponible${remainingVisits > 1 ? 's' : ''}`,
      description: `Vous pouvez planifier ${remainingVisits} visite${remainingVisits > 1 ? 's' : ''} avec votre abonnement.`,
      action: null,
      actionLink: null,
      color: '#10B981',
    };
  }, [hasActiveSubscription, remainingVisits, isAidantRole, isAdminOrCoordinator, colors.primary]);

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

      toast.success(`Visite validée avec votre abonnement ! Il vous reste ${result.remaining_visits || 0} visite(s).`);
      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur conversion:', error);
      toast.error(error.message || 'Erreur lors de la conversion');
    } finally {
      setIsConverting(false);
    }
  };

  // =============================================
  // ✅ PAIEMENT PONCTUEL - AVEC LE HOOK UNIFIÉ
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
  // ✅ ASSIGNATION D'AIDANT
  // =============================================
  const handleShowAssignAidantModal = (visit: any) => {
    setSelectedVisitForAssign(visit);
    setShowAssignModal(true);
  };

  const handleAssignAidantSuccess = async () => {
    useVisitStore.getState().invalidateCache();
    await fetchVisits();
    toast.success('Aidant assigné avec succès');
  };

  // =============================================
  // ✅ OUVERTURE DU MODAL DE CRÉATION
  // =============================================
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
  // ✅ SUCCÈS DU MODAL
  // =============================================
  const handleModalSuccess = (newVisit?: any) => {
    fetchVisits();
    setIsModalOpen(false);

    if (newVisit && newVisit.metadata?.requires_payment) {
      // ✅ Utiliser le hook unifié pour le paiement
      handlePonctualPayment(newVisit);
    } else {
      toast.success(modalMode === 'create' ? 'Visite planifiée' : 'Visite mise à jour');
    }
  };

  // =============================================
  // ✅ DÉMARRER UNE VISITE
  // =============================================
  const handleStartVisit = async (visitId: string) => {
    try {
      await startVisit(visitId);
      toast.success('Visite démarrée');
      fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du démarrage');
    }
  };

  // =============================================
  // ✅ ANNULER UNE VISITE
  // =============================================
  const handleCancelVisit = async (visitId: string) => {
    if (!window.confirm('Annuler cette visite ?')) return;

    try {
      await cancelVisit(visitId);
      toast.success('Visite annulée');
      fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'annulation');
    }
  };

  // =============================================
  // ✅ CHARGEMENT
  // =============================================
  if (isLoading || subLoading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-white rounded-2xl animate-pulse" />
        <div className="h-10 bg-white rounded-2xl animate-pulse w-2/3" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // =============================================
  // ✅ RENDU PRINCIPAL
  // =============================================
  return (
    <div className="w-full max-w-full overflow-hidden space-y-5 pb-24 sm:pb-10">

      {/* ============================================================
      EN-TÊTE
      ============================================================ */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-xl font-black text-gray-800" style={{ color: colors.text }}>
            {isAidantRole ? 'Mes missions' : 'Planning des visites'}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {isAidantRole 
              ? 'Retrouvez vos accompagnements programmés et passés.' 
              : 'Suivi et planification des visites d\'accompagnement à domicile.'}
            {isFamily && (
              <span className="ml-2">
                {hasActiveSubscription ? (
                  <span className="text-green-600">✅ {remainingVisits} visites restantes</span>
                ) : (
                  <span className="text-blue-600">💡 Mode ponctuel disponible</span>
                )}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canPlanify && (
            <button
              onClick={handleAdd}
              className="hidden sm:inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-xs transition hover:opacity-90 shadow-sm"
              style={{ background: colors.primary }}
            >
              <Plus size={14} />
              {isFamily && !canCreateWithSubscription ? 'Visite ponctuelle' : 'Planifier'}
            </button>
          )}
        </div>
      </section>

      {/* ============================================================
      ✅ BANNIÈRE D'INFORMATION ABONNEMENT
      ============================================================ */}
      {isFamily && subscriptionInfo && (
        <div 
          className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            subscriptionInfo.type === 'success' ? 'bg-green-50 border-green-200' :
            subscriptionInfo.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
            'bg-blue-50 border-blue-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${
              subscriptionInfo.type === 'success' ? 'text-green-600' :
              subscriptionInfo.type === 'warning' ? 'text-yellow-600' :
              'text-blue-600'
            }`}>
              {subscriptionInfo.icon}
            </div>
            <div>
              <p className={`text-sm font-bold ${
                subscriptionInfo.type === 'success' ? 'text-green-700' :
                subscriptionInfo.type === 'warning' ? 'text-yellow-700' :
                'text-blue-700'
              }`}>
                {subscriptionInfo.title}
              </p>
              <p className={`text-xs ${
                subscriptionInfo.type === 'success' ? 'text-green-600' :
                subscriptionInfo.type === 'warning' ? 'text-yellow-600' :
                'text-blue-600'
              }`}>
                {subscriptionInfo.description}
              </p>
            </div>
          </div>
          {subscriptionInfo.action && subscriptionInfo.actionLink && (
            <button
              onClick={() => navigate(subscriptionInfo.actionLink!)}
              className="px-4 py-2 rounded-xl text-white text-xs font-bold transition hover:opacity-90 shrink-0"
              style={{ background: subscriptionInfo.color }}
            >
              {subscriptionInfo.action}
            </button>
          )}
        </div>
      )}

      {/* ============================================================
      ✅ BANNIÈRE D'ALERTE BROUILLONS
      ============================================================ */}
      {isFamily && canConvertDrafts && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-xl shadow-sm border border-yellow-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-500 mt-0.5" size={24} />
              <div>
                <p className="font-bold text-yellow-800">
                  📋 {draftCount} visite{draftCount > 1 ? 's' : ''} en attente de validation
                </p>
                <p className="text-sm text-yellow-700">
                  Vous avez {remainingVisits} visite(s) restante(s) sur votre abonnement.
                  Validez vos visites en brouillon maintenant !
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  setFilterStatus('brouillon');
                  document.querySelector('.visits-list')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition"
              >
                ✅ Valider maintenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
      BARRE DE FILTRES HORIZONTALE (TABS)
      ============================================================ */}
      <section className="w-full overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-1.5 pb-1">
          {statusFilterOptions.map((option) => {
            const isActive = filterStatus === option.value;
            const hasBadge = option.value === 'brouillon' && draftCount > 0;
            const hasPonctualBadge = option.value === 'ponctuel' && ponctualCount > 0;

            return (
              <button
                key={option.value}
                onClick={() => setFilterStatus(option.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                } ${hasBadge || hasPonctualBadge ? 'relative' : ''}`}
                style={{
                  backgroundColor: isActive ? colors.primary : undefined,
                }}
              >
                {option.label}
                {hasBadge && (
                  <span className="ml-1.5 bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full text-[8px] font-bold">
                    {draftCount}
                  </span>
                )}
                {hasPonctualBadge && option.value === 'ponctuel' && (
                  <span className="ml-1.5 bg-blue-400 text-white px-1.5 py-0.5 rounded-full text-[8px] font-bold">
                    {ponctualCount}
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
        <section className="space-y-3 min-w-0 max-w-full visits-list">
          {sortedVisits.map((visit) => (
            <div key={visit.id} className="min-w-0 max-w-full overflow-hidden">
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
        <section className="bg-white rounded-2xl py-12 px-4 text-center border border-black/5">
          <div
            className="w-11 h-11 rounded-2xl mx-auto flex items-center justify-center mb-3"
            style={{
              background: colors.primary + '10',
              color: colors.primary,
            }}
          >
            {filterStatus === 'brouillon' ? <CreditCard size={20} /> : 
             filterStatus === 'ponctuel' ? <Sparkles size={20} /> :
             <Calendar size={20} />}
          </div>

          <h3 className="text-sm font-bold text-gray-700">
            {filterStatus !== 'all' ? 'Aucune visite correspondante' : 'Aucune visite planifiée'}
          </h3>

          <p className="text-xs text-gray-400 mt-0.5">
            {filterStatus === 'ponctuel' 
              ? 'Vous n\'avez pas encore de visites en mode ponctuel.'
              : filterStatus !== 'all' 
                ? 'Essayez de changer de filtre pour voir d\'autres statuts.' 
                : 'Les visites programmées s\'afficheront ici.'}
          </p>

          {canPlanify && filterStatus === 'all' && (
            <button
              onClick={handleAdd}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs transition hover:opacity-90"
              style={{ background: colors.primary }}
            >
              <Plus size={14} />
              {isFamily && !canCreateWithSubscription ? 'Créer une visite ponctuelle' : 'Créer une planification'}
            </button>
          )}
        </section>
      )}

      {/* ============================================================
      ACCÈS RAPIDE FLOUTÉ (MOBILE ONLY)
      ============================================================ */}
      {canPlanify && (
        <button
          onClick={handleAdd}
          className="sm:hidden fixed bottom-20 right-4 z-40 w-11 h-11 rounded-2xl text-white shadow-lg flex items-center justify-center active:scale-95 transition"
          style={{ background: colors.primary }}
          aria-label="Planifier une visite"
        >
          <Plus size={20} />
        </button>
      )}

      {/* ============================================================
      MODAL DE PLANIFICATION
      ============================================================ */}
      <VisitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        visit={selectedVisit}
        patients={patients}
        onSuccess={handleModalSuccess}
      />

      {/* ============================================================
      MODAL DE PAIEMENT PONCTUEL UNIFIÉ
      ============================================================ */}
      {isPaymentModalOpen && pendingPaymentData && (
        <PonctualPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={handlePaymentCancel}
          onSuccess={handlePaymentSuccess}
          paymentData={pendingPaymentData}
          redirectPath="/app/visits"
        />
      )}

      {/* ============================================================
      MODAL D'ASSIGNATION D'AIDANT
      ============================================================ */}
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
        />
      )}
    </div>
  );
};

export default VisitsPage;
