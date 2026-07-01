// 📁 src/features/visits/pages/VisitsPage.tsx

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Filter,
  ChevronDown,
  Clock,
  CheckCircle,
  PlayCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

import { useVisitStore } from '@/stores/visitStore';
import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { VisitCard } from '@/components/visits/VisitCard';
import { VisitModal } from '../components/VisitModal';
import toast from 'react-hot-toast';

const VisitsPage = () => {
  const navigate = useNavigate();

  const { profile, role } = useAuthStore();
  const { visits, isLoading, fetchVisits, approveVisit, refuseVisit, startVisit, cancelVisit } = useVisitStore();
  const { patients, fetchPatients } = usePatientStore();

  const {
    singular,
    plural,
    getCountLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const canPlanify = isAdminOrCoordinator || isFamily;
  const canStartVisit = isAidant || isAdminOrCoordinator;
  const canCancelVisit = isAdminOrCoordinator || isFamily;
  const canApprove = isAidant;

  useEffect(() => {
    fetchVisits();
    fetchPatients();
  }, []);

  // ✅ FILTRES AVEC NOUVEAUX STATUTS
  const statusFilterOptions = useMemo(() => {
    if (isAdminOrCoordinator) {
      return [
        { value: 'all', label: 'Toutes les visites' },
        { value: 'planifiee', label: '📋 Planifiées' },
        { value: 'en_attente', label: '⏳ En attente' },
        { value: 'acceptee', label: '✅ Acceptées' },
        { value: 'en_cours', label: '🔄 En cours' },
        { value: 'terminee', label: '📝 Terminées' },
        { value: 'validee', label: '✔️ Validées' },
        { value: 'annulee', label: '❌ Annulées' },
        { value: 'refusee', label: '🚫 Refusées' },
        { value: 'expire', label: '⏰ Expirées' },
      ];
    }

    if (isAidant) {
      return [
        { value: 'all', label: 'Toutes les missions' },
        { value: 'planifiee', label: '📋 À valider' },
        { value: 'en_attente', label: '⏳ En attente' },
        { value: 'acceptee', label: '✅ Acceptées' },
        { value: 'en_cours', label: '🔄 En cours' },
        { value: 'terminee', label: '📝 Terminées' },
        { value: 'annulee', label: '❌ Annulées' },
        { value: 'refusee', label: '🚫 Refusées' },
      ];
    }

    if (isFamily) {
      return [
        { value: 'all', label: 'Toutes les visites' },
        { value: 'planifiee', label: '📋 Planifiées' },
        { value: 'en_attente', label: '⏳ En attente' },
        { value: 'acceptee', label: '✅ Acceptées' },
        { value: 'en_cours', label: '🔄 En cours' },
        { value: 'terminee', label: '📝 Terminées' },
        { value: 'validee', label: '✔️ Validées' },
        { value: 'annulee', label: '❌ Annulées' },
      ];
    }

    return [
      { value: 'all', label: 'Toutes les visites' },
      { value: 'planifiee', label: 'Planifiées' },
      { value: 'en_cours', label: 'En cours' },
      { value: 'terminee', label: 'Terminées' },
      { value: 'annulee', label: 'Annulées' },
    ];
  }, [isAidant, isAdminOrCoordinator, isFamily]);

  const stats = {
    total: visits.length,
    planned: visits.filter((v) => v.status === 'planifiee').length,
    pending: visits.filter((v) => v.status === 'en_attente').length,
    accepted: visits.filter((v) => v.status === 'acceptee').length,
    inProgress: visits.filter((v) => v.status === 'en_cours').length,
    completed: visits.filter((v) => v.status === 'terminee' || v.status === 'validee').length,
    expired: visits.filter((v) => v.status === 'expire').length,
  };

  const sortedVisits = useMemo(() => {
    return visits
      .filter((visit) => {
        if (filterStatus === 'all') return true;
        return visit.status === filterStatus;
      })
      .sort(
        (a, b) =>
          new Date(a.scheduled_date).getTime() -
          new Date(b.scheduled_date).getTime()
      );
  }, [visits, filterStatus]);

  const getStatusCount = (status: string) => {
    if (status === 'all') return visits.length;
    return visits.filter((v) => v.status === status).length;
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

  const handleModalSuccess = () => {
    fetchVisits();
    setIsModalOpen(false);
    toast.success(modalMode === 'create' ? 'Visite planifiée' : 'Visite mise à jour');
  };

  const handleApproveVisit = async (visitId: string) => {
    try {
      await approveVisit(visitId);
      toast.success('Visite approuvée');
      fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'approbation');
    }
  };

  const handleRefuseVisit = async (visitId: string) => {
    const reason = prompt('Motif du refus :');
    if (!reason) return;

    try {
      await refuseVisit(visitId, reason);
      toast.error('Visite refusée');
      fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du refus');
    }
  };

  const handleStartVisit = async (visitId: string) => {
    try {
      await startVisit(visitId);
      toast.success('Visite démarrée');
      fetchVisits();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du démarrage');
    }
  };

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-20 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-14 bg-white rounded-2xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden space-y-4 pb-24 sm:pb-10">
      {/* HEADER */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-1.5"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <Calendar size={13} />
              {isAidant ? 'Missions assignées' : 'Suivi des visites'}
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              {isAidant ? 'Mes missions' : 'Visites'}
            </h1>

            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              {visits.length} visite{visits.length > 1 ? 's' : ''} au total
              {stats.expired > 0 && (
                <span className="ml-2 text-red-500">⚠️ {stats.expired} expirée(s)</span>
              )}
            </p>
          </div>

          {canPlanify && (
            <button
              onClick={handleAdd}
              className="hidden sm:inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-white font-bold text-sm transition hover:opacity-90"
              style={{ background: colors.primary }}
            >
              <Plus size={16} />
              Planifier
            </button>
          )}
        </div>
      </section>

      {/* STATS COMPACTES - AVEC NOUVEAUX STATUTS */}
      <section className="grid grid-cols-2 lg:grid-cols-6 gap-2">
        <CompactStatBox
          icon={<Calendar size={16} />}
          label="Total"
          value={stats.total}
          color={colors.primary}
        />
        <CompactStatBox
          icon={<Clock size={16} />}
          label="À valider"
          value={stats.planned + stats.pending}
          color="#FF9800"
        />
        <CompactStatBox
          icon={<CheckCircle size={16} />}
          label="Acceptées"
          value={stats.accepted}
          color="#2196F3"
        />
        <CompactStatBox
          icon={<PlayCircle size={16} />}
          label="En cours"
          value={stats.inProgress}
          color="#4CAF50"
        />
        <CompactStatBox
          icon={<CheckCircle size={16} />}
          label="Terminées"
          value={stats.completed}
          color="#9C27B0"
        />
        <CompactStatBox
          icon={<AlertCircle size={16} />}
          label="Expirées"
          value={stats.expired}
          color="#F44336"
        />
      </section>

      {/* FILTRE EN SELECT */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
        <div className="flex items-center gap-3">
          <Filter size={16} className="text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded-xl border bg-gray-50 outline-none focus:ring-2"
            style={{
              borderColor: colors.border || '#e5e0d8',
              color: colors.text,
            }}
          >
            {statusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({getStatusCount(option.value)})
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-400 shrink-0">
            {sortedVisits.length}
          </span>
        </div>
      </section>

      {/* LISTE */}
      {sortedVisits.length > 0 ? (
        <section className="space-y-3 min-w-0">
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
                  canCancelVisit && (visit.status === 'planifiee' || visit.status === 'en_attente')
                    ? () => handleCancelVisit(visit.id)
                    : undefined
                }
                onView={() => navigate(`/app/visits/${visit.id}`)}
              />
            </div>
          ))}
        </section>
      ) : (
        <section className="bg-white rounded-2xl p-6 text-center shadow-sm border border-black/5">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3"
            style={{
              background: colors.primary + '12',
              color: colors.primary,
            }}
          >
            {filterStatus === 'annulee' ? (
              <XCircle size={24} />
            ) : filterStatus === 'expire' ? (
              <AlertCircle size={24} />
            ) : (
              <Calendar size={24} />
            )}
          </div>

          <h3 className="text-base font-bold" style={{ color: colors.text }}>
            {filterStatus !== 'all'
              ? 'Aucune visite avec ce statut'
              : isAidant
                ? 'Aucune mission assignée'
                : 'Aucune visite'}
          </h3>

          <p className="text-xs mt-1 text-gray-500">
            {filterStatus !== 'all'
              ? 'Essayez un autre filtre.'
              : isAidant
                ? 'Vous n\'avez aucune mission pour le moment.'
                : 'Planifiez votre première visite.'}
          </p>

          {canPlanify && filterStatus === 'all' && (
            <button
              onClick={handleAdd}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-sm transition hover:opacity-90"
              style={{ background: colors.primary }}
            >
              <Plus size={16} />
              Planifier une visite
            </button>
          )}
        </section>
      )}

      {/* BOUTON MOBILE */}
      {canPlanify && (
        <button
          onClick={handleAdd}
          className="sm:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-2xl text-white shadow-lg flex items-center justify-center active:scale-95 transition"
          style={{ background: colors.primary }}
          aria-label="Planifier une visite"
        >
          <Plus size={22} />
        </button>
      )}

      {/* MODAL */}
      <VisitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        visit={selectedVisit}
        patients={patients}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

// =============================================
// COMPACT STAT BOX
// =============================================

interface CompactStatBoxProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

const CompactStatBox = ({ icon, label, value, color }: CompactStatBoxProps) => {
  return (
    <div className="bg-white rounded-xl p-2.5 shadow-sm border border-black/5 min-w-0">
      <div className="flex items-center justify-between gap-1">
        <div className="min-w-0">
          <p className="text-[9px] font-medium uppercase tracking-wider text-gray-400 truncate">
            {label}
          </p>
          <p className="text-lg font-bold leading-tight mt-0.5" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: color + '14', color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default VisitsPage;
