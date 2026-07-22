// 📁 src/features/patients/pages/PatientsPage.tsx
// ✅ DOSSIER ADMINISTRATIF 360° : REPRISE ÉXHAUSTIVE DE TOUS LES CHAMPS DU REGISTER PAGE

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, RefreshCw, Users, UserCheck, Eye, Loader2,
  UserMinus, UserPlus, MapPin, Phone, Mail,
  AlertCircle, Briefcase, UserCog, Calendar, FileText, Pill, CreditCard, Shield, HeartHandshake, Award
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
  created_at?: string;
  birth_date?: string;
  address?: string;
  bio?: string;
  total_missions?: number;
}

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'coordinator';
  created_at: string;
  is_active?: boolean;
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

  // Modal de consultation de dossier (360° ENRICHIE)
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
      
      // 1. Charger tous les foyers/familles (données complètes)
      const { data: familiesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, address, patient_category, is_active, created_at, role')
        .eq('role', 'family')
        .order('full_name');

      setFamilyAccounts(familiesData || []);

      // 2. Charger les patients/proches avec leurs détails complets
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

      // 4. Charger la liste des Aidants avec tous les champs du RegisterPage (Bio, Adresse, Zones, etc.)
      const { data: aidantsDb } = await supabase
        .from('aidants')
        .select('*, user:profiles(id, full_name, email, phone, role, created_at)')
        .eq('status', 'approved');

      const formattedAidants: AidantStaff[] = await Promise.all(
        (aidantsDb || []).map(async (a: any) => {
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
            birth_date: a.birth_date || null,
            address: a.address || null,
            bio: a.bio || null,
            total_missions: a.total_missions || 0,
            activeAssignmentsCount: assignedTargets.length,
            assignedTargets,
            created_at: a.user?.created_at || a.created_at,
          };
        })
      );
      setAidantsStaffList(formattedAidants);

      // 5. Charger les Admins & Coordinateurs
      const { data: staffDb } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, created_at, is_active')
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

  // Regroupement par Foyer
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
            {isAdmin ? 'Consultation 360° des dossiers administratifs & cliniques' : 'Suivi de vos proches accompagnés'}
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
          className="h-11 px-4 rounded-xl border bg-gray-50 text-xs font-bold outline-none cursor-pointer"
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

                        {/* ✅ BOUTON ŒIL DE CONSULTATION 360° + ATTRIRUBUTION */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleViewDossier('beneficiary', item.rawDetails)}
                            className="p-2 rounded-xl border bg-gray-50 hover:bg-gray-100 text-gray-600 transition"
                            title="Consulter la fiche complète 360°"
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

      {/* SECTION 2 : ÉQUIPE & INTERVENANTS */}
      {isAdmin && (
        <div className="space-y-4 pt-6 border-t">
          <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 px-1">
            🛡️ Équipe & Intervenants (Staff & Auxiliaires)
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

      {/* MODALE CONSULTATION DOSSIER 360° ENRICHIE */}
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
// ✅ MODALE DOSSIER 360° ULTRA COMPLÈTE
// ============================================================
const DossierDetailModal = ({ dossier, onClose }: { dossier: any; onClose: () => void; colors: any }) => {
  const { type, data } = dossier;
  const [fullData, setFullData] = useState<any>(data);
  const [loadingExtra, setLoadingExtra] = useState(false);

  useEffect(() => {
    const fetchExtraDetails = async () => {
      setLoadingExtra(true);
      try {
        if (type === 'beneficiary') {
          // Si c'est un patient (proche)
          if (data.first_name && !data.email) {
            const { data: patientFull } = await supabase
              .from('patients')
              .select('*, patient_family_links(family:profiles(*))')
              .eq('id', data.id)
              .single();

            if (patientFull) {
              setFullData((prev: any) => ({
                ...prev,
                ...patientFull,
                familyOwner: patientFull.patient_family_links?.[0]?.family || null,
              }));
            }
          } 
          // Si c'est un compte personnel (profil famille)
          else if (data.email) {
            const { data: sub } = await supabase
              .from('abonnements')
              .select('*, offre:offres(*)')
              .eq('user_id', data.id)
              .eq('status', 'actif')
              .maybeSingle();

            const { data: links } = await supabase
              .from('patient_family_links')
              .select('patient:patients(*)')
              .eq('family_id', data.id);

            setFullData((prev: any) => ({
              ...prev,
              subscription: sub,
              linkedPatients: links?.map((l: any) => l.patient).filter(Boolean) || [],
            }));
          }
        }
      } catch (err) {
        console.error('Erreur chargement détails dossier:', err);
      } finally {
        setLoadingExtra(false);
      }
    };

    fetchExtraDetails();
  }, [dossier, type, data]);

  const isPatientObject = !fullData.email && fullData.first_name;

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title={`📋 Dossier Administratif & Clinique : ${fullData.full_name || `${fullData.first_name || ''} ${fullData.last_name || ''}`}`} 
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs pt-1">
        
        {/* CAS BÉNÉFICIAIRE (PATIENT OU COMPTE PERSONNEL) */}
        {type === 'beneficiary' && (
          <div className="space-y-3">
            
            {/* Identité principale */}
            <div className="p-3.5 bg-gray-50 rounded-2xl flex justify-between items-center">
              <div>
                <p className="font-bold text-gray-400 text-[9px] uppercase">Titulaire du dossier</p>
                <p className="text-sm font-black text-gray-900">{fullData.full_name || `${fullData.first_name} ${fullData.last_name || ''}`}</p>
                {fullData.familyOwner && (
                  <p className="text-[10px] text-gray-500 font-bold mt-0.5">Rattaché au foyer de : {fullData.familyOwner.full_name}</p>
                )}
              </div>
              <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                {isPatientObject ? 'Proche Accompagné' : 'Compte Personnel'}
              </span>
            </div>

            {/* Coordonnées de contact */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-gray-50 rounded-2xl">
                <p className="text-gray-400 font-bold text-[9px] uppercase flex items-center gap-1"><Mail size={11} /> E-mail</p>
                <p className="font-bold text-gray-800 truncate">{fullData.email || 'Non renseigné'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-2xl">
                <p className="text-gray-400 font-bold text-[9px] uppercase flex items-center gap-1"><Phone size={11} /> Téléphone direct</p>
                <p className="font-bold text-gray-800">{fullData.phone || 'Non renseigné'}</p>
              </div>
            </div>

            {/* Adresse physique */}
            <div className="p-3 bg-gray-50 rounded-2xl">
              <p className="text-gray-400 font-bold text-[9px] uppercase flex items-center gap-1"><MapPin size={11} /> Lieu précis de prise en charge</p>
              <p className="font-bold text-gray-800">{fullData.address || 'Adresse non spécifiée'}</p>
            </div>

            {/* Contact d'urgence / Garant (Si Patient) */}
            {isPatientObject && (fullData.emergency_contact || fullData.emergency_contact_name) && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-0.5">
                <p className="text-amber-900 font-black text-[10px] uppercase flex items-center gap-1"><AlertCircle size={11} /> Contact d'urgence & Garant</p>
                <p className="font-bold text-amber-950">{fullData.emergency_contact_name || 'Garant familial'} : {fullData.emergency_contact || 'Pas de numéro'}</p>
              </div>
            )}

            {/* Bilan Clinique (Si Patient) */}
            {isPatientObject && (
              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2.5">
                <p className="font-black text-blue-900 text-xs flex items-center gap-1"><FileText size={13} /> Bilan Médical & Informations Utiles</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <p><span className="text-gray-500">Sexe / Âge :</span> <b>{fullData.gender || '-'} • {fullData.age ? `${fullData.age} ans` : '-'}</b></p>
                  <p><span className="text-gray-500">Catégorie :</span> <b>{fullData.category || 'Senior'}</b></p>
                </div>

                {fullData.allergies && (
                  <div className="p-2 bg-red-100/70 text-red-900 rounded-xl font-bold">
                    ⚠️ Allergies : {fullData.allergies}
                  </div>
                )}
                {fullData.treatments && (
                  <div className="p-2 bg-emerald-100/70 text-emerald-900 rounded-xl font-bold">
                    💊 Traitements réguliers : {fullData.treatments}
                  </div>
                )}
                {fullData.conditions && (
                  <div className="p-2 bg-amber-100/70 text-amber-900 rounded-xl font-bold">
                    🩺 Pathologies connues : {fullData.conditions}
                  </div>
                )}
                {fullData.notes && (
                  <div className="p-2 bg-white rounded-xl border text-gray-700 italic">
                    📝 Notes d'accompagnement : "{fullData.notes}"
                  </div>
                )}
              </div>
            )}

            {/* Abonnement Actif si Compte Personnel */}
            {fullData.subscription && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <p className="font-extrabold text-emerald-900 flex items-center gap-1 mb-1">
                  <CreditCard size={13} /> Forfait Actif : {fullData.subscription.offre?.name || 'Abonnement'}
                </p>
                <p className="text-emerald-700 text-[11px]">
                  Visites restantes : <b>{fullData.subscription.remaining_visits} / {fullData.subscription.total_visits}</b>
                </p>
              </div>
            )}

            {/* Proches rattachés sous ce compte */}
            {fullData.linkedPatients?.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
                <p className="font-bold text-gray-400 text-[9px] uppercase">Proches sous ce foyer ({fullData.linkedPatients.length})</p>
                {fullData.linkedPatients.map((p: any) => (
                  <p key={p.id} className="font-bold text-gray-800 text-[11px]">• {p.first_name} {p.last_name}</p>
                ))}
              </div>
            )}

            <div className="p-3 bg-gray-50 rounded-2xl flex justify-between items-center">
              <span className="text-gray-400 font-bold text-[9px] uppercase">Création du dossier</span>
              <span className="font-extrabold text-gray-800">{formatDate(fullData.created_at)}</span>
            </div>
          </div>
        )}

        {/* CAS AIDANT STAFF */}
        {type === 'aidant' && (
          <div className="space-y-3">
            <div className="p-3.5 bg-gray-50 rounded-2xl">
              <p className="text-gray-400 text-[9px] font-bold uppercase">Fiche Intervenant Homologué</p>
              <p className="text-sm font-black text-gray-900">{fullData.full_name}</p>
              <p className="text-gray-500 font-semibold">{fullData.email} • {fullData.phone || 'Sans tel'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-gray-50 rounded-2xl"><p className="text-gray-400 text-[9px] font-bold uppercase">Expérience</p><p className="font-bold text-gray-800">{fullData.experience_years || 0} an(s)</p></div>
              <div className="p-3 bg-gray-50 rounded-2xl">
                <p className="text-gray-400 text-[9px] font-bold uppercase">Note globale</p>
                <p className="font-bold text-amber-600">
                  {fullData.rating && Number(fullData.rating) > 0 ? `⭐ ${Number(fullData.rating).toFixed(1)}/5` : 'Nouveau (pas encore noté)'}
                </p>
              </div>
            </div>

            {fullData.address && (
              <div className="p-3 bg-gray-50 rounded-2xl">
                <p className="text-gray-400 text-[9px] font-bold uppercase flex items-center gap-1"><MapPin size={11} /> Adresse de résidence</p>
                <p className="font-bold text-gray-800">{fullData.address}</p>
              </div>
            )}

            {fullData.zones?.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
                <p className="text-gray-400 text-[9px] font-bold uppercase">Zones couvertes</p>
                <div className="flex flex-wrap gap-1">
                  {fullData.zones.map((z: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-[10px] border border-blue-100">📍 {z}</span>
                  ))}
                </div>
              </div>
            )}

            {fullData.specialties?.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
                <p className="text-gray-400 text-[9px] font-bold uppercase">Spécialités</p>
                <div className="flex flex-wrap gap-1">
                  {fullData.specialties.map((s: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-100">✨ {s}</span>
                  ))}
                </div>
              </div>
            )}

            {fullData.bio && (
              <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
                <p className="text-gray-400 text-[9px] font-bold uppercase">Présentation / Bio</p>
                <p className="text-gray-700 italic leading-relaxed text-[11px] bg-white p-2.5 rounded-xl border whitespace-pre-line">"{fullData.bio}"</p>
              </div>
            )}

            <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100">
              <p className="font-extrabold text-blue-900 mb-1.5 flex items-center gap-1"><Users size={13} /> Bénéficiaires pris en charge ({fullData.activeAssignmentsCount}) :</p>
              {fullData.assignedTargets?.length > 0 ? (
                <div className="space-y-1">
                  {fullData.assignedTargets.map((t: any, i: number) => (
                    <p key={i} className="text-blue-900 font-bold text-[11px]">• {t.name} <span className="text-blue-500 font-normal">({t.type})</span></p>
                  ))}
                </div>
              ) : (
                <p className="text-blue-500 italic text-[11px]">Aucune assignation active actuellement.</p>
              )}
            </div>
          </div>
        )}

        {/* CAS STAFF / ADMIN / COORD */}
        {type === 'staff' && (
          <div className="space-y-3">
            <div className="p-3.5 bg-gray-50 rounded-2xl">
              <p className="text-gray-400 text-[9px] font-bold uppercase">Profil Direction / Coordination</p>
              <p className="text-sm font-black text-gray-800">{fullData.full_name}</p>
              <p className="text-gray-500 font-semibold">{fullData.email}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl flex justify-between items-center">
              <span className="text-gray-400 font-bold text-[9px] uppercase">Téléphone</span>
              <span className="font-bold text-gray-800">{fullData.phone || 'Non renseigné'}</span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl flex justify-between items-center border border-emerald-200">
              <span className="font-bold">Privilèges & Accès :</span>
              <span className="font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px]">{fullData.role}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl flex justify-between items-center">
              <span className="text-gray-400 font-bold text-[9px] uppercase">Membre de l'équipe depuis</span>
              <span className="font-bold text-gray-800">{formatDate(fullData.created_at)}</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PatientsPage;
