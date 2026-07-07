// 📁 src/features/aidants/pages/AidantCatalogPage.tsx
// ✅ INTERFACE CATALOGUE DE PRODUCTION : ÉTATS D'ASSIGNATIONS ET DESASSIGNATION D'URGENCE

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, RefreshCw } from 'lucide-react';
import AssignAidantModal from '../components/AssignAidantModal';

import { useAuthStore } from '@/stores/authStore';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { usePatientStore } from '@/stores/patientStore';
import { useAssignmentStore } from '@/stores/assignmentStore';

import { getThemeColors, getThemeByRole } from '@/lib/permissions';

import { AidantCard } from '../components/AidantCard';
import { AidantFilters } from '../components/AidantFilters';
 
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Illustration } from '@/components/ui/Illustration';

import { AidantFilters as AidantFiltersType } from '@/types/aidant';
import toast from 'react-hot-toast';

const AidantCatalogPage = () => {
  const navigate = useNavigate();

  const { profile, role } = useAuthStore();
  const { patients, fetchPatients } = usePatientStore();
  
  // ✅ Store d'assignation
  const { 
    assignments,
    fetchAssignments, 
    revokeAssignment,
    isLoading: assignmentLoading 
  } = useAssignmentStore();

  const {
    aidants,
    isLoading,
    fetchAidants,
    filters,
    setFilters: setStoreFilters,
  } = useAidantCatalogStore();

  const [showFilters, setShowFilters] = useState(false);
  const [selectedAidant, setSelectedAidant] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ============================================================
  // INITIALISATION
  // ============================================================

  useEffect(() => {
    if (profile?.role !== 'family') {
      navigate('/app');
      return;
    }

    const loadData = async () => {
      await Promise.all([
        fetchAidants(),
        fetchPatients(),
        fetchAssignments(),  // ✅ Charger les assignations de la famille
      ]);
    };
    
    loadData();
  }, [profile, fetchAidants, fetchPatients, fetchAssignments, navigate]);

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
    
    // Rafraîchir les données
    Promise.all([
      fetchAidants(),
      fetchAssignments(),
    ]);
  };

  // ✅ Libérer un aidant directement depuis le catalogue d'un clic !
  const handleRevoke = async (assignmentId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir libérer cet aidant ? Il ne sera plus lié à votre compte.")) return;

    try {
      await revokeAssignment(assignmentId, "Révocation demandée depuis le catalogue d'aidants");
      toast.success("L'aidant a été libéré avec succès");
      
      // Rafraîchir
      Promise.all([
        fetchAidants(),
        fetchAssignments(),
      ]);
    } catch (err) {
      toast.error("Erreur lors de la libération de l'aidant");
    }
  };

  const handleRefresh = useCallback(() => {
    Promise.all([
      fetchAidants(),
      fetchAssignments(),
    ]);
  }, [fetchAidants, fetchAssignments]);

  const handleFilterChange = useCallback((newFilters: Partial<AidantFiltersType>) => {
    setStoreFilters(newFilters);
  }, [setStoreFilters]);

  // ============================================================
  // RENDU
  // ============================================================

  if (isLoading || assignmentLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] w-full px-4">
        <LoadingSpinner size="lg" text="Chargement du catalogue..." />
      </div>
    );
  }

  if (profile?.role !== 'family') {
    return null;
  }

  const hasPatients = patients.length > 0;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 overflow-x-hidden">

      {/* HEADER & TOOLBAR */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <h1
            className="text-lg sm:text-xl font-bold tracking-tight"
            style={{ color: colors.text }}
          >
            🦸 Aidants disponibles
          </h1>
          <p className="text-xs text-gray-400">
            {aidants.length} aidant{aidants.length > 1 ? 's' : ''} disponible{aidants.length > 1 ? 's' : ''}
            {hasPatients ? ` • ${patients.length} proche${patients.length > 1 ? 's' : ''}` : ' • Aucun proche enregistré'}
          </p>
        </div>

        {/* RECHERCHE ET ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center w-full min-w-0">
          <div className="relative flex-1 min-w-0 w-full">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, spécialité ou zone..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none transition focus:ring-1 focus:ring-offset-0 min-w-0"
              style={{ borderColor: colors.border, color: colors.text }}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl border text-xs flex items-center justify-center gap-1.5 hover:bg-gray-50 transition font-medium"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              <Filter size={13} />
              Filtres
            </button>

            <button
              onClick={handleRefresh}
              className="px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 hover:opacity-85 transition font-medium shrink-0"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <RefreshCw size={13} />
              Actualiser
            </button>
          </div>
        </div>
      </section>

      {/* FILTRES */}
      {showFilters && (
        <div className="w-full min-w-0">
          <AidantFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
            colors={colors}
          />
        </div>
      )}

      {/* MESSAGE SI AUCUN PROCHE */}
      {!hasPatients && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-sm text-amber-700">
            ⚠️ Vous n'avez pas encore de proche enregistré. Vous pouvez toujours vous assigner un aidant personnel.
          </p>
          <button
            onClick={() => navigate('/app/patients')}
            className="mt-2 text-xs font-medium text-amber-800 hover:underline"
          >
            Ajouter un proche
          </button>
        </div>
      )}

      {/* LISTE DES CARTES */}
      {filteredAidants.length > 0 ? (
        <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
          {filteredAidants.map((aidant) => {
            // ✅ Trouver si cet aidant est déjà lié à votre compte ou à un proche
            const targetAidantId = aidant.user_id || aidant.id;
            const activeAssignment = assignments.find(
              as => (as.aidant_user_id === targetAidantId || as.aidant?.id === aidant.id) && as.status === 'active'
            );
            const isAssigned = !!activeAssignment;

            return (
              <div key={aidant.id} className="min-w-0 w-full">
                <AidantCard
                  aidant={aidant}
                  onClick={() => navigate(`/app/aidants/${aidant.id}`)}
                  onAssign={() => handleAssign(aidant)}
                  onRevoke={isAssigned ? () => handleRevoke(activeAssignment.id) : undefined}
                  colors={colors}
                  showActions={true}
                  isAssigned={isAssigned} // ✅ True s'il est déjà lié
                  assignedTargetName={activeAssignment?.target_name} // ✅ Nom de la personne assignée
                />
              </div>
            );
          })}
        </section>
      ) : (
        <section className="text-center py-12 px-4 bg-white rounded-2xl border border-black/5 w-full min-w-0">
          <Illustration type="search" size="md" className="mx-auto opacity-30 mb-3" />
          <h3 className="font-semibold text-xs sm:text-sm" style={{ color: colors.text }}>
            {searchTerm ? 'Aucun aidant ne correspond à votre recherche' : 'Aucun aidant disponible pour le moment'}
          </h3>
          <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
            {searchTerm 
              ? 'Essayez de modifier votre recherche ou vos filtres' 
              : 'Revenez plus tard, de nouveaux aidants peuvent être disponibles'}
          </p>
        </section>
      )}

      {/* MODAL D'ASSIGNATION */}
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
