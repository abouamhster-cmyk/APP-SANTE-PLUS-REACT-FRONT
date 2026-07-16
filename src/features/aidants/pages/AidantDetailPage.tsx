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
  Phone,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { usePatientStore } from '@/stores/patientStore';
import { useAssignmentStore } from '@/stores/assignmentStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import AssignAidantModal from '../components/AssignAidantModal';
import { TargetType } from '@/types/assignment';
import toast from 'react-hot-toast';

const AidantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { profile, role, user } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;
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

  // Vérifier si l'aidant est déjà assigné à l'utilisateur ou à ses proches
  useEffect(() => {
    const checkAssignment = async () => {
      if (!id || !user || !isFamily) {
        setIsCheckingAssignment(false);
        return;
      }

      setIsCheckingAssignment(true);
      try {
        // 1. Vérifier si l'aidant est assigné au compte personnel de l'utilisateur
        const personalResponse = await fetchActiveAidant(
          'personal_account' as TargetType, 
          user.id
        );
        const personalData = personalResponse as any;
        
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

        // 2. Vérifier si l'aidant est assigné à un des proches de l'utilisateur
        const patientIds = patients.map(p => p.id);
        for (const patientId of patientIds) {
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

        // 3. Vérifier via les assignations du store (legacy)
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
    if (!aidant?.is_available) return { label: 'Indisponible', color: 'text-red-500 border-red-100 bg-red-50/50' };
    if ((aidant.active_assignments || 0) >= (aidant.max_assignments || 4))
      return { label: 'Complet', color: 'text-orange-500 border-orange-100 bg-orange-50/50' };
    return { label: 'Disponible', color: 'text-green-600 border-green-100 bg-green-50/50' };
  })();

  if (isLoading || isCheckingAssignment) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <LoadingSpinner size="lg" text={isCheckingAssignment ? 'Vérification...' : 'Chargement...'} />
      </div>
    );
  }

  if (!aidant) return null;

  const canAssign = isFamily && !isAlreadyAssigned && aidant.is_available;
  
  // ============================================================
  // 💡 DÉCODEUR HYBRIDE D'OBJETS REJOINTS (Garantit la lecture si user est un tableau)
  // ============================================================
  const aidantUser = Array.isArray(aidant.user) ? aidant.user[0] : aidant.user;
  
  const name = aidantUser?.full_name || aidant.full_name || 'Aidant';
  const email = aidantUser?.email || aidant.email;
  const phone = aidantUser?.phone || aidant.phone;
  const avatarUrl = aidantUser?.avatar_url || aidant.avatar_url;
  const aidantLanguages = (aidant as any).languages as string[] | undefined;

  // 💡 HELPER DE CONSTRUCTION D'URLS PUBLIQUES SUPABASE POUR LES AVATARS RELATIFS
  const getPublicAvatarUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const supabaseUrl = 'https://mrsrogkjthtnppecndyc.supabase.co';
    const cleanPath = url.replace(/^\/+/, '');
    if (cleanPath.startsWith('avatars/')) {
      return `${supabaseUrl}/storage/v1/object/public/${cleanPath}`;
    }
    return `${supabaseUrl}/storage/v1/object/public/avatars/${cleanPath}`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 space-y-5">

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/app/aidants')}
          className="p-1.5 rounded-xl hover:bg-gray-100 transition"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold truncate" style={{ color: colors.text }}>
            Profil de l’aidant
          </h1>
          <p className="text-xs truncate font-semibold" style={{ color: colors.textLight }}>
            {name}
          </p>
        </div>
      </div>

      {/* CARTE PRINCIPALE */}
      <div className="bg-white rounded-3xl border p-5 sm:p-6 space-y-5 shadow-sm" style={{ borderColor: colors.primary + '15' }}>

        {/* SECTION PROFILE TOP */}
        <div className="flex gap-4 flex-col sm:flex-row items-center sm:items-start text-center sm:text-left">

          {/* Photo de profil réelle ou initiales en fallback */}
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img
                src={getPublicAvatarUrl(avatarUrl)}
                alt={name}
                className="w-20 h-20 rounded-2xl object-cover border border-gray-100 shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const fallback = document.getElementById('avatar-fallback');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
            ) : null}
            <div
              id="avatar-fallback"
              className={`avatar-fallback w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-sm ${avatarUrl ? 'hidden' : ''}`}
              style={{ background: colors.primary }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            {aidant.is_verified && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-green-500 text-white flex items-center justify-center border border-white shadow-md" title="Compte vérifié">
                ✓
              </span>
            )}
          </div>

          {/* Informations d'identité */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-black truncate" style={{ color: colors.text }}>
                  {name}
                </h2>

                <div className="flex flex-wrap justify-center sm:justify-start gap-2 text-xs mt-1 font-semibold" style={{ color: colors.textLight }}>
                  <span className="flex items-center gap-1">
                    <Star size={13} className="text-yellow-400 fill-yellow-400" />
                    {aidant.avg_rating?.toFixed(1) || aidant.rating?.toFixed(1) || '0.0'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Briefcase size={13} />
                    {aidant.total_missions || 0} missions
                  </span>
                  {isAlreadyAssigned && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 font-bold">
                        📌 Mon aidant
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* STATUT DISPO */}
              <span className={`text-xs px-2 py-1 rounded-full border self-center sm:self-start ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>

            {/* MÉTADONNÉES DE SECOURS */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs font-semibold" style={{ color: colors.textLight }}>
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin size={13} className="text-gray-400 shrink-0" />
                <span className="truncate">{aidant.zones?.slice(0, 2).join(', ') || '—'}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-gray-400 shrink-0" />
                <span>Réponse : {aidant.average_response_time || '~5'} min</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Award size={13} className="text-gray-400 shrink-0" />
                <span>Expérience : {aidant.experience_years || 0} ans</span>
              </div>

              <div className="flex items-center gap-1.5">
                <CheckCircle size={13} className="text-gray-400 shrink-0" />
                <span>Quota : {aidant.active_assignments || 0}/{aidant.max_assignments || 4} missions</span>
              </div>
            </div>
          </div>
        </div>

        {/* BIO / PRESENTATION */}
        {aidant.bio && (
          <div className="text-sm bg-gray-50 rounded-xl p-3 italic" style={{ color: colors.text + 'A5', borderColor: colors.primary + '10' }}>
            "{aidant.bio}"
          </div>
        )}

        {/* SPÉCIALITÉS ET LANGUES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: colors.primary + '10' }}>
          {/* Spécialités */}
          {aidant.specialties && aidant.specialties.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400">Spécialités d’aide</h4>
              <div className="flex flex-wrap gap-1.5">
                {aidant.specialties.map((spec: string) => (
                  <span
                    key={spec}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: colors.primary + '10', color: colors.primary }}
                  >
                    {spec === 'maman_bebe' ? '👶 Maman & Bébé' :
                     spec === 'senior' ? '👴 Senior' :
                     spec === 'accompagnement' ? '🤝 Accompagnement' : spec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Langues parlées */}
          {aidantLanguages && aidantLanguages.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400">Langues parlées</h4>
              <div className="flex flex-wrap gap-1.5">
                {aidantLanguages.map((lang: string) => (
                  <span
                    key={lang}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600"
                  >
                    🗣️ {lang}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BANDEAU SI PAS DE PROCHE ENREGISTRÉ */}
        {isFamily && patients.length === 0 && (
          <div className="p-3.5 rounded-2xl text-center border" style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)', borderColor: '#F59E0B20' }}>
            <p className="text-xs font-semibold text-amber-800">
              ⚠️ Aucun proche enregistré. Vous pouvez l'assigner à votre propre compte.
            </p>
            <button
              onClick={() => navigate('/app/patients')}
              className="mt-1.5 text-xs font-bold hover:underline text-amber-700"
            >
              Ajouter un proche
            </button>
          </div>
        )}

        {/* ACTIONS / CONTACTS DIRECTS */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t" style={{ borderColor: colors.primary + '10' }}>
          <div className="flex flex-1 gap-2">
            {/* Bouton Téléphone */}
            {phone && (
              <button
                onClick={() => window.open(`tel:${phone}`)}
                className="flex-1 h-10 rounded-xl border text-xs font-bold transition hover:bg-gray-50 flex items-center justify-center gap-1.5"
                style={{ borderColor: colors.primary + '20', color: colors.text }}
              >
                <Phone size={14} />
                Appeler
              </button>
            )}

            {/* Bouton Email */}
            {email && (
              <button
                onClick={() => window.open(`mailto:${email}`)}
                className="flex-1 h-10 rounded-xl border text-xs font-bold transition hover:bg-gray-50 flex items-center justify-center gap-1.5"
                style={{ borderColor: colors.primary + '20', color: colors.text }}
              >
                <Mail size={14} />
                Écrire
              </button>
            )}
          </div>

          {canAssign ? (
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex-1 h-10 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
              style={{ background: colors.primary }}
            >
              <UserPlus size={15} />
              Choisir cet aidant
            </button>
          ) : isAlreadyAssigned ? (
            <button
              disabled
              className="flex-1 h-10 rounded-xl bg-green-50 text-green-600 border border-green-100 text-xs font-bold flex items-center justify-center gap-1.5 cursor-default"
            >
              <UserCheck size={15} />
              Déjà assigné
            </button>
          ) : !aidant.is_available ? (
            <button
              disabled
              className="flex-1 h-10 rounded-xl bg-gray-100 text-gray-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-default"
            >
              <UserX size={15} />
              Indisponible
            </button>
          ) : (
            <button
              disabled
              className="flex-1 h-10 rounded-xl bg-gray-100 text-gray-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-default"
            >
              <AlertCircle size={15} />
              Non disponible
            </button>
          )}

        </div>
      </div>

      {/* MODAL D'ASSIGNATION DIRECTE */}
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
