// 📁 src/features/patients/pages/PatientDetailPage.tsx
// 📌 Détails d'une personne (proche/bénéficiaire/personne accompagnée)

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Calendar, MapPin, Phone, User, Heart, Baby } from 'lucide-react';
import { usePatientStore } from '@/stores/patientStore';
import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate } from '@/utils/helpers';
import { PatientModal } from '../components/PatientModal';
import toast from 'react-hot-toast';

const PatientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  
  // ✅ Jargon dynamique selon le rôle
  const {
    singular,        // "proche" / "personne accompagnée" / "bénéficiaire"
    detail,          // "Détails du proche" / "Détails de la personne" / "Détails du bénéficiaire"
    edit,            // "Modifier le proche" / "Modifier la personne" / "Modifier le bénéficiaire"
    delete: deleteTerm, // ✅ Renommé pour éviter conflit avec le mot-clé delete
    noVisits,        // "Aucune visite pour ce proche" / "Aucune visite pour cette personne" / "Aucune visite pour ce bénéficiaire"
    noNotes,         // "Aucune note pour ce proche" / "Aucune note pour cette personne" / "Aucune note pour ce bénéficiaire"
    confirmDelete,   // "Voulez-vous vraiment supprimer ce proche ?" / ...
    deleted,         // "Proche supprimé" / "Personne supprimée" / "Bénéficiaire supprimé"
    updated,         // "Informations du proche mises à jour" / ...
    getCategoryLabel,
    isFamily,
    isAidant,
  } = useTerminology();

  const { currentPatient, fetchPatientById, deletePatient, isLoading } = usePatientStore();
  const { visits, fetchVisits } = useVisitStore();

  const [activeTab, setActiveTab] = useState<'info' | 'visits' | 'notes'>('info');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    if (id) {
      fetchPatientById(id);
      fetchVisits();
    }
  }, [id]);

  const personVisits = visits.filter(v => v.patient_id === id);

  // Supprimer
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

  // Modifier
  const handleEdit = () => {
    setIsModalOpen(true);
  };

  // Succès du modal
  const handleModalSuccess = () => {
    setIsModalOpen(false);
    if (id) {
      fetchPatientById(id);
    }
    toast.success(updated);
  };

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

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/app/patients')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
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
        <div className="flex space-x-2">
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

      {/* Info rapide */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm" style={{ color: colors.text + '60' }}>Âge</p>
          <p className="text-lg font-semibold" style={{ color: colors.text }}>{person.age || 'N/A'} ans</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm" style={{ color: colors.text + '60' }}>Sexe</p>
          <p className="text-lg font-semibold" style={{ color: colors.text }}>
            {person.gender === 'male' ? 'Homme' : person.gender === 'female' ? 'Femme' : 'N/A'}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm" style={{ color: colors.text + '60' }}>Statut</p>
          <p className="text-lg font-semibold" style={{ color: person.status === 'active' ? '#4CAF50' : '#F44336' }}>
            {person.status === 'active' ? '✅ Actif' : '❌ Inactif'}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm" style={{ color: colors.text + '60' }}>Visites</p>
          <p className="text-lg font-semibold" style={{ color: colors.primary }}>{personVisits.length}</p>
        </div>
      </div>

      {/* Tabs */}
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
            {tab === 'visits' && 'Visites'}
            {tab === 'notes' && 'Notes'}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
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
                <p className="text-sm font-medium" style={{ color: '#FF5722' }}>⚠️ Allergies: {person.allergies}</p>
              </div>
            )}
            {person.treatments && (
              <div className="p-3 rounded-xl" style={{ background: colors.primary + '10' }}>
                <p className="text-sm" style={{ color: colors.primary }}>💊 Traitements: {person.treatments}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'visits' && (
          <div>
            {personVisits.length > 0 ? (
              <div className="space-y-3">
                {personVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between p-4 rounded-xl cursor-pointer hover:bg-gray-50 transition"
                    style={{ background: colors.primary + '05' }}
                    onClick={() => navigate(`/app/visits/${visit.id}`)}
                  >
                    <div>
                      <p className="font-medium" style={{ color: colors.text }}>
                        📅 {formatDate(visit.scheduled_date)} à {visit.scheduled_time}
                      </p>
                      <p className="text-sm" style={{ color: colors.text + '60' }}>
                        Statut: {visit.status}
                      </p>
                    </div>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: visit.status === 'terminee' ? '#4CAF50' + '20' : '#FF9800' + '20',
                        color: visit.status === 'terminee' ? '#4CAF50' : '#FF9800',
                      }}
                    >
                      {visit.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: colors.text + '60' }}>
                <Calendar size={48} className="mx-auto mb-3 opacity-30" />
                <p>{noVisits}</p>
              </div>
            )}
          </div>
        )}

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

      {/* Modal de modification */}
      <PatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode="edit"
        patient={person}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default PatientDetailPage;