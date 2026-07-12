// 📁 src/features/patients/pages/PatientDetailPage.tsx
 
import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  Eye,
  MapPin,
  Phone,
  User,
  Heart,
  Play,
  Clock,
  Plus,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Users,
  UserPlus,
  ClipboardList,
  FileText,
  ShieldAlert,
  Zap,
} from 'lucide-react';

import { usePatientStore } from '@/stores/patientStore';
import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime, cn } from '@/utils/helpers';  
import { Illustration } from '@/components/ui/Illustration';
import { PatientModal } from '../components/PatientModal';
import { CompleteVisitModal } from '@/components/visits/CompleteVisitModal';
import { VisitModal } from '@/features/visits/components/VisitModal';
import { useRefreshableData } from '@/hooks/useRefreshableData';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const PatientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();

  const {
    singular,
    detail,
    edit,
    delete: deleteTerm,
    noVisits,
    noNotes,
    confirmDelete,
    deleted,
    updated,
    getCategoryLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const { currentPatient, fetchPatientById, deletePatient, isLoading, canManagePatients } = usePatientStore();
  const {
    visits,
    fetchVisits,
    createVisit,
    startVisit,
    completeVisit,
    isLoading: visitLoading,
    cancelVisit,
    approveVisit,
    refuseVisit,
    confirmPayment,
  } = useVisitStore();

  const { 
    hasActiveSubscription, 
    remainingVisits, 
    isLoading: subLoading,
    isExpired,
    hasNeverSubscribed,
  } = useSubscriptionGuard();

  const [activeTab, setActiveTab] = useState<'info' | 'visits' | 'notes'>('info');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [visitModalMode, setVisitModalMode] = useState<'create' | 'edit'>('create');
  const [patientVisits, setPatientVisits] = useState<any[]>([]);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);
  const isAidantRole = role === 'aidant';
  const isFamilyRole = role === 'family';
  const isAdminRole = isAdminOrCoordinator;

  const canManage = canManagePatients();

  // ✅ REFRESH - UN SEUL TOAST
  const { refreshAll, isRefreshing } = useRefreshableData({
    onRefresh: async () => {
      if (id) {
        await fetchPatientById(id);
        await fetchVisits();
      }
    },
    onError: (error) => {
      console.error('❌ Erreur rafraîchissement:', error);
      toast.error('Erreur lors du rafraîchissement des données');
    },
  });

  useEffect(() => {
    if (id) {
      fetchPatientById(id);
      fetchVisits();
    }
  }, [id]);

  useEffect(() => {
    if (id && visits.length > 0) {
      const filtered = visits.filter((v) => v.patient_id === id);
      setPatientVisits(filtered);
    }
  }, [visits, id]);

  // ✅ VÉRIFIER SI L'AIDANT PEUT DÉMARRER UNE VISITE
  const canStartVisit = () => {
    if (!isAidantRole) return false;
    if (!currentPatient) return false;
    if (!hasActiveSubscription) {
      console.log('⚠️ Pas d\'abonnement actif pour ce patient');
      return false;
    }
    if (remainingVisits <= 0) {
      console.log('⚠️ Plus de visites disponibles');
      return false;
    }
    const hasActiveVisit = patientVisits.some((v) => v.status === 'en_cours');
    if (hasActiveVisit) {
      console.log('⚠️ Une visite est déjà en cours pour ce patient');
      return false;
    }
    if (currentPatient?.status !== 'active') {
      console.log('⚠️ Le patient n\'est pas actif');
      return false;
    }
    console.log('✅ L\'aidant peut démarrer une visite');
    return true;
  };

  // ✅ DÉMARRER VISITE - UN SEUL TOAST PAR CAS
  const handleStartVisit = async () => {
    if (!canStartVisit()) {
      if (!hasActiveSubscription) {
        toast.error('💳 Aucun abonnement actif. Veuillez souscrire un abonnement.');
      } else if (remainingVisits <= 0) {
        toast.error('📅 Plus de visites disponibles. Renouvelez votre abonnement.');
      } else {
        toast.error('❌ Impossible de démarrer la visite. Vérifiez les conditions.');
      }
      return;
    }

    setIsStarting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().slice(0, 5);

      const visit = await createVisit({
        patient_id: currentPatient?.id,
        scheduled_date: today,
        scheduled_time: now,
        duration_minutes: 60,
        notes: 'Visite démarrée par l\'aidant',
        is_urgent: false,
        actions: [],
      });

      await startVisit(visit.id);
      setActiveVisitId(visit.id);
      setShowCompleteModal(true);
      toast.success('Visite démarrée !');
      await fetchVisits();
      await fetchPatientById(id!);
    } catch (error: any) {
      console.error('❌ Erreur démarrage:', error);
      toast.error(error?.message || 'Erreur lors du démarrage');
    } finally {
      setIsStarting(false);
    }
  };

  // ✅ APPROUVER - UN SEUL TOAST
  const handleApprove = async (visitId: string) => {
    try {
      await approveVisit(visitId);
      toast.success('Visite approuvée');
      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur approbation:', error);
      toast.error(error.message || 'Erreur lors de l\'approbation');
    }
  };

  // ✅ REFUSER - UN SEUL TOAST
  const handleRefuse = async (visitId: string) => {
    const reason = prompt('Motif du refus :');
    if (!reason) return;
    try {
      await refuseVisit(visitId, reason);
      toast.error('Visite refusée');
      await fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur refus:', error);
      toast.error(error.message || 'Erreur lors du refus');
    }
  };

  // ✅ FINALISER - UN SEUL TOAST
  const handleComplete = async (data: { actions: string[]; notes: string; photos?: string[] }) => {
    if (!activeVisitId) return;
    setIsCompleting(true);
    try {
      await completeVisit(activeVisitId, data);
      toast.success('Visite terminée');
      setShowCompleteModal(false);
      setActiveVisitId(null);
      await fetchVisits();
      await fetchPatientById(id!);
    } catch (error: any) {
      console.error('❌ Erreur finalisation:', error);
      toast.error(error?.message || 'Erreur lors de la finalisation');
    } finally {
      setIsCompleting(false);
    }
  };

  // ✅ ANNULER - UN SEUL TOAST
  const handleCancel = async (visitId: string) => {
    if (!window.confirm('Annuler cette visite ?')) return;
    try {
      await cancelVisit(visitId);
      toast.success('Visite annulée');
      await fetchVisits();
      await fetchPatientById(id!);
    } catch (error: any) {
      console.error('❌ Erreur annulation:', error);
      toast.error(error.message || 'Erreur lors de l\'annulation');
    }
  };

  // ✅ SUPPRIMER - UN SEUL TOAST
  const handleDelete = async () => {
    if (!canManage) {
      toast.error('Vous n\'avez pas les droits pour supprimer un patient');
      return;
    }
    if (window.confirm(confirmDelete)) {
      try {
        await deletePatient(id!);
        toast.success(deleted);
        navigate('/app/patients');
      } catch (error: any) {
        console.error('❌ Erreur suppression:', error);
        toast.error(error.message || 'Erreur lors de la suppression');
      }
    }
  };

  // ✅ ÉDITER - UN SEUL TOAST
  const handleEdit = () => {
    if (!canManage) {
      toast.error('Vous n\'avez pas les droits pour modifier un patient');
      return;
    }
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    fetchPatientById(id!);
    toast.success(updated);
  };

  const handleVisitModalSuccess = () => {
    setShowVisitModal(false);
    fetchVisits();
    fetchPatientById(id!);
    toast.success('Visite planifiée');
  };

  const renderStartButton = () => {
    if (!isAidantRole) return null;

    const canStart = canStartVisit();
    const isDisabled = !canStart || isStarting;

    let tooltip = '';
    if (!hasActiveSubscription) tooltip = 'Aucun abonnement actif';
    else if (remainingVisits <= 0) tooltip = 'Plus de visites disponibles';
    else if (patientVisits.some(v => v.status === 'en_cours')) tooltip = 'Visite déjà en cours';
    else if (currentPatient?.status !== 'active') tooltip = 'Patient inactif';
    else tooltip = 'Démarrer une visite';

    return (
      <button
        onClick={handleStartVisit}
        disabled={isDisabled}
        title={tooltip}
        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50"
        style={{ 
          background: isDisabled ? '#9CA3AF' : colors.primary,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
        }}
      >
        {isStarting ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
        {isStarting ? 'Démarrage...' : 'Démarrer'}
      </button>
    );
  };

  const renderSubscriptionStatus = () => {
    if (!isAidantRole) return null;

    if (subLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={14} className="animate-spin" />
          Vérification de l'abonnement...
        </div>
      );
    }

    if (hasActiveSubscription && remainingVisits > 0) {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle size={14} />
          <span>{remainingVisits} visite{remainingVisits > 1 ? 's' : ''} restante{remainingVisits > 1 ? 's' : ''}</span>
        </div>
      );
    }

    if (isExpired) {
      return (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle size={14} />
          <span>Abonnement expiré - Renouvelez pour démarrer</span>
        </div>
      );
    }

    if (hasNeverSubscribed || !hasActiveSubscription) {
      return (
        <div className="flex items-center gap-2 text-sm text-amber-500">
          <AlertCircle size={14} />
          <span>Aucun abonnement actif</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Clock size={14} />
        <span>Aucune visite disponible</span>
      </div>
    );
  };

  // ✅ SI LE PATIENT N'EST PAS CHARGÉ
  if (isLoading || !currentPatient) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: colors.primary }} />
          <p style={{ color: colors.text }}>Chargement...</p>
        </div>
      </div>
    );
  }

  const person = currentPatient;
  const activeVisits = patientVisits.filter((v) => v.status === 'en_cours');
  const pendingVisits = patientVisits.filter((v) => v.status === 'planifiee' && !v.approved_at && !v.refused_at);

  return (
    <div className="space-y-6 pb-24 sm:pb-10">
      {/* EN-TÊTE AVEC BOUTON DE RAFRAÎCHISSEMENT */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/app/patients')}
            className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
          >
            <ArrowLeft size={24} style={{ color: colors.text }} />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
              {person.first_name} {person.last_name}
            </h1>
            <p className="text-sm flex items-center gap-1.5" style={{ color: colors.text + '99' }}>
              <User size={14} />
              {getCategoryLabel(person.category)}
              {isAidant && <span className="text-xs text-amber-600 ml-2">(Assigné)</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* ✅ BOUTON DE RAFRAÎCHISSEMENT */}
          <RefreshButton 
            size="sm" 
            showText={false}
            onRefresh={() => {
              if (id) {
                fetchPatientById(id);
                fetchVisits();
              }
              toast.success('Données actualisées');
            }}
          />

          {canManage && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleEdit}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 h-11 rounded-xl font-bold transition hover:opacity-85 text-xs sm:text-sm"
                style={{ background: colors.primary + '15', color: colors.primary }}
              >
                <Edit2 size={16} />
                <span>{edit}</span>
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 h-11 rounded-xl font-bold transition hover:opacity-85 text-red-500 text-xs sm:text-sm"
                style={{ background: '#F44336' + '15' }}
              >
                <Trash2 size={16} />
                <span>Supprimer</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Âge" value={person.age || 'N/A'} color={colors.text} />
        <StatCard
          label="Statut"
          value={person.status === 'active' ? 'Actif' : 'Inactif'}
          color={person.status === 'active' ? '#4CAF50' : '#F44336'}
        />
        <StatCard label="Visites" value={patientVisits.length} color={colors.primary} />
        <StatCard
          label="Restantes"
          value={hasActiveSubscription ? remainingVisits : '0'}
          color={remainingVisits > 0 ? '#4CAF50' : '#F44336'}
        />
        <StatCard
          label="En attente"
          value={pendingVisits.length}
          color="#FF9800"
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* ACTIONS RAPIDES */}
      {(isAidantRole || isFamilyRole || isAdminRole) && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-bold flex items-center gap-2 text-sm sm:text-base" style={{ color: colors.text }}>
                <Zap size={16} style={{ color: colors.primary }} />
                Actions d'accompagnement
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: colors.text + '60' }}>
                {isAidantRole && (
                  <>
                    {hasActiveSubscription && remainingVisits > 0
                      ? `${remainingVisits} visite${remainingVisits > 1 ? 's' : ''} restante${remainingVisits > 1 ? 's' : ''}`
                      : 'Aucune visite disponible'}
                  </>
                )}
                {isFamilyRole && 'Planifiez une visite pour votre proche'}
                {isAdminRole && 'Gérez les visites du patient'}
              </p>
              <div className="mt-2">{renderSubscriptionStatus()}</div>
            </div>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
              {isAidantRole && renderStartButton()}

              {isFamilyRole && (
                <button
                  onClick={() => {
                    setSelectedVisit(null);
                    setVisitModalMode('create');
                    setShowVisitModal(true);
                  }}
                  className="w-full sm:w-auto h-11 px-5 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition hover:opacity-90 shadow-sm"
                  style={{ background: colors.primary }}
                >
                  <Calendar size={15} />
                  Planifier une visite
                </button>
              )}

              {isAdminRole && (
                <button
                  onClick={() => {
                    setSelectedVisit(null);
                    setVisitModalMode('create');
                    setShowVisitModal(true);
                  }}
                  className="w-full sm:w-auto h-11 px-5 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition hover:opacity-90 shadow-sm"
                  style={{ background: colors.primary }}
                >
                  <Plus size={15} />
                  Assigner un aidant
                </button>
              )}
            </div>
          </div>

          {activeVisits.length > 0 && (
            <div className="mt-3.5 p-3.5 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-xs text-blue-700 font-semibold flex items-center gap-2 leading-relaxed">
                <Clock size={16} />
                Une visite est en cours pour ce patient.
              </p>
            </div>
          )}

          {pendingVisits.length > 0 && isAidantRole && (
            <div className="mt-3.5 p-3.5 rounded-xl bg-yellow-50 border border-yellow-200">
              <p className="text-xs text-yellow-700 font-semibold flex items-center gap-2 leading-relaxed">
                <AlertCircle size={16} />
                {pendingVisits.length} visite(s) en attente d'approbation.
              </p>
            </div>
          )}

          {!hasActiveSubscription && isAidantRole && (
            <div className="mt-3.5 p-3.5 rounded-xl bg-red-50 border border-red-200">
              <p className="text-xs text-red-700 font-semibold flex items-center gap-2 leading-relaxed">
                <AlertCircle size={16} />
                <span>💳 Aucun abonnement actif. Contactez l'administrateur.</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* TABS */}
      <div className="w-full overflow-x-auto scrollbar-none border-b" style={{ borderColor: colors.border }}>
        <div className="flex min-w-max">
          {['info', 'visits', 'notes'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 py-3 font-semibold text-xs sm:text-sm transition relative flex items-center gap-2 ${
                activeTab === tab ? 'border-b-2' : ''
              }`}
              style={{
                borderColor: activeTab === tab ? colors.primary : 'transparent',
                color: activeTab === tab ? colors.primary : colors.text + '60',
              }}
            >
              {tab === 'info' && <User size={13} />}
              {tab === 'visits' && <Calendar size={13} />}
              {tab === 'notes' && <FileText size={13} />}
              {tab === 'info' && 'Informations'}
              {tab === 'visits' && `Visites (${patientVisits.length})`}
              {tab === 'notes' && 'Notes'}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENU DES TABS */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold" style={{ color: colors.text + 'c0' }}>
              <MapPin size={18} className="shrink-0" />
              <span className="leading-relaxed">{person.address}</span>
            </div>
            {person.phone && (
              <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold" style={{ color: colors.text + 'c0' }}>
                <Phone size={18} className="shrink-0" />
                <span>{person.phone}</span>
              </div>
            )}
            {person.emergency_contact && (
              <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold" style={{ color: colors.text + 'c0' }}>
                <ShieldAlert size={18} style={{ color: '#F44336' }} className="shrink-0" />
                <span>Urgence: {person.emergency_contact}</span>
              </div>
            )}
            {person.allergies && (
              <div className="p-3.5 rounded-xl flex items-start gap-3" style={{ background: '#FF5722' + '10' }}>
                <AlertCircle size={18} style={{ color: '#FF5722' }} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold" style={{ color: '#FF5722' }}>Allergies</p>
                  <p className="text-xs font-medium mt-0.5 leading-relaxed" style={{ color: '#FF5722' }}>{person.allergies}</p>
                </div>
              </div>
            )}
            {person.treatments && (
              <div className="p-3.5 rounded-xl flex items-start gap-3" style={{ background: colors.primary + '10' }}>
                <ClipboardList size={18} style={{ color: colors.primary }} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold" style={{ color: colors.primary }}>Traitements</p>
                  <p className="text-xs font-medium mt-0.5 leading-relaxed" style={{ color: colors.primary }}>{person.treatments}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'visits' && (
          <div>
            {patientVisits.length > 0 ? (
              <div className="space-y-3">
                {patientVisits
                  .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
                  .map((visit) => (
                    <VisitCardCompact
                      key={visit.id}
                      visit={visit}
                      colors={colors}
                      onCancel={() => handleCancel(visit.id)}
                      onApprove={() => handleApprove(visit.id)}
                      onRefuse={() => handleRefuse(visit.id)}
                      onStart={() => {
                        setActiveVisitId(visit.id);
                        setShowCompleteModal(true);
                      }}
                      onView={() => navigate(`/app/visits/${visit.id}`)}
                      isAidant={isAidantRole}
                      isAdmin={isAdminRole}
                      isFamily={isFamilyRole}
                    />
                  ))}
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: colors.text + '60' }}>
                <Illustration type="calendar" size="lg" className="mx-auto mb-4 opacity-40" />
                <p className="font-bold text-xs" style={{ color: colors.text }}>{noVisits}</p>
                {(isFamilyRole || isAdminRole) && (
                  <button
                    onClick={() => {
                      setSelectedVisit(null);
                      setVisitModalMode('create');
                      setShowVisitModal(true);
                    }}
                    className="mt-4 px-4 py-2 rounded-xl text-white font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-sm"
                    style={{ background: colors.primary }}
                  >
                    <Plus size={13} strokeWidth={2.5} />
                    Planifier une visite
                  </button>
                )}
                {isAidantRole && !hasActiveSubscription && (
                  <p className="text-[10px] font-bold text-amber-600 mt-4 uppercase tracking-wide">
                    💳 Aucun abonnement actif. Contactez l\'administrateur.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div>
            {person.notes ? (
              <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
                <p className="text-xs sm:text-sm font-medium leading-relaxed" style={{ color: colors.text }}>{person.notes}</p>
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: colors.text + '60' }}>
                <Illustration type="empty" size="lg" className="mx-auto mb-4 opacity-30" />
                <p className="text-xs font-semibold">{noNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}
      <PatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode="edit"
        patient={person}
        onSuccess={handleModalSuccess}
      />

      <VisitModal
        isOpen={showVisitModal}
        onClose={() => setShowVisitModal(false)}
        mode="create"
        visit={null}
        patients={[person]}
        onSuccess={handleVisitModalSuccess}
      />

      {showCompleteModal && activeVisitId && (
        <CompleteVisitModal
          isOpen={true}
          onClose={() => {
            setShowCompleteModal(false);
            setActiveVisitId(null);
          }}
          visitId={activeVisitId} 
          visit={{ patient: person }}
          patientCategory={person.category || 'senior'}
          onSubmit={handleComplete}
          isLoading={isCompleting}
        />
      )}
    </div>
  );
};

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  className?: string;
}

const StatCard = ({ label, value, color, className = '' }: StatCardProps) => (
  <div className={cn("bg-white rounded-2xl p-4 shadow-sm border border-black/5", className)}>
    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
    <p className="text-sm sm:text-base font-black mt-1" style={{ color }}>{value}</p>
  </div>
);

interface VisitCardCompactProps {
  visit: any;
  colors: any;
  onCancel?: () => void;
  onApprove?: () => void;
  onRefuse?: () => void;
  onStart?: () => void;
  onView?: () => void;
  isAidant?: boolean;
  isAdmin?: boolean;
  isFamily?: boolean;
}

const VisitCardCompact = ({
  visit,
  colors,
  onCancel,
  onApprove,
  onRefuse,
  onStart,
  onView,
  isAidant,
  isAdmin,
  isFamily,
}: VisitCardCompactProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planifiee': return '#4CAF50';
      case 'en_attente': return '#FF9800';
      case 'acceptee': return '#2196F3';
      case 'en_cours': return '#2196F3';
      case 'terminee': return '#9C27B0';
      case 'validee': return '#4CAF50';
      case 'annulee': return '#F44336';
      case 'refusee': return '#F44336';
      case 'expire': return '#795548';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planifiee': return 'Planifiée';
      case 'en_attente': return 'En attente';
      case 'acceptee': return 'Acceptée';
      case 'en_cours': return 'En cours';
      case 'terminee': return 'Terminée';
      case 'validee': return 'Validée';
      case 'annulee': return 'Annulée';
      case 'refusee': return 'Refusée';
      case 'expire': return 'Expirée';
      default: return status;
    }
  };

  const isPending = visit.status === 'planifiee' && !visit.approved_at && !visit.refused_at;
  const isAccepted = visit.status === 'acceptee';

  const getAidantName = () => {
    if (visit.aidant?.user?.full_name) {
      return visit.aidant.user.full_name;
    }
    return 'Non assigné';
  };

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl cursor-pointer hover:bg-gray-50 transition gap-3 border-l-4"
      style={{ borderLeftColor: getStatusColor(visit.status), background: colors.primary + '05' }}
      onClick={onView}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {visit.status === 'en_cours' ? <Play size={14} style={{ color: '#2196F3' }} /> :
             visit.status === 'validee' ? <CheckCircle size={14} style={{ color: '#4CAF50' }} /> :
             visit.status === 'annulee' ? <XCircle size={14} style={{ color: '#F44336' }} /> :
             <Calendar size={14} style={{ color: colors.primary }} />}
            <p className="font-bold text-xs" style={{ color: colors.text }}>
              {formatDate(visit.scheduled_date)} à {formatTime(visit.scheduled_time)}
            </p>
          </div>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{
              background: getStatusColor(visit.status) + '20',
              color: getStatusColor(visit.status),
            }}
          >
            {getStatusLabel(visit.status)}
          </span>
          {visit.is_urgent && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 bg-red-100 text-red-600 animate-pulse">
              <AlertCircle size={12} />
              Urgent
            </span>
          )}
        </div>
        {visit.aidant && (
          <p className="text-[11px] font-medium flex items-center gap-1 mt-1" style={{ color: colors.text + '60' }}>
            <User size={12} />
            Aidant: <span className="font-semibold">{getAidantName()}</span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 shrink-0">
        {isPending && isAidant && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onApprove?.(); }}
              className="px-3 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1 transition hover:opacity-85 shadow-sm"
              style={{ background: '#4CAF50' }}
            >
              <CheckCircle size={12} />
              Accepter
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRefuse?.(); }}
              className="px-3 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1 transition hover:opacity-85 shadow-sm"
              style={{ background: '#F44336' }}
            >
              <XCircle size={12} />
              Refuser
            </button>
          </>
        )}

        {isAccepted && isAidant && (
          <button
            onClick={(e) => { e.stopPropagation(); onStart?.(); }}
            className="px-3 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1 transition hover:opacity-85 shadow-sm"
            style={{ background: '#4CAF50' }}
          >
            <Play size={12} />
            Démarrer
          </button>
        )}

        {(visit.status === 'planifiee' || visit.status === 'en_attente') && (isAdmin || isFamily) && (
          <button
            onClick={(e) => { e.stopPropagation(); onCancel?.(); }}
            className="px-3 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1 transition hover:opacity-85 shadow-sm"
            style={{ background: '#F44336' }}
          >
            <XCircle size={12} />
            Annuler
          </button>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onView?.(); }}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition hover:bg-gray-100 flex items-center gap-1"
          style={{ color: colors.primary }}
        >
          <Eye size={14} />
          Détails
        </button>
      </div>
    </div>
  );
};

export default PatientDetailPage;
