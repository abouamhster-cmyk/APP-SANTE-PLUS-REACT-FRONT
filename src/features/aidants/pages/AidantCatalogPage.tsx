// 📁 src/features/aidants/pages/AidantCatalogPage.tsx

import { useEffect, useState, useMemo, useCallback } from 'react';
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

import { AidantFilters as AidantFiltersType } from '@/types/aidant';
import toast from 'react-hot-toast';

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

const AidantCatalogPage = () => {
  const navigate = useNavigate();

  const { profile, role } = useAuthStore();
  const { patients, fetchPatients } = usePatientStore();

  const {
    aidants,
    isLoading,
    fetchAidants,
    filters,
    setFilters: setStoreFilters,
    assignments,
    fetchMyAssignments,
  } = useAidantCatalogStore();

  const { isFamily } = useTerminology();

  const [showFilters, setShowFilters] = useState(false);
  const [selectedAidant, setSelectedAidant] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  const hasPatients = patients.length > 0;

  // ============================================================
  // INITIALISATION
  // ============================================================

  useEffect(() => {
    if (profile?.role !== 'family') {
      navigate('/app');
      return;
    }

    fetchAidants();
    fetchPatients();
    fetchMyAssignments();
  }, [profile, fetchAidants, fetchPatients, fetchMyAssignments, navigate]);

  // ============================================================
  // FILTRAGE
  // ============================================================

  const filteredAidants = useMemo(() => {
    if (!searchTerm) return aidants;

    const term = searchTerm.toLowerCase();

    return aidants.filter((a) =>
      a.user?.full_name?.toLowerCase().includes(term) ||
      a.specialties?.some((s) => s.toLowerCase().includes(term)) ||
      a.zones?.some((z) => z.toLowerCase().includes(term))
    );
  }, [searchTerm, aidants]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleAssign = (aidant: any) => {
    setSelectedAidant(aidant);
    setShowAssignModal(true);
  };

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    setSelectedAidant(null);
    fetchAidants();
    fetchMyAssignments();
    toast.success('✅ Aidant assigné avec succès');
  };

  const handleRefresh = useCallback(() => {
    fetchAidants();
  }, [fetchAidants]);

  // ✅ CORRECTION : Utiliser le type exact AidantFilters
  const handleFilterChange = useCallback((newFilters: Partial<AidantFiltersType>) => {
    setStoreFilters(newFilters);
  }, [setStoreFilters]);

  // ============================================================
  // RENDU
  // ============================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Chargement des aidants..." />
      </div>
    );
  }

  if (profile?.role !== 'family') {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">

      {/* ============================================================
      HEADER
      ============================================================ */}
      <section className="space-y-3">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          <div>
            <h1
              className="text-xl sm:text-2xl font-bold"
              style={{ color: colors.text }}
            >
              🦸 Aidants disponibles
            </h1>

            <p className="text-xs mt-1 text-gray-400">
              {aidants.length} disponibles
              {assignments.length > 0 && ` • ${assignments.length} assignation(s) active(s)`}
            </p>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 rounded-xl border text-xs flex items-center gap-1 hover:bg-gray-50 transition"
              style={{ borderColor: colors.border }}
            >
              <Filter size={14} />
              Filtres
            </button>

            <button
              onClick={handleRefresh}
              className="px-3 py-2 rounded-xl text-xs flex items-center gap-1 hover:opacity-80 transition"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <RefreshCw size={14} />
              Actualiser
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
            placeholder="Rechercher par nom, spécialité ou zone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition"
            style={{ borderColor: colors.border }}
          />
        </div>

        {/* INFO LIGHT */}
        {!hasPatients && (
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-xl">
            <UserCircle size={14} className="mt-0.5 shrink-0" />
            <span>💡 Assignation possible sans proche enregistré (compte personnel)</span>
          </div>
        )}
      </section>

      {/* ============================================================
      FILTRES
      ============================================================ */}
      {showFilters && (
        <AidantFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClose={() => setShowFilters(false)}
          colors={colors}
        />
      )}

      {/* ============================================================
      LISTE DES AIDANTS
      ============================================================ */}
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
        <section className="text-center py-16 bg-white rounded-2xl border border-black/5">
          <Illustration type="search" size="lg" className="mx-auto opacity-30 mb-4" />
          <h3 className="font-semibold text-sm" style={{ color: colors.text }}>
            {searchTerm ? 'Aucun aidant trouvé' : 'Aucun aidant disponible'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {searchTerm
              ? 'Essayez un autre mot-clé'
              : 'Revenez plus tard, de nouveaux aidants seront disponibles'}
          </p>
        </section>
      )}

      {/* ============================================================
      MODAL D'ASSIGNATION
      ============================================================ */}
      {showAssignModal && selectedAidant && (
        <AssignAidantModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedAidant(null);
          }}
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
