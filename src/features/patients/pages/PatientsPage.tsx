// 📁 src/features/patients/pages/PatientsPage.tsx
 
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Plus, Search, Users, Filter } from 'lucide-react';

import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { PatientCard } from '@/components/patients/PatientCard';
import { PatientModal } from '../components/PatientModal';
import toast from 'react-hot-toast';

const PatientsPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();

  const {
    plural,
    singular,
    add,
    list,
    empty,
    emptyAction,
    getCountLabel,
    isFamily,
    isAidant,
    isAdminOrCoordinator,
  } = useTerminology();

  const { patients, isLoading, fetchPatients, deletePatient } = usePatientStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchPatients();
  }, []);

  // ✅ Filtrer par recherche et catégorie
  const filteredPatients = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return patients.filter((patient: any) => {
      const matchSearch =
        !search ||
        patient.first_name?.toLowerCase().includes(search) ||
        patient.last_name?.toLowerCase().includes(search) ||
        patient.address?.toLowerCase().includes(search);

      const matchCategory =
        categoryFilter === 'all' || patient.category === categoryFilter;

      return matchSearch && matchCategory;
    });
  }, [patients, searchTerm, categoryFilter]);

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer ce ${singular} ?`)) return;

    try {
      await deletePatient(id);
      toast.success(`${singular.charAt(0).toUpperCase() + singular.slice(1)} supprimé`);
      fetchPatients();
    } catch (error) {
      console.error(error);
      toast.error(`Erreur lors de la suppression`);
    }
  };

  const handleEdit = (patient: any) => {
    setSelectedPatient(patient);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedPatient(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchPatients();
    setIsModalOpen(false);
    toast.success(
      modalMode === 'create'
        ? `${singular.charAt(0).toUpperCase() + singular.slice(1)} ajouté`
        : 'Informations mises à jour'
    );
  };

  // ✅ Options de filtre par catégorie
  const categoryOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'senior', label: '👴 Senior' },
    { value: 'maman_bebe', label: '👶 Maman & Bébé' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-16 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-12 bg-white rounded-xl animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 sm:pb-10">
      {/* HEADER */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-black/5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-1.5"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <Users size={12} />
              {list}
            </div>

            <h1 className="text-xl font-black" style={{ color: colors.text }}>
              {list}
            </h1>

            <p className="text-xs mt-0.5" style={{ color: colors.text + '70' }}>
              {getCountLabel(patients.length)}
            </p>
          </div>

          <button
            onClick={handleAdd}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white font-bold text-sm"
            style={{ background: colors.primary }}
          >
            <Plus size={16} />
            {add}
          </button>
        </div>
      </section>

      {/* STATS COMPACTES */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <CompactStat
          icon={<Users size={14} />}
          label="Total"
          value={patients.length}
          color={colors.primary}
        />
        <CompactStat
          icon="👴"
          label="Senior"
          value={patients.filter((p) => p.category === 'senior').length}
          color="#4CAF50"
        />
        <CompactStat
          icon="👶"
          label="Maman"
          value={patients.filter((p) => p.category === 'maman_bebe').length}
          color="#E8B4B8"
        />
        <CompactStat
          icon="✅"
          label="Actifs"
          value={patients.filter((p) => p.status === 'active').length}
          color="#2196F3"
        />
      </section>

      {/* RECHERCHE + FILTRE */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Rechercher un${singular.startsWith('béné') ? ' ' : 'e '}${singular}...`}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-gray-50 outline-none"
              style={{ borderColor: colors.border, color: colors.text }}
            />
          </div>

          <div className="relative min-w-[120px]">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-gray-50 outline-none appearance-none"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* LISTE */}
      {filteredPatients.length > 0 ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredPatients.map((patient: any) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onClick={() => navigate(`/app/patients/${patient.id}`)}
              onEdit={() => handleEdit(patient)}
              onDelete={() => handleDelete(patient.id)}
              showActions
              compact
            />
          ))}
        </section>
      ) : (
        <section className="bg-white rounded-2xl p-6 text-center shadow-sm border border-black/5">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3"
            style={{ background: colors.primary + '12', color: colors.primary }}
          >
            <User size={24} />
          </div>

          <h3 className="text-base font-bold" style={{ color: colors.text }}>
            {searchTerm || categoryFilter !== 'all'
              ? `Aucun${singular === 'personne accompagnée' ? 'e' : ''} ${singular} trouvé`
              : empty}
          </h3>

          <p className="text-xs mt-1 text-gray-500">
            {searchTerm || categoryFilter !== 'all'
              ? 'Essayez avec d\'autres critères.'
              : emptyAction}
          </p>

          {!searchTerm && categoryFilter === 'all' && (
            <button
              onClick={handleAdd}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold text-sm"
              style={{ background: colors.primary }}
            >
              <Plus size={16} />
              {add}
            </button>
          )}
        </section>
      )}

      {/* BOUTON MOBILE */}
      <button
        onClick={handleAdd}
        className="sm:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-2xl text-white shadow-lg flex items-center justify-center active:scale-95 transition"
        style={{ background: colors.primary }}
        aria-label={add}
      >
        <Plus size={22} />
      </button>

      {/* MODAL */}
      <PatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        patient={selectedPatient}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

// =============================================
// COMPACT STAT
// =============================================

interface CompactStatProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

const CompactStat = ({ icon, label, value, color }: CompactStatProps) => {
  return (
    <div className="bg-white rounded-xl p-2.5 shadow-sm border border-black/5">
      <div className="flex items-center justify-between gap-1">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className="text-lg font-bold mt-0.5" style={{ color }}>
            {value}
          </p>
        </div>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: color + '14', color }}
        >
          {typeof icon === 'string' ? (
            <span className="text-sm">{icon}</span>
          ) : (
            icon
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientsPage;
