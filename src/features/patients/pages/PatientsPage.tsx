// 📁 src/features/patients/pages/PatientsPage.tsx
// 📌 Page : Liste des personnes (proches/bénéficiaires/personnes accompagnées)

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Plus,
  Search,
  Users,
  ArrowRight,
} from 'lucide-react';

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
  
  // ✅ Jargon dynamique selon le rôle
  const {
    plural,          // "proches" / "personnes accompagnées" / "bénéficiaires"
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
    add,             // "Ajouter un proche" / "Ajouter une personne" / "Ajouter un bénéficiaire"
    list,            // "Mes proches" / "Mes personnes accompagnées" / "Bénéficiaires"
    listTitle,       // "Liste des proches" / "Liste des personnes accompagnées" / "Liste des bénéficiaires"
    empty,           // "Aucun proche" / "Aucune personne accompagnée" / "Aucun bénéficiaire"
    emptyAction,     // "Ajoutez une personne à accompagner" / "Ajoutez un bénéficiaire"
    emoji,           // 👨‍👩‍👦 / 🤝 / 👤
    getCountLabel,   // "2 proches" / "2 personnes accompagnées" / "2 bénéficiaires"
  } = useTerminology();

  const {
    patients,
    isLoading,
    fetchPatients,
    deletePatient,
  } = usePatientStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchPatients();
  }, []);

  // Filtrer par recherche
  const filteredPatients = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return patients;

    return patients.filter((patient: any) => {
      const firstName = patient.first_name || '';
      const lastName = patient.last_name || '';
      const address = patient.address || '';

      return (
        firstName.toLowerCase().includes(search) ||
        lastName.toLowerCase().includes(search) ||
        address.toLowerCase().includes(search) ||
        `${firstName} ${lastName}`.toLowerCase().includes(search)
      );
    });
  }, [patients, searchTerm]);

  // Supprimer
  const handleDelete = async (id: string) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer ce ${singular} ?`)) return;

    try {
      await deletePatient(id);
      toast.success(`${singular.charAt(0).toUpperCase() + singular.slice(1)} supprimé${singular === 'personne accompagnée' ? 'e' : ''}`);
      fetchPatients();
    } catch (error) {
      console.error(`❌ Erreur suppression ${singular}:`, error);
      toast.error(`Erreur lors de la suppression`);
    }
  };

  // Modifier
  const handleEdit = (patient: any) => {
    setSelectedPatient(patient);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Ajouter
  const handleAdd = () => {
    setSelectedPatient(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Succès du modal
  const handleModalSuccess = () => {
    fetchPatients();
    setIsModalOpen(false);

    toast.success(
      modalMode === 'create'
        ? `${singular.charAt(0).toUpperCase() + singular.slice(1)} ajouté${singular === 'personne accompagnée' ? 'e' : ''} avec succès`
        : 'Informations mises à jour'
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-5 pb-8">
        <div className="h-28 bg-white rounded-[1.75rem] animate-pulse" />
        <div className="h-14 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-52 bg-white rounded-[1.75rem] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* HEADER */}
      <section
        className="bg-white rounded-[1.75rem] p-5 md:p-6 shadow-sm border"
        style={{ borderColor: colors.primary + '12' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: colors.primary + '12',
                color: colors.primary,
              }}
            >
              <Users size={24} />
            </div>

            <div>
              <h1
                className="text-2xl font-black tracking-tight"
                style={{ color: colors.text }}
              >
                {list} {emoji}
              </h1>

              <p
                className="text-sm mt-1"
                style={{ color: colors.text + '70' }}
              >
                {getCountLabel(patients.length)}
              </p>
            </div>
          </div>

          <button
            onClick={handleAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-white font-bold text-sm transition hover:opacity-90 active:scale-[0.98]"
            style={{ background: colors.primary }}
          >
            <Plus size={18} />
            {add}
          </button>
        </div>
      </section>

      {/* RECHERCHE */}
      <section className="bg-white rounded-[1.5rem] p-3 shadow-sm border border-black/5">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 size-5"
            style={{ color: colors.text + '45' }}
          />

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border outline-none text-sm transition focus:ring-2"
            style={{
              borderColor: colors.primary + '14',
              background: 'var(--color-background, #f5f0e8)',
              color: colors.text,
            }}
            placeholder={`Rechercher un${singular.startsWith('béné') ? ' ' : 'e '}${singular} par nom ou adresse...`}
          />
        </div>
      </section>

      {/* LISTE */}
      {filteredPatients.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h2
                className="font-black"
                style={{ color: colors.text }}
              >
                {listTitle}
              </h2>

              <p
                className="text-sm"
                style={{ color: colors.text + '65' }}
              >
                {filteredPatients.length} résultat{filteredPatients.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPatients.map((patient: any) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onClick={() => navigate(`/app/patients/${patient.id}`)}
                onEdit={() => handleEdit(patient)}
                onDelete={() => handleDelete(patient.id)}
                showActions
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="bg-white rounded-[1.75rem] p-8 md:p-12 text-center shadow-sm border border-black/5">
          <div
            className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-4"
            style={{
              background: colors.primary + '12',
              color: colors.primary,
            }}
          >
            <User size={32} />
          </div>

          <h3
            className="text-lg font-black"
            style={{ color: colors.text }}
          >
            {searchTerm ? `Aucun${singular === 'personne accompagnée' ? 'e' : ''} ${singular} trouvé${singular === 'personne accompagnée' ? 'e' : ''}` : empty}
          </h3>

          <p
            className="mt-2 text-sm max-w-sm mx-auto leading-relaxed"
            style={{ color: colors.text + '70' }}
          >
            {searchTerm
              ? 'Essayez avec un autre nom, prénom ou quartier.'
              : emptyAction}
          </p>

          {!searchTerm && (
            <button
              onClick={handleAdd}
              className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-bold text-sm transition hover:opacity-90"
              style={{ background: colors.primary }}
            >
              <Plus size={18} />
              {add}
              <ArrowRight size={16} />
            </button>
          )}
        </section>
      )}

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

export default PatientsPage;