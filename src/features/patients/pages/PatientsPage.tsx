// 📁 src/features/patients/pages/PatientsPage.tsx
 
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  UserPlus,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { useAssignmentStore } from '@/stores/assignmentStore';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useTerminology } from '@/hooks/useTerminology';
import { Illustration } from '@/components/ui/Illustration';
import { PatientCard } from '@/components/patients/PatientCard';
import { PatientModal } from '../components/PatientModal';
import { useRefreshableData } from '@/hooks/useRefreshableData';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const PatientsPage = () => {
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();
  const { fetchAssignments, assignments } = useAssignmentStore();

  const {
    singular,
    add,
    list,
    empty,
    emptyAction,
    getCountLabel,
    isFamily,
    isAidant,
  } = useTerminology();

  const { 
    patients, 
    isLoading, 
    fetchPatients, 
    deletePatient, 
    canManagePatients, 
    syncAidantPatients,
  } = usePatientStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isSyncing, setIsSyncing] = useState(false);

  const colors = getThemeColors(getThemeByRole(role as any, profile?.patient_category as any));
  const canManage = canManagePatients();

  // ✅ UTILISER le hook de rafraîchissement
  useRefreshableData({
    onRefresh: async () => {
      if (isAidant) {
        await syncAidantPatients();
      } else {
        await fetchPatients(true);
      }
      await fetchAssignments();
    },
    onError: () => toast.error('Erreur lors du rafraîchissement des patients'),
  });

  // ✅ CHARGEMENT INITIAL + SYNC POUR AIDANT
  useEffect(() => {
    const loadPatients = async () => {
      if (isAidant) {
        await syncAidantPatients();
      } else {
        await fetchPatients();
      }
      await fetchAssignments();
    };
    loadPatients();
  }, [role, user?.id]);

  // ✅ RECHARGE QUAND LE RÔLE CHANGE
  useEffect(() => {
    if (isAidant) {
      syncAidantPatients();
      fetchAssignments();
    }
  }, [isAidant]);

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
    if (!canManage) {
      toast.error('Vous n\'avez pas les droits pour supprimer un patient');
      return;
    }

    if (!window.confirm(`Voulez-vous vraiment supprimer ce ${singular} ?`)) return;

    try {
      await deletePatient(id);
      toast.success(`${singular.charAt(0).toUpperCase() + singular.slice(1)} supprimé`);
      if (isAidant) {
        await syncAidantPatients();
      } else {
        await fetchPatients(true);
      }
      await fetchAssignments();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || `Erreur lors de la suppression`);
    }
  };

  const handleEdit = (patient: any) => {
    if (!canManage) {
      toast.error('Vous n\'avez pas les droits pour modifier un patient');
      return;
    }
    setSelectedPatient(patient);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    if (!canManage) {
      toast.error('Vous n\'avez pas les droits pour ajouter un patient');
      return;
    }
    setSelectedPatient(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    if (isAidant) {
      syncAidantPatients();
    } else {
      fetchPatients(true);
    }
    fetchAssignments();
    setIsModalOpen(false);
    toast.success(
      modalMode === 'create'
        ? `${singular.charAt(0).toUpperCase() + singular.slice(1)} ajouté`
        : 'Informations mises à jour'
    );
  };

  // ✅ SYNCHRONISATION MANUELLE - NOUVEAU SYSTÈME
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // ✅ 1. Récupérer l'aidant
      const { data: aidant, error: aidantError } = await supabase
        .from('aidants')
        .select('id, user_id, is_verified, status')
        .eq('user_id', user?.id)
        .single();
      
      if (aidantError || !aidant) {
        toast.error('Aidant non trouvé');
        setIsSyncing(false);
        return;
      }

      // ✅ 2. Récupérer les assignations actives via le nouveau système
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('aidant_assignments')
        .select('target_id, target_type')
        .eq('aidant_user_id', aidant.user_id)
        .eq('status', 'active')
        .eq('target_type', 'patient');

      if (assignmentsError) {
        console.error('❌ Erreur récupération assignations:', assignmentsError);
      }

      const patientIds = assignmentsData?.map(a => a.target_id).filter(Boolean) || [];

      // ✅ 3. Fallback: récupérer via patient_family_links (compatibilité)
      if (patientIds.length === 0) {
        const { data: links, error: linksError } = await supabase
          .from('patient_family_links')
          .select('patient_id')
          .eq('family_id', aidant.user_id);

        if (!linksError && links) {
          const ids = links.map(l => l.patient_id).filter(Boolean);
          patientIds.push(...ids);
        }
      }

      if (patientIds.length === 0) {
        toast('Aucun patient assigné', { icon: 'ℹ️' });
        usePatientStore.setState({ patients: [] });
        setIsSyncing(false);
        return;
      }

      // ✅ 4. Récupérer les patients
      const { data: directPatients, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .in('id', patientIds);
      
      if (patientsError) {
        console.error('❌ Erreur récupération patients:', patientsError);
        toast.error('Erreur lors de la récupération des patients');
        setIsSyncing(false);
        return;
      }

      if (directPatients && directPatients.length > 0) {
        usePatientStore.setState({ patients: directPatients });
        toast.success(`✅ ${directPatients.length} patient(s) synchronisé(s)`);
      } else {
        toast('Aucun patient trouvé', { icon: 'ℹ️' });
        usePatientStore.setState({ patients: [] });
      }

      // ✅ 5. Rafraîchir les assignations
      await fetchAssignments();

    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4 p-3 sm:p-4">
        <div className="h-16 bg-white rounded-2xl animate-pulse" />
        <div className="h-10 bg-white rounded-2xl animate-pulse w-2/3" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 pb-20 px-4 sm:px-6">
      
      {/* ============================================================
      EN-TÊTE COMPACT ET CHALEUREUX
      ============================================================ */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-xl font-black text-gray-800" style={{ color: colors.text }}>
            {list}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {getCountLabel(patients.length)}
            {isAidant && <span className="text-amber-600 font-semibold"> • Patients assignés uniquement</span>}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          {/* TOUCHE DE RAFRAÎCHISSEMENT RAPIDE */}
          <button
            onClick={() => {
              if (isAidant) {
                syncAidantPatients();
              } else {
                fetchPatients(true);
              }
              fetchAssignments();
              toast.success('Patients actualisés');
            }}
            disabled={isLoading || isSyncing}
            className="p-2 rounded-xl border hover:bg-gray-50 transition text-gray-500 shrink-0"
            style={{ borderColor: colors.border }}
            title="Actualiser la liste"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {canManage && (
            <button
              onClick={handleAdd}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shrink-0 flex items-center gap-1.5 shadow-sm"
              style={{ background: colors.primary }}
            >
              <Plus size={13} />
              {add}
            </button>
          )}

          {isAidant && !canManage && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-100">
              <ShieldAlert size={13} className="text-amber-500" />
              <span className="text-[10px] font-bold text-amber-700">Lecture seule</span>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
      RECHERCHE + FILTRE COMPACT
      ============================================================ */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5 flex flex-col sm:flex-row gap-2.5 w-full min-w-0">
        <div className="relative flex-1 min-w-0 w-full">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom ou adresse..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none transition focus:ring-1 focus:ring-offset-0 min-w-0"
            style={{ borderColor: colors.border, color: colors.text }}
          />
        </div>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border bg-gray-50 outline-none focus:ring-2 shrink-0 sm:w-44"
          style={{ borderColor: colors.border, color: colors.text }}
        >
          <option value="all">Toutes catégories</option>
          <option value="senior">Seniors</option>
          <option value="maman_bebe">Maman & Bébé</option>
        </select>
      </section>

      {/* ============================================================
      SYNCHRONISATION DIRECTE POUR LES AIDANTS
      ============================================================ */}
      {isAidant && (
        <div className="bg-amber-50/40 rounded-2xl p-4 border border-amber-100/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-900">Synchronisation des assignations</p>
            <p className="text-[10px] text-amber-600 mt-0.5">
              Si vous ne voyez pas vos patients, synchronisez vos autorisations d'accès.
            </p>
          </div>
          
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm border bg-white"
            style={{ borderColor: colors.primary + '20', color: colors.primary }}
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Synchronisation...' : 'Synchroniser'}
          </button>
        </div>
      )}

      {/* ============================================================
      LISTE DE PATIENTS
      ============================================================ */}
      {filteredPatients.length > 0 ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full min-w-0">
          {filteredPatients.map((patient: any) => (
            <div key={patient.id} className="min-w-0 max-w-full overflow-hidden">
              <PatientCard
                patient={patient}
                onClick={() => navigate(`/app/patients/${patient.id}`)}
                onEdit={canManage ? () => handleEdit(patient) : undefined}
                onDelete={canManage ? () => handleDelete(patient.id) : undefined}
                showActions={canManage}
                compact
              />
            </div>
          ))}
        </section>
      ) : (
        /* ÉCRAN VIDE SIMPLIFIÉ */
        <section className="bg-white rounded-2xl py-12 px-4 text-center border border-black/5">
          <Illustration 
            type={searchTerm || categoryFilter !== 'all' ? 'search' : 'users'} 
            size="md" 
            className="mx-auto mb-3 opacity-30"
          />

          <h3 className="text-sm font-bold text-gray-700">
            {searchTerm || categoryFilter !== 'all'
              ? 'Aucun résultat trouvé'
              : empty}
          </h3>

          <p className="text-xs text-gray-400 mt-0.5">
            {searchTerm || categoryFilter !== 'all'
              ? 'Essayez de modifier vos critères de recherche.'
              : emptyAction}
          </p>

          {!searchTerm && categoryFilter === 'all' && canManage && (
            <button
              onClick={handleAdd}
              className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs"
              style={{ background: colors.primary }}
            >
              <UserPlus size={13} />
              {add}
            </button>
          )}
        </section>
      )}

      {/* ============================================================
      ACCÈS RAPIDE FLOUTÉ (MOBILE ONLY)
      ============================================================ */}
      {canManage && (
        <button
          onClick={handleAdd}
          className="sm:hidden fixed bottom-20 right-4 z-40 w-11 h-11 rounded-2xl text-white shadow-lg flex items-center justify-center active:scale-95 transition"
          style={{ background: colors.primary }}
          aria-label={add}
        >
          <Plus size={20} />
        </button>
      )}

      {/* MODAL PATIENT */}
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
