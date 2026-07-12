// 📁 src/features/admin/pages/AidantsPage.tsx
// ✅ PAGE ANNUAIRE DES AIDANTS : ALIGNEMENTS DE BOUTONS PARFAITEMENT STACKÉS SUR MOBILE SANS OVERFLOW

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { assignmentAPI } from '@/lib/api';
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Clock,
  Award,
  Users as UsersIcon,
  UserPlus,
} from 'lucide-react';
import { getThemeColors, getThemeByRole } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/utils/helpers';
import { Modal } from '@/components/ui/Modal';
import { InfoRow } from '@/components/ui/InfoRow';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface Aidant {
  id: string;
  user_id: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
  } | null;
  specialties: string[];
  available: boolean;
  rating: number;
  total_missions: number;
  completed_missions: number;
  cancelled_missions: number;
  is_verified: boolean;
  status: string;
  zones: string[];
  created_at: string;
  max_assignments: number;
  current_assignments: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}

interface AssignmentInfo {
  id: string;
  target_type: string;
  target_id: string;
  assignment_type: string;
  target_name: string;
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'approved': return 'Approuvé';
    case 'pending': return 'En attente';
    case 'rejected': return 'Refusé';
    case 'active': return 'Actif';
    case 'inactive': return 'Inactif';
    default: return status || 'En attente';
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'approved': return '#10b981';
    case 'pending': return '#f59e0b';
    case 'rejected': return '#ef4444';
    case 'active': return '#10b981';
    case 'inactive': return '#94a3b8';
    default: return '#94a3b8';
  }
};

const statusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'approved', label: '✅ Approuvés' },
  { value: 'pending', label: '⏳ En attente' },
  { value: 'rejected', label: '❌ Refusés' },
  { value: 'available', label: '🟢 Disponibles' },
  { value: 'unavailable', label: '🔴 Indisponibles' },
];

const AidantsPage = () => {
  const { profile, role } = useAuthStore();
  const [aidants, setAidants] = useState<Aidant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAidant, setSelectedAidant] = useState<Aidant | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, AssignmentInfo[]>>({});

  const themeName = getThemeByRole(role, profile?.patient_category as any);
  const colors = getThemeColors(themeName);

  useEffect(() => {
    fetchAidants();
  }, []);

  const fetchAidants = async () => {
    try {
      setIsLoading(true);
      
      const { data: aidantsData, error: aidantsError } = await supabase
        .from('aidants')
        .select('*')
        .order('created_at', { ascending: false });

      if (aidantsError) throw aidantsError;

      const userIds = [...new Set(aidantsData?.map(a => a.user_id).filter(Boolean))];
      let profileMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, role, avatar_url')
          .in('id', userIds);

        if (!profilesError && profiles) {
          profileMap = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      const aidantsWithUser = (aidantsData || []).map(aidant => ({
        ...aidant,
        user: aidant.user_id ? profileMap[aidant.user_id] || null : null,
        current_assignments: 0,
        max_assignments: aidant.max_assignments || 4,
      }));

      const aidantUserIds = aidantsWithUser.map(a => a.user_id).filter(Boolean);
      const newAssignmentsMap: Record<string, AssignmentInfo[]> = {};

      if (aidantUserIds.length > 0) {
        try {
          const response = await assignmentAPI.adminGetAll();
          const allAssignments = response.data?.data || [];
          
          for (const assignment of allAssignments) {
            const aidantUserId = assignment.aidant_user_id;
            if (!aidantUserIds.includes(aidantUserId)) continue;
            
            if (!newAssignmentsMap[aidantUserId]) {
              newAssignmentsMap[aidantUserId] = [];
            }

            const targetName = assignment.target_type === 'patient'
              ? assignment.target_patient 
                ? `${assignment.target_patient.first_name || ''} ${assignment.target_patient.last_name || ''}`.trim() || 'Patient'
                : 'Patient'
              : assignment.target_profile?.full_name || 'Compte personnel';

            newAssignmentsMap[aidantUserId].push({
              id: assignment.id,
              target_type: assignment.target_type,
              target_id: assignment.target_id,
              assignment_type: assignment.assignment_type,
              target_name: targetName,
            });
          }
        } catch (apiError) {
          console.error('❌ Erreur récupération assignations via API:', apiError);
          for (const aidantUserId of aidantUserIds) {
            try {
              const response = await assignmentAPI.getByAidant(aidantUserId, 'active');
              const assignments = response.data?.data || [];
              
              if (assignments.length > 0) {
                newAssignmentsMap[aidantUserId] = assignments.map((a: any) => ({
                  id: a.id,
                  target_type: a.target_type,
                  target_id: a.target_id,
                  assignment_type: a.assignment_type,
                  target_name: a.target_type === 'patient'
                    ? a.target_patient 
                      ? `${a.target_patient.first_name || ''} ${a.target_patient.last_name || ''}`.trim() || 'Patient'
                      : 'Patient'
                    : a.target_profile?.full_name || 'Compte personnel',
                }));
              }
            } catch (err) {
              console.error(`❌ Erreur pour l'aidant ${aidantUserId}:`, err);
            }
          }
        }

        for (const aidant of aidantsWithUser) {
          const count = newAssignmentsMap[aidant.user_id]?.length || 0;
          aidant.current_assignments = count;
        }
      }

      setAssignmentsMap(newAssignmentsMap);
      setAidants(aidantsWithUser);
    } catch (error: any) {
      console.error('Fetch aidants error:', error);
      toast.error('Erreur lors du chargement des aidants');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAidants = aidants.filter(aidant => {
    const matchesSearch =
      aidant.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aidant.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aidant.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'available' && aidant.available) ||
      (statusFilter === 'unavailable' && !aidant.available) ||
      aidant.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: aidants.length,
    active: aidants.filter(a => a.status === 'approved' || a.status === 'active').length,
    pending: aidants.filter(a => a.status === 'pending').length,
    verified: aidants.filter(a => a.is_verified).length,
    withAssignments: aidants.filter(a => (a.current_assignments || 0) > 0).length,
    totalAssignments: Object.values(assignmentsMap).reduce((acc, arr) => acc + arr.length, 0),
  };

  const handleViewDetails = (aidant: Aidant) => {
    setSelectedAidant(aidant);
    setShowDetailsModal(true);
  };

  const handleToggleAvailability = async (id: string, available: boolean) => {
    try {
      const { error } = await supabase
        .from('aidants')
        .update({ available: !available })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Disponibilité ${!available ? 'activée' : 'désactivée'}`);
      fetchAidants();
    } catch (error) {
      console.error('Toggle availability error:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getAssignmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      primary: '📌 Permanente',
      temporary: '⏳ Temporaire',
      secondary: '⚡ Ponctuelle',
    };
    return labels[type] || type;
  };

  const getAssignmentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      primary: '#10B981',
      temporary: '#F59E0B',
      secondary: '#3B82F6',
    };
    return colors[type] || '#9CA3AF';
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-8">
        <div className="h-24 bg-white rounded-3xl animate-pulse shadow-sm" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse shadow-sm" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 px-4 sm:px-0">
      {/* Header */}
      <section 
        className="relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all border border-black/5"
        style={{ background: `linear-gradient(135deg, ${colors.primary}08 0%, ${colors.primary}12 100%)` }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-black tracking-tight" style={{ color: colors.text }}>
              🦸 Annuaire des aidants
            </h1>
            <p className="text-xs font-semibold" style={{ color: colors.textLight }}>
              {stats.total} aidant{stats.total > 1 ? 's' : ''} inscrits • {stats.totalAssignments} assignation{stats.totalAssignments > 1 ? 's' : ''} actives
            </p>
          </div>
          <button
            onClick={fetchAidants}
            disabled={isLoading}
            className="h-11 px-4 rounded-xl text-xs font-bold border bg-white hover:bg-gray-50 flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-center"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </section>

      {/* Statistiques épurées */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} color={colors.primary} icon={<Users size={16} />} />
        <StatCard label="Actifs" value={stats.active} color="#10b981" icon={<UserCheck size={16} />} />
        <StatCard label="En attente" value={stats.pending} color="#f59e0b" icon={<Clock size={16} />} />
        <StatCard label="Vérifiés" value={stats.verified} color="#8b5cf6" icon={<Award size={16} />} />
        <StatCard label="Assignés" value={stats.withAssignments} color="#3b82f6" icon={<UsersIcon size={16} />} className="col-span-2 md:col-span-1" />
      </section>

      {/* Barre de filtre épurée H-11 COHERENTE */}
      <section className="bg-white rounded-2xl p-3 shadow-sm border border-black/5">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un aidant par son nom ou spécialité..."
              className="w-full h-11 pl-11 pr-4 rounded-xl border outline-none text-xs font-semibold bg-gray-50/50 border-gray-100 dark:border-gray-800/60 transition-all shadow-sm"
              style={{ borderColor: colors.border, color: colors.text }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 px-4 rounded-xl border outline-none text-xs font-semibold bg-white border-gray-100 dark:border-gray-800/60 shrink-0 sm:w-56 shadow-sm cursor-pointer transition-all"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </section>

      {/* Liste épurée ADAPTATIVE */}
      {filteredAidants.length > 0 ? (
        <section className="space-y-3">
          {filteredAidants.map((aidant) => {
            const assignments = assignmentsMap[aidant.user_id] || [];
            const hasAssignments = assignments.length > 0;

            return (
              <div
                key={aidant.id}
                className="bg-white rounded-2xl p-4 shadow-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:shadow-md"
                style={{ borderColor: colors.border }}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-inner"
                    style={{ background: colors.primary }}
                  >
                    {aidant.user?.full_name?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-bold text-xs sm:text-sm text-gray-800" style={{ color: colors.text }}>{aidant.user?.full_name || 'Aidant'}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider flex-wrap">
                      <span>{aidant.user?.email || 'N/A'}</span>
                      <span>•</span>
                      <span className="font-semibold" style={{ color: getStatusColor(aidant.status) }}>{getStatusLabel(aidant.status)}</span>
                      <span>•</span>
                      <span className={aidant.available ? 'text-green-600 font-bold' : 'text-gray-400 font-bold'}>
                        {aidant.available ? 'Disponible' : 'Indisponible'}
                      </span>
                      <span>•</span>
                      <span className="text-blue-600 font-bold">
                        {hasAssignments ? `${assignments.length} assignation${assignments.length > 1 ? 's' : ''}` : 'Aucune assignation'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ACTIONS PANEL RESPONSIVE */}
                <div className="flex items-center justify-end gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0 w-full sm:w-auto">
                  <button onClick={() => handleViewDetails(aidant)} className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 border border-gray-100 transition-all">
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handleToggleAvailability(aidant.id, !aidant.available)}
                    className="h-9 px-4 rounded-xl text-xs font-extrabold border bg-gray-50/50 hover:bg-gray-100 transition-all flex items-center justify-center"
                    style={{ borderColor: colors.border, color: colors.text }}
                  >
                    {aidant.available ? 'Désactiver' : 'Activer'}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center text-gray-400 text-xs font-medium border">Aucun aidant ne correspond aux filtres</div>
      )}

      {/* Modal Détails */}
      {showDetailsModal && selectedAidant && (
        <Modal isOpen={true} onClose={() => setShowDetailsModal(false)} title="🦸 Détails de l'aidant" maxWidth="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b" style={{ borderColor: colors.border }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: colors.primary }}>
                {selectedAidant.user?.full_name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div>
                <p className="font-bold" style={{ color: colors.text }}>{selectedAidant.user?.full_name || 'N/A'}</p>
                <p className="text-xs text-gray-500">{selectedAidant.user?.email || 'N/A'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <InfoRow label="Rôle" value="🦸 Aidant" />
              <InfoRow label="Statut" value={getStatusLabel(selectedAidant.status)} />
              <InfoRow label="Disponibilité" value={selectedAidant.available ? 'Disponible 🟢' : 'Indisponible 🔴'} />
              <InfoRow label="Note" value={`⭐ ${selectedAidant.rating || 0}/5`} />
              <InfoRow label="Missions" value={String(selectedAidant.total_missions || 0)} />
              <InfoRow label="Assignations" value={`${selectedAidant.current_assignments || 0}/${selectedAidant.max_assignments || 4}`} />
              <InfoRow label="Inscription" value={formatDate(selectedAidant.created_at)} />
            </div>

            {/* Liste des assignations */}
            {selectedAidant.user_id && assignmentsMap[selectedAidant.user_id]?.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  📋 Assignations actives ({assignmentsMap[selectedAidant.user_id].length})
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {assignmentsMap[selectedAidant.user_id].map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">
                          {assignment.target_type === 'patient' ? '👤' : '👤'}
                          {assignment.target_name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          ({assignment.target_type === 'patient' ? 'Patient' : 'Compte personnel'})
                        </span>
                      </div>
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                        style={{
                          background: getAssignmentTypeColor(assignment.assignment_type) + '20',
                          color: getAssignmentTypeColor(assignment.assignment_type),
                        }}
                      >
                        {getAssignmentTypeLabel(assignment.assignment_type)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color, icon, className = '' }: StatCardProps & { className?: string }) => (
  <div className={cn("bg-white rounded-2xl p-4 shadow-sm border flex items-center justify-between gap-2", className)}>
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</p>
      <p className="text-base sm:text-lg font-black truncate" style={{ color }}>{value}</p>
    </div>
    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '0d', color }}>{icon}</div>
  </div>
);

export default AidantsPage;
