// 📁 src/features/patients/pages/PatientDetailPage.tsx
// 📌 Détails d'une personne - Version production avec gestion des visites

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  MapPin,
  Phone,
  User,
  Heart,
  Baby,
  Play,
  Clock,
  Plus,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { usePatientStore } from '@/stores/patientStore';
import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime } from '@/utils/helpers';
import { PatientModal } from '../components/PatientModal';
import { CompleteVisitModal } from '@/components/visits/CompleteVisitModal';
import { VisitModal } from '@/features/visits/components/VisitModal';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const PatientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();

  // ✅ Jargon dynamique selon le rôle
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

  // ============================================================
  // STORES
  // ============================================================
  const { currentPatient, fetchPatientById, deletePatient, isLoading } = usePatientStore();
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
  } = useVisitStore();

  // ✅ Correction : useSubscriptionGuard sans refresh (utiliser fetchSubscriptions à la place)
  const { remainingVisits, hasActiveSubscription } = useSubscriptionGuard();

  // ============================================================
  // ÉTATS
  // ============================================================
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

  // ============================================================
  // EFFETS
  // ============================================================
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

  // ============================================================
  // ACTIONS SUR LES VISITES
  // ============================================================

  // Démarrer une visite immédiatement (aidant)
  const handleStartVisit = async () => {
    if (!currentPatient) return;

    if (!hasActiveSubscription || remainingVisits <= 0) {
      toast.error('Plus de visites disponibles. Veuillez renouveler votre abonnement.');
      return;
    }

    const hasActive = patientVisits.some((v) => v.status === 'en_cours');
    if (hasActive) {
      toast.error('Une visite est déjà en cours pour ce patient.');
      return;
    }

    setIsStarting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().slice(0, 5);

      const visit = await createVisit({
        patient_id: currentPatient.id,
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
      toast.success('✅ Visite démarrée !');
      fetchVisits();
    } catch (error: any) {
      console.error('❌ Erreur démarrage:', error);
      toast.error(error?.message || 'Erreur lors du démarrage');
    } finally {
      setIsStarting(false);
    }
  };

  // Planifier une visite (famille ou aidant)
  const handlePlanifyVisit = () => {
    setSelectedVisit(null);
    setVisitModalMode('create');
    setShowVisitModal(true);
  };

  // Approuver une visite (aidant)
  const handleApproveVisit = async (visitId: string) => {
    try {
      await approveVisit(visitId);
      fetchVisits();
      toast.success('✅ Visite approuvée');
    } catch (error) {
      toast.error('Erreur lors de l\'approbation');
    }
  };

  // Refuser une visite (aidant)
  const handleRefuseVisit = async (visitId: string) => {
    const reason = prompt('Motif du refus :');
    if (!reason) return;

    try {
      await refuseVisit(visitId, reason);
      fetchVisits();
      toast.error('❌ Visite refusée');
    } catch (error) {
      toast.error('Erreur lors du refus');
    }
  };

  // Terminer une visite (aidant)
  const handleCompleteVisit = async (data: { actions: string[]; notes: string; photos?: string[] }) => {
    if (!activeVisitId) return;

    setIsCompleting(true);
    try {
      await completeVisit(activeVisitId, data);
      toast.success('✅ Visite terminée ! En attente de validation.');
      setShowCompleteModal(false);
      setActiveVisitId(null);
      // ✅ Rafraîchir les données
      fetchVisits();
      fetchPatientById(id!);
    } catch (error: any) {
      console.error('❌ Erreur finalisation:', error);
      toast.error(error?.message || 'Erreur lors de la finalisation');
    } finally {
      setIsCompleting(false);
    }
  };

  // Annuler une visite
  const handleCancelVisit = async (visitId: string) => {
    if (!window.confirm('Annuler cette visite ?')) return;

    try {
      await cancelVisit(visitId);
      toast.success('Visite annulée');
      fetchVisits();
      fetchPatientById(id!);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de l\'annulation');
    }
  };

  // ============================================================
  // ACTIONS SUR LE PATIENT
  // ============================================================
  const handleDelete = async () => {
    if (window.confirm(confirmDelete)) {
      try {
        await deletePatient(id!);
        toast.success(deleted);
        navigate('/app/patients');
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const handleEdit = () => {
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    if (id) {
      fetchPatientById(id);
    }
    toast.success(updated);
  };

  const handleVisitModalSuccess = () => {
    setShowVisitModal(false);
    fetchVisits();
    fetchPatientById(id!);
    toast.success('Visite planifiée avec succès');
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planifiee': return '#4CAF50';
      case 'en_attente': return '#FF9800';
      case 'en_cours': return '#2196F3';
      case 'terminee': return '#9C27B0';
      case 'validee': return '#4CAF50';
      case 'annulee': return '#F44336';
      case 'refusee': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planifiee': return '📅 Planifiée';
      case 'en_attente': return '⏳ En attente';
      case 'en_cours': return '🔄 En cours';
      case 'terminee': return '✅ Terminée';
      case 'validee': return '✅ Validée';
      case 'annulee': return '❌ Annulée';
      case 'refusee': return '❌ Refusée';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planifiee': return <Calendar size={16} />;
      case 'en_cours': return <Play size={16} />;
      case 'terminee': return <CheckCircle size={16} />;
      case 'validee': return <CheckCircle size={16} />;
      case 'annulee': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  // ============================================================
  // RENDU
  // ============================================================

  if (isLoading || !currentPatient) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
      {/* ============================================================
      EN-TÊTE
      ============================================================ */}
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
            <p className="text-sm" style={{ color: colors.text + '99' }}>
              {getCategoryLabel(person.category)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleEdit}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition hover:opacity-80"
            style={{ background: colors.primary + '15', color: colors.primary }}
          >
            <Edit2 size={18} />
            <span>{edit}</span>
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition hover:opacity-80 text-red-500"
            style={{ background: '#F44336' + '15' }}
          >
            <Trash2 size={18} />
            <span>Supprimer</span>
          </button>
        </div>
      </div>

      {/* ============================================================
      STATS
      ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Âge" value={person.age || 'N/A'} color={colors.text} />
        <StatCard
          label="Statut"
          value={person.status === 'active' ? '✅ Actif' : '❌ Inactif'}
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
        />
      </div>

      {/* ============================================================
      ACTIONS RAPIDES
      ============================================================ */}
      {(isAidantRole || isFamilyRole || isAdminRole) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="font-medium" style={{ color: colors.text }}>
                🚀 Actions
              </p>
              <p className="text-xs" style={{ color: colors.text + '60' }}>
                {isAidantRole && (hasActiveSubscription && remainingVisits > 0
                  ? `${remainingVisits} visite${remainingVisits > 1 ? 's' : ''} restante${remainingVisits > 1 ? 's' : ''}`
                  : '⚠️ Plus de visites disponibles')}
                {isFamilyRole && 'Planifiez une visite pour votre proche'}
                {isAdminRole && 'Gérez les visites du patient'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isAidantRole && (
                <>
                  <button
                    onClick={handleStartVisit}
                    disabled={isStarting || !hasActiveSubscription || remainingVisits <= 0 || activeVisits.length > 0}
                    className="px-4 py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: colors.primary }}
                  >
                    {isStarting ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                    {isStarting ? 'Démarrage...' : 'Démarrer'}
                  </button>
                  {pendingVisits.length > 0 && (
                    <div className="flex gap-1">
                      {pendingVisits.slice(0, 2).map((visit) => (
                        <div key={visit.id} className="flex gap-1">
                          <button
                            onClick={() => handleApproveVisit(visit.id)}
                            className="px-2 py-1 rounded-lg text-white text-xs font-medium"
                            style={{ background: '#4CAF50' }}
                          >
                            ✅ Accepter
                          </button>
                          <button
                            onClick={() => handleRefuseVisit(visit.id)}
                            className="px-2 py-1 rounded-lg text-white text-xs font-medium"
                            style={{ background: '#F44336' }}
                          >
                            ❌ Refuser
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {isFamilyRole && (
                <button
                  onClick={handlePlanifyVisit}
                  className="px-4 py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:opacity-90"
                  style={{ background: colors.primary }}
                >
                  <Calendar size={16} />
                  Planifier une visite
                </button>
              )}
              {isAdminRole && (
                <button
                  onClick={handlePlanifyVisit}
                  className="px-4 py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:opacity-90"
                  style={{ background: colors.primary }}
                >
                  <Plus size={16} />
                  Assigner une visite
                </button>
              )}
            </div>
          </div>
          {activeVisits.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-700 flex items-center gap-2">
                <Clock size={18} />
                <span>Une visite est en cours pour ce patient.</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
      TABS
      ============================================================ */}
      <div className="flex border-b" style={{ borderColor: colors.border }}>
        {['info', 'visits', 'notes'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 font-medium transition relative ${
              activeTab === tab ? 'border-b-2' : ''
            }`}
            style={{
              borderColor: activeTab === tab ? colors.primary : 'transparent',
              color: activeTab === tab ? colors.primary : colors.text + '60',
            }}
          >
            {tab === 'info' && 'Informations'}
            {tab === 'visits' && `Visites (${patientVisits.length})`}
            {tab === 'notes' && 'Notes'}
          </button>
        ))}
      </div>

      {/* ============================================================
      CONTENU DES TABS
      ============================================================ */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        {/* TAB INFO */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-sm" style={{ color: colors.text + '80' }}>
              <MapPin size={18} />
              <span>{person.address}</span>
            </div>
            {person.phone && (
              <div className="flex items-center space-x-3 text-sm" style={{ color: colors.text + '80' }}>
                <Phone size={18} />
                <span>{person.phone}</span>
              </div>
            )}
            {person.emergency_contact && (
              <div className="flex items-center space-x-3 text-sm" style={{ color: colors.text + '80' }}>
                <span>🆘</span>
                <span>Urgence: {person.emergency_contact}</span>
              </div>
            )}
            {person.allergies && (
              <div className="p-3 rounded-xl" style={{ background: '#FF5722' + '10' }}>
                <p className="text-sm font-medium" style={{ color: '#FF5722' }}>
                  ⚠️ Allergies: {person.allergies}
                </p>
              </div>
            )}
            {person.treatments && (
              <div className="p-3 rounded-xl" style={{ background: colors.primary + '10' }}>
                <p className="text-sm" style={{ color: colors.primary }}>
                  💊 Traitements: {person.treatments}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB VISITES */}
        {activeTab === 'visits' && (
          <div>
            {patientVisits.length > 0 ? (
              <div className="space-y-3">
                {patientVisits
                  .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
                  .map((visit) => (
                    <VisitCard
                      key={visit.id}
                      visit={visit}
                      colors={colors}
                      onCancel={() => handleCancelVisit(visit.id)}
                      onApprove={() => handleApproveVisit(visit.id)}
                      onRefuse={() => handleRefuseVisit(visit.id)}
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
              <div className="text-center py-8" style={{ color: colors.text + '60' }}>
                <Calendar size={48} className="mx-auto mb-3 opacity-30" />
                <p>{noVisits}</p>
                {(isFamilyRole || isAidantRole) && (
                  <button
                    onClick={handlePlanifyVisit}
                    className="mt-4 px-4 py-2 rounded-xl text-white font-medium text-sm"
                    style={{ background: colors.primary }}
                  >
                    <Plus size={16} className="inline mr-1" />
                    Planifier une visite
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB NOTES */}
        {activeTab === 'notes' && (
          <div>
            {person.notes ? (
              <div className="p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
                <p style={{ color: colors.text }}>{person.notes}</p>
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: colors.text + '60' }}>
                <p>{noNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================
      MODALS
      ============================================================ */}

      {/* Modal modification patient */}
      <PatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode="edit"
        patient={person}
        onSuccess={handleModalSuccess}
      />

      {/* Modal planification visite */}
      <VisitModal
        isOpen={showVisitModal}
        onClose={() => setShowVisitModal(false)}
        mode="create"
        visit={null}
        patients={[person]}
        onSuccess={handleVisitModalSuccess}
      />

      {/* Modal fin de visite */}
      {showCompleteModal && activeVisitId && (
        <CompleteVisitModal
          isOpen={true}
          onClose={() => {
            setShowCompleteModal(false);
            setActiveVisitId(null);
          }}
          visit={{ patient: person }}
          patientCategory={person.category || 'senior'}
          onSubmit={handleCompleteVisit}
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
}

const StatCard = ({ label, value, color }: StatCardProps) => (
  <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
    <p className="text-xs" style={{ color: 'var(--color-text, #6b7280)' + '60' }}>{label}</p>
    <p className="text-lg font-bold" style={{ color }}>{value}</p>
  </div>
);

interface VisitCardProps {
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

const VisitCard = ({
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
}: VisitCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planifiee': return '#4CAF50';
      case 'en_attente': return '#FF9800';
      case 'en_cours': return '#2196F3';
      case 'terminee': return '#9C27B0';
      case 'validee': return '#4CAF50';
      case 'annulee': return '#F44336';
      case 'refusee': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planifiee': return '📅 Planifiée';
      case 'en_attente': return '⏳ En attente';
      case 'en_cours': return '🔄 En cours';
      case 'terminee': return '✅ Terminée';
      case 'validee': return '✅ Validée';
      case 'annulee': return '❌ Annulée';
      case 'refusee': return '❌ Refusée';
      default: return status;
    }
  };

  const statusColor = getStatusColor(visit.status);
  const isPending = visit.status === 'planifiee' && !visit.approved_at && !visit.refused_at;

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl cursor-pointer hover:bg-gray-50 transition gap-3 border-l-4"
      style={{ borderLeftColor: statusColor, background: colors.primary + '05' }}
      onClick={onView}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium" style={{ color: colors.text }}>
            📅 {formatDate(visit.scheduled_date)} à {formatTime(visit.scheduled_time)}
          </p>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: statusColor + '20',
              color: statusColor,
            }}
          >
            {getStatusLabel(visit.status)}
          </span>
          {visit.is_urgent && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
              ⚠️ Urgent
            </span>
          )}
          {isPending && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
              ⏳ En attente d'approbation
            </span>
          )}
        </div>
        {visit.aidant && (
          <p className="text-xs" style={{ color: colors.text + '60' }}>
            🧑‍⚕️ Aidant: {visit.aidant.user?.full_name || 'Non assigné'}
          </p>
        )}
        {visit.assignment_type && (
          <p className="text-xs" style={{ color: colors.text + '60' }}>
            📌 {visit.assignment_type === 'permanente' ? '🔄 Permanente' : 
               visit.assignment_type === 'intervalle' ? '⏰ Intervalle' : '📌 Ponctuelle'}
          </p>
        )}
        {visit.duration_minutes && (
          <p className="text-xs" style={{ color: colors.text + '60' }}>
            ⏱️ {visit.duration_minutes} min
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 shrink-0">
        {isPending && isAidant && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onApprove?.(); }}
              className="px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80"
              style={{ background: '#4CAF50' }}
            >
              ✅ Accepter
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRefuse?.(); }}
              className="px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80"
              style={{ background: '#F44336' }}
            >
              ❌ Refuser
            </button>
          </>
        )}
        {visit.status === 'planifiee' && isAidant && !isPending && (
          <button
            onClick={(e) => { e.stopPropagation(); onStart?.(); }}
            className="px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80"
            style={{ background: '#4CAF50' }}
          >
            <Play size={14} className="inline mr-1" />
            Démarrer
          </button>
        )}
        {visit.status === 'planifiee' && (isAdmin || isFamily) && (
          <button
            onClick={(e) => { e.stopPropagation(); onCancel?.(); }}
            className="px-3 py-1.5 rounded-lg text-white text-xs font-medium transition hover:opacity-80"
            style={{ background: '#F44336' }}
          >
            <XCircle size={14} className="inline mr-1" />
            Annuler
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onView?.(); }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition hover:bg-gray-100"
          style={{ color: colors.primary }}
        >
          Détails
        </button>
      </div>
    </div>
  );
};

export default PatientDetailPage;
