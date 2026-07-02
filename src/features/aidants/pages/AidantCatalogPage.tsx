// 📁 src/features/aidants/pages/AidantCatalogPage.tsx

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, RefreshCw, UserCircle } from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { usePatientStore } from '@/stores/patientStore';

import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';

import { AidantCard } from '../components/AidantCard';
import { AidantFilters } from '../components/AidantFilters';
import { AssignAidantModal } from '../components/AssignAidantModal';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Illustration } from '@/components/ui/Illustration';

import toast from 'react-hot-toast';

const AidantCatalogPage = () => {
  const navigate = useNavigate();

  const { profile, role } = useAuthStore();
  const { patients, fetchPatients } = usePatientStore();

  const {
    aidants,
    isLoading,
    fetchAidants,
    filters,
    setFilters,
    assignments,
    fetchMyAssignments,
  } = useAidantCatalogStore();

  const { isFamily } = useTerminology();

  const [showFilters, setShowFilters] = useState(false);
  const [selectedAidant, setSelectedAidant] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const hasPatients = patients.length > 0;

  // 🔄 INIT
  useEffect(() => {
    if (profile?.role !== 'family') {
      navigate('/app');
      return;
    }

    fetchAidants();
    fetchPatients();
    fetchMyAssignments();
  }, [profile]);

  // 🔍 FILTER OPTIMISÉ (memo)
  const filteredAidants = useMemo(() => {
    if (!searchTerm) return aidants;

    const term = searchTerm.toLowerCase();

    return aidants.filter((a) =>
      a.user?.full_name?.toLowerCase().includes(term) ||
      a.specialties?.some((s) => s.toLowerCase().includes(term)) ||
      a.zones?.some((z) => z.toLowerCase().includes(term))
    );
  }, [searchTerm, aidants]);

  const handleAssign = (aidant: any) => {
    setSelectedAidant(aidant);
    setShowAssignModal(true);
  };

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    setSelectedAidant(null);
    fetchAidants();
    fetchMyAssignments();
    toast.success('Aidant assigné avec succès');
  };

  if (isLoading) return <LoadingSpinner />;

  if (profile?.role !== 'family') return null;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">

      {/* HEADER CLEAN */}
      <section className="space-y-3">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          <div>
            <h1
              className="text-xl sm:text-2xl font-bold"
              style={{ color: colors.text }}
            >
              Aidants disponibles
            </h1>

            <p className="text-xs mt-1 text-gray-400">
              {aidants.length} disponibles
              {assignments.length > 0 && ` • ${assignments.length} actifs`}
            </p>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 rounded-xl border text-xs flex items-center gap-1 hover:bg-gray-50"
              style={{ borderColor: colors.border }}
            >
              <Filter size={14} />
            </button>

            <button
              onClick={fetchAidants}
              className="px-3 py-2 rounded-xl text-xs flex items-center gap-1"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2"
            style={{ borderColor: colors.border }}
          />
        </div>

        {/* INFO LIGHT */}
        {!hasPatients && (
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <UserCircle size={14} className="mt-0.5" />
            Assignation possible sans proche
          </div>
        )}
      </section>

      {/* FILTRES */}
      {showFilters && (
        <AidantFilters
          filters={filters}
          onFilterChange={setFilters}
          onClose={() => setShowFilters(false)}
          colors={colors}
        />
      )}

      {/* LISTE */}
      {filteredAidants.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAidants.map((aidant) => (
            <AidantCard
              key={aidant.id}
              aidant={aidant}
              onClick={() => navigate(`/app/aidants/${aidant.id}`)}
              onAssign={() => handleAssign(aidant)}
              colors={colors}
            />
          ))}
        </section>
      ) : (
        <section className="text-center py-16">
          <Illustration type="search" size="lg" className="mx-auto opacity-30 mb-4" />
          <h3 className="font-semibold text-sm" style={{ color: colors.text }}>
            Aucun résultat
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Essayez un autre mot-clé
          </p>
        </section>
      )}

      {/* MODAL */}
      {showAssignModal && selectedAidant && (
        <AssignAidantModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          aidant={selectedAidant}
          patients={patients}
          onSuccess={handleAssignSuccess}
          colors={colors}
        />
      )}
    </div>
  );
};

export default AidantCatalogPage;
