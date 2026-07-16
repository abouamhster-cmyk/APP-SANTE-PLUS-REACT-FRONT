// 📁 frontend/src/features/admin/components/PendingAidantList.tsx

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Calendar,
  Clock,
  MapPin,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Loader2,
  Shield,
  Zap,
  Phone,
  Mail,
} from 'lucide-react';

import { useVisitStore } from '@/stores/visitStore';
import { useAuthStore } from '@/stores/authStore';
import { useAidantCatalogStore } from '@/stores/aidantCatalogStore';
import { useBranding } from '@/hooks/useBranding';
import { useTerminology } from '@/hooks/useTerminology';
import { formatDate, formatTime } from '@/utils/helpers';
import { AssignAidantModal } from '@/features/aidants/components/AssignAidantModal';
import { Illustration } from '@/components/ui/Illustration';
import toast from 'react-hot-toast';

// ============================================================
// TYPES
// ============================================================

interface PendingVisit {
  id: string;
  user_id: string;
  patient_id: string | null;
  target_type: string;
  target_name: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  created_at: string;
  waiting_for_aidant_since: string | null;
  aidant_id: string | null;  
  notes?: string | null; 
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    address: string;
    phone: string | null;
    category: string;
  } | null;
  family?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
  metadata?: any;
}

interface PendingAidantListProps {
  onAssignSuccess?: () => void;
  colors?: any;
  compact?: boolean;
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export const PendingAidantList = ({
  onAssignSuccess,
  colors: propColors,
  compact = false,
}: PendingAidantListProps) => {
  const navigate = useNavigate();
  const { profile, role } = useAuthStore();
  const brand = useBranding();
  const colors = propColors || brand.colors;
  const { getPendingAidantVisits, assignAidantToVisit, isLoading } = useVisitStore();
  const { fetchAidants, aidants } = useAidantCatalogStore();

  const { isAdminOrCoordinator } = useTerminology();

  const [visits, setVisits] = useState<PendingVisit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<PendingVisit[]>([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'patient' | 'personal'>('all');
  const [selectedVisit, setSelectedVisit] = useState<PendingVisit | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = isAdminOrCoordinator;

  // ============================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================

  const loadData = useCallback(async () => {
    if (!isAdmin) return;

    setIsLoadingVisits(true);
    try {
      const pendingVisits = await getPendingAidantVisits();
      setVisits(pendingVisits as PendingVisit[]);
      setFilteredVisits(pendingVisits as PendingVisit[]);
    } catch (error) {
      console.error('❌ Erreur chargement visites en attente:', error);
      toast.error('Erreur lors du chargement des visites');
    } finally {
      setIsLoadingVisits(false);
    }
  }, [isAdmin, getPendingAidantVisits]);

  useEffect(() => {
    loadData();
    fetchAidants({ onlyAvailable: false });
  }, [loadData, fetchAidants]);

  // ============================================================
  // FILTRAGE
  // ============================================================

  useEffect(() => {
    let filtered = visits;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.target_name?.toLowerCase().includes(term) ||
        v.patient?.first_name?.toLowerCase().includes(term) ||
        v.patient?.last_name?.toLowerCase().includes(term) ||
        v.family?.full_name?.toLowerCase().includes(term)
      );
    }

    if (filterType === 'patient') {
      filtered = filtered.filter(v => v.target_type === 'patient' || v.patient_id);
    } else if (filterType === 'personal') {
      filtered = filtered.filter(v => v.target_type === 'personal' || v.target_type === 'personal_account');
    }

    setFilteredVisits(filtered);
  }, [visits, searchTerm, filterType]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    await fetchAidants({ onlyAvailable: false });
    setIsRefreshing(false);
    toast.success('Liste actualisée');
  };

  const handleAssignAidant = (visit: PendingVisit) => {
    setSelectedVisit(visit);
    setShowAssignModal(true);
  };

  const handleAssignSuccess = async () => {
    setShowAssignModal(false);
    setSelectedVisit(null);
    await loadData();
    await fetchAidants({ onlyAvailable: false });
    if (onAssignSuccess) onAssignSuccess();
    toast.success('Aidant assigné avec succès');
  };

  const handleViewVisit = (visitId: string) => {
    navigate(`/app/visits/${visitId}`);
  };

  // ============================================================
  // STATS
  // ============================================================

  const stats = {
    total: visits.length,
    patients: visits.filter(v => v.target_type === 'patient' || v.patient_id).length,
    personal: visits.filter(v => v.target_type === 'personal' || v.target_type === 'personal_account').length,
    urgent: visits.filter(v => v.metadata?.urgency === 'high').length,
  };

  // ============================================================
  // RENDU - CHARGEMENT
  // ============================================================

  if (isLoadingVisits || isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin" size={24} style={{ color: colors.primary }} />
        <span className="ml-2 text-sm" style={{ color: colors.textLight }}>Chargement des visites...</span>
      </div>
    );
  }

  // ============================================================
  // RENDU - VERSION COMPACTE (POUR ADMIN DASHBOARD)
  // ============================================================

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#FF572215', color: '#FF5722' }}>
              <UserPlus size={14} />
            </div>
            <span className="text-xs font-bold" style={{ color: colors.text }}>
              {stats.total} visite{stats.total > 1 ? 's' : ''} sans aidant
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1 rounded-lg hover:bg-gray-100 transition"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {visits.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle size={20} className="mx-auto text-green-400 mb-1" />
            <p className="text-xs" style={{ color: colors.textLight }}>Aucune visite en attente d'aidant</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {visits.slice(0, 5).map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                onClick={() => handleViewVisit(visit.id)}
                style={{ background: colors.background }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate" style={{ color: colors.text }}>
                    {visit.target_name || visit.patient?.first_name || 'Patient'}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px]" style={{ color: colors.textLight }}>
                    <Calendar size={10} />
                    <span>{formatDate(visit.scheduled_date)}</span>
                    <span>•</span>
                    <Clock size={10} />
                    <span>{visit.scheduled_time}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssignAidant(visit);
                  }}
                  className="p-1.5 rounded-lg text-white hover:opacity-80 transition shrink-0"
                  style={{ background: colors.primary }}
                  title="Assigner un aidant"
                >
                  <UserPlus size={12} />
                </button>
              </div>
            ))}
            {visits.length > 5 && (
              <button
                onClick={() => navigate('/app/admin/visits/validation')}
                className="w-full text-center text-[10px] font-medium hover:underline py-1"
                style={{ color: colors.primary }}
              >
                Voir les {visits.length - 5} autres...
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // RENDU - VERSION COMPLÈTE
  // ============================================================

  return (
    <div className="space-y-4">
      {/* ============================================================
      EN-TÊTE
      ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: colors.text }}>
            <UserPlus size={20} style={{ color: colors.primary }} />
            Visites en attente d'aidant
          </h2>
          <p className="text-xs" style={{ color: colors.textLight }}>
            {stats.total} visite{stats.total > 1 ? 's' : ''} sans aidant assigné
            {stats.urgent > 0 && (
              <span className="ml-2 font-semibold" style={{ color: '#EF4444' }}>
                ⚠️ {stats.urgent} urgent{stats.urgent > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl hover:bg-gray-100 transition" style={{ color: colors.textLight }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ============================================================
      STATS
      ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <CompactStat label="Total" value={stats.total} color={colors.primary} icon={<Users size={14} />} />
        <CompactStat label="Patients" value={stats.patients} color="#4CAF50" icon={<User size={14} />} />
        <CompactStat label="Personnels" value={stats.personal} color="#3B82F6" icon={<User size={14} />} />
        <CompactStat label="Urgentes" value={stats.urgent} color="#EF4444" icon={<AlertCircle size={14} />} />
      </div>

      {/* ============================================================
      BARRE DE RECHERCHE ET FILTRES
      ============================================================ */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none"
            style={{ borderColor: colors.primary + '20', color: colors.text }}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterType === 'all' ? 'text-white' : ''
            }`}
            style={{ background: filterType === 'all' ? colors.primary : 'transparent', color: filterType === 'all' ? '#ffffff' : colors.textLight }}
          >
            Tous
          </button>
          <button
            onClick={() => setFilterType('patient')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterType === 'patient' ? 'text-white' : ''
            }`}
            style={{ background: filterType === 'patient' ? colors.primary : 'transparent', color: filterType === 'patient' ? '#ffffff' : colors.textLight }}
          >
            👤 Patients
          </button>
          <button
            onClick={() => setFilterType('personal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterType === 'personal' ? 'text-white' : ''
            }`}
            style={{ background: filterType === 'personal' ? colors.primary : 'transparent', color: filterType === 'personal' ? '#ffffff' : colors.textLight }}
          >
            👤 Personnels
          </button>
        </div>
      </div>

      {/* ============================================================
      LISTE DES VISITES
      ============================================================ */}
      {filteredVisits.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border" style={{ borderColor: colors.primary + '15' }}>
          <Illustration type="empty" size="md" className="mx-auto mb-3 opacity-30" />
          <h3 className="text-sm font-bold" style={{ color: colors.text }}>
            {searchTerm || filterType !== 'all'
              ? 'Aucune visite ne correspond à votre recherche'
              : 'Aucune visite en attente d\'aidant'}
          </h3>
          <p className="text-xs mt-1" style={{ color: colors.textLight }}>
            {searchTerm || filterType !== 'all'
              ? 'Essayez de modifier vos critères de recherche.'
              : 'Toutes les visites ont un aidant assigné. 👍'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredVisits.map((visit) => (
            <PendingVisitCard
              key={visit.id}
              visit={visit}
              colors={colors}
              onAssign={() => handleAssignAidant(visit)}
              onView={() => handleViewVisit(visit.id)}
            />
          ))}
        </div>
      )}

      {/* ============================================================
      MODAL D'ASSIGNATION D'AIDANT
      ============================================================ */}
      {showAssignModal && selectedVisit && (
        <AssignAidantModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedVisit(null);
          }}
          targetType="visit"
          targetId={selectedVisit.id}
          targetName={selectedVisit.target_name || 
            `${selectedVisit.patient?.first_name || ''} ${selectedVisit.patient?.last_name || ''}`.trim() || 'Visite'}
          onSuccess={handleAssignSuccess}
          colors={colors}
          allowForce={true}
          currentAidantId={selectedVisit.aidant_id}
          onAssignAidant={async (aidantId, assignmentType, force) => {
            await assignAidantToVisit(selectedVisit.id, aidantId, assignmentType, force);
          }}
        />
      )}
    </div>
  );
};

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

interface CompactStatProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

const CompactStat = ({ icon, label, value, color }: CompactStatProps) => {
  const brand = useBranding();
  const colors = brand.colors;

  return (
    <div className="bg-white rounded-xl p-2.5 shadow-sm border" style={{ borderColor: colors.primary + '15' }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: colors.textLight }}>{label}</p>
          <p className="text-base font-bold mt-0.5" style={{ color }}>{value}</p>
        </div>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + '12', color }}>
          {icon}
        </div>
      </div>
    </div>
  );
};

interface PendingVisitCardProps {
  visit: PendingVisit;
  colors: any;
  onAssign: () => void;
  onView: () => void;
}

const PendingVisitCard = ({ visit, colors, onAssign, onView }: PendingVisitCardProps) => {
  const patientName = visit.target_name || 
    (visit.patient ? `${visit.patient.first_name} ${visit.patient.last_name}` : 'Patient');
  const address = visit.patient?.address || 'Adresse non renseignée';
  const familyName = visit.family?.full_name || 'Famille';
  const waitingSince = visit.waiting_for_aidant_since 
    ? formatDate(visit.waiting_for_aidant_since)
    : formatDate(visit.created_at);
  const isUrgent = visit.metadata?.urgency === 'high';

  const getTypeLabel = () => {
    if (visit.target_type === 'patient' || visit.patient_id) return '👤 Patient';
    if (visit.target_type === 'personal' || visit.target_type === 'personal_account') return '👤 Personnel';
    return '👤 Général';
  };

  return (
    <div
      className="bg-white rounded-2xl p-4 shadow-sm border hover:shadow-md transition cursor-pointer"
      style={{ borderColor: colors.primary + '15' }}
      onClick={() => onView()}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        {/* Infos principales */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm truncate" style={{ color: colors.text }}>
              {patientName}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-0.5" style={{ backgroundColor: '#FF572215', color: '#FF5722' }}>
              <UserPlus size={10} />
              En attente
            </span>
            {isUrgent && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-600 flex items-center gap-0.5 animate-pulse">
                <AlertCircle size={10} />
                Urgent
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100" style={{ color: colors.textLight }}>
              {getTypeLabel()}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs flex-wrap mt-1" style={{ color: colors.textLight }}>
            <span className="flex items-center gap-0.5">
              <Calendar size={11} />
              {formatDate(visit.scheduled_date)}
            </span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <Clock size={11} />
              {visit.scheduled_time} ({visit.duration_minutes} min)
            </span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <MapPin size={11} />
              {address}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px] mt-1" style={{ color: colors.textLight }}>
            <span className="flex items-center gap-0.5">
              <User size={10} />
              Famille: {familyName}
            </span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <Clock size={10} />
              En attente depuis {waitingSince}
            </span>
          </div>

          {visit.notes && (
            <p className="text-xs italic line-clamp-1" style={{ color: colors.textLight }}>"{visit.notes}"</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAssign();
            }}
            className="px-3 py-1.5 rounded-xl text-white text-xs font-bold transition hover:opacity-80 flex items-center gap-1.5"
            style={{ background: colors.primary }}
          >
            <UserPlus size={14} />
            Assigner
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="p-1.5 rounded-xl hover:bg-gray-100 transition" style={{ color: colors.textLight }}
          >
            <Eye size={16} />
          </button>
        </div>
      </div>

      {/* Info supplémentaire : famille */}
      {visit.family && (
        <div className="mt-2 pt-2 border-t flex items-center gap-3 text-[10px]" style={{ borderColor: colors.primary + '10', color: colors.textLight }}>
          <span className="flex items-center gap-0.5">
            <Mail size={10} />
            {visit.family.email || 'Email non renseigné'}
          </span>
          {visit.family.phone && (
            <>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Phone size={10} />
                {visit.family.phone}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PendingAidantList;
