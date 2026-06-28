// 📁 src/features/patients/pages/PatientsPage.tsx

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Plus, 
  Search, 
  Users, 
  Filter,
  UserPlus,
  UserCircle,
  Baby,
  CheckCircle,
  Users as UsersIcon,
  UserSearch,
} from 'lucide-react';

import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { Illustration } from '@/components/ui/Illustration';
import { PatientCard } from '@/components/patients/PatientCard';
import { PatientModal } from '../components/PatientModal';
import toast from 'react-hot-toast';

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

const PatientsPage = () => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();

  const {
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

  const colors = getThemeColors(getThemeByRole(role as any, profile?.patient_category as any));

  // =============================================
  // EFFETS
  // =============================================

  useEffect(() => {
    fetchPatients();
  }, []);

  // =============================================
  // FILTRES
  // =============================================

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

  // =============================================
  // ACTIONS
  // =============================================

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

  // =============================================
  // STATS
  // =============================================

  const stats = {
    total: patients.length,
    senior: patients.filter((p) => p.category === 'senior').length,
    maman: patients.filter((p) => p.category === 'maman_bebe').length,
    active: patients.filter((p) => p.status === 'active').length,
  };

  // =============================================
  // RENDU - CHARGEMENT
  // =============================================

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-5 p-3 sm:p-4">
        <div className="h-20 bg-white rounded-3xl animate-pulse shadow-sm" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white rounded-2xl animate-pulse shadow-sm" />
          ))}
        </div>
        <div className="h-12 bg-white rounded-2xl animate-pulse shadow-sm" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-white rounded-2xl animate-pulse shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  // =============================================
  // RENDU - PRINCIPAL
  // =============================================

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-20 p-3 sm:p-4">
      
      {/* ========================================== */}
      {/* HEADER */}
      {/* ========================================== */}
      <section 
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all"
        style={{ background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.primary}12 100%)` }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <UsersIcon size={20} style={{ color: colors.primary }} />
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: colors.text }}>
                {list}
              </h1>
            </div>
            <p className="text-xs" style={{ color: colors.textLight }}>
              {getCountLabel(patients.length)}
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-white transition hover:opacity-90 shrink-0 flex items-center gap-1.5"
            style={{ background: colors.primary }}
          >
            <UserPlus size={14} />
            {add}
          </button>
        </div>
      </section>

      {/* ========================================== */}
      {/* STATS */}
      {/* ========================================== */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard 
          label="Total" 
          value={stats.total} 
          color={colors.primary} 
          icon={<UsersIcon size={16} />} 
        />
        <StatCard 
          label="Senior" 
          value={stats.senior} 
          color="#4CAF50" 
          icon={<UserCircle size={16} />} 
        />
        <StatCard 
          label="Maman" 
          value={stats.maman} 
          color="#E8B4B8" 
          icon={<Baby size={16} />} 
        />
        <StatCard 
          label="Actifs" 
          value={stats.active} 
          color="#2196F3" 
          icon={<CheckCircle size={16} />} 
        />
      </section>

      {/* ========================================== */}
      {/* RECHERCHE + FILTRE */}
      {/* ========================================== */}
      <section className="bg-white rounded-3xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Rechercher un${singular.startsWith('béné') ? ' ' : 'e '}${singular}...`}
            className="w-full pl-10 pr-3 py-2.5 text-xs rounded-2xl border outline-none"
            style={{ borderColor: colors.border, background: 'var(--color-background)', color: colors.text }}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3.5 py-2.5 text-xs rounded-2xl border outline-none"
          style={{ borderColor: colors.border, background: 'var(--color-background)', color: colors.text }}
        >
          <option value="all">Tous</option>
          <option value="senior">Senior</option>
          <option value="maman_bebe">Maman & Bébé</option>
        </select>
      </section>

      {/* ========================================== */}
      {/* LISTE DES PATIENTS */}
      {/* ========================================== */}
      {filteredPatients.length > 0 ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
        <section className="bg-white rounded-3xl p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-black/5">
          <Illustration 
            type={searchTerm || categoryFilter !== 'all' ? 'search' : 'users'} 
            size="lg" 
            className="mx-auto mb-4 opacity-40"
          />

          <h3 className="text-base font-bold" style={{ color: colors.text }}>
            {searchTerm || categoryFilter !== 'all'
              ? `Aucun${singular === 'personne accompagnée' ? 'e' : ''} ${singular} trouvé`
              : empty}
          </h3>

          <p className="text-xs mt-1 text-gray-400">
            {searchTerm || categoryFilter !== 'all'
              ? 'Essayez avec d\'autres critères.'
              : emptyAction}
          </p>

          {!searchTerm && categoryFilter === 'all' && (
            <button
              onClick={handleAdd}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-white font-bold text-sm"
              style={{ background: colors.primary }}
            >
              <UserPlus size={14} />
              {add}
            </button>
          )}
        </section>
      )}

      {/* ========================================== */}
      {/* BOUTON MOBILE */}
      {/* ========================================== */}
      <button
        onClick={handleAdd}
        className="sm:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-2xl text-white shadow-lg flex items-center justify-center active:scale-95 transition"
        style={{ background: colors.primary }}
        aria-label={add}
      >
        <Plus size={22} />
      </button>

      {/* ========================================== */}
      {/* MODAL */}
      {/* ========================================== */}
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
// STAT CARD
// =============================================

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

const StatCard = ({ label, value, color, icon }: StatCardProps) => (
  <div className="bg-white rounded-2xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex items-center justify-between">
    <div className="space-y-0.5">
      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-extrabold" style={{ color }}>{value}</p>
    </div>
    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '0d', color }}>
      {icon}
    </div>
  </div>
);

export default PatientsPage;
