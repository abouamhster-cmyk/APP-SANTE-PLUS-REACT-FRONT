// 📁 src/features/aidants/pages/AidantCatalogPage.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, RefreshCw, UserPlus, Users, UserCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { usePatientStore } from '@/stores/patientStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { AidantProfile } from '@/types';
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
  const [selectedAidant, setSelectedAidant] = useState<AidantProfile | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ Redirection si l'utilisateur n'est pas une famille
  useEffect(() => {
    if (profile?.role !== 'family') {
      console.log('🔴 Accès refusé - Redirection vers dashboard');
      navigate('/app');
      return;
    }
    
    fetchAidants();
    fetchPatients();
    fetchMyAssignments();
  }, [profile, navigate]);

  // Filtrer les aidants par recherche
  const filteredAidants = aidants.filter((aidant) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      aidant.user?.full_name?.toLowerCase().includes(term) ||
      aidant.specialties?.some(s => s.toLowerCase().includes(term)) ||
      aidant.zones?.some(z => z.toLowerCase().includes(term))
    );
  });

  // ✅ HANDLE ASSIGN - MODIFIÉ POUR PERMETTRE L'ASSIGNATION PERSONNELLE
  const handleAssign = (aidant: AidantProfile) => {
    // ✅ Même sans patient, on ouvre le modal
    // Le modal propose l'option "Personnel" ou "Patient"
    setSelectedAidant(aidant);
    setShowAssignModal(true);
  };

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    setSelectedAidant(null);
    fetchAidants();
    fetchMyAssignments();
    toast.success('✅ Aidant assigné avec succès !');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Chargement des aidants..." />
      </div>
    );
  }

  // ✅ Si l'utilisateur n'est pas une famille, ne pas afficher la page
  if (profile?.role !== 'family') {
    return null;
  }

  // ✅ Afficher un message si aucun patient mais le modal gère l'option "Personnel"
  const hasPatients = patients.length > 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 sm:pb-10">
      {/* HEADER */}
      <section className="bg-white rounded-3xl p-5 shadow-sm border border-black/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-1.5"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <Users size={12} />
              Catalogue
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: colors.text }}>
              🦸 Aidants disponibles
            </h1>
            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              {aidants.length} aidant{aidants.length > 1 ? 's' : ''} disponible{aidants.length > 1 ? 's' : ''}
              {assignments.length > 0 && ` • ${assignments.length} assignation${assignments.length > 1 ? 's' : ''} en cours`}
              {!hasPatients && (
                <span className="ml-2 text-amber-600 text-[10px] flex items-center gap-1">
                  <UserCircle size={12} />
                  Compte personnel - Assignation possible sans proche
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 hover:bg-gray-50 transition"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              <Filter size={14} />
              Filtres
            </button>
            <button
              onClick={() => fetchAidants()}
              className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition"
              style={{ background: colors.primary + '12', color: colors.primary }}
            >
              <RefreshCw size={14} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="mt-4 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, spécialité ou zone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border outline-none text-sm"
            style={{ borderColor: colors.border, background: 'var(--color-background)' }}
          />
        </div>

        {/* ✅ BANNER INFORMATIF POUR COMPTE PERSONNEL */}
        {!hasPatients && (
          <div className="mt-3 p-3 rounded-xl flex items-start gap-2" style={{ background: colors.primary + '08' }}>
            <UserCircle size={16} style={{ color: colors.primary }} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium" style={{ color: colors.text }}>
                💡 Compte personnel
              </p>
              <p className="text-[10px]" style={{ color: colors.text + '60' }}>
                Vous pouvez assigner un aidant directement à votre compte personnel,
                sans avoir à créer un proche au préalable.
              </p>
            </div>
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

      {/* LISTE DES AIDANTS */}
      {filteredAidants.length > 0 ? (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <section className="bg-white rounded-3xl p-12 text-center shadow-sm border border-black/5">
          <Illustration type="search" size="lg" className="mx-auto mb-4 opacity-30" />
          <h3 className="text-base font-bold" style={{ color: colors.text }}>
            {searchTerm ? 'Aucun aidant trouvé' : 'Aucun aidant disponible'}
          </h3>
          <p className="text-xs mt-1 text-gray-400 max-w-sm mx-auto">
            {searchTerm
              ? 'Aucun aidant ne correspond à votre recherche.'
              : 'Revenez plus tard, de nouveaux aidants seront disponibles.'}
          </p>
          {!searchTerm && (
            <p className="text-[10px] text-gray-400 mt-2">
              💡 Vous pouvez toujours assigner un aidant à votre compte personnel
              même sans proche enregistré.
            </p>
          )}
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
