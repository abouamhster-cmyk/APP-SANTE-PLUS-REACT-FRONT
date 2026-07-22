// 📁 src/features/patients/pages/PatientsPage.tsx
// ✅ PAGE BÉNÉFICIAIRES & ÉQUIPE : HUB 360° AVEC ŒIL DE CONSULTATION ET DOSSIERS INTERVENANTS

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, RefreshCw, Users, UserCheck, Home, Eye, Loader2,
  UserMinus, UserPlus, Shield, X, MapPin, Phone, Mail,
  AlertCircle, Briefcase, UserCog, Star, Calendar, FileText, Pill
} from 'lucide-react';

import { usePatientStore } from '@/stores/patientStore';
import { useAuthStore } from '@/stores/authStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { PatientCard } from '@/components/patients/PatientCard';
import { PatientModal } from '../components/PatientModal';
import { supabase } from '@/lib/supabase';
import { assignmentAPI } from '@/lib/api';
import { formatDate, cn } from '@/utils/helpers';
import { Modal } from '@/components/ui/Modal';
import { AssignAidantModal } from '@/features/aidants/components/AssignAidantModal';
import toast from 'react-hot-toast';

// ============================================================
// TYPES
// ============================================================

interface AidantStaff {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  specialties?: string[];
  zones?: string[];
  experience_years?: number;
  rating?: number;
  activeAssignmentsCount?: number;
  assignedTargets?: Array<{ name: string; type: string }>;
}

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'coordinator';
  created_at: string;
}

interface AssignmentItem {
  id: string;
  type: 'account' | 'patient';
  familyId: string;
  familyName: string;
  targetId: string;
  targetName: string;
  targetType: 'personal_account' | 'patient' | 'family';
  category: string;
  isPersonal: boolean;
  assignedAidantUserId?: string;
  assignedAidantName?: string;
  assignmentType?: string;
  assignmentId?: string;
  rawDetails?: any;
}

const getCategoryColor = (category: string): string => {
  if (category === 'maman_bebe') return '#db4a6d';
  if (category === 'senior') return '#10b981';
  if (category === 'personal') return '#3b82f6';
  return '#9ca3af';
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export const PatientsPage = () => {
  const navigate = useNavigate();
  const { profile, role, user } = useAuthStore();
  const brand = useBranding();
  const colors = brand.colors;

  const { singular, add, empty, emptyAction, isAidant, isAdminOrCoordinator } = useTerminology();
  const { patients, isLoading: patientsLoading, fetchPatients, deletePatient, canManagePatients, syncAidantPatients } = usePatientStore();

  const [familyAccounts, setFamilyAccounts] = useState<any[]>([]);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, any>>({});
  const [aidantsStaffList, setAidantsStaffList] = useState<AidantStaff[]>([]);
  const [adminStaffList, setAdminStaffList] = useState<StaffMember[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Modal d'assignation
  const [showRowAssignModal, setShowRowAssignModal] = useState(false);
  const [selectedItemToAssign, setSelectedItemToAssign] = useState<AssignmentItem | null>(null);

  // Modal de consultation de dossier (ŒIL)
  const [showDetailDossierModal, setShowDetailDossierModal] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<{ type: 'beneficiary' | 'aidant' | 'staff'; data: any } | null>(null);

  const canManage = canManagePatients();
  const isAdmin = isAdminOrCoordinator;

  const fetchAllData = useCallback(async () => {
    if (!isAdmin) {
      await fetchPatients(true);
      return;
    }

    setIsLoadingData(true);
    try {
      await fetchPatients(true);
      
      // 1. Charger tous les foyers/familles
      const { data: familiesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, address, patient_category, created_at')
        .eq('role', 'family')
        .order('full_name');

      setFamilyAccounts(familiesData || []);

      // 2. Charger les patients/proches
      const { data: patientsData } = await supabase
        .from('patients')
        .select('*, patient_family_links(family_id)');

      const formattedPatients = (patientsData || []).map((p: any) => ({
        ...p,
        family_id: p.patient_family_links?.[0]?.family_id || '',
      }));
      setAllPatients(formattedPatients);

      // 3. Charger les assignations actives
      const response = await assignmentAPI.adminGetAll();
      const assignmentsData = response.data?.data || [];
      const mapAssign: Record<string, any> = {};
      
      assignmentsData?.forEach((a: any) => {
        if (a.status === 'active') {
          const key = `${a.target_type}_${a.target_id}`;
          mapAssign[key] = a;
        }
      });
      setAssignmentsMap(mapAssign);

      // 4. Charger la liste des Aidants (Employés) avec leurs assignations actives
      const { data: aidantsDb } = await supabase
        .from('aidants')
        .select('*, user:profiles(id, full_name, email, phone, role)')
        .eq('status', 'approved');

      const formattedAidants: AidantStaff[] = await Promise.all(
        (aidantsDb || []).map(async (a: any) => {
          // Récupérer les bénéficiaires qu'il sert
          const { data: activeAss } = await supabase
            .from('aidant_assignments_view')
            .select('target_type, patient_first_name, patient_last_name, profile_name')
            .eq('aidant_user_id', a.user_id)
            .eq('status', 'active');

          const assignedTargets = (activeAss || []).map((ass: any) => ({
            name: ass.target_type === 'patient' 
              ? `${ass.patient_first_name || ''} ${ass.patient_last_name || ''}`.trim()
              : ass.profile_name || 'Compte personnel',
            type: ass.target_type === 'patient' ? 'Proche' : 'Compte Personnel',
          }));

          return {
            id: a.id,
            user_id: a.user_id,
            full_name: a.user?.full_name || 'Aidant',
            email: a.user?.email || '',
            phone: a.user?.phone || null,
            role: 'aidant',
            specialties: a.specialties || [],
            zones: a.zones || [],
            experience_years: a.experience_years || 0,
            rating: a.rating || 0,
            activeAssignmentsCount: assignedTargets.length,
            assignedTargets,
          };
        })
      );
      setAidantsStaffList(formattedAidants);

      // 5. Charger les Admins & Coordinateurs
      const { data: staffDb } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, created_at')
        .in('role', ['admin', 'coordinator'])
        .order('full_name');

      setAdminStaffList((staffDb as StaffMember[]) || []);

    } catch (error) {
      console.error('❌ Erreur fetchAllData:', error);
      toast.error('Erreur lors du chargement des dossiers');
    } finally {
      setIsLoadingData(false);
    }
  }, [isAdmin, fetchPatients]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Regroupement des bénéficiaires par Foyer
  const assignmentItems = useMemo(() => {
    if (!isAdmin) return [];

    return familyAccounts.flatMap((family) => {
      const accountKey = `personal_account_${family.id}`;
      const accountAssignment = assignmentsMap[accountKey] || assignmentsMap[`personal_${family.id}`];

      let accountAidantName = '';
      if (accountAssignment?.aidant_user_id) {
        const aidant = aidantsStaffList.find((a) => a.user_id === accountAssignment.aidant_user_id);
        accountAidantName = aidant?.full_name || 'Aidant assigné';
      }

      const accountItem: AssignmentItem = {
        id: accountKey,
        type: 'account',
        familyId: family.id,
        familyName: family.full_name,
        targetId: family.id,
        targetName: family.full_name,
        targetType: 'personal_account',
        category: 'personal',
        isPersonal: true,
        assignedAidantUserId: accountAssignment?.aidant_user_id,
        assignedAidantName: accountAidantName,
        assignmentType: accountAssignment?.assignment_type,
        assignmentId: accountAssignment?.id,
        rawDetails: family,
      };

      const familyPatients = allPatients.filter((p) => p.family_id === family.id);
      const patientItems: AssignmentItem[] = familyPatients.map((p) => {
        const key = `patient_${p.id}`;
        const a = assignmentsMap[key];

        let aidantName = '';
        if (a?.aidant_user_id) {
          const aidant = aidantsStaffList.find((ad) => ad.user_id === a.aidant_user_id);
          aidantName = aidant?.full_name || 'Aidant assigné';
        }

        return {
          id: key,
          type: 'patient' as const,
          familyId: family.id,
          familyName: family.full_name,
          targetId: p.id,
          targetName: `${p.first_name} ${p.last_name}`,
          targetType: 'patient' as const,
          category: p.category,
          isPersonal: false,
          assignedAidantUserId: a?.aidant_user_id,
          assignedAidantName: aidantName,
          assignmentType: a?.assignment_type,
          assignmentId: a?.id,
          rawDetails: p,
        };
      });

      return [accountItem, ...patientItems];
    });
  }, [isAdmin, familyAccounts, allPatients, assignmentsMap, aidantsStaffList]);

  const filteredItems = useMemo(() => {
    if (!isAdmin) return [];
    let items = assignmentItems;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(
        (item) =>
          item.targetName.toLowerCase().includes(term) ||
          item.familyName.toLowerCase().includes(term) ||
          (item.assignedAidantName && item.assignedAidantName.toLowerCase().includes(term))
      );
    }

    if (categoryFilter !== 'all') {
      items = items.filter((item) => {
        if (categoryFilter === 'personal') return item.isPersonal;
        return item.category === categoryFilter;
      });
    }

    return items;
  }, [isAdmin, assignmentItems, searchTerm, categoryFilter]);

  const grouped = useMemo(() => {
    if (!isAdmin) return {};
    return filteredItems.reduce((acc: any, item) => {
      acc[item.familyId] = acc[item.familyId] || {
        name: item.familyName,
        items: [],
      };
      acc[item.familyId].items.push(item);
      return acc;
    }, {});
  }, [isAdmin, filteredItems]);

  const handleRevoke = async (item: AssignmentItem) => {
    if (!item.assignmentId) return;
    if (!window.confirm(`Retirer l'assignation de ${item.targetName} ?`)) return;

    setProcessingId(item.id);
    setIsProcessing(true);
    try {
      await assignmentAPI.revoke(item.assignmentId, `Révocation de l'intervenant`);
      toast.success(`Intervenant retiré de ${item.targetName}`);
      await fetchAllData();
    } catch (error: any) {
      toast.error('Erreur lors du retrait de l\'aidant');
    } finally {
      setIsProcessing(false);
      setProcessingId(null);
    }
  };

  const handleViewDossier = (type: 'beneficiary' | 'aidant' | 'staff', data: any) => {
    setSelectedDossier({ type, data });
    setShowDetailDossierModal(true);
  };

  const isLoading = patientsLoading || isLoadingData;

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-28 bg-white rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-44 bg-white rounded-3xl" />
          <div className="h-44 bg-white rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12 px-3 sm:px-0">
      
      {/* HEADER */}
      <section className="bg-white rounded-3xl p-6 border shadow-sm flex justify-between items-center" style={{ borderColor: colors.primary + '15' }}>
        <div>
          <h1 className="text-xl font-black" style={{ color: colors.text }}>
            {isAdmin ? 'Gestion des Bénéficiaires & Équipe' : 'Mes proches'}
          </h1>
          <p className="text-xs text-gray-500 font-semibold mt-1">
            {isAdmin ? 'Consultation des dossiers complets et rattachements d\'intervenants' : 'Suivi de vos proches accompagnés'}
          </p>
        </div>
        <button onClick={fetchAllData} className="px-3.5 py-2 rounded-xl text-xs font-bold border bg-gray-50 hover:bg-gray-100 flex items-center gap-1.5">
          <RefreshCw size={14} className={isLoadingData ? 'animate-spin' : ''} /> Actualiser
        </button>
      </section>

      {/* RECHERCHE ET FILTRES */}
      <section className="bg-white rounded-2xl p-3 border shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, famille, aidant..."
            className="w-full h-11 pl-11 pr-4 rounded-xl border bg-gray-50 text-xs font-bold outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-11 px-4 rounded-xl border bg-gray-50 text-xs font-bold outline-none"
        >
          <option value="all">Toutes les catégories</option>
          <option value="senior">👴 Senior</option>
          <option value="maman_bebe">👶 Maman & Bébé</option>
          {isAdmin && <option value="personal">👤 Comptes personnels</option>}
        </select>
      </section>

      {/* SECTION 1 : BÉNÉFICIAIRES & FOYERS */}
      {isAdmin ? (
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 px-1">
            📁 Dossiers Bénéficiaires & Rattachements
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(grouped).map(([familyId, group]: any) => (
              <div key={familyId} className="bg-white rounded-3xl border shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Foyer Familial</span>
                    <h3 className="font-extrabold text-sm text-gray-800">{group.name}</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {group.items.length} dossier(s)
                  </span>
                </div>

                <div className="divide-y">
                  {group.items.map((item: AssignmentItem) => {
                    const isAssigned = !!item.assignedAidantUserId;
                    const categoryColor = getCategoryColor(item.category);

                    return (
                      <div key={item.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0" style={{ background: categoryColor + '15', color: categoryColor }}>
                            {item.targetName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate">{item.targetName}</p>
                            <p className="text-[10px] text-gray-400 font-semibold">{item.isPersonal ? 'Responsable Légal' : 'Proche'}</p>
                          </div>
                        </div>

                        {/* ✅ BOUTON ŒIL + BOUTON ATTRIRUBUTION */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleViewDossier('beneficiary', item.rawDetails)}
                            className="p-2 rounded-xl border bg-gray-50 hover:bg-gray-100 text-gray-600 transition"
                            title="Voir le dossier complet"
                          >
                            <Eye size={14} />
                          </button>

                          {isAssigned ? (
                            <button
                              onClick={() => handleRevoke(item)}
                              className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition"
                              title="Désassigner"
                            >
                              <UserMinus size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => { setSelectedItemToAssign(item); setShowRowAssignModal(true); }}
                              className="px-3 py-1.5 rounded-xl text-white text-[10px] font-extrabold shadow-sm"
                              style={{ background: colors.primary }}
                            >
                              Rattacher
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* VUE FAMILLE D'ORIGINE */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((patient: any) => (
            <PatientCard key={patient.id} patient={patient} onClick={() => navigate(`/app/patients/${patient.id}`)} compact />
          ))}
        </div>
      )}

      {/* SECTION 2 : ÉQUIPE & INTERVENANTS (AIDANTS, COORDINATEURS & ADMINS) */}
      {isAdmin && (
        <div className="space-y-4 pt-6 border-t">
          <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 px-1">
            🛡️ Équipe & Intervenants (Employés & Staff)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Blocs Aidants */}
            <div className="bg-white rounded-3xl border shadow-sm p-5 space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-black text-gray-800 flex items-center gap-1.5"><Briefcase size={14} className="text-blue-500" /> Aidants qualifiés ({aidantsStaffList.length})</span>
              </div>
              <div className="divide-y max-h-60 overflow-y-auto">
                {aidantsStaffList.map((aidant) => (
                  <div key={aidant.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs">{aidant.full_name}</p>
                      <p className="text-[10px] text-gray-400">{aidant.activeAssignmentsCount} dossier(s) en charge</p>
                    </div>
                    {/* ✅ BOUTON ŒIL SEULEMENT (PAS DE RATTACHER) */}
                    <button onClick={() => handleViewDossier('aidant', aidant)} className="p-2 rounded-xl border bg-gray-50 hover:bg-gray-100 text-gray-600">
                      <Eye size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Blocs Admins & Coordinateurs */}
            <div className="bg-white rounded-3xl border shadow-sm p-5 space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-black text-gray-800 flex items-center gap-1.5"><UserCog size={14} className="text-emerald-500" /> Direction & Coordination ({adminStaffList.length})</span>
              </div>
              <div className="divide-y max-h-60 overflow-y-auto">
                {adminStaffList.map((staff) => (
                  <div key={staff.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs">{staff.full_name}</p>
                      <span className="text-[9px] font-extrabold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{staff.role}</span>
                    </div>
                    {/* ✅ BOUTON ŒIL SEULEMENT */}
                    <button onClick={() => handleViewDossier('staff', staff)} className="p-2 rounded-xl border bg-gray-50 hover:bg-gray-100 text-gray-600">
                      <Eye size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODALE CONSULTATION COMPLÈTE (Dossier 360°) */}
      {showDetailDossierModal && selectedDossier && (
        <DossierDetailModal
          dossier={selectedDossier}
          onClose={() => setShowDetailDossierModal(false)}
          colors={colors}
        />
      )}

      {/* MODALE D'ASSIGNATION */}
      {showRowAssignModal && selectedItemToAssign && (
        <AssignAidantModal
          isOpen={showRowAssignModal}
          onClose={() => setShowRowAssignModal(false)}
          targetType={selectedItemToAssign.targetType === 'personal_account' ? 'personal_account' : 'patient'}
          targetId={selectedItemToAssign.targetId}
          targetName={selectedItemToAssign.targetName}
          onSuccess={fetchAllData}
          colors={colors}
          isAdmin={true}
        />
      )}
    </div>
  );
};

// ============================================================
// MODALE CONSULTATION DOSSIER 360°
// ============================================================
const DossierDetailModal = ({ dossier, onClose }: { dossier: any; onClose: () => void; colors: any }) => {
  const { type, data } = dossier;

  return (
    <Modal isOpen={true} onClose={onClose} title={`📋 Dossier : ${data.full_name || data.first_name || 'Fiche'}`} maxWidth="md">
      <div className="space-y-4 text-xs pt-1">
        {/* CAS BÉNÉFICIAIRE */}
        {type === 'beneficiary' && (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
              <p className="font-bold text-gray-400 text-[10px] uppercase">Nom & Prénom</p>
              <p className="text-sm font-black">{data.first_name || data.full_name} {data.last_name !== '(Compte Personnel)' ? data.last_name : ''}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-gray-50 rounded-2xl"><p className="text-gray-400 font-bold text-[9px] uppercase">Téléphone</p><p className="font-bold">{data.phone || 'Non renseigné'}</p></div>
              <div className="p-3 bg-gray-50 rounded-2xl"><p className="text-gray-400 font-bold text-[9px] uppercase">Sexe / Âge</p><p className="font-bold">{data.age ? `${data.age} ans` : '-'} • {data.gender || '-'}</p></div>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl"><p className="text-gray-400 font-bold text-[9px] uppercase">Adresse</p><p className="font-bold">{data.address || 'Non spécifiée'}</p></div>
            {data.allergies && <div className="p-3 bg-red-50 text-red-700 rounded-2xl"><p className="font-bold">⚠️ Allergies : {data.allergies}</p></div>}
            {data.treatments && <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl"><p className="font-bold">💊 Traitements : {data.treatments}</p></div>}
          </div>
        )}

        {/* CAS AIDANT */}
        {type === 'aidant' && (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-2xl"><p className="text-gray-400 text-[9px] font-bold uppercase">Aidant Référent</p><p className="text-sm font-black">{data.full_name}</p><p className="text-gray-500">{data.email} • {data.phone || 'Sans tel'}</p></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-gray-50 rounded-2xl"><p className="text-gray-400 text-[9px] font-bold uppercase">Expérience</p><p className="font-bold">{data.experience_years} ans</p></div>
              <div className="p-3 bg-gray-50 rounded-2xl"><p className="text-gray-400 text-[9px] font-bold uppercase">Évaluation</p><p className="font-bold text-amber-500">⭐ {data.rating || 5}/5</p></div>
            </div>
            <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="font-bold text-blue-900 mb-1.5">👥 Bénéficiaires pris en charge ({data.activeAssignmentsCount}) :</p>
              {data.assignedTargets?.length > 0 ? (
                <div className="space-y-1">
                  {data.assignedTargets.map((t: any, i: number) => (
                    <p key={i} className="text-blue-800 font-semibold">• {t.name} ({t.type})</p>
                  ))}
                </div>
              ) : (
                <p className="text-blue-500 italic">Aucune assignation active actuellement.</p>
              )}
            </div>
          </div>
        )}

        {/* CAS STAFF / ADMIN / COORD */}
        {type === 'staff' && (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-2xl"><p className="text-gray-400 text-[9px] font-bold uppercase">Profil Administrateur</p><p className="text-sm font-black">{data.full_name}</p><p className="text-gray-500">{data.email}</p></div>
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl"><p className="font-bold">Rôle : {data.role.toUpperCase()}</p></div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PatientsPage;
