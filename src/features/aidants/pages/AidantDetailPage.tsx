// 📁 frontend/src/features/aidants/pages/AidantDetailPage.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  Award,
  MessageCircle,
  UserPlus,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { usePatientStore } from '@/stores/patientStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Illustration } from '@/components/ui/Illustration';
import { AssignAidantModal } from '../components/AssignAidantModal';
import { formatDate } from '@/utils/helpers';
import toast from 'react-hot-toast';

const AidantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const { patients, fetchPatients } = usePatientStore();
  const {
    selectedAidant: aidant,
    isLoading,
    fetchAidantById,
    assignments,
    fetchMyAssignments,
  } = useAidantCatalogStore();

  const { isFamily } = useTerminology();
  const [showAssignModal, setShowAssignModal] = useState(false);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    if (id) {
      fetchAidantById(id);
      if (isFamily) {
        fetchPatients();
        fetchMyAssignments();
      }
    }
  }, [id]);

  const getSpecialtyLabel = (specialty: string) => {
    const labels: Record<string, string> = {
      senior: '👴 Senior',
      maman_bebe: '👶 Maman & Bébé',
      accompagnement: '🤝 Accompagnement',
      autre: '📝 Autre',
    };
    return labels[specialty] || specialty;
  };

  const getStatusBadge = () => {
    if (!aidant?.is_available) {
      return { label: 'Indisponible', color: '#EF4444', bg: '#FEF2F2' };
    }
    if ((aidant?.active_assignments || 0) >= (aidant?.max_assignments || 4)) {
      return { label: 'Complet', color: '#F59E0B', bg: '#FFFBEB' };
    }
    return { label: 'Disponible', color: '#10B981', bg: '#ECFDF5' };
  };

  const status = aidant ? getStatusBadge() : { label: '', color: '', bg: '' };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Chargement..." />
      </div>
    );
  }

  if (!aidant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Illustration type="empty" size="lg" className="mx-auto mb-4" />
        <h3 className="text-lg font-bold" style={{ color: colors.text }}>
          Aidant non trouvé
        </h3>
        <button
          onClick={() => navigate('/app/aidants')}
          className="mt-4 px-4 py-2 rounded-xl text-white font-bold"
          style={{ background: colors.primary }}
        >
          Retourner au catalogue
        </button>
      </div>
    );
  }

   const isAlreadyAssigned = assignments.some(
    (a) => a.family_id === aidant.user_id && a.relationship !== 'cancelled'
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 sm:pb-10">
      {/* EN-TÊTE */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/app/aidants')}
          className="p-2 hover:bg-gray-100 rounded-xl transition"
        >
          <ArrowLeft size={24} style={{ color: colors.text }} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: colors.text }}>
            Profil de l'aidant
          </h1>
          <p className="text-sm" style={{ color: colors.text + '60' }}>
            {aidant.user?.full_name}
          </p>
        </div>
      </div>

      {/* CARTE PROFIL */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar */}
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shrink-0"
            style={{ background: colors.primary }}
          >
            {aidant.user?.full_name?.charAt(0) || 'A'}
          </div>

          {/* Infos */}
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
                  {aidant.user?.full_name}
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm flex items-center gap-1" style={{ color: colors.text + '60' }}>
                    <Star size={16} className="fill-yellow-400 text-yellow-400" />
                    {aidant.avg_rating || aidant.rating || 0} ({aidant.total_reviews || 0} avis)
                  </span>
                  <span className="text-sm text-gray-300">•</span>
                  <span className="text-sm flex items-center gap-1" style={{ color: colors.text + '60' }}>
                    <Briefcase size={16} />
                    {aidant.total_missions || 0} missions
                  </span>
                </div>
              </div>

              <span
                className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5"
                style={{ background: status.bg, color: status.color }}
              >
                {status.label === 'Disponible' ? (
                  <CheckCircle size={14} />
                ) : status.label === 'Complet' ? (
                  <AlertCircle size={14} />
                ) : (
                  <AlertCircle size={14} />
                )}
                {status.label}
              </span>
            </div>

            {/* Spécialités */}
            <div className="flex flex-wrap gap-2 mt-3">
              {aidant.specialties?.map((spec) => (
                <span
                  key={spec}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: colors.primary + '12', color: colors.primary }}
                >
                  {getSpecialtyLabel(spec)}
                </span>
              ))}
            </div>

            {/* Infos supplémentaires */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-2 text-sm" style={{ color: colors.text + '60' }}>
                <MapPin size={16} />
                <span>{aidant.zones?.join(', ') || 'Non renseigné'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: colors.text + '60' }}>
                <Clock size={16} />
                <span>Temps de réponse : {aidant.average_response_time || '~5'} min</span>
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: colors.text + '60' }}>
                <Award size={16} />
                <span>{aidant.experience_years || 0} ans d'expérience</span>
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: colors.text + '60' }}>
                <CheckCircle size={16} />
                <span>{aidant.active_assignments || 0}/{aidant.max_assignments || 4} missions actives</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {aidant.bio && (
          <div className="mt-4 p-4 rounded-xl" style={{ background: colors.primary + '05' }}>
            <p className="text-sm italic" style={{ color: colors.text + '70' }}>
              "{aidant.bio}"
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t" style={{ borderColor: colors.border }}>
          <button
            onClick={() => window.open(`mailto:${aidant.user?.email}`)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border hover:bg-gray-50 transition flex items-center justify-center gap-2"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <Mail size={16} />
            Contacter
          </button>

          {isFamily && !isAlreadyAssigned && aidant.is_available && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: colors.primary }}
            >
              <UserPlus size={16} />
              Choisir cet aidant
            </button>
          )}

          {isFamily && isAlreadyAssigned && (
            <button
              disabled
              className="flex-1 py-2.5 rounded-xl text-sm font-medium opacity-50 cursor-not-allowed"
              style={{ background: '#E5E7EB', color: '#9CA3AF' }}
            >
              ✅ Déjà assigné
            </button>
          )}

          {!aidant.is_available && (
            <button
              disabled
              className="flex-1 py-2.5 rounded-xl text-sm font-medium opacity-50 cursor-not-allowed"
              style={{ background: '#E5E7EB', color: '#9CA3AF' }}
            >
              Indisponible
            </button>
          )}
        </div>
      </section>

      {/* MODAL D'ASSIGNATION */}
      {showAssignModal && (
        <AssignAidantModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          aidant={aidant}
          patients={patients}
          onSuccess={() => {
            setShowAssignModal(false);
            fetchAidantById(id!);
            fetchMyAssignments();
            toast.success('✅ Aidant assigné avec succès !');
          }}
          colors={colors}
        />
      )}
    </div>
  );
};

export default AidantDetailPage;
