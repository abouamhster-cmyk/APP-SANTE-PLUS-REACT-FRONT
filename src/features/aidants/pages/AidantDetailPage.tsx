// 📁 src/features/aidants/pages/AidantDetailPage.tsx

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
  Award,
  UserPlus,
  UserCheck,
  UserX,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { usePatientStore } from '@/stores/patientStore';
import { useAssignmentStore } from '@/stores/assignmentStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import AssignAidantModal from '../components/AssignAidantModal';

// ✅ Importer les types
import { TargetType } from '@/types/assignment';

const AidantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { profile, role, user } = useAuthStore();
  const { patients, fetchPatients } = usePatientStore();
  const { fetchActiveAidant, isLoading: assignmentLoading } = useAssignmentStore();
  const {
    selectedAidant: aidant,
    isLoading,
    fetchAidantById,
    assignments,
    fetchMyAssignments,
  } = useAidantCatalogStore();

  const { isFamily } = useTerminology();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isAlreadyAssigned, setIsAlreadyAssigned] = useState(false);
  const [isCheckingAssignment, setIsCheckingAssignment] = useState(true);

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  // ✅ Vérifier si l'aidant est déjà assigné à l'utilisateur ou à ses patients
  useEffect(() => {
    const checkAssignment = async () => {
      if (!id || !user || !isFamily) {
        setIsCheckingAssignment(false);
        return;
      }

      setIsCheckingAssignment(true);
      try {
        // ✅ 1. Vérifier si l'aidant est assigné au compte personnel de l'utilisateur
        // ✅ Utiliser le type correct 'personal_account'
        const personalResponse = await fetchActiveAidant(
          'personal_account' as TargetType, 
          user.id
        );
        const personalData = personalResponse as any;
        
        // ✅ Vérifier si l'aidant est assigné
        const isPersonalAssigned = 
          personalData?.aidant?.id === id || 
          personalData?.aidant_id === id ||
          personalData?.aidant_user_id === id ||
          (personalData?.target_type === 'personal_account' && 
           personalData?.target_id === user.id && 
           personalData?.aidant_user_id === id);
          
        if (isPersonalAssigned) {
          setIsAlreadyAssigned(true);
          setIsCheckingAssignment(false);
          return;
        }

        // ✅ 2. Vérifier si l'aidant est assigné à un des patients de l'utilisateur
        const patientIds = patients.map(p => p.id);
        for (const patientId of patientIds) {
          // ✅ Utiliser le type correct 'patient'
          const patientResponse = await fetchActiveAidant(
            'patient' as TargetType, 
            patientId, 
            user.id
          );
          const patientData = patientResponse as any;
          
          const isPatientAssigned = 
            patientData?.aidant?.id === id || 
            patientData?.aidant_id === id ||
            patientData?.aidant_user_id === id ||
            (patientData?.target_type === 'patient' && 
             patientData?.target_id === patientId && 
             patientData?.aidant_user_id === id);
            
          if (isPatientAssigned) {
            setIsAlreadyAssigned(true);
            setIsCheckingAssignment(false);
            return;
          }
        }

        // ✅ 3. Vérifier via les assignations du store (legacy)
        const isAssignedInStore = assignments.some(
          (a) => a.family_id === user.id && a.relationship !== 'cancelled'
        );
        if (isAssignedInStore) {
          setIsAlreadyAssigned(true);
          setIsCheckingAssignment(false);
          return;
        }

        setIsAlreadyAssigned(false);
      } catch (error) {
        console.error('❌ Erreur vérification assignation:', error);
        setIsAlreadyAssigned(false);
      } finally {
        setIsCheckingAssignment(false);
      }
    };

    checkAssignment();
  }, [id, user, patients, isFamily, assignments, fetchActiveAidant]);

  useEffect(() => {
    if (id) {
      fetchAidantById(id);
      if (isFamily) {
        fetchPatients();
        fetchMyAssignments();
      }
    }
  }, [id, isFamily, fetchAidantById, fetchPatients, fetchMyAssignments]);

  const status = (() => {
    if (!aidant?.is_available) return { label: 'Indisponible', color: 'text-red-500', bg: 'bg-red-50' };
    if ((aidant.active_assignments || 0) >= (aidant.max_assignments || 4))
      return { label: 'Complet', color: 'text-orange-500', bg: 'bg-orange-50' };
    return { label: 'Disponible', color: 'text-green-500', bg: 'bg-green-50' };
  })();

  if (isLoading || isCheckingAssignment) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner size="lg" text={isCheckingAssignment ? 'Vérification...' : 'Chargement...'} />
      </div>
    );
  }

  if (!aidant) return null;

  const canAssign = isFamily && !isAlreadyAssigned && aidant.is_available && patients.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 space-y-6">

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/app/aidants')}
          className="p-2 rounded-xl hover:bg-gray-100"
        >
          <ArrowLeft size={22} />
        </button>

        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate" style={{ color: colors.text }}>
            Profil de l’aidant
          </h1>
          <p className="text-sm truncate text-gray-500">
            {aidant.user?.full_name}
          </p>
        </div>
      </div>

      {/* CARD */}
      <div className="bg-white rounded-2xl border p-4 sm:p-6 space-y-4">

        {/* TOP */}
        <div className="flex gap-4 flex-col sm:flex-row">

          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0 mx-auto sm:mx-0"
            style={{ background: colors.primary }}
          >
            {aidant.user?.full_name?.charAt(0)}
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold truncate">
                  {aidant.user?.full_name}
                </h2>

                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    {aidant.avg_rating || 0}
                  </span>

                  <span className="flex items-center gap-1">
                    <Briefcase size={12} />
                    {aidant.total_missions || 0}
                  </span>

                  {/* ✅ Afficher si déjà assigné */}
                  {isAlreadyAssigned && (
                    <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <UserCheck size={12} />
                      Déjà assigné
                    </span>
                  )}
                </div>
              </div>

              {/* STATUS */}
              <span className={`text-xs px-2 py-1 rounded-full ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>

            {/* INFOS */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500">

              <div className="flex items-center gap-1 truncate">
                <MapPin size={12} />
                {aidant.zones?.slice(0, 2).join(', ') || '—'}
              </div>

              <div className="flex items-center gap-1">
                <Clock size={12} />
                {aidant.average_response_time || '~5'} min
              </div>

              <div className="flex items-center gap-1">
                <Award size={12} />
                {aidant.experience_years || 0} ans
              </div>

              <div className="flex items-center gap-1">
                <CheckCircle size={12} />
                {aidant.active_assignments}/{aidant.max_assignments}
              </div>

            </div>
          </div>
        </div>

        {/* BIO */}
        {aidant.bio && (
          <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 italic">
            "{aidant.bio}"
          </div>
        )}

        {/* ✅ MESSAGE SI PAS DE PATIENTS */}
        {isFamily && patients.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-sm text-amber-700">
              ⚠️ Vous n'avez pas encore de proche enregistré.
            </p>
            <button
              onClick={() => navigate('/app/patients')}
              className="mt-1 text-xs font-medium text-amber-800 hover:underline"
            >
              Ajouter un proche
            </button>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">

          <button
            onClick={() => window.open(`mailto:${aidant.user?.email}`)}
            className="w-full py-2 rounded-lg border text-sm"
          >
            Contacter
          </button>

          {canAssign ? (
            <button
              onClick={() => setShowAssignModal(true)}
              className="w-full py-2 rounded-lg text-white text-sm flex items-center justify-center gap-2"
              style={{ background: colors.primary }}
            >
              <UserPlus size={16} />
              Choisir cet aidant
            </button>
          ) : isAlreadyAssigned ? (
            <button
              className="w-full py-2 rounded-lg bg-green-50 text-green-600 text-sm flex items-center justify-center gap-2 cursor-default"
            >
              <UserCheck size={16} />
              Déjà assigné
            </button>
          ) : !aidant.is_available ? (
            <button
              className="w-full py-2 rounded-lg bg-gray-100 text-gray-400 text-sm flex items-center justify-center gap-2 cursor-default"
            >
              <UserX size={16} />
              Indisponible
            </button>
          ) : (
            <button
              className="w-full py-2 rounded-lg bg-gray-100 text-gray-400 text-sm flex items-center justify-center gap-2 cursor-default"
            >
              <AlertCircle size={16} />
              Non disponible
            </button>
          )}

        </div>
      </div>

      {/* MODAL */}
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
            setIsAlreadyAssigned(true);
            toast.success('Aidant assigné avec succès !');
          }}
          colors={colors}
        />
      )}

    </div>
  );
};

export default AidantDetailPage;
