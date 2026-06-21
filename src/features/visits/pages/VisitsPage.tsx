// 📁 src/features/visits/pages/VisitsPage.tsx
// 📌 Page : Gestion des visites

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
  const { visits, isLoading, fetchVisits } = useVisitStore();
  const { patients, fetchPatients } = usePatientStore();

  // ✅ Jargon dynamique selon le rôle
  const {
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
    plural,          // "proches" / "personnes accompagnées" / "bénéficiaires"
    getCountLabel,
    isFamily,
    isAidant,
    isCoordinator,
    isAdmin,
    isAdminOrCoordinator,
  } = useTerminology();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const canPlanify = isAdminOrCoordinator;
  const canStartVisit = isAidant || isAdminOrCoordinator;
  const canCompleteVisit = isAidant || isAdminOrCoordinator;
  const canCancelVisit = isAdminOrCoordinator;

  useEffect(() => {
    fetchVisits();
    fetchPatients();
  }, []);

  const availableFilters = useMemo(() => {
    if (isAdminOrCoordinator) {
      return [
        { value: 'all', label: 'Toutes les visites' },
        { value: 'planifiee', label: 'Planifiées' },
        { value: 'en_cours', label: 'En cours' },
        { value: 'terminee', label: 'Terminées' },
        { value: 'validee', label: 'Validées' },
        { value: 'annulee', label: 'Annulées' },
        { value: 'replanifiee', label: 'Replanifiées' },
        { value: 'no_show', label: 'Absents' },
      ];
    }

    if (isAidant) {
      return [
        { value: 'all', label: 'Toutes les missions' },
        { value: 'planifiee', label: 'À venir' },
        { value: 'en_cours', label: 'En cours' },
        { value: 'terminee', label: 'Terminées' },
        { value: 'annulee', label: 'Annulées' },
      ];
    }

    return [
      { value: 'all', label: 'Toutes les visites' },
      { value: 'planifiee', label: 'Planifiées' },
      { value: 'en_cours', label: 'En cours' },
      { value: 'terminee', label: 'Terminées' },
      { value: 'annulee', label: 'Annulées' },
    ];
  }, [isAidant, isAdminOrCoordinator]);

  const stats = {
    total: visits.length,
    planned: visits.filter((v) => v.status === 'planifiee').length,
    inProgress: visits.filter((v) => v.status === 'en_cours').length,
    completed: visits.filter(
      (v) => v.status === 'terminee' || v.status === 'validee'
    ).length,
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
    setSelectedVisit(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchVisits();
    setIsModalOpen(false);

    toast.success(
      modalMode === 'create' ? 'Visite planifiée' : 'Visite mise à jour'
    );
  };

  const handleStartVisit = async (visitId: string) => {
    try {
      const { startVisit } = useVisitStore.getState();

      await startVisit(visitId);

      toast.success('Visite démarrée');
      fetchVisits();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du démarrage');
    }
  };

  const handleCancelVisit = async (visitId: string) => {
    if (!window.confirm('Annuler cette visite ?')) return;

    try {
      const { cancelVisit } = useVisitStore.getState();

      await cancelVisit(visitId);

      toast.success('Visite annulée');
      fetchVisits();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'annulation");
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
        <div className="h-20 bg-white rounded-2xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden space-y-5 pb-24 sm:pb-10">
      {/* HEADER */}
      <section className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-black/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-2"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <Calendar size={13} />
              {isAidant ? 'Missions assignées' : 'Suivi des visites'}
            </div>

            <h1
              className="text-2xl font-black leading-tight"
              style={{ color: colors.text }}
            >
              {isAidant ? 'Mes missions' : 'Visites'}
            </h1>

            <p className="text-sm mt-1" style={{ color: colors.text + '70' }}>
              {visits.length} visite{visits.length > 1 ? 's' : ''} au total
            </p>
          </div>

          {canPlanify && (
            <button
              onClick={handleAdd}
              className="hidden sm:inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition hover:opacity-90"
              style={{ background: colors.primary }}
            >
              <Plus size={17} />
              Planifier
            </button>
          )}
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBox
          icon={<Calendar size={18} />}
          label="Total"
          value={stats.total}
          color={colors.primary}
        />

        <StatBox
          icon={<Clock size={18} />}
          label="Planifiées"
          value={stats.planned}
          color="#4CAF50"
        />

        <StatBox
          icon={<PlayCircle size={18} />}
          label="En cours"
          value={stats.inProgress}
          color="#FF9800"
        />

        <StatBox
          icon={<CheckCircle size={18} />}
          label="Terminées"
          value={stats.completed}
          color="#2196F3"
        />
      </section>

      {/* FILTRE */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Filter size={17} style={{ color: colors.text + '60' }} />
            <span className="text-sm font-semibold" style={{ color: colors.text + '70' }}>
              Filtrer
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative w-full sm:w-72">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full appearance-none px-4 py-3 pr-10 rounded-2xl border outline-none transition text-sm bg-gray-50"
                style={{
                  borderColor: colors.border || '#e5e0d8',
                  color: colors.text,
                }}
              >
                {availableFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label} ({getStatusCount(filter.value)})
                  </option>
                ))}
              </select>

              <ChevronDown
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: colors.text + '45' }}
              />
            </div>

            <span className="text-sm text-gray-500 sm:min-w-[92px] sm:text-right">
              {sortedVisits.length} résultat{sortedVisits.length > 1 ? 's' : ''}
            </span>
          </div>
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
                  canStartVisit && visit.status === 'planifiee'
                    ? () => handleStartVisit(visit.id)
                    : undefined
                }
                onComplete={
                  canCompleteVisit && visit.status === 'en_cours'
                    ? () => navigate(`/app/visits/${visit.id}?action=complete`)
                    : undefined
                }
                onCancel={
                  canCancelVisit && visit.status === 'planifiee'
                    ? () => handleCancelVisit(visit.id)
                    : undefined
                }
                onView={() => navigate(`/app/visits/${visit.id}`)}
              />
            </div>
          ))}
        </section>
      ) : (
        <section className="bg-white rounded-2xl p-6 md:p-8 text-center shadow-sm border border-black/5">
          <div
            className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
            style={{
              background: colors.primary + '12',
              color: colors.primary,
            }}
          >
            {filterStatus === 'annulee' ? (
              <XCircle size={28} />
            ) : (
              <Calendar size={28} />
            )}
          </div>

          <h3 className="text-lg font-black" style={{ color: colors.text }}>
            {filterStatus !== 'all'
              ? 'Aucune visite avec ce statut'
              : isAidant
                ? 'Aucune mission assignée'
                : 'Aucune visite'}
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            {filterStatus !== 'all'
              ? 'Essayez un autre filtre.'
              : isAidant
                ? 'Vous n’avez aucune mission pour le moment.'
                : 'Planifiez votre première visite.'}
          </p>

          {canPlanify && filterStatus === 'all' && (
            <button
              onClick={handleAdd}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm transition hover:opacity-90"
              style={{ background: colors.primary }}
            >
              <Plus size={17} />
              Planifier une visite
            </button>
          )}
        </section>
      )}

      {/* BOUTON MOBILE */}
      {canPlanify && (
        <button
          onClick={handleAdd}
          className="sm:hidden fixed bottom-5 right-5 z-40 w-14 h-14 rounded-2xl text-white shadow-xl flex items-center justify-center active:scale-95 transition"
          style={{ background: colors.primary }}
          aria-label="Planifier une visite"
        >
          <Plus size={26} />
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
// STAT BOX
// =============================================

interface StatBoxProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

const StatBox = ({ icon, label, value, color }: StatBoxProps) => {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm border border-black/5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-gray-500 truncate">{label}</p>
          <p className="text-xl font-black leading-tight mt-1" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: color + '14',
            color,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default VisitsPage;